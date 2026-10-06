import type { Db, Transaction } from '@anavi/backend/src/db'
import type { EditorDoc, LocalizedLabel } from '@anavi/shared'
import { createPost } from '@anavi/backend/src/modules/content/post.service'
import { createTopic, findTopicBySlug } from '@anavi/backend/src/modules/content/topic.service'
import { createTag } from '@anavi/backend/src/modules/content/tag.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { findImage } from '../assets'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Reviews are titled after products that actually exist in the catalogue, with all figures sourced
// from their specifications: any discrepancy between article text and product card undermines credibility.

type Block =
  | { kind: 'h'; text: LocalizedLabel }
  | { kind: 'p'; text: LocalizedLabel }
  | { kind: 'list'; items: LocalizedLabel[]; ordered?: boolean }

const h = (text: LocalizedLabel): Block => ({ kind: 'h', text })
const p = (text: LocalizedLabel): Block => ({ kind: 'p', text })
const steps = (...items: LocalizedLabel[]): Block => ({
  kind: 'list',
  items,
  ordered: true,
})
const points = (...items: LocalizedLabel[]): Block => ({ kind: 'list', items })

function documentOf(body: Block[]): EditorDoc {
  return {
    blocks: body.map((block) => {
      if (block.kind === 'h') return { type: 'header', data: { text: block.text, level: 2 } }
      if (block.kind === 'p') return { type: 'paragraph', data: { text: block.text } }
      return {
        type: 'list',
        data: {
          style: block.ordered ? 'ordered' : 'unordered',
          items: block.items,
        },
      }
    }),
  }
}

const TOPICS = [
  { slug: 'obzory', name: { ru: 'Обзоры', en: 'Reviews', ar: 'مراجعات' } },
  { slug: 'stati', name: { ru: 'Статьи', en: 'Articles', ar: 'مقالات' } },
]

const TAGS = [
  { slug: 'holodilniki', name: { ru: 'Холодильники', en: 'Refrigerators', ar: 'ثلاجات' } },
  { slug: 'stirka', name: { ru: 'Стирка', en: 'Laundry', ar: 'غسالات' } },
  { slug: 'uborka', name: { ru: 'Уборка', en: 'Cleaning', ar: 'تنظيف' } },
  { slug: 'duhovki', name: { ru: 'Духовки', en: 'Ovens', ar: 'أفران' } },
  {
    slug: 'vstroennaya-tehnika',
    name: { ru: 'Встраиваемая техника', en: 'Built-in appliances', ar: 'أجهزة مدمجة (بلت إن)' },
  },
  {
    slug: 'zamery',
    name: {
      ru: 'Замеры и установка',
      en: 'Measurements and installation',
      ar: 'المقاسات والتركيب',
    },
  },
]

interface Post {
  slug: string
  topic: string
  tags: string[]
  title: LocalizedLabel
  summary: LocalizedLabel
  body: Block[]
}

// Publication dates are spaced two weeks apart, alternating between reviews and articles: a feed
// without dates reflects insertion order, and three consecutive reviews on the home page would look like ads.
const FIRST_PUBLISHED = new Date('2026-03-05T10:00:00Z')
const STEP_DAYS = 14

