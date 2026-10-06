export * from './catalog'
export * from './places'

/*
 * «Халиф» — a halal food shop built around its own meat counter and cutting room, and the eleventh
 * organization on the platform.
 *
 * It began here as a butcher and nothing else, and the shelves it has now are the correction: the
 * shop this is drawn from sells through a messenger, marinades are the larger half of what leaves,
 * and around them stand honey, preserves, dairy, fish, eggs, dates, grains, spices and the drinks a
 * Kyrgyz household actually asks for. Meat is the CORE and not the whole — which is a different
 * shop from a butcher, and the texts below say so.
 *
 * It stands entirely on its own: its own catalogue, its own prices, its own stock, its own till. Not
 * one line here mentions the market — the partnership between them arrives with the next item, and
 * if anything of it were needed here, this demo would be built wrong.
 *
 * It has a published site of its own on purpose rather than by habit: a supplier without one is
 * impossible today (see the seam in `DEFERRED.md`), and a butcher who sells both over his own
 * counter and through the market is ordinary life anyway.
 *
 * The material is INVENTED by the assistant rather than described by the owner — the backlog asked
 * for the opposite, and the owner answered «decide for me» twice. Written down so that it can be
 * replaced later without taking the machinery apart.
 */
export const KHALIF_ORG = {
  name: 'Khalif',
  slug: 'demo11',
  // The three the material already carries: the texts moved across as written, and nothing was
  // translated by anybody new.
  defaultLocale: 'ru',
  locales: ['ru', 'en', 'ar'],
  // The same money as the market's, deliberately: the next item is about a supply, and a demo where
  // it also had to hang an exchange rate would be showing two things at once.
  currency: 'KGS' as const,
  country: 'KG' as const,
  tagline: {
    ru: 'Халяльная лавка со своим мясным цехом: маринады, мясо и всё к столу',
    en: 'A halal shop with its own cutting room: marinades, meat and the rest of the table',
    ar: 'محل حلال بورشة لحوم خاصة: متبّلات ولحوم وكل ما يلزم المائدة',
  },
  about: {
    ru: 'Халиф — халяльная лавка на Ошском рынке. Берём целыми тушами у чуйских хозяйств, забой утренний, режем при вас. Говядина и баранина — со своего цеха, птица — от фермеров, которых знаем по именам. Режем как просите: на плов кубиком, на шашлык крупнее, кости на бульон — рубим отдельно. Маринуем сами, с вечера на утро: баранина, говядина, курица, люля.\n\nЧто к столу — берём у тех же хозяйств: мёд с сузакских пасек, варенье и каймак домашние, иссык-кульская рыба, яйцо со двора, узгенская девзира, зира и барбарис на развес и финики к Рамадану.',
    en: 'Khalif is a halal shop at the Osh bazaar. We buy whole carcasses from Chuy farms, slaughter in the morning and cut to order in front of you. Beef and lamb come from our own cutting room; poultry from farmers we know by name. We marinate ourselves, overnight: lamb, beef, chicken, lyulya.\n\nThe rest of the table comes from the same farms: honey from Suzak apiaries, home preserves and kaymak, Issyk-Kul fish, yard eggs, Uzgen devzira rice, cumin and barberry by weight and dates for Ramadan.',
    ar: 'خليف محل حلال في سوق أوش. نشتري الذبائح كاملة من مزارع تشوي، والذبح صباحي، ونقطع أمامك حسب طلبك. اللحم البقري والضأن من ورشتنا، والدواجن من مزارعين نعرفهم بالاسم. ونتبّل بأنفسنا من المساء إلى الصباح: ضأن وبقر ودجاج ولولا كباب.\n\nوما يلزم المائدة من المزارع نفسها: عسل من مناحل سوزاك، ومربّى وقيمر بيتي، وسمك إيسيك كول، وبيض بلدي، وأرز ديفزيرا من أوزغين، وكمّون وبرباريس بالوزن، وتمور لرمضان.',
  },
  deliveryNote: {
    ru: 'Самовывоз из лавки или доставка по Бишкеку от 1500 сом',
    en: 'Collect at the shop, or delivery across Bishkek on orders over 1,500 KGS',
    ar: 'الاستلام من المحل أو التوصيل في بيشكيك للطلبات فوق 1500 سوم',
  },
  paymentNote: {
    ru: 'Перевод по QR или наличными в лавке',
    en: 'QR transfer or cash at the counter',
    ar: 'تحويل عبر رمز QR أو نقداً عند المحل',
  },
  warrantyNote: {
    ru: 'Взвешиваем при вас, вес округляем в вашу пользу',
    en: 'Weighed in front of you, and rounded in your favour',
    ar: 'نزن أمامك ونقرّب الوزن لصالحك',
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
  channels: { whatsapp: '+996555430770' },
  mapProvider: 'twogis' as const,
  // Goods, a basket and a till. No readers and no favourites: a butcher's shop is not a feed, and
  // the entity switches are answered one at a time — never by a kind of business.
  features: { goods: true, cart: true, payments: true },
  fulfilments: ['pickup' as const, 'delivery' as const],
  // «We round in your favour» is printed on the page above, so the setting has to say the same
  // thing: an overweight is the shop's gift, not a second request for money.
  correction: 'favour' as const,
  // A butcher can always cut another kilo off the carcass, so the basket may ask for more than the
  // counter holds — and the ORDER becomes an estimate the shop prices itself.
  shortage: 'request' as const,
  /*
   * No page behind a card, and that is the shop speaking.
   *
   * A kilo of stewing beef has nothing to say past its name, its picture and its price, and the card
   * carries all three. The page would repeat them and charge a page load for it. The shelves keep
   * their own addresses — a shelf is worth standing in front of — and only the leaf stops existing.
   */
  productPages: false,
  payment: {
    label: 'MBank',
    merchant: 'ОсОО Khalif',
    city: 'Бишкек',
    country: 'KG',
    // ISO 4217 numeric for KGS; 5422 is the merchant category for butchers and meat markets.
    currency: '417',
    mcc: '5422',
    account: '9876543210987654',
    scheme: 'KG.DEMOBANK',
  },
  // The shop floor, like the market's — but burgundy against its green, so that two organizations
  // are visibly two and not one shop's second shelf.
  theme: {
    look: 'retail' as const,
    font: 'modern' as const,
    accent: '#8f2f3a',
    radius: 'sm' as const,
    register: 'light' as const,
  },
}
