import { eq } from '@anavi/backend/src/db'
import type { EditorDoc } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { seedOrgWithSite } from '../owner'
import {
  updateOrgSite,
  updateSiteTheme,
  setSitePublished,
} from '@anavi/backend/src/modules/org/org-site.service'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/catalog/property.service'
import {
  createType,
  findTypeBySlug,
  setTypeProperties,
} from '@anavi/backend/src/modules/catalog/type.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { receiveStock } from '@anavi/backend/src/modules/catalog/stock.service'
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
import { setOrgVerification } from '@anavi/backend/src/modules/admin/admin.service'
import { updateOrg } from '@anavi/backend/src/modules/org/org.service'
import { seedRequisite } from '../requisite'
import { seedSeller } from '../partners'
import { iamIdentity, iamUser } from '@anavi/backend/src/db/schema/iam'
import { signupOrg } from '@anavi/backend/src/modules/org/signup.service'
import { seedFile, seedImage, seedRaw } from '../assets'
import { htmlToDoc } from '../html'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { resourceJson } from '../resource'
import { seedPlaces } from '../places'
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
import { seedQuestions as seedFaq } from '../faq'
import { sameIn } from '../labels'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Locales are declared once: below, labels are constructed in six places, all using this set.
const same = sameIn(HANAKO_ORG.locales)

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

// Cyrillic is transliterated rather than dropped, or "Bochka" would slug to nothing.
const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ө: 'o',
  ү: 'u',
  ң: 'ng',
}

