import type { LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createForm, setStructure } from '@anavi/backend/src/modules/form/form.service'
import { ru } from './labels'
import type { SiteId } from '@anavi/backend/src/db/ids'

type Text = string | LocalizedLabel
const label = (value: Text): LocalizedLabel => (typeof value === 'string' ? ru(value) : value)

export interface SeedWidget {
  name: Text
  success: Text
  notify?: string[]
}

export async function seedWidget(siteId: SiteId, copy: SeedWidget, tx: Db | Transaction) {
  const form = await createForm(
    siteId,
    {
      slug: 'chat',
      name: label(copy.name),
      after: 'chat',
      widget: true,
      success: label(copy.success),
      ...(copy.notify ? { notify: copy.notify } : {}),
      position: 2,
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
          label: { ru: 'Как вас зовут', en: 'Your name' },
          isRequired: true,
          isRemembered: true,
        },
        {
          key: 'phone',
          type: 'phone',
          role: 'phone',
          label: { ru: 'Телефон', en: 'Phone' },
          placeholder: { ru: 'Если связь прервётся', en: 'In case connection drops' },
          isRemembered: true,
          isRequired: true,
        },
        {
          key: 'question',
          type: 'textarea',
          label: { ru: 'Вопрос', en: 'Question' },
          isRequired: true,
        },
      ],
    },
    tx,
  )

  return form
}
