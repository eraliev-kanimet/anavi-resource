import type { Db, Transaction } from '@anavi/backend/src/db'
import { createForm, setStructure, updateForm } from '@anavi/backend/src/modules/form/form.service'
import { checkoutForm } from '@anavi/backend/src/modules/form/form.public'
import type { SiteId } from '@anavi/backend/src/db/ids'

// The topic is a field with a role, not six separate forms — that is how the inbox filters
// complaints from partnerships.
const TOPICS = [
  { key: 'consultation', label: { ru: 'Консультация', en: 'Consultation', ar: 'استشارة' } },
  {
    key: 'support',
    label: { ru: 'Техническая поддержка', en: 'Technical support', ar: 'الدعم الفني' },
  },
  {
    key: 'partnership',
    label: { ru: 'Сотрудничество', en: 'Partnership', ar: 'الشراكة والتعاون' },
  },
  { key: 'complaint', label: { ru: 'Жалоба', en: 'Complaint', ar: 'شكوى' } },
  { key: 'suggestion', label: { ru: 'Предложение', en: 'Suggestion', ar: 'اقتراح' } },
  { key: 'bug', label: { ru: 'Ошибка на сайте', en: 'Website issue', ar: 'مشكلة في الموقع' } },
]

export async function seedForms(siteId: SiteId, tx: Db | Transaction) {
  const form = await createForm(
    siteId,
    {
      slug: 'contact',
      name: { ru: 'Свяжитесь с нами', en: 'Contact us', ar: 'تواصل معنا' },
      success: {
        ru: 'Сообщение отправлено — мы свяжемся с вами как можно скорее.',
        en: 'Message sent — we will get back to you as soon as possible.',
        ar: 'تم إرسال الرسالة — سنتواصل معك في أقرب وقت ممكن.',
      },
      notify: ['sales@vega.kg'],
      position: 0,
    },
    tx,
  )

  await setStructure(
    siteId,
    form.id,
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
            ar: 'كيف ناديك',
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
          label: { ru: 'Тема', en: 'Subject', ar: 'الموضوع' },
          isRequired: true,
          options: TOPICS.map((topic) => ({ key: topic.key, label: topic.label })),
        },
        {
          key: 'message',
          type: 'textarea',
          label: { ru: 'Сообщение', en: 'Message', ar: 'الرسالة' },
          placeholder: {
            ru: 'Напишите подробнее, что вас интересует',
            en: 'Tell us more about your inquiry',
            ar: 'اكتب بالتفصيل ما يهمك',
          },
          isRequired: true,
        },
      ],
    },
    tx,
  )
  // The second placement of the same idea: a two-question intake and then a live conversation.
  const chat = await createForm(
    siteId,
    {
      slug: 'chat',
      name: {
        ru: 'Чат с консультантом',
        en: 'Live chat with consultant',
        ar: 'محادثة مباشرة مع المستشار',
      },
      after: 'chat',
      widget: true,
      success: {
        ru: 'Мы на связи — спрашивайте.',
        en: 'We are online — ask away.',
        ar: 'نحن متصلون — تفضل بالسؤال.',
      },
      notify: ['sales@vega.kg'],
      position: 2,
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
          label: { ru: 'Как вас зовут', en: 'What is your name', ar: 'ما اسمك' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'phone',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone', ar: 'رقم الهاتف' },
          placeholder: {
            ru: 'Если связь прервётся',
            en: 'In case the connection drops',
            ar: 'في حال انقطاع الاتصال',
          },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'question',
          type: 'textarea',
          label: { ru: 'Вопрос', en: 'Question', ar: 'السؤال' },
          isRequired: true,
        },
      ],
    },
    tx,
  )

  // Electronics orders involve a conversation: availability, lead times, delivery. The two fields
  // are set together — `assertSettings` prevents enabling chat without "Inbox".
  const checkout = await checkoutForm(siteId, tx)
  await updateForm(siteId, checkout!.id, { toInbox: true, after: 'chat' }, tx)

  return form
}
