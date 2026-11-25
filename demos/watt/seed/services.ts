import { eq, type Db, type Transaction } from '@anavi/backend/src/db'
import { srvService } from '@anavi/backend/src/db/schema/srv'
import {
  createResource,
  setHours,
  setServices,
} from '@anavi/backend/src/modules/service/resource.service'
import { toMinor } from '@anavi/shared'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import { createForm, setStructure } from '@anavi/backend/src/modules/form/form.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { createGroup } from '@anavi/backend/src/modules/service/group.service'
import { createService } from '@anavi/backend/src/modules/service/service.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/dictionary/property.service'
import type { ProductValueInput } from '@anavi/shared/schemas'
import { setCategoryServices } from '@anavi/backend/src/modules/service/service.attach'
import { findCategoryBySlug } from '@anavi/backend/src/modules/catalog/category.service'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { findImage } from '../../../seed/lib/assets'
import { resourceJson } from '../../../seed/lib/resource'
import { dayAgo } from '../../../seed/lib/days'
import { createReview } from '@anavi/backend/src/modules/review/review.service'

const CURRENCY = 'KGS'

/*
 * What Watt DOES, beside what it sells — the three things its own articles already promise.
 *
 * Three, and each for what it shows rather than for a full price list. A fitting with a firm price
 * is ordered by pressing a button. A split system is priced «from», because the run of pipe decides
 * the sum, so its request is an estimate the shop writes the number into. And a measuring visit
 * stands outside the group — so one demo carries a grouped service and an ungrouped one, an order
 * and an estimate. All three are done at the client's, so all three ask with the one form that
 * asks for an address.
 */
const INSTALL_FORM = 'ustanovka-zayavka'

/*
 * What a client asks about a job before ordering it, as rows of the site's own dictionary — the one
 * the refrigerators answer from. Three, one of each shape a service's page and the list's filter
 * treat differently: a number that only stands in the table, a list of answers that narrows the
 * list, and a yes-or-no that narrows it with one switch.
 *
 * After everything the catalogue wrote: these describe work, and must not shuffle into the middle
 * of the characteristics of goods on the dictionary's screen.
 */
const TERM = 'srok-vypolneniya'
const OUT_OF_TOWN = 'vyezd-za-gorod'
const DICTIONARY_END = 1000

const TERMS = [
  {
    slug: 'v-den-dostavki',
    label: { ru: 'В день доставки', en: 'On the day of delivery', ar: 'في يوم التوصيل' },
  },
  {
    slug: 'za-1-2-dnya',
    label: { ru: 'За 1–2 дня', en: 'Within 1–2 days', ar: 'خلال يوم أو يومين' },
  },
]

