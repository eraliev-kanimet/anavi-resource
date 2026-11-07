import type { Actor } from '@anavi/backend/src/lib/actor'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  dayIn as dayInZone,
  lineTotal,
  qtyFromUnits,
  toMajor,
  toMinor,
  vatOf,
  type Currency,
  lastDayOf,
  monthAfter,
  monthOf,
  monthsAfter,
  dayOfMonth,
  previousMonthEnd,
} from '@anavi/shared'
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  sql,
  db,
  type Db,
  type Transaction,
} from '@anavi/backend/src/db'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { prdBatch, prdBatchMaterial, prdBatchWork } from '@anavi/backend/src/db/schema/prd'
import { stkMove } from '@anavi/backend/src/db/schema/stk'
import {
  finAccount,
  finArrival,
  finEntry,
  finLine,
  finRecurring,
  finTax,
} from '@anavi/backend/src/db/schema/fin'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { ordCost, ordEvent, ordOrder, ordPayment } from '@anavi/backend/src/db/schema/ord'
import { org, orgSite, orgStaff } from '@anavi/backend/src/db/schema/org'
import { iamUser } from '@anavi/backend/src/db/schema/iam'
import { asOrgId } from '@anavi/backend/src/db/ids'
import { hasCard } from '@anavi/backend/src/modules/production/recipe.service'
import { bookCurrency, rateOn } from '@anavi/backend/src/modules/money/rate.service'
import { dueOf, termsOf } from '@anavi/backend/src/modules/money/tax-term.money'
import { contactByPhone, createContact } from '@anavi/backend/src/modules/crm/contact.service'
import {
  createBatch,
  editBatch,
  releaseBatch,
  voidBatch,
} from '@anavi/backend/src/modules/production/batch.service'
import { bulkProducts } from '@anavi/backend/src/modules/catalog/product.service'
import { linkOrgContact } from '@anavi/backend/src/modules/crm/contact.service'
import { createCharge } from '@anavi/backend/src/modules/supply/charge.service'
import { addCostWork } from '@anavi/backend/src/modules/order/cost.service'
import { renderService } from '@anavi/backend/src/modules/order/done.service'
import { arrangeAtCounter } from '@anavi/backend/src/modules/order/counter.service'
import { writeOffOrder } from '@anavi/backend/src/modules/order/writeoff.service'
import { repossess } from '@anavi/backend/src/modules/order/repossess.service'
import { receiveReturn } from '@anavi/backend/src/modules/order/return.service'
import { settledOf } from '@anavi/backend/src/modules/ordermoney/order.payments'
import { owedNow } from '@anavi/backend/src/modules/ordermoney/order.sums'
import { insApplication } from '@anavi/backend/src/db/schema/ins'
import {
  applicationOfOrder,
  decide,
} from '@anavi/backend/src/modules/instalment/application.service'
import {
  sendPayment,
  recordPayment,
} from '@anavi/backend/src/modules/settlement/settlement.payment'
import { downAwaited, scheduleOf } from '@anavi/backend/src/modules/instalment/schedule.service'
import { listOrgStaffMembers } from '@anavi/backend/src/modules/staff/staff.service'
import { insDue, insProgram } from '@anavi/backend/src/db/schema/ins'
import { stlEntry } from '@anavi/backend/src/db/schema/stl'
import { srvService } from '@anavi/backend/src/db/schema/srv'
import { createArrival, voidArrival } from '@anavi/backend/src/modules/supply/arrival.service'
import { accountByKey, balanceOf } from '@anavi/backend/src/modules/money/account.service'
import {
  createBill,
  createMove,
  createTransfer,
  vatRateOn,
} from '@anavi/backend/src/modules/money/document.write'
import {
  listDirections,
  setClientDirection,
} from '@anavi/backend/src/modules/money/direction.service'
import { live } from '@anavi/backend/src/modules/money/money.service'
import { voidEntry } from '@anavi/backend/src/modules/money/entry.service'
import {
  buildPayroll,
  payPerson,
  payrollMonth,
  postPayroll,
} from '@anavi/backend/src/modules/money/payroll.service'
import { billStates } from '@anavi/backend/src/modules/money/party.service'
import { accrueTax, payTax, taxMonth } from '@anavi/backend/src/modules/money/tax.service'
import { changeStatus } from '@anavi/backend/src/modules/order/status.service'
import { sellAtCounter } from '@anavi/backend/src/modules/order/hall.service'
import { exchangeAtCounter } from '@anavi/backend/src/modules/order/exchange.service'
import { sellCertificate } from '@anavi/backend/src/modules/order/certificate.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { setContract } from '@anavi/backend/src/modules/catalog/contract.service'
import {
  applyReprice,
  undoPriceBatch,
} from '@anavi/backend/src/modules/catalog/price-batch.service'
import { recount, recountSheet } from '@anavi/backend/src/modules/stock/recount.service'
import { catPriceBatch } from '@anavi/backend/src/db/schema/cat'
import { randomUUID } from 'node:crypto'
import { getOrder, orderItems } from '@anavi/backend/src/modules/order/order.service'
import { raiseForContact } from '@anavi/backend/src/modules/order/raise.service'
import { shipOrder } from '@anavi/backend/src/modules/order/ship.service'
import { confirmPayment } from '@anavi/backend/src/modules/order/payment.service'
import {
  itemOf,
  bankIn,
  loadBooks,
  openingDay,
  partyKnown,
  receiveThing,
  type DemoBooks,
} from '../lib/books'
import {
  loadStatement,
  stageStatementFile,
} from '@anavi/backend/src/modules/money/statement.service'
import { runDue } from '@anavi/backend/src/modules/money/recurring.service'
import { tillHand } from '@anavi/backend/src/modules/money/till.service'
import { isPayRule } from '@anavi/backend/src/modules/money/pay-tax.money'
import { writeWorkbook, type SheetCell } from '@anavi/backend/src/lib/xlsx'
import { actorOf } from '../links/keeping'
import { lastId } from './carry'
import { followDays } from './books'
import { ageNotices, daysAgo } from './stamp'
import type { SiteRun } from './context'
import { atHour, dayOfMoment, monthOfMoment } from '../lib/days'

/*
 * HALF A YEAR OF ORDINARY DAYS — the counter's trade around the stories a demo tells
 * (`demos/<slug>/history.json`, data), and the months of the business around them.
 *
 * Regulars come in, take a thing or three, pay into the till or by transfer, and leave with it.
 * Each month puts back what it sold — bought from the supplier, or, where a thing has a card, sewn
 * in a batch at the month's start by the people the demo names, the cloth it took bought back from
 * its own supplier — and some of it is sewn to the very order. The till's takings go to the bank.
 * And every month that has ended is lived through as the demo's books say: the rent and the power
 * billed and paid, the payroll posted and people paid on the payday, the tax accrued and paid.
 *
 * Every act goes through the door the shop's own people use, and only the moments are set back,
 * as the rest of the sales pass does. The shelf the script meets is the shelf it always met.
 */

interface HistoryLine {
  item: string
  pick: number
  /** in the goods' own units, as a person says it — «1.5» kilograms; turned into grains on reading */
  qty: number
  /** what one unit was sold for; absent — what the catalogue asks, through its wholesale ladder */
  price?: number
}

/** A service of the site sold beside the goods, at its own price unless one is named. */
interface HistoryWork {
  service: string
  qty: number
  price?: number
}

interface HistorySale {
  days: number
  at: [number, number]
  /** the buyer's key among `people`; for an organization's purchase, the person who came for it */
  person: string
  lines: (HistoryLine | HistoryWork)[]
  /** into the till, by a card through the terminal, or by a transfer to the bank */
  paid: 'cash' | 'card' | 'transfer'
  /** whoever did the services, by the name the staff list has, and the share of them they earn */
  work?: { by: string; percent: number }
  /*
   * Bought in instalments, under a programme by its name: another organization's, answering its
   * questions, or the shop's own, given at once (or waiting for a person where the buyer is late with
   * the shop or past its ceiling). What happened to it after, each in days after the sale:
   */
  instalment?: {
    program: string
    answers?: Record<string, unknown>
    /** how many of the latest months that have passed stand unpaid — the contract is late by them */
    unpaid?: number
    /** the buyer paid off the rest this many days after the sale */
    early?: number
    /** the shop gave up on what was left */
    writeOff?: { after: number; reason: string }
    /** the shop took the thing back for want of payment and kept this much of what was paid */
    repossess?: { after: number; keep: number; reason: string }
    /** the thing came back fit, as any return, and the markup with it where the programme says so */
    back?: { after: number }
    /** the person at the counter took the risk of a held contract (`risk`) */
    risk?: boolean
  }
  /** an organization buying on its account, by its name; paid by a transfer `paidAfter` days later */
  org?: string
  paidAfter?: number
  /** sewn to this very order rather than taken off the rail */
  sewn?: boolean
  /** a deposit paid on the day, in whole money: the rest is paid when the thing is handed over */
  deposit?: number
  /** the days after the deal the thing is handed over */
  handed?: number
  /** the login of whoever ran the order, as `books.json` names the people */
  by?: string
  /*
   * Sold in the HALL, at this point of the site (by its place in the list, from one), through the
   * hall's own door: the shelf of that point gives the goods, the rules and the ladder price them.
   */
  hall?: number
  /** paid in part by a certificate of this many, bought at the hall `certificate.days` before */
  certificate?: { amount: number; days: number }
  /** a size changed in the hall `after` days later: one of the first line, for the card's `pick` */
  exchange?: { after: number; pick: number }
}

