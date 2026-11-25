import type { Db, Transaction } from '@anavi/backend/src/db'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createReview } from '@anavi/backend/src/modules/review/review.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { findImage } from '../../../seed/lib/assets'
import { SAIMA_SELECTIONS } from './catalog'
import { REQUEST_FORM } from './forms'
import { SEWING_GROUP } from './services'
import { paragraphsOf } from '../../../seed/lib/labels'
import { ownPolicy } from '../../../seed/lib/policy'
import { seedQuestions } from '../../../seed/lib/faq'
import { galleryImages, plainHero } from '../../../seed/lib/blocks'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { dayAgo } from '../../../seed/lib/days'

/*
 * One long sentence over the photograph, and nothing under it.
 *
 * LONG ON PURPOSE, and it has been cut short more than once: a short claim like «Женская одежда,
 * сшитая здесь» is true of two hundred workshops, and the fiftieth has nothing left to write. The
 * heading names what only this workshop has — what it sews, where, how it sells (in runs, from how
 * many, by whose patterns) and to whom. It names and does not narrate: no dash, no
 * question, but not one word either. The rule is written down in `anavi-clients/MATERIAL.md`.
 *
 * The photographs are whichever of these have arrived in the folder: the words stay still and the
 * pictures turn over under them, so a second frame costs the reader nothing.
 */
const POSTER = {
  shot: 'ridge',
  eyebrow: {
    ru: 'Два цеха, при каждом шоурум',
    en: 'Two workshops, a showroom at each',
    ar: 'ورشتان، ومعرض ملحق بكل منهما',
  },
  title: {
    ru: 'Отшиваем женскую одежду под заказ: партиями от десяти штук, по нашим моделям или вашим лекалам, для магазинов, селлеров и марок без своего производства',
    en: 'Made-to-order womenswear from two Bishkek workshops: runs from ten pieces, to our own models or your patterns, for shops, marketplace sellers and brands without a workshop of their own',
    ar: 'نفصّل ملابس نسائية حسب الطلب في ورشتينا ببيشكيك: دفعات من عشر قطع، وفق موديلاتنا أو بتروناتكم، للمتاجر وبائعي الماركتبليس والعلامات التجارية التي لا تملك ورشة خاصة بها',
  },
}

// Four steps capture the entire production flow: cutting, stitching, garment steaming, and packaging.
// No superfluous fifth step added merely for round numbers.
const PROCESS = [
  {
    file: 'cutting',
    title: { ru: 'Раскрой', en: 'Pattern cutting', ar: 'قص البترون والأقمشة' },
    text: {
      ru: 'Лекала раскладываются на настиле, ткань режется дисковым ножом. Здесь решается расход — и цена партии.',
      en: 'Patterns are nested across stacked fabric layers and cut with rotary knives, optimizing fabric yield and batch pricing.',
      ar: 'يتم رص طبقات القماش وقصها بدقة باستخدام سكاكين دائرية كهربائية لتقليل الهدر وضبط تكلفة الدفعة بأفضل سعر.',
    },
  },
  {
    file: 'stitching',
    title: { ru: 'Строчка', en: 'Assembly stitching', ar: 'خطوط التجميع والخياطة' },
    text: {
      ru: 'Поток на восемнадцать машин. Каждая вещь проходит одни и те же операции в одном и том же порядке.',
      en: 'Eighteen-machine production line. Every garment proceeds through identical operations in precise sequence.',
      ar: 'خط إنتاج متكامل من 18 ماكينة خياطة حديثة. تمر كل قطعة بالمراحل نفسها وبالترتيب المتقن ذاته.',
    },
  },
  {
    file: 'pressing',
    title: {
      ru: 'Влажно-тепловая обработка',
      en: 'Steam finishing',
      ar: 'المعالجة الحرارية والبخارية (الكي الصناعي)',
    },
    text: {
      ru: 'Отпаривание на манекене и пресс: то, что отличает вещь из цеха от вещи из подвала.',
      en: 'Form-steaming on tailor mannequins and industrial pressing ensuring crisp professional garment shaping.',
      ar: 'كي بالبخار على مانيكانات مخصصة وضغط مكابس صناعية: ما يمنح القطعة لمستها الاحترافية الفاخرة.',
    },
  },
  {
    file: 'packing',
    title: { ru: 'Упаковка', en: 'Packaging', ar: 'التغليف والفرز' },
    text: {
      ru: 'Складываем, пакуем в индивидуальный пакет, собираем короб по ростовкам и отдаём перевозчику.',
      en: 'Folding, individual polybagging, sorting into shipping cartons by size run, and handover to freight carriers.',
      ar: 'طي القطع وتغليفها في أكياس فردية، وترتيب الصناديق حسب تسلسل المقاسات لتسليمها لشركات الشحن.',
    },
  },
]

const FABRICS = [
  { file: 'krep', name: { ru: 'Креп вискозный', en: 'Viscose crepe', ar: 'كريب فيسكوز' } },
  { file: 'tensel', name: { ru: 'Тенсел', en: 'Tencel', ar: 'تنسل (Tencel)' } },
  { file: 'len', name: { ru: 'Лён', en: 'Linen', ar: 'كتان طبيعي' } },
  { file: 'poplin', name: { ru: 'Поплин', en: 'Poplin', ar: 'بوبلين' } },
  { file: 'denim', name: { ru: 'Деним', en: 'Denim', ar: 'جينز (دينيم)' } },
  { file: 'ribana', name: { ru: 'Рибана', en: 'Rib knit', ar: 'ريبانا محبوكة' } },
  { file: 'sherst', name: { ru: 'Шерстяной микс', en: 'Wool blend', ar: 'مزيج صوف' } },
]

// Portfolio works rather than reviews: batch manufacturing has no individual review author, only photo and caption.
// `days` is how long ago the run left the floor.
const WORKS = [
  {
    file: 'dresses',
    days: 21,
    caption: {
      ru: 'Партия платьев, сто двадцать штук, отгрузка в Алматы',
      en: 'Batch of 120 dresses shipped to Almaty',
      ar: 'دفعة فساتين تضم 120 قطعة تم شحنها إلى ألماتي',
    },
  },
  {
    file: 'blouses',
    days: 48,
    caption: {
      ru: 'Ростовки блуз: пять размеров, по двадцать штук в каждом',
      en: 'Blouse size runs: 5 sizes, 20 pieces each',
      ar: 'سلاسل مقاسات للبلوزات: 5 مقاسات، بواقع 20 قطعة لكل مقاس',
    },
  },
  {
    file: 'sample',
    days: 9,
    caption: {
      ru: 'Отшив по лекалам заказчика: сигнальный образец и раскладка',
      en: 'Contract manufacturing from client patterns: prototype sample and cutting layout',
      ar: 'تفصيل وإنتاج خاص وفقاً لبترون العميل: العينة النموذجية وخطة القص',
    },
  },
  {
    file: 'knitwear',
    days: 77,
    caption: {
      ru: 'Трикотаж партией: свитшоты и джемперы под маркой магазина',
      en: 'Knitwear batch: sweatshirts and sweaters produced for retailer private label',
      ar: 'دفعة تريكو: سويت شيرتات وكنزات صوفية لعلامة تجارية خاصة لمتجر',
    },
  },
  {
    file: 'coats',
    days: 130,
    caption: {
      ru: 'Верхняя одежда: пальто и тренчи, тираж на осень',
      en: 'Outerwear: autumn run of tailored coats and trench coats',
      ar: 'ملابس خارجية: تشكيلة الخريف من المعاطف والترنش كوت',
    },
  },
  {
    file: 'carton',
    days: 160,
    caption: {
      ru: 'Короб к отгрузке: упаковано по ростовкам, опись внутри',
      en: 'Ready shipping carton: packed by size run with packing slip included',
      ar: 'صناديق جاهزة للشحن: مرتبة حسب المقاسات مع كشف محتويات داخلي',
    },
  },
]

