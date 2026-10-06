import { toMinor, type Currency, type LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createPost } from '@anavi/backend/src/modules/content/post.service'
import { createForm, setStructure } from '@anavi/backend/src/modules/form/form.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { createReview } from '@anavi/backend/src/modules/review/review.service'
import { setDepots } from '@anavi/backend/src/modules/shipment/cargo.service'
import { setRestrictions } from '@anavi/backend/src/modules/shipment/restriction.service'
import { createCity } from '@anavi/backend/src/modules/shipment/city.service'
import { createRoute } from '@anavi/backend/src/modules/shipment/route.service'
import { setDeliveryRules } from '@anavi/backend/src/modules/shipment/shipment.service'
import { findImage } from '../assets'
import { seedQuestions } from '../faq'
import { resourceJson } from '../resource'
import { seedWidget } from '../widget'
import { TULPAR, type TulparSite } from './index'

/*
 * The shapes the three files are read by. Deliberately loose where a page differs from its
 * neighbour: a page is a hero and a handful of named sections, and WHICH sections is what makes it
 * that page — so each is read by name below, in the order it is printed, rather than walked as a
 * list of generic blocks. A generic list in the file would be a second page builder.
 */
interface Words {
  eyebrow?: LocalizedLabel
  title: LocalizedLabel
  text?: LocalizedLabel
}
interface Tile {
  image?: string
  title: LocalizedLabel
  text: LocalizedLabel
  page?: string
}
interface Tiles {
  title: LocalizedLabel
  items: Tile[]
}
interface Call extends Words {
  label: LocalizedLabel
  form?: string
}
interface Page {
  key: string
  slug: string
  title: LocalizedLabel
  seoTitle: LocalizedLabel
  description: LocalizedLabel
  hero: {
    layout: 'cover' | 'plain'
    images: string[]
    eyebrow: LocalizedLabel
    title: LocalizedLabel
    subtitle: LocalizedLabel
    primary?: LocalizedLabel
    secondary?: LocalizedLabel
  }
  [section: string]: unknown
}
interface FormField {
  key: string
  type: string
  role?: string
  label: LocalizedLabel
  placeholder?: LocalizedLabel
}
interface FormWords {
  slug: string
  name: LocalizedLabel
  success: LocalizedLabel
  steps?: { key: string; title: LocalizedLabel; fields: FormField[] }[]
}
interface SiteFile extends TulparSite {
  pages: Page[]
  forms: FormWords[]
  menu: {
    header: string[]
    footer: string[]
    action: { form: string; label: LocalizedLabel }
  }
}

interface Content {
  faq: {
    key: string
    name: LocalizedLabel
    items: { question: LocalizedLabel; answer: LocalizedLabel }[]
  }[]
  posts: {
    slug: string
    image: string
    days: number
    title: LocalizedLabel
    lede: LocalizedLabel
    body: LocalizedLabel[]
  }[]
  works: { image: string; client: string; title: LocalizedLabel; text: LocalizedLabel }[]
}

/*
 * The grid as a person writes it: whole soms and dollars, kilograms, per cent. Everything below
 * turns those into what the platform keeps — minor units, grams, hundredths of a per cent — and it
 * is the only place that does.
 */
