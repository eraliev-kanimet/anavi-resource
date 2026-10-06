import type { Db, Transaction } from '@anavi/backend/src/db'
import { createPlace } from '@anavi/backend/src/modules/org/place.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

export interface SeedPlace {
  name: Record<string, string>
  address: Record<string, string>
  phone?: string
  email?: string
  hours?: Record<string, string>
  lat?: number
  lng?: number
  /** the site's own card in 2GIS or Google, when it has one */
  url?: string
}

// Written one after another and never in parallel: the order of the list is the order the
// storefront prints, and the first place is the one it treats as the main.
export async function seedPlaces(
  siteId: SiteId,
  places: SeedPlace[],
  tx: Db | Transaction,
): Promise<void> {
  for (const place of places) await createPlace(siteId, place, tx)
}
