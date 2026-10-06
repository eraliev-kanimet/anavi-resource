import { and, asc, eq, inArray, isNull } from '@anavi/backend/src/db'
import { toMinor, type LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catProduct } from '@anavi/backend/src/db/schema/cat'
import type { ProductValueInput } from '@anavi/backend/src/modules/catalog/catalog.schema'
import { seedOrgWithSite } from '../owner'
import {
  setSiteLogo,
  setSitePublished,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { setOrgVerification } from '@anavi/backend/src/modules/admin/admin.service'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createSelection } from '@anavi/backend/src/modules/catalog/selection.service'
import { createGroup } from '@anavi/backend/src/modules/catalog/group.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/catalog/property.service'
import {
  createType,
  findTypeBySlug,
  setTypeProperties,
} from '@anavi/backend/src/modules/catalog/type.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { setStructure, updateForm } from '@anavi/backend/src/modules/form/form.service'
import { checkoutForm } from '@anavi/backend/src/modules/form/form.public'
import { assetFile, seedImage } from '../assets'
import { seedPlaces } from '../places'
import { createRule } from '@anavi/backend/src/modules/order/rule.service'
import { setSlots } from '@anavi/backend/src/modules/order/slot.service'
import {
  DYIKAN_GROUP,
  DYIKAN_CATALOG,
  DYIKAN_CONTACTS,
  DYIKAN_HOME,
  DYIKAN_ORG,
  DYIKAN_PLACES,
  DYIKAN_PRICE,
  DYIKAN_PRIVACY,
  DYIKAN_PRODUCTS,
  DYIKAN_PROPERTIES,
  DYIKAN_SELECTIONS,
  DYIKAN_SHELVES,
  DYIKAN_TYPE,
  type DyikanProduct,
  type DyikanShelf,
} from './index'
import { paragraphsOf } from '../labels'
import { seedWidget } from '../widget'
import { seedRequisite } from '../requisite'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Explicit zero in seed data indicates an out-of-stock item that must reject cart addition.
// All other stock quantities are computed deterministically by index: seeds must be strictly reproducible.
function stockOf(explicit: number | undefined, index: number): number {
  return explicit ?? 12 + ((index * 13) % 40)
}

/*
 * What one unit weighs, in grams.
 *
 * The market's delivery is priced by a carrier's tariff, and a tariff reads weight. A weighed good
 * states it by being sold by the kilo; a boxed one states it on the box («500 г», «1 л» — a litre
 * of milk is near enough a kilo for a courier's scales). «Штука», «банка» and «пучок» state nothing
 * on the card, so the market says it here, as it would on a shelf label: a basket holding ONE such
 * line used to come out of the till as an estimate with its delivery unnamed, and a grocery whose
 * every third order waits for a manager to price a loaf of bread is not what this demo is of. The
 * figures are what such a thing weighs in a bag; the carrier weighs the bag itself at the door.
 */
const PIECE_GRAMS: Record<string, number> = {
  ananas: 1500,
  avokado: 200,
  baget: 250,
  'baton-nareznoj': 400,
  'bulochka-s-koricej': 90,
  'bulochka-s-makom': 90,
  'bumaga-tualetnaya': 500,
  chiabatta: 300,
  dynya: 2500,
  'goroshek-zelyonyj': 420,
  'hleb-bezdrozhzhevoj': 400,
  'hleb-borodinskij': 400,
  'hleb-pshenichnyj': 500,
  'hleb-rzhanoj': 400,
  'hleb-zernovoj': 350,
  'kompot-iz-suhofruktov': 1050,
  kruassan: 70,
  'kukuruza-konservirovannaya': 420,
  'lavash-armyanskij': 250,
  'lavash-tonkij': 200,
  lecho: 720,
  'lepyoshka-tandyrnaya': 350,
  'luk-zelyonyj': 100,
  mango: 400,
  masliny: 300,
  'morozhenoe-fruktovyj-lyod': 70,
  'morozhenoe-plombir': 90,
  'ogurcy-marinovannye': 950,
  'pakety-dlya-musora': 200,
  'pasta-zubnaya': 120,
  petrushka: 80,
  'pomidory-marinovannye': 950,
  'salat-listovoj': 150,
  'sardiny-v-masle': 240,
  shpinat: 125,
  'tunec-konservirovannyj': 185,
  ukrop: 80,
  'yajca-kurinye': 60,
  'yajca-perepelinye': 240,
}