const FAQ_GROUPS = [
  {
    slug: 'opt',
    name: { ru: 'Партии и опт', en: 'Batch orders and wholesale', ar: 'طلبيات الدفعات والجملة' },
  },
  {
    slug: 'zakaz',
    name: { ru: 'Заказ и доставка', en: 'Ordering and delivery', ar: 'الطلب والتوصيل' },
  },
]

const FAQ = [
  {
    group: 'opt',
    question: {
      ru: 'Какой минимальный тираж?',
      en: 'What is the minimum order quantity?',
      ar: 'ما هو الحد الأدنى لكمية الطلب (MOQ)؟',
    },
    answer: {
      ru: 'Десять штук одной модели — с этого начинается лестница цен. Меньше отшить тоже можно, но цена за штуку будет выше: раскладка лекал на десять штук и на три отличается расходом ткани вдвое.',
      en: 'Ten pieces per model — where our tiered pricing begins. Smaller runs are possible, but the per-piece price is higher: a cutting layout for 10 pieces and for 3 uses twice the fabric per unit.',
      ar: 'عشر قطع من الموديل الواحد — حيث يبدأ سلم الأسعار التنازلية. يمكن تفصيل كميات أقل، لكن سعر القطعة سيكون أعلى: خطة قص 10 قطع تستهلك من القماش ضعف ما تستهلكه خطة قص 3 قطع للقطعة الواحدة.',
    },
  },
  {
    group: 'opt',
    question: {
      ru: 'Можно смешивать размеры внутри тиража?',
      en: 'Can we mix sizes within a single batch?',
      ar: 'هل يمكن تنويع وتوزيع المقاسات داخل نفس الدفعة؟',
    },
    answer: {
      ru: 'Да, и почти всегда так и делают. Тираж считается по числу вещей, а не по числу размеров: сто штук в пяти ростовках — это сто штук и цена сотни.',
      en: 'Yes, that is standard practice. Batch volume is calculated by total piece count rather than size count: 100 pieces across 5 sizes counts as a 100-piece tier.',
      ar: 'نعم، وهذا هو المعمول به دائماً. يُحسب حجم الدفعة بناءً على إجمالي عدد القطع وليس عدد المقاسات: 100 قطعة مقسمة على 5 مقاسات تُحسب كشريحة الـ 100 قطعة بالكامل.',
    },
  },
  {
    group: 'opt',
    question: {
      ru: 'Я приду со своими лекалами. Что дальше?',
      en: 'I have my own patterns. What are the next steps?',
      ar: 'لدي بترون خاص بي. ما هي الخطوات التالية؟',
    },
    answer: {
      ru: 'Сначала сигнальный образец: отшиваем одну вещь, вы смотрите посадку и швы. После вашего «да» запускаем тираж. Если лекал нет, а есть образец вещи — снимем лекала с него, это отдельная работа и отдельный срок.',
      en: 'First, a prototype sample: we stitch a single piece for you to verify fit and seam quality. Production begins upon your approval. If you only have a garment sample without patterns, we can digitize patterns for a separate fee and timeline.',
      ar: 'نبدأ أولاً بخياطة عينة نموذجية: نفصل قطعة واحدة لتفحص القياس ودقة الدرزات. بعد موافقتك نبدأ إنتاج الدفعة. وإذا لم يتوفر لديك بترون ولديك عينة ملابس جاهزة، نقوم باستخراج البترون منها كخدمة منفصلة بمدة محددة.',
    },
  },
  {
    group: 'opt',
    question: {
      ru: 'Сроки на партию?',
      en: 'What are the production lead times?',
      ar: 'ما هي المدة اللازمة لإنتاج وتسليم الدفعة؟',
    },
    answer: {
      ru: 'Простые вещи — трикотаж, блузы, платья — от семи до двенадцати дней на сотню. Верхняя одежда дольше: тренч это тридцать восемь операций, и сотню мы шьём три недели. Срочный запуск возможен, он дороже.',
      en: 'Simple garments — jersey knits, blouses, dresses — take 7 to 12 days per 100 units. Outerwear takes longer: a trench involves 38 operations and 100 units take three weeks. Expedited rush production is available for an extra charge.',
      ar: 'القطع البسيطة — مثل التريكو، البلوزات، والفساتين — تستغرق من 7 إلى 12 يوماً لكل 100 قطعة. الملابس الخارجية تستغرق وقتاً أطول: الترنش كوت يتطلب 38 عملية خياطة ونحتاج 3 أسابيع لكل 100 قطعة. يتوفر خيار الإنتاج المستعجل بتكلفة إضافية.',
    },
  },
  {
    group: 'opt',
    question: { ru: 'Чья ткань?', en: 'Who supplies the fabric?', ar: 'من يوفر القماش؟' },
    answer: {
      ru: 'Наша или ваша — как удобнее. Со своей ткани мы считаем только пошив; с нашей в цену входит и материал, и его закуп на весь тираж сразу, чтобы партия не разошлась по оттенку.',
      en: 'Either in-house or client-supplied — whichever you prefer. With client fabric we invoice cut-and-sew only; with our stock, pricing includes single-lot fabric purchasing to guarantee consistent shade matching.',
      ar: 'أقمشتنا أو أقمشتكم — حسب رغبتكم. في حال تقديم قماشكم نحتسب تكلفة القص والخياطة فقط؛ ومع أقمشتنا يشمل السعر شراء القماش للدفعة بالكامل من رول واحد لضمان تطابق درجة اللون.',
    },
  },
  {
    group: 'zakaz',
    question: {
      ru: 'Это готовые вещи или примеры работ?',
      en: 'Are these items in stock or examples of your work?',
      ar: 'هل هذه القطع جاهزة في المخزن أم نماذج من أعمالكم؟',
    },
    answer: {
      ru: 'Это модели, которые мы уже отшивали. Что-то осталось готовым с прошлых партий и лежит на складе, но тираж отшиваем заново под ваш размер, ткань и цвет — поэтому срок считаем от недели, а не «завтра».',
      en: 'These are models we have already produced. Some pieces are left over from earlier runs and sit in stock, but a run is made anew for your size, fabric and colour — which is why lead time starts from a week, not tomorrow.',
      ar: 'هذه موديلات قمنا بتفصيلها سابقاً. بقيت بعض القطع من دفعات سابقة وهي في المستودع، لكننا نعيد تفصيل الدفعة وفق مقاسكم وقماشكم ولونكم — لذلك تبدأ المدة من أسبوع، وليس من الغد.',
    },
  },
  {
    group: 'zakaz',
    question: {
      ru: 'Как согласовать размерную сетку?',
      en: 'How do we agree the size range?',
      ar: 'كيف نتفق على جدول المقاسات؟',
    },
    answer: {
      ru: 'Сетка российская: 42–54. В карточке написано, как вещь садится. Для партии до запуска согласуем ростовку и размерную сетку, а на сигнальном образце проверяем посадку.',
      en: 'Russian sizing: 42–54. Each card states the fit. For a run we agree the size range before launch and check the fit on a prototype sample.',
      ar: 'نعتمد المقاسات الروسية: 42–54. توضح بطاقة كل موديل كيفية قصته. قبل بدء الدفعة نتفق على تدرج المقاسات، ونتحقق من القصة على عينة نموذجية.',
    },
  },
  {
    group: 'zakaz',
    question: {
      ru: 'Можно посмотреть образцы?',
      en: 'Can we see samples?',
      ar: 'هل يمكن معاينة نماذج من الأعمال؟',
    },
    answer: {
      ru: 'Да, шоурум есть при каждом цехе — на Ибраимова и в Аламедине. Покажем образцы работ, швы и посадку. Работаем с понедельника по субботу с девяти до шести.',
      en: 'Yes, both workshops have a showroom. We show samples of our work, seams and fit. Open Monday to Saturday, 9:00–18:00.',
      ar: 'نعم، يتوفر معرض ملحق بكل ورشة — في شارع إبراهيموف وألاميدين. نعرض نماذج من أعمالنا والدرزات والقصة. نعمل من الإثنين إلى السبت من 9:00 إلى 18:00.',
    },
  },
  {
    group: 'zakaz',
    question: {
      ru: 'Что если в партии брак?',
      en: 'What if a run has defects?',
      ar: 'ماذا لو ظهرت عيوب في الدفعة؟',
    },
    answer: {
      ru: 'Сначала сигнальный образец: вы смотрите посадку и швы, потом запускаем тираж. Если брак в партии — заменяем по договору; процент брака и порядок замены фиксируем до запуска.',
      en: 'First a prototype sample: you check fit and seams, then we start the run. If a batch has defects, we replace them under the contract; the defect rate and replacement terms are fixed before launch.',
      ar: 'نبدأ بعينة نموذجية: تفحصون القصة والدرزات، ثم نطلق الدفعة. وإذا ظهرت عيوب في الدفعة نستبدلها وفق العقد؛ ونحدد نسبة العيوب وشروط الاستبدال قبل بدء الإنتاج.',
    },
  },
]

