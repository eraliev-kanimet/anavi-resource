import { ageCatalog } from './age'
import { muteQueue } from '@anavi/backend/src/queue'
import { muteMail } from '@anavi/backend/src/lib/mailer'
import { db } from '@anavi/backend/src/db'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { reindexSite } from '@anavi/backend/src/modules/catalog/search.service'
import { createAccount } from '@anavi/backend/src/modules/admin/admin.service'
import { collectLibrary } from './library'
import { seedOwnerAccount } from './owner'
import { DEMOS } from './demos'
import { seedSupplies } from './supplies'
import { seedKeeping } from './keeping'

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
  await db.transaction(async (tx) => {
    await createAccount(
      { email: 'admin@admin.com', name: 'Администратор', password: 'password', role: 'admin' },
      tx,
    )
    const ownerId = await seedOwnerAccount(tx)
    // A line per demo is printed here rather than inside the seeds: the last printed line indicates
    // which demo halted if anything fails.
    for (const entry of DEMOS) {
      const demo = await entry.seed(ownerId, tx)
      /*
       * The one thing standing between a renamed address and finding out months later.
       *
       * A demo's site slug and the folder its material lives in are two different names for one
       * thing (see `demos.ts`), and nothing in the type system pairs them. Checked here because this
       * is the only moment both are in hand — and because the reader that needs the pair, the sales
       * fixture, is not part of the reset and would go on failing silently.
       */
      if (demo.slug !== entry.slug) {
        throw new Error(
          `${entry.dir} created the site «${demo.slug}» while demos.ts says «${entry.slug}» — ` +
            'correct one of the two, or the sales fixture stops finding this demo',
        )
      }
      // Before the library pass, and never inside a service: a shop whose whole catalogue was
      // created this minute wears the «new» badge on every card and offers a follower the lot.
      await ageCatalog(demo.id, tx)
      // The pictures a demo writes straight into block data have no row anywhere; one pass per site
      // puts them in the library, where a person's own uploads land by themselves.
      await collectLibrary(demo.id, tx)
      console.info(`✓ ${demo.slug}`)
    }
    // After every demo AND after each one's ageing pass: an agreement names two sites, and a
    // placement's price bounds are a snapshot of the supplier's price at the moment it is laid out.
    await seedSupplies(tx)
    console.info('✓ supplies')
    // After the supplies and for the same reason: what an operator keeps and carries names two sites.
    await seedKeeping(tx)
    console.info('✓ keeping')
  })

  // The same rebuild the job would run, called directly: the worker is not up during a reset.
  for (const row of await db.select({ id: orgSite.id }).from(orgSite)) await reindexSite(row.id)
}
