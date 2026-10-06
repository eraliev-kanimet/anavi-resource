import { muteQueue } from '@anavi/backend/src/queue'
import { muteMail } from '@anavi/backend/src/lib/mailer'
import { seedSales } from './index'

// Before the first service call: from here on `enqueue` writes nothing, so a run that fills ten
// demos with orders and appeals sends not one letter.
muteQueue()
// And the letters that do NOT go through the queue: an announcement to everybody following the
// catalogue is posted on the spot, and a machine with a real transport would send it to addresses
// that look exactly like people's.
muteMail()

await seedSales(process.argv.slice(2))

console.info('Sales seeded')
process.exit(0)
