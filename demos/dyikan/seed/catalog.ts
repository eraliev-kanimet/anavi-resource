import type { LocalizedLabel } from '@anavi/shared'

// Dictionary is deliberately minimal: tomatoes do not have technical specifications, and eight
// attribute groups would be artificial.

export interface DyikanShelf {
  slug: string
  name: LocalizedLabel
  description: LocalizedLabel
  children?: DyikanShelf[]
}

// Products live strictly in leaf categories, with root categories rendering the whole subtree:
// a section showing empty because products are placed in subcategories is broken, not honest.
export const DYIKAN_SHELVES: DyikanShelf[] = [
  {
    slug: 'ovoshchi-frukty',
    name: { ru: 'Овощи и фрукты', en: 'Fruits and vegetables', ar: 'خضار وفواكه' },
    description: {
      ru: 'Привозим с базы дважды в день: с утра — зелень и ягода, к обеду — всё остальное.',
      en: 'Delivered fresh twice daily: morning greens and berries, afternoon general produce.',
      ar: 'نستلم المنتجات الطازجة مرتين يومياً: صباحاً الخضار الورقية والتوت، وظهراً بقية المنتجات.',
    },
    children: [
      {
        slug: 'ovoshchi',
        name: { ru: 'Овощи и зелень', en: 'Vegetables and herbs', ar: 'خضار وأعشاب' },
        description: {
          ru: 'Местное с чуйских огородов и то, что не растёт у нас, — из Узбекистана и Китая.',
          en: 'Local produce from Chuy farms alongside Uzbek and Chinese imports.',
          ar: 'محاصيل محلية من مزارع تشوي، بالإضافة إلى المستورد من أوزبكستان والصين.',
        },
      },
      {
        slug: 'frukty',
        name: { ru: 'Фрукты и ягоды', en: 'Fruits and berries', ar: 'فواكه وتوت' },
        description: {
          ru: 'Сезонное с юга и круглогодичное из-за границы: бананы, цитрус, ягода.',
          en: 'Seasonal southern fruits and year-round imports: bananas, citrus, berries.',
          ar: 'فواكه جنوبية موسمية ومستوردات طوال العام: موز، حمضيات وتوت.',
        },
      },
    ],
  },
  {
    slug: 'myaso-ptica',
    name: { ru: 'Мясо и птица', en: 'Meat and poultry', ar: 'لحوم ودواجن' },
    description: {
      ru: 'Забой утренний, всё халал. Рубим при вас, вес округляем в вашу сторону.',
      en: 'Fresh morning slaughter, certified halal. Custom butchering with weight rounded in your favor.',
      ar: 'ذبح صباحي طازج، حلال 100%. تقطيع وتجهيز أمامك مع تقريب الوزن لصالحك.',
    },
    children: [
      {
        slug: 'myaso',
        name: { ru: 'Говядина и баранина', en: 'Beef and lamb', ar: 'لحم بقري وضأن' },
        description: {
          ru: 'Отрубы с чуйских и нарынских хозяйств: от гуляша до вырезки и рибая.',
          en: 'Cuts from Chuy and Naryn farms: from stew meat to tenderloin and ribeye.',
          ar: 'قطعيات من مزارع تشوي ونارين: من لحم الطهي إلى الفيليه والريب آي.',
        },
      },
      {
        slug: 'ptica',
        name: { ru: 'Птица', en: 'Poultry', ar: 'دواجن وطيور' },
        description: {
          ru: 'Курица, индейка, утка и перепёлка — охлаждённые, не мороженые.',
          en: 'Chicken, turkey, duck, and quail — chilled, never frozen.',
          ar: 'دجاج، رومي، بط وسمان — مبرد وطازج، غير مجمد.',
        },
      },
    ],
  },
  {
    slug: 'kolbasy',
    name: {
      ru: 'Колбасы и деликатесы',
      en: 'Sausages and deli meats',
      ar: 'نقانق ومشهيات ولحوم باردة',
    },
    description: {
      ru: 'Колбасный цех «Энесай» и конская казы домашнего посола.',
      en: 'Enesai artisan sausages and homemade dry-cured horsemeat kazy.',
      ar: 'منتجات لحوم إنيساي وقازي لحم الخيل المملح بيتياً.',
    },
  },
  {
    slug: 'ryba',
    name: { ru: 'Рыба и морепродукты', en: 'Fish and seafood', ar: 'أسماك ومأكولات بحرية' },
    description: {
      ru: 'Иссык-кульская форель, дальневосточная красная рыба, креветка и мидии.',
      en: 'Issyk-Kul mountain trout, Far Eastern salmon, shrimp, and mussels.',
      ar: 'السلمون المرقط من بحيرة إيسيك كول الجبلية، سلمون الشرق الأقصى، روبيان وبلح البحر.',
    },
  },
  {
    slug: 'molochnoe',
    name: { ru: 'Молоко, сыр, яйца', en: 'Dairy, cheese, eggs', ar: 'حليب وأجبان وبيض' },
    description: {
      ru: 'Молочка местных заводов и яйцо с фермы — привоз каждое утро.',
      en: 'Local dairy and farm-fresh eggs delivered every morning.',
      ar: 'ألبان المصانع المحلية وبيض طازج من المزرعة — توريد يومي كل صباح.',
    },
    children: [
      {
        slug: 'moloko',
        name: {
          ru: 'Молоко и кисломолочное',
          en: 'Milk and cultured dairy',
          ar: 'حليب ومنتجات الألبان المخمرة',
        },
        description: {
          ru: 'Молоко, кефир, сметана, творог и йогурты «Умут» и «Ак-Сүт».',
          en: 'Milk, kefir, sour cream, quark, and yogurts from Umut and Ak-Sut.',
          ar: 'حليب، كفير، قشطة رائبة، قريش وزبادي من أوموت وآك سوت.',
        },
      },
      {
        slug: 'syry',
        name: { ru: 'Сыры', en: 'Cheese', ar: 'أجبان' },
        description: {
          ru: 'Местная брынза и сулугуни, белорусские твёрдые, итальянские выдержанные.',
          en: 'Local brynza and sulguni, Belarusian hard cheeses, aged Italian varieties.',
          ar: 'جبنة برينزا وسولوغوني محلية، أجبان بيلاروسية صلبة، وأجبان إيطالية معتقة.',
        },
      },
      {
        slug: 'maslo-yajca',
        name: { ru: 'Масло и яйца', en: 'Butter and eggs', ar: 'زبدة وبيض' },
        description: {
          ru: 'Сливочное и топлёное масло, яйцо куриное и перепелиное.',
          en: 'Sweet cream and clarified butter, chicken and quail eggs.',
          ar: 'زبدة وسمن مصفى، وبيض دجاج وسمان.',
        },
      },
    ],
  },
  {
    slug: 'hleb',
    name: { ru: 'Хлеб и выпечка', en: 'Bread and pastries', ar: 'خبز ومعجنات' },
    description: {
      ru: 'Пекарня печёт четыре раза в сутки, тандырные лепёшки — с шести утра.',
      en: 'Fresh batches baked 4 times daily, hot tandoor flatbreads from 6:00 AM.',
      ar: 'المخبز يخبز أربع مرات يومياً، وخبز التنور الساخن يبدأ من السادسة صباحاً.',
    },
  },
  {
    slug: 'bakaleya',
    name: { ru: 'Бакалея', en: 'Groceries', ar: 'بقالة ومواد تموينية' },
    description: {
      ru: 'Крупы, макароны, мука, сахар, масло, чай и специи — на развес и в пачках.',
      en: 'Grains, pasta, flour, sugar, oil, tea, and spices — bulk or packaged.',
      ar: 'حبوب، معكرونة، دقيق، سكر، زيت، شاي وبهارات — بالكيلو أو بالعبوات.',
    },
    children: [
      {
        slug: 'krupy',
        name: { ru: 'Крупы и макароны', en: 'Grains and pasta', ar: 'حبوب ومعكرونة' },
        description: {
          ru: 'Гречка, рис, чечевица, нут и макароны — берите килограммом или мешком.',
          en: 'Buckwheat, rice, lentils, chickpeas, and pasta by the kilo or sack.',
          ar: 'حنطة سوداء، أرز، عدس، حمص ومعكرونة — بالكيلوغرام أو بالكيس.',
        },
      },
      {
        slug: 'muka-sahar',
        name: {
          ru: 'Мука, сахар, масло',
          en: 'Flour, sugar, cooking oil',
          ar: 'دقيق وسكر وزيت طهي',
        },
        description: {
          ru: 'То, что кончается первым и покупается сразу помногу.',
          en: 'Kitchen staples purchased in pantry-stocking quantities.',
          ar: 'الأساسيات المنزلية التي تُشترى بكميات وفيرة.',
        },
      },
      {
        slug: 'chaj-kofe',
        name: { ru: 'Чай, кофе, какао', en: 'Tea, coffee, cocoa', ar: 'شاي وقهوة وكاكاو' },
        description: {
          ru: 'Чёрный и зелёный лист, растворимый кофе и какао-порошок.',
          en: 'Loose black and green tea, instant coffee, and cocoa powder.',
          ar: 'شاي أسود وأخضر، قهوة سريعة الذوبان ومسحوق كاكاو.',
        },
      },
      {
        slug: 'specii',
        name: { ru: 'Специи', en: 'Spices', ar: 'بهارات وتوابل' },
        description: {
          ru: 'Молотые и целые, включая свою смесь для плова.',
          en: 'Whole and ground spices, including our signature pilaf blend.',
          ar: 'بهارات مطحونة وصحيحة، بما في ذلك خلطتنا الخاصة بالأرز البخاري.',
        },
      },
      {
        slug: 'orehi-suhofrukty',
        name: { ru: 'Орехи и сухофрукты', en: 'Nuts and dried fruits', ar: 'مكسرات وفواكه مجففة' },
        description: {
          ru: 'Грецкий орех с юга, курага из Ферганы, горный мёд с Суусамыра.',
          en: 'Southern walnuts, Fergana dried apricots, Suusamyr mountain honey.',
          ar: 'جوز من الجنوب، مشمش مجفف من فرغانة، وعسل جبلي من سوسامير.',
        },
      },
    ],
  },
  {
    slug: 'sousy-konservy',
    name: { ru: 'Соусы и консервы', en: 'Sauces and canned goods', ar: 'صلصات ومعلبات' },
    description: {
      ru: 'Кетчуп, майонез, соевый соус, банки с овощами и рыбой.',
      en: 'Ketchup, mayonnaise, soy sauce, canned vegetables and fish.',
      ar: 'كاتشب، مايونيز، صلصة صويا، ومعلبات خضار وأسماك.',
    },
  },
  {
    slug: 'zamorozka',
    name: { ru: 'Замороженные продукты', en: 'Frozen foods', ar: 'أغذية ومجمدات' },
    description: {
      ru: 'Пельмени и манты лепим сами, остальное держим при минус восемнадцати.',
      en: 'Handmade pelmeni and manti dumplings, stored at -18°C.',
      ar: 'بيلميني ومانتي صناعة يدوية، وبقية المنتجات محفوظة عند 18 درجة تحت الصفر.',
    },
  },
  {
    slug: 'sladosti',
    name: { ru: 'Сладости и снеки', en: 'Sweets and snacks', ar: 'حلويات ومقرمشات' },
    description: {
      ru: 'Шоколад, конфеты, печенье, восточные сладости и то, что берут к чаю.',
      en: 'Chocolates, candies, biscuits, oriental sweets, and tea treats.',
      ar: 'شوكولاتة، سكاكر، بسكويت، حلويات شرقية وكل ما يقدم مع الشاي.',
    },
  },
  {
    slug: 'napitki',
    name: { ru: 'Напитки', en: 'Beverages', ar: 'مشروبات' },
    description: {
      ru: 'Вода, соки, лимонады, квас и компот — холодильник у входа.',
      en: 'Water, juices, lemonades, kvas, and fruit compotes.',
      ar: 'مياه، عصائر، ليموناضة، كفاس وكومبوت — في الثلاجة عند المدخل.',
    },
  },
  {
    slug: 'bytovaya-himiya',
    name: {
      ru: 'Бытовая химия и гигиена',
      en: 'Household and personal care',
      ar: 'منظفات منزلية وعناية شخصية',
    },
    description: {
      ru: 'Всё, за чем возвращаются с полдороги: порошок, паста, бумага, пакеты.',
      en: 'Everyday household essentials: laundry detergent, toothpaste, paper goods.',
      ar: 'مستلزمات المنزل الأساسية: مسحوق غسيل، معجون أسنان، مناديل وأكياس.',
    },
  },
]

