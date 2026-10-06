import { and, asc, desc, eq, isNotNull, isNull } from '@anavi/backend/src/db'
import { toMajor, type OrderStatus } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { msgMessage } from '@anavi/backend/src/db/schema/msg'
import { ordCart, ordEvent } from '@anavi/backend/src/db/schema/ord'
import type { OrdOrder } from '@anavi/backend/src/db/schema/ord'
import type { FormField } from '@anavi/backend/src/db/schema/form'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import {
  carriedSlug,
  carriedVisible,
  carries,
  openAssortment,
} from '@anavi/backend/src/modules/catalog/assortment.service'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { checkoutForm } from '@anavi/backend/src/modules/form/form.public'
import { listFields } from '@anavi/backend/src/modules/form/form.service'
import {
  acknowledgeCart,
  addItem,
  openCart,
  readCart,
  setPromo,
} from '@anavi/backend/src/modules/order/cart.service'
import {
  changeStatus,
  checkout,
  correctOrder,
  getOrder,
  orderItems,
  shipOrder,
} from '@anavi/backend/src/modules/order/order.service'
import {
  attachReceipt,
  confirmPayment,
  settledOf,
} from '@anavi/backend/src/modules/order/payment.service'
import { claimReferral } from '@anavi/backend/src/modules/referral/referral.service'
import { listSlots, slotOptions } from '@anavi/backend/src/modules/order/slot.service'
import { listZones } from '@anavi/backend/src/modules/order/zone.service'
import { readSlotKey } from '@anavi/shared'
import { dayAfter } from './answers'
import { digitsOf, wordsIn } from './common'
import { drawSlip } from './slip'
import { daysAgo, markSeen, stampOrder, stampSlot } from './stamp'
import type { SiteRun } from './context'
import type { ScriptOrder, ScriptPerson, ScriptStep } from './script'
import { rememberCarry } from './carry'

interface Sellable {
  /** the address the card answers at — which is how a demo's own script names what was bought */
  slug: string
  /** the one a card is bought by when the script names no modification */
  primary: boolean
  position: number
  variantId: bigint
  price: number
  /** the smallest release, in steps: half a kilo of meat is five of them, and one would be a hundred grams */
  minQty: number
  /** whether the card itself makes a line an estimate — never: only a shelf that falls short does */
  estimate: boolean
}

async function sellablesOf(site: OrgSite, tx: Db | Transaction): Promise<Sellable[]> {
  /*
   * What the shop SELLS, which is not the same as what it owns.
   *
   * A demo's script names what was bought by the address the card answers at, and on a shelf that
   * carries a supplier's goods that address belongs to the placement. Reading the stockroom instead
   * of the shelf made every line of the market's meat fail with «nothing on sale at
   * baranina-lopatka» the moment the meat row became the butcher's.
   */
  const carried = await openAssortment(asSiteId(site.id), tx)
  const goods = await tx
    .select({
      id: catVariant.id,
      price: catVariant.price,
      minQty: catVariant.minQty,
      slug: carriedSlug(carried).mapWith(catProduct.slug),
      primary: catVariant.isPrimary,
      position: catVariant.position,
    })
    .from(catVariant)
    .innerJoin(catProduct, eq(catVariant.productId, catProduct.id))
    .where(
      and(
        carries(carried),
        carriedVisible(carried),
        isNull(catProduct.deletedAt),
        isNull(catVariant.deletedAt),
        isNotNull(catVariant.price),
      ),
    )
    // Ordered because the dice pick out of this list: Postgres owes an unordered query no
    // particular order, and two runs of the same seed then fill two different shops.
    .orderBy(asc(catVariant.id))

  return goods.map((row) => ({
    slug: row.slug,
    primary: row.primary,
    position: row.position,
    variantId: row.id,
    price: row.price ?? 0,
    minQty: row.minQty,
    estimate: false,
  }))
}

type Correction = 'discount' | 'remove' | 'price' | 'raise' | 'lower'

