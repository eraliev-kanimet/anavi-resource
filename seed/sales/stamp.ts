import { and, asc, eq, isNull, sql } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catStockMove } from '@anavi/backend/src/db/schema/cat'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { formSubmission } from '@anavi/backend/src/db/schema/form'
import { msgMessage, msgThread } from '@anavi/backend/src/db/schema/msg'
import { ordEvent, ordOrder, ordSlot } from '@anavi/backend/src/db/schema/ord'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import { slotLabels } from '@anavi/backend/src/modules/order/slot.service'
import { slotKey } from '@anavi/shared'
import type { SubmittedAnswer } from '@anavi/backend/src/db/schema/form'
import { refAccrual } from '@anavi/backend/src/db/schema/ref'
import type { SiteId } from '@anavi/backend/src/db/ids'

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
    .select({ id: ordEvent.id })
    .from(ordEvent)
    .where(eq(ordEvent.orderId, orderId))
    .orderBy(asc(ordEvent.id))
  const times = timeline(placedAt, events.length, DAY)
  for (const [i, event] of events.entries()) {
    await tx.update(ordEvent).set({ createdAt: times[i]! }).where(eq(ordEvent.id, event.id))
  }
  const last = times.at(-1) ?? placedAt

  // The journal follows the moves it recorded: a warehouse whose whole history happened in one
  // second is the same lie the order list was telling.
  const moves = await tx
    .select({ id: catStockMove.id })
    .from(catStockMove)
    .where(and(eq(catStockMove.sourceType, 'order'), eq(catStockMove.sourceId, orderId)))
    .orderBy(asc(catStockMove.id))
  const moved = timeline(placedAt, moves.length, HOUR)
  for (const [i, move] of moves.entries()) {
    await tx.update(catStockMove).set({ createdAt: moved[i]! }).where(eq(catStockMove.id, move.id))
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
    .set({ createdAt: last, updatedAt: last })
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
    set created_at = m.first, last_message_at = m.last, updated_at = m.last
    from (
      select thread_id, min(created_at) as first, max(created_at) as last
      from msg_message group by thread_id
    ) m
    where m.thread_id = t.id and t.site_id = ${siteId}
  `)
}

/** When the desk last looked at it — null leaves the appeal unread, which is what the bell counts. */
export async function markSeen(threadId: bigint, at: Date | null, tx: Db | Transaction) {
  await tx.update(msgThread).set({ staffReadAt: at }).where(eq(msgThread.id, threadId))
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
      ? { ...answer, value: slotKey(serveOn, slot.id), options: [label] }
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
 * The rule itself, walked by the dates as they now stand: whoever holds the client keeps them, a
 * client who is nobody's becomes the partner's a code or a spoken name brought them by, and a
 * silence longer than the site's term lets them go.
 */
export async function stampBindings(site: OrgSite, tx: Db | Transaction) {
  const term = site.partnerBindDays === null ? null : site.partnerBindDays * DAY
  const orders = await tx
    .select({
      id: ordOrder.id,
      contactId: ordOrder.contactId,
      status: ordOrder.status,
      partnershipId: ordOrder.partnershipId,
      basis: ordOrder.partnershipBasis,
      at: ordOrder.createdAt,
      bound: ordOrder.boundPartnershipId,
    })
    .from(ordOrder)
    .where(and(eq(ordOrder.siteId, site.id), isNull(ordOrder.deletedAt)))
    .orderBy(asc(ordOrder.createdAt), asc(ordOrder.id))
  const held = new Map<bigint, { bound: bigint | null; at: Date }>()
  for (const order of orders) {
    if (order.contactId === null) continue
    const before = held.get(order.contactId)
    const kept =
      before &&
      before.bound !== null &&
      (term === null || order.at.getTime() - before.at.getTime() <= term)
        ? before.bound
        : null
    const brings = order.basis === 'code' || order.basis === 'named'
    const bound = kept ?? (brings ? order.partnershipId : null)
    if (bound !== order.bound) {
      await tx.update(ordOrder).set({ boundPartnershipId: bound }).where(eq(ordOrder.id, order.id))
    }
    // A cancelled order was not a purchase: it freezes its own answer and breaks no silence.
    if (order.status !== 'canceled') held.set(order.contactId, { bound, at: order.at })
  }
}
