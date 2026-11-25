import '@anavi/backend/src/listeners'
import { seed } from './index'
import { DEMOS } from './demos'
import { pinSeedZone } from './lib/days'

// Before anything reads a day: see `pinSeedZone`.
pinSeedZone()

const started = Date.now()
await seed()

// One line that names what was filled: silence cannot be told from a seed that never ran.
console.info(
  `✓ seed: ${DEMOS.map((demo) => demo.slug).join(', ')} — ${Math.round((Date.now() - started) / 1000)} s`,
)
process.exit(0)
