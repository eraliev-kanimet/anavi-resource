import { and, asc, db, eq, isNull, type Transaction } from '@anavi/backend/src/db'
import { ordEvent, ordOrder } from '@anavi/backend/src/db/schema/ord'
import { finEntry } from '@anavi/backend/src/db/schema/fin'
import {
  org,
  orgSite,
  orgStaff,
  orgStaffRole,
  type OrgSite,
} from '@anavi/backend/src/db/schema/org'
import { srvService } from '@anavi/backend/src/db/schema/srv'
import { asOrgId, asSiteId } from '@anavi/backend/src/db/ids'
import type { Actor } from '@anavi/backend/src/lib/actor'
import { assignContact, linkOrgContact } from '@anavi/backend/src/modules/crm/contact.service'
import { createStaffLogin } from '@anavi/backend/src/modules/staff/staff.service'
import { sayToSupport } from '@anavi/backend/src/modules/inbox/support.service'
import { sayWithFiles } from '@anavi/backend/src/modules/inbox/say.service'
import { createService } from '@anavi/backend/src/modules/service/service.service'
import { raiseForContact } from '@anavi/backend/src/modules/order/raise.service'
import { setCredit } from '@anavi/backend/src/modules/order/credit.service'
import { renderByDay } from '@anavi/backend/src/modules/order/done.service'
import { createRoutine } from '@anavi/backend/src/modules/order/routine.service'
import { addDays, monthsOn } from '@anavi/backend/src/lib/clock'
import { confirmPayment } from '@anavi/backend/src/modules/order/payment.service'
import { payPurchase } from '@anavi/backend/src/modules/order/purchase.service'
import { createPlace } from '@anavi/backend/src/modules/money/account.service'
import { platformSiteId } from '@anavi/backend/src/modules/platform/platform-site.service'
import { permissionsFor, toMinor, type Currency, type LocalizedLabel } from '@anavi/shared'
import { signUpOrganization } from '../lib/owner'
import { dayOfMoment } from '../lib/days'
import { resourceJson } from '../lib/resource'
import { actorOf } from '../links/keeping'
import { daysAgo, stampEvent } from './stamp'

interface RentScript {
  services: {
    slug: string
    name: LocalizedLabel
    summary: LocalizedLabel
    price: number
    /** the months one unit of it covers */
    termMonths: number
  }[]
  tenants: {
    org: string
    person: string
    email: string
    /** days after the work is done, and the ceiling in whole currency: the tenant is billed on account */
    terms: { days: number; limit: number }
    /** the account the tenant pays from, and what lay on it when the books began, in whole currency */
    bank: { name: string; opening: number }
    service: string
    /** how many days ago the first term began; every next bill is for the term after the one before */
    serves: number
    /** one bill a term, in order; `paid` is how many days ago the tenant paid it, null for a bill still owed */
    bills: { paid: number | null; say: string }[]
    /** a schedule bills the next term on the day after the last one billed */
    renews: boolean
  }[]
  /** a sales agent of Anavi's own, a seller by cards, and the tenants whose cards they answer for */
  agent: { login: string; name: string; keeps: string[] }
  /** what tenants wrote to the platform's support, and Anavi's answer where one was given */
  support: { org: string; says: string; answer?: string }[]
}

// A day of the calendar at an hour of the seed's clock, as `daysAgo` makes them.
const at = (day: string, hour: number, minute = 0) =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)

/*
 * ANAVI SELLS ITS RENT FROM ITS OWN SITE: a term of the platform is a service done by its day (`by_day`, `term_months`), billed to the
 * card of an organization that has no site yet, on the day the term begins (`serves`). The tenant reads and pays the bill with no site
 * and no buying switched on (`billRoutes`), the morning marks the term done on its day — Anavi's sale, the term of the debt, the
 * tenant's debt and its expense on services bought follow that mark, and nobody presses «received». One tenant pays a year ahead and
 * a schedule renews it; another pays by the month and owes its second, past its day: what «paid through» reads (`periodsOf`).
 */