const SERVICES = [
  {
    slug: 'ustanovka-stiralnoy-mashiny',
    // how long one visit holds whoever does it, in minutes
    duration: 90,
    // two do it — the fitter and the surveyor — and the client may say which
    choice: true,
    travel: false,
    grouped: true,
    asks: true,
    // the shelf whose every card offers it with a tick
    beside: 'stiralnye-mashiny' as string | null,
    name: {
      ru: 'Установка стиральной машины',
      en: 'Washing machine installation',
      ar: 'تركيب غسالة الملابس',
    },
    summary: {
      ru: 'Подключим к воде и канализации, выставим по уровню и запустим пробную стирку.',
      en: 'We connect water and drain, level the machine and run a test wash.',
      ar: 'نوصّل الماء والصرف، ونضبط استواء الغسالة، ونجري دورة غسيل تجريبية.',
    },
    body: [
      {
        ru: 'Мастер приезжает с шлангами и крепежом. Снимает транспортные болты, подключает к готовым выводам воды и канализации, выставляет машину по уровню и проверяет её на отжиме.',
        en: 'The technician brings hoses and fittings, removes the transit bolts, connects the machine to existing water and drain outlets, levels it and checks it on a spin cycle.',
        ar: 'يحضر الفني الخراطيم ولوازم التثبيت، ويزيل براغي النقل، ويوصّل الغسالة بمخارج الماء والصرف الجاهزة، ويضبط استواءها ويختبرها على دورة العصر.',
      },
      {
        ru: 'В цену входит работа при готовых выводах. Врезка в трубу, перенос розетки и встраивание под столешницу считаются отдельно и называются до начала работ.',
        en: 'The price covers the work where outlets are ready. Tapping into a pipe, moving a socket or building the machine in under a worktop is priced separately and named before work starts.',
        ar: 'السعر يشمل العمل عند وجود مخارج جاهزة. أما فتح وصلة في الأنبوب أو نقل المقبس أو التركيب تحت سطح المطبخ فتُحسب منفردة ويُعلن سعرها قبل بدء العمل.',
      },
    ],
    pricing: 'fixed' as const,
    price: 1500,
    // the days the work is answered for: the one place a warranty term is said
    warrantyDays: 365,
    values: [
      { property: TERM, value: 'v-den-dostavki' },
      { property: OUT_OF_TOWN, bool: true },
    ] as ProductValueInput[],
  },
  {
    slug: 'montazh-konditsionera',
    // how long one visit holds whoever does it, in minutes
    duration: 180,
    // an indoor and an outdoor unit are fitted by two masters, with half an hour for the road between jobs
    crew: 2,
    gap: 30,
    choice: false,
    travel: false,
    grouped: true,
    asks: true,
    // the shelf whose every card offers it with a tick
    beside: 'konditsionery',
    name: {
      ru: 'Монтаж кондиционера',
      en: 'Air conditioner installation',
      ar: 'تركيب المكيف',
    },
    summary: {
      ru: 'Сплит-система под ключ: два блока, трасса до трёх метров и пуск.',
      en: 'A split system fitted start to finish: both units, up to three metres of piping and commissioning.',
      ar: 'تركيب مكيف سبليت كاملاً: الوحدتان، وتمديد حتى ثلاثة أمتار، والتشغيل.',
    },
    body: [
      {
        ru: 'В базовую цену входит установка внутреннего и наружного блоков, трасса до трёх метров, вакуумирование и пробный пуск.',
        en: 'The base price covers fitting the indoor and outdoor units, up to three metres of piping, vacuuming and a test run.',
        ar: 'السعر الأساسي يشمل تركيب الوحدتين الداخلية والخارجية، وتمديداً حتى ثلاثة أمتار، وتفريغ الهواء، والتشغيل التجريبي.',
      },
      {
        ru: 'Итог зависит от длины трассы, штробления и высоты работ. Точную сумму мастер называет после вопросов о комнате и фотографии места.',
        en: 'The total depends on the length of piping, chasing the wall and the working height. The technician names the exact sum once the room has been described and photographed.',
        ar: 'المبلغ النهائي يعتمد على طول التمديد وحفر الجدار وارتفاع العمل. يحدد الفني المبلغ الدقيق بعد معرفة تفاصيل الغرفة وصورة المكان.',
      },
    ],
    pricing: 'from' as const,
    price: 6000,
    warrantyDays: 730,
    values: [
      { property: TERM, value: 'za-1-2-dnya' },
      { property: OUT_OF_TOWN, bool: true },
    ] as ProductValueInput[],
  },
  {
    slug: 'zamer-nishi',
    // how long one visit holds whoever does it, in minutes
    duration: 45,
    choice: false,
    // the one job small enough for the road to matter: coming is charged apart, by district
    travel: true,
    grouped: false,
    beside: null,
    // A visit, so it asks with the form that asks where: the site's intake has no address box.
    asks: true,
    // The one photograph the library already holds that is honestly of this: the cover of the
    // shop's own article about measuring a niche.
    photo: 'demos/watt/posts/kak-izmerit-nishu.webp',
    name: {
      ru: 'Замер ниши под встраиваемую технику',
      en: 'Measuring a niche for built-in appliances',
      ar: 'قياس الفتحة للأجهزة المدمجة',
    },
    summary: {
      ru: 'Мастер приедет, измерит нишу и подводки и скажет, какая техника в неё встанет.',
      en: 'A technician comes out, measures the niche and the supply points, and says which appliances will fit.',
      ar: 'يحضر الفني، ويقيس الفتحة ونقاط التوصيل، ويخبرك بالأجهزة التي تناسبها.',
    },
    body: [
      {
        ru: 'Выезд по Бишкеку. Мастер снимает размеры ниши, проверяет вентиляционные зазоры, розетки и подводку воды и оставляет лист замера.',
        en: 'A visit within Bishkek. The technician takes the dimensions of the niche, checks ventilation gaps, sockets and water supply, and leaves a measurement sheet.',
        ar: 'زيارة داخل بيشكيك. يأخذ الفني أبعاد الفتحة، ويتحقق من فراغات التهوية والمقابس وتوصيل الماء، ويترك ورقة القياس.',
      },
    ],
    pricing: 'fixed' as const,
    price: 500,
    // A visit and not a job: nothing is fitted, so there is no work to warrant.
    values: [
      { property: TERM, value: 'za-1-2-dnya' },
      { property: OUT_OF_TOWN, bool: false },
    ] as ProductValueInput[],
  },
]

