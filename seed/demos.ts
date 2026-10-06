import type { Db, Transaction } from '@anavi/backend/src/db'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { seedHanako } from './hanako/seed'
import { seedVega } from './vega'
import { seedDyikan } from './dyikan/seed'
import { seedWatt } from './watt/seed'
import { seedSaima } from './saima/seed'
import { seedKhalif } from './khalif/seed'
import { seedTulpar } from './tulpar/seed'

export interface Demo {
  /** The site's address: `demo7.anavi.localhost`, and what `org_site.slug` holds. */
  slug: string
  /** The folder its material lives in: `watt/data`, `watt/products`, `watt/sales.json`. */
  dir: string
  seed: (ownerId: bigint, tx: Db | Transaction) => Promise<{ id: SiteId; slug: string }>
}

/**
 * The seven demos, each with BOTH of its names.
 *
 * The numbering has holes on purpose: demo3, demo4, demo6, demo9 and demo10 belonged to demos that
 * left when the platform narrowed to trade and content. Closing the gaps would rename every address after them
 * and break the pairing below exactly the way it broke once already.
 *
 * The two genuinely differ and neither can be derived from the other. A site answers at `demo7`
 * because the demos are numbered for whoever is being shown them; its material lives under `watt`
 * because a folder of photographs, price tables and the words of every sale is read by people, and
 * `demo7/data` would tell nobody what is inside. Renaming either to match the other was tried in
 * both directions and is wrong in both.
 *
 * The pair lives here and nowhere else, and this file is the reason it cannot rot: the reset checks
 * every demo it creates against the slug written here, so the two parting company fails on the next
 * `db:reset` instead of months later. That is exactly how it went wrong before — the slugs were
 * renamed to `demoN`, the folders kept their names, and `seedSales` quietly stopped finding a single
 * script until somebody ran it by hand.
 */
export const DEMOS: Demo[] = [
  { slug: 'demo1', dir: 'hanako', seed: seedHanako },
  { slug: 'demo2', dir: 'vega', seed: seedVega },
  { slug: 'demo5', dir: 'dyikan', seed: seedDyikan },
  { slug: 'demo7', dir: 'watt', seed: seedWatt },
  { slug: 'demo8', dir: 'saima', seed: seedSaima },
  // The eleventh: a butcher who sells over his own counter and, from the next item on, through the
  // market as well.
  { slug: 'demo11', dir: 'khalif', seed: seedKhalif },
  // The twelfth, and LAST on purpose: a logistics operator whose clients are the demos above it.
  { slug: 'demo12', dir: 'tulpar', seed: seedTulpar },
]

/** Where this site's material lives. Null for a site no demo made — a hand-built one on a dev base. */
export function demoDir(slug: string): string | null {
  return DEMOS.find((demo) => demo.slug === slug)?.dir ?? null
}
