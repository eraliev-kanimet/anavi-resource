import type { SeedPlace } from '../places'

export interface HanakoFaq {
  question: Record<string, string>
  answer: Record<string, string>
  sort: number
}

// The role stands in the NAME — "Bishkek: central distributor" — because a place has one name.
export const HANAKO_PLACES: SeedPlace[] = [
  {
    name: {
      ru: 'Бишкек — центральный дистрибьютор',
      ky: 'Бишкек — борбордук дистрибьютор',
      en: 'Bishkek: central distributor',
      ar: 'بيشكيك — الموزع المركزي',
    },
    address: {
      ru: 'ул. Промышленная, 14 · склад-магазин',
      ky: 'Промышленная көчөсү, 14 · кампа-дүкөн',
      en: '14 Promyshlennaya St · warehouse store',
      ar: 'شارع بروميشلينايا، 14 · متجر ومستودع',
    },
    phone: '+996 700 000 000',
    lat: 42.862,
    lng: 74.62,
    url: 'https://2gis.kg/bishkek/search/%D0%9F%D1%80%D0%BE%D0%BC%D1%8B%D1%88%D0%BB%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F',
  },
  {
    name: {
      ru: 'Ош — дистрибьютор',
      ky: 'Ош — дистрибьютор',
      en: 'Osh: distributor',
      ar: 'أوش — موزع',
    },
    address: {
      ru: 'пр. Масалиева, 3 · оптовый склад',
      ky: 'Масалиев проспекти, 3 · дүң кампа',
      en: '3 Masaliev Ave · wholesale warehouse',
      ar: 'شارع ماسالييف، 3 · مستودع جملة',
    },
    // Another city, not another door of the same room, so it answers its own line.
    phone: '+996 700 000 003',
    lat: 40.5283,
    lng: 72.7985,
    url: 'https://2gis.kg/osh/search/%D0%BF%D1%80.%20%D0%9C%D0%B0%D1%81%D0%B0%D0%BB%D0%B8%D0%B5%D0%B2%D0%B0%2C%203',
  },
  {
    name: {
      ru: 'Алматы — дистрибьютор',
      ky: 'Алматы — дистрибьютор',
      en: 'Almaty: distributor',
      ar: 'ألماتي — موزع',
    },
    address: {
      ru: 'пр. Райымбека, 208 · авторынок',
      ky: 'Райымбек проспекти, 208 · автобазар',
      en: '208 Raiymbek Ave · auto market',
      ar: 'شارع رايمبيك، 208 · سوق السيارات',
    },
    lat: 43.2775,
    lng: 76.885,
    url: 'https://2gis.kz/almaty/search/%D0%BF%D1%80.%20%D0%A0%D0%B0%D0%B9%D1%8B%D0%BC%D0%B1%D0%B5%D0%BA%D0%B0%2C%20208',
  },
  {
    name: {
      ru: 'Астана — дистрибьютор',
      ky: 'Астана — дистрибьютор',
      en: 'Astana: distributor',
      ar: 'أستانا — موزع',
    },
    address: {
      ru: 'ул. Кабанбай батыра, 51',
      ky: 'Кабанбай батыр көчөсү, 51',
      en: '51 Kabanbay Batyr St',
      ar: 'شارع قبانباي باتير، 51',
    },
    lat: 51.128,
    lng: 71.43,
    url: 'https://2gis.kz/astana/search/%D1%83%D0%BB.%20%D0%9A%D0%B0%D0%B1%D0%B0%D0%BD%D0%B1%D0%B0%D0%B9%20%D0%B1%D0%B0%D1%82%D1%8B%D1%80%D0%B0%2C%2051',
  },
  {
    name: {
      ru: 'Ташкент — дистрибьютор',
      ky: 'Ташкент — дистрибьютор',
      en: 'Tashkent: distributor',
      ar: 'طشقند — موزع',
    },
    address: {
      ru: 'ул. Амира Темура, 108',
      ky: 'Амир Темур көчөсү, 108',
      en: '108 Amir Temur St',
      ar: 'شارع أمير تيمور، 108',
    },
    lat: 41.33,
    lng: 69.285,
    url: 'https://2gis.uz/tashkent/search/%D1%83%D0%BB.%20%D0%90%D0%BC%D0%B8%D1%80%D0%B0%20%D0%A2%D0%B5%D0%BC%D1%83%D1%80%D0%B0%2C%20108',
  },
  {
    name: {
      ru: 'Москва — партнёр',
      ky: 'Москва — өнөктөш',
      en: 'Moscow: partner',
      ar: 'موسكو — شريك',
    },
    address: {
      ru: 'МКАД 41 км, ТК «Мега-Ойл»',
      ky: 'МКАД 41 км, «Мега-Ойл» соода борбору',
      en: 'MKAD 41 km, Mega-Oil Shopping Center',
      ar: 'طريق موسكو الدائري كم 41، مركز تسوق «ميجا-أويل»',
    },
    lat: 55.83,
    lng: 37.42,
    url: 'https://2gis.ru/moscow/search/%D0%9C%D0%9A%D0%90%D0%94%2041%20%D0%BA%D0%BC',
  },
]