interface Tariffs {
  routes: {
    key: string
    // The city the direction ends in, in the dispatchers' own word.
    city: string
    name: LocalizedLabel
    currency?: Currency
    tiers?: { upTo: number; price: number }[]
    extraPerKg?: number
    volumeDivisor?: number
    // The least a carriage costs, in whole units of the direction's money, and the kilograms its
    // weight is rounded up to; absent where the price list names neither.
    minPrice?: number
    weightStep?: number
    // Days on the road; absent where the road is drawn in legs and is as long as they are.
    daysMin?: number
    daysMax?: number
    insurance: number
    // The least an insurance costs and the worth it is offered from, in whole units of the
    // direction's money; absent where the price list names neither.
    insuranceMin?: number
    insuranceFrom?: number
    density?: { from: number; price: number; per: 'kg' | 'm3' }[]
    legs?: { to: string; name?: LocalizedLabel; days: number; departs?: number[] }[]
    // The weekdays a vehicle leaves on, 0 for Sunday; absent where one leaves any day.
    departs?: number[]
  }[]
  storage: { receive: number; pick: number; pack: number; keep: number }
  delivery: { attempts: number; holdDays: number; storageFreeDays: number; storagePerDay: number }
  carriage: { returnShare: number }
  cargo: {
    prefix: string
    combine: boolean
    // Days a parcel nobody can be told for is kept before the desk may dispose of it.
    unknownDays: number
    // What repacking a client's parcels into one box costs, in whole units of the site's money.
    repackFee: number
    // What sending a stopped parcel back to the seller, and disposing of it, costs.
    returnFee: number
    disposeFee: number
    // Days the owner of a stopped parcel has to answer before the rule answers «dispose».
    holdAnswerDays: number
    // The address as each marketplace's form asks for it.
    layouts: { name: string; fields: { label: string; value: string }[] }[]
    depots: {
      name: LocalizedLabel
      note: LocalizedLabel
      consignee: string
      phone: string
      region: string
      address: string
      zip: string
      route: string
    }[]
  }
  restrictions: {
    kind: 'banned' | 'surcharge'
    basis?: 'percent' | 'sum' | 'weight'
    surcharge?: number
    name: LocalizedLabel
    note?: LocalizedLabel
    words?: string[]
  }[]
}

export const tulparTariffs = () => resourceJson<Tariffs>('tulpar/tariffs.json')

const paragraph = (text: LocalizedLabel) => ({ type: 'paragraph' as const, data: { text } })

async function picture(key: string, alt: LocalizedLabel) {
  const image = await findImage(`tulpar/${key}.webp`, alt.ru)
  return image ? { key: image.key, width: image.width, height: image.height } : undefined
}

async function tiles(items: Tile[]) {
  const out = []
  for (const item of items) {
    const image = item.image ? await picture(item.image, item.title) : undefined
    out.push({ ...(image ? { image } : {}), title: item.title, text: item.text })
  }
  return out
}

/**
 * The tariff, the terms of keeping, the cargo depot and the list of what is refused — the four
 * things the carrier keeps once and the site, the calculator and the dispatcher all read.
 *
 * Returns the directions by the key the material names them with: a depot points at one, and so do
 * the answers of the calculator in the sales script.
 */
export async function seedTariff(
  siteId: SiteId,
  tx: Db | Transaction,
): Promise<Map<string, bigint>> {
  const grid = await tulparTariffs()
  const routes = new Map<string, bigint>()
  // The carrier's own list of cities, made of the words the tariff names: a direction points at a
  // row of it, and a word said twice is one city.
  const cities = new Map<string, bigint>()
  for (const word of new Set(grid.routes.map((route) => route.city))) {
    cities.set(word, (await createCity(siteId, { name: { ru: word } }, tx)).id)
  }
  for (const route of grid.routes) {
    const currency = route.currency ?? TULPAR.currency
    const row = await createRoute(
      siteId,
      {
        name: route.name,
        cityId: String(cities.get(route.city)),
        tiers: (route.tiers ?? []).map((tier) => ({
          upTo: tier.upTo * 1000,
          price: toMinor(tier.price, currency),
        })),
        extraPerKg: route.extraPerKg === undefined ? null : toMinor(route.extraPerKg, currency),
        volumeDivisor: route.volumeDivisor ?? null,
        minPrice: route.minPrice === undefined ? null : toMinor(route.minPrice, currency),
        weightStep: route.weightStep === undefined ? null : Math.round(route.weightStep * 1000),
        daysMin: route.daysMin ?? null,
        daysMax: route.daysMax ?? null,
        departs: route.departs ?? [],
        insuranceRate: Math.round(route.insurance * 100),
        insuranceMin:
          route.insuranceMin === undefined ? null : toMinor(route.insuranceMin, currency),
        insuranceFrom:
          route.insuranceFrom === undefined ? null : toMinor(route.insuranceFrom, currency),
        currency: route.currency ?? null,
        density: (route.density ?? []).map((step) => ({
          ...step,
          price: toMinor(step.price, currency),
        })),
        legs: route.legs ?? [],
      },
      tx,
    )
    routes.set(route.key, row.id)
  }

  await setDeliveryRules(
    siteId,
    {
      ...grid.delivery,
      storagePerDay: toMinor(grid.delivery.storagePerDay, TULPAR.currency),
    },
    tx,
  )
  // After the rules, never before: the depots share that row, and written first they would stand
  // it up with the platform's own two numbers for the rules to overwrite a moment later.
  await setDepots(
    siteId,
    {
      prefix: grid.cargo.prefix,
      combine: grid.cargo.combine,
      unknownDays: grid.cargo.unknownDays,
      repackFee: toMinor(grid.cargo.repackFee, TULPAR.currency),
      returnFee: toMinor(grid.cargo.returnFee, TULPAR.currency),
      disposeFee: toMinor(grid.cargo.disposeFee, TULPAR.currency),
      holdAnswerDays: grid.cargo.holdAnswerDays,
      layouts: grid.cargo.layouts,
      depots: grid.cargo.depots.map(({ route, ...depot }) => ({
        ...depot,
        routeId: routes.get(route)!,
      })),
    },
    tx,
  )
  await setRestrictions(siteId, { items: grid.restrictions }, tx)
  return routes
}

