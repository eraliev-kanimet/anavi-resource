import { and, asc, db, eq, gt, lte, type Db, type Transaction } from '@anavi/backend/src/db'
import { toMinor, type Currency } from '@anavi/shared'
import {
  catProduct,
  catRelocation,
  catStockMove,
  catVariant,
} from '@anavi/backend/src/db/schema/cat'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { ordEvent, ordOrder } from '@anavi/backend/src/db/schema/ord'
import { orgSite, type OrgPlace, type OrgSite } from '@anavi/backend/src/db/schema/org'
import type { Actor } from '@anavi/backend/src/lib/actor'
import {
  shpCarriage,
  shpClaim,
  shpEvent,
  shpShipment,
  shpTrip,
  shpTripEvent,
  shpTripStop,
} from '@anavi/backend/src/db/schema/shp'
import { stlEntry } from '@anavi/backend/src/db/schema/stl'
import { asSiteId, type SiteId } from '@anavi/backend/src/db/ids'
import {
  createRelocation,
  receiveRelocation,
  viewRelocation,
} from '@anavi/backend/src/modules/catalog/relocation.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { openClaim } from '@anavi/backend/src/modules/shipment/claim.service'
import { listFleet } from '@anavi/backend/src/modules/shipment/fleet.service'
import { rideRelocation } from '@anavi/backend/src/modules/shipment/relocation.ride'
import { changeStatus } from '@anavi/backend/src/modules/order/order.service'
import { addEvent, deliver } from '@anavi/backend/src/modules/shipment/shipment.service'
import {
  addShipments,
  createTrip,
  loadAll,
  sayTrip,
  setShipmentRide,
  setTripItem,
  viewTrip,
} from '@anavi/backend/src/modules/shipment/trip.service'
import { actorOf, directionOf } from '../keeping'
import {
  tulparHauls,
  type HaulMoment,
  type HaulRelocation,
  type HaulRoad,
  type Hauls,
} from '../tulpar/hauls'
import { lastId, takeRidden } from './carry'
import { mark } from './fixture'
import { purgeRelocations } from './rides'
import { daysAgo } from './stamp'

/*
 * What rode between cities: one vehicle of the carrier's, several clients' boxes aboard.
 *
 * The carrier's own material says what happened (`tulpar/hauls.json`) and this file walks it by the
 * doors people press. Two kinds of load meet on one loading list, and that is the point of the
 * scene: a site moving its OWN goods between two of its points, and a shop's order going to a buyer
 * in another city. The first is born here, from the material; the second was placed by the shop's
 * own script and handed over by `carry.ts`, which left its shipment under a word this file reads.
 *
 * After the couriers' pass and in a transaction of its own: a trip is neither shop's, and a failure
 * on the road must not take the morning's deliveries down with it.
 */

const MINUTE = 60_000
export const at = (moment: HaulMoment) => daysAgo(moment.days, moment.at[0], moment.at[1])
export const later = (from: Date, minutes: number) => new Date(from.getTime() + minutes * MINUTE)
/** Never after this minute, for the reason every date of a fixture has. */
export const past = (moment: Date) => new Date(Math.min(moment.getTime(), Date.now() - MINUTE))

function dayOf(moment: Date): string {
  const two = (value: number) => String(value).padStart(2, '0')
  return `${moment.getFullYear()}-${two(moment.getMonth() + 1)}-${two(moment.getDate())}`
}

export async function siteBySlug(slug: string, tx: Db | Transaction): Promise<OrgSite> {
  const [row] = await tx.select().from(orgSite).where(eq(orgSite.slug, slug)).limit(1)
  if (!row) throw new Error(`haul: no site «${slug}»`)
  return row
}

interface Sent {
  shipmentId: bigint
  /** the order it was born from, where it was */
  orderId: bigint | null
  /** the relocation it carries, with what the far end is to count */
  moved: { shop: OrgSite; relocationId: bigint; material: HaulRelocation } | null
}

/**
 * A site sending its own goods to its own other point, and handing the boxes to the carrier.
 *
 * Sent an hour and a half before the carrier comes for them. The goods leave the shelf in this
 * very act and are on NO shelf until somebody at the far end counts them — which is the state the
 * scene exists to show, and why the count below is a separate act days later.
 */