const paragraphs = (values: Record<string, string>[]) => ({
  blocks: values.map((value) => ({ type: 'paragraph' as const, data: { text: value } })),
})

export async function seedWattServices(siteId: SiteId, tx: Db | Transaction) {
  // What a technician has to know before leaving the warehouse — asked once, by both fitting jobs.
  const form = await createForm(
    siteId,
    null,
    {
      slug: INSTALL_FORM,
      name: {
        ru: 'Заявка на установку',
        en: 'Installation request',
        ar: 'طلب تركيب',
      },
      success: {
        ru: 'Заявку получили — мастер позвонит и согласует день.',
        en: 'Request received — a technician will call to agree the day.',
        ar: 'تم استلام الطلب — سيتصل بك الفني لتحديد اليوم.',
      },
      notify: ['zakaz@watt.kg'],
      position: 5,
    },
    tx,
  )
  await setStructure(
    siteId,
    form.id,
    {
      steps: [
        { key: 'place', title: { ru: 'Где ставим', en: 'Where it goes', ar: 'مكان التركيب' } },
        {
          key: 'you',
          title: { ru: 'Как связаться', en: 'How to reach you', ar: 'بيانات التواصل' },
        },
      ],
      fields: [
        /*
         * The two questions the price depends on, first — a form that counts asks what the sum is
         * made of before it asks who is asking. Opened from a service that names a price, they
         * count FROM that price: «urgent» multiplies it, carrying the old appliance out adds to
         * it. Each has an answer that changes nothing and stands chosen, so the sum is there from
         * the first screen and only ever moves by what the visitor ticks.
         */
        {
          key: 'urgency',
          step: 'place',
          type: 'select',
          label: { ru: 'Когда нужно', en: 'How soon', ar: 'متى تحتاجها' },
          isRequired: true,
          defaultValue: 'usual',
          options: [
            {
              key: 'usual',
              label: { ru: 'В обычном порядке', en: 'In the usual order', ar: 'بالترتيب المعتاد' },
            },
            {
              key: 'urgent',
              label: {
                ru: 'Срочно, сегодня или завтра',
                en: 'Urgently, today or tomorrow',
                ar: 'عاجل، اليوم أو غدًا',
              },
              factor: 130,
            },
          ],
        },
        {
          key: 'old',
          step: 'place',
          type: 'select',
          label: {
            ru: 'Старую технику отключить и вынести',
            en: 'Disconnect and carry out the old appliance',
            ar: 'فصل الجهاز القديم وإخراجه',
          },
          isRequired: true,
          defaultValue: 'no',
          options: [
            { key: 'no', label: { ru: 'Не нужно', en: 'Not needed', ar: 'لا حاجة' } },
            {
              key: 'yes',
              label: { ru: 'Да, вынести', en: 'Yes, carry it out', ar: 'نعم، إخراجه' },
              add: toMinor(500, 'KGS'),
            },
          ],
        },
        /*
         * Where the job is, by district — the platform's own question: the options are the
         * districts of whoever does the service, and where that service charges for coming, each
         * carries what coming there costs. Not required: a service that keeps the road in its
         * price has no use for the answer.
         */
        {
          key: 'district',
          step: 'place',
          type: 'select',
          role: 'zone',
          label: { ru: 'Район', en: 'District', ar: 'المنطقة' },
        },
        {
          key: 'address',
          step: 'place',
          type: 'text',
          // By role, so the order reads it: a technician is sent to what the document says.
          role: 'address',
          label: { ru: 'Адрес', en: 'Address', ar: 'العنوان' },
          placeholder: {
            ru: 'Улица, дом, квартира',
            en: 'Street, building, flat',
            ar: 'الشارع، المبنى، الشقة',
          },
          isRequired: true,
        },
        {
          key: 'floor',
          step: 'place',
          type: 'text',
          label: { ru: 'Этаж и лифт', en: 'Floor and lift', ar: 'الطابق والمصعد' },
          placeholder: {
            ru: 'Пятый, лифт есть',
            en: 'Fifth, with a lift',
            ar: 'الخامس، يوجد مصعد',
          },
        },
        {
          key: 'photo',
          step: 'place',
          type: 'file',
          label: { ru: 'Фото места', en: 'Photo of the place', ar: 'صورة المكان' },
        },
        {
          key: 'when',
          step: 'place',
          type: 'date',
          // By role: the order is born with this as the client's proposal for the day.
          role: 'day',
          label: { ru: 'Удобный день', en: 'Preferred day', ar: 'اليوم المناسب' },
        },
        {
          key: 'name',
          step: 'you',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          step: 'you',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'comment',
          step: 'you',
          type: 'textarea',
          label: { ru: 'Что ещё важно', en: 'Anything else', ar: 'ملاحظات أخرى' },
        },
      ],
    },
    tx,
  )

  const group = await createGroup(
    siteId,
    {
      slug: 'ustanovka-i-montazh',
      name: {
        ru: 'Установка и монтаж',
        en: 'Installation and fitting',
        ar: 'التركيب والتثبيت',
      },
      summary: {
        ru: 'Ставим то, что продаём: мастера свои, выезд по Бишкеку.',
        en: 'We fit what we sell: our own technicians, visits within Bishkek.',
        ar: 'نركّب ما نبيعه: فنيون من فريقنا وزيارات داخل بيشكيك.',
      },
    },
    tx,
  )

  const term = await createProperty(
    siteId,
    {
      slug: TERM,
      name: { ru: 'Срок', en: 'Lead time', ar: 'مدة التنفيذ' },
      kind: 'enum',
      position: DICTIONARY_END + 1,
    },
    tx,
  )
  for (const value of TERMS) await createValue(siteId, term.id, value, tx)
  await createProperty(
    siteId,
    {
      slug: OUT_OF_TOWN,
      name: { ru: 'Выезд за город', en: 'Visits outside the city', ar: 'زيارات خارج المدينة' },
      kind: 'bool',
      position: DICTIONARY_END + 2,
    },
    tx,
  )

  for (const one of SERVICES) {
    const made = await createService(
      siteId,
      null,
      {
        slug: one.slug,
        name: one.name,
        summary: one.summary,
        description: paragraphs(one.body),
        pricing: one.pricing,
        price: toMinor(one.price, CURRENCY),
        duration: one.duration,
        choice: one.choice,
        crew: 'crew' in one ? one.crew : 1,
        gap: 'gap' in one ? one.gap : 0,
        travel: one.travel,
        status: 'published',
        // Every one of the three is done at the client's.
        venue: 'client',
        groupId: one.grouped ? String(group.id) : null,
        formId: one.asks ? String(form.id) : null,
        values: one.values,
        warrantyDays: 'warrantyDays' in one ? one.warrantyDays : null,
      },
      tx,
    )
    // A photograph of its own wins where the library has one; a missing file is not an error —
    // two of these three have none yet, and a page without a picture is a finished page.
    for (const path of [`demos/watt/services/${one.slug}.webp`, one.photo]) {
      if (!path) continue
      const image = (await findImage(path)) ?? null
      if (!image) continue
      await attachMedia(
        siteId,
        'service',
        made.id,
        { key: image.key, width: image.width, height: image.height },
        tx,
      )
      break
    }
    // Offered beside the goods it is done for — said once for the shelf, so every machine on it
    // carries the tick and a card added tomorrow does too.
    if (one.beside) {
      const shelf = await findCategoryBySlug(siteId, one.beside, tx)
      if (!shelf) throw new Error(`watt: no shelf «${one.beside}» to offer «${one.slug}» on`)
      await setCategoryServices(siteId, shelf.id, { ids: [made.id] }, tx)
    }
  }
  await seedServiceReviews(siteId, tx)
}