function weightOf(item: DyikanProduct, pack: DyikanProduct['packs'][number]): number | null {
  if (item.measure && item.measure.steps > 1) return 1000
  const stated = /^(\d+)(?:-(\d+))?-(g|kg|l)$/.exec(pack.fasovka ?? '')
  if (!stated) return PIECE_GRAMS[item.slug] ?? null
  const amount = Number(stated[2] ? `${stated[1]}.${stated[2]}` : stated[1])
  return Math.round(amount * (stated[3] === 'g' ? 1 : 1000))
}

export async function seedDyikan(ownerId: bigint, tx: Db | Transaction) {
  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: DYIKAN_ORG.name,
      slug: DYIKAN_ORG.slug,
      defaultLocale: DYIKAN_ORG.defaultLocale,
      locales: DYIKAN_ORG.locales,
    },
    tx,
  )

  const banner = await seedImage('dyikan/banner.webp', DYIKAN_ORG.name)
  await updateOrgSite(
    site.id,
    {
      currency: DYIKAN_ORG.currency,
      tagline: DYIKAN_ORG.tagline,
      about: DYIKAN_ORG.about,
      deliveryNote: DYIKAN_ORG.deliveryNote,
      paymentNote: DYIKAN_ORG.paymentNote,
      warrantyNote: DYIKAN_ORG.warrantyNote,
      channels: DYIKAN_ORG.channels,
      mapProvider: DYIKAN_ORG.mapProvider,
      features: DYIKAN_ORG.features,
      fulfilments: DYIKAN_ORG.fulfilments,
      correction: DYIKAN_ORG.correction,
      namesSupplier: DYIKAN_ORG.namesSupplier,
      productPages: DYIKAN_ORG.productPages,
      // The switch itself: an empty pair means buyers do not bring friends here, and the block never
      // appears in a reader's own pages.
      buyerRewardKind: DYIKAN_ORG.buyerReward.kind,
      buyerRewardValue: DYIKAN_ORG.buyerReward.value,
      ogImage: { key: banner.key, width: banner.width, height: banner.height },
    },
    tx,
  )
  await setZones(site.id, DYIKAN_ORG.zones, tx)
  await updateSiteTheme(site.id, DYIKAN_ORG.theme, tx)
  await setSiteLogo(site.id, await assetFile('dyikan/logo.png', 'image/png'), tx)
  await seedPlaces(site.id, DYIKAN_PLACES, tx)

  await seedDictionary(site.id, tx)
  const shelves = await seedShelves(site.id, tx)
  await seedPriceList(site.id, shelves, tx)
  await seedFreshness(site.id, tx)
  await seedHomePage(site.id, banner, tx)
  await seedCatalogPage(site.id, tx)
  await seedPricePages(site.id, tx)
  await seedContactsPage(site.id, tx)
  await seedPrivacyPage(site.id, tx)
  await seedRequisite(org.id, ownerId, DYIKAN_ORG.payment, tx)
  await seedChat(site.id, tx)
  await setSlots(site.id, DYIKAN_ORG.slots, tx)
  await seedCheckout(site.id, tx)
  /*
   * «Every third item free», and this is the shop the third kind of rule belongs to.
   *
   * A weighed line counts for nothing here — «every third» has nothing to count in eighty square
   * metres or in a kilo and a half of mince — so what the rule sees is the counted half of the
   * shelf: bread, dairy, drinks, herbs. That is exactly what a greengrocer puts on a sign, and the
   * engine protects the shop by giving away the CHEAPEST of them rather than the first or the dearest.
   */
  await createRule(
    site.id,
    {
      name: {
        ru: 'Каждый третий товар — в подарок',
        ky: 'Ар бир үчүнчү товар — белекке',
        en: 'Every third item free',
        ar: 'كل صنف ثالث مجاناً',
      },
      kind: 'every_nth',
      threshold: 3,
    },
    tx,
  )
  await seedMenu(site.id, tx)

  await setOrgVerification(org.id, { verification: 'verified' }, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

// Properties are registered as non-filterable by default, with filtering enabled on type bindings:
// the site dictionary sets defaults, while product types refine them per catalog needs.
async function seedDictionary(siteId: SiteId, tx: Db | Transaction) {
  await createGroup(siteId, { slug: DYIKAN_GROUP.slug, name: DYIKAN_GROUP.name }, tx)

  for (const [index, definition] of DYIKAN_PROPERTIES.entries()) {
    const property = await createProperty(
      siteId,
      {
        slug: definition.slug,
        name: definition.name,
        kind: 'enum',
        group: DYIKAN_GROUP.slug,
        isFilterable: false,
        position: index,
      },
      tx,
    )
    for (const value of definition.values)
      await createValue(siteId, property.id, { slug: value.slug, label: value.label }, tx)
  }

  await createType(siteId, { slug: DYIKAN_TYPE.slug, name: DYIKAN_TYPE.name }, tx)
  const type = (await findTypeBySlug(siteId, DYIKAN_TYPE.slug, tx))!
  await setTypeProperties(
    siteId,
    type.id,
    {
      properties: DYIKAN_PROPERTIES.map((definition, index) => ({
        property: definition.slug,
        group: DYIKAN_GROUP.slug,
        isFilterable: definition.isFilterable,
        isMultivalued: definition.isMultivalued ?? false,
        showInCard: false,
        filterWidget: definition.isFilterable ? ('checkbox' as const) : null,
        position: index,
      })),
    },
    tx,
  )
}

// Products attach to leaf categories, while root category views query the entire subtree.
async function seedShelves(siteId: SiteId, tx: Db | Transaction) {
  const shelves = new Map<string, bigint>()
  let position = 0

  const write = async (shelf: DyikanShelf, parentId: bigint | null) => {
    const row = await createCategory(
      siteId,
      {
        slug: shelf.slug,
        name: shelf.name,
        parentId,
        type: DYIKAN_TYPE.slug,
        description: paragraphsOf([shelf.description]),
        position: position++,
      },
      tx,
    )
    shelves.set(shelf.slug, row.id)
    for (const child of shelf.children ?? []) await write(child, row.id)
  }

  for (const shelf of DYIKAN_SHELVES) await write(shelf, null)
  return shelves
}

/*
 * Packaging is a value on the product and no longer an axis it is split along.
 *
 * The produce used to carry two or three packs — «1 кг», «3 кг», «5 кг» — which made the card grow a
 * select, and a select is the wrong question here: both boxes hold the same tomato, and the shopper
 * who wants two kilograms could ask for neither. What those packs actually were is a VOLUME
 * DISCOUNT, and the platform has had a ladder for that since the sewing workshop. So the weighed
 * goods now carry a price per kilo, a quantity taken in steps, and their discount as `tiers` — the
 * stepper the butcher's counter already uses, and one that can answer «two and a half».
 *
 * `split` stays: a good genuinely sold in two different boxes is still possible, and nothing here
 * forbids it. Nothing in this shop is one any more.
 */
async function seedPriceList(siteId: SiteId, shelves: Map<string, bigint>, tx: Db | Transaction) {
  for (const [index, item] of DYIKAN_PRODUCTS.entries()) {
    const split = item.packs.length > 1
    const product = await createProduct(
      siteId,
      {
        slug: item.slug,
        name: item.name,
        summary: item.summary,
        ...(item.text ? { description: paragraphsOf(item.text) } : {}),
        categoryId: shelves.get(item.category)!,
        values: valuesOf(item, split),
        ...(split ? { options: ['fasovka'] } : {}),
        ...(item.measure
          ? {
              priceUnit: item.measure.unit,
              unitSteps: item.measure.steps,
            }
          : {}),
        ...(item.tiers ? { tiers: item.tiers } : {}),
        position: index,
        ...(item.hit ? { isHit: true } : {}),
      },
      tx,
    )

    for (const [order, pack] of item.packs.entries())
      await createVariant(
        siteId,
        product.id,
        {
          ...(split ? { values: { fasovka: pack.fasovka } } : {}),
          price: toMinor(pack.price, DYIKAN_ORG.currency),
          ...(pack.old ? { oldPrice: toMinor(pack.old, DYIKAN_ORG.currency) } : {}),
          // Weighted item stock is also tracked in fractional steps, otherwise 12kg would become 1.2kg.
          stock: stockOf(pack.stock, index + order) * (item.measure?.steps ?? 1),
          weight: weightOf(item, pack),
          ...(item.measure ? { minQty: item.measure.min } : {}),
          position: order,
          isPrimary: order === 0,
        },
        tx,
      )

    const image = await seedImage(`dyikan/${item.image}`, item.name.ru)
    await attachMedia(
      siteId,
      'product',
      product.id,
      { key: image.key, width: image.width, height: image.height, caption: item.name },
      tx,
    )
  }
}

function valuesOf(item: DyikanProduct, split: boolean): ProductValueInput[] {
  const out: ProductValueInput[] = []
  if (!split && !item.measure) out.push(`fasovka:${item.packs[0]!.fasovka}`)
  if (item.country) out.push(`strana:${item.country}`)
  if (item.brand) out.push(`brend:${item.brand}`)
  for (const mark of item.marks ?? []) out.push(`osobennosti:${mark}`)
  return out
}

// "New" badge is calculated from product creation dates within 30 days, so dates are backdated
// in seed data — a fixture adjustment not meant for runtime service APIs.
async function seedFreshness(siteId: SiteId, tx: Db | Transaction) {
  const products = await tx
    .select({ id: catProduct.id })
    .from(catProduct)
    .where(and(eq(catProduct.siteId, siteId), isNull(catProduct.deletedAt)))
    .orderBy(asc(catProduct.id))

  const day = 24 * 60 * 60 * 1000
  const fresh: bigint[] = []
  const settled: bigint[] = []
  for (const [index, product] of products.entries())
    (index % 19 === 3 ? fresh : settled).push(product.id)

  if (settled.length > 0)
    await tx
      .update(catProduct)
      .set({ createdAt: new Date(Date.now() - 210 * day) })
      .where(inArray(catProduct.id, settled))
  if (fresh.length > 0)
    await tx
      .update(catProduct)
      .set({ createdAt: new Date(Date.now() - 6 * day) })
      .where(inArray(catProduct.id, fresh))
}

// Exactly what is required for publication: a site without a published home page cannot go live.
async function seedHomePage(
  siteId: SiteId,
  banner: { key: string; width: number; height: number },
  tx: Db | Transaction,
) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'home', en: 'home' },
      status: 'published',
      isHome: true,
      title: { ru: 'Главная', en: 'Home', ar: 'الرئيسية' },
      seoTitle: DYIKAN_HOME.seo.title,
      seoDescription: DYIKAN_HOME.seo.description,
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        // `split` rather than `cover`: banner is a cutout on transparent background, while `cover`
        // places images as background with page gradients — causing white-on-white over transparency.
        layout: 'split',
        slides: [
          {
            eyebrow: DYIKAN_HOME.hero.eyebrow,
            title: DYIKAN_HOME.hero.title,
            subtitle: DYIKAN_HOME.hero.subtitle,
            image: { key: banner.key, width: banner.width, height: banner.height },
            actions: [{ kind: 'page' as const, slug: 'catalog', label: DYIKAN_HOME.hero.action }],
          },
        ],
      },
    },
    tx,
  )

  // Promotions showcase actual products with prices rather than a tile labeled "discounts":
  // the market lacks artistic promotional banners, and a dark tile with one word acts as a placeholder.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'catalog',
      data: {
        eyebrow: DYIKAN_HOME.sale.eyebrow,
        title: DYIKAN_HOME.sale.title,
        selection: DYIKAN_SELECTIONS[0]!.slug,
        limit: 8,
        showCategories: false,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'catalog',
      data: {
        eyebrow: DYIKAN_HOME.catalog.eyebrow,
        title: DYIKAN_HOME.catalog.title,
        limit: 24,
        // Categories are navigable by name from header, mobile bar, and filter drawer. Shelf chips here
        // would represent a redundant fourth entry point to the same destinations.
        showCategories: false,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  // Rendered as a banner strip rather than cards: these are core market guarantees, not products, and lack photos.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'features',
      data: {
        layout: 'strip',
        eyebrow: DYIKAN_HOME.trust.eyebrow,
        title: DYIKAN_HOME.trust.title,
        items: DYIKAN_HOME.trust.items.map((item) => ({
          icon: item.icon,
          title: item.title,
          text: item.text,
        })),
      },
    },
    tx,
  )
}

