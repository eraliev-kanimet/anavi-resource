import type { Db, Transaction } from '@anavi/backend/src/db'
import type { LocalizedLabel, NavZone } from '@anavi/shared'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { seedImage } from '../assets'
import { seedQuestions as seedFaq } from '../faq'
import type { SiteId } from '@anavi/backend/src/db/ids'

const paragraphs = (values: LocalizedLabel[]) => ({
  blocks: values.map((value) => ({ type: 'paragraph' as const, data: { text: value } })),
})

// The door is the same for all — the recommendation questionnaire — but the words are tailored: the banner concludes the story of ITS OWN page.
const cta = (
  copy: { eyebrow: LocalizedLabel; title: LocalizedLabel; text: LocalizedLabel } = {
    eyebrow: { ru: 'Не нашли нужное', en: 'Did not find what you need', ar: 'لم تجد ما تبحث عنه' },
    title: {
      ru: 'Подберём под задачу и бюджет',
      en: 'We will match device to your needs and budget',
      ar: 'سنختار لك الجهاز المناسب لاحتياجاتك وميزانيتك',
    },
    text: {
      ru: 'Ответьте на несколько вопросов — вернёмся с двумя-тремя вариантами и ценами.',
      en: 'Answer a few questions — we will return with 2–3 curated options and exact prices.',
      ar: 'أجب عن بعض الأسئلة — وسنعود إليك باثنين أو ثلاثة خيارات مع الأسعار.',
    },
  },
) => ({
  eyebrow: copy.eyebrow,
  title: copy.title,
  text: copy.text,
  // opens the questionnaire where the reader already is, instead of taking them to a page holding it
  action: {
    kind: 'form' as const,
    form: 'podbor',
    label: { ru: 'Подобрать', en: 'Find matching device', ar: 'اختيار جهاز' },
  },
})

export const VEGA_PLACES = [
  {
    name: { ru: 'Шоурум на Чуй', en: 'Chuy showroom', ar: 'معرض شارع تشوي' },
    address: {
      ru: 'Бишкек, проспект Чуй, 155',
      en: '155 Chuy Ave, Bishkek',
      ar: 'بيشكيك، شارع تشوي، 155',
    },
    lat: 42.8756,
    lng: 74.6039,
    phone: '+996 555 100 200',
    hours: {
      ru: 'Пн–Сб 10:00–20:00, Вс 11:00–18:00',
      en: 'Mon–Sat 10:00–20:00, Sun 11:00–18:00',
      ar: 'الإثنين–السبت 10:00–20:00، الأحد 11:00–18:00',
    },
  },
  {
    name: { ru: 'Пункт выдачи в Джале', en: 'Dzhal pickup point', ar: 'نقطة استلام دجال' },
    address: {
      ru: 'Бишкек, Ахунбаева, 119',
      en: '119 Akhunbaev St, Bishkek',
      ar: 'بيشكيك، شارع أخونباييف، 119',
    },
    lat: 42.8408,
    lng: 74.5583,
    hours: { ru: 'Ежедневно 10:00–19:00', en: 'Daily 10:00–19:00', ar: 'يوميًا 10:00–19:00' },
  },
]

// The block stands on the home page and on the contacts page, and nowhere else.
export const VEGA_ADDRESSES = {
  title: { ru: 'Где нас найти', en: 'Store locations', ar: 'أين تجدنا' },
}

