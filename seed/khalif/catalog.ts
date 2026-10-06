/*
 * The butcher's own catalogue.
 *
 * These fourteen cuts stand in the market's own shelves today, and that is exactly the point: «a
 * market does not butcher meat, it lets out the meat row». They belong to a butcher by nature, so
 * they are his catalogue here — names, summaries and texts moved across as they were written, in
 * the three languages the material already carries. Nothing was invented and nothing translated by
 * anybody new.
 *
 * The photographs are the butcher's own, and that is a REVERSAL: they used to be borrowed from the
 * market, on the argument that one picture of one and the same meat need not be copied to mark a
 * change of owner. True while the borrowed pictures were the only ones there were. They were bare
 * cut-outs shot for a grocery shelf, and a butcher whose whole trade is that the meat looks worth
 * buying cannot sell from them — so this shop was shot for itself, marinades and shelves included,
 * and the market goes on showing what it is sent.
 *
 * Prices are the market's less about fifteen per cent, and that is not decoration — the next item
 * gives the market a markup, and its shelf has to stay roughly where it stands today. A fixture
 * where the butcher charges retail would make that markup either invisible or absurd.
 *
 * Shelves are the butcher's own: beef and lamb apart, which a market keeps together because to it
 * they are one row. Two shelves rather than one is also what gives the next item a selection worth
 * looking at — «the poultry and the beef go to the market, the lamb stays home» — instead of «all».
 */
export interface KhalifMeasure {
  unit: Record<string, string>
  steps: number
  min: number
}

export interface KhalifPack {
  price: number
  // A struck-out price, where the shop is selling something down. Carried across with the rest and
  // discounted by the same fifteen per cent, or the old price would be the market's and the new one
  // the butcher's — two shops in one line.
  old?: number
  stock?: number
}

export interface KhalifProduct {
  slug: string
  category: string
  name: Record<string, string>
  summary?: Record<string, string>
  text?: Record<string, string>[]
  image: string
  measure?: KhalifMeasure
  packs: KhalifPack[]
  hit?: boolean
}

// A hundred-gram step and half a kilo the least: the scale of every counter in the country.
const KG: KhalifMeasure = { unit: { ru: 'кг', en: 'kg', ar: 'كغ' }, steps: 10, min: 5 }

// Same kilo, same hundred-gram step, but one step is already a purchase: nobody buys half a kilo of
// cumin, and a minimum that says otherwise reads as a shop that does not know its own trade.
const SPICE: KhalifMeasure = { unit: { ru: 'кг', en: 'kg', ar: 'كغ' }, steps: 10, min: 1 }

/*
 * Marinades stand FIRST, and that is the shop speaking rather than the fixture.
 *
 * The butcher this demo is drawn from sells through a messenger, and marinated meat is the larger
 * half of what he sells: the raw counter is what a marinade is made of, not the other way round. A
 * shelf order that opened on tenderloin would be describing a butcher who does not exist.
 *
 * They are also the one section that does NOT travel: a market rents a meat ROW, and prepared food
 * is a different trade with a different shelf life. The supply names the three raw sections by hand
 * for exactly that reason — see `seed/supplies.ts`.
 */
export const KHALIF_CATEGORIES = [
  { slug: 'marinady', name: { ru: 'Маринады', en: 'Marinades', ar: 'متبّلات' }, sort: 0 },
  { slug: 'govyadina', name: { ru: 'Говядина', en: 'Beef', ar: 'لحم بقري' }, sort: 1 },
  { slug: 'baranina', name: { ru: 'Баранина', en: 'Lamb', ar: 'لحم ضأن' }, sort: 2 },
  { slug: 'ptica', name: { ru: 'Птица', en: 'Poultry', ar: 'دواجن' }, sort: 3 },
  { slug: 'ryba', name: { ru: 'Рыба', en: 'Fish', ar: 'أسماك' }, sort: 4 },
  { slug: 'molochnoe', name: { ru: 'Молочное', en: 'Dairy', ar: 'ألبان' }, sort: 5 },
  { slug: 'yajco', name: { ru: 'Яйцо', en: 'Eggs', ar: 'بيض' }, sort: 6 },
  { slug: 'myod', name: { ru: 'Мёд', en: 'Honey', ar: 'عسل' }, sort: 7 },
  { slug: 'varene', name: { ru: 'Варенье', en: 'Preserves', ar: 'مربّى' }, sort: 8 },
  { slug: 'finiki', name: { ru: 'Финики', en: 'Dates', ar: 'تمور' }, sort: 9 },
  { slug: 'krupy', name: { ru: 'Крупы и каши', en: 'Grains', ar: 'حبوب' }, sort: 10 },
  { slug: 'pripravy', name: { ru: 'Приправы', en: 'Spices', ar: 'بهارات' }, sort: 11 },
]