// Two dynamic filter-based selections and two hand-curated lists: discounts live on price rather than
// properties, while "breakfast" collections cannot be derived purely by rules.
/*
 * The market's hand-picked shelves, and they are seeded LATER than everything else on this page.
 *
 * Two of the four name meat — «Плов» wants a shoulder and a stew cut, «Скидки недели» a whole
 * chicken — and the market sells no meat of its own any more: the row is the butcher's, laid out
 * from his catalogue. So these cannot be built until that agreement stands, which is why the supply
 * fixture calls this and the demo itself does not. The order is real rather than technical: an owner
 * renting out a meat row also builds «Плов» after the meat is there, not before.
 */
export async function seedDyikanShelves(siteId: SiteId, tx: Db | Transaction) {
  for (const [index, item] of DYIKAN_SELECTIONS.entries())
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

// Resolver evaluates pages before prefix handlers, so `/catalog` renders category shelves while
// `/catalog/<slug>` continues resolving individual products.
async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'catalog', en: 'catalog' },
      status: 'published',
      title: DYIKAN_CATALOG.title,
      seoTitle: DYIKAN_CATALOG.seo.title,
      seoDescription: DYIKAN_CATALOG.seo.description,
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'catalog',
      data: {
        limit: 24,
        // Categories reside in the filter drawer alongside origin and price — as a unified list rather than a separate tile wall.
        showCategories: true,
        showPrice: true,
        showAction: true,
        showFilters: true,
        filters: ['strana', 'brend', 'osobennosti', 'price'],
        showSort: true,
        // This page is the full catalog rather than a teaser: it scrolls as an infinite feed.
        feed: true,
      },
    },
    tx,
  )
}