async function sendRelocation(
  material: HaulRelocation,
  carrier: OrgSite,
  collected: Date,
  tx: Db | Transaction,
): Promise<Sent> {
  const shop = await siteBySlug(material.shop, tx)
  const shopId = asSiteId(shop.id)
  const owner = await actorOf(shop, 'owner', tx)
  const places = await listPlaces(shopId, tx)
  const from = places[material.from - 1]
  const to = places[material.to - 1]
  if (!from || !to)
    throw new Error(`haul: «${shop.slug}» has no point №${material.from} or №${material.to}`)

  const items = []
  for (const line of material.lines) {
    const variants = await tx
      .select({ id: catVariant.id })
      .from(catVariant)
      .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
      .where(and(eq(catProduct.siteId, shopId), eq(catProduct.slug, line.item)))
      .orderBy(asc(catVariant.position), asc(catVariant.id))
    const variant = variants[(line.pick ?? 1) - 1]
    if (!variant) throw new Error(`haul: «${shop.slug}» sells nothing at «${line.item}»`)
    items.push({ variantId: String(variant.id), qty: line.qty })
  }

  // What an earlier run sent goes back first: the shop's own demo may not be among the ones this
  // run purged, and a second pallet sent on top of the first empties the shelf by halves.
  await purgeRelocations(shop, tx)
  const before = await lastId(catStockMove, tx)
  const relocation = await createRelocation(
    shopId,
    owner,
    { fromPlaceId: String(from.id), toPlaceId: String(to.id), items, note: material.note },
    tx,
  )
  const [carriage] = await tx
    .select()
    .from(shpCarriage)
    .where(
      and(
        eq(shpCarriage.shopSiteId, shopId),
        eq(shpCarriage.carrierSiteId, asSiteId(carrier.id)),
        eq(shpCarriage.status, 'active'),
      ),
    )
    .limit(1)
  if (!carriage) throw new Error(`haul: «${shop.slug}» has no agreement with «${carrier.slug}»`)
  const route = await directionOf(carrier, material.route, tx)
  const shipment = await rideRelocation(
    shopId,
    relocation,
    {
      carriageId: String(carriage.id),
      routeId: String(route.id),
      packages: material.boxes.map((box) => ({ ...box, weight: Math.round(box.weight * 1000) })),
    },
    tx,
  )

  const sent = later(collected, -90)
  await tx.update(catRelocation).set({ createdAt: sent }).where(eq(catRelocation.id, relocation.id))
  await tx.update(catStockMove).set({ createdAt: sent }).where(gt(catStockMove.id, before))
  const born = later(sent, 20)
  await tx
    .update(shpShipment)
    .set({ createdAt: born, stateAt: born, updatedAt: born })
    .where(eq(shpShipment.id, shipment.id))
  await tx.update(shpEvent).set({ createdAt: born }).where(eq(shpEvent.shipmentId, shipment.id))
  return {
    shipmentId: shipment.id,
    orderId: null,
    moved: { shop, relocationId: relocation.id, material },
  }
}

/**
 * The rows a shipment's history gained between two marks, moved to when each thing happened — in
 * the order they were written, the last moment repeated where there are more rows than moments.
 */
export async function stampEvents(
  shipmentId: bigint,
  after: bigint,
  upTo: bigint | null,
  moments: readonly Date[],
  tx: Db | Transaction,
): Promise<void> {
  if (moments.length === 0) return
  const events = await tx
    .select({ id: shpEvent.id })
    .from(shpEvent)
    .where(
      and(
        eq(shpEvent.shipmentId, shipmentId),
        gt(shpEvent.id, after),
        upTo === null ? undefined : lte(shpEvent.id, upTo),
      ),
    )
    .orderBy(asc(shpEvent.id))
  let last: Date | null = null
  for (const [index, event] of events.entries()) {
    last = past(moments[Math.min(index, moments.length - 1)]!)
    await tx.update(shpEvent).set({ createdAt: last }).where(eq(shpEvent.id, event.id))
  }
  if (last) {
    await tx
      .update(shpShipment)
      .set({ stateAt: last, updatedAt: last })
      .where(eq(shpShipment.id, shipmentId))
  }
}

/** The carrier's desk: who signs, where the points are, and what the fleet holds. */
export interface Desk {
  carrier: OrgSite
  carrierId: SiteId
  dispatcher: Actor
  storekeeper: Actor
  points: OrgPlace[]
  fleet: Awaited<ReturnType<typeof listFleet>>
  named: Hauls['fleet']
}

