import type { Db, Transaction } from '@anavi/backend/src/db'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { seedHanako } from '../demos/hanako/seed/seed'
import { seedVega } from '../demos/vega/seed/index'
import { VEGA_SENT, type KeptSending } from '../demos/vega/seed/kept'
import { seedSignal } from '../demos/signal/seed/seed'
import { seedDyikan } from '../demos/dyikan/seed/seed'
import { seedLavanda } from '../demos/lavanda/seed/seed'
import { seedWatt } from '../demos/watt/seed/seed'
import { seedSaima } from '../demos/saima/seed/seed'
import { seedKhalif } from '../demos/khalif/seed/seed'
import { seedTulpar } from '../demos/tulpar/seed/seed'
import { seedAvto996 } from '../demos/avto996/seed/seed'

export interface Demo {
  /** The site's address (`watt.anavi.localhost`, what `org_site.slug` holds) and the folder `demos/<slug>` its material lives in. */
  slug: string
  seed: (ownerId: bigint, tx: Db | Transaction) => Promise<{ id: SiteId; slug: string }>
  /** The carrier whose road, cargo and settlements the sales pass runs: one demo says so. */
  carrier?: true
  /** What this shop handed to an operator that keeps its goods, once every demo stands. */
  sends?: KeptSending
}

/**
 * Order matters: a demo sits after every demo it is built around. The operator comes after the shops
 * it carries for, and the used-car lot after the operator so that no site the others were built
 * around changes its place. Saima stands first and depends on nobody: the back office with no
 * organization remembered opens the first one the owner joined, and Saima is where screens are checked.
 *
 * The reset checks every demo it creates against the slug written here, so a site renamed in its
 * own seed and not in this list fails on the next `db:reset` instead of months later, when the sales
 * fixture quietly stops finding a script.
 */
export const DEMOS: Demo[] = [
  { slug: 'saima', seed: seedSaima },
  { slug: 'hanako', seed: seedHanako },
  { slug: 'vega', seed: seedVega, sends: VEGA_SENT },
  { slug: 'signal', seed: seedSignal },
  { slug: 'dyikan', seed: seedDyikan },
  { slug: 'lavanda', seed: seedLavanda },
  { slug: 'watt', seed: seedWatt },
  { slug: 'khalif', seed: seedKhalif },
  { slug: 'tulpar', seed: seedTulpar, carrier: true },
  { slug: 'avto996', seed: seedAvto996 },
]

/** The address of the demo that runs the carriage. */
export function carrierSlug(): string {
  const carrier = DEMOS.find((demo) => demo.carrier)
  if (!carrier) throw new Error('seed/demos.ts: no demo is the carrier')
  return carrier.slug
}

/** False for a site no demo made — a hand-built one on a dev base. */
export function isDemo(slug: string): boolean {
  return DEMOS.some((demo) => demo.slug === slug)
}