// Flat slug like Vega (`price-noutbuki`): page has a single path segment.
const pricePath = (slug: string) => `price-${slug}`

// English addresses for the twelve aisles, short and conventional rather than a slugified translation
// of the full aisle name.
const SHELF_SLUG_EN: Record<string, string> = {
  'ovoshchi-frukty': 'produce',
  'myaso-ptica': 'meat-poultry',
  kolbasy: 'deli',
  ryba: 'seafood',
  molochnoe: 'dairy',
  hleb: 'bakery',
  bakaleya: 'groceries',
  'sousy-konservy': 'sauces',
  zamorozka: 'frozen',
  sladosti: 'snacks',
  napitki: 'drinks',
  'bytovaya-himiya': 'household',
}

// Scrolling 200 items in a single sheet is tedious, so each department gets its own page, while `/price`
// hosts cards navigating to them. On department pages, root binding includes its nested shelves.
// A single packaging column: grocery market prices require units, resolved from the primary variant.
async function seedPricePages(siteId: SiteId, tx: Db | Transaction) {
  const index = await createPage(
    siteId,
    {
      slug: { ru: 'price', en: 'price' },
      status: 'published',
      title: DYIKAN_PRICE.title,
      seoTitle: DYIKAN_PRICE.seo.title,
      seoDescription: DYIKAN_PRICE.seo.description,
    },
    tx,
  )

  // Neither subtitle nor intro paragraph: the page is titled "Price List", and extra introductory
  // sentences create unnecessary friction between the reader and the data.
  await createBlock(
    siteId,
    index.id,
    {
      type: 'banners',
      data: {
        layout: 'tile',
        items: DYIKAN_SHELVES.map((shelf) => ({
          title: shelf.name,
          action: {
            kind: 'page' as const,
            slug: pricePath(shelf.slug),
            label: DYIKAN_PRICE.title,
          },
        })),
      },
    },
    tx,
  )

  for (const shelf of DYIKAN_SHELVES) {
    const pageTitle = DYIKAN_PRICE.page(shelf.name)
    const page = await createPage(
      siteId,
      {
        slug: { ru: pricePath(shelf.slug), en: pricePath(SHELF_SLUG_EN[shelf.slug]!) },
        status: 'published',
        title: pageTitle,
        seoTitle: {
          ru: `${pageTitle.ru} — ${DYIKAN_ORG.name}`,
          en: `${pageTitle.en} — ${DYIKAN_ORG.name}`,
          ar: `${pageTitle.ar} — ${DYIKAN_ORG.name}`,
        },
        seoDescription: shelf.description,
      },
      tx,
    )
    await createBlock(
      siteId,
      page.id,
      {
        type: 'table',
        data: {
          category: shelf.slug,
          columns: ['fasovka'],
          showSku: false,
          showStock: false,
          showFilters: false,
          showExport: false,
          // Grocery price list is an actionable order sheet: 40 items can be added row by row. At Vega,
          // the same block remains a read-only reference list.
          showAction: true,
          // largest category has 40 items; block ceiling is 200
          limit: 60,
        },
      },
      tx,
    )
  }
}

