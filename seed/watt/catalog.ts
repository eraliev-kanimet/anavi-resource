import { setAddons } from '@anavi/backend/src/modules/catalog/addon.service'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { FilterWidget, LocalizedLabel, PropertyKind } from '@anavi/shared'
import type { ProductValueInput } from '@anavi/backend/src/modules/catalog/catalog.schema'
import { createGroup } from '@anavi/backend/src/modules/catalog/group.service'
import {
  createProperty,
  createValue,
  findPropertyBySlug,
  listValues,
} from '@anavi/backend/src/modules/catalog/property.service'
import {
  createType,
  findTypeBySlug,
  setTypeProperties,
  setTypeSummary,
} from '@anavi/backend/src/modules/catalog/type.service'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { receiveStock } from '@anavi/backend/src/modules/catalog/stock.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { seedImage } from '../assets'
import { resourceJson } from '../resource'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Nothing is written out by hand here: what IS a decision lives in the import — which shelves
// exist, what a card says under a name, where the filter panel stops. This file walks the result
// through the service layer, so the demo is built by the same validation the back office uses.
const read = <T>(name: string): Promise<T> => resourceJson<T>(`watt/data/${name}.json`)

interface Group {
  slug: string
  name: LocalizedLabel
}

interface Section {
  slug: string
  name: LocalizedLabel
}

interface Value {
  slug: string
  key: string
  label: LocalizedLabel
}

interface Property {
  slug: string
  name: LocalizedLabel
  kind: PropertyKind
  unit?: LocalizedLabel
  group: string
  values?: Value[]
}

interface Binding {
  property: string
  group: string
  isFilterable?: boolean
  filterWidget?: FilterWidget
  isMultivalued?: boolean
  showInCard?: boolean
}

interface Type {
  slug: string
  name: LocalizedLabel
  section: string
  summary: LocalizedLabel[]
  properties: Binding[]
}

interface Product {
  shelf: string
  slug: string
  // the name the photographs carry on disk, which is the source's slug and not always a slug
  photo: string
  name: LocalizedLabel
  sku: string
  brand: string | null
  price: number
  old: number | null
  photos: number
  values: Record<string, unknown>
}

// The two currencies happen to run near parity, so the arithmetic is almost identity — inventing a
// coefficient to make the prices «local» would only make them wrong twice.
const RATE = 0.97

function som(roubles: number): number {
  return Math.round((roubles * RATE) / 10) * 10 * 100
}

const BRAND = 'brand'

function brandSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function seedCatalog(siteId: SiteId, tx: Db | Transaction) {
  const [groups, sections, properties, types, products] = await Promise.all([
    read<Group[]>('groups'),
    read<Section[]>('sections'),
    read<Property[]>('properties'),
    read<Type[]>('types'),
    read<Product[]>('products'),
  ])

  for (const [index, group] of groups.entries())
    await createGroup(siteId, { slug: group.slug, name: group.name, position: index }, tx)

  const brands = [...new Set(products.map((one) => one.brand).filter((one) => one !== null))].sort()
  await createProperty(
    siteId,
    {
      slug: BRAND,
      name: { ru: 'Производитель', en: 'Brand', ar: 'الشركة المصنعة' },
      kind: 'enum',
      group: 'main',
      isFilterable: false,
      position: 0,
    },
    tx,
  )
  const brandProperty = (await findPropertyBySlug(siteId, BRAND, tx))!
  for (const brand of brands)
    await createValue(
      siteId,
      brandProperty.id,
      { slug: brandSlug(brand), label: { ru: brand, en: brand, ar: brand } },
      tx,
    )

  for (const [index, property] of properties.entries()) {
    await createProperty(
      siteId,
      {
        slug: property.slug,
        name: property.name,
        kind: property.kind,
        unit: property.unit ?? null,
        group: property.group,
        // Filtering is a statement about one shelf, not about the word: "Capacity" sorts kettles and reads as
        // a line of text on a microwave.
        isFilterable: false,
        position: index + 1,
      },
      tx,
    )
    if (!property.values?.length) continue
    const created = (await findPropertyBySlug(siteId, property.slug, tx))!
    for (const value of property.values)
      await createValue(siteId, created.id, { slug: value.slug, label: value.label }, tx)
  }

  for (const [index, type] of types.entries()) {
    await createType(
      siteId,
      { slug: type.slug, name: type.name, kind: 'product', position: index },
      tx,
    )
    const created = (await findTypeBySlug(siteId, type.slug, tx))!
    await setTypeProperties(
      siteId,
      created.id,
      {
        properties: [
          {
            property: BRAND,
            group: 'main',
            isRequired: false,
            isFilterable: true,
            isMultivalued: false,
            showInCard: false,
            filterWidget: 'checkbox' as const,
          },
          ...type.properties.map((binding) => ({
            property: binding.property,
            group: binding.group,
            isRequired: false,
            isFilterable: binding.isFilterable ?? false,
            isMultivalued: binding.isMultivalued ?? false,
            showInCard: binding.showInCard ?? false,
            filterWidget: binding.filterWidget ?? null,
          })),
        ],
      },
      tx,
    )
    await setTypeSummary(
      siteId,
      created.id,
      { segments: type.summary.map((template) => ({ template })) },
      tx,
    )
  }

  // The parent holds no goods of its own: "Major appliances" is how you get to the refrigerator
  // shelf, not where a refrigerator lives.
  const shelves = new Map<string, bigint>()
  const parents = new Map<string, bigint>()
  for (const [index, section] of sections.entries()) {
    const parent = await createCategory(
      siteId,
      { slug: section.slug, name: section.name, position: index * 100 },
      tx,
    )
    // The block on the home page draws the ROOTS of the tree, so a section needs its own photograph.
    parents.set(section.slug, parent.id)
    await attachCover(siteId, parent.id, section.slug, tx)
    const inside = types.filter((type) => type.section === section.slug)
    for (const [order, type] of inside.entries()) {
      const shelf = await createCategory(
        siteId,
        {
          slug: type.slug,
          name: type.name,
          parentId: parent.id,
          type: type.slug,
          position: index * 100 + order,
        },
        tx,
      )
      shelves.set(type.slug, shelf.id)
      await attachCover(siteId, shelf.id, type.slug, tx)
    }
  }

  /*
   * Three halls, and the shelf is divided between them rather than standing as one number.
   *
   * Two showrooms and a warehouse, and what the shop actually looks like is that the warehouse keeps
   * most of it, Zhibek Zholu keeps a working stock and Akhunbaev keeps less — with some models
   * simply absent from a showroom, which is the whole point: «we have it, at Zhibek Zholu» is the
   * answer the shop gives on the telephone all day and could not give on its own site.
   *
   * Deterministic, like every other number in this fixture: a demo that reshuffles itself on every
   * reset cannot be looked at twice.
   */
  const places = await listPlaces(siteId, tx)
  const spread = (total: number, index: number): number[] => {
    if (places.length < 2) return [total]
    // Every fifth model is out of the second showroom, and every third out of the first: a shelf
    // where everything is everywhere teaches nobody anything.
    const shares = [index % 3 === 0 ? 0 : 2, index % 5 === 0 ? 0 : 1]
    const showrooms = shares.map((share) => Math.min(total, Math.round((total * share) / 10)))
    const taken = showrooms.reduce((sum, one) => sum + one, 0)
    return [...showrooms, total - taken].slice(0, places.length)
  }

  const byKind = new Map(properties.map((property) => [property.slug, property]))
  // Which appliances stand on which shelf — what the accessories below are offered alongside.
  const onShelf = new Map<string, bigint[]>()
  let count = 0
  for (const [index, product] of products.entries()) {
    const categoryId = shelves.get(product.shelf)
    if (!categoryId) continue

    const out: ProductValueInput[] = []
    if (product.brand) out.push({ property: BRAND, value: brandSlug(product.brand) })
    for (const [slug, raw] of Object.entries(product.values)) {
      const property = byKind.get(slug)
      if (!property) continue
      if (property.kind === 'bool') out.push({ property: slug, bool: raw === true })
      else if (property.kind === 'number' && typeof raw === 'number')
        out.push({ property: slug, number: raw })
      else if (property.kind === 'text') {
        if (typeof raw === 'object' && raw !== null)
          out.push({ property: slug, text: raw as LocalizedLabel })
        else if (typeof raw === 'string') out.push({ property: slug, text: { ru: raw } })
      } else if (Array.isArray(raw))
        for (const one of raw) {
          const value = property.values?.find((entry) => entry.key === one)
          if (value) out.push({ property: slug, value: value.slug })
        }
    }

    const created = await createProduct(
      siteId,
      {
        slug: product.slug,
        name: product.name,
        type: product.shelf,
        categoryId,
        values: out,
        position: index,
      },
      tx,
    )

    // the source sells a different colour as a different article, which is a line, not a variant
    const variant = await createVariant(
      siteId,
      created.id,
      {
        sku: product.sku,
        price: som(product.price),
        ...(product.old ? { oldPrice: som(product.old) } : {}),
        // No opening balance here on purpose: the goods arrive hall by hall below, and the journal
        // then reads as three deliveries to three addresses — which is what actually happened.
        isPrimary: true,
      },
      tx,
    )

    onShelf.set(product.shelf, [...(onShelf.get(product.shelf) ?? []), created.id])

    const onHand = 2 + ((index * 7) % 14)
    for (const [at, qty] of spread(onHand, index).entries()) {
      if (qty <= 0) continue
      await receiveStock(variant.id, qty, { placeId: places[at]?.id ?? null }, tx)
    }

    for (let n = 1; n <= product.photos; n++) {
      const image =
        (await seedImage(`watt/products/${product.photo}-${n}.jpg`).catch(() => null)) ??
        (await seedImage(`watt/products/${product.photo}-${n}.jpeg`).catch(() => null)) ??
        (await seedImage(`watt/products/${product.photo}-${n}.png`).catch(() => null))
      if (!image) continue
      await attachMedia(
        siteId,
        'product',
        created.id,
        {
          key: image.key,
          width: image.width,
          height: image.height,
          caption: product.name,
        },
        tx,
      )
    }
    count++
  }

  await seedBrandMarks(siteId, tx)
  await seedAccessories(siteId, parents, onShelf, places.at(-1)?.id ?? null, tx)
  return count
}

