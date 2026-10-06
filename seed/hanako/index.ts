export * from './catalog'

/*
 * The shape of `hanako/fitment.json` — the vehicle tree this importer answers about.
 *
 * `levels` names the levels and its LENGTH is the depth; a branch is free to stop short of it, and
 * half the models here do — a model that is not split by generation simply has no children, which is
 * the ordinary case rather than missing data.
 */
export interface FitmentNodeSeed {
  slug: string
  label: Record<string, string>
  children?: FitmentNodeSeed[]
}

export interface FitmentTree {
  slug: string
  name: Record<string, string>
  levels: Record<string, string>[]
  nodes: FitmentNodeSeed[]
}
export * from './pages'
export * from './places'

export const HANAKO_ORG = {
  name: 'HANAKO',
  slug: 'demo1',
  defaultLocale: 'ru',
  locales: ['ru', 'ky', 'en', 'ar'],
  tagline: {
    ru: 'Высокотехнологичные моторные, трансмиссионные масла и технические жидкости для современного автопарка.',
    ky: 'Заманбап автопарк үчүн жогорку технологиялуу мотор, трансмиссия майлары жана техникалык суюктуктар.',
    en: 'High-tech engine and transmission oils, and technical fluids for modern vehicles.',
    ar: 'زيوت محركات وناقل حركة وسوائل فنية عالية التقنية للسيارات الحديثة.',
  },
  about: {
    ru: 'Чтобы получить помощь по подбору масла, допускам или гарантии, свяжитесь с официальным импортером продукции HANAKO в Кыргызской Республике. Режим работы: понедельник — пятница, с 09:00 до 18:00.',
    ky: 'Май тандоо, уруксаттар же кепилдик боюнча жардам алуу үчүн Кыргыз Республикасындагы HANAKO продукциясынын расмий импорттоочусуна кайрылыңыз. Иштөө убактысы: дүйшөмбү — жума, саат 09:00дөн 18:00гө чейин.',
    en: 'For assistance with oil selection, approvals, or warranty, contact the official importer of HANAKO products in the Kyrgyz Republic. Working hours: Monday — Friday, 09:00 to 18:00.',
    ar: 'للحصول على مساعدة في اختيار الزيت أو الموافقات أو الضمان، اتصل بالمستورد الرسمي لمنتجات HANAKO في الجمهورية القيرغيزية. ساعات العمل: من الإثنين إلى الجمعة، من 09:00 إلى 18:00.',
  },
  channels: { whatsapp: '996700000000' },
  theme: {
    look: 'showcase' as const,
    font: 'modern' as const,
    accent: '#ff2e17',
    radius: 'sm' as const,
  },
  mapProvider: 'twogis' as const,
}

/*
 * What an invoice and a delivery note print about the importer, and the account a dealer pays into.
 *
 * Absent until an organization bought from this one: a catalogue without a till needs neither, and
 * a sale between two businesses cannot do without either.
 */
export const HANAKO_LEGAL = {
  taxId: 'ИНН 01208201510347',
  address: 'Кыргызская Республика, г. Бишкек, ул. Промышленная, 14',
  bank: 'ОАО «Демо Банк», БИК 109018, р/с 1090180000412766',
}

export const HANAKO_PAYMENT = {
  label: 'Демо Банк, расчётный счёт',
  merchant: 'ОсОО Ханако Ойл',
  city: 'Бишкек',
  country: 'KG',
  currency: '417',
  // 5172 is the merchant category for petroleum products.
  mcc: '5172',
  account: '1090180000412766',
  scheme: 'KG.DEMOBANK',
}

/*
 * The importer's trade agent, and the dealers he walks.
 *
 * The dealers are organizations with NO SITE: a tyre shop and an oil counter buy, they publish
 * nothing, and the platform has no opinion about that — an organization is free to have none. They
 * exist as legal entities so that a deferral can be written on their card: terms are given to a
 * business, never to a person with a telephone.
 */
export const HANAKO_AGENT = {
  login: 'hanako-agent',
  name: 'Эрмек Жумалиев',
  title: { ru: 'Торговый агент', ky: 'Соода агенти', en: 'Sales agent', ar: 'مندوب مبيعات' },
  rewardKind: 'percent' as const,
  rewardValue: 3,
}

export const HANAKO_DEALERS = [
  {
    name: 'Автомасла на Кулатова',
    person: 'Нурбек Асанов',
    email: 'nurbek@avtomasla-kulatova.kg',
    taxId: 'ИНН 01403201910284',
    address: 'г. Бишкек, ул. Кулатова, 8/3',
  },
  {
    name: 'СТО Форсаж',
    person: 'Виктор Ли',
    email: 'victor@forsazh-sto.kg',
    taxId: 'ИНН 02211201710093',
    address: 'г. Бишкек, ул. Льва Толстого, 36',
  },
  {
    name: 'Автолайн Ош',
    person: 'Жоомарт Ташполотов',
    email: 'joomart@avtoline-osh.kg',
    taxId: 'ИНН 00907202010317',
    address: 'г. Ош, ул. Навои, 52',
  },
  {
    name: 'Шиномонтаж 24',
    person: 'Азиз Маматкулов',
    email: 'aziz@shinomontazh24.kg',
    taxId: 'ИНН 01812202110158',
    address: 'г. Бишкек, ул. Жибек Жолу, 411',
  },
]
