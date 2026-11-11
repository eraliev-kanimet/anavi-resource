import { hasPermission, permissionsFor } from '@anavi/shared'
import { and, db, eq, isNull } from '@anavi/backend/src/db'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { assignContact } from '@anavi/backend/src/modules/crm/contact.service'
import { putSpot } from '@anavi/backend/src/modules/crm/spot.service'
import { phoneOf } from './common'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { getOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { listOrgStaffMembers } from '@anavi/backend/src/modules/staff/staff.service'
import { loadCommon } from './common'
import type { SiteRun } from './context'
import { seedFollows } from './follows'
import { seedInbox } from './inbox'
import { seedOffers } from './offers'
import { seedOrders } from './orders'
import { seedRewards } from './rewards'
import { seedAnnouncements, seedMorning } from './announce'
import { seedReaders } from './readers'
import { seedShelfTalks } from './shelf'
import { seedComplaints } from './complaints'
import { seedEverybody } from './everybody'
import { carrierSlug, isDemo } from '../demos'
import { loadScript } from './script'
import { makeRandom, seedOf } from './random'
import { followFacts, followNotices, stampBindings, stampContacts } from './stamp'
import { seedCarried } from './carry'
import { ordOrder } from '@anavi/backend/src/db/schema/ord'
import { seedHauls } from './haul'
import { seedCargo } from './cargo'
import { seedPurchases } from './purchase'
import { seedAgentRounds } from './agent'
import { seedRent, seedSupport } from './rent'
import { seedSettlements } from './settle'
import { checkAccounts, seedAccounts } from './account'
import { linkDirections } from './direction'
import { followDays } from './books'
import { liveMonths, seedHistory } from './history'
import { closeMonths } from './closing'

/**
 * Everything a demo's sales section is made of, filled through the same services the application
 * calls — and never part of `db:reset`.
 *
 * The two are different jobs at different frequencies: the seed builds the demos, this fills in what
 * happens inside them. Keeping it here would also mean charging the letter queue with confirmations
 * for people who do not exist on every single reset, which is exactly why the section stayed empty
 * for as long as it did.
 */
/*
 * What a run did, kept rather than printed: a run is read by a person when they ask for it
 * (`--verbose`), and otherwise says one line — a developer's terminal and an agent's context are
 * not a log. What is `warned` is a run that did less than it was asked to, and is always said.
 */
export interface SalesReport {
  said: string[]
  warned: string[]
}

export async function seedSales(slugs: readonly string[] = []): Promise<SalesReport> {
  const said: string[] = []
  const warned: string[] = []
  // Read once, before the first write: ten demos share it, and a library without it cannot fill a
  // single one — so it fails here rather than half way through the third.
  const common = await loadCommon()

  const sites = await db
    .select({ id: orgSite.id, slug: orgSite.slug, orgId: orgSite.orgId })
    .from(orgSite)
    .where(isNull(orgSite.deletedAt))
    .orderBy(orgSite.id)

  const wanted = slugs.length > 0 ? sites.filter((row) => slugs.includes(row.slug)) : sites
  if (wanted.length === 0) {
    const known = sites.map((row) => row.slug).join(', ')
    throw new Error(`no site matches ${slugs.join(', ')}. The base holds: ${known}`)
  }

  /*
   * Which folder each of these reads its words from, resolved before a single row is written.
   *
   * Named ONLY when the run was asked for particular sites: a bare `seed:sales` walks every site the
   * base holds, and a dev base is allowed to carry one built by hand that no demo made. Asking for
   * that one by name is a mistake worth a sentence; sweeping past it is not.
   */
  const strangers = wanted.filter((row) => !isDemo(row.slug))
  if (slugs.length > 0 && strangers.length > 0) {
    throw new Error(
      `no demo owns ${strangers.map((row) => row.slug).join(', ')} — ` +
        'a site built by hand has no sales script; add it to seed/demos.ts if it is a demo',
    )
  }

  /*
   * A run fills a base the reset has just built, and nothing else: it never takes an earlier run
   * back. Taking back was a second copy of the platform's own rules — the warehouse's counters, the
   * books' documents, who a guest is — written past every door, and it drifted from them. `seed:sales`
   * runs the reset first; a run started by hand on a base already holding sales is refused.
   */
  const [sold] = await db.select({ id: ordOrder.id }).from(ordOrder).limit(1)
  if (sold)
    throw new Error(
      'the base already holds sales — run `bun run --cwd code/backend seed:sales`, which resets it first',
    )

  // The cargo is the carrier's own material and code (`demos/tulpar/cargo.json`), and it runs
  // when that demo is filled.
  const cargoRuns = wanted.some((row) => row.slug === carrierSlug())

  for (const row of wanted) {
    if (!isDemo(row.slug)) continue

    /*
     * A demo with no sales of its own simply has none: its catalogue, books and months stand
     * without them, and a generated section would read like nine other demos.
     */
    const script = await loadScript(row.slug)
    if (!script) {
      said.push(`· ${row.slug} — нет demos/${row.slug}/sales.json, продаж нет`)
      continue
    }

    // A transaction per demo rather than one around all ten: a failure then names the site it
    // happened on and leaves everything filled before it standing.
    const counts = await db.transaction(async (tx) => {
      const site = await getOrgSite(row.id, tx)
      const staff = await listOrgStaffMembers(row.orgId, tx)
      const owner = staff.find((member) => member.roles.includes('owner')) ?? staff[0]
      if (!owner) throw new Error(`${row.slug} has nobody on its staff`)

      const ctx: SiteRun = {
        site,
        actor: {
          userId: owner.staff.userId,
          activeRole: owner.roles[0] ?? 'owner',
          viaOrgId: null,
        },
        staff: staff
          .filter((member) => hasPermission(permissionsFor(member.roles), 'inbox:manage'))
          .map((member) => member.staff.userId),
        common,
        script,
        seenByOrders: new Map(),
        random: makeRandom(seedOf(site.slug)),
      }

      // Before the orders, the history's own among them: a till finds a card by the telephone
      // typed into it, and an organization buys on the terms written on its card.
      await linkDirections(ctx.site, tx)
      await seedAccounts(ctx, tx)
      const history = await seedHistory(ctx, tx)
      const orders = await seedOrders(ctx, tx)
      // And read back at once, while nothing else has touched these cards.
      await checkAccounts(ctx, tx)
      const appeals = await seedInbox(ctx, tx)
      // After the conversations: an offer may be written out of one and says its link back into it.
      await seedOffers(ctx, tx)
      // The clients somebody answers for, given them once their cards exist — by whoever divides the book, over a keeper the platform
      // named when a partner of the staff brought the client: that is the person's word the two facts part by.
      for (const person of script.people.filter((one) => one.kept)) {
        const [card] = await tx
          .select({ id: crmContact.id })
          .from(crmContact)
          .where(
            and(
              eq(crmContact.siteId, site.id),
              eq(crmContact.phone, phoneOf(person.phone, site.country)),
              isNull(crmContact.deletedAt),
            ),
          )
          .limit(1)
        if (!card) throw new Error(`${row.slug}: «${person.key}» is kept and has no card`)
        await assignContact(site.id, card.id, ctx.actor, { userId: ctx.actor.userId }, tx)
      }
      // The doors somebody has stood at: put down through the one door a desk and a courier use.
      for (const spot of script.spots ?? []) {
        await putSpot(
          site.id,
          { line: spot.address },
          { lat: spot.at[0], lng: spot.at[1] },
          ctx.actor,
          tx,
        )
      }
      // After the cards exist: a follower is one of them.
      const follows = await seedFollows(ctx, tx)
      // After the followers exist and before the morning below: an announcement is told to whoever is
      // already standing behind the catalogue.
      const announced = await seedAnnouncements(ctx, tx)
      // Last of all: what a partner earned exists only once the orders that earned it do, and an
      // order raised out of an appeal is written in the pass above this one.
      const rewards = await seedRewards(ctx, tx)
      await stampContacts(site.id, tx)
      // After every order of this pass has its date: whose each client is follows the dates.
      await stampBindings(site, tx)
      return { orders, appeals, follows, rewards, announced, history, site, ctx }
    })
    /*
     * The morning round, and it is OUTSIDE the transaction on purpose — see `seedMorning`. The
     * platform's own code talks on its own connection, and inside an open transaction it would look
     * for cards nobody has committed yet.
     *
     * For every demo and not only for the ones with readers: a business following a supplier's
     * catalogue is a follower too, and the butcher has one — the market. Where nobody follows, the
     * round walks an empty list and costs a query.
     */
    await seedMorning(counts.site)
    /*
     * And the readers, outside the transaction for the same two reasons the morning is — see
     * `seedReaders`. After the morning rather than before it: signing in does not change what the
     * round has to say, and the round is what a reader's own feed is holding when they arrive.
     */
    const readers = await seedReaders(counts.ctx)

    const reading = readers > 0 ? `, ${readers} читателей` : ''
    const following = counts.follows > 0 ? `, ${counts.follows} подписчиков` : ''
    const rewarded = counts.rewards > 0 ? `, ${counts.rewards} начислений улажено` : ''
    const told = counts.announced > 0 ? `, ${counts.announced} объявлений` : ''
    const past = counts.history > 0 ? `, ${counts.history} продаж за полгода` : ''
    said.push(
      `✓ ${row.slug} — ${counts.orders} заказов, ${counts.appeals} обращений${following}${reading}${rewarded}${told}${past}`,
    )
  }

  /*
   * And what one demo did for another, once every one of them stands: an order of the shop's,
   * collected by the operator's storekeeper and taken to the door by its courier. After the loop
   * and never inside it — the work belongs to a site that may be filled later than the order.
   */
  const carried = await seedCarried(wanted.filter((row) => isDemo(row.slug)).map((row) => row.id))
  if (carried.carried > 0 || carried.bills > 0) {
    said.push(
      `✓ ${carried.carried} заказов собрано и передано в доставку, инструкций отгрузки: ${carried.sent}, счетов за хранение: ${carried.bills}`,
    )
  }

  // And what rode between cities — after the hand-overs above: a trip's loading list names them.
  const hauled = await seedHauls()
  if (hauled.trips > 0) said.push(`✓ рейсов между городами: ${hauled.trips}`)
  else if (hauled.skipped.length > 0) {
    warned.push(
      `· рейсы не собраны: в этом прогоне нет заказов «${hauled.skipped.join('», «')}» — запустите их демо вместе`,
    )
  }

  // One organization buying from another — for every seller whose own pass ran above.
  const purchased = await seedPurchases(wanted.filter((row) => isDemo(row.slug)))
  if (purchased > 0) said.push(`✓ закупок между организациями: ${purchased}`)

  // And the trade agent's round — after the purchases: both draw on the same shelf.
  const filled = wanted.filter((row) => isDemo(row.slug))
  // Sellers asking these shops for a place on their shelves — a conversation and nothing more.
  const asked = await seedShelfTalks(filled.map((one) => one.slug))
  if (asked > 0) said.push(`✓ заявок на размещение: ${asked}`)
  // Buyers complaining of an order one demo took off another's site — heard on that site's desk.
  const complained = await seedComplaints(filled.map((one) => one.slug))
  if (complained > 0) said.push(`✓ жалоб на заказы исполнителей: ${complained}`)
  // One request sent to everybody who provides a service — a request on each of their desks.
  const toAll = await seedEverybody(filled.map((one) => one.slug))
  if (toAll > 0) said.push(`✓ заявок всем исполнителям: ${toAll}`)
  const rounds = await seedAgentRounds(filled)
  // Anavi's own trade, once the demos stand: a year of rent billed to an organization with no site yet.
  const rented = await db.transaction((tx) => seedRent(tx))
  if (rented > 0) said.push(`✓ аренда Anavi: счетов организациям без сайта ${rented}`)
  // And what tenants asked the platform's support, once the rent stands committed.
  const supported = await seedSupport()
  if (supported > 0) said.push(`✓ поддержка Anavi: обращений арендаторов ${supported}`)
  if (rounds.written > 0 || rounds.refused > 0) {
    said.push(`✓ агент: заказов из карточек ${rounds.written}, отказано потолком ${rounds.refused}`)
  }

  // And the carrier's cargo from abroad — only when its own demo was filled in this run: the
  // private clients are its cards, and one parcel is born from an order paid in its inbox.
  if (cargoRuns) {
    const cargo = await seedCargo()
    said.push(`✓ карго: ${cargo.parcels} посылок, рейсов из Китая: ${cargo.trips}`)
  }

  // The passes after the loop wrote and aged orders of their own — purchases, an agent's round, a
  // paid parcel — so whose each client is gets read off the dates once more, for every site.
  await db.transaction(async (tx) => {
    for (const site of await tx.select().from(orgSite)) await stampBindings(site, tx)
  })

  // Last: what was done about the month's debts between the carrier and its clients.
  const settled = await seedSettlements()
  if (settled) said.push(`✓ расчёты: пар ${settled}`)

  // The months each demo's books say it lives — once every sale of them stands, so a month's tax
  // and payroll count what really happened in it.
  const lived = await liveMonths(filled.map((one) => one.slug))
  if (lived > 0) said.push(`✓ учёт: ведомостей и начислений налога за прошедшие месяцы: ${lived}`)

  // The very last: every pass above set its rows back in time, and the books follow their rows —
  // as the record of what was said follows the feed.
  const followed = await db.transaction(async (tx) => {
    await followFacts(tx)
    await followNotices(tx)
    return followDays(tx)
  })
  said.push(`✓ учёт: документов поставлено в дни своих движений: ${followed}`)

  // And once every document stands on its day, the months an accountant would have closed.
  const closed = await closeMonths()
  if (closed > 0) said.push(`✓ учёт: закрыто месяцев: ${closed}`)
  return { said, warned }
}