// Allied production partners essential to workshop operations: textiles, trims, embroidery, packaging,
// and logistics. Text-based cards without logos or photos; Instagram handles serve as their primary web presence.
const PARTNERS = [
  {
    title: { ru: 'Текстиль Хаус', en: 'Textile House', ar: 'تكستايل هاوس' },
    text: {
      ru: 'Склад тканей на Дордое: креп, тенсел, поплин, лён. У них мы держим постоянный остаток по семи основным полотнам.',
      en: 'Dordoy fabric warehouse: crepe, tencel, poplin, linen. We maintain constant standing inventory across 7 core textiles with them.',
      ar: 'مستودع أقمشة في دوردوي: كريب، تنسل، بوبلين، كتان. نحتفظ لديهم برصيد دائم ومستمر لسبعة أنواع أقمشة رئيسية.',
    },
    handle: 'tekstilhaus.kg',
  },
  {
    title: { ru: 'Фурнитура KG', en: 'Furnitura KG', ar: 'فورنيتورا KG' },
    text: {
      ru: 'Молнии, бегунки, пуговицы, кнопки и пряжки. Всё, что на вещи блестит и застёгивается, приезжает отсюда.',
      en: 'Zippers, sliders, buttons, snaps, and buckles. All closures and hardware arrive directly from here.',
      ar: 'سحابات، أزرار، كباسات، مشابك وإبزيمات. كل ما يتعلق بالإكسسوارات المعدنية والمثبتات يأتي من هنا مباشرة.',
    },
    handle: 'furnitura.kg',
  },
  {
    title: { ru: 'Кулир', en: 'Kulir', ar: 'كولير' },
    text: {
      ru: 'Вязальный цех: трикотажное полотно купонами. Кардиганы и джемперы вяжутся у них, кроятся и шьются у нас.',
      en: 'Knitting workshop supplying fine-gauge knit panels. Cardigans and sweaters are knitted there, cut and finished here.',
      ar: 'ورشة حياكة: ألواح تريكو محبوكة بمكائن دقيقة. الكارديجان والكنزات تُحاك لديهم وتُقص وتُجمع في ورشتنا.',
    },
    handle: 'kulir.trikotazh',
  },
  {
    title: { ru: 'Штрих', en: 'Shtrih', ar: 'شتريخ' },
    text: {
      ru: 'Шелкография и машинная вышивка по готовому изделию. Логотип магазина на партию — к ним, и мы отвозим сами.',
      en: 'Silkscreen printing and machine embroidery on finished garments. Brand logos applied directly with seamless logistics.',
      ar: 'طباعة سلك سكرين وتطريز آلي على القطع الجاهزة. طباعة شعار علامتك التجارية على الدفعة تتم عبرهم بإشرافنا.',
    },
    handle: 'shtrih.print.kg',
  },
  {
    title: { ru: 'Этикет', en: 'Etiket', ar: 'إيتيكيت' },
    text: {
      ru: 'Тканые бирки, размерники, составники и упаковка. Партия под чужой маркой начинается с их бирки.',
      en: 'Woven brand labels, size tags, care tags, and custom packaging for white-label client orders.',
      ar: 'بطاقات قماشية منسوجة، ملصقات المقاسات، بطاقات العناية والتغليف المخصص لطلبيات العلامات التجارية الخاصة.',
    },
    handle: 'etiket.bishkek',
  },
  {
    title: { ru: 'Энзим', en: 'Enzim', ar: 'إنزيم' },
    text: {
      ru: 'Промышленная стирка и покраска: деним и лён приходят от них мягкими, а не колом.',
      en: 'Industrial garment washing and garment dyeing: giving denim and linen a soft, pre-shrunk touch.',
      ar: 'مغسلة صناعية ومعالجة صباغة: أقمشة الجينز والكتان تأتي منهم فائقة النعومة ومعالجة مسبقاً ضد الانكماش.',
    },
    handle: 'enzim.wash',
  },
  {
    title: { ru: 'Белый фон', en: 'Bely Fon', ar: 'الخلفية البيضاء (بيلي فون)' },
    text: {
      ru: 'Предметная съёмка для маркетплейсов: вырез на белом, ростовка целиком, карточки в тот же день.',
      en: 'Commercial marketplace product photography: isolated white background shots, full size-run sets, same-day delivery.',
      ar: 'تصوير احترافي لمنتجات المتاجر الإلكترونية والماركتبليس: صور على خلفية بيضاء نقية وتسليم سريع للبطاقات.',
    },
    handle: 'belyfon.studio',
  },
  {
    title: { ru: 'Ак Жол Карго', en: 'Ak Zhol Cargo', ar: 'أك جول كارغو' },
    text: {
      ru: 'Отгрузка коробами в Россию и Казахстан. Забирают из цеха, довозят до склада маркетплейса.',
      en: 'Carton freight logistics to Russia and Kazakhstan. Workshop pickup directly to marketplace fulfillment centers.',
      ar: 'شحن الصناديق والبضائع إلى روسيا وكازاخستان. استلام مباشر من الورشة وتوصيل لمستودعات الماركتبليس.',
    },
    handle: 'akjol.cargo',
  },
]