// They live in their own domain, so the same answer about delivery serves three pages without
// being copied.
const QUESTIONS = [
  {
    question: {
      ru: 'Есть ли рассрочка?',
      en: 'Are installment plans available?',
      ar: 'هل يتوفر تقسيط؟',
    },
    answer: {
      ru: 'Да, до 12 месяцев без переплаты по картам местных банков. Оформляем в шоуруме за 15 минут, нужен только паспорт.',
      en: 'Yes, up to 12 months with 0% interest on local bank credit cards. Quick 15-minute setup in our showroom with passport only.',
      ar: 'نعم، حتى 12 شهرًا بدون فوائد عبر بطاقات البنوك المحلية. يتم الإجراء في المعرض خلال 15 دقيقة، تحتاج فقط إلى جواز السفر.',
    },
  },
  {
    question: {
      ru: 'Сколько идёт доставка по Бишкеку?',
      en: 'How long does Bishkek delivery take?',
      ar: 'كم يستغرق التوصيل داخل بيشكيك؟',
    },
    answer: {
      ru: 'В день заказа, если оформили до 16:00. По городу — 300 сом, при заказе от 30 000 сом бесплатно.',
      en: 'Same-day delivery for orders placed before 16:00. City courier fee is 300 KGS, free on orders over 30,000 KGS.',
      ar: 'في نفس يوم الطلب إذا تم قبل 16:00. التوصيل داخل المدينة 300 سوم، ومجانًا للطلبات التي تزيد عن 30,000 سوم.',
    },
  },
  {
    question: {
      ru: 'Отправляете в регионы?',
      en: 'Do you ship to regions across Kyrgyzstan?',
      ar: 'هل تقومون بالشحن إلى المحافظات والمناطق؟',
    },
    answer: {
      ru: 'Да, транспортными компаниями. Отправляем на следующий день после подтверждения, стоимость зависит от направления.',
      en: 'Yes, via reliable freight carriers. Orders dispatch the day after confirmation; shipping costs depend on destination.',
      ar: 'نعم، عبر شركات الشحن. يتم الإرسال في اليوم التالي للتأكيد، وتعتمد التكلفة على الوجهة.',
    },
  },
  {
    question: {
      ru: 'Какая гарантия на технику?',
      en: 'What warranty is provided on devices?',
      ar: 'ما هو الضمان على الأجهزة؟',
    },
    answer: {
      ru: 'Официальная гарантия производителя: на ноутбуки 12–24 месяца, на смартфоны 12 месяцев. Сервисный центр — наш, в Бишкеке.',
      en: 'Official manufacturer warranty: 12–24 months on laptops, 12 months on smartphones. Serviced at our own Bishkek center.',
      ar: 'ضمان رسمي من الشركة المصنعة: من 12 إلى 24 شهرًا لأجهزة الكمبيوتر المحمولة، و12 شهرًا للهواتف الذكية. مركز الخدمة تابع لنا في بيشكيك.',
    },
  },
  {
    question: {
      ru: 'Можно вернуть, если не подошло?',
      en: 'Can I return an item if it does not suit me?',
      ar: 'هل يمكن الإرجاع إذا لم يناسبني الجهاز؟',
    },
    answer: {
      ru: 'В течение 14 дней, если товар не был в эксплуатации и сохранён комплект. Технически сложные товары меняем по гарантии.',
      en: 'Within 14 days provided the device is unused in original packaging. Defective technical goods are exchanged under warranty.',
      ar: 'خلال 14 يومًا إذا لم يتم استخدام الجهاز وتم الحفاظ على العبوة والمرفقات. الأجهزة ذات الأعطال الفنية يتم استبدالها بموجب الضمان.',
    },
  },
  {
    question: {
      ru: 'Товар в наличии или под заказ?',
      en: 'Are items in stock or made to order?',
      ar: 'هل البضاعة متوفرة في المخزون أم بالطلب؟',
    },
    answer: {
      ru: 'В карточке видно наличие. Если позиции нет, привозим под заказ за 7–14 дней и берём предоплату 30%.',
      en: 'Stock status is clearly shown on each product card. Out-of-stock items can be backordered in 7–14 days with a 30% deposit.',
      ar: 'تظهر حالة التوفر في بطاقة المنتج. إذا لم يكن متوفرًا، نوفره بالطلب خلال 7–14 يومًا بدفعة مقدمة 30%.',
    },
  },
]

export async function seedVegaSite(siteId: SiteId, homeId: bigint, tx: Db | Transaction) {
  await seedFaq(
    siteId,
    [{ slug: 'shop', name: { ru: 'Покупателям', en: 'For customers', ar: 'للعملاء' } }],
    QUESTIONS,
    tx,
  )

  await seedHome(siteId, homeId, tx)
  await seedMenu(siteId, tx)
  await seedCatalogPage(siteId, tx)
  await seedDelivery(siteId, tx)
  await seedWarranty(siteId, tx)
  await seedAbout(siteId, tx)
  await seedFaqPage(siteId, tx)
  await seedPrivacy(siteId, tx)
}

