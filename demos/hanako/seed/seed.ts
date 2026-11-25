import { openingStock } from '../../../seed/lib/books'
import { keptByAll } from '../../../seed/lib/features'
import { toMinor, transliterate, type EditorDoc } from '@anavi/shared'
import { updateCatalogTerms } from '@anavi/backend/src/modules/catalog/site-terms.service'
import { ownPolicy } from '../../../seed/lib/policy'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { seedOrgWithSite, signUpOrganization, verifyOrg } from '../../../seed/lib/owner'
import {
  updateOrgSite,
  updateSiteTheme,
  setSitePublished,
  setSiteLogo,
} from '@anavi/backend/src/modules/org/org-site.service'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/dictionary/property.service'
import {
  createType,
  typeOfKind,
  setTypeProperties,
} from '@anavi/backend/src/modules/dictionary/type.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import {
  createFitment,
  createFitmentNode,
  setProductFitment,
  setTypeFitment,
} from '@anavi/backend/src/modules/catalog/fitment.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { updateOrg } from '@anavi/backend/src/modules/org/org.service'
import { updateOrderTerms } from '@anavi/backend/src/modules/order/site-terms.service'
import { seedRequisite } from '../../../seed/lib/requisite'
import { seedSeller } from '../../../seed/lib/partners'
import { assetFile, findImage, seedFile, seedImage } from '../../../seed/lib/assets'
import { htmlToDoc } from './html'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { resourceJson } from '../../../seed/lib/resource'
import { seedPlaces } from '../../../seed/lib/places'
import {
  HANAKO_CATEGORIES,
  HANAKO_FAQS,
  HANAKO_PLACES,
  HANAKO_HOME,
  HANAKO_AGENT,
  HANAKO_DEALERS,
  HANAKO_LEGAL,
  HANAKO_ORG,
  HANAKO_PAYMENT,
  HANAKO_PRODUCTS,
  HANAKO_TEXT_PAGES,
  type FitmentTree,
  type HanakoProduct,
} from './index'
import { seedQuestions as seedFaq } from '../../../seed/lib/faq'
import { paragraphsIn, sameIn } from '../../../seed/lib/labels'
import { plainHero } from '../../../seed/lib/blocks'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Locales are declared once: below, labels are constructed in six places, all using this set.
const same = sameIn(HANAKO_ORG.locales)

// What a pack is called in each language: «4 л» copied into every language put Cyrillic on the
// English and the Arabic site. A size the list does not know stays as the source wrote it.
const PACKS: Record<string, Record<string, string>> = {
  '1 л': { ru: '1 л', ky: '1 л', en: '1 L', ar: '1 لتر' },
  '4 л': { ru: '4 л', ky: '4 л', en: '4 L', ar: '4 لتر' },
  Бочка: { ru: 'Бочка', ky: 'Челек', en: 'Drum', ar: 'برميل' },
}
const packLabel = (volume: string) => PACKS[volume] ?? same(volume)

function plain(label: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [locale, value] of Object.entries(label ?? {})) {
    out[locale] = value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return out
}

// Specifications go in as a list rather than a paragraph: they are the part a buyer scans.
function description(product: HanakoProduct): EditorDoc {
  const blocks: EditorDoc['blocks'] = [{ type: 'paragraph', data: { text: product.description } }]
  if (product.specs.length > 0) {
    blocks.push({
      type: 'list',
      data: { style: 'unordered', items: product.specs },
    })
  }
  return { blocks }
}

