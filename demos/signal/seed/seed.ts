import { ownPolicy } from '../../../seed/lib/policy'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { keptByAll } from '../../../seed/lib/features'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { toMinor } from '@anavi/shared'
import type { ProductValueInput } from '@anavi/shared/schemas'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { updateCatalogTerms } from '@anavi/backend/src/modules/catalog/site-terms.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createGroup } from '@anavi/backend/src/modules/dictionary/group.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/dictionary/property.service'
import { createType, setTypeProperties } from '@anavi/backend/src/modules/dictionary/type.service'
import { checkoutForm } from '@anavi/backend/src/modules/form/form.public'
import { updateForm } from '@anavi/backend/src/modules/form/form.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import { updateOrderTerms } from '@anavi/backend/src/modules/order/site-terms.service'
import {
  setSitePublished,
  setSiteLogo,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { openingStock } from '../../../seed/lib/books'
import { findImage, seedImage, assetFile } from '../../../seed/lib/assets'
import { plainHero } from '../../../seed/lib/blocks'
import { seedQuestions } from '../../../seed/lib/faq'
import { paragraphs, ru } from '../../../seed/lib/labels'
import { seedOrgWithSite, verifyOrg } from '../../../seed/lib/owner'
import { seedPlaces } from '../../../seed/lib/places'
import { resourceJson } from '../../../seed/lib/resource'
import { seedRequisite } from '../../../seed/lib/requisite'
import { seedWidget } from '../../../seed/lib/widget'
import {
  SIGNAL_ORG,
  SIGNAL_PLACES,
  type SignalCategory,
  type SignalDictionary,
  type SignalProduct,
  type SignalQuestion,
  type SignalType,
} from './index'

// The shelf holds a handful of each model, and the number differs by model so that the stock column
// is not one figure down its whole length. Coprime multiplier and modulus, as in the butcher's.
const stockOf = (index: number) => 2 + ((index * 7) % 11)

const FAQ_GROUPS = [
  { slug: 'choice', name: 'Выбор оборудования' },
  { slug: 'signal', name: 'Сигнал 4G' },
  { slug: 'warranty', name: 'Гарантия' },
  { slug: 'delivery', name: 'Доставка и оплата' },
  { slug: 'setup', name: 'Настройка' },
]

function valueOf(input: SignalProduct['values'][number]): ProductValueInput {
  if ('text' in input) return { property: input.property, text: ru(input.text) }
  return input
}

export async function seedSignal(ownerId: bigint, tx: Db | Transaction) {
  const dictionary = await resourceJson<SignalDictionary>('demos/signal/data/properties.json')
  const types = await resourceJson<SignalType[]>('demos/signal/data/types.json')
  const categories = await resourceJson<SignalCategory[]>('demos/signal/data/categories.json')
  const products = await resourceJson<SignalProduct[]>('demos/signal/data/products.json')
  const questions = await resourceJson<SignalQuestion[]>('demos/signal/data/faqs.json')

  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: SIGNAL_ORG.name,
      slug: SIGNAL_ORG.slug,
      defaultLocale: SIGNAL_ORG.defaultLocale,
      locales: SIGNAL_ORG.locales,
    },
    tx,
  )
  await updateOrgSite(
    site.id,
    {
      currency: SIGNAL_ORG.currency,
      country: SIGNAL_ORG.country,
      tagline: SIGNAL_ORG.tagline,
      about: SIGNAL_ORG.about,
      deliveryNote: SIGNAL_ORG.deliveryNote,
      paymentNote: SIGNAL_ORG.paymentNote,
      warrantyNote: SIGNAL_ORG.warrantyNote,
      channels: SIGNAL_ORG.channels,
      mapProvider: SIGNAL_ORG.mapProvider,
      features: keptByAll(SIGNAL_ORG.features),
    },
    tx,
  )
  await seedRequisite(org.id, ownerId, SIGNAL_ORG.payment, tx)
  await updateOrderTerms(
    site.id,
    { fulfilments: SIGNAL_ORG.fulfilments, payWays: ['transfer'] },
    tx,
  )
  await updateCatalogTerms(site.id, { shortage: SIGNAL_ORG.shortage }, tx)
  await setZones(site.id, SIGNAL_ORG.zones, tx)
  await updateSiteTheme(site.id, SIGNAL_ORG.theme, tx)
  await setSiteLogo(site.id, await assetFile('demos/signal/logo.svg', 'image/svg+xml'), tx)
  await seedPlaces(site.id, SIGNAL_PLACES, tx)

  await seedDictionary(site.id, dictionary, types, tx)
  const shelves = await seedShelves(site.id, categories, types, tx)
  await seedGoods(site.id, products, shelves, tx)

  await seedQuestions(
    site.id,
    FAQ_GROUPS,
    questions.map((item) => ({
      group: FAQ_GROUPS.find((group) => group.name === item.group)!.slug,
      question: item.question,
      answer: item.answer.join(' '),
    })),
    tx,
  )

  await seedHomePage(site.id, tx)
  await seedCatalogPage(site.id, tx)
  await seedAboutPage(site.id, tx)
  await seedFaqPage(site.id, tx)
  await seedContactsPage(site.id, tx)
  await seedPrivacyPage(site.id, tx)
  await seedChat(site.id, tx)
  await seedMenu(site.id, tx)

  await verifyOrg(org.id, ownerId, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

// Properties are registered non-filterable: a filter belongs to the kind of goods, never to the
// dictionary, because «speed of the port» is a facet of a switch and noise on a cable.
async function seedDictionary(
  siteId: SiteId,
  dictionary: SignalDictionary,
  types: SignalType[],
  tx: Db | Transaction,
) {
  for (const group of dictionary.groups)
    await createGroup(siteId, { slug: group.slug, name: ru(group.name) }, tx)

  const byCode = new Map(dictionary.properties.map((property) => [property.slug, property]))
  for (const [index, property] of dictionary.properties.entries()) {
    const row = await createProperty(
      siteId,
      {
        slug: property.slug,
        name: ru(property.name),
        kind: property.kind,
        ...(property.unit ? { unit: property.unit } : {}),
        group: property.group,
        isFilterable: false,
        position: index,
      },
      tx,
    )
    for (const value of property.values ?? [])
      await createValue(siteId, row.id, { slug: value.slug, label: ru(value.label) }, tx)
  }

  for (const type of types) {
    const row = await createType(siteId, { slug: type.slug, name: ru(type.name) }, tx)
    await setTypeProperties(
      siteId,
      row.id,
      {
        properties: type.properties.map((entry, index) => {
          const property = byCode.get(entry.property)!
          return {
            property: entry.property,
            group: property.group,
            isFilterable: entry.filter,
            isMultivalued: property.multiple ?? false,
            showInCard: false,
            filterWidget: entry.filter ? entry.widget : null,
            position: index,
          }
        }),
      },
      tx,
    )
  }
}

async function seedShelves(
  siteId: SiteId,
  categories: SignalCategory[],
  types: SignalType[],
  tx: Db | Transaction,
) {
  const typeOf = new Map(types.flatMap((type) => type.categories.map((slug) => [slug, type.slug])))
  const shelves = new Map<string, bigint>()
  for (const [position, category] of categories.entries()) {
    const row = await createCategory(
      siteId,
      { slug: category.slug, name: ru(category.name), type: typeOf.get(category.slug)!, position },
      tx,
    )
    shelves.set(category.slug, row.id)
    const cover = await findImage(`demos/signal/categories/${category.slug}.webp`)
    if (cover)
      await attachMedia(
        siteId,
        'category',
        row.id,
        { key: cover.key, width: cover.width, height: cover.height, caption: ru(category.name) },
        tx,
      )
  }
  return shelves
}

async function seedGoods(
  siteId: SiteId,
  products: SignalProduct[],
  shelves: Map<string, bigint>,
  tx: Db | Transaction,
) {
  for (const [index, item] of products.entries()) {
    const product = await createProduct(
      siteId,
      {
        slug: item.slug,
        name: ru(item.name),
        description: paragraphs(item.text),
        categoryId: shelves.get(item.category)!,
        values: item.values.map(valueOf),
      },
      tx,
    )
    const variant = await createVariant(
      siteId,
      product.id,
      {
        sku: item.article,
        price: toMinor(item.price, SIGNAL_ORG.currency),
        isPrimary: true,
      },
      tx,
    )
    if (item.inStock) openingStock(variant.id, stockOf(index))

    for (const photo of item.photos) {
      const image = await seedImage(`demos/signal/products/${photo}`, item.name)
      await attachMedia(
        siteId,
        'product',
        product.id,
        { key: image.key, width: image.width, height: image.height, caption: ru(item.name) },
        tx,
      )
    }
  }
}

async function seedHomePage(siteId: SiteId, tx: Db | Transaction) {
  const slides = [
    {
      file: 'business',
      slug: 'marshrutizatory',
      tab: 'Для бизнеса',
      sections: ['marshrutizatory', 'kommutatory', 'tochki-dostupa', 'sfp-i-optika'],
      eyebrow: 'Сеть для офиса',
      title: 'Сетевое оборудование для бизнеса',
      subtitle:
        'Маршрутизаторы и коммутаторы MikroTik, точки доступа и SFP-модули со склада в ЦУМе.',
      action: 'Смотреть маршрутизаторы',
    },
    {
      file: 'home',
      slug: 'wifi-routery',
      tab: 'Для дома',
      sections: ['wifi-routery', 'mesh-sistemy', 'wifi-adaptery'],
      eyebrow: 'Wi-Fi для квартиры',
      title: 'Wi-Fi дома без мёртвых зон',
      subtitle: 'Роутеры Wi-Fi 6 и mesh-системы: подберём под площадь квартиры или дома.',
      action: 'Выбрать роутер',
    },
    {
      file: 'signal',
      slug: 'lte-routery-i-modemy',
      tab: 'Слабый сигнал',
      sections: [
        'lte-routery-i-modemy',
        'antenny-i-usiliteli',
        'radiomosty',
        'sputnikovyy-internet',
      ],
      eyebrow: 'За городом и в горах',
      title: 'Интернет там, где слабый сигнал',
      subtitle:
        '4G и 5G роутеры, наружные антенны, усилители сотовой связи и спутниковый интернет.',
      action: 'Усилить сигнал',
    },
  ]
  const images = await Promise.all(
    slides.map((slide) => seedImage(`demos/signal/hero/${slide.file}.webp`, slide.title)),
  )

  const page = await createPage(
    siteId,
    {
      slug: ru('home'),
      status: 'published',
      isHome: true,
      title: ru('Главная'),
      seoTitle: ru('Signal — сетевое оборудование в Бишкеке'),
      seoDescription: SIGNAL_ORG.tagline,
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        layout: 'slider',
        slides: slides.map((slide, index) => ({
          tab: ru(slide.tab),
          sections: slide.sections,
          eyebrow: ru(slide.eyebrow),
          title: ru(slide.title),
          subtitle: ru(slide.subtitle),
          image: {
            key: images[index]!.key,
            width: images[index]!.width,
            height: images[index]!.height,
          },
          actions: [{ kind: 'category', slug: slide.slug, label: ru(slide.action) }],
        })),
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'features',
      data: {
        items: [
          {
            icon: 'map-pin',
            title: ru('Склад в ЦУМе'),
            text: ru('Забрать заказ можно в день покупки'),
          },
          {
            icon: 'shield',
            title: ru('Официальная гарантия'),
            text: ru('Гарантия производителя на всё оборудование'),
          },
          {
            icon: 'truck',
            title: ru('Доставка по Кыргызстану'),
            text: ru('По Бишкеку в день заказа, в регионы от 1 дня'),
          },
          {
            icon: 'wrench',
            title: ru('Настройка MikroTik'),
            text: ru('Поможем подобрать и настроить сеть'),
          },
        ],
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'categories',
      data: {
        title: ru('Каталог оборудования'),
        eyebrow: ru('Роутеры, коммутаторы, точки доступа, 4G и всё для усиления сигнала'),
        limit: 14,
        showCount: true,
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
        title: ru('Популярное в наличии'),
        limit: 12,
        showCategories: true,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  const banners = [
    {
      file: 'setup',
      title: 'Соберём сеть под ваш офис или дом',
      text: 'Расскажите о помещении и задачах, подберём роутер, коммутатор и точки доступа, настроим MikroTik и проверим покрытие.',
      action: { kind: 'form' as const, form: 'request', label: ru('Оставить заявку') },
    },
    {
      file: 'countryside',
      title: 'Интернет на даче и в горах',
      text: '4G-роутер с наружной антенной или Starlink Mini, подскажем, что заработает там, где нет кабеля и слабый сигнал.',
      action: {
        kind: 'category' as const,
        slug: 'lte-routery-i-modemy',
        label: ru('Смотреть 4G-роутеры'),
      },
    },
  ]
  await createBlock(
    siteId,
    page.id,
    {
      type: 'banners',
      data: {
        layout: 'tile',
        items: await Promise.all(
          banners.map(async (banner) => ({
            title: ru(banner.title),
            text: ru(banner.text),
            action: banner.action,
            image: await findImage(`demos/signal/banners/${banner.file}.webp`),
          })),
        ),
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'faq',
      data: {
        eyebrow: ru('О выборе оборудования, гарантии, доставке и настройке'),
        title: ru('Частые вопросы'),
        limit: 6,
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        title: ru('Не знаете, что выбрать?'),
        text: ru(
          'Расскажите о помещении, провайдере и числе устройств, подберём оборудование и подскажем, как его настроить.',
        ),
        action: { kind: 'form', form: 'request', label: ru('Получить консультацию') },
      },
    },
    tx,
  )
}

async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: ru('catalog'),
      status: 'published',
      title: ru('Каталог'),
      seoTitle: ru('Каталог сетевого оборудования — Signal, Бишкек'),
      seoDescription: ru(
        'Маршрутизаторы, Wi-Fi роутеры, коммутаторы, точки доступа, 4G и 5G, антенны и всё для сети, со склада в Бишкеке.',
      ),
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
        showCategories: true,
        showPrice: true,
        showAction: true,
        showFilters: true,
        showSort: true,
      },
    },
    tx,
  )
}

async function seedAboutPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: ru('about'),
      status: 'published',
      title: ru('О магазине'),
      seoDescription: ru(
        'Signal, магазин сетевого оборудования в Бишкеке. Продаём и помогаем настроить маршрутизаторы, Wi-Fi, 4G и оборудование для усиления сигнала.',
      ),
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero(
        'О магазине Signal',
        'Продаём и помогаем настроить маршрутизаторы, Wi-Fi, 4G и оборудование для усиления сигнала, для квартиры, офиса и объектов за городом.',
      ),
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'features',
      data: {
        items: [
          {
            icon: 'map-pin',
            title: ru('Склад в центре Бишкека'),
            text: ru(
              'Магазин и склад в ЦУМе, 4 этаж, A1. Большая часть каталога в наличии, приезжайте и забирайте в тот же день.',
            ),
          },
          {
            icon: 'shield',
            title: ru('Официальная гарантия'),
            text: ru(
              'Работаем с оригинальным оборудованием MikroTik, Ubiquiti, TP-Link, Keenetic, Huawei и ZTE. Гарантия производителя и помощь при обращении по гарантии.',
            ),
          },
          {
            icon: 'wrench',
            title: ru('Подбор и настройка'),
            text: ru(
              'Подбираем оборудование под задачу: от роутера для квартиры до сети офиса на MikroTik и радиомоста между зданиями. Настроим перед выдачей.',
            ),
          },
        ],
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        title: ru('Нужна помощь с сетью?'),
        text: ru(
          'Опишите задачу, подберём оборудование, рассчитаем бюджет и подскажем по настройке.',
        ),
        action: { kind: 'form', form: 'request', label: ru('Задать вопрос') },
      },
    },
    tx,
  )
}