export async function deskOf(tx: Db | Transaction): Promise<Desk> {
  const carrier = await siteBySlug('demo12', tx)
  const carrierId = asSiteId(carrier.id)
  return {
    carrier,
    carrierId,
    dispatcher: await actorOf(carrier, 'dispatcher', tx),
    storekeeper: await actorOf(carrier, 'storekeeper', tx),
    points: await listPlaces(carrierId, tx),
    fleet: await listFleet(carrierId, tx),
    named: (await tulparHauls()).fleet,
  }
}

export interface Load {
  shipmentId: bigint
  /** the stop it gets off at, counting from one */
  stop: number
  left?: { boxes: number; reason: string } | null
}

/**
 * One trip from the dispatcher's desk to wherever the material stops talking: put together,
 * loaded in the yard, and every word said from the road — each of which the platform carries to
 * every shipment aboard. A trip whose last word is not an arrival at its last stop is simply still
 * on the road.
 *
 * `direct` is said where this one vehicle takes a shipment to the end of its road whatever
 * transfers its direction draws. `between` runs after the last word and BEFORE the dates are moved
 * back — for an act that has to meet the shipments in the state the road left them in, counted
 * from the real clock.
 */
export async function walkTrip(
  desk: Desk,
  trip: HaulRoad,
  loads: readonly Load[],
  options: { direct: boolean; between?: () => Promise<void> },
  tx: Db | Transaction,
): Promise<void> {
  const { carrierId, dispatcher, points } = desk
  const said = trip.said.map(at)
  const vehicle = desk.fleet.vehicles.find(
    (one) => one.name === desk.named.vehicles.find((named) => named.key === trip.vehicle)?.name,
  )
  const driver = desk.fleet.drivers.find(
    (one) => one.name === desk.named.drivers.find((named) => named.key === trip.driver)?.name,
  )
  const made = await createTrip(
    carrierId,
    dispatcher,
    {
      // One of the carrier's own, or a hired lorry known only by the words on its papers.
      ...(vehicle ? { vehicleId: String(vehicle.id) } : { vehicle: trip.vehicle }),
      ...(driver ? { driverId: String(driver.id) } : { driver: trip.driver }),
      departsOn: dayOf(said[0]!),
      arrivesOn: dayOf(trip.arrives === undefined ? said.at(-1)! : daysAgo(trip.arrives, 18, 0)),
      note: trip.note,
      stops: trip.stops.map((stop) => {
        if ('where' in stop) return { where: stop.where }
        const point = points[stop.place - 1]
        if (!point) throw new Error(`haul: the carrier has no point №${stop.place}`)
        return { placeId: String(point.id) }
      }),
    },
    tx,
  )
  await mark(carrierId, 'trip', [made.id], tx)
  const stops = (await viewTrip(carrierId, made.id, tx)).stops
  for (const load of loads) {
    const stop = stops[load.stop - 1]
    if (!stop) throw new Error(`haul: the trip has no stop №${load.stop}`)
    await addShipments(
      carrierId,
      made.id,
      { ids: [String(load.shipmentId)], stopId: String(stop.id) },
      tx,
    )
    if (options.direct) {
      await setShipmentRide(carrierId, made.id, load.shipmentId, { onward: false }, tx)
    }
  }

  // The yard: everything ticked in one press, then the exceptions unticked with their reason.
  await loadAll(carrierId, made.id, tx)
  const listed = (await viewTrip(carrierId, made.id, tx)).items
  for (const load of loads) {
    if (!load.left) continue
    const boxes = listed.filter((item) => item.shipmentId === load.shipmentId)
    for (const box of boxes.slice(-load.left.boxes)) {
      await setTripItem(carrierId, made.id, box.id, { loaded: false, reason: load.left.reason }, tx)
    }
  }

  const before = await lastId(shpEvent, tx)
  for (const word of trip.said) {
    await sayTrip(
      carrierId,
      made.id,
      dispatcher,
      {
        kind: word.kind,
        where: word.where ?? null,
        note: word.note ?? null,
        // Parcels taken in at a depot ride unweighed until the scales of the far end: the
        // dispatcher says «it leaves like that», and the trip keeps the numbers it was said about.
        ...(word.kind === 'departed' ? { overload: true } : {}),
      },
      tx,
    )
  }
  const spoken = await lastId(shpEvent, tx)
  await options.between?.()

  // The dates, past the service layer. The trip first: its own words, and when it stood where.
  await tx
    .update(shpTrip)
    .set({ createdAt: daysAgo(trip.planned, 12, 0), updatedAt: past(said.at(-1)!) })
    .where(eq(shpTrip.id, made.id))
  const words = await tx
    .select({ id: shpTripEvent.id, kind: shpTripEvent.kind })
    .from(shpTripEvent)
    .where(eq(shpTripEvent.tripId, made.id))
    .orderBy(asc(shpTripEvent.id))
  // A departure over the limits writes a second row beside its own — the sign-off — which nobody
  // SAID: it happened at the minute of the word before it and takes no moment of its own.
  let heard = -1
  for (const row of words) {
    if (row.kind !== 'overloaded') heard += 1
    await tx
      .update(shpTripEvent)
      .set({ createdAt: past(said[Math.max(heard, 0)]!) })
      .where(eq(shpTripEvent.id, row.id))
  }
  let standing = 0
  for (const [index, word] of trip.said.entries()) {
    if (word.kind === 'departed') {
      await tx
        .update(shpTripStop)
        .set({ departedAt: past(said[index]!) })
        .where(eq(shpTripStop.id, stops[standing]!.id))
    } else if (word.kind === 'arrived') {
      standing += 1
      await tx
        .update(shpTripStop)
        .set({ arrivedAt: past(said[index]!) })
        .where(eq(shpTripStop.id, stops[standing]!.id))
    }
  }
  // And what each word wrote into the shipments aboard: a box that got off at the second stop
  // simply heard fewer of them.
  for (const load of loads) await stampEvents(load.shipmentId, before, spoken, said, tx)
}

