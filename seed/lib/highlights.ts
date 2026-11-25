import { and, asc, eq, inArray, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { setRelated, updateProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { updateVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { getOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { toMajor, toMinor } from '@anavi/shared'

// The marks a shelf shows off — hits, a struck-out price, a hand-picked «similar». How old the goods
// are is `ageCatalog`'s, which runs after every demo's seed.
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

  // Through the card's own door: a «hit» is the product's word, and the seed is not a second writer.
  for (const hit of products.filter((_, index) => index % 7 === 2))
    await updateProduct(siteId, hit.id, { isHit: true }, tx)

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
    const { currency } = await getOrgSite(siteId, tx)
    for (const variant of marked) {
      if (variant.price === null) continue
      // A price a shop would have written: up to whole tens in the site's money, never «157 659,80».
      const oldPrice = toMinor(
        Math.ceil((toMajor(variant.price, currency) * 1.18) / 10) * 10,
        currency,
      )
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
