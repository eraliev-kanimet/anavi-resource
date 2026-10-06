import type { Db, Transaction } from '@anavi/backend/src/db'
import { toMinor } from '@anavi/shared'
import { seedOrgWithSite } from '../owner'
import {
  setSitePublished,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { updateForm } from '@anavi/backend/src/modules/form/form.service'
import { checkoutForm } from '@anavi/backend/src/modules/form/form.public'
import { seedWidget } from '../widget'
import { setOrgVerification } from '@anavi/backend/src/modules/admin/admin.service'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import { findImage, seedImage } from '../assets'
import { seedPlaces } from '../places'
import { seedRequisite } from '../requisite'
import { paragraphsOf } from '../labels'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { KHALIF_CATEGORIES, KHALIF_ORG, KHALIF_PLACES, KHALIF_PRODUCTS } from './index'

/*
 * The counter holds more of a cut than a grocery's meat corner does, and in STEPS like every
 * quantity here: twenty-two kilos of shoulder is two hundred and twenty.
 *
 * The multiplier and the modulus are coprime on purpose. The first version multiplied by 17 modulo
 * 34, which walks two values and comes back — fourteen cuts, two numbers, and a shelf that reads as
 * a copy-paste the moment anybody looks at it. Found by reading the seeded rows rather than the
 * code, which is the only way this kind of thing is ever found.
 */
function stockOf(index: number, steps: number): number {
  return (14 + ((index * 13) % 29)) * steps
}

export async function seedKhalif(ownerId: bigint, tx: Db | Transaction) {
  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: KHALIF_ORG.name,
      slug: KHALIF_ORG.slug,
      defaultLocale: KHALIF_ORG.defaultLocale,
      locales: KHALIF_ORG.locales,
    },
    tx,
  )

  await updateOrgSite(
    site.id,
    {
      currency: KHALIF_ORG.currency,
      country: KHALIF_ORG.country,
      tagline: KHALIF_ORG.tagline,
      about: KHALIF_ORG.about,
      deliveryNote: KHALIF_ORG.deliveryNote,
      paymentNote: KHALIF_ORG.paymentNote,
      warrantyNote: KHALIF_ORG.warrantyNote,
      channels: KHALIF_ORG.channels,
      mapProvider: KHALIF_ORG.mapProvider,
      features: KHALIF_ORG.features,
      fulfilments: KHALIF_ORG.fulfilments,
      correction: KHALIF_ORG.correction,
      shortage: KHALIF_ORG.shortage,
      productPages: KHALIF_ORG.productPages,
    },
    tx,
  )
  await setZones(site.id, KHALIF_ORG.zones, tx)
  await updateSiteTheme(site.id, KHALIF_ORG.theme, tx)
  await seedPlaces(site.id, KHALIF_PLACES, tx)

  const shelves = new Map<string, bigint>()
  for (const shelf of KHALIF_CATEGORIES) {
    const row = await createCategory(
      site.id,
      { slug: shelf.slug, name: shelf.name, position: shelf.sort },
      tx,
    )
    shelves.set(shelf.slug, row.id)
  }

  for (const [index, item] of KHALIF_PRODUCTS.entries()) {
    const product = await createProduct(
      site.id,
      {
        slug: item.slug,
        name: item.name,
        summary: item.summary,
        ...(item.text ? { description: paragraphsOf(item.text) } : {}),
        categoryId: shelves.get(item.category)!,
        ...(item.measure
          ? {
              priceUnit: item.measure.unit,
              unitSteps: item.measure.steps,
            }
          : {}),
        position: index,
      },
      tx,
    )

    for (const [order, pack] of item.packs.entries()) {
      await createVariant(
        site.id,
        product.id,
        {
          price: toMinor(pack.price, KHALIF_ORG.currency),
          ...(pack.old ? { oldPrice: toMinor(pack.old, KHALIF_ORG.currency) } : {}),
          stock: pack.stock ?? stockOf(index + order, item.measure?.steps ?? 1),
          // Sold by the kilo, so a unit weighs one: the market that lays this row out prices its
          // delivery by a carrier's tariff, and a tariff reads weight.
          ...(item.measure && item.measure.steps > 1 ? { weight: 1000 } : {}),
          ...(item.measure ? { minQty: item.measure.min } : {}),
          position: order,
          isPrimary: order === 0,
        },
        tx,
      )
    }

    /*
     * A raw cut keeps the photograph it has always had, in `dyikan/`: one and the same picture of
     * one and the same meat, and a copy of it under another name would be a hundred megabytes paid
     * to form. A marinade has a picture of its own and it may not have arrived yet — tolerant on
     * purpose, so the shelf comes up today and the photograph joins it when it is shot.
     */
    const image = await findImage(item.image, item.name.ru)
    if (image)
      await attachMedia(
        site.id,
        'product',
        product.id,
        { key: image.key, width: image.width, height: image.height, caption: item.name },
        tx,
      )
  }

  await seedHomePage(site.id, tx)
  await seedCatalogPage(site.id, tx)
  await seedContactsPage(site.id, tx)
  await seedRequisite(org.id, ownerId, KHALIF_ORG.payment, tx)
  await seedChat(site.id, tx)
  await seedCheckout(site.id, tx)
  await seedMenu(site.id, tx)

  await setOrgVerification(org.id, { verification: 'verified' }, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

async function seedHomePage(siteId: SiteId, tx: Db | Transaction) {
  /*
   * The shop's own first screen the moment it is shot, and a cut of its own meat until then.
   *
   * A butcher's first screen is meat rather than a picture of a shop, so the fallback is not a
   * placeholder: it is the right kind of picture, one size too small. Written as a preference and
   * not as a swap to make later, because a swap to make later is a swap nobody makes.
   */
  const hero =
    (await findImage('khalif/hero/1.webp', KHALIF_ORG.name)) ??
    (await seedImage('dyikan/beef-ribeye.webp', KHALIF_ORG.name))
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'home', en: 'home' },
      status: 'published',
      isHome: true,
      title: { ru: 'Главная', en: 'Home', ar: 'الرئيسية' },
      seoTitle: {
        ru: 'Халиф — мясная лавка на Ошском рынке',
        en: 'Khalif — a butcher shop at the Osh bazaar',
        ar: 'خليف — محل جزارة في سوق أوش',
      },
      seoDescription: KHALIF_ORG.tagline,
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
            eyebrow: {
              ru: 'Халяль · утренний забой',
              en: 'Halal · morning slaughter',
              ar: 'حلال · ذبح صباحي',
            },
            title: KHALIF_ORG.tagline,
            subtitle: {
              ru: 'Целыми тушами берём, при вас режем. Говядина, баранина, птица.',
              en: 'Whole carcasses, cut in front of you. Beef, lamb and poultry.',
              ar: 'ذبائح كاملة نقطعها أمامك. لحم بقري وضأن ودواجن.',
            },
            image: { key: hero.key, width: hero.width, height: hero.height },
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
        title: { ru: 'Что на прилавке', en: 'On the counter', ar: 'ما هو معروض' },
        limit: 12,
        showCategories: true,
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
      type: 'addresses',
      data: {
        title: { ru: 'Где мы стоим', en: 'Where we are', ar: 'أين نحن' },
      },
    },
    tx,
  )
}

