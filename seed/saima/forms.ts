import { toMinor } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { checkoutForm, requestForm } from '@anavi/backend/src/modules/form/form.public'
import { setStructure, updateForm } from '@anavi/backend/src/modules/form/form.service'
import { SAIMA_ORG, SAIMA_TIERS } from './index'
import { seedWidget } from '../widget'
import type { SiteId } from '@anavi/backend/src/db/ids'

/** Request slug matches the default created during site signup; the workshop customizes form questions. */
export const REQUEST_FORM = 'request'

// Corner widget is not a separate entity from forms, but a form configured with two flags. Provisioned prior
// to checkout intentionally: workshop checkout replies in conversation, requiring an active chat widget.
export async function seedChat(siteId: SiteId, tx: Db | Transaction) {
  return seedWidget(
    siteId,
    {
      name: { ru: 'Написать в цех', en: 'Message the workshop', ar: 'مراسلة ورشة الخياطة' },
      success: {
        ru: 'Мы на связи. Спрашивайте про размеры, ткани и сроки.',
        en: 'We are online. Ask about sizing, fabrics, and turnaround times.',
        ar: 'نحن متواجدون للرد. اسألنا عن المقاسات، الأقمشة، ومواعيد الإنتاج والتسليم.',
      },
    },
    tx,
  )
}

// Checkout adapted for workshop operations: fulfillment method is preserved (showroom pickup and courier),
// while delivery time slots are omitted. Garment courier delivery is scheduled by phone.
export async function seedCheckout(siteId: SiteId, tx: Db | Transaction) {
  const form = (await checkoutForm(siteId, tx))!
  await updateForm(siteId, form.id, { toInbox: true, after: 'chat' }, tx)

  await setStructure(
    siteId,
    form.id,
    {
      steps: [
        {
          key: 'contacts',
          title: {
            ru: 'Как с вами связаться',
            en: 'Contact information',
            ar: 'معلومات الاتصال والتواصل',
          },
          description: {
            ru: 'Позвоним подтвердить размер и наличие.',
            en: 'We will call to confirm size and stock availability.',
            ar: 'سنتصل بك لتأكيد المقاس وتوفر الكمية المطلوبة.',
          },
        },
        {
          key: 'delivery',
          title: { ru: 'Как получить', en: 'Delivery and pickup', ar: 'طريقة الاستلام والتوصيل' },
          description: {
            ru: 'Заберёте в шоуруме или привезём — как удобнее.',
            en: 'Pick up at the showroom or courier delivery — whichever suits you best.',
            ar: 'يمكنك الاستلام من المعرض أو التوصيل عبر المندوب — حسب رغبتك.',
          },
        },
      ],
      fields: [
        {
          key: 'name',
          step: 'contacts',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          placeholder: {
            ru: 'Как к вам обращаться',
            en: 'How should we address you',
            ar: 'كيف تفضل أن نخاطبك',
          },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          step: 'contacts',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'fulfilment',
          step: 'delivery',
          type: 'select',
          role: 'fulfilment',
          label: { ru: 'Как получить', en: 'How to receive', ar: 'طريقة الاستلام' },
          isRequired: true,
          options: [
            {
              key: 'pickup',
              label: {
                ru: 'Забрать в шоуруме на Ибраимова',
                en: 'Pick up at Ibraimov showroom',
                ar: 'الاستلام من المعرض في شارع إبراهيموف',
              },
            },
            {
              key: 'delivery',
              label: { ru: 'Доставка', en: 'Courier delivery', ar: 'التوصيل عبر المندوب' },
            },
          ],
        },
        {
          key: 'address',
          step: 'delivery',
          type: 'text',
          role: 'address',
          label: { ru: 'Адрес', en: 'Address', ar: 'العنوان' },
          placeholder: {
            ru: 'Город, улица, дом, квартира',
            en: 'City, street, building, apartment',
            ar: 'المدينة، الشارع، المبنى، الشقة',
          },
          isRemembered: true,
          isRequired: true,
          condition: [{ field: 'fulfilment', op: 'is', value: 'delivery' }],
        },
        {
          // Where it goes. No options here: the platform puts in the districts the site declared,
          // and drops the question altogether while there is only one.
          key: 'delivery-zone',
          step: 'delivery',
          type: 'select',
          role: 'zone',
          label: { ru: 'Куда везём', en: 'Where to', ar: 'إلى أي منطقة' },
          isRequired: true,
          condition: [{ field: 'fulfilment', op: 'is', value: 'delivery' }],
        },
        {
          // Single size question instead of three: the workshop knows the ordered item, asking only
          // for height and bust/hip measurements when clients hesitate between sizes.
          //
          // Persisted in storage: measurements belong to the client rather than this single order.
          key: 'measurements',
          step: 'delivery',
          type: 'textarea',
          label: {
            ru: 'Сомневаетесь в размере?',
            en: 'Unsure about sizing?',
            ar: 'هل لديك شك في المقاس المناسب؟',
          },
          placeholder: {
            ru: 'Рост, обхват груди и бёдер — подскажем, что взять',
            en: 'Height, bust, and hip measurements — we will advise the best fit',
            ar: 'أرسل الطول، ومحيط الصدر والأرداف — وسنحدد لك المقاس الدقيق',
          },
          isRemembered: true,
        },
      ],
    },
    tx,
  )
}

