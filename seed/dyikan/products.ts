import type { LocalizedLabel } from '@anavi/shared'

// Packaging works either as a property or as an axis: for single-package items it acts as a value,
// for multi-package items it becomes an option with pricing living on variants. Prices are in whole KGS;
// seed converts to minor units. Inventory stock is specified only where meaningful.

export interface DyikanPack {
  // Absent on a weighed good: there the price is per unit and the box does not exist. It was
  // mandatory while every good had one, and «1 кг» was a box only because there was nowhere else to
  // say how much a kilo costs.
  fasovka?: string
  price: number
  // If greater than current price — strikes through old price and displays a discount badge.
  old?: number
  // Zero is a valid state: grocery store does not trade on backorder.
  stock?: number
}

// Weighted item cut to order rather than sold prepackaged: price per kilogram, 100g increment, 500g minimum.
// Packaging is omitted entirely — "per kg" and "1 kg pack" have different semantic meanings.
export interface DyikanMeasure {
  unit: LocalizedLabel
  steps: number
  min: number
}

export interface DyikanProduct {
  slug: string
  category: string
  name: LocalizedLabel
  summary: LocalizedLabel
  text?: LocalizedLabel[]
  image: string
  country?: string
  brand?: string
  marks?: string[]
  // Weighted item: lacks fixed packaging; single pack price is interpreted as unit price.
  measure?: DyikanMeasure
  // Volume discount, where the shop gives one: read by quantity, not by a second variant. A ladder
  // replaced the packs of the weighed goods — «1 kg or 3 kg» could not express two, and a select
  // asking which of two boxes when both are the same tomato is a question about our data model.
  tiers?: { from: number; off: number }[]
  // One entry for a weighed good: the price is per unit and the quantity is taken in steps.
  packs: DyikanPack[]
  hit?: boolean
}

// Meat, poultry, and fish are cut in front of customer: price per kg, 100g step, 500g minimum cut.
const KG: DyikanMeasure = { unit: { ru: 'кг', en: 'kg', ar: 'كغ' }, steps: 10, min: 5 }

// Eggs are counted, not weighed, and the counter starts at ten: nobody walks out of a grocery with
// three. Whole units, so the step is one — a shopper wanting a dozen takes a dozen.
const PIECE: DyikanMeasure = { unit: { ru: 'шт', en: 'pcs', ar: 'قطعة' }, steps: 1, min: 10 }

