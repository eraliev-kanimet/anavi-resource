import { rankShelves } from '@anavi/backend/src/modules/search/shelf-order.service'
import { ageCatalog } from './lib/age'
import { muteQueue } from '@anavi/backend/src/queue'
import { muteMail } from '@anavi/backend/src/lib/mailer'
import { db } from '@anavi/backend/src/db'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { reindexSite } from '@anavi/backend/src/modules/search/search.service'
import { applySearchSettings } from '@anavi/backend/src/lib/search'
import { collectLibrary } from './lib/library'
import { seedBrief, seedPresets } from './lib/brief'
import { seedAdminAccount, seedOwnerAccount } from './lib/owner'
import { DEMOS } from './demos'
import { seedSupplies } from './links/supplies'
import { seedKeeping } from './links/keeping'
import { seedLending } from './links/lending'
import { seedAccess } from './links/access'
import { followDays } from './sales/books'
import { openBooks } from './lib/books'
import { seedBins } from './lib/bins'

/*
 * The whole reset speaks through the services, and from the supply section on those services post
 * LETTERS. The queue is this same Postgres, so an invitation and its answer would lie there until
 * somebody starts the worker and then go out to people who do not exist. Silenced at the boundary,
 * exactly as the sales fixture does it — and it costs the search nothing, because the reset
 * reindexes every site synchronously at the end anyway.
 */
muteQueue()
// And the letters that do NOT go through the queue: an announcement to everybody following the
// catalogue is posted on the spot, and a machine with a real transport would send it to addresses
// that look exactly like people's.
muteMail()

export async function seed() {
  // What was being written when it failed — said then, instead of a line per demo every time.
  const at = { stage: 'accounts' }
  try {
    await fill(at)
  } catch (error) {
    console.error(`The seed halted at «${at.stage}»`)
    throw error
  }
}

async function fill(at: { stage: string }) {
  await db.transaction(async (tx) => {
    await seedAdminAccount(tx)
    const ownerId = await seedOwnerAccount(tx)
    for (const entry of DEMOS) {
      at.stage = entry.slug
      const demo = await entry.seed(ownerId, tx)
      // The pairing the sales fixture and the folder `demos/<slug>` depend on: checked here because
      // the fixture is not part of the reset and would go on failing silently.
      if (demo.slug !== entry.slug) {
        throw new Error(
          `the seed of «${entry.slug}» created the site «${demo.slug}» — correct one of the two in seed/demos.ts`,
        )
      }
      // Before the library pass, and never inside a service: a shop whose whole catalogue was
      // created this minute wears the «new» badge on every card and offers a follower the lot.
      await ageCatalog(demo.id, tx)
      // The pictures a demo writes straight into block data have no row anywhere; one pass per site
      // puts them in the library, where a person's own uploads land by themselves.
      await collectLibrary(demo.id, tx)
      // What the demo tells the agent about itself: data beside its material, not a line of its seed.
      await seedBrief(demo.slug, demo.id, tx)
      await seedPresets(demo.slug, demo.id, tx)
      // The books it is born with: the goods its catalogue put on the shelves are received here.
      await openBooks(
        demo.slug,
        demo.id,
        { userId: ownerId, activeRole: 'owner', viaOrgId: null },
        tx,
      )
      // And the spots of its floor, addressed over goods already lying on it.
      await seedBins(
        demo.slug,
        demo.id,
        { userId: ownerId, activeRole: 'owner', viaOrgId: null },
        tx,
      )
    }
    // After every demo AND after each one's ageing pass: an agreement names two sites, and a
    // placement's price bounds are a snapshot of the supplier's price at the moment it is laid out.
    at.stage = 'supplies'
    await seedSupplies(ownerId, tx)
    // After the supplies and for the same reason: what an operator keeps and carries names two sites.
    at.stage = 'keeping'
    await seedKeeping(tx)
    // An organization that gives instalments on other organizations' sites: names them too.
    at.stage = 'lending'
    await seedLending(ownerId, tx)
    // A firm with no site that keeps another's books: an access names the client's organization.
    at.stage = 'access'
    await seedAccess(tx)
    // Last of all: where every card stands is the round's to write, and the worker is not up.
    await rankShelves(null, tx)
    // And the books beside the rows the passes above set back in time: an opening delivery, the
    // goods an operator took in a month and a half ago.
    await followDays(tx)
  })

  // The same rebuild the job would run, called directly: the worker is not up during a reset.
  at.stage = 'search'
  await applySearchSettings()
  for (const row of await db.select({ id: orgSite.id }).from(orgSite)) await reindexSite(row.id)
}