const PARTNERS_TEXT = [
  {
    ru: 'Цех не делает всё сам, и это нормально: полотно вяжут одни, красят другие, бирки ткут третьи. Здесь те, с кем мы работаем годами — если вы шьёте у нас партию, все они уже в цепочке и договариваться с ними отдельно не нужно.',
    en: 'A manufacturing workshop does not operate in isolation: fabric is knitted by one partner, dyed by another, and labels woven by a third. These are our long-standing partners — when ordering a batch with us, the entire supply chain is already integrated.',
    ar: 'الورشة لا تقوم بكل شيء بمفردها، وهذا هو النموذج الصناعي السليم: خيوط تُحاك لدى شريك، وتُصبغ لدى آخر، والبطاقات تُنسج لدى جهة متخصصة. هؤلاء هم شركاؤنا الذين نعمل معهم منذ سنوات — عند طلبك لدفعة معنا، تكون سلسلة التوريد متكاملة دون الحاجة للتنسيق المنفصل معهم.',
  },
  {
    ru: 'Ни у кого из них нет сайта, и это не упущение: в Бишкеке у поставщика ткани есть инстаграм, номер и склад, а сайта нет. Поэтому все ссылки ведут туда.',
    en: 'None of these vendors operate traditional websites: in Bishkek, suppliers communicate via Instagram, phone, and warehouse visits. All links connect to their direct channels.',
    ar: 'لا يملك أي منهم موقعاً إلكترونياً تقليدياً: في بيشكيك يتواصل موردو الأقمشة والمواد عبر إنستغرام، الهاتف، والزيارات الميدانية للمستودعات. لذا ترتبط قنوات الاتصال مباشرة بهم.',
  },
]

const PROD_TEXT = [
  {
    ru: 'На Ибраимова — восемнадцать швейных машин, петельная, пуговичная, закрепочная, промышленный пресс и парогенератор; раскройный стол на двенадцать метров, на нём настилают до сорока слоёв. В Аламедине — трикотажный поток и верхняя одежда, второй раскройный стол и упаковка на отгрузку.',
    en: 'On Ibraimov: 18 sewing machines, buttonholers, button sewers, bartackers, industrial steam presses, and a 12-meter cutting table accommodating up to 40 fabric plies. In Alamedin: jersey knit and outerwear lines, a second cutting table, and final freight packaging.',
    ar: 'في شارع إبراهيموف — 18 ماكينة خياطة، ماكينات فتح الأزرار، تركيب الأزرار، التثبيت، مكابس صناعية، وطاولة قص بطول 12 متراً تتسع لرص حتى 40 طبقة قماش. وفي ألاميدين — خطوط التريكو والملابس الخارجية وطاولة قص ثانية وقسم التغليف والشحن.',
  },
  {
    ru: 'Мы не берём то, что не умеем. Кожа, мех, корсетные изделия и трикотаж машинной вязки — не к нам: вязку заказываем на стороне, а шьём из готового полотна.',
    en: 'We focus strictly on our core expertise. Leather, fur, corsetry, and machine-knitted sweaters are out of scope: specialized knitting is outsourced while we cut and sew from finished yardage.',
    ar: 'نحن لا نقبل ما لا نتقنه باحتراف. الجلود، الفراء، الكورسيهات والتريكو المحبوك آلياً خارج نطاقنا: نتعاقد على الحياكة خارجياً ونقوم بالقص والخياطة من الألواح الجاهزة.',
  },
]

const ABOUT_FABRICS = [
  {
    ru: 'Семь основных полотен держим у себя, остальное закупаем под тираж: поэтому запуск начинается на следующий день после согласования, а не через три недели. Ткань может быть наша или ваша — как удобнее.',
    en: 'We keep seven core fabrics in-house and buy the rest for each run: production starts the day after sign-off, not three weeks later. Fabric can be ours or yours, whichever suits you.',
    ar: 'نحتفظ بسبعة أقمشة أساسية لدينا، ونشتري الباقي حسب كل دفعة: لذا يبدأ الإنتاج في اليوم التالي للموافقة، لا بعد ثلاثة أسابيع. القماش قد يكون من عندنا أو من عندكم، حسب ما يناسبكم.',
  },
]

export async function seedFaq(siteId: SiteId, tx: Db | Transaction) {
  await seedQuestions(siteId, FAQ_GROUPS, FAQ, tx)
}

export async function seedWorks(siteId: SiteId, tx: Db | Transaction) {
  let position = 0
  for (const item of WORKS) {
    // A work IS its photograph: until the frame arrives there is no record to make, and one made
    // without it would stand in the list as a caption over nothing.
    const image = await findImage(`demos/saima/runs/${item.file}.webp`, item.caption.ru)
    if (!image) continue
    const work = await createReview(
      siteId,
      {
        caption: item.caption,
        isWork: true,
        position: position++,
        saidOn: dayAgo(item.days),
      },
      tx,
    )
    await attachMedia(
      siteId,
      'review',
      work.id,
      {
        key: image.key,
        width: image.width,
        height: image.height,
        caption: item.caption,
      },
      tx,
    )
  }
}

// A single modal form across the entire site rather than a dedicated page: estimation is triggered wherever
// the visitor considers bulk production — on home, below portfolio works, and at the end of workshop narrative.
const askAction = {
  kind: 'form' as const,
  form: REQUEST_FORM,
  label: { ru: 'Рассчитать партию', en: 'Calculate batch price', ar: 'حساب تكلفة الدفعة' },
}