interface Accessories {
  shelves: { slug: string; section: string; name: LocalizedLabel }[]
  products: {
    shelf: string
    slug: string
    sku: string
    // whole soms, unlike the appliances above: these were priced here and not converted
    price: number
    stock: number
    name: LocalizedLabel
    summary: LocalizedLabel
    /** the shelves of appliances this is taken alongside */
    for: string[]
  }[]
}

/**
 * What is taken ALONGSIDE an appliance: the hose a washing machine needs, the cable a built-in oven
 * is sold without, the descaler a kettle wants once a month.
 *
 * The source catalogue holds appliances only, so «bought together» had nothing to offer and stood
 * empty on every demo since it was built. These are the shop's own small goods, on three shelves of
 * their own under the sections that already exist — an accessory is goods like any other, found in
 * the catalogue and sold by itself — and each names the SHELVES it goes with, not the models: a
 * hose fits every washing machine in the shop, and a list of twenty-eight slugs would be a second
 * catalogue kept by hand.
 *
 * No type and no characteristics: a hose is not compared by a table of properties. No photographs
 * either — there are none in the library yet — so the card draws its placeholder until somebody
 * shoots them.
 */
async function seedAccessories(
  siteId: SiteId,
  parents: Map<string, bigint>,
  onShelf: Map<string, bigint[]>,
  placeId: bigint | null,
  tx: Db | Transaction,
) {
  const material = await resourceJson<Accessories>('watt/accessories.json')
  const shelves = new Map<string, bigint>()
  for (const [index, shelf] of material.shelves.entries()) {
    const parentId = parents.get(shelf.section)
    if (!parentId) throw new Error(`watt: no section «${shelf.section}» for accessories`)
    const made = await createCategory(
      siteId,
      // After the appliances of the section: an accessory shelf is where a buyer ends up, not
      // where they start.
      { slug: shelf.slug, name: shelf.name, parentId, position: 900 + index },
      tx,
    )
    shelves.set(shelf.slug, made.id)
  }

  // Which accessories each appliance is offered with, gathered before a single link is written:
  // the door takes the whole set of one product at once.
  const offered = new Map<bigint, string[]>()
  for (const [index, item] of material.products.entries()) {
    const created = await createProduct(
      siteId,
      {
        slug: item.slug,
        name: item.name,
        summary: item.summary,
        categoryId: shelves.get(item.shelf)!,
        position: 10_000 + index,
      },
      tx,
    )
    const variant = await createVariant(
      siteId,
      created.id,
      { sku: item.sku, price: item.price * 100, isPrimary: true },
      tx,
    )
    // Small goods live in the warehouse and are brought out with the appliance.
    await receiveStock(variant.id, item.stock, { placeId }, tx)
    for (const shelf of item.for) {
      const appliances = onShelf.get(shelf)
      if (!appliances) throw new Error(`watt: «${item.slug}» goes with no shelf «${shelf}»`)
      for (const id of appliances) offered.set(id, [...(offered.get(id) ?? []), item.slug])
    }
  }
  for (const [productId, slugs] of offered) await setAddons(siteId, productId, { slugs }, tx)
}

// Section and shelf assets live in the same folder: `watt/categories/<slug>.webp`, where name is the path.
async function attachCover(siteId: SiteId, categoryId: bigint, slug: string, tx: Db | Transaction) {
  const image = await seedImage(`watt/categories/${slug}.webp`).catch(() => null)
  if (!image) return
  await attachMedia(
    siteId,
    'category',
    categoryId,
    { key: image.key, width: image.width, height: image.height },
    tx,
  )
}

// Marks hang on the VALUE of the property, not on the goods: one Bosch mark serves every Bosch
// appliance.
async function seedBrandMarks(siteId: SiteId, tx: Db | Transaction) {
  const property = await findPropertyBySlug(siteId, BRAND, tx)
  if (!property) return
  for (const { value } of await listValues(siteId, property.id, tx)) {
    const image = await seedImage(`watt/brands/${value.slug}.png`).catch(() => null)
    if (!image) continue
    await attachMedia(
      siteId,
      'property_value',
      value.id,
      { key: image.key, width: image.width, height: image.height },
      tx,
    )
  }
}
