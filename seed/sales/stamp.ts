import { dayOfMoment } from '../lib/days'
import { bindingOf } from '@anavi/backend/src/modules/order/attribution.service'
import { and, asc, eq, gt, isNotNull, isNull, sql } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { stkMove } from '@anavi/backend/src/db/schema/stk'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { formSubmission } from '@anavi/backend/src/db/schema/form'
import { msgMessage, msgRead } from '@anavi/backend/src/db/schema/msg'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import {
  ordDeliverySides,
  ordEvent,
  ordGoodsOut,
  ordItemVisit,
  ordOrder,
  ordOrderCredit,
  ordOrderItem,
  ordSlot,
  ordPayment,
} from '@anavi/backend/src/db/schema/ord'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import { slotLabels } from '@anavi/backend/src/modules/order/slot.service'
import { stampDue } from '@anavi/backend/src/modules/order/credit.service'
import { freezeSides } from '@anavi/backend/src/modules/order/sides.service'
import { freezeDispatchRates, visitRates } from '@anavi/backend/src/modules/order/tax-rates'
import { slotKey } from '@anavi/shared'
import type { SubmittedAnswer } from '@anavi/backend/src/db/schema/form'
import { refAccrual } from '@anavi/backend/src/db/schema/ref'
import { asSiteId, type SiteId } from '@anavi/backend/src/db/ids'

/** «So many days ago, at this hour» — the way every date of a demo is said. */
export interface HaulMoment {
  days: number
  at: [number, number]
}

/**
 * Dates, written after the fact and past the service layer.
 *
 * The deliberate local exception the seed has always been allowed — the one pinning a dev password
 * is the other. Every service stamps «now», which is correct for a service and useless for a
 * fixture: thirty orders of the same minute leave the list, the counters and every sorting with
 * nothing to tell them apart, and a demo opened to show how a shop lives shows one instant of it.
 */
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const MINUTE = 60_000

/** Never after this minute: a fixture dated in the future is a parcel delivered tomorrow. */
export const past = (at: Date) => new Date(Math.min(at.getTime(), Date.now() - MINUTE))

export const later = (at: Date, minutes: number) => new Date(at.getTime() + minutes * MINUTE)

/**
 * The evening a courier's or a counter's cash is handed in at the till: half past seven of the
 * door's day, or an hour after the door where it was opened later than that.
 */
export function handInEvening(door: Date): Date {
  const evening = new Date(door)
  evening.setHours(19, 30, 0, 0)
  if (evening.getTime() < door.getTime()) evening.setTime(door.getTime() + 60 * MINUTE)
  return evening
}

export function daysAgo(days: number, hour = 11, minute = 0): Date {
  const at = new Date(Date.now() - days * DAY)
  at.setHours(hour, minute, 0, 0)
  return at
}

/**
 * `count` moments starting exactly at `from`. The span is the natural one — a day between the
 * moves of an order, hours between the lines of a conversation — until it would run past this
 * moment, and then it is squeezed to fit: a fixture must never be dated tomorrow.
 */
export function timeline(from: Date, count: number, step: number): Date[] {
  if (count <= 1) return [from]
  const wanted = (count - 1) * step
  const room = Math.max(Date.now() - HOUR - from.getTime(), (count - 1) * 60_000)
  const span = Math.min(wanted, room)
  return Array.from(
    { length: count },
    (_, i) => new Date(from.getTime() + (span * i) / (count - 1)),
  )
}

// Nine in the morning to ten at night. A conversation walked forward by adding hours lands in the
// small hours every third message, and a manager answering at 02:25 reads as a machine — while «wrote
// at ten at night, answered at nine in the morning» is what actually happens and reads as it.
const OPENS = 9
const CLOSES = 22

export function daytime(at: Date): Date {
  const hour = at.getHours()
  if (hour >= OPENS && hour < CLOSES) return at
  const moved = new Date(at)
  if (hour >= CLOSES) moved.setDate(moved.getDate() + 1)
  moved.setHours(OPENS, at.getMinutes(), 0, 0)
  return moved
}

// A row of the journal moved to its day, and the money it records with it.
export async function stampEvent(
  event: { id: bigint; paymentId: bigint | null },
  at: Date,
  tx: Db | Transaction,
): Promise<void> {
  await tx.update(ordEvent).set({ createdAt: at }).where(eq(ordEvent.id, event.id))
  // The money's day moves with it: the day of the organization that keeps the order's books.
  if (event.paymentId !== null)
    await tx.execute(sql`
      update ${ordPayment} p set created_at = ${at.toISOString()}, "on" = (${at.toISOString()}::timestamptz at time zone o.timezone)::date
      from ord_order r join org_site s on s.id = r.site_id join org o on o.id = s.org_id
      where p.id = ${event.paymentId} and r.id = p.order_id`)
}

