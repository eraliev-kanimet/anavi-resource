import type { Db, Transaction } from '@anavi/backend/src/db'
import { createForm, setStructure } from '@anavi/backend/src/modules/form/form.service'
import { findProductBySlug } from '@anavi/backend/src/modules/catalog/product.service'
import { findVisibleSelection } from '@anavi/backend/src/modules/catalog/selection.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

/*
 * WHAT the quiz answers — and it is the whole point of asking.
 *
 * Ordered, first match wins, so the narrow ones stand above the wide ones. The catalogue is what
 * makes these true rather than decorative: of eighteen laptops here seven carry a separate graphics
 * card, the cheapest of them sits just above the smallest budget band, and the band between a
 * hundred and a hundred and fifty thousand holds none at all. Two of the four bands a gamer can pick
 * are therefore genuinely empty, and a verdict pretending otherwise would be worse than the thank-you
 * it replaces — a thank-you is honest, and it would not be.
 *
 * NO PRICES AND NO MODEL NAMES IN THE TEXT. The catalogue moves and the text does not: a verdict
 * quoting a figure is wrong the week after the price changes. The reasoning lives in the words, the
 * model lives in the action, and the number the visitor reads is the one on the page it opens.
 */
const OUTCOMES = [
  {
    key: 'games-tight',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'games' },
      { field: 'budget', op: 'is' as const, value: 'to-60' },
    ],
    title: {
      ru: 'В этот бюджет игрового ноутбука нет',
      en: 'No gaming laptop fits this budget',
      ar: 'لا يوجد كمبيوتر محمول للألعاب ضمن هذه الميزانية',
    },
    text: {
      ru: 'Игры тянет отдельная видеокарта, а не встроенная в процессор. Самый доступный ноутбук с такой картой стоит дороже вашей суммы — покажем его, чтобы было видно, о какой разнице речь. Если добавить нельзя, скажите менеджеру: подберём то, что в бюджет войдёт и потянет лёгкие онлайн-игры.',
      en: 'Games are driven by a separate graphics card, not by the one built into the processor. The cheapest laptop with such a card costs more than your figure — we are showing it so the gap is visible. If you cannot stretch, tell the manager: we will find something inside the budget that handles light online games.',
      ar: 'الألعاب تعتمد على بطاقة رسومات منفصلة، لا على المدمجة في المعالج. أرخص جهاز يحمل بطاقة كهذه يتجاوز ميزانيتك — نعرضه لتتضح الفجوة. وإن تعذّر عليك الزيادة، أخبر المسؤول: سنجد ما يناسب ميزانيتك ويشغّل الألعاب الخفيفة عبر الإنترنت.',
    },
    action: {
      kind: 'product' as const,
      slug: 'fa506ncr-tuf-gaming-a15-fa506ncr-hn044',
      icon: 'arrow-right' as const,
      label: { ru: 'Показать ближайший', en: 'Show the nearest one', ar: 'اعرض الأقرب' },
    },
  },
  {
    key: 'games-entry',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'games' },
      { field: 'budget', op: 'is' as const, value: '60-100' },
    ],
    title: {
      ru: 'Нашли — в этом бюджете он один',
      en: 'Found it — there is exactly one in this budget',
      ar: 'وجدناه — لا يوجد سواه ضمن هذه الميزانية',
    },
    text: {
      ru: 'В вашу сумму помещается ровно один ноутбук с отдельной видеокартой. Онлайн-игры и киберспорт пойдут на высоких настройках, большие сюжетные — на средних. Это честная игровая машина начального уровня, а не компромисс между работой и играми.',
      en: 'Exactly one laptop with a separate graphics card fits your figure. Online and esports titles will run on high settings, large story-driven games on medium. It is an honest entry-level gaming machine rather than a compromise between work and play.',
      ar: 'جهاز واحد فقط ببطاقة رسومات منفصلة يدخل ضمن مبلغك. ألعاب الإنترنت والرياضات الإلكترونية ستعمل بإعدادات عالية، والألعاب القصصية الكبيرة بإعدادات متوسطة. إنه جهاز ألعاب مبتدئ حقيقي، لا حلّ وسط بين العمل واللعب.',
    },
    action: {
      kind: 'product' as const,
      slug: 'fa506ncr-tuf-gaming-a15-fa506ncr-hn044',
      icon: 'zap' as const,
      label: { ru: 'Открыть', en: 'Open it', ar: 'افتحه' },
    },
  },
  {
    key: 'games-gap',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'games' },
      { field: 'budget', op: 'is' as const, value: '100-150' },
    ],
    title: {
      ru: 'В этой полосе игровых нет',
      en: 'This band holds no gaming laptops',
      ar: 'هذه الفئة السعرية لا تضم أجهزة ألعاب',
    },
    text: {
      ru: 'Здесь стоят мощные ноутбуки для работы — с хорошим экраном, но со встроенной графикой. Следующая настоящая игровая модель стоит выше вашей полосы. Выбор простой: либо шаг вверх к ней, либо шаг вниз к начальному уровню и экономия — середины у игровых ноутбуков не бывает.',
      en: 'What sits here are powerful work laptops — good screens, integrated graphics. The next real gaming model is priced above your band. The choice is simple: a step up to it, or a step down to the entry level and the money saved — gaming laptops have no middle.',
      ar: 'ما يوجد هنا أجهزة عمل قوية بشاشات جيدة ورسومات مدمجة. أول جهاز ألعاب حقيقي بعدها يتجاوز فئتك السعرية. الخيار بسيط: خطوة للأعلى نحوه، أو خطوة للأسفل نحو المستوى المبتدئ مع توفير المال — أجهزة الألعاب ليس لها منتصف.',
    },
    action: {
      kind: 'product' as const,
      slug: 'legion-pro-5-16irx9-83df00e9rk',
      icon: 'arrow-right' as const,
      label: { ru: 'Показать следующую', en: 'Show the next one up', ar: 'اعرض الأعلى منه' },
    },
  },
  {
    key: 'games-heavy',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'games' },
      { field: 'budget', op: 'is' as const, value: 'from-150' },
      { field: 'games', op: 'is' as const, value: ['shooters', 'story', 'racing'] },
    ],
    title: {
      ru: 'Смотрите игровые целиком',
      en: 'Look at the gaming range as a whole',
      ar: 'اطّلع على مجموعة الألعاب كاملة',
    },
    text: {
      ru: 'Шутеры, гонки и большие сюжетные игры упираются в видеокарту и в охлаждение, а не в процессор. В вашем бюджете выбор есть, и он про корпус: толще — тише и стабильнее под долгой нагрузкой, тоньше — легче носить. Остальное у этих моделей примерно одинаково.',
      en: 'Shooters, racing and large story-driven games are limited by the graphics card and by cooling, not by the processor. Your budget leaves a real choice, and it is about the chassis: thicker runs quieter and holds performance longer, thinner is easier to carry. The rest of these models is much the same.',
      ar: 'ألعاب التصويب والسباقات والألعاب القصصية الكبيرة تحدّها بطاقة الرسومات والتبريد، لا المعالج. ميزانيتك تتيح خياراً حقيقياً، وهو خيار الهيكل: الأسمك أهدأ ويحافظ على الأداء أطول، والأنحف أسهل في الحمل. أما البقية فمتقاربة في هذه الطرازات.',
    },
    action: {
      kind: 'selection' as const,
      slug: 'igrovye-noutbuki',
      icon: 'layout-grid' as const,
      label: { ru: 'Открыть подборку', en: 'Open the selection', ar: 'افتح المجموعة' },
    },
  },
  {
    key: 'games-light',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'games' },
      { field: 'budget', op: 'is' as const, value: 'from-150' },
    ],
    title: {
      ru: 'Хватит с запасом',
      en: 'This is more than enough',
      ar: 'هذا يكفي وزيادة',
    },
    text: {
      ru: 'Онлайн, киберспорт и стратегии не требуют топовой видеокарты — им важнее частота обновления экрана и отзывчивость. В вашем бюджете можно взять модель начала игрового ряда и не переплачивать за мощность, которая будет простаивать.',
      en: 'Online play, esports and strategy do not need a top-end graphics card — refresh rate and responsiveness matter more to them. Your budget lets you take the first model of the gaming range and not overpay for power that would sit idle.',
      ar: 'الألعاب عبر الإنترنت والرياضات الإلكترونية والاستراتيجيات لا تحتاج بطاقة رسومات من الفئة العليا — الأهم لها معدل تحديث الشاشة وسرعة الاستجابة. ميزانيتك تتيح اختيار أول طراز في فئة الألعاب دون دفع زائد مقابل قوة لن تُستخدم.',
    },
    action: {
      kind: 'product' as const,
      slug: 'legion-pro-5-16irx9-83df00e9rk',
      icon: 'zap' as const,
      label: { ru: 'Открыть', en: 'Open it', ar: 'افتحه' },
    },
  },
  {
    key: 'creative-tight',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'creative' },
      { field: 'budget', op: 'is' as const, value: 'to-60' },
    ],
    title: {
      ru: 'Для монтажа и 3D этой суммы мало',
      en: 'This figure is short for editing and 3D',
      ar: 'هذا المبلغ لا يكفي للمونتاج والتصميم ثلاثي الأبعاد',
    },
    text: {
      ru: 'Рендер и 3D считает отдельная видеокарта; без неё экспорт идёт часами, и это чувствуется с первого проекта. Самая доступная модель с такой картой стоит дороже вашей суммы. Начать со встроенной графики можно, но это будет терпение, а не работа.',
      en: 'Rendering and 3D are computed by a separate graphics card; without one, exports take hours, and it shows on the very first project. The cheapest model carrying such a card costs more than your figure. Starting on integrated graphics is possible, but it is patience rather than work.',
      ar: 'المعالجة والتصميم ثلاثي الأبعاد تتولاهما بطاقة رسومات منفصلة؛ وبدونها يستغرق التصدير ساعات، ويظهر ذلك من أول مشروع. أرخص طراز يحمل بطاقة كهذه يتجاوز مبلغك. البدء برسومات مدمجة ممكن، لكنه صبر لا عمل.',
    },
    action: {
      kind: 'product' as const,
      slug: 'fa506ncr-tuf-gaming-a15-fa506ncr-hn044',
      icon: 'arrow-right' as const,
      label: { ru: 'Показать ближайший', en: 'Show the nearest one', ar: 'اعرض الأقرب' },
    },
  },
  {
    key: 'creative-mid',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'creative' },
      { field: 'budget', op: 'is' as const, value: ['60-100', '100-150'] },
    ],
    title: {
      ru: 'Начать можно с этого',
      en: 'This is where to start',
      ar: 'من هنا يمكن البدء',
    },
    text: {
      ru: 'Отдельная видеокарта в вашем бюджете одна, и её хватает на монтаж в 1080p, лёгкий 3D и цветокоррекцию. Для 4K и тяжёлых сцен понадобится другая машина — но начинать с неё необязательно, и на первых проектах разницы вы не увидите.',
      en: 'There is exactly one separate graphics card inside your budget, and it is enough for 1080p editing, light 3D and colour work. Heavy scenes and 4K will want a different machine — but you do not have to start there, and on the first projects you will not see the difference.',
      ar: 'ضمن ميزانيتك بطاقة رسومات منفصلة واحدة، وهي تكفي للمونتاج بدقة 1080p والتصميم ثلاثي الأبعاد الخفيف وتصحيح الألوان. أما المشاهد الثقيلة ودقة 4K فتحتاج جهازاً آخر — لكن لا يلزم البدء به، ولن تلاحظ الفرق في المشاريع الأولى.',
    },
    action: {
      kind: 'product' as const,
      slug: 'fa506ncr-tuf-gaming-a15-fa506ncr-hn044',
      icon: 'sparkles' as const,
      label: { ru: 'Открыть', en: 'Open it', ar: 'افتحه' },
    },
  },
  {
    key: 'creative-pro',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'creative' },
      { field: 'budget', op: 'is' as const, value: 'from-150' },
    ],
    title: {
      ru: 'Здесь нужна рабочая станция, а не игровой',
      en: 'This calls for a workstation, not a gaming laptop',
      ar: 'هنا تلزم محطة عمل، لا جهاز ألعاب',
    },
    text: {
      ru: 'Для графики и монтажа важнее не кадры в секунду, а точный экран, много оперативной памяти и профессиональные драйверы. Игровой ноутбук за те же деньги даст больше кадров и меньше пользы. Смотрите мобильную рабочую станцию.',
      en: 'For graphics and editing what matters is not frames per second but an accurate screen, plenty of memory and professional drivers. A gaming laptop at the same money gives more frames and less use. Look at a mobile workstation.',
      ar: 'في التصميم والمونتاج لا يهم عدد الإطارات في الثانية بقدر ما تهم دقة الشاشة وسعة الذاكرة وبرامج التشغيل الاحترافية. جهاز ألعاب بالسعر نفسه يمنحك إطارات أكثر وفائدة أقل. اطّلع على محطة عمل متنقلة.',
    },
    action: {
      kind: 'product' as const,
      slug: 'thinkpad-p1-gen-7-21kws60800-win11p',
      icon: 'award' as const,
      label: { ru: 'Открыть', en: 'Open it', ar: 'افتحه' },
    },
  },
  {
    key: 'work-carry',
    condition: [
      { field: 'purpose', op: 'is' as const, value: 'work' },
      { field: 'weight', op: 'is' as const, value: 'yes' },
    ],
    title: {
      ru: 'Носить каждый день — значит лёгкий',
      en: 'Carried daily means light',
      ar: 'الحمل اليومي يعني جهازاً خفيفاً',
    },
    text: {
      ru: 'Для работы и учёбы встроенной графики достаточно: она тише, меньше греется и дольше держит заряд — а это ровно то, что важно в дороге. Раз носить каждый день, выбирайте по весу и диагонали: четырнадцать дюймов кладутся в любую сумку, шестнадцать удобнее на столе.',
      en: 'Integrated graphics are enough for work and study: quieter, cooler and longer on a charge — exactly what matters on the move. Since you will carry it daily, choose by weight and screen size: fourteen inches goes into any bag, sixteen is more comfortable on a desk.',
      ar: 'الرسومات المدمجة تكفي للعمل والدراسة: أهدأ وأقل حرارة وأطول عمراً للبطارية — وهو تحديداً ما يهم في التنقل. وبما أنك ستحمله يومياً، اختر حسب الوزن وحجم الشاشة: أربعة عشر بوصة تدخل أي حقيبة، وستة عشر أريح على المكتب.',
    },
    action: {
      kind: 'selection' as const,
      slug: 'noutbuki-dlya-raboty',
      icon: 'layout-grid' as const,
      label: { ru: 'Открыть подборку', en: 'Open the selection', ar: 'افتح المجموعة' },
    },
  },
  {
    key: 'work-desk',
    condition: [{ field: 'purpose', op: 'is' as const, value: 'work' }],
    title: {
      ru: 'Тогда берите экран побольше',
      en: 'Then take the bigger screen',
      ar: 'إذاً اختر الشاشة الأكبر',
    },
    text: {
      ru: 'Раз ноутбук будет стоять на столе, вес не важен — а диагональ важна: на большом экране помещаются два окна рядом и меньше устают глаза за день. Встроенной графики для работы и учёбы хватает с запасом, доплачивать за отдельную незачем.',
      en: 'Since it will sit on a desk, weight does not matter — screen size does: a big display holds two windows side by side and tires the eyes less over a day. Integrated graphics are more than enough for work and study; paying extra for a separate card buys nothing here.',
      ar: 'بما أنه سيبقى على المكتب، فالوزن غير مهم — لكن حجم الشاشة مهم: الشاشة الكبيرة تتسع لنافذتين جنباً إلى جنب وتُتعب العينين أقل خلال اليوم. الرسومات المدمجة تكفي للعمل والدراسة وزيادة، ولا داعي لدفع المزيد مقابل بطاقة منفصلة.',
    },
    action: {
      kind: 'selection' as const,
      slug: 'noutbuki-dlya-raboty',
      icon: 'layout-grid' as const,
      label: { ru: 'Открыть подборку', en: 'Open the selection', ar: 'افتح المجموعة' },
    },
  },
  {
    key: 'simple',
    condition: [{ field: 'purpose', op: 'is' as const, value: 'simple' }],
    title: {
      ru: 'Берите самый простой',
      en: 'Take the simplest one',
      ar: 'اختر الأبسط',
    },
    text: {
      ru: 'Интернет, документы и видео не требуют ни отдельной видеокарты, ни быстрого процессора. Переплата здесь уходит в мощность, которая будет простаивать годами. Базовая модель делает ровно это и делает хорошо — а сэкономленное лучше потратить на память или на сумку.',
      en: 'Web, documents and video need neither a separate graphics card nor a fast processor. Money spent above that goes into power that will sit idle for years. A basic model does exactly this and does it well — and what you save is better spent on memory or on a bag.',
      ar: 'التصفح والمستندات والفيديو لا تحتاج بطاقة رسومات منفصلة ولا معالجاً سريعاً. ما يُدفع فوق ذلك يذهب إلى قوة ستبقى بلا استخدام سنوات. الطراز الأساسي يؤدي هذا تماماً ويؤديه جيداً — والأفضل إنفاق ما توفّره على الذاكرة أو على حقيبة.',
    },
    action: {
      kind: 'product' as const,
      slug: 'x1605va-vivobook-16-e1504fa-bq831w',
      icon: 'check' as const,
      label: { ru: 'Открыть', en: 'Open it', ar: 'افتحه' },
    },
  },
]