export async function seedHanako(ownerId: bigint, tx: Db | Transaction) {
  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: HANAKO_ORG.name,
      slug: HANAKO_ORG.slug,
      defaultLocale: HANAKO_ORG.defaultLocale,
      locales: HANAKO_ORG.locales,
    },
    tx,
  )
  await updateOrgSite(
    site.id,
    {
      // Selling to organizations: dealers buy on account, and their purchases are billed and paid.
      features: keptByAll({ goods: true, stock: true, accounts: true }),
      tagline: HANAKO_ORG.tagline,
      about: HANAKO_ORG.about,
      channels: HANAKO_ORG.channels,
      mapProvider: HANAKO_ORG.mapProvider,
    },
    tx,
  )
  // Dealers' purchases are billed and paid by transfer.
  await seedRequisite(org.id, ownerId, HANAKO_PAYMENT, tx)
  await updateOrderTerms(site.id, { payWays: ['transfer'] }, tx)
  // An importer's prices are told to dealers, never to a visitor: kept, and «on request» on the site.
  await updateCatalogTerms(site.id, { quoted: true }, tx)
  await updateSiteTheme(site.id, HANAKO_ORG.theme, tx)
  await seedPlaces(site.id, HANAKO_PLACES, tx)

  /*
   * The vehicle tree and what each oil fits, read before a single row is written: a hundred and four
   * links against a hundred and sixty-four nodes, and a file missing here should fail now rather than
   * half way through the catalogue.
   */
  const CARS = await resourceJson<FitmentTree>('demos/hanako/fitment.json')
  const FITS = await resourceJson<Record<string, string[]>>('demos/hanako/fits.json')

  const oil = await createType(
    site.id,
    {
      slug: 'oil',
      name: { ru: 'Моторное масло', ky: 'Мотор майы', en: 'Motor oil', ar: 'زيت المحرك' },
    },
    tx,
  )

  /*
   * The applicability tree, and the kind of goods that answers about it.
   *
   * The whole reason this importer is in the queue: the two questions it is asked every day are «do
   * you have it» and «will it fit my car», and the second one cannot be answered by a characteristic
   * — a dictionary of two hundred models is not a filter, it is a reference nobody scrolls.
   *
   * Half the models here carry generations and half do not, on purpose: a branch shallower than the
   * tree is the ordinary case, and a fixture where every branch is three deep would leave that
   * untested.
   */
  const fitment = await createFitment(
    site.id,
    { slug: CARS.slug, name: CARS.name, levels: CARS.levels },
    tx,
  )
  for (const make of CARS.nodes) {
    const madeMake = await createFitmentNode(
      site.id,
      fitment.id,
      { slug: make.slug, label: make.label },
      tx,
    )
    for (const model of make.children ?? []) {
      const madeModel = await createFitmentNode(
        site.id,
        fitment.id,
        { parentId: madeMake.id, slug: model.slug, label: model.label },
        tx,
      )
      for (const gen of model.children ?? []) {
        await createFitmentNode(
          site.id,
          fitment.id,
          { parentId: madeModel.id, slug: gen.slug, label: gen.label },
          tx,
        )
      }
    }
  }
  await setTypeFitment(oil.id, fitment.id, tx)

  const categories = new Map<string, bigint>()
  for (const category of HANAKO_CATEGORIES) {
    const row = await createCategory(
      site.id,
      { slug: category.slug, name: category.name, type: 'oil', position: category.sort },
      tx,
    )
    categories.set(category.slug, row.id)
  }

  // Keyed by slug rather than by the written value: source data spells the same approval in two ways
  // more often than not.
  const viscosity = await createProperty(
    site.id,
    {
      slug: 'viscosity',
      name: { ru: 'Вязкость', ky: 'Илешкектик', en: 'Viscosity', ar: 'اللزوجة' },
      showInCard: true,
      position: 0,
    },
    tx,
  )
  const approval = await createProperty(
    site.id,
    {
      slug: 'approval',
      name: { ru: 'Допуски', ky: 'Уруксаттар', en: 'Approvals', ar: 'الموافقات' },
      position: 1,
    },
    tx,
  )
  // the one property that splits an oil into variants: same oil, different can
  const packaging = await createProperty(
    site.id,
    {
      slug: 'packaging',
      name: { ru: 'Фасовка', ky: 'Таңгак', en: 'Packaging', ar: 'التعبئة والتغليف' },
      isFilterable: false,
      position: 2,
    },
    tx,
  )

  const type = (await typeOfKind(site.id, 'oil', 'product', tx))!
  await setTypeProperties(
    site.id,
    type.id,
    {
      properties: [
        { property: 'viscosity', isFilterable: true, showInCard: true },
        { property: 'approval', isFilterable: true, isMultivalued: true },
        { property: 'packaging', isFilterable: false },
      ],
    },
    tx,
  )

  const seen = new Set<string>()
  for (const product of HANAKO_PRODUCTS) {
    for (const tag of product.tags) {
      const property = tag.group === 'viscosity' ? viscosity : approval
      const key = `${tag.group}:${transliterate(tag.value)}`
      if (seen.has(key)) continue
      await createValue(
        site.id,
        property.id,
        { slug: transliterate(tag.value), label: same(tag.value) },
        tx,
      )
      seen.add(key)
    }
    for (const pack of product.packages) {
      const key = `packaging:${transliterate(pack.volume)}`
      if (seen.has(key)) continue
      await createValue(
        site.id,
        packaging.id,
        { slug: transliterate(pack.volume), label: packLabel(pack.volume) },
        tx,
      )
      seen.add(key)
    }
  }

  /*
   * Six points in four countries, and the shelf lies at them rather than standing as one number.
   *
   * This is the whole reason the importer is in the queue: the two questions it answers every day are
   * «do you have it» and «will it fit my car», and the first one is really «do you have it HERE».
   * Bishkek is the central distributor and holds most of everything; the rest hold what they hold,
   * and some lines are simply not in Moscow or Astana — which is exactly the sentence the site could
   * not say before.
   *
   * Deterministic, like every number in this fixture. The basket is off here — the price is kept and told
   * to dealers only (`quoted`) — so nothing is ever held against these; they are read on the card and nowhere else.
   */
  const places = await listPlaces(site.id, tx)
  const shares = [10, 5, 4, 3, 2, 2]
  const spread = (index: number, position: number): number[] =>
    places.map((_, at) => {
      // Every point sits out one line in seven, offset so that no two halls are ever empty together
      // and the card always has something to say.
      if (at > 0 && (index + at * 2 + position) % 7 === 0) return 0
      return (shares[at] ?? 1) * (2 + ((index + position) % 4))
    })

  for (const [ordinal, item] of HANAKO_PRODUCTS.entries()) {
    const product = await createProduct(
      site.id,
      {
        slug: item.slug,
        name: same(item.name),
        summary: item.summary,
        description: description(item),
        categoryId: categories.get(item.category)!,
        values: [...new Set(item.tags.map((tag) => `${tag.group}:${transliterate(tag.value)}`))],
        options: ['packaging'],
      },
      tx,
    )

    /*
     * And what it fits — the answer to the other question this shop is asked all day.
     *
     * Written by hand per oil rather than derived from the viscosity: an ATF WS goes into a Camry
     * XV50 and not into an XV40, and no rule over the characteristics knows that. A slug the tree
     * does not hold fails the whole seed, which is the guard: a typo in a hundred and four links
     * cannot pass quietly.
     */
    const fits = FITS[item.slug]
    if (fits) await setProductFitment(product.id, fits, tx)

    let pictured = false
    for (const [index, pack] of item.packages.entries()) {
      const variant = await createVariant(
        site.id,
        product.id,
        {
          values: { packaging: transliterate(pack.volume) },
          price: toMinor(pack.price, 'KGS'),
          // The ladder this is sold by. An importer ships canisters by the box, so «by 12» on the
          // engine oils and «from 24, then by 12» on the transmission fluids, which move slowly
          // enough that the pallet is not opened for one box. Absent means one at a time, as most
          // goods are. The file names it per oil, so every packaging of that oil carries it.
          ...(item.lot ? { minQty: item.lot } : {}),
          ...(item.box ? { stepQty: item.box } : {}),
          position: index,
          isPrimary: index === 0,
        },
        tx,
      )
      // The goods arrive hall by hall, so the ledger reads as six deliveries to six addresses rather
      // than one number that appeared from nowhere and was divided afterwards.
      for (const [at, qty] of spread(ordinal, index).entries()) {
        if (qty <= 0) continue
        openingStock(variant.id, qty, places[at]?.id ?? null)
      }
      // A packaging photographed by nobody yet stands without a picture; a missing photograph is no failure.
      const image = await findImage(`demos/hanako/products/${pack.image}`)
      if (image)
        await attachMedia(
          site.id,
          'variant',
          variant.id,
          {
            key: image.key,
            width: image.width,
            height: image.height,
            caption: Object.fromEntries(
              Object.entries(packLabel(pack.volume)).map(([locale, word]) => [
                locale,
                `${item.name}, ${word}`,
              ]),
            ),
          },
          tx,
        )
      // a product with no picture of its own has nothing to show in a listing, and duplicating the file
      // costs nothing — the key is the content hash; the first packaging that has a photograph gives it
      if (image && !pictured) {
        pictured = true
        await attachMedia(
          site.id,
          'product',
          product.id,
          {
            key: image.key,
            width: image.width,
            height: image.height,
            caption: same(item.name),
          },
          tx,
        )
      }
    }

    if (item.datasheet) {
      const file = await seedFile(`demos/hanako/files/${item.datasheet}`, 'application/pdf')
      await attachMedia(
        site.id,
        'product',
        product.id,
        {
          kind: 'file',
          key: file.key,
          size: file.size,
          mime: file.mime,
          caption: {
            ru: 'Техническое описание',
            ky: 'Техникалык сүрөттөмө',
            en: 'Technical description',
            ar: 'الوصف الفني',
          },
        },
        tx,
      )
    }
  }

  await seedLogo(site.id, tx)
  await seedQuestions(site.id, tx)
  await seedHomePage(site.id, tx)
  await seedCatalogPage(site.id, tx)
  await seedPointsPage(site.id, tx)
  await seedFaqPage(site.id, tx)
  await seedAboutPage(site.id, tx)
  await seedPrivacyPage(site.id, tx)
  await seedMenu(site.id, tx)
  await updateOrg(org.id, HANAKO_LEGAL, tx)
  await seedSeller(
    org.id,
    site.id,
    { userId: ownerId, activeRole: 'owner', viaOrgId: null },
    HANAKO_AGENT,
    tx,
  )
  for (const dealer of HANAKO_DEALERS) {
    const made = await signUpOrganization(dealer, tx)
    // A dealer with no site of its own buys from Hanako's back office: purchases are what it keeps.
    await updateOrg(
      made.org.id,
      { taxId: dealer.taxId, address: dealer.address, features: { purchases: true } },
      tx,
    )
  }
  await verifyOrg(org.id, ownerId, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

// Through the site's own door, which keeps a vector mark as it is and sends a photograph through sharp.
async function seedLogo(siteId: SiteId, tx: Db | Transaction) {
  await setSiteLogo(siteId, await assetFile('demos/hanako/logo.svg', 'image/svg+xml'), tx)
  // The file already spells the name: the engine draws it as it came and sets nothing beside it.
  await updateOrgSite(siteId, { logoMode: 'whole' }, tx)
}

async function seedQuestions(siteId: SiteId, tx: Db | Transaction) {
  await seedFaq(
    siteId,
    [
      {
        slug: 'obshchie',
        name: {
          ru: 'Общие вопросы',
          ky: 'Жалпы суроолор',
          en: 'General questions',
          ar: 'أسئلة عامة',
        },
      },
    ],
    [...HANAKO_FAQS].sort((a, b) => a.sort - b.sort),
    tx,
  )
}

async function seedHomePage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'home', en: 'home' },
      isHome: true,
      status: 'published',
      title: { ru: 'Главная', ky: 'Башкы бет', en: 'Home', ar: 'الرئيسية' },
      seoTitle: HANAKO_HOME.seo?.title,
      seoDescription: HANAKO_HOME.seo?.description,
    },
    tx,
  )

  const slides = []
  for (const slide of HANAKO_HOME.heroSlides) {
    const image = await seedImage(`demos/hanako/hero/${slide.image}`)
    slides.push({
      eyebrow: slide.eyebrow,
      title: slide.title,
      subtitle: plain(slide.text),
      image: { key: image.key, width: image.width, height: image.height },
      actions: [
        {
          kind: 'page',
          slug: 'catalog',
          label: {
            ru: 'Смотреть каталог',
            ky: 'Каталогду көрүү',
            en: 'View catalog',
            ar: 'عرض الكتالوج',
          },
        },
      ],
    })
  }
  await createBlock(siteId, page.id, { type: 'hero', data: { layout: 'cover', slides } }, tx)

  const features = []
  for (const item of HANAKO_HOME.features.items) {
    const image = await seedImage(`demos/hanako/features/${item.image}`)
    features.push({
      image: { key: image.key, width: image.width, height: image.height },
      title: item.title,
      text: item.text,
    })
  }
  await createBlock(
    siteId,
    page.id,
    {
      type: 'features',
      data: {
        eyebrow: HANAKO_HOME.features.eyebrow,
        title: HANAKO_HOME.features.title,
        items: features,
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
        eyebrow: HANAKO_HOME.catalog.eyebrow,
        title: HANAKO_HOME.catalog.title,
        limit: 12,
        showCategories: true,
        showPrice: false,
        showAction: true,
      },
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'addresses', data: addressesData() }, tx)

  await createBlock(
    siteId,
    page.id,
    {
      type: 'faq',
      data: { eyebrow: HANAKO_HOME.faq.eyebrow, title: HANAKO_HOME.faq.title, limit: 20 },
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'cta', data: ctaData() }, tx)
}