// Neither inquiry form nor interactive map: the market utilizes a chat widget, and a map of a single
// market stall is an extraneous screen that users scroll past.
async function seedContactsPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'contacts', en: 'contacts' },
      status: 'published',
      title: DYIKAN_CONTACTS.title,
      seoTitle: DYIKAN_CONTACTS.seo.title,
      seoDescription: DYIKAN_CONTACTS.seo.description,
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    { type: 'text', data: { content: paragraphsOf(DYIKAN_CONTACTS.text) } },
    tx,
  )
}

// Small print beside copyright is a dedicated menu zone, not a footer navigation column.
async function seedPrivacyPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    { slug: { ru: 'privacy', en: 'privacy' }, status: 'published', title: DYIKAN_PRIVACY.title },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    { type: 'text', data: { content: paragraphsOf(DYIKAN_PRIVACY.text) } },
    tx,
  )
  await createMenuItem(
    siteId,
    {
      zone: 'legal',
      label: DYIKAN_PRIVACY.title,
      action: { kind: 'page', slug: 'privacy' },
      position: 0,
    },
    tx,
  )
}

// Grocery orders are conversational agreements: substitutions, out-of-stock items, delivery windows —
// this requires chat rather than standard order status columns. The corner button routes directly to the chat widget.
async function seedChat(siteId: SiteId, tx: Db | Transaction) {
  await seedWidget(
    siteId,
    {
      name: { ru: 'Написать на рынок', en: 'Message the market', ar: 'مراسلة إدارة السوق' },
      success: {
        ru: 'Мы на связи. Спросите, что сегодня есть на прилавке.',
        en: 'We are online. Ask what is available on the counter today.',
        ar: 'نحن متواجدون للرد. يمكنك الاستفسار عما يتوفر في السوق اليوم.',
      },
    },
    tx,
  )
}