interface History {
  /** a buyer whose purchases go to a direction of their own — a shop buying wholesale */
  people: {
    key: string
    name: string
    phone: string
    direction?: string
    /** the per cent off the whole catalogue a wholesale buyer agreed — read by the order's own lens */
    contract?: number
  }[]
  sales: HistorySale[]
  /** what happens on the shop floor between the sales, through the doors the staff press */
  floor?: {
    /** a markdown of these cards by a per cent, and — `undo` days later — taken back */
    reprice?: { days: number; items: string[]; percent: number; undo?: number }[]
    /**
     * A count of one hall that found the rail not as the books said — a size mixed up with its
     * neighbour: each line names how far the count stood from the books.
     */
    recounts?: {
      days: number
      hall: number
      lines: { item: string; pick: number; delta: number }[]
    }[]
  }
}

async function loadHistory(slug: string, books: DemoBooks): Promise<History | null> {
  const file = resolve(import.meta.dir, '../../demos', slug, 'history.json')
  if (existsSync(file)) return (await Bun.file(file).json()) as History
  // A demo without a trade of its own says so in its books; a misspelt slug does not look like one.
  if (books.history === false) return null
  throw new Error(`demos/${slug}/history.json is missing — or say "history": false in books.json`)
}

const isGoods = (line: HistoryLine | HistoryWork): line is HistoryLine => 'item' in line

const MINUTE = 60_000
const DAY = 86_400_000

