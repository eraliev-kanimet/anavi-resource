// Page texts of the original site: every text is a {locale: value} map, image fields hold file names
// inside assets/hanako. Which block draws what is decided when the site is assembled.

export type Label = Record<string, string>

export interface HanakoSlide {
  eyebrow?: Label
  title?: Label
  text?: Label
  image: string
}

export interface HanakoFeature {
  no?: string
  title?: Label
  text?: Label
  image: string
}

export interface HanakoSection {
  eyebrow?: Label
  title?: Label
  text?: Label
}

export interface HanakoCta {
  title?: Label
  text?: Label
  button?: Label
}

export interface HanakoHomePage {
  seo?: { title?: Label; description?: Label }
  heroSlides: HanakoSlide[]
  features: { eyebrow?: Label; title?: Label; items: HanakoFeature[] }
  catalog: HanakoSection
  faq: HanakoSection
  points: HanakoSection
  cta: HanakoCta
}

export interface HanakoTextPage {
  title?: Label
  intro?: Label
  text?: Label
  cta?: HanakoCta
}

export const HANAKO_HOME: HanakoHomePage = {
  seo: {
    title: {
      ru: 'HANAKO — моторные масла и технические жидкости',
      ky: 'HANAKO — мотор майлары жана техникалык суюктуктар',
      en: 'HANAKO — Motor Oils and Technical Fluids',
      ar: 'HANAKO — زيوت المحركات والسوائل الفنية',
    },
    description: {
      ru: 'Каталог продукции HANAKO Oil Corporation Japan: моторные и трансмиссионные масла, антифризы, тормозные жидкости. Подбор и консультация в WhatsApp.',
      ky: 'HANAKO Oil Corporation Japan продукциясынын каталогу: мотор жана трансмиссия майлары, антифриздер, тормоз суюктуктары. WhatsApp аркылуу тандоо жана кеңеш.',
      en: 'Product catalog of HANAKO Oil Corporation Japan: engine and transmission oils, antifreezes, brake fluids. Selection assistance and consultation on WhatsApp.',
      ar: 'كتالوج منتجات HANAKO Oil Corporation Japan: زيوت المحركات وناقل الحركة، مضادات التجمد، سوائل الفرامل. المساعدة في الاختيار والاستشارة عبر WhatsApp.',
    },
  },
  // One slide instead of three. Hanako has its own materials, and the third was chosen out of the
  // three: the first two are manufacturer credentials ("plant in Singapore", "own laboratory"),
  // whereas the hero answers "what you get from this" rather than "who we are".
  heroSlides: [
    {
      eyebrow: {
        ru: 'ЗАЩИТА И СТАНДАРТЫ',
        ky: 'КОРГОО ЖАНА СТАНДАРТТАР',
        en: 'PROTECTION AND STANDARDS',
        ar: 'الحماية والمعايير',
      },
      title: {
        ru: 'Создано для максимальной защиты автомобиля',
        ky: 'Унааны максималдуу коргоо үчүн жаратылган',
        en: 'Engineered for maximum vehicle protection',
        ar: 'صُممت لتوفير أقصى حماية للسيارة',
      },
      text: {
        ru: '<p>Надежная защита двигателя и трансмиссии от износа, стабильная работа при экстремальных температурах и соответствие <strong>международным стандартам</strong>.</p>',
        ky: '<p>Кыймылдаткычты жана трансмиссияны эскирүүдөн ишенимдүү коргоо, өтө жогорку температурада туруктуу иштөө жана эл аралык стандарттарга шайкештик.</p>',
        en: '<p>Reliable wear protection for engine and transmission, stable performance under extreme temperatures, and compliance with <strong>international standards</strong>.</p>',
        ar: '<p>حماية موثوقة للمحرك وناقل الحركة من التآكل، أداء مستقر في درجات الحرارة القصوى والامتثال <strong>للمعايير الدولية</strong>.</p>',
      },
      image: '2.webp',
    },
  ],
  features: {
    eyebrow: {
      ru: 'ПОЧЕМУ HANAKO',
      ky: 'ЭМНЕГЕ HANAKO',
      en: 'WHY HANAKO',
      ar: 'لماذا HANAKO',
    },
    title: {
      ru: 'Инженерия защиты, доведенная до предела',
      ky: 'Чегине жеткирилген коргоо инженериясы',
      en: 'Protection engineering pushed to the limit',
      ar: 'هندسة حماية متطورة إلى أقصى حد',
    },
    items: [
      {
        no: '01',
        title: {
          ru: 'Собственное производство',
          ky: 'Өз өндүрүшү',
          en: 'In-house manufacturing',
          ar: 'إنتاج خاص بنا',
        },
        text: {
          ru: 'Завод и научно-исследовательская лаборатория HANAKO в Сингапуре — контроль на каждом этапе.',
          ky: 'HANAKO компаниясынын Сингапурдагы заводу жана изилдөө лабораториясы ар бир этапта көзөмөлдү камсыз кылат.',
          en: 'HANAKO manufacturing plant and R&D laboratory in Singapore: quality control at every stage.',
          ar: 'مصنع ومختبر أبحاث وتطوير HANAKO في سنغافورة — رقابة في كل مرحلة.',
        },
        image: '1.png',
      },
      {
        no: '02',
        title: {
          ru: 'Максимальная защита',
          ky: 'Максималдуу коргоо',
          en: 'Maximum protection',
          ar: 'أقصى درجات الحماية',
        },
        text: {
          ru: 'Защита двигателя и трансмиссии от износа, прочная масляная пленка при экстремальных нагрузках.',
          ky: 'Кыймылдаткычты жана трансмиссияны эскирүүдөн коргоо, өтө оор жүктөр астында бышык май пленкасы.',
          en: 'Engine and transmission wear protection with a durable oil film under extreme loads.',
          ar: 'حماية المحرك وناقل الحركة من التآكل، وطبقة زيت قوية في ظل الأحمال القصوى.',
        },
        image: '2.png',
      },
      {
        no: '03',
        title: {
          ru: 'Допуски и стандарты',
          ky: 'Уруксаттар жана стандарттар',
          en: 'Approvals and standards',
          ar: 'الموافقات والمعايير',
        },
        text: {
          ru: 'Соответствие международным стандартам качества и требованиям ведущих мировых автопроизводителей.',
          ky: 'Эл аралык сапат стандарттарына жана дүйнөлүк алдыңкы автоөндүрүүчүлөрдүн талаптарына шайкештик.',
          en: 'Compliance with international quality standards and requirements of leading automakers.',
          ar: 'الامتثال لمعايير الجودة الدولية ومتطلبات كبار مصنعي السيارات في العالم.',
        },
        image: '3.png',
      },
      {
        no: '04',
        title: {
          ru: 'Полный ассортимент',
          ky: 'Толук ассортимент',
          en: 'Comprehensive range',
          ar: 'مجموعة منتجات شاملة',
        },
        text: {
          ru: 'Моторные и трансмиссионные масла и технические жидкости для легкового и коммерческого транспорта.',
          ky: 'Жеңил жана коммерциялык транспорт үчүн мотор, трансмиссия майлары жана техникалык суюктуктар.',
          en: 'Engine and transmission oils, and technical fluids for passenger and commercial vehicles.',
          ar: 'زيوت المحركات وناقل الحركة والسوائل الفنية لمركبات الركاب والمركبات التجارية.',
        },
        image: '4.png',
      },
    ],
  },
  catalog: {
    eyebrow: {
      ru: 'КАТАЛОГ',
      ky: 'КАТАЛОГ',
      en: 'CATALOG',
      ar: 'الكتالوج',
    },
    title: {
      ru: 'Моторные масла и технические жидкости',
      ky: 'Мотор майлары жана техникалык суюктуктар',
      en: 'Engine oils and technical fluids',
      ar: 'زيوت المحركات والسوائل الفنية',
    },
  },
  faq: {
    eyebrow: {
      ru: 'FAQ',
      ky: 'FAQ',
      en: 'FAQ',
      ar: 'الأسئلة الشائعة',
    },
    title: {
      ru: 'Вопросы и ответы',
      ky: 'Суроолор жана жооптор',
      en: 'Questions and answers',
      ar: 'الأسئلة والأجوبة',
    },
  },
  points: {
    eyebrow: {
      ru: 'ГДЕ КУПИТЬ',
      ky: 'КАЙДАН САТЫП АЛСА БОЛОТ',
      en: 'WHERE TO BUY',
      ar: 'أين تشتري',
    },
    title: {
      ru: 'Точки продаж и официальные дистрибьюторы',
      ky: 'Сатуу түйүндөрү жана расмий дистрибьюторлор',
      en: 'Points of sale and official distributors',
      ar: 'نقاط البيع والموزعون الرسميون',
    },
  },
  cta: {
    title: {
      ru: 'Подберем масло под ваш автопарк',
      ky: 'Автопаркыңызга ылайык май тандап беребиз',
      en: 'We will select the right oil for your fleet',
      ar: 'سنختار الزيت المناسب لأسطول سياراتك',
    },
    text: {
      ru: 'Розница и оптом для автосервисов, автопарков и магазинов. Напишите в WhatsApp — подберем масло по марке автомобиля, подскажем допуски и фасовку и рассчитаем поставку в ваш город.',
      ky: 'Автосервистер, автопарктар жана дүкөндөр үчүн чекене жана дүң сатуу. WhatsApp аркылуу жазыңыз — унаанын маркасы боюнча май тандап беребиз, уруксаттарды жана таңгакты айтабыз, шаарыңызга жеткирүүнү эсептейбиз.',
      en: 'Retail and wholesale for auto repair shops, vehicle fleets, and stores. Message us on WhatsApp: we will match the oil to your vehicle make, advise on approvals and packaging, and calculate delivery to your city.',
      ar: 'بالتجزئة وبالجملة لمراكز صيانة السيارات، وأساطيل المركبات والمتاجر. راسلنا عبر WhatsApp — سنختار الزيت المناسب وفقًا لطراز السيارة، وسنوضح الموافقات والتعبئة ونحسب تكلفة التوصيل إلى مدينتك.',
    },
  },
}

