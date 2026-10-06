import type { LocalizedLabel } from '@anavi/shared'

// Visitors come to shop rather than read company stories. Category tile walls on home are omitted:
// aisles are navigated by name, and category tiles without photos render hatched placeholder boxes.
export const DYIKAN_HOME = {
  seo: {
    title: {
      ru: 'Dyikan — продуктовый рынок с доставкой по Бишкеку',
      en: 'Dyikan — farmers market with delivery across Bishkek',
      ar: 'Dyikan — سوق المنتجات الطازجة مع التوصيل في بيشكيك',
    },
    description: {
      ru: 'Овощи, мясо, молочка, хлеб и бакалея с бишкекского рынка. Двести позиций, привоз каждое утро, доставка по городу.',
      en: 'Fresh vegetables, meat, dairy, artisan bread, and groceries from Bishkek market. Two hundred items, morning deliveries across the city.',
      ar: 'خضار طازجة، لحوم، ألبان، خبز ومواد بقالة من سوق بيشكيك. مئتا صنف، توريد يومي كل صباح وتوصيل في جميع أنحاء المدينة.',
    },
  },
  hero: {
    eyebrow: { ru: 'Рынок в Бишкеке', en: 'Bishkek market', ar: 'سوق في بيشكيك' },
    title: {
      ru: 'Весь рынок в одной корзине',
      en: 'The entire market in a single basket',
      ar: 'كل ما تحتاجه من السوق في سلة واحدة',
    },
    subtitle: {
      ru: 'Овощи с чуйских теплиц, мясо утреннего забоя, хлеб из тандыра и почти двести позиций на полках. Собираем заказ и привозим по городу.',
      en: 'Vegetables from Chuy greenhouses, fresh morning meat, tandoor bread, and nearly two hundred items on the shelves. Assembled and delivered across the city.',
      ar: 'خضار من مزارع تشوي، لحوم ذبح صباحي، خبز التنور الطازج وقرابة مئتي صنف على الرفوف. نجهز طلبك ونوصله إلى باب منزلك.',
    },
    action: { ru: 'Смотреть каталог', en: 'Browse catalog', ar: 'تصفح المنتجات' },
  },
  // Banner strip is unnecessary: promotions showcase actual items with prices rather than text badges.
  sale: {
    eyebrow: { ru: 'До понедельника', en: 'Through Monday', ar: 'حتى يوم الاثنين' },
    title: { ru: 'Скидки недели', en: 'Weekly discounts', ar: 'تخفيضات الأسبوع' },
  },
  catalog: {
    eyebrow: { ru: 'Прилавок', en: 'Market counter', ar: 'أقسام السوق' },
    title: { ru: 'Что есть сегодня', en: 'In stock today', ar: 'المتوفر اليوم' },
  },
  trust: {
    eyebrow: { ru: 'Почему мы', en: 'Why choose us', ar: 'لماذا تختارنا' },
    title: { ru: 'Как устроен рынок', en: 'How our market works', ar: 'كيف نعمل' },
    items: [
      {
        icon: 'clock' as const,
        title: { ru: 'Привоз каждое утро', en: 'Fresh morning delivery', ar: 'توريد طازج كل صباح' },
        text: {
          ru: 'Зелень, мясо и хлеб приезжают на прилавок до восьми. Вчерашнего в заказе не будет.',
          en: 'Greens, meat, and bread arrive before 8:00 AM. Zero leftover stock in your order.',
          ar: 'الخضار الورقية، اللحوم والخبز تصل إلى المتجر قبل الثامنة صباحاً. لا بضاعة متبقية من الأمس في طلبك.',
        },
      },
      {
        icon: 'truck' as const,
        title: { ru: 'Доставка в день заказа', en: 'Same-day delivery', ar: 'توصيل في نفس اليوم' },
        text: {
          ru: 'По Бишкеку — 150 сом, от 1000 сом бесплатно. Привозим в выбранное окно.',
          en: 'Across Bishkek: 150 KGS, free over 1,000 KGS. Delivered in your selected time slot.',
          ar: 'في بيشكيك: 150 سوم، ومجاناً للطلبات فوق 1000 سوم. التوصيل في الوقت المحدد.',
        },
      },
      {
        icon: 'leaf' as const,
        title: {
          ru: 'Свои поставщики',
          en: 'Trusted local producers',
          ar: 'موردون محليون موثوقون',
        },
        text: {
          ru: 'Чуйские теплицы, иссык-кульская форель, местные молочные заводы и своя тандырная.',
          en: 'Chuy greenhouses, Issyk-Kul trout, local dairy plants, and in-house tandoor bakery.',
          ar: 'مزارع تشوي، السلمون المرقط من إيسيك كول، مصانع الألبان المحلية ومخبز التنور الخاص بنا.',
        },
      },
      {
        icon: 'badge-check' as const,
        title: { ru: 'Замена по звонку', en: 'Easy substitutions', ar: 'استبدال وتنسيق فوري' },
        text: {
          ru: 'Если позиции не оказалось, предложим замену в переписке или уберём её из счёта.',
          en: 'If an item is out of stock, we offer replacements in chat or remove it from the bill.',
          ar: 'إذا لم يتوفر صنف معين، نقترح بديلاً عبر المحادثة أو نحذفه من الفاتورة.',
        },
      },
    ],
  },
}

