import type { LocalizedLabel } from '@anavi/shared'

export * from './catalog'
export * from './pages'
export * from './products'

// First demo to test engine performance at scale: two hundred products in one catalog, stress-testing
// listing grids, faceted filters, and media loaders. There was no existing project — two hundred
// transparent cut-out photos were processed; catalog taxonomy, dictionary, titles, and pricing were designed here.
// The demo has no separate addresses block, but a location is still provisioned: footer and header
// resolve address and phone from it rather than a dedicated block.
export const DYIKAN_PLACES = [
  {
    name: { ru: 'Павильон на Ошском рынке', en: 'Osh Bazaar Pavilion', ar: 'جناح سوق أوش' },
    address: {
      ru: 'Бишкек, улица Жибек Жолу, 394, Ошский рынок, павильон 12',
      en: 'Pavilion 12, Osh Bazaar, 394 Zhibek Zholu St, Bishkek',
      ar: 'بيشكيك، شارع جيبك جولو، 394، سوق أوش، الجناح 12',
    },
    hours: { ru: 'Ежедневно 07:00–18:00', en: 'Daily 07:00–18:00', ar: 'يومياً من 07:00 حتى 18:00' },
    phone: '+996 312 660 440',
    email: 'zakaz@dyikan.kg',
    lat: 42.8767,
    lng: 74.5836,
  },
]

