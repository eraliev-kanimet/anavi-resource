import type { Transaction } from '@anavi/backend/src/db'
import { setPlatformSite } from '@anavi/backend/src/modules/admin/platform.service'
import { updateOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { keptByAll } from './features'
import { seedOrgWithSite, verifyOrg } from './owner'

/*
 * Anavi as an organization of its own platform: it sells its rent from a site of its own, and the platform names that
 * site by data through the same door its administrator presses (`sys_platform`). Born by its owner's self-signup like
 * any business; the word `anavi` is the platform's, so the site answers as `sales`. Its services are switched on and nothing more: tenants,
 * rent and agents are written on it by the work that needs them.
 */
export async function seedPlatform(ownerId: bigint, adminId: bigint, tx: Transaction) {
  const { org, site } = await seedOrgWithSite(
    ownerId,
    { name: 'Anavi', slug: 'sales', defaultLocale: 'ru', locales: ['ru', 'en'] },
    tx,
  )
  await verifyOrg(org.id, ownerId, tx)
  // The rent is a service billed to an organization's account: the site sells services, on account, and keeps nothing else to begin
  // with.
  await updateOrgSite(site.id, { features: keptByAll({ services: true, accounts: true }) }, tx)
  await setPlatformSite(adminId, { siteId: String(site.id) }, tx)
  return site
}
