import type { OrgFeature } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { OrgId } from '@anavi/backend/src/db/ids'
import { getOrg, updateOrg } from '@anavi/backend/src/modules/org/org.service'

// What an organization keeps beside its sites is switched on by the demo whose data writes it, never at birth: a shop
// is born with the books and buying alone.
export async function keepOrgFeature(
  orgId: OrgId,
  feature: OrgFeature,
  tx: Db | Transaction,
): Promise<void> {
  const { features } = await getOrg(orgId, tx)
  if (features[feature] === true) return
  await updateOrg(orgId, { features: { ...features, [feature]: true } }, tx)
}

// A programme stands on a storefront only while its organization lends, so the demos that write
// one — a shop's own instalments or a deposit — switch the lending on first.
export async function openLending(orgId: OrgId, tx: Db | Transaction): Promise<void> {
  await keepOrgFeature(orgId, 'instalments', tx)
}
