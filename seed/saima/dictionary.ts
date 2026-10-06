import type { LocalizedLabel } from '@anavi/shared'

export interface SaimaValue {
  slug: string
  label: LocalizedLabel
  swatch?: string
}

export interface SaimaProperty {
  slug: string
  name: LocalizedLabel
  kind: 'enum' | 'color' | 'number' | 'bool'
  group: string
  unit?: LocalizedLabel
  values?: SaimaValue[]
  isFilterable?: boolean
  isMultivalued?: boolean
  showInCard?: boolean
  filterWidget?: 'checkbox' | 'range' | 'boolean'
}

export const SAIMA_GROUPS = [
  { slug: 'osnovnoe', name: { ru: 'Основное', en: 'General', ar: 'الأساسية' } },
  { slug: 'material', name: { ru: 'Материал', en: 'Material', ar: 'القماش والمواد' } },
]

// Size is non-filterable by design: searching the entire catalog for "what is available in size 48" is
// meaningless — size is selected on the product card. Russian numeric sizing rather than letter sizes:
// wholesalers order by size runs and invoices list numeric sizes.
export const SAIMA_PROPERTIES: SaimaProperty[] = [
  {
    slug: 'razmer',
    name: { ru: 'Размер', en: 'Size', ar: 'المقاس' },
    kind: 'enum',
    group: 'osnovnoe',
    isFilterable: false,
    values: [
      { slug: '42', label: { ru: '42', en: '42', ar: '42' } },
      { slug: '44', label: { ru: '44', en: '44', ar: '44' } },
      { slug: '46', label: { ru: '46', en: '46', ar: '46' } },
      { slug: '48', label: { ru: '48', en: '48', ar: '48' } },
      { slug: '50', label: { ru: '50', en: '50', ar: '50' } },
      { slug: '52', label: { ru: '52', en: '52', ar: '52' } },
      { slug: '54', label: { ru: '54', en: '54', ar: '54' } },
    ],
  },
  {
    slug: 'cvet',
    name: { ru: 'Цвет', en: 'Color', ar: 'اللون' },
    kind: 'color',
    group: 'osnovnoe',
    showInCard: true,
    values: [
      { slug: 'chernyj', label: { ru: 'Чёрный', en: 'Black', ar: 'أسود' }, swatch: '#1c1c1c' },
      { slug: 'grafit', label: { ru: 'Графит', en: 'Graphite', ar: 'غرافيت' }, swatch: '#4a4f55' },
      {
        slug: 'seryj-melanzh',
        label: { ru: 'Серый меланж', en: 'Heather grey', ar: 'رمادي ميلانج' },
        swatch: '#9aa0a3',
      },
      { slug: 'belyj', label: { ru: 'Белый', en: 'White', ar: 'أبيض' }, swatch: '#ffffff' },
      {
        slug: 'off-white',
        label: { ru: 'Молочный', en: 'Off-white', ar: 'أوف وايت (حليبي)' },
        swatch: '#f2efe9',
      },
      {
        slug: 'ovsyanyj',
        label: { ru: 'Овсяный', en: 'Oatmeal', ar: 'شوفاني (بيج فاتح)' },
        swatch: '#d8cdb8',
      },
      { slug: 'pesochnyj', label: { ru: 'Песочный', en: 'Sand', ar: 'رملي' }, swatch: '#d9c3a5' },
      {
        slug: 'shalfej',
        label: { ru: 'Шалфей', en: 'Sage', ar: 'ميرمية (أخضر هادئ)' },
        swatch: '#a8b09a',
      },
      {
        slug: 'indigo',
        label: { ru: 'Индиго', en: 'Indigo', ar: 'نيلي (إنديجو)' },
        swatch: '#35495e',
      },
      {
        slug: 'bordo',
        label: { ru: 'Бордо', en: 'Burgundy', ar: 'بورغندي (خمري)' },
        swatch: '#6b2333',
      },
    ],
  },
  {
    slug: 'tkan',
    name: { ru: 'Ткань', en: 'Fabric', ar: 'نوع القماش' },
    kind: 'enum',
    group: 'material',
    showInCard: true,
    values: [
      { slug: 'krep', label: { ru: 'Креп вискозный', en: 'Viscose crepe', ar: 'كريب فيسكوز' } },
      { slug: 'tensel', label: { ru: 'Тенсел', en: 'Tencel', ar: 'تنسل (Tencel)' } },
      { slug: 'len', label: { ru: 'Лён', en: 'Linen', ar: 'كتان طبيعي' } },
      { slug: 'poplin', label: { ru: 'Поплин', en: 'Poplin', ar: 'بوبلين' } },
      { slug: 'denim', label: { ru: 'Деним', en: 'Denim', ar: 'جينز (دينيم)' } },
      { slug: 'ribana', label: { ru: 'Рибана', en: 'Rib knit', ar: 'ريبانا محبوكة' } },
      { slug: 'sherst', label: { ru: 'Шерстяной микс', en: 'Wool blend', ar: 'مزيج صوف' } },
      { slug: 'shelk', label: { ru: 'Шёлк', en: 'Silk', ar: 'حرير طبيعي' } },
      { slug: 'gabardin', label: { ru: 'Габардин', en: 'Gabardine', ar: 'غاباردين' } },
      {
        slug: 'futer',
        label: { ru: 'Футер с начёсом', en: 'Fleece-backed French terry', ar: 'فوتر مبطن بالصوف' },
      },
      {
        slug: 'merinos',
        label: { ru: 'Мериносовый микс', en: 'Merino blend', ar: 'مزيج صوف ميرينو' },
      },
      { slug: 'tvil', label: { ru: 'Твил хлопковый', en: 'Cotton twill', ar: 'تويل قطني' } },
      { slug: 'satin', label: { ru: 'Креп-сатин', en: 'Crepe satin', ar: 'كريب ساتان' } },
      { slug: 'dzhersi', label: { ru: 'Джерси', en: 'Jersey', ar: 'جيرسي ناعم' } },
    ],
  },
  {
    slug: 'sostav',
    name: { ru: 'Состав', en: 'Composition', ar: 'تركيبة الخامة' },
    kind: 'enum',
    group: 'material',
    values: [
      { slug: 'viskoza-100', label: { ru: 'Вискоза 100%', en: '100% Viscose', ar: 'فيسكوز 100%' } },
      { slug: 'hlopok-100', label: { ru: 'Хлопок 100%', en: '100% Cotton', ar: 'قطن 100%' } },
      { slug: 'len-100', label: { ru: 'Лён 100%', en: '100% Linen', ar: 'كتان 100%' } },
      { slug: 'shelk-100', label: { ru: 'Шёлк 100%', en: '100% Silk', ar: 'حرير 100%' } },
      { slug: 'tensel-100', label: { ru: 'Тенсел 100%', en: '100% Tencel', ar: 'تنسل 100%' } },
      {
        slug: 'hlopok-elastan',
        label: {
          ru: 'Хлопок / эластан 95/5',
          en: '95% Cotton / 5% Elastane',
          ar: 'قطن / إيلاستين 95/5',
        },
      },
      {
        slug: 'sherst-pe',
        label: {
          ru: 'Шерсть / ПЭ 70/30',
          en: '70% Wool / 30% Polyester',
          ar: 'صوف / بوليستر 70/30',
        },
      },
      {
        slug: 'sherst-akril',
        label: {
          ru: 'Шерсть / акрил 50/50',
          en: '50% Wool / 50% Acrylic',
          ar: 'صوف / أكريليك 50/50',
        },
      },
    ],
  },
  {
    slug: 'plotnost',
    name: { ru: 'Плотность', en: 'Fabric density', ar: 'كثافة القماش' },
    kind: 'number',
    group: 'material',
    unit: { ru: 'г/м²', en: 'g/m²', ar: 'غ/م²' },
    filterWidget: 'range',
  },
  {
    slug: 'sezon',
    name: { ru: 'Сезон', en: 'Season', ar: 'الموسم' },
    kind: 'enum',
    group: 'osnovnoe',
    isMultivalued: true,
    values: [
      { slug: 'vesna', label: { ru: 'Весна', en: 'Spring', ar: 'الربيع' } },
      { slug: 'leto', label: { ru: 'Лето', en: 'Summer', ar: 'الصيف' } },
      { slug: 'osen', label: { ru: 'Осень', en: 'Autumn', ar: 'الخريف' } },
      { slug: 'zima', label: { ru: 'Зима', en: 'Winter', ar: 'الشتاء' } },
      {
        slug: 'bazovoe',
        label: { ru: 'Базовое', en: 'All-season essential', ar: 'أساسي لجميع الفصول' },
      },
    ],
  },
  {
    slug: 'dlina',
    name: { ru: 'Длина', en: 'Length', ar: 'الطول' },
    kind: 'enum',
    group: 'osnovnoe',
    values: [
      { slug: 'mini', label: { ru: 'Мини', en: 'Mini', ar: 'قصير (ميني)' } },
      { slug: 'midi', label: { ru: 'Миди', en: 'Midi', ar: 'متوسط (ميدي)' } },
      { slug: 'maksi', label: { ru: 'Макси', en: 'Maxi', ar: 'طويل (ماكسي)' } },
    ],
  },
  {
    slug: 'rukav',
    name: { ru: 'Рукав', en: 'Sleeve', ar: 'طول الكم' },
    kind: 'enum',
    group: 'osnovnoe',
    values: [
      { slug: 'bez-rukava', label: { ru: 'Без рукава', en: 'Sleeveless', ar: 'بدون أكمام (كت)' } },
      { slug: 'korotkij', label: { ru: 'Короткий', en: 'Short sleeve', ar: 'كم قصير' } },
      {
        slug: 'tri-chetverti',
        label: { ru: 'Три четверти', en: 'Three-quarter sleeve', ar: 'كم ثلاثة أرباع (3/4)' },
      },
      { slug: 'dlinnyj', label: { ru: 'Длинный', en: 'Long sleeve', ar: 'كم طويل' } },
    ],
  },
  {
    slug: 'posadka',
    name: { ru: 'Посадка', en: 'Rise', ar: 'ارتفاع الخصر' },
    kind: 'enum',
    group: 'osnovnoe',
    values: [
      { slug: 'vysokaya', label: { ru: 'Высокая', en: 'High rise', ar: 'خصر عالي' } },
      { slug: 'srednyaya', label: { ru: 'Средняя', en: 'Mid rise', ar: 'خصر متوسط' } },
    ],
  },
  {
    slug: 'podklad',
    name: { ru: 'Подклад', en: 'Lining', ar: 'البطانة' },
    kind: 'bool',
    group: 'material',
    filterWidget: 'boolean',
  },
  {
    slug: 'predmetov',
    name: { ru: 'Предметов в комплекте', en: 'Pieces in set', ar: 'عدد القطع في الطقم' },
    kind: 'number',
    group: 'osnovnoe',
    filterWidget: 'range',
  },
]

