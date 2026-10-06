import { and, db, eq, isNull } from '@anavi/backend/src/db'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { takeContact } from '@anavi/backend/src/modules/crm/contact.service'
import { digitsOf } from './common'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { getOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { listOrgStaffMembers } from '@anavi/backend/src/modules/staff/staff.service'
import { loadCommon } from './common'
import type { SiteRun } from './context'
import { seedFollows } from './follows'
import { seedInbox } from './inbox'
import { seedOrders } from './orders'
import { seedRewards } from './rewards'
import { seedAnnouncements, seedMorning } from './announce'
import { seedReaders } from './readers'
import { purgeSales } from './purge'
import { demoDir } from '../demos'
import { loadScript } from './script'
import { makeRandom, seedOf } from './random'
import { stampBindings, stampContacts } from './stamp'
import { seedCarried } from './carry'
import { seedHauls } from './haul'
import { seedCargo } from './cargo'
import { seedPurchases } from './purchase'
import { seedAgentRounds } from './agent'
import { seedSettlements } from './settle'

/**
 * Everything a demo's sales section is made of, filled through the same services the application
 * calls — and never part of `db:reset`.
 *
 * The two are different jobs at different frequencies: the seed builds the demos, this fills in what
 * happens inside them. Keeping it here would also mean charging the letter queue with confirmations
 * for people who do not exist on every single reset, which is exactly why the section stayed empty
 * for as long as it did.
 */
export async function seedSales(slugs: readonly string[] = []): Promise<void> {
  /*
   * The moment this run began — handed to every purge below.
   *
   * A demo is told about another demo's order (the butcher hears about the market's), so a notice
   * can carry one site and belong to another's news. Purging by site alone would then let the
   * butcher's turn eat what the market wrote to him ten seconds earlier.
   */
  const startedAt = new Date()

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
  const dirs = new Map(wanted.map((row) => [row.slug, demoDir(row.slug)]))
  const strangers = wanted.filter((row) => dirs.get(row.slug) === null)
  if (slugs.length > 0 && strangers.length > 0) {
    throw new Error(
      `no demo owns ${strangers.map((row) => row.slug).join(', ')} — ` +
        'a site built by hand has no sales script; add it to seed/demos.ts if it is a demo',
    )
  }

  for (const row of wanted) {
    const dir = dirs.get(row.slug) ?? null
    if (!dir) continue

    // A transaction per demo rather than one around all ten: a failure then names the site it
    // happened on and leaves everything filled before it alone.
    const counts = await db.transaction(async (tx) => {
      const site = await getOrgSite(row.id, tx)
      const staff = await listOrgStaffMembers(row.orgId, tx)
      const owner = staff.find((member) => member.roles.includes('owner')) ?? staff[0]
      if (!owner) throw new Error(`${row.slug} has nobody on its staff`)

      // Checked here, before a single row is written: a demo's sales are its own words now, and a
      // site without a file used to receive a generated section that read like nine other demos.
      const script = await loadScript(dir)
      if (!script)
        throw new Error(`${row.slug}: no ${dir}/sales.json — write the demo its own sales`)

      const ctx: SiteRun = {
        site,
        actor: { userId: owner.staff.userId, activeRole: owner.roles[0] ?? 'owner' },
        staff: staff.map((member) => member.staff.userId),
        common,
        script,
        seenByOrders: new Map(),
        random: makeRandom(seedOf(site.slug)),
      }

      await purgeSales(site.id, tx, startedAt)
      const orders = await seedOrders(ctx, tx)
      const appeals = await seedInbox(ctx, tx)
      // The clients somebody answers for, taken once their cards exist.
      for (const person of script.people.filter((one) => one.kept)) {
        const [card] = await tx
          .select({ id: crmContact.id })
          .from(crmContact)
          .where(
            and(
              eq(crmContact.siteId, site.id),
              eq(crmContact.phone, digitsOf(person.phone)),
              isNull(crmContact.deletedAt),
            ),
          )
          .limit(1)
        if (!card) throw new Error(`${row.slug}: «${person.key}» is kept and has no card`)
        await takeContact(site.id, card.id, ctx.actor, tx)
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
      return { orders, appeals, follows, rewards, announced, site, ctx }
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
    console.info(
      `✓ ${row.slug} — ${counts.orders} заказов, ${counts.appeals} обращений${following}${reading}${rewarded}${told}`,
    )
  }

  /*
   * And what one demo did for another, once every one of them stands: an order of the shop's,
   * collected by the operator's storekeeper and taken to the door by its courier. After the loop
   * and never inside it — the work belongs to a site that may be filled later than the order.
   */
  const carried = await seedCarried()
  if (carried.carried > 0 || carried.bills > 0) {
    console.info(
      `✓ ${carried.carried} заказов собрано и передано в доставку, счетов за хранение: ${carried.bills}`,
    )
  }

  // And what rode between cities — after the hand-overs above: a trip's loading list names them.
  const hauled = await seedHauls()
  if (hauled.trips > 0) console.info(`✓ рейсов между городами: ${hauled.trips}`)
  else if (hauled.skipped.length > 0) {
    console.info(
      `· рейсы не собраны: в этом прогоне нет заказов «${hauled.skipped.join('», «')}» — запустите их демо вместе`,
    )
  }

  // One organization buying from another — for every seller whose own pass ran above.
  const purchased = await seedPurchases(
    wanted.flatMap((row) => {
      const dir = dirs.get(row.slug)
      return dir ? [{ slug: row.slug, dir }] : []
    }),
  )
  if (purchased > 0) console.info(`✓ закупок между организациями: ${purchased}`)

  // And the trade agent's round — after the purchases: both draw on the same shelf.
  const filled = wanted.flatMap((row) => {
    const dir = dirs.get(row.slug)
    return dir ? [{ slug: row.slug, dir }] : []
  })
  const rounds = await seedAgentRounds(filled)
  if (rounds.written > 0 || rounds.refused > 0) {
    console.info(
      `✓ агент: заказов из карточек ${rounds.written}, отказано потолком ${rounds.refused}`,
    )
  }

  // And the carrier's cargo from abroad — only when its own demo was filled in this run: the
  // private clients are its cards, and one parcel is born from an order paid in its inbox.
  if (wanted.some((row) => demoDir(row.slug) === 'tulpar')) {
    const cargo = await seedCargo()
    console.info(`✓ карго: ${cargo.parcels} посылок, рейсов из Китая: ${cargo.trips}`)
  }

  // The passes after the loop wrote and aged orders of their own — purchases, an agent's round, a
  // paid parcel — so whose each client is gets read off the dates once more, for every site.
  await db.transaction(async (tx) => {
    for (const site of await tx.select().from(orgSite)) await stampBindings(site, tx)
  })

  // Last: what was done about the month's debts between the carrier and its clients, and the
  // journal read row by row against what each row was written for.
  const settled = await seedSettlements()
  if (settled) {
    console.info(`✓ расчёты: пар ${settled.pairs}, движений сверено с источниками: ${settled.read}`)
  }
}
