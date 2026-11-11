import {
  and,
  asc,
  db,
  eq,
  gt,
  inArray,
  isNull,
  sql,
  type Db,
  type Transaction,
} from '@anavi/backend/src/db'
import { snapQty, toMinor, type Currency } from '@anavi/shared'
import type { Actor } from '@anavi/backend/src/lib/actor'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { stkMove } from '@anavi/backend/src/db/schema/stk'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { ordEvent, ordOrder, ordOrderCredit, type OrdOrder } from '@anavi/backend/src/db/schema/ord'
import { type OrgSite } from '@anavi/backend/src/db/schema/org'
import { subFollow } from '@anavi/backend/src/db/schema/sub'
import { finAccount } from '@anavi/backend/src/db/schema/fin'
import { createAccount } from '@anavi/backend/src/modules/money/account.service'
import { asOrgId, asSiteId, type OrgId } from '@anavi/backend/src/db/ids'
import { linkOrgContact } from '@anavi/backend/src/modules/crm/contact.service'
import { setCredit } from '@anavi/backend/src/modules/order/credit.service'
import { changeStatus } from '@anavi/backend/src/modules/order/status.service'
import { correctOrder } from '@anavi/backend/src/modules/order/correction.service'
import { orderItems } from '@anavi/backend/src/modules/order/order.service'
import { placePurchase } from '@anavi/backend/src/modules/order/raise.service'
import { shipOrder } from '@anavi/backend/src/modules/order/ship.service'
import { confirmPayment } from '@anavi/backend/src/modules/order/payment.service'
import { settledOf } from '@anavi/backend/src/modules/ordermoney/order.payments'
import {
  agreePurchase,
  getPurchase,
  repeatDraft,
} from '@anavi/backend/src/modules/order/purchase.service'
import { receivePurchase } from '@anavi/backend/src/modules/order/receipt.service'
import { getOrg } from '@anavi/backend/src/modules/org/org.service'
import { actorOf } from '../links/keeping'
import { lastId } from './carry'
import { directClient } from './direction'
import { loadScript, type ScriptPurchase } from './script'
import { ageNotices, daysAgo, stampEvent } from './stamp'
import { dayOfMoment } from '../lib/days'
import { siteBySlug } from '../lib/sites'

/*
 * One organization buying from another, on terms.
 *
 * The document is the seller's order and both sides press their own doors over it: the buyer
 * places it from its own back office against a catalogue it follows; the seller — whose catalogue
 * publishes no prices — writes them in; the buyer agrees to the sum; the seller dispatches, and the
 * date the money is due starts counting from that hour; the buyer's storekeeper counts what
 * arrived; the seller says when the money came, or does not.
 *
 * After the demos are filled and in a transaction of its own, like every scene that names two
 * sites: both of them stand by then.
 */

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Which card of the seller each line of an order is, by the address a script names it with. */
async function slugsOf(order: OrdOrder, tx: Db | Transaction) {
  const rows = await orderItems(order.id, tx)
  const cards = await tx
    .select({ id: catVariant.id, slug: catProduct.slug })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .where(
      inArray(
        catVariant.id,
        rows.map((row) => row.itemId),
      ),
    )
  const slug = new Map(cards.map((card) => [card.id, card.slug]))
  return rows.map((row) => ({ row, slug: slug.get(row.itemId) ?? '' }))
}

/*
 * Where a purchase of no position went, as the script names it: the buyer's own expense by its name
 * — found, or made as the accountant would make it the first time — or a machine as it is.
 */
async function intoOf(
  orgId: OrgId,
  into: NonNullable<ScriptPurchase['received']>['into'],
  tx: Db | Transaction,
): Promise<{ account: string } | { asset: { name: string; lifeMonths: number } } | null> {
  if (!into) return null
  if ('asset' in into) return { asset: into.asset }
  const [found] = await tx
    .select({ id: finAccount.id })
    .from(finAccount)
    .where(
      and(
        eq(finAccount.orgId, orgId),
        eq(finAccount.type, 'expense'),
        eq(finAccount.name, into.expense),
        isNull(finAccount.deletedAt),
      ),
    )
    .limit(1)
  const id =
    found?.id ?? (await createAccount(orgId, { type: 'expense', name: into.expense }, tx)).id
  return { account: String(id) }
}