async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'catalog', en: 'catalog' },
      status: 'published',
      title: { ru: 'Каталог', ky: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
      seoTitle: HANAKO_HOME.catalog.title,
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    { type: 'hero', data: plainHero(HANAKO_HOME.catalog.title ?? {}) },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'catalog',
      data: {
        limit: 48,
        showCategories: true,
        showPrice: false,
        showAction: true,
      },
    },
    tx,
  )
}

async function seedPointsPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'points', en: 'points' },
      status: 'published',
      title: { ru: 'Точки продаж', ky: 'Сатуу түйүндөрү', en: 'Points of sale', ar: 'نقاط البيع' },
      seoTitle: HANAKO_HOME.points.title,
    },
    tx,
  )

  const points = HANAKO_TEXT_PAGES.points!
  await createBlock(
    siteId,
    page.id,
    { type: 'hero', data: plainHero(points.title ?? {}, points.intro) },
    tx,
  )
  await createBlock(siteId, page.id, { type: 'addresses', data: addressesData(false) }, tx)
  await createBlock(siteId, page.id, { type: 'cta', data: ctaData(points.cta) }, tx)
}

async function seedFaqPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'faq', en: 'faq' },
      status: 'published',
      title: { ru: 'FAQ', ky: 'FAQ', en: 'FAQ', ar: 'الأسئلة الشائعة' },
      seoTitle: HANAKO_HOME.faq.title,
    },
    tx,
  )

  const faq = HANAKO_TEXT_PAGES.faq!
  await createBlock(
    siteId,
    page.id,
    { type: 'hero', data: plainHero(faq.title ?? {}, faq.intro) },
    tx,
  )
  await createBlock(siteId, page.id, { type: 'faq', data: { limit: 50 } }, tx)
  await createBlock(siteId, page.id, { type: 'cta', data: ctaData(faq.cta) }, tx)
}