const CHAIN: readonly OrderStatus[] = ['new', 'confirmed', 'done']

/** Every step the closed map allows between two statuses — a cancellation is one arrow from any. */
function walk(from: OrderStatus, to: OrderStatus): OrderStatus[] {
  if (to === 'canceled') return ['canceled']
  const at = CHAIN.indexOf(from)
  const until = CHAIN.indexOf(to)
  return until <= at ? [] : CHAIN.slice(at + 1, until + 1)
}

export /** To the nearest whole unit of the currency: nobody writes a correction down to the tiyin. */
function round(minor: number): number {
  return Math.max(100, Math.round(minor / 100) * 100)
}

async function correct(
  batch: SiteRun,
  order: OrdOrder,
  how: Correction,
  tx: Db | Transaction,
  said: string | null = null,
): Promise<void> {
  const rows = await orderItems(order.id, tx)
  if (rows.length === 0) return
  const say = wordsIn(batch.common, order.locale)
  const first = rows[0]!

  if (how === 'remove') {
    if (rows.length < 2) return
    await correctOrder(
      batch.site.id,
      order.id,
      { removed: [String(rows.at(-1)!.id)], comment: said ?? say.removed },
      batch.actor,
      tx,
    )
    return
  }

  if (how === 'price') {
    const estimates = rows.filter((row) => row.isEstimate)
    if (estimates.length === 0) return
    await correctOrder(
      batch.site.id,
      order.id,
      {
        items: estimates.map((row) => ({ id: String(row.id), price: round(row.price * 1.2) })),
        comment: said ?? say.priced,
      },
      batch.actor,
      tx,
    )
    return
  }

  const patch =
    how === 'discount'
      ? { discount: round(first.total * 0.15), note: say.discount }
      : how === 'raise'
        ? { qty: first.qty + 1 }
        : { price: round(first.price * 0.75) }
  const comment =
    said ?? (how === 'discount' ? say.discountComment : how === 'raise' ? say.raised : say.lowered)
  await correctOrder(
    batch.site.id,
    order.id,
    { items: [{ id: String(first.id), ...patch }], comment },
    batch.actor,
    tx,
  )
}

async function receipt(batch: SiteRun, order: OrdOrder, tx: Db | Transaction): Promise<void> {
  const due = order.total - (await settledOf(order.id, tx))
  const amount = toMajor(due, order.currency).toLocaleString('en-US').replace(/,/g, ' ')
  const file = await drawSlip({
    name: 'receipt.png',
    title: 'Payment confirmed',
    amount: `${amount} ${order.currency}`,
    rows: [
      `${batch.random.pick(batch.common.orders.banks)} 4177 55XX XXXX ${String(1000 + order.number).slice(-4)}`,
      `Order ${order.number}`,
      new Date().toISOString().slice(0, 10).split('-').reverse().join('.'),
    ],
  })
  await attachReceipt(batch.site.id, order, file, tx)
}

/**
 * What HAPPENED to an order afterwards, walked by the engine's own doors.
 *
 * Both roads into an order share it — the till and a document raised out of an appeal — because
 * what a status does to the warehouse, when a code for payment is issued and how far a correction
 * moves a price are the engine's rules and not facts about any one shop.
 */
