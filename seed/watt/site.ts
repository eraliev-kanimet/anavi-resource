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

// The door is the same, but the words are tailored: an identical "did not find what you need" banner on six consecutive pages becomes visual wallpaper.
const cta = (copy: { eyebrow: LocalizedLabel; title: LocalizedLabel; text: LocalizedLabel }) => ({
  eyebrow: copy.eyebrow,
  title: copy.title,
  text: copy.text,
  action: {
    kind: 'form' as const,
    form: 'contact',
    label: { ru: 'Написать нам', en: 'Contact us', ar: 'تواصل معنا' },
  },
})

// Three locations, only two of which are showrooms: the warehouse is listed because customers pick up
// orders and access service there. The first is primary: the header prints its address and the floating button dials its number.
export const WATT_PLACES = [
  {
    name: { ru: 'Шоурум на Жибек Жолу', en: 'Showroom on Zhibek Zholu', ar: 'معرض شارع جيبك جولو' },
    address: {
      ru: 'Бишкек, Жибек Жолу, 428',
      en: 'Bishkek, 428 Zhibek Zholu Ave',
      ar: 'بيشكيك، جيبك جولو، 428',
    },
    lat: 42.8869,
    lng: 74.5698,
    phone: '+996 700 940 940',
    email: 'zakaz@watt.kg',
    hours: {
      ru: 'Пн–Сб 09:00–20:00, Вс 10:00–18:00',
      en: 'Mon–Sat 09:00–20:00, Sun 10:00–18:00',
      ar: 'الإثنين–السبت 09:00–20:00، الأحد 10:00–18:00',
    },
  },
  {
    name: { ru: 'Шоурум на Ахунбаева', en: 'Showroom on Akhunbaev', ar: 'معرض شارع أخونباييف' },
    address: {
      ru: 'Бишкек, Ахунбаева, 119',
      en: 'Bishkek, 119 Akhunbaev St',
      ar: 'بيشكيك، أخونباييف، 119',
    },
    lat: 42.8391,
    lng: 74.6063,
    phone: '+996 700 940 950',
    hours: {
      ru: 'Пн–Сб 10:00–20:00, Вс 10:00–17:00',
      en: 'Mon–Sat 10:00–20:00, Sun 10:00–17:00',
      ar: 'الإثنين–السبت 10:00–20:00، الأحد 10:00–17:00',
    },
  },
  {
    name: {
      ru: 'Склад, выдача и сервис',
      en: 'Warehouse, pickup, and service',
      ar: 'المستودع ومركز الاستلام والصيانة',
    },
    address: {
      ru: 'Бишкек, Алма-Атинская, 1/3',
      en: 'Bishkek, 1/3 Alma-Atinskaya St',
      ar: 'بيشكيك، شارع ألما-أتينسكايا، 1/3',
    },
    lat: 42.8489,
    lng: 74.6512,
    phone: '+996 700 940 960',
    hours: { ru: 'Пн–Сб 09:00–18:00', en: 'Mon–Sat 09:00–18:00', ar: 'الإثنين–السبت 09:00–18:00' },
  },
]

export const WATT_ADDRESSES = {
  title: {
    ru: 'Где посмотреть и забрать',
    en: 'Where to view and pick up',
    ar: 'فروعنا ومراكز المعاينة والاستلام',
  },
}

