import { ownPolicy } from '../../../seed/lib/policy'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { keptByAll } from '../../../seed/lib/features'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { toMinor } from '@anavi/shared'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createSelection } from '@anavi/backend/src/modules/catalog/selection.service'
import { updateCatalogTerms } from '@anavi/backend/src/modules/catalog/site-terms.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createGroup } from '@anavi/backend/src/modules/dictionary/group.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/dictionary/property.service'
import { createType, setTypeProperties } from '@anavi/backend/src/modules/dictionary/type.service'
import { checkoutForm } from '@anavi/backend/src/modules/form/form.public'
import { createForm, setStructure, updateForm } from '@anavi/backend/src/modules/form/form.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { updateOrderTerms } from '@anavi/backend/src/modules/order/site-terms.service'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import {
  setSitePublished,
  setSiteLogo,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { findImage, seedImage, assetFile } from '../../../seed/lib/assets'
import { openingStock } from '../../../seed/lib/books'
import { paragraphs, ru } from '../../../seed/lib/labels'
import { seedOrgWithSite, verifyOrg } from '../../../seed/lib/owner'
import { seedPlaces } from '../../../seed/lib/places'
import { resourceJson } from '../../../seed/lib/resource'
import { seedRequisite } from '../../../seed/lib/requisite'
import { seedWidget } from '../../../seed/lib/widget'
import {
  LAVANDA_ORG,
  LAVANDA_PLACES,
  type LavandaCategory,
  type LavandaHome,
  type LavandaPrivacy,
  type LavandaProduct,
  type LavandaProperty,
} from './index'

const TYPE = 'household'
const GROUP = 'main'

// Household goods go in dozens, and the number differs by item so that the stock column is not one
// figure down its whole length. Coprime multiplier and modulus.
const stockOf = (index: number) => 12 + ((index * 17) % 40)

export async function seedLavanda(ownerId: bigint, tx: Db | Transaction) {
  const { properties } = await resourceJson<{ properties: LavandaProperty[] }>(
    'demos/lavanda/data/properties.json',
  )
  const categories = await resourceJson<LavandaCategory[]>('demos/lavanda/data/categories.json')
  const products = await resourceJson<LavandaProduct[]>('demos/lavanda/data/products.json')
  const home = await resourceJson<LavandaHome>('demos/lavanda/data/home.json')
  const privacy = await resourceJson<LavandaPrivacy>('demos/lavanda/data/privacy.json')

  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: LAVANDA_ORG.name,
      slug: LAVANDA_ORG.slug,
      defaultLocale: LAVANDA_ORG.defaultLocale,
      locales: LAVANDA_ORG.locales,
    },
    tx,
  )
  await updateOrgSite(
    site.id,
    {
      currency: LAVANDA_ORG.currency,
      country: LAVANDA_ORG.country,
      tagline: LAVANDA_ORG.tagline,
      about: LAVANDA_ORG.about,
      deliveryNote: LAVANDA_ORG.deliveryNote,
      paymentNote: LAVANDA_ORG.paymentNote,
      warrantyNote: LAVANDA_ORG.warrantyNote,
      channels: LAVANDA_ORG.channels,
      mapProvider: LAVANDA_ORG.mapProvider,
      features: keptByAll(LAVANDA_ORG.features),
      productPages: LAVANDA_ORG.productPages,
    },
    tx,
  )
  await seedRequisite(org.id, ownerId, LAVANDA_ORG.payment, tx)
  await updateOrderTerms(
    site.id,
    {
      fulfilments: LAVANDA_ORG.fulfilments,
      payWays: LAVANDA_ORG.payWays,
      minDelivery: LAVANDA_ORG.minDelivery,
    },
    tx,
  )
  await updateCatalogTerms(site.id, { shortage: 'request' }, tx)
  await setZones(site.id, LAVANDA_ORG.zones, tx)
  await updateSiteTheme(site.id, LAVANDA_ORG.theme, tx)
  await setSiteLogo(site.id, await assetFile('demos/lavanda/logo.svg', 'image/svg+xml'), tx)
  await seedPlaces(site.id, LAVANDA_PLACES, tx)

  await seedDictionary(site.id, properties, tx)
  const shelves = await seedShelves(site.id, categories, tx)
  await seedGoods(site.id, products, shelves, tx)
  await seedSelections(site.id, products, tx)

  await seedHomePage(site.id, home, tx)
  await seedCatalogPage(site.id, tx)
  await seedContactsPage(site.id, tx)
  await seedPrivacyPage(site.id, privacy, tx)
  await seedChat(site.id, tx)
  await seedMenu(site.id, tx)

  await verifyOrg(org.id, ownerId, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

async function seedDictionary(siteId: SiteId, properties: LavandaProperty[], tx: Db | Transaction) {
  await createGroup(siteId, { slug: GROUP, name: ru('Основное') }, tx)
  for (const [index, property] of properties.entries()) {
    const row = await createProperty(
      siteId,
      {
        slug: property.slug,
        name: ru(property.name),
        kind: 'enum',
        group: GROUP,
        isFilterable: false,
        position: index,
      },
      tx,
    )
    for (const value of property.values)
      await createValue(siteId, row.id, { slug: value.slug, label: ru(value.label) }, tx)
  }

  const type = await createType(siteId, { slug: TYPE, name: ru('Товар для дома') }, tx)
  await setTypeProperties(
    siteId,
    type.id,
    {
      properties: properties.map((property, index) => ({
        property: property.slug,
        group: GROUP,
        isFilterable: property.filter,
        isMultivalued: false,
        showInCard: property.slug === 'fasovka',
        filterWidget: property.filter ? ('checkbox' as const) : null,
        position: index,
      })),
    },
    tx,
  )
}

async function seedShelves(siteId: SiteId, categories: LavandaCategory[], tx: Db | Transaction) {
  const shelves = new Map<string, bigint>()
  for (const [position, category] of categories.entries()) {
    const row = await createCategory(
      siteId,
      {
        slug: category.slug,
        name: ru(category.name),
        type: TYPE,
        description: paragraphs([category.description]),
        position,
      },
      tx,
    )
    shelves.set(category.slug, row.id)
    const cover = await findImage(`demos/lavanda/categories/${category.slug}.webp`)
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
  products: LavandaProduct[],
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
        values: item.values,
        ...(item.hit ? { isHit: true } : {}),
      },
      tx,
    )
    const variant = await createVariant(
      siteId,
      product.id,
      {
        sku: item.article,
        price: toMinor(item.price, LAVANDA_ORG.currency),
        ...(item.oldPrice ? { oldPrice: toMinor(item.oldPrice, LAVANDA_ORG.currency) } : {}),
        isPrimary: true,
      },
      tx,
    )
    if (item.inStock) openingStock(variant.id, stockOf(index))

    const image = await seedImage(`demos/lavanda/products/${item.photo}`, item.name)
    await attachMedia(
      siteId,
      'product',
      product.id,
      { key: image.key, width: image.width, height: image.height, caption: ru(item.name) },
      tx,
    )
  }
}

