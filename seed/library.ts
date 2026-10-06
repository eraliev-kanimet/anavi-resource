import { and, eq, inArray, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { cntBlock, cntPage } from '@anavi/backend/src/db/schema/cnt'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { sysMedia } from '@anavi/backend/src/db/schema/sys'
import { thumbKeyOf } from '@anavi/backend/src/lib/images'
import type { SiteId } from '@anavi/backend/src/db/ids'

interface Found {
  key: string
  width: number
  height: number
  alt?: string
}

// An `ImageRef` and nothing else: three fields of the right types together. A bare `key` would
// also match a form field and a block option, both of which are identifiers rather than pictures.
function walk(value: unknown, into: Map<string, Found>) {
  if (Array.isArray(value)) {
    for (const one of value) walk(one, into)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (
    typeof record.key === 'string' &&
    typeof record.width === 'number' &&
    typeof record.height === 'number' &&
    !into.has(record.key)
  ) {
    into.set(record.key, {
      key: record.key,
      width: record.width,
      height: record.height,
      alt: typeof record.alt === 'string' ? record.alt : undefined,
    })
  }
  for (const one of Object.values(record)) walk(one, into)
}

/**
 * Registers the pictures a site keeps inside JSON — every image of every block, and the sharing
 * picture of the site — as rows of its library.
 *
 * They have nowhere else to be recorded: a block holds an `ImageRef`, which is a key and two
 * numbers, and the platform has no other memory of that file. Everything a person uploads through
 * the back office goes through `sys_media` and needs none of this; the seed writes block data
 * directly, so the same pass has to be made here — otherwise the demo sites open a library that
 * cannot show their own hero.
 */
export async function collectLibrary(siteId: SiteId, tx: Db | Transaction) {
  const found = new Map<string, Found>()

  const [site] = await tx
    .select({ ogImage: orgSite.ogImage, defaultLocale: orgSite.defaultLocale })
    .from(orgSite)
    .where(eq(orgSite.id, siteId))
    .limit(1)
  walk(site?.ogImage, found)

  const blocks = await tx
    .select({ data: cntBlock.data })
    .from(cntBlock)
    .innerJoin(cntPage, eq(cntPage.id, cntBlock.pageId))
    .where(and(eq(cntPage.siteId, siteId), isNull(cntBlock.deletedAt)))
  for (const block of blocks) walk(block.data, found)

  if (found.size === 0) return 0

  const already = await tx
    .select({ key: sysMedia.key })
    .from(sysMedia)
    .where(and(eq(sysMedia.siteId, siteId), inArray(sysMedia.key, [...found.keys()])))
  for (const row of already) found.delete(row.key)
  if (found.size === 0) return 0

  await tx.insert(sysMedia).values(
    [...found.values()].map((one) => ({
      siteId,
      ownerType: 'site' as const,
      ownerId: siteId,
      kind: 'image' as const,
      key: one.key,
      thumbKey: thumbKeyOf(one.key),
      width: one.width,
      height: one.height,
      // the alt was written in the demo's own language, which is the site's default one
      caption: one.alt && site ? { [site.defaultLocale]: one.alt } : null,
    })),
  )
  return found.size
}