async function seedCheckout(siteId: SiteId, tx: Db | Transaction) {
  // Both fields are mandatory together: `assertSettings` disallows chat mode without `toInbox`.
  const checkout = await checkoutForm(siteId, tx)
  // The window has no lines beside it, so the till says what the basket comes to.
  await updateForm(siteId, checkout!.id, { toInbox: true, after: 'chat', showsTotal: true }, tx)

  // Two-step checkout: customer identity followed by delivery address. Omitted here: fulfillment mode
  // (the market is delivery-only), email (orders confirmed by phone), and step conditions. Delivery date defaults to today.
  await setStructure(
    siteId,
    checkout!.id,
    {
      steps: [
        {
          key: 'contacts',
          title: { ru: 'Как с вами связаться', en: 'Contact information', ar: 'معلومات الاتصال' },
          description: {
            ru: 'Позвоним, если чего-то не окажется на прилавке.',
            en: 'We will call if an item is out of stock on the counter.',
            ar: 'سنتصل بك لتأكيد البدائل في حال نفاد أي صنف.',
          },
        },
        {
          key: 'delivery',
          title: { ru: 'Куда привезти', en: 'Delivery address', ar: 'عنوان التوصيل' },
          description: {
            ru: 'Возим по Бишкеку. Чем точнее адрес, тем меньше звонков курьера.',
            en: 'Delivering across Bishkek. A precise address ensures smooth delivery.',
            ar: 'التوصيل متاح في بيشكيك. كلما كان العنوان دقيقاً، سهلت مهمة مندوب التوصيل.',
          },
        },
      ],
      fields: [
        {
          key: 'name',
          step: 'contacts',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          placeholder: {
            ru: 'Как к вам обращаться',
            en: 'How should we address you',
            ar: 'كيف تفضل أن نناديك',
          },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          step: 'contacts',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'address',
          step: 'delivery',
          type: 'text',
          role: 'address',
          label: { ru: 'Адрес', en: 'Address', ar: 'العنوان' },
          placeholder: {
            ru: 'Улица, дом, квартира',
            en: 'Street, building, apartment',
            ar: 'الشارع، البناية، الشقة',
          },
          isRemembered: true,
          isRequired: true,
        },
        {
          /*
           * Куда везём — район с рынкового же списка.
           *
           * Вариантов здесь нет и быть не может: их подставляет платформа из объявленных сайтом
           * районов. Пока район был один, вопроса не было вовсе и цена доставки бралась из него
           * молча; с тремя районами вопрос появляется сам.
           */
          key: 'delivery-zone',
          step: 'delivery',
          type: 'select',
          role: 'zone',
          label: { ru: 'Куда везём', en: 'Where to', ar: 'إلى أي منطقة' },
          isRequired: true,
        },
        {
          /*
           * One question over the market's own timetable, and the options are not written here: the
           * platform puts in the rounds this site declared, minus the full ones and the ones it is
           * too late for. What stood here was a free date and three hard-coded «до 12:00 / 12:00 —
           * 18:00 / 18:00 — 22:00» — a buyer could ask for a Sunday, for a date in the past, and for
           * an evening whose van had already left, and the market would take all three in silence.
           */
          key: 'delivery-slot',
          step: 'delivery',
          type: 'select',
          role: 'slot',
          label: { ru: 'Когда привезти', en: 'Delivery time slot', ar: 'وقت التوصيل المفضل' },
          isRequired: true,
        },
        {
          key: 'courier',
          step: 'delivery',
          type: 'textarea',
          label: { ru: 'Курьеру', en: 'Notes for courier', ar: 'ملاحظات للمندوب' },
          placeholder: {
            ru: 'Код домофона, этаж, позвонить за десять минут',
            en: 'Door code, floor, call 10 minutes prior',
            ar: 'رمز الدخول، الطابق، الاتصال قبل الوصول بعشر دقائق',
          },
          isRemembered: true,
        },
      ],
    },
    tx,
  )
}