export async function seedHomePage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'home', en: 'home' },
      status: 'published',
      isHome: true,
      title: { ru: 'Главная', en: 'Home', ar: 'الرئيسية' },
      seoTitle: {
        ru: 'Saima — швейный цех в Бишкеке: женская одежда и отшив партиями',
        en: 'Saima — garment manufacturer in Bishkek: womenswear and batch production',
        ar: 'Saima — ورشة ومصنع خياطة في بيشكيك: ملابس نسائية وإنتاج دفعات بالجملة',
      },
      seoDescription: {
        ru: 'Отшиваем женскую одежду под заказ: 36 моделей в наших работах, партии от десяти штук, по нашим лекалам или вашим. Цена за штуку падает с тиражом.',
        en: 'Made-to-order womenswear: 36 models in our portfolio, runs from ten pieces, to our own patterns or yours. The per-piece price falls with volume.',
        ar: 'نفصّل ملابس نسائية حسب الطلب: 36 موديلاً في أعمالنا، دفعات من عشر قطع، وفق بتروناتنا أو بتروناتكم. ينخفض سعر القطعة مع زيادة الكمية.',
      },
    },
    tx,
  )

  // One photograph: the poster stopped turning pictures over under its own sentence.
  const shot = await findImage(`demos/saima/poster/${POSTER.shot}.webp`, POSTER.title.ru)
  const slides = [
    {
      eyebrow: POSTER.eyebrow,
      title: POSTER.title,
      ...(shot ? { image: { key: shot.key, width: shot.width, height: shot.height } } : {}),
      actions: [
        {
          kind: 'page' as const,
          slug: 'catalog',
          label: { ru: 'Смотреть работы', en: 'View our work', ar: 'تصفح أعمالنا' },
        },
        askAction,
      ],
    },
  ]
  await createBlock(siteId, page.id, { type: 'hero', data: { layout: 'poster', slides } }, tx)

  await createBlock(
    siteId,
    page.id,
    {
      type: 'categories',
      data: {
        eyebrow: { ru: 'Наши работы', en: 'Our work', ar: 'أعمالنا' },
        title: { ru: 'Что мы шьём', en: 'What we produce', ar: 'ما نقوم بإنتاجه' },
        limit: 6,
        showCount: false,
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'catalog',
      data: {
        eyebrow: { ru: 'Модели', en: 'Models', ar: 'الموديلات' },
        title: SAIMA_SELECTIONS[2]!.name,
        selection: SAIMA_SELECTIONS[2]!.slug,
        limit: 8,
        showCategories: false,
        showPrice: true,
        showAction: true,
      },
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'features', data: await processData() }, tx)

  await createBlock(
    siteId,
    page.id,
    {
      type: 'works',
      data: {
        eyebrow: { ru: 'Отгрузки', en: 'Shipments', ar: 'الشحنات والتسليم' },
        title: {
          ru: 'Что уходило из цеха',
          en: 'Recent workshop output',
          ar: 'نماذج من إنتاج الورشة',
        },
        limit: 6,
      },
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'gallery', data: await fabricsData() }, tx)

  await createBlock(
    siteId,
    page.id,
    {
      type: 'faq',
      data: {
        eyebrow: { ru: 'Вопросы', en: 'FAQ', ar: 'الأسئلة الشائعة' },
        title: { ru: 'О партиях и заказе', en: 'Batches and ordering', ar: 'حول الدفعات والطلب' },
        layout: 'list',
        limit: 6,
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'addresses',
      data: {
        eyebrow: { ru: 'Адреса', en: 'Locations', ar: 'العناوين والفروع' },
        title: {
          ru: 'Два цеха, при каждом шоурум',
          en: 'Two facilities with showrooms',
          ar: 'ورشتان للإنتاج مع معرض ملحق بكل منهما',
        },
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        eyebrow: { ru: 'Партия', en: 'Batch order', ar: 'طلب دفعة إنتاجية' },
        title: {
          ru: 'Посчитайте свою партию за минуту',
          en: 'Calculate your batch estimate in one minute',
          ar: 'احسب تكلفة دفعتك في دقيقة واحدة',
        },
        text: {
          ru: 'Четыре ответа — вещь, тираж, ткань и срок — и вы увидите вилку, не дожидаясь ответа.',
          en: 'Four simple choices — garment, quantity, fabric, and timeline — generate an instant quote range.',
          ar: 'أربعة خيارات سريعة — نوع القطعة، الكمية، القماش، والموعد — وستظهر لك القيمة التقديرية فوراً.',
        },
        action: askAction,
      },
    },
    tx,
  )
}

async function processData() {
  const items = []
  for (const step of PROCESS) {
    const image = await findImage(`demos/saima/floor/${step.file}.webp`, step.title.ru)
    items.push({
      ...(image ? { image: { key: image.key, width: image.width, height: image.height } } : {}),
      title: step.title,
      text: step.text,
    })
  }
  return {
    layout: 'steps',
    eyebrow: { ru: 'Цех', en: 'Workshop', ar: 'الورشة والإنتاج' },
    title: {
      ru: 'Как вещь становится вещью',
      en: 'How a garment is made',
      ar: 'كيف تتحول الفكرة إلى قطعة ملابس جاهزة',
    },
    items,
  }
}

async function fabricsData() {
  return {
    eyebrow: { ru: 'Материалы', en: 'Materials', ar: 'المواد والخامات' },
    title: {
      ru: 'Ткани, с которыми работаем',
      en: 'Fabrics we work with',
      ar: 'الأقمشة التي نعمل بها',
    },
    images: await galleryImages('demos/saima/fabrics', FABRICS),
  }
}

export async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'catalog', en: 'catalog' },
      status: 'published',
      title: { ru: 'Наши работы', en: 'Our work', ar: 'أعمالنا' },
      seoTitle: { ru: 'Наши работы — Saima', en: 'Our work — Saima', ar: 'أعمالنا — Saima' },
      seoDescription: {
        ru: '36 моделей, которые мы уже отшивали: платья, блузы, брюки, трикотаж, верхняя одежда и костюмы. Партии под заказ от десяти штук, размеры 42–54, цена за штуку падает с тиражом.',
        en: '36 models we have already produced: dresses, blouses, trousers, knitwear, outerwear and suits. Made-to-order runs from ten pieces, sizes 42–54, with volume tiered pricing.',
        ar: '36 موديلاً قمنا بتفصيلها سابقاً: فساتين، بلوزات، بناطيل، تريكو، ملابس خارجية وبدلات. دفعات حسب الطلب من عشر قطع، مقاسات 42–54، وسعر القطعة ينخفض مع الكمية.',
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero(
        { ru: 'Наши работы', en: 'Our work', ar: 'أعمالنا' },
        {
          ru: 'Тридцать шесть моделей в шести разделах — это наши работы, модели, которые мы уже отшивали. По каждой отшиваем партию под заказ: по нашим лекалам или вашим, от десяти штук. Цена в карточке — ориентир; точную считаем после ткани и лекал.',
          en: 'Thirty-six models across six categories — our portfolio, models we have already produced. Each can be made to order: to our patterns or yours, from ten pieces. The price on the card is a guide; the exact price is calculated after fabric and patterns.',
          ar: '36 موديلاً عبر ستة أقسام — هذه أعمالنا، موديلات قمنا بتفصيلها سابقاً. يمكن تفصيل كل منها حسب الطلب: وفق بتروناتنا أو بتروناتكم، من عشر قطع. السعر في البطاقة تقديري، ونحسب السعر الدقيق بعد القماش والبترون.',
        },
      ),
    },
    tx,
  )

  // The portfolio, and nothing else: the price of the work stands on «Прайс», and a price list
  // under the works turned the portfolio into a shop with price tags on dresses.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'catalog',
      data: {
        limit: 24,
        showCategories: true,
        showPrice: true,
        showAction: true,
        showFilters: true,
        filters: ['tkan', 'cvet', 'sostav', 'sezon', 'price'],
        showSort: true,
        feed: true,
      },
    },
    tx,
  )
}