/*
 * What clients said about the services, and what the work looks like — on each service's own page.
 *
 * Entered by the shop, through the door the back office form uses, and each names its service by
 * the address that service answers at: one the site does not keep fails the seed. In Russian only,
 * for the reason the reviews of goods are — a testimonial is a quotation. One is hidden, so the
 * figure on the page is visibly not a count of everything written. The one piece of work carries
 * the one photograph the library honestly holds of this trade.
 */
async function seedServiceReviews(siteId: SiteId, tx: Db | Transaction) {
  const said = await resourceJson<{
    reviews: {
      service: string
      days: number
      author: string
      rating: number
      text: string
      visible?: boolean
    }[]
    works: { service: string; days: number; photo: string; caption: Record<string, string> }[]
  }>('demos/watt/service-reviews.json')
  for (const review of said.reviews) {
    await createReview(
      siteId,
      {
        service: review.service,
        author: review.author,
        rating: review.rating,
        text: { ru: review.text },
        visible: review.visible ?? true,
        saidOn: dayAgo(review.days),
      },
      tx,
    )
  }
  for (const work of said.works) {
    const made = await createReview(
      siteId,
      { service: work.service, caption: work.caption, isWork: true, saidOn: dayAgo(work.days) },
      tx,
    )
    const image = (await findImage(work.photo)) ?? null
    if (image) {
      await attachMedia(
        siteId,
        'review',
        made.id,
        { key: image.key, width: image.width, height: image.height },
        tx,
      )
    }
  }
}