async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  /*
   * The platform's own addresses are NAMED, not typed: the segment the search lives at is a site
   * setting, and a bar that spelled it out would die the day the owner renamed it. «Categories» is a
   * page the owner made, so it names that page; its icon is declared here because only a route
   * carries one by default.
   */
  const bar: {
    label: LocalizedLabel
    action: { kind: 'route'; route: 'search' | 'favorites' } | { kind: 'page'; slug: string }
    icon?: 'layout-grid'
  }[] = [
    { label: { ru: 'Поиск', en: 'Search', ar: 'بحث' }, action: { kind: 'route', route: 'search' } },
    /*
     * «Каталог» and no longer «Категории», because that is where it goes.
     *
     * The tile points at the catalogue PAGE — the whole feed, where sections stand in the filter
     * drawer beside origin and price rather than as a wall of tiles. Called «Категории» it promised a
     * list of aisles and delivered a river of goods.
     *
     * The list of aisles is not missing, and that is why the word moved rather than the address: the
     * bar's own menu drawer draws the same catalogue tree the header's green button opens on a wide
     * screen. Two tiles apart, one says «take me to everything» and the other «show me the aisles».
     */
    {
      label: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
      action: { kind: 'page', slug: 'catalog' },
      icon: 'layout-grid',
    },
    {
      label: { ru: 'Избранное', en: 'Favorites', ar: 'المفضلة' },
      action: { kind: 'route', route: 'favorites' },
    },
  ]
  for (const [index, tile] of bar.entries())
    await createMenuItem(
      siteId,
      {
        zone: 'bar',
        label: tile.label,
        action: tile.action,
        ...(tile.icon ? { icon: tile.icon } : {}),
        position: index,
      },
      tx,
    )

  // All navigation is in the header, with no footer. Three curated selections are omitted from header:
  // a 7-item header row degrades scannability, and selections remain accessible via cards and direct links.
  const header: {
    label: LocalizedLabel
    action: { kind: 'page'; slug: string } | { kind: 'selection'; slug: string }
  }[] = [
    {
      label: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
      action: { kind: 'page', slug: 'catalog' },
    },
    {
      label: DYIKAN_SELECTIONS[0]!.name,
      action: { kind: 'selection', slug: DYIKAN_SELECTIONS[0]!.slug },
    },
    { label: DYIKAN_PRICE.title, action: { kind: 'page', slug: 'price' } },
    { label: DYIKAN_CONTACTS.title, action: { kind: 'page', slug: 'contacts' } },
  ]
  for (const [index, item] of header.entries())
    await createMenuItem(
      siteId,
      { zone: 'header', label: item.label, action: item.action, position: index },
      tx,
    )
}