/**
 * The four doors: the corner window, the intake the platform made, the calculator and the
 * application for storage.
 *
 * The calculator asks about the LOAD first and the person last — a form that counts gives its
 * figure before it asks for a telephone. The application for storage counts nothing, so it runs the
 * ordinary way round: three lines about the person, then the goods.
 */
export async function seedForms(siteId: SiteId, site: SiteFile, tx: Db | Transaction) {
  const words = (slug: string) => site.forms.find((form) => form.slug === slug)!
  const chat = words('chat')
  await seedWidget(siteId, { name: chat.name, success: chat.success }, tx)

  for (const [index, slug] of ['calc', 'fulfilment'].entries()) {
    const copy = words(slug)
    const form = await createForm(
      siteId,
      { slug, name: copy.name, success: copy.success, position: 3 + index },
      tx,
    )
    await setStructure(
      siteId,
      form.id,
      {
        steps: copy.steps!.map((step) => ({ key: step.key, title: step.title })),
        fields: copy.steps!.flatMap((step) =>
          step.fields.map((field) => ({
            key: field.key,
            step: step.key,
            type: field.type,
            ...(field.role ? { role: field.role } : {}),
            label: field.label,
            ...(field.placeholder ? { placeholder: field.placeholder } : {}),
            isRequired: REQUIRED.has(field.key),
            ...(REMEMBERED.has(field.key) ? { isRemembered: true } : {}),
            ...(HALF.has(field.key) ? { width: 'half' } : {}),
          })),
        ),
      },
      tx,
    )
  }
}

// What a form cannot do without, by key. The three sizes stay optional on purpose: a visitor who
// knows only the weight still gets a figure, and it is shown as a floor.
// The address to collect from is one of them: a request without it cannot become a shipment.
const REQUIRED = new Set(['route', 'weight', 'name', 'phone', 'address', 'goods'])
// What the browser hands back next time: who is writing, and nothing an estimate is made of.
const REMEMBERED = new Set(['name', 'phone', 'company'])
const HALF = new Set(['weight', 'length', 'width', 'height', 'places', 'items', 'orders'])