const QUESTIONS = [
  {
    q: {
      ru: 'Привезёте и поднимете на этаж?',
      en: 'Do you deliver and carry upstairs?',
      ar: 'هل توفرون خدمة التوصيل والرفع للأدوار العليا؟',
    },
    a: {
      ru: 'Да. По Бишкеку доставка бесплатная от 20 000 сомов, подъём на этаж входит в неё — грузчики приезжают вместе с машиной. Если лифта нет и выше третьего этажа, подъём считается отдельно, сумму называем заранее, а не на пороге.',
      en: 'Yes. Free delivery in Bishkek on orders over 20,000 KGS, floor carry included — movers arrive with the truck. If there is no elevator and above the 3rd floor, carrying is calculated separately; we provide the exact amount in advance, not at the doorstep.',
      ar: 'نعم. التوصيل مجاني داخل بيشكيك للطلبات التي تزيد عن 20,000 سوم، ويشمل الرفع إلى الطابق المطلوب حيث يصل فريق التحميل مع سيارة التوصيل. في حال عدم توفر مصعد للأدوار فوق الطابق الثالث، يتم احتساب تكلفة الرفع مسبقاً وتوضيحها للعميل قبل التوصيل دون أي مفاجآت.',
    },
  },
  {
    q: {
      ru: 'Кто подключит стиральную машину или встроенную технику?',
      en: 'Who connects the washing machine or built-in appliances?',
      ar: 'من يقوم بتركيب وتوصيل الغسالات والأجهزة المدمجة؟',
    },
    a: {
      ru: 'Наш мастер. Подключение стиральной и посудомоечной машины — 1500 сомов, встраиваемой техники — от 2500, потому что там нужен распил столешницы и вывод розетки. Мастера привозим в тот же день, что и технику: два визита вместо одного никому не нужны.',
      en: 'Our certified technician. Washing machine and dishwasher connection is 1,500 KGS; built-in appliances start from 2,500 KGS, as countertop cutouts and dedicated outlet wiring are required. The technician arrives on the same day as the delivery: no need for two separate visits.',
      ar: 'فنيونا المعتمدون. تكلفة توصيل غسالة الملابس وغسالة الأطباق 1500 سوم، والأجهزة المدمجة تبدأ من 2500 سوم نظراً للحاجة إلى قص الرخام وتمديد مقابس الكهرباء المخصصة. يحضر الفني في نفس يوم توصيل الأجهزة لتوفير وقت العميل وتجنب الزيارات المتعددة.',
    },
  },
  {
    q: {
      ru: 'Что делать, если техника не подошла?',
      en: 'What if the appliance does not fit?',
      ar: 'ماذا أفعل إذا لم يتناسب الجهاز مع المساحة المتاحة؟',
    },
    a: {
      ru: 'Крупную бытовую технику надлежащего качества по закону вернуть нельзя — это техника сложная и входит в перечень. Поэтому мы отговариваем от покупки «на глаз»: спросите размеры, пришлите фото ниши. Если товар оказался с браком, меняем или возвращаем деньги, и это уже другой разговор.',
      en: 'By law, major household appliances of proper quality cannot be returned, as they are classified as technically complex goods. That is why we advise against buying on guesswork: check dimensions and send us a photo of the opening. If a product is defective, we replace it or refund your money immediately.',
      ar: 'وفقاً للقانون، لا يمكن استرجاع الأجهزة المنزلية الكبيرة السليمة لأنها مصنفة كأجهزة تقنية معقدة. لذلك ننصح بشدة بعدم الشراء بالتقدير العشوائي: تواصل معنا، وأرسل صور وأبعاد المكان المخصص. وفي حال وجود أي عيب مصنعي في المنتج، نقوم باستبداله فوراً أو استرداد المبلغ بالكامل.',
    },
  },
  {
    q: {
      ru: 'Гарантия — ваша или производителя?',
      en: 'Is the warranty from you or the manufacturer?',
      ar: 'ما هي شروط الضمان وكيف يتم تنفيذه؟',
    },
    a: {
      ru: 'Производителя, от года до трёх в зависимости от марки, плюс наш сервис в Бишкеке. Отправлять технику никуда не нужно: заявку принимаем мы, мастер выезжает по городу. На встроенную технику Bosch, Siemens и Smeg гарантия два года.',
      en: 'Manufacturer warranty, from 1 to 3 years depending on the brand, backed by our Bishkek service center. No need to ship appliances anywhere: we process the request and our technician visits you in town. Built-in appliances from Bosch, Siemens, and Smeg come with a 2-year warranty.',
      ar: 'الضمان رسمي من سنة إلى ثلاث سنوات حسب الشركة المصنعة. نحن مسؤولون عن خدمة الضمان مباشرة دون الحاجة للرجوع للوكيل. يقوم الفني بزيارة منزلك خلال يومي عمل، وإذا تعذر الإصلاح في الموقع، ننقل الجهاز إلى مركز الصيانة ونعيده مجاناً على نفقتنا.',
    },
  },
  {
    q: {
      ru: 'Можно ли забрать самому?',
      en: 'Can I pick up the order myself?',
      ar: 'هل يمكن استلام الطلب بنفسي؟',
    },
    a: {
      ru: 'Да, со склада в Аламедине — там же выдача и сервис. Скажите заранее: крупную технику достают с верхних ярусов, это полчаса. Проверить и включить можно прямо там, до оплаты. В залах на Жибек Жолу и Ахунбаева самовывоз только для мелкой техники — крупная стоит на складе, а не под прилавком.',
      en: 'Yes, from our warehouse in Alamedin — which also handles order pickup and servicing. Please let us know in advance: retrieving major appliances from upper racks takes about 30 minutes. You can inspect and power on items right there before paying. Showrooms on Zhibek Zholu and Akhunbaev offer pickup only for small appliances.',
      ar: 'نعم، من مستودعنا في ألاميدين — وهو نفسه مركز الاستلام والصيانة. يُرجى إخبارنا مسبقاً: إنزال الأجهزة الكبيرة من الأرفف العلوية يستغرق نحو نصف ساعة. يمكنك فحص الجهاز وتشغيله هناك قبل الدفع. في معرضي جيبك جولو وأخونباييف يتوفر الاستلام الذاتي للأجهزة الصغيرة فقط — أما الكبيرة فتبقى في المستودع لا خلف الطاولة.',
    },
  },
  {
    q: {
      ru: 'Есть рассрочка?',
      en: 'Are installment plans available?',
      ar: 'هل تتوفر لديكم إمكانية التقسيط؟',
    },
    a: {
      ru: 'Да, до 12 месяцев без переплаты через банк-партнёр. Оформляют в любом из двух залов, занимает минут пятнадцать, нужен паспорт. На технику дешевле 10 000 сомов рассрочку не оформляем — банк её не берёт.',
      en: 'Yes, up to 12 months with 0% interest through partner banks. Applied in either of the two showrooms, takes about 15 minutes with a passport. Installments are not available on items below 10,000 KGS due to bank limits.',
      ar: 'نعم، حتى 12 شهراً بدون فوائد عبر بنك شريك. يتم التقديم في أي من المعرضين خلال نحو خمس عشرة دقيقة، ويلزم إبراز جواز السفر. لا نوفر التقسيط للأجهزة التي تقل قيمتها عن 10,000 سوم لأن البنك لا يقبلها.',
    },
  },
  {
    q: {
      ru: 'Почему на сайте цена ниже, чем в зале?',
      en: 'Why might online price be lower than in showroom?',
      ar: 'لماذا قد يكون السعر على الموقع أقل من السعر في المعرض؟',
    },
    a: {
      ru: 'Не бывает — цена одна, и она одна в обоих залах. Если увидели расхождение, это ошибка ценника, и правы вы: продадим по сайту.',
      en: 'It is not — prices are strictly identical on the website and in both showrooms. If you ever spot a discrepancy, it is a price tag error, and you are right: we will sell at the website price.',
      ar: 'هذا لا يحدث فعلياً — السعر واحد وموحّد في الموقع والمعرضين معاً. وإذا لاحظت أي فرق، فهذا خطأ في بطاقة السعر ونحن نصحّح الأمر لصالحك: سنبيعك بسعر الموقع.',
    },
  },
]

/** Price list URL of a shelf. Flat slug, like Vega and Dyikan: the page has a single path segment. */
const pricePath = (slug: string) => `price-${slug}`

// Per shelf rather than per section: the table uses one column set per page, whereas a single
// "Major appliances" list would place refrigerator capacity next to washing machine spin speed.
// Columns include the key 3-4 decision attributes: full dimensions are in the filter, but refrigerator
// height is shown here because alcoves are measured by it.
const PRICE = {
  title: { ru: 'Прайс-лист', en: 'Price list', ar: 'قائمة الأسعار' },
  sections: [
    {
      name: { ru: 'Крупная техника', en: 'Major appliances', ar: 'الأجهزة الكبيرة' },
      shelves: [
        {
          slug: 'holodilniki',
          name: { ru: 'Холодильники', en: 'Refrigerators', ar: 'الثلاجات' },
          columns: ['holodilniki-tip', 'obschiy-poleznyy-obem', 'vysota', 'uroven-shuma'],
        },
        {
          slug: 'stiralnye-mashiny',
          name: { ru: 'Стиральные машины', en: 'Washing machines', ar: 'غسالات الملابس' },
          columns: [
            'tip-zagruzki',
            'maksimalnaya-zagruzka-belya',
            'maksimalnaya-skorost-otzhima',
            'klass-energopotrebleniya',
          ],
        },
        {
          slug: 'posudomoechnye-mashiny',
          name: { ru: 'Посудомоечные машины', en: 'Dishwashers', ar: 'غسالات الأطباق' },
          columns: ['ustanovka', 'kolichestvo-korzin', 'rashod-vody-za-cikl', 'uroven-shuma'],
        },
        {
          slug: 'plity',
          name: { ru: 'Плиты', en: 'Cookers', ar: 'المواقد' },
          columns: ['plity-tip', 'shirina', 'vsego-konforok', 'obem-duhovki'],
        },
      ],
    },
    {
      name: { ru: 'Кухня', en: 'Kitchen', ar: 'المطبخ' },
      shelves: [
        {
          slug: 'duhovye-shkafy',
          name: { ru: 'Духовые шкафы', en: 'Ovens', ar: 'الأفران' },
          columns: ['duhovye-shkafy-tip', 'obem-duhovki', 'ochistka', 'klass-energopotrebleniya'],
        },
        {
          slug: 'mikrovolnovye-pechi',
          name: { ru: 'Микроволновые печи', en: 'Microwave ovens', ar: 'أفران الميكروويف' },
          columns: [
            'mikrovolnovye-pechi-tip',
            'vnutrenniy-obem',
            'moschnost-mikrovoln',
            'tip-upravleniya',
          ],
        },
        {
          slug: 'kofemashiny',
          name: {
            ru: 'Кофеварки и кофемашины',
            en: 'Coffee makers and machines',
            ar: 'ماكينات القهوة',
          },
          // the shelf also holds drip coffee makers: column would be empty for half the rows
          columns: [
            'kofemashiny-tip',
            'ispolzuemyy-kofe',
            'obem-rezervuara-dlya-vody',
            'ustanovka',
          ],
        },
        {
          slug: 'chayniki',
          name: { ru: 'Чайники', en: 'Kettles', ar: 'الغلايات' },
          columns: ['obem', 'moschnost', 'material-korpusa', 'filtr-ot-nakipi'],
        },
      ],
    },
    {
      name: { ru: 'Уборка и климат', en: 'Cleaning and climate', ar: 'التنظيف والمناخ' },
      shelves: [
        {
          slug: 'pylesosy',
          name: { ru: 'Пылесосы', en: 'Vacuum cleaners', ar: 'المكانس الكهربائية' },
          // using properties common to all 28 models
          columns: ['pylesosy-tip', 'istochnik-pitaniya', 'uborka', 'pylesbornik'],
        },
        {
          slug: 'konditsionery',
          name: { ru: 'Кондиционеры', en: 'Air conditioners', ar: 'المكيفات' },
          columns: [
            'konditsionery-tip',
            'ploschad-pomescheniya',
            'moschnost-v-rezhime-ohlazhdeniya',
            'klass-energoeffektivnosti',
          ],
        },
      ],
    },
  ],
}

