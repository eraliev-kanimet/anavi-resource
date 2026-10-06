import { and, eq, inArray, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { variantOfProduct } from '@anavi/backend/src/modules/catalog/catalog.owner'
import { createLine } from '@anavi/backend/src/modules/catalog/line.service'
import { updateProduct } from '@anavi/backend/src/modules/catalog/product.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

// What is a line here is stated, not inferred: the source holds two rows called «X1605VA Vivobook
// 16» that are in fact different laptops. Lines that do not exist in the materials are not invented.
const LINES = [
  {
    slug: 'iphone-16-pro-max',
    name: 'Apple iPhone 16 Pro Max',
    primary: 'MYWJ3J/A',
    members: ['MYWJ3J/A', 'MYX43QN/A'],
  },
]

export async function seedLines(siteId: SiteId, tx: Db | Transaction) {
  for (const definition of LINES) {
    const rows = await tx
      .select({ productId: catVariant.productId, sku: catVariant.sku })
      .from(catVariant)
      .innerJoin(catProduct, variantOfProduct)
      .where(
        and(
          eq(catProduct.siteId, siteId),
          inArray(catVariant.sku, definition.members),
          isNull(catProduct.deletedAt),
        ),
      )
    if (rows.length < 2) continue

    const line = await createLine(
      siteId,
      {
        slug: definition.slug,
        name: { ru: definition.name, en: definition.name, ar: definition.name },
      },
      tx,
    )
    for (const row of rows)
      await updateProduct(
        siteId,
        row.productId,
        { lineId: line.id, isLinePrimary: row.sku === definition.primary },
        tx,
      )
  }
  return LINES.length
}
