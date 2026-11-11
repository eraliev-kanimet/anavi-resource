import { handInEvening, later, past, stampEvent } from './stamp'
import {
  and,
  asc,
  db,
  desc,
  eq,
  gt,
  inArray,
  sql,
  type Db,
  type Transaction,
} from '@anavi/backend/src/db'
import { HAND_EVENTS, isShipmentOpen, type Currency, type ShipmentEvent } from '@anavi/shared'
import type { Actor } from '@anavi/backend/src/lib/actor'
import {
  stkMove,
  stkOutbound,
  stkOutboundPart,
  stkPackage,
  stkStorage,
  stkStoragePlace,
} from '@anavi/backend/src/db/schema/stk'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import type { ordPayment } from '@anavi/backend/src/db/schema/ord'
import {
  ordEvent,
  ordOrder,
  ordPart,
  ordZone,
  type OrdOrder,
} from '@anavi/backend/src/db/schema/ord'
import { orgSite, type OrgSite } from '@anavi/backend/src/db/schema/org'
import type { shpPayment } from '@anavi/backend/src/db/schema/shp'
import type { finEntry } from '@anavi/backend/src/db/schema/fin'
import {
  shpAct,
  shpAssignment,
  shpCarriage,
  shpCash,
  shpEvent,
  shpDispatch,
  shpShipment,
  shpWeighing,
} from '@anavi/backend/src/db/schema/shp'
import { stlEntry } from '@anavi/backend/src/db/schema/stl'
import { asSiteId, type SiteId } from '@anavi/backend/src/db/ids'
import { billWindow, draftBill, issueBill } from '@anavi/backend/src/modules/keeping/bill.service'
import { changeStatus } from '@anavi/backend/src/modules/order/status.service'
import { getOrder, orderItems } from '@anavi/backend/src/modules/order/order.service'
import { lineHolders, receiveReturn } from '@anavi/backend/src/modules/order/return.service'
import {
  addPackage,
  estimateWeight,
  listPackages,
} from '@anavi/backend/src/modules/order/package.service'
import {
  ensureOutboundPackages,
  updatePackage,
} from '@anavi/backend/src/modules/keeping/box.service'
import { markPart, partsOfOrder, takePart } from '@anavi/backend/src/modules/order/part.service'
import { acceptOffer, assignShipment } from '@anavi/backend/src/modules/shipment/assignment.service'
import {
  courierDeliver,
  courierEvent,
  orderRoute,
} from '@anavi/backend/src/modules/shipment/courier.service'
import { handOver } from '@anavi/backend/src/modules/shipment/handover.service'
import { takeCash } from '@anavi/backend/src/modules/shipment/cash.service'
import { addEvent, voidEvent } from '@anavi/backend/src/modules/shipment/shipment.service'
import { takeBackDispatch } from '@anavi/backend/src/modules/order/carriage'
import { listOrgStaffMembers } from '@anavi/backend/src/modules/staff/staff.service'
import {
  packOutbound,
  placeOutbound,
  shipOutbound,
} from '@anavi/backend/src/modules/keeping/outbound.service'
import { rideOutboundPart } from '@anavi/backend/src/modules/shipment/outbound.ride'
import { actorOf, directionOf } from '../links/keeping'
import type { KeptSending } from '../../demos/vega/seed/kept'
import { DEMOS } from '../demos'
import type { ScriptCarry, ScriptReview } from './script'
import { reviewPlaced } from './review'
import { handByAct, stampActs } from './acts'
import { dayOfMoment } from '../lib/days'
import { agreementIn } from '@anavi/backend/src/db/schema/agr'
import { storageRows } from '@anavi/backend/src/modules/stock/storage.row'

/*
 * What ANOTHER organization did with a shop's order: its storekeeper collected and packed it, the
 * shop handed it over, its courier took it to the door.
 *
 * Walked after every demo has been filled and never inside one demo's own pass, for two reasons
 * that are really one: the work belongs to a different site than the order, and that site may not
 * have been filled yet when the order is placed. So a shop's pass only REMEMBERS which of its
 * orders travel, and this file does the travelling once all of them exist.
 *
 * Two shops come through here and they differ in one fact, read off the base rather than said by
 * the script: whether somebody KEEPS the shop's goods. Where an operator does, its storekeeper
 * collects and packs; where nobody does, the shop packs its own order and only the road is
 * somebody else's.
 *
 * Every act goes through the door the person would press and is signed by the person who would
 * press it — the storekeeper, the dispatcher, a courier, the shop's own owner. The dates are then
 * moved back past the service layer, like every date of a demo.
 */
interface Remembered {
  siteId: SiteId
  orderId: bigint
  /** when the order was placed, which every later moment is counted from */
  on: Date
  carry: ScriptCarry
  /** What the buyer said once it was handed over, and of which of its cards. */
  review?: { said: ScriptReview; line: number } | null
}

const remembered: Remembered[] = []

/*
 * What was handed over to ride between cities, by the word the shop's script gave it — read by the
 * pass that puts trips together (`haul.ts`), which runs after this one.
 */
const ridden = new Map<string, { shipmentId: bigint; orderId: bigint }>()

/** Taken once: the map is emptied, so a second run in one process starts from nothing. */
export function takeRidden(): Map<string, { shipmentId: bigint; orderId: bigint }> {
  const out = new Map(ridden)
  ridden.clear()
  return out
}