// Two branches show what the conditions are for: a gamer is asked which games, everyone else
// whether weight matters, and neither sees the other's question.
export async function seedQuiz(siteId: SiteId, tx: Db | Transaction) {
  const form = await createForm(
    siteId,
    {
      slug: 'podbor',
      name: { ru: 'Подобрать ноутбук', en: 'Find your laptop', ar: 'اختيار كمبيوتر محمول' },
      success: {
        ru: 'Спасибо! Подберём несколько вариантов под ваш запрос и пришлём подборку.',
        en: 'Thank you! We will curate matching options and send you a selection.',
        ar: 'شكرًا لك! سنختار عدة خيارات تناسب طلبك ونرسل لك المجموعة المختارة.',
      },
      notify: ['sales@vega.kg'],
      position: 1,
    },
    tx,
  )

  await setStructure(
    siteId,
    form.id,
    {
      steps: [
        {
          key: 'purpose',
          title: {
            ru: 'Для чего берёте ноутбук?',
            en: 'What is the main use case for the laptop?',
            ar: 'ما هو الغرض الأساسي من استخدام الكمبيوتر المحمول؟',
          },
          description: {
            ru: 'От этого зависит почти всё остальное.',
            en: 'This determines almost everything else.',
            ar: 'يعتمد كل شيء آخر تقريبًا على هذا.',
          },
        },
        {
          key: 'budget',
          title: {
            ru: 'На какую сумму рассчитываете?',
            en: 'What is your target budget?',
            ar: 'ما هي الميزانية المحددة؟',
          },
        },
        {
          key: 'games',
          title: {
            ru: 'Во что играете?',
            en: 'What games do you play?',
            ar: 'ما هي الألعاب التي تلعبها؟',
          },
          description: {
            ru: 'Отметьте всё, что подходит — по жанрам понятно, какая нужна видеокарта.',
            en: 'Select all that apply — genres indicate required graphics performance.',
            ar: 'حدد كل ما يناسبك — توضح أنواع الألعاب بطاقة الرسومات المطلوبة.',
          },
          condition: [{ field: 'purpose', op: 'is', value: 'games' }],
        },
        {
          key: 'mobility',
          title: {
            ru: 'Носить с собой планируете?',
            en: 'Do you plan to carry it with you?',
            ar: 'هل تخطط لحمله معك والتنقل به؟',
          },
          condition: [{ field: 'purpose', op: 'not', value: 'games' }],
        },
        {
          key: 'contact',
          title: {
            ru: 'Куда прислать подборку?',
            en: 'Where should we send the selection?',
            ar: 'أين نرسل لك المجموعة المختارة؟',
          },
        },
      ],
      fields: [
        {
          key: 'purpose',
          step: 'purpose',
          type: 'select',
          label: { ru: 'Основная задача', en: 'Primary task', ar: 'المهمة الأساسية' },
          isRequired: true,
          options: [
            { key: 'games', label: { ru: 'Игры', en: 'Gaming', ar: 'الألعاب' } },
            {
              key: 'work',
              label: { ru: 'Работа и учёба', en: 'Work and study', ar: 'العمل والدراسة' },
            },
            {
              key: 'creative',
              label: {
                ru: 'Графика, монтаж, 3D',
                en: 'Content creation, editing, 3D',
                ar: 'التصميم والمونتاج و3D',
              },
            },
            {
              key: 'simple',
              label: {
                ru: 'Интернет и документы',
                en: 'Web browsing and documents',
                ar: 'تصفح الإنترنت والمستندات',
              },
            },
          ],
        },
        {
          key: 'budget',
          step: 'budget',
          type: 'select',
          label: { ru: 'Бюджет', en: 'Budget', ar: 'الميزانية' },
          isRequired: true,
          options: [
            {
              key: 'to-60',
              label: { ru: 'До 60 000 сом', en: 'Up to 60,000 KGS', ar: 'حتى 60,000 سوم' },
            },
            {
              key: '60-100',
              label: {
                ru: '60 000 — 100 000 сом',
                en: '60,000 — 100,000 KGS',
                ar: '60,000 — 100,000 سوم',
              },
            },
            {
              key: '100-150',
              label: {
                ru: '100 000 — 150 000 сом',
                en: '100,000 — 150,000 KGS',
                ar: '100,000 — 150,000 سوم',
              },
            },
            {
              key: 'from-150',
              label: {
                ru: 'Больше 150 000 сом',
                en: 'Over 150,000 KGS',
                ar: 'أكثر من 150,000 سوم',
              },
            },
          ],
        },
        {
          key: 'games',
          step: 'games',
          type: 'multiselect',
          label: { ru: 'Жанры', en: 'Genres', ar: 'أنواع الألعاب' },
          isRequired: true,
          options: [
            {
              key: 'shooters',
              label: { ru: 'Шутеры', en: 'Shooters', ar: 'ألعاب التصويب (Shooters)' },
            },
            {
              key: 'online',
              label: {
                ru: 'Онлайн и киберспорт',
                en: 'Online and esports',
                ar: 'ألعاب أونلاين ورياضات إلكترونية',
              },
            },
            {
              key: 'story',
              label: {
                ru: 'Большие сюжетные игры',
                en: 'Story-driven AAA titles',
                ar: 'ألعاب قصصية ضخمة (AAA)',
              },
            },
            { key: 'strategy', label: { ru: 'Стратегии', en: 'Strategy', ar: 'ألعاب استراتيجية' } },
            {
              key: 'racing',
              label: {
                ru: 'Гонки и симуляторы',
                en: 'Racing and simulators',
                ar: 'سباقات ومحاكاة',
              },
            },
            { key: 'light', label: { ru: 'Что-то лёгкое', en: 'Casual games', ar: 'ألعاب خفيفة' } },
          ],
        },
        {
          key: 'weight',
          step: 'mobility',
          type: 'select',
          label: {
            ru: 'Важен ли вес',
            en: 'Is portability important',
            ar: 'هل الوزن مهم بالنسبة لك',
          },
          isRequired: true,
          options: [
            {
              key: 'yes',
              label: {
                ru: 'Да, носить каждый день',
                en: 'Yes, daily commuting',
                ar: 'نعم، للتنقل اليومي',
              },
            },
            { key: 'sometimes', label: { ru: 'Иногда', en: 'Occasionally', ar: 'أحيانًا' } },
            {
              key: 'no',
              label: {
                ru: 'Нет, будет стоять на столе',
                en: 'No, desktop replacement',
                ar: 'لا، سيبقى على المكتب',
              },
            },
          ],
        },
        {
          key: 'name',
          step: 'contact',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          step: 'contact',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'comment',
          step: 'contact',
          type: 'textarea',
          label: { ru: 'Что ещё важно', en: 'Other requirements', ar: 'أي متطلبات أخرى' },
          placeholder: { ru: 'Необязательно', en: 'Optional', ar: 'اختياري' },
        },
      ],
      outcomes: OUTCOMES,
    },
    tx,
  )

  /*
   * Every verdict must lead somewhere that EXISTS, and the seed is the only place that can say so.
   *
   * A card or a shelf that has been renamed leaves the action resolving to no address at all: the
   * verdict still prints, its button quietly does not, and nobody finds out. So the fixture checks
   * its own targets and refuses to build a quiz that answers into nothing.
   */
  for (const outcome of OUTCOMES) {
    const action = outcome.action
    if (!action) continue
    const found =
      action.kind === 'product'
        ? await findProductBySlug(siteId, action.slug, tx)
        : await findVisibleSelection(siteId, action.slug, tx)
    if (!found) {
      throw new Error(
        `vega quiz: verdict «${outcome.key}» points at ${action.kind} «${action.slug}», which this catalogue does not hold`,
      )
    }
  }

  return form
}