export const KHALIF_PRODUCTS: KhalifProduct[] = [
  {
    slug: 'shashlyk-baranina',
    category: 'marinady',
    name: { ru: 'Шашлык из баранины', en: 'Marinated lamb for skewers', ar: 'ضأن متبّل للشواء' },
    summary: {
      ru: 'Мякоть с лопатки и задка, лук, соль, перец. Сутки в маринаде.',
      en: 'Shoulder and leg meat, onion, salt, pepper. A full day in the marinade.',
      ar: 'لحم من الكتف والفخذ مع البصل والملح والفلفل. يُنقع يوماً كاملاً.',
    },
    text: [
      {
        ru: 'Режем кусками с грецкий орех, чтобы прожарились насквозь и не высохли. Лук трём, а не крошим: сок нужен весь.',
        en: 'Cut to walnut size so the pieces cook through without drying. The onion is grated rather than chopped, because the juice is the point.',
        ar: 'نقطّعه بحجم الجوزة ليستوي من الداخل دون أن يجفّ. نبشر البصل ولا نفرمه، لأن المطلوب عصيره كله.',
      },
      {
        ru: 'Ни уксуса, ни майонеза: баранине утреннего забоя размягчаться не от чего. Забираете холодным, до мангала доедет.',
        en: 'No vinegar and no mayonnaise: meat from the morning slaughter has nothing to be tenderised from. Collected cold, it travels to the coals.',
        ar: 'بلا خلّ وبلا مايونيز: لحم ذبيحة الصباح لا يحتاج إلى تطرية. يُستلم بارداً ويصل إلى الجمر.',
      },
    ],
    image: 'khalif/products/marinade-lamb.webp',
    measure: KG,
    packs: [
      {
        price: 890,
      },
    ],
    hit: true,
  },
  {
    slug: 'shashlyk-govyadina',
    category: 'marinady',
    name: {
      ru: 'Шашлык из говядины',
      en: 'Marinated beef for skewers',
      ar: 'لحم بقري متبّل للشواء',
    },
    summary: {
      ru: 'Лопатка и толстый край, лук и специи. Для тех, кому баранина тяжела.',
      en: 'Shoulder and thick rib, onion and spice, for those who find lamb heavy.',
      ar: 'الكتف والضلع السميك مع البصل والبهار، لمن يجد الضأن ثقيلاً.',
    },
    image: 'khalif/products/marinade-beef.webp',
    measure: KG,
    packs: [
      {
        price: 840,
      },
    ],
  },
  {
    slug: 'lyulya-kebab',
    category: 'marinady',
    name: { ru: 'Люля-кебаб', en: 'Lyulya kebab', ar: 'لولا كباب' },
    summary: {
      ru: 'Фарш рубленый, не молотый, с курдюком и луком. Держится на шампуре.',
      en: 'Hand-chopped rather than minced, with tail fat and onion. It holds on the skewer.',
      ar: 'لحم مفروم بالسكين لا بالمفرمة، مع دهن الألية والبصل. يتماسك على السيخ.',
    },
    text: [
      {
        ru: 'Люля падает с шампура по одной причине: в фарше вода. Рубим ножом, курдюк добавляем сами, отбиваем и держим на холоде — тогда держится.',
        en: 'A kebab falls off the skewer for one reason: water in the mince. Chopped by knife, tail fat added by us, worked and kept cold, it holds.',
        ar: 'يسقط اللولا عن السيخ لسبب واحد: الماء في اللحم. نفرمه بالسكين ونضيف الألية بأنفسنا ونخفقه ونبقيه بارداً، فيتماسك.',
      },
    ],
    image: 'khalif/products/marinade-lyulya.webp',
    measure: KG,
    packs: [
      {
        price: 760,
      },
    ],
    hit: true,
  },
  {
    slug: 'shashlyk-kurinoe-bedro',
    category: 'marinady',
    name: {
      ru: 'Шашлык из куриного бедра',
      en: 'Marinated chicken thigh',
      ar: 'فخذ دجاج متبّل',
    },
    summary: {
      ru: 'Бедро без кости, маринад мягче бараньего. Готовится вдвое быстрее.',
      en: 'Boneless thigh in a lighter marinade than the lamb. Half the time on the coals.',
      ar: 'فخذ منزوع العظم بتتبيلة أخفّ من الضأن. ينضج في نصف الوقت.',
    },
    image: 'khalif/products/marinade-chicken.webp',
    measure: KG,
    packs: [
      {
        price: 470,
      },
    ],
  },
  {
    slug: 'govyadina-vyrezka',
    category: 'govyadina',
    name: { ru: 'Вырезка говяжья', en: 'Beef tenderloin', ar: 'فيليه بقري (تندرلوين)' },
    summary: {
      ru: 'Самая мягкая часть туши — на медальоны и на бифштекс.',
      en: 'Premium lean cut from local young beef — tender and juicy.',
      ar: 'أطرى جزء في الذبيحة — يُقطَّع ميدالِيات أو شرائح بيفستيك.',
    },
    text: [
      {
        ru: 'Вырезка — мышца, которая не работала, поэтому её не надо ни отбивать, ни мариновать. Соль, перец, три минуты с каждой стороны.',
        en: 'The most tender cut — lean, tendon-free, cooks in minutes. If preparing steaks or medallions, note in comments: custom sliced upon request.',
        ar: 'الفيليه عضلة لم تُستخدم في الحركة، لذا لا تحتاج إلى تطرية أو تتبيل مسبق. ملح وفلفل وثلاث دقائق على كل وجه تكفي.',
      },
      {
        ru: 'Отрезаем при вас от целой туши утреннего забоя, плёнку снимаем.',
        en: 'Delivered fresh from morning slaughter. Ideal for quick pan-frying or oven roasting.',
        ar: 'نقطعه أمامك من الذبيحة الكاملة لذبيحة الصباح، وننزع الغشاء عنه.',
      },
    ],
    image: 'khalif/products/beef-tenderloin.webp',
    measure: KG,
    packs: [
      {
        price: 1095,
      },
    ],
  },
  {
    slug: 'govyadina-ribaj',
    category: 'govyadina',
    name: { ru: 'Рибай говяжий', en: 'Beef ribeye', ar: 'ريب آي بقري' },
    summary: {
      ru: 'Толстый край с мраморной прожилкой — стейк, который прощает ошибку.',
      en: 'Well-marbled beef ribeye cut — juicy steaks and quick roasting.',
      ar: 'قطعة سميكة بعروق دهنية رخامية — ستيك يغفر أي خطأ في الطهي.',
    },
    image: 'khalif/products/beef-ribeye.webp',
    measure: KG,
    packs: [
      {
        price: 1230,
      },
    ],
    hit: true,
  },
  {
    slug: 'govyadina-gulyash',
    category: 'govyadina',
    name: { ru: 'Гуляш говяжий', en: 'Beef stew meat', ar: 'لحم بقري خالي من العظم (هبرة)' },
    summary: {
      ru: 'Кубик с лопатки — тушится час и разбирается на волокна.',
      en: 'Trimmed boneless beef cubes — perfect for hearty stews and sauces.',
      ar: 'قطع لحم بقري طرية من الفخذ والكتف — للطهي واليخنات.',
    },
    image: 'khalif/products/beef-goulash.webp',
    measure: KG,
    packs: [
      {
        price: 665,
      },
    ],
  },
  {
    slug: 'farsh-govyazhij',
    category: 'govyadina',
    name: { ru: 'Фарш говяжий', en: 'Ground beef', ar: 'لحم بقري مفروم' },
    summary: {
      ru: 'Крутим при вас из лопатки — без хлеба, жира и сои.',
      en: 'Freshly ground 100% beef mince — optimal meat-to-fat balance.',
      ar: 'نفرمه أمامك من الكتف — بدون خبز أو دهن أو صويا.',
    },
    image: 'khalif/products/beef-mince.webp',
    measure: KG,
    packs: [
      {
        price: 610,
      },
    ],
  },
  {
    slug: 'baranina-lopatka',
    category: 'baranina',
    name: { ru: 'Лопатка баранья', en: 'Lamb shoulder', ar: 'كتف ضأن' },
    summary: {
      ru: 'На шурпу и на плов — мясо с косточкой даёт правильный навар.',
      en: 'Young lamb shoulder on the bone — classic cut for authentic pilaf and roasting.',
      ar: 'للشوربة والبلوف — اللحم على العظم يعطي المرق الصحيح.',
    },
    image: 'khalif/products/lamb-shoulder.webp',
    measure: KG,
    packs: [
      {
        price: 695,
      },
    ],
  },
  {
    slug: 'baranina-ryobra',
    category: 'baranina',
    name: { ru: 'Рёбра бараньи', en: 'Lamb ribs', ar: 'أضلاع ضأن' },
    summary: {
      ru: 'Молодой барашек, тонкая жировая прослойка — на мангал.',
      en: 'Tender young lamb ribs with light marbling — perfect for charcoal grilling.',
      ar: 'ضلوع خروف صغير بطبقة دهن رقيقة — للشواء على الفحم.',
    },
    image: 'khalif/products/lamb-ribs.webp',
    measure: KG,
    packs: [
      {
        price: 755,
      },
    ],
  },
  {
    slug: 'kurica-celikom',
    category: 'ptica',
    name: { ru: 'Курица целиком', en: 'Whole chicken', ar: 'دجاجة كاملة' },
    summary: {
      ru: 'Охлаждённая, не мороженая — потрошёная, около полутора килограммов.',
      en: 'Fresh chilled whole farm chicken — roasting, soup broth, and baking.',
      ar: 'دجاجة مبردة غير مجمدة، مذبوحة ومنظفة، بوزن كيلو ونصف تقريباً.',
    },
    image: 'khalif/products/whole-chicken.webp',
    packs: [
      {
        price: 390,
        old: 440,
      },
    ],
  },
  {
    slug: 'file-kurinoe',
    category: 'ptica',
    name: { ru: 'Филе куриное', en: 'Chicken breast fillet', ar: 'فيليه صدور دجاج' },
    summary: {
      ru: 'Грудка без кожи и кости — самая ходовая позиция мясного ряда.',
      en: 'Tender boneless skinless chicken breast — lean protein staple.',
      ar: 'صدر دجاج بدون جلد وعظم — الأكثر مبيعاً في قسم اللحوم.',
    },
    image: 'khalif/products/chicken-filet.webp',
    measure: KG,
    packs: [
      {
        price: 410,
      },
    ],
    hit: true,
  },
  {
    slug: 'file-bedra-kurinogo',
    category: 'ptica',
    name: { ru: 'Филе бедра куриного', en: 'Boneless chicken thigh', ar: 'فيليه فخذ دجاج' },
    summary: {
      ru: 'Сочнее грудки и дешевле — на сковороду и в шаурму.',
      en: 'Juicy boneless skinless chicken thigh meat.',
      ar: 'أطرى وأرخص من الصدر — للمقلاة والشاورما.',
    },
    image: 'khalif/products/chicken-thigh-filet.webp',
    measure: KG,
    packs: [
      {
        price: 355,
      },
    ],
  },
  {
    slug: 'byodra-kurinye',
    category: 'ptica',
    name: { ru: 'Бёдра куриные', en: 'Chicken thighs', ar: 'أفخاذ دجاج' },
    summary: {
      ru: 'С кожей и косточкой — запекаются сами, без присмотра.',
      en: 'Chilled bone-in chicken thighs — flavorful for oven roasting.',
      ar: 'بالجلد والعظم — تُخبز في الفرن من تلقاء نفسها بدون مراقبة.',
    },
    image: 'khalif/products/chicken-thighs.webp',
    measure: KG,
    packs: [
      {
        price: 300,
      },
    ],
  },
  {
    slug: 'golen-kurinaya',
    category: 'ptica',
    name: { ru: 'Голень куриная', en: 'Chicken drumsticks', ar: 'ساق دجاج (درامستيك)' },
    summary: {
      ru: 'Ровные, одна к одной — на гриль и детям в руку.',
      en: 'Fresh chicken drumsticks — ideal for frying and braising.',
      ar: 'أسياق متجانسة الحجم — للشواء وللأطفال تُمسك باليد.',
    },
    image: 'khalif/products/chicken-drumstick.webp',
    measure: KG,
    packs: [
      {
        price: 270,
      },
    ],
  },
  {
    slug: 'file-indejki',
    category: 'ptica',
    name: { ru: 'Филе индейки', en: 'Turkey breast fillet', ar: 'فيليه صدر ديك رومي' },
    summary: {
      ru: 'Постное, плотное — тем, кому курица приелась.',
      en: 'Dietary lean turkey breast fillet — tender and low-fat.',
      ar: 'لحم خفيف الدسم ومتماسك — لمن مل من الدجاج.',
    },
    image: 'khalif/products/turkey-filet.webp',
    measure: KG,
    packs: [
      {
        price: 585,
      },
    ],
  },
  {
    slug: 'utka',
    category: 'ptica',
    name: { ru: 'Утка', en: 'Duck', ar: 'بطة كاملة' },
    summary: {
      ru: 'Потрошёная, около двух килограммов — на праздничный стол.',
      en: 'Chilled whole farm duck — rich flavor for holiday roasting.',
      ar: 'بطة منظفة بوزن كيلوين تقريباً — لمائدة الاحتفالات.',
    },
    image: 'khalif/products/duck.webp',
    packs: [
      {
        price: 755,
      },
    ],
  },
  {
    slug: 'perepyolka',
    category: 'ptica',
    name: { ru: 'Перепёлка', en: 'Quail', ar: 'سمان (طائر السلوى)' },
    summary: {
      ru: 'Тушка с фермы под Кантом — жарится восемь минут целиком.',
      en: 'Tender whole farm quails — gourmet poultry delicacy.',
      ar: 'طائر كامل من مزرعة قرب كانت — يُقلى ثماني دقائق فقط بالكامل.',
    },
    image: 'khalif/products/quail.webp',
    packs: [
      {
        price: 180,
      },
    ],
  },
  {
    slug: 'forel',
    category: 'ryba',
    name: { ru: 'Форель радужная', en: 'Rainbow trout', ar: 'تراوت قوس قزح' },
    summary: {
      ru: 'Иссык-кульская, потрошёная. На решётку и в фольгу.',
      en: 'From Issyk-Kul, gutted. For the grill or the foil.',
      ar: 'من بحيرة إيسيك كول، منظّفة. للشواية أو للفّها بالورق.',
    },
    image: 'khalif/products/forel.webp',
    measure: KG,
    packs: [
      {
        price: 780,
      },
    ],
  },
  {
    slug: 'osman',
    category: 'ryba',
    name: { ru: 'Осман иссык-кульский', en: 'Issyk-Kul osman', ar: 'عثمان بحيرة إيسيك كول' },
    summary: {
      ru: 'Озёрная рыба с плотным мясом. Берут на уху.',
      en: 'A lake fish with dense flesh, taken for soup.',
      ar: 'سمك بحيري بلحم متماسك، يُؤخذ للشوربة.',
    },
    image: 'khalif/products/osman.webp',
    measure: KG,
    packs: [
      {
        price: 950,
      },
    ],
  },
  {
    slug: 'sazan',
    category: 'ryba',
    name: { ru: 'Сазан', en: 'Carp', ar: 'كارب' },
    summary: {
      ru: 'Крупный, чешуя золотая. Режем на куски по просьбе.',
      en: 'Large and golden-scaled, cut into portions on request.',
      ar: 'كبير بحراشف ذهبية، نقطّعه قطعاً عند الطلب.',
    },
    image: 'khalif/products/sazan.webp',
    measure: KG,
    packs: [
      {
        price: 420,
      },
    ],
  },
  {
    slug: 'skumbriya',
    category: 'ryba',
    name: { ru: 'Скумбрия', en: 'Mackerel', ar: 'ماكريل' },
    summary: {
      ru: 'Свежемороженая, жирная. На гриль и на копчение.',
      en: 'Fresh-frozen and fatty, for the grill and for smoking.',
      ar: 'مجمّدة طازجة ودسمة، للشواء والتدخين.',
    },
    image: 'khalif/products/skumbriya.webp',
    measure: KG,
    packs: [
      {
        price: 390,
      },
    ],
  },
  {
    slug: 'kaymak',
    category: 'molochnoe',
    name: { ru: 'Каймак', en: 'Kaymak', ar: 'قيمر' },
    summary: {
      ru: 'Снимаем с топлёного молока, густой до ложки. В контейнере.',
      en: 'Skimmed from simmered milk, thick enough to stand a spoon in.',
      ar: 'يُقشد من الحليب المغلي، كثيف تقف فيه الملعقة.',
    },
    image: 'khalif/products/kaymak.webp',
    measure: KG,
    packs: [
      {
        price: 780,
      },
    ],
  },
  {
    slug: 'smetana',
    category: 'molochnoe',
    name: { ru: 'Сметана домашняя', en: 'Farm sour cream', ar: 'قشدة حامضة بلدية' },
    summary: {
      ru: 'Из фермерского молока, не разбавляем.',
      en: 'From farm milk and never thinned.',
      ar: 'من حليب المزرعة، بلا تخفيف.',
    },
    image: 'khalif/products/smetana.webp',
    measure: KG,
    packs: [
      {
        price: 420,
      },
    ],
  },
  {
    slug: 'tvorog',
    category: 'molochnoe',
    name: { ru: 'Творог', en: 'Curd cheese', ar: 'جبن قريش' },
    summary: {
      ru: 'Зернистый, некислый. Утренний.',
      en: 'Grainy and mild, made the same morning.',
      ar: 'حبيبي وغير حامض، من صباح اليوم.',
    },
    image: 'khalif/products/tvorog.webp',
    measure: KG,
    packs: [
      {
        price: 380,
      },
    ],
  },
  {
    slug: 'ayran',
    category: 'molochnoe',
    name: { ru: 'Айран', en: 'Ayran', ar: 'عيران' },
    summary: {
      ru: 'Литровая бутылка, солёный, как пьют дома.',
      en: 'A litre bottle, salted the way it is drunk at home.',
      ar: 'زجاجة لتر، مملّح كما يُشرب في البيت.',
    },
    image: 'khalif/products/ayran.webp',
    packs: [
      {
        price: 90,
      },
    ],
  },
  {
    slug: 'kurut',
    category: 'molochnoe',
    name: { ru: 'Курут', en: 'Kurut', ar: 'قروت' },
    summary: {
      ru: 'Сушёные шарики, солёные. В дорогу и в суп.',
      en: 'Dried salted balls, for the road and for soup.',
      ar: 'كرات مجفّفة مملّحة، للسفر وللشوربة.',
    },
    image: 'khalif/products/kurut.webp',
    measure: KG,
    packs: [
      {
        price: 620,
      },
    ],
  },
  {
    slug: 'yajco-domashnee',
    category: 'yajco',
    name: { ru: 'Яйцо куриное домашнее', en: 'Farm chicken eggs', ar: 'بيض دجاج بلدي' },
    summary: {
      ru: 'Десяток, желток тёмный. Со двора, не с фабрики.',
      en: 'Ten to a tray, dark yolks, from a yard and not a factory.',
      ar: 'عشر بيضات بصفار داكن، من البيت لا من المصنع.',
    },
    image: 'khalif/products/yajco-domashnee.webp',
    packs: [
      {
        price: 180,
      },
    ],
  },
  {
    slug: 'yajco-perepelinoe',
    category: 'yajco',
    name: { ru: 'Яйцо перепелиное', en: 'Quail eggs', ar: 'بيض سمّان' },
    summary: {
      ru: 'Двадцать штук, пятнистые. Детям и на праздничный стол.',
      en: 'Twenty speckled eggs, for children and for a laid table.',
      ar: 'عشرون بيضة مرقّطة، للأطفال ولمائدة العيد.',
    },
    image: 'khalif/products/yajco-perepelinoe.webp',
    packs: [
      {
        price: 160,
      },
    ],
  },
  {
    slug: 'med-gornyj',
    category: 'myod',
    name: { ru: 'Мёд горный', en: 'Mountain honey', ar: 'عسل جبلي' },
    summary: {
      ru: 'С сузакских пасек, тёмный и густой.',
      en: 'From Suzak apiaries, dark and thick.',
      ar: 'من مناحل سوزاك، داكن وكثيف.',
    },
    image: 'khalif/products/med-gornyj.webp',
    measure: KG,
    packs: [
      {
        price: 1250,
      },
    ],
  },
  {
    slug: 'med-esparcet',
    category: 'myod',
    name: { ru: 'Мёд эспарцетовый', en: 'Sainfoin honey', ar: 'عسل الإسبرست' },
    summary: {
      ru: 'Светлый, кристаллизуется в крем. Самый мягкий на вкус.',
      en: 'Pale, crystallising to a cream, the mildest of them.',
      ar: 'فاتح، يتبلور كالكريمة، وأخفّها طعماً.',
    },
    image: 'khalif/products/med-esparcet.webp',
    measure: KG,
    packs: [
      {
        price: 1400,
      },
    ],
  },
  {
    slug: 'varene-oblepiha',
    category: 'varene',
    name: { ru: 'Варенье облепиховое', en: 'Sea buckthorn preserve', ar: 'مربّى النبق' },
    summary: {
      ru: 'Полулитровая банка, кислое и оранжевое.',
      en: 'A half-litre jar, sharp and orange.',
      ar: 'برطمان نصف لتر، حامض وبرتقالي.',
    },
    image: 'khalif/products/varene-oblepiha.webp',
    packs: [
      {
        price: 420,
      },
    ],
  },
  {
    slug: 'varene-malina',
    category: 'varene',
    name: { ru: 'Варенье малиновое', en: 'Raspberry preserve', ar: 'مربّى التوت' },
    summary: {
      ru: 'Ягода целая, сахара немного.',
      en: 'Whole berries and little sugar.',
      ar: 'حبّات كاملة وسكر قليل.',
    },
    image: 'khalif/products/varene-malina.webp',
    packs: [
      {
        price: 380,
      },
    ],
  },
  {
    slug: 'varene-uryuk',
    category: 'varene',
    name: { ru: 'Варенье абрикосовое', en: 'Apricot preserve', ar: 'مربّى المشمش' },
    summary: {
      ru: 'Из баткенского урюка, половинками.',
      en: 'From Batken apricots, in halves.',
      ar: 'من مشمش باتكين، أنصافاً.',
    },
    image: 'khalif/products/varene-uryuk.webp',
    packs: [
      {
        price: 320,
      },
    ],
  },
  {
    slug: 'varene-orehovoe',
    category: 'varene',
    name: { ru: 'Варенье из грецкого ореха', en: 'Green walnut preserve', ar: 'مربّى الجوز الأخضر' },
    summary: {
      ru: 'Молодой орех целиком, тёмное и плотное. Редкое.',
      en: 'Whole young nuts, dark and dense. Rare.',
      ar: 'جوز أخضر كامل، داكن وكثيف. نادر.',
    },
    image: 'khalif/products/varene-orehovoe.webp',
    packs: [
      {
        price: 650,
      },
    ],
  },
  {
    slug: 'finiki-medjool',
    category: 'finiki',
    name: { ru: 'Финики маджуль', en: 'Medjool dates', ar: 'تمر مجدول' },
    summary: {
      ru: 'Крупные, мягкие, с карамельной мякотью.',
      en: 'Large and soft, with a caramel flesh.',
      ar: 'كبير وطري بلبّ كالكراميل.',
    },
    image: 'khalif/products/finiki-medjool.webp',
    measure: KG,
    packs: [
      {
        price: 1450,
      },
    ],
  },
  {
    slug: 'finiki-sukkari',
    category: 'finiki',
    name: { ru: 'Финики суккари', en: 'Sukkari dates', ar: 'تمر سكري' },
    summary: {
      ru: 'Светлые и сладкие, почти без волокна.',
      en: 'Pale and sweet, almost without fibre.',
      ar: 'فاتح وحلو، يكاد يخلو من الألياف.',
    },
    image: 'khalif/products/finiki-sukkari.webp',
    measure: KG,
    packs: [
      {
        price: 890,
      },
    ],
  },
  {
    slug: 'finiki-ajwa',
    category: 'finiki',
    name: { ru: 'Финики аджва', en: 'Ajwa dates', ar: 'تمر عجوة' },
    summary: {
      ru: 'Мединские, тёмные и сухие. Берут к Рамадану.',
      en: 'From Medina, dark and dry, taken for Ramadan.',
      ar: 'من المدينة، داكن وجاف، يُشترى لرمضان.',
    },
    image: 'khalif/products/finiki-ajwa.webp',
    measure: KG,
    packs: [
      {
        price: 2400,
      },
    ],
  },
  {
    slug: 'ris-devzira',
    category: 'krupy',
    name: { ru: 'Рис девзира', en: 'Devzira rice', ar: 'أرز ديفزيرا' },
    summary: {
      ru: 'Узгенский, красноватый. Для плова и ничего больше.',
      en: 'From Uzgen, reddish, for pilaf and nothing else.',
      ar: 'من أوزغين، ضارب للحمرة، للبلوف لا غير.',
    },
    image: 'khalif/products/ris-devzira.webp',
    measure: KG,
    packs: [
      {
        price: 320,
      },
    ],
  },
  {
    slug: 'grechka',
    category: 'krupy',
    name: { ru: 'Гречневая крупа', en: 'Buckwheat', ar: 'حنطة سوداء' },
    summary: {
      ru: 'Ядрица, прокалённая. Рассыпчатая.',
      en: 'Whole roasted grain that cooks loose.',
      ar: 'حبّ كامل محمّص، ينضج مفروكاً.',
    },
    image: 'khalif/products/grechka.webp',
    measure: KG,
    packs: [
      {
        price: 180,
      },
    ],
  },
  {
    slug: 'ovsyanka',
    category: 'krupy',
    name: { ru: 'Овсяная крупа', en: 'Oats', ar: 'شوفان' },
    summary: {
      ru: 'Хлопья грубого помола, не быстрого приготовления.',
      en: 'Coarse-rolled and not the quick kind.',
      ar: 'رقائق خشنة، ليست سريعة التحضير.',
    },
    image: 'khalif/products/ovsyanka.webp',
    measure: KG,
    packs: [
      {
        price: 120,
      },
    ],
  },
  {
    slug: 'talkan',
    category: 'krupy',
    name: { ru: 'Талкан', en: 'Talkan', ar: 'تلقان' },
    summary: {
      ru: 'Молотый жареный ячмень. С молоком на завтрак.',
      en: 'Ground roasted barley, with milk for breakfast.',
      ar: 'شعير محمّص مطحون، مع الحليب للفطور.',
    },
    image: 'khalif/products/talkan.webp',
    measure: KG,
    packs: [
      {
        price: 260,
      },
    ],
  },
  {
    slug: 'zira',
    category: 'pripravy',
    name: { ru: 'Зира', en: 'Cumin seed', ar: 'كمّون' },
    summary: {
      ru: 'Целая, не молотая. В плов и на шашлык.',
      en: 'Whole rather than ground, for pilaf and for skewers.',
      ar: 'حبّ كامل لا مطحون، للبلوف وللمشاوي.',
    },
    image: 'khalif/products/zira.webp',
    measure: SPICE,
    packs: [
      {
        price: 1200,
      },
    ],
  },
  {
    slug: 'barbaris',
    category: 'pripravy',
    name: { ru: 'Барбарис сушёный', en: 'Dried barberry', ar: 'برباريس مجفف' },
    summary: {
      ru: 'Кислый, тёмно-красный. В плов горстью.',
      en: 'Sharp and dark red, a handful to the pilaf.',
      ar: 'حامض وأحمر داكن، حفنة في البلوف.',
    },
    image: 'khalif/products/barbaris.webp',
    measure: SPICE,
    packs: [
      {
        price: 900,
      },
    ],
  },
  {
    slug: 'paprika',
    category: 'pripravy',
    name: { ru: 'Паприка молотая', en: 'Ground paprika', ar: 'بابريكا مطحونة' },
    summary: {
      ru: 'Сладкая, ярко-красная. В маринад для крыльев.',
      en: 'Sweet and bright red, for the wing marinade.',
      ar: 'حلوة وحمراء زاهية، لتتبيلة الأجنحة.',
    },
    image: 'khalif/products/paprika.webp',
    measure: SPICE,
    packs: [
      {
        price: 700,
      },
    ],
  },
  {
    slug: 'smes-dlya-plova',
    category: 'pripravy',
    name: { ru: 'Смесь для плова', en: 'Pilaf spice blend', ar: 'خلطة البلوف' },
    summary: {
      ru: 'Зира, барбарис, куркума, чеснок. Мешаем сами.',
      en: 'Cumin, barberry, turmeric, garlic. Mixed by us.',
      ar: 'كمّون وبرباريس وكركم وثوم. نخلطها بأنفسنا.',
    },
    image: 'khalif/products/smes-dlya-plova.webp',
    measure: SPICE,
    packs: [
      {
        price: 850,
      },
    ],
  },
  {
    slug: 'perec-chernyj',
    category: 'pripravy',
    name: { ru: 'Перец чёрный горошком', en: 'Black peppercorns', ar: 'فلفل أسود حبّ' },
    summary: {
      ru: 'Целый, мелем при вас.',
      en: 'Whole, ground in front of you.',
      ar: 'حبّ كامل، نطحنه أمامك.',
    },
    image: 'khalif/products/perec-chernyj.webp',
    measure: SPICE,
    packs: [
      {
        price: 1400,
      },
    ],
  },
]