const POSTS: Post[] = [
  {
    slug: 'zagruzka-i-otzhim',
    topic: 'stati',
    tags: ['stirka'],
    title: {
      ru: 'Загрузка и отжим: что правда решает при выборе стиральной машины',
      en: 'Capacity and spin speed: what truly matters when choosing a washing machine',
      ar: 'السعة وسرعة الدوران: ما يهم حقاً عند اختيار الغسالة',
    },
    summary: {
      ru: 'Загрузку считают в сухом хлопке, а после 1200 оборотов разница в сушке почти не читается. Что смотреть вместо этих двух цифр.',
      en: 'Capacity is measured in dry cotton, and above 1,200 RPM drying difference is negligible. What to look at instead of these two figures.',
      ar: 'تُحسب السعة على القطن الجاف، وبعد 1200 دورة يصبح الفرق في التجفيف شبه معدوم. ما يجب التركيز عليه بدلاً من هذين الرقمين.',
    },
    body: [
      p({
        ru: 'В зале спрашивают про две цифры: сколько килограммов и сколько оборотов. Обе честные, но обе понимают неправильно — и переплачивают именно за них.',
        en: 'Shoppers usually ask about two numbers: capacity in kilograms and spin speed in RPM. Both are genuine metrics, but both are often misunderstood — leading to unnecessary overpayment.',
        ar: 'يسأل العملاء في المعرض عادة عن رقمين: كم كيلوغراماً وكم دورة في الدقيقة. كلاهما رقمان حقيقيان، لكن يتم فهمهما بشكل خاطئ — ودفع مبالغ إضافية لصالحهما دون داعٍ.',
      }),
      h({
        ru: 'Загрузка считается сухим хлопком, а не «сколько влезет»',
        en: 'Capacity is rated in dry cotton, not "whatever fits"',
        ar: 'تُحسب السعة بالقطن الجاف وليس «بكل ما يمكن حشره»',
      }),
      p({
        ru: 'Максимальная загрузка меряется сухим хлопковым бельём на основной программе. Синтетика, шерсть и деликатные вещи грузятся меньше — у каждой такой программы своя норма, и она вдвое ниже. Поэтому 9 кг не значит «постираю в два раза больше, чем в семёрке»: значит «на программе хлопка положу девять сухих килограммов».',
        en: 'Maximum capacity is measured using dry cotton on standard cycles. Synthetics, wool, and delicate garments require smaller loads — each cycle has its own limit, typically half the maximum. So 9 kg does not mean "washing twice as much as a 7 kg model": it means "loading nine dry kilograms on the cotton cycle".',
        ar: 'تُقاس السعة القصوى بملابس قطنية جافة في البرنامج الأساسي. بينما تتطلب الأقمشة الاصطناعية والصوف والملابس الحساسة حمولة أقل — لكل برنامج حد محدد يصل إلى النصف. لذا فإن سعة 9 كغ لا تعني «غسل ضعف حمولة غسالة 7 كغ»، بل تعني «وضع 9 كغ من القطن الجاف في برنامج القطن».',
      }),
      p({
        ru: 'Двоим хватает 6 кг, семье из трёх-четырёх — 7. Восемь и девять берут под одну конкретную задачу: пуховое одеяло или зимние куртки, которые в семёрку просто не помещаются. Если такой задачи нет, лишние килограммы — это лишняя глубина корпуса и лишние деньги.',
        en: 'A 6 kg capacity is ample for two people; 7 kg suits a family of three or four. Eight or nine kilograms are chosen for specific needs: down duvets or bulky winter jackets that simply do not fit into a 7 kg drum. Without such needs, extra capacity only means extra cabinet depth and extra cost.',
        ar: 'تكفي سعة 6 كغ لشخصين، و7 كغ لعائلة من ثلاثة إلى أربعة أفراد. وتُختار سعة 8 و9 كغ لمهام محددة: مثل البطانيات الكبيرة والسترات الشتوية الضخمة التي لا تتسع في سعة 7 كغ. وبدون هذه الحاجة، تعني الكيلوغرامات الإضافية عمقاً أكبر للهيكل وتكلفة زائدة.',
      }),
      p({
        ru: 'У машин со сушкой цифра всегда двойная, и это не придирка к маркетингу. Сушить можно вдвое меньше, чем стирать: девять килограммов стирки при пяти килограммах сушки — нормальная пара, и после стирки полной загрузки половину придётся вынуть.',
        en: 'Washer-dryers always specify dual capacities, which is a technical reality rather than marketing nuance. Drying capacity is about half of washing capacity: 9 kg wash with 5 kg dry is standard, meaning half a full wash load must be removed before drying.',
        ar: 'تحمل الغسالات المزودة بمجفف رقماً مزدوجاً دائماً، وهذا واقع تقني وليس حيلة تسويقية. سعة التجفيف تعادل نصف سعة الغسيل تقريباً: غسيل 9 كغ مع تجفيف 5 كغ ثنائي قياسي، مما يعني إخراج نصف الحمولة بعد الغسيل الكامل قبل بدء التجفيف.',
      }),
      h({
        ru: 'Отжим: после 1200 разница почти не читается',
        en: 'Spin cycle: differences above 1,200 RPM are barely noticeable',
        ar: 'العصر: بعد 1200 دورة يصبح الفرق غير ملحوظ تقريباً',
      }),
      p({
        ru: 'Оборотами меряют не качество стирки, а остаточную влажность. На 1000 бельё выходит с примерно шестьюдесятью процентами влаги, на 1200 — с пятьюдесятью с небольшим, на 1400 — около сорока пяти. Первая ступень заметна, вторая — уже нет: на балконе и то, и другое высохнет за одинаковый вечер.',
        en: 'Spin speed measures residual moisture rather than washing quality. At 1,000 RPM laundry emerges with about 60% moisture, at 1,200 RPM around 50–53%, and at 1,400 RPM around 45%. The step from 1,000 to 1,200 is noticeable, but the next step is negligible: both will dry in the same single evening on a drying rack.',
        ar: 'لا تقيس سرعة الدوران جودة الغسيل بل نسبة الرطوبة المتبقية. عند 1000 دورة تخرج الملابس برطوبة 60% تقريباً، وعند 1200 دورة بحوالي 50%، وعند 1400 دورة بحوالي 45%. الفرق بين 1000 و1200 ملموس، أما ما بعد ذلك فلا يكاد يلاحظ: كلاهما يجف في نفس الأمسية على منشر الغسيل.',
      }),
      p({
        ru: 'Зато шум на максимальных оборотах растёт честно: при стирке машина держится около пятидесяти децибел, при отжиме уходит к семидесяти. Это громко для однокомнатной квартиры со спящим ребёнком, и отсрочка старта тут выручает больше, чем лишние двести оборотов.',
        en: 'However, noise at peak spin speeds increases noticeably: from around 50 dB during washing up to 70 dB during spin. That is loud in a compact apartment with a sleeping child, making delay start far more valuable than an extra 200 RPM.',
        ar: 'في المقابل، يزداد مستوى الضجيج بوضوح عند السرعات القصوى: من 50 ديسيبل أثناء الغسيل إلى 70 ديسيبل أثناء العصر. هذا صوت مرتفع لشقة صغيرة مع طفل نائم، وهنا تكون ميزة تأخير بدء التشغيل أكثر فائدة بكثير من 200 دورة إضافية.',
      }),
      h({
        ru: 'На что смотреть вместо этих двух цифр',
        en: 'What to look for instead of these two figures',
        ar: 'ما الذي يجب الانتباه إليه بدلاً من هذين الرقمين',
      }),
      points(
        {
          ru: 'Глубина корпуса — единственный размер, который нельзя не угадать: узкие 45 см против полноразмерных 60.',
          en: 'Cabinet depth — the one critical dimension you must get right: slim 45 cm versus full-size 60 cm.',
          ar: 'عمق الهيكل — البعد الحاسم الوحيد الذي يجب ضبطه بدقة: 45 سم للموديلات الضيقة مقابل 60 سم للحجم الكامل.',
        },
        {
          ru: 'Тип двигателя: инверторный тише и не имеет щёток, которые изнашиваются.',
          en: 'Motor type: inverter motors run quieter and have no wearable carbon brushes.',
          ar: 'نوع المحرك: المحرك الإنفرتر أهدأ وخالٍ من الفرش الكربونية القابلة للتآكل.',
        },
        {
          ru: 'Класс отжима и остаточная влажность — они говорят о результате, а обороты только о моторе.',
          en: 'Spin class and residual moisture — they reflect actual drying results rather than raw motor speed.',
          ar: 'فئة العصر ونسبة الرطوبة المتبقية — هما ما يعكسان نتيجة التجفيف الفعلية، بينما سرعة الدوران وحدها تصف المحرك فقط.',
        },
        {
          ru: 'Защита от протечек: полная перекрывает и шланг, и корпус, частичная — только корпус.',
          en: 'Leak protection: full protection shuts off both inlet hose and cabinet, partial covers cabinet only.',
          ar: 'الحماية من التسرب: الحماية الكاملة تغلق خرطوم التغذية والهيكل معاً، أما الجزئية فتغطي الهيكل فقط.',
        },
        {
          ru: 'Уровень шума при отжиме, если машина стоит в квартире, а не в отдельной постирочной.',
          en: 'Spin noise level, especially when installed in living quarters rather than a dedicated utility room.',
          ar: 'مستوى الضجيج أثناء العصر، خصوصاً إذا كانت الغسالة داخل الشقة وليست في غرفة غسيل منفصلة.',
        },
      ),
      p({
        ru: 'Наш обычный совет для города: 7 кг, 1200 оборотов, инверторный двигатель, глубина под вашу нишу. Всё, что дороже этого набора, стоит брать под конкретную причину, а не «на будущее».',
        en: 'Our standard urban recommendation: 7 kg capacity, 1,200 RPM, inverter motor, and depth matched to your opening. Anything beyond this combination should serve a concrete purpose rather than vague future-proofing.',
        ar: 'نصيحتنا المعتادة لسكان المدينة: سعة 7 كغ، 1200 دورة، محرك إنفرتر، وعمق يناسب نيشتك. أي شيء أغلى من هذه المواصفات يستحق الشراء لسبب محدد فعلاً، لا «للمستقبل».',
      }),
    ],
  },
  {
    slug: 'obzor-lg-f2v7fr1w',
    topic: 'obzory',
    tags: ['stirka'],
    title: {
      ru: 'LG F2V7FR1W: что даёт стирка с сушкой и чем за неё платишь',
      en: 'LG F2V7FR1W: benefits and trade-offs of washer-dryer combos',
      ar: 'LG F2V7FR1W: ما الذي تقدمه الغسالة ذات التجفيف وما ثمنها',
    },
    summary: {
      ru: 'Узкая машина с сушкой: 9 кг стирки, 5 кг сушки, 1200 оборотов и инверторный двигатель. Разбираем, где у неё компромисс.',
      en: 'Slim washer-dryer: 9 kg wash, 5 kg dry, 1,200 RPM, and inverter motor. Examining the key trade-offs.',
      ar: 'غسالة ضيقة مزودة بمجفف: سعة غسيل 9 كغ، تجفيف 5 كغ، 1200 دورة، ومحرك إنفرتر. نستعرض أين تكمن التنازلات فيها.',
    },
    body: [
      p({
        ru: 'Машина с сушкой нужна тем, у кого нет балкона и места под сушилку. Это единственная причина её брать — и её достаточно, если понимать, чем такая машина отличается от обычной.',
        en: 'A washer-dryer combo is ideal for homes without a balcony or space for a separate drying rack. That is the primary reason to choose one — and quite sufficient if you understand the differences from standalone units.',
        ar: 'الغسالة المزودة بمجفف مناسبة لمن لا يملك شرفة أو مكاناً لمنشر الغسيل. هذا هو السبب الوحيد لاقتنائها — وهو كافٍ، شرط فهم الفرق بينها وبين الغسالة العادية.',
      }),
      h({
        ru: 'Что внутри',
        en: 'Key specifications',
        ar: 'المواصفات الأساسية',
      }),
      p({
        ru: 'Фронтальная загрузка, узкий корпус, 9 кг стирки, 1200 оборотов, класс стирки A, класс отжима B, остаточная влажность 53 процента. Двигатель инверторный, барабан из нержавеющей стали, четырнадцать программ и отсрочка до девятнадцати часов. Расход — 150 литров за цикл. Управление электромеханическое: поворотная ручка плюс сенсоры, и это удобнее полностью сенсорной панели, когда руки мокрые.',
        en: 'Front-loading, slim cabinet, 9 kg wash capacity, 1,200 RPM, wash class A, spin class B, 53% residual moisture. Inverter motor, stainless steel drum, 14 programs, and delay timer up to 19 hours. Water consumption: 150 liters per cycle. Electromechanical controls: rotary dial plus touch sensors, which is much more practical with wet hands than an all-touch panel.',
        ar: 'تحميل أمامي، هيكل ضيق، سعة غسيل 9 كغ، 1200 دورة، فئة غسيل A، فئة عصر B، ورطوبة متبقية 53%. محرك إنفرتر، حوض من الفولاذ المقاوم للصدأ، أربعة عشر برنامجاً، وتأخير بدء حتى تسع عشرة ساعة. استهلاك المياه 150 لتراً لكل دورة. التحكم إلكتروميكانيكي: مقبض دوار مع أزرار لمسية، وهذا أعملي بكثير من اللوحة اللمسية الكاملة عندما تكون اليدان مبللتين.',
      }),
      p({
        ru: 'При стирке машина держится около 53 децибел, при отжиме уходит на 71. Для узкой машины это нормально, но на ночь её лучше ставить через отсрочку, а не «сейчас».',
        en: 'Operates around 53 dB during washing and reaches 71 dB during spin. Typical for slim machines, but overnight runs are best scheduled with a delay timer.',
        ar: 'أثناء الغسيل تصدر الغسالة نحو 53 ديسيبل، وترتفع إلى 71 ديسيبل أثناء العصر. هذا طبيعي لغسالة ضيقة، لكن يُفضّل تشغيلها ليلاً عبر خاصية التأخير بدلاً من التشغيل الفوري.',
      }),
      h({
        ru: 'Где компромисс',
        en: 'Where compromises lie',
        ar: 'أين تكمن التنازلات',
      }),
      p({
        ru: 'Сушка здесь по времени, а не по датчику влажности. Разница практическая: датчик останавливается, когда бельё высохло, а таймер — когда истекло время. Первые несколько загрузок придётся подобрать программу под свои вещи, иначе хлопок можно пересушить. Программ сушки пять, включая «для глажки» и низкотемпературную, — этого достаточно, чтобы разложить бельё по трём-четырём привычным сценариям и больше не думать.',
        en: 'Drying here operates on a timer rather than a moisture sensor. Practically speaking: a sensor stops when clothes are dry, while a timer stops when time expires. During initial cycles you will calibrate settings for your laundry to avoid over-drying cotton. Five drying cycles are available, including Iron Dry and low-temperature — enough to establish 3–4 standard routines.',
        ar: 'التجفيف هنا يعمل بالمؤقت لا بمستشعر الرطوبة. الفرق عملي: المستشعر يتوقف عندما يجف الغسيل فعلاً، بينما المؤقت يتوقف عند انتهاء الوقت المحدد. في الدورات الأولى ستحتاج لضبط البرنامج المناسب لملابسك تجنباً لتجفيف القطن أكثر من اللازم. تتوفر خمسة برامج تجفيف، منها برنامج «سهل الكي» وآخر منخفض الحرارة — وهذا يكفي لتغطية ثلاثة أو أربعة سيناريوهات معتادة دون تفكير إضافي.',
      }),
      p({
        ru: 'Второй компромисс общий для всех машин с сушкой: сушить можно 5 кг из девяти. Постирали полную загрузку — половину вынули. Если стирок в неделю много, это ощутимо; если машина работает через день, разницы не заметно.',
        en: 'The second trade-off is common to all combo units: drying capacity is 5 kg out of 9 kg wash. If you wash a full load, half must be taken out before drying. With frequent weekly laundry this requires planning; with every-other-day routines it is hardly noticeable.',
        ar: 'التنازل الثاني مشترك بين جميع الغسالات المزودة بمجفف: يمكن تجفيف 5 كغ فقط من أصل 9. إذا غسلت حمولة كاملة، عليك إخراج نصفها قبل التجفيف. إن كنت تغسل كثيراً أسبوعياً فهذا ملحوظ؛ أما إذا كانت الغسالة تعمل كل يومين فلن تلاحظ الفرق.',
      }),
      p({
        ru: 'Защита от протечек частичная — перекрывает корпус, но не шланг. Со шлангом в металлической оплётке это разумный компромисс, но если машина стоит над чужой квартирой, честнее знать заранее.',
        en: 'Leak protection is partial — protecting the cabinet but not the hose. With a braided metal hose this is acceptable, but good to know in advance if installed above neighbors.',
        ar: 'الحماية من التسرب جزئية — تغطي الهيكل فقط وليس الخرطوم. مع خرطوم مضفر معدنياً هذا تنازل معقول، لكن من الأفضل معرفة ذلك مسبقاً إن كانت الغسالة فوق شقة مجاورة.',
      }),
      h({
        ru: 'Кому подойдёт',
        en: 'Who it suits best',
        ar: 'لمن تناسب',
      }),
      p({
        ru: 'Квартире без балкона, узкой нише и семье из двух-трёх человек. Цена — около 58 000 сомов вместо 71 770 по старому прайсу; подключение с проверкой на протечку и первым холостым циклом — 1500 сомов, мастер приезжает вместе с машиной.',
        en: 'Apartments without balconies, compact openings, and families of 2–3 people. Price is around 58,000 KGS compared to 71,770 previously; installation with leak testing and initial trial cycle is 1,500 KGS, with technician arriving alongside delivery.',
        ar: 'للشقة بدون شرفة، وذات نيشة ضيقة، ولعائلة من شخصين إلى ثلاثة. السعر نحو 58,000 سوم بدلاً من 71,770 وفق القائمة السابقة؛ التركيب مع اختبار التسرب ودورة تجربة أولى بتكلفة 1500 سوم، ويصل الفني مع الغسالة نفسها.',
      }),
    ],
  },
  {
    slug: 'piroliz-ili-gidroliz',
    topic: 'stati',
    tags: ['duhovki', 'vstroennaya-tehnika'],
    title: {
      ru: 'Пиролиз или гидролиз: чем чистятся духовки и за что тут платят',
      en: 'Pyrolysis or hydrolysis: oven cleaning systems and what you pay for',
      ar: 'البيروليز أم الهيدروليز: كيف تُنظّف الأفران وعلام تدفع فعلياً',
    },
    summary: {
      ru: 'Пиролиз сжигает жир при 450 градусах, гидролиз размягчает его паром, каталитическая эмаль работает сама во время готовки. Что из этого самоочистка.',
      en: 'Pyrolysis burns grease at 450°C, hydrolysis loosens it with steam, catalytic enamel works continuously during cooking. Which one is true self-cleaning.',
      ar: 'البيروليز يحرق الدهون عند 450 درجة، والهيدروليز يليّنها بالبخار، والمينا الحفازة تعمل تلقائياً أثناء الطهي. أيها يستحق فعلاً اسم «التنظيف الذاتي».',
    },
    body: [
      p({
        ru: 'Слово «самоочистка» стоит в описании почти каждой духовки, а означает три разные вещи. Разница в цене между ними — десятки тысяч сомов, поэтому стоит разобраться до покупки, а не после первой запечённой утки.',
        en: 'The term "self-cleaning" appears on almost every oven, yet refers to three distinct technologies. Price differences between them can reach tens of thousands of KGS, so understanding them before buying is essential.',
        ar: 'تظهر كلمة «تنظيف ذاتي» في وصف كل فرن تقريباً، لكنها تشير إلى ثلاث تقنيات مختلفة تماماً. الفرق في السعر بينها يصل إلى عشرات الآلاف من السومات، لذا يستحق الأمر أن تفهمه قبل الشراء لا بعد أول بطة مشوية.',
      }),
      h({
        ru: 'Пиролиз: жир сгорает',
        en: 'Pyrolysis: grease burns away',
        ar: 'البيروليز: احتراق الدهون بالكامل',
      }),
      p({
        ru: 'Духовка нагревается до 450–500 градусов, и всё, что на стенках, превращается в серый пепел. После цикла его сметают тряпкой — руками не трут ничего. Это единственный из трёх способов, который заслуживает слова «самоочистка».',
        en: 'The oven heats up to 450–500°C, turning all wall deposits into fine gray ash. After the cycle, simply wipe away the ash with a cloth — no scrubbing required. This is the only method truly deserving the name "self-cleaning".',
        ar: 'يسخن الفرن إلى 450-500 درجة، فيتحول كل ما على الجدران إلى رماد رمادي ناعم. بعد الدورة يُمسح الرماد بقطعة قماش دون أي فرك يدوي. هذه هي الطريقة الوحيدة من الثلاث التي تستحق فعلاً اسم «التنظيف الذاتي».',
      }),
      p({
        ru: 'Платят за это трижды. Такая духовка тяжелее и дороже: нужна усиленная изоляция и стекло, которое держит температуру. Ей нужна отдельная силовая линия — розетку на кухонный удлинитель тут не поставишь. И сам цикл длится от полутора до трёх часов, кухню в это время лучше проветривать: пахнет горячим металлом, а если внутри был лишний жир — и дымком.',
        en: 'There are three associated costs. Such ovens are heavier and pricier due to reinforced thermal insulation and heat-resistant multi-pane glass. They require a dedicated power circuit rather than a shared kitchen outlet. And the cycle runs 1.5 to 3 hours, requiring ventilation as hot metal and light smoke odors may occur.',
        ar: 'ثمن هذه الميزة يُدفع ثلاث مرات. فمثل هذا الفرن أثقل وأغلى: يحتاج عزلاً معززاً وزجاجاً يتحمل الحرارة العالية. كما يحتاج خط تغذية كهربائياً مستقلاً — لا يمكن توصيله بمقبس مطبخ عادي. والدورة نفسها تستغرق من ساعة ونصف إلى ثلاث ساعات، ويُستحسن تهوية المطبخ خلالها: تفوح رائحة معدن ساخن، وربما دخان خفيف إن كان هناك دهن زائد بالداخل.',
      }),
      h({
        ru: 'Гидролиз: жир размягчается',
        en: 'Hydrolysis: steam softens grease',
        ar: 'الهيدروليز: تليين الدهون بالبخار',
      }),
      p({
        ru: 'В углубление на дне наливают воду, духовка греет её до 70–90 градусов, пар отмачивает налёт, дальше вы протираете камеру тряпкой сами. Это не самоочистка, а помощь в мытье, и это честный вариант для того, кто печёт по выходным.',
        en: 'Water is poured into a bottom reservoir, heated to 70–90°C, and steam softens grease before you wipe down the cavity manually. This is steam-assisted cleaning rather than automatic self-cleaning, making it a sensible choice for weekend bakers.',
        ar: 'يُسكب الماء في تجويف بقاع الفرن، فيسخّنه الفرن إلى 70-90 درجة، فيليّن البخار الأوساخ، وبعدها تمسح الحجرة بنفسك بقطعة قماش. هذه ليست تنظيفاً ذاتياً بل مساعدة في التنظيف، وهي خيار صادق لمن يخبز في عطلات نهاية الأسبوع فقط.',
      }),
      p({
        ru: 'Каталитическая эмаль — третий способ и работает иначе: покрытие расщепляет брызги жира само, при обычной готовке от двухсот градусов. Отдельного цикла нет, зато нет и результата «как новая»: эмаль справляется с жиром, но не с пригоревшим сахаром, и со временем её свойства слабеют.',
        en: 'Catalytic enamel is the third approach: porous panels break down grease splatters automatically during baking above 200°C. There is no dedicated cycle, but neither is the result spotless: enamel handles grease but not burnt sugar, and panels gradually degrade over time.',
        ar: 'المينا الحفازة هي الطريقة الثالثة وتعمل بشكل مختلف: يفكك الطلاء رذاذ الدهون تلقائياً أثناء الطهي العادي فوق مئتي درجة. لا توجد دورة منفصلة، لكن لا نتيجة «كالجديد» أيضاً: تتعامل المينا مع الدهون لكن ليس مع السكر المحترق، وتضعف خصائصها مع الوقت.',
      }),
      h({
        ru: 'Что выбрать',
        en: 'What to choose',
        ar: 'ماذا تختار',
      }),
      p({
        ru: 'Если в духовке каждую неделю мясо, рыба или пицца — пиролиз оправдан: разница в цене окупается тем, что камеру вообще не приходится мыть. Если это запеканка раз в месяц, пиролиз останется неиспользованной кнопкой, а гидролиза хватит.',
        en: 'If you roast meat, fish, or pizza weekly, pyrolysis is well worth it: cavity scrubbing is eliminated entirely. If you only bake casseroles once a month, pyrolysis will remain an unused feature and hydrolysis is more than enough.',
        ar: 'إذا كان الفرن يستخدم أسبوعياً للحوم أو السمك أو البيتزا — فالبيروليز خيار مبرر: يعوّض فرق السعر عدم الحاجة لغسل الحجرة إطلاقاً. أما إذا كانت مجرد صينية خضار مرة في الشهر، فسيبقى زر البيروليز غير مستخدم ويكفيك الهيدروليز.',
      }),
      p({
        ru: 'В каталоге двадцать восемь духовых шкафов: пиролиз у десяти, гидролиз у двадцати, каталитическая эмаль у трёх. Пиролитические собраны в подборке «Духовки с пиролизом», и в её карточках уже учтено то, о чём здесь сказано: установка встраиваемой техники с выводом отдельной линии — от 2500 сомов.',
        en: 'Our catalog includes 28 ovens: 10 with pyrolysis, 20 with hydrolysis, and 3 with catalytic panels. Pyrolytic models are featured in our "Pyrolytic ovens" selection; installation with dedicated electrical wiring starts from 2,500 KGS.',
        ar: 'يضم الكتالوج ثمانية وعشرين فرناً: عشرة منها بالبيروليز، وعشرون بالهيدروليز، وثلاثة بالمينا الحفازة. الموديلات البيروليتية مجمّعة في تشكيلة «أفران بالبيروليز»، وبطاقاتها تراعي بالفعل كل ما ذُكر هنا: تركيب الأجهزة المدمجة مع خط تغذية مستقل يبدأ من 2500 سوم.',
      }),
    ],
  },
  {
    slug: 'obzor-roborock-qrevo-curv-2-flow',
    topic: 'obzory',
    tags: ['uborka'],
    title: {
      ru: 'Roborock Qrevo Curv 2 Flow: робот, который сам моет и сам сушит тряпку',
      en: 'Roborock Qrevo Curv 2 Flow: robot vacuum that washes and dries its own mop',
      ar: 'Roborock Qrevo Curv 2 Flow: روبوت يغسل الممسحة ويجففها بنفسه',
    },
    summary: {
      ru: '20 000 Па, 228 минут работы и док-станция, которая промывает ролик горячей водой. Что здесь действительно меняет дело, а что мерить рулеткой.',
      en: '20,000 Pa, 228-minute runtime, and a dock that washes mop rollers with hot water. What truly matters versus what requires measuring tape.',
      ar: '20,000 باسكال، 228 دقيقة تشغيل، ومحطة تُغسّل الأسطوانة بالماء الساخن. ما الذي يُحدث فرقاً فعلياً هنا وما الذي يجب قياسه بشريط القياس.',
    },
    body: [
      p({
        ru: 'Роботы перестали различаться мощностью — она у всех избыточная. Различаются они тем, сколько раз в месяц к ним приходится подходить, и вот здесь разница между моделями за тридцать тысяч и за шестьдесят видна сразу.',
        en: 'Robot vacuums no longer differ primarily by suction power — most have plenty. What differentiates them is how often they require manual intervention, where the difference between 30,000 and 60,000 KGS models becomes immediately obvious.',
        ar: 'لم تعد الروبوتات تختلف في قوة الشفط — فهي زائدة عن الحاجة لدى الجميع. الفرق الحقيقي هو عدد مرات التدخل اليدوي شهرياً، وهنا يظهر الفرق بوضوح بين موديل بثلاثين ألف سوم وآخر بستين ألفاً.',
      }),
      h({
        ru: 'Что делает док',
        en: 'What the dock does',
        ar: 'ما الذي تفعله محطة الشحن',
      }),
      p({
        ru: 'База промывает моющий ролик горячей водой — до 75 градусов — и сушит его горячим воздухом. Это не про удобство, а про запах: тряпка, которая сохнет мокрой в закрытой станции, начинает пахнуть через неделю, и в этом причина, по которой дешёвые моющие роботы бросают через месяц.',
        en: 'The base station washes the mop roller with hot water (up to 75°C) and dries it with warm air. This is crucial for odor prevention: mops left damp in enclosed stations develop odors within a week, which is why budget mopping robots are often abandoned.',
        ar: 'تغسل المحطة أسطوانة المسح بماء ساخن يصل إلى 75 درجة، وتجففها بهواء ساخن. هذا ليس مجرد راحة بل مسألة رائحة: الممسحة التي تجف وهي رطبة داخل محطة مغلقة تبدأ برائحة كريهة خلال أسبوع، ولهذا السبب تُهجر الروبوتات الماسحة الرخيصة بعد شهر واحد.',
      }),
      p({
        ru: 'Мусор из робота станция вытягивает в мешок на 2,5 литра — при квартире это полтора-два месяца без вмешательства. Чистая вода наливается в бак на 4 литра, грязная сливается в бак на 3: сам робот носит в себе только 0,1 литра воды, и без автозаправки его пришлось бы дозаправлять посреди уборки.',
        en: 'The station empties dust into a 2.5-liter bag, providing 1.5–2 months of hands-free operation in a typical apartment. Clean water is held in a 4-liter tank and wastewater in a 3-liter tank: the robot carries only 0.1 liters on board and relies on auto-refilling.',
        ar: 'تسحب المحطة الأوساخ من الروبوت إلى كيس سعة 2.5 لتر — وهو ما يكفي لشقة عادية لمدة شهر ونصف إلى شهرين دون تدخل. تُملأ المياه النظيفة في خزان سعة 4 لترات، وتُصرّف المياه المتسخة في خزان سعة 3 لترات: يحمل الروبوت نفسه 0.1 لتر فقط من الماء، ولولا إعادة التعبئة التلقائية لاحتجت لتعبئته يدوياً في منتصف التنظيف.',
      }),
      h({
        ru: 'Как убирает',
        en: 'Cleaning performance',
        ar: 'أداء التنظيف',
      }),
      p({
        ru: 'Мощность всасывания 20 000 Па, площадь за одну уборку — до 303 квадратных метров, аккумулятор 5200 мАч держит 228 минут и заряжается три часа. Навигация лазерная, плюс фронтальная камера для объезда препятствий: провода и тапки он объезжает, а не таранит.',
        en: 'Suction power reaches 20,000 Pa, coverage up to 303 m² per run, and a 5,200 mAh battery provides 228 minutes on a 3-hour charge. LiDAR navigation combined with front camera object recognition navigates around cables and slippers rather than running them over.',
        ar: 'قوة الشفط 20,000 باسكال، وتغطي حتى 303 متراً مربعاً في الدورة الواحدة، والبطارية 5200 مللي أمبير تدوم 228 دقيقة وتُشحن خلال ثلاث ساعات. الملاحة عبر الليزر مع كاميرا أمامية لتفادي العوائق: يتجنب الأسلاك والشباشب بدلاً من الاصطدام بها.',
      }),
      p({
        ru: 'На ковре моющий ролик поднимается на 1,5 сантиметра, и мощность всасывания растёт — ковёр он не мочит, а пылесосит. Порог и перепад высот берёт до 2 сантиметров.',
        en: 'On carpets the mop roller lifts by 1.5 cm and suction power increases automatically — vacuuming carpets without wetting them. Threshold clearance handles obstacles up to 2 cm.',
        ar: 'على السجاد ترتفع أسطوانة المسح 1.5 سم، وتزداد قوة الشفط تلقائياً — فهو يكنس السجاد دون أن يبلله. يتجاوز العتبات وفروق الارتفاع حتى 2 سم.',
      }),
      h({
        ru: 'Что мерить до покупки',
        en: 'What to measure before buying',
        ar: 'ما الذي يجب قياسه قبل الشراء',
      }),
      points(
        {
          ru: 'Просвет под мебелью: робот 11,9 см высотой, и под кроватью на низких ножках он не пройдёт.',
          en: 'Under-furniture clearance: the robot is 11.9 cm tall and will not fit under low-legged beds.',
          ar: 'الخلوص أسفل الأثاث: ارتفاع الروبوت 11.9 سم، ولن يمر أسفل سرير بأرجل منخفضة.',
        },
        {
          ru: 'Место под станцию: 45 сантиметров по всем трём измерениям, у стены и рядом с розеткой.',
          en: 'Station footprint: 45 cm along all three dimensions, against a wall near a power outlet.',
          ar: 'مساحة المحطة: 45 سنتيمتراً في الأبعاد الثلاثة جميعها، بجانب حائط وقرب مقبس كهرباء.',
        },
        {
          ru: 'Пороги в квартире: выше двух сантиметров — придётся или подпиливать, или убирать в две зоны.',
          en: 'Thresholds: over 2 cm will require ramps or splitting cleaning into separate zones.',
          ar: 'العتبات في الشقة: ما يتجاوز سنتيمترين يتطلب إما بردها أو تقسيم التنظيف إلى منطقتين.',
        },
      ),
      p({
        ru: 'Шум 63 децибела — тише обычного пылесоса, но это не бесшумная работа: уборку по расписанию ставят на день, когда никого нет дома. Фильтр тонкой очистки E11 чистится вручную; со станцией, которая делает всё остальное, это единственная ручная работа, которая осталась.',
        en: 'Noise level is 63 dB — quieter than standard vacuums but audible; scheduled cleaning is best set when away. The E11 fine filter requires manual cleaning; with the station handling everything else, this is the only remaining manual task.',
        ar: 'مستوى الضجيج 63 ديسيبل — أهدأ من المكنسة العادية لكنه ليس صامتاً تماماً: يُفضّل جدولة التنظيف في وقت لا يكون فيه أحد بالمنزل. فلتر التنقية الدقيق E11 يُنظّف يدوياً؛ ومع محطة تتكفل بكل شيء آخر، تبقى هذه المهمة اليدوية الوحيدة.',
      }),
      p({
        ru: 'Цена — около 63 000 сомов вместо 77 590 по старому прайсу. В зале на Ахунбаева его можно запустить на ковре и послушать.',
        en: 'Price is around 63,000 KGS compared to 77,590 KGS previously. You can run it on carpet and test sound levels in our Akhunbaev showroom.',
        ar: 'السعر نحو 63,000 سوم بدلاً من 77,590 وفق القائمة السابقة. يمكنك تجربته على السجاد والاستماع إلى صوته في معرضنا على شارع أخونباييف.',
      }),
    ],
  },
  {
    slug: 'kak-izmerit-nishu',
    topic: 'stati',
    tags: ['zamery', 'vstroennaya-tehnika'],
    title: {
      ru: 'Как измерить нишу до покупки: пять размеров, которые спросит мастер',
      en: 'Measuring openings before purchase: five dimensions your installer will ask for',
      ar: 'كيف تقيس النيشة قبل الشراء: خمسة مقاسات سيطلبها الفني',
    },
    summary: {
      ru: 'Крупную технику надлежащего качества вернуть нельзя, поэтому мерить нужно до заказа. Пять размеров, три зазора и одна дверь, о которой забывают.',
      en: 'Major appliances cannot be returned once delivered, so measuring beforehand is critical. Five dimensions, three clearances, and one easily overlooked doorway.',
      ar: 'لا يمكن استرجاع الأجهزة الكبيرة السليمة، لذا يجب القياس قبل الطلب لا بعده. خمسة مقاسات، وثلاث مسافات خلوص، وباب واحد يُنسى غالباً.',
    },
    body: [
      p({
        ru: 'Крупная бытовая техника входит в перечень технически сложных товаров: если она исправна, вернуть её нельзя. Поэтому мы отговариваем от покупки на глаз — и просим пять размеров, которые снимаются за десять минут рулеткой.',
        en: 'Major household appliances belong to the category of technically complex goods: flawless units cannot be returned. We strongly discourage buying on guesswork and ask for five key measurements that take ten minutes with a tape measure.',
        ar: 'تندرج الأجهزة المنزلية الكبيرة ضمن قائمة السلع التقنية المعقدة: إذا كانت سليمة فلا يمكن استرجاعها. لذلك ننصح بعدم الشراء بالتقدير العشوائي — ونطلب خمسة مقاسات يمكن أخذها خلال عشر دقائق بشريط قياس.',
      }),
      h({
        ru: 'Пять размеров',
        en: 'Five key dimensions',
        ar: 'المقاسات الخمسة',
      }),
      steps(
        {
          ru: 'Ширина проёма в самом узком месте. Стены редко параллельны: мерьте у пола, посередине и у столешницы, берите наименьшее.',
          en: 'Opening width at the narrowest point. Walls are rarely parallel: measure at the floor, midpoint, and countertop, taking the smallest value.',
          ar: 'عرض الفتحة عند أضيق نقطة. نادراً ما تكون الجدران متوازية: قِس عند الأرضية، وفي المنتصف، وعند سطح الطاولة، واعتمد أصغر رقم.',
        },
        {
          ru: 'Глубина — от стены до плоскости фасадов. Плинтус, труба отопления и розетка съедают эту глубину, и мерить надо с ними, а не до них.',
          en: 'Depth — from wall to cabinet face. Baseboards, heating pipes, and outlets reduce depth and must be included in measurements.',
          ar: 'العمق — من الحائط إلى واجهة الخزانة. تأخذ القاعدة الخشبية وأنبوب التدفئة والمقبس جزءاً من هذا العمق، ويجب قياسها معها لا قبلها.',
        },
        {
          ru: 'Высота от пола до столешницы. Если пол под нишей не выровнен, мерьте в двух углах.',
          en: 'Height from floor to underside of countertop. If flooring is uneven, measure at both back corners.',
          ar: 'الارتفاع من الأرضية إلى أسفل سطح الطاولة. إذا كانت الأرضية أسفل النيشة غير مستوية، قِس عند الزاويتين.',
        },
        {
          ru: 'Расстояние до розетки и до водопровода со сливом — и то, с какой стороны они выходят.',
          en: 'Distance to electrical outlet, water supply, and drain — noting which side they enter from.',
          ar: 'المسافة إلى المقبس وإلى تمديدات المياه والصرف — ومن أي جهة تخرج بالضبط.',
        },
        {
          ru: 'Ширина входной двери и коридора вместе с поворотом. Холодильник высотой два метра и весом семьдесят килограммов заносят вчетвером, и разворот в тесном коридоре — отдельная задача.',
          en: 'Width of entry doors and hallways including turns. A 2-meter, 70 kg refrigerator requires 4 movers, and tight hallway corners present distinct challenges.',
          ar: 'عرض باب المدخل والممر مع منعطفاته. ثلاجة بارتفاع مترين ووزن سبعين كيلوغراماً يحملها أربعة أشخاص، والانعطاف بها في ممر ضيق مهمة منفصلة قائمة بذاتها.',
        },
      ),
      h({
        ru: 'Три зазора, которые нужно оставить',
        en: 'Three clearances you must leave',
        ar: 'ثلاث مسافات خلوص يجب تركها',
      }),
      p({
        ru: 'Холодильнику нужен воздух: пять сантиметров сверху и по два по бокам, иначе компрессор работает чаще и греется. Отдельностоящую модель нельзя ставить в глухой шкаф, даже если она по размерам туда влезла.',
        en: 'Refrigerators need ventilation: 5 cm above and 2 cm on each side, otherwise compressors overheat and run continuously. Freestanding models must never be enclosed in sealed cabinetry.',
        ar: 'يحتاج الثلاجة إلى تهوية: خمسة سنتيمترات من الأعلى وسنتيمتران من كل جانب، وإلا عمل الضاغط بشكل متكرر وسخن أكثر من اللازم. لا يجوز وضع الموديل المستقل داخل خزانة مغلقة حتى لو تناسبت أبعاده معها.',
      }),
      p({
        ru: 'Стиральной машине оставляют около двух сантиметров позади корпуса — там уходит наливной шланг, и заявленная глубина 45 или 60 сантиметров это расстояние не включает. Встраиваемой посудомоечной машине важны все три размера сразу: ширина 45 или 60, глубина и высота под столешницей с учётом регулируемых ножек.',
        en: 'Washing machines need roughly 2 cm of rear clearance for water inlet hoses, which nominal 45 or 60 cm depths do not include. Built-in dishwashers require precise width (45 or 60 cm), depth, and under-counter height accounting for leveling legs.',
        ar: 'تتطلب غسالة الملابس مسافة خلوص 2 سم خلفها لخرطوم السحب، وهو ما لا يشمله العمق الاسمي 45 أو 60 سم. بينما تتطلب غسالة الأطباق المدمجة دقة في الأبعاد الثلاثة مع ضبط الأرجل.',
      }),
      p({
        ru: 'Духовому шкафу и варочной панели проверяют не только проём, но и то, что за ним: пиролитической духовке нужна отдельная линия питания, и это работа электрика, а не грузчика.',
        en: 'Ovens and cooktops require checking both opening dimensions and backend infrastructure: pyrolytic ovens need dedicated electrical wiring, which is an electrician task.',
        ar: 'تحتاج الأفران والمواقد فحص التوصيلات الخلفية: فالفرن المزود بالتنظيف الذاتي الحراري يحتاج خط تغذية كهربائياً مستقلاً ينفذه كهربائي مختص.',
      }),
      h({
        ru: 'Проще всего прислать фотографию',
        en: 'Simplest approach: send a photo',
        ar: 'الحل الأبسط: أرسل لنا صورة ومقاسات المكان',
      }),
      p({
        ru: 'Пришлите размеры и фото места, где будет стоять техника, — посчитаем зазоры и скажем, встанет ли выбранная модель. Это бесплатно и занимает у нас минут двадцать, а стоит на порядок меньше, чем доставленный и не влезший холодильник.',
        en: 'Send dimensions and photos of your space — we will calculate clearances and verify whether the chosen model fits. It takes 20 minutes and is completely free, saving you the hassle of a delivered unit that does not fit.',
        ar: 'أرسل لنا مقاسات وصور المكان المخصص للأجهزة — سنحسب الخلوصات ونؤكد لك ملاءمة الموديل مجاناً خلال عشرين دقيقة، مما يجنبك متاعب شراء جهاز لا يتسع في مكانه.',
      }),
    ],
  },
  {
    slug: 'obzor-lg-ga-b509sbum',
    topic: 'obzory',
    tags: ['holodilniki'],
    title: {
      ru: 'LG GA-B509SBUM: холодильник на семью, который слышно только на открывании',
      en: 'LG GA-B509SBUM: family refrigerator heard only when opening doors',
      ar: 'LG GA-B509SBUM: ثلاجة عائلية تسمع صوتها فقط عند فتح الأبواب',
    },
    summary: {
      ru: '384 литра, No Frost в обеих камерах, инверторный компрессор и 36 децибел. И одна цифра, из-за которой его надо мерить: глубина 68 сантиметров.',
      en: '384 liters, Total No Frost, inverter compressor, and 36 dB. Plus one key dimension to measure: 68 cm depth.',
      ar: 'سعة 384 لتراً، نظام No Frost في الحجرتين، ضاغط إنفرتر بمستوى ضجيج 36 ديسيبل. ورقم واحد يجب قياسه بدقة: عمق 68 سنتيمتراً.',
    },
    body: [
      p({
        ru: 'Это самый обычный сценарий: семья из трёх-четырёх человек, кухня в новостройке, бюджет до семидесяти тысяч. Двухкамерный отдельностоящий холодильник с морозильником снизу — то, чем такой запрос закрывается в девяти случаях из десяти.',
        en: 'A standard scenario: family of 3–4, kitchen in a new building, budget up to 70,000 KGS. A two-door freestanding refrigerator with bottom freezer solves this request in nine cases out of ten.',
        ar: 'الخيار الأكثر ملاءمة لعائلة من 3 إلى 4 أفراد في شقة حديثة بميزانية حتى 70,000 سوم. ثلاجة ببابين وفريزر سفلي تلبي الاحتياجات في 9 من كل 10 حالات.',
      }),
      h({ ru: 'Объём и камеры', en: 'Capacity and compartments', ar: 'السعة وتقسيم الحجرات' }),
      p({
        ru: 'Общий полезный объём — 384 литра: 277 в холодильной камере и 107 в морозильной. Для семьи из четырёх это с запасом, для двоих — много, но лишний объём тут не наказывается расходом: класс энергопотребления A++, 275 киловатт-часов в год.',
        en: 'Total usable capacity is 384 liters: 277 liters in the fridge and 107 in the freezer. Generous for a family of four, spacious for two, yet energy-efficient: A++ energy class consuming 275 kWh/year.',
        ar: 'السعة الصافية الإجمالية 384 لتراً: 277 لتراً لحجرة التبريد و107 لترات للمجمد. سعة وافرة لعائلة، وموفرة للطاقة بتصنيف A++ واستهلاك 275 كيلوواط/ساعة سنوياً.',
      }),
      p({
        ru: 'No Frost в обеих камерах — размораживать не нужно ни разу за жизнь прибора. Зона свежести с двумя режимами, сухим и влажным, и регулировкой влажности: зелень в ней держится заметно дольше, чем на обычной полке, и это единственная функция из списка, разницу от которой видно на второй день.',
        en: 'Total No Frost across both compartments — manual defrosting is never required. Fresh zone with dual humidity modes keeps produce crisp significantly longer, delivering noticeable results from day two.',
        ar: 'نظام No Frost كلي في الحجرتين — لا حاجة لإذابة الثلج يدوياً أبداً. درج الحفاظ على النضارة بنظامين للرطوبة يحافظ على الخضروات طازجة ومقرمشة لفترة أطول بوضوح.',
      }),
      p({
        ru: 'Заморозка — 12 килограммов в сутки, при отключении питания продукты держатся 16 часов. Для города, где свет иногда выключают, вторая цифра важнее первой.',
        en: 'Freezing capacity is 12 kg/day, with 16-hour thermal retention during power outages — an essential safeguard during occasional city power cuts.',
        ar: 'قدرة تجميد 12 كغ يومياً مع حفظ البرودة لمدة 16 ساعة عند انقطاع التيار الكهربائي — ميزة حيوية لحماية الأطعمة أثناء انقطاعات الكهرباء العارضة.',
      }),
      h({ ru: 'Шум и управление', en: 'Noise and controls', ar: 'الهدوء ولوحة التحكم' }),
      p({
        ru: 'Компрессор инверторный, заявлено 36 децибел — это тише спокойного разговора. На практике в студии его слышно только в момент, когда открываешь дверь: постоянного гула, из-за которого холодильник не ставят рядом со спальней, здесь нет.',
        en: 'Smart Inverter compressor rated at 36 dB — quieter than quiet conversation. In a studio apartment it is heard only when opening doors, without continuous hum.',
        ar: 'ضاغط خطي عاكس (Smart Inverter) بمستوى ضجيج 36 ديسيبل — أهدأ من الهمس ولا يصدر أزيزاً مستمراً، مما يجعله مناسباً للشقق المفتوحة.',
      }),
      p({
        ru: 'Панель сенсорная, на дверце, с индикацией температуры обеих камер. Есть Wi-Fi и приложение — им пользуются первые две недели, дальше забывают, и это нормально: холодильник не тот прибор, которым управляют с телефона.',
        en: 'Door-mounted touch panel displays dual-zone temperatures. Wi-Fi and app connectivity are included for convenience.',
        ar: 'شاشة لمسية أنيقة على الباب لضبط درجات الحرارة بدقة، مع اتصال Wi-Fi وتطبيق ذكي لمراقبة الأداء وتنبيهات الأعطال.',
      }),
      h({ ru: 'Что мерить', en: 'What to measure', ar: 'المقاسات التي يجب الانتباه إليها' }),
      p({
        ru: 'Габариты: 203 сантиметра в высоту, 59,5 в ширину, 68,2 в глубину. Ширина стандартная, а глубина — нет: 68 сантиметров глубже кухонного фасада, и холодильник будет выступать вперёд. В нишу под столешницу такая модель не встаёт вовсе — это отдельностоящий прибор, и место ему выбирают в углу или в конце линии.',
        en: 'Dimensions: 203 cm high, 59.5 cm wide, 68.2 cm deep. Width is standard, but 68 cm depth extends past standard kitchen counters, making corner or end-of-run placement best.',
        ar: 'الأبعاد: ارتفاع 203 سم، عرض 59.5 سم، وعمق 68.2 سم. العرض قياسي لكن العمق 68 سم يبرز قليلاً عن خط خزائن المطبخ، مما يجعل وضعها في الزاوية أو نهاية الخط هو الأنسب.',
      }),
      p({
        ru: 'Вес 74 килограмма и два метра высоты означают, что заносят его вчетвером. Доставка с подъёмом входит в цену от 20 000 сомов; выше третьего этажа без грузового лифта подъём считается отдельно, и сумму мы называем заранее.',
        en: 'Weighing 74 kg at 2 meters tall, handling requires 4 movers. Delivery with floor carry is included from 20,000 KGS (stairs above 3rd floor priced in advance).',
        ar: 'الوزن 74 كغ بارتفاع مترين يتطلب 4 عمال لنقلها. التوصيل مع الرفع مجاني للطلبات فوق 20,000 سوم (الأدوار فوق الثالث بدون مصعد يتم تسعيرها مسبقاً).',
      }),
      p({
        ru: 'Цена — около 64 000 сомов вместо 74 680 по старому прайсу. Двери перенавешиваются на другую сторону, так что дверной проём рядом покупке не мешает.',
        en: 'Price is around 64,000 KGS compared to 74,680 KGS previously. Reversible doors ensure compatibility with adjacent doorways.',
        ar: 'السعر حوالي 64,000 سوم بدلاً من 74,680 سوم سابقاً. الأبواب قابلة لعكس اتجاه الفتح لتناسب مختلف مساحات المطابخ.',
      }),
    ],
  },
]

export async function seedWattPosts(siteId: SiteId, tx: Db | Transaction) {
  for (const topic of TOPICS) await createTopic(siteId, { slug: topic.slug, name: topic.name }, tx)

  for (const tag of TAGS) await createTag(siteId, { slug: tag.slug, name: tag.name }, tx)

  for (const [index, post] of POSTS.entries()) {
    const made = await createPost(
      siteId,
      {
        slug: post.slug,
        type: 'article',
        topicId: (await findTopicBySlug(siteId, post.topic, tx))?.id ?? null,
        title: post.title,
        summary: post.summary,
        body: documentOf(post.body),
        status: 'published',
        publishedAt: new Date(FIRST_PUBLISHED.getTime() + index * STEP_DAYS * 86_400_000),
        tags: post.tags,
      },
      tx,
    )

    const cover = await findImage(`watt/posts/${post.slug}.webp`)
    if (cover)
      await attachMedia(
        siteId,
        'post',
        made.id,
        {
          key: cover.key,
          width: cover.width,
          height: cover.height,
          caption: post.title,
        },
        tx,
      )
  }
}