// The shelves stand before the goods on purpose: a visitor who has not decided what kind of thing
// they want is not helped by twelve cards of everything.
async function seedHome(siteId: SiteId, homeId: bigint, tx: Db | Transaction) {
  const shots = await Promise.all(
    [1, 2, 3].map((n) => seedImage(`vega/hero/hero-${n}.png`, 'Vega').catch(() => null)),
  )

  await createBlock(
    siteId,
    homeId,
    {
      type: 'hero',
      data: {
        layout: 'split',
        interval: 6,
        slides: shots
          .filter((image) => image !== null)
          .map((image, index) => ({
            ...(index === 0
              ? {
                  eyebrow: { ru: 'Бишкек', en: 'Bishkek', ar: 'بيشكيك' },
                  title: {
                    ru: 'Ноутбуки и смартфоны с гарантией',
                    en: 'Laptops and smartphones with warranty',
                    ar: 'أجهزة كمبيوتر محمولة وهواتف ذكية مع ضمان',
                  },
                  subtitle: {
                    ru: 'Официальная гарантия, свой сервис, рассрочка до 12 месяцев и доставка в день заказа.',
                    en: 'Official warranty, in-house service center, 0% installment up to 12 months, and same-day delivery.',
                    ar: 'ضمان رسمي، ومركز خدمة خاص، وتقسيط حتى 12 شهرًا، وتوصيل في نفس يوم الطلب.',
                  },
                  actions: [
                    {
                      kind: 'page' as const,
                      slug: 'catalog',
                      label: { ru: 'Открыть каталог', en: 'Browse catalog', ar: 'فتح الكتالوج' },
                    },
                    {
                      kind: 'form' as const,
                      form: 'podbor',
                      label: { ru: 'Подобрать', en: 'Find matching device', ar: 'اختيار جهاز' },
                    },
                  ],
                }
              : // Silent: there is no one to render copy on the second slide, and the engine rejects it now.
                {}),
            image,
          })),
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    homeId,
    {
      type: 'features',
      data: {
        layout: 'strip',
        items: [
          {
            icon: 'shield' as const,
            title: { ru: 'Официальная гарантия', en: 'Official warranty', ar: 'ضمان رسمي' },
            text: {
              ru: 'Сервис в Бишкеке, без отправки за границу.',
              en: 'In-house service in Bishkek without international shipping.',
              ar: 'خدمة صيانة في بيشكيك دون الحاجة للشحن للخارج.',
            },
          },
          {
            icon: 'percent' as const,
            title: { ru: 'Рассрочка 0%', en: '0% Installment', ar: 'تقسيط 0%' },
            text: {
              ru: 'До 12 месяцев, оформление за 15 минут.',
              en: 'Up to 12 months, quick 15-minute setup.',
              ar: 'حتى 12 شهرًا، إجراءات في 15 دقيقة.',
            },
          },
          {
            icon: 'truck' as const,
            title: { ru: 'Доставка сегодня', en: 'Same-day delivery', ar: 'توصيل اليوم' },
            text: {
              ru: 'По Бишкеку до 16:00, в регионы — назавтра.',
              en: 'In Bishkek for orders before 16:00, next-day to regions.',
              ar: 'في بيشكيك للطلبات قبل 16:00، وللمناطق في اليوم التالي.',
            },
          },
          {
            icon: 'wrench' as const,
            title: {
              ru: 'Настроим перед выдачей',
              en: 'Pre-delivery setup',
              ar: 'إعداد الجهاز قبل التسليم',
            },
            text: {
              ru: 'Система, обновления и перенос данных.',
              en: 'OS installation, updates, and data migration.',
              ar: 'تثبيت النظام، والتحديثات، ونقل البيانات.',
            },
          },
        ],
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    homeId,
    // an eyebrow, not a heading: a shop floor labels its shelves in small type
    {
      type: 'categories',
      data: {
        eyebrow: { ru: 'Категории', en: 'Categories', ar: 'الفئات' },
        limit: 12,
        showCount: true,
      },
    },
    tx,
  )

  // A band of promotional banners deliberately does NOT stand here: it said what the strip of
  // promises above already says, three screens lower. The `promo` layout stays in the engine for a
  // shop with real promotions to run.

  await createBlock(
    siteId,
    homeId,
    {
      type: 'catalog',
      data: {
        title: { ru: 'Что есть в наличии', en: 'In stock now', ar: 'المتوفر حاليًا' },
        limit: 12,
        showCategories: true,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  await createBlock(siteId, homeId, { type: 'banners', data: await collections() }, tx)

  await createBlock(siteId, homeId, { type: 'addresses', data: VEGA_ADDRESSES }, tx)
  await createBlock(
    siteId,
    homeId,
    {
      type: 'faq',
      data: {
        eyebrow: { ru: 'Коротко', en: 'At a glance', ar: 'باختصار' },
        title: { ru: 'Частые вопросы', en: 'Frequently asked questions', ar: 'الأسئلة الشائعة' },
        limit: 6,
      },
    },
    tx,
  )
  await createBlock(siteId, homeId, { type: 'cta', data: cta() }, tx)
}

async function collections() {
  const items = [
    {
      file: 'collections/gaming',
      slug: 'igrovye-noutbuki',
      title: { ru: 'Для игр', en: 'Gaming', ar: 'للألعاب' },
      text: { ru: 'Дискретная графика', en: 'Discrete graphics', ar: 'بطاقة رسومات منفصلة' },
    },
    {
      file: 'collections/study',
      slug: 'noutbuki-dlya-raboty',
      title: { ru: 'Для работы и учёбы', en: 'Work and study', ar: 'للعمل والدراسة' },
      text: { ru: 'Лёгкие и тихие', en: 'Light and quiet', ar: 'خفيفة وهادئة' },
    },
    {
      file: 'collections/creative',
      slug: 'noutbuki-oled',
      title: { ru: 'Для творчества', en: 'Creative work', ar: 'للإبداع والتصميم' },
      text: { ru: 'Экраны OLED', en: 'OLED displays', ar: 'شاشات OLED' },
    },
    {
      file: 'categories/iphone',
      slug: 'iphone',
      title: { ru: 'Apple iPhone', en: 'Apple iPhone', ar: 'Apple iPhone' },
      text: { ru: 'Все модели', en: 'All models', ar: 'جميع الموديلات' },
    },
  ]
  return {
    title: { ru: 'Подборки', en: 'Curated selections', ar: 'المجموعات المختارة' },
    layout: 'tile' as const,
    items: await Promise.all(
      items.map(async (item) => ({
        title: item.title,
        text: item.text,
        action: { kind: 'selection' as const, slug: item.slug },
        image: (await seedImage(`vega/${item.file}.png`).catch(() => undefined)) ?? undefined,
      })),
    ),
  }
}

// The resolver puts a page before a prefix, so `/catalog` is this page and `/catalog/<slug>` is
// still a card.
async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'catalog', en: 'catalog' },
      status: 'published',
      title: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
      seoDescription: {
        ru: 'Ноутбуки и смартфоны в Бишкеке: цены, характеристики, наличие.',
        en: 'Laptops and smartphones in Bishkek: prices, specifications, availability.',
        ar: 'أجهزة كمبيوتر محمولة وهواتف ذكية في بيشكيك: الأسعار، المواصفات، التوفر.',
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
        // no title: the page already carries one, and a block repeating it printed "Catalog" twice
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
  await createBlock(siteId, page.id, { type: 'cta', data: cta() }, tx)
}

async function seedDelivery(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'dostavka', en: 'delivery' },
      status: 'published',
      title: { ru: 'Доставка и оплата', en: 'Delivery and payment', ar: 'التوصيل والدفع' },
      seoDescription: {
        ru: 'Доставка по Бишкеку в день заказа, отправка в регионы, оплата картой, наличными и в рассрочку.',
        en: 'Same-day delivery in Bishkek, shipping across Kyrgyzstan regions, payment by card, cash, or installment plans.',
        ar: 'توصيل في بيشكيك في نفس يوم الطلب، وشحن للمناطق، ودفع بالبطاقة، نقدًا وبالتقسيط.',
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        layout: 'plain',
        slides: [
          {
            title: { ru: 'Доставка и оплата', en: 'Delivery and payment', ar: 'التوصيل والدفع' },
            subtitle: {
              ru: 'Привезём сегодня по городу и отправим завтра в регионы.',
              en: 'Same-day delivery across the city and next-day dispatch to regions.',
              ar: 'نوصل اليوم داخل المدينة ونشحن غدًا إلى المناطق.',
            },
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
      type: 'text',
      data: {
        content: paragraphs([
          {
            ru: 'По Бишкеку доставляем в день заказа, если вы оформили его до 16:00. Курьер звонит за полчаса, привозит товар и даёт проверить комплект до оплаты. Доставка по городу — 300 сом, при заказе от 30 000 сом бесплатно.',
            en: 'We deliver within Bishkek on the same day for orders placed before 16:00. The courier calls 30 minutes in advance, delivers the device, and allows you to inspect package contents before payment. City delivery is 300 KGS, free on orders over 30,000 KGS.',
            ar: 'نوصل داخل بيشكيك في نفس يوم الطلب إذا تم تقديمه قبل 16:00. يتصل بك المندوب قبل نصف ساعة، ويسلمك الجهاز ويتيح لك فحص المحتويات قبل الدفع. التوصيل داخل المدينة 300 سوم، ومجانًا للطلبات التي تزيد عن 30,000 سوم.',
          },
          {
            ru: 'В регионы отправляем транспортными компаниями на следующий рабочий день после подтверждения. Стоимость зависит от направления и веса, называем её при подтверждении заказа.',
            en: 'Regional shipments dispatch via trusted freight carriers on the next business day after confirmation. Shipping costs depend on destination and package weight, calculated during order confirmation.',
            ar: 'نشحن إلى المناطق عبر شركات الشحن في يوم العمل التالي بعد التأكيد. تعتمد التكلفة على الوجهة والوزن، ويتم تحديدها عند تأكيد الطلب.',
          },
          {
            ru: 'Самовывоз из шоурума на Чуй — бесплатно и без ожидания: собираем заказ за час, храним три дня.',
            en: 'Showroom pickup on Chuy Ave is free and instant: orders prepared within an hour and reserved for three days.',
            ar: 'الاستلام الذاتي من المعرض في شارع تشوي مجاني وبدون انتظار: نجهز الطلب خلال ساعة، ونحتفظ به لمدة ثلاثة أيام.',
          },
          {
            ru: 'Оплатить можно наличными, картой в шоуруме и курьеру, переводом на счёт для юридических лиц, а также в рассрочку до 12 месяцев без переплаты по картам местных банков.',
            en: 'Payment options include cash, card in showroom or upon courier delivery, bank wire transfer for corporate entities, and 0% interest installments up to 12 months on local bank credit cards.',
            ar: 'يمكن الدفع نقدًا، أو بالبطاقة في المعرض وللمندوب، أو عبر تحويل مصرفي للشركات، بالإضافة إلى التقسيط حتى 12 شهرًا بدون فوائد عبر بطاقات البنوك المحلية.',
          },
        ]),
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: cta({
        eyebrow: { ru: 'Перед заказом', en: 'Before ordering', ar: 'قبل الطلب' },
        title: {
          ru: 'Сначала выберите, потом привезём',
          en: 'Choose your device first, then we deliver',
          ar: 'اختر جهازك أولاً، ثم نتولى التوصيل',
        },
        text: {
          ru: 'Доставка бесплатна от тридцати тысяч, а до неё дело доходит после выбора. Подскажем модель — привезём в тот же день.',
          en: 'Delivery is free on orders over 30,000 KGS. Tell us your needs, we will recommend the right model and deliver it today.',
          ar: 'التوصيل مجاني للطلبات التي تزيد عن ثلاثين ألف سوم. أخبرنا باحتياجاتك، وسنرشح لك الموديل المناسب ونوصله في نفس اليوم.',
        },
      }),
    },
    tx,
  )
}

async function seedWarranty(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'garantiya', en: 'warranty' },
      status: 'published',
      title: { ru: 'Гарантия и возврат', en: 'Warranty and returns', ar: 'الضمان والإرجاع' },
      seoDescription: {
        ru: 'Официальная гарантия производителя, собственный сервисный центр в Бишкеке, возврат в течение 14 дней.',
        en: 'Official manufacturer warranty, in-house service center in Bishkek, 14-day return policy.',
        ar: 'ضمان رسمي من الشركة المصنعة، مركز خدمة خاص في بيشكيك، وإرجاع خلال 14 يومًا.',
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        layout: 'plain',
        slides: [
          {
            title: { ru: 'Гарантия и возврат', en: 'Warranty and returns', ar: 'الضمان والإرجاع' },
            subtitle: {
              ru: 'Свой сервис в Бишкеке — технику не нужно никуда отправлять.',
              en: 'In-house service in Bishkek — no need to ship devices abroad.',
              ar: 'مركز خدمة خاص في بيشكيك — لا داعي لشحن الأجهزة للخارج.',
            },
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
      type: 'text',
      data: {
        content: paragraphs([
          {
            ru: 'На ноутбуки действует официальная гарантия производителя от 12 до 24 месяцев, на смартфоны — 12 месяцев. Срок указан в гарантийном талоне, который выдаём вместе с чеком.',
            en: 'Laptops carry official manufacturer warranties from 12 to 24 months, smartphones 12 months. Exact duration is specified in the warranty certificate issued with the receipt.',
            ar: 'يسري ضمان رسمي من الشركة المصنعة من 12 إلى 24 شهرًا لأجهزة الكمبيوتر المحمولة، و12 شهرًا للهواتف الذكية. المدة موضحة في بطاقة الضمان التي تُسلّم مع الإيصال.',
          },
          {
            ru: 'Диагностика бесплатная и занимает до трёх рабочих дней. Если случай гарантийный, ремонтируем за свой счёт; если нет — сначала называем стоимость и ждём вашего решения.',
            en: 'Diagnostics are complimentary and take up to three business days. Warranty repairs are fully covered; for non-warranty issues, we quote repair costs in advance and await your confirmation.',
            ar: 'الفحص مجاني ويستغرق حتى ثلاثة أيام عمل. إذا كان العطل مشمولاً بالضمان، نقوم بالإصلاح على حسابنا؛ وإذا لم يكن كذلك، نحدد التكلفة أولاً وننتظر قرارك.',
          },
          {
            ru: 'Вернуть товар надлежащего качества можно в течение 14 дней, если он не был в эксплуатации и сохранены упаковка и комплект. Деньги возвращаем тем же способом, каким была оплата, в течение трёх банковских дней.',
            en: 'Returns of unused devices in original packaging with full accessories are accepted within 14 days. Refunds are issued using the original payment method within three banking days.',
            ar: 'يمكن إرجاع الجهاز غير المستخدم خلال 14 يومًا بحالته الأصلية مع العبوة والمرفقات. يُسترد المبلغ بنفس طريقة الدفع خلال ثلاثة أيام عمل مصرفية.',
          },
          {
            ru: 'Если товар оказался неисправен в первые 15 дней, меняем его на такой же или возвращаем деньги — на ваш выбор.',
            en: 'If a defect is detected within the first 15 days, we provide an immediate identical replacement or full refund based on your preference.',
            ar: 'إذا تبين وجود عطل في الجهاز خلال أول 15 يومًا، نستبدله بآخر مماثل أو نعيد لك المبلغ — حسب اختيارك.',
          },
        ]),
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: cta({
        eyebrow: { ru: 'Спокойно', en: 'Peace of mind', ar: 'راحة البال' },
        title: {
          ru: 'Гарантия начинается с правильной покупки',
          en: 'Warranty starts with the right purchase',
          ar: 'يبدأ الضمان بالاختيار الصحيح',
        },
        text: {
          ru: 'Половина обращений в сервис — это техника, купленная не под свою задачу. Расскажите, для чего берёте, и мы подберём то, что не придётся менять.',
          en: 'Half of service inquiries stem from mismatched devices. Tell us your intended workload, and we will pick a model you will not need to return.',
          ar: 'نصف طلبات الصيانة سببها أجهزة لم تُشترَ للمهمة المناسبة لها. أخبرنا بما تحتاج، وسنختار لك جهازًا لن تضطر لتغييره.',
        },
      }),
    },
    tx,
  )
}

async function seedAbout(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'o-kompanii', en: 'about' },
      status: 'published',
      title: { ru: 'О компании', en: 'About company', ar: 'عن الشركة' },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        layout: 'plain',
        slides: [
          {
            title: { ru: 'Vega', en: 'Vega', ar: 'Vega' },
            subtitle: {
              ru: 'Техника с гарантией с 2016 года',
              en: 'Electronics with warranty since 2016',
              ar: 'إلكترونيات مع ضمان منذ عام 2016',
            },
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
      type: 'text',
      data: {
        content: paragraphs([
          {
            ru: 'Мы начинали в 2016 году с одной витрины на Чуй и ремонта ноутбуков в подсобке. Сегодня это шоурум, пункт выдачи в Джале и сервисный центр, через который проходит около двухсот устройств в месяц.',
            en: 'We started in 2016 with a single display case on Chuy Ave and laptop repairs in the back room. Today, we operate a flagship showroom, a pickup center in Dzhal, and an authorized service facility servicing around two hundred devices monthly.',
            ar: 'بدأنا في عام 2016 بواجهة عرض واحدة في شارع تشوي وإصلاح أجهزة الكمبيوتر المحمولة في غرفة خلفية. اليوم نحن ندير معرضًا رئيسيًا، ونقطة استلام في دجال، ومركز خدمة معتمد يستقبل نحو مائتي جهاز شهريًا.',
          },
          {
            ru: 'Мы продаём только то, что готовы чинить сами. Поэтому в каталоге нет ноутбуков без сервисной поддержки в Кыргызстане, даже когда на них есть спрос и хорошая маржа.',
            en: 'We only sell what we are equipped to service ourselves. That is why our catalog excludes laptops lacking local repair support in Kyrgyzstan, regardless of demand or profit margins.',
            ar: 'نحن نبيع فقط ما نستطيع صيانته بأنفسنا. لذلك لا يتضمن كتالوجنا أجهزة تفتقر إلى دعم الصيانة في قيرغيزستان، مهما كان الطلب عليها أو هامش الربح مرتفعًا.',
          },
          {
            ru: 'Перед выдачей каждое устройство проходит проверку: обновления, тест экрана и батареи, перенос данных со старого устройства, если он нужен. Это не услуга за отдельные деньги, а часть покупки.',
            en: 'Every device undergoes comprehensive pre-delivery inspection: system updates, display and battery health checks, and complimentary data migration from your old device as part of standard service.',
            ar: 'قبل التسليم، يخضع كل جهاز لفحص شامل: تحديثات النظام، واختبار الشاشة والبطارية، ونقل البيانات من جهازك القديم إذا لزم الأمر. هذه ليست خدمة مدفوعة بشكل منفصل، بل جزء من عملية الشراء.',
          },
        ]),
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: cta({
        eyebrow: { ru: 'Знакомство', en: 'Get to know us', ar: 'تعرف علينا' },
        title: {
          ru: 'Проверьте нас одной покупкой',
          en: 'Experience our service firsthand',
          ar: 'جرب خدمتنا في عملية شراء واحدة',
        },
        text: {
          ru: 'О магазине можно прочитать, а можно проверить: назовите задачу и бюджет, и посмотрите, что мы предложим.',
          en: 'You can read about our store, or experience it directly: share your requirements and budget, and see what we recommend.',
          ar: 'يمكنك القراءة عن متجرنا، أو تجربته بنفسك: أخبرنا بمتطلباتك وميزانيتك، وانظر ماذا سنقترح عليك.',
        },
      }),
    },
    tx,
  )
}

async function seedFaqPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'voprosy', en: 'faq' },
      status: 'published',
      title: { ru: 'Вопросы и ответы', en: 'Questions and answers', ar: 'الأسئلة والأجوبة' },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: {
        layout: 'plain',
        slides: [
          {
            title: { ru: 'Вопросы и ответы', en: 'Questions and answers', ar: 'الأسئلة والأجوبة' },
            subtitle: {
              ru: 'То, о чём спрашивают чаще всего.',
              en: 'Answers to the most common customer questions.',
              ar: 'إجابات على الأسئلة الأكثر شيوعًا.',
            },
          },
        ],
      },
    },
    tx,
  )
  await createBlock(siteId, page.id, { type: 'faq', data: { limit: 50 } }, tx)
  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: cta({
        eyebrow: { ru: 'Остался вопрос', en: 'Still have questions', ar: 'لديك سؤال آخر؟' },
        title: {
          ru: 'Спросите про конкретную модель',
          en: 'Ask about a specific model',
          ar: 'استفسر عن موديل معين',
        },
        text: {
          ru: 'Общие ответы собраны выше. Всё, что зависит от вашей задачи, быстрее решить подбором — это несколько вопросов.',
          en: 'General answers are listed above. For tailored model recommendations, try our quick interactive quiz.',
          ar: 'الإجابات العامة موضحة أعلاه. وكل ما يتعلق باحتياجاتك الخاصة يمكنك حله بسرعة عبر أداة الاختيار — في بضعة أسئلة.',
        },
      }),
    },
    tx,
  )
}

async function seedPrivacy(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'privacy', en: 'privacy' },
      status: 'published',
      title: { ru: 'Политика конфиденциальности', en: 'Privacy policy', ar: 'سياسة الخصوصية' },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'text',
      data: {
        content: paragraphs([
          {
            ru: 'Мы собираем имя, телефон, адрес доставки и почту — только то, без чего нельзя привезти заказ и связаться с вами по нему.',
            en: 'We collect name, phone number, delivery address, and email strictly to process orders and provide delivery updates.',
            ar: 'نجمع الاسم ورقم الهاتف وعنوان التوصيل والبريد الإلكتروني — فقط ما يلزم لتوصيل الطلب والتواصل معك بشأنه.',
          },
          {
            ru: 'Данные используются для обработки заказа, доставки и гарантийного обслуживания. Мы не передаём их третьим лицам, кроме курьерской службы и транспортной компании, которые везут ваш заказ.',
            en: 'Data is used for order processing, logistics, and warranty service. Never shared with third parties except courier and freight providers delivering your order.',
            ar: 'تُستخدم البيانات لمعالجة الطلب والتوصيل وخدمة الضمان. لا نشاركها مع أطراف ثالثة باستثناء خدمة التوصيل وشركة الشحن التي تنقل طلبك.',
          },
          {
            ru: 'Чтобы удалить свои данные или получить их копию, напишите нам на почту или позвоните — сделаем в течение трёх рабочих дней.',
            en: 'To request data deletion or obtain a copy of your records, contact us via email or phone — processed within three business days.',
            ar: 'لحذف بياناتك أو الحصول على نسخة منها، راسلنا عبر البريد الإلكتروني أو اتصل بنا — سنقوم بذلك خلال ثلاثة أيام عمل.',
          },
        ]),
      },
    },
    tx,
  )
}