export const HANAKO_FAQS: HanakoFaq[] = [
  {
    question: {
      ru: 'Как выбрать масло для моего автомобиля?',
      ky: 'Унаама кандай май тандашым керек?',
      en: 'How to choose oil for my car?',
      ar: 'كيف أختار الزيت المناسب لسيارتي؟',
    },
    answer: {
      ru: 'Ориентируйтесь на рекомендации производителя: вязкость (например 5W-40) и допуск (API, ILSAC). Если сомневаетесь — напишите нам марку и год авто в WhatsApp, подберем точный аналог из линейки HANAKO.',
      ky: 'Өндүрүүчүнүн сунуштарына таяныңыз: илешкектик (мисалы, 5W-40) жана уруксат (API, ILSAC). Күмөн санасаңыз — WhatsApp аркылуу унаанын маркасын жана жылын жазыңыз, HANAKO линиясынан так аналогун тандап беребиз.',
      en: 'Follow manufacturer recommendations: viscosity (such as 5W-40) and approvals (API, ILSAC). If in doubt, send us your car make and model year on WhatsApp, and we will select the exact match from the HANAKO lineup.',
      ar: 'اعتمد على توصيات الشركة المصنعة: اللزوجة (مثل 5W-40) والموافقات (API، ILSAC). إذا كنت في شك، راسلنا عبر WhatsApp مع تحديد نوع وسنة تصنيع السيارة، وسنختار المطابق تمامًا من مجموعة HANAKO.',
    },
    sort: 1,
  },
  {
    question: {
      ru: 'Подходит ли продукция HANAKO для гибридов?',
      ky: 'HANAKO продукциясы гибриддерге ылайыктуубу?',
      en: 'Is HANAKO suitable for hybrid vehicles?',
      ar: 'هل منتجات HANAKO مناسبة للسيارات الهجينة؟',
    },
    answer: {
      ru: 'Да. Для гибридных силовых установок предназначены серии HANAKO Hybrid 0W-16 и Syn Pro 0W-20 — маловязкие синтетические масла с пониженным расходом топлива.',
      ky: 'Ооба. Гибриддик кыймылдаткычтар үчүн HANAKO Hybrid 0W-16 жана Syn Pro 0W-20 сериялары арналган — күйүүчү майдын чыгымын азайткан аз илешкектүү синтетикалык майлар.',
      en: 'Yes. The HANAKO Hybrid 0W-16 and Syn Pro 0W-20 series are designed for hybrid powertrains — low-viscosity synthetic oils engineered for reduced fuel consumption.',
      ar: 'نعم. تم تصميم سلسلتي HANAKO Hybrid 0W-16 و Syn Pro 0W-20 للمحركات الهجينة — وهي زيوت تخليقية منخفضة اللزوجة مصممة لتقليل استهلاك الوقود.',
    },
    sort: 2,
  },
  {
    question: {
      ru: 'Есть ли сертификаты и допуски?',
      ky: 'Сертификаттар жана уруксаттар барбы?',
      en: 'Are there certificates and approvals?',
      ar: 'هل توجد شهادات وموافقات؟',
    },
    answer: {
      ru: 'Вся продукция соответствует международным стандартам API, ILSAC и API GL-5 для трансмиссионных масел. Копии сертификатов предоставляем по запросу.',
      ky: 'Бардык продукция эл аралык API, ILSAC стандарттарына, ал эми трансмиссия майлары API GL-5 стандартына жооп берет. Сертификаттардын көчүрмөлөрүн суроо боюнча беребиз.',
      en: 'All products meet international API and ILSAC standards, as well as API GL-5 for transmission oils. Copies of certificates are provided upon request.',
      ar: 'تتوافق جميع المنتجات مع معايير API وILSAC الدولية، بالإضافة إلى API GL-5 لزيوت ناقل الحركة. نقدم نسخًا من الشهادات عند الطلب.',
    },
    sort: 3,
  },
  {
    question: {
      ru: 'Как оформить оптовый заказ?',
      ky: 'Дүң заказды кантип берүү керек?',
      en: 'How to place a wholesale order?',
      ar: 'كيف أطلب طلبية بالجملة؟',
    },
    answer: {
      ru: 'Опт от 1 паллеты. Напишите в WhatsApp перечень позиций и объем — подготовим коммерческое предложение и условия доставки.',
      ky: 'Дүң сатуу 1 паллетадан башталат. WhatsApp аркылуу позициялардын тизмесин жана көлөмүн жазыңыз — коммерциялык сунушту жана жеткирүү шарттарын даярдайбыз.',
      en: 'Wholesale starts from 1 pallet. Send your list of items and quantities on WhatsApp — we will prepare a commercial proposal and delivery terms.',
      ar: 'تبدأ مبيعات الجملة من منصة نقالة واحدة (طبلية). أرسل قائمة المنتجات والكميات عبر WhatsApp — سنقوم بإعداد عرض تجاري وشروط التوصيل.',
    },
    sort: 4,
  },
  {
    question: {
      ru: 'Осуществляете ли вы доставку?',
      ky: 'Жеткирүү кызматыңыз барбы?',
      en: 'Do you offer delivery?',
      ar: 'هل توفرون خدمة التوصيل؟',
    },
    answer: {
      ru: 'Да, доставляем по Центральной Азии через сеть официальных дистрибьюторов в 6 городах. Сроки и стоимость зависят от региона и объема заказа.',
      ky: 'Ооба, 6 шаардагы расмий дистрибьюторлор тармагы аркылуу Борбордук Азия боюнча жеткиребиз. Мөөнөттөр жана баасы аймакка жана заказдын көлөмүнө жараша болот.',
      en: 'Yes, we deliver across Central Asia through an official distributor network in 6 cities. Delivery time and cost depend on the region and order volume.',
      ar: 'نعم، نقوم بالتوصيل في جميع أنحاء آسيا الوسطى من خلال شبكة موزعين رسميين في 6 مدن. تعتمد المواعيد والتكلفة على المنطقة وحجم الطلب.',
    },
    sort: 5,
  },
]