async function seedAboutPage(siteId: SiteId, tx: Db | Transaction) {
  const about = HANAKO_TEXT_PAGES.about!
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'about', en: 'about' },
      status: 'published',
      title: { ru: 'О компании', ky: 'Компания жөнүндө', en: 'About us', ar: 'من نحن' },
      seoTitle: about.title,
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'hero', data: plainHero(about.title ?? {}) }, tx)
  await createBlock(
    siteId,
    page.id,
    { type: 'text', data: { content: htmlToDoc(about.text ?? {}) } },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'cta', data: ctaData(about.cta) }, tx)
}

// In every language the site keeps: a page missing a language drops out of that version whole.
async function seedPrivacyPage(siteId: SiteId, tx: Db | Transaction) {
  const privacy = HANAKO_TEXT_PAGES.privacy!
  await ownPolicy(
    siteId,
    {
      title: privacy.title,
      content: paragraphsIn(privacy.text ?? {}),
      hero: plainHero(privacy.title ?? {}),
    },
    tx,
  )
}

function addressesData(withHeading = true) {
  return withHeading ? { eyebrow: HANAKO_HOME.points.eyebrow, title: HANAKO_HOME.points.title } : {}
}

function ctaData(own?: { title?: Record<string, string>; text?: Record<string, string> }) {
  return {
    eyebrow: { ru: 'HANAKO', ky: 'HANAKO', en: 'HANAKO', ar: 'HANAKO' },
    title: own?.title ?? HANAKO_HOME.cta.title,
    text: own?.text ?? HANAKO_HOME.cta.text,
    action: {
      kind: 'messenger',
      messenger: 'whatsapp',
      value: HANAKO_ORG.channels.whatsapp,
      label: {
        ru: 'Написать в WhatsApp',
        ky: 'WhatsApp аркылуу жазуу',
        en: 'Message on WhatsApp',
        ar: 'المراسلة عبر WhatsApp',
      },
    },
  }
}