// Batch production request. The core focus of this demo: request form rather than standard cart.
// Built on the standard form provisioned during signup with customized questions.
//
// Dynamic calculator form. Pricing calculator and form are unified into a single entity:
// base amount on the form, factors on option choices, volume tiers on the quantity field.
export async function seedRequest(siteId: SiteId, tx: Db | Transaction) {
  const form = (await requestForm(siteId, tx))!
  await updateForm(
    siteId,
    form.id,
    {
      name: {
        ru: 'Заявка на партию',
        en: 'Batch production request',
        ar: 'طلب تفصيل وإنتاج دفعة ملابس',
      },
      toInbox: true,
      after: 'chat',
      success: {
        ru: 'Заявка у технолога. Ответим в тот же день, если сегодня рабочий.',
        en: 'Request sent to production technologist. We will reply today during business hours.',
        ar: 'تم تحويل طلبك إلى المهندس الفني. سنرد عليك في نفس اليوم خلال ساعات العمل.',
      },
      // 2,900 KGS represents the average collection piece: dress, blouse, or trousers. Other options
      // adjust this baseline factorially rather than setting isolated price tables. 15% spread represents
      // an honest preliminary range before fabric and pattern inspection.
      base: toMinor(2900, SAIMA_ORG.currency),
      spread: 15,
    },
    tx,
  )

  await setStructure(
    siteId,
    form.id,
    {
      // Cost estimation step is placed FIRST, inverting traditional questionnaire order. Visitors arrive
      // seeking a cost estimate; asking for contact info upfront increases drop-off. By step 3 they have
      // seen the estimate, making phone submission a natural next step.
      steps: [
        {
          key: 'garment',
          title: { ru: 'Что шьём', en: 'Garment specs', ar: 'مواصفات القطعة المطلوبة' },
          description: {
            ru: 'Четыре ответа — и увидите сумму.',
            en: 'Four answers to view the cost estimate.',
            ar: 'أجب عن أربعة أسئلة سريعة لمعرفة التكلفة التقديرية فوراً.',
          },
        },
        {
          key: 'making',
          title: { ru: 'Как шьём', en: 'Production details', ar: 'تفاصيل التنفيذ والإنتاج' },
          description: {
            ru: 'Здесь вилка сужается.',
            en: 'Refining the estimate range.',
            ar: 'تحديد التفاصيل لضبط السعر بدقة.',
          },
        },
        {
          key: 'contacts',
          title: {
            ru: 'Куда прислать расчёт',
            en: 'Contact details',
            ar: 'بيانات التواصل لإرسال عرض السعر',
          },
          description: {
            ru: 'Три строки, и мы на связи.',
            en: 'Three quick fields and we are in touch.',
            ar: 'ثلاثة حقول بسيطة وسنتواصل معك مباشرة.',
          },
        },
      ],
      fields: [
        {
          // Pattern drafting from a sample garment is a distinct fixed charge: represented as a flat
          // surcharge that does not multiply with volume. Lacks `topic` role since it represents HOW
          // rather than WHAT is produced.
          key: 'source',
          step: 'garment',
          type: 'select',
          label: { ru: 'Что шьём', en: 'Production type', ar: 'نوع ومصدر الموديل' },
          isRequired: true,
          options: [
            {
              key: 'collection',
              label: {
                ru: 'Модель из коллекции',
                en: 'Model from our catalog',
                ar: 'موديل من كتالوج الورشة الحالي',
              },
              factor: 100,
            },
            {
              key: 'patterns',
              label: {
                ru: 'По моим лекалам',
                en: 'Using my patterns',
                ar: 'وفقاً للبترون الخاص بي',
              },
              factor: 95,
            },
            {
              key: 'sample',
              label: {
                ru: 'По образцу вещи — лекал нет',
                en: 'From physical sample (no patterns)',
                ar: 'نسخ عن عينة ملابس حقيقية (بدون بترون)',
              },
              factor: 95,
              add: toMinor(8000, SAIMA_ORG.currency),
            },
          ],
        },
        {
          key: 'model',
          step: 'garment',
          type: 'text',
          label: { ru: 'Какая модель', en: 'Which model', ar: 'أي موديل ترغب بتنفيذه؟' },
          placeholder: {
            ru: 'Название из каталога',
            en: 'Model name from catalog',
            ar: 'اسم الموديل من الكتالوج',
          },
          condition: [{ field: 'source', op: 'is', value: 'collection' }],
        },
        {
          // Primary complexity multiplier asked in intuitive terms rather than sewing operation counts.
          key: 'complexity',
          step: 'garment',
          type: 'select',
          label: { ru: 'Что за вещь', en: 'Garment category', ar: 'نوع القطعة المراد تفصيلها' },
          isRequired: true,
          options: [
            {
              key: 'simple',
              label: {
                ru: 'Простое: топ, футболка, лонгслив',
                en: 'Basic: tank, tee, long sleeve',
                ar: 'بسيطة: توب، تي شيرت، بلوزة بأكمام طويلة',
              },
              factor: 70,
            },
            {
              key: 'medium',
              label: {
                ru: 'Среднее: платье, блуза, брюки, юбка',
                en: 'Standard: dress, blouse, pants, skirt',
                ar: 'متوسطة: فستان، بلوزة كلاسيكية، بنطلون، تنورة',
              },
              factor: 100,
            },
            {
              key: 'complex',
              label: {
                ru: 'Сложное: жакет, пальто, тренч, костюм',
                en: 'Complex: blazer, coat, trench, suit',
                ar: 'معقدة: بليزر، معطف، ترنش كوت، بدلة كاملة',
              },
              factor: 185,
            },
          ],
        },
        {
          // Tiered volume discount matches the catalog pricing table. Calculation requires batch quantity
          // before displaying totals.
          key: 'quantity',
          step: 'garment',
          type: 'number',
          label: {
            ru: 'Тираж, штук',
            en: 'Batch quantity (pieces)',
            ar: 'الكمية المطلوبة (بالقطعة)',
          },
          placeholder: { ru: 'От 10', en: 'From 10', ar: 'من 10 قطع فما فوق' },
          isRequired: true,
          isQuantity: true,
          tiers: SAIMA_TIERS,
        },
        {
          // Customer-supplied fabric incurs cut-and-sew labor only, yielding the largest discount in the form.
          key: 'fabric',
          step: 'making',
          type: 'select',
          label: { ru: 'Ткань', en: 'Fabric source', ar: 'مصدر القماش' },
          isRequired: true,
          // Default values for step 2 fields enable instant range display at the end of STEP 1:
          // calculations require complete inputs, and in-house fabric with standard turnaround are most common.
          defaultValue: 'nasha',
          options: [
            {
              key: 'ours',
              label: {
                ru: 'Ваша — подберите под модель',
                en: 'In-house fabric matched to model',
                ar: 'من أقمشة الورشة — اختاروا المناسب للموديل',
              },
              factor: 100,
            },
            {
              key: 'mine',
              label: {
                ru: 'Своя — привезу в цех',
                en: 'Customer fabric delivered to workshop',
                ar: 'قماش خاص بي — سأقوم بتوريده للورشة',
              },
              factor: 72,
            },
            {
              key: 'unsure',
              label: { ru: 'Ещё не решил', en: 'Undecided', ar: 'لم أقرر بعد' },
              factor: 100,
            },
          ],
        },
        {
          key: 'deadline',
          step: 'making',
          type: 'select',
          label: { ru: 'Срок', en: 'Turnaround time', ar: 'المدة الزمنية للتسليم' },
          isRequired: true,
          defaultValue: 'obychnyj',
          options: [
            {
              key: 'normal',
              label: { ru: 'Обычный', en: 'Standard', ar: 'عادي (الجدول القياسي)' },
              factor: 100,
            },
            {
              key: 'rush',
              label: {
                ru: 'Срочный — дороже',
                en: 'Rush order (surcharge applies)',
                ar: 'مستعجل (تطبق رسوم إضافية)',
              },
              factor: 135,
            },
          ],
        },
        {
          key: 'sizes',
          step: 'making',
          type: 'text',
          label: { ru: 'Размерный ряд', en: 'Size breakdown', ar: 'توزيع المقاسات المطلوب' },
          placeholder: {
            ru: 'Например: 44–52, по двадцать штук',
            en: 'e.g., 44–52, twenty pieces per size',
            ar: 'مثال: مقاسات 44–52، بواقع 20 قطعة لكل مقاس',
          },
        },
        {
          // File upload field allows clients to attach custom patterns or sample photos.
          // Displayed only when custom pattern or sample options are selected.
          key: 'patterns',
          step: 'making',
          type: 'file',
          label: {
            ru: 'Лекала или фото образца',
            en: 'Patterns or sample photo',
            ar: 'ملفات البترون أو صورة العينة',
          },
          condition: [{ field: 'source', op: 'is', value: ['patterns', 'sample'] }],
        },
        {
          key: 'name',
          step: 'contacts',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          step: 'contacts',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
          width: 'half',
        },
        {
          // Client brand — equivalent to company name for accountants: an attribute of the client,
          // not of this single batch. The field has no dedicated role; persistence is driven by the flag.
          key: 'company',
          step: 'contacts',
          type: 'text',
          label: {
            ru: 'Магазин или марка',
            en: 'Brand or retail store',
            ar: 'اسم المتجر أو العلامة التجارية',
          },
          placeholder: {
            ru: 'Как называетесь, где продаёте',
            en: 'Brand name and sales channels',
            ar: 'اسم البراند وقنوات البيع (متاجر/أونلاين)',
          },
          isRemembered: true,
        },
        {
          key: 'comment',
          step: 'contacts',
          type: 'textarea',
          label: { ru: 'Что важно учесть', en: 'Key specifications', ar: 'ملاحظات وشروط خاصة' },
          placeholder: {
            ru: 'Отделка, бирки, упаковка, куда отгружать',
            en: 'Trims, brand tags, custom packaging, destination',
            ar: 'التشطيبات، الليبل، التغليف المخصص، وجهة الشحن',
          },
        },
      ],
      // Response copy depends on batch volume: runs of 300+ require technologist estimation, and promising
      // "today" would be inaccurate. Condition evaluates the numeric quantity requested earlier.
      outcomes: [
        {
          key: 'large-run',
          condition: [{ field: 'quantity', op: 'gt', value: 299 }],
          title: {
            ru: 'Приняли. Это крупный тираж',
            en: 'Received. Large volume order',
            ar: 'تم استلام الطلب. هذه دفعة إنتاجية كبرى',
          },
          text: {
            ru: 'По партии от трёхсот штук считает технолог: нужно посмотреть раскладку и расход. Ответим в течение двух рабочих дней — с точной ценой, а не с вилкой.',
            en: 'Batches of 300+ units require tailored pattern nesting and fabric consumption calculations by our head technologist. We will return within 2 business days with an exact quote.',
            ar: 'الطلبات التي تبدأ من 300 قطعة تخضع لحسابات دقيقة للبترون واستهلاك الأقمشة بواسطة كبير المهندسين. سنوافيك بعرض سعر نهائي محدد خلال يومي عمل.',
          },
        },
        {
          key: 'default',
          condition: [],
          title: { ru: 'Приняли заявку', en: 'Request received', ar: 'تم استلام طلبك بنجاح' },
          text: {
            ru: 'Вернёмся с точной ценой в тот же день. Если что-то забыли приложить — переписка уже открыта, допишите туда.',
            en: 'We will return with an exact price quote today. If you need to add files or notes, simply reply in the open chat thread.',
            ar: 'سنوافيك بالسعر النهائي الدقيق اليوم. إذا نسيت إرفاق أي ملفات — المحادثة مفتوحة، يمكنك إرسالها هناك.',
          },
        },
      ],
    },
    tx,
  )
}
