import { quoteRate } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { seedOrgWithSite } from '../owner'
import {
  setSiteLogo,
  setSitePublished,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { setOrgVerification } from '@anavi/backend/src/modules/admin/admin.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { seedBrandLogos, seedDictionary } from './dictionary'
import { seedNavigation } from './navigation'
import { seedLaptops } from './laptops'
import { seedPhones } from './phones'
import { seedLines } from './lines'
import { assetFile } from '../assets'
import { seedHighlights } from '../highlights'
import { seedForms } from './forms'
import { seedQuiz } from './quiz'
import { seedDiscounts } from './discounts'
import { seedPlaces } from '../places'
import { VEGA_ADDRESSES, VEGA_PLACES, seedVegaSite } from './site'

const ORG = {
  slug: 'demo2',
  name: 'Vega',
  defaultLocale: 'ru',
  locales: ['ru', 'en', 'ar'],
  tagline: {
    ru: 'Ноутбуки и смартфоны с гарантией',
    en: 'Laptops and smartphones with warranty',
    ar: 'أجهزة كمبيوتر محمولة وهواتف ذكية مع ضمان',
  },
  about: {
    ru: 'Магазин техники в Бишкеке: ноутбуки и смартфоны с официальной гарантией, доставкой по городу и рассрочкой.',
    en: 'Electronics store in Bishkek: laptops and smartphones with official warranty, city-wide delivery, and installment plans.',
    ar: 'متجر إلكترونيات في بيشكيك: أجهزة كمبيوتر محمولة وهواتف ذكية مع ضمان رسمي، وتوصيل داخل المدينة، وتقسيط ميسر.',
  },
  deliveryNote: {
    ru: 'Доставка по Бишкеку в день заказа, по регионам — 1–3 дня',
    en: 'Same-day delivery across Bishkek, 1–3 days to regions',
    ar: 'توصيل في بيشكيك في نفس يوم الطلب، وإلى المناطق خلال 1–3 أيام',
  },
  paymentNote: {
    ru: 'Оплата картой, наличными при получении или в рассрочку',
    en: 'Payment by card, cash on delivery, or installment plans',
    ar: 'الدفع بالبطاقة، نقدًا عند الاستلام أو بالتقسيط',
  },
  warrantyNote: {
    ru: 'Официальная гарантия 12 месяцев и сервис в нашем центре',
    en: 'Official 12-month warranty and in-house service center',
    ar: 'ضمان رسمي لمدة 12 شهرًا وخدمة صيانة في مركزنا',
  },
  channels: { whatsapp: '+996555100200' },
  theme: {
    look: 'retail' as const,
    font: 'console' as const,
    accent: '#4338ca',
    radius: 'sm' as const,
  },
}

// No orders. They used to be seeded through basket, checkout and status changes, and that is exactly
// why they had to go: `checkout` enqueues a letter, so every `db:reset` armed the queue with
// confirmations for people who do not exist. Place an order on the site and it walks the same code.
export async function seedVega(ownerId: bigint, tx: Db | Transaction) {
  const { org, site } = await seedOrgWithSite(
    ownerId,
    { name: ORG.name, slug: ORG.slug, defaultLocale: ORG.defaultLocale, locales: ORG.locales },
    tx,
  )
  await updateOrgSite(
    site.id,
    {
      tagline: ORG.tagline,
      about: ORG.about,
      deliveryNote: ORG.deliveryNote,
      paymentNote: ORG.paymentNote,
      warrantyNote: ORG.warrantyNote,
      channels: ORG.channels,
      features: { goods: true, cart: true, favorites: true },
      // The shop counts in som and is willing to be READ in dollars, at its own hung rate — written
      // here the way the owner writes it on the sign, «1 $ = 87,50 сом», and stored in the one
      // direction the platform keeps.
      rates: { USD: quoteRate(87.5, 'KGS', 'USD') },
    },
    tx,
  )
  await updateSiteTheme(site.id, ORG.theme, tx)
  await seedPlaces(site.id, VEGA_PLACES, tx)
  await setSiteLogo(site.id, await assetFile('vega/logo.png', 'image/png'), tx)

  await seedDictionary(site.id, tx)
  await seedBrandLogos(site.id, tx)
  const categories = await seedNavigation(site.id, tx)
  await seedLaptops(site.id, categories.get('laptop')!, tx)
  await seedPhones(site.id, categories.get('phone')!, tx)
  await seedLines(site.id, tx)
  await seedHighlights(site.id, tx, { inventDiscounts: true })
  const contact = await seedForms(site.id, tx)
  await seedQuiz(site.id, tx)
  await seedDiscounts(site.id, tx)

  const home = await createPage(
    site.id,
    {
      slug: { ru: 'home' },
      status: 'published',
      isHome: true,
      title: { ru: 'Vega', en: 'Vega', ar: 'Vega' },
    },
    tx,
  )

  // A price list per kind of goods, not one for the shop: a laptop and a smartphone are compared by
  // different figures, and the columns are the difference.
  // Roads, not bare words: on a laptop the memory, the drive and the screen are NODES, so `ram-gb`
  // alone names a characteristic the laptop itself does not carry. The address is the one a filter
  // and a facet use, and it is what lets the column header order the list.
  const columns = ['ram.ram-gb', 'storage.storage-gb', 'display.diagonal']
  const priceLists = [
    {
      slug: 'price-noutbuki',
      enSlug: 'price-laptops',
      title: {
        ru: 'Прайс-лист ноутбуков',
        en: 'Laptop price list',
        ar: 'قائمة أسعار أجهزة الكمبيوتر المحمول',
      },
      category: 'laptop',
      columns,
    },
    {
      slug: 'price-smartfony',
      enSlug: 'price-phones',
      title: {
        ru: 'Прайс-лист смартфонов',
        en: 'Smartphone price list',
        ar: 'قائمة أسعار الهواتف الذكية',
      },
      category: 'phone',
      // A phone keeps its memory and storage on itself and its screen and battery on nodes, so two
      // of the four are bare and two carry a road.
      columns: ['display.diagonal', 'ram-gb', 'storage-gb', 'battery.battery-capacity-mah'],
    },
  ]
  for (const list of priceLists) {
    const page = await createPage(
      site.id,
      { slug: { ru: list.slug, en: list.enSlug }, status: 'published', title: list.title },
      tx,
    )
    await createBlock(
      site.id,
      page.id,
      {
        type: 'table',
        data: {
          // No heading of its own — the page already carries one.
          category: list.category,
          columns: list.columns,
          showSku: true,
          showStock: true,
          showFilters: true,
          showExport: true,
          limit: 100,
        },
      },
      tx,
    )
  }

  // The same block locked: a visitor who writes `?price=…&limit=200` into the address gets exactly
  // these rows back — the switch stops the query, not just the panel.
  const offer = await createPage(
    site.id,
    {
      slug: { ru: 'predlozhenie-partneru', en: 'partner-offer' },
      status: 'published',
      title: { ru: 'Предложение для партнёра', en: 'Partner proposal', ar: 'عرض للشركاء' },
      noindex: true,
    },
    tx,
  )
  await createBlock(
    site.id,
    offer.id,
    {
      type: 'table',
      data: {
        title: { ru: 'Специальные условия', en: 'Special terms', ar: 'شروط خاصة' },
        category: 'laptop',
        values: ['manufacturer:lenovo'],
        columns,
        showSku: true,
        showFilters: false,
        showExport: true,
        limit: 100,
      },
    },
    tx,
  )

  const contacts = await createPage(
    site.id,
    {
      slug: { ru: 'contacts', en: 'contacts' },
      status: 'published',
      title: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
    },
    tx,
  )
  await createBlock(
    site.id,
    contacts.id,
    {
      type: 'hero',
      data: {
        layout: 'plain',
        slides: [
          {
            title: { ru: 'Свяжитесь с нами', en: 'Contact us', ar: 'تواصل معنا' },
            subtitle: {
              ru: 'Ответим в рабочее время, обычно в течение часа.',
              en: 'We will respond during business hours, usually within an hour.',
              ar: 'سنرد خلال ساعات العمل، عادةً في غضون ساعة.',
            },
          },
        ],
      },
    },
    tx,
  )
  // Where we are, then how to write: a contacts page that opens with a form asks before it answers.
  await createBlock(site.id, contacts.id, { type: 'addresses', data: VEGA_ADDRESSES }, tx)
  await createBlock(site.id, contacts.id, { type: 'form', data: { form: contact.slug } }, tx)

  // No page for the questionnaire: every button opens it where the reader already is, and a page
  // holding the same form would be a second door to one room.

  await seedVegaSite(site.id, home.id, tx)

  await setOrgVerification(org.id, { verification: 'verified' }, tx)
  await setSitePublished(site.id, true, tx)

  return site
}
