import type { Db, Transaction } from '@anavi/backend/src/db'
import { createPlace } from '@anavi/backend/src/modules/org/place.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

export interface SeedPlace {
  name: Record<string, string>
  address: Record<string, string>
  /** a key of the platform's list of cities (`CITIES` in `shared`) */
  city?: string
  phone?: string
  email?: string
  hours?: Record<string, string>
  lat?: number
  lng?: number
  /** the site's own card in 2GIS or Google, when it has one */
  url?: string
  /** a place the buyer may come to for an order; a shop's own places are, unless said otherwise */
  isPickup?: boolean
}

// Written one after another and never in parallel: the order of the list is the order the
// storefront prints, and the first place is the one it treats as the main.
export async function seedPlaces(
  siteId: SiteId,
  places: SeedPlace[],
  tx: Db | Transaction,
): Promise<void> {
  for (const place of places)
    await createPlace(siteId, { ...place, isPickup: place.isPickup ?? true }, tx)
}