export const HANAKO_TEXT_PAGES: Record<string, HanakoTextPage> = {
  about: {
    title: {
      ru: 'Смазочные материалы, созданные для максимальной защиты вашего автомобиля',
      ky: 'Унааңызга максималдуу коргоону камсыз кылуу үчүн иштелип чыккан жогорку сапаттагы майлоочу материалдар',
      en: 'Lubricants engineered for maximum protection of your vehicle',
      ar: 'مواد تشحيم مصممة لتوفير أقصى حماية لسيارتك',
    },
    text: {
      ru: '<p>HANAKO — современный бренд высокотехнологичных смазочных материалов, объединяющий передовые инженерные разработки, собственное производство и строгий контроль качества. Производство осуществляется в Сингапуре — одном из мировых центров нефтехимической промышленности, где инновации, технологии и международные стандарты лежат в основе каждого продукта.</p>\n<p>Вся продукция HANAKO производится на современном высокотехнологичном заводе, соответствующем мировым стандартам, что обеспечивает полный контроль над каждым этапом производства — от отбора высококачественного сырья и разработки рецептур до лабораторных испытаний и выпуска готовой продукции.</p>\n<p>Адрес производства и головного офиса:<br>14 Tuas Drive 2, Singapore 638647</p>\n<p>Наличие собственной научно-исследовательской лаборатории позволяет постоянно совершенствовать составы масел, проводить всесторонние испытания и гарантировать стабильное качество каждой партии. Каждая формула разрабатывается с учетом требований современных бензиновых, дизельных, гибридных двигателей и коммерческой техники, а также новейших трансмиссионных систем.</p>\n<p>Ассортимент HANAKO включает полный спектр смазочных материалов для легкового и коммерческого транспорта:</p>\n<ul>\n<li>Моторные масла для бензиновых и дизельных двигателей;</li>\n<li>Трансмиссионные масла для автоматических (ATF), вариаторных (CVT) и механических коробок передач;</li>\n<li>Специализированные технические жидкости для современных автомобилей.</li>\n</ul>\n<p>Продукция HANAKO обеспечивает:</p>\n<ul>\n<li>надежную защиту двигателя и трансмиссии от износа;</li>\n<li>стабильную работу при экстремально высоких и низких температурах;</li>\n<li>чистоту внутренних деталей и защиту от образования отложений;</li>\n<li>снижение трения и повышение эффективности работы агрегатов;</li>\n<li>увеличение срока службы двигателя и трансмиссии;</li>\n<li>соответствие международным стандартам качества и требованиям ведущих мировых автопроизводителей.</li>\n</ul>\n<p>Выбирая HANAKO, вы выбираете не просто моторное или трансмиссионное масло. Вы выбираете новейшие технологии, собственное производство, научный подход и качество, проверенное современными мировыми стандартами.</p>\n<p>HANAKO — технологии, которые защищают. Качество, которому доверяют.</p>',
      ky: '<p>HANAKO — заманбап инженердик технологияларды, өзүнүн өндүрүшүн жана сапатты катуу көзөмөлдөө системасын айкалыштырган жогорку технологиялуу майлоочу материалдардын бренди. Продукция дүйнөдөгү мунай-химия өнөр жайынын алдыңкы борборлорунун бири болгон Сингапурда өндүрүлөт. Бул жерде инновациялар, заманбап технологиялар жана эл аралык стандарттар ар бир продукциянын негизин түзөт.</p>\n<p>HANAKO продукциясынын бардыгы дүйнөлүк талаптарга жооп берген заманбап, жогорку технологиялуу заводдо өндүрүлөт. Бул өндүрүштүн ар бир баскычын толук көзөмөлдөөгө мүмкүндүк берет — жогорку сапаттагы чийки затты тандоодон жана май формулаларын иштеп чыгуудан тартып, лабораториялык сыноолорду өткөрүүгө жана даяр продукцияны чыгарууга чейин.</p>\n<p>Өндүрүш ишканасынын жана башкы кеңсенин дареги:<br>14 Tuas Drive 2, Singapore 638647</p>\n<p>Компаниянын өзүнүн илимий-изилдөө лабораториясынын болушу майлардын курамын үзгүлтүксүз өркүндөтүүгө, ар тараптуу сыноолорду жүргүзүүгө жана ар бир партиянын туруктуу сапатына кепилдик берүүгө шарт түзөт. Ар бир формула заманбап бензин, дизель жана гибрид кыймылдаткычтарынын, коммерциялык техникалардын, ошондой эле акыркы үлгүдөгү трансмиссиялык системалардын талаптарын эске алуу менен иштелип чыгат.</p>\n<p>HANAKO брендинин ассортименти жеңил жана коммерциялык транспорт үчүн майлоочу материалдардын кеңири түрүн камтыйт:</p>\n<ul>\n<li>Бензин жана дизель кыймылдаткычтары үчүн мотор майлары;</li>\n<li>Автоматтык (ATF), вариатордук (CVT) жана механикалык берүү кутулары үчүн трансмиссиялык майлар;</li>\n<li>Заманбап автоунаалар үчүн атайын техникалык суюктуктар.</li>\n</ul>\n<p>HANAKO продукциясы төмөнкү артыкчылыктарды камсыз кылат:</p>\n<ul>\n<li>кыймылдаткычты жана трансмиссияны эскирүүдөн ишенимдүү коргойт;</li>\n<li>өтө жогорку жана өтө төмөн температураларда туруктуу иштөөнү камсыздайт;</li>\n<li>ички тетиктердин тазалыгын сактап, чөгүндүлөрдүн пайда болушун алдын алат;</li>\n<li>сүрүлүүнү азайтып, агрегаттардын иштөө натыйжалуулугун жогорулатат;</li>\n<li>кыймылдаткычтын жана трансмиссиянын кызмат мөөнөтүн узартат;</li>\n<li>эл аралык сапат стандарттарына жана дүйнөлүк алдыңкы автоөндүрүүчүлөрдүн талаптарына жооп берет.</li>\n</ul>\n<p>HANAKOну тандап, сиз жөн гана мотордук же трансмиссиялык майды эмес, эң акыркы технологияларды, өз өндүрүшүн, илимий негизделген иштеп чыгууларды жана дүйнөлүк стандарттар менен тастыкталган сапатты тандайсыз.</p>\n<p>HANAKO — коргогон технологиялар. Ишеним жараткан сапат.</p>',
      en: '<p>HANAKO is a modern brand of high-tech lubricants combining cutting-edge engineering developments, in-house manufacturing, and strict quality control. Production is based in Singapore — one of the world hubs of the petrochemical industry, where innovation, technology, and international standards form the foundation of every product.</p>\n<p>All HANAKO products are manufactured at a state-of-the-art high-tech plant meeting international standards, ensuring complete control over every stage of production — from the selection of premium raw materials and formulation development to laboratory testing and finished product release.</p>\n<p>Manufacturing and headquarters address:<br>14 Tuas Drive 2, Singapore 638647</p>\n<p>Our proprietary R&D laboratory allows us to continuously refine oil formulations, conduct comprehensive testing, and guarantee consistent batch quality. Each formula is developed with the requirements of modern gasoline, diesel, and hybrid engines, commercial machinery, and advanced transmission systems in mind.</p>\n<p>The HANAKO product lineup includes a full range of lubricants for passenger and commercial vehicles:</p>\n<ul>\n<li>Engine oils for gasoline and diesel engines;</li>\n<li>Transmission oils for automatic (ATF), continuously variable (CVT), and manual transmissions;</li>\n<li>Specialized technical fluids for modern vehicles.</li>\n</ul>\n<p>HANAKO products provide:</p>\n<ul>\n<li>reliable wear protection for engine and transmission;</li>\n<li>stable performance at extremely high and low temperatures;</li>\n<li>cleanliness of internal components and protection against deposit buildup;</li>\n<li>friction reduction and enhanced powertrain efficiency;</li>\n<li>extended service life for engine and transmission;</li>\n<li>compliance with international quality standards and leading automaker specifications.</li>\n</ul>\n<p>By choosing HANAKO, you choose more than just motor or transmission oil. You choose cutting-edge technology, in-house production, a scientific approach, and quality proven by modern international standards.</p>\n<p>HANAKO — technologies that protect. Quality you can trust.</p>',
      ar: '<p>HANAKO هي علامة تجارية حديثة لمواد التشحيم عالية التقنية تجمع بين التطورات الهندسية المتقدمة والإنتاج الذاتي والرقابة الصارمة على الجودة. يتم الإنتاج في سنغافورة — أحد المراكز العالمية لصناعة البتروكيماويات، حيث تشكل الابتكارات والتكنولوجيا والمعايير الدولية أساس كل منتج.</p>\n<p>يتم تصنيع جميع منتجات HANAKO في مصنع حديث عالي التقنية يلبي المعايير العالمية، مما يضمن التحكم الكامل في كل مرحلة من مراحل الإنتاج — من اختيار المواد الخام عالية الجودة وتطوير التركيبات إلى الاختبارات المعملية وإصدار المنتجات الجاهزة.</p>\n<p>عنوان المصنع والمقر الرئيسي:<br>14 Tuas Drive 2, Singapore 638647</p>\n<p>يتيح لنا وجود مختبر أبحاث وتطوير خاص بنا تحسين تركيبات الزيوت باستمرار، وإجراء اختبارات شاملة، وضمان جودة متسقة لكل دفعة. يتم تطوير كل تركيبة مع مراعاة متطلبات محركات البنزين والديزل والهجينة الحديثة والمعدات التجارية، بالإضافة إلى أحدث أنظمة نقل الحركة.</p>\n<p>تتضمن تشكيلة منتجات HANAKO مجموعة كاملة من مواد التشحيم لمركبات الركاب والمركبات التجارية:</p>\n<ul>\n<li>زيوت المحركات لمحركات البنزين والديزل؛</li>\n<li>زيوت ناقل الحركة لناقلات الحركة الأوتوماتيكية (ATF)، والمتغيرة باستمرار (CVT)، واليدوية؛</li>\n<li>سوائل فنية متخصصة للسيارات الحديثة.</li>\n</ul>\n<p>توفر منتجات HANAKO:</p>\n<ul>\n<li>حماية موثوقة للمحرك وناقل الحركة من التآكل؛</li>\n<li>أداءً مستقرًا في درجات الحرارة العالية والمنخفضة للغاية؛</li>\n<li>نظافة الأجزاء الداخلية والحماية من تراكم الرواسب؛</li>\n<li>تقليل الاحتكاك وزيادة كفاءة عمل الوحدات؛</li>\n<li>إطالة العمر الافتراضي للمحرك وناقل الحركة؛</li>\n<li>الامتثال لمعايير الجودة الدولية ومتطلبات كبار مصنعي السيارات في العالم.</li>\n</ul>\n<p>باختيارك HANAKO، فإنك لا تختار مجرد زيت محرك أو ناقل حركة. أنت تختار أحدث التقنيات والإنتاج الخاص والنهج العلمي والجودة المثبتة بالمعايير العالمية الحديثة.</p>\n<p>HANAKO — تقنيات تحمي. جودة تثق بها.</p>',
    },
    cta: {
      title: {
        ru: 'Подберем масло под ваш автомобиль',
        ky: 'Унааңызга ылайык май тандап беребиз',
        en: 'We will select the right oil for your vehicle',
        ar: 'سنختار الزيت المناسب لسيارتك',
      },
      text: {
        ru: 'Напишите в WhatsApp — подскажем нужную вязкость и допуски по марке автомобиля, назовем ближайшую точку продаж и рассчитаем поставку.',
        ky: 'WhatsApp аркылуу жазыңыз — унаанын маркасы боюнча керектүү илешкектикти жана уруксаттарды айтабыз, эң жакын сатуу түйүнүн көрсөтүп, жеткирүүнү эсептейбиз.',
        en: 'Message us on WhatsApp: we will advise on the required viscosity and approvals for your vehicle make, locate the nearest point of sale, and calculate delivery.',
        ar: 'راسلنا عبر WhatsApp — سنقترح اللزوجة والموافقات المطلوبة وفقًا لطراز السيارة، وسنحدد أقرب نقطة بيع ونحسب تكلفة التوصيل.',
      },
    },
  },
  faq: {
    title: {
      ru: 'Вопросы и ответы',
      ky: 'Суроолор жана жооптор',
      en: 'Questions and answers',
      ar: 'الأسئلة والأجوبة',
    },
    intro: {
      ru: 'Собрали то, о чем спрашивают чаще всего: как подобрать вязкость, чем отличаются допуски и как заказать оптом. Не нашли свой вопрос — напишите в WhatsApp.',
      ky: 'Көп берилген суроолорду чогулттук: илешкектикти кантип тандоо керек, уруксаттар эмнеси менен айырмаланат жана дүң заказды кантип берүү керек. Сурооңузду таппасаңыз — WhatsApp аркылуу жазыңыз.',
      en: 'We gathered the most frequent questions: how to choose viscosity, how approvals differ, and how to place a wholesale order. If you did not find your question, message us on WhatsApp.',
      ar: 'جمعنا الأسئلة الأكثر شيوعًا: كيفية اختيار اللزوجة، وكيف تختلف الموافقات، وكيفية طلب كميات بالجملة. إذا لم تجد سؤالك، راسلنا عبر WhatsApp.',
    },
    cta: {
      title: {
        ru: 'Остался вопрос?',
        ky: 'Суроо калдыбы?',
        en: 'Still have questions?',
        ar: 'هل لا يزال لديك سؤال؟',
      },
      text: {
        ru: 'Напишите в WhatsApp — ответим по подбору масла, допускам и условиям поставки.',
        ky: 'WhatsApp аркылуу жазыңыз — май тандоо, уруксаттар жана жеткирүү шарттары боюнча жооп беребиз.',
        en: 'Message us on WhatsApp: we will answer questions on oil selection, approvals, and delivery terms.',
        ar: 'راسلنا عبر WhatsApp — سنجيب عن اختيار الزيت والموافقات وشروط التوريد.',
      },
    },
  },
  points: {
    title: {
      ru: 'Точки продаж и официальные дистрибьюторы',
      ky: 'Сатуу түйүндөрү жана расмий дистрибьюторлор',
      en: 'Points of sale and official distributors',
      ar: 'نقاط البيع والموزعون الرسميون',
    },
    intro: {
      ru: 'Официальные дистрибьюторы и партнеры HANAKO в Кыргызстане, Казахстане, Узбекистане и России. Не нашли свой город — напишите в WhatsApp, подскажем ближайшую точку и рассчитаем поставку.',
      ky: 'Кыргызстандагы, Казакстандагы, Өзбекстандагы жана Россиядагы HANAKO расмий дистрибьюторлору жана өнөктөштөрү. Шаарыңызды таппасаңыз — WhatsApp аркылуу жазыңыз, эң жакын түйүндү айтып, жеткирүүнү эсептеп беребиз.',
      en: 'Official HANAKO distributors and partners across Kyrgyzstan, Kazakhstan, Uzbekistan, and Russia. If you cannot find your city, message us on WhatsApp: we will point to the nearest location and calculate delivery.',
      ar: 'الموزعون والشركاء الرسميون لـ HANAKO في قيرغيزستان وكازاخستان وأوزبكستان وروسيا. إذا لم تجد مدينتك، راسلنا عبر WhatsApp، وسنرشدك إلى أقرب نقطة ونحسب تكلفة التوصيل.',
    },
    cta: {
      title: {
        ru: 'Хотите стать дистрибьютором?',
        ky: 'Дистрибьютор болгуңуз келеби?',
        en: 'Want to become a distributor?',
        ar: 'هل ترغب في أن تصبح موزعًا؟',
      },
      text: {
        ru: 'Мы открыты к партнерству в новых городах. Напишите в WhatsApp — обсудим условия оптовых поставок, ассортимент и поддержку.',
        ky: 'Жаңы шаарлардагы өнөктөштүккө ачыкпыз. WhatsApp аркылуу жазыңыз — дүң жеткирүүнүн шарттарын, ассортиментти жана колдоону талкуулайбыз.',
        en: 'We are open to partnerships in new cities. Message us on WhatsApp to discuss wholesale supply terms, product range, and partner support.',
        ar: 'نحن منفتحون على الشراكة في مدن جديدة. راسلنا عبر WhatsApp لمناقشة شروط توريد الجملة ومجموعة المنتجات والدعم.',
      },
    },
  },
  privacy: {
    title: {
      ru: 'Политика конфиденциальности',
      en: 'Privacy Policy',
      ar: 'سياسة الخصوصية',
    },
    text: {
      ru: 'ЧЕРНОВИК. Ниже описано, как сайт работает с данными на самом деле. Текст составлен разработчиком по факту реализации и не является юридическим документом — перед запуском его должен проверить и оформить юрист.\n\nСайт представляет собой каталог продукции. На нем нет форм обратной связи, регистрации, личного кабинета и оформления заказа, поэтому мы не запрашиваем и не храним ваши имя, телефон, адрес или платежные данные.\n\nКнопки «Связаться в WhatsApp» открывают мессенджер и переводят вас на сторонний сервис. Дальнейшая переписка происходит в WhatsApp и регулируется политикой конфиденциальности его владельца — компании Meta. Сайт не получает и не сохраняет содержание этих сообщений.\n\nСайт использует технические cookie, необходимые для его работы: они хранят идентификатор сессии и защищают формы от подделки запросов. Отключить их нельзя, без них сайт не будет работать корректно.\n\nАналитика подключается только с вашего согласия. При первом визите показывается баннер с выбором «Принять» или «Отклонить». До нажатия «Принять» ни один запрос к сервисам аналитики не отправляется. Ваш выбор сохраняется в локальном хранилище браузера и не передается на сервер. Чтобы изменить решение, очистите данные сайта в настройках браузера.\n\nЕсли вы согласились на аналитику, обезличенные сведения о посещении (страницы, источник перехода, тип устройства) обрабатываются сервисом Google Analytics в соответствии с его политикой конфиденциальности.\n\nПо вопросам, связанным с обработкой данных, напишите нам в WhatsApp или позвоните по телефону, указанному в подвале сайта.',
      en: 'DRAFT. The following explains how the site actually handles data. This text was prepared by the developer based on the current implementation and is not a legal document — it must be reviewed and formalized by a legal counsel before launch.\n\nThe website is a product catalog. It has no feedback forms, registration, user accounts, or checkout, so we do not request or store your name, phone number, address, or payment details.\n\n"Contact on WhatsApp" buttons open the messenger and redirect you to a third-party service. Further messaging takes place in WhatsApp and is governed by the privacy policy of its owner, Meta. The site does not receive or store the content of these messages.\n\nThe site uses technical cookies necessary for its operation: they store a session identifier and protect forms against cross-site request forgery. They cannot be disabled, as the site will not function correctly without them.\n\nAnalytics are enabled only with your consent. On your first visit, a banner with "Accept" and "Decline" options is displayed. No requests are sent to analytics services until "Accept" is clicked. Your choice is stored in local browser storage and is not sent to the server. To change your preference, clear site data in your browser settings.\n\nIf you consented to analytics, anonymized visit data (pages viewed, referral source, device type) is processed by Google Analytics in accordance with its privacy policy.\n\nFor questions regarding data processing, message us on WhatsApp or call the phone number listed in the website footer.',
      ar: 'مسودة. يوضح ما يلي كيفية تعامل الموقع مع البيانات في الواقع. تم إعداد هذا النص من قبل المطور بناءً على التنفيذ الفعلي وهو ليس وثيقة قانونية — ويجب مراجعته وصياغته رسميًا بواسطة محامٍ قبل الإطلاق.\n\nالموقع عبارة عن كتالوج للمنتجات. لا يحتوي على نماذج تواصل، أو تسجيل، أو حساب مستخدم، أو إتمام طلبات الشراء، لذلك نحن لا نطلب أو نخزن اسمك أو رقم هاتفك أو عنوانك أو بيانات الدفع الخاصة بك.\n\nتفتح أزرار "التواصل عبر WhatsApp" برنامج المراسلة وتعيد توجيهك إلى خدمة تابعة لجهة خارجية. تجري المراسلات اللاحقة في WhatsApp وتخضع لسياسة الخصوصية الخاصة بمالكها، شركة Meta. الموقع لا يستقبل ولا يحفظ محتوى هذه الرسائل.\n\nيستخدم الموقع ملفات تعريف الارتباط الفنية اللازمة لعمله: فهي تخزن معرف الجلسة وتحمي النماذج من تزوير الطلبات عبر المواقع. لا يمكن تعطيلها، فبدونها لن يعمل الموقع بشكل صحيح.\n\nيتم تمكين التحليلات فقط بموافقتك. في زيارتك الأولى، يظهر شريط يحتوي على خياري "قبول" و"رفض". لا يتم إرسال أي طلبات إلى خدمات التحليلات حتى يتم النقر على "قبول". يتم حفظ خيارك في التخزين المحلي للمتصفح ولا يتم نقله إلى الخادم. لتغيير قرارك، امسح بيانات الموقع في إعدادات المتصفح.\n\nإذا وافقت على التحليلات، تتم معالجة بيانات الزيارة المجهولة الهوية (الصفحات التي تمت زيارتها، مصدر الإحالة، نوع الجهاز) بواسطة خدمة Google Analytics وفقًا لسياسة الخصوصية الخاصة بها.\n\nللأسئلة المتعلقة بمعالجة البيانات، راسلنا عبر WhatsApp أو اتصل برقم الهاتف المدرج في تذييل الموقع.',
    },
  },
}