/*
 * WHO DOES THEM, AND WHEN — the resources of the shop: what a calendar will be laid over.
 *
 * Three, and they differ on purpose. The fitter the shop employs, by the login the owner issued:
 * a resource that IS a person, six days a week. A second technician who has no login and so is
 * nobody on the platform: a name, a week of its own and the measuring visits. And a crew, which is
 * not a person at all — two men and a van, five days, for the one job that takes two.
 *
 * After the staff, because the first of them is one.
 */
const span = (weekdays: number[], startsAt: number, endsAt: number) =>
  weekdays.map((weekday) => ({ weekday, startsAt: startsAt * 60, endsAt: endsAt * 60 }))

export async function seedWattResources(
  siteId: SiteId,
  fitterUserId: bigint,
  fitterName: string,
  tx: Db | Transaction,
) {
  const services = await tx.select().from(srvService).where(eq(srvService.siteId, siteId))
  const id = (slug: string) => {
    const found = services.find((one) => one.slug === slug)
    if (!found) throw new Error(`watt: no service «${slug}» to give a resource`)
    return String(found.id)
  }
  const made = [
    {
      name: { ru: `Мастер ${fitterName.split(' ')[0]}`, en: `Fitter ${fitterName.split(' ')[0]}` },
      userId: String(fitterUserId),
      // an hour for lunch: a day of two spans, and the break is the hole between them
      hours: [...span([1, 2, 3, 4, 5, 6], 9, 13), ...span([1, 2, 3, 4, 5, 6], 14, 18)],
      services: ['ustanovka-stiralnoy-mashiny', 'montazh-konditsionera'],
    },
    {
      name: { ru: 'Замерщик Нурлан', en: 'Surveyor Nurlan' },
      userId: null,
      hours: span([2, 3, 4, 5, 6], 10, 19),
      services: ['zamer-nishi', 'ustanovka-stiralnoy-mashiny', 'montazh-konditsionera'],
    },
    {
      name: { ru: 'Бригада монтажа', en: 'Fitting crew' },
      userId: null,
      hours: span([1, 2, 3, 4, 5], 9, 17),
      services: ['montazh-konditsionera'],
    },
  ]
  /*
   * Two districts: the town, and what lies around it. Carrying an order to either costs nothing —
   * Watt delivered for nothing before it had districts, and still does — but a technician coming
   * out of town is four hundred, which only a service that charges its coming apart ever asks.
   */
  await setZones(
    siteId,
    [
      { name: { ru: 'Бишкек', en: 'Bishkek', ar: 'بيشكيك' }, fee: 0 },
      {
        name: {
          ru: 'Пригород: Кант, Токмок',
          en: 'Suburbs: Kant, Tokmok',
          ar: 'الضواحي: كانت، توكموك',
        },
        fee: 0,
        visit: toMinor(400, 'KGS'),
      },
    ],
    tx,
  )
  for (const one of made) {
    const row = await createResource(siteId, { name: one.name, userId: one.userId }, tx)
    await setHours(siteId, row.id, { hours: one.hours }, tx)
    await setServices(siteId, row.id, { serviceIds: one.services.map(id) }, tx)
  }
}