export async function stampOrder(
  orderId: bigint,
  placedAt: Date,
  tx: Db | Transaction,
  /*
   * Whether the questionnaire behind it moves too.
   *
   * It does for a till order, whose answers were given in the act of ordering. It must NOT for one
   * raised out of an appeal: that document points at the APPEAL's questionnaire, which was written
   * earlier and is what dates the conversation in the feed — moving it would drag the whole
   * exchange forward to the day the manager wrote the order.
   */
  options: { intake?: boolean } = {},
) {
  const events = await tx
    .select({ id: ordEvent.id, paymentId: ordEvent.paymentId })
    .from(ordEvent)
    .where(eq(ordEvent.orderId, orderId))
    .orderBy(asc(ordEvent.id))
  const times = timeline(placedAt, events.length, DAY)
  for (const [i, event] of events.entries()) {
    await stampEvent(event, times[i]!, tx)
  }
  const last = times.at(-1) ?? placedAt

  // The journal follows the moves it recorded: a warehouse whose whole history happened in one
  // second is the same lie the order list was telling.
  const moves = await tx
    .select({ id: stkMove.id })
    .from(stkMove)
    .where(and(eq(stkMove.sourceType, 'order'), eq(stkMove.sourceId, orderId)))
    .orderBy(asc(stkMove.id))
  const moved = timeline(placedAt, moves.length, HOUR)
  for (const [i, move] of moves.entries()) {
    await tx
      .update(stkMove)
      .set({ createdAt: moved[i]!, on: dayOfMoment(moved[i]!) })
      .where(eq(stkMove.id, move.id))
  }

  /*
   * What a partner earned on it moves with the journal that produced it.
   *
   * An accrual is written by the platform in the moment money arrives or an order dies, so every one
   * of them carries the second the fixture ran — and a partner's page, which is ordered by this
   * column, would show a year of work as one instant. Dated by the LAST movement of the order,
   * because that is the movement that decided the sum.
   */
  await tx
    .update(refAccrual)
    .set({
      createdAt: last,
      updatedAt: last,
      // a row the platform canceled in the same run is dated with the rest of it
      canceledAt: sql`case when ${refAccrual.canceledAt} is not null then ${last.toISOString()}::timestamptz end`,
    })
    .where(eq(refAccrual.orderId, orderId))

  const [order] = await tx
    .select({ submissionId: ordOrder.submissionId })
    .from(ordOrder)
    .where(eq(ordOrder.id, orderId))
  // When the money came is no longer a column: it is the date of its own movement, and the loop
  // above has already moved every event of this order, that one included.
  await tx
    .update(ordOrder)
    .set({ createdAt: placedAt, updatedAt: last })
    .where(eq(ordOrder.id, orderId))
  if (order!.submissionId && options.intake !== false) {
    await stampIntake(order!.submissionId, placedAt, tx)
  }
}

/**
 * The answers and the line they opened in the feed, both moved to the day they were given.
 *
 * A conversation is dated by its messages and by nothing else — see `settleThreads` — so this is
 * also what puts an order-born appeal where it belongs in the inbox.
 */
export async function stampIntake(submissionId: bigint, at: Date, tx: Db | Transaction) {
  await tx.update(formSubmission).set({ createdAt: at }).where(eq(formSubmission.id, submissionId))
  await tx
    .update(msgMessage)
    .set({ createdAt: at })
    .where(eq(msgMessage.submissionId, submissionId))
}

export async function stampMessage(messageId: bigint, at: Date, tx: Db | Transaction) {
  await tx.update(msgMessage).set({ createdAt: at }).where(eq(msgMessage.id, messageId))
}

/**
 * Every conversation's dates read back off its own lines.
 *
 * Not a convenience: one person writing twice keeps ONE conversation — the engine joins the second
 * appeal to the open one — so a thread's beginning and end belong to whichever messages ended up in
 * it, and no single caller knows them all.
 */
export async function settleThreads(siteId: SiteId, tx: Db | Transaction) {
  await tx.execute(sql`
    update msg_thread t
    set created_at = m.first, last_message_at = m.last, updated_at = m.last,
        said_at = coalesce(m.said, m.last)
    from (
      select thread_id, min(created_at) as first, max(created_at) as last,
             max(created_at) filter (where not is_internal) as said
      from msg_message group by thread_id
    ) m
    where m.thread_id = t.id and t.site_id = ${siteId}
  `)
  // The visitor has read what they were answered a few days ago; an answer of the last days is
  // still new to them, which is what «my appeals» marks.
  await tx.execute(sql`
    update msg_visitor v
    set guest_read_at = case when m.last < now() - interval '3 days' then m.last
                             else coalesce(m.guest, m.first) end
    from (
      select thread_id, min(created_at) as first, max(created_at) as last,
             max(created_at) filter (where author = 'guest') as guest
      from msg_message group by thread_id
    ) m, msg_thread t
    where m.thread_id = v.thread_id and t.id = v.thread_id and t.site_id = ${siteId}
  `)
}