export async function runSteps(
  ctx: SiteRun,
  from: OrdOrder,
  steps: readonly ScriptStep[],
  tx: Db | Transaction,
): Promise<OrdOrder> {
  let row = from
  for (const step of steps) {
    if (step.do === 'status' && step.to) {
      for (const to of walk(row.status as OrderStatus, step.to)) {
        row = await changeStatus(
          ctx.site.id,
          row.id,
          ctx.actor,
          { status: to, comment: to === step.to ? (step.say ?? null) : null },
          tx,
        )
      }
      continue
    }
    // Everything the warehouse is holding goes out. No notion of «partly» is needed here: a line the
    // shelf could not cover holds less than it asked for, so a short order ships short by itself —
    // which is exactly the case this step exists to put on a demo.
    if (step.do === 'ship') {
      const rows = await orderItems(row.id, tx)
      const lines = rows.map((line) => ({ id: String(line.id), shipped: line.shipped + line.held }))
      if (lines.length > 0) {
        row = await shipOrder(
          ctx.site.id,
          row.id,
          ctx.actor,
          { lines, comment: step.say ?? null },
          tx,
        )
      }
      continue
    }
    if (step.do === 'receipt') {
      if (row.payment !== 'awaiting') continue
      await receipt(ctx, row, tx)
      row = await getOrder(ctx.site.id, row.id, tx)
      continue
    }
    if (step.do === 'confirm') {
      if (row.payment === 'none' || row.payment === 'paid') continue
      // The whole of what is still owed: confirming is a MOVEMENT now, and a demo where money
      // arrives in halves is a demo about something else.
      const due = row.total - (await settledOf(row.id, tx))
      row = await confirmPayment(
        ctx.site.id,
        row.id,
        ctx.actor,
        { amount: due, comment: step.say ?? null },
        tx,
      )
      continue
    }
    if (step.do === 'correct' && step.how) {
      await correct(ctx, row, step.how, tx, step.say ?? null)
      row = await getOrder(ctx.site.id, row.id, tx)
    }
  }

  return row
}

// The questionnaire and the shelf, read once for the whole demo: thirty orders asking the same two
// questions thirty times is thirty round trips for an answer that cannot have changed.
interface Batch extends SiteRun {
  checkoutFields: FormField[]
  sellables: Sellable[]
  byslug: Map<string, Sellable>
  people: Map<string, ScriptPerson>
}

/**
 * The orders a demo wrote for itself.
 *
 * Everything the demo owns is here — who bought, when, what off its own shelf, what the till was
 * answered and what the journal says — and everything the engine owns stays where it was: what a
 * status change does to the warehouse, when a code is issued, how far a correction moves a price.
 */
