// Structure only — nothing is written to the database here.

export interface HanakoCategory {
  slug: string
  sort: number
  name: Record<string, string>
}

export interface HanakoPackage {
  volume: string
  image: string
}

export interface HanakoTag {
  group: 'viscosity' | 'approval'
  value: string
}

export interface HanakoProduct {
  slug: string
  category: string
  sort: number
  /*
   * The ladder this position is sold by, in pieces — an importer sells canisters by the box, not by
   * the seven.
   *
   * Absent is the ordinary case and means «one at a time». Present, it is the two halves of one
   * sentence: `lot` is the smallest shipment and `box` how far apart the ones after it stand. Engine
   * oil goes out by the box of twelve from one box up; transmission fluid moves slowly enough that
   * the shop will not open the pallet for less than two.
   */
  lot?: number
  box?: number
  name: string
  summary: Record<string, string>
  description: Record<string, string>
  specs: string[]
  tags: HanakoTag[]
  packages: HanakoPackage[]
  datasheet: string | null
}

export const HANAKO_CATEGORIES: HanakoCategory[] = [
  {
    slug: 'motornye-masla',
    sort: 1,
    name: {
      ru: 'Моторные масла',
      ky: 'Мотор майлары',
      en: 'Motor oils',
      ar: 'زيوت المحركات',
    },
  },
  {
    slug: 'transmissionnye-masla',
    sort: 2,
    name: {
      ru: 'Трансмиссионные масла для автоматических КПП',
      ky: 'Автоматтык КПП үчүн трансмиссия майлары',
      en: 'Transmission oils for automatic transmissions',
      ar: 'زيوت ناقل الحركة لناقلات الحركة الأوتوماتيكية',
    },
  },
]