// Category shelf here is simultaneously catalog category and product type: dresses and jeans share few
// attributes, and the distinction between types is foundational. Shared core includes size, color, fabric,
// composition, and season; each type then specifies its own parameters.
const CORE = ['razmer', 'cvet', 'tkan', 'sostav', 'sezon']

export interface SaimaType {
  slug: string
  name: LocalizedLabel
  properties: string[]
}

export const SAIMA_TYPES: SaimaType[] = [
  {
    slug: 'platya',
    name: { ru: 'Платья', en: 'Dresses', ar: 'فساتين' },
    properties: [...CORE, 'dlina'],
  },
  {
    slug: 'bluzy',
    name: { ru: 'Блузы и рубашки', en: 'Blouses and shirts', ar: 'بلوزات وقمصان' },
    properties: [...CORE, 'rukav'],
  },
  {
    slug: 'bryuki',
    name: { ru: 'Брюки и юбки', en: 'Trousers and skirts', ar: 'بناطيل وتنانير' },
    properties: [...CORE, 'posadka', 'plotnost'],
  },
  {
    slug: 'trikotazh',
    name: { ru: 'Трикотаж', en: 'Knitwear', ar: 'تريكو وملابس محبوكة' },
    properties: [...CORE, 'plotnost'],
  },
  {
    slug: 'verhnyaya',
    name: { ru: 'Верхняя одежда', en: 'Outerwear', ar: 'ملابس خارجية ومعاطف' },
    properties: [...CORE, 'podklad'],
  },
  {
    slug: 'komplekty',
    name: { ru: 'Костюмы и комплекты', en: 'Suits and matching sets', ar: 'أطقم وبدلات' },
    properties: [...CORE, 'predmetov'],
  },
]