async function placeScripted(
  batch: Batch,
  order: ScriptOrder,
  tx: Db | Transaction,
): Promise<boolean> {
  const { site } = batch
  const person = batch.people.get(order.person)
  if (!person) throw new Error(`${site.slug}: no person «${order.person}»`)

  const [hour, minute] = order.at ?? [12, 0]
  const on = daysAgo(order.days, hour, minute)
  const locale = order.locale ?? site.defaultLocale

  const cart = await openCart(site.id, tx)
  for (const line of order.lines) {
    const item = line.pick
      ? batch.sellables
          .filter((one) => one.slug === line.item)
          .sort((a, b) => a.position - b.position)[line.pick - 1]
      : batch.byslug.get(line.item)
    if (!item) throw new Error(`${site.slug}: nothing on sale at «${line.item}»`)
    await addItem(
      site,
      cart.cart,
      { variantId: String(item.variantId), qty: Math.max(line.qty ?? item.minQty, item.minQty) },
      tx,
    )
  }

  /*
   * The code, typed before the till is reached — which is where a visitor types one too.
   *
   * A code this shop does not hold fails the whole fixture rather than passing quietly: an order
   * silently placed without the discount it was written to carry is exactly the kind of demo that
   * looks finished and proves nothing.
   *
   * Whether it then APPLIES is not decided here and must not be: the basket answers that itself, and
   * a code that does not reach its minimum is one of the three states this exists to show.
   */
  if (order.promo) {
    await setPromo(site, cart.cart, { code: order.promo }, tx)
  }

  /*
   * Or the link of a customer who told a friend — the same box, a code the platform minted.
   *
   * The file names the PERSON and never the code, because the code does not exist until somebody
   * takes their link: `claimReferral` is idempotent, so the first order that names them mints it and
   * every one after finds the same one. Their card has to exist already, which means an order of
   * their own earlier in the script — a link is taken by somebody who is already a customer.
   */
  if (order.broughtBy) {
    if (order.promo) throw new Error(`${site.slug}: an order carries a code or a link, not both`)
    if (order.broughtBy === order.person) {
      throw new Error(`${site.slug}: «${order.person}» cannot be brought by themselves`)
    }
    const holder = batch.people.get(order.broughtBy)
    if (!holder) throw new Error(`${site.slug}: no person «${order.broughtBy}»`)
    const [card] = await tx
      .select()
      .from(crmContact)
      .where(
        and(
          eq(crmContact.siteId, site.id),
          eq(crmContact.phone, digitsOf(holder.phone)),
          isNull(crmContact.deletedAt),
        ),
      )
      .limit(1)
    if (!card) {
      throw new Error(
        `${site.slug}: «${order.broughtBy}» has no card yet — a link is taken by a customer, ` +
          'so they need an order of their own earlier in the file',
      )
    }
    const referral = await claimReferral(site, card, tx)
    await setPromo(site, cart.cart, { code: referral.promo.code }, tx)
  }

  /*
   * WHEN it was brought, chosen off the LIVE list exactly as a visitor chooses it.
   *
   * Not written into the answers by hand, and that is the point of the whole exercise: the till
   * refuses a pair that is not among the offered ones, so a fixture that fabricated a key would
   * prove nothing about the door. The DAY that comes out of this is a day in the future — the till
   * takes no other — and the backdating pass below moves it to the day the order was actually for.
   */
  const slotField = batch.checkoutFields.find((field) => field.role === 'slot')
  let chosenSlot: string | null = null
  if (order.slot && slotField) {
    const declared = await listSlots(site.id, tx)
    const window = declared[order.slot.window - 1]
    if (!window) {
      throw new Error(
        `${site.slug}: the site declares ${declared.length} delivery windows, the file asks for №${order.slot.window}`,
      )
    }
    const offered = (await slotOptions(site, tx)) ?? []
    const found = offered.find((one) => readSlotKey(one.key)?.id === String(window.id))
    if (!found) {
      throw new Error(
        `${site.slug}: window №${order.slot.window} is offered on no day of the week ahead — is it full?`,
      )
    }
    chosenSlot = found.key
  }

  /*
   * WHERE it went. Answered only where the shop actually asks — several districts — because with one
   * the platform drops the question and an answer to a field nobody asked is dropped in silence.
   */
  const zoneField = batch.checkoutFields.find((field) => field.role === 'zone')
  let chosenZone: string | null = null
  if (order.zone && zoneField) {
    const zones = await listZones(site.id, tx)
    const district = zones[order.zone - 1]
    if (!district) {
      throw new Error(
        `${site.slug}: the site declares ${zones.length} districts, the file asks for №${order.zone}`,
      )
    }
    chosenZone = String(district.id)
  }

  const answers: Record<string, unknown> = {}
  if (slotField && chosenSlot) answers[slotField.key] = chosenSlot
  if (zoneField && chosenZone) answers[zoneField.key] = chosenZone
  for (const field of batch.checkoutFields) {
    if (field.role === 'name') answers[field.key] = person.name
    if (field.role === 'phone') answers[field.key] = person.phone
    if (field.role === 'email' && person.email) answers[field.key] = person.email
    if (field.role === 'address' && person.address) answers[field.key] = person.address
  }
  for (const [key, value] of Object.entries(order.answers ?? {})) {
    const field = batch.checkoutFields.find((one) => one.key === key)
    if (!field) throw new Error(`${site.slug}: no field «${key}» on the till`)
    answers[key] = field.type === 'date' ? dayAfter(on, Number(value)) : value
  }

  /*
   * The basket has now been READ, which is what a visitor does on the way to the till.
   *
   * The till refuses an order whose discount is not the one the buyer was shown — a total may not
   * move under a person between the basket and the button — and «shown» is stamped by this act and
   * by nothing else. Without it every order carrying a rule or a code is refused with
   * `order.discount_changed`: the machinery was right and the script was skipping a step no real
   * buyer skips.
   *
   * The ROW is reloaded before each act, and that is not ceremony. `readCart` trusts the row it is
   * handed, and every door above — adding a line, typing a code — has written to it since. Reading
   * with the row this function opened with computes the basket WITHOUT the code and then stamps that
   * number over the correct one, so the acknowledgement itself would break the very order it is for.
   * A storefront never meets this because every request loads the basket afresh.
   */
  const reload = async () =>
    (await tx.select().from(ordCart).where(eq(ordCart.id, cart.cart.id)).limit(1))[0]!

  await acknowledgeCart(await readCart(site, await reload(), tx), tx)
  const placed = await checkout(site, await reload(), { answers }, [locale], { ipHash: null }, tx)
  const row = await runSteps(batch, placed.order, order.steps ?? [], tx)

  await stampOrder(row.id, on, tx)
  // What the keeper and the carrier did with it happens after every demo is filled: see `carry.ts`.
  if (order.carry) rememberCarry({ siteId: site.id, orderId: row.id, on, carry: order.carry })
  // The delivery moves with the order: it was brought `after` days from the day it was placed, and
  // the till could only ever have been given a day in the future. See `stampSlot`.
  if (order.slot && chosenSlot)
    await stampSlot(batch.site, row.id, dayAfter(on, order.slot.after ?? 0), tx)

  // A manager who moved this order has seen the line it put in the client's conversation. Without
  // this every order on a site whose till answers in the corner window left its thread unread, and
  // Дыйкан showed nine unread out of ten — true by the letter of it and false about the shop.
  if ((order.steps ?? []).length > 0 && row.submissionId) {
    const [line] = await tx
      .select({ threadId: msgMessage.threadId })
      .from(msgMessage)
      .where(eq(msgMessage.submissionId, row.submissionId))
      .limit(1)
    // At the moment the desk last touched THIS order, which the journal already knows — not at a
    // fixed distance from when it was placed. A guess marked every conversation of Саймы read as of
    // today, including three whose last line is a question nobody has answered.
    const [last] = await tx
      .select({ at: ordEvent.createdAt })
      .from(ordEvent)
      .where(eq(ordEvent.orderId, row.id))
      .orderBy(desc(ordEvent.createdAt))
      .limit(1)
    if (line && last) {
      const at = new Date(last.at.getTime() + 60 * 60 * 1000)
      // Carried in memory to the appeals pass as well: `postMessage` stamps `staffReadAt` with the
      // real clock as it writes, so a pass that re-reads that column reads «now».
      batch.seenByOrders.set(String(line.threadId), at)
      await markSeen(line.threadId, at, tx)
    }
  }
  return true
}