/**
 * When the desk last looked at it — null leaves the appeal unread, which is what the bell counts.
 * The desk is everybody of the site's staff: each person's mark is their own (`msg_read`), and a demo
 * that has to show «seen» shows it to whoever opens it.
 */
export async function markSeen(threadId: bigint, at: Date | null, tx: Db | Transaction) {
  await tx.delete(msgRead).where(eq(msgRead.threadId, threadId))
  if (at === null) return
  await tx.execute(sql`
    insert into msg_read (thread_id, user_id, read_at)
    select t.id, s.user_id, ${at.toISOString()}::timestamptz
    from msg_thread t
    join org_site o on o.id = t.site_id
    join org_staff s on s.org_id = o.org_id and s.deleted_at is null
    where t.id = ${threadId}
  `)
}

/**
 * What the platform said while a sale was written, moved to the day of the sale.
 *
 * A notice of a day gone by was heard by then: it is born read and rung, so the bell does not
 * count thousands of old lines and the first morning round does not ring them all. Only the last
 * days stay as they were made — new, and waiting for their hour.
 */
export async function ageNotices(after: bigint, at: Date, tx: Db | Transaction) {
  const settled = at.getTime() < Date.now() - 3 * DAY
  await tx
    .update(ntfNotice)
    .set(
      settled
        ? {
            createdAt: at,
            owed: [],
            readAt: sql`coalesce(${ntfNotice.readAt}, ${at.toISOString()}::timestamptz)`,
          }
        : { createdAt: at },
    )
    .where(gt(ntfNotice.id, after))
}

/**
 * The record of what was said follows the feed's dates, once every pass has aged its notices.
 *
 * `ntf_told` is written beside each notice under the same number and moment and never touched again
 * by the platform; the passes above move the feed's moments past the service layer, so the journal is
 * moved after them by that shared number — the same exception, and it stays one statement however
 * many passes set notices back.
 */
export async function followNotices(tx: Db | Transaction): Promise<void> {
  await tx.execute(sql`
    update ntf_told t set created_at = n.created_at
      from ntf_notice n
     where n.id = t.id and t.created_at <> n.created_at
  `)
}

/*
 * What an order DID, set on the day it was done, once every pass has dated its journal.
 *
 * The service layer writes a dispatch, a mark «done» and the sides of a delivery in the moment the
 * fixture runs, and the passes then move the journal's lines — the events, the movements, the books
 * — to their true days. These rows have no pass of their own, so they stood on the day of the run,
 * and a term counted from them was a term counted from today: no debt was ever late. Every dispatch
 * is the day of its own line in the journal, every service is done on the day its line says, and the
 * sides of a delivery, the terms of each dispatch and the order's due day are asked of the platform
 * again, as it counts them — never a copy of its rules here.
 */
