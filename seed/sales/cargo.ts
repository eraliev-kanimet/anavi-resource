import { and, asc, db, eq, gt, inArray, isNotNull, isNull } from '@anavi/backend/src/db'
import { catProduct, catStockMove, catVariant } from '@anavi/backend/src/db/schema/cat'
import { crmContact, type CrmContact } from '@anavi/backend/src/db/schema/crm'
import { org } from '@anavi/backend/src/db/schema/org'
import {
  shpCash,
  shpEvent,
  shpExpected,
  shpPayment,
  shpShipment,
  shpWeighing,
  type ShpClient,
} from '@anavi/backend/src/db/schema/shp'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { receiveStock } from '@anavi/backend/src/modules/catalog/stock.service'
import { linkOrgContact } from '@anavi/backend/src/modules/crm/contact.service'
import { clientOf, setCombine } from '@anavi/backend/src/modules/shipment/cargo.service'
import { consolidate } from '@anavi/backend/src/modules/shipment/consolidate.service'
import {
  expectParcel,
  setExpectedTrack,
} from '@anavi/backend/src/modules/shipment/expected.service'
import { takeIn } from '@anavi/backend/src/modules/shipment/intake.service'
import { issueParcels } from '@anavi/backend/src/modules/shipment/issue.service'
import { takeCash } from '@anavi/backend/src/modules/shipment/shipment.service'
import { actorOf } from '../keeping'
import { tulparCargo, type CargoParcel } from '../tulpar/hauls'
import { lastId } from './carry'
import { mark, marked, unmark } from './fixture'
import { reverseMoves } from './rides'
import { digitsOf } from './common'
import { at, deskOf, later, siteBySlug, stampEvents, walkTrip } from './haul'
import { loadScript } from './script'
import { daysAgo } from './stamp'

/*
 * Cargo from abroad, as the carrier's own material tells it (`tulpar/cargo.json`).
 *
 * A client here is a card of the carrier's with a code — a private person who wrote to the carrier
 * in its own sales script, or a shop of the platform. They name a seller's tracking number, the
 * parcel is taken in at the depot in Guangzhou by that number or by the code on its side, rides to
 * Kashgar on one vehicle and to Bishkek on another, and is handed out at the counter for money.
 *
 * Every state the desk meets in a week stands here at once: named and not come, lying at the
 * depot, on the road, waiting to be collected, handed out — and the three that need a person: a
 * parcel nobody can be told for, three repacked into one box, and one the carrier bought itself.
 *
 * After the carrier's own demo has been filled and only then: the private clients are its cards,
 * and the parcel bought by a link is born from an order paid in its inbox.
 */

interface Client {
  contact: CrmContact
  client: ShpClient
  /** the shop behind the card, where the client is one */
  shop: string | null
}

interface Taken {
  parcel: CargoParcel
  shipmentId: bigint
}

/** What the counter's hand-in says it was for — words for a person; the run finds it by its mark. */
const cargoCashNote = (track: string) => `Карго, выдача ${track}`

/** Grams and millimetres, as the platform keeps a box. */
const boxOf = (box: CargoParcel['box']) => ({ ...box, weight: Math.round(box.weight * 1000) })

