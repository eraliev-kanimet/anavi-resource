import type { Actor } from '@anavi/backend/src/lib/actor'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import type { CommonScript } from './common'
import type { Random } from './random'
import type { SalesScript } from './script'

/** What one demo's run of the script carries with it, assembled once before anything is written. */
export interface SiteRun {
  site: OrgSite
  /**
   * Whoever confirms money and moves statuses — the owner, first of the organization's own people.
   *
   * A pair and not an id: every act the platform records answers «who» and «in what capacity», and
   * a seed handing over a bare number would write demos the back office cannot.
   */
  actor: Actor
  /** everyone the organization has, so appeals can be handed to somebody other than the owner */
  staff: bigint[]
  /** the words the engine's own side of a sale is written in, read once for the whole run */
  common: CommonScript
  /** what this demo wrote about itself — checked when the run is assembled, so it is never absent */
  script: SalesScript
  /**
   * When the desk last worked the ORDER whose line sits in a conversation, by thread.
   *
   * Carried from the orders pass to the appeals pass in memory and never read back out of the
   * database: `postMessage` stamps `staffReadAt` with the real clock as it writes, so a pass that
   * re-reads that column reads «now» and marks every conversation in the demo as read today.
   */
  seenByOrders: Map<string, Date>
  random: Random
}