export function rememberCarry(one: Remembered): void {
  remembered.push(one)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// Each stage includes the ones before it; the three ends stand side by side.
const RANK: Record<ScriptCarry['to'], number> = {
  taken: 0,
  packed: 1,
  handed: 2,
  offered: 3,
  agreed: 4,
  road: 5,
  delivered: 6,
  failed: 6,
  returned: 6,
}

// A laptop in its carton: what a storekeeper reads off the scales and a tape. Grams, millimetres.
const BOX = { weight: 3200, length: 480, width: 330, height: 90 }

/** The next working morning after a moment, at the given hour — when a warehouse does anything. */
function morningAfter(at: Date, hour: number, minute: number): Date {
  const next = new Date(at)
  next.setDate(next.getDate() + 1)
  next.setHours(hour, minute, 0, 0)
  return next
}

/** A day and a minute of it as a moment. */
function momentOf(day: string, minutes: number): Date {
  const at = new Date(`${day}T00:00:00`)
  at.setMinutes(minutes)
  return at
}

/** The hours the buyer chose at the till, where the shop asks for them. */
function windowOf(order: OrdOrder): { from: Date; to: Date; hours: [number, number] } | null {
  if (!order.serveOn || order.slotStartsAt === null || order.slotEndsAt === null) return null
  return {
    from: momentOf(order.serveOn, order.slotStartsAt),
    to: momentOf(order.serveOn, order.slotEndsAt),
    hours: [order.slotStartsAt, order.slotEndsAt],
  }
}

async function siteOf(siteId: SiteId, tx: Db | Transaction): Promise<OrgSite> {
  const [row] = await tx.select().from(orgSite).where(eq(orgSite.id, siteId)).limit(1)
  return row!
}

/** The couriers of a carrier, in the order they were hired — a round is divided between them. */
async function couriersOf(site: OrgSite, tx: Db | Transaction): Promise<Actor[]> {
  const staff = await listOrgStaffMembers(site.orgId, tx)
  return staff
    .filter((member) => member.roles.includes('courier'))
    .map((member) => ({
      userId: member.staff.userId,
      activeRole: 'courier' as const,
      viaOrgId: null,
    }))
}

/** Where a table stood before this order was touched: what is written past the mark is this pass's. */
export async function lastId(
  table:
    | typeof ordEvent
    | typeof ordPayment
    | typeof stkMove
    | typeof stlEntry
    | typeof ntfNotice
    | typeof shpCash
    | typeof shpEvent
    | typeof shpPayment
    | typeof shpWeighing
    | typeof finEntry,
  tx: Db | Transaction,
): Promise<bigint> {
  const [row] = await tx.select({ id: table.id }).from(table).orderBy(desc(table.id)).limit(1)
  return row?.id ?? 0n
}

/**
 * Collected and packed by the operator that keeps the goods. Says when the boxes were closed, or
 * nothing where the script stops before that.
 */
async function packKept(
  one: Remembered,
  held: Awaited<ReturnType<typeof partsOfOrder>>[number],
  tx: Db | Transaction,
): Promise<Date | null> {
  const keeper = held.supplier
  const keeperId = asSiteId(keeper.id)
  const storekeeper = await actorOf(keeper, 'storekeeper', tx)

  // Within two hours of the order on the same day when it came in the morning, the next morning
  // when it came late.
  const working = one.on.getHours() < 16
  const taken = past(working ? later(one.on, 90) : morningAfter(one.on, 9, 10))
  await takePart(keeperId, held.part.id, storekeeper, tx)
  await tx.update(ordPart).set({ updatedAt: taken }).where(eq(ordPart.id, held.part.id))
  if (RANK[one.carry.to] < RANK.packed) return null

  const packed = past(later(taken, 45))
  await markPart(
    keeperId,
    held.part.id,
    true,
    { actor: storekeeper, packages: one.carry.boxes ?? 1 },
    tx,
  )
  for (const box of await listPackages(keeperId, one.orderId, tx)) {
    await updatePackage(keeperId, box.row.id, BOX, tx)
  }
  // The bill counts a collected part by the hour it was packed and a box by the hour it was made.
  await tx
    .update(ordPart)
    .set({ readyAt: packed, updatedAt: packed })
    .where(eq(ordPart.id, held.part.id))
  await tx.update(stkPackage).set({ createdAt: packed }).where(eq(stkPackage.orderId, one.orderId))
  return packed
}

/**
 * Packed by the shop itself, into bags that were put on the scales.
 *
 * The weight is the point: a carrier's tariff reads it, and a bag handed over unweighed is a
 * shipment born without a price. Where the script names no weights, one bag weighs what its goods
 * state plus the bag — and two kilos where they state nothing, which is a guess said out loud.
 * Packed on the morning of the delivery, an hour and a half before the window opens.
 */
async function packOwn(
  one: Remembered,
  order: OrdOrder,
  owner: Actor,
  tx: Db | Transaction,
): Promise<Date> {
  const stated = (await estimateWeight(one.orderId, tx)).weight
  const whole = stated > 0 ? Math.ceil((stated * 1.04) / 50) * 50 : 2000
  const count = one.carry.boxes ?? 1
  const bags =
    one.carry.weights?.map((kilos) => Math.round(kilos * 1000)) ??
    Array.from({ length: count }, () => Math.round(whole / count))
  for (const weight of bags) await addPackage(one.siteId, one.orderId, owner, { weight }, tx)

  const window = windowOf(order)
  const earliest = later(one.on, 20)
  const packed = past(
    window
      ? new Date(Math.max(earliest.getTime(), later(window.from, -100).getTime()))
      : later(one.on, (one.carry.after ?? 0) * 24 * 60 + 90),
  )
  await tx.update(stkPackage).set({ createdAt: packed }).where(eq(stkPackage.orderId, one.orderId))
  return packed
}

/** The day and hours of the next attempt, as the courier says them with the failure. */
function againOf(
  door: Date,
  again: NonNullable<NonNullable<ScriptCarry['fails']>[number]['again']>,
  hours: [number, number],
): { on: string; from: number; to: number } {
  const [from, to] = again.hours ? [again.hours[0] * 60, again.hours[1] * 60] : hours
  return { on: dayOfMoment(later(door, again.after * 24 * 60)), from, to }
}

async function carryOne(one: Remembered, turn: number, tx: Db | Transaction): Promise<void> {
  const shop = await siteOf(one.siteId, tx)
  const reached = RANK[one.carry.to]
  const owner = await actorOf(shop, 'owner', tx)
  const order = await getOrder(one.siteId, one.orderId, tx)

  const keepers = await tx
    .select({ id: stkStorage.operatorSiteId })
    .from(stkStorage)
    .where(and(eq(stkStorage.sellerSiteId, one.siteId), agreementIn(stkStorage.id, ['active'])))
  const held = (await partsOfOrder(one.orderId, tx)).find((part) =>
    keepers.some((keeper) => keeper.id === part.part.siteId),
  )
  // The shop keeps goods at somebody's, the script says this order travels, and the till decided
  // otherwise: every line was on the shop's own shelf. Said loudly, because a quiet fallback is a
  // demo of storage with nothing collected in it.
  if (keepers.length > 0 && !held) {
    throw new Error(
      `${shop.slug}: order ${one.orderId} is marked as carried, and its keeper has nothing of it to collect`,
    )
  }
  if (!held && one.carry.to === 'taken') {
    throw new Error(`${shop.slug}: nobody keeps this shop's goods — there is no «taken» to reach`)
  }
  // A supplier's part goes with the shop's box only once the supplier said «packed»: its owner
  // collects it within the hour, before the shop packs the order.
  for (const part of await partsOfOrder(one.orderId, tx)) {
    if (part.part.siteId === held?.part.siteId || part.part.readyAt !== null) continue
    const supplier = asSiteId(part.supplier.id)
    const hand = await actorOf(part.supplier, 'owner', tx)
    await takePart(supplier, part.part.id, hand, tx)
    await markPart(supplier, part.part.id, true, null, tx)
    const ready = past(later(one.on, 60))
    await tx
      .update(ordPart)
      .set({ readyAt: ready, updatedAt: ready })
      .where(eq(ordPart.id, part.part.id))
  }
  const packed = held ? await packKept(one, held, tx) : await packOwn(one, order, owner, tx)
  if (packed === null || reached < RANK.handed) return

  const [beforeEvent, beforeMove, beforeEntry, beforeNotice] = await Promise.all([
    lastId(ordEvent, tx),
    lastId(stkMove, tx),
    lastId(stlEntry, tx),
    lastId(ntfNotice, tx),
  ])

  // Under the agreement with whoever keeps the goods, where somebody does: the box is already on
  // that floor. Otherwise the shop's one carrier.
  const carriages = await tx
    .select()
    .from(shpCarriage)
    .where(and(eq(shpCarriage.shopSiteId, one.siteId), agreementIn(shpCarriage.id, ['active'])))
    .orderBy(asc(shpCarriage.id))
  const carriage = carriages.find((row) => row.carrierSiteId === held?.supplier.id) ?? carriages[0]
  if (!carriage) throw new Error(`${shop.slug}: no carrier to hand order ${one.orderId} to`)
  const carrier = await siteOf(carriage.carrierSiteId, tx)
  const carrierId = asSiteId(carrier.id)

  const shipment = await handOver(
    one.siteId,
    one.orderId,
    owner,
    { carriageId: String(carriage.id), collect: one.carry.collect ?? false },
    tx,
  )
  if (one.carry.ride) {
    // It rides on a trip: the script's part ends with the hand-over, and anything it says past
    // that would be a courier carrying a pallet to another city.
    if (one.carry.to !== 'handed') {
      throw new Error(
        `${shop.slug}: «${one.carry.ride}» rides between cities — the script stops at «handed»`,
      )
    }
    ridden.set(one.carry.ride, { shipmentId: shipment.id, orderId: one.orderId })
  }
  const window = windowOf(order)
  // One moment per row of the shipment's history, in the order the rows are written.
  const marks: Date[] = [past(later(packed, held ? 30 : 15))]
  const mark = (at: Date) => {
    const kept = past(new Date(Math.max(at.getTime(), marks.at(-1)!.getTime() + MINUTE)))
    marks.push(kept)
    return kept
  }

  if (reached >= RANK.offered) {
    const dispatcher = await actorOf(carrier, 'dispatcher', tx)
    const couriers = await couriersOf(carrier, tx)
    // A district has its courier — that is what laying a morning out by districts means; where the
    // shop names none, the round is divided in turn.
    const [zone] =
      order.zoneId === null
        ? []
        : await tx
            .select({ position: ordZone.position })
            .from(ordZone)
            .where(eq(ordZone.id, order.zoneId))
            .limit(1)
    const courier = couriers[(zone?.position ?? turn) % couriers.length]
    if (!courier) throw new Error(`${carrier.slug}: nobody to carry order ${one.orderId}`)

    await assignShipment(
      carrierId,
      shipment.id,
      dispatcher,
      { courierId: String(courier.userId) },
      tx,
    )
    /*
     * An offer still waiting for its answer was made a quarter of an hour ago, whenever the order
     * was packed: an offer lives two hours and then comes off by itself, so one stamped at the
     * packing's own hour would be gone from the scene the first time the sweep runs.
     */
    const offered =
      reached >= RANK.agreed ? past(later(marks[0]!, 12)) : new Date(Date.now() - 15 * MINUTE)
    let agreed = offered
    if (reached >= RANK.agreed) {
      await acceptOffer(carrierId, shipment.id, courier, tx)
      agreed = past(later(offered, 9))
    }
    await stampHands(shipment.id, offered, agreed, tx)

    if (reached >= RANK.road) {
      // To a window: the courier comes for the bag forty minutes before it opens. Without one, the
      // round leaves the next morning, and an order packed before noon leaves at one.
      const leaves = window
        ? later(window.from, -40)
        : packed.getHours() < 12
          ? momentOf(dayOfMoment(packed), 13 * 60)
          : morningAfter(packed, 9, 0)
      await courierEvent(carrierId, shipment.id, courier, { kind: 'accepted' }, tx)
      if (one.carry.mistaken) {
        /*
         * The first «taken» was pressed on the wrong box: the desk strikes it with its words, the
         * shop says the goods are still with it — the dispatch lowered below nought — and the
         * courier takes the box for real a few minutes later.
         */
        const [taken] = await tx
          .select({ id: shpEvent.id })
          .from(shpEvent)
          .where(and(eq(shpEvent.shipmentId, shipment.id), eq(shpEvent.kind, 'accepted')))
          .orderBy(desc(shpEvent.id))
          .limit(1)
        await voidEvent(
          carrierId,
          shipment.id,
          taken!.id,
          dispatcher,
          { reason: one.carry.mistaken },
          tx as Transaction,
        )
        await takeBackDispatch(one.siteId, one.orderId, taken!.id, owner, tx)
        await courierEvent(carrierId, shipment.id, courier, { kind: 'accepted' }, tx)
        mark(later(agreed, 5))
      }
      let out = later(mark(new Date(Math.max(leaves.getTime(), later(agreed, 10).getTime()))), 25)
      const onTheWay = window ? 70 : 110
      const hours: [number, number] = window?.hours ?? [10 * 60, 14 * 60]

      for (const fail of one.carry.fails ?? []) {
        await intoTheVan(carrierId, courier, shipment.id, tx)
        const door = later(mark(out), onTheWay)
        const again = fail.again ? againOf(door, fail.again, hours) : null
        await courierEvent(
          carrierId,
          shipment.id,
          courier,
          { kind: 'failed', reason: fail.reason, note: fail.note ?? null, again },
          tx,
        )
        mark(door)
        // The next attempt leaves twenty minutes into the hours that were named, or the next
        // morning where none were.
        out = again ? later(momentOf(again.on, again.from), 20) : morningAfter(door, 10, 0)
      }

      if (one.carry.to === 'returned') {
        // The desk decides it goes back; the courier who still holds it brings it to the shop.
        await addEvent(carrierId, shipment.id, dispatcher, { kind: 'returning' }, tx)
        const back = mark(later(marks.at(-1)!, 40))
        await handByAct(
          carrierId,
          courier,
          courier,
          { direction: 'out', party: 'sender' },
          [shipment.id],
          tx,
        )
        mark(later(back, 90))
        /*
         * The box is back, and every line is taken in before the order is called off — the door
         * refuses the other order of the two: a cancellation releases what is held and leaves what
         * left as gone. Each by whoever held it: the shop's own lines by the shop, a supplier's by
         * the supplier, through its own door.
         */
        const holders = await lineHolders(one.orderId, tx)
        const out = (await orderItems(one.orderId, tx)).filter(
          (line) => holders.has(line.id) && line.shipped > line.returned,
        )
        for (const holder of new Set(out.map((line) => holders.get(line.id)!))) {
          const site = await siteOf(holder, tx)
          await receiveReturn(
            holder,
            one.orderId,
            holder === one.siteId ? owner : await actorOf(site, 'owner', tx),
            {
              lines: out
                .filter((line) => holders.get(line.id) === holder)
                .map((line) => ({
                  id: String(line.id),
                  qty: line.shipped - line.returned,
                  fit: true,
                })),
            },
            tx,
          )
        }
        // And the shop cancels its own order: a carrier never does.
        await changeStatus(
          one.siteId,
          one.orderId,
          owner,
          { status: 'canceled', comment: one.carry.say ?? null },
          tx,
        )
      } else if (one.carry.to !== 'failed') {
        await intoTheVan(carrierId, courier, shipment.id, tx)
        const left = mark(out)

        if (one.carry.to === 'delivered') {
          const [fresh] = await tx
            .select()
            .from(shpShipment)
            .where(eq(shpShipment.id, shipment.id))
            .limit(1)
          await courierDeliver(
            carrierId,
            shipment.id,
            courier,
            { code: fresh!.handoverCode, collected: fresh!.cod, method: 'cash' },
            tx,
          )
          const door = mark(later(left, onTheWay))
          // And the shop closes its own order: a carrier never does, it only says the box was
          // handed over.
          if ((await getOrder(one.siteId, one.orderId, tx)).status === 'confirmed') {
            await changeStatus(
              one.siteId,
              one.orderId,
              owner,
              { status: 'done', comment: one.carry.say ?? null, close: 'ship' },
              tx,
            )
          }
          if (fresh!.cod && fresh!.codCurrency) {
            await handInCash(
              carrierId,
              dispatcher,
              courier,
              { amount: fresh!.cod, currency: fresh!.codCurrency as Currency, door },
              cashNote(shop.name, order.number),
              tx,
            )
          }
        }
      }
    }
  }
  // An order collected at several points left as a parcel per point; the others travel the same
  // road the first one did, a step behind it.
  await followAlong(one.orderId, shipment.id, carrier, marks, tx)
  await stampShipment(shipment.id, marks, tx)
  await stampOrderAfter(one.orderId, beforeEvent, beforeMove, marks, tx)
  // What the two organizations now owe each other for this box, and what the buyer and both back
  // offices were told about it, dated by the last thing that happened to it.
  const last = marks.at(-1)!
  await tx.update(stlEntry).set({ createdAt: last }).where(gt(stlEntry.id, beforeEntry))
  await tx.update(ntfNotice).set({ createdAt: last }).where(gt(ntfNotice.id, beforeNotice))
}

/** What a hand-in says it was for — words for a person. */
const cashNote = (shop: string, order: number | string) => `${shop}, заказ ${order}`

/**
 * The money a courier took at a door, handed in at the desk that evening.
 *
 * Only for a door that is at least a day old: what was taken today is still in the courier's
 * pocket, and that is the figure a dispatcher opens the evening with.
 */
async function handInCash(
  carrierId: SiteId,
  dispatcher: Actor,
  courier: Actor,
  taken: { amount: number; currency: Currency; door: Date },
  reference: string,
  tx: Db | Transaction,
): Promise<void> {
  const evening = handInEvening(taken.door)
  if (Date.now() - evening.getTime() < DAY) return
  const before = await lastId(shpCash, tx)
  await takeCash(
    carrierId,
    dispatcher,
    {
      courierId: String(courier.userId),
      amount: taken.amount,
      currency: taken.currency,
      note: reference,
    },
    tx,
  )
  await tx.update(shpCash).set({ createdAt: evening }).where(gt(shpCash.id, before))
}

/** The journal of hands: when the desk named the courier and when the courier said yes. */
async function stampHands(shipmentId: bigint, offered: Date, agreed: Date, tx: Db | Transaction) {
  const rows = await tx
    .select({ id: shpAssignment.id, kind: shpAssignment.kind })
    .from(shpAssignment)
    .where(eq(shpAssignment.shipmentId, shipmentId))
  for (const row of rows) {
    await tx
      .update(shpAssignment)
      .set({ createdAt: row.kind === 'accepted' ? agreed : offered })
      .where(eq(shpAssignment.id, row.id))
  }
  await tx
    .update(shpDispatch)
    .set({ courierAt: offered })
    .where(eq(shpDispatch.shipmentId, shipmentId))
}

/**
 * What the hand-over wrote into the ORDER's own journal and onto the shelf, moved to when it
 * happened.
 *
 * The order was dated when it was placed, before any of this existed, so these rows alone still
 * carry the second the fixture ran: «handed to the carrier», the dispatch a courier's acceptance
 * performs, the money taken at the door, the shop closing the order. The first is the hand-over
 * itself; the dispatch is the courier taking the box; everything after is the door.
 */
async function stampOrderAfter(
  orderId: bigint,
  afterEvent: bigint,
  afterMove: bigint,
  moments: Date[],
  tx: Db | Transaction,
) {
  const handed = moments[0]!
  const taken = moments[1] ?? handed
  const last = moments.at(-1)!
  const events = await tx
    .select({ id: ordEvent.id, kind: ordEvent.kind, paymentId: ordEvent.paymentId })
    .from(ordEvent)
    .where(and(eq(ordEvent.orderId, orderId), gt(ordEvent.id, afterEvent)))
    .orderBy(asc(ordEvent.id))
  for (const [index, event] of events.entries()) {
    const at =
      event.kind === 'carrier'
        ? handed
        : event.kind === 'shipment'
          ? taken
          : new Date(last.getTime() + index * 60_000)
    await stampEvent(event, at, tx)
  }
  await tx
    .update(stkMove)
    .set({ createdAt: taken, on: dayOfMoment(taken) })
    .where(
      and(
        eq(stkMove.sourceType, 'order'),
        eq(stkMove.sourceId, orderId),
        gt(stkMove.id, afterMove),
      ),
    )
  await tx.update(ordOrder).set({ updatedAt: last }).where(eq(ordOrder.id, orderId))
}

/**
 * The shipment's own history moved to when it happened: the first moment is its birth, each one
 * after it an event, in the order they were written.
 */
/** The courier loads their own van: an act of theirs that counts the box by its code. */
function intoTheVan(
  carrierId: SiteId,
  courier: Actor,
  shipmentId: bigint,
  tx: Db | Transaction,
): Promise<bigint> {
  return handByAct(
    carrierId,
    courier,
    courier,
    { direction: 'out', party: 'courier', courierId: courier.userId },
    [shipmentId],
    tx,
  )
}

/**
 * The other parcels of an order collected at several points — a supplier's hall beside the shop's
 * own — taken along the road its first parcel travelled.
 *
 * The script speaks about an ORDER, and an order used to be one box. It is now a box per point, and
 * a demo that walked one of them would show a delivered order with a parcel still waiting at the
 * supplier's door for ever. The same events, said by the carrier's desk in the same order and dated
 * by the same moments: the courier who came for one box came for the other.
 */
async function followAlong(
  orderId: bigint,
  firstId: bigint,
  carrier: OrgSite,
  moments: Date[],
  tx: Db | Transaction,
): Promise<void> {
  const parcels = await tx
    .select()
    .from(shpShipment)
    .where(and(eq(shpShipment.sourceType, 'order'), eq(shpShipment.sourceId, orderId)))
    .orderBy(asc(shpShipment.id))
  const others = parcels.filter((one) => one.id !== firstId && one.state === 'created')
  if (others.length === 0) return
  const road = await tx
    .select()
    .from(shpEvent)
    .where(eq(shpEvent.shipmentId, firstId))
    .orderBy(asc(shpEvent.id))
  const dispatcher = await actorOf(carrier, 'dispatcher', tx)
  for (const parcel of others) {
    for (const step of road) {
      if (step.kind === 'created') continue
      // The same hand-over, counted again for this box by an act of its own: the one who closed the
      // first parcel's act closes this one.
      if (HAND_EVENTS.includes(step.kind)) {
        const [first] = step.actId
          ? await tx.select().from(shpAct).where(eq(shpAct.id, step.actId)).limit(1)
          : []
        if (!first) throw new Error(`parcel ${firstId}: «${step.kind}» was written by no act`)
        const who = { userId: step.actorUserId!, activeRole: step.actorRole!, viaOrgId: null }
        await handByAct(
          asSiteId(carrier.id),
          who,
          who,
          {
            direction: first.direction,
            party: first.party,
            ...(first.courierUserId === null ? {} : { courierId: first.courierUserId }),
            ...(first.vehicleId === null ? {} : { vehicleId: first.vehicleId }),
            ...(first.placeId === null ? {} : { placeId: first.placeId }),
          },
          [parcel.id],
          tx,
        )
        continue
      }
      await addEvent(
        asSiteId(carrier.id),
        parcel.id,
        dispatcher,
        {
          kind: step.kind,
          placeId: step.placeId === null ? null : String(step.placeId),
          where: step.place,
          note: step.note,
          ...(step.reason ? { reason: step.reason } : {}),
        },
        tx,
        // Handed over at the same door, to the same person; the money was taken with the first box.
        step.kind === 'delivered'
          ? { proof: step.proof ?? 'code', receiver: step.receiver, collected: null }
          : null,
      )
    }
    await stampShipment(parcel.id, moments, tx)
  }
}

async function stampShipment(shipmentId: bigint, moments: Date[], tx: Db | Transaction) {
  const events = await tx
    .select({ id: shpEvent.id })
    .from(shpEvent)
    .where(eq(shpEvent.shipmentId, shipmentId))
    .orderBy(asc(shpEvent.id))
  // `created` is the birth itself; the events said afterwards take the moments that follow.
  for (const [index, event] of events.entries()) {
    const at = moments[Math.min(index, moments.length - 1)]!
    await tx.update(shpEvent).set({ createdAt: at }).where(eq(shpEvent.id, event.id))
  }
  const last = moments.at(-1)!
  await tx
    .update(shpShipment)
    .set({ createdAt: moments[0]!, stateAt: last, updatedAt: last })
    .where(eq(shpShipment.id, shipmentId))
  // The first reading of the scales is written with the birth, and stands on its day.
  await tx
    .update(shpWeighing)
    .set({ createdAt: moments[0]! })
    .where(eq(shpWeighing.shipmentId, shipmentId))
}

/**
 * What every operator charges for the period, issued once the work it counts has been done.
 *
 * From the day the first pallet came to today, as one bill: receiving, the orders collected above,
 * the boxes made, and every day each position lay there.
 *
 * Only for the sellers FILLED in this run: a bill counts the work done over its seller's orders,
 * and a seller this run did not fill has none.
 */
async function billKeeping(filled: readonly SiteId[], tx: Db | Transaction): Promise<number> {
  if (filled.length === 0) return 0
  const storages = await storageRows(tx).where(
    and(agreementIn(stkStorage.id, ['active']), inArray(stkStorage.sellerSiteId, [...filled])),
  )
  let issued = 0
  for (const storage of storages) {
    const operator = await siteOf(storage.operatorSiteId, tx)
    const boss = await actorOf(operator, 'owner', tx)
    const operatorId = asSiteId(operator.id)
    // Every day that has ended, from the first the goods lay here: where a bill starts is the
    // platform's to say, and today is not billed until it is over.
    const window = await billWindow(storage, operator, tx)
    if (window.until === null) continue
    const draft = await draftBill(operatorId, storage.id, { to: window.until }, tx)
    const seen = { total: draft.lines.reduce((sum, line) => sum + line.amount, 0) }
    await issueBill(operatorId, storage.id, boss, { to: window.until, seen }, tx)
    issued += 1
  }
  return issued
}

/**
 * Each courier's day, laid out by the desk: the earliest window first, and inside a window one
 * district after another — so a van does not cross the river twice for two neighbouring doors.
 *
 * Said whole through the door the dispatcher's own board uses, over everything a courier still
 * holds: what was offered and not yet answered has its place in the day as well.
 */
async function layDays(tx: Db | Transaction): Promise<void> {
  const carriers = await tx
    .selectDistinct({ id: shpCarriage.carrierSiteId })
    .from(shpCarriage)
    .where(agreementIn(shpCarriage.id, ['active']))
  for (const row of carriers) {
    const carrier = await siteOf(row.id, tx)
    for (const courier of await couriersOf(carrier, tx)) {
      const held = await tx
        .select({ shipment: shpShipment })
        .from(shpShipment)
        .innerJoin(shpDispatch, eq(shpDispatch.shipmentId, shpShipment.id))
        .where(
          and(eq(shpShipment.siteId, carrier.id), eq(shpDispatch.courierUserId, courier.userId)),
        )
        .orderBy(
          asc(shpShipment.deliverOn),
          asc(shpShipment.deliverFrom),
          asc(shpShipment.districtId),
          asc(shpShipment.id),
        )
      const open = held
        .map((row) => row.shipment)
        .filter((one) => isShipmentOpen(one.state as ShipmentEvent))
      if (open.length === 0) continue
      await orderRoute(
        asSiteId(carrier.id),
        courier.userId,
        courier,
        { ids: open.map((one) => String(one.id)) },
        tx,
      )
    }
  }
}

/*
 * An instruction the shop gave the warehouse that keeps its goods, walked through every door it
 * meets: the shop places it naming its carrier, the storekeeper packs and lets each part go, each
 * part is born a parcel at the carrier's, and the first is carried to the door. Only where the shop
 * was filled in this run.
 */
async function sendKept(
  sending: KeptSending,
  shopSlug: string,
  filled: readonly SiteId[],
  tx: Db | Transaction,
): Promise<number> {
  const [shop] = await tx.select().from(orgSite).where(eq(orgSite.slug, shopSlug)).limit(1)
  if (!shop || !filled.includes(asSiteId(shop.id))) return 0
  const [storage] = await tx
    .select()
    .from(stkStorage)
    .where(and(eq(stkStorage.sellerSiteId, shop.id), agreementIn(stkStorage.id, ['active'])))
    .limit(1)
  if (!storage) throw new Error(`${shop.slug}: nobody keeps this shop's goods to send from`)
  const [floor] = await tx
    .select({ placeId: stkStoragePlace.placeId })
    .from(stkStoragePlace)
    .where(eq(stkStoragePlace.storageId, storage.id))
    .limit(1)
  const operator = await siteOf(storage.operatorSiteId, tx)
  const operatorId = asSiteId(operator.id)
  const [carriage] = await tx
    .select()
    .from(shpCarriage)
    .where(
      and(
        eq(shpCarriage.shopSiteId, shop.id),
        eq(shpCarriage.carrierSiteId, operator.id),
        agreementIn(shpCarriage.id, ['active']),
      ),
    )
    .limit(1)
  if (!floor || !carriage) throw new Error(`${shop.slug}: no floor or no carrier to send from`)
  const owner = await actorOf(shop, 'owner', tx)
  const storekeeper = await actorOf(operator, 'storekeeper', tx)
  const dispatcher = await actorOf(operator, 'dispatcher', tx)
  const [courier] = await couriersOf(operator, tx)
  if (!courier) throw new Error(`${operator.slug}: nobody to carry the instruction`)

  const variants = await tx
    .select({ id: catVariant.id, slug: catProduct.slug })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .where(
      and(
        eq(catProduct.siteId, shop.id),
        eq(catVariant.isPrimary, true),
        inArray(
          catProduct.slug,
          sending.lines.map((line) => line.slug),
        ),
      ),
    )
  const idOf = (slug: string) => {
    const found = variants.find((one) => one.slug === slug)
    if (!found) throw new Error(`${shop.slug}: the instruction names nothing at «${slug}»`)
    return found.id
  }

  const [beforeMove, beforeNotice, beforeEntry] = await Promise.all([
    lastId(stkMove, tx),
    lastId(ntfNotice, tx),
    lastId(stlEntry, tx),
  ])
  const placedAt = past(new Date(Date.now() - sending.days * DAY))
  placedAt.setHours(10, 30, 0, 0)
  const outbound = await placeOutbound(
    asSiteId(shop.id),
    owner,
    {
      storageId: String(storage.id),
      placeId: String(floor.placeId),
      kind: 'dispatch',
      recipient: sending.recipient,
      phone: sending.phone,
      address: sending.address,
      note: sending.note,
      carriageId: String(carriage.id),
      routeId: String((await directionOf(operator, sending.route, tx)).id),
      items: sending.lines.map((line) => ({ variantId: String(idOf(line.slug)), qty: line.qty })),
    },
    tx,
  )
  await tx
    .update(stkMove)
    .set({ createdAt: placedAt, on: dayOfMoment(placedAt) })
    .where(gt(stkMove.id, beforeMove))

  let last = placedAt
  for (const [index, one] of sending.parts.entries()) {
    // Packed after lunch and let go before the evening; a part of today, a minute ago at the latest.
    const packedAt = past(new Date(Date.now() - one.days * DAY))
    packedAt.setHours(14, 10, 0, 0)
    const packed = past(new Date(Math.max(packedAt.getTime(), later(last, 30).getTime())))
    const leftAt = past(later(packed, 50))
    const moved = await lastId(stkMove, tx)
    // The boxes first, one row and one label each, then the word that it is packed.
    await ensureOutboundPackages(operatorId, outbound, storekeeper, one.packages, tx)
    await packOutbound(operatorId, outbound.id, storekeeper, { weight: one.weight }, tx)
    const part = await shipOutbound(
      operatorId,
      outbound.id,
      storekeeper,
      {
        items: Object.entries(one.lines).map(([slug, qty]) => ({
          variantId: String(idOf(slug)),
          qty,
        })),
      },
      tx,
    )
    const ride = await rideOutboundPart(part, tx)
    if (!ride) throw new Error(`${shop.slug}: part ${part.number} left with no carrier`)
    await tx
      .update(stkOutboundPart)
      .set({ createdAt: packed, packedAt: packed, shippedAt: leftAt })
      .where(eq(stkOutboundPart.id, part.id))
    await tx
      .update(stkMove)
      .set({ createdAt: leftAt, on: dayOfMoment(leftAt) })
      .where(gt(stkMove.id, moved))
    const marks = [leftAt]
    last = leftAt
    // The first part is carried to the door the next morning; the last one has only been handed over.
    if (index === 0 && sending.parts.length > 1) {
      await assignShipment(
        operatorId,
        ride.id,
        dispatcher,
        { courierId: String(courier.userId) },
        tx,
      )
      await acceptOffer(operatorId, ride.id, courier, tx)
      const offered = later(leftAt, 20)
      const agreed = later(offered, 9)
      await stampHands(ride.id, offered, agreed, tx)
      await courierEvent(operatorId, ride.id, courier, { kind: 'accepted' }, tx)
      await intoTheVan(operatorId, courier, ride.id, tx)
      const [fresh] = await tx
        .select()
        .from(shpShipment)
        .where(eq(shpShipment.id, ride.id))
        .limit(1)
      await courierDeliver(
        operatorId,
        ride.id,
        courier,
        { code: fresh!.handoverCode, collected: fresh!.cod, method: 'cash' },
        tx,
      )
      const out = past(morningAfter(leftAt, 10, 15))
      marks.push(offered, agreed, out, past(later(out, 70)))
      last = marks.at(-1)!
      // The day the platform counted from the run's own today, moved with the birth to the day it
      // was set back to.
      await tx
        .update(shpShipment)
        .set({
          expectedOn: sql`${shpShipment.expectedOn} + ${Math.round(
            (Date.parse(dayOfMoment(leftAt)) - Date.parse(dayOfMoment(new Date()))) / DAY,
          )}::int`,
        })
        .where(eq(shpShipment.id, ride.id))
    }
    await stampShipment(ride.id, marks, tx)
  }
  // The last part closed it: every line has left.
  await tx
    .update(stkOutbound)
    .set({ createdAt: placedAt, updatedAt: last, shippedAt: last })
    .where(eq(stkOutbound.id, outbound.id))
  await tx.update(stlEntry).set({ createdAt: last }).where(gt(stlEntry.id, beforeEntry))
  // What the desk, the warehouse and the shop were told of it, on the day it happened.
  await tx.update(ntfNotice).set({ createdAt: last }).where(gt(ntfNotice.id, beforeNotice))
  return 1
}

/** Everything remembered while the demos were being filled, walked in the order it was placed. */
export async function seedCarried(
  filled: readonly SiteId[],
): Promise<{ carried: number; sent: number; bills: number }> {
  const batch = remembered.splice(0).sort((a, b) => a.on.getTime() - b.on.getTime())
  return db.transaction(async (tx) => {
    for (const [turn, one] of batch.entries()) {
      await carryOne(one, turn, tx)
      // What the buyer said of it, now that it has been handed over and closed — or the buyer's
      // door refuses, and with it the run: a review of a parcel still on the road was never written.
      if (one.review) {
        await reviewPlaced(
          await siteOf(one.siteId, tx),
          await getOrder(one.siteId, one.orderId, tx),
          one.review.said,
          one.review.line,
          one.on,
          tx,
        )
      }
    }
    let sent = 0
    for (const demo of DEMOS)
      if (demo.sends) sent += await sendKept(demo.sends, demo.slug, filled, tx)
    await layDays(tx)
    await stampActs(tx)
    return { carried: batch.length, sent, bills: await billKeeping(filled, tx) }
  })
}
