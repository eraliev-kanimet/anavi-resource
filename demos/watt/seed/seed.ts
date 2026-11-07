import { updateOrderTerms } from '@anavi/backend/src/modules/order/site-terms.service'
import { keptByAll } from '../../../seed/lib/features'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createSelection } from '@anavi/backend/src/modules/catalog/selection.service'
import { openLending } from '../../../seed/lib/instalments'
import { createProgram } from '@anavi/backend/src/modules/instalment/program.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { seedOrgWithSite, signUpOrganization, verifyOrg } from '../../../seed/lib/owner'
import {
  setSiteLogo,
  setSitePublished,
  updateOrgSite,
  updateSitePrefixes,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { createReview } from '@anavi/backend/src/modules/review/review.service'
import { resourceJson } from '../../../seed/lib/resource'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { assetFile, findImage } from '../../../seed/lib/assets'
import { seedHighlights } from '../../../seed/lib/highlights'
import { seedPlaces } from '../../../seed/lib/places'
import { seedCatalog } from './catalog'
import { seedForms } from './forms'
import { seedWattResources, seedWattServices } from './services'
import { seedWattPosts } from './posts'
import { WATT_ADDRESSES, WATT_CLIENTS, WATT_PLACES, seedWattSite } from './site'
import { updateOrg } from '@anavi/backend/src/modules/org/org.service'
import { dayAgo } from '../../../seed/lib/days'
import { createStaffLogin, updateStaff } from '@anavi/backend/src/modules/staff/staff.service'
import { permissionsFor } from '@anavi/shared'

// The fitter the demo's service orders are given to; the sales script names him by this name.
const WATT_FITTER = {
  login: 'watt-fitter',
  name: 'Бакыт Орозов',
  title: { ru: 'Мастер по установке', en: 'Installation technician', ar: 'فني التركيب' },
}

const ORG = {
  slug: 'watt',
  name: 'Watt',
  defaultLocale: 'ru',
  locales: ['ru', 'en', 'ar'],
  // Page slugs here are uniformly Russian-based, and an English prefix would have been the only
  // English word in the URL path.
  prefixes: { posts: 'poleznoe' },
  tagline: {
    ru: 'Бытовая техника с доставкой и установкой',
    en: 'Home appliances with delivery and installation',
    ar: 'أجهزة منزلية مع التوصيل والتركيب',
  },
  about: {
    ru: 'Магазин бытовой техники в Бишкеке: холодильники, стиральные машины и встраиваемая кухня со своим складом, своими мастерами и сервисом в городе.',
    en: 'Home appliances store in Bishkek: refrigerators, washing machines, and built-in kitchen appliances with our own warehouse, technicians, and local service.',
    ar: 'متجر أجهزة منزلية في بيشكيك: ثلاجات، غسالات، وأجهزة مطبخ مدمجة مع مستودع خاص، وفريق فنيين، ومركز صيانة معتمد.',
  },
  deliveryNote: {
    ru: 'По Бишкеку на следующий день, от 20 000 сомов бесплатно, подъём входит',
    en: 'Next-day delivery in Bishkek, free from 20,000 KGS, floor delivery included',
    ar: 'التسليم في اليوم التالي في بيشكيك، مجاناً للطلبات فوق 20,000 سوم مع الرفع للأدوار',
  },
  paymentNote: {
    ru: 'Картой или наличными при получении, рассрочка до 12 месяцев',
    en: 'Card or cash on receipt, or an installment plan up to 12 months',
    ar: 'بالبطاقة أو نقداً عند الاستلام، أو بالتقسيط حتى 12 شهراً',
  },
  warrantyNote: {
    ru: 'Заводская гарантия до трёх лет и свой сервис в Бишкеке',
    en: 'Factory warranty up to 3 years and our own service center in Bishkek',
    ar: 'ضمان المصنع حتى 3 سنوات ومركز صيانة معتمد في بيشكيك',
  },
  channels: { whatsapp: '+996700940940' },
  // The look is taken whole because a catalogue of ninety characteristics needs the dense grid and
  // the side panel. What a site changes is the other four handles.
  theme: {
    look: 'retail' as const,
    font: 'technical' as const,
    accent: '#ff6b00',
    // Corners are sharp (zero radius), reflecting the product domain rather than arbitrary preference.
    // Watt sells appliances — precision, power, same-day installation; rounded corners feel soft and domestic,
    // while straight edges convey seriousness. This also distinguishes it from Vega: two electronics stores
    // on adjacent radius steps were otherwise indistinguishable.
    radius: 'none' as const,
  },
}

// A selection must be expressible as a filter, otherwise it is a hand-picked list pretending to be
// a rule and goes stale the day a new oven arrives. "For a large family" could not be said in the
// vocabulary the catalogue has, and a name no filter can produce is a wish, not a name.
const SELECTIONS = [
  {
    slug: 's-pirolizom',
    name: {
      ru: 'Духовки с пиролизом',
      en: 'Pyrolytic ovens',
      ar: 'أفران بالتنظيف الذاتي الحراري',
    },
    category: 'duhovye-shkafy',
    values: 'ochistka:piroliticheskaya',
  },
  {
    slug: 'no-frost',
    name: {
      ru: 'Холодильники No Frost',
      en: 'No Frost refrigerators',
      ar: 'ثلاجات No Frost',
    },
    category: 'holodilniki',
    values: 'razmorazhivanie-holodilnoy-kamery:no-frost',
  },
  {
    slug: 'besprovodnye-pylesosy',
    name: {
      ru: 'Беспроводные пылесосы',
      en: 'Cordless vacuum cleaners',
      ar: 'مكانس كهربائية لاسلكية',
    },
    category: 'pylesosy',
    values: 'istochnik-pitaniya:akkumulyator',
  },
  {
    slug: 'rozhkovye-kofevarki',
    name: {
      ru: 'Рожковые кофеварки',
      en: 'Pump espresso makers',
      ar: 'ماكينات قهوة بمقبض احترافي',
    },
    category: 'kofemashiny',
    values: 'kofemashiny-tip:rozhkovaya',
  },
]

/**
 * What buyers said about particular appliances — the half of a decision about a washing machine
 * that the card cannot make itself.
 *
 * Each names its goods by the address the card answers at, through the door the back office form
 * uses; a slug the shelf does not hold fails the seed rather than leaving a review on the shop at
 * large. Written in Russian only, and left that way on purpose: a testimonial is a quotation, and
 * the platform does not translate people. One is hidden, and one carries no mark — so the card's
 * count and its average are visibly two different numbers.
 */
async function seedProductReviews(siteId: SiteId, tx: Db | Transaction) {
  const { reviews } = await resourceJson<{
    reviews: {
      product: string
      // How many days ago it was said.
      days: number
      author: string
      rating?: number
      text: string
      visible?: boolean
    }[]
  }>('demos/watt/reviews.json')
  for (const review of reviews) {
    await createReview(
      siteId,
      {
        product: review.product,
        author: review.author,
        rating: review.rating ?? null,
        text: { ru: review.text },
        visible: review.visible ?? true,
        saidOn: dayAgo(review.days),
      },
      tx,
    )
  }
}

export async function seedWatt(ownerId: bigint, tx: Db | Transaction) {
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
      // The second site where following makes sense: a shop whose new arrivals are the news. Two
      // rather than one, so the digest is exercised against more than a single timezone and clock.
      // And it serves: fitting and measuring are what its own articles have promised all along.
      // Paid on receipt — a card through the terminal or cash, in the hall and to the courier: the
      // shop shows no account to transfer to, so there is no code to draw.
      // An office buying on account («Алтын Логистикс») makes it a seller to organizations too.
      features: keptByAll({
        goods: true,
        certificates: true,
        trade_in: true,
        stock: true,
        cart: true,
        favorites: true,
        readers: true,
        services: true,
        accounts: true,
      }),
    },
    tx,
  )
  await updateOrderTerms(
    site.id,
    {
      payWays: ['cash'],
    },
    tx,
  )
  await updateSiteTheme(site.id, ORG.theme, tx)
  await updateSitePrefixes(site.id, ORG.prefixes, tx)
  await seedPlaces(site.id, WATT_PLACES, tx)
  await setSiteLogo(site.id, await assetFile('demos/watt/logo.svg', 'image/svg+xml'), tx)

  await seedCatalog(site.id, tx)
  await seedProductReviews(site.id, tx)

  for (const selection of SELECTIONS) {
    const made = await createSelection(
      site.id,
      {
        slug: selection.slug,
        name: selection.name,
        category: selection.category,
        mode: 'filter',
        shelf: { category: selection.category, values: selection.values.split(',') },
      },
      tx,
    )
    const cover = (await findImage(`demos/watt/collections/${selection.slug}.webp`)) ?? null
    if (cover)
      await attachMedia(
        site.id,
        'selection',
        made.id,
        { key: cover.key, width: cover.width, height: cover.height },
        tx,
      )
  }

  await seedHighlights(site.id, tx)
  await seedForms(site.id, tx)
  await seedWattServices(site.id, tx)
  await seedWattPosts(site.id, tx)

  /*
   * «Рассрочка 0%» has stood on this shop's first screen from the start and meant nothing: there
   * was no such thing on the platform. Two programmes, the shop's own — it spreads its own price
   * and waits for its own money: half a year with nothing added, and a year with a first payment
   * and a markup named once.
   */
  await openLending(org.id, tx)
  await createProgram(
    org.id,
    {
      name: {
        ru: 'Рассрочка 0% на 6 месяцев',
        en: '0% instalments for 6 months',
        ar: 'تقسيط بدون زيادة لمدة 6 أشهر',
      },
      terms: {
        ru: 'Без первого взноса и без переплаты. Нужен паспорт, оформляем при получении техники.',
        en: 'No first payment and nothing added. A passport is needed; we sign on delivery.',
        ar: 'بدون دفعة أولى وبدون زيادة. يلزم جواز السفر، ويتم التوقيع عند الاستلام.',
      },
      months: 6,
      down: 0,
      markup: 0,
      minSum: 1000000,
      maxSum: 15000000,
      placements: [{ siteId: site.id }],
    },
    tx,
  )
  await createProgram(
    org.id,
    {
      name: {
        ru: 'Рассрочка на 12 месяцев',
        en: 'Instalments for 12 months',
        ar: 'تقسيط لمدة 12 شهراً',
      },
      terms: {
        ru: 'Первый взнос 20%, наценка 8% от цены — названа один раз и не растёт. Пени за просрочку нет.',
        en: 'A first payment of 20% and a markup of 8% of the price — named once, it does not grow. No penalty for a late payment.',
        ar: 'دفعة أولى 20% وزيادة 8% من السعر — تُحدد مرة واحدة ولا تزيد. لا غرامة على التأخير.',
      },
      months: 12,
      down: 2000,
      markup: 800,
      minSum: 2000000,
      placements: [{ siteId: site.id }],
    },
    tx,
  )

  const home = await createPage(
    site.id,
    {
      slug: { ru: 'home' },
      status: 'published',
      isHome: true,
      title: { ru: 'Watt', en: 'Watt', ar: 'Watt' },
    },
    tx,
  )

  // The one page that ends in the form itself rather than in a band offering to open it: whoever came
  // here wants an address and a number and is already looking at both.
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
            title: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
            subtitle: {
              ru: 'Два зала, склад с сервисом и телефон, по которому отвечают.',
              en: 'Two showrooms, warehouse with service center, and a responsive phone line.',
              ar: 'معرضان، ومستودع مع مركز صيانة، وخط هاتف مباشر للرد على استفساراتكم.',
            },
          },
        ],
      },
    },
    tx,
  )
  await createBlock(site.id, contacts.id, { type: 'addresses', data: WATT_ADDRESSES }, tx)
  await createBlock(site.id, contacts.id, { type: 'form', data: { form: 'contact' } }, tx)

  await seedWattSite(site.id, home.id, tx)

  for (const client of WATT_CLIENTS) {
    const made = await signUpOrganization(client, tx)
    // An office with no site that buys: its purchases are what it keeps.
    await updateOrg(
      made.org.id,
      { taxId: client.taxId, address: client.address, features: { purchases: true } },
      tx,
    )
  }

  /*
   * Whoever does the fitting: one person in the one role that sees its own jobs and nothing else of
   * the shop. A login the owner issued rather than an address — a fitter is the member of staff
   * least likely to have a work mailbox, and that door exists for them.
   */
  const owner = {
    userId: ownerId,
    activeRole: 'owner' as const,
    viaOrgId: null,
    permissions: permissionsFor(['owner']),
  }
  const { staff } = await createStaffLogin(
    org.id,
    {
      login: WATT_FITTER.login,
      password: 'password',
      name: WATT_FITTER.name,
      roles: ['specialist'],
    },
    owner,
    tx,
  )
  await updateStaff(org.id, staff.id, { title: WATT_FITTER.title }, owner, tx)
  await seedWattResources(site.id, staff.userId, WATT_FITTER.name, tx)

  await verifyOrg(org.id, ownerId, tx)
  await setSitePublished(site.id, true, tx)
  return site
}
