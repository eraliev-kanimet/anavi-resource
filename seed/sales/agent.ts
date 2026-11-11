import { dayOfMoment } from '../lib/days'
import { and, asc, db, eq, gt, isNull, sql, type Db, type Transaction } from '@anavi/backend/src/db'
import { directClient } from './direction'
import { snapQty, toMinor, type Currency, type TouchKind, type TouchOutcome } from '@anavi/shared'
import type { Actor } from '@anavi/backend/src/lib/actor'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { stkMove } from '@anavi/backend/src/db/schema/stk'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { ordEvent, ordGoodsOut, ordOrder } from '@anavi/backend/src/db/schema/ord'
import { org, orgSite, type OrgSite } from '@anavi/backend/src/db/schema/org'
import { refAccrual, refPartnership } from '@anavi/backend/src/db/schema/ref'
import { crmTouch } from '@anavi/backend/src/db/schema/crm'
import { asSiteId, type SiteId } from '@anavi/backend/src/db/ids'
import { linkOrgContact, updateContact } from '@anavi/backend/src/modules/crm/contact.service'
import { recordTouch } from '@anavi/backend/src/modules/crm/touch.service'
import { setCredit } from '@anavi/backend/src/modules/order/credit.service'
import { OverLimitError } from '@anavi/backend/src/modules/order/order.errors'
import { orderItems } from '@anavi/backend/src/modules/order/order.service'
import { raiseForContact } from '@anavi/backend/src/modules/order/raise.service'
import { correctReward } from '@anavi/backend/src/modules/order/reward.service'
import {
  appointSeller,
  endPartnership,
} from '@anavi/backend/src/modules/referral/partnership.service'
import { shipOrder } from '@anavi/backend/src/modules/order/ship.service'
import { confirmPayment } from '@anavi/backend/src/modules/order/payment.service'
import { settledOf } from '@anavi/backend/src/modules/ordermoney/order.payments'
import { actorOf } from '../links/keeping'
import { lastId } from './carry'
import { loadScript, type ScriptAgent, type ScriptVisit } from './script'
import { ageNotices, daysAgo, stampEvent } from './stamp'
import { seedRewards } from './rewards'

/*
 * The trade agent's round.
 *
 * Every order here is written through the door on the client's card, signed by the agent himself:
 * he is a member of the seller's staff who holds a partnership, the client said yes in the room —
 * so the order is born agreed — and no code is typed anywhere. What he earns comes out of the
 * platform's own rule the moment the client's money arrives: «the author of the order, where
 * nobody brought the client».
 *
 * One visit ends in a refusal. The ceiling on the client's card binds this door exactly as it
 * binds the client's own back office, and the fixture walks into it on purpose: the door is asked,
 * it must refuse in the platform's own words, and a run where it does not is a failed run.
 */

const HOUR = 3_600_000

// What has left of an order, by its dispatches: what a client on terms pays first.
async function goneOf(orderId: bigint, tx: Db | Transaction): Promise<number> {
  const [row] = await tx
    .select({ value: sql<string>`coalesce(sum(${ordGoodsOut.value}), 0)` })
    .from(ordGoodsOut)
    .where(eq(ordGoodsOut.orderId, orderId))
  return Number(row?.value ?? 0)
}
const before = (at: Date) => new Date(Math.min(at.getTime(), Date.now() - 60_000))

// A touch the agent marks on the card, on the moment it happened: written by the door, dated past it.
async function touched(
  siteId: SiteId,
  contactId: bigint,
  agent: Actor,
  input: { kind: TouchKind; outcome?: TouchOutcome | null; note?: string; nextOn?: string },
  at: Date,
  tx: Db | Transaction,
): Promise<void> {
  const row = await recordTouch(siteId, contactId, agent, input, tx)
  await tx
    .update(crmTouch)
    .set({ createdAt: before(at) })
    .where(eq(crmTouch.id, row.id))
}