export interface DyikanPropertyValue {
  slug: string
  label: LocalizedLabel
}

export interface DyikanProperty {
  slug: string
  name: LocalizedLabel
  isFilterable: boolean
  isMultivalued?: boolean
  values: DyikanPropertyValue[]
}

// Packaging is the only property dividing products into variants, and the only non-filterable one:
// filtering across the whole catalog for "what is sold in 1kg packs" is meaningless.
export const DYIKAN_PROPERTIES: DyikanProperty[] = [
  {
    slug: 'fasovka',
    name: { ru: 'Фасовка', en: 'Packaging size', ar: 'حجم العبوة' },
    isFilterable: false,
    values: [
      { slug: '50-g', label: { ru: '50 г', en: '50 g', ar: '50 غ' } },
      { slug: '100-g', label: { ru: '100 г', en: '100 g', ar: '100 غ' } },
      { slug: '250-g', label: { ru: '250 г', en: '250 g', ar: '250 غ' } },
      { slug: '500-g', label: { ru: '500 г', en: '500 g', ar: '500 غ' } },
      { slug: '1-kg', label: { ru: '1 кг', en: '1 kg', ar: '1 كغ' } },
      { slug: '2-kg', label: { ru: '2 кг', en: '2 kg', ar: '2 كغ' } },
      { slug: '3-kg', label: { ru: '3 кг', en: '3 kg', ar: '3 كغ' } },
      { slug: '5-kg', label: { ru: '5 кг', en: '5 kg', ar: '5 كغ' } },
      { slug: '0-5-l', label: { ru: '0,5 л', en: '0.5 L', ar: '0.5 لتر' } },
      { slug: '1-l', label: { ru: '1 л', en: '1 L', ar: '1 لتر' } },
      { slug: '2-l', label: { ru: '2 л', en: '2 L', ar: '2 لتر' } },
      { slug: 'sht', label: { ru: 'шт', en: 'pcs', ar: 'قطعة' } },
      { slug: '10-sht', label: { ru: '10 шт', en: '10 pcs', ar: '10 قطع' } },
      { slug: '30-sht', label: { ru: '30 шт', en: '30 pcs', ar: '30 قطعة' } },
      { slug: 'puchok', label: { ru: 'пучок', en: 'bunch', ar: 'حزمة' } },
      { slug: 'banka', label: { ru: 'банка', en: 'jar', ar: 'مرطبان' } },
      { slug: 'upakovka', label: { ru: 'упаковка', en: 'pack', ar: 'عبوة' } },
    ],
  },
  {
    slug: 'strana',
    name: { ru: 'Страна', en: 'Country', ar: 'بلد المنشأ' },
    isFilterable: true,
    values: [
      { slug: 'kyrgyzstan', label: { ru: 'Кыргызстан', en: 'Kyrgyzstan', ar: 'قيرغيزستان' } },
      { slug: 'kazahstan', label: { ru: 'Казахстан', en: 'Kazakhstan', ar: 'كازاخستان' } },
      { slug: 'uzbekistan', label: { ru: 'Узбекистан', en: 'Uzbekistan', ar: 'أوزبكستان' } },
      { slug: 'rossiya', label: { ru: 'Россия', en: 'Russia', ar: 'روسيا' } },
      { slug: 'belarus', label: { ru: 'Беларусь', en: 'Belarus', ar: 'بيلاروسيا' } },
      { slug: 'turciya', label: { ru: 'Турция', en: 'Turkey', ar: 'تركيا' } },
      { slug: 'iran', label: { ru: 'Иран', en: 'Iran', ar: 'إيران' } },
      { slug: 'kitaj', label: { ru: 'Китай', en: 'China', ar: 'الصين' } },
      { slug: 'ekvador', label: { ru: 'Эквадор', en: 'Ecuador', ar: 'الإكوادور' } },
      { slug: 'italiya', label: { ru: 'Италия', en: 'Italy', ar: 'إيطاليا' } },
      { slug: 'ispaniya', label: { ru: 'Испания', en: 'Spain', ar: 'إسبانيا' } },
    ],
  },
  {
    slug: 'brend',
    name: { ru: 'Производитель', en: 'Producer', ar: 'الشركة المصنعة' },
    isFilterable: true,
    values: [
      { slug: 'umut', label: { ru: 'Умут', en: 'Umut', ar: 'أوموت' } },
      { slug: 'ak-sut', label: { ru: 'Ак-Сүт', en: 'Ak-Sut', ar: 'آك سوت' } },
      { slug: 'shoro', label: { ru: 'Шоро', en: 'Shoro', ar: 'شورو' } },
      { slug: 'artezian', label: { ru: 'Артезиан', en: 'Artezian', ar: 'أرتيزيان' } },
      { slug: 'kant', label: { ru: 'Кант', en: 'Kant', ar: 'كانت' } },
      { slug: 'dan-azyk', label: { ru: 'Дан Азык', en: 'Dan Azyk', ar: 'دان آزيك' } },
      { slug: 'enesaj', label: { ru: 'Энесай', en: 'Enesai', ar: 'إنيساي' } },
      { slug: 'too-ash', label: { ru: 'Тоо-Аш', en: 'Too-Ash', ar: 'تو آش' } },
      { slug: 'riha', label: { ru: 'Риха', en: 'Riha', ar: 'ريخا' } },
      { slug: 'kulikovsky', label: { ru: 'Куликовский', en: 'Kulikovsky', ar: 'كوليكوفسكي' } },
    ],
  },
  {
    slug: 'osobennosti',
    name: { ru: 'Особенности', en: 'Features', ar: 'المميزات' },
    isFilterable: true,
    isMultivalued: true,
    values: [
      { slug: 'mestnoe', label: { ru: 'Местное', en: 'Local', ar: 'محلي' } },
      { slug: 'fermerskoe', label: { ru: 'Фермерское', en: 'Farm fresh', ar: 'طازج من المزرعة' } },
      { slug: 'organik', label: { ru: 'Органик', en: 'Organic', ar: 'عضوي' } },
      { slug: 'bez-sahara', label: { ru: 'Без сахара', en: 'Sugar free', ar: 'خالٍ من السكر' } },
      { slug: 'gost', label: { ru: 'ГОСТ', en: 'GOST standard', ar: 'مطابق للمواصفات القياسية' } },
    ],
  },
]

export const DYIKAN_TYPE = { slug: 'produkt', name: { ru: 'Продукт', en: 'Product', ar: 'منتج' } }
export const DYIKAN_GROUP = {
  slug: 'main',
  name: { ru: 'О продукте', en: 'About product', ar: 'عن المنتج' },
}