export async function seedHauls(): Promise<{ trips: number; skipped: string[] }> {
  const ridden = takeRidden()
  const hauls = await tulparHauls()
  /*
   * A trip names the orders it carries by the word their own shop handed them over under, and a
   * run asked for some of the demos only may not have placed them. Then nothing rides at all:
   * half a loading list is not a smaller scene, it is a different one, and a relocation sent
   * without its trip would leave goods on the road for good.
   */
  const own = new Set(hauls.relocations.map((one) => one.key))
  const missing = hauls.trips
    .flatMap((trip) => trip.loads.map((load) => load.ride))
    .filter((ride) => !own.has(ride) && !ridden.has(ride))
  if (missing.length > 0) return { trips: 0, skipped: missing }

  return db.transaction(async (tx) => {
    const desk = await deskOf(tx)
    const { carrier, carrierId, dispatcher, storekeeper, points } = desk

    for (const trip of hauls.trips) {
      const collected = at(trip.collected)
      const [beforeEvent, beforeMove, beforeEntry, beforeNotice] = await Promise.all([
        lastId(ordEvent, tx),
        lastId(catStockMove, tx),
        lastId(stlEntry, tx),
        lastId(ntfNotice, tx),
      ])

      // What is meant to ride, in the order the list names it.
      const loads: (Sent & Load & { delivered: string | null })[] = []
      for (const load of trip.loads) {
        const relocation = hauls.relocations.find((one) => one.key === load.ride)
        const sent: Sent = relocation
          ? await sendRelocation(relocation, carrier, collected, tx)
          : { ...ridden.get(load.ride)!, moved: null }
        loads.push({
          ...sent,
          stop: load.stop,
          left: load.left ?? null,
          delivered: load.delivered ?? null,
        })
      }
      // The stock that left with the relocations is dated above; what is written past this mark
      // is the dispatch of the orders, which happens when the carrier takes them.
      const afterSending = await lastId(catStockMove, tx)

      const yard = trip.stops[0]
      const yardPlace = yard && 'place' in yard ? points[yard.place - 1] : undefined
      if (!yardPlace) throw new Error("haul: a trip starts from one of the carrier's own points")
      // The carrier comes for the boxes and lays them at the depot the vehicle leaves from.
      for (const load of loads) {
        const mark = await lastId(shpEvent, tx)
        await addEvent(carrierId, load.shipmentId, dispatcher, { kind: 'accepted' }, tx)
        await addEvent(
          carrierId,
          load.shipmentId,
          storekeeper,
          { kind: 'at_depot', placeId: String(yardPlace.id) },
          tx,
        )
        await stampEvents(load.shipmentId, mark, null, [collected, later(collected, 80)], tx)
      }

      await walkTrip(desk, trip, loads, { direct: true }, tx)

      // At the far end: handed over by the code, counted by the owner, and the difference argued.
      const handed = at(trip.handed)
      for (const load of loads) {
        if (!load.moved) continue
        const [shipment] = await tx
          .select()
          .from(shpShipment)
          .where(eq(shpShipment.id, load.shipmentId))
          .limit(1)
        const mark = await lastId(shpEvent, tx)
        await deliver(carrierId, load.shipmentId, dispatcher, { code: shipment!.handoverCode }, tx)
        await stampEvents(load.shipmentId, mark, null, [handed], tx)

        const { shop, relocationId, material } = load.moved
        const shopId = asSiteId(shop.id)
        const lines = (await viewRelocation(shopId, relocationId, tx)).items
        await receiveRelocation(
          shopId,
          relocationId,
          await actorOf(shop, 'owner', tx),
          {
            // In the order they were sent: the document keeps its lines as the material wrote them.
            items: lines.map((line, index) => ({
              id: String(line.id),
              received: material.lines[index]?.received ?? line.qty,
            })),
            // One count, and the road's loss is final: nothing more is coming off that truck.
            isFinal: true,
          },
          tx,
        )
        const counted = at(trip.counted ?? trip.handed)
        await tx
          .update(catRelocation)
          .set({ receivedAt: counted })
          .where(eq(catRelocation.id, relocationId))
        await tx
          .update(catStockMove)
          .set({ createdAt: counted })
          .where(
            and(
              eq(catStockMove.sourceType, 'relocation'),
              eq(catStockMove.sourceId, relocationId),
              gt(catStockMove.id, afterSending),
            ),
          )

        if (material.claim) {
          const claim = await openClaim(
            carrierId,
            load.shipmentId,
            dispatcher,
            {
              kind: material.claim.kind,
              amount: toMinor(material.claim.amount, carrier.currency as Currency),
              note: material.claim.note,
            },
            null,
            tx,
          )
          await tx
            .update(shpClaim)
            .set({ createdAt: at(trip.claimed ?? trip.handed) })
            .where(eq(shpClaim.id, claim.id))
        }
      }

      for (const load of loads) {
        if (load.orderId === null) continue
        if (load.delivered !== null) {
          // Handed to the buyer at the far end by the code, and the shop closes its own order.
          const [shipment] = await tx
            .select()
            .from(shpShipment)
            .where(eq(shpShipment.id, load.shipmentId))
            .limit(1)
          const mark = await lastId(shpEvent, tx)
          await deliver(
            carrierId,
            load.shipmentId,
            dispatcher,
            { code: shipment!.handoverCode },
            tx,
          )
          await stampEvents(load.shipmentId, mark, null, [handed], tx)
          const [order] = await tx
            .select()
            .from(ordOrder)
            .where(eq(ordOrder.id, load.orderId))
            .limit(1)
          const seller = await tx
            .select()
            .from(orgSite)
            .where(eq(orgSite.id, order!.siteId))
            .limit(1)
          if (order!.status === 'confirmed') {
            await changeStatus(
              asSiteId(order!.siteId),
              order!.id,
              await actorOf(seller[0]!, 'owner', tx),
              { status: 'done', comment: load.delivered },
              tx,
            )
          }
        }
        // The order's own journal heard that its goods left when the carrier took them — and,
        // where the shop closed it, that it was closed once the box was handed over.
        const heard = await tx
          .select({ id: ordEvent.id, kind: ordEvent.kind })
          .from(ordEvent)
          .where(and(eq(ordEvent.orderId, load.orderId), gt(ordEvent.id, beforeEvent)))
        for (const event of heard) {
          await tx
            .update(ordEvent)
            .set({ createdAt: event.kind === 'status' ? later(handed, 30) : collected })
            .where(eq(ordEvent.id, event.id))
        }
        await tx
          .update(ordOrder)
          .set({ updatedAt: load.delivered === null ? collected : later(handed, 30) })
          .where(eq(ordOrder.id, load.orderId))
        await tx
          .update(catStockMove)
          .set({ createdAt: collected })
          .where(
            and(
              eq(catStockMove.sourceType, 'order'),
              eq(catStockMove.sourceId, load.orderId),
              gt(catStockMove.id, beforeMove),
            ),
          )
      }
      // What a delivered ride cost, and what both back offices were told on the way.
      await tx
        .update(stlEntry)
        .set({ createdAt: past(handed) })
        .where(gt(stlEntry.id, beforeEntry))
      await tx
        .update(ntfNotice)
        .set({ createdAt: past(at(trip.said.at(-1)!)) })
        .where(gt(ntfNotice.id, beforeNotice))
    }
    return { trips: hauls.trips.length, skipped: [] }
  })
}