// Vegetables and greens
export const DYIKAN_PRODUCTS: DyikanProduct[] = [
  {
    slug: 'pomidory-rozovye',
    category: 'ovoshchi',
    name: { ru: 'Помидоры розовые', en: 'Pink tomatoes', ar: 'طماطم وردية' },
    summary: {
      ru: 'Мясистые, с чуйских теплиц, дозревают на кусте — режутся, а не текут.',
      en: 'Fleshy, from Chuy greenhouses, vine-ripened — slice cleanly without leaking.',
      ar: 'طماطم لحمية من مزارع تشوي، تنضج على الشتلة وتقطع بشرائح متماسكة.',
    },
    text: [
      {
        ru: 'Розовый помидор берут не за вид, а за вкус: у него тонкая кожица, мало семян и та самая сладость, которой нет у плотного «магазинного» сорта.',
        en: 'Pink tomatoes are chosen for flavor rather than appearance: thin skin, few seeds, and rich natural sweetness missing in dense commercial varieties.',
        ar: 'تُختار الطماطم الوردية لمذاقها الرائع: قشرة رقيقة، بذور قليلة، وحلاوة طبيعية غنية لا تجدها في الأصناف التجارية.',
      },
      {
        ru: 'Привозим с теплиц под Сокулуком через день. Лежать долго не умеет — берите столько, сколько съедите за неделю.',
        en: 'Delivered every other day from Sokuluk greenhouses. Best enjoyed fresh — buy what you plan to eat within a week.',
        ar: 'نستلمها من مزارع سوكولوك يوماً بعد يوم. يُفضل استهلاكها طازجة خلال أسبوع.',
      },
    ],
    image: 'tomato-pink.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'fermerskoe'],
    measure: KG,
    tiers: [{ from: 30, off: 7 }],
    packs: [
      {
        price: 165,
      },
    ],
    hit: true,
  },
  {
    slug: 'ogurcy-dlinnoplodnye',
    category: 'ovoshchi',
    name: { ru: 'Огурцы длинноплодные', en: 'Long cucumbers', ar: 'خيار طويل' },
    summary: {
      ru: 'Тепличные, тонкокожие, без горечи — на салат и на засолку не годятся.',
      en: 'Greenhouse-grown, thin-skinned, non-bitter — ideal for fresh salads.',
      ar: 'خيار بيوت محمية، بقشرة رقيقة وبدون مرارة — مثالي للسلطات الطازجة.',
    },
    image: 'cucumber-long.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 8 }],
    packs: [
      {
        price: 120,
      },
    ],
  },
  {
    slug: 'kartofel',
    category: 'ovoshchi',
    name: { ru: 'Картофель', en: 'Potatoes', ar: 'بطاطس' },
    summary: {
      ru: 'Талаcский, рассыпчатый — на пюре и в суп; мешок дешевле почти вдвое.',
      en: 'Talas floury potatoes — great for mashed potatoes and soups; 5 kg sack saves nearly half.',
      ar: 'بطاطس طلاسية نشوية — للهرس والشوربة، والكيس الكبير أرخص بمرتين تقريباً.',
    },
    text: [
      {
        ru: 'Талас — картофельный район, и разница между талаcским и привозным видна на сковороде: этот держит форму и не темнеет на срезе.',
        en: 'Talas is renowned for potato farming; the difference is clear in cooking: holds its shape well and never darkens when sliced.',
        ar: 'طلاس منطقة زراعة البطاطس، والفرق بين المحلية والمستوردة يظهر في المقلاة: تحافظ على شكلها ولا تسودّ عند التقطيع.',
      },
      {
        ru: 'Пятикилограммовый мешок берут раз в две недели, и это самая частая покупка на рынке.',
        en: 'A 5 kg sack is our most popular market staple, typically restocked every two weeks.',
        ar: 'كيس الخمسة كيلوغرامات يُشترى مرة كل أسبوعين، وهو الأكثر طلباً في السوق.',
      },
    ],
    image: 'potato.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [
      { from: 30, off: 12 },
      { from: 50, off: 15 },
    ],
    packs: [
      {
        price: 34,
      },
    ],
    hit: true,
  },
  {
    slug: 'luk-repchatyj',
    category: 'ovoshchi',
    name: { ru: 'Лук репчатый', en: 'Yellow onions', ar: 'بصل أصفر' },
    summary: {
      ru: 'Жёлтый, острый, сухая шелуха — лежит месяцами и не прорастает.',
      en: 'Yellow, pungent, dry husk — keeps for months without sprouting.',
      ar: 'بصل أصفر حاد النكهة بقشرة جافة — يُخزَّن أشهراً بدون أن ينبت.',
    },
    image: 'onion.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 11 }],
    packs: [
      {
        price: 30,
      },
    ],
  },
  {
    slug: 'luk-krasnyj',
    category: 'ovoshchi',
    name: { ru: 'Лук красный', en: 'Red onions', ar: 'بصل أحمر' },
    summary: {
      ru: 'Сладкий салатный — не жжёт и не перебивает остальное в тарелке.',
      en: 'Sweet salad onion — mild and crisp without overpowering other dish flavors.',
      ar: 'بصل أحمر حلو للسلطات — لا يلسع ولا يطغى على بقية أطباق المائدة.',
    },
    image: 'onion-red.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 11 }],
    packs: [
      {
        price: 45,
      },
    ],
  },
  {
    slug: 'morkov',
    category: 'ovoshchi',
    name: { ru: 'Морковь', en: 'Carrots', ar: 'جزر' },
    summary: {
      ru: 'Мытая, ровная, сладкая — на плов, на суп и детям погрызть.',
      en: 'Juicy, washed, sweet — suitable for pilaf, salads, and cooking.',
      ar: 'جزر مغسول متجانس وحلو — للبلوف والشوربة، ويُقضم طازجاً للأطفال.',
    },
    image: 'carrot.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 12 }],
    packs: [
      {
        price: 40,
      },
    ],
  },
  {
    slug: 'kapusta-belokochannaya',
    category: 'ovoshchi',
    name: { ru: 'Капуста белокочанная', en: 'White cabbage', ar: 'ملفوف أبيض' },
    summary: {
      ru: 'Плотный кочан, сочный лист — на щи, на голубцы и под засолку.',
      en: 'Dense tight head with thin leaves — tender for salads, ideal for braising.',
      ar: 'ملفوف بلدي مقرمش وممتلئ بالعصارة — للسلطات والطهي والتخليل.',
    },
    image: 'cabbage.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 11 }],
    packs: [
      {
        price: 32,
      },
    ],
  },
  {
    slug: 'kapusta-cvetnaya',
    category: 'ovoshchi',
    name: { ru: 'Капуста цветная', en: 'Cauliflower', ar: 'قرنبيط' },
    summary: {
      ru: 'Белые плотные соцветия без желтизны — в кляр или на пару.',
      en: 'Dense snow-white florets without yellowing — perfect for batter frying or steaming.',
      ar: 'زهيرات قرنبيط بيضاء مكتنزة بدون اصفرار — للقلي بالعجينة أو الطهي بالبخار.',
    },
    image: 'cauliflower.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 145,
      },
    ],
  },
  {
    slug: 'brokkoli',
    category: 'ovoshchi',
    name: { ru: 'Брокколи', en: 'Broccoli', ar: 'بروكلي' },
    summary: {
      ru: 'Тугие тёмно-зелёные головки — на пару четыре минуты, и всё.',
      en: 'Tight dark-green florets — steam for 4 minutes to tender perfection.',
      ar: 'زهرات بروكلي خضراء داكنة مقرمشة — للطهي بالبخار والشوربات.',
    },
    image: 'broccoli.webp',
    country: 'kitaj',
    packs: [
      {
        fasovka: '1-kg',
        price: 210,
      },
    ],
  },
  {
    slug: 'svyokla',
    category: 'ovoshchi',
    name: { ru: 'Свёкла', en: 'Beets', ar: 'شمندر (بنجر)' },
    summary: {
      ru: 'Тёмная, без белых колец — на борщ, винегрет и селёдку под шубой.',
      en: 'Deep ruby beets without white rings — essential for borscht and salads.',
      ar: 'شمندر داكن بدون حلقات بيضاء — لحساء البورشت والسلطة والرنجة تحت الفرو.',
    },
    image: 'beetroot.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 10 }],
    packs: [
      {
        price: 35,
      },
    ],
  },
  {
    slug: 'baklazhany',
    category: 'ovoshchi',
    name: { ru: 'Баклажаны', en: 'Eggplants', ar: 'باذنجان' },
    summary: {
      ru: 'Молодые, с блестящей кожей — горечи нет, вымачивать не надо.',
      en: 'Glossy, dark purple, firm flesh without excess bitterness.',
      ar: 'باذنجان فتي لامع القشرة بدون مرارة — لا حاجة للنقع قبل الطهي.',
    },
    image: 'eggplant.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 95,
      },
    ],
  },
  {
    slug: 'kabachki',
    category: 'ovoshchi',
    name: { ru: 'Кабачки', en: 'Zucchini', ar: 'كوسا' },
    summary: {
      ru: 'Молодые, с мягкой кожурой — чистить не нужно, семечек ещё нет.',
      en: 'Young, small, with thin tender skin and unformed seeds.',
      ar: 'كوسا فتية رقيقة القشرة — لا حاجة للتقشير، وبذورها لم تتكوّن بعد.',
    },
    image: 'zucchini.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 75,
      },
    ],
  },
  {
    slug: 'tykva',
    category: 'ovoshchi',
    name: { ru: 'Тыква', en: 'Butternut squash', ar: 'قرع (يقطين)' },
    summary: {
      ru: 'Мускатная, оранжевая до сердцевины — сладкая, на кашу и запекание.',
      en: 'Sweet butternut squash with vibrant orange flesh — ideal for porridge and roasting.',
      ar: 'قرع مسكاتي حلو، برتقالي حتى القلب — للعصيدة والخبز في الفرن.',
    },
    image: 'pumpkin.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 45,
      },
    ],
  },
  {
    slug: 'chesnok',
    category: 'ovoshchi',
    name: { ru: 'Чеснок', en: 'Garlic', ar: 'ثوم' },
    summary: {
      ru: 'Местный, злой, с крупным зубком — не китайский пресный.',
      en: 'Local purple garlic — sharp, aromatic, tight whole heads.',
      ar: 'ثوم محلي حاد النكهة بفصوص كبيرة — وليس الصيني الخفيف الطعم.',
    },
    image: 'garlic.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 10, off: 8 }],
    packs: [
      {
        price: 260,
      },
    ],
  },
  {
    slug: 'imbir',
    category: 'ovoshchi',
    name: { ru: 'Имбирь', en: 'Ginger root', ar: 'زنجبيل' },
    summary: {
      ru: 'Свежий корень с гладкой кожей — в чай, в маринад и в вок.',
      en: 'Fresh smooth-skinned ginger root — great for tea, marinades, and stir-fries.',
      ar: 'جذر زنجبيل طازج أملس القشرة — للشاي والتتبيلة والمقالي السريعة.',
    },
    image: 'ginger.webp',
    country: 'kitaj',
    packs: [
      {
        fasovka: '250-g',
        price: 95,
      },
    ],
  },
  {
    slug: 'perec-chili',
    category: 'ovoshchi',
    name: { ru: 'Перец чили', en: 'Fresh chili peppers', ar: 'فلفل حار طازج' },
    summary: {
      ru: 'Острый стручок, свежий — режется в лагман и в маринад.',
      en: 'Hot fresh pepper pods — sliced into lagman noodle soups and spicy marinades.',
      ar: 'قرون فلفل حار طازج — تُقطّع في اللغمان والتتبيلة الحارة.',
    },
    image: 'chili.webp',
    country: 'uzbekistan',
    packs: [
      {
        fasovka: '250-g',
        price: 65,
      },
    ],
  },
  {
    slug: 'redis',
    category: 'ovoshchi',
    name: { ru: 'Редис', en: 'Radishes', ar: 'فجل أحمر' },
    summary: {
      ru: 'Хрусткий, без пустот — первый весенний овощ на этом прилавке.',
      en: 'Crispy, solid, peppery radishes — prime early springtime salad vegetable.',
      ar: 'فجل أحمر مقرمش بدون فراغات — أول خضار الربيع على هذه الطاولة.',
    },
    image: 'radish.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 60,
      },
    ],
  },
  {
    slug: 'salat-listovoj',
    category: 'ovoshchi',
    name: { ru: 'Салат листовой', en: 'Living butterhead lettuce', ar: 'خس ورقي' },
    summary: {
      ru: 'Живой кочан с корнем — в стакане воды стоит неделю.',
      en: 'Fresh living lettuce head with roots attached — stays fresh in a glass of water for a week.',
      ar: 'رأس خس طازج بجذوره — يبقى طازجاً أسبوعاً في كوب ماء.',
    },
    image: 'lettuce.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'sht',
        price: 55,
      },
    ],
  },
  {
    slug: 'shpinat',
    category: 'ovoshchi',
    name: { ru: 'Шпинат', en: 'Fresh spinach', ar: 'سبانخ' },
    summary: {
      ru: 'Молодой лист без грубых черешков — в омлет и в тесто.',
      en: 'Tender baby spinach leaves without coarse stems — great in omelets and pastry dough.',
      ar: 'أوراق سبانخ فتية بدون سيقان خشنة — للعجة والعجين.',
    },
    image: 'spinach.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'puchok',
        price: 45,
      },
    ],
  },
  {
    slug: 'ukrop',
    category: 'ovoshchi',
    name: { ru: 'Укроп', en: 'Fresh dill', ar: 'شبت طازج' },
    summary: {
      ru: 'Резаный утром пучок — пахнет за два шага от прилавка.',
      en: 'Fresh morning cut — lush green bunch with strong fragrant aroma.',
      ar: 'باقة شبت مقطوفة صباحاً — تُشمّ رائحتها من بعيد عن الطاولة.',
    },
    image: 'dill.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'puchok',
        price: 20,
      },
    ],
  },
  {
    slug: 'petrushka',
    category: 'ovoshchi',
    name: { ru: 'Петрушка', en: 'Fresh parsley', ar: 'بقدونس طازج' },
    summary: {
      ru: 'Тугой пучок с крепким стеблем — не вянет к вечеру.',
      en: 'Bright green curly and flat parsley — crisp leaves, morning harvest.',
      ar: 'باقة بقدونس متماسكة بساق قوي — لا تذبل حتى المساء.',
    },
    image: 'parsley.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'puchok',
        price: 20,
      },
    ],
  },
  {
    slug: 'luk-zelyonyj',
    category: 'ovoshchi',
    name: { ru: 'Лук зелёный', en: 'Green scallions', ar: 'بصل أخضر' },
    summary: {
      ru: 'С белой ножкой, не переросший — в окрошку и на тарелку к плову.',
      en: 'Young green onions with crisp white bulbs — great fresh bite.',
      ar: 'بصل أخضر بساق أبيض لم يكبر بعد — للأوكروشكا وطبق البلوف.',
    },
    image: 'green-onion.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'puchok',
        price: 20,
      },
    ],
  },
  // Fruits and berries
  {
    slug: 'yabloki-krasnye',
    category: 'frukty',
    name: { ru: 'Яблоки красные', en: 'Red apples', ar: 'تفاح أحمر' },
    summary: {
      ru: 'Иссык-кульские, сладкие и плотные — хрустят, а не крошатся.',
      en: 'Sweet, crisp, aromatic — harvested in Issyk-Kul orchards.',
      ar: 'تفاح إيسيك كولي حلو ومتماسك — يقرمش ولا يتفتت.',
    },
    image: 'apples-red.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 8 }],
    packs: [
      {
        price: 120,
      },
    ],
    hit: true,
  },
  {
    slug: 'yabloki-zelyonye',
    category: 'frukty',
    name: { ru: 'Яблоки зелёные', en: 'Green apples', ar: 'تفاح أخضر' },
    summary: {
      ru: 'Кислые, твёрдые — те самые, из которых получается правильная шарлотка.',
      en: 'Tart and juicy green apples — perfect for healthy snacking and baking.',
      ar: 'تفاح أخضر حامض وصلب — نفس النوع الذي تُصنع منه فطيرة التفاح الحقيقية.',
    },
    image: 'apples-green.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    measure: KG,
    tiers: [{ from: 30, off: 9 }],
    packs: [
      {
        price: 110,
      },
    ],
  },
  {
    slug: 'banany',
    category: 'frukty',
    name: { ru: 'Бананы', en: 'Bananas', ar: 'موز' },
    summary: {
      ru: 'Дозревают на складе, а не в дороге — берём жёлтые, без зелёных рёбер.',
      en: 'Ripe, sweet, yellow bananas — high potassium and natural energy.',
      ar: 'موز ينضج في المستودع لا في الطريق — نختار الأصفر الخالي من الحواف الخضراء.',
    },
    image: 'bananas.webp',
    country: 'ekvador',
    measure: KG,
    tiers: [{ from: 30, off: 5 }],
    packs: [
      {
        price: 130,
      },
    ],
  },
  {
    slug: 'apelsiny',
    category: 'frukty',
    name: { ru: 'Апельсины', en: 'Oranges', ar: 'برتقال' },
    summary: {
      ru: 'Сочные, тонкокожие — на сок уходит вдвое меньше, чем у толстокорых.',
      en: 'Juicy sweet citrus — easy to peel, bursting with Vitamin C.',
      ar: 'برتقال عصيري رقيق القشرة — يحتاج للعصير كمية أقل بمرتين من سميك القشرة.',
    },
    image: 'oranges.webp',
    country: 'turciya',
    measure: KG,
    tiers: [{ from: 30, off: 8 }],
    packs: [
      {
        price: 155,
      },
    ],
  },
  {
    slug: 'mandariny',
    category: 'frukty',
    name: { ru: 'Мандарины', en: 'Tangerines', ar: 'يوسفي (مندلينا)' },
    summary: {
      ru: 'Чистятся одним движением, косточек нет — зимняя основная покупка.',
      en: 'Sweet seedless tangerines with easily peeled thin skin.',
      ar: 'يوسفي يُقشَّر بحركة واحدة وبدون بذور — أهم مشتريات الشتاء.',
    },
    image: 'mandarins.webp',
    country: 'kitaj',
    measure: KG,
    tiers: [{ from: 30, off: 7 }],
    packs: [
      {
        price: 165,
      },
    ],
  },
  {
    slug: 'limony',
    category: 'frukty',
    name: { ru: 'Лимоны', en: 'Lemons', ar: 'ليمون' },
    summary: {
      ru: 'Тяжёлые, с гладкой кожей — сока в таком вдвое больше.',
      en: 'Thin-skinned aromatic sour lemons — essential for tea and marinades.',
      ar: 'ليمون ثقيل أملس القشرة — يعطي عصيراً أكثر بمرتين.',
    },
    image: 'lemons.webp',
    country: 'turciya',
    packs: [
      {
        fasovka: '1-kg',
        price: 210,
      },
    ],
  },
  {
    slug: 'kivi',
    category: 'frukty',
    name: { ru: 'Киви', en: 'Kiwi', ar: 'كيوي' },
    summary: {
      ru: 'Спелые, мягкие под пальцем — дозревать дома не нужно.',
      en: 'Ripe, sweet and tangy green kiwifruit packed with vitamins.',
      ar: 'كيوي ناضج طري تحت أصابعك — لا حاجة لتركه ينضج في البيت.',
    },
    image: 'kiwi.webp',
    country: 'iran',
    packs: [
      {
        fasovka: '1-kg',
        price: 175,
      },
    ],
  },
  {
    slug: 'granat',
    category: 'frukty',
    name: { ru: 'Гранат', en: 'Pomegranates', ar: 'رمان' },
    summary: {
      ru: 'Тяжёлый, с бордовым зерном — на сок и на гарнир к мясу.',
      en: 'Deep red ruby arils with rich sweet-tart juice.',
      ar: 'رمان ثقيل بحبات ياقوتية داكنة — للعصير ولتزيين أطباق اللحم.',
    },
    image: 'pomegranate.webp',
    country: 'iran',
    packs: [
      {
        fasovka: '1-kg',
        price: 260,
      },
    ],
  },
  {
    slug: 'hurma',
    category: 'frukty',
    name: { ru: 'Хурма', en: 'Persimmons', ar: 'كاكا (خرما)' },
    summary: {
      ru: 'Королёк, не вяжет — берите мягкую, твёрдая ещё не готова.',
      en: 'Soft, honey-sweet, non-astringent seasonal persimmons.',
      ar: 'كاكا كوروليوك حلوة لا تُقبض الفم — اختر الطرية، فالصلبة لم تنضج بعد.',
    },
    image: 'persimmon.webp',
    country: 'uzbekistan',
    packs: [
      {
        fasovka: '1-kg',
        price: 185,
      },
    ],
  },
  {
    slug: 'vinograd-belyj',
    category: 'frukty',
    name: { ru: 'Виноград белый', en: 'White seedless grapes', ar: 'عنب أبيض بدون بذور' },
    summary: {
      ru: 'Кишмиш без косточек, крупная гроздь с восковым налётом.',
      en: 'Sweet, juicy, thin-skinned table grapes.',
      ar: 'عنب كشمش بدون بذور، عنقود كبير بطبقة شمعية طبيعية.',
    },
    image: 'grapes-white.webp',
    country: 'uzbekistan',
    packs: [
      {
        fasovka: '1-kg',
        price: 195,
      },
    ],
  },
  {
    slug: 'ananas',
    category: 'frukty',
    name: { ru: 'Ананас', en: 'Pineapple', ar: 'أناناس' },
    summary: {
      ru: 'Спелый: лист выдёргивается из середины, а пахнет уже на прилавке.',
      en: 'Ripe golden pineapple with fragrant tropical sweetness.',
      ar: 'أناناس ناضج: تُنزع الورقة من المنتصف بسهولة، وتفوح رائحته من على الرف.',
    },
    image: 'pineapple.webp',
    country: 'ekvador',
    packs: [
      {
        fasovka: 'sht',
        price: 420,
      },
    ],
  },
  {
    slug: 'mango',
    category: 'frukty',
    name: { ru: 'Манго', en: 'Mango', ar: 'مانجو' },
    summary: {
      ru: 'Мягкое, ароматное, волокон почти нет — едят ложкой из половинки.',
      en: 'Tender, fiber-free, sweet and juicy tropical mango.',
      ar: 'مانجو طري وعطري بلا ألياف تقريباً — يؤكل بالملعقة من النصف.',
    },
    image: 'mango.webp',
    country: 'iran',
    packs: [
      {
        fasovka: 'sht',
        price: 210,
      },
    ],
  },
  {
    slug: 'avokado',
    category: 'frukty',
    name: { ru: 'Авокадо', en: 'Avocado', ar: 'أفوكادو' },
    summary: {
      ru: 'Хасс, тёмная бугристая кожа — мягкое, готово сегодня.',
      en: 'Creamy Hass avocado — perfectly ripe for salads and toast.',
      ar: 'أفوكادو هاس بقشرة داكنة خشنة — طري وجاهز للأكل اليوم.',
    },
    image: 'avocado.webp',
    country: 'ispaniya',
    packs: [
      {
        fasovka: 'sht',
        price: 145,
      },
    ],
  },
  {
    slug: 'dynya',
    category: 'frukty',
    name: { ru: 'Дыня', en: 'Melon', ar: 'شمام (بطيخ أصفر)' },
    summary: {
      ru: 'Торпеда с юга — душистая, режем при вас и даём попробовать.',
      en: 'Fragrant sweet Torpedo melon from southern valleys.',
      ar: 'شمام توربيدو من الجنوب، عطري — نقطعه أمامك ونقدّم قطعة للتذوق.',
    },
    image: 'melon.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'sht',
        price: 240,
      },
    ],
  },
  {
    slug: 'arbuz',
    category: 'frukty',
    name: { ru: 'Арбуз', en: 'Watermelon', ar: 'بطيخ أحمر' },
    summary: {
      ru: 'Звонкий, с жёлтым пятном на боку — если не сладкий, меняем.',
      en: 'Crisp, sweet, deep red watermelon from local melon fields.',
      ar: 'بطيخ رنّان بقعته الصفراء واضحة على الجانب — إذا لم يكن حلواً نستبدله.',
    },
    image: 'watermelon.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 45,
      },
    ],
  },
  {
    slug: 'klubnika',
    category: 'frukty',
    name: { ru: 'Клубника', en: 'Strawberries', ar: 'فراولة' },
    summary: {
      ru: 'Грунтовая, ароматная, с зелёным хвостиком — берут коробками.',
      en: 'Aromatic sweet garden strawberries — delivered fresh.',
      ar: 'فراولة أرضية عطرية بذيل أخضر طازج — تُشترى بالصناديق.',
    },
    image: 'strawberry.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'fermerskoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 340,
      },
    ],
    hit: true,
  },
  {
    slug: 'malina',
    category: 'frukty',
    name: { ru: 'Малина', en: 'Raspberries', ar: 'توت العليق (راسبيري)' },
    summary: {
      ru: 'Собрана вчера, целая ягода — на варенье и просто с молоком.',
      en: 'Delicate fragrant fresh raspberries.',
      ar: 'توت عليق قُطف أمس، حبة كاملة — للمربى وببساطة مع الحليب.',
    },
    image: 'raspberry.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'fermerskoe'],
    packs: [
      {
        fasovka: '250-g',
        price: 290,
      },
    ],
  },
  {
    slug: 'golubika',
    category: 'frukty',
    name: { ru: 'Голубика', en: 'Blueberries', ar: 'توت أزرق (بلوبيري)' },
    summary: {
      ru: 'Крупная, с сизым налётом — редкая гостья, берут сразу.',
      en: 'Plump, sweet, antioxidant-rich fresh blueberries.',
      ar: 'توت أزرق كبير الحبة بطبقة شمعية زرقاء — ضيف نادر يُشترى فور وصوله.',
    },
    image: 'blueberry.webp',
    country: 'turciya',
    packs: [
      {
        fasovka: '250-g',
        price: 320,
        stock: 0,
      },
    ],
  },
  /*
   * The meat row is not here any more, and that absence is the demo.
   *
   * Fourteen cuts used to stand in `myaso` and `ptica`; they are now the butcher's — «Халиф» owns
   * them, the market lays them out from his catalogue at the same addresses, and both sections fill
   * themselves from `seed/supplies.ts`. Putting one back HERE would take that address and the
   * placement would be refused as taken.
   */
  // Sausages and delicacies
  {
    slug: 'kazy',
    category: 'kolbasy',
    name: { ru: 'Казы конская', en: 'Horsemeat kazy', ar: 'قازي لحم الخيل' },
    summary: {
      ru: 'Домашнего посола, из рёберной части — варится сорок минут.',
      en: 'Traditional Kyrgyz spiced cured horsemeat sausage.',
      ar: 'قازي مملّح منزلياً من ضلع الفرس — يُسلق أربعين دقيقة.',
    },
    text: [
      {
        ru: 'Казы делают из конского ребра с жировой прослойкой, солят и набивают в натуральную оболочку. Варить надо на медленном огне и не протыкать — иначе весь жир уйдёт в бульон.',
        en: 'Traditional homemade dry-cure: prime rib horsemeat, black pepper, garlic, and salt. No preservatives or soy — 100% natural.',
        ar: 'يُصنع القازي من ضلع الفرس بطبقة الدهن، يُملّح ويُحشى في غلاف طبيعي. يُسلق على نار هادئة وبدون ثقب، وإلا خرج الدهن كله إلى المرق.',
      },
      {
        ru: 'Берут к бешбармаку и на той. Заранее сказать за день — оставим.',
        en: 'Simmer gently on low heat for 2 to 2.5 hours without boiling hard. Serve chilled and thinly sliced.',
        ar: 'يُشترى مع البشبرمق وفي المناسبات. اطلب مسبقاً بيوم وسنجهزه لك.',
      },
    ],
    image: 'kazy.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 1450,
      },
    ],
    hit: true,
  },
  {
    slug: 'kolbasa-doktorskaya',
    category: 'kolbasy',
    name: {
      ru: 'Колбаса «Докторская»',
      en: 'Doktorskaya bologna sausage',
      ar: 'نقانق دكتورسكايا مسلوقة',
    },
    summary: {
      ru: 'Варёная, по ГОСТу — та, что режется тонко и не крошится.',
      en: 'Classic boiled sausage made to traditional recipes.',
      ar: 'نقانق مسلوقة حسب المواصفة القياسية — تُقطَّع رقيقة ولا تتفتت.',
    },
    image: 'sausage-doctor.webp',
    country: 'kyrgyzstan',
    brand: 'enesaj',
    marks: ['gost'],
    packs: [
      {
        fasovka: '1-kg',
        price: 520,
      },
    ],
  },
  {
    slug: 'kolbasa-servelat',
    category: 'kolbasy',
    name: { ru: 'Колбаса «Сервелат»', en: 'Cervelat dry sausage', ar: 'سجق مدخن سيرفيليت' },
    summary: {
      ru: 'Варёно-копчёная, плотная — на бутерброд и в солянку.',
      en: 'Lightly smoked cured cervelat sausage with fine marbling.',
      ar: 'سجق مسلوق ومدخن متماسك — للسندويش وحساء السولانكا.',
    },
    image: 'sausage-servalat.webp',
    country: 'kyrgyzstan',
    brand: 'enesaj',
    marks: ['gost'],
    packs: [
      {
        fasovka: '1-kg',
        price: 620,
      },
    ],
  },
  {
    slug: 'sosiski-molochnye',
    category: 'kolbasy',
    name: { ru: 'Сосиски молочные', en: 'Milk wieners', ar: 'نقانق حليب (سوسيسكي)' },
    summary: {
      ru: 'В натуральной оболочке — лопаются при варке, как положено.',
      en: 'Tender boiled sausages with natural milk flavor.',
      ar: 'بغلاف طبيعي — تنفجر عند السلق كما يجب أن تكون.',
    },
    image: 'sausages-milk.webp',
    country: 'kyrgyzstan',
    brand: 'enesaj',
    marks: ['gost'],
    packs: [
      {
        fasovka: '1-kg',
        price: 420,
      },
    ],
  },
  {
    slug: 'salyami',
    category: 'kolbasy',
    name: { ru: 'Салями', en: 'Salami', ar: 'سلامي' },
    summary: {
      ru: 'Сырокопчёная, с крупным шпиком — режется на просвет.',
      en: 'Air-dried cured salami with savory garlic notes.',
      ar: 'سلامي مدخن على البارد بقطع شحم كبيرة — تُقطَّع شرائح شفافة رقيقة.',
    },
    image: 'salami.webp',
    country: 'kyrgyzstan',
    brand: 'enesaj',
    packs: [
      {
        fasovka: '500-g',
        price: 480,
      },
    ],
  },
  {
    slug: 'vetchina',
    category: 'kolbasy',
    name: { ru: 'Ветчина', en: 'Ham', ar: 'لحم مقدد (هام)' },
    summary: {
      ru: 'Из цельного куска говядины — видно волокна, а не рисунок.',
      en: 'Lean cured ham slices — delicate texture for sandwiches.',
      ar: 'من قطعة لحم بقري كاملة — تظهر فيها الألياف الطبيعية لا نقشاً مصنّعاً.',
    },
    image: 'ham.webp',
    country: 'kyrgyzstan',
    brand: 'enesaj',
    packs: [
      {
        fasovka: '500-g',
        price: 340,
      },
    ],
  },
  {
    slug: 'balyk-govyazhij',
    category: 'kolbasy',
    name: { ru: 'Балык говяжий', en: 'Dry-cured beef balyk', ar: 'بالِق بقري مجفف' },
    summary: {
      ru: 'Сыровяленый, вялится три недели — самое дорогое на витрине.',
      en: 'Dry-cured whole muscle beef loin with savory spices.',
      ar: 'مجفف على الهواء لثلاثة أسابيع — الأغلى في الواجهة.',
    },
    image: 'balyk.webp',
    country: 'kyrgyzstan',
    brand: 'enesaj',
    packs: [
      {
        fasovka: '500-g',
        price: 890,
      },
    ],
  },
  {
    slug: 'grudka-kopchyonaya',
    category: 'kolbasy',
    name: { ru: 'Грудка копчёная', en: 'Smoked chicken breast', ar: 'صدر دجاج مدخن' },
    summary: {
      ru: 'Куриная, холодного копчения — в салат и на праздничную тарелку.',
      en: 'Hot-smoked chicken breast — golden exterior, tender inside.',
      ar: 'صدر دجاج مدخن على البارد — للسلطة وطبق المناسبات.',
    },
    image: 'smoked-breast.webp',
    country: 'kyrgyzstan',
    brand: 'enesaj',
    packs: [
      {
        fasovka: '500-g',
        price: 390,
      },
    ],
  },
  // Fish and seafood
  {
    slug: 'forel-ohlazhdyonnaya',
    category: 'ryba',
    name: {
      ru: 'Форель охлаждённая',
      en: 'Chilled rainbow trout',
      ar: 'سمك سلمون مرقط (تراوت) مبرد',
    },
    summary: {
      ru: 'Иссык-кульская, с садков в Тону — привоз через день, не мороженая.',
      en: 'Issyk-Kul whole trout on ice — pristine fresh taste.',
      ar: 'سلمون بحيرة إيسيك كول الطازج على الثلج من مزارع تون المائية — غير مجمد.',
    },
    text: [
      {
        ru: 'Форель растят в садках на южном берегу Иссык-Куля. Рыба доезжает до Бишкека за пять часов во льду и на прилавок попадает охлаждённой, а не размороженной.',
        en: 'Issyk-Kul rainbow trout from cold-water pens: firm pink flesh, clean fresh taste without muddy odor.',
        ar: 'يُربى سمك التراوت في أقفاص مائية عذبة على الشاطئ الجنوبي لإيسيك كول ويصل إلى بيشكيك في خمس ساعات مبرداً على الثلج.',
      },
      {
        ru: 'Чистим и потрошим бесплатно, голову оставляем по просьбе — на уху она и нужна.',
        en: 'Delivered on ice twice weekly. Gutted and cleaned upon request when specified in order notes.',
        ar: 'تنظيف وإزالة الأحشاء مجاناً حسب الطلب، ونترك الرأس لشوربة السمك اللذيذة.',
      },
    ],
    image: 'trout-fresh.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'fermerskoe'],
    measure: KG,
    packs: [
      {
        fasovka: '1-kg',
        price: 980,
      },
    ],
    hit: true,
  },
  {
    slug: 'losos-ohlazhdyonnyj',
    category: 'ryba',
    name: { ru: 'Лосось охлаждённый', en: 'Chilled salmon', ar: 'سلمون أطلسي مبرد' },
    summary: {
      ru: 'Целая рыба, оранжевое плотное мясо — на стейки и на слабый посол.',
      en: 'Fresh chilled Atlantic salmon fillet with rich omega-3.',
      ar: 'سمكة سلمون كاملة طازجة بلحم برتقالي مشبع بالأوميغا 3 للستيك والتمليح الخفيف.',
    },
    image: 'salmon-fresh.webp',
    measure: KG,
    packs: [
      {
        fasovka: '1-kg',
        price: 1950,
      },
    ],
  },
  {
    slug: 'stejk-lososya',
    category: 'ryba',
    name: { ru: 'Стейк лосося', en: 'Salmon steak', ar: 'ستيك سلمون طازج' },
    summary: {
      ru: 'Порционный срез в два пальца — на сковороду или в фольгу.',
      en: 'Thick-cut fresh salmon steaks — perfect for pan-searing or grilling.',
      ar: 'شرائح ستيك سلمون سميكة طازجة ومثالية للقلي أو الشواء بالفرن.',
    },
    image: 'salmon-steak.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 1090,
      },
    ],
  },
  {
    slug: 'gorbusha',
    category: 'ryba',
    name: { ru: 'Горбуша', en: 'Pink salmon', ar: 'سلمون غوربوشا وردي' },
    summary: {
      ru: 'Мороженая, потрошёная — самая дешёвая красная рыба на прилавке.',
      en: 'Wild Pacific pink salmon — great for baking and fish soups.',
      ar: 'سمك سلمون بري مجمد ومنظف ممتاز للشوربات والخبز بالفرن.',
    },
    image: 'pink-salmon.webp',
    country: 'rossiya',
    measure: KG,
    packs: [
      {
        fasovka: '1-kg',
        price: 690,
      },
    ],
  },
  {
    slug: 'ikra-krasnaya',
    category: 'ryba',
    name: { ru: 'Икра красная', en: 'Red salmon caviar', ar: 'كافيار أحمر فاخر' },
    summary: {
      ru: 'Зернистая, некрупная — берут перед праздниками и на подарок.',
      en: 'Premium lightly salted red caviar — delicate pop and rich flavor.',
      ar: 'كافيار سلمون أحمر قليل الملوحة بحبات لامعة ونكهة بحرية غنية.',
    },
    image: 'red-caviar.webp',
    country: 'rossiya',
    packs: [
      {
        fasovka: '250-g',
        price: 1890,
        stock: 0,
      },
    ],
  },
  {
    slug: 'krevetki',
    category: 'ryba',
    name: { ru: 'Креветки', en: 'King prawns', ar: 'روبيان كبير (جمبري)' },
    summary: {
      ru: 'Варёно-мороженые, крупные — размораживать не надо, сразу на сковороду.',
      en: 'Large raw headless king prawns — quick cooking and sweet flesh.',
      ar: 'روبيان كبير مسلوق ومجمد جاهز للطهي والتحمير مباشرة.',
    },
    image: 'shrimp.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 690,
      },
    ],
  },
  {
    slug: 'midii',
    category: 'ryba',
    name: { ru: 'Мидии', en: 'Mussels', ar: 'بلح البحر (محار)' },
    summary: {
      ru: 'Очищенные, мороженые — в пасту, в суп и в сливочный соус.',
      en: 'Cleaned frozen mussel meat — seafood pasta and stir-fries.',
      ar: 'لحم بلح بحر مجمد ومنظف مناسب للمعكرونة والشوربات البحرية.',
    },
    image: 'mussels.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 420,
        stock: 0,
      },
    ],
  },
  // Milk and dairy
  {
    slug: 'moloko-2-5',
    category: 'moloko',
    name: { ru: 'Молоко 2,5%', en: 'Milk 2.5%', ar: 'حليب مبستر 2.5%' },
    summary: {
      ru: 'Пастеризованное, в пакете — то, что берут каждый день.',
      en: 'Fresh pasteurized local milk 2.5% fat.',
      ar: 'حليب طازج مبستر بنسبة دسم 2.5% للاستهلاك اليومي.',
    },
    image: 'milk-2.5.webp',
    country: 'kyrgyzstan',
    brand: 'ak-sut',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '1-l',
        price: 89,
      },
    ],
    hit: true,
  },
  {
    slug: 'moloko-3-2',
    category: 'moloko',
    name: { ru: 'Молоко 3,2%', en: 'Milk 3.2%', ar: 'حليب مبستر 3.2%' },
    summary: {
      ru: 'Жирнее и слаще — на кашу, на кофе и детям.',
      en: 'Whole pasteurized milk 3.2% fat — rich creamy flavor.',
      ar: 'حليب كامل الدسم بنكهة قشدية غنية للقهوة وإفطار الأطفال.',
    },
    image: 'milk-3.2.webp',
    country: 'kyrgyzstan',
    brand: 'ak-sut',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '1-l',
        price: 96,
      },
    ],
  },
  {
    slug: 'moloko-toplyonoe',
    category: 'moloko',
    name: { ru: 'Молоко топлёное', en: 'Baked milk', ar: 'حليب مخبوز مبخر' },
    summary: {
      ru: 'Кремового цвета, с ореховым вкусом — томится шесть часов.',
      en: 'Traditional slow-simmered baked milk with caramel aroma.',
      ar: 'حليب مبخر تقليدي بنكهة الكراميل والمكسرات مطهو على نار هادئة لست ساعات.',
    },
    image: 'milk-baked.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-l',
        price: 105,
      },
    ],
  },
  {
    slug: 'kefir-3-2',
    category: 'moloko',
    name: { ru: 'Кефир 3,2%', en: 'Kefir 3.2%', ar: 'كفير 3.2%' },
    summary: {
      ru: 'На живой закваске, кисловатый — не йогуртовая сладость.',
      en: 'Classic cultured probiotic kefir made from fresh milk.',
      ar: 'كفير تقليدي بروبيوتيك طبيعي وحموضة منعشة بدون سكر.',
    },
    image: 'kefir-3.2.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '1-l',
        price: 95,
      },
    ],
  },
  {
    slug: 'ryazhenka',
    category: 'moloko',
    name: { ru: 'Ряженка', en: 'Ryazhenka', ar: 'رياجينكا (لبن رائب)' },
    summary: {
      ru: 'Из топлёного молока, густая — ложка стоит.',
      en: 'Cultured fermented baked milk with smooth creamy consistency.',
      ar: 'لبن رائب تقليدي من الحليب المخبوز بقوام قشدي كثيف.',
    },
    image: 'ryazhenka.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '0-5-l',
        price: 78,
      },
    ],
  },
  {
    slug: 'smetana-20',
    category: 'moloko',
    name: { ru: 'Сметана 20%', en: 'Sour cream 20%', ar: 'قشطة رائبة (سميتانا) 20%' },
    summary: {
      ru: 'Без растительного жира — в борще не расходится хлопьями.',
      en: 'Thick traditional sour cream 20% fat.',
      ar: 'قشطة سميتانا نقية خالية من الدهون النباتية تذوب بسلاسة في الشوربات.',
    },
    image: 'smetana-20.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 145,
      },
    ],
  },
  {
    slug: 'slivki-33',
    category: 'moloko',
    name: { ru: 'Сливки 33%', en: 'Whipping cream 33%', ar: 'كريمة خفق 33%' },
    summary: {
      ru: 'Взбиваются за две минуты и держат форму — на крем и в соус.',
      en: 'Heavy dairy whipping cream 33% for culinary sauces and desserts.',
      ar: 'كريمة خفق دسمة تخفق في دقيقتين للحلويات والصلصات.',
    },
    image: 'cream-33.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '0-5-l',
        price: 180,
      },
    ],
  },
  {
    slug: 'tvorog-5',
    category: 'moloko',
    name: { ru: 'Творог 5%', en: 'Cottage cheese 5%', ar: 'جبنة قريش 5%' },
    summary: {
      ru: 'Зернистый, некислый — на сырники и в вареники.',
      en: 'Crumbly natural cottage cheese 5% fat.',
      ar: 'جبنة قريش حبيبية طازجة قليلة الحموضة للفطائر والمعجنات.',
    },
    image: 'tvorog-5.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 180,
      },
    ],
  },
  {
    slug: 'tvorog-9',
    category: 'moloko',
    name: { ru: 'Творог 9%', en: 'Cottage cheese 9%', ar: 'جبنة قريش 9%' },
    summary: {
      ru: 'Жирный, мягкий — ест ложкой тот, кто пришёл за вкусом, а не за белком.',
      en: 'Rich farm cottage cheese 9% fat.',
      ar: 'جبنة قريش بلدية دسمة وطرية بنكهة قشدية تؤكل بالملعقة أو مع العسل.',
    },
    image: 'tvorog-9.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['mestnoe', 'fermerskoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 195,
      },
    ],
  },
  {
    slug: 'jogurt-grecheskij',
    category: 'moloko',
    name: { ru: 'Йогурт греческий', en: 'Greek yogurt', ar: 'زبادي يوناني' },
    summary: {
      ru: 'Густой, без сахара — в соус к мясу и на завтрак с мёдом.',
      en: 'Thick strained Greek-style plain yogurt — high protein.',
      ar: 'زبادي يوناني مصفى كثيف القوام وغني بالبروتين بدون سكر.',
    },
    image: 'yogurt-greek.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['bez-sahara', 'mestnoe'],
    packs: [
      {
        fasovka: '250-g',
        price: 110,
      },
    ],
  },
  {
    slug: 'jogurt-klubnichnyj',
    category: 'moloko',
    name: { ru: 'Йогурт клубничный', en: 'Strawberry yogurt', ar: 'زبادي بالفراولة' },
    summary: {
      ru: 'С кусочками ягоды — детский вариант того же стакана.',
      en: 'Creamy drinking yogurt blended with natural strawberry puree.',
      ar: 'زبادي كريمي لذيذ بقطع ومهروس الفراولة الطبيعية.',
    },
    image: 'yogurt-strawberry.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '250-g',
        price: 85,
      },
    ],
  },
  // Cheeses
  {
    slug: 'brynza',
    category: 'syry',
    name: { ru: 'Брынза', en: 'Brynza white cheese', ar: 'جبنة برينزا بيضاء' },
    summary: {
      ru: 'Рассольная, солёная в меру — в салат и на лепёшку.',
      en: 'Salty crumbly white cheese made from fresh milk.',
      ar: 'جبنة بيضاء مالحة طازجة للسلطات والخبز الساخن.',
    },
    image: 'cheese-brynza.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'fermerskoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 320,
      },
    ],
  },
  {
    slug: 'suluguni',
    category: 'syry',
    name: { ru: 'Сулугуни', en: 'Sulguni cheese', ar: 'جبنة سولوغوني' },
    summary: {
      ru: 'Слоится волокнами, тянется на сковороде — в хачапури и на гриль.',
      en: 'Layered elastic Georgian-style cheese with mild milky flavor.',
      ar: 'جبنة سولوغوني خيطية مطاطية تذوب بامتياز للفطائر والشواء.',
    },
    image: 'cheese-suluguni.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 460,
      },
    ],
  },
  {
    slug: 'syr-rossijskij',
    category: 'syry',
    name: { ru: 'Сыр «Российский»', en: 'Rossiyskiy cheese', ar: 'جبن روسي نصف صلب' },
    summary: {
      ru: 'Полутвёрдый, с мелким глазком — на бутерброд и в запеканку.',
      en: 'Classic semi-hard cheese with tiny eyes and creamy taste.',
      ar: 'جبن نصف صلب كلاسيكي بمسامات صغيرة للسندويشات والصواني.',
    },
    image: 'cheese-russian.webp',
    country: 'belarus',
    marks: ['gost'],
    packs: [
      {
        fasovka: '500-g',
        price: 420,
        old: 480,
      },
    ],
  },
  {
    slug: 'gauda',
    category: 'syry',
    name: { ru: 'Гауда', en: 'Gouda cheese', ar: 'جبنة غودا' },
    summary: {
      ru: 'Сливочная, плавится ровно — на бургер и на горячий бутерброд.',
      en: 'Traditional Dutch semi-hard cheese with mild nutty notes.',
      ar: 'جبنة غودا هولندية قشدية تذوب بالتساوي في البرغر والسندويشات.',
    },
    image: 'cheese-gouda.webp',
    country: 'belarus',
    packs: [
      {
        fasovka: '500-g',
        price: 520,
      },
    ],
  },
  {
    slug: 'mocarella',
    category: 'syry',
    name: { ru: 'Моцарелла', en: 'Mozzarella cheese', ar: 'جبنة موزاريلا طازجة' },
    summary: {
      ru: 'В рассоле, шариками — на пиццу берут другую, эта в салат.',
      en: 'Soft fresh mozzarella ball in brine — melts beautifully on pizza.',
      ar: 'كرات موزاريلا طازجة طرية في المحلول الملحي للسلطات والبيتزا.',
    },
    image: 'cheese-mozzarella.webp',
    country: 'italiya',
    packs: [
      {
        fasovka: '250-g',
        price: 285,
      },
    ],
  },
  {
    slug: 'parmezan',
    category: 'syry',
    name: { ru: 'Пармезан', en: 'Parmesan cheese', ar: 'جبنة بارميزان معتقة' },
    summary: {
      ru: 'Выдержка двенадцать месяцев — трётся в пыль и пахнет на всю кухню.',
      en: 'Aged hard cheese with crystalline crunch and intense savory notes.',
      ar: 'جبن إيطالي صلب معتق لـ 12 شهراً برائحة زكية وقرمشة بلورية.',
    },
    image: 'cheese-parmesan.webp',
    country: 'italiya',
    packs: [
      {
        fasovka: '250-g',
        price: 690,
      },
    ],
  },
  // Butter and eggs
  {
    slug: 'maslo-slivochnoe-72',
    category: 'maslo-yajca',
    name: { ru: 'Масло сливочное 72,5%', en: 'Butter 72.5%', ar: 'زبدة طبيعية 72.5%' },
    summary: {
      ru: 'Настоящее, из сливок — в холодильнике твёрдое, на столе мажется.',
      en: 'Sweet cream table butter 72.5% fat.',
      ar: 'زبدة قشدية نقية من حليب المزارع تدهن بسلاسة على الخبز.',
    },
    image: 'butter-72.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '250-g',
        price: 195,
      },
    ],
  },
  {
    slug: 'maslo-slivochnoe-82',
    category: 'maslo-yajca',
    name: { ru: 'Масло сливочное 82,5%', en: 'Butter 82.5%', ar: 'زبدة ممتازة 82.5%' },
    summary: {
      ru: 'Жирнее и дороже — то, на котором пекут, а не мажут.',
      en: 'Traditional premium butter 82.5% fat.',
      ar: 'زبدة طبيعية فاخرة عالية الدسم مثالية للمخبوزات والحلويات.',
    },
    image: 'butter-82.webp',
    country: 'kyrgyzstan',
    brand: 'umut',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '250-g',
        price: 240,
      },
    ],
  },
  {
    slug: 'maslo-toplyonoe',
    category: 'maslo-yajca',
    name: { ru: 'Масло топлёное', en: 'Clarified butter (ghee)', ar: 'سمن بلدي مصفى (غي)' },
    summary: {
      ru: 'Домашнее, из горного молока — не горит и не пенится.',
      en: 'Pure clarified melted butter — high smoke point and nutty aroma.',
      ar: 'سمن جبلي مصفى نقي بنكهة الجوز ورائحة زكية لا يحترق في الطهي.',
    },
    image: 'ghee.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'fermerskoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 590,
      },
    ],
  },
  {
    slug: 'yajca-kurinye',
    category: 'maslo-yajca',
    name: { ru: 'Яйца куриные С1', en: 'Chicken eggs C1', ar: 'بيض دجاج طازج فئة C1' },
    summary: {
      ru: 'С фермы под Кантом, ярко-оранжевый желток — лоток дешевле десятка.',
      en: 'Farm fresh chicken eggs (Category 1) — clean shells, bright yolks.',
      ar: 'بيض مزارع طازج من كانت بصفار برتقالي زاهٍ — كرتونة أوفر.',
    },
    image: 'eggs.webp',
    country: 'kyrgyzstan',
    marks: ['fermerskoe', 'mestnoe'],
    measure: PIECE,
    tiers: [{ from: 30, off: 8 }],
    packs: [
      {
        price: 13,
      },
    ],
    hit: true,
  },
  {
    slug: 'yajca-perepelinye',
    category: 'maslo-yajca',
    name: { ru: 'Яйца перепелиные', en: 'Quail eggs', ar: 'بيض سمان' },
    summary: {
      ru: 'Мелкие, в крапинку — детям и в салат целиком.',
      en: 'Delicate nutrient-dense speckled quail eggs.',
      ar: 'بيض سمان صغير منقط غني بالفيتامينات والمعادن للأطفال والسلطات.',
    },
    image: 'eggs-quail.webp',
    country: 'kyrgyzstan',
    marks: ['fermerskoe'],
    packs: [
      {
        fasovka: '10-sht',
        price: 110,
      },
    ],
  },
  // Bread and bakery
  {
    slug: 'lepyoshka-tandyrnaya',
    category: 'hleb',
    name: { ru: 'Лепёшка тандырная', en: 'Tandoor flatbread', ar: 'خبز تنور طازج' },
    summary: {
      ru: 'Из тандыра с шести утра — к обеду её уже разбирают.',
      en: 'Hot clay-oven baked bread with sesame crust.',
      ar: 'خبز تنور ساخن من الطين يبدأ خبزه من السادسة صباحاً ومغطى بالسمسم.',
    },
    text: [
      {
        ru: 'Тандыр топят с пяти, первую партию вынимают в шесть. Лепёшка держит форму до вечера, а на второй день её режут на курут-нан и сушат.',
        en: 'Baked in clay tandoor ovens starting from 6:00 AM: crispy crust, soft center with traditional pattern, topped with black sesame.',
        ar: 'يُسخن التنور من الخامسة صباحاً وتخرج أول دفعة ساخنة في السادسة. يحافظ على قوامه طوال اليوم.',
      },
      {
        ru: 'Печём круглый день, но горячую застать можно только утром и в семь вечера.',
        en: 'Arrives warm in morning deliveries. To refresh if cooled, lightly sprinkle water and warm 3 minutes in oven.',
        ar: 'نخبزه على مدار اليوم ويصل ساخناً في جولات التوصيل الصباحية والمسائية.',
      },
    ],
    image: 'flatbread.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'sht',
        price: 35,
      },
    ],
    hit: true,
  },
  {
    slug: 'hleb-pshenichnyj',
    category: 'hleb',
    name: { ru: 'Хлеб пшеничный', en: 'Wheat bread', ar: 'خبز قمح أبيض' },
    summary: {
      ru: 'Формовой кирпич, мягкий мякиш — самый дешёвый на полке.',
      en: 'Classic golden white bread loaf with soft airy crumb.',
      ar: 'رغيف خبز أبيض كلاسيكي طري وهش بأفضل سعر.',
    },
    image: 'bread-wheat.webp',
    brand: 'kulikovsky',
    marks: ['gost'],
    packs: [
      {
        fasovka: 'sht',
        price: 38,
      },
    ],
  },
  {
    slug: 'hleb-rzhanoj',
    category: 'hleb',
    name: { ru: 'Хлеб ржаной', en: 'Rye bread', ar: 'خبز الجاودار (خبز أسمر)' },
    summary: {
      ru: 'Плотный и кисловатый — к салу, к селёдке и к супу.',
      en: 'Hearty traditional sourdough rye bread loaf.',
      ar: 'خبز جاودار أسمر كثيف بقشرة صلبة وقيمة غذائية عالية.',
    },
    image: 'bread-rye.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 55,
      },
    ],
  },
  {
    slug: 'hleb-borodinskij',
    category: 'hleb',
    name: { ru: 'Хлеб «Бородинский»', en: 'Borodinsky rye bread', ar: 'خبز بورودينسكي' },
    summary: {
      ru: 'С кориандром на корке — узнаётся по запаху через полмагазина.',
      en: 'Dark spiced rye malt bread with coriander seed topping.',
      ar: 'خبز أسمر كلاسيكي بالكزبرة والمولت ونكهة حلوة مميزة.',
    },
    image: 'bread-borodinsky.webp',
    brand: 'kulikovsky',
    marks: ['gost'],
    packs: [
      {
        fasovka: 'sht',
        price: 68,
      },
    ],
  },
  {
    slug: 'hleb-zernovoj',
    category: 'hleb',
    name: { ru: 'Хлеб зерновой', en: 'Multigrain bread', ar: 'خبز حبوب كاملة' },
    summary: {
      ru: 'С семечками и льном — тяжёлый, одного ломтя хватает.',
      en: 'Wholesome multigrain loaf packed with sunflower and flax seeds.',
      ar: 'رغيف حبوب كاملة بالبذور وبذور الكتان — ثقيل، تكفي شريحة واحدة.',
    },
    image: 'bread-grain.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 85,
      },
    ],
  },
  {
    slug: 'hleb-bezdrozhzhevoj',
    category: 'hleb',
    name: {
      ru: 'Хлеб бездрожжевой',
      en: 'Yeast-free sourdough bread',
      ar: 'خبز بدون خميرة (عجين مخمر)',
    },
    summary: {
      ru: 'На закваске, зреет сутки — тем, кому дрожжевой тяжёл.',
      en: "Artisan sourdough bread made without baker's yeast.",
      ar: 'على عجين مختمر طبيعياً يوماً كاملاً — لمن يثقل عليه خبز الخميرة.',
    },
    image: 'bread-yeast-free.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 95,
      },
    ],
  },
  {
    slug: 'baton-nareznoj',
    category: 'hleb',
    name: { ru: 'Батон нарезной', en: 'Sliced white baton loaf', ar: 'باتون أبيض مقطّع' },
    summary: {
      ru: 'Тот самый, с косыми надрезами — под бутерброды и в панировку.',
      en: 'Soft sliced wheat baton with crispy scored crust.',
      ar: 'الرغيف المعروف بشقوقه المائلة — للسندويشات والفتات.',
    },
    image: 'baton.webp',
    brand: 'kulikovsky',
    marks: ['gost'],
    packs: [
      {
        fasovka: 'sht',
        price: 42,
      },
    ],
  },
  {
    slug: 'baget',
    category: 'hleb',
    name: { ru: 'Багет', en: 'French baguette', ar: 'باغيت فرنسي' },
    summary: {
      ru: 'Хрустящая корка, дырчатый мякиш — под сыр и под брускетту.',
      en: 'Crispy French baguette with open airy crumb structure.',
      ar: 'قشرة مقرمشة ولب مليء بالثقوب — للجبن والبروسكيتا.',
    },
    image: 'baguette.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 65,
      },
    ],
  },
  {
    slug: 'chiabatta',
    category: 'hleb',
    name: { ru: 'Чиабатта', en: 'Ciabatta', ar: 'شياباتا' },
    summary: {
      ru: 'Крупные поры, оливковое масло в тесте — на сэндвич.',
      en: 'Italian artisan bread with porous crumb and olive oil notes.',
      ar: 'خبز إيطالي بمسام كبيرة وزيت زيتون في العجين — للساندويتش.',
    },
    image: 'ciabatta.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 90,
      },
    ],
  },
  {
    slug: 'kruassan',
    category: 'hleb',
    name: { ru: 'Круассан', en: 'Butter croissant', ar: 'كرواسون بالزبدة' },
    summary: {
      ru: 'На сливочном масле, слоится в руках — к утреннему кофе.',
      en: 'Flaky golden butter croissant with airy layered texture.',
      ar: 'كرواسون مورق ذهبي بالزبدة الطبيعية — لقهوة الصباح.',
    },
    image: 'croissant.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 75,
        stock: 0,
      },
    ],
  },
  {
    slug: 'bulochka-s-koricej',
    category: 'hleb',
    name: { ru: 'Булочка с корицей', en: 'Cinnamon roll', ar: 'لفائف القرفة (سينابون)' },
    summary: {
      ru: 'С сахарной глазурью, ещё тёплая — берут по две.',
      en: 'Sweet fluffy pastry swirl infused with fragrant cinnamon.',
      ar: 'برشة سكرية وهي لا تزال دافئة — تُشترى قطعتين دفعة واحدة.',
    },
    image: 'bun-cinnamon.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 55,
      },
    ],
  },
  {
    slug: 'bulochka-s-makom',
    category: 'hleb',
    name: { ru: 'Булочка с маком', en: 'Poppy seed bun', ar: 'خبز بذور الخشخاش' },
    summary: {
      ru: 'Сдобная, с маковой начинкой внутри, а не сверху.',
      en: 'Soft sweet bun generously filled with crushed poppy seeds.',
      ar: 'عجينة غنية بحشوة الخشخاش من الداخل لا من فوق.',
    },
    image: 'bun-poppy.webp',
    brand: 'kulikovsky',
    packs: [
      {
        fasovka: 'sht',
        price: 48,
      },
    ],
  },
  {
    slug: 'lavash-tonkij',
    category: 'hleb',
    name: { ru: 'Лаваш тонкий', en: 'Thin flatbread lavash', ar: 'لافاش رقيق' },
    summary: {
      ru: 'Мягкий, не рвётся при заворачивании — под шаурму и рулеты.',
      en: 'Unleavened soft thin flatbread for wraps and snacks.',
      ar: 'طري لا يتمزق عند اللف — للشاورما واللفائف.',
    },
    image: 'lavash-thin.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: 'sht',
        price: 30,
      },
    ],
  },
  {
    slug: 'lavash-armyanskij',
    category: 'hleb',
    name: { ru: 'Лаваш армянский', en: 'Armenian lavash', ar: 'لافاش أرمني' },
    summary: {
      ru: 'Большой лист, подсыхает быстро — брать в день еды.',
      en: 'Traditional hearth-baked thin flatbread sheets.',
      ar: 'رقاقة كبيرة تجف بسرعة — تُشترى في نفس يوم الاستخدام.',
    },
    image: 'lavash-armenian.webp',
    packs: [
      {
        fasovka: 'sht',
        price: 45,
      },
    ],
  },
  // Grains and pasta
  {
    slug: 'grechka',
    category: 'krupy',
    name: { ru: 'Гречка', en: 'Buckwheat', ar: 'حنطة سوداء (غريتشكا)' },
    summary: {
      ru: 'Ядрица высшего сорта, перебранная — мешком берут дешевле на треть.',
      en: 'Whole roasted buckwheat groats — clean grains, nutty taste.',
      ar: 'حبوب كاملة درجة أولى منتقاة يدوياً — الكيس أرخص بالثلث.',
    },
    image: 'buckwheat.webp',
    brand: 'dan-azyk',
    measure: KG,
    tiers: [{ from: 30, off: 8 }],
    packs: [
      {
        price: 145,
      },
    ],
  },
  {
    slug: 'ris-dlinnozyornyj',
    category: 'krupy',
    name: { ru: 'Рис длиннозёрный', en: 'Long grain rice', ar: 'أرز طويل الحبة' },
    summary: {
      ru: 'Не слипается — на гарнир и в суп; на плов берут другой.',
      en: 'Polished long grain white rice — cooks fluffy and distinct.',
      ar: 'حبات لا تلتصق — للطبق الجانبي والشوربة؛ للبلوف يُختار نوع آخر.',
    },
    image: 'rice-long.webp',
    country: 'uzbekistan',
    measure: KG,
    tiers: [{ from: 30, off: 8 }],
    packs: [
      {
        price: 145,
      },
    ],
  },
  {
    slug: 'ris-basmati',
    category: 'krupy',
    name: { ru: 'Рис басмати', en: 'Basmati rice', ar: 'أرز بسمتي' },
    summary: {
      ru: 'Длинное зерно с ореховым запахом — под карри и под плов.',
      en: 'Fragrant extra-long basmati rice grains.',
      ar: 'حبة طويلة برائحة الجوز — للكاري والبلوف.',
    },
    image: 'rice-basmati.webp',
    country: 'iran',
    packs: [
      {
        fasovka: '1-kg',
        price: 285,
      },
    ],
  },
  {
    slug: 'chechevica-zelyonaya',
    category: 'krupy',
    name: { ru: 'Чечевица зелёная', en: 'Green lentils', ar: 'عدس أخضر' },
    summary: {
      ru: 'Держит форму при варке — в суп и в тёплый салат.',
      en: 'Hearty whole green lentils — retains shape in soups and salads.',
      ar: 'يحافظ على شكله عند الطهي — للشوربة والسلطة الدافئة.',
    },
    image: 'lentil-green.webp',
    country: 'kazahstan',
    packs: [
      {
        fasovka: '1-kg',
        price: 165,
      },
    ],
  },
  {
    slug: 'nut',
    category: 'krupy',
    name: { ru: 'Нут', en: 'Chickpeas', ar: 'حمص حب' },
    summary: {
      ru: 'Крупный, ровный — на хумус и в шурпу, замачивать с вечера.',
      en: 'Large golden chickpeas — ideal for pilaf, hummus, and stews.',
      ar: 'حبة كبيرة متجانسة — للحمص والشوربة، يُنقع من المساء.',
    },
    image: 'chickpeas.webp',
    country: 'uzbekistan',
    packs: [
      {
        fasovka: '1-kg',
        price: 180,
      },
    ],
  },
  {
    slug: 'ovsyanye-hlopya',
    category: 'krupy',
    name: { ru: 'Овсяные хлопья', en: 'Rolled oats', ar: 'رقائق شوفان' },
    summary: {
      ru: 'Из цельного зерна, варятся пять минут — не быстрорастворимые.',
      en: 'Whole grain rolled oat flakes for nourishing porridge.',
      ar: 'من الحبة الكاملة، تُطهى خمس دقائق — ليست سريعة الذوبان.',
    },
    image: 'oats.webp',
    brand: 'dan-azyk',
    packs: [
      {
        fasovka: '500-g',
        price: 85,
      },
    ],
  },
  {
    slug: 'spagetti',
    category: 'krupy',
    name: { ru: 'Спагетти', en: 'Spaghetti pasta', ar: 'سباغيتي' },
    summary: {
      ru: 'Из твёрдых сортов — восемь минут и ни секундой больше.',
      en: 'Durum wheat semolina spaghetti noodles.',
      ar: 'من القمح الصلب — ثماني دقائق ولا ثانية أكثر.',
    },
    image: 'spaghetti.webp',
    country: 'italiya',
    packs: [
      {
        fasovka: '500-g',
        price: 95,
      },
    ],
  },
  {
    slug: 'vermishel',
    category: 'krupy',
    name: { ru: 'Вермишель', en: 'Vermicelli pasta', ar: 'شعيرية (فيرميشيل)' },
    summary: {
      ru: 'Тонкая, для супа — разваривается за три минуты.',
      en: 'Fine short vermicelli pasta for soups and side dishes.',
      ar: 'رفيعة، للشوربة — تنضج خلال ثلاث دقائق.',
    },
    image: 'vermicelli.webp',
    brand: 'dan-azyk',
    marks: ['gost'],
    packs: [
      {
        fasovka: '500-g',
        price: 68,
      },
    ],
  },
  // Flour, sugar, oil
  {
    slug: 'muka-vysshij-sort',
    category: 'muka-sahar',
    name: { ru: 'Мука высший сорт', en: 'All-purpose wheat flour', ar: 'دقيق قمح فاخر درجة أولى' },
    summary: {
      ru: 'Пшеничная, для выпечки и лепёшек — пятикилограммовый мешок ходовее.',
      en: 'Fine sifted premium wheat flour for baking and pasta dough.',
      ar: 'دقيق قمح للخبز والمخبوزات — كيس الخمسة كيلوغرامات هو الأكثر طلباً.',
    },
    image: 'flour-premium.webp',
    brand: 'dan-azyk',
    marks: ['gost'],
    measure: KG,
    tiers: [{ from: 50, off: 8 }],
    packs: [
      {
        price: 65,
      },
    ],
  },
  {
    slug: 'sahar-pesok',
    category: 'muka-sahar',
    name: { ru: 'Сахар-песок', en: 'Granulated sugar', ar: 'سكر أبيض ناعم' },
    summary: {
      ru: 'Кантский, белый, сухой — на варенье берут сразу пять кило.',
      en: 'Pure refined white crystalline sugar.',
      ar: 'من مصنع كانت، أبيض جاف — للمربى يُشترى خمسة كيلوغرامات مرة واحدة.',
    },
    image: 'sugar.webp',
    country: 'kyrgyzstan',
    brand: 'kant',
    marks: ['gost', 'mestnoe'],
    measure: KG,
    tiers: [{ from: 50, off: 5 }],
    packs: [
      {
        price: 95,
      },
    ],
  },
  {
    slug: 'sol-povarennaya',
    category: 'muka-sahar',
    name: { ru: 'Соль поваренная', en: 'Table salt', ar: 'ملح طعام' },
    summary: {
      ru: 'Каменная, помол первый — самая дешёвая позиция на рынке.',
      en: 'Refined iodized food-grade salt.',
      ar: 'ملح صخري بطحن أول — الأرخص في السوق.',
    },
    image: 'salt.webp',
    country: 'kyrgyzstan',
    marks: ['gost', 'mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 25,
      },
    ],
  },
  {
    slug: 'maslo-podsolnechnoe',
    category: 'muka-sahar',
    name: { ru: 'Масло подсолнечное', en: 'Sunflower oil', ar: 'زيت دوار الشمس' },
    summary: {
      ru: 'Рафинированное, без запаха — на жарку и во фритюр.',
      en: 'Refined deodorized sunflower cooking oil.',
      ar: 'زيت مكرر بدون رائحة — للقلي والقلي العميق.',
    },
    image: 'oil-sunflower-1l.webp',
    country: 'rossiya',
    packs: [
      {
        fasovka: '1-l',
        price: 165,
        old: 190,
      },
    ],
  },
  {
    slug: 'maslo-olivkovoe',
    category: 'muka-sahar',
    name: { ru: 'Масло оливковое', en: 'Extra virgin olive oil', ar: 'زيت زيتون بكر ممتاز' },
    summary: {
      ru: 'Extra virgin, первый холодный отжим — в салат, а не на сковороду.',
      en: 'First cold-pressed extra virgin olive oil.',
      ar: 'بكر ممتاز، عصرة أولى باردة — للسلطة لا للمقلاة.',
    },
    image: 'oil-olive.webp',
    country: 'ispaniya',
    packs: [
      {
        fasovka: '0-5-l',
        price: 890,
      },
    ],
  },
  // Tea, coffee, cocoa
  {
    slug: 'chaj-chyornyj',
    category: 'chaj-kofe',
    name: { ru: 'Чай чёрный', en: 'Loose leaf black tea', ar: 'شاي أسود فرط' },
    summary: {
      ru: 'Крупный лист, без пыли и палок — заваривается тёмно и не горчит.',
      en: 'Rich full-bodied black tea leaves with amber infusion.',
      ar: 'ورق كبير بدون غبار أو أعواد — يُخمَّر داكناً بدون مرارة.',
    },
    image: 'tea-black.webp',
    country: 'iran',
    brand: 'too-ash',
    packs: [
      {
        fasovka: '250-g',
        price: 265,
      },
    ],
  },
  {
    slug: 'chaj-zelyonyj',
    category: 'chaj-kofe',
    name: { ru: 'Чай зелёный', en: 'Loose leaf green tea', ar: 'شاي أخضر فرط' },
    summary: {
      ru: 'Тот самый кок-чай, который пьют с молоком и солью.',
      en: 'Refreshing green tea leaves with gentle floral undertones.',
      ar: 'شاي "كوك تشاي" ذاته الذي يُشرب مع الحليب والملح.',
    },
    image: 'tea-green.webp',
    country: 'kitaj',
    brand: 'too-ash',
    packs: [
      {
        fasovka: '250-g',
        price: 285,
      },
    ],
  },
  {
    slug: 'kofe-rastvorimyj',
    category: 'chaj-kofe',
    name: { ru: 'Кофе растворимый', en: 'Instant coffee', ar: 'قهوة سريعة الذوبان' },
    summary: {
      ru: 'Сублимированный, в стеклянной банке — на работу и в дорогу.',
      en: 'Freeze-dried instant coffee granules with rich roast aroma.',
      ar: 'قهوة مجففة بالتجميد في برطمان زجاجي — للعمل والطريق.',
    },
    image: 'coffee-instant.webp',
    packs: [
      {
        fasovka: '250-g',
        price: 480,
      },
    ],
  },
  {
    slug: 'kakao-poroshok',
    category: 'chaj-kofe',
    name: { ru: 'Какао-порошок', en: 'Cocoa powder', ar: 'مسحوق كاكاو طبيعي' },
    summary: {
      ru: 'Тёмный, без сахара — на выпечку и на настоящее какао с молоком.',
      en: 'Natural unsweetened cocoa powder for drinks and baking.',
      ar: 'كاكاو داكن بدون سكر — للمخبوزات ولكاكاو حقيقي مع الحليب.',
    },
    image: 'cocoa.webp',
    marks: ['bez-sahara'],
    packs: [
      {
        fasovka: '250-g',
        price: 195,
      },
    ],
  },
  // Spices
  {
    slug: 'perec-chyornyj-molotyj',
    category: 'specii',
    name: { ru: 'Перец чёрный молотый', en: 'Ground black pepper', ar: 'فلفل أسود مطحون' },
    summary: {
      ru: 'Мелем сами раз в неделю — пахнет, а не пылит.',
      en: 'Aromatic freshly ground black peppercorns.',
      ar: 'نطحنه بأنفسنا أسبوعياً — رائحته قوية وليس غباراً بلا نكهة.',
    },
    image: 'pepper-black.webp',
    packs: [
      {
        fasovka: '50-g',
        price: 65,
      },
    ],
  },
  {
    slug: 'perec-krasnyj-molotyj',
    category: 'specii',
    name: { ru: 'Перец красный молотый', en: 'Ground red chili pepper', ar: 'فلفل أحمر مطحون' },
    summary: {
      ru: 'Средней остроты, ярко-красный — в лагман и в маринад.',
      en: 'Spicy pungent red chili powder.',
      ar: 'حرارة متوسطة ولون أحمر زاهٍ — للغمان والتتبيلة.',
    },
    image: 'pepper-red.webp',
    packs: [
      {
        fasovka: '50-g',
        price: 55,
      },
    ],
  },
  {
    slug: 'lavrovyj-list',
    category: 'specii',
    name: { ru: 'Лавровый лист', en: 'Bay leaves', ar: 'ورق غار' },
    summary: {
      ru: 'Целый, зелёный — коричневый уже ничего не отдаёт.',
      en: 'Whole aromatic dried bay leaves for broths and marinades.',
      ar: 'أوراق كاملة خضراء — البنية منها فقدت نكهتها تماماً.',
    },
    image: 'bay-leaf.webp',
    packs: [
      {
        fasovka: '50-g',
        price: 35,
      },
    ],
  },
  {
    slug: 'korica-molotaya',
    category: 'specii',
    name: { ru: 'Корица молотая', en: 'Ground cinnamon', ar: 'قرفة مطحونة' },
    summary: {
      ru: 'Настоящая цейлонская — в выпечку, в кашу и в кофе.',
      en: 'Fragrant sweet ground cinnamon spice.',
      ar: 'قرفة سيلانية أصلية — للمخبوزات والعصيدة والقهوة.',
    },
    image: 'cinnamon.webp',
    packs: [
      {
        fasovka: '50-g',
        price: 55,
      },
    ],
  },
  {
    slug: 'hmeli-suneli',
    category: 'specii',
    name: { ru: 'Хмели-сунели', en: 'Khmeli suneli spice blend', ar: 'خميلي سونيلي' },
    summary: {
      ru: 'Грузинская смесь — в харчо, в лобио и к мясу.',
      en: 'Traditional Georgian herbal spice mixture.',
      ar: 'خلطة توابل جورجية — للخارتشو واللوبيو واللحوم.',
    },
    image: 'spice-khmeli.webp',
    packs: [
      {
        fasovka: '50-g',
        price: 60,
      },
    ],
  },
  {
    slug: 'pripava-dlya-plova',
    category: 'specii',
    name: { ru: 'Приправа для плова', en: 'Pilaf spice blend', ar: 'بهارات البلوف' },
    summary: {
      ru: 'Своя смесь: зира, барбарис, куркума — мешаем на месте.',
      en: 'House blend of cumin, barberry, coriander, and turmeric for pilaf.',
      ar: 'خلطتنا الخاصة: كمون وبرباريس وكركم — نمزجها في المحل.',
    },
    image: 'spice-pilaf.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '100-g',
        price: 75,
      },
    ],
  },
  // Nuts and dried fruits
  {
    slug: 'greckij-oreh',
    category: 'orehi-suhofrukty',
    name: { ru: 'Грецкий орех очищенный', en: 'Shelled walnuts', ar: 'جوز (عين الجمل) مقشر' },
    summary: {
      ru: 'Арсланбобский, светлое ядро половинками — не крошка.',
      en: 'Sweet wild walnuts from Arslanbob mountain forests.',
      ar: 'من أرسلانبوب، نواة فاتحة اللون على شكل أنصاف — وليست فتاتاً.',
    },
    text: [
      {
        ru: 'Арсланбоб — самый большой в мире ореховый лес, и орех оттуда светлее и слаще привозного. Ядро колют вручную, поэтому идут половинки, а не осколки.',
        en: 'Walnuts from Arslanbob ancient forests: light kernels, smooth non-bitter skin, sun-dried without chemical treatment.',
        ar: 'أرسلانبوب أكبر غابة جوز في العالم، وجوزها أفتح وأحلى من المستورد. تُكسر النواة يدوياً فتخرج أنصافاً لا شظايا.',
      },
      {
        ru: 'Хранить лучше в холодильнике: масло в орехе прогоркает быстрее, чем кажется.',
        en: 'Delivered in sealed packages to preserve fresh nutty aroma and crisp texture.',
        ar: 'يُفضَّل حفظه في الثلاجة: الزيت في الجوز يتزنخ أسرع مما يُتصوَّر.',
      },
    ],
    image: 'walnuts.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'organik'],
    measure: KG,
    tiers: [{ from: 10, off: 6 }],
    packs: [
      {
        price: 960,
      },
    ],
    hit: true,
  },
  {
    slug: 'kuraga',
    category: 'orehi-suhofrukty',
    name: { ru: 'Курага', en: 'Dried apricots', ar: 'مشمش مجفف (قراصيا)' },
    summary: {
      ru: 'Ферганская, тёмная от солнца — светлую сушат с серой, эту нет.',
      en: 'Sun-dried golden apricots from Fergana valley — soft and sweet.',
      ar: 'من وادي فرغانة، داكن من الشمس — الفاتح يُجفَّف بالكبريت وهذا لا.',
    },
    image: 'dried-apricots.webp',
    country: 'uzbekistan',
    marks: ['bez-sahara'],
    packs: [
      {
        fasovka: '500-g',
        price: 380,
      },
    ],
  },
  {
    slug: 'myod-gornyj',
    category: 'orehi-suhofrukty',
    name: { ru: 'Мёд горный', en: 'Mountain honey', ar: 'عسل جبلي' },
    summary: {
      ru: 'С суусамырских пасек, засахаривается к декабрю — значит, настоящий.',
      en: 'Natural raw alpine honey from Suusamyr valley.',
      ar: 'من مناحل سوسامير، يتبلور بحلول ديسمبر — دليل أنه طبيعي.',
    },
    text: [
      {
        ru: 'Мёд качают на джайлоо выше двух тысяч метров, где цветёт эспарцет. Он светлый, густой и к зиме обязательно садится: жидкий круглый год бывает только у грелого.',
        en: 'Harvested from alpine apiaries in Suusamyr valley: sainfoin, sweet clover, mountain flora. Thick, delicately aromatic, with fine creamy crystallization.',
        ar: 'يُجمع العسل من مناحل جبلية على ارتفاع يفوق ألفي متر حيث يزهر الإسبرسيت. فاتح وكثيف، ويتبلور حتماً مع الشتاء: السائل طوال السنة يكون مُسخَّناً مغشوشاً.',
      },
      {
        ru: 'Пасечник тот же четвёртый год, привозит флягами, разливаем при вас.',
        en: '100% raw unpasteurized honey bottled directly from beekeepers.',
        ar: 'نفس النحّال منذ أربع سنوات، يجلبه بالبراميل ونعبّئه أمامك.',
      },
    ],
    image: 'honey.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe', 'fermerskoe', 'organik'],
    measure: KG,
    tiers: [{ from: 10, off: 7 }],
    packs: [
      {
        price: 1240,
      },
    ],
    hit: true,
  },
  // Sauces and canned goods
  {
    slug: 'ketchup-tomatnyj',
    category: 'sousy-konservy',
    name: { ru: 'Кетчуп томатный', en: 'Tomato ketchup', ar: 'كاتشب طماطم' },
    summary: {
      ru: 'Густой, из пасты, а не из крахмала — не течёт с шаурмы.',
      en: 'Rich tomato ketchup with mild spices.',
      ar: 'كثيف من المعجون لا من النشا — لا يسيل من الشاورما.',
    },
    image: 'ketchup.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 110,
      },
    ],
  },
  {
    slug: 'majonez',
    category: 'sousy-konservy',
    name: { ru: 'Майонез', en: 'Mayonnaise', ar: 'مايونيز' },
    summary: {
      ru: 'Провансаль 67% — тот, на котором делают оливье.',
      en: 'Classic rich 67% fat mayonnaise sauce.',
      ar: 'بروفانسال 67% — نفسه الذي يُصنع منه الأوليفييه.',
    },
    image: 'mayo.webp',
    marks: ['gost'],
    packs: [
      {
        fasovka: '500-g',
        price: 145,
        old: 170,
      },
    ],
  },
  {
    slug: 'gorchica-russkaya',
    category: 'sousy-konservy',
    name: { ru: 'Горчица русская', en: 'Russian mustard', ar: 'خردل روسي' },
    summary: {
      ru: 'Злая, до слёз — к холодцу и к сосискам.',
      en: 'Sharp spicy Russian table mustard.',
      ar: 'حار حتى الدموع — للهُلام البارد والنقانق.',
    },
    image: 'mustard-russian.webp',
    marks: ['gost'],
    packs: [
      {
        fasovka: '250-g',
        price: 65,
      },
    ],
  },
  {
    slug: 'sous-soevyj',
    category: 'sousy-konservy',
    name: { ru: 'Соус соевый', en: 'Soy sauce', ar: 'صلصة صويا' },
    summary: {
      ru: 'Натурального брожения — в маринад и в вок.',
      en: 'Naturally brewed savory soy sauce seasoning.',
      ar: 'تخمّر طبيعي — للتتبيلة والووك.',
    },
    image: 'soy-sauce.webp',
    country: 'kitaj',
    packs: [
      {
        fasovka: '0-5-l',
        price: 165,
      },
    ],
  },
  {
    slug: 'pasta-tomatnaya',
    category: 'sousy-konservy',
    name: { ru: 'Паста томатная', en: 'Tomato paste', ar: 'معجون طماطم' },
    summary: {
      ru: 'Двадцать пять процентов сухих веществ — ложка заменяет три помидора.',
      en: 'Concentrated natural tomato paste without additives.',
      ar: 'خمسة وعشرون بالمئة مواد جافة — ملعقة تعادل ثلاث طماطم.',
    },
    image: 'tomato-paste.webp',
    country: 'uzbekistan',
    packs: [
      {
        fasovka: '500-g',
        price: 130,
      },
    ],
  },
  {
    slug: 'uksus-yablochnyj',
    category: 'sousy-konservy',
    name: { ru: 'Уксус яблочный', en: 'Apple cider vinegar', ar: 'خل التفاح' },
    summary: {
      ru: 'Шестипроцентный — в маринад к шашлыку и в салат.',
      en: 'Natural fermented apple cider vinegar 6%.',
      ar: 'بتركيز ستة بالمئة — لتتبيلة الشاشليك والسلطة.',
    },
    image: 'vinegar-apple.webp',
    packs: [
      {
        fasovka: '0-5-l',
        price: 95,
      },
    ],
  },
  {
    slug: 'lecho',
    category: 'sousy-konservy',
    name: { ru: 'Лечо', en: 'Lecho vegetable stew', ar: 'ليتشو (فلفل بالطماطم)' },
    summary: {
      ru: 'Перец в томате, крупными полосами — готовый гарнир из банки.',
      en: 'Sweet bell peppers in seasoned tomato sauce.',
      ar: 'فلفل بشرائح كبيرة في صلصة الطماطم — طبق جانبي جاهز من العلبة.',
    },
    image: 'lecho.webp',
    country: 'uzbekistan',
    packs: [
      {
        fasovka: 'banka',
        price: 175,
      },
    ],
  },
  {
    slug: 'masliny',
    category: 'sousy-konservy',
    name: { ru: 'Маслины', en: 'Black olives', ar: 'زيتون أسود' },
    summary: {
      ru: 'Чёрные, без косточки — в салат и на пиццу.',
      en: 'Pitted ripe black olives in mild brine.',
      ar: 'أسود بدون نواة — للسلطة والبيتزا.',
    },
    image: 'olives-black.webp',
    country: 'ispaniya',
    packs: [
      {
        fasovka: 'banka',
        price: 185,
      },
    ],
  },
  {
    slug: 'ogurcy-marinovannye',
    category: 'sousy-konservy',
    name: { ru: 'Огурцы маринованные', en: 'Pickled cucumbers', ar: 'خيار مخلل' },
    summary: {
      ru: 'Мелкие, хрустящие — те, что не размякают к весне.',
      en: 'Crunchy pickled gherkins with dill and mustard seed.',
      ar: 'صغير ومقرمش — لا يلين حتى الربيع.',
    },
    image: 'cucumbers-pickled.webp',
    packs: [
      {
        fasovka: 'banka',
        price: 195,
      },
    ],
  },
  {
    slug: 'pomidory-marinovannye',
    category: 'sousy-konservy',
    name: { ru: 'Помидоры маринованные', en: 'Pickled tomatoes', ar: 'طماطم مخللة' },
    summary: {
      ru: 'Целые, плотные, с укропом и чесноком в банке.',
      en: 'Whole marinated tomatoes in herb-infused brine.',
      ar: 'كاملة ومتماسكة، مع الشبت والثوم في المرطبان.',
    },
    image: 'tomatoes-pickled.webp',
    packs: [
      {
        fasovka: 'banka',
        price: 210,
      },
    ],
  },
  {
    slug: 'kukuruza-konservirovannaya',
    category: 'sousy-konservy',
    name: { ru: 'Кукуруза консервированная', en: 'Canned sweet corn', ar: 'ذرة معلبة حلوة' },
    summary: {
      ru: 'Сладкая, зерно к зерну — в салат и детям прямо из банки.',
      en: 'Crisp sweet corn kernels in light brine.',
      ar: 'حلوة، حبة إلى حبة — للسلطة وللأطفال مباشرة من العلبة.',
    },
    image: 'corn.webp',
    packs: [
      {
        fasovka: 'banka',
        price: 95,
      },
    ],
  },
  {
    slug: 'goroshek-zelyonyj',
    category: 'sousy-konservy',
    name: { ru: 'Горошек зелёный', en: 'Canned green peas', ar: 'بازلاء خضراء معلبة' },
    summary: {
      ru: 'Мозговых сортов, нежный — без него оливье не оливье.',
      en: 'Tender young green peas in brine.',
      ar: 'من الأصناف الطرية — بدونها لا يكتمل الأوليفييه.',
    },
    image: 'peas.webp',
    packs: [
      {
        fasovka: 'banka',
        price: 85,
      },
    ],
  },
  {
    slug: 'sardiny-v-masle',
    category: 'sousy-konservy',
    name: { ru: 'Сардины в масле', en: 'Canned sardines in oil', ar: 'سردين بالزيت' },
    summary: {
      ru: 'Целые тушки в масле — на бутерброд и в рыбный суп.',
      en: 'Wild Atlantic sardine pieces in vegetable oil.',
      ar: 'تشكيلة كاملة بالزيت — للسندويش وشوربة السمك.',
    },
    image: 'sardines.webp',
    packs: [
      {
        fasovka: 'banka',
        price: 130,
      },
    ],
  },
  {
    slug: 'tunec-konservirovannyj',
    category: 'sousy-konservy',
    name: { ru: 'Тунец консервированный', en: 'Canned tuna chunks', ar: 'تونة معلبة' },
    summary: {
      ru: 'Кусочками в собственном соку — в салат «Цезарь» и в пасту.',
      en: 'Tuna chunks in natural juice — high protein for salads.',
      ar: 'قطع في عصيرها الطبيعي — لسلطة السيزر والمعكرونة.',
    },
    image: 'tuna.webp',
    packs: [
      {
        fasovka: 'banka',
        price: 195,
        old: 230,
      },
    ],
  },
  // Frozen foods
  {
    slug: 'pelmeni-domashnie',
    category: 'zamorozka',
    name: { ru: 'Пельмени домашние', en: 'Homemade pelmeni', ar: 'بيلميني منزلي' },
    summary: {
      ru: 'Лепим сами каждое утро — тесто тонкое, мясо говяжье.',
      en: 'Handmade meat dumplings filled with seasoned beef and onions.',
      ar: 'نُشكّله يدوياً كل صباح — عجين رقيق ولحم بقري.',
    },
    image: 'pelmeni-home.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-kg',
        price: 480,
        old: 550,
      },
    ],
    hit: true,
  },
  {
    slug: 'manty',
    category: 'zamorozka',
    name: { ru: 'Манты', en: 'Manti dumplings', ar: 'مانتي' },
    summary: {
      ru: 'С мясом и луком, крупные — на пар сорок минут.',
      en: 'Traditional large steamed dumplings filled with chopped meat and onions.',
      ar: 'باللحم والبصل، كبيرة الحجم — أربعون دقيقة على البخار.',
    },
    image: 'manty.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 290,
      },
    ],
  },
  {
    slug: 'hinkali',
    category: 'zamorozka',
    name: { ru: 'Хинкали', en: 'Khinkali dumplings', ar: 'خينكالي' },
    summary: {
      ru: 'С бульоном внутри — варить восемь минут и есть руками.',
      en: 'Georgian spiced meat dumplings with savory interior broth.',
      ar: 'بمرق داخلي — تُسلق ثماني دقائق وتؤكل باليد.',
    },
    image: 'khinkali.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 320,
      },
    ],
  },
  {
    slug: 'vareniki-s-tvorogom',
    category: 'zamorozka',
    name: {
      ru: 'Вареники с творогом',
      en: 'Vareniki with cottage cheese',
      ar: 'فارينيكي بالجبن القريش',
    },
    summary: {
      ru: 'Со сметаной — детский ужин, который готовится за семь минут.',
      en: 'Handmade dumplings filled with sweet cottage cheese.',
      ar: 'بالقشدة الحامضة — عشاء الأطفال الجاهز خلال سبع دقائق.',
    },
    image: 'vareniki-cottage.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 195,
      },
    ],
  },
  {
    slug: 'vareniki-s-vishnej',
    category: 'zamorozka',
    name: { ru: 'Вареники с вишней', en: 'Vareniki with cherries', ar: 'فارينيكي بالكرز' },
    summary: {
      ru: 'Кисло-сладкие, сок не вытекает при варке.',
      en: 'Sweet dessert dumplings stuffed with pitted sour cherries.',
      ar: 'فارينيكي حلوة محشوة بالكرز الحامض اللذيذ.',
    },
    image: 'vareniki-cherry.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 210,
      },
    ],
  },
  {
    slug: 'blinchiki-s-myasom',
    category: 'zamorozka',
    name: { ru: 'Блинчики с мясом', en: 'Crepes with meat filling', ar: 'فطائر كريب باللحم' },
    summary: {
      ru: 'Обжарить с двух сторон — три минуты, и обед готов.',
      en: 'Thin golden crepes rolled with savory ground beef filling.',
      ar: 'كريب رقيق ذهبي محشو بلحم بقري مفروم ومتبل.',
    },
    image: 'pancakes-meat.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 240,
      },
    ],
  },
  {
    slug: 'kotlety-kurinye',
    category: 'zamorozka',
    name: { ru: 'Котлеты куриные', en: 'Chicken cutlets', ar: 'كفتة دجاج بانيه' },
    summary: {
      ru: 'Из своего фарша, в панировке — на сковороду прямо из морозилки.',
      en: 'Handmade tender chicken patties ready for pan-frying.',
      ar: 'كفتة دجاج طازجة متبلة ومغطاة بالبقسماط جاهزة للقلي.',
    },
    image: 'cutlets-chicken.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 260,
      },
    ],
  },
  {
    slug: 'smes-ovoshchnaya',
    category: 'zamorozka',
    name: { ru: 'Смесь овощная', en: 'Frozen mixed vegetables', ar: 'خضار مشكلة مجمدة' },
    summary: {
      ru: 'Брокколи, перец, цукини, черри — на сковороду без разморозки.',
      en: 'Quick-frozen blend of broccoli, peppers, zucchini, and cherry tomatoes.',
      ar: 'مزيج خضار مجمد من البروكلي والفلفل والكوسا والطماطم الكرزية.',
    },
    image: 'veg-mix.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 145,
      },
    ],
  },
  {
    slug: 'testo-drozhzhevoe',
    category: 'zamorozka',
    name: { ru: 'Тесто дрожжевое', en: 'Frozen yeast dough', ar: 'عجينة خميرة مجمدة' },
    summary: {
      ru: 'Готовое, размораживается за час — на пирожки и на самсу.',
      en: 'Ready-to-bake yeast dough for pies and samosas.',
      ar: 'عجينة خميرة جاهزة للمخبوزات والفطائر والسمبوسك.',
    },
    image: 'dough-yeast.webp',
    packs: [
      {
        fasovka: '500-g',
        price: 95,
      },
    ],
  },
  {
    slug: 'morozhenoe-plombir',
    category: 'zamorozka',
    name: { ru: 'Мороженое пломбир', en: 'Plombir ice cream', ar: 'آيس كريم بلومبير فانيليا' },
    summary: {
      ru: 'В вафельном стаканчике, пятнадцать процентов жирности.',
      en: 'Rich traditional whole milk vanilla ice cream in a wafer cup.',
      ar: 'آيس كريم حليب طبيعي غني ودسم 15% في كوب ويفر.',
    },
    image: 'ice-cream-plombir.webp',
    marks: ['gost'],
    packs: [
      {
        fasovka: 'sht',
        price: 75,
      },
    ],
  },
  {
    slug: 'morozhenoe-fruktovyj-lyod',
    category: 'zamorozka',
    name: {
      ru: 'Мороженое фруктовый лёд',
      en: 'Fruit popsicle ice',
      ar: 'مثلجات فواكه مثلجة على عصا',
    },
    summary: {
      ru: 'На палочке, из сока — летом уходит быстрее пломбира.',
      en: 'Refreshing frozen fruit juice ice pop on a stick.',
      ar: 'عصائر فواكه مثلجة ومنعشة على عصا للصيف.',
    },
    image: 'ice-cream-fruit.webp',
    packs: [
      {
        fasovka: 'sht',
        price: 45,
      },
    ],
  },
  // Sweets and snacks
  {
    slug: 'chak-chak',
    category: 'sladosti',
    name: { ru: 'Чак-чак', en: 'Chak-chak honey pastry', ar: 'حلوى تشاك تشاك بالعسل' },
    summary: {
      ru: 'На своём мёде, липкий и тягучий — к чаю и на той.',
      en: 'Traditional crispy fried dough bites drenched in natural honey.',
      ar: 'قطع عجين مقلية مقرمشة ومغموسة بالعسل الطبيعي للمناسبات والشاي.',
    },
    image: 'chak-chak.webp',
    country: 'kyrgyzstan',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '500-g',
        price: 290,
      },
    ],
  },
  {
    slug: 'pahlava',
    category: 'sladosti',
    name: { ru: 'Пахлава', en: 'Baklava', ar: 'بقلاوة بالجوز' },
    summary: {
      ru: 'Слоёная, с грецким орехом и сиропом — режем ромбами.',
      en: 'Layered phyllo pastry filled with walnuts and honey syrup.',
      ar: 'طبقات عجين مورقة ومحشوة بالجوز ومسقية بشراب العسل.',
    },
    image: 'baklava.webp',
    country: 'turciya',
    packs: [
      {
        fasovka: '500-g',
        price: 420,
        stock: 0,
      },
    ],
  },
  {
    slug: 'halva-podsolnechnaya',
    category: 'sladosti',
    name: { ru: 'Халва подсолнечная', en: 'Sunflower halva', ar: 'حلاوة طحينية ببذور دوار الشمس' },
    summary: {
      ru: 'Рассыпчатая, на развес — режем от большого бруска.',
      en: 'Crumbly sweet confection sliced from large sunflower blocks.',
      ar: 'حلاوة طحينية هشة وحلوة مقطعة من قوالب دوار الشمس الكبيرة.',
    },
    image: 'halva.webp',
    country: 'uzbekistan',
    marks: ['gost'],
    packs: [
      {
        fasovka: '500-g',
        price: 220,
      },
    ],
  },
  {
    slug: 'konfety-shokoladnye',
    category: 'sladosti',
    name: { ru: 'Конфеты шоколадные', en: 'Chocolate candies', ar: 'حلويات وشوكولاتة مشكلة' },
    summary: {
      ru: 'Ассорти на развес — берут к чаю и в подарочный кулёк.',
      en: 'Assorted chocolate-covered praline candies sold by weight.',
      ar: 'تشكيلة شوكولاتة برالين فاخرة تباع بالوزن للضيافة والشاي.',
    },
    image: 'candy-chocolate.webp',
    country: 'kyrgyzstan',
    brand: 'riha',
    packs: [
      {
        fasovka: '500-g',
        price: 380,
      },
    ],
  },
  {
    slug: 'konfety-korovka',
    category: 'sladosti',
    name: {
      ru: 'Конфеты «Коровка»',
      en: 'Korovka fudge candies',
      ar: 'سكاكر حلوى كوروڤكا بالحليب',
    },
    summary: {
      ru: 'Помадка в шоколаде — вкус, который не меняли сорок лет.',
      en: 'Classic creamy milk fudge candies with soft fondant centers.',
      ar: 'حلوى الحليب وفدج الكراميل الطري الكلاسيكي.',
    },
    image: 'candy-korovka.webp',
    country: 'kyrgyzstan',
    brand: 'riha',
    marks: ['gost'],
    packs: [
      {
        fasovka: '500-g',
        price: 260,
        old: 310,
      },
    ],
  },
  {
    slug: 'shokolad-tyomnyj',
    category: 'sladosti',
    name: { ru: 'Шоколад тёмный', en: 'Dark chocolate bar', ar: 'شوكولاتة داكنة 72%' },
    summary: {
      ru: 'Семьдесят два процента какао — горчит как надо.',
      en: 'Rich 72% dark chocolate bar with intense cocoa flavor.',
      ar: 'لوح شوكولاتة سوداء فاخرة بنسبة 72% كاكاو بنكهة غنية ومرارة معتدلة.',
    },
    image: 'chocolate-dark.webp',
    country: 'kyrgyzstan',
    brand: 'riha',
    packs: [
      {
        fasovka: '100-g',
        price: 120,
      },
    ],
  },
  {
    slug: 'shokolad-molochnyj',
    category: 'sladosti',
    name: { ru: 'Шоколад молочный', en: 'Milk chocolate bar', ar: 'شوكولاتة بالحليب' },
    summary: {
      ru: 'Сливочный, тает во рту — детская плитка.',
      en: 'Smooth creamy milk chocolate bar with delicate sweetness.',
      ar: 'لوح شوكولاتة بالحليب ناعمة وغنية تذوب في الفم.',
    },
    image: 'chocolate-milk.webp',
    country: 'kyrgyzstan',
    brand: 'riha',
    packs: [
      {
        fasovka: '100-g',
        price: 110,
      },
    ],
  },
  {
    slug: 'pechenye-yubilejnoe',
    category: 'sladosti',
    name: { ru: 'Печенье «Юбилейное»', en: 'Yubileynoe biscuits', ar: 'بسكويت يوبيلينوي الكلاسيكي' },
    summary: {
      ru: 'Сухое, к чаю и в чизкейк — раскрошить и смешать с маслом.',
      en: 'Classic sweet wheat biscuits for tea or cheesecake crust.',
      ar: 'بسكويت القمح الكلاسيكي للشاي وقاعدة التشيز كيك.',
    },
    image: 'cookie-yubileynoe.webp',
    marks: ['gost'],
    packs: [
      {
        fasovka: '250-g',
        price: 95,
        old: 115,
      },
    ],
  },
  {
    slug: 'pechenye-shokoladnoe',
    category: 'sladosti',
    name: { ru: 'Печенье шоколадное', en: 'Chocolate cookies', ar: 'بسكويت بقطع الشوكولاتة' },
    summary: {
      ru: 'С кусочками шоколада, мягкое внутри.',
      en: 'Soft-baked cookies loaded with rich chocolate chips.',
      ar: 'بسكويت مخبوز طري ومحشو بقطع الشوكولاتة اللذيذة.',
    },
    image: 'cookie-chocolate.webp',
    packs: [
      {
        fasovka: '250-g',
        price: 145,
      },
    ],
  },
  {
    slug: 'vafli-shokoladnye',
    category: 'sladosti',
    name: { ru: 'Вафли шоколадные', en: 'Chocolate wafers', ar: 'ويفر بالشوكولاتة' },
    summary: {
      ru: 'Хрустящие слои с шоколадной прослойкой.',
      en: 'Crispy layered wafer biscuits with chocolate cream filling.',
      ar: 'رقائق ويفر مقرمشة بحشوة كريمة الشوكولاتة الغنية.',
    },
    image: 'waffle-chocolate.webp',
    packs: [
      {
        fasovka: '250-g',
        price: 120,
      },
    ],
  },
  {
    slug: 'marmelad',
    category: 'sladosti',
    name: { ru: 'Мармелад', en: 'Fruit jelly marmalade', ar: 'مارملاد جيلي الفواكه' },
    summary: {
      ru: 'На агаре, в сахаре — дольками, как в детстве.',
      en: 'Agar-based fruit-flavored jelly slices coated in sugar crystals.',
      ar: 'شرائح جيلي فواكه طبيعية على مادة الآغار ومغطاة بحبيبات السكر.',
    },
    image: 'marmalade.webp',
    packs: [
      {
        fasovka: '250-g',
        price: 130,
      },
    ],
  },
  {
    slug: 'pastila',
    category: 'sladosti',
    name: { ru: 'Пастила', en: 'Apple pastila', ar: 'باستيلا التفاح الطبيعية' },
    summary: {
      ru: 'Яблочная, без сахара — сушат в пласт и режут лентой.',
      en: 'Sugar-free natural whipped apple pastila ribbons.',
      ar: 'شرائط باستيلا التفاح الطبيعية المجففة الخالية من السكر.',
    },
    image: 'pastila.webp',
    country: 'kyrgyzstan',
    marks: ['bez-sahara', 'mestnoe'],
    packs: [
      {
        fasovka: '250-g',
        price: 165,
      },
    ],
  },
  {
    slug: 'chipsy',
    category: 'sladosti',
    name: { ru: 'Чипсы', en: 'Potato chips', ar: 'رقائق شيبس البطاطس' },
    summary: {
      ru: 'Из настоящего картофеля, с солью — самая простая позиция полки.',
      en: 'Crispy salted potato chips made from real potatoes.',
      ar: 'رقائق بطاطس طبيعية مقرمشة ومملحة بالملح البحري.',
    },
    image: 'chips.webp',
    packs: [
      {
        fasovka: '100-g',
        price: 85,
      },
    ],
  },
  {
    slug: 'popkorn',
    category: 'sladosti',
    name: { ru: 'Попкорн', en: 'Microwave popcorn', ar: 'فشار للمايكرويف' },
    summary: {
      ru: 'Зерно для микроволновки — три минуты и полная миска.',
      en: 'Microwave popcorn kernels — 3 minutes for a warm full bowl.',
      ar: 'ذرة فشار للمايكرويف — ثلاث دقائق لوعاء دافئ وكامل.',
    },
    image: 'popcorn.webp',
    packs: [
      {
        fasovka: '100-g',
        price: 75,
      },
    ],
  },
  // Beverages
  {
    slug: 'voda-negazirovannaya',
    category: 'napitki',
    name: {
      ru: 'Вода негазированная',
      en: 'Still mineral water',
      ar: 'مياه معدنية طبيعية غير غازية',
    },
    summary: {
      ru: 'Артезианская, из скважины под Аламедином — двухлитровка.',
      en: 'Artesian mountain still water from Alamedin wells in 2 L bottle.',
      ar: 'مياه شرب آبار أرتوازية نقية من ينابيع ألاميدين في عبوة 2 لتر.',
    },
    image: 'water-still.webp',
    country: 'kyrgyzstan',
    brand: 'artezian',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '2-l',
        price: 45,
      },
    ],
    hit: true,
  },
  {
    slug: 'kvas-hlebnyj',
    category: 'napitki',
    name: { ru: 'Квас хлебный', en: 'Bread kvas', ar: 'مشروب كفاس الخبز التقليدي' },
    summary: {
      ru: 'Живого брожения, из бочки в бутылку — хранится пять дней.',
      en: 'Fresh naturally fermented barrel kvas bottled daily — 5-day shelf life.',
      ar: 'مشروب كفاس مخمر طبيعياً من البراميل يومياً — مدة صلاحية 5 أيام.',
    },
    image: 'kvass-bread.webp',
    country: 'kyrgyzstan',
    brand: 'shoro',
    marks: ['mestnoe'],
    packs: [
      {
        fasovka: '1-l',
        price: 95,
      },
    ],
  },
  {
    slug: 'kompot-iz-suhofruktov',
    category: 'napitki',
    name: { ru: 'Компот из сухофруктов', en: 'Dried fruit compote', ar: 'كومبوت الفواكه المجففة' },
    summary: {
      ru: 'В банке, с курагой и черносливом — без сахара, только фрукт.',
      en: 'Simmered jarred compote of dried apricots and prunes — sugar-free.',
      ar: 'كومبوت مطهو في مرطبان بالمشمش والبرقوق المجفف بدون سكر مضاف.',
    },
    image: 'kompot.webp',
    marks: ['bez-sahara'],
    packs: [
      {
        fasovka: 'banka',
        price: 110,
      },
    ],
  },
  {
    slug: 'mors-klyukvennyj',
    category: 'napitki',
    name: { ru: 'Морс клюквенный', en: 'Cranberry mors', ar: 'عصير كرانبيري (مورس التوت البري)' },
    summary: {
      ru: 'Кислый, неразбавленный — разводят водой по вкусу.',
      en: 'Tart undiluted wild cranberry fruit drink.',
      ar: 'مشروب توت بري حامض ومنعش غير مخفف يخفف بالماء حسب الرغبة.',
    },
    image: 'mors-cranberry.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 130,
      },
    ],
  },
  {
    slug: 'sok-yablochnyj',
    category: 'napitki',
    name: { ru: 'Сок яблочный', en: 'Apple juice', ar: 'عصير تفاح طبيعي' },
    summary: {
      ru: 'Прямого отжима, мутный — сахара не добавляли.',
      en: 'Direct-pressed cloudy natural apple juice without added sugar.',
      ar: 'عصير تفاح طبيعي معصور مباشرة بدون سكر مضاف.',
    },
    image: 'juice-apple.webp',
    country: 'kyrgyzstan',
    marks: ['bez-sahara', 'mestnoe'],
    packs: [
      {
        fasovka: '1-l',
        price: 145,
      },
    ],
  },
  {
    slug: 'sok-apelsinovyj',
    category: 'napitki',
    name: { ru: 'Сок апельсиновый', en: 'Orange juice', ar: 'عصير برتقال طبيعي' },
    summary: {
      ru: 'С мякотью — на завтрак и детям в школу.',
      en: 'Citrus orange juice with natural fruit pulp.',
      ar: 'عصير برتقال طبيعي مع اللب للإفطار والأطفال.',
    },
    image: 'juice-orange.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 155,
      },
    ],
  },
  {
    slug: 'sok-multifrukt',
    category: 'napitki',
    name: { ru: 'Сок мультифрукт', en: 'Multifruit juice', ar: 'عصير فواكه مشكلة (ملتي فروت)' },
    summary: {
      ru: 'Пять фруктов в одном — самый ходовой на детском столе.',
      en: 'Five-fruit tropical blend — kids party favorite.',
      ar: 'مزيج عصائر خمس فواكه استوائية مفضل في حفلات الأطفال.',
    },
    image: 'juice-multifruit.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 145,
        old: 175,
      },
    ],
  },
  {
    slug: 'sok-beryozovyj',
    category: 'napitki',
    name: { ru: 'Сок берёзовый', en: 'Birch sap drink', ar: 'عصير شجرة البتولا (بيرش)' },
    summary: {
      ru: 'Прозрачный, чуть сладковатый — весенняя редкость в банке.',
      en: 'Clear refreshing springtime birch sap drink.',
      ar: 'عصير شجرة البتولا الطبيعي الصافي المنعش ذو الحلاوة الخفيفة.',
    },
    image: 'juice-birch.webp',
    country: 'belarus',
    packs: [
      {
        fasovka: '1-l',
        price: 120,
      },
    ],
  },
  {
    slug: 'nektar-persikovyj',
    category: 'napitki',
    name: { ru: 'Нектар персиковый', en: 'Peach nectar', ar: 'نكتار الخوخ الطبيعي' },
    summary: {
      ru: 'Густой, с мякотью — почти пюре, пьётся медленно.',
      en: 'Thick velvety fruit nectar made with rich peach puree.',
      ar: 'نكتار خوخ مخملي كثيف وسميك غني بقطع ومهروس الخوخ.',
    },
    image: 'nectar-peach.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 140,
      },
    ],
  },
  {
    slug: 'limonad-tarhun',
    category: 'napitki',
    name: {
      ru: 'Лимонад «Тархун»',
      en: 'Tarkhun tarragon lemonade',
      ar: 'مشروب ليموناضة الطرخون (تارخون)',
    },
    summary: {
      ru: 'Тот самый зелёный, на эстрагоне — в стеклянной бутылке.',
      en: 'Classic emerald carbonated lemonade with natural tarragon.',
      ar: 'ليموناضة الطرخون الخضراء الكلاسيكية في زجاجة بنكهة الأعشاب المنعشة.',
    },
    image: 'lemonade-tarhun.webp',
    marks: ['gost'],
    packs: [
      {
        fasovka: '1-l',
        price: 85,
      },
    ],
  },
  {
    slug: 'limonad-dyushes',
    category: 'napitki',
    name: {
      ru: 'Лимонад «Дюшес»',
      en: 'Duchesse pear lemonade',
      ar: 'مشروب ليموناضة الكمثرى (دوشيس)',
    },
    summary: {
      ru: 'Грушевый, сладкий — вкус школьного буфета.',
      en: 'Sparkling sweet pear flavored soda.',
      ar: 'مشروب غازي بنكهة الكمثرى الحلوة اللذيذة.',
    },
    image: 'lemonade-dushes.webp',
    marks: ['gost'],
    packs: [
      {
        fasovka: '1-l',
        price: 85,
      },
    ],
  },
  {
    slug: 'chaj-holodnyj',
    category: 'napitki',
    name: { ru: 'Чай холодный', en: 'Iced lemon tea', ar: 'شاي مثلج بالليمون' },
    summary: {
      ru: 'С лимоном, в бутылке — берут в жару у кассы.',
      en: 'Chilled bottled black tea with real lemon juice.',
      ar: 'شاي أسود مثلج مع عصير ليمون حقيقي في زجاجة منعشة.',
    },
    image: 'ice-tea.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 105,
      },
    ],
  },
  {
    slug: 'kola',
    category: 'napitki',
    name: { ru: 'Кола', en: 'Cola soda', ar: 'مشروب كولا غازي' },
    summary: {
      ru: 'Классическая, в литровой бутылке — к пицце и на той.',
      en: 'Classic 1 L bottled carbonated cola soda.',
      ar: 'مشروب كولا غازي كلاسيكي في زجاجة 1 لتر للبيتزا والمناسبات.',
    },
    image: 'cola.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 95,
      },
    ],
  },
  {
    slug: 'sprajt',
    category: 'napitki',
    name: { ru: 'Спрайт', en: 'Sprite soda', ar: 'مشروب سبرايت غازي' },
    summary: {
      ru: 'Лимон-лайм, без красителя — самая холодная в холодильнике.',
      en: 'Clear lemon-lime carbonated soda.',
      ar: 'مشروب غازي شفاف بنكهة الليمون واللايم المنعش.',
    },
    image: 'sprite.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 95,
      },
    ],
  },
  {
    slug: 'fanta',
    category: 'napitki',
    name: { ru: 'Фанта', en: 'Fanta orange soda', ar: 'مشروب فانتا برتقال' },
    summary: {
      ru: 'Апельсиновая газировка — детская половина стола.',
      en: 'Bright orange flavored carbonated soda.',
      ar: 'مشروب غازي بنكهة البرتقال الزاهية المحبوبة للأطفال.',
    },
    image: 'fanta.webp',
    packs: [
      {
        fasovka: '1-l',
        price: 95,
      },
    ],
  },
  {
    slug: 'energetik',
    category: 'napitki',
    name: { ru: 'Энергетик', en: 'Energy drink', ar: 'مشروب طاقة' },
    summary: {
      ru: 'Банка на пол-литра — до восемнадцати не продаём.',
      en: '500 ml energy drink with caffeine and taurine.',
      ar: 'مشروب طاقة 500 مل بالكافيين والتورين (لا يُباع لمن هم دون 18 عاماً).',
    },
    image: 'energy.webp',
    packs: [
      {
        fasovka: '0-5-l',
        price: 130,
        stock: 0,
      },
    ],
  },
  // Household chemicals and hygiene
  {
    slug: 'poroshok-stiralnyj',
    category: 'bytovaya-himiya',
    name: { ru: 'Порошок стиральный', en: 'Laundry detergent powder', ar: 'مسحوق غسيل أوتوماتيك' },
    summary: {
      ru: 'Автомат, на тридцать стирок — берут раз в два месяца.',
      en: 'Automatic washing machine powder for 30 wash loads.',
      ar: 'مسحوق غسيل للغسالات الأوتوماتيكية يكفي 30 غسلة بنظافة فائقة.',
    },
    image: 'laundry-powder.webp',
    packs: [
      {
        fasovka: '3-kg',
        price: 690,
        old: 790,
      },
    ],
  },
  {
    slug: 'sredstvo-dlya-posudy',
    category: 'bytovaya-himiya',
    name: {
      ru: 'Средство для мытья посуды',
      en: 'Dishwashing liquid',
      ar: 'سائل غسيل الأطباق والصحون',
    },
    summary: {
      ru: 'Концентрат, смывается без следа — не скрипит и не пахнет.',
      en: 'Concentrated grease-cutting dish detergent — rinses clean without residue.',
      ar: 'سائل غسيل أطباق مركز يزيل الدهون وينظف بالكامل بدون بقايا ورائحة.',
    },
    image: 'dish-soap.webp',
    packs: [
      {
        fasovka: '0-5-l',
        price: 145,
      },
    ],
  },
  {
    slug: 'sredstvo-dlya-styokol',
    category: 'bytovaya-himiya',
    name: { ru: 'Средство для стёкол', en: 'Glass cleaner spray', ar: 'بخاخ منظف الزجاج والمرايا' },
    summary: {
      ru: 'С распылителем, без разводов — на окна и на зеркала.',
      en: 'Trigger spray streak-free glass and mirror cleaner.',
      ar: 'بخاخ تنظيف الزجاج والمرايا يلمع بدون ترك أي آثار أو خطوط.',
    },
    image: 'glass-cleaner.webp',
    packs: [
      {
        fasovka: '0-5-l',
        price: 165,
      },
    ],
  },
  {
    slug: 'shampun',
    category: 'bytovaya-himiya',
    name: { ru: 'Шампунь', en: 'Shampoo', ar: 'شامبو للعناية بالشعر' },
    summary: {
      ru: 'Для всех типов волос, семейный объём.',
      en: 'Family-size everyday shampoo for all hair types.',
      ar: 'شامبو عائلي يومي لطيف لجميع أنواع الشعر.',
    },
    image: 'shampoo.webp',
    packs: [
      {
        fasovka: '0-5-l',
        price: 320,
        old: 390,
      },
    ],
  },
  {
    slug: 'pasta-zubnaya',
    category: 'bytovaya-himiya',
    name: { ru: 'Паста зубная', en: 'Toothpaste', ar: 'معجون أسنان بالفلورايد' },
    summary: {
      ru: 'С фтором, мятная — стандартный тюбик на месяц.',
      en: 'Fluoride cavity protection mint toothpaste tube.',
      ar: 'معجون أسنان بالنعناع والفلورايد لحماية الأسنان من التسوس.',
    },
    image: 'toothpaste.webp',
    packs: [
      {
        fasovka: 'sht',
        price: 165,
      },
    ],
  },
  {
    slug: 'bumaga-tualetnaya',
    category: 'bytovaya-himiya',
    name: {
      ru: 'Бумага туалетная',
      en: 'Toilet paper (8 rolls)',
      ar: 'ورق تواليت مناديل حمام (8 لفات)',
    },
    summary: {
      ru: 'Двухслойная, восемь рулонов — то, за чем возвращаются с полдороги.',
      en: 'Soft 2-ply embossed bathroom tissue pack.',
      ar: 'مناديل حمام مزدوجة الطبقات ناعمة ومضغوطة عبوة 8 لفات.',
    },
    image: 'toilet-paper.webp',
    packs: [
      {
        fasovka: 'upakovka',
        price: 220,
      },
    ],
  },
  {
    slug: 'pakety-dlya-musora',
    category: 'bytovaya-himiya',
    name: { ru: 'Пакеты для мусора 30 л', en: 'Trash bags 30 L', ar: 'أكياس نفايات 30 لتر' },
    summary: {
      ru: 'Тридцать штук в рулоне, с завязками — не рвутся на углах.',
      en: 'Pack of 30 sturdy plastic garbage bags with tie strings.',
      ar: 'أكياس قمامة متينة برباط سحب 30 قطعة لا تتمزق عند الحواف.',
    },
    image: 'trash-bags-30l.webp',
    packs: [
      {
        fasovka: 'upakovka',
        price: 95,
      },
    ],
  },
]
