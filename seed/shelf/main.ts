import '@anavi/backend/src/listeners'
import { muteQueue } from '@anavi/backend/src/queue'
import { muteMail } from '@anavi/backend/src/lib/mailer'
import { db } from '@anavi/backend/src/db'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { reindexSite } from '@anavi/backend/src/modules/search/search.service'
import { seedShelf } from './index'
import { pinSeedZone } from '../lib/days'

// Before anything reads a day: see `pinSeedZone`.
pinSeedZone()

// The same two silences the sales fixture keeps, for the same reason: a run that calls suppliers
// and publishes terms must not write to addresses that look exactly like people's.
muteQueue()
muteMail()

const told = await seedShelf()

// The shelves just laid are searched by what lies on them: the queue is silent, so the sites are
// written here, as the reset writes them.
for (const row of await db.select({ id: orgSite.id }).from(orgSite)) await reindexSite(row.id)

// What it laid is said when asked (`--verbose`): otherwise one line, as the other seeds say.
if (process.argv.includes('--verbose')) for (const line of told) console.info(`  ${line}`)
console.info(`Shelf seeded — ${told.length} lines of detail with --verbose`)
process.exit(0)