const MENU = [
  { page: 'catalog', label: { ru: 'Каталог', ky: 'Каталог', en: 'Catalog', ar: 'الكتالوج' } },
  {
    page: 'points',
    label: { ru: 'Точки продаж', ky: 'Сатуу түйүндөрү', en: 'Points of sale', ar: 'نقاط البيع' },
  },
  { page: 'faq', label: { ru: 'FAQ', ky: 'FAQ', en: 'FAQ', ar: 'الأسئلة الشائعة' } },
  {
    page: 'about',
    label: { ru: 'О компании', ky: 'Компания жөнүндө', en: 'About us', ar: 'من نحن' },
  },
]

async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  for (const zone of ['header', 'footer'] as const)
    for (const [position, item] of MENU.entries())
      await createMenuItem(
        siteId,
        {
          zone,
          label: item.label,
          action: { kind: 'page' as const, slug: item.page },
          position,
        },
        tx,
      )

  /*
   * The bar a phone carries, and the catalogue is the whole of it.
   *
   * The shop had none at all: the header collapses below the navigation breakpoint, so on a
   * telephone the goods were reachable from the home page and from nowhere else. One tile rather
   * than three — this shop keeps no basket and no shortlist, and a bar of one honest button beats a
   * row padded out with addresses that lead to empty rooms.
   */
  await createMenuItem(
    siteId,
    {
      zone: 'bar',
      label: MENU[0]!.label,
      action: { kind: 'page' as const, slug: 'catalog' },
      icon: 'layout-grid',
      position: 0,
    },
    tx,
  )
}