async function oneVisit(
  seller: OrgSite,
  contactId: bigint,
  visit: ScriptVisit,
  people: { agent: Actor; owner: Actor; partnershipId: bigint },
  tx: Db | Transaction,
): Promise<'written' | 'refused'> {
  const sellerId = asSiteId(seller.id)
  const currency = seller.currency as Currency
  const items = []
  const bySlug = new Map<string, bigint>()
  for (const line of visit.lines) {
    const variants = await tx
      .select({ id: catVariant.id, minQty: catVariant.minQty, stepQty: catVariant.stepQty })
      .from(catVariant)
      .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
      .where(
        and(
          eq(catProduct.siteId, sellerId),
          eq(catProduct.slug, line.item),
          isNull(catVariant.deletedAt),
        ),
      )
      .orderBy(asc(catVariant.position), asc(catVariant.id))
    const variant = variants[(line.pick ?? 1) - 1]
    if (!variant) throw new Error(`agent: «${seller.slug}» sells nothing at «${line.item}»`)
    bySlug.set(line.item, variant.id)
    items.push({
      variantId: String(variant.id),
      qty: snapQty(line.qty, variant.minQty, variant.stepQty),
      price: toMinor(line.price, currency),
    })
  }
  const input = { items, comment: visit.say ?? null, agreed: true }

  if (visit.refused) {
    try {
      await raiseForContact(sellerId, contactId, people.agent, input, tx)
    } catch (error) {
      if (!(error instanceof OverLimitError)) throw error
      // What the agent leaves behind: a refused order writes no row, so the visit is a touch that ended in none — the next person to
      // open this client reads why nothing was shipped, and the report counts the visit.
      await touched(
        sellerId,
        contactId,
        people.agent,
        { kind: 'visit', outcome: 'no_money', note: visit.refused.note },
        daysAgo(visit.days, visit.at[0], visit.at[1]),
        tx,
      )
      return 'refused'
    }
    throw new Error(
      'agent: an order past the ceiling was taken — the limit on the card did not bind',
    )
  }

  const [beforeEvent, beforeMove, beforeNotice] = await Promise.all([
    lastId(ordEvent, tx),
    lastId(stkMove, tx),
    lastId(ntfNotice, tx),
  ])
  const placedAt = daysAgo(visit.days, visit.at[0], visit.at[1])
  // A client the owner wrote down and said the agent brought: the order is the agent's by a name said, and so is the client.
  const order = await raiseForContact(
    sellerId,
    contactId,
    visit.named ? people.owner : people.agent,
    input,
    tx,
  )
  if (visit.named)
    await correctReward(
      sellerId,
      order.id,
      people.owner,
      { partnershipId: String(people.partnershipId), reason: visit.named },
      tx,
    )

  const beforeShipping = await lastId(stkMove, tx)
  let shippedAt: Date | null = null
  if (visit.shipped) {
    const only = visit.shipped.only?.map((slug) => bySlug.get(slug))
    const held = (await orderItems(order.id, tx)).filter(
      (row) => !only || only.includes(row.itemId),
    )
    await shipOrder(
      sellerId,
      order.id,
      people.owner,
      {
        lines: held.map((row) => ({ id: String(row.id), shipped: row.shipped + row.held })),
        comment: visit.shipped.say,
      },
      tx,
    )
    shippedAt = before(new Date(placedAt.getTime() + visit.shipped.after * HOUR))
  }
  let paidAt: Date | null = null
  if (visit.paid) {
    await confirmPayment(
      sellerId,
      order.id,
      people.owner,
      {
        amount:
          (visit.paid.gone ? await goneOf(order.id, tx) : order.total) -
          (await settledOf(order.id, tx)),
        comment: visit.paid.say,
      },
      tx,
    )
    paidAt = before(daysAgo(visit.paid.days, 12, 30))
  }

  // The dates, past the service layer: each row of the journal by what it says.
  const events = await tx
    .select({ id: ordEvent.id, kind: ordEvent.kind, paymentId: ordEvent.paymentId })
    .from(ordEvent)
    .where(and(eq(ordEvent.orderId, order.id), gt(ordEvent.id, beforeEvent)))
    .orderBy(asc(ordEvent.id))
  let last = placedAt
  for (const event of events) {
    const when =
      event.kind === 'shipment'
        ? (shippedAt ?? placedAt)
        : event.kind === 'payment'
          ? (paidAt ?? placedAt)
          : placedAt
    if (when > last) last = when
    await stampEvent(event, when, tx)
  }
  const moved = (after: bigint) =>
    and(eq(stkMove.sourceType, 'order'), eq(stkMove.sourceId, order.id), gt(stkMove.id, after))
  await tx
    .update(stkMove)
    .set({ createdAt: placedAt, on: dayOfMoment(placedAt) })
    .where(moved(beforeMove))
  if (shippedAt) {
    await tx
      .update(stkMove)
      .set({ createdAt: shippedAt, on: dayOfMoment(shippedAt) })
      .where(moved(beforeShipping))
  }
  await tx
    .update(ordOrder)
    .set({ createdAt: placedAt, updatedAt: last, agreedAt: placedAt })
    .where(eq(ordOrder.id, order.id))
  // What the agent earned is written when the money comes, and is dated by it.
  if (paidAt) {
    await tx
      .update(refAccrual)
      .set({
        createdAt: paidAt,
        updatedAt: paidAt,
        // a row the platform canceled in the same run is dated with the rest of it
        canceledAt: sql`case when ${refAccrual.canceledAt} is not null then ${paidAt.toISOString()}::timestamptz end`,
      })
      .where(eq(refAccrual.orderId, order.id))
  }
  await ageNotices(beforeNotice, last, tx)
  return 'written'
}

