import { toHundredths } from '@anavi/shared'
export * from './dictionary'
export * from './garments'

// Eighth demo and first manufacturing workshop: a made-to-order workshop that shows its portfolio and
// sells batches to shops, marketplace sellers and brands without their own production. One site, one
// address, one catalogue of models it has already sewn.
// Two workshops, each with an attached showroom: clients can inspect samples, seams and fit at the same
// address where the batch is made. The first location is primary: header and footer resolve address and
// phone from it.
export const SAIMA_PLACES = [
  {
    city: 'bishkek',
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
    city: 'bishkek',
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
  slug: 'saima',
  defaultLocale: 'ru',
  locales: ['ru', 'en', 'ar'],
  currency: 'KGS' as const,
  tagline: {
    ru: 'Швейный цех: отшив женской одежды под заказ и партиями',
    en: 'Garment workshop: made-to-order womenswear and batch production',
    ar: 'ورشة خياطة: تفصيل ملابس نسائية حسب الطلب وإنتاج دفعات',
  },
  about: {
    ru: 'Saima — бишкекский швейный цех. Отшиваем женскую одежду под заказ: партии от десяти штук, по нашим моделям или вашим лекалам, для магазинов, селлеров и марок без своего производства. Раскрой, пошив, влажно-тепловая обработка и упаковка — всё в своих двух цехах, на Ибраимова и в Аламедине. При каждом цехе шоурум, где можно посмотреть образцы работ.',
    en: 'Saima is a Bishkek garment workshop. We sew womenswear to order: runs from ten pieces, to our own models or your patterns, for shops, marketplace sellers and brands without their own production. Cutting, stitching, pressing and packing in our two workshops on Ibraimov and in Alamedin. Each workshop has a showroom where you can see samples of our work.',
    ar: 'Saima — ورشة خياطة في بيشكيك. نفصّل ملابس نسائية حسب الطلب: دفعات من عشر قطع، وفق موديلاتنا أو بتروناتكم، للمتاجر وبائعي الماركتبليس والعلامات التجارية التي لا تملك ورشة خاصة بها. القص والخياطة والمعالجة الحرارية والتغليف — كل ذلك في ورشتينا بشارع إبراهيموف وألاميدين. ويتوفر معرض ملحق بكل ورشة لعرض نماذج من أعمالنا.',
  },
  deliveryNote: {
    ru: 'По Бишкеку курьером на следующий день, по регионам и в Казахстан — транспортной компанией',
    en: 'Next-day courier delivery across Bishkek; shipping across regions and Kazakhstan via freight carriers',
    ar: 'توصيل عبر المندوب في اليوم التالي داخل بيشكيك؛ وللمحافظات وكازاخستان عبر شركات الشحن',
  },
  paymentNote: {
    ru: 'Партия — по счёту на юрлицо или ИП; образец — наличными в цехе',
    en: 'Batch orders invoiced to a legal entity or sole proprietor; samples paid in cash at the workshop',
    ar: 'دفعات الجملة بموجب فاتورة رسمية للشركة أو رجل الأعمال؛ والعينة نقداً في الورشة',
  },
  warrantyNote: {
    ru: 'Посадку проверяем на сигнальном образце; брак в партии заменяем по договору',
    en: 'Fit is checked on a prototype sample; defects in a batch are replaced under the contract',
    ar: 'نتحقق من القصة على عينة نموذجية؛ ونستبدل عيوب الدفعة وفق العقد',
  },
  // One price for the whole city is one district, and the buyer is not asked where they live. The
  // same numbers that stood as two fields of the site while the delivery price lived there.
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
  // A workshop: it sews what it sells, from cards, and a batch is cheaper by the hundred.
  features: {
    goods: true,
    certificates: true,
    stock: true,
    production: true,
    tiers: true,
    // The workshop takes no order by a press: a model is discussed in a messenger and a batch is
    // counted by the request form. The basket, its page and its count are shut with the entity.
    cart: false,
    favorites: true,
    services: true,
    // Batches for boutiques are billed to the shop on account: the wholesale manager writes them from the boutique's card.
    accounts: true,
  },
  fulfilments: ['pickup' as const, 'delivery' as const],
  // The workshop sews to precise patterns rather than cutting by weight: finished garments match orders exactly,
  // and correction is utilized for wholesale order adjustments after final review.
  correction: 'actual' as const,
  // Any catalog style can be produced on demand — "insufficient stock" is not an obstacle. What the
  // staff writes from a client's card beyond the shelf becomes an estimate: no payment QR, the
  // workshop confirms the term and the price first.
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
// Said in per cents, kept in hundredths as every ladder is.
/*
 * The boutiques Saima's wholesale manager sells batches to: organizations with no site of their own, buying from Saima's back office
 * on account, so a batch is billed to the business and never to a person with a telephone.
 */
export const SAIMA_RETAILERS = [
  {
    name: 'Бутик Айдана',
    person: 'Айдана Бекболотова',
    email: 'aidana@butik-aidana.kg',
    taxId: 'ИНН 02104201810377',
    address: 'г. Бишкек, ул. Киевская, 95',
  },
  {
    name: 'Шоурум Ак-Кеме',
    person: 'Динара Усенова',
    email: 'dinara@ak-keme-showroom.kg',
    taxId: 'ИНН 01509201910452',
    address: 'г. Бишкек, пр. Мира, 33',
  },
]

export const SAIMA_TIERS = [
  { from: 10, off: 10 },
  { from: 50, off: 18 },
  { from: 100, off: 25 },
  { from: 300, off: 32 },
].map((one) => ({ from: one.from, off: toHundredths(one.off) }))

/*
 * THE EXPORT LIST. The workshop sells to firms abroad by another price list, in dollars and dearer
 * than retail, shown on the English version to whoever reads it: a few volume models at a dollar
 * price of their own that does not float with the som, everything else fifteen per cent above the
 * base. A local firm reading English switches back to the local market by the key of the storefront.
 */
export const SAIMA_DOLLAR = 87.5

export const SAIMA_EXPORT = {
  kind: { name: { ru: 'Экспорт', en: 'Export', ar: 'تصدير' }, currency: 'USD' as const },
  // Dollars and cents, per piece, on every size and colour of the model.
  own: [
    { slug: 'plate-midi-poyas', price: 45 },
    { slug: 'plate-vechernee', price: 79 },
    { slug: 'bluza-shelk', price: 39 },
  ],
  // Per cent above the base on the rest of the catalogue.
  markup: 15,
  market: {
    name: { ru: 'Экспорт', en: 'Export', ar: 'تصدير' },
    currency: 'USD' as const,
    locales: ['en'],
  },
}