export async function seedContent(siteId: SiteId, tx: Db | Transaction) {
  const content = await resourceJson<Content>('tulpar/content.json')

  await seedQuestions(
    siteId,
    content.faq.map((group) => ({ slug: group.key, name: group.name })),
    content.faq.flatMap((group) =>
      group.items.map((item) => ({
        group: group.key,
        question: item.question,
        answer: item.answer,
      })),
    ),
    tx,
  )

  // Oldest first, so the newest is the last one written and the feed reads in the order of the file.
  const now = Date.now()
  for (const post of [...content.posts].sort((a, b) => b.days - a.days)) {
    const made = await createPost(
      siteId,
      {
        slug: post.slug,
        type: 'article',
        title: post.title,
        summary: post.lede,
        body: { blocks: post.body.map(paragraph) },
        status: 'published',
        publishedAt: new Date(now - post.days * 86_400_000),
      },
      tx,
    )
    const cover = await findImage(`tulpar/${post.image}.webp`, post.title.ru)
    if (cover)
      await attachMedia(
        siteId,
        'post',
        made.id,
        { key: cover.key, width: cover.width, height: cover.height, caption: post.title },
        tx,
      )
  }

  let position = 0
  for (const work of content.works) {
    // A work IS its photograph: one made without it would stand in the list as a caption over
    // nothing.
    const image = await findImage(`tulpar/${work.image}.webp`, work.title.ru)
    if (!image) continue
    const row = await createReview(
      siteId,
      {
        author: work.client,
        caption: work.title,
        text: work.text,
        isWork: true,
        position: position++,
      },
      tx,
    )
    await attachMedia(
      siteId,
      'review',
      row.id,
      { key: image.key, width: image.width, height: image.height, caption: work.title },
      tx,
    )
  }
}