export async function seedPricePage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'prajs', en: 'prices' },
      status: 'published',
      title: { ru: 'Прайс', en: 'Prices', ar: 'الأسعار' },
      seoTitle: {
        ru: 'Прайс на пошив и цены моделей — Saima, швейный цех в Бишкеке',
        en: 'Sewing prices and model prices — Saima garment workshop in Bishkek',
        ar: 'أسعار الخياطة وأسعار الموديلات — Saima، ورشة خياطة في بيشكيك',
      },
      seoDescription: {
        ru: 'Цены на пошив по видам изделий и цены моделей с тканью цеха: работа без ткани, партии от десяти штук, лекала и образец отдельными строками.',
        en: 'Sewing prices by garment type and model prices with the workshop fabric: work only, runs from ten pieces, patterns and a sample on separate lines.',
        ar: 'أسعار الخياطة حسب نوع القطعة وأسعار الموديلات بقماش الورشة: العمل فقط، دفعات من عشر قطع، والبترونات والعينة بنود منفصلة.',
      },
    },
    tx,
  )

  // The page is the numbers: a heading and two tables, nothing between them. A client of a workshop
  // reads the price of the work first and the price of the model after it; a sentence beside a
  // column of figures is the description the owner took off.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero({ ru: 'Прайс', en: 'Prices', ar: 'الأسعار' }),
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'services',
      data: {
        // A label, not a title: the page's own heading is «Прайс», and a section title is the same
        // size as it, so two of them in a row read as two page titles.
        eyebrow: { ru: 'Пошив', en: 'Sewing', ar: 'الخياطة' },
        layout: 'table',
        source: 'group',
        group: SEWING_GROUP,
        limit: 24,
      },
    },
    tx,
  )

  // The models keep their own price — the garment with the workshop's cloth — and the table reads as
  // the portfolio's price list, never as the work's rate repeated.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'table',
      data: {
        eyebrow: { ru: 'Модели', en: 'Models', ar: 'الموديلات' },
        columns: ['tkan', 'sostav', 'cvet'],
        showSku: false,
        showStock: false,
        showFilters: true,
        // A visitor reads the numbers; the file and the printed sheet are the office's tools, and a
        // row of export buttons over a public price list is chrome nobody asked for.
        showExport: false,
        limit: 60,
      },
    },
    tx,
  )

  // The conditions the numbers stand on — the least run, the ladder, the lead times, the patterns and
  // the cloth. They came off the old wholesale page with the page itself and were missed at once: a
  // price without what it depends on is half an answer.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'features',
      data: {
        layout: 'cells',
        eyebrow: { ru: 'Условия', en: 'Terms', ar: 'الشروط والمزايا' },
        title: {
          ru: 'Что нужно знать до заявки',
          en: 'Key facts before placing an order',
          ar: 'ما يجب معرفته قبل تقديم الطلب',
        },
        items: [
          {
            icon: 'package',
            title: { ru: 'От десяти штук', en: 'From 10 pieces', ar: 'من 10 قطع كحد أدنى' },
            text: {
              ru: 'Одна модель, размеры внутри тиража смешиваются как угодно.',
              en: 'Single model with flexible size distribution within the batch.',
              ar: 'موديل واحد مع إمكانية تنويع وتوزيع المقاسات داخل الدفعة بحرية كاملة.',
            },
          },
          {
            icon: 'percent',
            title: {
              ru: 'Лестница вместо скидки',
              en: 'Tiered volume pricing',
              ar: 'سلم أسعار تصاعدي',
            },
            text: {
              ru: '−10 от десяти, −18 от пятидесяти, −25 от ста, −32 от трёхсот.',
              en: '−10% from 10 pcs, −18% from 50 pcs, −25% from 100 pcs, −32% from 300 pcs.',
              ar: 'خصم 10% من 10 قطع، 18% من 50 قطعة، 25% من 100 قطعة، 32% من 300 قطعة.',
            },
          },
          {
            icon: 'clock',
            title: { ru: 'От семи дней', en: 'From 7 days', ar: 'مواعيد تبدأ من 7 أيام' },
            text: {
              ru: 'Трикотаж и платья — неделя-полторы на сотню, верхняя одежда — три недели.',
              en: 'Jersey knits and dresses take 1 to 1.5 weeks per 100 units; outerwear takes 3 weeks.',
              ar: 'التريكو والفساتين تستغرق أسبوعاً إلى أسبوع ونصف للمائة قطعة، والملابس الخارجية 3 أسابيع.',
            },
          },
          {
            icon: 'file-text',
            title: {
              ru: 'Лекала файлом',
              en: 'Upload patterns as files',
              ar: 'إرفاق ملفات البترون',
            },
            text: {
              ru: 'Приложите к заявке: по чужим лекалам сперва сигнальный, тираж — после «да».',
              en: 'Attach to request: custom patterns begin with a prototype sample; production starts upon approval.',
              ar: 'أرفق الملفات مع الطلب: نبدأ أولاً بالعينة التجريبية ويبدأ الإنتاج بعد الموافقة النهائية.',
            },
          },
          {
            icon: 'truck',
            title: { ru: 'Отгрузка коробами', en: 'Carton shipping', ar: 'شحن الصناديق والطرود' },
            text: {
              ru: 'По ростовкам, с описью. Бишкек — курьером, регионы и КЗ — перевозчиком.',
              en: 'Sorted by size run with packing list. Bishkek via courier; regions and Kazakhstan via freight carriers.',
              ar: 'مرتبة حسب المقاسات مع كشف محتويات. داخل بيشكيك عبر المندوب، وللمناطق وكازاخستان عبر الشحن الدولي.',
            },
          },
          {
            icon: 'shield',
            title: {
              ru: 'Ткань наша или ваша',
              en: 'In-house or client fabric',
              ar: 'القماش من الورشة أو من طرفكم',
            },
            text: {
              ru: 'Со своей считаем только пошив; с нашей закупаем весь тираж одним рулоном.',
              en: 'With client fabric we bill cut-and-sew only; with our fabric we buy the entire single-dye-lot run.',
              ar: 'مع قماشكم نحتسب تكلفة الخياطة فقط؛ ومع أقمشتنا نشتري كامل الكمية من نفس رول القماش.',
            },
          },
        ],
      },
    },
    tx,
  )
}

