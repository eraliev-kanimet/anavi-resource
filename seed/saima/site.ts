import type { Db, Transaction } from '@anavi/backend/src/db'
import { createBlock } from '@anavi/backend/src/modules/content/block.service'
import { createMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { createPage } from '@anavi/backend/src/modules/content/page.service'
import { createReview } from '@anavi/backend/src/modules/review/review.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { findImage } from '../assets'
import { SAIMA_SELECTIONS } from './catalog'
import { REQUEST_FORM } from './forms'
import { paragraphsOf } from '../labels'
import { seedQuestions } from '../faq'
import { galleryImages, plainHero } from '../blocks'
import type { SiteId } from '@anavi/backend/src/db/ids'

/*
 * One sentence over the photograph, and nothing under it.
 *
 * The first screen used to be a short claim above a paragraph, which is the shape every workshop's
 * site shares: «Женская одежда, сшитая здесь» is true of two hundred of them. The sentence below is
 * long on purpose — what is sewn, where, how fast one piece leaves and from how many a run starts —
 * because a sentence made of a business's own terms cannot be the neighbour's.
 *
 * The photographs are whichever of these have arrived in the folder: the words stay still and the
 * pictures turn over under them, so a second frame costs the reader nothing.
 */
const POSTER = {
  shots: ['ridge', 'jailoo', 'yard', 'dordoy'],
  eyebrow: {
    ru: 'Два цеха, при каждом шоурум',
    en: 'Two workshops, a showroom at each',
    ar: 'ورشتان، ومعرض ملحق بكل منهما',
  },
  title: {
    ru: 'Шьём женскую одежду в Бишкеке: коллекция лежит на складе и уезжает в день заказа, а партии от десяти штук отшиваем для магазинов и селлеров по своим лекалам или по вашим',
    en: 'Womenswear sewn in Bishkek: the collection is in stock and leaves the day you order, and runs from ten pieces are made for shops and sellers to our patterns or to yours',
    ar: 'ملابس نسائية تُخاط في بيشكيك: التشكيلة جاهزة في المستودع وتُشحن يوم الطلب، والدفعات من عشر قطع نخيطها للمتاجر والبائعين على بتروناتنا أو على بتروناتكم',
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
const WORKS = [
  {
    file: 'dresses',
    caption: {
      ru: 'Партия платьев, сто двадцать штук, отгрузка в Алматы',
      en: 'Batch of 120 dresses shipped to Almaty',
      ar: 'دفعة فساتين تضم 120 قطعة تم شحنها إلى ألماتي',
    },
  },
  {
    file: 'blouses',
    caption: {
      ru: 'Ростовки блуз: пять размеров, по двадцать штук в каждом',
      en: 'Blouse size runs: 5 sizes, 20 pieces each',
      ar: 'سلاسل مقاسات للبلوزات: 5 مقاسات، بواقع 20 قطعة لكل مقاس',
    },
  },
  {
    file: 'sample',
    caption: {
      ru: 'Отшив по лекалам заказчика: сигнальный образец и раскладка',
      en: 'Contract manufacturing from client patterns: prototype sample and cutting layout',
      ar: 'تفصيل وإنتاج خاص وفقاً لبترون العميل: العينة النموذجية وخطة القص',
    },
  },
  {
    file: 'knitwear',
    caption: {
      ru: 'Трикотаж партией: свитшоты и джемперы под маркой магазина',
      en: 'Knitwear batch: sweatshirts and sweaters produced for retailer private label',
      ar: 'دفعة تريكو: سويت شيرتات وكنزات صوفية لعلامة تجارية خاصة لمتجر',
    },
  },
  {
    file: 'coats',
    caption: {
      ru: 'Верхняя одежда: пальто и тренчи, тираж на осень',
      en: 'Outerwear: autumn run of tailored coats and trench coats',
      ar: 'ملابس خارجية: تشكيلة الخريف من المعاطف والترنش كوت',
    },
  },
  {
    file: 'carton',
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
      ru: 'Десять штук одной модели — с этого начинается лестница цен. Меньше отшить тоже можно, но считаться будет по розничной цене: раскладка лекал на десять штук и на три отличается расходом ткани вдвое.',
      en: 'Ten pieces per model — where our tiered pricing begins. Smaller runs are possible but billed at retail rates, as cutting layouts for 10 vs 3 garments require double the fabric waste.',
      ar: 'عشر قطع من الموديل الواحد — حيث يبدأ سلم الأسعار التنازلية. يمكن تفصيل كميات أقل ولكن بسعر التجزئة، لأن خطة قص 10 قطع تختلف كلياً عن قص 3 قطع من حيث استهلاك القماش وهدره.',
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
      ru: 'Вещи уже сшиты или шьются под заказ?',
      en: 'Are collection items in stock or made to order?',
      ar: 'هل القطع جاهزة في المخزن أم تُفصل حسب الطلب؟',
    },
    answer: {
      ru: 'Всё, что в коллекции, уже сшито и лежит на складе — поэтому заказ на одну вещь уезжает в тот же день. Под заказ мы шьём только партии: отшить одно платье заново стоило бы как десять, потому что раскладка лекал на одну вещь съедает вдвое больше ткани, а поток на восемнадцать машин ради неё не останавливают.',
      en: 'All catalog collection pieces are sewn and stocked in our warehouse — single-item orders dispatch same-day. Custom made-to-order runs are strictly for wholesale batches, as setting up an 18-machine line for one item is uneconomical.',
      ar: 'جميع قطع التشكيلة الحالية مفصلة مسبقاً ومتوفرة في مستودعنا — لذلك تُشحن الطلبات الفردية في نفس اليوم. أما التفصيل حسب الطلب فهو مخصص لطلبيات الجملة والدفعات فقط، لأن إعادة تفصيل فستان واحد تكلف كعشرة فساتين نظراً لهدر القماش وصعوبة تشغيل خط الماكينات لقطعة واحدة.',
    },
  },
  {
    group: 'zakaz',
    question: {
      ru: 'Как понять свой размер?',
      en: 'How do I choose the correct size?',
      ar: 'كيف أحدد المقاس المناسب لي بدقة؟',
    },
    answer: {
      ru: 'Сетка российская: 42–54. В карточке каждой вещи написано, как она садится — свободно, по фигуре или на размер больше нормы. Если сомневаетесь между двумя, напишите нам рост и обхваты, подскажем.',
      en: 'We use standard Russian sizing: 42–54. Each product page details the intended fit — relaxed, tailored, or oversized. If between sizes, share your height and measurements in chat and we will assist.',
      ar: 'نعتمد جدول المقاسات القياسي: 42–54. توضح بطاقة كل منتج طريقة مقاسه — قصة مريحة واسعة، محددة للقوام، أو أوفر سايز. إذا كنتِ بين مقاسين، أرسلي لنا الطول والمقاسات وسنرشدك فوراً.',
    },
  },
  {
    group: 'zakaz',
    question: {
      ru: 'Можно померить перед покупкой?',
      en: 'Can I try items on before buying?',
      ar: 'هل يمكن تجربة وقياس الملابس قبل الشراء؟',
    },
    answer: {
      ru: 'Да, шоурум есть при каждом цехе — на Ибраимова и в Аламедине. Вся коллекция висит на рейле, примерочная одна. Работаем с понедельника по субботу с девяти до шести.',
      en: 'Yes, both our Ibraimov and Alamedin workshops feature showrooms. The entire collection is on display with fitting rooms available. Open Monday to Saturday from 9:00 AM to 6:00 PM.',
      ar: 'نعم، يتوفر معرض (شوروم) ملحق بكل ورشة — في شارع إبراهيموف وفي منطقة ألاميدين. التشكيلة بالكامل معروضة مع غرف قياس. نعمل من الإثنين إلى السبت من 9:00 صباحاً حتى 6:00 مساءً.',
    },
  },
  {
    group: 'zakaz',
    question: {
      ru: 'Не подошёл размер — что делать?',
      en: 'What if the size does not fit?',
      ar: 'ماذا لو لم يناسبني المقاس بعد الاستلام؟',
    },
    answer: {
      ru: 'Меняем в течение четырнадцати дней, если вещь не носили и бирки на месте. Обмен по Бишкеку бесплатный, в регионы — за счёт покупателя.',
      en: 'Exchanges accepted within 14 days provided items are unworn with original tags attached. Free exchange within Bishkek; regional shipping at customer expense.',
      ar: 'نوفر الاستبدال خلال 14 يوماً بشرط عدم استخدام القطعة ووجود البطاقات الأصلية. الاستبدال داخل بيشكيك مجاني، وإلى المحافظات والمناطق على حساب العميل.',
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

const OPT_TEXT = [
  {
    ru: 'Цех работает с магазинами, селлерами маркетплейсов и марками, у которых нет своего производства. Половина отгрузок уезжает в Россию и Казахстан, половина остаётся в Бишкеке.',
    en: 'Our workshop partners with retail stores, marketplace sellers, and fashion brands without their own manufacturing facilities. Half of our shipments go to Russia and Kazakhstan, and half stay in Bishkek.',
    ar: 'تتعاون ورشتنا مع المتاجر، بائعي الماركتبليس، والعلامات التجارية التي لا تملك مصانع خاصة بها. نصف شحناتنا تتوجه إلى روسيا وكازاخستان، ونصفها يوزع محلياً في بيشكيك.',
  },
  {
    ru: 'Есть два способа с нами работать. Первый — взять коллекцию: те же модели, что на витрине, но партией и по цене тиража. Лекала на них у нас есть, поэтому запуск начинается сразу и стоит дешевле всего. Второй — принести свои лекала или образец, и мы отошьём вашу модель под вашей маркой; лекала с образца снимаем сами, это отдельная работа и отдельные деньги.',
    en: 'There are two ways to work with us. First: order from our existing collection at wholesale tiered prices. Patterns are ready, enabling immediate launch at our lowest cost. Second: supply your own patterns or physical sample for white-label production under your brand; pattern development from samples is quoted separately.',
    ar: 'هناك طريقتان للتعاون معنا: الأولى — اختيار موديلات من تشكيلتنا الحالية بأسعار الجملة التنازلية، حيث البترونات جاهزة مما يتيح بدء الإنتاج فوراً بأقل تكلفة. الثانية — تزويدنا بالبترون الخاص بكم أو عينة جاهزة لنفصل موديلاتكم تحت علامتكم التجارية؛ استخراج البترون من العينة يُسعّر كخدمة منفصلة.',
  },
  {
    ru: 'Цена за штуку падает ступенями: до десяти штук держится розничная, от десяти — минус десять процентов, от пятидесяти — восемнадцать, от ста — двадцать пять, от трёхсот — тридцать два. Лестница видна в каждой карточке: это не скидка, а ваша цена.',
    en: 'Per-unit pricing decreases on a tiered scale: under 10 units at retail, 10+ units at -10%, 50+ at -18%, 100+ at -25%, and 300+ at -32%. The tiered scale is displayed on every product page: not a temporary discount, but your standard pricing.',
    ar: 'سعر القطعة ينخفض بنظام الشرائح: أقل من 10 قطع بسعر التجزئة، من 10 قطع خصم 10%، من 50 قطعة خصم 18%، من 100 قطعة خصم 25%، ومن 300 قطعة خصم 32%. يظهر سلم الأسعار في كل بطاقة منتج كأصل سعري وليس كخصم مؤقت.',
  },
  {
    ru: 'Прикидку вы увидите сами, не дожидаясь ответа: назовите вещь, тираж, ткань и срок — сумма появится прямо в анкете, пока вы её заполняете. Это вилка, а не цена; точную мы называем, увидев ткань и лекала, и на это уходит день.',
    en: 'You can estimate pricing instantly in our interactive form: choose the garment type, quantity, fabric, and timeline to generate an immediate estimate range. Exact quotes are finalized within one business day once patterns and textiles are inspected.',
    ar: 'يمكنك معرفة التكلفة التقديرية فوراً في النموذج التفاعلي: حدد نوع القطعة، الكمية، القماش، والمدة لتظهر لك القيمة التقديرية أثناء التعبئة. نحدد السعر النهائي الدقيق خلال يوم عمل بعد معاينة القماش والبترون.',
  },
]

const PROD_TEXT = [
  {
    ru: 'Цеха два. На Ибраимова — восемнадцать швейных машин, петельная, пуговичная, закрепочная, промышленный пресс и парогенератор; раскройный стол на двенадцать метров, на нём настилают до сорока слоёв. В Аламедине — трикотажный поток и верхняя одежда, второй раскройный стол и упаковка на отгрузку.',
    en: 'We operate two facilities. On Ibraimov: 18 sewing machines, buttonholers, button sewers, bartackers, industrial steam presses, and a 12-meter cutting table accommodating up to 40 fabric plies. In Alamedin: jersey knit and outerwear lines, a second cutting table, and final freight packaging.',
    ar: 'نمتلك ورشتين: في شارع إبراهيموف — 18 ماكينة خياطة، ماكينات فتح الأزرار، تركيب الأزرار، التثبيت، مكابس صناعية، وطاولة قص بطول 12 متراً تتسع لرص حتى 40 طبقة قماش. وفي ألاميدين — خطوط التريكو والملابس الخارجية وطاولة قص ثانية وقسم التغليف والشحن.',
  },
  {
    ru: 'Мы не берём то, что не умеем. Кожа, мех, корсетные изделия и трикотаж машинной вязки — не к нам: вязку заказываем на стороне, а шьём из готового полотна.',
    en: 'We focus strictly on our core expertise. Leather, fur, corsetry, and machine-knitted sweaters are out of scope: specialized knitting is outsourced while we cut and sew from finished yardage.',
    ar: 'نحن لا نقبل ما لا نتقنه باحتراف. الجلود، الفراء، الكورسيهات والتريكو المحبوك آلياً خارج نطاقنا: نتعاقد على الحياكة خارجياً ونقوم بالقص والخياطة من الألواح الجاهزة.',
  },
]

const ABOUT_FABRICS = [
  {
    ru: 'Ткани держим на складе, а не заказываем под каждую партию: из-за этого запуск начинается на следующий день после согласования, а не через три недели. Семь основных полотен всегда в наличии, остальное закупаем под тираж.',
    en: 'We maintain standing fabric inventory in our warehouse rather than ordering per batch: enabling production to launch the day after sign-off rather than three weeks later. Seven core textiles are always in stock; specialty fabrics are procured per order.',
    ar: 'نحتفظ برصيد دائم من الأقمشة في مستودعنا ولا نطلبها بعد كل دفعة: لذا يبدأ الإنتاج في اليوم التالي للموافقة دون انتظار أسابيع. سبعة أقمشة أساسية متوفرة دائماً، ونشتري الأقمشة الخاصة حسب متطلبات كل طلب.',
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
    const image = await findImage(`saima/runs/${item.file}.webp`, item.caption.ru)
    if (!image) continue
    const work = await createReview(
      siteId,
      { caption: item.caption, isWork: true, position: position++ },
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
        ru: 'Готовая коллекция со склада: заказали — уехало в тот же день. Партии отшиваем заново, по своим лекалам или по вашим, и цена за штуку падает с тиражом.',
        en: 'In-stock collection: same-day dispatch. Batch production using in-house or custom patterns, with tiered volume pricing.',
        ar: 'تشكيلة جاهزة من المستودع: الطلب يُشحن في نفس اليوم. إنتاج دفعات جديدة وفقاً لبتروناتنا أو بتروناتكم بأسعار تنازلية حسب الكمية.',
      },
    },
    tx,
  )

  const shots = []
  for (const file of POSTER.shots) {
    const image = await findImage(`saima/poster/${file}.webp`, POSTER.title.ru)
    if (image) shots.push({ image: { key: image.key, width: image.width, height: image.height } })
  }
  const [first, ...rest] = shots
  const slides = [
    {
      eyebrow: POSTER.eyebrow,
      title: POSTER.title,
      ...first,
      actions: [
        {
          kind: 'page' as const,
          slug: 'catalog',
          label: { ru: 'Смотреть коллекцию', en: 'View collection', ar: 'تصفح التشكيلة' },
        },
        askAction,
      ],
    },
    ...rest,
  ]
  await createBlock(
    siteId,
    page.id,
    { type: 'hero', data: { layout: 'poster', slides, interval: 8 } },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'categories',
      data: {
        eyebrow: { ru: 'Коллекция', en: 'Collection', ar: 'التشكيلة' },
        title: { ru: 'Что мы шьём', en: 'What we produce', ar: 'ما نقوم بإنتاجه' },
        limit: 6,
        showCount: true,
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
        eyebrow: { ru: 'Опт', en: 'Wholesale', ar: 'الجملة' },
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
    const image = await findImage(`saima/floor/${step.file}.webp`, step.title.ru)
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
    title: { ru: 'Ткани на складе', en: 'Fabrics in stock', ar: 'الأقمشة المتوفرة في المستودع' },
    images: await galleryImages('saima/fabrics', FABRICS),
  }
}

export async function seedCatalogPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'catalog', en: 'catalog' },
      status: 'published',
      title: { ru: 'Коллекция', en: 'Collection', ar: 'التشكيلة' },
      seoTitle: { ru: 'Коллекция — Saima', en: 'Collection — Saima', ar: 'التشكيلة — Saima' },
      seoDescription: {
        ru: 'Платья, блузы, брюки, трикотаж, верхняя одежда и костюмы собственного пошива. Размеры 42–54, цена за штуку падает с тиражом.',
        en: 'Dresses, blouses, trousers, knitwear, outerwear, and suits crafted in-house. Sizes 42–54 with volume tiered pricing.',
        ar: 'فساتين، بلوزات، بناطيل، تريكو، ملابس خارجية وبدلات من إنتاج ورشتنا. مقاسات 42–54 مع أسعار تنازلية لطلبيات الجملة.',
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
        { ru: 'Коллекция', en: 'Collection', ar: 'التشكيلة' },
        {
          ru: 'Тридцать шесть моделей в шести разделах — всё это уже сшито и лежит на складе. Заказали одну вещь — она уезжает в тот же день; заказали партию — отшиваем заново, и тогда работает лестница цен из карточки.',
          en: 'Thirty-six models across six categories — sewn and stocked in our warehouse. Single items dispatch same-day; batch orders are custom manufactured according to tiered card pricing.',
          ar: '36 موديلاً عبر ستة أقسام — جميعها مفصلة وجاهزة في المستودع. طلب القطعة الواحدة يُشحن في نفس اليوم؛ وطلبيات الدفعات يُعاد إنتاجها وفق سلم أسعار الجملة الموضح في البطاقة.',
        },
      ),
    },
    tx,
  )

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

export async function seedOptPage(siteId: SiteId, tx: Db | Transaction) {
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'opt', en: 'wholesale' },
      status: 'published',
      title: { ru: 'Оптом', en: 'Wholesale', ar: 'بالجملة' },
      seoTitle: {
        ru: 'Пошив партиями и опт — Saima, швейный цех в Бишкеке',
        en: 'Batch production and wholesale — Saima garment workshop in Bishkek',
        ar: 'الإنتاج بالدفعات والجملة — Saima، ورشة خياطة في بيشكيك',
      },
      seoDescription: {
        ru: 'Отшив партиями от десяти штук: своя коллекция или ваши лекала. Лестница цен до −32%, сроки от семи дней, отгрузка по Киргизии, России и Казахстану.',
        en: 'Batch production from 10 units: catalog styles or custom patterns. Tiered discounts up to -32%, lead times from 7 days, shipping across Kyrgyzstan, Russia, and Kazakhstan.',
        ar: 'إنتاج دفعات يبدأ من 10 قطع: من تشكيلتنا الخاصة أو وفقاً لبتروناتكم. خصومات حتى 32%، مدة تسليم تبدأ من 7 أيام، وشحن إلى قيرغيزستان وروسيا وكازاخستان.',
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
        {
          ru: 'Оптом и по вашим лекалам',
          en: 'Wholesale and custom pattern production',
          ar: 'بالجملة ووفقاً للبترون الخاص بكم',
        },
        {
          ru: 'Магазинам, селлерам и маркам без своего производства.',
          en: 'For retail stores, marketplace sellers, and brands without in-house manufacturing.',
          ar: 'للمتاجر، بائعي الماركتبليس، والعلامات التجارية التي لا تملك مصانع خاصة بها.',
        },
      ),
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    { type: 'text', padBottom: 'tight', data: { content: paragraphsOf(OPT_TEXT) } },
    tx,
  )

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

  // Category-specific price table: columns highlight fabric and composition, the primary wholesale criteria.
  // Direct purchase buttons are omitted: wholesale pages route to batch inquiry rather than cart.
  await createBlock(
    siteId,
    page.id,
    {
      type: 'table',
      data: {
        eyebrow: { ru: 'Прайс', en: 'Price list', ar: 'قائمة الأسعار' },
        title: {
          ru: 'Розничная цена до десяти штук',
          en: 'Retail price for under 10 pieces',
          ar: 'سعر التجزئة للطلبات الأقل من 10 قطع',
        },
        columns: ['tkan', 'sostav', 'cvet'],
        showSku: false,
        showStock: false,
        showFilters: true,
        showExport: true,
        limit: 60,
      },
    },
    tx,
  )

  await createBlock(
    siteId,
    page.id,
    {
      type: 'faq',
      data: {
        eyebrow: { ru: 'Вопросы', en: 'FAQ', ar: 'الأسئلة الشائعة' },
        title: { ru: 'О партиях', en: 'Batch production FAQ', ar: 'حول إنتاج الدفعات' },
        group: 'opt',
        limit: 20,
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
        eyebrow: { ru: 'Расчёт', en: 'Quote', ar: 'حساب التكلفة' },
        title: {
          ru: 'Посчитайте партию',
          en: 'Estimate your batch',
          ar: 'احسب تكلفة الدفعة التقديرية',
        },
        text: {
          ru: 'Вещь, тираж, ткань и срок — вилка появится на первом же экране, до того как вы назовёте себя.',
          en: 'Garment, volume, fabric, and lead time — instant estimate range appears on the first step before entering contact info.',
          ar: 'القطعة، الكمية، القماش، والموعد — تظهر لك القيمة التقديرية في الشاشة الأولى قبل إدخال بيانات الاتصال.',
        },
        action: askAction,
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
      title: { ru: 'Работы', en: 'Portfolio', ar: 'الأعمال والإنتاج' },
      seoTitle: { ru: 'Работы — Saima', en: 'Portfolio — Saima', ar: 'الأعمال والإنتاج — Saima' },
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
        { ru: 'Работы', en: 'Portfolio', ar: 'الأعمال والإنتاج' },
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
          ru: 'Отшиваем и свою коллекцию, и чужие лекала.',
          en: 'We manufacture both our catalog styles and custom client patterns.',
          ar: 'نقوم بتفصيل تشكيلتنا الخاصة وتصنيع الموديلات الخاصة بكم بدقة تامة.',
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
          action: {
            kind: 'url' as const,
            url: `https://instagram.com/${partner.handle}`,
            label: { ru: `@${partner.handle}`, en: `@${partner.handle}` },
          },
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
        ru: 'Ибраимова, 115, корпус 2 и Матросова, 1/3 в промзоне Аламедин-1. Пн–Сб 09:00–18:00. Шоурум при каждом цехе, примерка без записи.',
        en: '115 Ibraimov St, Bldg 2 and 1/3 Matrosov St in Alamedin-1. Mon–Sat 09:00–18:00. Showroom at both locations, walk-in fittings welcome.',
        ar: 'شارع إبراهيموف 115، مبنى 2 وشارع ماتروزوف 1/3 في المنطقة الصناعية ألاميدين-1. من الإثنين إلى السبت 09:00–18:00. معرض عند كل ورشة، تجربة وقياس بدون موعد مسبق.',
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
          ru: 'Шоурум при каждом цехе: вся коллекция на рейле, примерка без записи.',
          en: 'Showroom at both workshops: entire collection on display, walk-in fittings welcome.',
          ar: 'معرض عند كل ورشة: التشكيلة الكاملة معروضة مع غرف قياس بدون موعد مسبق.',
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
  const page = await createPage(
    siteId,
    {
      slug: { ru: 'politika', en: 'privacy' },
      status: 'published',
      title: { ru: 'Политика конфиденциальности', en: 'Privacy policy', ar: 'سياسة الخصوصية' },
    },
    tx,
  )
  await createBlock(
    siteId,
    page.id,
    {
      type: 'text',
      data: {
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
    },
    tx,
  )
}

const MENU = [
  { page: 'catalog', label: { ru: 'Коллекция', en: 'Collection', ar: 'التشكيلة' } },
  { page: 'opt', label: { ru: 'Оптом', en: 'Wholesale', ar: 'بالجملة' } },
  {
    page: 'proizvodstvo',
    label: { ru: 'Производство', en: 'Manufacturing', ar: 'الإنتاج والتصنيع' },
  },
  { page: 'raboty', label: { ru: 'Работы', en: 'Portfolio', ar: 'الأعمال والإنتاج' } },
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

  await createMenuItem(
    siteId,
    {
      zone: 'action',
      label: { ru: 'Рассчитать партию', en: 'Calculate batch price', ar: 'حساب تكلفة الدفعة' },
      action: askAction,
    },
    tx,
  )

  await createMenuItem(
    siteId,
    {
      zone: 'legal',
      label: { ru: 'Политика конфиденциальности', en: 'Privacy policy', ar: 'سياسة الخصوصية' },
      action: { kind: 'page' as const, slug: 'politika' },
    },
    tx,
  )
}