export async function seedHistory(ctx: SiteRun, tx: Db | Transaction): Promise<number> {
  const books = await loadBooks(ctx.site.slug)
  if (!books) return 0
  const history = await loadHistory(ctx.site.slug, books)
  if (!history) return 0
  const { site, actor } = ctx
  const orgId = asOrgId(site.orgId)
  const currency = site.currency as Currency

  const places = await tx
    .select()
    .from(finAccount)
    .where(
      and(eq(finAccount.orgId, orgId), eq(finAccount.type, 'money'), isNull(finAccount.deletedAt)),
    )
    .orderBy(asc(finAccount.id))
  // The drawer takes the site's own money; the books pay from the bank in theirs, and a transfer
  // from a buyer lands in a bank account of the site's money.
  const book = await bookCurrency(orgId, tx)
  const till = places.find(
    (one) => one.placeKind === 'cash' && one.siteId === site.id && one.currency === currency,
  )
  const bank = await bankIn(orgId, book, tx)
  const inbound = places.find((one) => one.placeKind === 'bank' && one.currency === currency)
  const terminal = places.find(
    (one) => one.placeKind === 'terminal' && one.siteId === site.id && one.currency === currency,
  )
  const services = await tx
    .select({ id: srvService.id, slug: srvService.slug })
    .from(srvService)
    .where(eq(srvService.siteId, site.id))
  if (!till || !bank) throw new Error(`${site.slug}: history needs a till and a bank account`)
  const known = (name: string) => partyKnown(orgId, name, tx)
  const supplier = books.supplier ? await known(books.supplier.name) : null
  const cloth = books.materials ? await known(books.materials.supplier.name) : null
  const importer = books.imports ? await known(books.imports.supplier.name) : null

  const goods = await tx
    .select({
      id: catVariant.id,
      productId: catVariant.productId,
      slug: catProduct.slug,
      position: catVariant.position,
      steps: catProduct.grain,
      price: catVariant.price,
      made: hasCard(catProduct.id),
    })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .where(
      and(
        eq(catProduct.siteId, site.id),
        isNull(catVariant.deletedAt),
        isNull(catProduct.deletedAt),
      ),
    )
    .orderBy(asc(catVariant.position), asc(catVariant.id))
  const variantOf = (line: Pick<HistoryLine, 'item' | 'pick'>) => {
    const found = goods.filter((one) => one.slug === line.item)[line.pick - 1]
    if (!found) throw new Error(`${site.slug}: history sells nothing at «${line.item}»`)
    return found
  }
  for (const sale of history.sales) {
    for (const line of sale.lines.filter(isGoods)) {
      line.qty = qtyFromUnits(line.qty, variantOf(line).steps)
    }
  }
  const cards = new Map<string, bigint>()
  const cardOf = async (key: string) => {
    const known = cards.get(key)
    if (known) return known
    const person = history.people.find((one) => one.key === key)
    if (!person) throw new Error(`${site.slug}: history names no person «${key}»`)
    const card =
      (await contactByPhone(site.id, person.phone, tx)) ??
      (await createContact(site.id, actor, { name: person.name, phone: person.phone }, tx))
    if (person.direction) {
      const direction = (await listDirections(orgId, tx)).find(
        (one) => one.name === person.direction,
      )
      if (!direction) throw new Error(`${site.slug}: no direction «${person.direction}»`)
      await setClientDirection(site.id, card.id, { directionId: direction.id }, tx)
    }
    // The dealer's agreement on its card: the order prices its lines by it, as a person's would.
    if (person.contract)
      await setContract(
        site.id,
        card.id,
        actor,
        { prices: [{ selectionId: null, percent: person.contract }] },
        tx,
      )
    cards.set(key, card.id)
    return card.id
  }

  // Who does the work, by what they do: each operation names the doing, and its people take it in turn.
  const staff = await tx
    .select({ userId: orgStaff.userId, name: iamUser.name })
    .from(orgStaff)
    .innerJoin(iamUser, eq(iamUser.id, orgStaff.userId))
    .where(and(eq(orgStaff.orgId, orgId), isNull(orgStaff.deletedAt)))
  const doers = (does: string) =>
    (books.people ?? [])
      .filter((one) => one.does === does)
      .map((one) => {
        const found = staff.find((row) => row.name === one.name)
        if (!found) throw new Error(`${site.slug}: «${one.name}» is not on the staff`)
        return found.userId
      })
  const runner = (login: string | undefined) => {
    if (!login) return actor
    const person = (books.people ?? []).find((one) => one.login === login)
    const found = person && staff.find((row) => row.name === person.name)
    if (!person || !found) throw new Error(`${site.slug}: nobody «${login}» runs orders`)
    return { userId: found.userId, activeRole: person.role, viaOrgId: null }
  }
  const turns = new Map<string, number>()
  const doer = (does: string) => {
    const people = doers(does)
    const turn = turns.get(does) ?? 0
    turns.set(does, turn + 1)
    return people[turn % Math.max(1, people.length)]
  }

  // The months, oldest first, each with what it sold.
  const months = new Map<string, HistorySale[]>()
  for (const sale of [...history.sales].sort((a, b) => b.days - a.days)) {
    const month = monthOfMoment(daysAgo(sale.days, 12, 0))
    months.set(month, [...(months.get(month) ?? []), sale])
  }

  let written = 0
  // Counted in the order the history types them, so a mistake of the books falls on the same one.
  let papers = 0
  let payments = 0
  let monthIndex = -1
  for (const [month, sales] of months) {
    monthIndex += 1
    const first = Math.max(...sales.map((one) => one.days))
    await restock(month, sales, daysAgo(first + 1, 9, 0))
    for (const sale of sales) {
      await sell(sale)
      written += 1
    }
    // The month's cash goes to the bank on its last day of trade, the change left in the drawer.
    await carryTakings(daysAgo(Math.min(...sales.map((one) => one.days)), 19, 0))
  }

  // And the cutting table as it stands today: a batch still open, one struck out with its reason.
  for (const bench of books!.benches ?? []) {
    const variant = variantOf(bench)
    const batch = await createBatch(
      site.id,
      actor,
      { variantId: variant.id, qty: qtyFromUnits(bench.qty, variant.steps) },
      tx,
    )
    const opened = daysAgo(bench.days, 9, 0)
    if (bench.void) await voidBatch(site.id, batch.id, actor, { reason: bench.void }, tx)
    await tx
      .update(prdBatch)
      .set({
        createdAt: opened,
        ...(bench.void ? { voidedAt: new Date(opened.getTime() + 3 * 60 * MINUTE) } : {}),
      })
      .where(eq(prdBatch.id, batch.id))
  }

  for (const one of history.floor?.reprice ?? []) {
    const ids = [
      ...new Set(goods.filter((row) => one.items.includes(row.slug)).map((row) => row.productId)),
    ]
    if (ids.length !== one.items.length)
      throw new Error(`${site.slug}: reprice names an unknown card`)
    const batch = await applyReprice(
      site.id,
      actor,
      {
        ids: ids.map(String),
        move: { kind: 'change', change: { mode: 'percent', percent: one.percent } },
      },
      tx,
    )
    if (!batch) continue
    const at = daysAgo(one.days, 10, 0)
    if (one.undo !== undefined) await undoPriceBatch(site.id, batch.batch.id, actor, tx)
    const undone = one.undo === undefined ? null : daysAgo(one.days - one.undo, 10, 0)
    await tx
      .update(catPriceBatch)
      .set({ createdAt: at, ...(undone ? { undoneAt: undone } : {}) })
      .where(eq(catPriceBatch.id, batch.batch.id))
  }
  const halls = await listPlaces(site.id, tx)
  for (const one of history.floor?.recounts ?? []) {
    const hall = halls[one.hall - 1]
    if (!hall) throw new Error(`${site.slug}: a recount in hall ${one.hall}, and there is none`)
    const { rows } = await recountSheet(site.id, { placeId: String(hall.id) }, tx)
    const lines = one.lines.map((line) => {
      const variant = variantOf({ item: line.item, pick: line.pick })
      const onBooks = rows.find((row) => row.variantId === variant.id)?.stock ?? 0
      return { variantId: String(variant.id), counted: Math.max(0, onBooks + line.delta) }
    })
    const before = await lastId(stkMove, tx)
    await recount(site.id, actor, { placeId: String(hall.id), lines }, tx)
    const at = daysAgo(one.days, 19, 0)
    await tx
      .update(stkMove)
      .set({ createdAt: at, on: dayOfMoment(at) })
      .where(gt(stkMove.id, before))
  }

  return written

  // What the month sold, put back the day before it began selling it: sewn or bought.
  async function restock(month: string, sales: HistorySale[], when: Date) {
    const wanted = new Map<bigint, { qty: number; line: HistoryLine }>()
    for (const sale of sales.filter((one) => !one.sewn)) {
      for (const line of sale.lines.filter(isGoods)) {
        const variant = variantOf(line)
        // A thing of its own story comes on its own day: see `sell`.
        if (books!.things?.[variant.slug]) continue
        wanted.set(variant.id, { qty: (wanted.get(variant.id)?.qty ?? 0) + line.qty, line })
      }
    }
    const made = [...wanted].filter(([id]) => goods.find((one) => one.id === id)!.made)
    const bought = [...wanted].filter(([id]) => !goods.find((one) => one.id === id)!.made)
    if (made.length > 0)
      await sew(
        made.map(([variantId, one]) => ({ variantId, qty: one.qty })),
        when,
        null,
      )
    if (bought.length === 0) return
    if (!supplier) throw new Error(`${site.slug}: goods to buy back and no supplier in books.json`)
    // Every so many months the month's goods come from abroad, cheaper before what brings them.
    const imports = books!.imports
    const abroad = imports && importer && (monthIndex + 1) % imports.every === 0
    // A supplier's price drifts a little month to month: the average moves, as it does.
    const drift = 1 + (Number(month.slice(5)) % 3) * 0.01
    const arrival = await buy(
      abroad ? importer.id : supplier.id,
      bought.map(([variantId, one]) => {
        const variant = goods.find((row) => row.id === variantId)!
        const cost = abroad
          ? Math.round(sellingOf(variant, one.line, currency) * imports.cost)
          : unitCost(variant, one.line, books!, book)
        return {
          variantId,
          qty: one.qty,
          steps: variant.steps,
          price: Math.max(1, Math.round(cost * drift)),
        }
      }),
      when,
      month,
    )
    if (!abroad) return
    // The cargo and the customs, each laid onto the delivery the day it was paid.
    for (const laid of imports.laid) {
      const on = dayOfMoment(new Date(when.getTime() + laid.after * DAY))
      const amount = Math.round(arrival.total * laid.share)
      const charge = await createCharge(
        site.id,
        actor,
        {
          arrivalId: arrival.id,
          what: laid.what,
          amount,
          // The customs' VAT is taken back whole by a payer; before the books paid VAT it is a cost.
          vat: laid.vat && (await vatRateOn(orgId, on, currency, tx)) !== null ? amount : null,
          on,
          counterpart: { type: 'party', id: (await known(laid.party)).id },
          paidFrom: bank!.id,
        },
        tx,
      )
      await tx
        .update(stkMove)
        .set({
          createdAt: atHour(site.timezone, on, 15),
          on: dayOfMoment(atHour(site.timezone, on, 15)),
        })
        .where(and(eq(stkMove.sourceType, 'charge'), eq(stkMove.sourceId, charge.id)))
    }
  }

  // A paper from a supplier, received that morning and paid a fortnight later — the last still owed.
  async function buy(
    partyId: bigint,
    priced: { variantId: bigint; qty: number; steps: number; price: number }[],
    when: Date,
    series: string,
  ) {
    const on = dayOfMoment(when)
    // A supplier billing in its own money prices the goods in it at the day's rate.
    const paper = partyId === supplier?.id ? (books!.supplier?.currency ?? book) : book
    const rate = paper === book ? 1 : await rateOn(orgId, paper, on, tx)
    if (rate === null) throw new Error(`${site.slug}: no ${paper} rate on ${on}`)
    const lines = priced.map((line) => ({
      ...line,
      price:
        paper === book ? line.price : Math.max(1, toMinor(toMajor(line.price, book) / rate, paper)),
    }))
    const total = lines.reduce((sum, line) => sum + lineTotal(line.price, line.qty, line.steps), 0)
    // A supplier registered for VAT prints it within the paper's total, at the rate of that day.
    const vatRate =
      partyId === supplier?.id && books!.supplier?.vat
        ? await vatRateOn(orgId, on, currency, tx)
        : null
    const typed = (slip: number) => {
      const priced = lines.map((line, at) => ({
        ...line,
        price: at === 0 ? line.price * slip : line.price,
      }))
      const sum = priced.reduce((acc, line) => acc + lineTotal(line.price, line.qty, line.steps), 0)
      return createArrival(
        site.id,
        actor,
        {
          counterpart: { type: 'party', id: partyId },
          on,
          currency: paper,
          number: `${on.replaceAll('-', '').slice(2)}-${series.slice(5)}`,
          lines: priced.map(({ variantId, qty, price }) => ({ variantId, qty, price })),
          vat: vatRate === null ? null : vatOf(sum, vatRate),
        },
        tx,
      )
    }
    papers += 1
    /*
     * A paper typed with a price off by a slip of the finger, noticed within the hour, struck out with
     * its reason before a metre of it was used, and typed again: the goods leave the shelf at exactly
     * the price they came on at, so the average stands where it would have.
     */
    const misprinted = books!.mistakes?.arrival
    if (misprinted?.paper === papers) {
      const wrong = await typed(misprinted.factor)
      await voidArrival(site.id, wrong.id, actor, { reason: misprinted.reason }, tx)
      const noticed = new Date(when.getTime() + 40 * MINUTE)
      await tx.update(finArrival).set({ voidedAt: noticed }).where(eq(finArrival.id, wrong.id))
      await tx
        .update(finEntry)
        .set({ postedAt: when, voidedAt: noticed })
        .where(and(eq(finEntry.sourceType, 'arrival'), eq(finEntry.sourceId, wrong.id)))
      await tx
        .update(stkMove)
        .set({ createdAt: when, on: dayOfMoment(when) })
        .where(and(eq(stkMove.sourceType, 'arrival'), eq(stkMove.sourceId, wrong.id)))
    }
    const arrival = await typed(1)
    await tx
      .update(stkMove)
      .set({ createdAt: when, on: dayOfMoment(when) })
      .where(and(eq(stkMove.sourceType, 'arrival'), eq(stkMove.sourceId, arrival.id)))
    const paidAt = new Date(when.getTime() + 14 * DAY)
    if (paidAt.getTime() < Date.now() - DAY) {
      const paidOn = dayOfMoment(paidAt)
      let from = bank!
      if (paper !== book) {
        // The dollars are bought at the bank the day they are sent, at that day's rate: what the
        // som did between the paper and the payment is the books' exchange difference.
        from = places.find((one) => one.placeKind === 'bank' && one.currency === paper)!
        if (!from) throw new Error(`${site.slug}: a supplier in ${paper} and no account in it`)
        const then = await rateOn(orgId, paper, paidOn, tx)
        await createTransfer(
          orgId,
          actor,
          {
            fromPlaceId: bank!.id,
            toPlaceId: from.id,
            amount: toMinor(toMajor(total, paper) * then!, book),
            received: total,
            on: paidOn,
            note: `№${arrival.number}`,
          },
          tx,
        )
      }
      const pay = async () =>
        createMove(
          orgId,
          actor,
          {
            placeId: from.id,
            direction: 'out',
            accountId: (await accountByKey(orgId, 'payable', tx)).id,
            amount: total,
            counterpart: { type: 'party', id: partyId },
            on: paidOn,
            note: `№${arrival.number}`,
          },
          tx,
        )
      await pay()
      payments += 1
      // A payment typed twice, the second struck out the next morning when the bank showed one.
      const twice = books!.mistakes?.payment
      if (twice?.payment === payments) {
        const again = await pay()
        await voidEntry(orgId, again.id, actor, { reason: twice.reason }, tx)
        await tx
          .update(finEntry)
          .set({ postedAt: paidAt, voidedAt: new Date(paidAt.getTime() + DAY) })
          .where(eq(finEntry.id, again.id))
      }
    }
    return { id: arrival.id, total }
  }

  /*
   * Batches of what is sewn here: opened from the card, the cloth they take bought that morning,
   * the cutting given to the cutter and each batch's sewing to the next seamstress in turn, and
   * released — the piecework owed the moment the work is done.
   */
  async function sew(
    lines: { variantId: bigint; qty: number }[],
    when: Date,
    orderId: bigint | null,
  ) {
    const opened = []
    for (const line of lines) {
      opened.push(
        await createBatch(
          site.id,
          actor,
          { variantId: line.variantId, qty: line.qty, orderId },
          tx,
        ),
      )
    }
    if (orderId === null && cloth) {
      const spent = await tx
        .select({
          variantId: prdBatchMaterial.variantId,
          qty: sql<number>`sum(${prdBatchMaterial.planned})::int`,
          steps: catProduct.grain,
          // What the cloth cost at the last paper it came on, in the shelf's money.
          price: sql<number>`(select l.price from fin_arrival_line l where l.variant_id = ${prdBatchMaterial.variantId} order by l.id desc limit 1)`,
        })
        .from(prdBatchMaterial)
        .innerJoin(catVariant, eq(catVariant.id, prdBatchMaterial.variantId))
        .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
        .where(
          inArray(
            prdBatchMaterial.batchId,
            opened.map((one) => one.id),
          ),
        )
        .groupBy(prdBatchMaterial.variantId, catProduct.grain)
      await buy(
        cloth.id,
        spent.map((one) => ({ ...one, price: Number(one.price) })),
        new Date(when.getTime() - 2 * 60 * MINUTE),
        monthOfMoment(when),
      )
    }
    const cardOps = Object.values(books!.cards ?? {}).flatMap((one) => one.operations)
    for (const batch of opened) {
      // One person takes the batch through, and the one named for an operation does that operation.
      const turnOf = new Map<string, bigint>()
      const performer = (does: string) => {
        if (!turnOf.has(does)) turnOf.set(does, doer(does) ?? actor.userId)
        return turnOf.get(does)!
      }
      const materials = await tx
        .select({ id: prdBatchMaterial.id, used: prdBatchMaterial.used })
        .from(prdBatchMaterial)
        .where(eq(prdBatchMaterial.batchId, batch.id))
      const work = await tx.select().from(prdBatchWork).where(eq(prdBatchWork.batchId, batch.id))
      await editBatch(
        site.id,
        batch.id,
        {
          materials,
          work: work.map((one) => ({
            from: String(one.id),
            pieces: one.pieces,
            performerUserId: performer(cardOps.find((op) => op.name === one.name)?.by ?? 'sewing'),
          })),
        },
        tx,
      )
      const [beforeMove] = await Promise.all([lastId(stkMove, tx)])
      const madeAt = new Date(when.getTime() + 8 * 60 * MINUTE)
      const [{ timezone }] = (await tx
        .select({ timezone: org.timezone })
        .from(org)
        .where(eq(org.id, site.orgId))) as [{ timezone: string }]
      // Released on the day it was made, by the service's own word: the books stand on that day.
      await releaseBatch(site.id, batch.id, actor, { on: dayInZone(timezone, madeAt) }, tx)
      await tx
        .update(prdBatch)
        .set({ createdAt: when, releasedAt: madeAt })
        .where(eq(prdBatch.id, batch.id))
      await tx
        .update(stkMove)
        .set({ createdAt: madeAt, on: dayOfMoment(madeAt) })
        .where(gt(stkMove.id, beforeMove))
    }
  }

  /*
   * A SALE IN THE HALL, through the hall's own door: the point named, the shelf of that point, the
   * rules and the ladder the till applies, a certificate where one pays a part, the money taken whole
   * — and, where the script says so, the size changed a few days later at the same counter. Every
   * row of it dated as the sale was, the moves of the warehouse with it.
   */
  async function inHall(
    sale: HistorySale,
    seller: Actor,
    placedAt: Date,
    sold: HistoryLine[],
    beforeEvent: bigint,
    beforeMove: bigint,
    beforeNotice: bigint,
  ) {
    const hall = (await listPlaces(site.id, tx))[sale.hall! - 1]
    if (!hall)
      throw new Error(`${site.slug}: history sells in hall ${sale.hall}, and there is none`)
    const into = sale.paid === 'cash' ? till! : sale.paid === 'card' ? terminal : inbound
    if (!into) throw new Error(`${site.slug}: paid by ${sale.paid} and no place for it`)
    const items = sold.map((line) => ({
      variantId: String(variantOf(line).id),
      qty: line.qty,
      ...(line.price === undefined ? {} : { price: toMinor(line.price, currency) }),
    }))
    const beforePayment = await lastId(ordPayment, tx)
    const certificates = []
    if (sale.certificate) {
      const bought = await sellCertificate(
        site.id,
        seller,
        {
          amount: toMinor(sale.certificate.amount, currency),
          placeId: String(till!.id),
          on: dayInZone(site.timezone, new Date(placedAt.getTime() - sale.certificate.days * DAY)),
        },
        { scope: 'seed', key: randomUUID(), said: 'certificate' },
        tx,
      )
      certificates.push({ code: bought.code, amount: bought.amount })
    }
    const order = await sellAtCounter(
      site.id,
      seller,
      {
        items,
        ...(sale.person ? { contactId: String(await cardOf(sale.person)) } : {}),
        placeId: String(hall.id),
        payments: [{ placeId: String(into.id) }],
        certificates,
        ...(sale.instalment
          ? {
              instalment: {
                key: (await programNamed(sale.instalment.program)).key,
                risk: sale.instalment.risk ?? false,
              },
            }
          : {}),
      },
      tx,
    )
    const stamp = async (id: bigint, at: Date, since: bigint, moves: bigint) => {
      const events = await tx
        .select({ id: ordEvent.id })
        .from(ordEvent)
        .where(and(eq(ordEvent.orderId, id), gt(ordEvent.id, since)))
        .orderBy(asc(ordEvent.id))
      for (const [index, event] of events.entries())
        await tx
          .update(ordEvent)
          .set({ createdAt: new Date(at.getTime() + index * MINUTE) })
          .where(eq(ordEvent.id, event.id))
      await tx
        .update(stkMove)
        .set({ createdAt: at, on: dayOfMoment(at) })
        .where(
          and(eq(stkMove.sourceType, 'order'), eq(stkMove.sourceId, id), gt(stkMove.id, moves)),
        )
      await tx
        .update(ordPayment)
        .set({ createdAt: at, on: dayInZone(site.timezone, at) })
        .where(and(eq(ordPayment.orderId, id), gt(ordPayment.id, beforePayment)))
      await tx
        .update(ordOrder)
        .set({ createdAt: at, updatedAt: at, agreedAt: at })
        .where(eq(ordOrder.id, id))
    }
    await stamp(order.id, placedAt, beforeEvent, beforeMove)
    await ageNotices(beforeNotice, placedAt, tx)
    if (sale.instalment) {
      await liveSchedule(order.id, placedAt, sale, seller)
      await afterInstalment(order.id, placedAt, sale, seller)
    }
    if (!sale.exchange) return
    // The same card in another size, at the price the first was bought at, at the same counter.
    const changedAt = new Date(placedAt.getTime() + sale.exchange.after * DAY)
    if (changedAt.getTime() > Date.now() - DAY) return
    const first = sold[0]!
    const [line] = (await orderItems(order.id, tx)).filter(
      (row) => row.itemType === 'variant' && row.itemId === variantOf(first).id,
    )
    const [sinceEvent, sinceMove] = await Promise.all([lastId(ordEvent, tx), lastId(stkMove, tx)])
    const next = await exchangeAtCounter(
      site.id,
      order.id,
      seller,
      {
        back: [{ id: String(line!.id), qty: 1, fit: true }],
        items: [
          { variantId: String(variantOf({ ...first, pick: sale.exchange.pick }).id), qty: 1 },
        ],
        placeId: String(hall.id),
        cause: 'size',
      },
      tx as Transaction,
    )
    await stamp(order.id, changedAt, sinceEvent, sinceMove)
    await stamp(next.id, changedAt, sinceEvent, sinceMove)
  }

  async function sell(sale: HistorySale) {
    const placedAt = daysAgo(sale.days, sale.at[0], sale.at[1])
    const sold = sale.lines.filter(isGoods)
    const works = sale.lines.filter((line): line is HistoryWork => !isGoods(line))
    /*
     * A thing with a story of its own came on its day, with all that was put into it since, and
     * stood on the site until it was sold: its card is shown for the deal and taken off once the
     * thing has left, as a dealer takes a sold car off.
     */
    const things: bigint[] = []
    for (const line of sold) {
      const variant = variantOf(line)
      if (!books!.things?.[variant.slug]) continue
      await receiveThing(site.id, books!, variant.slug, variant.id, bank!.id, actor, tx)
      things.push(variant.productId)
    }
    const shown = async (visible: boolean) => {
      if (things.length === 0) return
      await bulkProducts(site.id, actor, { ids: things, action: { kind: 'visible', visible } }, tx)
    }
    await shown(true)
    const seller = runner(sale.by)
    const [beforeEvent, beforeMove, beforeNotice] = await Promise.all([
      lastId(ordEvent, tx),
      lastId(stkMove, tx),
      lastId(ntfNotice, tx),
    ])
    if (sale.hall) {
      await inHall(sale, seller, placedAt, sold, beforeEvent, beforeMove, beforeNotice)
      await shown(false)
      return
    }
    const order = await raiseForContact(
      site.id,
      sale.org ? await orgCard(sale.org) : await cardOf(sale.person),
      seller,
      {
        items: [
          ...sold.map((line) => ({
            variantId: String(variantOf(line).id),
            qty: line.qty,
            price: line.price === undefined ? null : toMinor(line.price, currency),
          })),
          ...works.map((line) => ({
            serviceId: String(serviceOf(line.service)),
            qty: line.qty,
            price: line.price === undefined ? null : toMinor(line.price, currency),
          })),
        ],
        agreed: true,
        payWay: sale.paid === 'transfer' ? 'transfer' : 'cash',
      },
      tx,
    )
    let deposit = 0
    let placedThrough = await lastId(ordEvent, tx)
    if (sale.instalment) {
      // Arranged at the counter from the buyer's answers, and said yes to by the giver's desk — or,
      // the shop's own, given at once, unless it waits for a person to decide.
      const given = await arrange(order.id, seller, sale)
      placedThrough = await lastId(ordEvent, tx)
      if (!given) {
        // Waiting for a person: nothing is paid and nothing leaves, and the order stands as it was born.
        const events = await tx
          .select({ id: ordEvent.id })
          .from(ordEvent)
          .where(and(eq(ordEvent.orderId, order.id), gt(ordEvent.id, beforeEvent)))
          .orderBy(asc(ordEvent.id))
        for (const [index, event] of events.entries())
          await tx
            .update(ordEvent)
            .set({ createdAt: new Date(placedAt.getTime() + index * MINUTE) })
            .where(eq(ordEvent.id, event.id))
        await tx
          .update(ordOrder)
          .set({ createdAt: placedAt, updatedAt: placedAt, agreedAt: placedAt })
          .where(eq(ordOrder.id, order.id))
        await tx
          .update(insApplication)
          .set({ createdAt: placedAt })
          .where(eq(insApplication.orderId, order.id))
        await ageNotices(beforeNotice, placedAt, tx)
        await shown(false)
        return
      }
    } else if (!sale.org) {
      if (order.payment === 'none') {
        throw new Error(
          `${site.slug}: history sells at a counter that asks for no money — name a way of paying in its order terms or drop history.json`,
        )
      }
      const into = sale.paid === 'cash' ? till! : sale.paid === 'card' ? terminal : inbound
      if (!into) throw new Error(`${site.slug}: paid by ${sale.paid} and no place for it`)
      // Paid first and handed over after, as at any counter — and an order with a deposit leaves
      // no other way. A deposit is the day's; the rest comes with the thing handed over.
      deposit = sale.deposit === undefined ? 0 : toMinor(sale.deposit, currency)
      if (deposit > 0) {
        await confirmPayment(site.id, order.id, seller, { amount: deposit, placeId: into.id }, tx)
      }
      placedThrough = deposit > 0 ? await lastId(ordEvent, tx) : placedThrough
      await confirmPayment(
        site.id,
        order.id,
        seller,
        { amount: order.total - deposit, placeId: into.id },
        tx,
      )
    }
    // Sewn to the order: the batch names it, and what comes off the machines goes out in it.
    if (sale.sewn) {
      await sew(
        sold.map((line) => ({ variantId: variantOf(line).id, qty: line.qty })),
        placedAt,
        order.id,
      )
    }
    const held = (await orderItems(order.id, tx)).filter((row) => row.itemType !== 'service')
    if (held.length > 0) {
      await shipOrder(
        site.id,
        order.id,
        seller,
        { lines: held.map((row) => ({ id: String(row.id), shipped: row.shipped + row.held })) },
        tx,
      )
    }
    for (const line of await orderItems(order.id, tx)) {
      if (line.itemType === 'service' && line.doneAt === null)
        await renderService(await getOrder(site.id, order.id, tx), line.id, seller, tx)
    }
    if ((await getOrder(site.id, order.id, tx)).status !== 'done')
      await changeStatus(
        site.id,
        order.id,
        seller,
        { status: 'done', comment: null, close: 'ship' },
        tx,
      )
    // The master's share of the work, owed to them the day it is done.
    if (sale.work) {
      const master = staff.find((row) => row.name === sale.work!.by)
      if (!master) throw new Error(`${site.slug}: «${sale.work.by}» is not on the staff`)
      await addCostWork(
        site.id,
        order.id,
        seller,
        // said as a person says it, kept in hundredths as every percent of an order is
        { personUserId: master.userId, percent: Math.round(sale.work.percent * 100) },
        tx,
      )
    }
    await shown(false)

    // A counter sale is a few minutes long: each row of it a minute after the one before; a sewn
    // one leaves when its batch is done, the same evening; a thing left on a deposit, on the day
    // it is handed over.
    const leaves = sale.handed
      ? new Date(placedAt.getTime() + sale.handed * DAY)
      : sale.sewn
        ? new Date(placedAt.getTime() + 9 * 60 * MINUTE)
        : placedAt
    const events = await tx
      .select({ id: ordEvent.id })
      .from(ordEvent)
      .where(and(eq(ordEvent.orderId, order.id), gt(ordEvent.id, beforeEvent)))
      .orderBy(asc(ordEvent.id))
    for (const [index, event] of events.entries()) {
      const placed = index === 0 || event.id <= placedThrough
      await tx
        .update(ordEvent)
        .set({ createdAt: new Date((placed ? placedAt : leaves).getTime() + index * MINUTE) })
        .where(eq(ordEvent.id, event.id))
    }
    const done = new Date(leaves.getTime() + events.length * MINUTE)
    await tx
      .update(stkMove)
      .set({ createdAt: leaves, on: dayOfMoment(leaves) })
      .where(
        and(
          eq(stkMove.sourceType, 'order'),
          eq(stkMove.sourceId, order.id),
          gt(stkMove.id, beforeMove),
        ),
      )
    await tx.update(ordCost).set({ createdAt: done }).where(eq(ordCost.orderId, order.id))
    await tx
      .update(ordOrder)
      .set({ createdAt: placedAt, updatedAt: done, agreedAt: placedAt })
      .where(eq(ordOrder.id, order.id))
    await ageNotices(beforeNotice, done, tx)

    // The money taken at the till is dated like the sale; the books follow `ord_payment.on`.
    await tx
      .update(ordPayment)
      .set({ createdAt: placedAt, on: dayInZone(site.timezone, placedAt) })
      .where(eq(ordPayment.orderId, order.id))

    // What comes after the deal: an organization's transfer by its term, a giver's buyout.
    if (sale.org) {
      const paidAt = new Date(done.getTime() + (sale.paidAfter ?? 14) * DAY)
      if (paidAt.getTime() > Date.now() - DAY) return
      if (!inbound)
        throw new Error(`${site.slug}: an account paid and no bank account in ${currency}`)
      const before = await lastId(ordEvent, tx)
      const beforePayment = await lastId(ordPayment, tx)
      await confirmPayment(
        site.id,
        order.id,
        actor,
        { amount: order.total, placeId: inbound.id },
        tx,
      )
      await tx
        .update(ordEvent)
        .set({ createdAt: paidAt })
        .where(and(eq(ordEvent.orderId, order.id), gt(ordEvent.id, before)))
      await tx
        .update(ordPayment)
        .set({ createdAt: paidAt, on: dayInZone(site.timezone, paidAt) })
        .where(and(eq(ordPayment.orderId, order.id), gt(ordPayment.id, beforePayment)))
    }
    await liveSchedule(order.id, placedAt, sale, seller)
    if (sale.instalment) {
      await afterInstalment(order.id, placedAt, sale, seller)
      await boughtOut(order.id, placedAt)
    }
  }

  // An organization's card on this site — the one its account and its terms stand on.
  async function orgCard(name: string) {
    const [buyer] = await tx
      .select()
      .from(org)
      .where(and(eq(org.name, name), isNull(org.deletedAt)))
      .limit(1)
    if (!buyer) throw new Error(`${site.slug}: no organization «${name}»`)
    return (await linkOrgContact(site.id, buyer, tx)).id
  }

  function serviceOf(slug: string) {
    const found = services.find((one) => one.slug === slug)
    if (!found) throw new Error(`${site.slug}: history names no service «${slug}»`)
    return found.id
  }

  // A programme of the demo by the name its card shows in Russian.
  async function programNamed(name: string) {
    const [program] = await tx
      .select()
      .from(insProgram)
      .where(and(sql`${insProgram.name}->>'ru' = ${name}`, isNull(insProgram.deletedAt)))
      .limit(1)
    if (!program) throw new Error(`${site.slug}: no programme «${name}»`)
    return program
  }

  // Where the buyer's money lands when it is the SHOP's: the place the sale says it was paid into.
  function intoOf(sale: HistorySale) {
    const into = sale.paid === 'cash' ? till! : sale.paid === 'card' ? terminal : inbound
    if (!into) throw new Error(`${site.slug}: paid by ${sale.paid} and no place for it`)
    return into
  }

  /*
   * Instalments at the counter. A giver's programme: the buyer's answers taken, and the giver's
   * underwriter saying yes — after which the thing may leave, and the giver owes the shop for it.
   * The shop's own: given at once with no answers, its first payment taken into the shop's own place
   * — unless the counter held it for a person to decide (the buyer late with the shop, or past its
   * ceiling), and then nothing more happens: false.
   */
  async function arrange(orderId: bigint, seller: Actor, sale: HistorySale): Promise<boolean> {
    const instalment = sale.instalment!
    const program = await programNamed(instalment.program)
    await arrangeAtCounter(
      site.id,
      orderId,
      seller,
      { key: program.key, application: instalment.answers ?? {}, risk: instalment.risk ?? false },
      tx,
    )
    const application = await applicationOfOrder(orderId, tx)
    if (!application) throw new Error(`${site.slug}: the counter opened no application`)
    const own = program.orgId === site.orgId
    if (own && application.status === 'waiting' && program.questions.length === 0) return false
    if (own) {
      if (application.status !== 'approved')
        throw new Error(`${site.slug}: the shop's own programme was not given at once`)
      const first = downAwaited(await scheduleOf(await getOrder(site.id, orderId, tx), tx))
      if (first > 0)
        await confirmPayment(
          site.id,
          orderId,
          seller,
          { amount: first, placeId: intoOf(sale).id },
          tx,
        )
      return true
    }
    const desk = (await listOrgStaffMembers(asOrgId(program.orgId), tx)).find((member) =>
      member.roles.includes('underwriter'),
    )
    if (!desk) throw new Error(`${site.slug}: nobody answers the giver's applications`)
    const underwriter = {
      userId: desk.staff.userId,
      activeRole: 'underwriter' as const,
      viaOrgId: null,
    }
    // The giver's yes names the order's sum its desk was shown.
    const shown = await getOrder(site.id, orderId, tx)
    await decide(
      asOrgId(program.orgId),
      application.id,
      underwriter,
      { act: 'approve', total: shown.total },
      tx,
    )
    // The first payment is the giver's money: the buyer pays it at the counter and the giver's desk
    // says it came, into the giver's own place, before the thing may leave.
    const first = downAwaited(await scheduleOf(await getOrder(site.id, orderId, tx), tx))
    if (first > 0)
      await confirmPayment(site.id, orderId, underwriter, { amount: first }, tx, 'giver')
    return true
  }

  /*
   * The schedule is born on the day of the run; the sale was made earlier. It moves back with the
   * sale — a deposit's day as well as a giver's months — and the months that have passed since are lived the way a buyer lives them: each paid on
   * its day through the giver's desk — except, on every third contract, the latest, which stands
   * late so the giver's list has something overdue on it.
   */
  async function liveSchedule(orderId: bigint, placedAt: Date, sale: HistorySale, seller: Actor) {
    const dues = await tx
      .select()
      .from(insDue)
      .where(eq(insDue.orderId, orderId))
      .orderBy(asc(insDue.n))
    if (!dues[0]?.dueOn) return
    // The schedule's own rule (`monthsAfter`, the one `instalmentSchedule` reads): the same day of
    // each month after the day of the sale, clamped to a month's end — never a constant number of
    // days added, which lands the second month and those after it beside the day the platform keeps.
    const saleDay = dayInZone(site.timezone, placedAt)
    for (const due of dues) {
      if (!due.dueOn) continue
      await tx
        .update(insDue)
        .set({ dueOn: monthsAfter(saleDay, due.n) })
        .where(eq(insDue.id, due.id))
    }
    const today = dayInZone(site.timezone, new Date())
    const passed = dues.flatMap((due) => {
      const on = due.n > 0 && due.dueOn ? monthsAfter(saleDay, due.n) : null
      return on && on < today ? [{ amount: due.amount, on }] : []
    })
    const application = await applicationOfOrder(orderId, tx)
    if (!application) return
    // How many of the latest months stand unpaid: as the history says, else every third contract its
    // latest, so the list has something overdue on it.
    const unpaid = sale.instalment?.unpaid ?? (Number(orderId % 3n) === 0 ? 1 : 0)
    const paying = passed.slice(0, Math.max(0, passed.length - unpaid))
    if (paying.length === 0) return
    // The shop's own instalments are paid to the shop, into its own place; a giver's, to the giver.
    const own = application.orgId === site.orgId
    const desk = own
      ? null
      : (await listOrgStaffMembers(asOrgId(application.orgId), tx)).find((member) =>
          member.roles.includes('underwriter'),
        )
    if (!own && !desk) return
    const taker = desk
      ? { userId: desk.staff.userId, activeRole: 'underwriter' as const, viaOrgId: null }
      : seller
    for (const month of paying) {
      const before = await lastId(ordPayment, tx)
      if (own)
        await confirmPayment(
          site.id,
          orderId,
          taker,
          { amount: month.amount, placeId: intoOf(sale).id },
          tx,
        )
      else await confirmPayment(site.id, orderId, taker, { amount: month.amount }, tx, 'giver')
      const at = new Date(`${month.on}T12:00:00Z`)
      await tx
        .update(ordPayment)
        .set({ createdAt: at, on: month.on })
        .where(and(eq(ordPayment.orderId, orderId), gt(ordPayment.id, before)))
    }
  }

  /*
   * What became of a contract of the shop's own after the sale, each act on its day: paid off early,
   * given up on, the thing taken back for want of payment, or brought back as any return. The rows
   * the act writes are dated by it; the books it posts stand on the day of the run.
   */
  async function afterInstalment(
    orderId: bigint,
    placedAt: Date,
    sale: HistorySale,
    seller: Actor,
  ) {
    const said = sale.instalment!
    const act = async (after: number, run: () => Promise<unknown>) => {
      const at = new Date(placedAt.getTime() + after * DAY)
      if (at.getTime() > Date.now() - DAY) return
      const [event, payment, move] = await Promise.all([
        lastId(ordEvent, tx),
        lastId(ordPayment, tx),
        lastId(stkMove, tx),
      ])
      await run()
      await tx
        .update(ordEvent)
        .set({ createdAt: at })
        .where(and(eq(ordEvent.orderId, orderId), gt(ordEvent.id, event)))
      await tx
        .update(ordPayment)
        .set({ createdAt: at, on: dayInZone(site.timezone, at) })
        .where(and(eq(ordPayment.orderId, orderId), gt(ordPayment.id, payment)))
      await tx
        .update(stkMove)
        .set({ createdAt: at, on: dayOfMoment(at) })
        .where(
          and(eq(stkMove.sourceType, 'order'), eq(stkMove.sourceId, orderId), gt(stkMove.id, move)),
        )
    }
    // Every thing of the order that left, as the return names it.
    const back = async (fit: boolean, reason: string | null) =>
      (await orderItems(orderId, tx))
        .filter((row) => row.itemType === 'variant' && row.shipped - row.returned > 0)
        .map((row) => ({ id: String(row.id), qty: row.shipped - row.returned, fit, reason }))
    if (said.early !== undefined)
      await act(said.early, async () => {
        const order = await getOrder(site.id, orderId, tx)
        const left = owedNow({ ...order, settled: await settledOf(orderId, tx) })
        if (left > 0)
          await confirmPayment(
            site.id,
            orderId,
            seller,
            { amount: left, placeId: intoOf(sale).id },
            tx,
          )
      })
    if (said.writeOff)
      await act(said.writeOff.after, () =>
        writeOffOrder(site.id, orderId, seller, { reason: said.writeOff!.reason }, tx),
      )
    if (said.repossess)
      await act(said.repossess.after, async () =>
        repossess(
          site.id,
          orderId,
          seller,
          {
            lines: await back(true, null),
            keep: toMinor(said.repossess!.keep, currency),
            reason: said.repossess!.reason,
          },
          tx,
        ),
      )
    if (said.back)
      await act(said.back.after, async () =>
        receiveReturn(
          site.id,
          orderId,
          seller,
          { lines: await back(true, null), cause: 'mind' },
          tx,
        ),
      )
  }

  // The giver pays the shop what it owes for the order by the days the partnership names.
  async function boughtOut(orderId: bigint, placedAt: Date) {
    const application = await applicationOfOrder(orderId, tx)
    if (!application) return
    const owed = await tx
      .select()
      .from(stlEntry)
      .where(and(eq(stlEntry.sourceType, 'order_buyout'), eq(stlEntry.sourceId, orderId)))
    // The term runs from the sale's day: `followSettlementDays` moves `due_on` with `on`.
    for (const row of owed) {
      await tx.update(stlEntry).set({ createdAt: placedAt }).where(eq(stlEntry.id, row.id))
    }
    const amount = owed.reduce((sum, row) => sum + row.amount, 0)
    const paidAt = new Date(placedAt.getTime() + (application.buyoutDays ?? 10) * DAY)
    if (amount <= 0 || paidAt.getTime() > Date.now() - DAY) return
    const giver = asOrgId(application.orgId)
    // Both halves are dated the day the money moved, by the door that writes them.
    const paidOn = dayInZone(site.timezone, paidAt)
    // The giver says «we sent» before the shop says «it came»: its books owe nothing afterwards.
    const owner = (await listOrgStaffMembers(giver, tx)).find((member) =>
      member.roles.includes('owner'),
    )
    if (!owner) throw new Error(`${site.slug}: the giver has no owner to say «we sent»`)
    const send = await sendPayment(
      giver,
      orgId,
      { userId: owner.staff.userId, activeRole: 'owner', viaOrgId: null },
      {
        currency,
        amount,
        on: paidOn,
        comment: `№${(await getOrder(site.id, orderId, tx)).number}`,
      },
      tx,
    )
    const row = await recordPayment(
      orgId,
      giver,
      actor,
      {
        currency,
        amount,
        basis: 'buyout',
        sendId: send.id,
        on: paidOn,
        comment: `№${(await getOrder(site.id, orderId, tx)).number}`,
      },
      tx,
    )
    await tx.update(stlEntry).set({ createdAt: paidAt }).where(eq(stlEntry.id, row.id))
  }

  async function carryTakings(when: Date) {
    const on = dayOfMoment(when)
    // The terminal's month reaches the account less the share the bank keeps on the way.
    if (terminal) {
      const amount = await balanceOf(terminal.id, tx)
      if (amount > 0) {
        await createTransfer(
          orgId,
          actor,
          {
            fromPlaceId: terminal.id,
            toPlaceId: (inbound ?? bank)!.id,
            amount,
            fee: Math.round(amount * (books!.acquiring ?? 0)),
            on,
            note: terminal.name,
          },
          tx,
        )
      }
    }
    const amount = (await balanceOf(till!.id, tx)) - toMinor(books!.float ?? 0, currency)
    if (amount <= 0) return
    const rate = await rateOn(orgId, currency, on, tx)
    if (rate === null) throw new Error(`${site.slug}: no rate for ${currency} on ${on}`)
    /*
     * A till somebody keeps is handed over by them, through their own door — which writes today, so
     * the day is set back to the one the takings went to the bank, as every moment of the history is.
     */
    const keeper = (books!.people ?? []).find((one) => one.keeps)
    if (keeper && currency === book) {
      const cashier = staff.find((row) => row.name === keeper.name)
      if (!cashier)
        throw new Error(`${site.slug}: «${keeper.name}» keeps the till and is not on the staff`)
      const handed = await tillHand(
        orgId,
        { userId: cashier.userId, activeRole: 'cashier', viaOrgId: null },
        { fromPlaceId: till!.id, toPlaceId: bank!.id, amount, note: books!.takings ?? null },
        tx as Transaction,
      )
      await tx.update(finEntry).set({ on }).where(eq(finEntry.id, handed.id))
      return
    }
    if (currency === book) {
      await createTransfer(
        orgId,
        actor,
        { fromPlaceId: till!.id, toPlaceId: bank!.id, amount, on, note: books!.takings ?? null },
        tx,
      )
      return
    }
    // Takings in another money than the books' go to the account of that money, and leave it
    // for the books' bank by an exchange of their own, at the demo's rate.
    if (!inbound)
      throw new Error(`${site.slug}: takings in ${currency} and no bank account for them`)
    await createTransfer(
      orgId,
      actor,
      { fromPlaceId: till!.id, toPlaceId: inbound.id, amount, on, note: books!.takings ?? null },
      tx,
    )
    await createTransfer(
      orgId,
      actor,
      {
        fromPlaceId: inbound.id,
        toPlaceId: bank!.id,
        amount,
        received: toMinor(toMajor(amount, currency) * rate, book),
        on,
        note: books!.takings ?? null,
      },
      tx,
    )
  }
}

