import { toMinor, type LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { ProductValueInput } from '@anavi/backend/src/modules/catalog/catalog.schema'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createGroup } from '@anavi/backend/src/modules/catalog/group.service'
import { createLine } from '@anavi/backend/src/modules/catalog/line.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/catalog/property.service'
import { createSelection } from '@anavi/backend/src/modules/catalog/selection.service'
import {
  createType,
  findTypeBySlug,
  setTypeProperties,
} from '@anavi/backend/src/modules/catalog/type.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { findImage, seedImage } from '../assets'
import {
  SAIMA_GARMENTS,
  SAIMA_GROUPS,
  SAIMA_ORG,
  SAIMA_PROPERTIES,
  SAIMA_SHELVES,
  SAIMA_TIERS,
  SAIMA_TYPES,
  type SaimaGarment,
} from './index'
import { paragraphsOf } from '../labels'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Factory warehouse stock rather than store shelf: the collection is produced in batches and stored by size runs,
// so quantities are in hundreds. 40 to 300 units suffices to cross the first three volume discount tiers;
// the final tier (300+) remains production-on-demand via inquiry — 300 coats of one size are never held in stock.
// Zero indicates an out-of-stock size: size 48 sold out while 42 remains. Quantities are deterministically
// assigned by index to ensure seed reproducibility.
function stockOf(index: number): number {
  return index % 17 === 5 ? 0 : 40 + ((index * 37) % 260)
}

// Properties are registered as non-filterable by default, with filtering enabled on type bindings:
// the site dictionary sets defaults, while product types refine them per catalog needs.
export async function seedDictionary(siteId: SiteId, tx: Db | Transaction) {
  for (const [index, group] of SAIMA_GROUPS.entries())
    await createGroup(siteId, { slug: group.slug, name: group.name, position: index }, tx)

  for (const [index, definition] of SAIMA_PROPERTIES.entries()) {
    const property = await createProperty(
      siteId,
      {
        slug: definition.slug,
        name: definition.name,
        kind: definition.kind,
        group: definition.group,
        ...(definition.unit ? { unit: definition.unit } : {}),
        isFilterable: false,
        position: index,
      },
      tx,
    )
    for (const [order, value] of (definition.values ?? []).entries())
      await createValue(
        siteId,
        property.id,
        {
          slug: value.slug,
          label: value.label,
          ...(value.swatch ? { swatch: value.swatch } : {}),
          position: order,
        },
        tx,
      )
  }

  for (const [index, definition] of SAIMA_TYPES.entries()) {
    await createType(siteId, { slug: definition.slug, name: definition.name, position: index }, tx)
    const type = (await findTypeBySlug(siteId, definition.slug, tx))!
    await setTypeProperties(
      siteId,
      type.id,
      {
        properties: definition.properties.map((slug, order) => {
          const property = SAIMA_PROPERTIES.find((item) => item.slug === slug)!
          return {
            property: slug,
            group: property.group,
            isFilterable: property.isFilterable !== false,
            isMultivalued: property.isMultivalued ?? false,
            showInCard: property.showInCard ?? false,
            filterWidget: property.filterWidget ?? null,
            position: order,
          }
        }),
      },
      tx,
    )
  }
}

export async function seedShelves(siteId: SiteId, tx: Db | Transaction) {
  const shelves = new Map<string, bigint>()
  for (const [index, shelf] of SAIMA_SHELVES.entries()) {
    const row = await createCategory(
      siteId,
      {
        slug: shelf.slug,
        name: shelf.name,
        // shelf and product type share identical names because they represent the same concept
        type: shelf.slug,
        description: paragraphsOf([shelf.description]),
        position: index,
      },
      tx,
    )
    shelves.set(shelf.slug, row.id)

    const cover = await findImage(`saima/shelves/${shelf.cover}.webp`, shelf.name.ru)
    if (!cover) continue
    await attachMedia(
      siteId,
      'category',
      row.id,
      { key: cover.key, width: cover.width, height: cover.height, caption: shelf.name },
      tx,
    )
  }
  return shelves
}

// Intrinsic garment attributes are product properties; size is the variant axis and omitted here.
function valuesOf(item: SaimaGarment, cvet: string): ProductValueInput[] {
  const out: ProductValueInput[] = [`cvet:${cvet}`, `tkan:${item.tkan}`, `sostav:${item.sostav}`]
  for (const season of item.sezon) out.push(`sezon:${season}`)
  if (item.dlina) out.push(`dlina:${item.dlina}`)
  if (item.rukav) out.push(`rukav:${item.rukav}`)
  if (item.posadka) out.push(`posadka:${item.posadka}`)
  if (item.plotnost !== undefined) out.push({ property: 'plotnost', number: item.plotnost })
  if (item.podklad !== undefined) out.push({ property: 'podklad', bool: item.podklad })
  if (item.predmetov !== undefined) out.push({ property: 'predmetov', number: item.predmetov })
  return out
}

interface Modification {
  slug: string
  name: LocalizedLabel
  cvet: string
  stem: string
}

// Color variations of the same model form a product line rather than separate products: catalog cards show
// the price range of the group, and garment pages display a color switcher. The primary color matches the category cover photo.
function modificationsOf(item: SaimaGarment): Modification[] {
  return [
    { slug: item.slug, name: item.name, cvet: item.cvet, stem: item.slug },
    ...(item.colours ?? []).map((colour) => ({
      slug: `${item.slug}-${colour.key}`,
      name: {
        ru: `${item.name.ru}, ${colour.suffix.ru}`,
        en: `${item.name.en}, ${colour.suffix.en}`,
        ar: `${item.name.ar}, ${colour.suffix.ar}`,
      },
      cvet: colour.cvet,
      stem: `${item.slug}-${colour.key}`,
    })),
  ]
}