export const HANAKO_PRODUCTS: HanakoProduct[] = [
  {
    slug: 'hybrid-0w-20',
    lot: 12,
    box: 12,
    category: 'motornye-masla',
    sort: 1,
    name: 'HANAKO HYBRID MOTOR OIL SP/GF-6 0W-20',
    summary: {
      ru: 'HANAKO HYBRID MOTOR OIL SP/GF-6 0W-20 — моторное масло разработано с учетом самых современных технологий, обеспечивая надежную защиту и высокую производительность для бензиновых и дизельных двигателей.',
      ky: 'HANAKO MOTOR OIL HYBRID SP/GF-6 0W-20 мотордуу майы азыркы учурдагы технологияларды эске алуу менен иштелип чыккан, бензиндик жана дизелдик кыймылдаткычтар үчүн ишенимдүү коргоону жана жогорку өндүрүм',
      en: 'HANAKO HYBRID MOTOR OIL SP/GF-6 0W-20 is an engine oil engineered with cutting-edge technology, providing reliable protection and high performance for gasoline and diesel engines.',
      ar: 'HANAKO HYBRID MOTOR OIL SP/GF-6 0W-20 هو زيت محرك تم تطويره بأحدث التقنيات، مما يوفر حماية موثوقة وأداءً عاليًا لمحركات البنزين والديزل.',
    },
    description: {
      ru: 'HANAKO HYBRID MOTOR OIL SP/GF-6 0W-20 — моторное масло разработано с учетом самых современных технологий, обеспечивая надежную защиту и высокую производительность для бензиновых и дизельных двигателей. Масло адаптировано для двигателей, оснащенных турбонаддувом и системами непосредственного впрыска, отвечая всем требованиям современных производителей автомобилей. Благодаря своим высоким эксплуатационным свойствам данное масло гарантирует отличную стабильность при высоких температурах, защиту от износа и окисления, что продлевает срок службы двигателя и делает его отличным выбором для использования в любых климатических условиях.',
      ky: 'HANAKO MOTOR OIL HYBRID SP/GF-6 0W-20 мотордуу майы азыркы учурдагы технологияларды эске алуу менен иштелип чыккан, бензиндик жана дизелдик кыймылдаткычтар үчүн ишенимдүү коргоону жана жогорку өндүрүмдүүлүктү камсыз кылат. Май турбо заряддоо жана түз инжектордук (жиберүү) системалар менен жабдылган кыймылдаткычтарга ылайыкташтырылган, жана азыркы учурдагы автомобиль жасоочулардын бардык талаптарына жооп берет. Бул мотор майы өзүнүн жогорку эффективдүү касиеттеринин аркасында жогорку температурада эң мыкты туруктуулукту, эскирүүдөн жана кычкылдануудан коргоону кепилдейт жана кыймылдаткычтын иштөө мөөнөтүн узартат, бул аны ар кандай климаттык шарттарда колдонуу үчүн сонун тандоо болуп саналат.',
      en: 'HANAKO HYBRID MOTOR OIL SP/GF-6 0W-20 is an engine oil engineered with advanced technology, providing reliable protection and high performance for gasoline and diesel engines. The oil is adapted for engines equipped with turbocharging and direct injection systems, meeting all requirements of modern vehicle manufacturers. Due to its high performance properties, this oil ensures excellent high-temperature stability, wear and oxidation protection, extending engine life and making it an excellent choice for use in all climate conditions.',
      ar: 'HANAKO HYBRID MOTOR OIL SP/GF-6 0W-20 هو زيت محرك تم تطويره بأحدث التقنيات، مما يوفر حماية موثوقة وأداءً عاليًا لمحركات البنزين والديزل. الزيت مصمم للمحركات المزودة بشواحن توربينية وأنظمة الحقن المباشر، بما يلبي جميع متطلبات الشركات المصنعة للسيارات الحديثة. بفضل خصائصه التشغيلية العالية، يضمن هذا الزيت استقرارًا ممتازًا في درجات الحرارة العالية، وحماية من التآكل والأكسدة، مما يطيل عمر المحرك ويجعله خيارًا ممتازًا للاستخدام في جميع الظروف المناخية.',
    },
    specs: ['API SP/SN', 'ILSAC GF-6', 'Chrysler MS-6395*', 'Ford WSS-M2C960-A1*'],
    tags: [
      {
        group: 'viscosity',
        value: '0W-20',
      },
      {
        group: 'approval',
        value: 'API SP/SN',
      },
      {
        group: 'approval',
        value: 'ILSAC GF-6',
      },
      {
        group: 'approval',
        value: 'Chrysler MS-6395*',
      },
      {
        group: 'approval',
        value: 'Ford WSS-M2C960-A1*',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: 'hybrid-0w-20-4l.png',
      },
      {
        volume: '1 л',
        image: 'hybrid-0w-20-1l.png',
      },
    ],
    datasheet: 'example.pdf',
  },
  {
    slug: '5w-30-sp-cf',
    lot: 12,
    box: 12,
    category: 'motornye-masla',
    sort: 2,
    name: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC',
    summary: {
      ru: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC идеально подходит для современных автомобилей с бензиновыми двигателями с турбонаддувом и без него, с непосредственным впрыском и многоступенчатыми системам',
      ky: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC — турбо үйлөгүчтүү жана турбо үйлөгүчсүз бензин кыймылдаткычтары бар заманбап автоунаалар үчүн эң ылайыктуу, түз чачыратуу системасы жана зыяндуу газдардын',
      en: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC is ideal for modern cars with turbocharged and naturally aspirated gasoline engines, direct injection, and multi-stage emission control systems.',
      ar: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC مثالي للسيارات الحديثة المزودة بمحركات بنزين بشواحن توربينية وبدونها، مع حقن مباشر وأنظمة متطورة لتقليل انبعاثات العادم.',
    },
    description: {
      ru: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC идеально подходит для современных автомобилей с бензиновыми двигателями с турбонаддувом и без него, с непосредственным впрыском и многоступенчатыми системами снижения токсичности отработавших газов. Эксплуатационные и экологические характеристики продукта превосходят большинство требований японских, европейских и американских автопроизводителей и отвечают стандартам: API, ACEA, MERCEDES-BENZ, BMW и VW. Предназначено для всесезонного применения. Подходит для всех двигателей, работающих в тяжелых, экстремальных, спортивных режимах.',
      ky: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC — турбо үйлөгүчтүү жана турбо үйлөгүчсүз бензин кыймылдаткычтары бар заманбап автоунаалар үчүн эң ылайыктуу, түз чачыратуу системасы жана зыяндуу газдардын бөлүнүп чыгышын азайтуучу көп баскычтуу системалар менен жабдылган кыймылдаткычтарга арналган 100% синтетикалык мотор майы. Продукттун эксплуатациялык жана экологиялык мүнөздөмөлөрү көпчүлүк япон, европалык жана америкалык автоөндүрүүчүлөрдүн талаптарына жооп берет жана төмөнкү стандарттарга ылайык келет: API, ACEA, Mercedes-Benz, BMW жана VW. Бардык мезгилде колдонууга ылайыкталган. Оор жүктөмдө, экстремалдуу жана спорттук режимдерде иштеген кыймылдаткычтар үчүн сунушталат.',
      en: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC is ideal for modern vehicles with turbocharged and naturally aspirated gasoline engines, direct injection, and multi-stage emission control systems. The operational and environmental performance of the product exceeds most requirements of Japanese, European, and American automakers, meeting API, ACEA, MERCEDES-BENZ, BMW, and VW standards. Designed for all-season use. Suitable for all engines operating in heavy, extreme, and motorsport conditions.',
      ar: 'HANAKO MOTOR OIL 5W-30 SP/CF 100% SYNTHETIC مثالي للسيارات الحديثة المزودة بمحركات بنزين بشواحن توربينية وبدونها، وحقن مباشر، وأنظمة متعددة المراحل لتقليل انبعاثات العادم. تتفوق الخصائص التشغيلية والبيئية للمنتج على معظم متطلبات شركات تصنيع السيارات اليابانية والأوروبية والأمريكية، وتلبي معايير API وACEA وMERCEDES-BENZ وBMW وVW. مصمم للاستخدام في جميع الفصول. مناسب لجميع المحركات التي تعمل في الظروف الشاقة والقاسية والرياضية.',
    },
    specs: [
      'SAE 5W-30',
      'API SP/CF',
      'ACEA A3/B4',
      'BMW LONGLIFE-04',
      'MB 229.31/229.51',
      'VW 502.00/505.00',
    ],
    tags: [
      {
        group: 'viscosity',
        value: '5W-30',
      },
      {
        group: 'approval',
        value: 'API SP/CF',
      },
      {
        group: 'approval',
        value: 'ACEA A3/B4',
      },
      {
        group: 'approval',
        value: 'BMW LONGLIFE-04',
      },
      {
        group: 'approval',
        value: 'MB 229.31/229.51',
      },
      {
        group: 'approval',
        value: 'VW 502.00/505.00',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: '5w-30-sp-cf-4l.png',
      },
      {
        volume: '1 л',
        image: '5w-30-sp-cf-1l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: '5w-40-sp-cf',
    lot: 12,
    box: 12,
    category: 'motornye-masla',
    sort: 3,
    name: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC',
    summary: {
      ru: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC идеально подходит для современных автомобилей с бензиновыми двигателями с турбонаддувом и без него, с непосредственным впрыском и многоступенчатыми системам',
      ky: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC — турбо үйлөгүчтүү жана турбо үйлөгүчсүз бензин кыймылдаткычтары бар заманбап автоунаалар үчүн эң ылайыктуу, түз чачыратуу системасы жана зыяндуу газдардын',
      en: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC is ideal for modern cars with turbocharged and naturally aspirated gasoline engines, direct injection, and multi-stage emission control systems.',
      ar: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC مثالي للسيارات الحديثة المزودة بمحركات بنزين بشواحن توربينية وبدونها، مع حقن مباشر وأنظمة متطورة لتقليل انبعاثات العادم.',
    },
    description: {
      ru: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC идеально подходит для современных автомобилей с бензиновыми двигателями с турбонаддувом и без него, с непосредственным впрыском и многоступенчатыми системами снижения токсичности отработавших газов. Эксплуатационные и экологические характеристики продукта превосходят большинство требований японских, европейских и американских автопроизводителей и отвечают стандартам: API, ACEA, MERCEDES-BENZ, BMW и VW. Предназначено для всесезонного применения. Подходит для всех двигателей, работающих в тяжелых, экстремальных, спортивных режимах.',
      ky: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC — турбо үйлөгүчтүү жана турбо үйлөгүчсүз бензин кыймылдаткычтары бар заманбап автоунаалар үчүн эң ылайыктуу, түз чачыратуу системасы жана зыяндуу газдардын бөлүнүп чыгышын азайтуучу көп баскычтуу системалар менен жабдылган кыймылдаткычтарга арналган 100% синтетикалык мотор майы. Продукттун эксплуатациялык жана экологиялык мүнөздөмөлөрү көпчүлүк япон, европалык жана америкалык автоөндүрүүчүлөрдүн талаптарына жооп берет жана төмөнкү стандарттарга ылайык келет: API, ACEA, Mercedes-Benz, BMW жана VW. Бардык мезгилде колдонууга ылайыкталган. Оор жүктөмдө, экстремалдуу жана спорттук режимдерде иштеген кыймылдаткычтар үчүн сунушталат.',
      en: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC is ideal for modern vehicles with turbocharged and naturally aspirated gasoline engines, direct injection, and multi-stage emission control systems. The operational and environmental performance of the product exceeds most requirements of Japanese, European, and American automakers, meeting API, ACEA, MERCEDES-BENZ, BMW, and VW standards. Designed for all-season use. Suitable for all engines operating in heavy, extreme, and motorsport conditions.',
      ar: 'HANAKO MOTOR OIL 5W-40 SP/CF 100% SYNTHETIC مثالي للسيارات الحديثة المزودة بمحركات بنزين بشواحن توربينية وبدونها، وحقن مباشر، وأنظمة متعددة المراحل لتقليل انبعاثات العادم. تتفوق الخصائص التشغيلية والبيئية للمنتج على معظم متطلبات شركات تصنيع السيارات اليابانية والأوروبية والأمريكية، وتلبي معايير API وACEA وMERCEDES-BENZ وBMW وVW. مصمم للاستخدام في جميع الفصول. مناسب لجميع المحركات التي تعمل في الظروف الشاقة والقاسية والرياضية.',
    },
    specs: [
      'SAE 5W-40',
      'API SP/CF',
      'ACEA A3/B4',
      'BMW LONGLIFE-04',
      'MB 229.31/229.51',
      'VW 502.00/505.00',
    ],
    tags: [
      {
        group: 'viscosity',
        value: '5W-40',
      },
      {
        group: 'approval',
        value: 'API SP/CF',
      },
      {
        group: 'approval',
        value: 'ACEA A3/B4',
      },
      {
        group: 'approval',
        value: 'BMW LONGLIFE-04',
      },
      {
        group: 'approval',
        value: 'MB 229.31/229.51',
      },
      {
        group: 'approval',
        value: 'VW 502.00/505.00',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: '5w-40-sp-cf-4l.png',
      },
      {
        volume: '1 л',
        image: '5w-40-sp-cf-1l.png',
      },
      {
        volume: 'Бочка',
        image: 'barrel.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: '5w-40-sl-cf',
    lot: 12,
    box: 12,
    category: 'motornye-masla',
    sort: 4,
    name: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC',
    summary: {
      ru: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC идеально подходит для современных автомобилей с бензиновыми двигателями с турбонаддувом и без него, с непосредственным впрыском и многоступенчатыми системам',
      ky: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC — турбо үйлөгүчтүү жана турбо үйлөгүчсүз бензин кыймылдаткычтары бар заманбап автоунаалар үчүн эң ылайыктуу, түз чачыратуу системасы жана зыяндуу газдардын',
      en: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC is ideal for modern cars with turbocharged and naturally aspirated gasoline engines, direct injection, and multi-stage emission control systems.',
      ar: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC مثالي للسيارات الحديثة المزودة بمحركات بنزين بشواحن توربينية وبدونها، مع حقن مباشر وأنظمة متطورة لتقليل انبعاثات العادم.',
    },
    description: {
      ru: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC идеально подходит для современных автомобилей с бензиновыми двигателями с турбонаддувом и без него, с непосредственным впрыском и многоступенчатыми системами снижения токсичности отработавших газов. Эксплуатационные и экологические характеристики продукта превосходят большинство требований японских, европейских и американских автопроизводителей и отвечают стандартам: API, ACEA, MERCEDES-BENZ, BMW и VW. Предназначено для всесезонного применения. Подходит для всех двигателей, работающих в тяжелых, экстремальных, спортивных режимах.',
      ky: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC — турбо үйлөгүчтүү жана турбо үйлөгүчсүз бензин кыймылдаткычтары бар заманбап автоунаалар үчүн эң ылайыктуу, түз чачыратуу системасы жана зыяндуу газдардын бөлүнүп чыгышын азайтуучу көп баскычтуу системалар менен жабдылган кыймылдаткычтарга арналган 100% синтетикалык мотор майы. Продукттун эксплуатациялык жана экологиялык мүнөздөмөлөрү көпчүлүк япон, европалык жана америкалык автоөндүрүүчүлөрдүн талаптарына жооп берет жана төмөнкү стандарттарга ылайык келет: API, ACEA, Mercedes-Benz, BMW жана VW. Бардык мезгилде колдонууга ылайыкталган. Оор жүктөмдө, экстремалдуу жана спорттук режимдерде иштеген кыймылдаткычтар үчүн сунушталат.',
      en: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC is ideal for modern vehicles with turbocharged and naturally aspirated gasoline engines, direct injection, and multi-stage emission control systems. The operational and environmental performance of the product exceeds most requirements of Japanese, European, and American automakers, meeting API, ACEA, MERCEDES-BENZ, BMW, and VW standards. Designed for all-season use. Suitable for all engines operating in heavy, extreme, and motorsport conditions.',
      ar: 'HANAKO MOTOR OIL 5W-40 SL/CF 100% SYNTHETIC مثالي للسيارات الحديثة المزودة بمحركات بنزين بشواحن توربينية وبدونها، وحقن مباشر، وأنظمة متعددة المراحل لتقليل انبعاثات العادم. تتفوق الخصائص التشغيلية والبيئية للمنتج على معظم متطلبات شركات تصنيع السيارات اليابانية والأوروبية والأمريكية، وتلبي معايير API وACEA وMERCEDES-BENZ وBMW وVW. مصمم للاستخدام في جميع الفصول. مناسب لجميع المحركات التي تعمل في الظروف الشاقة والقاسية والرياضية.',
    },
    specs: [
      'SAE 5W-40',
      'API SP',
      'ACEA A3/B4',
      'MB-Approval 226.5/229.5',
      'Renault RN 0700 / RN 0710',
      'VW 502.00/505.00',
      'BMW LL-01',
      'Porsche A40',
      'PSA B71 2296',
    ],
    tags: [
      {
        group: 'viscosity',
        value: '5W-40',
      },
      {
        group: 'approval',
        value: 'API SP',
      },
      {
        group: 'approval',
        value: 'ACEA A3/B4',
      },
      {
        group: 'approval',
        value: 'MB-Approval 226.5/229.5',
      },
      {
        group: 'approval',
        value: 'Renault RN 0700 / RN 0710',
      },
      {
        group: 'approval',
        value: 'VW 502.00/505.00',
      },
      {
        group: 'approval',
        value: 'BMW LL-01',
      },
      {
        group: 'approval',
        value: 'Porsche A40',
      },
      {
        group: 'approval',
        value: 'PSA B71 2296',
      },
    ],
    packages: [
      {
        volume: 'Бочка',
        image: 'barrel.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: '5w-30-jp',
    lot: 12,
    box: 12,
    category: 'motornye-masla',
    sort: 5,
    name: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC',
    summary: {
      ru: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC — моторное масло разработано с учетом самых современных технологий, обеспечивая надежную защиту и высокую производительность для бензиновых и дизельных двигателей.',
      ky: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC мотордуу майы азыркы учурдагы технологияларды эске алуу менен иштелип чыккан, бензиндик жана дизелдик кыймылдаткычтар үчүн ишенимдүү коргоону жан',
      en: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC is an engine oil engineered with cutting-edge technology, providing reliable protection and high performance for gasoline and diesel engines.',
      ar: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC هو زيت محرك تم تطويره بأحدث التقنيات، مما يوفر حماية موثوقة وأداءً عاليًا لمحركات البنزين والديزل.',
    },
    description: {
      ru: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC — моторное масло разработано с учетом самых современных технологий, обеспечивая надежную защиту и высокую производительность для бензиновых и дизельных двигателей. Масло адаптировано для двигателей, оснащенных турбонаддувом и системами непосредственного впрыска, отвечая всем требованиям современных производителей автомобилей. Благодаря своим высоким эксплуатационным свойствам данное масло гарантирует отличную стабильность при высоких температурах, защиту от износа и окисления, что продлевает срок службы двигателя и делает его отличным выбором для использования в любых климатических условиях.',
      ky: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC мотордуу майы азыркы учурдагы технологияларды эске алуу менен иштелип чыккан, бензиндик жана дизелдик кыймылдаткычтар үчүн ишенимдүү коргоону жана жогорку өндүрүмдүүлүктү камсыз кылат. Май турбо заряддоо жана түз инжектордук (жиберүү) системалар менен жабдылган кыймылдаткычтарга ылайыкташтырылган, жана азыркы учурдагы автомобиль жасоочулардын бардык талаптарына жооп берет. Бул мотор майы өзүнүн жогорку эффективдүү касиеттеринин аркасында жогорку температурада эң мыкты туруктуулукту, эскирүүдөн жана кычкылдануудан коргоону кепилдейт жана кыймылдаткычтын иштөө мөөнөтүн узартат, бул аны ар кандай климаттык шарттарда колдонуу үчүн сонун тандоо болуп саналат.',
      en: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC is an engine oil engineered with advanced technology, providing reliable protection and high performance for gasoline and diesel engines. The oil is adapted for engines equipped with turbocharging and direct injection systems, meeting all requirements of modern vehicle manufacturers. Due to its high performance properties, this oil ensures excellent high-temperature stability, wear and oxidation protection, extending engine life and making it an excellent choice for use in all climate conditions.',
      ar: 'HANAKO MOTOR OIL 5W-30 JP SP ILSAC GF-6 100% SYNTHETIC هو زيت محرك تم تطويره بأحدث التقنيات، مما يوفر حماية موثوقة وأداءً عاليًا لمحركات البنزين والديزل. الزيت مصمم للمحركات المزودة بشواحن توربينية وأنظمة الحقن المباشر، بما يلبي جميع متطلبات الشركات المصنعة للسيارات الحديثة. بفضل خصائصه التشغيلية العالية، يضمن هذا الزيت استقرارًا ممتازًا في درجات الحرارة العالية، وحماية من التآكل والأكسدة، مما يطيل عمر المحرك ويجعله خيارًا ممتازًا للاستخدام في جميع الظروف المناخية.',
    },
    specs: ['SAE 5W-30', 'API SP', 'ILSAC GF-6A'],
    tags: [
      {
        group: 'viscosity',
        value: '5W-30',
      },
      {
        group: 'approval',
        value: 'API SP',
      },
      {
        group: 'approval',
        value: 'ILSAC GF-6A',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: '5w-30-jp-4l.png',
      },
      {
        volume: '1 л',
        image: '5w-30-jp-1l.png',
      },
      {
        volume: 'Бочка',
        image: 'barrel.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: '10w-40-sp',
    lot: 12,
    box: 12,
    category: 'motornye-masla',
    sort: 6,
    name: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40',
    summary: {
      ru: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 — моторное масло разработано с учетом самых современных технологий, обеспечивая надежную защиту и высокую производительность для бензиновых и дизельных двигателей.',
      ky: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 мотордуу майы азыркы учурдагы технологияларды эске алуу менен иштелип чыккан, бензиндик жана дизелдик кыймылдаткычтар үчүн ишенимдүү коргоону жана жогорку өндүрүмдүүлүктү камсыз кылат.',
      en: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 is an engine oil engineered with cutting-edge technology, providing reliable protection and high performance for gasoline and diesel engines.',
      ar: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 هو زيت محرك تم تطويره بأحدث التقنيات، مما يوفر حماية موثوقة وأداءً عاليًا لمحركات البنزين والديزل.',
    },
    description: {
      ru: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 — моторное масло разработано с учетом самых современных технологий, обеспечивая надежную защиту и высокую производительность для бензиновых и дизельных двигателей. Масло адаптировано для двигателей, оснащенных турбонаддувом и системами непосредственного впрыска, отвечая всем требованиям современных производителей автомобилей. Благодаря своим высоким эксплуатационным свойствам данное масло гарантирует отличную стабильность при высоких температурах, защиту от износа и окисления, что продлевает срок службы двигателя и делает его отличным выбором для использования в любых климатических условиях.',
      ky: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 мотордуу майы азыркы учурдагы технологияларды эске алуу менен иштелип чыккан, бензиндик жана дизелдик кыймылдаткычтар үчүн ишенимдүү коргоону жана жогорку өндүрүмдүүлүктү камсыз кылат. Май турбо заряддоо жана түз инжектордук (жиберүү) системалар менен жабдылган кыймылдаткычтарга ылайыкташтырылган, жана азыркы учурдагы автомобиль жасоочулардын бардык талаптарына жооп берет. Бул мотор майы өзүнүн жогорку эффективдүү касиеттеринин аркасында жогорку температурада эң мыкты туруктуулукту, эскирүүдөн жана кычкылдануудан коргоону кепилдейт жана кыймылдаткычтын иштөө мөөнөтүн узартат, бул аны ар кандай климаттык шарттарда колдонуу үчүн сонун тандоо болуп саналат.',
      en: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 is an engine oil engineered with advanced technology, providing reliable protection and high performance for gasoline and diesel engines. The oil is adapted for engines equipped with turbocharging and direct injection systems, meeting all requirements of modern vehicle manufacturers. Due to its high performance properties, this oil ensures excellent high-temperature stability, wear and oxidation protection, extending engine life and making it an excellent choice for use in all climate conditions.',
      ar: 'HANAKO MOTOR OIL SP SYNTHETIC 10W-40 هو زيت محرك تم تطويره بأحدث التقنيات، مما يوفر حماية موثوقة وأداءً عاليًا لمحركات البنزين والديزل. الزيت مصمم للمحركات المزودة بشواحن توربينية وأنظمة الحقن المباشر، بما يلبي جميع متطلبات الشركات المصنعة للسيارات الحديثة. بفضل خصائصه التشغيلية العالية، يضمن هذا الزيت استقرارًا ممتازًا في درجات الحرارة العالية، وحماية من التآكل والأكسدة، مما يطيل عمر المحرك ويجعله خيارًا ممتازًا للاستخدام في جميع الظروف المناخية.',
    },
    specs: [
      'SAE 10W-40',
      'ACEA A3/B3, A3/B4',
      'API SP/CF',
      'MB 229.1/229.3',
      'BMW',
      'Renault RN 0700 / RN 0710',
      'VW 501 01 / 505 00',
    ],
    tags: [
      {
        group: 'viscosity',
        value: '10W-40',
      },
      {
        group: 'approval',
        value: 'ACEA A3/B3, A3/B4',
      },
      {
        group: 'approval',
        value: 'API SP/CF',
      },
      {
        group: 'approval',
        value: 'MB 229.1/229.3',
      },
      {
        group: 'approval',
        value: 'BMW',
      },
      {
        group: 'approval',
        value: 'Renault RN 0700 / RN 0710',
      },
      {
        group: 'approval',
        value: 'VW 501 01 / 505 00',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: '10w-40-sp-4l.png',
      },
      {
        volume: '1 л',
        image: '10w-40-sp-1l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: 'atf-type-t-iv',
    lot: 24,
    box: 12,
    category: 'transmissionnye-masla',
    sort: 7,
    name: 'HANAKO ATF TYPE T-IV SYNTHETIC BLENDED',
    summary: {
      ru: 'ATF TYPE T-IV SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий.',
      ky: 'ATF TYPE T-IV SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан.',
      en: 'ATF TYPE T-IV SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions.',
      ar: 'ATF TYPE T-IV SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة.',
    },
    description: {
      ru: 'ATF TYPE T-IV SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий. Изготовлено из синтетических базовых масел и тщательно подобранных присадок, что обеспечивает надежную защиту от износа, устойчивость к высокотемпературным нагрузкам и отличное смазывающее действие, обладает стабильными вязкостными характеристиками, что позволяет сохранять эффективность в любых климатических условиях. Соответствует всем стандартам производителей. Цвет жидкости: красный.',
      ky: 'ATF TYPE T-IV SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан. Ал синтетикалык базалык майлардан жана кылдаттык менен тандалган кошумчалардан жасалган, жана эскирүүдөн ишенимдүү коргоону, жогорку температуралык жүктөмдөргө туруктуулукту камсыз кылат жана мыкты майлоочу аракетти камсыз кылат, туруктуу илээшкектик өзгөчөлүктөрү бар, жана бул ар кандай климаттык шарттарда натыйжалуулукту сактоого мүмкүндүк берет. Ал бардык өндүрүүчүлөрдүн стандарттарына жооп берет. Суюктуктун түсү: Кызыл.',
      en: 'ATF TYPE T-IV SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions. Formulated from synthetic base oils and carefully selected additives, it provides dependable wear protection, resistance to high-temperature thermal stress, and excellent lubricating action. It maintains stable viscosity characteristics in all climate conditions. Meets all manufacturer standards. Fluid color: red.',
      ar: 'ATF TYPE T-IV SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة. مصنع من زيوت أساسية تخليقية وإضافات مختارة بعناية توفر حماية موثوقة ضد التآكل ومقاومة للإجهاد الحراري في درجات الحرارة العالية وأداء تزييت ممتاز. يحافظ على خصائص لزوجة مستقرة في جميع الظروف المناخية. يلبي جميع معايير الشركات المصنعة. لون السائل: أحمر.',
    },
    specs: [
      'ATF TYPE T-IV',
      'Aisin Warner JWS 3309 (T-IV)',
      'Allison C-3 & C-4',
      'Chrysler ATF+, +2, +3, +4',
      'Daihatsu Ammix ATF D3-SP',
      'Hyundai/Kia SP-III',
      'Mazda ATF M-III/M-V',
      'Mitsubishi Diaqueen SP-II/SP-III',
      'Nissan Matic C, D, J',
      'Subaru/Suzuki ATF',
      'Toyota DIII, TIII/T-IV',
      'ZF TE-ML 09, 11A, 11B',
    ],
    tags: [
      {
        group: 'viscosity',
        value: 'ATF T-IV',
      },
      {
        group: 'approval',
        value: 'ATF TYPE T-IV',
      },
      {
        group: 'approval',
        value: 'Aisin Warner JWS 3309 (T-IV)',
      },
      {
        group: 'approval',
        value: 'Allison C-3 & C-4',
      },
      {
        group: 'approval',
        value: 'Chrysler ATF+, +2, +3, +4',
      },
      {
        group: 'approval',
        value: 'Daihatsu Ammix ATF D3-SP',
      },
      {
        group: 'approval',
        value: 'Hyundai/Kia SP-III',
      },
      {
        group: 'approval',
        value: 'Mazda ATF M-III/M-V',
      },
      {
        group: 'approval',
        value: 'Mitsubishi Diaqueen SP-II/SP-III',
      },
      {
        group: 'approval',
        value: 'Nissan Matic C, D, J',
      },
      {
        group: 'approval',
        value: 'Subaru/Suzuki ATF',
      },
      {
        group: 'approval',
        value: 'Toyota DIII, TIII/T-IV',
      },
      {
        group: 'approval',
        value: 'ZF TE-ML 09, 11A, 11B',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: 'atf-type-t-iv-4l.png',
      },
      {
        volume: '1 л',
        image: 'atf-type-t-iv-1l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: 'atf-ws',
    lot: 24,
    box: 12,
    category: 'transmissionnye-masla',
    sort: 8,
    name: 'HANAKO ATF WS SYNTHETIC BLENDED',
    summary: {
      ru: 'HANAKO ATF WS SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий.',
      ky: 'HANAKO ATF WS SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан.',
      en: 'HANAKO ATF WS SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions.',
      ar: 'HANAKO ATF WS SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة.',
    },
    description: {
      ru: 'HANAKO ATF WS SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий. Изготовлено из синтетических базовых масел и тщательно подобранных присадок, что обеспечивает надежную защиту от износа, устойчивость к высокотемпературным нагрузкам и отличное смазывающее действие, обладает стабильными вязкостными характеристиками, что позволяет сохранять эффективность в любых климатических условиях. Соответствует всем стандартам производителей. Цвет жидкости: красный.',
      ky: 'HANAKO ATF WS SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан. Ал синтетикалык базалык майлардан жана кылдаттык менен тандалган кошумчалардан жасалган, жана эскирүүдөн ишенимдүү коргоону, жогорку температуралык жүктөмдөргө туруктуулукту камсыз кылат жана мыкты майлоочу аракетти камсыз кылат, туруктуу илээшкектик өзгөчөлүктөрү бар, жана бул ар кандай климаттык шарттарда натыйжалуулукту сактоого мүмкүндүк берет. Ал бардык өндүрүүчүлөрдүн стандарттарына жооп берет. Суюктуктун түсү: Кызыл.',
      en: 'HANAKO ATF WS SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions. Formulated from synthetic base oils and carefully selected additives, it provides dependable wear protection, resistance to high-temperature thermal stress, and excellent lubricating action. It maintains stable viscosity characteristics in all climate conditions. Meets all manufacturer standards. Fluid color: red.',
      ar: 'HANAKO ATF WS SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة. مصنع من زيوت أساسية تخليقية وإضافات مختارة بعناية توفر حماية موثوقة ضد التآكل ومقاومة للإجهاد الحراري في درجات الحرارة العالية وأداء تزييت ممتاز. يحافظ على خصائص لزوجة مستقرة في جميع الظروف المناخية. يلبي جميع معايير الشركات المصنعة. لون السائل: أحمر.',
    },
    specs: [
      'Ford Mercon® LV',
      'GM Dexron® VI',
      'JASO 1A, JASO 1A LV',
      'Toyota T, T II, T III, T IV, WS',
      'Nissan Matic D, J, S',
      'Mitsubishi SP II, IIM, III, PA, J3, SP IV',
      'Mazda ATF M-III, M-V, JWS 3317, FZ',
      'Subaru F6, Red 1',
      'Daihatsu AMMIX ATF D-III Multi, D3-SP',
      'Suzuki AT Oil 5D06, 2384K, JWS 3314, JWS 3317',
      'Hyundai/Kia SP III, SP IV',
      'Isuzu (where Toyota T-IV is required)',
      'Aisin Transmissions requiring JWS 3309',
      'Honda/Acura DW 1/Z 1',
    ],
    tags: [
      {
        group: 'viscosity',
        value: 'ATF WS',
      },
      {
        group: 'approval',
        value: 'Ford Mercon® LV',
      },
      {
        group: 'approval',
        value: 'GM Dexron® VI',
      },
      {
        group: 'approval',
        value: 'JASO 1A, JASO 1A LV',
      },
      {
        group: 'approval',
        value: 'Toyota T, T II, T III, T IV, WS',
      },
      {
        group: 'approval',
        value: 'Nissan Matic D, J, S',
      },
      {
        group: 'approval',
        value: 'Mitsubishi SP II, IIM, III, PA, J3, SP IV',
      },
      {
        group: 'approval',
        value: 'Mazda ATF M-III, M-V, JWS 3317, FZ',
      },
      {
        group: 'approval',
        value: 'Subaru F6, Red 1',
      },
      {
        group: 'approval',
        value: 'Daihatsu AMMIX ATF D-III Multi, D3-SP',
      },
      {
        group: 'approval',
        value: 'Suzuki AT Oil 5D06, 2384K, JWS 3314, JWS 3317',
      },
      {
        group: 'approval',
        value: 'Hyundai/Kia SP III, SP IV',
      },
      {
        group: 'approval',
        value: 'Isuzu (where Toyota T-IV is required)',
      },
      {
        group: 'approval',
        value: 'Aisin Transmissions requiring JWS 3309',
      },
      {
        group: 'approval',
        value: 'Honda/Acura DW 1/Z 1',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: 'atf-ws-4l.png',
      },
      {
        volume: '1 л',
        image: 'atf-ws-1l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: 'atf-z-1',
    lot: 24,
    box: 12,
    category: 'transmissionnye-masla',
    sort: 9,
    name: 'HANAKO ATF Z-1 SYNTHETIC BLENDED',
    summary: {
      ru: 'HANAKO ATF Z-1 SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий.',
      ky: 'HANAKO ATF Z-1 SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан.',
      en: 'HANAKO ATF Z-1 SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions.',
      ar: 'HANAKO ATF Z-1 SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة.',
    },
    description: {
      ru: 'HANAKO ATF Z-1 SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий. Изготовлено из синтетических базовых масел и тщательно подобранных присадок, что обеспечивает надежную защиту от износа, устойчивость к высокотемпературным нагрузкам и отличное смазывающее действие, обладает стабильными вязкостными характеристиками, что позволяет сохранять эффективность в любых климатических условиях. Соответствует всем стандартам производителей. Цвет жидкости: красный.',
      ky: 'HANAKO ATF Z-1 SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан. Ал синтетикалык базалык майлардан жана кылдаттык менен тандалган кошумчалардан жасалган, жана эскирүүдөн ишенимдүү коргоону, жогорку температуралык жүктөмдөргө туруктуулукту камсыз кылат жана мыкты майлоочу аракетти камсыз кылат, туруктуу илээшкектик өзгөчөлүктөрү бар, жана бул ар кандай климаттык шарттарда натыйжалуулукту сактоого мүмкүндүк берет. Ал бардык өндүрүүчүлөрдүн стандарттарына жооп берет. Суюктуктун түсү: Кызыл.',
      en: 'HANAKO ATF Z-1 SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions. Formulated from synthetic base oils and carefully selected additives, it provides dependable wear protection, resistance to high-temperature thermal stress, and excellent lubricating action. It maintains stable viscosity characteristics in all climate conditions. Meets all manufacturer standards. Fluid color: red.',
      ar: 'HANAKO ATF Z-1 SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة. مصنع من زيوت أساسية تخليقية وإضافات مختارة بعناية توفر حماية موثوقة ضد التآكل ومقاومة للإجهاد الحراري في درجات الحرارة العالية وأداء تزييت ممتاز. يحافظ على خصائص لزوجة مستقرة في جميع الظروف المناخية. يلبي جميع معايير الشركات المصنعة. لون السائل: أحمر.',
    },
    specs: ['ATF Z-1', 'HONDA 08266-99904'],
    tags: [
      {
        group: 'viscosity',
        value: 'ATF Z-1',
      },
      {
        group: 'approval',
        value: 'ATF Z-1',
      },
      {
        group: 'approval',
        value: 'HONDA 08266-99904',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: 'atf-z-1-4l.png',
      },
      {
        volume: '1 л',
        image: 'atf-z-1-1l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: 'atf-multi-vehicle',
    lot: 24,
    box: 12,
    category: 'transmissionnye-masla',
    sort: 10,
    name: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED',
    summary: {
      ru: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий.',
      ky: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан.',
      en: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions.',
      ar: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة.',
    },
    description: {
      ru: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий. Изготовлено из синтетических базовых масел и тщательно подобранных присадок, что обеспечивает надежную защиту от износа, устойчивость к высокотемпературным нагрузкам и отличное смазывающее действие, обладает стабильными вязкостными характеристиками, что позволяет сохранять эффективность в любых климатических условиях. Соответствует всем стандартам производителей. Цвет жидкости: красный.',
      ky: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан. Ал синтетикалык базалык майлардан жана кылдаттык менен тандалган кошумчалардан жасалган, жана эскирүүдөн ишенимдүү коргоону, жогорку температуралык жүктөмдөргө туруктуулукту камсыз кылат жана мыкты майлоочу аракетти камсыз кылат, туруктуу илээшкектик өзгөчөлүктөрү бар, жана бул ар кандай климаттык шарттарда натыйжалуулукту сактоого мүмкүндүк берет. Ал бардык өндүрүүчүлөрдүн стандарттарына жооп берет. Суюктуктун түсү: Кызыл.',
      en: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions. Formulated from synthetic base oils and carefully selected additives, it provides dependable wear protection, resistance to high-temperature thermal stress, and excellent lubricating action. It maintains stable viscosity characteristics in all climate conditions. Meets all manufacturer standards. Fluid color: red.',
      ar: 'HANAKO ATF MULTI VEHICLE SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة. مصنع من زيوت أساسية تخليقية وإضافات مختارة بعناية توفر حماية موثوقة ضد التآكل ومقاومة للإجهاد الحراري في درجات الحرارة العالية وأداء تزييت ممتاز. يحافظ على خصائص لزوجة مستقرة في جميع الظروف المناخية. يلبي جميع معايير الشركات المصنعة. لون السائل: أحمر.',
    },
    specs: [
      'BMW P/N 83 22 9 407 765, P/N 83 22 9 407 807',
      'GM WS, P/N 88863400, WS, P/N 88863401',
      'Toyota T III, T IV, WS',
      'Mitsubishi SP II, IIM, III, IV, PA, J3, SP-IV',
      'Mazda ATF M-III, M-V, FZ, JWS 3309 ATF',
      'Honda/Acura DW 1/Z 1',
      'Nissan Matic D, J, S, W, N402',
      'SsangYong DSIH 5M-52, DSIH 5M-66',
      'Suzuki AT Oil 5D06, 2384K',
      'Isuzu P/N 08200-9001, SCS',
      'Subaru ATF-WS',
      'Daihatsu D3-SP',
      'Hyundai/Kia SP III, SP IV, NWS-9638',
      'VW/Audi G 052 990 A2, G 055 005 A2, G 060 162 A2',
      'Mercedes MB 236.10, 236.14, 236.15, 236.2, 236.41, 236.5',
      'Allison C4',
    ],
    tags: [
      {
        group: 'viscosity',
        value: 'ATF Multi',
      },
      {
        group: 'approval',
        value: 'BMW P/N 83 22 9 407 765, P/N 83 22 9 407 807',
      },
      {
        group: 'approval',
        value: 'GM WS, P/N 88863400, WS, P/N 88863401',
      },
      {
        group: 'approval',
        value: 'Toyota T III, T IV, WS',
      },
      {
        group: 'approval',
        value: 'Mitsubishi SP II, IIM, III, IV, PA, J3, SP-IV',
      },
      {
        group: 'approval',
        value: 'Mazda ATF M-III, M-V, FZ, JWS 3309 ATF',
      },
      {
        group: 'approval',
        value: 'Honda/Acura DW 1/Z 1',
      },
      {
        group: 'approval',
        value: 'Nissan Matic D, J, S, W, N402',
      },
      {
        group: 'approval',
        value: 'SsangYong DSIH 5M-52, DSIH 5M-66',
      },
      {
        group: 'approval',
        value: 'Suzuki AT Oil 5D06, 2384K',
      },
      {
        group: 'approval',
        value: 'Isuzu P/N 08200-9001, SCS',
      },
      {
        group: 'approval',
        value: 'Subaru ATF-WS',
      },
      {
        group: 'approval',
        value: 'Daihatsu D3-SP',
      },
      {
        group: 'approval',
        value: 'Hyundai/Kia SP III, SP IV, NWS-9638',
      },
      {
        group: 'approval',
        value: 'VW/Audi G 052 990 A2, G 055 005 A2, G 060 162 A2',
      },
      {
        group: 'approval',
        value: 'Mercedes MB 236.10, 236.14, 236.15, 236.2, 236.41, 236.5',
      },
      {
        group: 'approval',
        value: 'Allison C4',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: 'atf-multi-vehicle-4l.png',
      },
      {
        volume: '1 л',
        image: 'atf-multi-vehicle-1l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: 'atf-mb-236-10',
    lot: 24,
    box: 12,
    category: 'transmissionnye-masla',
    sort: 11,
    name: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED',
    summary: {
      ru: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED — специальная профессиональная синтетическая жидкость, является трансмиссионным маслом и специально разрабатывалось для применения в автоматических коробках пере',
      ky: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED — автоматтык берүү кутулары үчүн атайын иштелип чыккан жогорку сапаттагы трансмиссиялык суюктук.',
      en: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED is a specialized professional synthetic transmission fluid designed for automatic transmissions.',
      ar: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED هو سائل ناقل حركة تخليقي احترافي خاص مصمم لناقلات الحركة الأوتوماتيكية.',
    },
    description: {
      ru: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED — специальная профессиональная синтетическая жидкость, является трансмиссионным маслом и специально разрабатывалось для применения в автоматических коробках передач серии МВ 722.6 и MB 722.7 в гарантийный и постгарантийный период. Уникальный пакет присадок и комбинация синтетических базовых масел обеспечивает надежное функционирование АКПП Mercedes и позволяет применять масло HANAKO МВ 236.10 в сервисных зонах официальных дилеров Mercedes-Benz. Цвет жидкости: красный.',
      ky: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED — автоматтык берүү кутулары үчүн атайын иштелип чыккан жогорку сапаттагы трансмиссиялык суюктук. Бул продукт Mercedes-Benz 722.6 жана 722.7 сериясындагы автоматтык берүү кутуларында кепилдик жана кепилдиктен кийинки пайдалануу мезгилинде колдонууга ылайыкталган. Уникалдуу кошумчалар пакети жана синтетикалык базалык майлардын айкалышы Mercedes-Benz автоматтык берүү кутуларынын ишенимдүү жана туруктуу иштешин камсыз кылат. HANAKO ATF MB 236.10 майын Mercedes-Benz үлгүлөрүн тейлөөчү расмий дилерлердин жана адистештирилген сервис борборлорунун тейлөө аймактарында колдонууга болот. Суюктуктун түсү: Кызыл.',
      en: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED is a specialized professional synthetic transmission fluid specially developed for use in MB 722.6 and MB 722.7 series automatic transmissions during warranty and post-warranty periods. A unique additive package combined with synthetic base oils ensures reliable operation of Mercedes automatic transmissions and allows the use of HANAKO MB 236.10 in service centers of official Mercedes-Benz dealers. Fluid color: red.',
      ar: 'HANAKO ATF MB 236.10 SYNTHETIC BLENDED هو سائل ناقل حركة تخليقي احترافي خاص تم تطويره خصيصًا للاستخدام في ناقلات الحركة الأوتوماتيكية من سلسلة MB 722.6 و MB 722.7 خلال فترات الضمان وما بعد الضمان. توفر حزمة الإضافات الفريدة مع الزيوت الأساسية التخليقية تشغيلًا موثوقًا لناقلات الحركة الأوتوماتيكية من مرسيدس وتسمح باستخدام HANAKO MB 236.10 في مراكز خدمة وكلاء مرسيدس-بنز الرسميين. لون السائل: أحمر.',
    },
    specs: [],
    tags: [
      {
        group: 'viscosity',
        value: 'MB 236.10',
      },
    ],
    packages: [
      {
        volume: '1 л',
        image: 'atf-mb-236-10-1l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: 'atf-mb-236-14',
    lot: 24,
    box: 12,
    category: 'transmissionnye-masla',
    sort: 12,
    name: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED',
    summary: {
      ru: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED является трансмиссионным маслом и специально разрабатывалось для 7-ступенчатых современных спортивных трансмиссий NAG2V Sport, 7G-Tronic (722.9/W7A 700/NAG2).',
      ky: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED — трансмиссиялык май болуп эсептелет жана NAG2V Sport, 7G-Tronic (722.9/W7A 700/NAG2) сыяктуу 7 баскычтуу заманбап спорттук трансмиссиялар үчүн атайын иштелип чыккан.',
      en: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED is a transmission fluid specially developed for modern 7-speed sports transmissions NAG2V Sport, 7G-Tronic (722.9/W7A 700/NAG2).',
      ar: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED هو سائل ناقل حركة تم تطويره خصيصًا لناقلات الحركة الرياضية الحديثة ذات 7 سرعات NAG2V Sport و 7G-Tronic (722.9/W7A 700/NAG2).',
    },
    description: {
      ru: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED является трансмиссионным маслом и специально разрабатывалось для 7-ступенчатых современных спортивных трансмиссий NAG2V Sport, 7G-Tronic (722.9/W7A 700/NAG2). Рекомендуется также для 5-ступенчатых АКПП (722.6/W5A 580/NAG1). Заменяет жидкости предыдущих поколений для 4- и 5-ступенчатых АКПП легковых автомобилей (722.3, 722.4, 722.5), за исключением класса А (W168) и Vaneo (W414) с 5-ступенчатой коробкой передач вариаторного типа CVT (722.7/FAG). Цвет жидкости: красный.',
      ky: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED — трансмиссиялык май болуп эсептелет жана NAG2V Sport, 7G-Tronic (722.9/W7A 700/NAG2) сыяктуу 7 баскычтуу заманбап спорттук трансмиссиялар үчүн атайын иштелип чыккан. Ошондой эле 5 баскычтуу автоматтык берүү кутулары (722.6/W5A 580/NAG1) үчүн сунушталат. Бул май жеңил автоунаалардын 4 жана 5 баскычтуу автоматтык берүү кутуларында (722.3, 722.4, 722.5) колдонулган мурунку муундагы суюктуктардын ордун басат. Бирок А-класстагы (W168) жана Vaneo (W414) үлгүлөрүндөгү CVT тибиндеги 5 баскычтуу вариатордук берүү кутулары (722.7/FAG) үчүн ылайыктуу эмес. Суюктуктун түсү: Кызыл.',
      en: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED is a transmission fluid specially developed for modern 7-speed sports transmissions NAG2V Sport, 7G-Tronic (722.9/W7A 700/NAG2). It is also recommended for 5-speed automatic transmissions (722.6/W5A 580/NAG1). Replaces previous generation fluids for 4- and 5-speed passenger car automatic transmissions (722.3, 722.4, 722.5), except for A-Class (W168) and Vaneo (W414) with 5-speed CVT transmissions (722.7/FAG). Fluid color: red.',
      ar: 'HANAKO ATF MB 236.14 SYNTHETIC BLENDED هو سائل ناقل حركة تم تطويره خصيصًا لناقلات الحركة الرياضية الحديثة ذات 7 سرعات NAG2V Sport و 7G-Tronic (722.9/W7A 700/NAG2). يوصى به أيضًا لناقلات الحركة الأوتوماتيكية ذات 5 سرعات (722.6/W5A 580/NAG1). يحل محل سوائل الجيل السابق لناقلات الحركة الأوتوماتيكية ذات 4 و 5 سرعات لسيارات الركاب (722.3، 722.4، 722.5)، باستثناء الفئة A (W168) و Vaneo (W414) المزودة بناقل حركة CVT ذي 5 سرعات (722.7/FAG). لون السائل: أحمر.',
    },
    specs: [],
    tags: [
      {
        group: 'viscosity',
        value: 'MB 236.14',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: 'atf-mb-236-14-4l.png',
      },
    ],
    datasheet: null,
  },
  {
    slug: 'cvt-hmmf',
    lot: 24,
    box: 12,
    category: 'transmissionnye-masla',
    sort: 13,
    name: 'HANAKO CVT HMMF SYNTHETIC BLENDED',
    summary: {
      ru: 'HANAKO CVT HMMF SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий.',
      ky: 'HANAKO CVT HMMF SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан.',
      en: 'HANAKO CVT HMMF SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern automatic transmissions.',
      ar: 'HANAKO CVT HMMF SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة الأوتوماتيكية الحديثة.',
    },
    description: {
      ru: 'HANAKO CVT HMMF SYNTHETIC BLENDED — это высококачественное трансмиссионное масло, специально разработанное для современных автоматических трансмиссий. Изготовлено из синтетических базовых масел и тщательно подобранных присадок, что обеспечивает надежную защиту от износа, устойчивость к высокотемпературным нагрузкам и отличное смазывающее действие, обладает стабильными вязкостными характеристиками, что позволяет сохранять эффективность в любых климатических условиях. Соответствует всем стандартам производителей. Цвет жидкости: зеленый.',
      ky: 'HANAKO CVT HMMF SYNTHETIC BLENDED — бул жогорку сапаттагы трансмиссия майы жана ал атайын азыркы учурдагы автоматтык трансмиссиялар үчүн иштелип чыккан. Ал синтетикалык базалык майлардан жана кылдаттык менен тандалган кошумчалардан жасалган, жана эскирүүдөн ишенимдүү коргоону, жогорку температуралык жүктөмдөргө туруктуулукту камсыз кылат жана мыкты майлоочу аракетти камсыз кылат, туруктуу илээшкектик өзгөчөлүктөрү бар, жана бул ар кандай климаттык шарттарда натыйжалуулукту сактоого мүмкүндүк берет. Ал бардык өндүрүүчүлөрдүн стандарттарына жооп берет. Суюктуктун түсү: Жашыл.',
      en: 'HANAKO CVT HMMF SYNTHETIC BLENDED is a high-quality transmission fluid specially engineered for modern continuously variable transmissions. Formulated from synthetic base oils and carefully selected additives, it provides dependable wear protection, resistance to high-temperature thermal stress, and excellent lubricating action. It maintains stable viscosity characteristics in all climate conditions. Meets all manufacturer standards. Fluid color: green.',
      ar: 'HANAKO CVT HMMF SYNTHETIC BLENDED هو زيت ناقل حركة عالي الجودة مصمم خصيصًا لناقلات الحركة المتغيرة باستمرار (CVT) الحديثة. مصنع من زيوت أساسية تخليقية وإضافات مختارة بعناية توفر حماية موثوقة ضد التآكل ومقاومة للإجهاد الحراري في درجات الحرارة العالية وأداء تزييت ممتاز. يحافظ على خصائص لزوجة مستقرة في جميع الظروف المناخية. يلبي جميع معايير الشركات المصنعة. لون السائل: أخضر.',
    },
    specs: [
      'Toyota/Lexus TC, FE*, WS (Prius eCVT only)',
      'BMW 8322 0 136 376 / 8322 0 429 154 (EZL 799A)',
      'Mini Cooper (EZL 799A/ZF CVT V1)',
      'Nissan NS-1, NS-2, NS-3*',
      'Ford CVT23',
      'GM/Saturn DEX-CVT, GM CVT',
      'Mercedes-Benz CVT28/MB-Approval 236.20',
      'Audi/VW TL 52180, G 052 180, G 052 516',
      'Hyundai/Kia SP-CVT 1',
      'Honda HMMF, HCF-2^',
      'Subaru e-CVTF, i-CVT, Cv30',
    ],
    tags: [
      {
        group: 'viscosity',
        value: 'CVT HMMF',
      },
      {
        group: 'approval',
        value: 'Toyota/Lexus TC, FE*, WS (Prius eCVT only)',
      },
      {
        group: 'approval',
        value: 'BMW 8322 0 136 376 / 8322 0 429 154 (EZL 799A)',
      },
      {
        group: 'approval',
        value: 'Mini Cooper (EZL 799A/ZF CVT V1)',
      },
      {
        group: 'approval',
        value: 'Nissan NS-1, NS-2, NS-3*',
      },
      {
        group: 'approval',
        value: 'Ford CVT23',
      },
      {
        group: 'approval',
        value: 'GM/Saturn DEX-CVT, GM CVT',
      },
      {
        group: 'approval',
        value: 'Mercedes-Benz CVT28/MB-Approval 236.20',
      },
      {
        group: 'approval',
        value: 'Audi/VW TL 52180, G 052 180, G 052 516',
      },
      {
        group: 'approval',
        value: 'Hyundai/Kia SP-CVT 1',
      },
      {
        group: 'approval',
        value: 'Honda HMMF, HCF-2^',
      },
      {
        group: 'approval',
        value: 'Subaru e-CVTF, i-CVT, Cv30',
      },
    ],
    packages: [
      {
        volume: '4 л',
        image: 'cvt-hmmf-4l.png',
      },
      {
        volume: '1 л',
        image: 'cvt-hmmf-1l.png',
      },
    ],
    datasheet: null,
  },
]
