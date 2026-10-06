import { and, asc, db, eq, gt, isNull, type Db, type Transaction } from '@anavi/backend/src/db'
import { snapQty, toMinor, type Currency } from '@anavi/shared'
import type { Actor } from '@anavi/backend/src/lib/actor'
import { catProduct, catStockMove, catVariant } from '@anavi/backend/src/db/schema/cat'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { ordEvent, ordOrder } from '@anavi/backend/src/db/schema/ord'
import { org, orgSite, type OrgSite } from '@anavi/backend/src/db/schema/org'
import { refAccrual, refPartnership } from '@anavi/backend/src/db/schema/ref'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { linkOrgContact, updateContact } from '@anavi/backend/src/modules/crm/contact.service'
import { setCredit } from '@anavi/backend/src/modules/order/credit.service'
import { OrderOverLimitError } from '@anavi/backend/src/modules/order/order.errors'
import {
  orderItems,
  raiseForContact,
  shipOrder,
} from '@anavi/backend/src/modules/order/order.service'
import { confirmPayment, settledOf } from '@anavi/backend/src/modules/order/payment.service'
import { actorOf } from '../keeping'
import { lastId } from './carry'
import { loadScript, type ScriptVisit } from './script'
import { daysAgo } from './stamp'

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
const before = (at: Date) => new Date(Math.min(at.getTime(), Date.now() - 60_000))

async function oneVisit(
  seller: OrgSite,
  contactId: bigint,
  visit: ScriptVisit,
  people: { agent: Actor; owner: Actor },
  tx: Db | Transaction,
): Promise<'written' | 'refused'> {
  const sellerId = asSiteId(seller.id)
  const currency = seller.currency as Currency
  const items = []
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
      if (!(error instanceof OrderOverLimitError)) throw error
      // What the agent leaves behind: a refused order writes no row, and the card is where the
      // next person to open this client reads why nothing was shipped.
      await updateContact(sellerId, contactId, { note: visit.refused.note }, tx)
      return 'refused'
    }
    throw new Error(
      'agent: an order past the ceiling was taken — the limit on the card did not bind',
    )
  }

  const [beforeEvent, beforeMove, beforeNotice] = await Promise.all([
    lastId(ordEvent, tx),
    lastId(catStockMove, tx),
    lastId(ntfNotice, tx),
  ])
  const placedAt = daysAgo(visit.days, visit.at[0], visit.at[1])
  const order = await raiseForContact(sellerId, contactId, people.agent, input, tx)

  const beforeShipping = await lastId(catStockMove, tx)
  let shippedAt: Date | null = null
  if (visit.shipped) {
    const held = await orderItems(order.id, tx)
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
      { amount: order.total - (await settledOf(order.id, tx)), comment: visit.paid.say },
      tx,
    )
    paidAt = before(daysAgo(visit.paid.days, 12, 30))
  }

  // The dates, past the service layer: each row of the journal by what it says.
  const events = await tx
    .select({ id: ordEvent.id, kind: ordEvent.kind })
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
    await tx.update(ordEvent).set({ createdAt: when }).where(eq(ordEvent.id, event.id))
  }
  const moved = (after: bigint) =>
    and(
      eq(catStockMove.sourceType, 'order'),
      eq(catStockMove.sourceId, order.id),
      gt(catStockMove.id, after),
    )
  await tx.update(catStockMove).set({ createdAt: placedAt }).where(moved(beforeMove))
  if (shippedAt) {
    await tx.update(catStockMove).set({ createdAt: shippedAt }).where(moved(beforeShipping))
  }
  await tx
    .update(ordOrder)
    .set({ createdAt: placedAt, updatedAt: last, agreedAt: placedAt })
    .where(eq(ordOrder.id, order.id))
  // What the agent earned is written when the money comes, and is dated by it.
  if (paidAt) {
    await tx
      .update(refAccrual)
      .set({ createdAt: paidAt, updatedAt: paidAt })
      .where(eq(refAccrual.orderId, order.id))
  }
  await tx.update(ntfNotice).set({ createdAt: last }).where(gt(ntfNotice.id, beforeNotice))
  return 'written'
}

/** The round of every demo that names one and was filled in this run. */
export async function seedAgentRounds(
  filled: readonly { slug: string; dir: string }[],
): Promise<{ written: number; refused: number }> {
  const out = { written: 0, refused: 0 }
  for (const demo of filled) {
    const script = await loadScript(demo.dir)
    if (!script?.agent) continue
    await db.transaction(async (tx) => {
      const [seller] = await tx.select().from(orgSite).where(eq(orgSite.slug, demo.slug)).limit(1)
      if (!seller) throw new Error(`agent: no site «${demo.slug}»`)
      const sellerId = asSiteId(seller.id)
      // The agent is whoever of the staff holds a live partnership here — a seller appointed by
      // the reset. Refused loudly where nobody does: an order «by the owner» earns nobody anything.
      const [held] = await tx
        .select({ userId: refPartnership.holderId })
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
        agent: { userId: held.userId, activeRole: 'manager' as const },
        owner: await actorOf(seller, 'owner', tx),
      }

      for (const client of script.agent!.clients) {
        const [buyer] = await tx
          .select()
          .from(org)
          .where(and(eq(org.name, client.org), isNull(org.deletedAt)))
          .limit(1)
        if (!buyer) throw new Error(`agent: no organization «${client.org}»`)
        const card = await linkOrgContact(sellerId, buyer, tx)
        await setCredit(
          sellerId,
          card.id,
          {
            days: client.terms.days,
            limit: toMinor(client.terms.limit, seller.currency as Currency),
          },
          tx,
        )
        for (const visit of client.visits) {
          out[await oneVisit(seller, card.id, visit, people, tx)] += 1
        }
      }
    })
  }
  return out
}