export async function seedCargo(): Promise<{ parcels: number; trips: number }> {
  const cargo = await tulparCargo()
  const script = await loadScript('tulpar')
  return db.transaction(async (tx) => {
    const desk = await deskOf(tx)
    const { carrier, carrierId, storekeeper } = desk

    const counter = await actorOf(carrier, 'manager', tx)
    // Taken back before they are written again: the hand-ins of an earlier run of this very
    // script, and the receipts its clients took onto their shelves — found by the mark that run
    // left, since neither names a parcel by pointer and the words of a note are anybody's to type.
    await tx.delete(shpCash).where(inArray(shpCash.id, marked(carrierId, 'cash', tx)))
    await unmark(carrierId, 'cash', tx)
    await reverseMoves(inArray(catStockMove.id, marked(carrierId, 'stock_move', tx)), tx)
    await unmark(carrierId, 'stock_move', tx)

    const clients = new Map<string, Client>()
    for (const one of cargo.clients) {
      let contact: CrmContact
      if (one.shop) {
        const shop = await siteBySlug(one.shop, tx)
        const [owner] = await tx.select().from(org).where(eq(org.id, shop.orgId)).limit(1)
        contact = await linkOrgContact(carrierId, owner!, tx, 'shipment')
      } else {
        const person = script?.people.find((row) => row.key === one.person)
        if (!person) throw new Error(`cargo: no person «${one.person}» in the carrier's script`)
        const [card] = await tx
          .select()
          .from(crmContact)
          .where(
            and(
              eq(crmContact.siteId, carrierId),
              eq(crmContact.phone, digitsOf(person.phone)),
              isNull(crmContact.deletedAt),
            ),
          )
          .limit(1)
        if (!card) throw new Error(`cargo: «${one.person}» has no card at the carrier yet`)
        contact = card
      }
      const client = await clientOf(carrierId, contact.id, tx)
      if (one.combine !== undefined)
        await setCombine(carrierId, contact.id, { on: one.combine }, tx)
      clients.set(one.key, { contact, client, shop: one.shop ?? null })
    }
    const clientOfKey = (key: string): Client => {
      const found = clients.get(key)
      if (!found) throw new Error(`cargo: no client «${key}»`)
      return found
    }

    // «This number is mine» — said in the evening, some days before the parcel reaches the depot.
    const name = async (key: string, track: string, note: string | undefined, days: number) => {
      const row = await expectParcel(carrier, clientOfKey(key).contact, { track, note }, tx)
      const when = daysAgo(days, 19, 40)
      await tx
        .update(shpExpected)
        .set({ createdAt: when, updatedAt: when })
        .where(eq(shpExpected.id, row.id))
    }
    for (const row of cargo.waiting) await name(row.client, row.track, row.note, row.named)

    const batches = new Map<string, Taken[]>()
    let parcels = 0
    for (const batch of cargo.batches) {
      const taken: Taken[] = []
      for (const [index, parcel] of batch.parcels.entries()) {
        const owner = parcel.client ? clientOfKey(parcel.client) : null
        const when = later(at(batch.taken), index * 6)
        if (owner && parcel.named !== undefined) {
          await name(parcel.client!, parcel.track, parcel.note, parcel.named)
        }
        if (owner && parcel.bought) {
          // Bought for the client: the row was born without a number when the order was paid, and
          // the desk writes the seller's number in when the seller ships.
          const [bought] = await tx
            .select()
            .from(shpExpected)
            .where(
              and(
                eq(shpExpected.siteId, carrierId),
                eq(shpExpected.contactId, owner.contact.id),
                isNotNull(shpExpected.orderId),
                isNull(shpExpected.track),
              ),
            )
            .orderBy(asc(shpExpected.id))
            .limit(1)
          if (!bought) {
            throw new Error(`cargo: nothing was bought for «${parcel.client}» — is the order paid?`)
          }
          await setExpectedTrack(carrierId, bought.id, counter, { track: parcel.track }, tx)
          await tx
            .update(shpExpected)
            .set({ updatedAt: later(when, -3 * 24 * 60) })
            .where(eq(shpExpected.id, bought.id))
        }

        /*
         * Weighed AND measured at the table: the depot's direction reads density, so intake asks
         * for the three sides and the parcel leaves the table with a price — the one nobody can be
         * told for as well, because a box on the floor has sides whoever owns it.
         */
        const { shipment } = await takeIn(
          carrierId,
          storekeeper,
          {
            track: parcel.track,
            boxes: [boxOf(parcel.box)],
            // Read off the box only where nobody named the number: a claim outranks a marker.
            code: owner && parcel.code ? owner.client.code : null,
            note: owner ? null : (parcel.note ?? null),
          },
          null,
          tx,
        )
        await tx
          .update(shpShipment)
          .set({ createdAt: when, stateAt: when, updatedAt: when })
          .where(eq(shpShipment.id, shipment.id))
        await tx
          .update(shpEvent)
          .set({ createdAt: when })
          .where(eq(shpEvent.shipmentId, shipment.id))
        await tx
          .update(shpWeighing)
          .set({ createdAt: when })
          .where(eq(shpWeighing.shipmentId, shipment.id))
        await tx
          .update(shpExpected)
          .set({ updatedAt: when })
          .where(eq(shpExpected.shipmentId, shipment.id))
        taken.push({ parcel, shipmentId: shipment.id })
        parcels += 1
      }
      batches.set(batch.key, taken)
    }

    // Several of one client's repacked into one box: a new shipment, and each parcel ends in it.
    for (const box of cargo.boxes) {
      const inside = [...batches.values()].flat().filter((one) => one.parcel.into === box.key)
      const mark = await lastId(shpEvent, tx)
      const made = await consolidate(
        carrierId,
        storekeeper,
        {
          ids: inside.map((one) => String(one.shipmentId)),
          packages: [boxOf(box.box)],
          note: box.note,
        },
        tx,
      )
      const when = at(box)
      await tx.update(shpShipment).set({ createdAt: when }).where(eq(shpShipment.id, made.id))
      await tx
        .update(shpWeighing)
        .set({ createdAt: when })
        .where(eq(shpWeighing.shipmentId, made.id))
      for (const id of [made.id, ...inside.map((one) => one.shipmentId)]) {
        await stampEvents(id, id === made.id ? 0n : mark, null, [when], tx)
      }
    }

    for (const trip of cargo.trips) {
      const aboard = batches.get(trip.batch)
      if (!aboard) throw new Error(`cargo: no batch «${trip.batch}»`)
      const issued: {
        shipmentId: bigint
        track: string
        events: bigint
        payments: bigint
        when: Date
      }[] = []
      await walkTrip(
        desk,
        trip,
        aboard.map((one) => ({ shipmentId: one.shipmentId, stop: trip.stops.length })),
        {
          direct: false,
          /*
           * Handed out at the counter, by the client's code and their own pickup code, for cash.
           * Here and not after the dates are moved: what a parcel owes includes the days it was
           * kept past the free ones, counted from the day it arrived — and these were collected
           * within them, so they must be met while the arrival still reads «now».
           */
          between: async () => {
            for (const one of aboard) {
              if (!one.parcel.issued || !one.parcel.client) continue
              const [row] = await tx
                .select({ state: shpShipment.state })
                .from(shpShipment)
                .where(eq(shpShipment.id, one.shipmentId))
                .limit(1)
              if (row?.state !== 'arrived') continue
              const { client } = clientOfKey(one.parcel.client)
              const marks = {
                events: await lastId(shpEvent, tx),
                payments: await lastId(shpPayment, tx),
              }
              await issueParcels(
                carrierId,
                counter,
                { code: client.code, pin: client.pin, ids: [String(one.shipmentId)], cash: true },
                tx,
              )
              issued.push({
                shipmentId: one.shipmentId,
                track: one.parcel.track,
                ...marks,
                when: at(one.parcel.issued),
              })
            }
          },
        },
        tx,
      )
      for (const one of issued) {
        await stampEvents(one.shipmentId, one.events, null, [one.when], tx)
        const paid = await tx
          .update(shpPayment)
          .set({ createdAt: one.when })
          .where(and(eq(shpPayment.shipmentId, one.shipmentId), gt(shpPayment.id, one.payments)))
          .returning({ amount: shpPayment.amount, courierUserId: shpPayment.courierUserId })
        /*
         * The cash taken at the counter is in the hand of whoever issued the parcel, and it is
         * handed in at the till the same evening — the money of a week ago does not stand against
         * a person for a week. What was taken today is still in the drawer: that is the figure the
         * desk opens its evening with.
         */
        const taken = paid
          .filter((row) => row.courierUserId !== null)
          .reduce((sum, row) => sum + row.amount, 0)
        const evening = new Date(one.when)
        evening.setHours(19, 30, 0, 0)
        if (evening.getTime() < one.when.getTime()) evening.setTime(one.when.getTime() + 3_600_000)
        if (taken === 0 || Date.now() - evening.getTime() < 86_400_000) continue
        const before = await lastId(shpCash, tx)
        await takeCash(
          carrierId,
          desk.dispatcher,
          {
            courierId: String(counter.userId),
            amount: taken,
            currency: carrier.currency,
            note: cargoCashNote(one.track),
          },
          tx,
        )
        const handed = await tx
          .update(shpCash)
          .set({ createdAt: evening })
          .where(gt(shpCash.id, before))
          .returning({ id: shpCash.id })
        await mark(
          carrierId,
          'cash',
          handed.map((row) => row.id),
          tx,
        )
      }
    }

    // And a client that is a shop takes what it collected onto its own shelf — a receipt of its
    // own, written by its own people, with the seller's number as the reason.
    for (const one of [...batches.values()].flat()) {
      const { receipt, client } = one.parcel
      if (!receipt || !client) continue
      const slug = clientOfKey(client).shop
      if (!slug)
        throw new Error(`cargo: «${client}» is not a shop and has no shelf to receive onto`)
      const shop = await siteBySlug(slug, tx)
      const owner = await actorOf(shop, 'owner', tx)
      const reason = `${receipt.note} · ${one.parcel.track}`
      /*
       * The receipt is the SHOP's own stock, journalled with no document behind it, and the shop's
       * demo may not be among the ones this run purges — so what an earlier run received was taken
       * back at the top of this scene, by its mark, and what is received now is marked in turn.
       */
      const since = await lastId(catStockMove, tx)
      for (const line of receipt.lines) {
        const [variant] = await tx
          .select({ id: catVariant.id })
          .from(catVariant)
          .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
          .where(
            and(
              eq(catProduct.siteId, asSiteId(shop.id)),
              eq(catProduct.slug, line.item),
              eq(catVariant.isPrimary, true),
              isNull(catVariant.deletedAt),
            ),
          )
          .limit(1)
        if (!variant) throw new Error(`cargo: «${slug}» sells nothing at «${line.item}»`)
        await receiveStock(variant.id, line.qty, { actor: owner, reason }, tx)
      }
      const received = await tx
        .update(catStockMove)
        .set({ createdAt: at(receipt) })
        .where(gt(catStockMove.id, since))
        .returning({ id: catStockMove.id })
      await mark(
        carrierId,
        'stock_move',
        received.map((row) => row.id),
        tx,
      )
    }

    return { parcels, trips: cargo.trips.length }
  })
}