const MENU = {
  header: [
    { page: 'catalog', label: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' } },
    { page: 'poleznoe', label: { ru: 'Полезное', en: 'Articles', ar: 'المقالات' } },
    { page: 'ustanovka', label: { ru: 'Установка', en: 'Installation', ar: 'التركيب' } },
    {
      page: 'contacts',
      label: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
    },
  ],
  footer: [
    { page: 'price', label: { ru: 'Прайс-лист', en: 'Price list', ar: 'قائمة الأسعار' } },
    {
      page: 'dostavka',
      label: {
        ru: 'Доставка и оплата',
        en: 'Delivery and payment',
        ar: 'التوصيل والدفع',
      },
    },
    {
      page: 'garantiya',
      label: { ru: 'Гарантия и сервис', en: 'Warranty and service', ar: 'الضمان والخدمة' },
    },
    {
      page: 'ustanovka',
      label: {
        ru: 'Установка и подключение',
        en: 'Installation and setup',
        ar: 'مساعدتك في اختيار الجهاز المناسب، وتوصيله، ورفعه، وتركيبه باحترافية.',
      },
    },
    {
      page: 'poleznoe',
      label: { ru: 'Обзоры и статьи', en: 'Reviews and articles', ar: 'مراجعات ومقالات' },
    },
    {
      page: 'o-kompanii',
      label: { ru: 'О компании', en: 'About us', ar: 'من نحن' },
    },
    {
      page: 'voprosy',
      label: { ru: 'Вопросы и ответы', en: 'FAQ', ar: 'الأسئلة الشائعة' },
    },
  ],
  legal: [
    {
      page: 'privacy',
      label: {
        ru: 'Политика конфиденциальности',
        en: 'Privacy policy',
        ar: 'سياسة الخصوصية',
      },
    },
  ],
  bar: [
    {
      page: 'catalog',
      label: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
      icon: 'layout-grid' as const,
    },
    // Named, not typed: the segment each of these lives at is a site setting.
    {
      route: 'search' as const,
      label: { ru: 'Поиск', en: 'Search', ar: 'بحث' },
      icon: 'search' as const,
    },
    {
      route: 'cart' as const,
      label: { ru: 'Корзина', en: 'Cart', ar: 'السلة' },
      icon: 'shopping-cart' as const,
    },
  ],
}

export async function seedWattSite(siteId: SiteId, homeId: bigint, tx: Db | Transaction) {
  await seedFaq(
    siteId,
    [
      {
        slug: 'watt',
        name: { ru: 'Вопросы о покупке', en: 'Purchase questions', ar: 'أسئلة حول الشراء' },
      },
    ],
    QUESTIONS.map((item) => ({ question: item.q, answer: item.a })),
    tx,
  )

  await seedHome(siteId, homeId, tx)
  await seedMenu(siteId, tx)
  await seedCatalogPage(siteId, tx)
  await seedPricePages(siteId, tx)
  await seedPostsPage(siteId, tx)
  await seedDelivery(siteId, tx)
  await seedInstall(siteId, tx)
  await seedWarranty(siteId, tx)
  await seedAbout(siteId, tx)
  await seedFaqPage(siteId, tx)
  await seedPrivacy(siteId, tx)
}

async function seedHome(siteId: SiteId, homeId: bigint, tx: Db | Transaction) {
  const shots = await Promise.all(
    [1, 2, 3].map((n) => seedImage(`watt/hero/hero-${n}.webp`, 'Watt').catch(() => null)),
  )
  const present = shots.filter((image) => image !== null)

  // Copy is ready before photos, so the first slide is always present, while the others
  // join when assets are available.
  const opening = {
    eyebrow: { ru: 'Бишкек', en: 'Bishkek', ar: 'بيشكيك' },
    title: {
      ru: 'Бытовая техника с доставкой и установкой',
      en: 'Home appliances with delivery and installation',
      ar: 'أجهزة منزلية مع التوصيل والتركيب',
    },
    subtitle: {
      ru: 'Холодильники, стиральные машины, встраиваемая кухня. Привезём, поднимем и подключим в один визит.',
      en: 'Refrigerators, washing machines, and built-in kitchen appliances. Delivered, carried upstairs, and installed in a single visit.',
      ar: 'ثلاجات، غسالات ملابس، وأجهزة مطابخ مدمجة. توصيل ورفع وتركيب في زيارة واحدة.',
    },
    actions: [
      {
        kind: 'page' as const,
        slug: 'catalog',
        label: { ru: 'Открыть каталог', en: 'Browse catalog', ar: 'تصفح الكتالوج' },
      },
      {
        kind: 'form' as const,
        form: 'contact',
        label: { ru: 'Написать нам', en: 'Contact us', ar: 'تواصل معنا' },
      },
    ],
  }

  await createBlock(
    siteId,
    homeId,
    {
      type: 'hero',
      data: {
        layout: 'split',
        interval: 6,
        slides:
          present.length > 0
            ? present.map((image, index) =>
                // The first slide carries the copy, subsequent ones are silent.
                index === 0 ? { ...opening, image } : { image },
              )
            : [opening],
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
            icon: 'truck' as const,
            title: {
              ru: 'Привезём и поднимем',
              en: 'Delivery and floor carry',
              ar: 'التوصيل والرفع للأدوار',
            },
            text: {
              ru: 'По городу бесплатно от 20 000 сомов, подъём входит.',
              en: 'Free city delivery on orders over 20,000 KGS, floor carry included.',
              ar: 'توصيل مجاني في بيشكيك فوق 20,000 سوم مع الرفع المشمول.',
            },
          },
          {
            icon: 'wrench' as const,
            title: {
              ru: 'Подключим в тот же день',
              en: 'Same-day installation',
              ar: 'التركيب في نفس اليوم',
            },
            text: {
              ru: 'Мастер приезжает вместе с техникой, а не через неделю.',
              en: 'The technician arrives together with the delivery, not a week later.',
              ar: 'يحضر الفني المعتمد مع سيارة التوصيل في نفس الزيارة دون تأخير.',
            },
          },
          {
            icon: 'shield' as const,
            title: {
              ru: 'Сервис в Бишкеке',
              en: 'Bishkek service center',
              ar: 'مركز صيانة في بيشكيك',
            },
            text: {
              ru: 'Гарантия до трёх лет, чинить никуда не отправляем.',
              en: 'Warranty up to 3 years, local repair without shipping elsewhere.',
              ar: 'ضمان حتى ثلاث سنوات دون الحاجة لإرسال الأجهزة لخارج المدينة.',
            },
          },
          {
            icon: 'percent' as const,
            title: { ru: 'Рассрочка 0%', en: '0% installment plan', ar: 'تقسيط ميسر 0%' },
            text: {
              ru: 'До 12 месяцев, оформление за 15 минут.',
              en: 'Up to 12 months, approval in 15 minutes.',
              ar: 'فترات سداد حتى 12 شهراً وموافقة سريعة خلال 15 دقيقة.',
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
    {
      type: 'categories',
      data: {
        eyebrow: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
        limit: 12,
        showCount: true,
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    homeId,
    {
      type: 'catalog',
      data: {
        title: { ru: 'Есть в наличии', en: 'In stock', ar: 'متوفر في المخزون' },
        limit: 12,
        showCategories: true,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  await createBlock(siteId, homeId, { type: 'banners', data: await collections() }, tx)

  // Three most recent without topic chips: on the home page this is an article shelf, not a self-filtering section.
  await createBlock(
    siteId,
    homeId,
    {
      type: 'posts',
      data: {
        eyebrow: { ru: 'Полезное', en: 'Articles', ar: 'المقالات' },
        title: {
          ru: 'Обзоры и статьи',
          en: 'Reviews and articles',
          ar: 'مراجعات ومقالات',
        },
        layout: 'grid',
        limit: 3,
        filters: false,
      },
    },
    tx,
  )

  await createBlock(siteId, homeId, { type: 'addresses', data: WATT_ADDRESSES }, tx)
  await createBlock(
    siteId,
    homeId,
    {
      type: 'faq',
      data: {
        eyebrow: { ru: 'Коротко', en: 'Briefly', ar: 'باختصار' },
        title: {
          ru: 'Что спрашивают чаще всего',
          en: 'Frequently asked questions',
          ar: 'الأسئلة الأكثر شيوعاً',
        },
        limit: 5,
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    homeId,
    {
      type: 'cta',
      data: cta({
        eyebrow: {
          ru: 'Не знаете, что выбрать',
          en: 'Need help choosing',
          ar: 'تحتاج مساعدة في الاختيار؟',
        },
        title: {
          ru: 'Скажите, что нужно, и назовём модель',
          en: 'Tell us what you need, and we will find the model',
          ar: 'أخبرنا باحتياجك وسنرشح لك الموديل الأنسب',
        },
        text: {
          ru: 'Сколько человек в доме, какая ниша, какой бюджет. Ответим сегодня, в рабочее время.',
          en: 'Household size, opening dimensions, budget. We reply today during business hours.',
          ar: 'كم فرداً في الأسرة، ومقاسات المكان، وميزانيتك المحددة. نجيبك اليوم خلال ساعات العمل.',
        },
      }),
    },
    tx,
  )
}

async function collections() {
  const items = [
    {
      slug: 's-pirolizom',
      title: {
        ru: 'Духовки с пиролизом',
        en: 'Pyrolytic ovens',
        ar: 'أفران بالتنظيف الذاتي الحراري (بيروليسيس)',
      },
      text: {
        ru: 'Чистятся сами, без химии и тряпки',
        en: 'Self-cleaning without chemicals or scrubbing',
        ar: 'تنظيف ذاتي آلي بدون كيماويات أو فرك يدوي',
      },
    },
    {
      slug: 'no-frost',
      title: { ru: 'No Frost', en: 'No Frost', ar: 'نظام No Frost الكلي' },
      text: {
        ru: 'Не размораживать — никогда',
        en: 'Defrosting not required — ever',
        ar: 'لا حاجة لإذابة الثلج يدوياً أبداً',
      },
    },
    {
      slug: 'besprovodnye-pylesosy',
      title: {
        ru: 'Беспроводные пылесосы',
        en: 'Cordless vacuum cleaners',
        ar: 'مكانس كهربائية لاسلكية',
      },
      text: {
        ru: 'Без розетки и без провода под ногами',
        en: 'Cordless freedom with no cables underfoot',
        ar: 'حرية حركة تامة بدون أسلاك أو مقابس كهرباء',
      },
    },
    {
      slug: 'rozhkovye-kofevarki',
      title: {
        ru: 'Рожковые кофеварки',
        en: 'Pump espresso makers',
        ar: 'ماكينات قهوة بمقبض احترافي',
      },
      text: {
        ru: 'Эспрессо и пена, как в кофейне',
        en: 'Espresso and froth like in a coffee shop',
        ar: 'إسبريسو غني ورغوة حليب كثيفة كالمقاهي',
      },
    },
  ]
  return {
    title: { ru: 'Подборки', en: 'Selections', ar: 'مجموعات مختارة' },
    layout: 'tile' as const,
    items: await Promise.all(
      items.map(async (item) => ({
        title: item.title,
        text: item.text,
        action: { kind: 'selection' as const, slug: item.slug },
        image:
          (await seedImage(`watt/collections/${item.slug}.webp`).catch(() => undefined)) ??
          undefined,
      })),
    ),
  }
}

async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'catalog', en: 'catalog' },
      status: 'published',
      title: { ru: 'Каталог', en: 'Catalog', ar: 'الكتالوج' },
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
        showFilters: true,
        showSort: true,
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
      type: 'cta',
      data: cta({
        eyebrow: {
          ru: 'Двести шестьдесят позиций',
          en: 'Two hundred and sixty items',
          ar: 'مئتان وستون صنفاً في الكتالوج',
        },
        title: {
          ru: 'Сузим до двух-трёх',
          en: 'We will narrow it down to two or three',
          ar: 'سنختصرها لك في أفضل خيارين أو ثلاثة',
        },
        text: {
          ru: 'Напишите, для чего и в какие размеры, — пришлём варианты с ценами и сроками.',
          en: 'Tell us your purpose and dimensions — we will send options with prices and availability.',
          ar: 'أرسل متطلباتك والمقاسات وسنوافيك بالخيارات المتاحة مع الأسعار ومواعيد التسليم.',
        },
      }),
    },
    tx,
  )
}

// Tiles reuse the same covers displayed on catalogue shelves. A single call-to-action banner is placed at
// the bottom of the landing page: on shelf pages, the table itself is the entire page.
async function seedPricePages(siteId: SiteId, tx: Db | Transaction) {
  const index = await createPage(
    siteId,
    { slug: { ru: 'price', en: 'price' }, status: 'published', title: PRICE.title },
    tx,
  )
  for (const section of PRICE.sections)
    await createBlock(
      siteId,
      index.id,
      {
        type: 'banners',
        data: {
          title: section.name,
          layout: 'tile',
          items: await Promise.all(
            section.shelves.map(async (shelf) => ({
              title: shelf.name,
              action: { kind: 'page' as const, slug: pricePath(shelf.slug) },
              image:
                (await seedImage(`watt/categories/${shelf.slug}.webp`).catch(() => undefined)) ??
                undefined,
            })),
          ),
        },
      },
      tx,
    )
  await createBlock(
    siteId,
    index.id,
    {
      type: 'cta',
      data: cta({
        eyebrow: {
          ru: 'Считаем на объём',
          en: 'Volume estimates',
          ar: 'عروض وخصومات للكميات والمشاريع',
        },
        title: {
          ru: 'Нужен список под смету',
          en: 'Need a list for an estimate',
          ar: 'تحتاج قائمة أسعار لعطاء أو مقايسة؟',
        },
        text: {
          ru: 'Оснащаете квартиры, офис или гостиницу — пришлём цены на весь список одним файлом.',
          en: 'Furnishing apartments, office, or hotel — we will send prices for the whole list in one file.',
          ar: 'لتجهيز الشقق أو المكاتب أو الفنادق — نرسل لك عرض أسعار مفصلاً في ملف واحد.',
        },
      }),
    },
    tx,
  )

  // Short conventional English words for each shelf, matching the meaning of `shelf.name.en`
  // rather than a literal slugified copy of the combined page title.
  const SHELF_SLUG_EN: Record<string, string> = {
    holodilniki: 'refrigerators',
    'stiralnye-mashiny': 'washing-machines',
    'posudomoechnye-mashiny': 'dishwashers',
    plity: 'cookers',
    'duhovye-shkafy': 'ovens',
    'mikrovolnovye-pechi': 'microwaves',
    kofemashiny: 'coffee-makers',
    chayniki: 'kettles',
    pylesosy: 'vacuum-cleaners',
    konditsionery: 'air-conditioners',
  }

  for (const shelf of PRICE.sections.flatMap((section) => section.shelves)) {
    const page = await createPage(
      siteId,
      {
        slug: { ru: pricePath(shelf.slug), en: `price-${SHELF_SLUG_EN[shelf.slug]}` },
        status: 'published',
        title: {
          ru: `${PRICE.title.ru} · ${shelf.name.ru}`,
          en: `${PRICE.title.en} · ${shelf.name.en}`,
          ar: `${PRICE.title.ar} · ${shelf.name.ar}`,
        },
      },
      tx,
    )
    await createBlock(
      siteId,
      page.id,
      {
        type: 'table',
        data: {
          category: shelf.slug,
          columns: shelf.columns,
          // No button in the row — refrigerators are not added to cart in bulk from a list; the row links to the product card.
          showSku: true,
          showStock: true,
          showFilters: true,
          showExport: true,
          // largest shelf has 28 items: price table displays all of them
          limit: 60,
        },
      },
      tx,
    )
  }
}

// Page slug matches the post prefix, so `/poleznoe` is the section, and `/poleznoe/<slug>` is the article:
// the explicit page takes precedence over the prefix handler because it was crafted manually.
async function seedPostsPage(siteId: SiteId, tx: Db | Transaction) {
  const made = await createPage(
    siteId,
    {
      slug: { ru: 'poleznoe', en: 'articles' },
      status: 'published',
      title: { ru: 'Обзоры и статьи', en: 'Reviews and articles', ar: 'مراجعات ومقالات' },
      seoDescription: {
        ru: 'Обзоры бытовой техники из каталога и статьи о выборе: как измерить нишу, что решает при выборе стиральной машины, чем чистятся духовки.',
        en: 'Appliance reviews from our catalog and buying guides: measuring openings, choosing washing machines, oven cleaning methods.',
        ar: 'مراجعات لأجهزة الكتالوج ومقالات إرشادية: كيفية أخذ المقاسات، ومعايير اختيار الغسالات، وطرق تنظيف الأفران.',
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    made.id,
    {
      type: 'hero',
      data: {
        layout: 'plain',
        slides: [
          {
            title: {
              ru: 'Обзоры и статьи',
              en: 'Reviews and articles',
              ar: 'مراجعات ومقالات',
            },
            subtitle: {
              ru: 'Разбираем модели, которые сами и продаём, и отвечаем на то, что спрашивают до покупки.',
              en: 'We review the models we sell and answer the questions buyers ask before purchasing.',
              ar: 'نراجع الموديلات المتوفرة لدينا ونجيب على استفسارات العملاء قبل الشراء.',
            },
          },
        ],
      },
    },
    tx,
  )
  await createBlock(siteId, made.id, { type: 'posts', data: { layout: 'grid', limit: 9 } }, tx)
  await createBlock(
    siteId,
    made.id,
    {
      type: 'cta',
      data: cta({
        eyebrow: {
          ru: 'Остались вопросы',
          en: 'Still have questions',
          ar: 'هل ما زالت لديك استفسارات؟',
        },
        title: {
          ru: 'Спросите про свою модель',
          en: 'Ask about your model',
          ar: 'استفسر عن الموديل الذي ترغب به',
        },
        text: {
          ru: 'Напишите, что выбираете и в какие размеры, — ответим по делу, а не ссылкой на статью.',
          en: 'Tell us what you are choosing and your dimensions — we will give practical advice, not just an article link.',
          ar: 'أخبرنا بالموديل الذي تفضله وميزانيتك، وسنساعدك في المقارنة والاختيار.',
        },
      }),
    },
    tx,
  )
}

async function page(
  siteId: SiteId,
  tx: Db | Transaction,
  slug: string,
  slugEn: string,
  title: LocalizedLabel,
  subtitle: LocalizedLabel,
  body: LocalizedLabel[],
  band: {
    eyebrow: LocalizedLabel
    title: LocalizedLabel
    text: LocalizedLabel
  },
) {
  const made = await createPage(
    siteId,
    { slug: { ru: slug, en: slugEn }, status: 'published', title },
    tx,
  )
  await createBlock(
    siteId,
    made.id,
    {
      type: 'hero',
      data: { layout: 'plain', slides: [{ title, subtitle }] },
    },
    tx,
  )
  await createBlock(siteId, made.id, { type: 'text', data: { content: paragraphs(body) } }, tx)
  await createBlock(siteId, made.id, { type: 'cta', data: cta(band) }, tx)
  return made
}

async function seedDelivery(siteId: SiteId, tx: Db | Transaction) {
  await page(
    siteId,
    tx,
    'dostavka',
    'delivery',
    {
      ru: 'Доставка и оплата',
      en: 'Delivery and payment',
      ar: 'التوصيل والدفع',
    },
    {
      ru: 'По Бишкеку — на следующий день, по регионам — за два-три.',
      en: 'Next day in Bishkek, 2–3 days across regions.',
      ar: 'داخل بيشكيك — التسليم في اليوم التالي، وفي المناطق خلال يومين إلى ثلاثة أيام.',
    },
    [
      {
        ru: 'По Бишкеку доставка бесплатная при заказе от 20 000 сомов, ниже этой суммы — 500 сомов. Возим на следующий день после заказа: технику надо снять со стеллажа, проверить и упаковать, и делать это на бегу мы не будем.',
        en: 'Delivery in Bishkek is free for orders over 20,000 KGS (500 KGS for lower amounts). We deliver the next day: appliances must be retrieved from warehouse racks, inspected, and packed carefully.',
        ar: 'التوصيل مجاني في بيشكيك للطلبات التي تزيد عن 20,000 سوم، ويشمل الرفع إلى داخل الشقة.',
      },
      {
        ru: 'Подъём на этаж входит в доставку — грузчики приезжают вместе с машиной, отдельно вызывать никого не нужно. Исключение одно: выше третьего этажа без грузового лифта. Холодильник на пятый этаж по лестнице несут вчетвером, и это отдельная работа, о цене которой мы говорим заранее, а не на пороге.',
        en: 'Carrying upstairs is included in delivery — movers arrive with the truck. The only exception is above the 3rd floor without a freight elevator. Carrying a refrigerator up 5 flights of stairs requires 4 people and is priced in advance, not at your door.',
        ar: 'الرفع للأدوار مشمول في التوصيل عند توفر مصعد ملائم، ويحسب للأدوار فوق الثالث بدون مصعد مسبقاً.',
      },
      {
        ru: 'В регионы отправляем транспортной компанией, два-три дня до Оша, Джалал-Абада и Каракола. Стоимость считает перевозчик по весу и объёму; мы называем её до отправки и упаковываем технику в заводскую коробку с обрешёткой.',
        en: 'Regional shipments are handled via courier services, taking 2–3 days to Osh, Jalal-Abad, and Karakol. Shipping costs are calculated by weight and volume; we confirm the rate before dispatch and crate items securely.',
        ar: 'الشحن للمحافظات والمناطق المجاورة عبر شركات النقل المعتمدة بتكلفة واضحة.',
      },
      {
        ru: 'Платить можно картой на сайте, наличными курьеру, переводом на счёт или в рассрочку до 12 месяцев без переплаты. Крупную технику при получении можно распаковать и включить до оплаты — это нормально, и курьер об этом знает.',
        en: 'You can pay by card on the website, cash on delivery, bank transfer, or 0% installment plan up to 12 months. Major appliances can be unpacked and powered on before payment.',
        ar: 'طرق الدفع: بطاقة مصرفية عبر الموقع، أو تحويل بنكي، أو نقداً عند استلام الجهاز.',
      },
    ],
    {
      eyebrow: { ru: 'Считаем заранее', en: 'Calculated upfront', ar: 'احتساب الأسعار بدقة مسبقاً' },
      title: {
        ru: 'Скажем цену доставки до заказа',
        en: 'We will confirm delivery cost before order',
        ar: 'نخبرك بتكلفة التوصيل الإجمالية قبل تأكيد الطلب',
      },
      text: {
        ru: 'Назовите адрес и этаж — посчитаем подъём и назовём день.',
        en: 'Provide address and floor — we will calculate carrying cost and confirm delivery date.',
        ar: 'حدد العنوان ورقم الطابق — وسنحسب لك التكلفة الدقيقة في دقائق.',
      },
    },
  )
}

async function seedInstall(siteId: SiteId, tx: Db | Transaction) {
  await page(
    siteId,
    tx,
    'ustanovka',
    'installation',
    {
      ru: 'Установка и подключение',
      en: 'Installation and setup',
      ar: 'مساعدتك في اختيار الجهاز المناسب، وتوصيله، ورفعه، وتركيبه باحترافية.',
    },
    {
      ru: 'Мастер приезжает вместе с техникой — в один визит, а не в два.',
      en: 'The technician arrives together with delivery — in one visit, not two.',
      ar: 'يحضر الفني المعتمد مع الأجهزة في نفس الموعد',
    },
    [
      {
        ru: 'Стиральную и посудомоечную машину подключаем за 1500 сомов: подводка к воде, слив, проверка на протечку и первый холостой цикл. Если нужен новый кран или удлинение шланга, детали покупаем сами и показываем чек — накрутки на них нет.',
        en: 'Washing machine and dishwasher connection is 1,500 KGS: plumbing hookup, drain, leak check, and first test cycle. If a new valve or hose extension is required, we supply parts at receipt cost with no markup.',
        ar: 'تركيب غسالات الملابس وغسالات الأطباق بتكلفة 1500 سوم مع ضبط الاتزان واختبار التشغيل.',
      },
      {
        ru: 'Встраиваемая техника стоит от 2500 сомов, потому что это уже столярная работа: подогнать нишу, вывести розетку, закрепить фасад. Духовой шкаф и варочную панель ставим вместе — по отдельности выходит дороже и дольше.',
        en: 'Built-in appliances start at 2,500 KGS as carpentry is involved: fitting openings, wiring outlets, securing panels. Ovens and cooktops are installed together for efficiency.',
        ar: 'تركيب الأجهزة المدمجة يبدأ من 2500 سوم ويشمل قص الرخام وتمديد مقابس الكهرباء والتهوية.',
      },
      {
        ru: 'Кондиционер — от 6000 сомов за сплит-систему до девяти тысяч BTU, с трассой до трёх метров, вакуумированием и пуском. Работаем в тёплый сезон: зимой фреон в системе ведёт себя иначе, и честный монтаж в мороз невозможен.',
        en: 'Air conditioning installation starts at 6,000 KGS for split systems up to 9,000 BTU, including up to 3 meters of piping, vacuuming, and startup. We install during the warm season: reliable winter installation in freezing temperatures is unfeasible.',
        ar: 'تركيب المكيفات يبدأ من 6000 سوم ويشمل تمديد المواسير حتى 3 أمتار واختبار الضغط والتبريد.',
      },
      {
        ru: 'Старую технику увозим на утилизацию бесплатно, если ставим на её место новую. Холодильник и стиральную машину принимаем в любом состоянии — это не выкуп, а вывоз, и он избавляет вас от разговора с мусоровозом.',
        en: 'We haul away old appliances for recycling free of charge when replacing them with new ones. We accept refrigerators and washing machines in any condition.',
        ar: 'إمكانية نقل الجهاز القديم للتخلص منه عند الطلب.',
      },
    ],
    {
      eyebrow: { ru: 'Один визит', en: 'Single visit', ar: 'زيارة واحدة متكاملة' },
      title: {
        ru: 'Привезём и подключим в тот же день',
        en: 'Delivered and installed on the same day',
        ar: 'توصيل وتركيب وتشغيل في نفس اليوم',
      },
      text: {
        ru: 'Скажите, что ставим и куда, — приедем с мастером и нужными деталями.',
        en: 'Tell us what and where to install — we will arrive with the technician and all needed parts.',
        ar: 'حدد الأجهزة ومكان التركيب وسنرسل فريق التوصيل والفني معاً.',
      },
    },
  )
}

async function seedWarranty(siteId: SiteId, tx: Db | Transaction) {
  await page(
    siteId,
    tx,
    'garantiya',
    'warranty',
    { ru: 'Гарантия и сервис', en: 'Warranty and service', ar: 'الضمان والخدمة' },
    {
      ru: 'Свой сервис в Бишкеке — технику никуда не отправляем.',
      en: 'Our own service center in Bishkek — no need to ship appliances away.',
      ar: 'مركز صيانة معتمد في بيشكيك — صيانة الأجهزة في الموقع أو في ورشتنا دون تأخير.',
    },
    [
      {
        ru: 'Гарантия у всей техники заводская: год у большинства марок, два у Bosch, Siemens и Smeg, три у отдельных моделей встраиваемой техники. Срок написан в карточке товара и в гарантийном талоне, и он не меняется от того, где вы купили.',
        en: 'All appliances carry factory warranty: 1 year for most brands, 2 years for Bosch, Siemens, and Smeg, and 3 years for select built-in models. The warranty period is listed on the product page and certificate.',
        ar: 'جميع الأجهزة مشمولة بضمان المصنع الرسمي من سنة إلى ثلاث سنوات.',
      },
      {
        ru: 'Заявку по гарантии принимаем мы, а не производитель. Мастер выезжает по городу в течение двух рабочих дней; если поломка не чинится на месте, технику увозим в сервис и привозим обратно за свой счёт.',
        en: 'We handle warranty claims directly. Our technician visits within 2 business days across Bishkek; if on-site repair is not possible, we transport the unit to our service center and return it at our expense.',
        ar: 'نحن نتولى متابعة طلبات الضمان مباشرة. يقوم فنيونا بزيارة منزلك خلال يومي عمل؛ وفي حال تطلب الأمر إصلاحاً متقدماً، ننقل الجهاز إلى مركز الصيانة ونعيده مجاناً على نفقتنا.',
      },
      {
        ru: 'Крупная бытовая техника надлежащего качества возврату не подлежит — она входит в перечень технически сложных товаров. Мы говорим об этом до покупки, а не после: пришлите размеры ниши и фото места, где будет стоять техника, и мы скажем, встанет ли она.',
        en: 'Major household appliances of proper quality cannot be returned, as they are classified as technically complex goods. We emphasize this before purchase: send your dimensions and photos, and we will verify compatibility.',
        ar: 'وفقاً للقانون، لا يمكن استرجاع الأجهزة المنزلية الكبيرة السليمة نظراً لتصنيفها كأجهزة تقنية معقدة. لذلك نوضح كافة التفاصيل والأبعاد قبل الشراء: أرسل لنا صور وأبعاد المكان لنؤكد لك ملاءمة الجهاز مسبقاً.',
      },
      {
        ru: 'Если товар оказался с браком, это уже другой разговор: меняем на такой же, на другой с доплатой или возвращаем деньги — на ваш выбор, в течение срока, который даёт закон.',
        en: 'If an item proves defective, we replace it, exchange for another model, or issue a full refund — according to your preference within statutory terms.',
        ar: 'في حال وجود أي عيب مصنعي مثبت، يتم استبدال الجهاز بآخر مطابق، أو بموديل آخر مع تسوية الفارق، أو استرداد المبلغ كاملاً وفق المدد المحددة قانوناً.',
      },
    ],
    {
      eyebrow: { ru: 'До покупки', en: 'Before purchase', ar: 'قبل الشراء' },
      title: {
        ru: 'Проверим, встанет ли',
        en: 'We will verify the fit',
        ar: 'دعنا نتأكد من مطابقة المقاسات',
      },
      text: {
        ru: 'Пришлите размеры ниши — посчитаем зазоры и предложим то, что подойдёт.',
        en: 'Send opening dimensions — we will calculate clearances and recommend matching options.',
        ar: 'أرسل أبعاد الفتحة المخصصة — سنحسب لك المسافات المناسبة ونرشح لك الموديل المثالي.',
      },
    },
  )
}

async function seedAbout(siteId: SiteId, tx: Db | Transaction) {
  await page(
    siteId,
    tx,
    'o-kompanii',
    'about',
    { ru: 'О компании', en: 'About us', ar: 'من نحن' },
    {
      ru: 'Магазин бытовой техники в Бишкеке. Два зала, склад, свои мастера.',
      en: 'Home appliances store in Bishkek. Two showrooms, warehouse, dedicated technicians.',
      ar: 'متجر أجهزة منزلية في بيشكيك. معرضان، مستودع ضخم، وفريق فنيين معتمد.',
    },
    [
      {
        ru: 'Watt продаёт бытовую технику в Бишкеке с 2016 года. Начинали с одной точки на Жибек Жолу, где стояло полтора десятка холодильников; сейчас залов два — второй на Ахунбаева, — в каталоге больше двухсот позиций, а на складе в Аламедине лежит то, что можно забрать сегодня.',
        en: 'Watt has been retailing home appliances in Bishkek since 2016. We started with a single store on Zhibek Zholu with fifteen refrigerators; today we have two showrooms (second on Akhunbaev), over 200 catalog items, and warehouse stock in Alamedin ready for same-day pickup.',
        ar: 'تأسس متجر Watt للأجهزة المنزلية في بيشكيك عام 2016. بدأنا بفرع واحد في شارع جيبك جولو يحتوي على 15 ثلاجة؛ واليوم نمتلك معرضين حديثين (الثاني في شارع أخونباييف)، وكتالوجاً يضم أكثر من 200 منتج، ومستودعاً مركزياً في ألاميدين يوفر إمكانية الاستلام الفوري في نفس اليوم.',
      },
      {
        ru: 'Мы держим свой склад и своих мастеров, и это не про размах, а про сроки. Магазин без склада возит технику под заказ и говорит «через неделю»; магазин без мастеров продаёт коробку и оставляет вас искать, кто её подключит. Мы решили не делать ни того, ни другого.',
        en: 'We maintain our own warehouse and technician team for speed and reliability. Stores without warehouses operate on backorders with week-long delays; stores without technicians sell boxed units and leave you to find installers. We chose a comprehensive approach.',
        ar: 'نمتلك مستودعنا الخاص وفريق فنيينا المباشرين لضمان السرعة والاعتمادية. المتاجر التي لا تملك مستودعات تعمل بنظام الطلبات المتأخرة، والمتاجر التي تفتقر للفنيين تبيعك صندوقاً وتتركك تبحث عمن يركبه. نحن نقدم لك حلاً متكاملاً وموثوقاً.',
      },
      {
        ru: 'В залах стоит то же, что на сайте, и по той же цене. Технику можно включить: холодильник открыть и послушать, машину запустить на короткий цикл, пылесос попробовать на ковре. Крупная встраиваемая техника выставлена на Жибек Жолу, мелкая и климат — на Ахунбаева; если нужной модели нет в зале, привозим со склада на следующий день. Продавцы получают одинаково с любой марки, поэтому советуют по задаче, а не по марже.',
        en: 'Showrooms feature the exact same items and prices as the website. Appliances can be tested live: listen to a running refrigerator, run a washer test cycle, test vacuum cleaners on carpet. Major built-in units are showcased on Zhibek Zholu, small appliances and climate control on Akhunbaev. If an item is not on display, we deliver from warehouse next day. Sales staff receive equal compensation across brands, advising based on customer needs rather than margins.',
        ar: 'تعرض صالاتنا نفس المنتجات والأسعار المعروضة على الموقع تماماً. نتيح للعملاء تشغيل الأجهزة ومعاينتها: الاستماع لصوت الثلاجة، وتجربة دورة الغسيل، وتجربة المكنسة على السجاد. تتوزع الأجهزة الكبيرة في جيبك جولو والصغيرة في أخونباييف. مستشارو المبيعات يقدمون النصيحة بحيادية وفق احتياجك الحقيقي.',
      },
      {
        ru: 'Работаем и с застройщиками: комплектуем кухни и квартиры под сдачу, привозим партиями и ставим на объекте. Об условиях проще договориться голосом — напишите, и мы перезвоним.',
        en: 'We also partner with property developers: outfitting rental apartments and kitchens, delivering in volume, and installing on site. Contact us to discuss commercial terms.',
        ar: 'نعمل أيضاً مع المطورين العقاريين وأصحاب مشاريع الشقق الفندقية: نجهز المطابخ بالكامل ونورد دفعات الأجهزة مع التركيب في الموقع. تواصل معنا لمناقشة أسعار وتسهيلات الجملة.',
      },
    ],
    {
      eyebrow: { ru: 'Приходите смотреть', en: 'Visit our showrooms', ar: 'تفضل بزيارة معارضنا' },
      title: {
        ru: 'Всё можно включить и потрогать',
        en: 'Everything can be tested hands-on',
        ar: 'يمكنك تشغيل ومعاينة كافة الأجهزة مباشرة',
      },
      text: {
        ru: 'Жибек Жолу, 428 и Ахунбаева, 119 — без записи, с утра и до восьми вечера.',
        en: '428 Zhibek Zholu Ave and 119 Akhunbaev St — no appointment needed, open 09:00 to 20:00.',
        ar: 'جيبك جولو 428 وأخونباييف 119 — نرحب بكم يومياً من الصباح حتى 20:00 بدون موعد مسبق.',
      },
    },
  )
}

async function seedFaqPage(siteId: SiteId, tx: Db | Transaction) {
  const made = await createPage(
    siteId,
    {
      slug: { ru: 'voprosy', en: 'faq' },
      status: 'published',
      title: { ru: 'Вопросы и ответы', en: 'FAQ', ar: 'الأسئلة الشائعة' },
    },
    tx,
  )
  await createBlock(
    siteId,
    made.id,
    {
      type: 'hero',
      data: {
        layout: 'plain',
        slides: [
          {
            title: { ru: 'Вопросы и ответы', en: 'FAQ', ar: 'الأسئلة الشائعة' },
            subtitle: {
              ru: 'То, что спрашивают у прилавка каждый день.',
              en: 'Common questions we hear at the counter every day.',
              ar: 'إجابات على الأسئلة الشائعة التي نتلقاها يومياً في معارضنا.',
            },
          },
        ],
      },
    },
    tx,
  )
  /*
   * The questions, and under them the way to ask one that is not there.
   *
   * A dark band with a general «write to us» stood here: it sent the reader of a knowledge base to
   * the same contact form as everybody else, a page away. The button is the block's own now — it
   * opens the question in a window over the answers, and the reply, where it is a good one, goes
   * back into this very list.
   */
  await createBlock(
    siteId,
    made.id,
    {
      type: 'faq',
      data: {
        layout: 'list' as const,
        prompt: {
          ru: 'Не нашли свой вопрос? Спросите — ответим сегодня.',
          en: 'Did not find your question? Ask it — we reply the same day.',
          ar: 'لم تجد سؤالك؟ اسألنا وسنجيبك اليوم.',
        },
        action: {
          kind: 'form' as const,
          form: 'question',
          label: { ru: 'Задать вопрос', en: 'Ask a question', ar: 'اطرح سؤالاً' },
        },
      },
    },
    tx,
  )
}

async function seedPrivacy(siteId: SiteId, tx: Db | Transaction) {
  const made = await createPage(
    siteId,
    {
      slug: { ru: 'privacy', en: 'privacy' },
      status: 'published',
      noindex: true,
      title: {
        ru: 'Политика конфиденциальности',
        en: 'Privacy policy',
        ar: 'سياسة الخصوصية',
      },
    },
    tx,
  )
  await createBlock(
    siteId,
    made.id,
    {
      type: 'text',
      data: {
        content: paragraphs([
          {
            ru: 'Мы собираем имя, телефон, почту и адрес доставки — то, без чего заказ не привезти. Ничего сверх этого не спрашиваем и не храним.',
            en: 'We collect name, phone, email, and delivery address — only what is essential to fulfill your order. We do not ask for or store anything beyond this.',
            ar: 'نقوم بجمع الاسم، ورقم الهاتف، والبريد الإلكتروني، وعنوان التوصيل — وهي البيانات الأساسية والضرورية فقط لتنفيذ وتوصيل طلبك. لا نطلب ولا نحتفظ بأي معلومات غير ضرورية.',
          },
          {
            ru: 'Данные нужны, чтобы согласовать доставку, оформить гарантию и ответить на обращение. Мы не передаём их третьим лицам, кроме перевозчика и банка-партнёра при рассрочке, и только в объёме, нужном для конкретного заказа.',
            en: 'Data is used to coordinate delivery, register warranty, and respond to inquiries. We do not disclose information to third parties, except delivery carriers and partner banks for installments, strictly within the scope required for the order.',
            ar: 'تُستخدم البيانات لتنسيق التوصيل، وإصدار شهادات الضمان، والرد على استفساراتكم. لا نشارك بياناتكم مع أي أطراف خارجية باستثناء شركات الشحن والبنوك الشريكة لخدمات التقسيط، وفي حدود ما يقتضيه تنفيذ الطلب فقط.',
          },
          {
            ru: 'Написать об удалении своих данных можно на zakaz@watt.kg — удаляем в течение трёх рабочих дней, кроме сведений, которые обязаны хранить по закону о бухгалтерском учёте.',
            en: 'To request data deletion, contact zakaz@watt.kg — records will be removed within 3 business days, excluding information required to be maintained by accounting laws.',
            ar: 'يمكنك طلب حذف بياناتك في أي وقت عبر مراسلتنا على zakaz@watt.kg — ويتم الحذف خلال 3 أيام عمل، باستثناء السجلات التي يفرض القانون المالي والضريبي الاحتفاظ بها.',
          },
        ]),
      },
    },
    tx,
  )
}

async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  for (const [zone, items] of Object.entries(MENU)) {
    for (const [position, item] of items.entries()) {
      await createMenuItem(
        siteId,
        {
          zone: zone as NavZone,
          label: item.label,
          position,
          action:
            'route' in item
              ? { kind: 'route' as const, route: item.route }
              : { kind: 'page' as const, slug: item.page },
          ...('icon' in item ? { icon: item.icon } : {}),
        },
        tx,
      )
    }
  }
}