export async function seedProductionPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'proizvodstvo', en: 'manufacturing' },
      status: 'published',
      title: { ru: 'Производство', en: 'Manufacturing', ar: 'الإنتاج والتصنيع' },
      seoTitle: {
        ru: 'Производство — Saima',
        en: 'Manufacturing — Saima',
        ar: 'الإنتاج والتصنيع — Saima',
      },
      seoDescription: {
        ru: 'Восемнадцать машин, раскройный стол на двенадцать метров, пресс и парогенератор. Что цех умеет и чего не берёт.',
        en: '18 sewing machines, 12-meter cutting table, industrial steam presses. Workshop capabilities and project scope.',
        ar: '18 ماكينة خياطة، طاولة قص بطول 12 متراً، مكابس بخارية صناعية. إمكانيات الورشة ونطاق العمل المعتمد.',
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero(
        { ru: 'Производство', en: 'Manufacturing', ar: 'الإنتاج والتصنيع' },
        {
          ru: 'Два цеха: раскрой, поток, отпарка, упаковка. При каждом шоурум.',
          en: 'Two facilities: cutting, production lines, steam finishing, packaging. Showrooms at each location.',
          ar: 'ورشتان متكاملتان: قص، خطوط خياطة، كي بالبخار، وتغليف. مع معرض ملحق بكل ورشة.',
        },
      ),
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    { type: 'text', padBottom: 'tight', data: { content: paragraphsOf(PROD_TEXT) } },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'features', data: await processData() }, tx)

  await createBlock(
    siteId,
    page.id,
    { type: 'text', padBottom: 'tight', data: { content: paragraphsOf(ABOUT_FABRICS) } },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'gallery', data: await fabricsData() }, tx)

  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        eyebrow: { ru: 'Партия', en: 'Batch order', ar: 'طلب دفعة إنتاجية' },
        title: {
          ru: 'Расскажите, что нужно отшить',
          en: 'Tell us about your production project',
          ar: 'أخبرنا بتفاصيل المشروع المراد تفصيله',
        },
        text: {
          ru: 'Модель, тираж, ткань и срок — этого хватит, чтобы назвать вилку.',
          en: 'Model, quantity, fabric, and timeline — all that is needed to provide an estimate.',
          ar: 'الموديل، الكمية، القماش والموعد — تكفينا لتحديد عرض السعر التقديري.',
        },
        action: askAction,
      },
    },
    tx,
  )
}

export async function seedWorksPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'raboty', en: 'portfolio' },
      status: 'published',
      title: { ru: 'Отгрузки', en: 'Shipments', ar: 'الشحنات' },
      seoTitle: { ru: 'Отгрузки — Saima', en: 'Shipments — Saima', ar: 'الشحنات — Saima' },
      seoDescription: {
        ru: 'Партии, которые уходили из цеха: платья, ростовки блуз, трикотаж под чужой маркой, верхняя одежда.',
        en: 'Completed production runs: dresses, blouse size runs, private label knitwear, and outerwear.',
        ar: 'دفعات تم إنتاجها وشحنها من الورشة: فساتين، سلاسل مقاسات للبلوزات، تريكو لعلامات تجارية، وملابس خارجية.',
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero(
        { ru: 'Отгрузки', en: 'Shipments', ar: 'الشحنات' },
        {
          ru: 'Чужих логотипов здесь нет намеренно: цех шьёт под марками заказчиков, и показывать чужой знак мы права не имеем.',
          en: 'Third-party logos are intentionally omitted: we manufacture for private labels and respect our clients confidentiality.',
          ar: 'لا نعرض شعارات العملاء احتراماً لخصوصيتهم: نحن نصنع لعلامات تجارية خاصة ولا يحق لنا استخدام هوياتهم علناً.',
        },
      ),
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'works', data: { limit: 24 } }, tx)

  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        eyebrow: { ru: 'Партия', en: 'Batch order', ar: 'طلب دفعة إنتاجية' },
        title: {
          ru: 'Следующая партия может быть вашей',
          en: 'Your batch could be next',
          ar: 'الدفعة القادمة قد تكون لعلامتك التجارية',
        },
        text: {
          ru: 'Отшиваем и наши модели, и ваши лекала.',
          en: 'We manufacture both our own models and custom client patterns.',
          ar: 'نفصّل موديلاتنا الخاصة وموديلاتكم وفق بتروناتكم.',
        },
        action: askAction,
      },
    },
    tx,
  )
}

export async function seedPartnersPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'partnery', en: 'partners' },
      status: 'published',
      title: { ru: 'Партнёры', en: 'Partners', ar: 'الشركاء وسلسلة التوريد' },
      seoTitle: {
        ru: 'Партнёры — Saima',
        en: 'Partners — Saima',
        ar: 'الشركاء وسلسلة التوريد — Saima',
      },
      seoDescription: {
        ru: 'С кем работает цех: ткани, фурнитура, вязка полотна, печать и вышивка, бирки, стирка, съёмка для маркетплейсов и карго в Россию и Казахстан.',
        en: 'Our supply chain partners: fabrics, hardware, knitting, printing, embroidery, tags, laundry, product photo studios, and freight cargo to Russia and Kazakhstan.',
        ar: 'شبكة شركاء الورشة: الأقمشة، الإكسسوارات، حياكة التريكو، الطباعة والتطريز، البطاقات، الغسيل الصناعي، التصوير الاحترافي والشحن لكازاخستان وروسيا.',
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero(
        { ru: 'Партнёры', en: 'Partners', ar: 'الشركاء وسلسلة التوريد' },
        {
          ru: 'Те, без кого партия не выходит из цеха.',
          en: 'The trusted supply chain behind every production batch.',
          ar: 'شركاء النجاح الذين تكتمل بهم كل دفعة إنتاجية.',
        },
      ),
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    { type: 'text', padBottom: 'tight', data: { content: paragraphsOf(PARTNERS_TEXT) } },
    tx,
  )

  // Rendered as tiles rather than a strip banner: eight equal cards form a directory rather than a single CTA.
  // Text-only tiles present concise partner information cleanly.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'banners',
      data: {
        layout: 'tile',
        items: PARTNERS.map((partner) => ({
          title: partner.title,
          text: partner.text,
          // A tile is a link as a whole and prints no button words.
          action: { kind: 'url' as const, url: `https://instagram.com/${partner.handle}` },
        })),
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'cta',
      data: {
        eyebrow: { ru: 'Партия', en: 'Batch order', ar: 'طلب دفعة إنتاجية' },
        title: {
          ru: 'Вся цепочка уже собрана',
          en: 'Fully integrated supply chain',
          ar: 'سلسلة التوريد متكاملة وجاهزة بالكامل',
        },
        text: {
          ru: 'Вам остаётся назвать модель и тираж — с остальными мы договоримся сами.',
          en: 'Simply choose your model and quantity — we coordinate all suppliers and finishing.',
          ar: 'يكفيك تحديد الموديل والكمية المطلوبة — وسنتولى التنسيق مع جميع الموردين ومراحل التشطيب بالكامل.',
        },
        action: askAction,
      },
    },
    tx,
  )
}

