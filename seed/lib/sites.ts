import { and, db, eq, isNull, type Db, type Transaction } from '@anavi/backend/src/db'
import { orgSite, type OrgSite } from '@anavi/backend/src/db/schema/org'
import { asSiteId, type SiteId } from '@anavi/backend/src/db/ids'

/** A live site by its address word — the one lookup every fixture pass makes of the demos it walks. */
export async function siteBySlug(slug: string, tx: Db | Transaction = db): Promise<OrgSite> {
  const [row] = await tx
    .select()
    .from(orgSite)
    .where(and(eq(orgSite.slug, slug), isNull(orgSite.deletedAt)))
    .limit(1)
  if (!row) throw new Error(`seed: no site «${slug}» — run db:reset first`)
  return row
}

export async function siteIdBySlug(slug: string, tx: Db | Transaction = db): Promise<SiteId> {
  return asSiteId((await siteBySlug(slug, tx)).id)
}
