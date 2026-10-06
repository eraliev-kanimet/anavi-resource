import { and, asc, eq, inArray, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { setRelated } from '@anavi/backend/src/modules/catalog/product.service'
import { updateVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Dates are spread by hand: goods poured in by the seed today would every one of them be a novelty.
// This is the post-hoc fixture adjustment the seed is allowed — a service must not offer «pretend
// this was created in March».
export async function seedHighlights(
  siteId: SiteId,
  tx: Db | Transaction,
  // Off when the materials carry real ones: «Watt» imported seventy-six genuine discounts, and
  // marking up every fifth product would overwrite them with a fiction.
  options: { inventDiscounts?: boolean } = {},
) {
  const products = await tx
    .select()
    .from(catProduct)
    .where(and(eq(catProduct.siteId, siteId), isNull(catProduct.deletedAt)))
    .orderBy(asc(catProduct.id))

  const fresh = products.slice(0, 3).map((p) => p.id)
  const older = products.slice(3).map((p) => p.id)
  const day = 24 * 60 * 60 * 1000

  if (older.length > 0)
    await tx
      .update(catProduct)
      .set({ createdAt: new Date(Date.now() - 120 * day) })
      .where(inArray(catProduct.id, older))
  if (fresh.length > 0)
    await tx
      .update(catProduct)
      .set({ createdAt: new Date(Date.now() - 5 * day) })
      .where(inArray(catProduct.id, fresh))

  const hits = products.filter((_, index) => index % 7 === 2).map((p) => p.id)
  if (hits.length > 0)
    await tx.update(catProduct).set({ isHit: true }).where(inArray(catProduct.id, hits))

  // a discount on a few: an old price above the current one, which is the only kind that shows
  const discounted = options.inventDiscounts
    ? products.filter((_, index) => index % 5 === 1).map((p) => p.id)
    : []
  if (discounted.length > 0) {
    // Through the variant's own door: the price has one writer, and the seed is not a second.
    const marked = await tx
      .select({ id: catVariant.id, productId: catVariant.productId, price: catVariant.price })
      .from(catVariant)
      .where(and(inArray(catVariant.productId, discounted), isNull(catVariant.deletedAt)))
    for (const variant of marked) {
      if (variant.price === null) continue
      const oldPrice = Math.round(variant.price * 1.18)
      await updateVariant(siteId, variant.productId, variant.id, { oldPrice }, tx)
    }
  }

  // two hand-picked rows, so both sources of "similar" are visible at once
  for (const product of products.slice(0, 2)) {
    const others = products.filter(
      (p) => p.id !== product.id && p.categoryId === product.categoryId,
    )
    const picked = [others.at(-1), others.at(-2)].filter((p) => p !== undefined)
    if (picked.length > 0)
      await setRelated(siteId, product.id, { slugs: picked.map((p) => p.slug) }, tx)
  }
}