/*
 * Every month since the books opened, as the demo's books say it is lived: its bills on their
 * day, and — once the month has ended — its payroll, its people paid on the payday, its tax
 * accrued and paid by its day. Nothing is written on a day that has not come.
 */
export async function liveMonths(slugs: readonly string[]): Promise<number> {
  let lived = 0
  for (const slug of slugs) {
    const books = await loadBooks(slug)
    if (!books || !(books.monthly || books.people || books.taxes || books.recurring)) continue
    lived += await db.transaction((tx) => liveThrough(slug, books, tx))
  }
  return lived
}

async function liveThrough(slug: string, books: DemoBooks, tx: Db | Transaction): Promise<number> {
  const [site] = await tx.select().from(orgSite).where(eq(orgSite.slug, slug)).limit(1)
  if (!site) return 0
  const orgId = asOrgId(site.orgId)
  // The months are the legal entity's: billed and paid in the books' money, whatever the site sells in.
  const currency = await bookCurrency(orgId, tx)
  const actor = await actorOf(site, 'owner', tx)
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
  if (!bank) throw new Error(`${slug}: the months need a bank account`)
  const into = bank.id
  const known = (name: string) => partyKnown(orgId, name, tx)
  // The month's figures are read off its documents' days: the sales and the batches above go
  // onto theirs before anything counts a month.
  await followDays(tx)
  const today = dayInZone(site.timezone, new Date())
  const yesterday = dayInZone(site.timezone, new Date(Date.now() - DAY))
  const opening = openingDay(books, site.timezone)
  // A tax on profit is counted after the month's other taxes, so it is accrued last.
  const taxes = (await tx.select().from(finTax).where(eq(finTax.orgId, orgId))).sort(
    (a, b) => Number(a.kind === 'profit') - Number(b.kind === 'profit'),
  )
  const payrolls: bigint[] = []
  const accruals: bigint[] = []
  for (let month = opening.slice(0, 7); month <= today.slice(0, 7); month = monthAfter(month)) {
    for (const [index, one] of (books.monthly ?? []).entries()) {
      const on = dayOfMonth(month, one.day)
      if (on < opening || on > yesterday) continue
      const party = await known(one.party.name)
      const account =
        'key' in one.account
          ? await accountByKey(orgId, one.account.key, tx)
          : (
              await tx
                .select()
                .from(finAccount)
                .where(
                  and(
                    eq(finAccount.orgId, orgId),
                    eq(finAccount.name, one.account.name),
                    isNull(finAccount.deletedAt),
                  ),
                )
                .limit(1)
            )[0]!
      // A bill that strays from month to month — the power a cold month burns — by a fixed
      // pattern, so a run is the same as the one before it.
      const swing = 1 + (one.swing ?? 0) * Math.sin(Number(month.slice(5)) * 1.7 + index)
      const amount = toMinor(Math.round(one.amount * swing), currency)
      await createBill(
        orgId,
        actor,
        {
          side: 'to_us',
          accountId: account.id,
          counterpart: { type: 'party', id: party.id },
          amount,
          currency,
          on,
          note: `${one.note} · ${month}`,
          number: `${month.replace('-', '')}`,
        },
        tx,
      )
      const paidOn = dayOfMonth(month, one.pay)
      if (paidOn > yesterday) continue
      await createMove(
        orgId,
        actor,
        {
          placeId: into,
          direction: 'out',
          accountId: (await accountByKey(orgId, 'payable', tx)).id,
          amount,
          counterpart: { type: 'party', id: party.id },
          on: paidOn,
          note: `${one.note} · ${month}`,
        },
        tx,
      )
    }

    // The regular payments of the months before this one, each on its day: what the template
    // drafted and a person posted. This month's are left to the platform — see below.
    for (const one of books.recurring ?? []) {
      const on = dayOfMonth(month, one.day)
      if (on < opening || on > yesterday || month === today.slice(0, 7)) continue
      await createMove(
        orgId,
        actor,
        {
          placeId: into,
          direction: 'out',
          accountId: (await itemOf(orgId, one.account, tx)).id,
          amount: toMinor(one.amount, currency),
          counterpart: one.party ? { type: 'party', id: (await known(one.party.name)).id } : null,
          on,
          note: one.name,
        },
        tx,
      )
    }

    if (lastDayOf(month) >= today) continue
    const next = monthAfter(month)
    if ((books.people ?? []).length > 0) {
      const payroll = await buildPayroll(orgId, { month }, actor, tx)
      await postPayroll(orgId, payroll.id, actor, tx)
      payrolls.push(payroll.id)
      const payday = dayOfMonth(next, books.payday ?? 5)
      if (payday <= yesterday) await payPeople(month, payday)
    }
    for (const tax of taxes) {
      // A regime changed on the way: a rule is accrued only in the months it stands.
      if (month < tax.startsOn || (tax.endsOn !== null && month > tax.endsOn)) continue
      // A rule riding on pay was accrued with the payroll above; it is only paid.
      const accrual = isPayRule(tax.kind)
        ? null
        : await accrueTax(orgId, tax.id, actor, { month }, tx).catch((error) => {
            // A month that earned nothing owes nothing, and the door says so; a tax on profit owes
            // only at its period's end.
            if (error?.code === 'money.tax_nothing' || error?.code === 'money.tax_period')
              return null
            throw error
          })
      if (accrual) accruals.push(accrual.id)
      else if (!isPayRule(tax.kind)) continue
      // The platform's own answer for the day the month's tax falls due, not a copy of its rule.
      const due = dueOf(tax, (await termsOf([tax.id], tx)).get(tax.id) ?? [], month)
      if (due > yesterday) continue
      /*
       * What the rule's debt holds at the month's end is what is paid: for VAT that is what sales
       * owed less what suppliers and the customs billed, and a month that took back more than it
       * owed pays nothing and carries the rest into the next. The platform's month says it.
       */
      const owed =
        (await taxMonth(orgId, month, tx)).rows.find((row) => row.tax.id === tax.id)?.owedByEnd ?? 0
      if (owed <= 0) continue
      await payTax(orgId, tax.id, actor, { amount: owed, placeId: into, on: due, note: month }, tx)
    }
  }
  /*
   * This month's regular payments as the owner meets them: each template stands at its day of the
   * month again, and the platform's own morning work writes the drafts that have come and tells
   * whoever keeps the books — a person posts them, by hand.
   */
  if ((books.recurring ?? []).length > 0) {
    const templates = await tx
      .select()
      .from(finRecurring)
      .where(and(eq(finRecurring.orgId, orgId), isNull(finRecurring.endedAt)))
    for (const template of templates) {
      await tx
        .update(finRecurring)
        .set({ nextOn: dayOfMonth(today.slice(0, 7), template.day) })
        .where(eq(finRecurring.id, template.id))
    }
    await runDue(orgId, tx as Transaction)
  }
  /*
   * What a keeper's count made owed a supplier — the pallets at an operator's warehouse — paid from
   * the bank a fortnight after, as every other delivery is: the count writes the bill, and nobody
   * but the history would ever pay it.
   */
  const counted = await tx
    .select({ id: finEntry.id, on: finEntry.on, note: finEntry.note })
    .from(finEntry)
    .where(
      and(
        eq(finEntry.orgId, orgId),
        eq(finEntry.sourceType, 'arrival'),
        eq(finEntry.kind, 'bill'),
        // Only a paper whose goods went to a keeper: every other this history pays as it types it.
        sql`exists (select 1 from stk_inbound i where i.source_type = 'arrival' and i.source_id = ${finEntry.sourceId})`,
        live(),
      ),
    )
  // What of each is still owed is the platform's own answer, after whatever was paid against the debt.
  const states = new Map(
    (await billStates(orgId, null, tx)).map((state) => [state.entry.id, state]),
  )
  for (const bill of counted) {
    const state = states.get(bill.id)
    const paidOn = dayOfMoment(new Date(Date.parse(bill.on) + 14 * DAY))
    if (!state || state.left <= 0 || paidOn > yesterday) continue
    await createMove(
      orgId,
      actor,
      {
        placeId: into,
        direction: 'out',
        accountId: (await accountByKey(orgId, 'payable', tx)).id,
        amount: state.left,
        counterpart: state.counterpart,
        on: paidOn,
        note: bill.note,
      },
      tx,
    )
  }
  if (books.statement) await readStatement()
  return payrolls.length + accruals.length

  /*
   * The bank's statement of the last ended month, as the bank would print it: every document of the
   * month on the account, and the lines only the bank knows. Read in through the very door a file is
   * — matched against the documents, posted by the rules, the rest left open for a person.
   */
  async function readStatement(): Promise<bigint> {
    const month = monthOf(previousMonthEnd(today))
    const moved = await tx
      .select({
        on: finEntry.on,
        note: finEntry.note,
        amount: sql<string>`sum(${finLine.amount})::bigint`,
        party: sql<
          string | null
        >`(select p.name from fin_line l join fin_party p on p.id = l.counterpart_id where l.entry_id = ${finEntry.id} and l.counterpart_type = 'party' limit 1)`,
      })
      .from(finLine)
      .innerJoin(finEntry, eq(finEntry.id, finLine.entryId))
      .where(
        and(
          eq(finLine.accountId, into),
          live(),
          sql`to_char(${finEntry.on}, 'YYYY-MM') = ${month}`,
        ),
      )
      .groupBy(finEntry.id)
      .orderBy(finEntry.on, finEntry.id)
    const day = (on: string) => on.split('-').reverse().join('.')
    const rows: SheetCell[][] = [
      ['Дата', 'Сумма', 'Назначение платежа', 'Контрагент'],
      ...moved
        .filter((one) => Number(one.amount) !== 0)
        .map((one) => [
          day(one.on),
          toMajor(Number(one.amount), currency),
          one.note ?? '',
          one.party ?? '',
        ]),
      ...books.statement!.map((one) => [
        day(dayOfMonth(month, one.day)),
        one.amount,
        one.text,
        one.counterparty ?? '',
      ]),
    ]
    const file = new File([writeWorkbook('Выписка', rows)], `Выписка ${month}.xlsx`)
    const read = await loadStatement(
      orgId,
      actor,
      {
        accountId: String(into),
        layout: { header: 0, on: 0, amount: 1, in: null, out: null, text: 2, counterparty: 3 },
        file,
        upload: await stageStatementFile(file),
      },
      tx as Transaction,
    )
    return read.statementId
  }

  // What each person had earned by the month's end and was not yet paid, paid on the payday — the
  // figure the platform's own month gives.
  async function payPeople(month: string, payday: string) {
    for (const one of (await payrollMonth(orgId, month, tx)).people) {
      if (one.owedByEnd <= 0) continue
      await payPerson(
        orgId,
        actor,
        { userId: one.userId, amount: one.owedByEnd, placeId: into, on: payday, note: month },
        tx,
      )
    }
  }
}

/** What one unit of a line cost: named by the demo, or its share of the selling price. */
function unitCost(
  variant: { slug: string; position: number; price: number | null },
  line: HistoryLine,
  books: DemoBooks,
  book: Currency,
): number {
  const named = books.costs?.[variant.slug]?.[variant.position]
  if (named !== undefined) return toMinor(named, book)
  return Math.round(sellingOf(variant, line, book) * (books.cost ?? 0))
}

/** What one unit was sold for: named by the script, else what the catalogue asks for it. */
function sellingOf(
  variant: { price: number | null },
  line: HistoryLine,
  currency: Currency,
): number {
  return line.price === undefined ? (variant.price ?? 0) : toMinor(line.price, currency)
}