export async function seedRent(tx: Transaction): Promise<number> {
  const script = await resourceJson<RentScript>('seed/sales/rent.json')
  const siteId = await platformSiteId(tx)
  if (siteId === null) throw new Error('rent: the platform names no site of its own')
  const [site] = await tx.select().from(orgSite).where(eq(orgSite.id, siteId)).limit(1)
  const sales = site as OrgSite
  const currency = sales.currency as Currency
  const owner: Actor = await actorOf(sales, 'owner', tx)
  const services = new Map<string, { id: bigint; termMonths: number }>()
  for (const one of script.services) {
    const [had] = await tx
      .select({ id: srvService.id })
      .from(srvService)
      .where(
        and(
          eq(srvService.siteId, siteId),
          eq(srvService.slug, one.slug),
          isNull(srvService.deletedAt),
        ),
      )
    const service =
      had ??
      (await createService(
        asSiteId(siteId),
        owner,
        {
          slug: one.slug,
          name: one.name,
          summary: one.summary,
          status: 'published',
          pricing: 'fixed',
          basis: 'job',
          byDay: true,
          termMonths: one.termMonths,
          price: toMinor(one.price, currency),
        },
        tx,
      ))
    services.set(one.slug, { id: service.id, termMonths: one.termMonths })
  }
  let billed = 0
  const dated: { orderId: bigint; billed: Date; done: Date; paid: Date | null }[] = []
  for (const one of script.tenants) {
    const service = services.get(one.service)
    if (!service) throw new Error(`rent: no service ${one.service}`)
    const { org, staff } = await signUpOrganization(
      { person: one.person, email: one.email, name: one.org },
      tx,
    )
    const card = await linkOrgContact(asSiteId(siteId), org, tx)
    await setCredit(
      asSiteId(siteId),
      card.id,
      owner,
      { days: one.terms.days, limit: toMinor(one.terms.limit, currency) },
      tx,
    )
    // The tenant's own word first, as a bill is paid: «we sent», and the seller's «it came».
    const buyer = { userId: staff.userId, activeRole: 'owner' as const, viaOrgId: null }
    const first = dayOfMoment(daysAgo(one.serves, 10, 0))
    // A business with no site keeps its money all the same: the account it pays from is its first place.
    const bank = await createPlace(
      asOrgId(org.id),
      buyer,
      {
        kind: 'bank',
        name: one.bank.name,
        currency: sales.currency,
        opening: toMinor(one.bank.opening, currency),
      },
      tx,
    )
    // What lay on the account stood there before the first bill came: a demo timestamp, past the service layer.
    await tx
      .update(finEntry)
      .set({ on: addDays(first, -1) })
      .where(and(eq(finEntry.orgId, org.id), eq(finEntry.kind, 'opening')))
    let serves = first
    for (const bill of one.bills) {
      const order = await raiseForContact(
        asSiteId(siteId),
        card.id,
        owner,
        { items: [{ serviceId: String(service.id), qty: 1 }], serves, comment: bill.say },
        tx,
      )
      if (bill.paid !== null) {
        await payPurchase(
          asOrgId(org.id),
          order.id,
          buyer,
          {
            amount: order.total,
            placeId: String(bank.id),
            on: dayOfMoment(daysAgo(bill.paid, 12, 0)),
          },
          tx,
        )
        await confirmPayment(
          asSiteId(siteId),
          order.id,
          owner,
          { amount: order.total, comment: bill.say },
          tx,
        )
      }
      billed += 1
      dated.push({
        orderId: order.id,
        billed: at(serves, 9, 30),
        done: at(serves, 10),
        paid: bill.paid === null ? null : daysAgo(bill.paid, 12, 0),
      })
      serves = monthsOn(serves, service.termMonths)
    }
    // The next term is billed by a schedule, on the day after the last one billed ends — a week ahead, as every schedule bears.
    if (one.renews)
      await createRoutine(
        asSiteId(siteId),
        card.id,
        owner,
        {
          lines: [{ serviceId: service.id, qty: 1, price: null }],
          everyMonths: service.termMonths,
          firstOn: serves,
        },
        tx,
      )
  }
  // Anavi's own sales agent, a seller by cards: whoever answers for a tenant's card answers its support too.
  const permitted = { ...owner, permissions: permissionsFor([owner.activeRole]) }
  const { staff: agent } = await createStaffLogin(
    asOrgId(sales.orgId),
    {
      login: script.agent.login,
      password: 'password',
      name: script.agent.name,
      roles: ['sales_rep'],
    },
    permitted,
    tx,
  )
  for (const name of script.agent.keeps) {
    const [tenant] = await tx.select().from(org).where(eq(org.name, name)).limit(1)
    const card = await linkOrgContact(asSiteId(siteId), tenant!, tx)
    await assignContact(asSiteId(siteId), card.id, owner, { userId: agent.userId }, tx)
  }
  // The morning of the platform's site: the terms that began are done.
  await renderByDay(asSiteId(siteId), tx)
  // The dates, past the service layer: each line of the journal by what it says — billed the morning the term began, done that
  // morning, paid on its day — so the passes that follow the journal set the mark and the money on those days.
  for (const one of dated) {
    const events = await tx
      .select({ id: ordEvent.id, kind: ordEvent.kind, paymentId: ordEvent.paymentId })
      .from(ordEvent)
      .where(eq(ordEvent.orderId, one.orderId))
      .orderBy(asc(ordEvent.id))
    for (const event of events)
      await stampEvent(
        event,
        event.kind === 'service'
          ? one.done
          : event.kind === 'payment' && one.paid
            ? one.paid
            : one.billed,
        tx,
      )
    await tx
      .update(ordOrder)
      // The last move the tenant's books stand on is the term beginning (`followDays` dates a purchase's bill by it); the money keeps
      // the day of its own sending.
      .set({ createdAt: one.billed, agreedAt: one.billed, updatedAt: one.done })
      .where(eq(ordOrder.id, one.orderId))
  }
  return billed
}