async function seedFaqPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: ru('faq'),
      status: 'published',
      title: ru('Частые вопросы'),
      seoDescription: ru(
        'Ответы на вопросы о выборе роутера, гарантии, доставке, настройке MikroTik и усилении сигнала 4G.',
      ),
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero('Частые вопросы', 'О выборе оборудования, гарантии, доставке и настройке'),
    },
    tx,
  )
  await createBlock(siteId, page.id, { type: 'faq', data: { limit: 20 } }, tx)
  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        title: ru('Не нашли ответ на свой вопрос?'),
        text: ru(
          'Спросите нас о совместимости, покрытии Wi-Fi или сигнале 4G, ответим и подберём оборудование.',
        ),
        action: { kind: 'form', form: 'request', label: ru('Задать вопрос') },
      },
    },
    tx,
  )
}

async function seedContactsPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    { slug: ru('contacts'), status: 'published', title: ru('Контакты') },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    { type: 'addresses', data: { title: ru('Магазин в ЦУМе') } },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    { type: 'form', data: { title: ru('Подберём оборудование'), form: 'request' } },
    tx,
  )
}

async function seedPrivacyPage(siteId: SiteId, tx: Db | Transaction) {
  await ownPolicy(
    siteId,
    {
      content: paragraphs([
        'Через формы на сайте мы получаем имя, телефон и, если вы их укажете, email и текст сообщения. Эти данные нужны только для того, чтобы ответить на вашу заявку.',
        'Мы не передаём их третьим лицам и не используем для рассылок без вашего согласия. Заявки видят только сотрудники, которые их обрабатывают.',
        'Чтобы узнать, какие данные о вас хранятся, или попросить их удалить, свяжитесь с нами по контактам со страницы «Контакты».',
      ]),
    },
    tx,
  )
}

