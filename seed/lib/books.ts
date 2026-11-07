import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  dayIn,
  lineTotal,
  grainOf,
  permissionsFor,
  qtyFromUnits,
  toMajor,
  toMinor,
  type AccountKey,
  type Currency,
  type LocalizedLabel,
  type MoneyPlaceKind,
  type StaffRole,
  type TaxBasis,
  type TaxKind,
  type TaxPeriod,
  monthAfter,
} from '@anavi/shared'
import { and, asc, desc, eq, gt, inArray, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { Actor } from '@anavi/backend/src/lib/actor'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { stkMove } from '@anavi/backend/src/db/schema/stk'
import {
  finAccount,
  finParty,
  type FinAccount,
  type FinParty,
} from '@anavi/backend/src/db/schema/fin'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { asOrgId, type OrgId, type SiteId } from '@anavi/backend/src/db/ids'
import { createArrival } from '@anavi/backend/src/modules/supply/arrival.service'
import {
  createAsset,
  depreciate,
  disposeAsset,
} from '@anavi/backend/src/modules/money/asset.service'
import { createCharge } from '@anavi/backend/src/modules/supply/charge.service'
import { setTerms } from '@anavi/backend/src/modules/money/payroll.service'
import { createTax } from '@anavi/backend/src/modules/money/tax.service'
import { setPlan } from '@anavi/backend/src/modules/money/budget.service'
import { createRecurring } from '@anavi/backend/src/modules/money/recurring.service'
import { createRule } from '@anavi/backend/src/modules/money/statement.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { getRecipe, setRecipe } from '@anavi/backend/src/modules/production/recipe.service'
import { applyStockMove } from '@anavi/backend/src/modules/stock/stock.hand'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { createStaffLogin, updateStaff } from '@anavi/backend/src/modules/staff/staff.service'
import { bookCurrency, rateOn, setRate } from '@anavi/backend/src/modules/money/rate.service'
import { setKeepers } from '@anavi/backend/src/modules/money/till.service'
import {
  accountByKey,
  createAccount,
  createPlace,
  ensureAccounts,
} from '@anavi/backend/src/modules/money/account.service'
import { createDirection, listDirections } from '@anavi/backend/src/modules/money/direction.service'
import { createMove, createTransfer } from '@anavi/backend/src/modules/money/document.write'
import { createParty } from '@anavi/backend/src/modules/money/counterpart.service'
import { updateMoneyTerms } from '@anavi/backend/src/modules/money/site-terms.service'
import { atHour, dayOfMoment, monthOfMoment } from './days'

/*
 * THE BOOKS EACH DEMO IS BORN WITH — data beside its material (`demos/<slug>/books.json`), put down
 * through the doors a person's own first day goes through: the chart, the directions of its
 * business, a bank account where its requisites gave none, the owner's money brought in, a supplier
 * off the platform, and the goods on its shelves received from that supplier at a price.
 *
 * The goods are what makes it books and not a cash book. A shelf opened without a price is worth
 * nought, and every sale off it then costs nothing — a margin of a hundred per cent on every line.
 * So a demo's catalogue never opens its own stock: it says what lies where (`openingStock`), and
 * the lot is received here in one delivery per hall, on the first day of the history, at the share
 * of the selling price the demo names as its cost.
 */

export interface DemoBooks {
  /**
   * `false`: the demo lives through no trade of its own (`history.json` is not expected) — its
   * orders come from elsewhere or none at all. Without it a missing history fails the seed.
   */
  history?: false
  /** the days of history before the run: the first of them is the books' opening day */
  since: number
  /**
   * the directions of the business; one made of the shelves of the catalogue it sells (by slug) or
   * the routes it carries (by name) books every sale of those to it — see `linkDirections`
   */
  directions: (string | { name: string; categories?: string[]; routes?: string[] })[]
  /** a bank account, where the demo's requisites put down none */
  bank?: string
  /** the owner's money brought into the bank on the opening day, against capital */
  capital: number
  /** who the owner is to the books — the counterparty capital is owed to */
  founder: string
  /** moved from the bank into the till on the opening day: the drawer's change */
  float?: number
  /** money places beside the bank and the till: a drawer of the site's own money, where it is another */
  places?: { kind: MoneyPlaceKind; name: string; currency: Currency }[]
  /** the counterparties the books know from the first day: whom things come from, who works on them */
  parties?: Party[]
  /** rates of other monies, written on the opening day — or `days` before the run, month by month */
  rates?: { currency: Currency; rate: number; days?: number }[]
  /*
   * Whom the opening goods were bought from, and what share of the selling price they cost; a
   * supplier paid in another money bills the months' goods in it, paid from an account in it.
   */
  supplier?: {
    name: string
    phone?: string
    address?: string
    note?: string
    currency?: Currency
    /** its papers print VAT within the total, at the rate of the organization's VAT rule that day */
    vat?: boolean
  }
  /** the direction the site's sales are booked to where the client names none */
  direction?: string
  cost?: number
  /*
   * What one unit cost, by the card's address and its modifications in their order — where a share
   * of the price cannot say it: a wholesaler that prints no prices on its site.
   */
  costs?: Record<string, number[]>
  /*
   * Goods that are each one of a kind, by the card's address, each with its own story: the day it
   * came and from whom, the hall it stands in, what it was bought for and everything spent on it
   * after. A thing on the shelves is received at the opening; one the history sells, by the history.
   */
  things?: Record<string, Thing>
  /** the note on the month's takings carried from the till to the bank */
  takings?: string
  /** the share of a terminal's takings the bank keeps on the way to the account */
  acquiring?: number
  /*
   * Goods bought abroad every so many months instead of from the usual supplier: cheaper, at
   * `cost` of the selling price, and then the cargo and the customs laid onto the delivery, each a
   * share of what it came to — so the average cost of what lies on the shelf moves with them.
   */
  imports?: {
    supplier: Party
    every: number
    cost: number
    /** `vat`: the customs' VAT, taken back whole while a VAT rule stands */
    laid: { what: string; party: string; share: number; after: number; vat?: boolean }[]
  }
  /** what production is made of: received from their own supplier on the opening day */
  materials?: {
    supplier: Party
    items: {
      key: string
      name: LocalizedLabel
      /** what it is measured in, its shelf then counting thousandths of it; absent — counted, a button */
      unit?: LocalizedLabel
      /** what one unit costs */
      cost: number
      /** how many units lie on the shelf on the opening day */
      stock: number
    }[]
  }
  /*
   * The technological card of every product a catalogue registered (`workshopCard`), by the
   * product's slug: what goes into one — a material by its key and how much of it — and the
   * operations at their rates, each done by whoever `does` the thing it names in `people`.
   */
  cards?: Record<
    string,
    {
      materials: Record<string, number>
      operations: { name: string; rate: number; by: string }[]
    }
  >
  /** the people the books pay: a login each, a monthly salary, and what of the work they do */
  people?: {
    login: string
    name: string
    title: LocalizedLabel
    role: StaffRole
    salary: number
    /** the share of the sales of the orders they run */
    percent?: number
    does?: string
    /** a cashier put at the site's till: the takings it hands to the bank are theirs */
    keeps?: boolean
  }[]
  /** what goods made before the books were kept are taken in as */
  opened?: string
  /*
   * A machine bought on the opening day — or `owned` before the books were kept, with the wear it
   * had gathered — and, where its story ends, `sold` that many days after the opening for money
   * paid into the bank, or `scrapped`.
   */
  machines?: {
    name: string
    cost: number
    life: number
    owned?: { worn: number }
    sold?: { days: number; amount: number }
    scrapped?: { days: number }
  }[]
  /** what is billed every month — rent, power — and the day it is paid */
  monthly?: {
    party: Party
    account: { key: AccountKey } | { name: string }
    amount: number
    /** how far a month's bill strays from the amount, either way */
    swing?: number
    day: number
    pay: number
    note: string
  }[]
  /** a share of turnover at `rate`, or a patent's `amount` a month */
  /*
   * What leaves the bank every month by itself with no bill — the internet, the accountant — kept
   * as a regular payment, and each past month posted on its day.
   */
  recurring?: {
    name: string
    day: number
    account: { key: AccountKey } | { name: string }
    party?: Party
    amount: number
  }[]
  /** the month's plan, the same each month, by item and direction */
  budget?: { account: { key: AccountKey } | { name: string }; direction?: string; amount: number }[]
  /** the rules a bank's statement is posted by: these words, this way, this item */
  rules?: {
    contains: string
    direction?: 'in' | 'out'
    account: { key: AccountKey } | { name: string }
  }[]
  /*
   * The bank's statement of the last ended month, read in through the statement's door: every
   * document of the month on the account, and the lines only the bank knows — its own fees, a
   * transfer nobody has said what for — in whole money, out below nought.
   */
  statement?: { day: number; amount: number; text: string; counterparty?: string }[]
  taxes?: {
    kind: TaxKind
    name: string
    rate?: number
    amount?: number
    basis?: TaxBasis
    dueDay: number
    /** what a tax on profit is counted over */
    period?: TaxPeriod
    /** the months after the opening's month the rule starts and ends: a regime changed on the way */
    from?: number
    to?: number
  }[]
  /** the day of the next month people are paid what they earned */
  payday?: number
  /*
   * What the books got wrong and put right, by the order the history types its papers and its
   * payments to suppliers: the `paper`-th paper with its first line's price `factor` times what it
   * was, struck out and typed again; the `payment`-th payment typed twice, the second struck out.
   */
  mistakes?: {
    arrival?: { paper: number; factor: number; reason: string }
    payment?: { payment: number; reason: string }
  }
  /*
   * What stands on the cutting table when the history ends: a batch opened `days` before the run
   * and not yet released, or one struck out with the reason the workshop gave. Goods by the
   * history's own words — the product's slug and the modification's place among its variants.
   */
  benches?: { item: string; pick: number; qty: number; days: number; void?: string }[]
}

type Party = { name: string; phone?: string; address?: string; note?: string }

/** Sums in the site's own money, brought to the books' at the demo's rate. */
export interface Thing {
  /** how many days before the run it came */
  came: number
  /** whom it was bought from: the supplier or one of `parties` */
  from: string
  /** the hall it stands in, by its order among the site's points */
  at: number
  cost: number
  /** what was spent on it after it came, `after` days later, paid from the bank */
  laid: { what: string; party: string; amount: number; after: number }[]
}

// The products a catalogue said are made here, by the slug their card in the books stands under.
const cards = new Map<bigint, string>()

/** A product made in-house: its card is written from the demo's recipes once the materials exist. */
/*
 * The organization's counterparty by its name, as it stands in the list: one lookup for the whole
 * seed, never a removed one. `partyKnown` wants it to be there; `partyNamed` writes it the first time
 * a demo's material names it — the demos name a supplier in words, where a person would pick one.
 */
async function partyRow(
  orgId: OrgId,
  name: string,
  tx: Db | Transaction,
): Promise<FinParty | null> {
  const [known] = await tx
    .select()
    .from(finParty)
    .where(and(eq(finParty.orgId, orgId), eq(finParty.name, name), isNull(finParty.deletedAt)))
    .limit(1)
  return known ?? null
}

export async function partyKnown(
  orgId: OrgId,
  name: string,
  tx: Db | Transaction,
): Promise<FinParty> {
  const known = await partyRow(orgId, name, tx)
  if (!known) throw new Error(`books.json: no counterparty «${name}» in the books`)
  return known
}

export async function partyNamed(
  orgId: OrgId,
  name: string,
  tx: Db | Transaction,
): Promise<bigint> {
  return (await partyRow(orgId, name, tx))?.id ?? (await createParty(orgId, { name }, tx)).id
}

export function workshopCard(productId: bigint, slug: string): void {
  cards.set(productId, slug)
}

/** The months a rule of the books stands, as the tax door takes them. */
function ruleMonths(
  books: DemoBooks,
  tax: NonNullable<DemoBooks['taxes']>[number],
  timezone: string,
) {
  const opening = openingDay(books, timezone).slice(0, 7)
  return {
    startsOn: monthAfter(opening, tax.from ?? 0),
    endsOn: tax.to === undefined ? null : monthAfter(opening, tax.to),
  }
}

export async function loadBooks(slug: string): Promise<DemoBooks | null> {
  const file = resolve(import.meta.dir, '../../demos', slug, 'books.json')
  if (!existsSync(file)) return null
  return (await Bun.file(file).json()) as DemoBooks
}

/** The opening day: `since` days before today, in the organization's own days. */
export function openingDay(books: DemoBooks, timezone: string): string {
  return daysBefore(timezone, books.since)
}

// What each catalogue said lies on its shelves, waiting for the delivery that brings it.
const waiting = new Map<bigint, { qty: number; placeId: bigint | null }[]>()

/** The goods a catalogue puts on a shelf: received with the rest at the opening, at a price. */
export function openingStock(variantId: bigint, qty: number, placeId: bigint | null = null): void {
  if (qty <= 0) return
  waiting.set(variantId, [...(waiting.get(variantId) ?? []), { qty, placeId }])
}

const ARRIVAL_LINES = 200

/** A given hour of a day on the clock of the site's organization. */
async function momentAt(
  siteId: SiteId,
  day: string,
  hour: number,
  tx: Db | Transaction,
): Promise<Date> {
  const [site] = await tx.select().from(orgSite).where(eq(orgSite.id, siteId)).limit(1)
  return atHour(site!.timezone, day, hour)
}

/** The money the books of the site's organization are kept in. */
async function bookOf(siteId: SiteId, tx: Db | Transaction): Promise<Currency> {
  const [site] = await tx.select().from(orgSite).where(eq(orgSite.id, siteId)).limit(1)
  return bookCurrency(asOrgId(site!.orgId), tx)
}

export async function openBooks(
  slug: string,
  siteId: SiteId,
  owner: Actor,
  tx: Db | Transaction,
): Promise<void> {
  const books = await loadBooks(slug)
  if (!books) return
  const [site] = await tx.select().from(orgSite).where(eq(orgSite.id, siteId)).limit(1)
  const orgId = asOrgId(site!.orgId)
  const on = openingDay(books, site!.timezone)
  await ensureAccounts(orgId, tx)
  const book = await bookCurrency(orgId, tx)
  for (const direction of books.directions)
    await createDirection(
      orgId,
      { name: typeof direction === 'string' ? direction : direction.name },
      tx,
    )
  for (const rate of books.rates ?? []) {
    const day = rate.days === undefined ? on : daysBefore(site!.timezone, rate.days)
    // The data says what one unit is worth.
    await setRate(
      orgId,
      owner,
      { currency: rate.currency, on: day, units: 1, worth: rate.rate },
      tx,
    )
  }

  const places = await tx
    .select()
    .from(finAccount)
    .where(
      and(eq(finAccount.orgId, orgId), eq(finAccount.type, 'money'), isNull(finAccount.deletedAt)),
    )
  let bank = places.find((one) => one.placeKind === 'bank' && one.currency === book)
  if (!bank) {
    if (!books.bank) throw new Error(`demos/${slug}/books.json: no bank and none named`)
    bank = await createPlace(
      orgId,
      owner,
      { kind: 'bank', name: books.bank, currency: book, siteId },
      tx,
    )
  }
  const till = places.find((one) => one.placeKind === 'cash' && one.siteId === siteId)
  for (const place of books.places ?? []) await createPlace(orgId, owner, { ...place, siteId }, tx)

  const founder = await createParty(orgId, { name: books.founder }, tx)
  const supplier = books.supplier ? await createParty(orgId, books.supplier, tx) : null
  if (books.imports) await createParty(orgId, books.imports.supplier, tx)
  for (const party of books.parties ?? []) await createParty(orgId, party, tx)
  await createMove(
    orgId,
    owner,
    {
      placeId: bank.id,
      direction: 'in',
      accountId: (await accountByKey(orgId, 'equity', tx)).id,
      amount: toMinor(books.capital, book),
      counterpart: { type: 'party', id: founder.id },
      on,
    },
    tx,
  )
  if (books.float && till) {
    await createTransfer(
      orgId,
      owner,
      { fromPlaceId: bank.id, toPlaceId: till.id, amount: toMinor(books.float, book), on },
      tx,
    )
  }

  const permitted = { ...owner, permissions: permissionsFor([owner.activeRole]) }
  for (const person of books.people ?? []) {
    const { staff } = await createStaffLogin(
      orgId,
      { login: person.login, password: 'password', name: person.name, roles: [person.role] },
      permitted,
      tx,
    )
    await updateStaff(orgId, staff.id, { title: person.title }, permitted, tx)
    if (person.keeps) {
      if (!till)
        throw new Error(`demos/${slug}/books.json: «${person.login}» keeps a till the site has not`)
      await setKeepers(orgId, till.id, { userIds: [String(staff.userId)] }, tx)
    }
    // From the month the books open: the history pays its people from its first month on.
    await setTerms(
      orgId,
      staff.userId,
      owner,
      {
        salary: toMinor(person.salary, book),
        percent: person.percent ?? null,
        from: openingDay(books, site!.timezone).slice(0, 7),
      },
      tx,
    )
  }

  // The rules stand before the goods made in-house are valued: their plan carries the employer's
  // contribution on the piecework, as every batch released later does.
  for (const tax of books.taxes ?? []) {
    await createTax(
      orgId,
      owner,
      {
        ...tax,
        amount: tax.amount === undefined ? null : toMinor(tax.amount, book),
        ...ruleMonths(books, tax, site!.timezone),
      },
      tx,
    )
  }

  if (books.materials) {
    const shelf = await openMaterials(siteId, orgId, books, bank.id, owner, on, tx)
    await writeCards(siteId, books, shelf, tx)
  }
  await openMade(siteId, books, owner, on, tx)
  // A demo's cards are its own: the next demo starts with none.
  cards.clear()
  await receiveThings(siteId, books, bank.id, owner, tx)
  await receiveOpening(slug, siteId, books, supplier?.id ?? null, bank.id, owner, on, tx)

  for (const machine of books.machines ?? []) {
    const asset = await createAsset(
      orgId,
      owner,
      {
        name: machine.name,
        cost: toMinor(machine.cost, book),
        lifeMonths: machine.life,
        acquiredOn: on,
        siteId,
        ...(machine.owned
          ? { way: 'opening', worn: toMinor(machine.owned.worn, book) }
          : { way: 'paid', placeId: bank.id }),
      },
      tx,
    )
    /*
     * Its end, before the night's wear is booked below: wear stops with the month before it left,
     * and a machine no longer standing is one the night never touches again.
     */
    const ended = machine.sold ?? machine.scrapped
    if (!ended) continue
    const at = new Date(Date.parse(`${on}T00:00:00Z`) + ended.days * 86_400_000)
      .toISOString()
      .slice(0, 10)
    await disposeAsset(
      orgId,
      asset.id,
      owner,
      machine.sold
        ? { way: 'sold', on: at, amount: toMinor(machine.sold.amount, book), placeId: bank.id }
        : { way: 'scrapped', on: at },
      tx,
    )
  }
  // Every month that has ended since: the wear the night would have booked month by month.
  if (books.machines) await depreciate(orgId, tx)

  for (const one of books.monthly ?? []) {
    await createParty(orgId, one.party, tx)
    await itemOf(orgId, one.account, tx)
  }

  const directionNamed = async (name: string) => {
    const found = (await listDirections(orgId, tx)).find((one) => one.name === name)
    if (!found) throw new Error(`demos/${slug}/books.json: no direction «${name}»`)
    return found.id
  }
  if (books.direction) {
    await updateMoneyTerms(
      siteId,
      orgId,
      { directionId: await directionNamed(books.direction) },
      tx,
    )
  }
  for (const rule of books.rules ?? []) {
    await createRule(
      orgId,
      {
        contains: rule.contains,
        direction: rule.direction ?? null,
        accountId: (await itemOf(orgId, rule.account, tx)).id,
      },
      tx,
    )
  }
  for (const one of books.recurring ?? []) {
    const party = one.party ? await createParty(orgId, one.party, tx) : null
    await createRecurring(
      orgId,
      owner,
      {
        name: one.name,
        kind: 'manual',
        day: one.day,
        payload: {
          placeId: String(bank.id),
          direction: 'out',
          accountId: String((await itemOf(orgId, one.account, tx)).id),
          amount: toMinor(one.amount, book),
          counterpart: party ? { type: 'party', id: String(party.id) } : null,
          note: one.name,
        },
      },
      tx,
    )
  }
  // The plan of every month the books have lived, and of the next one.
  if (books.budget) {
    const last = monthOfMoment(new Date(Date.now() + 31 * 86_400_000))
    const groups = new Map<string, typeof books.budget>()
    for (const one of books.budget)
      groups.set(one.direction ?? '', [...(groups.get(one.direction ?? '') ?? []), one])
    for (let month = on.slice(0, 7); month <= last; month = monthAfter(month)) {
      for (const [direction, lines] of groups) {
        await setPlan(
          orgId,
          {
            month,
            directionId: direction ? await directionNamed(direction) : null,
            lines: await Promise.all(
              lines.map(async (one) => ({
                accountId: (await itemOf(orgId, one.account, tx)).id,
                amount: toMinor(one.amount, book),
              })),
            ),
          },
          tx,
        )
      }
    }
  }
}

/** An item of the books by its key, or one of the organization's own by its name, made the first time. */
export async function itemOf(
  orgId: ReturnType<typeof asOrgId>,
  account: { key: AccountKey } | { name: string },
  tx: Db | Transaction,
) {
  if ('key' in account) return accountByKey(orgId, account.key, tx)
  const [found] = await tx
    .select()
    .from(finAccount)
    .where(
      and(
        eq(finAccount.orgId, orgId),
        eq(finAccount.name, account.name),
        isNull(finAccount.deletedAt),
      ),
    )
    .limit(1)
  return found ?? createAccount(orgId, { type: 'expense', name: account.name }, tx)
}

const daysBefore = (timezone: string, days: number) =>
  dayIn(timezone, new Date(Date.now() - days * 86_400_000))

/*
 * The materials, as goods of the site's own shelf that never reach the storefront, received from
 * their supplier on the opening day at their price.
 */
async function openMaterials(
  siteId: SiteId,
  orgId: ReturnType<typeof asOrgId>,
  books: DemoBooks,
  bankId: bigint,
  owner: Actor,
  on: string,
  tx: Db | Transaction,
): Promise<Map<string, bigint>> {
  const book = await bookCurrency(orgId, tx)
  const shelf = new Map<string, bigint>()
  const lines: { variantId: bigint; qty: number; price: number; steps: number }[] = []
  for (const item of books.materials!.items) {
    const product = await createProduct(
      siteId,
      {
        slug: `material-${item.key}`,
        name: item.name,
        ...(item.unit ? { priceUnit: item.unit } : {}),
        material: true,
      },
      tx,
    )
    const variant = await createVariant(siteId, product.id, { isPrimary: true }, tx)
    shelf.set(item.key, variant.id)
    lines.push({
      variantId: variant.id,
      qty: qtyFromUnits(item.stock, grainOf(item.unit)),
      price: toMinor(item.cost, book),
      steps: grainOf(item.unit),
    })
  }
  const supplier = await createParty(orgId, books.materials!.supplier, tx)
  await receiveLines(siteId, supplier.id, null, lines, bankId, owner, on, 'M', tx)
  return shelf
}

/** The card of every registered product, from its kind's recipe and its own cloth. */
async function writeCards(
  siteId: SiteId,
  books: DemoBooks,
  shelf: Map<string, bigint>,
  tx: Db | Transaction,
): Promise<void> {
  const book = await bookOf(siteId, tx)
  const material = (key: string) => {
    const id = shelf.get(key)
    if (!id) throw new Error(`books.json: no material «${key}»`)
    return id
  }
  for (const [productId, slug] of cards) {
    const card = books.cards?.[slug]
    if (!card) throw new Error(`books.json: no card for «${slug}»`)
    await setRecipe(
      siteId,
      productId,
      {
        materials: Object.entries(card.materials).map(([key, qty]) => ({
          variantId: material(key),
          qty,
        })),
        operations: card.operations.map((one) => ({
          name: one.name,
          rate: toMinor(one.rate, book),
        })),
      },
      tx,
    )
  }
}

/*
 * What was sewn before the books were kept: taken onto the shelf at what its card says one costs —
 * the materials at their prices and the work at its rates — against the opening balances, with no
 * piecework owed: that work was paid before.
 */
async function openMade(
  siteId: SiteId,
  books: DemoBooks,
  owner: Actor,
  on: string,
  tx: Db | Transaction,
): Promise<void> {
  const made = await tx
    .select({ id: catVariant.id, productId: catVariant.productId })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .where(and(eq(catProduct.siteId, siteId), inArray(catVariant.productId, [...cards.keys(), 0n])))
  if (made.length === 0) return
  const [before] = await tx
    .select({ id: stkMove.id })
    .from(stkMove)
    .orderBy(desc(stkMove.id))
    .limit(1)
  const unit = new Map<bigint, number>()
  let total = 0
  for (const variant of made) {
    for (const put of waiting.get(variant.id) ?? []) {
      const cost =
        unit.get(variant.productId) ?? (await getRecipe(siteId, variant.productId, tx)).planned
      unit.set(variant.productId, cost)
      // The screen's own door: the same checks a hand at the shelf meets.
      await applyStockMove(
        siteId,
        variant.productId,
        variant.id,
        owner,
        {
          op: 'opening',
          qty: put.qty,
          cost: cost * put.qty,
          reason: books.opened ?? null,
          placeId: put.placeId,
        },
        tx,
      )
      total += cost * put.qty
    }
    waiting.delete(variant.id)
  }
  if (total === 0) return
  await tx
    .update(stkMove)
    .set({
      createdAt: await momentAt(siteId, on, 9, tx),
      on: dayOfMoment(await momentAt(siteId, on, 9, tx)),
    })
    .where(gt(stkMove.id, before?.id ?? 0n))
}

/*
 * The shelves received from the demo's supplier: one paper per hall, paid from the bank the same
 * day. A price in another money than the books' is brought to them at the rate the demo wrote.
 */
async function receiveOpening(
  slug: string,
  siteId: SiteId,
  books: DemoBooks,
  supplierId: bigint | null,
  bankId: bigint,
  owner: Actor,
  on: string,
  tx: Db | Transaction,
): Promise<void> {
  const rows = await tx
    .select({
      id: catVariant.id,
      price: catVariant.price,
      position: catVariant.position,
      slug: catProduct.slug,
      steps: catProduct.grain,
      currency: orgSite.currency,
      orgId: orgSite.orgId,
    })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .innerJoin(orgSite, eq(orgSite.id, catProduct.siteId))
    .where(and(eq(catProduct.siteId, siteId), inArray(catVariant.id, [...waiting.keys(), 0n])))
  if (rows.length === 0) return
  if (supplierId === null || (!books.cost && !books.costs)) {
    throw new Error(`demos/${slug}/books.json: goods on the shelves and no supplier or cost named`)
  }

  const halls = new Map<
    string,
    { variantId: bigint; qty: number; price: number; steps: number }[]
  >()
  for (const row of rows) {
    // The goods are priced in the site's money and booked in the books' own: at the day's rate.
    const rate = await rateOn(asOrgId(row.orgId), row.currency, on, tx)
    if (rate === null) throw new Error(`demos/${slug}/books.json: no rate for ${row.currency}`)
    const named = books.costs?.[row.slug]?.[row.position]
    const price =
      named !== undefined
        ? toMinor(named, await bookOf(siteId, tx))
        : Math.round((row.price ?? 0) * (books.cost ?? 0) * rate)
    if (price <= 0) throw new Error(`demos/${slug}/books.json: no cost for «${row.slug}»`)
    for (const put of waiting.get(row.id) ?? []) {
      const hall = String(put.placeId ?? '')
      halls.set(hall, [
        ...(halls.get(hall) ?? []),
        { variantId: row.id, qty: put.qty, price, steps: row.steps },
      ])
    }
    waiting.delete(row.id)
  }

  for (const [hall, lines] of halls) {
    await receiveLines(
      siteId,
      supplierId,
      hall ? BigInt(hall) : null,
      lines,
      bankId,
      owner,
      on,
      hall,
      tx,
    )
  }
}

/** The things on the shelves at the opening, each received on its own day with all spent on it. */
async function receiveThings(
  siteId: SiteId,
  books: DemoBooks,
  bankId: bigint,
  owner: Actor,
  tx: Db | Transaction,
): Promise<void> {
  if (!books.things) return
  const rows = await tx
    .select({ id: catVariant.id, slug: catProduct.slug })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .where(and(eq(catProduct.siteId, siteId), inArray(catVariant.id, [...waiting.keys(), 0n])))
  for (const row of rows) {
    if (!books.things[row.slug]) continue
    await receiveThing(siteId, books, row.slug, row.id, bankId, owner, tx)
    waiting.delete(row.id)
  }
}

/*
 * One thing that is one of a kind, as a dealer keeps it: bought on its day into its hall and paid
 * from the bank, and then everything put into it — the delivery, the customs, the repair, the wash
 * — laid onto that very thing by its own paper, each paid on its day. What it cost is the sum of
 * them, and the margin of its sale is read off that.
 */
export async function receiveThing(
  siteId: SiteId,
  books: DemoBooks,
  slug: string,
  variantId: bigint,
  bankId: bigint,
  actor: Actor,
  tx: Db | Transaction,
): Promise<{ arrivalId: bigint; chargeIds: bigint[] }> {
  const thing = books.things?.[slug]
  if (!thing) throw new Error(`books.json: «${slug}» is no thing of the books`)
  const [site] = await tx.select().from(orgSite).where(eq(orgSite.id, siteId)).limit(1)
  const orgId = asOrgId(site!.orgId)
  const partyKnownId = async (name: string) => (await partyKnown(orgId, name, tx)).id
  const hall = (await listPlaces(siteId, tx))[thing.at]
  if (!hall) throw new Error(`books.json: «${slug}» stands in no hall ${thing.at}`)
  const day = (days: number) => daysBefore(site!.timezone, days)
  const on = day(thing.came)
  // The paper and every cost stand in the site's money; where that is not the books' own, they are
  // paid from a bank account of it, bought with the books' money on the day the thing came — the
  // platform brings what was paid into the books at each day's rate.
  const currency = site!.currency as Currency
  const book = await bookCurrency(orgId, tx)
  const paying = currency === book ? bankId : (await bankIn(orgId, currency, tx)).id
  if (paying !== bankId) {
    const need = toMinor(
      thing.laid.reduce((sum, laid) => sum + laid.amount, thing.cost),
      currency,
    )
    const rate = await rateOn(orgId, currency, on, tx)
    if (rate === null) throw new Error(`books.json: no rate for ${currency} on ${on}`)
    await createTransfer(
      orgId,
      actor,
      {
        fromPlaceId: bankId,
        toPlaceId: paying,
        amount: toMinor(toMajor(need, currency) * rate, book),
        received: need,
        on,
        note: thing.from,
      },
      tx,
    )
  }
  const price = toMinor(thing.cost, currency)
  const arrival = await createArrival(
    siteId,
    actor,
    {
      counterpart: { type: 'party', id: await partyKnownId(thing.from) },
      placeId: hall.id,
      currency,
      on,
      // The supplier's paper: its day and the card's own number, the same every run.
      number: `${on.replaceAll('-', '').slice(2)}-${variantId}`,
      lines: [{ variantId, qty: 1, price }],
      paid: { placeId: paying, amount: price },
    },
    tx,
  )
  await tx
    .update(stkMove)
    .set({
      createdAt: atHour(site!.timezone, on, 10),
      on: dayOfMoment(atHour(site!.timezone, on, 10)),
    })
    .where(and(eq(stkMove.sourceType, 'arrival'), eq(stkMove.sourceId, arrival.id)))
  const chargeIds: bigint[] = []
  for (const laid of thing.laid) {
    const at = day(thing.came - laid.after)
    const charge = await createCharge(
      siteId,
      actor,
      {
        variantId,
        what: laid.what,
        amount: toMinor(laid.amount, currency),
        currency,
        on: at,
        counterpart: { type: 'party', id: await partyKnownId(laid.party) },
        paidFrom: paying,
      },
      tx,
    )
    chargeIds.push(charge.id)
    await tx
      .update(stkMove)
      .set({
        createdAt: atHour(site!.timezone, at, 15),
        on: dayOfMoment(atHour(site!.timezone, at, 15)),
      })
      .where(and(eq(stkMove.sourceType, 'charge'), eq(stkMove.sourceId, charge.id)))
  }
  return { arrivalId: arrival.id, chargeIds }
}

export async function bankIn(
  orgId: OrgId,
  currency: Currency,
  tx: Db | Transaction,
): Promise<FinAccount> {
  const [bank] = await tx
    .select()
    .from(finAccount)
    .where(
      and(
        eq(finAccount.orgId, orgId),
        eq(finAccount.placeKind, 'bank'),
        eq(finAccount.currency, currency),
        isNull(finAccount.deletedAt),
      ),
    )
    .orderBy(asc(finAccount.id))
    .limit(1)
  if (!bank) throw new Error(`books.json: the books keep no bank account in ${currency}`)
  return bank
}

/** Goods received from one supplier into one hall, a paper per two hundred lines, paid the same day. */
async function receiveLines(
  siteId: SiteId,
  partyId: bigint,
  placeId: bigint | null,
  lines: { variantId: bigint; qty: number; price: number; steps: number }[],
  bankId: bigint,
  owner: Actor,
  on: string,
  series: string,
  tx: Db | Transaction,
): Promise<void> {
  for (let at = 0; at < lines.length; at += ARRIVAL_LINES) {
    const part = lines.slice(at, at + ARRIVAL_LINES)
    const total = part.reduce((sum, line) => sum + lineTotal(line.price, line.qty, line.steps), 0)
    const arrival = await createArrival(
      siteId,
      owner,
      {
        counterpart: { type: 'party', id: partyId },
        placeId,
        on,
        number: [on.replaceAll('-', '').slice(2), series || null, at / ARRIVAL_LINES + 1]
          .filter(Boolean)
          .join('-'),
        lines: part.map(({ variantId, qty, price }) => ({ variantId, qty, price })),
        paid: { placeId: bankId, amount: total },
      },
      tx,
    )
    // The goods came in that morning, not at the minute the base was built.
    await tx
      .update(stkMove)
      .set({
        createdAt: await momentAt(siteId, on, 9, tx),
        on: dayOfMoment(await momentAt(siteId, on, 9, tx)),
      })
      .where(and(eq(stkMove.sourceType, 'arrival'), eq(stkMove.sourceId, arrival.id)))
  }
}