export const DYIKAN_ORG = {
  name: 'Dyikan',
  slug: 'demo5',
  defaultLocale: 'ru',
  locales: ['ru', 'en', 'ar'],
  currency: 'KGS' as const,
  tagline: {
    ru: 'Продуктовый рынок с доставкой по Бишкеку',
    en: 'Farmers market with delivery across Bishkek',
    ar: 'سوق المنتجات الطازجة مع التوصيل في بيشكيك',
  },
  about: {
    ru: 'Dyikan — обычный бишкекский рынок, который научился принимать заказы. Овощи с чуйских теплиц, мясо утреннего забоя, молочка местных заводов, хлеб из своего тандыра и бакалея — почти двести позиций на полках. Собираем корзину и привозим по городу.',
    en: 'Dyikan is an authentic Bishkek market with modern online ordering. Vegetables from Chuy greenhouses, fresh morning-slaughtered meat, local dairy, tandoor bread, and groceries — nearly two hundred pantry staples delivered across the city.',
    ar: 'Dyikan هو سوق بيشكيك الأصيل بنظام طلب إلكتروني حديث. خضار من مزارع تشوي، لحوم ذبح صباحي، ألبان محلية، خبز التنور الطازج وبقالة — قرابة مئتي صنف نوصلها إلى منزلك.',
  },
  // For a grocery market, delivery note is paramount: temperature integrity during transit is decisive.
  deliveryNote: {
    ru: 'Доставка по Бишкеку в день заказа, от 1000 сом — бесплатно',
    en: 'Same-day delivery across Bishkek, free on orders over 1,000 KGS',
    ar: 'توصيل في نفس اليوم في بيشكيك، ومجاناً للطلبات فوق 1000 سوم',
  },
  paymentNote: {
    ru: 'Оплата переводом по QR или наличными курьеру',
    en: 'Payment via QR code transfer or cash upon delivery',
    ar: 'الدفع عبر تحويل رمز QR أو نقداً عند الاستلام',
  },
  warrantyNote: {
    ru: 'Не понравился товар — забираем обратно и возвращаем деньги',
    en: 'Satisfaction guarantee: easy returns and refunds if not completely satisfied',
    ar: 'ضمان الرضا: استرجاع البضاعة واسترداد المبلغ فوراً إن لم تنل إعجابك',
  },
  // Delivery threshold matching the note above: previously checkout displayed "Free delivery" regardless
  // of subtotal. Expressed in minor units, like all pricing.
  /*
   * ГДЕ ВОЗИТ И ПОЧЁМ — три района вместо одной цены на весь свет.
   *
   * Рынок стоит на левом берегу: соседние кварталы возит почти даром и бесплатно с тысячи, через
   * реку — вдвое дороже и порог выше, за город — дороже втрое и бесплатной доставки там не бывает
   * вовсе. Ровно это и есть «за реку дороже» из очереди.
   *
   * Первый район несёт прежние числа сайта (150 сом, бесплатно от 1000): пока он был один, ими и
   * считали.
   */
  zones: [
    {
      name: {
        ru: 'Центр и левый берег',
        ky: 'Борбор жана сол жээк',
        en: 'Centre and left bank',
        ar: 'المركز والضفة اليسرى',
      },
      fee: 15000,
      freeFrom: 100000,
    },
    {
      name: { ru: 'Правый берег', ky: 'Оң жээк', en: 'Right bank', ar: 'الضفة اليمنى' },
      fee: 30000,
      freeFrom: 200000,
    },
    {
      name: { ru: 'Пригород', ky: 'Шаар четиндеги', en: 'Suburbs', ar: 'الضواحي' },
      fee: 45000,
      freeFrom: null,
    },
  ],
  channels: { whatsapp: '+996312660440' },
  mapProvider: 'twogis' as const,
  // First demo where the cart is not a technical mock, but essential to manage forty items in a single order.
  // Readers, and therefore following the catalogue: a market whose entire daily news is what is on
  // the shelf today is the business the subscription was built for. Until this, the mechanic was
  // switched off on all ten demos and `/updates` answered 404 everywhere — a page nobody had ever
  // seen.
  features: { goods: true, cart: true, favorites: true, payments: true, readers: true },
  // The market operates delivery-only: fulfillment selection is omitted from checkout, inheriting this setting.
  fulfilments: ['delivery' as const],
  // The market promises this in meat category copy: "we round weights in your favor". Weighted cuts
  // exceeding target weight do not generate extra payment requests.
  correction: 'favour' as const,
  // The meat row belongs to «Халиф», and the market says so on every card of it. The first demo
  // where this setting means anything: naming the seller is the storefront's decision, and a market
  // that rents its meat row out and hides whose it is would be lying by omission.
  namesSupplier: true,
  /*
   * No page behind a card either, and for the market the argument is louder still.
   *
   * Five hundred goods, and a tomato has a name, a picture and a price — all three already on the
   * card. The page repeats them, and a shopper filling a basket for the week is made to open and
   * close five hundred of them. The shelves keep their addresses; only the leaf goes.
   */
  productPages: false,
  // Payload string is assembled in EMVCo standard by seed and converted to image through the same
  // upload path used for bank merchant assets. Cyrillic merchant name tests UTF-8 checksum calculation.
  /*
   * WHAT A CUSTOMER EARNS FOR BRINGING A FRIEND — the third kind of holder, and the only one that
   * needs a till: the link is a code, and a code is typed into a basket.
   *
   * The friend gets nothing off, and that is the shape rather than an omission: a market lives on
   * thin margins and the link is pure attribution — the case `ord_promo` describes as «an owner and
   * no discount». What it changes is who the order is attributed to, not what it costs.
   */
  buyerReward: { kind: 'percent' as const, value: 3 },
  /*
   * WHEN THE VAN GOES — three rounds a day, every day, and the market's own numbers.
   *
   * A grocery is brought «сегодня с 18 до 20»: that is the first thing a buyer asks and the last
   * thing the courier agrees. The evening round is the big one — people order for after work — so it
   * carries four more places than the daytime ones. Two hours' notice on all three: the order is
   * picked off the counters in the morning and the van is loaded before it leaves.
   */
  slots: [
    {
      startsAt: 10 * 60,
      endsAt: 14 * 60,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      capacity: 12,
      lead: 120,
    },
    {
      startsAt: 14 * 60,
      endsAt: 18 * 60,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      capacity: 12,
      lead: 120,
    },
    {
      startsAt: 18 * 60,
      endsAt: 21 * 60,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      capacity: 16,
      lead: 120,
    },
  ],
  payment: {
    label: 'MBank',
    merchant: 'ОсОО Dyikan',
    city: 'Бишкек',
    country: 'KG',
    // ISO 4217 numeric for KGS; 5411 is MCC for grocery stores and supermarkets
    currency: '417',
    mcc: '5411',
    account: '1234567890123456',
    scheme: 'KG.DEMOBANK',
  },
  // Retail look variation: Vega uses the same look in monospace and indigo; the market requires
  // compact density and warm green accents. Small radius prevents a visual wall of rounded corners across 2-column mobile grids.
  theme: {
    look: 'retail' as const,
    font: 'modern' as const,
    accent: '#2f8f4e',
    radius: 'sm' as const,
  },
}