export async function followFacts(tx: Db | Transaction): Promise<void> {
  // A dispatch stands on the day of the line of the journal that wrote it.
  await tx.execute(sql`
    update ord_goods_out g set
      created_at = e.created_at,
      "on" = (e.created_at at time zone o.timezone)::date
    from ord_event e, ord_order x, org_site s, org o
    where e.goods_out_id = g.id
      and x.id = g.order_id and s.id = x.site_id and o.id = s.org_id`)
  // A service is done when the journal says it was, the order's n-th mark against its n-th line.
  await tx.execute(sql`
    update ord_item_visit v set
      done_at = e.created_at,
      done_on = (e.created_at at time zone o.timezone)::date
    from (select v2.item_id, i.order_id,
                 row_number() over (partition by i.order_id order by v2.item_id) n
            from ord_item_visit v2 join ord_order_item i on i.id = v2.item_id
           where v2.done_at is not null) r,
         (select order_id, created_at,
                 row_number() over (partition by order_id order by id) n
            from ord_event where kind = 'service' and words->>'key' = 'order_event_service_done') e,
         ord_order x, org_site s, org o
    where r.item_id = v.item_id and e.order_id = r.order_id and e.n = r.n
      and x.id = r.order_id and s.id = x.site_id and o.id = s.org_id`)
  // The rates of each supply, frozen again on the days the deliveries really fell on — by the
  // platform's own writers, dispatches oldest first so one below nought finds what it takes back.
  const dispatches = await tx
    .select({ id: ordGoodsOut.id })
    .from(ordGoodsOut)
    .orderBy(ordGoodsOut.id)
  for (const one of dispatches) await freezeDispatchRates(one.id, tx)
  const done = await tx
    .select({ item: ordOrderItem, siteId: ordOrder.siteId, on: ordItemVisit.doneOn })
    .from(ordItemVisit)
    .innerJoin(ordOrderItem, eq(ordOrderItem.id, ordItemVisit.itemId))
    .innerJoin(ordOrder, eq(ordOrder.id, ordOrderItem.orderId))
    .where(isNotNull(ordItemVisit.doneOn))
  for (const one of done) await visitRates(asSiteId(one.siteId), one.on!, [one.item], tx)
  // The sides of a delivery, written again for the days the deliveries really fell on.
  await tx.delete(ordDeliverySides)
  const days = await tx.execute<{ id: string; on: string; at: string }>(sql`
    select x.id, d."on"::text as "on", d.at::text as at from (
      select order_id, "on", min(created_at) at from ord_goods_out group by 1, 2
      union all
      select i.order_id, v.done_on, min(v.done_at) from ord_item_visit v
        join ord_order_item i on i.id = v.item_id where v.done_at is not null group by 1, 2
    ) d join ord_order x on x.id = d.order_id order by x.id, d."on"`)
  for (const one of days) {
    const [order] = await tx
      .select()
      .from(ordOrder)
      .where(eq(ordOrder.id, BigInt(one.id)))
    await freezeSides(order!, one.on, tx)
    await tx
      .update(ordDeliverySides)
      .set({ createdAt: new Date(one.at) })
      .where(and(eq(ordDeliverySides.orderId, order!.id), eq(ordDeliverySides.on, one.on)))
  }
  // The terms of what stands on an account, counted again from the days the goods really left.
  const credits = await tx
    .select({ orderId: ordOrderCredit.orderId })
    .from(ordOrderCredit)
    .where(sql`${ordOrderCredit.way} <> 'word'`)
  for (const one of credits) {
    await tx.update(ordGoodsOut).set({ dueOn: null }).where(eq(ordGoodsOut.orderId, one.orderId))
    await tx
      .update(ordOrderCredit)
      .set({ dueOn: null })
      .where(eq(ordOrderCredit.orderId, one.orderId))
    const [order] = await tx.select().from(ordOrder).where(eq(ordOrder.id, one.orderId))
    await stampDue(order!, tx)
  }
  await followOrderNotices(tx)
}

/*
 * A notice about an order stands on the day of the line of the journal it announces: an order
 * placed a month ago was announced a month ago, whenever the run that wrote it happened. The kind
 * says which line it is — the order itself, its first confirmation, its payments, its dispatches,
 * its last line — and anything the notice is about but the journal cannot place stands on the last.
 * Like every notice of a day gone by, it was heard by then.
 */
async function followOrderNotices(tx: Db | Transaction): Promise<void> {
  await tx.execute(sql`
    update ntf_notice n set created_at = at.moment
    from (
      select n2.id,
             case
               when n2.kind in ('order_placed', 'order_new', 'order_request', 'order_priced') then o.created_at
               when n2.kind in ('order_paid', 'order_receipt')
                 then coalesce((select max(e.created_at) from ord_event e where e.order_id = o.id and e.kind = 'payment'), o.created_at)
               when n2.kind = 'order_confirmed'
                 then coalesce((select min(e.created_at) from ord_event e where e.order_id = o.id and e.to_status = 'confirmed'), o.created_at)
               when n2.kind in ('order_shipped', 'order_out')
                 then coalesce((select min(e.created_at) from ord_event e where e.order_id = o.id and e.kind = 'shipment'), o.created_at)
               else coalesce((select max(e.created_at) from ord_event e where e.order_id = o.id), o.created_at)
             end as moment
        from ntf_notice n2 join ord_order o on n2.subject_type = 'order' and n2.subject_id = o.id
    ) at
    where at.id = n.id and at.moment < n.created_at`)
  // Heard by the time they were three days old, as the notices of a past sale are born.
  await tx.execute(sql`
    update ntf_notice set owed = '{}', read_at = coalesce(read_at, created_at)
     where created_at < now() - interval '3 days' and (read_at is null or cardinality(owed) > 0)
       and subject_type = 'order'`)
}