/*
 * The agent's contract ran out and a new one was signed: the old partnership ends by the owner's word and the same person is
 * appointed again on the new terms, both on the day of the renewal. The clients already his stay his on the terms they were given
 * on (`ref_binding`); the ones he has not brought earn by the new contract.
 */
// A contract of so many months from a day runs through the day before the same date that many months on.
function lastDayOf(signed: string, months: number): string {
  const [y, m, d] = signed.split('-').map(Number) as [number, number, number]
  const end = new Date(Date.UTC(y, m - 1 + months, d))
  end.setUTCDate(end.getUTCDate() - 1)
  return end.toISOString().slice(0, 10)
}

async function renewContract(
  siteId: SiteId,
  ended: bigint,
  userId: bigint,
  renewed: NonNullable<ScriptAgent['renewed']>,
  owner: Actor,
  tx: Db | Transaction,
): Promise<bigint> {
  const was = await endPartnership(siteId, ended, owner, tx)
  const signed = dayOfMoment(daysAgo(renewed.days, 10, 0))
  const until = renewed.months ? lastDayOf(signed, renewed.months) : null
  const next = await appointSeller(
    siteId,
    owner,
    {
      userId: String(userId),
      pay: was.pay ?? 'contract',
      rewardKind: renewed.rewardKind,
      rewardValue: renewed.rewardValue,
      ...(renewed.steps ? { steps: renewed.steps } : {}),
      ...(was.renewYears !== null ? { renewYears: was.renewYears } : {}),
      ...(until ? { until } : {}),
    },
    tx,
  )
  // Both dated by the day of the renewal: a demo timestamp, past the service layer.
  const on = daysAgo(renewed.days, 10, 0)
  await tx.update(refPartnership).set({ updatedAt: on }).where(eq(refPartnership.id, ended))
  await tx
    .update(refPartnership)
    .set({ createdAt: on, acceptedAt: on, updatedAt: on })
    .where(eq(refPartnership.id, next.id))
  return next.id
}

