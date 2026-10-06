import { and, db, eq, inArray, isNull, type Db, type Transaction } from '@anavi/backend/src/db'
import { catCategory, catProduct } from '@anavi/backend/src/db/schema/cat'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { asSiteId, type SiteId } from '@anavi/backend/src/db/ids'
import {
  answerSupply,
  inviteSupply,
  setSelection,
} from '@anavi/backend/src/modules/catalog/supply.service'
import { follow } from '@anavi/backend/src/modules/subscription/follow.service'
import { seedDyikanShelves } from './dyikan/seed'
import {
  listPlacements,
  placeProducts,
  updatePlacement,
} from '@anavi/backend/src/modules/catalog/placement.service'

/*
 * Agreements BETWEEN demos, and therefore in neither of them.
 *
 * A supply names two sites and belongs to neither: written into one demo's `index.ts` it would make
 * that demo unable to be seeded alone, and the second partnership would have nowhere obvious to go.
 * Runs after every demo and after the ageing pass, because the ageing pass moves prices through the
 * variant service and a placement's price bounds are a snapshot taken from the product's own.
 */
export async function seedSupplies(tx: Db | Transaction = db): Promise<void> {
  await meatRow(tx)
}

async function siteBySlug(slug: string, tx: Db | Transaction): Promise<SiteId> {
  const [row] = await tx
    .select({ id: orgSite.id })
    .from(orgSite)
    .where(and(eq(orgSite.slug, slug), isNull(orgSite.deletedAt)))
    .limit(1)
  if (!row) throw new Error(`supplies: no site «${slug}»`)
  return asSiteId(row.id)
}

/**
 * Where each of the butcher's sections lands in the market's own tree — and, by being exactly this
 * list, WHICH of them travel at all.
 *
 * `marinady` is deliberately absent. A market rents out a meat ROW: prepared food is a different
 * trade with a different shelf life, and the butcher's marinades are the half of his business that
 * he sells himself. The keys here are handed to `setSelection` below, so this map is the single
 * place that decides both questions and the two cannot drift apart.
 */
const SECTIONS: Record<string, string> = {
  govyadina: 'myaso',
  baranina: 'myaso',
  ptica: 'ptica',
}

/**
 * The market's meat row, rented to a butcher.
 *
 * «Дыйкан» sells no meat of his own — the fourteen cuts left his catalogue with this fixture — and
 * the row fills itself from «Халиф» at the same fourteen addresses. Everything here goes through the
 * doors a person would use and in the order a person would use them: the shop calls, the supplier
 * answers, the supplier decides what leaves, and only then does the shop lay anything out.
 */
