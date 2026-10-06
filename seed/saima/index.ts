export * from './dictionary'
export * from './garments'

// Eighth demo and first manufacturing workshop: two distinct facets — a retail storefront for individuals
// purchasing a single dress, and wholesale production for sellers ordering batches. The facets differ in page
// content rather than separate sites: single site, shared address, single catalog.
// Two workshops, each featuring an attached showroom: production and fitting room share premises so that
// retail buyers trying on sizes and wholesale clients inspecting stitching visit the same address.
// The first location is primary: header and footer resolve address and phone from it.
export const SAIMA_PLACES = [
  {
    name: {
      ru: 'Цех и шоурум на Ибраимова',
      en: 'Workshop and Showroom on Ibraimov',
      ar: 'الورشة والمعرض في شارع إبراهيموف',
    },
    address: {
      ru: 'Бишкек, улица Ибраимова, 115, корпус 2',
      en: 'Bishkek, 115 Ibraimov St, Bldg 2',
      ar: 'بيشكيك، شارع إبراهيموف 115، مبنى 2',
    },
    hours: {
      ru: 'Пн–Сб 09:00–18:00',
      en: 'Mon–Sat 09:00–18:00',
      ar: 'الإثنين–السبت 09:00–18:00',
    },
    phone: '+996 312 545 220',
    email: 'zakaz@saima.kg',
    lat: 42.8654,
    lng: 74.6127,
  },
  {
    name: {
      ru: 'Цех и шоурум в Аламедине',
      en: 'Workshop and Showroom in Alamedin',
      ar: 'الورشة والمعرض في ألاميدين',
    },
    address: {
      ru: 'Бишкек, улица Матросова, 1/3, промзона Аламедин-1',
      en: 'Bishkek, 1/3 Matrosov St, Alamedin-1 Industrial Zone',
      ar: 'بيشكيك، شارع ماتروزوف 1/3، المنطقة الصناعية ألاميدين-1',
    },
    hours: {
      ru: 'Пн–Сб 09:00–18:00',
      en: 'Mon–Sat 09:00–18:00',
      ar: 'الإثنين–السبت 09:00–18:00',
    },
    phone: '+996 312 660 118',
    email: 'alamedin@saima.kg',
    lat: 42.8731,
    lng: 74.6519,
  },
]

export const SAIMA_ORG = {
  name: 'Saima',
  slug: 'demo8',
  defaultLocale: 'ru',
  locales: ['ru', 'en', 'ar'],
  currency: 'KGS' as const,
  tagline: {
    ru: 'Швейный цех: женская одежда своей марки и отшив партиями',
    en: 'Garment manufacturing: in-house womenswear brand and contract batch production',
    ar: 'مصنع خياطة: علامة ملابس نسائية خاصة وإنتاج دفعات تجارية',
  },
  about: {
    ru: 'Saima — бишкекский швейный цех. Шьём женскую одежду под своей маркой и отшиваем партии для магазинов и селлеров: раскрой, пошив, влажно-тепловая обработка и упаковка — всё в своих двух цехах, на Ибраимова и в Аламедине. При каждом цехе шоурум. Коллекция со склада продаётся поштучно, тираж считается по лестнице цен.',
    en: 'Saima is a Bishkek garment manufacturer. We craft our own womenswear label and produce batch orders for retailers and marketplace sellers: pattern cutting, stitching, garment steaming, and packaging across our two facilities on Ibraimov and in Alamedin. Each workshop features a showroom. In-stock items available individually, bulk runs priced on a tiered scale.',
    ar: 'Saima — ورشة ومصنع خياطة في بيشكيك. نصنع تشكيلة ملابس نسائية لعلامتنا الخاصة وننتج دفعات تجارية للمتاجر وبائعي الماركتبليس: قص، خياطة، معالجة حرارية وبخارية وتغليف — كل ذلك في ورشتينا بشارع إبراهيموف وألاميدين. يتوفر معرض ملحق بكل ورشة. تتوفر التشكيلة الجاهزة بالقطعة الواحدة، وتُسعر طلبيات الدفعات وفق سلم أسعار الجملة.',
  },
  deliveryNote: {
    ru: 'По Бишкеку курьером на следующий день, по регионам и в Казахстан — транспортной компанией',
    en: 'Next-day courier delivery across Bishkek; shipping across regions and Kazakhstan via freight carriers',
    ar: 'توصيل عبر المندوب في اليوم التالي داخل بيشكيك؛ وللمحافظات وكازاخستان عبر شركات الشحن',
  },
  paymentNote: {
    ru: 'Перевод по QR или наличными в цехе; партия — по счёту на юрлицо',
    en: 'Payment via QR code or cash at the workshop; batch orders invoiced to legal entities',
    ar: 'الدفع عبر رمز QR أو نقداً في الورشة؛ ودفعات الجملة بموجب فواتير رسمية للشركات',
  },
  warrantyNote: {
    ru: 'Не подошёл размер — меняем в течение четырнадцати дней',
    en: 'Size exchange guaranteed within 14 days',
    ar: 'إذا لم يناسبك المقاس — نستبدله خلال 14 يوماً',
  },
  // Одна цена на весь город — значит один район, и покупателя не спрашивают, где он живёт. Те же
  // числа, что стояли двумя полями у сайта, пока цена доставки жила там.
  zones: [
    {
      name: {
        ru: 'Доставка по Бишкеку',
        ky: 'Бишкек боюнча жеткирүү',
        en: 'Delivery across Bishkek',
        ar: 'التوصيل في بيشكيك',
      },
      fee: 20000,
      freeFrom: 500000,
    },
  ],
  channels: { whatsapp: '+996555545220', instagram: 'saima.kg' },
  mapProvider: 'twogis' as const,
  features: { goods: true, cart: true, favorites: true, payments: true },
  fulfilments: ['pickup' as const, 'delivery' as const],
  // The workshop sews to precise patterns rather than cutting by weight: finished garments match orders exactly,
  // and correction is utilized for wholesale order adjustments after final review.
  correction: 'actual' as const,
  // Any catalog style can be produced on demand — "insufficient stock" is not an obstacle. The cart accepts
  // any quantity; orders exceeding warehouse stock generate an estimate: without payment QR, pending workshop confirmation.
  shortage: 'request' as const,
  payment: {
    label: 'Оптима Банк',
    merchant: 'ОсОО Saima',
    city: 'Бишкек',
    country: 'KG',
    // ISO 4217 numeric for KGS; 5651 is MCC for apparel and garment retail
    currency: '417',
    mcc: '5651',
    account: '9876543210987654',
    scheme: 'KG.DEMOBANK',
  },
  // Showcase look: the demo centers around batch production requests rather than catalog browsing.
  //
  // The display pair on the white ground — the standard dress of a workshop's site, and chosen to be
  // one. A sewing workshop is the commonest client this demo stands for, and what tells two of them
  // apart must be what each brings itself: the photograph across the first screen and the sentence
  // set on it. The warm paper ground used to carry that difference here, and a ground is the wrong
  // carrier — it is one of three, so the fourth workshop repeats the first.
  theme: {
    look: 'showcase' as const,
    font: 'display' as const,
    accent: '#2d4f6b',
    register: 'light' as const,
    radius: 'sm' as const,
  },
}

// Volume tier belongs to the product pricing structure rather than promotional discounts: wholesale clients
// see their rate directly. Thresholds are identical catalog-wide because pricing scales with batch volume
// rather than silhouettes.
export const SAIMA_TIERS = [
  { from: 10, off: 10 },
  { from: 50, off: 18 },
  { from: 100, off: 25 },
  { from: 300, off: 32 },
]