// Resolver evaluates pages before prefix handlers, so `/catalog` renders aisle overview while
// `/catalog/<slug>` continues opening product cards.
export const DYIKAN_CATALOG = {
  seo: {
    title: { ru: 'Каталог — Dyikan', en: 'Catalog — Dyikan', ar: 'الكتالوج — Dyikan' },
    description: {
      ru: 'Все ряды рынка: овощи и фрукты, мясо, молочное, хлеб, бакалея, напитки и химия.',
      en: 'All market aisles: fruits and vegetables, meat, dairy, bread, groceries, beverages, and household goods.',
      ar: 'جميع أقسام السوق: خضار وفواكه، لحوم، ألبان، خبز، بقالة، مشروبات ومنظفات.',
    },
  },
  // Acts as page `h1`: hero block is omitted here, so layout template injects the title.
  title: { ru: 'Все товары', en: 'All products', ar: 'جميع المنتجات' },
}

// Twelve aisles on dedicated pages with a directory of cards at the entrance: scrolling 200 items in one
// list is done once and abandoned. Packaging column is purposeful: grocery prices require units, resolved from the primary variant.
export const DYIKAN_PRICE = {
  seo: {
    title: { ru: 'Прайс-лист — Dyikan', en: 'Price list — Dyikan', ar: 'قائمة الأسعار — Dyikan' },
    description: {
      ru: 'Цены рынка по рядам: овощи, мясо, молочное, хлеб, бакалея, напитки и химия.',
      en: 'Market prices by aisle: vegetables, meat, dairy, bread, groceries, drinks, and household products.',
      ar: 'أسعار السوق حسب الأقسام: خضار، لحوم، ألبان، خبز، بقالة، مشروبات ومنظفات.',
    },
  },
  title: { ru: 'Прайс-лист', en: 'Price list', ar: 'قائمة الأسعار' },
  // "Price list · Groceries" is immediately clear, whereas "Groceries" alone is ambiguous.
  page: (name: LocalizedLabel): LocalizedLabel => ({
    ru: `Прайс-лист · ${name.ru}`,
    en: `Price list · ${name.en}`,
    ar: `قائمة الأسعار · ${name.ar || name.en}`,
  }),
}

export const DYIKAN_CONTACTS = {
  seo: {
    title: { ru: 'Контакты — Dyikan', en: 'Contacts — Dyikan', ar: 'معلومات الاتصال — Dyikan' },
    description: {
      ru: 'Павильон 12 на Ошском рынке, телефон и часы работы.',
      en: 'Pavilion 12 at Osh Bazaar, phone number, and operating hours.',
      ar: 'الجناح 12 في سوق أوش، رقم الهاتف وساعات العمل.',
    },
  },
  title: { ru: 'Контакты', en: 'Contacts', ar: 'اتصل بنا' },
  text: [
    {
      ru: 'Мы стоим в павильоне 12 на Ошском рынке, вход со стороны Жибек Жолу. Работаем без выходных с 7:00 до 20:00, заказы принимаем круглосуточно — собираем их с утра.',
      en: 'Located at Pavilion 12 in Osh Bazaar, entrance from Zhibek Zholu. Open daily 7:00 AM to 8:00 PM; orders accepted 24/7 and packed in the morning.',
      ar: 'موقعنا في الجناح 12 بسوق أوش، المدخل من جهة شارع جيبك جولو. نعمل يومياً من 7:00 صباحاً حتى 8:00 مساءً، ونستقبل الطلبات على مدار الساعة مع تجهيزها في الصباح.',
    },
    {
      ru: 'Быстрее всего ответить получается в чате на сайте: там же досогласовываем замены и уточняем адрес. Телефон и WhatsApp работают в часы рынка.',
      en: 'Fastest response via on-site chat: we coordinate substitutions and clarify addresses there. Phone and WhatsApp available during market hours.',
      ar: 'أسرع طريقة للتواصل عبر المحادثة في الموقع: حيث ننسق البدائل ونؤكد العنوان. الهاتف وواتساب متاحان خلال ساعات عمل السوق.',
    },
  ],
}

// Shared privacy policy template adapted specifically for grocery retail.
export const DYIKAN_PRIVACY = {
  title: { ru: 'Политика конфиденциальности', en: 'Privacy policy', ar: 'سياسة الخصوصية' },
  text: [
    {
      ru: 'Мы собираем имя, телефон, адрес доставки и почту — только то, без чего нельзя собрать заказ и привезти его вовремя.',
      en: 'We collect name, phone number, delivery address, and email — strictly the essentials required to assemble and deliver your order on time.',
      ar: 'نجمع الاسم ورقم الهاتف وعنوان التوصيل والبريد الإلكتروني — فقط البيانات الضرورية لتجهيز طلبك وتوصيله في الموعد المحدد.',
    },
    {
      ru: 'Данные нужны, чтобы обработать заказ, согласовать замену, если чего-то не оказалось на прилавке, и передать адрес курьеру. Никому другому мы их не отдаём.',
      en: 'Data is used solely to process orders, confirm substitutions if an item is missing, and provide delivery routes to couriers. Never shared with third parties.',
      ar: 'تُستخدم البيانات فقط لمعالجة الطلبات وتأكيد البدائل وتزويد مندوب التوصيل بالعنوان. لا نشاركها مع أي طرف ثالث.',
    },
    {
      ru: 'Чтобы удалить свои данные или получить их копию, напишите на почту или позвоните — сделаем в течение трёх рабочих дней.',
      en: 'To request data deletion or obtain a copy, contact us by email or phone — requests processed within three business days.',
      ar: 'لحذف بياناتك أو الحصول على نسخة منها، تواصل معنا عبر البريد أو الهاتف — تتم معالجة الطلبات خلال ثلاثة أيام عمل.',
    },
  ],
}