/*
 * THE PLATFORM'S SUPPORT: tenants write to Anavi from their own back office, and the one who answers for the card answers. After the
 * rent's transaction has committed — a line with files is written by its own door in a transaction of its own (`sayToSupport`).
 */
export async function seedSupport(): Promise<number> {
  const script = await resourceJson<RentScript>('seed/sales/rent.json')
  const siteId = await platformSiteId(db)
  if (siteId === null) return 0
  let said = 0
  for (const one of script.support) {
    const [tenant] = await db.select().from(org).where(eq(org.name, one.org)).limit(1)
    if (!tenant) throw new Error(`support: no organization «${one.org}»`)
    // The tenant's owner writes, as the one who signed it up.
    const [owner] = await db
      .select({ userId: orgStaff.userId })
      .from(orgStaff)
      .innerJoin(
        orgStaffRole,
        and(eq(orgStaffRole.staffId, orgStaff.id), eq(orgStaffRole.role, 'owner')),
      )
      .where(and(eq(orgStaff.orgId, tenant.id), isNull(orgStaff.deletedAt)))
      .limit(1)
    const actor = { userId: owner!.userId, activeRole: 'owner' as const, viaOrgId: null }
    const thread = await sayToSupport(
      asOrgId(tenant.id),
      { body: one.says, files: [] },
      'ru',
      actor,
    )
    said += 1
    if (!one.answer) continue
    // Answered by whoever the conversation was born with: the card's keeper.
    if (thread.assigneeId === null)
      throw new Error(`support: «${one.org}» was born with nobody to answer`)
    await sayWithFiles(
      asSiteId(siteId),
      { thread },
      { kind: 'staff', userId: thread.assigneeId },
      { body: one.answer },
    )
  }
  return said
}