/** The round of every demo that names one and was filled in this run. */
export async function seedAgentRounds(
  filled: readonly { slug: string }[],
): Promise<{ written: number; refused: number }> {
  const out = { written: 0, refused: 0 }
  for (const demo of filled) {
    const script = await loadScript(demo.slug)
    if (!script?.agent) continue
    await db.transaction(async (tx) => {
      const [seller] = await tx.select().from(orgSite).where(eq(orgSite.slug, demo.slug)).limit(1)
      if (!seller) throw new Error(`agent: no site «${demo.slug}»`)
      const sellerId = asSiteId(seller.id)
      // The agent is whoever of the staff holds a live partnership here — a seller appointed by
      // the reset. Refused loudly where nobody does: an order «by the owner» earns nobody anything.
      const [held] = await tx
        .select({ id: refPartnership.id, userId: refPartnership.holderId })
        .from(refPartnership)
        .where(
          and(
            eq(refPartnership.siteId, sellerId),
            eq(refPartnership.holderType, 'user'),
            eq(refPartnership.status, 'active'),
            isNull(refPartnership.deletedAt),
          ),
        )
        .orderBy(asc(refPartnership.id))
        .limit(1)
      if (!held?.userId) throw new Error(`agent: nobody at «${demo.slug}» holds a partnership`)
      const people = {
        agent: { userId: held.userId, activeRole: 'manager' as const, viaOrgId: null },
        owner: await actorOf(seller, 'owner', tx),
        partnershipId: held.id,
      }

      const cards = new Map<string, bigint>()
      for (const client of script.agent!.clients) {
        const [buyer] = await tx
          .select()
          .from(org)
          .where(and(eq(org.name, client.org), isNull(org.deletedAt)))
          .limit(1)
        if (!buyer) throw new Error(`agent: no organization «${client.org}»`)
        const card = await linkOrgContact(sellerId, buyer, tx)
        cards.set(client.org, card.id)
        await directClient(seller, card.id, client.direction, tx)
        // Where the client's door is: the agent's walk is laid out by it.
        if (client.address)
          await updateContact(sellerId, card.id, people.owner, { address: client.address }, tx)
        await setCredit(
          sellerId,
          card.id,
          people.owner,
          {
            days: client.terms.days,
            limit: toMinor(client.terms.limit, seller.currency as Currency),
          },
          tx,
        )
      }
      // Every visit in the order it happened, across the clients: what an order is born into (whose the client is, which contract
      // stands) is what stood before it, and a contract renewed on a day stands under every order written after that day.
      const visits = script
        .agent!.clients.flatMap((client) => client.visits.map((visit) => ({ client, visit })))
        .sort((a, b) => b.visit.days - a.visit.days)
      const renewed = script.agent!.renewed
      for (const { client, visit } of visits) {
        if (renewed && visit.days < renewed.days && people.partnershipId === held.id)
          people.partnershipId = await renewContract(
            sellerId,
            held.id,
            held.userId,
            renewed,
            people.owner,
            tx,
          )
        out[await oneVisit(seller, cards.get(client.org)!, visit, people, tx)] += 1
      }
      // What the agent marked besides the orders: calls, messages, offers sent, visits that ended in none. A touch earns nothing, so
      // which contract stood on its day is no question.
      for (const client of script.agent!.clients)
        for (const one of client.touches ?? [])
          await touched(
            sellerId,
            cards.get(client.org)!,
            people.agent,
            {
              kind: one.kind,
              outcome: one.outcome ?? null,
              ...(one.note ? { note: one.note } : {}),
              ...(one.next === undefined
                ? {}
                : { nextOn: dayOfMoment(new Date(Date.now() + one.next * 86_400_000)) }),
            },
            daysAgo(one.days, one.at[0], one.at[1]),
            tx,
          )
      // The round's own orders earned the agent his rewards after the site's turn settled the rest: settled the same way, by age,
      // so a month-old reward to an agent on a contract stands paid by its own payout.
      await seedRewards({ site: seller, actor: people.owner }, tx)
    })
  }
  return out
}
