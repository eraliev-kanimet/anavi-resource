import { and, eq, inArray, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import {
  createMarket,
  createPriceKind,
  setKindPrices,
} from '@anavi/backend/src/modules/catalog/market.service'
import { SAIMA_EXPORT } from './index'

// The export kind of price and the market of the English version — see `SAIMA_EXPORT`.
export async function seedSaimaExport(siteId: SiteId, ownerId: bigint, tx: Db | Transaction) {
  const kind = await createPriceKind(siteId, SAIMA_EXPORT.kind, tx)
  const variants = await tx
    .select({ id: catVariant.id, slug: catProduct.slug })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .where(
      and(
        eq(catProduct.siteId, siteId),
        inArray(
          catProduct.slug,
          SAIMA_EXPORT.own.map((one) => one.slug),
        ),
        isNull(catVariant.deletedAt),
      ),
    )
  if (variants.length === 0) throw new Error('saima: the export models are not in the catalogue')
  await setKindPrices(
    siteId,
    kind.id,
    { userId: ownerId, activeRole: 'owner', viaOrgId: null },
    {
      prices: [
        ...variants.map((one) => ({
          variantId: String(one.id),
          price: Math.round(SAIMA_EXPORT.own.find((own) => own.slug === one.slug)!.price * 100),
        })),
        { selectionId: null, markup: SAIMA_EXPORT.markup },
      ],
    },
    tx,
  )
  await createMarket(siteId, { ...SAIMA_EXPORT.market, kindId: String(kind.id) }, tx)
}
