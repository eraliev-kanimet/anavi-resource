import type { Db, Transaction } from '@anavi/backend/src/db'
import { keptByAll } from '../../../seed/lib/features'
import { openingStock } from '../../../seed/lib/books'
import { toMinor } from '@anavi/shared'
import {
  setSitePublished,
  setSiteLogo,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { openLending } from '../../../seed/lib/instalments'
import { createProgram } from '@anavi/backend/src/modules/instalment/program.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import type { ProductValueInput } from '@anavi/shared/schemas'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { seedImage, assetFile } from '../../../seed/lib/assets'
import { plainHero } from '../../../seed/lib/blocks'
import { seedQuestions } from '../../../seed/lib/faq'
import { ru } from '../../../seed/lib/labels'
import { seedOrgWithSite, verifyOrg } from '../../../seed/lib/owner'
import { seedPlaces } from '../../../seed/lib/places'
import { resourceJson } from '../../../seed/lib/resource'
import { seedDictionary, type LotCar } from './dictionary'
import { AVTO_ORG, AVTO_PLACES } from './index'

// Three rows of the lot, by what a buyer says first: «мне кроссовер». Make, year and the rest are
// the filter's work, and a shelf per make would be fourteen shelves of three cars.
const SHELVES = [
  { slug: 'krossovery', name: 'Кроссоверы и внедорожники' },
  { slug: 'sedany', name: 'Седаны' },
  { slug: 'universaly-i-pikapy', name: 'Универсалы, пикапы и минивэны' },
]

// The lots by the code a car names its own with, in the order `AVTO_PLACES` lists them.
const LOTS = ['archa-beshik', 'ak-orgo', 'ala-too']

function valuesOf(car: LotCar): ProductValueInput[] {
  const out: ProductValueInput[] = [
    { property: 'make', value: car.make },
    { property: 'year', value: String(car.year) },
    { property: 'mileage', number: car.mileage },
  ]
  for (const [property, value] of Object.entries(car.characteristics)) {
    if (typeof value === 'string') out.push({ property, value })
    else if (typeof value === 'number') out.push({ property, number: value })
    else out.push({ property, bool: value })
  }
  return out
}

export async function seedAvto996(ownerId: bigint, tx: Db | Transaction) {
  // Read before the first row is written: a lot without its cars is not a demo.
  const cars = await resourceJson<LotCar[]>('demos/avto996/cars.json')
  const sold = await resourceJson<LotCar[]>('demos/avto996/sold.json')

  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: AVTO_ORG.name,
      slug: AVTO_ORG.slug,
      defaultLocale: AVTO_ORG.defaultLocale,
      locales: AVTO_ORG.locales,
    },
    tx,
  )
  await updateOrgSite(
    site.id,
    {
      currency: AVTO_ORG.currency,
      country: AVTO_ORG.country,
      tagline: AVTO_ORG.tagline,
      about: AVTO_ORG.about,
      deliveryNote: AVTO_ORG.deliveryNote,
      paymentNote: AVTO_ORG.paymentNote,
      warrantyNote: AVTO_ORG.warrantyNote,
      channels: AVTO_ORG.channels,
      mapProvider: AVTO_ORG.mapProvider,
      features: keptByAll(AVTO_ORG.features),
      fillsCard: AVTO_ORG.fillsCard,
    },
    tx,
  )
  // After the currency and on its own: changing the base wipes the hung rates.
  await updateOrgSite(site.id, { rates: AVTO_ORG.rates }, tx)
  await updateSiteTheme(site.id, AVTO_ORG.theme, tx)
  await setSiteLogo(site.id, await assetFile('demos/avto996/logo.svg', 'image/svg+xml'), tx)
  await seedPlaces(site.id, AVTO_PLACES, tx)
  // In the order they were written, which is the order of `LOTS`: the car's own word for its lot
  // and the point its one unit of stock stands at are the same fact and must not part company.
  const places = await listPlaces(site.id, tx)
  const lots = new Map(LOTS.map((slug, index) => [slug, places[index]!.id]))

  await seedDictionary(site.id, cars, tx)

  const shelves = new Map<string, bigint>()
  for (const shelf of SHELVES) {
    const row = await createCategory(
      site.id,
      { slug: shelf.slug, name: ru(shelf.name), type: 'car' },
      tx,
    )
    shelves.set(shelf.slug, row.id)
  }

  for (const car of cars) {
    const name = ru(car.name)
    const product = await createProduct(
      site.id,
      {
        slug: car.slug,
        name,
        categoryId: shelves.get(car.shelf)!,
        values: valuesOf(car),
      },
      tx,
    )
    // One of each: a used car is its own whole stock, and the day it is sold the card says so.
    const variant = await createVariant(
      site.id,
      product.id,
      { price: toMinor(car.price, AVTO_ORG.currency), serial: car.vin, isPrimary: true },
      tx,
    )
    // Bought onto the lot it stands on. Without the lot the page said «на Арча-Бешике» under every car.
    const lot = lots.get(String(car.characteristics.lot))
    if (!lot) throw new Error(`avto996: ${car.slug} stands on no lot`)
    openingStock(variant.id, 1, lot)
    for (const photo of car.photos) {
      const image = await seedImage(`demos/avto996/cars/${photo}`, car.name)
      await attachMedia(
        site.id,
        'product',
        product.id,
        { key: image.key, width: image.width, height: image.height, caption: name },
        tx,
      )
    }
  }

  /*
   * The cars sold over the half year the books remember: taken off the site the day they left, as a
   * dealer takes them, and kept for what each one cost and earned. Their photographs left with
   * them — see `DEMO.md`. The history buys and sells them; nothing stands on a lot here.
   */
  for (const car of sold) {
    const product = await createProduct(
      site.id,
      {
        slug: car.slug,
        name: ru(car.name),
        categoryId: shelves.get(car.shelf)!,
        values: valuesOf(car),
        visible: false,
      },
      tx,
    )
    await createVariant(
      site.id,
      product.id,
      { price: toMinor(car.price, AVTO_ORG.currency), serial: car.vin, isPrimary: true },
      tx,
    )
  }

  /*
   * «Можно ли оставить задаток»: a car is taken off sale against three per cent of its price, and the
   * rest is paid the day it is re-registered. A condition of every car, so an order written from a
   * conversation awaits its deposit before the car can leave.
   */
  await openLending(org.id, tx)
  await createProgram(
    org.id,
    {
      name: ru('Задаток'),
      terms: ru(
        'Задаток 3 % от цены — снимаем машину с продажи на срок, о котором договорились. Остаток в день переоформления, без наценки.',
      ),
      months: 0,
      down: 300,
      markup: 0,
      placements: [{ siteId: site.id, isRequired: true }],
    },
    tx,
  )

  await seedQuestions(site.id, [{ slug: 'pokupka', name: 'Покупка' }], QUESTIONS, tx)
  await seedHomePage(site.id, tx)
  await seedCatalogPage(site.id, tx)
  await seedContactsPage(site.id, tx)
  await seedMenu(site.id, tx)

  await verifyOrg(org.id, ownerId, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

const QUESTIONS = [
  {
    question: 'Можно ли приехать со своим мастером?',
    answer:
      'Да, и мы сами это советуем. Подъёмника на площадках нет, поэтому на диагностику машину отвозим в сервис, который выберете вы, в черте города.',
  },
  {
    question: 'Цена на сайте окончательная?',
    answer:
      'Это цена, с которой начинается разговор на площадке. После осмотра обсуждаем, если нашлось то, о чём мы не написали.',
  },
  {
    question: 'Берёте ли машину в обмен?',
    answer:
      'По части машин да: в карточке это написано в строке «Обмен». Вашу машину оцениваем на месте в день осмотра.',
  },
  {
    question: 'Какие документы я получу?',
    answer:
      'Техпаспорт, договор купли-продажи и документы о растаможке, если машина привезена. Переоформление в ГРС проходим вместе с вами.',
  },
  {
    question: 'Можно ли оставить задаток и забрать позже?',
    answer:
      'Можно. Задаток оформляем распиской, машину снимаем с продажи на срок, о котором договорились.',
  },
]

async function seedHomePage(siteId: SiteId, tx: Db | Transaction) {
  const hero = await seedImage('demos/avto996/hero/1.png', AVTO_ORG.name)
  const page = await createPage(
    siteId,
    {
      slug: ru('home'),
      status: 'published',
      isHome: true,
      title: ru('Главная'),
      seoTitle: ru('Авто996 — автомобили с пробегом в Бишкеке'),
      seoDescription: AVTO_ORG.tagline,
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        // The photograph as the whole screen under one long sentence, and no subtitle: «автомобили
        // с пробегом в Бишкеке» is true of every lot on the market, and the sentence is where this
        // one says what it actually does.
        layout: 'poster',
        slides: [
          {
            eyebrow: ru('Три площадки открыты каждый день с 9:00 до 19:00'),
            title: ru(
              'Продаём автомобили с пробегом в Бишкеке на трёх площадках, в Арча-Бешике, Ак-Орго и Ала-Тоо: машины в наличии, и каждую можно проверить со своим мастером до разговора о цене',
            ),
            image: { key: hero.key, width: hero.width, height: hero.height },
            actions: [
              { kind: 'page', slug: 'catalog', label: ru('Смотреть машины') },
              { kind: 'form', form: 'request', label: ru('Оставить заявку') },
            ],
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
        title: ru('Сейчас в наличии'),
        // Four rows: eight cars out of forty read as a lot that has eight.
        limit: 16,
        showCategories: true,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  // The way out of the teaser. «Показать ещё» grows the grid in place and has no filter beside it;
  // whoever has looked at sixteen cars is choosing, and choosing is done on the page with the filter.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        title: ru('Все машины с фильтром по марке, году, цене и площадке'),
        action: { kind: 'page', slug: 'catalog', label: ru('Все автомобили') },
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
        title: ru('Как мы продаём'),
        items: [
          {
            icon: 'wrench',
            title: ru('Осмотр со своим мастером'),
            text: ru('Отвезём машину в сервис, который выберете вы.'),
          },
          {
            icon: 'file-text',
            title: ru('Документы до разговора о цене'),
            text: ru('Техпаспорт и растаможку показываем сразу.'),
          },
          {
            icon: 'gauge',
            title: ru('Пробег как есть'),
            text: ru('Пишем то, что на одометре в день приёмки.'),
          },
        ],
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    { type: 'faq', data: { title: ru('Частые вопросы'), limit: 5 } },
    tx,
  )
  await createBlock(siteId, page.id, { type: 'addresses', data: { title: ru('Где смотреть') } }, tx)
}

/*
 * All three lots at one address, with the filter standing beside it.
 *
 * A page and not only the shelves' own addresses: «покажите всё до двадцати тысяч» is asked across
 * body styles, and the resolver reaches pages before prefixes, so `/catalog` draws this while
 * `/catalog/<slug>` goes on resolving a single car.
 */
async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: ru('catalog'),
      status: 'published',
      title: ru('Все автомобили'),
      seoTitle: ru('Автомобили в наличии — Авто996, Бишкек'),
    },
    tx,
  )
  await createBlock(siteId, page.id, { type: 'hero', data: plainHero('Автомобили в наличии') }, tx)
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

async function seedContactsPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    { slug: ru('contacts'), status: 'published', title: ru('Контакты') },
    tx,
  )
  // Where the lots are, then how to write: a contacts page that opens with a form asks before it
  // answers. The form is the intake the site was born with — nothing was built for this page.
  await createBlock(siteId, page.id, { type: 'addresses', data: { title: ru('Площадки') } }, tx)
  await createBlock(
    siteId,
    page.id,
    { type: 'form', data: { title: ru('Оставить заявку'), form: 'request' } },
    tx,
  )
}

// The words a buyer says, not the words a site says: «все автомобили» and the two body styles most
// of the stock is, instead of «каталог». The third shelf is seven cars and is reached from the first.
async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  const header = [
    { label: 'Все автомобили', action: { kind: 'page' as const, slug: 'catalog' } },
    { label: 'Кроссоверы', action: { kind: 'category' as const, slug: 'krossovery' } },
    { label: 'Седаны', action: { kind: 'category' as const, slug: 'sedany' } },
    { label: 'Площадки', action: { kind: 'page' as const, slug: 'contacts' } },
  ]
  for (const [index, item] of header.entries())
    await createMenuItem(
      siteId,
      { zone: 'header', label: ru(item.label), action: item.action, position: index },
      tx,
    )

  // The header folds away on a phone, and the cars were reachable there only through the home page.
  // One tile between home and the menu: the lot keeps no basket and no shortlist to fill a row with.
  await createMenuItem(
    siteId,
    {
      zone: 'bar',
      label: ru('Машины'),
      action: { kind: 'page' as const, slug: 'catalog' },
      icon: 'car',
      position: 0,
    },
    tx,
  )
}
