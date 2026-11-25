import { and, asc, desc, eq, gt, inArray, isNull, lte } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catCategory, catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { stkMove } from '@anavi/backend/src/db/schema/stk'
import type { SiteId } from '@anavi/backend/src/db/ids'
import type { Actor } from '@anavi/backend/src/lib/actor'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { assignBin, createBins, listBins } from '@anavi/backend/src/modules/stock/bin.service'
import { findResourceJson } from './resource'

/*
 * THE SPOTS OF A DEMO'S FLOOR — `demos/<slug>/bins.json`, written in the order a storekeeper walks
 * them: the point (by its place in the site's list, the first unless said) and its spots, each with
 * the shelves of the catalogue whose goods call it home. Walked after the books are open, as a shop
 * addresses a floor whose goods already lie on it: every home given to goods lying there is a pair of
 * movements from no spot into it, which is what the journal says of such a day. A spot that holds
 * nothing waits for a door that names it — a delivery counted into it.
 */
interface DemoBins {
  place?: number
  spots: { code: string; holds?: string[] }[]
}

export async function seedBins(
  slug: string,
  siteId: SiteId,
  actor: Actor,
  tx: Db | Transaction,
): Promise<void> {
  const plan = await findResourceJson<DemoBins>(`demos/${slug}/bins.json`)
  if (!plan) return
  const place = (await listPlaces(siteId, tx))[plan.place ?? 0]
  if (!place) throw new Error(`bins: «${slug}» has no point number ${plan.place ?? 0}`)
  const [last] = await tx
    .select({ id: stkMove.id })
    .from(stkMove)
    .orderBy(desc(stkMove.id))
    .limit(1)
  const before = last?.id ?? 0n
  await createBins(siteId, { placeId: place.id, codes: plan.spots.map((one) => one.code) }, tx)
  const spots = new Map(
    (await listBins(siteId, tx))
      .filter((bin) => bin.placeId === place.id)
      .map((bin) => [bin.code, bin.id]),
  )
  // A shelf and the shelves under it: a spot that holds «bakaleya» holds its groats and its flour.
  const shelves = await tx
    .select({ id: catCategory.id, slug: catCategory.slug, parentId: catCategory.parentId })
    .from(catCategory)
    .where(eq(catCategory.siteId, siteId))
  const slugOf = new Map(shelves.map((one) => [one.id, one.slug]))
  for (const spot of plan.spots) {
    if (!spot.holds?.length) continue
    const held = new Set(spot.holds)
    const under = shelves
      .filter(
        (one) =>
          held.has(one.slug) || (one.parentId !== null && held.has(slugOf.get(one.parentId)!)),
      )
      .map((one) => one.id)
    const variants =
      under.length === 0
        ? []
        : await tx
            .select({ id: catVariant.id })
            .from(catVariant)
            .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
            .where(
              and(
                eq(catProduct.siteId, siteId),
                inArray(catProduct.categoryId, under),
                isNull(catVariant.deletedAt),
                isNull(catProduct.deletedAt),
              ),
            )
    // A shelf that names nothing is a spelling the material got wrong, never an empty rack.
    if (variants.length === 0)
      throw new Error(`bins: «${slug}» sells nothing on ${spot.holds.join(', ')}`)
    for (const variant of variants)
      await assignBin(
        siteId,
        actor,
        { variantId: variant.id, placeId: place.id, binId: spots.get(spot.code)! },
        tx,
      )
  }
  /*
   * The floor was addressed the day the shop opened its books, an hour after its first goods were
   * taken in (the opening delivery `openBooks` has just written) — not on the day of the reset,
   * which would stand the pairs after every sale the history then takes out of these very spots.
   * The allowed exception: a backdated moment.
   */
  const [opening] = await tx
    .select({ at: stkMove.createdAt, on: stkMove.on })
    .from(stkMove)
    .where(and(eq(stkMove.siteId, siteId), lte(stkMove.id, before)))
    .orderBy(asc(stkMove.createdAt))
    .limit(1)
  if (opening)
    await tx
      .update(stkMove)
      .set({ createdAt: new Date(opening.at.getTime() + 3_600_000), on: opening.on })
      .where(and(gt(stkMove.id, before), eq(stkMove.siteId, siteId), eq(stkMove.kind, 'transfer')))
}

/** A spot of a site's floor by its code, for a door the material names it at. */
export async function binNamed(
  siteId: SiteId,
  placeId: bigint,
  code: string,
  tx: Db | Transaction,
): Promise<bigint> {
  const bin = (await listBins(siteId, tx)).find(
    (one) => one.placeId === placeId && one.code === code,
  )
  if (!bin) throw new Error(`bins: no spot «${code}» at point ${placeId}`)
  return bin.id
}