/*
 * The whole counter at one address.
 *
 * The home page shows twelve of it and stops; a shop with thirteen shelves needs a place where all
 * of it is, and the resolver reaches pages before prefixes — so `/catalog` draws the shelves while
 * `/catalog/<slug>` goes on resolving a single good, exactly as it does for the market.
 */
async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'catalog', en: 'catalog', ar: 'catalog' },
      status: 'published',
      title: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
      seoTitle: {
        ru: 'Каталог мяса и продуктов — Халиф, Ошский рынок',
        en: 'Meat and grocery catalogue — Khalif, Osh bazaar',
        ar: 'كتالوج اللحوم والمواد الغذائية — خليف، سوق أوش',
      },
      seoDescription: {
        ru: 'Маринады, говядина, баранина и птица со своего цеха, рыба, молочное, мёд, варенье, финики, крупы и приправы. Режем и взвешиваем при вас.',
        en: 'Marinades, beef, lamb and poultry from our own cutting room, plus fish, dairy, honey, preserves, dates, grains and spices. Cut and weighed in front of you.',
        ar: 'متبّلات ولحوم بقر وضأن ودواجن من ورشتنا، وسمك وألبان وعسل ومربّى وتمور وحبوب وبهارات. نقطّع ونزن أمامك.',
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
        limit: 24,
        showCategories: true,
        showPrice: true,
        showAction: true,
        showSort: true,
        // Thirteen shelves and fifty goods: the page IS the counter, so it scrolls rather than
        // paginating somebody through a butcher's shop.
        feed: true,
      },
    },
    tx,
  )
}

/*
 * A butcher's order is a conversation, and that is not a preference — it is what the counter does.
 *
 * «Кило гуляша» is a kilo until it is on the scales; a shortage is answered with «возьмите лопатку»;
 * a delivery hour is agreed, not chosen from a list. The market next door already sells this way and
 * for the same reasons. The corner window comes first: a till set to answer in the conversation is
 * refused without one, and rightly — it would hand the order to a chat that does not exist.
 */
async function seedChat(siteId: SiteId, tx: Db | Transaction) {
  await seedWidget(
    siteId,
    {
      name: { ru: 'Написать в лавку', en: 'Message the shop', ar: 'مراسلة المحل' },
      success: {
        ru: 'Мы на связи. Спросите, что сегодня свежее и на сколько человек берёте.',
        en: 'We are here. Ask what is freshest today and how many you are feeding.',
        ar: 'نحن هنا للرد. اسأل عمّا هو طازج اليوم وكم عدد الأشخاص.',
      },
    },
    tx,
  )
}

async function seedCheckout(siteId: SiteId, tx: Db | Transaction) {
  const checkout = await checkoutForm(siteId, tx)
  /*
   * And the till says what it comes to.
   *
   * In the corner window nothing else does: the basket's own page stands the lines and the sum above
   * the questionnaire, while the window asks for a name and an address with no figure anywhere. A
   * butcher's basket is weighed and corrected afterwards, so the number is a floor rather than a
   * promise — which is exactly what `shortage: 'request'` already makes it, and the window says so
   * in the word it prints beside it.
   */
  await updateForm(siteId, checkout!.id, { toInbox: true, after: 'chat', showsTotal: true }, tx)
}

/*
 * Four words in the header and nothing in a footer, like the market's.
 *
 * The shop had no menu at all until now — its home page was reachable and nothing else was, which
 * is why the catalogue looked missing rather than unlinked.
 */
async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  const header: { label: Record<string, string>; slug: string }[] = [
    { label: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' }, slug: 'catalog' },
    { label: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' }, slug: 'contacts' },
  ]
  for (const [index, item] of header.entries())
    await createMenuItem(
      siteId,
      {
        zone: 'header',
        label: item.label,
        action: { kind: 'page', slug: item.slug },
        position: index,
      },
      tx,
    )
}

async function seedContactsPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'contacts', en: 'contacts' },
      status: 'published',
      title: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    { type: 'addresses', data: { title: { ru: 'Лавка', en: 'The shop', ar: 'المحل' } } },
    tx,
  )
}