export async function seedContactsPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'kontakty', en: 'contacts' },
      status: 'published',
      title: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
      seoTitle: {
        ru: 'Контакты — Saima, швейный цех в Бишкеке',
        en: 'Contacts — Saima garment workshop in Bishkek',
        ar: 'اتصل بنا — Saima، ورشة خياطة في بيشكيك',
      },
      seoDescription: {
        ru: 'Ибраимова, 115, корпус 2 и Матросова, 1/3 в промзоне Аламедин-1. Пн–Сб 09:00–18:00. Шоурум при каждом цехе: покажем образцы работ, швы и посадку.',
        en: '115 Ibraimov St, Bldg 2 and 1/3 Matrosov St in Alamedin-1. Mon–Sat 09:00–18:00. A showroom at each workshop: we show samples of our work, seams and fit.',
        ar: 'شارع إبراهيموف 115، مبنى 2 وشارع ماتروزوف 1/3 في المنطقة الصناعية ألاميدين-1. من الإثنين إلى السبت 09:00–18:00. معرض عند كل ورشة: نعرض نماذج من أعمالنا والدرزات والقصة.',
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'hero',
      data: plainHero(
        { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
        {
          ru: 'Шоурум при каждом цехе: покажем образцы работ, швы и посадку. Приезжайте без записи.',
          en: 'A showroom at each workshop: we show samples of our work, seams and fit. Drop in without an appointment.',
          ar: 'معرض عند كل ورشة: نعرض نماذج من أعمالنا والدرزات والقصة. تفضلوا بدون موعد مسبق.',
        },
      ),
    },
    tx,
  )

  await createBlock(siteId, page.id, { type: 'addresses', data: {} }, tx)

  await createBlock(
    siteId,
    page.id,
    {
      type: 'faq',
      data: {
        eyebrow: { ru: 'Вопросы', en: 'FAQ', ar: 'الأسئلة الشائعة' },
        title: { ru: 'Заказ и доставка', en: 'Ordering and delivery', ar: 'الطلب والتوصيل' },
        group: 'zakaz',
        limit: 20,
      },
    },
    tx,
  )
}

export async function seedPrivacyPage(siteId: SiteId, tx: Db | Transaction) {
  await ownPolicy(
    siteId,
    {
      content: paragraphsOf([
        {
          ru: 'Мы собираем имя, телефон и почту — только чтобы ответить на заявку и довезти заказ. Ничего из этого не уходит третьим лицам, кроме перевозчика, которому нужен адрес.',
          en: 'We collect name, phone number, and email strictly to process your request and deliver orders. Never shared with third parties, except shipping carriers requiring delivery addresses.',
          ar: 'نقوم بجمع الاسم، رقم الهاتف، والبريد الإلكتروني — فقط للتواصل بشأن طلبك وتوصيل الشحنة. لا نشارك أياً من بياناتك مع أطراف ثالثة باستثناء شركة الشحن التي تحتاج عنوان التوصيل.',
        },
        {
          ru: 'Лекала, образцы и всё, что вы присылаете в переписке, остаются вашими. Мы не отшиваем чужие модели никому, кроме их хозяина, и не показываем их в работах.',
          en: 'All patterns, physical samples, and technical files remain your exclusive property. We never reproduce custom client designs for other parties or showcase them publicly without permission.',
          ar: 'البترونات، العينات، وجميع الملفات المرسلة في المحادثات تظل ملكاً حصرياً لك. نحن لا نفصل موديلات العملاء لأي طرف آخر ولا نعرضها في معرض أعمالنا دون إذن.',
        },
        {
          ru: 'Написать об удалении данных можно на zakaz@saima.kg — удалим в течение трёх рабочих дней.',
          en: 'To request data deletion, contact zakaz@saima.kg — requests processed within three business days.',
          ar: 'لطلب حذف بياناتك يمكنك مراسلتنا عبر zakaz@saima.kg — وسيتم الحذف خلال 3 أيام عمل.',
        },
      ]),
    },
    tx,
  )
}

const MENU = [
  { page: 'catalog', label: { ru: 'Наши работы', en: 'Our work', ar: 'أعمالنا' } },
  { page: 'prajs', label: { ru: 'Прайс', en: 'Prices', ar: 'الأسعار' } },
  {
    page: 'proizvodstvo',
    label: { ru: 'Производство', en: 'Manufacturing', ar: 'الإنتاج والتصنيع' },
  },
  { page: 'raboty', label: { ru: 'Отгрузки', en: 'Shipments', ar: 'الشحنات' } },
  { page: 'kontakty', label: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' } },
]

export async function seedMenu(siteId: SiteId, tx: Db | Transaction) {
  for (const zone of ['header', 'footer'] as const)
    for (const [position, item] of MENU.entries())
      await createMenuItem(
        siteId,
        {
          zone,
          label: item.label,
          action: { kind: 'page' as const, slug: item.page },
          position,
        },
        tx,
      )

  // A 6th item degrades header scannability; visitors seek supplier listings in the footer after reviewing workshop details.
  await createMenuItem(
    siteId,
    {
      zone: 'footer',
      label: { ru: 'Партнёры', en: 'Partners', ar: 'الشركاء وسلسلة التوريد' },
      action: { kind: 'page' as const, slug: 'partnery' },
      position: MENU.length,
    },
    tx,
  )
  // The service the workshop sells, beside its suppliers and for the same reason — a sixth word in
  // the header would crowd it. By name, so it survives the owner renaming the section.
  await createMenuItem(
    siteId,
    {
      zone: 'footer',
      label: { ru: 'Услуги', en: 'Services', ar: 'الخدمات' },
      action: { kind: 'route' as const, route: 'services' as const },
      position: MENU.length + 1,
    },
    tx,
  )

  await createMenuItem(
    siteId,
    {
      zone: 'action',
      label: { ru: 'Рассчитать партию', en: 'Calculate batch price', ar: 'حساب تكلفة الدفعة' },
      action: askAction,
    },
    tx,
  )

  // The phone's bar: the works, the price list, and the way to reach the workshop.
  // The batch estimate is not a tile — it already floats above the bar as the standing action.
  const bar = [
    {
      label: { ru: 'Работы', en: 'Our work', ar: 'أعمالنا' },
      action: { kind: 'page' as const, slug: 'catalog' },
      icon: 'layout-grid' as const,
    },
    {
      label: { ru: 'Прайс', en: 'Prices', ar: 'الأسعار' },
      action: { kind: 'page' as const, slug: 'prajs' },
      icon: 'file-text' as const,
    },
    {
      label: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
      action: { kind: 'page' as const, slug: 'kontakty' },
      icon: 'phone' as const,
    },
  ]
  for (const [position, item] of bar.entries())
    await createMenuItem(siteId, { zone: 'bar', ...item, position }, tx)
}