async function onePurchase(
  seller: OrgSite,
  buyer: OrgSite,
  spec: ScriptPurchase,
  supplierId: bigint,
  previous: OrdOrder | null,
  people: { seller: Actor; buyer: Actor; storekeeper: Actor },
  tx: Db | Transaction,
): Promise<OrdOrder> {
  const sellerId = asSiteId(seller.id)
  const buyerOrg = asOrgId(buyer.orgId)
  const [beforeEvent, beforeMove, beforeNotice] = await Promise.all([
    lastId(ordEvent, tx),
    lastId(stkMove, tx),
    lastId(ntfNotice, tx),
  ])

  let items: { variantId: string; qty: number }[]
  if (spec.lines) {
    items = []
    for (const line of spec.lines) {
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
      if (!variant) throw new Error(`purchase: «${seller.slug}» sells nothing at «${line.item}»`)
      // On the seller's ladder, as the buyer's own screen would put it: the door refuses anything
      // else rather than rounding it.
      items.push({
        variantId: String(variant.id),
        qty: snapQty(line.qty, variant.minQty, variant.stepQty),
      })
    }
  } else {
    // «The same as last time» — through the buyer's own repeat, which reads today's shelf.
    if (!previous)
      throw new Error('purchase: nothing to repeat — the first purchase names its lines')
    const draft = await repeatDraft(buyerOrg, previous.id, tx)
    if (draft.gone.length > 0) {
      throw new Error(`purchase: gone from the shelf since last time — ${draft.gone.join(', ')}`)
    }
    items = draft.lines.map((line) => ({ variantId: String(line.variantId), qty: line.qty }))
  }

  const placedAt = daysAgo(spec.days, spec.at[0], spec.at[1])
  const after = (hours: number) =>
    new Date(Math.min(placedAt.getTime() + hours * HOUR, Date.now() - 60_000))

  const placed = await placePurchase(
    buyerOrg,
    people.buyer,
    {
      supplierId: String(supplierId),
      items,
      address: spec.address ?? null,
      comment: spec.comment ?? null,
    },
    seller.defaultLocale,
    tx,
  )

  // The seller's answer: a price on every line. Nothing is left indicative, or there would be no
  // sum for the buyer to agree to.
  const lines = await slugsOf(placed, tx)
  await correctOrder(
    sellerId,
    placed.id,
    {
      items: lines.map(({ row, slug }) => {
        const price = spec.prices[slug]
        if (price === undefined) throw new Error(`purchase: no price named for «${slug}»`)
        return { id: String(row.id), price: toMinor(price, seller.currency as Currency) }
      }),
      comment: spec.priced.say,
    },
    people.seller,
    tx,
  )
  // To the sum the seller's correction came to, as the buyer's screen shows it — where the purchase
  // was born an estimate. Goods the seller keeps a price for are bought at it, «on request» on its
  // site or not, and there is no estimate to agree to.
  const priced = await getPurchase(buyerOrg, placed.id, tx)
  if (priced.order.pricedAt !== null)
    await agreePurchase(buyerOrg, placed.id, people.buyer, { total: priced.order.total }, tx)
  // Bought at prices the seller keeps: the seller's yes is what confirms it.
  else await changeStatus(sellerId, placed.id, people.seller, { status: 'confirmed' }, tx)

  // Where the warehouse stood before anything left: what is journalled past this is the dispatch.
  const beforeShipping = await lastId(stkMove, tx)
  let shippedAt: Date | null = null
  if (spec.shipped) {
    const held = await orderItems(placed.id, tx)
    await shipOrder(
      sellerId,
      placed.id,
      people.seller,
      {
        lines: held.map((row) => ({ id: String(row.id), shipped: row.shipped + row.held })),
        comment: spec.shipped.say,
      },
      tx,
    )
    shippedAt = after(spec.shipped.after)
  }
  if (spec.received) {
    // Counted by the buyer's storekeeper, and named to no position of the buyer's own: the
    // operator keeps no catalogue, so the oil is «arrived, not kept on stock» — the count still
    // goes to the seller, which is who needs it.
    const sent = await orderItems(placed.id, tx)
    const into = await intoOf(buyerOrg, spec.received.into, tx)
    await receivePurchase(
      asSiteId(buyer.id),
      placed.id,
      people.storekeeper,
      {
        lines: sent.map((row) => ({
          id: String(row.id),
          received: row.shipped,
          ...(into ? { into } : {}),
        })),
      },
      tx,
    )
  }
  let paidAt: Date | null = null
  if (spec.paid && shippedAt) {
    const fresh = (await tx.select().from(ordOrder).where(eq(ordOrder.id, placed.id)).limit(1))[0]!
    await confirmPayment(
      sellerId,
      placed.id,
      people.seller,
      { amount: fresh.total - (await settledOf(placed.id, tx)), comment: spec.paid.say },
      tx,
    )
    paidAt = new Date(Math.min(shippedAt.getTime() + spec.paid.after * DAY, Date.now() - 60_000))
    if (spec.closed) {
      await changeStatus(
        sellerId,
        placed.id,
        people.seller,
        { status: 'done', comment: spec.closed, close: 'ship' },
        tx,
      )
    }
  }

  /*
   * The dates, past the service layer. Every row of the order's journal by what it says, in the
   * order it was written; and the date the money is due — which the service counts from TODAY,
   * because that is when a dispatch really happens — counted again from the day this one left.
   */
  const pricedAt = after(spec.priced.after)
  const agreedAt = after(spec.agreed.after)
  const events = await tx
    .select()
    .from(ordEvent)
    .where(and(eq(ordEvent.orderId, placed.id), gt(ordEvent.id, beforeEvent)))
    .orderBy(asc(ordEvent.id))
  let last = placedAt
  for (const event of events) {
    const when =
      event.kind === 'correction'
        ? pricedAt
        : event.kind === 'shipment'
          ? (shippedAt ?? agreedAt)
          : event.kind === 'payment'
            ? (paidAt ?? agreedAt)
            : event.toStatus === 'confirmed'
              ? agreedAt
              : event.toStatus === 'done'
                ? new Date((paidAt ?? agreedAt).getTime() + 20 * 60_000)
                : placedAt
    last = when
    await stampEvent(event, when, tx)
  }
  await tx
    .update(stkMove)
    .set({ createdAt: placedAt, on: dayOfMoment(placedAt) })
    .where(
      and(
        eq(stkMove.sourceType, 'order'),
        eq(stkMove.sourceId, placed.id),
        gt(stkMove.id, beforeMove),
      ),
    )
  if (shippedAt) {
    await tx
      .update(stkMove)
      .set({ createdAt: shippedAt, on: dayOfMoment(shippedAt) })
      .where(
        and(
          eq(stkMove.sourceType, 'order'),
          eq(stkMove.sourceId, placed.id),
          gt(stkMove.id, beforeShipping),
        ),
      )
  }
  // The term the platform counted from the day of the dispatch it saw (today), moved with the
  // dispatch to the day this one left — never counted again here from the dealer's terms.
  const shiftDays = shippedAt
    ? Math.round((Date.parse(dayOfMoment(shippedAt)) - Date.parse(dayOfMoment(new Date()))) / DAY)
    : 0
  const [row] = await tx
    .update(ordOrder)
    .set({
      createdAt: placedAt,
      updatedAt: last,
      pricedAt,
      agreedAt,
    })
    .where(eq(ordOrder.id, placed.id))
    .returning()
  if (shippedAt) {
    await tx
      .update(ordOrderCredit)
      .set({ dueOn: sql`${ordOrderCredit.dueOn} + ${shiftDays}::int` })
      .where(eq(ordOrderCredit.orderId, placed.id))
  }
  await ageNotices(beforeNotice, last, tx)
  return row!
}