async function meatRow(tx: Db | Transaction): Promise<void> {
  const shop = await siteBySlug('demo5', tx)
  const supplier = await siteBySlug('demo11', tx)

  const supply = await inviteSupply(shop, { address: 'demo11' }, tx)
  await answerSupply(supplier, supply.id, 'accept', tx)

  /*
   * The raw counter and not the whole catalogue.
   *
   * This used to be `scope: 'all'` with a note that a butcher's entire catalogue IS the meat row,
   * and that stopped being true the day marinades arrived: the market would have been laying out
   * somebody else's prepared food beside its own vegetables. Naming the sections by hand is also
   * the only version of this fixture that DEMONSTRATES the feature — a supplier deciding what
   * leaves — instead of asserting there was nothing to decide.
   */
  const sending = await categoryIds(supplier, Object.keys(SECTIONS), tx)
  await setSelection(
    supplier,
    supply.id,
    { scope: 'picked', targets: sending.map((id) => ({ type: 'category', id: String(id) })) },
    tx,
  )

  const goods = await tx
    .select({ id: catProduct.id, slug: catProduct.slug, categoryId: catProduct.categoryId })
    .from(catProduct)
    .where(
      and(
        eq(catProduct.siteId, supplier),
        isNull(catProduct.deletedAt),
        inArray(catProduct.categoryId, sending),
      ),
    )

  const laid = await placeProducts(shop, { productIds: goods.map((one) => String(one.id)) }, tx)
  // Never skipped in silence: a refusal here means an address collided or the offer does not reach,
  // and a demo that quietly lays out eleven of fourteen looks finished and is not.
  if (laid.refused.length > 0) {
    throw new Error(
      `supplies: the market refused ${laid.refused
        .map((one) => `${one.name || one.productId} (${one.reason})`)
        .join(', ')}`,
    )
  }

  /*
   * И рынок встаёт за прилавком лавки: подписка организации на чужой каталог.
   *
   * Та же таблица, что у покупателя, следящего за магазином, и тот же утренний обход — только вторая
   * его половина, которая говорит не человеку, а бизнесу в его бэкофис. Она была построена и не
   * работала ни разу, потому что ни одна организация ни на что не подписана: `sub_follow` знал
   * только карточки. Место здесь, а не в демо: подписка называет два сайта, как и сама поставка.
   */
  const [market] = await tx
    .select({ orgId: orgSite.orgId })
    .from(orgSite)
    .where(eq(orgSite.id, shop))
    .limit(1)
  await follow(supplier, { type: 'org', id: market!.orgId }, tx)

  const rows = await listPlacements(shop, tx)
  const sections = await sectionSlugs(
    supplier,
    rows.map((row) => row.product.categoryId),
    tx,
  )

  for (const row of rows) {
    const from = row.product.categoryId === null ? undefined : sections.get(row.product.categoryId)
    const into = from ? SECTIONS[from] : undefined
    if (!into) throw new Error(`supplies: nowhere to put «${row.placement.slug}» on the market`)
    await updatePlacement(
      shop,
      row.placement.id,
      // Eighteen per cent on everything, one decision rather than fourteen: the butcher's prices sit
      // at 0.759–0.916 of what this shelf used to ask, so the markup returns the row to roughly its
      // old numbers and stays clear of the upper bound. A markup below that bound would put the
      // market's price under its own purchase price.
      { category: into, markupKind: 'percent', markupValue: 18 },
      tx,
    )
  }

  // Built here and not in the demo, because two of them name meat and the meat only exists on this
  // shelf as of the line above.
  await seedDyikanShelves(shop, tx)
}

/**
 * The supplier's section ids by slug, in the order the map names them.
 *
 * Refuses a slug it cannot find rather than sending less than intended: a supply quietly missing a
 * whole section looks like a working fixture and is not.
 */
async function categoryIds(
  siteId: SiteId,
  slugs: readonly string[],
  tx: Db | Transaction,
): Promise<bigint[]> {
  const rows = await tx
    .select({ id: catCategory.id, slug: catCategory.slug })
    .from(catCategory)
    .where(
      and(
        eq(catCategory.siteId, siteId),
        inArray(catCategory.slug, [...slugs]),
        isNull(catCategory.deletedAt),
      ),
    )
  const found = new Map(rows.map((row) => [row.slug, row.id]))
  const missing = slugs.filter((slug) => !found.has(slug))
  if (missing.length > 0) throw new Error(`supplies: no section «${missing.join(', ')}» to send`)
  return slugs.map((slug) => found.get(slug)!)
}

/** The supplier's own section slugs by id — read once rather than per card. */
async function sectionSlugs(
  siteId: SiteId,
  ids: readonly (bigint | null)[],
  tx: Db | Transaction,
): Promise<Map<bigint, string>> {
  const wanted = [...new Set(ids.filter((one): one is bigint => one !== null))]
  if (wanted.length === 0) return new Map()
  const rows = await tx
    .select({ id: catCategory.id, slug: catCategory.slug })
    .from(catCategory)
    .where(and(eq(catCategory.siteId, siteId), inArray(catCategory.id, wanted)))
  return new Map(rows.map((row) => [row.id, row.slug]))
}