// The corner window comes first: a till set to answer in the conversation is refused without one.
async function seedChat(siteId: SiteId, tx: Db | Transaction) {
  await seedWidget(
    siteId,
    {
      name: ru('Написать в магазин'),
      success: ru(
        'Мы на связи. Расскажите о задаче, подберём оборудование и скажем, есть ли оно в наличии.',
      ),
    },
    tx,
  )
  const checkout = await checkoutForm(siteId, tx)
  await updateForm(siteId, checkout!.id, { toInbox: true, after: 'chat', showsTotal: true }, tx)
}

async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  const header = [
    { label: 'Каталог', slug: 'catalog' },
    { label: 'О магазине', slug: 'about' },
    { label: 'Вопросы', slug: 'faq' },
    { label: 'Контакты', slug: 'contacts' },
  ]
  for (const [index, item] of header.entries())
    await createMenuItem(
      siteId,
      {
        zone: 'header',
        label: ru(item.label),
        action: { kind: 'page', slug: item.slug },
        position: index,
      },
      tx,
    )

  const bar = [
    {
      label: ru('Каталог'),
      action: { kind: 'page' as const, slug: 'catalog' },
      icon: 'layout-grid' as const,
    },
    {
      label: ru('Поиск'),
      action: { kind: 'route' as const, route: 'search' as const },
      icon: 'search' as const,
    },
    {
      label: ru('Корзина'),
      action: { kind: 'route' as const, route: 'cart' as const },
      icon: 'shopping-cart' as const,
    },
  ]
  for (const [position, item] of bar.entries())
    await createMenuItem(siteId, { zone: 'bar', ...item, position }, tx)
}