/**
 * Every dealer of every demo that was filled in this run.
 */
export async function seedPurchases(filled: readonly { slug: string }[]): Promise<number> {
  let placed = 0
  for (const demo of filled) {
    const script = await loadScript(demo.slug)
    if (!script?.dealers?.length) continue
    await db.transaction(async (tx) => {
      const seller = await siteBySlug(demo.slug, tx)
      const sellerId = asSiteId(seller.id)
      for (const dealer of script.dealers!) {
        const buyer = await siteBySlug(dealer.buyer, tx)
        const buyerOrg = asOrgId(buyer.orgId)
        const [watching] = await tx
          .select({ id: subFollow.id })
          .from(subFollow)
          .where(
            and(
              eq(subFollow.siteId, sellerId),
              eq(subFollow.subscriberType, 'org'),
              eq(subFollow.subscriberId, buyerOrg),
            ),
          )
          .limit(1)
        if (!watching) {
          throw new Error(
            `purchase: «${buyer.slug}» does not follow «${seller.slug}» and cannot buy`,
          )
        }
        const people = {
          seller: await actorOf(seller, 'owner', tx),
          buyer: await actorOf(buyer, 'owner', tx),
          storekeeper: await actorOf(buyer, 'storekeeper', tx),
        }
        // The terms, on the card the seller keeps of this organization — written before the first
        // order, the way a deferral is agreed before anything is shipped under it.
        const card = await linkOrgContact(sellerId, await getOrg(buyerOrg, tx), tx)
        await setCredit(
          sellerId,
          card.id,
          people.seller,
          {
            days: dealer.terms.days,
            limit: toMinor(dealer.terms.limit, seller.currency as Currency),
          },
          tx,
        )
        await directClient(seller, card.id, dealer.direction, tx)
        let previous: OrdOrder | null = null
        for (const spec of dealer.purchases) {
          previous = await onePurchase(seller, buyer, spec, watching.id, previous, people, tx)
          placed += 1
        }
      }
    })
  }
  return placed
}
