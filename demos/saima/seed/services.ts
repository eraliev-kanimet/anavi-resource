import type { Db, Transaction } from '@anavi/backend/src/db'
import { findFormBySlug } from '@anavi/backend/src/modules/form/form.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { createService } from '@anavi/backend/src/modules/service/service.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { findImage } from '../../../seed/lib/assets'
import { REQUEST_FORM } from './forms'

export const SEWING = 'poshiv-partii'

/*
 * What the workshop does for somebody else's label: a run sewn from the client's own patterns.
 *
 * Priced after a look, because it is — the cloth, the cut and the count decide the sum, and the
 * workshop says so everywhere. It asks with the very questionnaire the wholesale page already
 * draws, the one that counts: a service with no number of its own is where a counting form belongs,
 * and the fork that form shows IS the rough answer. Nothing about that page changes.
 */
export async function seedSaimaServices(siteId: SiteId, tx: Db | Transaction) {
  const form = await findFormBySlug(siteId, REQUEST_FORM, tx)
  if (!form) throw new Error('saima: the batch request form is not seeded yet')

  const made = await createService(
    siteId,
    null,
    {
      slug: SEWING,
      name: {
        ru: 'Пошив партии по лекалам заказчика',
        en: 'Batch production from your patterns',
        ar: 'خياطة دفعة حسب باترونات العميل',
      },
      summary: {
        ru: 'Шьём тираж по вашим лекалам или образцу: раскрой, пошив, отпаривание и упаковка.',
        en: 'We sew a run from your patterns or sample: cutting, stitching, steaming and packing.',
        ar: 'نخيط الدفعة حسب باتروناتك أو عيّنتك: القص والخياطة والكي بالبخار والتعبئة.',
      },
      description: {
        blocks: [
          {
            type: 'paragraph' as const,
            data: {
              text: {
                ru: 'Берём тиражи от тридцати единиц. По лекалам заказчика шьём сразу; с готовой вещи сначала снимаем лекала и отшиваем образец, тираж запускаем после его утверждения.',
                en: 'We take runs from thirty pieces. From your patterns we sew straight away; from a finished garment we first draft patterns and sew a sample, and the run starts once it is approved.',
                ar: 'نقبل الدفعات من ثلاثين قطعة. نخيط مباشرة حسب باترونات العميل؛ ومن قطعة جاهزة نرسم الباترون أولاً ونخيط عيّنة، وتبدأ الدفعة بعد اعتمادها.',
              },
            },
          },
          {
            type: 'paragraph' as const,
            data: {
              text: {
                ru: 'Цена зависит от сложности изделия, ткани, тиража и срока. Анкета сразу покажет вилку, а точную сумму называем после того, как увидели лекала и ткань.',
                en: 'The price depends on the complexity of the garment, the fabric, the size of the run and the deadline. The form shows a range at once, and the exact sum is named after we have seen the patterns and the cloth.',
                ar: 'يعتمد السعر على تعقيد القطعة والقماش وحجم الدفعة والموعد. يعرض النموذج نطاقاً تقريبياً فوراً، ونحدد المبلغ الدقيق بعد معاينة الباترونات والقماش.',
              },
            },
          },
        ],
      },
      pricing: 'quote',
      status: 'published',
      // Sewn on the workshop's own floors, both of them: the client is told where to bring the cloth.
      venue: 'place',
      placeIds: (await listPlaces(siteId, tx)).map((place) => String(place.id)),
      formId: String(form.id),
    },
    tx,
  )

  // The floor itself: what a client buying a run is actually buying is this room.
  for (const path of [
    `demos/saima/services/${SEWING}.webp`,
    'demos/saima/floor/stitching.webp',
    'demos/saima/floor/cutting.webp',
    'demos/saima/floor/pressing.webp',
    'demos/saima/floor/packing.webp',
  ]) {
    const image = (await findImage(path)) ?? null
    if (!image) continue
    await attachMedia(
      siteId,
      'service',
      made.id,
      { key: image.key, width: image.width, height: image.height },
      tx,
    )
  }
}
