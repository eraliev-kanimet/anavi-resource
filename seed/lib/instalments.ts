import type { Db, Transaction } from '@anavi/backend/src/db'
import type { OrgId } from '@anavi/backend/src/db/ids'
import { getOrg, updateOrg } from '@anavi/backend/src/modules/org/org.service'

// A programme stands on a storefront only while its organization lends, so the demos that write
// one — a shop's own instalments or a deposit — switch the lending on first.
export async function openLending(orgId: OrgId, tx: Db | Transaction): Promise<void> {
  const { features } = await getOrg(orgId, tx)
  await updateOrg(orgId, { features: { ...features, instalments: true } }, tx)
}
