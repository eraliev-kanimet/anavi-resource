import type { Db, Transaction } from '@anavi/backend/src/db'
import { createForm, setStructure, updateForm } from '@anavi/backend/src/modules/form/form.service'
import { checkoutForm } from '@anavi/backend/src/modules/form/form.public'
import type { SiteId } from '@anavi/backend/src/db/ids'

const MAIL = ['zakaz@watt.kg']

const TOPICS = [
  {
    key: 'choice',
    label: { ru: 'Помочь с выбором', en: 'Help with choice', ar: 'المساعدة في الاختيار' },
  },
  {
    key: 'delivery',
    label: {
      ru: 'Доставка и подъём',
      en: 'Delivery and floor carry',
      ar: 'التوصيل والرفع للأدوار العليا',
    },
  },
  {
    key: 'install',
    label: {
      ru: 'Подключение и установка',
      en: 'Connection and installation',
      ar: 'التركيب والتوصيل',
    },
  },
  {
    key: 'service',
    label: { ru: 'Гарантия и ремонт', en: 'Warranty and repair', ar: 'الضمان والصيانة' },
  },
  {
    key: 'wholesale',
    label: {
      ru: 'Оптом и для застройщиков',
      en: 'Wholesale and developers',
      ar: 'مبيعات الجملة وللمطورين العقاريين',
    },
  },
  { key: 'other', label: { ru: 'Другое', en: 'Other', ar: 'أخرى' } },
]

// The contact form is a letter — it may sit unanswered till morning. The widget is a conversation.
// A third one stood here, a branching questionnaire about what to pick: a shop of two hundred and
// sixty appliances answers that with the filter panel, and a questionnaire asking four things a
// facet already asks is the same shelf narrowed twice.
export async function seedForms(siteId: SiteId, tx: Db | Transaction) {
  const contact = await createForm(
    siteId,
    {
      slug: 'contact',
      name: { ru: 'Написать нам', en: 'Contact us', ar: 'تواصل معنا' },
      success: {
        ru: 'Письмо ушло — ответим в рабочее время, обычно в тот же день.',
        en: 'Message sent — we will reply during business hours, usually on the same day.',
        ar: 'تم إرسال الرسالة بنجاح — سنرد عليك خلال ساعات العمل، وعادة في نفس اليوم.',
      },
      notify: MAIL,
      position: 0,
    },
    tx,
  )

  await setStructure(
    siteId,
    contact.id,
    {
      fields: [
        {
          key: 'name',
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
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'topic',
          type: 'select',
          role: 'topic',
          label: { ru: 'О чём вопрос', en: 'Topic of inquiry', ar: 'موضوع الاستفسار' },
          isRequired: true,
          options: TOPICS.map((topic) => ({ key: topic.key, label: topic.label })),
        },
        {
          key: 'message',
          type: 'textarea',
          label: { ru: 'Вопрос', en: 'Message', ar: 'الرسالة' },
          placeholder: {
            ru: 'Модель, сроки, адрес — что важно',
            en: 'Model, timing, address — key details',
            ar: 'الموديل، المواعيد، العنوان — أي تفاصيل مهمة',
          },
          isRequired: true,
        },
      ],
    },
    tx,
  )

  /*
   * The question a reader of the knowledge base did not find answered — asked from a window over
   * the page they are on, by the button under the questions.
   *
   * Three boxes and no topic: whoever got here has read the answers already, and asking them to
   * file their own question under a heading is asking them to do the shop's sorting. A letter and
   * not a conversation — the answer may come in the morning, and the good ones go on to become
   * questions of the base themselves.
   */
  const question = await createForm(
    siteId,
    {
      slug: 'question',
      name: { ru: 'Задать вопрос', en: 'Ask a question', ar: 'اطرح سؤالاً' },
      success: {
        ru: 'Вопрос у нас. Ответим в рабочее время, обычно в тот же день.',
        en: 'We have your question. We reply during business hours, usually the same day.',
        ar: 'وصلنا سؤالك. نرد خلال ساعات العمل، وعادة في نفس اليوم.',
      },
      notify: MAIL,
      position: 2,
    },
    tx,
  )
  await setStructure(
    siteId,
    question.id,
    {
      fields: [
        {
          key: 'question',
          type: 'textarea',
          label: { ru: 'Ваш вопрос', en: 'Your question', ar: 'سؤالك' },
          placeholder: {
            ru: 'Например: встанет ли посудомойка 45 см в нишу 44,5',
            en: 'For example: will a 45 cm dishwasher fit a 44.5 cm niche',
            ar: 'مثلاً: هل تناسب غسالة صحون 45 سم فتحة بعرض 44.5 سم',
          },
          isRequired: true,
        },
        {
          key: 'name',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
      ],
    },
    tx,
  )

  const chat = await createForm(
    siteId,
    {
      slug: 'chat',
      name: { ru: 'Спросить о технике', en: 'Ask about appliances', ar: 'استفسار عن الأجهزة' },
      success: {
        ru: 'Мы на связи — спрашивайте.',
        en: 'We are online — feel free to ask.',
        ar: 'نحن متواجدون للرد — تفضل بطرح سؤالك.',
      },
      after: 'chat',
      widget: true,
      notify: MAIL,
      position: 1,
    },
    tx,
  )

  await setStructure(
    siteId,
    chat.id,
    {
      fields: [
        {
          key: 'name',
          type: 'text',
          role: 'name',
          label: { ru: 'Имя', en: 'Name', ar: 'الاسم' },
          isRequired: true,
          isRemembered: true,
        },
        {
          key: 'phone',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'question',
          type: 'textarea',
          label: { ru: 'Вопрос', en: 'Question', ar: 'السؤال' },
          placeholder: {
            ru: 'Влезет ли в нишу, есть ли в наличии, когда привезёте',
            en: 'Fit into opening, in stock, delivery timeframe',
            ar: 'الأبعاد والمقاسات، توفر المنتج، موعد التوصيل',
          },
          isRequired: true,
        },
      ],
    },
    tx,
  )

  // The till ends in a conversation for the same reason the request does: a delivery of a
  // refrigerator gets agreed, not confirmed.
  const till = await checkoutForm(siteId, tx)
  if (till) await updateForm(siteId, till.id, { toInbox: true, after: 'chat' }, tx)

  return { contact, chat }
}