export async function seedOrders(ctx: SiteRun, tx: Db | Transaction): Promise<number> {
  const form = await checkoutForm(ctx.site.id, tx)
  if (!form) return 0
  const sellables = await sellablesOf(ctx.site, tx)
  if (sellables.length === 0) return 0
  const batch: Batch = {
    ...ctx,
    checkoutFields: await listFields(form.id, tx),
    sellables,
    // A card is named by its address; the modification is its primary one unless the demo cares,
    // and no demo has yet had a reason to.
    // Primaries LAST, because a later entry wins in a `Map`: written the other way round it handed
    // a one-litre canister to a script that asked for the four-litre one, and the sum was right for
    // a thing nobody ordered.
    byslug: new Map(
      [...sellables, ...sellables.filter((one) => one.primary)].map(
        (one) => [one.slug, one] as const,
      ),
    ),
    people: new Map(ctx.script.people.map((one) => [one.key, one] as const)),
  }

  // The demo's own orders and no others. There used to be a table of a dozen generated scenarios
  // behind this, covering the same matrix of statuses and payment states — and no demo reached it:
  // every site with something sellable had written its own, and every site without had nothing to
  // sell. The matrix did not go with it; it is what each demo's file is written against. Half of
  // the ten name no orders at all, and that is not a gap — they have no basket.
  for (const order of ctx.script.orders ?? []) await placeScripted(batch, order, tx)
  return ctx.script.orders?.length ?? 0
}