function paragraphs(label: Record<string, string>): EditorDoc {
  const locales = Object.keys(label)
  const chunks = new Map(locales.map((locale) => [locale, (label[locale] ?? '').split(/\n+/)]))
  const length = Math.max(...[...chunks.values()].map((list) => list.length))
  const blocks: EditorDoc['blocks'] = []
  for (let index = 0; index < length; index++) {
    const text: Record<string, string> = {}
    for (const locale of locales) {
      const value = chunks.get(locale)![index]?.trim()
      if (value) text[locale] = value
    }
    if (Object.keys(text).length > 0) blocks.push({ type: 'paragraph', data: { text } })
  }
  return { blocks }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
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
      // Payments on: dealers buy as organizations, and their purchases are billed and paid.
      features: { goods: true, payments: true },
      tagline: HANAKO_ORG.tagline,
      about: HANAKO_ORG.about,
      channels: HANAKO_ORG.channels,
      mapProvider: HANAKO_ORG.mapProvider,
    },
    tx,
  )
  await updateSiteTheme(site.id, HANAKO_ORG.theme, tx)
  await seedPlaces(site.id, HANAKO_PLACES, tx)

  /*
   * The vehicle tree and what each oil fits, read before a single row is written: a hundred and four
   * links against a hundred and sixty-four nodes, and a file missing here should fail now rather than
   * half way through the catalogue.
   */
  const CARS = await resourceJson<FitmentTree>('hanako/fitment.json')
  const FITS = await resourceJson<Record<string, string[]>>('hanako/fits.json')

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
  for (const [makeIndex, make] of CARS.nodes.entries()) {
    const madeMake = await createFitmentNode(
      fitment.id,
      { slug: make.slug, label: make.label, position: makeIndex },
      tx,
    )
    for (const [modelIndex, model] of (make.children ?? []).entries()) {
      const madeModel = await createFitmentNode(
        fitment.id,
        { parentId: madeMake.id, slug: model.slug, label: model.label, position: modelIndex },
        tx,
      )
      for (const [genIndex, gen] of (model.children ?? []).entries()) {
        await createFitmentNode(
          fitment.id,
          { parentId: madeModel.id, slug: gen.slug, label: gen.label, position: genIndex },
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

  const type = (await findTypeBySlug(site.id, 'oil', tx))!
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
      const key = `${tag.group}:${slugify(tag.value)}`
      if (seen.has(key)) continue
      await createValue(
        site.id,
        property.id,
        { slug: slugify(tag.value), label: same(tag.value) },
        tx,
      )
      seen.add(key)
    }
    for (const pack of product.packages) {
      const key = `packaging:${slugify(pack.volume)}`
      if (seen.has(key)) continue
      await createValue(
        site.id,
        packaging.id,
        { slug: slugify(pack.volume), label: same(pack.volume) },
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
   * Deterministic, like every number in this fixture. The basket is off here — the price is
   * discussed — so nothing is ever held against these; they are read on the card and nowhere else.
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
        values: [...new Set(item.tags.map((tag) => `${tag.group}:${slugify(tag.value)}`))],
        options: ['packaging'],
        position: item.sort,
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

    for (const [index, pack] of item.packages.entries()) {
      const variant = await createVariant(
        site.id,
        product.id,
        {
          values: { packaging: slugify(pack.volume) },
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
        await receiveStock(variant.id, qty, { placeId: places[at]?.id ?? null }, tx)
      }
      const image = await seedImage(`hanako/products/${pack.image}`)
      await attachMedia(
        site.id,
        'variant',
        variant.id,
        {
          key: image.key,
          width: image.width,
          height: image.height,
          caption: same(`${item.name}, ${pack.volume}`),
        },
        tx,
      )
      // a product with no picture of its own has nothing to show in a listing, and duplicating the file
      // costs nothing — the key is the content hash
      if (index === 0) {
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
      const file = await seedFile(`hanako/files/${item.datasheet}`, 'application/pdf')
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
  await seedSeller(org.id, site.id, { userId: ownerId, activeRole: 'owner' }, HANAKO_AGENT, tx)
  for (const dealer of HANAKO_DEALERS) {
    // Signed up by its own person with a proved address — the only way an organization appears.
    const [user] = await tx
      .insert(iamUser)
      .values({ role: 'account', name: dealer.person })
      .returning()
    await tx.insert(iamIdentity).values({
      userId: user!.id,
      provider: 'email',
      identifier: dealer.email,
      secret: await Bun.password.hash('password'),
      verifiedAt: new Date(),
    })
    const made = await signupOrg(user!.id, { name: dealer.name }, tx)
    await updateOrg(made.org.id, { taxId: dealer.taxId, address: dealer.address }, tx)
  }
  await seedRequisite(org.id, ownerId, HANAKO_PAYMENT, tx)
  await setOrgVerification(org.id, { verification: 'verified' }, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

// `setOrgLogo` runs everything through sharp, which is right for a photo an owner uploads and wrong
// for a vector mark. A deliberate fixture exception, like pinning a dev password.
async function seedLogo(siteId: SiteId, tx: Db | Transaction) {
  const logo = await seedRaw('hanako/logo.svg', 'image/svg+xml')
  await tx
    .update(orgSite)
    .set({ logo: logo.key, updatedAt: new Date() })
    .where(eq(orgSite.id, siteId))
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
    const image = await seedImage(`hanako/hero/${slide.image}`)
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
  await createBlock(
    siteId,
    page.id,
    { type: 'hero', data: { layout: 'cover', slides, interval: 6 } },
    tx,
  )

  const features = []
  for (const item of HANAKO_HOME.features.items) {
    const image = await seedImage(`hanako/features/${item.image}`)
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
    { type: 'hero', data: plainHero(HANAKO_HOME.catalog.title) },
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
    { type: 'hero', data: plainHero(points.title, points.intro) },
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
  await createBlock(siteId, page.id, { type: 'hero', data: plainHero(faq.title, faq.intro) }, tx)
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

  await createBlock(siteId, page.id, { type: 'hero', data: plainHero(about.title) }, tx)
  await createBlock(
    siteId,
    page.id,
    { type: 'text', data: { content: htmlToDoc(about.text ?? {}) } },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'cta', data: ctaData(about.cta) }, tx)
}

// Kyrgyz is missing in the source, so the page falls back to Russian rather than hiding itself.
async function seedPrivacyPage(siteId: SiteId, tx: Db | Transaction) {
  const privacy = HANAKO_TEXT_PAGES.privacy!
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'privacy', en: 'privacy' },
      status: 'published',
      title: privacy.title,
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'hero', data: plainHero(privacy.title) }, tx)
  await createBlock(
    siteId,
    page.id,
    { type: 'text', data: { content: paragraphs(privacy.text ?? {}) } },
    tx,
  )
}

// The plain hero layout: a separate text block for the intro would put a full section of air above
// and below one paragraph.
function plainHero(title?: Record<string, string>, intro?: Record<string, string>) {
  return {
    layout: 'plain',
    slides: [{ title: title ?? {}, ...(intro ? { subtitle: intro } : {}) }],
  }
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

  await createMenuItem(
    siteId,
    {
      zone: 'legal',
      label: HANAKO_TEXT_PAGES.privacy!.title,
      action: { kind: 'page' as const, slug: 'privacy' },
    },
    tx,
  )
}