/*
 * What a folded garment weighs in its bag, in grams — by what kind of thing it is, a little more
 * with every size up. The workshop sends to the south by a carrier's tariff, and a tariff reads
 * weight: a dress with none stated turned every such order into an estimate with the delivery
 * unnamed. A set weighs its pieces together.
 */
const SHELF_GRAMS: Record<string, number> = {
  platya: 420,
  bluzy: 230,
  bryuki: 480,
  komplekty: 380,
  trikotazh: 340,
  verhnyaya: 1150,
}

function weightOf(item: SaimaGarment, sizeIndex: number): number {
  const base = (SHELF_GRAMS[item.shelf] ?? 400) * (item.predmetov ?? 1)
  return Math.round((base * (1 + sizeIndex * 0.03)) / 10) * 10
}

// Size divides garments into variants — the first demo in the project using size rather than packaging as an axis.
// Photos attach to the product entity: sizes 42 and 50 are photographed in the same frame, as no factory shoots individual sizes.
export async function seedGarments(
  siteId: SiteId,
  shelves: Map<string, bigint>,
  tx: Db | Transaction,
) {
  let position = 0
  let counter = 0

  for (const item of SAIMA_GARMENTS) {
    const modifications = modificationsOf(item)
    const lineId =
      modifications.length > 1
        ? (await createLine(siteId, { slug: item.slug, name: item.name }, tx)).id
        : null

    for (const [order, modification] of modifications.entries()) {
      const product = await createProduct(
        siteId,
        {
          slug: modification.slug,
          name: modification.name,
          summary: item.summary,
          description: paragraphsOf([item.text]),
          categoryId: shelves.get(item.shelf)!,
          values: valuesOf(item, modification.cvet),
          options: ['razmer'],
          tiers: SAIMA_TIERS,
          ...(lineId === null ? {} : { lineId, isLinePrimary: order === 0 }),
          position: position++,
        },
        tx,
      )

      for (const [index, size] of item.sizes.entries())
        await createVariant(
          siteId,
          product.id,
          {
            values: { razmer: String(size) },
            sku: `${modification.slug}-${size}`.toUpperCase(),
            price: toMinor(item.price, SAIMA_ORG.currency),
            weight: weightOf(item, index),
            stock: stockOf(counter + index),
            position: index,
            isPrimary: index === 0,
          },
          tx,
        )
      counter += item.sizes.length

      // Two shots per product, webp for cards vs jpg for lifestyle scenes — documented in factory assets
      // and media guidelines; these represent photography conventions rather than seed logic.
      for (const shot of [1, 2]) {
        const image = await seedImage(
          `saima/products/${modification.stem}-${shot}.webp`,
          modification.name.ru,
        )
        await attachMedia(
          siteId,
          'product',
          product.id,
          {
            key: image.key,
            width: image.width,
            height: image.height,
            caption: modification.name,
          },
          tx,
        )
      }
    }
  }
}

// Two dynamic filter-based selections; a third curated explicitly: "popular by size run"
// cannot be derived from fabric or season — it reflects factory shipping history.
export const SAIMA_SELECTIONS = [
  {
    slug: 'lnyanaya-liniya',
    name: { ru: 'Льняная линия', en: 'Linen collection', ar: 'تشكيلة الكتان الطبيعي' },
    description: {
      ru: 'Всё, что шьётся из стираного льна: платье, рубашка, шорты, плащ и летний комплект.',
      en: 'Everything crafted from washed softened linen: dresses, shirts, shorts, duster coats, and summer sets.',
      ar: 'كل ما يُصنع من الكتان المغسول المعالج: فساتين، قمصان، شورتات، معاطف خفيفة وأطقم صيفية.',
    },
    values: 'tkan:len',
  },
  {
    slug: 'bazovyj-garderob',
    name: { ru: 'Базовый гардероб', en: 'Essential wardrobe', ar: 'الملابس الأساسية اليومية' },
    description: {
      ru: 'Вещи вне сезона — те, что стоят в отшиве круглый год и не ждут коллекции.',
      en: 'Year-round essential staples continuously in production outside seasonal drops.',
      ar: 'قطع كلاسيكية غير مرتبطة بموسم — ننتجها على مدار العام بشكل مستمر دون انتظار تشكيلات جديدة.',
    },
    values: 'sezon:bazovoe',
  },
  {
    slug: 'berut-rostovkami',
    name: {
      ru: 'Берут ростовками',
      en: 'Wholesale bestsellers',
      ar: 'الأكثر طلباً بالمقاسات الكاملة',
    },
    description: {
      ru: 'Позиции, которые магазины и селлеры заказывают чаще всего — размерным рядом и по нескольку раз в сезон.',
      en: 'The most popular styles ordered by boutiques and sellers in full size runs multiple times per season.',
      ar: 'الموديلات الأكثر طلباً من المتاجر وتجار التجزئة بسلسلة المقاسات الكاملة عدة مرات في الموسم.',
    },
    products: [
      'top-bazovyj',
      'futbolka',
      'longsliv',
      'plate-midi-poyas',
      'plate-rubashka',
      'rubashka-oversize',
      'svitshot',
      'hudi',
    ],
  },
]

export async function seedSelections(siteId: SiteId, tx: Db | Transaction) {
  for (const [index, item] of SAIMA_SELECTIONS.entries())
    await createSelection(
      siteId,
      {
        slug: item.slug,
        name: item.name,
        description: paragraphsOf([item.description]),
        ...(item.values
          ? { mode: 'filter' as const, shelf: { values: item.values.split(',') } }
          : { mode: 'manual' as const, products: item.products }),
        position: index,
      },
      tx,
    )
}