export async function stampContacts(siteId: SiteId, tx: Db | Transaction) {
  await tx.execute(sql`
    update crm_contact c set created_at = least(
      coalesce((select min(created_at) from form_submission s where s.contact_id = c.id), c.created_at),
      coalesce((select min(created_at) from ord_order o where o.contact_id = c.id), c.created_at)
    )
    where c.site_id = ${siteId}
  `)
}

export async function stampContact(contactId: bigint, at: Date, tx: Db | Transaction) {
  await tx
    .update(crmContact)
    .set({ createdAt: at })
    .where(and(eq(crmContact.id, contactId), isNull(crmContact.deletedAt)))
}

/**
 * The delivery moved to the day the order was actually for — document and answer together.
 *
 * The seed's documented way past the service layer, the same one that backdates a timestamp and
 * pins a dev password: the till must never accept a window in the past, and a demo must have one.
 * What is written here could not be asked for through the door, and nothing else about the order is
 * touched — the window is the one the buyer really chose off the live list, only on its true day.
 *
 * BOTH sides move, and that is the whole reason this exists rather than one `update`. The document
 * says the day and the hours in its own columns; the questionnaire says them again in the frozen
 * answer, in the words the visitor read. A pass that moved only the columns would leave a card whose
 * answer says «3 сентября» beside a document that says «1 августа» — two truths on one screen, which
 * is exactly the defect this project has already paid for once.
 *
 * The sentence itself comes from `slotLabels`, the platform's own builder, so the rewritten label is
 * the one the till would have written.
 */
export async function stampSlot(
  site: OrgSite,
  orderId: bigint,
  serveOn: string,
  tx: Db | Transaction,
): Promise<void> {
  const [order] = await tx
    .select({ slotId: ordOrder.slotId, submissionId: ordOrder.submissionId })
    .from(ordOrder)
    .where(eq(ordOrder.id, orderId))
    .limit(1)
  if (!order?.slotId) return

  const [slot] = await tx.select().from(ordSlot).where(eq(ordSlot.id, order.slotId)).limit(1)
  if (!slot) return
  await tx.update(ordOrder).set({ serveOn }).where(eq(ordOrder.id, orderId))
  if (!order.submissionId) return

  const [row] = await tx
    .select({ answers: formSubmission.answers })
    .from(formSubmission)
    .where(eq(formSubmission.id, order.submissionId))
    .limit(1)
  if (!row) return
  const label = slotLabels(site, serveOn, slot)
  const answers = (row.answers as SubmittedAnswer[]).map((answer) =>
    answer.role === 'slot'
      ? { ...answer, value: slotKey(serveOn, slot.key), options: [label] }
      : answer,
  )
  await tx.update(formSubmission).set({ answers }).where(eq(formSubmission.id, order.submissionId))
}

/**
 * Whose each client is, frozen again once the orders have been aged.
 *
 * An order freezes «whose the client is once it stands» when it is born, against the orders before
 * it. A fixture is born in whatever order the script was written and aged afterwards, so the order
 * that brought a client may be created last and dated first — and every order dated after it has
 * frozen «nobody», because on the day the SEED ran there was nobody yet. In life orders are born in
 * the order they are dated and this never happens; here it is one more date written after the fact.
 *
 * The platform's own rule (`bindingOf`), asked again order by order as the dates now stand — never
 * a copy of it here, which had already parted from it on the term's days, an ended partnership and
 * a partner buying for themselves.
 */
export async function stampBindings(site: OrgSite, tx: Db | Transaction) {
  const orders = await tx
    .select({
      id: ordOrder.id,
      contactId: ordOrder.contactId,
      partnershipId: ordOrder.partnershipId,
      basis: ordOrder.partnershipBasis,
      createdAt: ordOrder.createdAt,
      routineId: ordOrder.routineId,
      bound: ordOrder.boundPartnershipId,
      since: ordOrder.boundSince,
    })
    .from(ordOrder)
    .where(and(eq(ordOrder.siteId, site.id), isNull(ordOrder.deletedAt)))
    .orderBy(asc(ordOrder.createdAt), asc(ordOrder.id))
  // In the order of the dates, each order asked of the platform's own rule as it stood before it
  // (`bindingOf`): the earlier ones are already set right when a later one is asked.
  for (const order of orders) {
    const bound = await bindingOf(
      site,
      order.contactId,
      { partnershipId: order.partnershipId, basis: order.basis },
      tx,
      order,
    )
    if ((bound?.id ?? null) !== order.bound || (bound?.since ?? null) !== order.since) {
      await tx
        .update(ordOrder)
        .set({ boundPartnershipId: bound?.id ?? null, boundSince: bound?.since ?? null })
        .where(eq(ordOrder.id, order.id))
    }
  }
}
