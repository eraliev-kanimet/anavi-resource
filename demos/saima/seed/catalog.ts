import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { toMinor, type LocalizedLabel } from '@anavi/shared'
import { openingStock, workshopCard } from '../../../seed/lib/books'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { ProductValueInput } from '@anavi/shared/schemas'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createGroup } from '@anavi/backend/src/modules/dictionary/group.service'
import { createLine } from '@anavi/backend/src/modules/catalog/line.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/dictionary/property.service'
import { createSelection } from '@anavi/backend/src/modules/catalog/selection.service'
import {
  createType,
  typeOfKind,
  setTypeProperties,
} from '@anavi/backend/src/modules/dictionary/type.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { findImage, seedImage } from '../../../seed/lib/assets'
import {
  SAIMA_GARMENTS,
  SAIMA_GROUPS,
  SAIMA_ORG,
  SAIMA_PROPERTIES,
  SAIMA_SHELVES,
  SAIMA_TYPES,
  type SaimaGarment,
} from './index'
import { paragraphsOf } from '../../../seed/lib/labels'
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
  for (const group of SAIMA_GROUPS)
    await createGroup(siteId, { slug: group.slug, name: group.name }, tx)

  for (const definition of SAIMA_PROPERTIES) {
    const property = await createProperty(
      siteId,
      {
        slug: definition.slug,
        name: definition.name,
        kind: definition.kind,
        group: definition.group,
        ...(definition.unit ? { unit: definition.unit } : {}),
        isFilterable: false,
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

  for (const definition of SAIMA_TYPES) {
    await createType(siteId, { slug: definition.slug, name: definition.name }, tx)
    const type = (await typeOfKind(siteId, definition.slug, 'product', tx))!
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
  for (const shelf of SAIMA_SHELVES) {
    const row = await createCategory(
      siteId,
      {
        slug: shelf.slug,
        name: shelf.name,
        // shelf and product type share identical names because they represent the same concept
        type: shelf.slug,
        description: paragraphsOf([shelf.description]),
      },
      tx,
    )
    shelves.set(shelf.slug, row.id)

    const cover = await findImage(`demos/saima/shelves/${shelf.cover}.webp`, shelf.name.ru)
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
  // the models pinned so far — see below
  let pinned = 0
  let counter = 0
  const halls = await listPlaces(siteId, tx)

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
          ...(lineId === null ? {} : { lineId, isLinePrimary: order === 0 }),
          // Two models pinned by hand, on purpose — the face card of each: the rest stand by the site's
          // own rule, and these show what a place given by the owner does.
          position: order === 0 && pinned < 2 ? ++pinned : 0,
        },
        tx,
      )
      // Sewn here: its card is written from the books' own once the cloth is on the shelf.
      workshopCard(product.id, modification.slug)

      for (const [index, size] of item.sizes.entries()) {
        const variant = await createVariant(
          siteId,
          product.id,
          {
            values: { razmer: String(size) },
            sku: `${modification.slug}-${size}`.toUpperCase(),
            price: toMinor(item.price, SAIMA_ORG.currency),
            weight: weightOf(item, index),
            position: index,
            isPrimary: index === 0,
          },
          tx,
        )
        // Two showrooms, each with its own rail: the workshop's rail on Ibraimova, a showroom's few in Alamedin.
        const stock = stockOf(counter + index)
        const there = halls.length > 1 ? Math.floor(stock * 0.15) : 0
        openingStock(variant.id, stock - there, halls[0]?.id ?? null)
        if (there > 0) openingStock(variant.id, there, halls[1]!.id)
      }
      counter += item.sizes.length

      // Two shots per product, webp for cards vs jpg for lifestyle scenes — documented in factory assets
      // and media guidelines; these represent photography conventions rather than seed logic.
      for (const shot of [1, 2]) {
        const image = await seedImage(
          `demos/saima/products/${modification.stem}-${shot}.webp`,
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
      ru: 'Вещи вне сезона — те, что стоят в отшиве круглый год и не ждут сезона.',
      en: 'Year-round essential staples continuously in production outside seasonal drops.',
      ar: 'قطع كلاسيكية غير مرتبطة بموسم — ننتجها على مدار العام بشكل مستمر دون انتظار تشكيلات جديدة.',
    },
    values: 'sezon:bazovoe',
  },
  {
    slug: 'berut-rostovkami',
    name: {
      ru: 'Чаще всего заказывают',
      en: 'Most ordered models',
      ar: 'الموديلات الأكثر طلباً',
    },
    description: {
      ru: 'Модели, которые магазины и селлеры заказывают чаще всего — размерным рядом и по нескольку раз в сезон.',
      en: 'The models boutiques and sellers order most often — in full size runs, several times a season.',
      ar: 'الموديلات التي تطلبها المتاجر والبائعون أكثر من غيرها — بسلسلة المقاسات الكاملة عدة مرات في الموسم.',
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
  for (const item of SAIMA_SELECTIONS)
    await createSelection(
      siteId,
      {
        slug: item.slug,
        name: item.name,
        description: paragraphsOf([item.description]),
        ...(item.values
          ? { mode: 'filter' as const, shelf: { values: item.values.split(',') } }
          : { mode: 'manual' as const, products: item.products }),
      },
      tx,
    )
}