export interface DyikanSelection {
  slug: string
  name: LocalizedLabel
  description: LocalizedLabel
  // Saved filter criteria — populated automatically. Otherwise item slugs are listed explicitly.
  values?: string
  products?: string[]
}

// One dynamic filter-based selection; three explicitly curated lists. Halal is standard in Bishkek groceries
// rather than a separate facet where everything would trivially match.
export const DYIKAN_SELECTIONS: DyikanSelection[] = [
  {
    slug: 'skidki-nedeli',
    name: { ru: 'Скидки недели', en: 'Weekly discounts', ar: 'تخفيضات الأسبوع' },
    description: {
      ru: 'Пятнадцать позиций, на которые цена опущена до понедельника.',
      en: 'Fifteen selected items at special reduced prices through Monday.',
      ar: 'خمسة عشر صنفاً مميزاً بأسعار مخفضة حتى يوم الاثنين.',
    },
    products: [
      'yabloki-zelyonye',
      'mandariny',
      'kurica-celikom',
      'syr-rossijskij',
      'grechka',
      'sahar-pesok',
      'maslo-podsolnechnoe',
      'majonez',
      'tunec-konservirovannyj',
      'pelmeni-domashnie',
      'konfety-korovka',
      'pechenye-yubilejnoe',
      'sok-multifrukt',
      'poroshok-stiralnyj',
      'shampun',
    ],
  },
  {
    slug: 'mestnoe',
    name: { ru: 'Местное', en: 'Local produce', ar: 'منتجات محلية' },
    description: {
      ru: 'Всё, что выросло и сделано здесь: чуйские теплицы, иссык-кульская форель, горный мёд.',
      en: 'Grown and produced locally: Chuy greenhouses, Issyk-Kul trout, and mountain honey.',
      ar: 'كل ما زُرع وصُنع هنا: مزارع تشوي، السلمون المرقط من إيسيك كول، وعسل الجبال.',
    },
    values: 'osobennosti:mestnoe',
  },
  {
    slug: 'vsyo-dlya-plova',
    name: { ru: 'Всё для плова', en: 'Everything for pilaf', ar: 'كل ما تحتاجه للأرز البخاري' },
    description: {
      ru: 'Рис, морковь, лук, баранина и своя смесь специй — всё, что нужно на казан.',
      en: 'Rice, carrots, onions, lamb, and house spice blend — everything needed for a cauldron.',
      ar: 'أرز، جزر، بصل، لحم ضأن وخلطة بهاراتنا الخاصة — كل ما يلزم لطهي قدر البلوف.',
    },
    products: [
      'ris-dlinnozyornyj',
      'baranina-lopatka',
      'govyadina-gulyash',
      'morkov',
      'luk-repchatyj',
      'chesnok',
      'nut',
      'kuraga',
      'maslo-podsolnechnoe',
      'pripava-dlya-plova',
      'perec-chyornyj-molotyj',
      'sol-povarennaya',
    ],
  },
  {
    slug: 'k-zavtraku',
    name: { ru: 'К завтраку', en: 'For breakfast', ar: 'لوجبة الإفطار' },
    description: {
      ru: 'Хлеб, масло, яйца, творог и кофе — набор, который берут по дороге домой.',
      en: 'Bread, butter, eggs, cottage cheese, and coffee — morning essentials.',
      ar: 'خبز، زبدة، بيض، جبنة قريش وقهوة — أساسيات الإفطار الصباحي.',
    },
    products: [
      'baton-nareznoj',
      'kruassan',
      'maslo-slivochnoe-72',
      'yajca-kurinye',
      'moloko-2-5',
      'tvorog-5',
      'smetana-20',
      'syr-rossijskij',
      'jogurt-grecheskij',
      'myod-gornyj',
      'kofe-rastvorimyj',
      'chaj-chyornyj',
    ],
  },
]