export async function seedPages(siteId: SiteId, site: SiteFile, tx: Db | Transaction) {
  const page = (key: string) => site.pages.find((one) => one.key === key)!
  const part = <T>(key: string, name: string) => page(key)[name] as T

  const block = (pageId: bigint, type: string, data: unknown) =>
    createBlock(siteId, pageId, { type, data }, tx)

  const open = async (key: string) => {
    const copy = page(key)
    const row = await createPage(
      siteId,
      {
        slug: Object.fromEntries(TULPAR.locales.map((locale) => [locale, copy.slug || 'home'])),
        status: 'published',
        isHome: key === 'home',
        title: copy.title,
        seoTitle: copy.seoTitle,
        seoDescription: copy.description,
      },
      tx,
    )
    const [first, ...rest] = copy.hero.images
    const lead = first ? await picture(first, copy.hero.title) : undefined
    const actions = [
      ...(copy.hero.primary
        ? [{ kind: 'form' as const, form: 'calc', label: copy.hero.primary }]
        : []),
      ...(copy.hero.secondary
        ? [{ kind: 'page' as const, slug: 'tariffs', label: copy.hero.secondary }]
        : []),
    ]
    const more = []
    // The later slides carry photographs and no words: the claim stands still while they change.
    if (copy.hero.layout === 'cover')
      for (const key of rest) {
        const image = await picture(key, copy.hero.title)
        if (image) more.push({ image })
      }
    await block(row.id, 'hero', {
      layout: copy.hero.layout,
      slides: [
        {
          eyebrow: copy.hero.eyebrow,
          title: copy.hero.title,
          subtitle: copy.hero.subtitle,
          ...(lead && copy.hero.layout === 'cover' ? { image: lead } : {}),
          actions,
        },
        ...more,
      ],
    })
    return row.id
  }

  const features = async (pageId: bigint, layout: 'cells' | 'steps', section: Tiles) =>
    block(pageId, 'features', { layout, title: section.title, items: await tiles(section.items) })

  const words = (pageId: bigint, section: Words, more: unknown[] = []) =>
    block(pageId, 'text', {
      title: section.title,
      content: { blocks: [...(section.text ? [paragraph(section.text)] : []), ...more] },
    })

  const call = (pageId: bigint, section: Call) =>
    block(pageId, 'cta', {
      title: section.title,
      text: section.text,
      action: { kind: 'form', form: section.form ?? 'request', label: section.label },
    })

  const home = await open('home')
  await block(home, 'tracking', part<Words>('home', 'tracking'))
  const services = part<Tiles>('home', 'services')
  const banners = []
  for (const item of services.items) {
    const image = await picture(item.image!, item.title)
    banners.push({
      ...(image ? { image } : {}),
      title: item.title,
      text: item.text,
      action: { kind: 'page', slug: item.page! },
    })
  }
  await block(home, 'banners', { layout: 'tile', title: services.title, items: banners })
  await features(home, 'cells', part<Tiles>('home', 'numbers'))
  await block(home, 'works', { title: part<Words>('home', 'works').title, limit: 5 })
  await block(home, 'posts', {
    title: part<Words>('home', 'posts').title,
    limit: 3,
    filters: false,
  })
  await block(home, 'faq', { title: part<Words>('home', 'faq').title, limit: 6 })
  await call(home, part<Call>('home', 'cta'))

  const fulfilment = await open('fulfilment')
  await features(fulfilment, 'steps', part<Tiles>('fulfilment', 'steps'))
  await features(fulfilment, 'cells', part<Tiles>('fulfilment', 'more'))
  await words(fulfilment, part<Words>('fulfilment', 'charges'))
  await call(fulfilment, part<Call>('fulfilment', 'cta'))

  const courier = await open('courier')
  await features(courier, 'cells', part<Tiles>('courier', 'features'))
  await call(courier, part<Call>('courier', 'cta'))

  const freight = await open('freight')
  await features(freight, 'steps', part<Tiles>('freight', 'features'))
  // The timetable is printed from the directions themselves: the days a lorry leaves are kept once,
  // on the tariff, and the page cannot name a Tuesday the dispatcher's screen does not.
  await block(freight, 'tariff', {
    title: part<Words>('freight', 'schedule').title,
    show: 'schedule',
  })
  await call(freight, part<Call>('freight', 'cta'))

  const cargo = await open('cargo')
  await block(cargo, 'cargo', part<Words>('cargo', 'code'))
  await block(cargo, 'parcels', part<Words>('cargo', 'parcels'))
  await features(cargo, 'steps', part<Tiles>('cargo', 'steps'))
  await features(cargo, 'cells', part<Tiles>('cargo', 'more'))
  await words(cargo, part<Words>('cargo', 'buyout'))
  await block(cargo, 'tariff', { ...part<Words>('cargo', 'restrictions'), show: 'restrictions' })
  await call(cargo, part<Call>('cargo', 'cta'))

  const tariffs = await open('tariffs')
  await words(tariffs, part<Words>('tariffs', 'weight'))
  await block(tariffs, 'tariff', { title: part<Words>('tariffs', 'grid').title, show: 'grid' })
  await words(tariffs, part<Words>('tariffs', 'density'))
  /*
   * The warehouse's rates are printed off an AGREEMENT: a rate of storage belongs to two businesses
   * and not to the site. The block stands here pointing at none — the agreements are made after
   * every demo is built (`keeping.ts`), and that is where it is pointed at the first of them.
   */
  await block(tariffs, 'tariff', {
    title: part<{ title: LocalizedLabel }>('tariffs', 'storage').title,
    show: 'storage',
  })
  const quote = part<Call>('tariffs', 'cta')
  await block(tariffs, 'form', { title: quote.title, form: 'calc' })

  const points = await open('points')
  await block(points, 'addresses', { title: part<Words>('points', 'addresses').title })
  await words(points, part<Words>('points', 'bring'))

  const news = await open('news')
  await block(news, 'posts', { limit: 12, filters: false })

  const help = await open('help')
  await block(help, 'faq', { layout: 'base', limit: 100 })

  const label = (key: string) => page(key).title
  for (const zone of ['header', 'footer'] as const)
    for (const [index, key] of site.menu[zone].entries())
      await createMenuItem(
        siteId,
        { zone, label: label(key), action: { kind: 'page', slug: key }, position: index },
        tx,
      )
  await createMenuItem(
    siteId,
    {
      zone: 'action',
      label: site.menu.action.label,
      action: { kind: 'form', form: site.menu.action.form },
      position: 0,
    },
    tx,
  )
}

export const tulparSiteFile = () => resourceJson<SiteFile>('tulpar/site.json')