// Two shelves that cut across the sections: what the shop sells most often, and what is cheaper than
// usual this week. The second is whatever carries an old price, so it empties itself when none does.
async function seedSelections(siteId: SiteId, products: LavandaProduct[], tx: Db | Transaction) {
  await createSelection(
    siteId,
    {
      slug: 'chasto-berut',
      name: ru('Берут чаще всего'),
      mode: 'manual' as const,
      products: products.filter((item) => item.hit).map((item) => item.slug),
      position: 0,
    },
    tx,
  )
  await createSelection(
    siteId,
    {
      slug: 'deshevle',
      name: ru('Дешевле, чем обычно'),
      mode: 'manual' as const,
      products: products.filter((item) => item.oldPrice).map((item) => item.slug),
      position: 1,
    },
    tx,
  )
}

async function seedHomePage(siteId: SiteId, home: LavandaHome, tx: Db | Transaction) {
  const hero = await seedImage('demos/lavanda/hero/lavanda.webp', LAVANDA_ORG.name)
  const page = await createPage(
    siteId,
    {
      slug: ru('home'),
      status: 'published',
      isHome: true,
      title: ru('Главная'),
      seoTitle: ru('Лаванда — бытовая химия и хозтовары с доставкой по Бишкеку'),
      seoDescription: ru(
        'Порошки и гели для стирки, средства для уборки, посуда, гигиена, бумага и хозмелочи. Доставка по Бишкеку в день заказа.',
      ),
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        layout: 'cover',
        slides: [
          {
            eyebrow: ru('Бытовая химия и хозтовары · доставка по Бишкеку'),
            title: ru('Всё для дома, из одного заказа'),
            subtitle: ru(
              'Стирка, уборка, посуда, гигиена и мелочи, которые заканчиваются первыми. Собираем и привозим по городу в день заказа.',
            ),
            image: { key: hero.key, width: hero.width, height: hero.height },
            actions: [{ kind: 'page', slug: 'catalog', label: ru('Смотреть каталог') }],
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
      type: 'catalog',
      data: {
        eyebrow: ru('До конца недели'),
        title: ru('Дешевле, чем обычно'),
        selection: 'deshevle',
        limit: 8,
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
        eyebrow: ru('То, за чем возвращаются каждый месяц'),
        title: ru('Берут чаще всего'),
        selection: 'chasto-berut',
        limit: 12,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    { type: 'categories', data: { title: ru('Разделы'), limit: 8, showCount: true } },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'features',
      data: {
        title: ru('Как мы работаем'),
        items: [
          { icon: 'shopping-cart' as const, ...home.steps[0]! },
          { icon: 'phone' as const, ...home.steps[1]! },
          { icon: 'truck' as const, ...home.steps[2]! },
        ].map((step) => ({ icon: step.icon, title: ru(step.title), text: ru(step.text) })),
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
      seoTitle: ru('Каталог бытовой химии и хозтоваров'),
      seoDescription: ru(
        'Каталог Лаванды: стирка, посуда, уборка, гигиена, уход, бумага, инвентарь и хозмелочи с доставкой по Бишкеку.',
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
        feed: true,
      },
    },
    tx,
  )
}

// The questionnaire the shop sends after a delivery. «Rating» is a select of five, since the platform's
// own scale is a question with answers rather than a field of its own.
async function seedReview(siteId: SiteId, tx: Db | Transaction) {
  const form = await createForm(
    siteId,
    null,
    {
      slug: 'otzyv',
      name: ru('Отзыв о доставке'),
      success: ru('Спасибо! Мы прочитаем каждый ответ.'),
      position: 3,
    },
    tx,
  )
  await setStructure(
    siteId,
    form.id,
    {
      fields: [
        {
          key: 'name',
          type: 'text',
          role: 'name',
          label: ru('Как вас зовут'),
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          type: 'phone',
          role: 'phone',
          label: ru('Телефон'),
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'rating',
          type: 'select',
          label: ru('Оцените доставку'),
          isRequired: true,
          options: [5, 4, 3, 2, 1].map((score) => ({
            key: String(score),
            label: ru(String(score)),
          })),
        },
        {
          key: 'liked',
          type: 'multiselect',
          label: ru('Что понравилось'),
          options: ['Скорость', 'Цены', 'Качество товара', 'Курьер'].map((label, index) => ({
            key: `liked-${index + 1}`,
            label: ru(label),
          })),
        },
        {
          key: 'improve',
          type: 'textarea',
          label: ru('Что улучшить'),
          placeholder: ru('Если есть что добавить'),
        },
        { key: 'photo', type: 'file', label: ru('Фото заказа') },
      ],
    },
    tx,
  )
}

async function seedContactsPage(siteId: SiteId, tx: Db | Transaction) {
  await seedReview(siteId, tx)
  const page = await createPage(
    siteId,
    { slug: ru('contacts'), status: 'published', title: ru('Контакты') },
    tx,
  )
  await createBlock(siteId, page.id, { type: 'addresses', data: { title: ru('Где мы') } }, tx)
  await createBlock(
    siteId,
    page.id,
    { type: 'form', data: { title: ru('Написать нам'), form: 'request' } },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    { type: 'form', data: { title: ru('Отзыв о доставке'), form: 'otzyv' } },
    tx,
  )
}

async function seedPrivacyPage(siteId: SiteId, privacy: LavandaPrivacy, tx: Db | Transaction) {
  await ownPolicy(siteId, { content: paragraphs(privacy.text), title: ru(privacy.title) }, tx)
}

// Orders here are conversational agreements: «такого нет, возьмёте другое?» is answered in a chat.
async function seedChat(siteId: SiteId, tx: Db | Transaction) {
  await seedWidget(
    siteId,
    {
      name: ru('Написать в Лаванду'),
      success: ru('Мы на связи. Спросите, есть ли нужное сегодня и когда привезём.'),
    },
    tx,
  )
  const checkout = await checkoutForm(siteId, tx)
  await updateForm(siteId, checkout!.id, { toInbox: true, after: 'chat', showsTotal: true }, tx)
}

async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  const header = [
    { label: 'Каталог', action: { kind: 'page' as const, slug: 'catalog' } },
    { label: 'Берут чаще всего', action: { kind: 'selection' as const, slug: 'chasto-berut' } },
    { label: 'Дешевле, чем обычно', action: { kind: 'selection' as const, slug: 'deshevle' } },
    { label: 'Контакты', action: { kind: 'page' as const, slug: 'contacts' } },
  ]
  for (const [index, item] of header.entries())
    await createMenuItem(
      siteId,
      { zone: 'header', label: ru(item.label), action: item.action, position: index },
      tx,
    )

  const bar = [
    {
      label: ru('Каталог'),
      action: { kind: 'page' as const, slug: 'catalog' },
      icon: 'layout-grid' as const,
    },
    {
      label: ru('Избранное'),
      action: { kind: 'route' as const, route: 'favorites' as const },
      icon: 'heart' as const,
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
