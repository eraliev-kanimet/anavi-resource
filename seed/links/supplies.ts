import { updateSupplyTerms } from '@anavi/backend/src/modules/supply/site-terms.service'
import { and, db, eq, inArray, isNull, type Db, type Transaction } from '@anavi/backend/src/db'
import { catCategory, catProduct } from '@anavi/backend/src/db/schema/cat'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { asSiteId, type SiteId } from '@anavi/backend/src/db/ids'
import {
  answerSupply,
  getSupply,
  inviteSupply,
  setSelection,
} from '@anavi/backend/src/modules/supply/supply.service'
import { addSupplier } from '@anavi/backend/src/modules/subscription/supplier.service'
import { askRequest } from '@anavi/backend/src/modules/supply/supply-request.service'
import { setShelf } from '@anavi/backend/src/modules/supply/supply-shelf.service'
import { setMap } from '@anavi/backend/src/modules/supply/supply-map.service'
import { publishTerms } from '@anavi/backend/src/modules/supply/supply-terms.service'
import { createReview } from '@anavi/backend/src/modules/review/review.service'
import { replyToShelfReview } from '@anavi/backend/src/modules/review/review-shelf.service'
import {
  dayIn,
  toMinor,
  type Currency,
  type LocalizedLabel,
  type TermsNumbers,
} from '@anavi/shared'
import { resourceJson } from '../lib/resource'
import { findImage } from '../lib/assets'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { getOrgSite, updateOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { actorOf } from './keeping'
import { srvService } from '@anavi/backend/src/db/schema/srv'
import { formForm } from '@anavi/backend/src/db/schema/form'
import { createService, updateService } from '@anavi/backend/src/modules/service/service.service'
import { setCategoryServices } from '@anavi/backend/src/modules/service/service.attach'
import { findCategoryBySlug } from '@anavi/backend/src/modules/catalog/category.service'
import { createGroup } from '@anavi/backend/src/modules/service/group.service'
import { createForm, setStructure } from '@anavi/backend/src/modules/form/form.service'
import { declareBinding } from '@anavi/backend/src/modules/service/provider.binding'
import {
  answerProvider,
  askToProvide,
  inviteProvider,
} from '@anavi/backend/src/modules/service/provider.service'
import { offerShare } from '@anavi/backend/src/modules/service/provider.share'
import { editionRead } from '@anavi/backend/src/modules/service/provider.service'
import { setTerms } from '@anavi/backend/src/modules/service/provider.terms'
import { inviteProviderByEmail } from '@anavi/backend/src/modules/service/provider.invite'
import {
  createResource,
  setHours,
  setServices,
} from '@anavi/backend/src/modules/service/resource.service'
import { agreeEdition, waitingEdition } from '@anavi/backend/src/modules/service/service.edition'
import { seedDyikanShelves } from '../../demos/dyikan/seed/seed'
import { createPlace } from '@anavi/backend/src/modules/org/place.service'
import { seedOrgWithSite, verifyOrg } from '../lib/owner'
import { listPlacements, placeProducts } from '@anavi/backend/src/modules/supply/placement.service'
import { dayOfMoment } from '../lib/days'
import { siteIdBySlug } from '../lib/sites'

// The edition of a definition a provider joining now is shown: what its yes names, as a screen's.
async function shown(serviceId: bigint, tx: Db | Transaction): Promise<string | null> {
  const [service] = await tx.select().from(srvService).where(eq(srvService.id, serviceId)).limit(1)
  const read = await editionRead(service!, tx)
  return read === null ? null : String(read)
}

/*
 * Agreements BETWEEN demos, and therefore in neither of them.
 *
 * A supply names two sites and belongs to neither: written into one demo's `index.ts` it would make
 * that demo unable to be seeded alone, and the second partnership would have nowhere obvious to go.
 * Runs after every demo and after the ageing pass, because the ageing pass moves prices through the
 * variant service and a placement's price bounds are a snapshot taken from the product's own.
 */
// Who answers for a demo's site in these scenes: its owner, in the owner's chair.
const ownerOf = async (siteId: SiteId, tx: Db | Transaction) =>
  actorOf(await getOrgSite(siteId, tx), 'owner', tx)

export async function seedSupplies(ownerId: bigint, tx: Db | Transaction = db): Promise<void> {
  await meatRow(ownerId, tx)
  await oilOffer(ownerId, tx)
  await shelfReviews(tx)
  await serviceProviders(ownerId, tx)
}

/*
 * A service one demo defines and another provides — the same kind of agreement as a supply, about
 * work instead of goods, and here for the same reason: it names two sites and belongs to neither.
 *
 * One provider on three services, so the three states a row can wait or stand in are all on one
 * screen at each end — and a second on one of them, so that the list there has an order. The electronics shop provides the appliance shop's air conditioner fitting
 * (invited, and said yes); has asked to provide the washing machine fitting and waits for an
 * answer; and was invited to the measuring visit and has said nothing. The first two are open to
 * requests; the measuring visit is not, and is invited to all the same — the mark answers whether
 * the owner TAKES requests, not whether it may ask.
 *
 * And it has a service of its own about the same job, which it has named as the same; the owner
 * has not answered, so the number in force is still the one named on the agreement.
 *
 * Neither provider switches services on beforehand: its yes does (`serve`), which is the road a
 * site that never kept services walks when it is called.
 *
 * And a third, on the measuring visit: a craftsman with NO storefront — an organization the
 * platform has verified and a site that was never published. He stands on the owner's page like
 * the others, and that page is the whole of his face.
 */
/*
 * The provider's OWN service about the same job, under its own name — so the demo has something to
 * say «mine is yours» about. Priced «from» and done at the client's, as the definition is: a
 * service that answered a different question could not be named as the same. Its own form, because
 * a visit asks where, and the shop's intake asks no address.
 */
async function ownFitting(siteId: SiteId, tx: Db | Transaction): Promise<bigint> {
  const form = await createForm(
    siteId,
    null,
    {
      slug: 'montazh-zayavka',
      name: { ru: 'Заявка на монтаж', en: 'Fitting request', ar: 'طلب تركيب' },
      success: {
        ru: 'Заявку получили — перезвоним и согласуем день.',
        en: 'Request received — we will call to agree the day.',
        ar: 'استلمنا طلبكم، وسنتصل بكم للاتفاق على الموعد.',
      },
      position: 9,
    },
    tx,
  )
  await setStructure(
    siteId,
    form.id,
    {
      steps: [
        { key: 'visit', title: { ru: 'Куда приехать', en: 'Where to come', ar: 'أين نأتي' } },
      ],
      fields: [
        {
          key: 'address',
          step: 'visit',
          type: 'text',
          role: 'address',
          label: { ru: 'Адрес', en: 'Address', ar: 'العنوان' },
          isRequired: true,
        },
        {
          key: 'name',
          step: 'visit',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          step: 'visit',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
      ],
    },
    tx,
  )
  const made = await createService(
    siteId,
    null,
    {
      slug: 'montazh-split-sistem',
      name: {
        ru: 'Монтаж сплит-систем',
        en: 'Split system fitting',
        ar: 'تركيب أجهزة التكييف المنفصلة',
      },
      summary: {
        ru: 'Поставим кондиционер, купленный у нас или привезённый вами.',
        en: 'We fit an air conditioner bought from us or brought by you.',
        ar: 'نركّب المكيّف الذي اشتريتموه منّا أو أحضرتموه بأنفسكم.',
      },
      pricing: 'from',
      price: toMinor(5800, 'KGS'),
      status: 'published',
      venue: 'client',
      formId: String(form.id),
    },
    tx,
  )
  return made.id
}

const NO_SHARE = { share: 0, shareDays: null }
// Hundredths of a per cent, and the days to pay it.
const TENTH = { share: 1000, shareDays: 14 }

async function serviceProviders(ownerId: bigint, tx: Db | Transaction): Promise<void> {
  const owner = await siteIdBySlug('watt', tx)
  const provider = await siteIdBySlug('vega', tx)
  const serviceAt = async (slug: string) => {
    const [row] = await tx
      .select({ id: srvService.id })
      .from(srvService)
      .where(
        and(eq(srvService.siteId, owner), eq(srvService.slug, slug), isNull(srvService.deletedAt)),
      )
      .limit(1)
    if (!row) throw new Error(`supplies: no service «${slug}» to be provided`)
    return row.id
  }
  const fitting = await serviceAt('montazh-konditsionera')
  const washer = await serviceAt('ustanovka-stiralnoy-mashiny')
  const measuring = await serviceAt('zamer-nishi')
  for (const id of [fitting, washer])
    await updateService(owner, id, { open: true }, await ownerOf(owner, tx), tx)
  // Where the owner itself goes out to: the capital for the fitting, and nothing said for the
  // washer — a service whose owner named no city stands in every one.
  await updateService(owner, fitting, { cities: ['bishkek'] }, await ownerOf(owner, tx), tx)

  const site = await getOrgSite(provider, tx)

  const [called] = await inviteProvider(
    owner,
    { address: 'vega', serviceIds: [String(fitting)] },
    await ownerOf(owner, tx),
    tx,
  )
  // Called while the fitting still asked nothing of a provider: the first one stands on nought.
  await answerProvider(provider, called!.id, 'accept', await ownerOf(provider, tx), tx, {
    ...NO_SHARE,
    editionId: await shown(called!.serviceId, tx),
  })
  // Its own number, in its own money, and the two cities its fitters go out to. The definition
  // says «from», so this is a floor like the owner's — and lower, which is why a client compares.
  await setTerms(
    provider,
    called!.id,
    { price: toMinor(5500, site.currency as Currency), cities: ['bishkek', 'tokmok'] },
    tx,
  )
  await declareBinding(
    provider,
    called!.id,
    { serviceId: String(await ownFitting(provider, tx)) },
    await ownerOf(provider, tx),
    tx,
  )
  await askToProvide(
    provider,
    { services: [{ id: String(washer), ...NO_SHARE, editionId: await shown(BigInt(washer), tx) }] },
    await ownerOf(provider, tx),
    tx,
  )
  await inviteProvider(
    owner,
    { address: 'vega', serviceIds: [String(measuring)] },
    await ownerOf(owner, tx),
    tx,
  )
  /*
   * What the owner requires of a provider, on the two services nobody provides yet — so it lands
   * at once. The washer fitting asks for a piece of work with a photograph and an account to be
   * paid into, and the first provider has neither; the measuring visit asks for a point with an
   * address, which it has. One met and two unmet, on the screens of the site that reads them.
   */
  await updateService(
    owner,
    washer,
    { requires: ['works', 'requisites'] },
    await ownerOf(owner, tx),
    tx,
  )
  await updateService(owner, measuring, { requires: ['address'] }, await ownerOf(owner, tx), tx)

  /*
   * And a second provider of the same fitting, agreed AFTER the first — so the list on the owner's
   * page has an order to earn. The carrier's crews fit what they deliver; its number is the
   * highest of the three, on purpose: where it stands in the list is decided by the jobs it closed
   * and how fast its desk answers (the sales fixture writes both), and never by the price.
   */
  /*
   * By now the owner takes a share: ten per cent of the job, paid within a fortnight — the terms
   * whoever is called NEXT reads. The second provider agrees to them; the first, already in on
   * nought, is offered the same and has not answered, so it still pays nothing.
   */
  await updateService(owner, fitting, TENTH, await ownerOf(owner, tx), tx)
  await offerShare(
    owner,
    called!.id,
    TENTH,
    { userId: ownerId, activeRole: 'owner', viaOrgId: null },
    tx,
  )
  const crew = await siteIdBySlug('tulpar', tx)
  const carrier = await getOrgSite(crew, tx)
  const [second] = await inviteProvider(
    owner,
    { address: 'tulpar', serviceIds: [String(fitting)] },
    await ownerOf(owner, tx),
    tx,
  )
  await answerProvider(crew, second!.id, 'accept', await ownerOf(crew, tx), tx, {
    ...TENTH,
    editionId: await shown(second!.serviceId, tx),
  })
  await setTerms(
    crew,
    second!.id,
    // …and how long the job holds its own crew: a carrier's fitters take longer than the shop's.
    {
      price: toMinor(6500, carrier.currency as Currency),
      cities: ['bishkek', 'kant'],
      duration: 240,
    },
    tx,
  )
  // Its own crew for somebody else's definition: a provider's resources and hours are its own.
  const fitters = await createResource(
    crew,
    { name: { ru: 'Монтажная бригада', en: 'Fitting crew' } },
    tx,
  )
  await setHours(
    crew,
    fitters.id,
    {
      hours: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startsAt: 8 * 60, endsAt: 18 * 60 })),
    },
    tx,
  )
  await setServices(crew, fitters.id, { serviceIds: [String(fitting)] }, tx)

  await providerWorks(tx)

  /*
   * And the definition itself is about to move under both of them: «from 6 000» becomes a firm
   * price in ten days. That changes what each provider's own number MEANS, so the edition asks —
   * the second provider has said yes, the first has said nothing and will stop being shown on
   * the day unless it does. Ten days and not the minimum of seven, so a base a few days old still
   * shows the edition waiting rather than applied.
   */
  const ownerSite = await getOrgSite(owner, tx)
  const day = new Date(`${dayIn(ownerSite.timezone, new Date())}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 10)
  await updateService(
    owner,
    fitting,
    {
      pricing: 'fixed',
      // …and from that day a provider must keep a point with an address and show a piece of
      // work: the second has both, the first has no work to show.
      requires: ['address', 'works'],
      editionDueOn: dayOfMoment(day),
    },
    await ownerOf(owner, tx),
    tx,
  )
  const waits = await waitingEdition(fitting, tx)
  await agreeEdition(
    crew,
    second!.id,
    { editionId: String(waits!.id) },
    await ownerOf(crew, tx),
    tx,
  )

  await craftsman(ownerId, owner, measuring, tx)
  await providerLetters(ownerId, tx)
  await keptOnly(
    owner,
    [
      { desk: provider, site },
      { desk: crew, site: carrier },
    ],
    tx,
  )
}

/*
 * Calls to providers BY LETTER, waiting: one to an address nobody on the platform has, which is
 * the ordinary case and shows on the owner's side only; and one to the address every demo is
 * signed into with, so the card of a call stands on that person's other sites — less whatever a
 * site is already called to or provides. Written through the owner's door, limits and all; the
 * queue is silenced for the whole seed, so no letter leaves.
 */
async function providerLetters(ownerId: bigint, tx: Db | Transaction): Promise<void> {
  const letters = await resourceJson<{ owner: string; email: string; services: string[] }[]>(
    'shared/provider-letters.json',
  )
  for (const letter of letters) {
    const siteId = await siteIdBySlug(letter.owner, tx)
    const rows = await tx
      .select({ id: srvService.id, slug: srvService.slug })
      .from(srvService)
      .where(and(eq(srvService.siteId, siteId), isNull(srvService.deletedAt)))
    const serviceIds = letter.services.map((slug) => {
      const found = rows.find((row) => row.slug === slug)
      if (!found) throw new Error(`supplies: no service «${slug}» to write a letter about`)
      return String(found.id)
    })
    await inviteProviderByEmail(
      siteId,
      { email: letter.email, serviceIds },
      { userId: ownerId, activeRole: 'owner', viaOrgId: null },
      'ru',
      tx,
    )
  }
}

/*
 * A piece of work a provider did UNDER SOMEBODY ELSE'S DEFINITION, written on its own wall and
 * named by that definition — which only a site that provides it may do, so this runs after the
 * agreement and through the door that asks. The owner's page of that participant puts it first.
 *
 * A work IS its photograph: without one it is shown nowhere, so none is written.
 */
async function providerWorks(tx: Db | Transaction): Promise<void> {
  const works = await resourceJson<
    {
      provider: string
      owner: string
      service: string
      photo: string
      days: number
      caption: LocalizedLabel
    }[]
  >('shared/provider-works.json')
  for (const work of works) {
    const image = await findImage(work.photo, work.caption.ru)
    if (!image) continue
    const siteId = await siteIdBySlug(work.provider, tx)
    const made = await createReview(
      siteId,
      {
        service: work.service,
        serviceSite: work.owner,
        caption: work.caption,
        isWork: true,
        saidOn: dayOfMoment(new Date(Date.now() - work.days * 86_400_000)),
      },
      tx,
    )
    await attachMedia(
      siteId,
      'review',
      made.id,
      { key: image.key, width: image.width, height: image.height, caption: work.caption },
      tx,
    )
  }
}

/*
 * Two services the appliance shop only KEEPS THE DEFINITION of: it sells the machine and names the
 * job, and somebody else's hands do it. Hauling the old appliance away is done by both the trading
 * house and the carrier — a list to choose from, each at its own number, with no row of the shop's
 * own; plumbing a dishwasher in is done by the trading house alone, and then the page is that one
 * provider's in all but address. Made last, so nothing made before it changes its number.
 *
 * Asked with the questionnaire the shop's other jobs are asked with: it is the definition's, and a
 * definition belongs to the owner whoever does the work.
 */
// Who does a kept service, at what number and where — and with a calendar, where it keeps one.
interface Hand {
  at: number
  price: number
  cities: string[]
  crew?: { name: { ru: string; en: string }; duration: number }
}

async function keptOnly(
  owner: SiteId,
  hands: { desk: SiteId; site: { slug: string; currency: string } }[],
  tx: Db | Transaction,
): Promise<void> {
  const [asks] = await tx
    .select({ id: formForm.id })
    .from(formForm)
    .where(and(eq(formForm.siteId, owner), eq(formForm.slug, 'ustanovka-zayavka')))
    .limit(1)
  if (!asks) throw new Error('supplies: no questionnaire to ask a kept service with')
  const kept = [
    {
      slug: 'vyvoz-staroy-tehniki',
      name: {
        ru: 'Вывоз старой техники',
        en: 'Old appliance removal',
        ar: 'نقل الأجهزة القديمة',
      },
      summary: {
        ru: 'Отключат, вынесут и увезут старый холодильник, плиту или стиральную машину.',
        en: 'Your old fridge, cooker or washing machine is disconnected, carried out and taken away.',
        ar: 'فصل الثلاجة أو الموقد أو الغسالة القديمة وإخراجها ونقلها.',
      },
      by: [
        /*
         * The first keeps a CALENDAR for it — an hour a visit, a crew with working hours — so the
         * buyer of a refrigerator picks the hour at the shop's till and the provider's order is
         * born booked. The second keeps none: its line leaves with no time, and its desk names a day.
         */
        {
          at: 0,
          price: 700,
          cities: ['bishkek'],
          crew: { name: { ru: 'Бригада вывоза', en: 'Removal crew' }, duration: 60 },
        },
        { at: 1, price: 900, cities: ['bishkek', 'kant'] },
      ] as Hand[],
      // Offered beside every refrigerator: two do it, so the buyer says who.
      beside: 'holodilniki',
    },
    {
      slug: 'podklyuchenie-posudomoechnoy-mashiny',
      name: {
        ru: 'Подключение посудомоечной машины',
        en: 'Dishwasher connection',
        ar: 'توصيل غسالة الأطباق',
      },
      summary: {
        ru: 'Подключение к воде, канализации и розетке, пробный цикл.',
        en: 'Connection to water, drain and power, and a test cycle.',
        ar: 'التوصيل بالماء والصرف والكهرباء مع دورة تجريبية.',
      },
      by: [{ at: 0, price: 1800, cities: ['bishkek'] }] as Hand[],
      // …and beside every dishwasher: one does it, and is named without asking.
      beside: 'posudomoechnye-mashiny',
    },
  ]
  // A shelf of their own: the shop's other group says «our own technicians», and these are not.
  const group = await createGroup(
    owner,
    {
      slug: 'raboty-partnyorov',
      name: { ru: 'Работы партнёров', en: 'Work by our partners', ar: 'أعمال شركائنا' },
      summary: {
        ru: 'Эти работы выполняют проверенные исполнители: заказ и расчёт — с ними.',
        en: 'These jobs are done by vetted providers: the order and the payment are theirs.',
        ar: 'ينفّذ هذه الأعمال منفّذون موثوقون: الطلب والدفع معهم.',
      },
    },
    tx,
  )
  for (const one of kept) {
    const made = await createService(
      owner,
      null,
      {
        slug: one.slug,
        name: one.name,
        summary: one.summary,
        // The shop names the job and does none of it: no number, no hours and no point of its own.
        provides: false,
        pricing: 'fixed',
        status: 'published',
        venue: 'client',
        groupId: String(group.id),
        formId: String(asks.id),
      },
      tx,
    )
    for (const by of one.by) {
      const hand = hands[by.at]!
      const [called] = await inviteProvider(
        owner,
        { address: hand.site.slug, serviceIds: [String(made.id)] },
        await ownerOf(owner, tx),
        tx,
      )
      await answerProvider(hand.desk, called!.id, 'accept', await ownerOf(hand.desk, tx), tx, {
        share: called!.share,
        shareDays: called!.shareDays,
        editionId: await shown(called!.serviceId, tx),
      })
      await setTerms(
        hand.desk,
        called!.id,
        {
          price: toMinor(by.price, hand.site.currency as Currency),
          cities: by.cities,
          ...(by.crew ? { duration: by.crew.duration } : {}),
        },
        tx,
      )
      if (!by.crew) continue
      const crew = await createResource(hand.desk, { name: by.crew.name }, tx)
      await setHours(
        hand.desk,
        crew.id,
        {
          hours: [1, 2, 3, 4, 5, 6].map((weekday) => ({
            weekday,
            startsAt: 9 * 60,
            endsAt: 18 * 60,
          })),
        },
        tx,
      )
      await setServices(hand.desk, crew.id, { serviceIds: [String(made.id)] }, tx)
    }
    /*
     * Offered beside the goods it is done for, like the shop's own fitting — said for the shelf.
     * The shop does none of it: the tick names who does, and the line leaves in that provider's
     * own order. A shelf that names services of its own keeps them; these shelves name none.
     */
    const shelf = await findCategoryBySlug(owner, one.beside, tx)
    if (!shelf) throw new Error(`supplies: no shelf «${one.beside}» to offer «${one.slug}» on`)
    await setCategoryServices(owner, shelf.id, { ids: [String(made.id)] }, tx)
  }
}

/*
 * The measurer who works only through the appliance shop's page. Signed up like anybody, verified
 * by the platform, and his site — the desk his orders and clients live on — is never published:
 * no page of his own, no theme chosen, nothing but a point with an address, which the measuring
 * visit requires of whoever provides it. Under the dev account, so his back office is one switch
 * of the workspace away.
 */
async function craftsman(
  ownerId: bigint,
  owner: SiteId,
  measuring: bigint,
  tx: Db | Transaction,
): Promise<void> {
  const { org, site } = await seedOrgWithSite(
    ownerId,
    { name: 'Мастер Бакыт', slug: 'usta-bakyt', defaultLocale: 'ru', locales: ['ru'] },
    tx,
  )
  await verifyOrg(org.id, ownerId, tx)
  const desk = asSiteId(site.id)
  // A craftsman keeps no goods and no shelf: the site is born with them, and he takes them off. The
  // services come on with the yes below, the way any site's do.
  await updateOrgSite(desk, { features: {} }, tx)
  await createPlace(
    desk,
    {
      name: { ru: 'Мастерская' },
      address: { ru: 'Бишкек, ул. Ахунбаева, 98' },
      city: 'bishkek',
      phone: '+996 555 410 218',
    },
    tx,
  )
  const [called] = await inviteProvider(
    owner,
    { address: 'usta-bakyt', serviceIds: [String(measuring)] },
    await ownerOf(owner, tx),
    tx,
  )
  await answerProvider(desk, called!.id, 'accept', await ownerOf(desk, tx), tx, {
    share: called!.share,
    shareDays: called!.shareDays,
    editionId: await shown(called!.serviceId, tx),
  })
  await setTerms(
    desk,
    called!.id,
    { price: toMinor(400, site.currency as Currency), cities: ['bishkek'] },
    tx,
  )
}

interface ShelfReviewSeed {
  shop: string
  seller: string
  /** The card by the address it answers at on the SHOP's shelf. */
  product: string
  author: string
  rating: number
  text: LocalizedLabel
  reply?: string
}

/**
 * What a shop's buyers said about goods it lays out from a supplier, and what the supplier said
 * back — through the two doors the two of them use: the shop enters the review, the supplier
 * answers it from its own site. After the supplies, because the card has to lie on the shelf to be
 * reviewed there and the supply has to stand for the answer to be given. One is left unanswered,
 * so the supplier's list shows what there is still to do.
 */
async function shelfReviews(tx: Db | Transaction): Promise<void> {
  for (const said of await resourceJson<ShelfReviewSeed[]>('shared/shelf-reviews.json')) {
    const review = await createReview(
      await siteIdBySlug(said.shop, tx),
      { author: said.author, rating: said.rating, text: said.text, product: said.product },
      tx,
    )
    if (said.reply) {
      await replyToShelfReview(
        await siteIdBySlug(said.seller, tx),
        review.id,
        { text: said.reply },
        tx,
      )
    }
  }
}

/**
 * A shelf's terms, in its own words — the rules are what an organization SAYS, so they are read
 * from the library, and published through the door the owner would use before anybody is called.
 */
async function publishShelfTerms(slug: string, ownerId: bigint, tx: Db | Transaction) {
  const said =
    await resourceJson<Record<string, TermsNumbers & { text: LocalizedLabel }>>(
      'shared/supplies.json',
    )
  const terms = said[slug]
  if (!terms) throw new Error(`supplies: no terms for «${slug}» in supplies.json`)
  const published = await publishTerms(
    await siteIdBySlug(slug, tx),
    terms,
    { userId: ownerId, activeRole: 'owner', viaOrgId: null },
    tx,
  )
  return published.terms
}

/**
 * A call from the other end, left standing: the oil distributor offers its motor oils to the car
 * lot, and the lot has not answered.
 *
 * Unanswered on purpose. The meat row above shows a supply that is agreed and working; this one
 * shows the state the screen has to explain — who called, what is on the table before the answer,
 * and that nothing is on anybody's shelf yet. The selection is made BEFORE the answer, which is the
 * order a supplier offering goods works in: an offer of nothing is not an offer.
 */
async function oilOffer(ownerId: bigint, tx: Db | Transaction): Promise<void> {
  const supplier = await siteIdBySlug('hanako', tx)
  // The lot takes sellers: the door in its footer is what the distributor came in by, and the
  // conversation the two then held is written by the sales fixture, where every conversation is.
  // And the lot says what a seller's card must have to stand beside a car: a photograph and a
  // full description. The supply below is still unanswered, so nothing is held off any shelf by
  // it — the distributor reads the rule in the window of its own offer before the lot answers.
  await updateSupplyTerms(
    await siteIdBySlug('avto996', tx),
    { takesSuppliers: true, photo: true, description: true, properties: [] },
    tx,
  )
  // The lot's terms are the lot's to publish, and they say what a car lot would: it shows the oils,
  // and whoever asks about one is the distributor's client — the lot sells cars and has nobody to
  // answer which approval a 0W-20 carries. The distributor offers its goods ON them, by the
  // edition it read.
  const terms = await publishShelfTerms('avto996', ownerId, tx)
  const supply = await inviteSupply(
    supplier,
    { address: 'avto996', as: 'supplier', terms: String(terms.id) },
    await ownerOf(supplier, tx),
    tx,
  )
  const sending = await categoryIds(supplier, ['motornye-masla'], tx)
  /*
   * The whole section of motor oils, and beside it TWO positions named by themselves: of thirteen
   * transmission fluids a car lot sells the two that go into what it has on the lot, and no
   * section, kind or line of the distributor's holds exactly those two. Both ways of naming in one
   * selection, because that is how a supplier with a real catalogue uses them.
   */
  const single = await tx
    .select({ id: catProduct.id, slug: catProduct.slug })
    .from(catProduct)
    .where(
      and(
        eq(catProduct.siteId, supplier),
        inArray(catProduct.slug, [...SINGLE_FLUIDS]),
        isNull(catProduct.deletedAt),
      ),
    )
  const missing = SINGLE_FLUIDS.filter((slug) => !single.some((one) => one.slug === slug))
  if (missing.length > 0) throw new Error(`supplies: no fluid «${missing.join(', ')}» to send`)
  await setSelection(
    supplier,
    supply.id,
    {
      scope: 'picked',
      targets: [
        ...sending.map((id) => ({ type: 'category', id: String(id) })),
        ...single.map((one) => ({ type: 'product', id: String(one.id) })),
      ],
    },
    tx,
  )
}

/** The two transmission fluids the distributor offers the lot one by one — Toyota's and the CVT one. */
const SINGLE_FLUIDS = ['atf-ws', 'cvt-hmmf'] as const

/**
 * Where each of the butcher's sections lands in the market's own tree — and, by being exactly this
 * list, WHICH of them travel at all.
 *
 * `marinady` is deliberately absent. A market rents out a meat ROW: prepared food is a different
 * trade with a different shelf life, and the butcher's marinades are the half of his business that
 * he sells himself. The keys here are handed to `setSelection` below, so this map is the single
 * place that decides both questions and the two cannot drift apart.
 */
const SECTIONS: Record<string, string> = {
  govyadina: 'myaso',
  baranina: 'myaso',
  ptica: 'ptica',
}

/**
 * The market's meat row, rented to a butcher.
 *
 * «Дыйкан» sells no meat of his own — the fourteen cuts left his catalogue with this fixture — and
 * the row fills itself from «Халиф» at the same fourteen addresses. Everything here goes through the
 * doors a person would use and in the order a person would use them: the shop calls, the supplier
 * answers, the supplier decides what leaves, and only then does the shop lay anything out.
 */
async function meatRow(ownerId: bigint, tx: Db | Transaction): Promise<void> {
  const shop = await siteIdBySlug('dyikan', tx)
  const supplier = await siteIdBySlug('khalif', tx)

  // The market's terms first, then the call on them: five per cent of the butcher's own price stays
  // with the market — beside the markup set below, so the demo shows the two together: what the
  // buyer pays more, and what the butcher gets less — and two weeks to pay for what was sold.
  const terms = await publishShelfTerms('dyikan', ownerId, tx)
  const supply = await inviteSupply(
    shop,
    { address: 'khalif', as: 'shop' },
    await ownerOf(shop, tx),
    tx,
  )
  await answerSupply(
    supplier,
    supply.id,
    'accept',
    { terms: String(terms.id) },
    await ownerOf(supplier, tx),
    tx,
  )

  /*
   * The raw counter and not the whole catalogue.
   *
   * This used to be `scope: 'all'` with a note that a butcher's entire catalogue IS the meat row,
   * and that stopped being true the day marinades arrived: the market would have been laying out
   * somebody else's prepared food beside its own vegetables. Naming the sections by hand is also
   * the only version of this fixture that DEMONSTRATES the feature — a supplier deciding what
   * leaves — instead of asserting there was nothing to decide.
   */
  const sending = await categoryIds(supplier, Object.keys(SECTIONS), tx)
  await setSelection(
    supplier,
    supply.id,
    { scope: 'picked', targets: sending.map((id) => ({ type: 'category', id: String(id) })) },
    tx,
  )

  /*
   * Where the butcher's sections lie in the market's own tree, said once and BEFORE anything is
   * laid out — so every card lands in its section as it is laid, by the platform's own rule,
   * instead of being moved there one by one afterwards. This used to be a loop over fourteen
   * placements writing a section into each.
   */
  await setMap(
    await getSupply(shop, supply.id, tx),
    {
      map: sending.map((id, at) => ({
        type: 'category',
        id: String(id),
        section: SECTIONS[Object.keys(SECTIONS)[at]!]!,
      })),
    },
    tx,
  )

  const goods = await tx
    .select({ id: catProduct.id, slug: catProduct.slug, categoryId: catProduct.categoryId })
    .from(catProduct)
    .where(
      and(
        eq(catProduct.siteId, supplier),
        isNull(catProduct.deletedAt),
        inArray(catProduct.categoryId, sending),
      ),
    )

  const laid = await placeProducts(shop, { productIds: goods.map((one) => String(one.id)) }, tx)
  // Never skipped in silence: a refusal here means an address collided or the offer does not reach,
  // and a demo that quietly lays out eleven of fourteen looks finished and is not.
  if (laid.refused.length > 0) {
    throw new Error(
      `supplies: the market refused ${laid.refused
        .map((one) => `${one.name || one.productId} (${one.reason})`)
        .join(', ')}`,
    )
  }

  /*
   * And the market stands behind the shop's counter: an organization following another's catalogue.
   *
   * The same table as a buyer following a shop, and the same morning round — only its second half,
   * which speaks not to a person but to a business, in its back office. It was built and never ran
   * once, because no organization followed anything: `sub_follow` knew only cards. Here and not in a
   * demo: a following names two sites, as the supply itself does.
   */
  const [market] = await tx
    .select({ orgId: orgSite.orgId })
    .from(orgSite)
    .where(eq(orgSite.id, shop))
    .limit(1)
  await addSupplier(market!.orgId, { address: (await getOrgSite(supplier, tx)).slug }, tx)

  // Never assumed: a card the mapping left without a section looks like a working fixture and is
  // a cut nobody can find in the meat row.
  const stray = (await listPlacements(shop, { stray: true, limit: 100 }, tx)).rows
  if (stray.length > 0) {
    throw new Error(
      `supplies: nowhere to put «${stray.map((row) => row.placement.slug).join(', ')}» on the market`,
    )
  }

  /*
   * How the butcher's goods stand on the market's shelf, said once at the supply.
   *
   * Eighteen per cent on everything — ONE number where there used to be fourteen copies of it on
   * fourteen cards: the butcher's prices sit at 0.759–0.916 of what this shelf used to ask, so the
   * markup returns the row to roughly its old numbers and stays clear of the upper bound. A markup
   * below that bound would put the market's price under its own purchase price.
   *
   * And the row fills itself from here on. The fourteen cards above were laid out by hand, at the
   * butcher's own addresses, before the mode was on — that is the row's history and the sales
   * fixture names those addresses. A cut the butcher adds tomorrow arrives without anybody at the
   * market doing anything, in the meat section, at an address that starts with the butcher's.
   */
  await setShelf(
    shop,
    supply.id,
    { fills: true, trusted: false, markupKind: 'percent', markupValue: 1800, section: 'myaso' },
    tx,
  )

  /*
   * And the market says what it wants of the row: only what is on the counter today, and nothing
   * over eight hundred som — a request, left WAITING for the butcher's answer.
   *
   * Waiting on purpose. Agreed, it would take a cut off the market's shelf the moment its last
   * kilogram is held by an order, and the sales fixture places orders for exactly these cuts: a
   * demo whose shelf shrinks while it is being filled is a fixture that fails for reasons nobody
   * reading it would guess. What the request does once in force is shown by nobody here.
   */
  await askRequest(shop, supply.id, { flags: 'stock', price: '..80000' }, tx)

  // Built here and not in the demo, because two of them name meat and the meat only exists on this
  // shelf as of the line above.
  await seedDyikanShelves(shop, tx)
}

/**
 * The supplier's section ids by slug, in the order the map names them.
 *
 * Refuses a slug it cannot find rather than sending less than intended: a supply quietly missing a
 * whole section looks like a working fixture and is not.
 */
async function categoryIds(
  siteId: SiteId,
  slugs: readonly string[],
  tx: Db | Transaction,
): Promise<bigint[]> {
  const rows = await tx
    .select({ id: catCategory.id, slug: catCategory.slug })
    .from(catCategory)
    .where(
      and(
        eq(catCategory.siteId, siteId),
        inArray(catCategory.slug, [...slugs]),
        isNull(catCategory.deletedAt),
      ),
    )
  const found = new Map(rows.map((row) => [row.slug, row.id]))
  const missing = slugs.filter((slug) => !found.has(slug))
  if (missing.length > 0) throw new Error(`supplies: no section «${missing.join(', ')}» to send`)
  return slugs.map((slug) => found.get(slug)!)
}