// Written out rather than derived from the pages: the header says "Delivery" while the page keeps
// "Delivery and payment", and a link may lead anywhere the engine can address.
const MENU = {
  header: [
    { page: 'catalog', label: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' } },
    // not a page: the item opens the questionnaire, which is a target the engine addresses too
    {
      form: 'podbor',
      label: { ru: 'Подбор ноутбука', en: 'Laptop selector', ar: 'اختيار كمبيوتر محمول' },
    },
    { page: 'o-kompanii', label: { ru: 'О компании', en: 'About company', ar: 'عن الشركة' } },
    { page: 'contacts', label: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' } },
  ],
  footer: [
    {
      page: 'price-noutbuki',
      label: {
        ru: 'Прайс-лист ноутбуков',
        en: 'Laptop price list',
        ar: 'قائمة أسعار أجهزة الكمبيوتر المحمول',
      },
    },
    {
      page: 'price-smartfony',
      label: {
        ru: 'Прайс-лист смартфонов',
        en: 'Smartphone price list',
        ar: 'قائمة أسعار الهواتف الذكية',
      },
    },
    { page: 'dostavka', label: { ru: 'Доставка', en: 'Delivery', ar: 'التوصيل' } },
    { page: 'garantiya', label: { ru: 'Гарантия', en: 'Warranty', ar: 'الضمان' } },
    {
      page: 'voprosy',
      label: { ru: 'Вопросы и ответы', en: 'Questions and answers', ar: 'الأسئلة والأجوبة' },
    },
  ],
  legal: [
    {
      page: 'privacy',
      label: { ru: 'Политика конфиденциальности', en: 'Privacy policy', ar: 'سياسة الخصوصية' },
    },
  ],
  // Home and the menu are the platform's, at either end and never in this list. The storefront
  // recognizes the search and the basket by address: one opens its sheet, the other carries a counter.
  bar: [
    {
      page: 'catalog',
      label: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
      icon: 'layout-grid' as const,
    },
    // Named, not typed: the segment each of these lives at is a site setting.
    {
      route: 'search' as const,
      label: { ru: 'Поиск', en: 'Search', ar: 'البحث' },
      icon: 'search' as const,
    },
    {
      route: 'cart' as const,
      label: { ru: 'Корзина', en: 'Cart', ar: 'السلة' },
      icon: 'shopping-cart' as const,
    },
  ],
}

async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  for (const [zone, items] of Object.entries(MENU))
    for (const [position, item] of items.entries())
      await createMenuItem(
        siteId,
        {
          zone: zone as NavZone,
          label: item.label,
          action:
            'form' in item
              ? { kind: 'form' as const, form: item.form }
              : 'route' in item
                ? { kind: 'route' as const, route: item.route }
                : { kind: 'page' as const, slug: item.page },
          ...('icon' in item ? { icon: item.icon } : {}),
          position,
        },
        tx,
      )
}
