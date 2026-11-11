import type { Db, Transaction } from '@anavi/backend/src/db'
import { findFormBySlug } from '@anavi/backend/src/modules/form/form.service'
import { createGroup } from '@anavi/backend/src/modules/service/group.service'
import { createService } from '@anavi/backend/src/modules/service/service.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import { toMinor, type LocalizedLabel } from '@anavi/shared'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { SAIMA_ORG } from './index'
import { REQUEST_FORM } from './forms'

export const SEWING = 'poshiv-partii'
// The group the price list is read off: every work of the workshop, in the order the list shows them.
export const SEWING_GROUP = 'poshiv'

// What the WORKSHOP charges for the work, by the shelf its model lies on. Work only: the cloth is
// counted apart, and a rate is a floor for the least run — the ladder and the fabric decide the rest.
interface Piece {
  slug: string
  name: LocalizedLabel
  summary: LocalizedLabel
  paragraph: LocalizedLabel
  // Som a piece, major units: `toMinor` turns it into what the platform keeps.
  price: number
}

const PIECES: Piece[] = [
  {
    slug: 'poshiv-platya',
    name: { ru: 'Пошив платья', en: 'Dress production', ar: 'خياطة الفساتين' },
    summary: {
      ru: 'Платья, сарафаны и миди по нашим моделям: крой, пошив, отпарка и упаковка.',
      en: 'Dresses, sundresses and midi styles to our models: cutting, stitching, pressing and packing.',
      ar: 'فساتين، سارافانات وميدي وفق موديلاتنا: قص، خياطة، كي وتغليف.',
    },
    paragraph: {
      ru: 'Работа без ткани, от десяти штук одной модели. Ткань может быть наша или ваша; с нашей цену считаем по карточке модели, с вашей — по этой ставке. Посадку проверяем на сигнальном образце до запуска.',
      en: 'Work only, without fabric, from ten pieces of one model. Fabric can be ours or yours; with ours the price follows the model card, with yours this rate applies. Fit is checked on a prototype sample before the run.',
      ar: 'العمل فقط، دون قماش، من عشر قطع للموديل الواحد. القماش قد يكون من عندنا أو من عندكم؛ مع قماشنا يُحسب السعر وفق بطاقة الموديل، ومع قماشكم تُطبَّق هذه القيمة. نتحقق من القصة على عينة قبل بدء الدفعة.',
    },
    price: 1200,
  },
  {
    slug: 'poshiv-bluzy-rubashki',
    name: {
      ru: 'Пошив блузы и рубашки',
      en: 'Blouse and shirt production',
      ar: 'خياطة البلوزات والقمصان',
    },
    summary: {
      ru: 'Блузы, рубашки и топы: крой, пошив, отпарка и упаковка.',
      en: 'Blouses, shirts and tops: cutting, stitching, pressing and packing.',
      ar: 'بلوزات وقمصان وتوبات: قص، خياطة، كي وتغليف.',
    },
    paragraph: {
      ru: 'Работа без ткани, от десяти штук. Поплин, лён и шёлк шьём на том же потоке; планки, воротники и пуговицы входят в ставку.',
      en: 'Work only, without fabric, from ten pieces. Poplin, linen and silk run on the same line; plackets, collars and buttons are included.',
      ar: 'العمل فقط، دون قماش، من عشر قطع. البوبلين والكتان والحرير على الخط نفسه؛ الأزرار والأطواق والواجهات مشمولة.',
    },
    price: 800,
  },
  {
    slug: 'poshiv-bryuki-yubki',
    name: {
      ru: 'Пошив брюк и юбки',
      en: 'Trousers and skirt production',
      ar: 'خياطة البناطيل والتنانير',
    },
    summary: {
      ru: 'Брюки, юбки и шорты: крой, пошив, отпарка и упаковка.',
      en: 'Trousers, skirts and shorts: cutting, stitching, pressing and packing.',
      ar: 'بناطيل وتنانير وشورتات: قص، خياطة، كي وتغليف.',
    },
    paragraph: {
      ru: 'Работа без ткани, от десяти штук. Пояс, молнии, карманы и подгибка входят в ставку; посадку согласуем на образце.',
      en: 'Work only, without fabric, from ten pieces. Waistbands, zips, pockets and hems are included; the fit is agreed on a sample.',
      ar: 'العمل فقط، دون قماش، من عشر قطع. الأحزمة والسحابات والجيوب والحواشي مشمولة؛ نتفق على القصة عبر عينة.',
    },
    price: 900,
  },
  {
    slug: 'poshiv-trikotazh',
    name: { ru: 'Пошив трикотажа', en: 'Knitwear production', ar: 'خياطة التريكو' },
    summary: {
      ru: 'Футболки, лонгсливы, свитшоты и худи: крой, пошив, отпарка и упаковка.',
      en: 'T-shirts, long sleeves, sweatshirts and hoodies: cutting, stitching, pressing and packing.',
      ar: 'تي شيرتات وأكمام طويلة وسويت شيرتات وهودي: قص، خياطة، كي وتغليف.',
    },
    paragraph: {
      ru: 'Работа без ткани, от десяти штук. Трикотаж кроим и шьём на своём потоке; полотно берём у партнёра или принимаем ваше.',
      en: 'Work only, without fabric, from ten pieces. Knitwear is cut and sewn on our own line; the cloth comes from our partner or from you.',
      ar: 'العمل فقط، دون قماش، من عشر قطع. نقص التريكو ونخيطه على خطنا؛ القماش من شريكنا أو من عندكم.',
    },
    price: 600,
  },
  {
    slug: 'poshiv-verhnej-odezhdy',
    name: {
      ru: 'Пошив верхней одежды',
      en: 'Outerwear production',
      ar: 'خياطة الملابس الخارجية',
    },
    summary: {
      ru: 'Пальто, тренчи, куртки и жакеты: крой, пошив, отпарка и упаковка.',
      en: 'Coats, trenches, jackets and blazers: cutting, stitching, pressing and packing.',
      ar: 'معاطف وترنشات وجاكيتات وبليزرات: قص، خياطة، كي وتغليف.',
    },
    paragraph: {
      ru: 'Работа без ткани, от десяти штук. Верхняя одежда идёт дольше: подкладка, утеплитель, фурнитура и влажно-тепловая обработка входят в ставку.',
      en: 'Work only, without fabric, from ten pieces. Outerwear takes longer: lining, wadding, hardware and steam finishing are included.',
      ar: 'العمل فقط، دون قماش، من عشر قطع. الملابس الخارجية تستغرق وقتاً أطول: البطانة والحشو والإكسسوارات والكي بالبخار مشمولة.',
    },
    price: 2500,
  },
  {
    slug: 'poshiv-kostyuma',
    name: {
      ru: 'Пошив костюма и комплекта',
      en: 'Suit and set production',
      ar: 'خياطة البدلات والأطقم',
    },
    summary: {
      ru: 'Костюмы и комплекты из двух-трёх вещей: крой, пошив, отпарка и упаковка.',
      en: 'Suits and sets of two or three pieces: cutting, stitching, pressing and packing.',
      ar: 'بدلات وأطقم من قطعتين أو ثلاث: قص، خياطة، كي وتغليف.',
    },
    paragraph: {
      ru: 'Работа без ткани, от десяти комплектов. Комплект считается одной ставкой; сколько в нём вещей, согласуем до запуска.',
      en: 'Work only, without fabric, from ten sets. A set is one rate; how many pieces it holds is agreed before the run.',
      ar: 'العمل فقط، دون قماش، من عشرة أطقم. يُحسب الطقم بقيمة واحدة؛ وعدد قطعه نتفق عليه قبل بدء الدفعة.',
    },
    price: 3000,
  },
]

/*
 * What the workshop does for somebody else's label: a run sewn from the client's own patterns.
 *
 * Priced after a look, because it is — the cloth, the cut and the count decide the sum, and the
 * workshop says so everywhere. It asks with the very questionnaire the wholesale page already
 * draws, the one that counts: a service with no number of its own is where a counting form belongs,
 * and the fork that form shows IS the rough answer. Nothing about that page changes.
 *
 * No service carries a cover: one pictured card in a grid of nine draws eight empty frames, and the
 * works themselves are shown by the catalogue. These cards are read for the price.
 */
export async function seedSaimaServices(siteId: SiteId, tx: Db | Transaction) {
  const form = await findFormBySlug(siteId, REQUEST_FORM, tx)
  if (!form) throw new Error('saima: the batch request form is not seeded yet')
  const places = (await listPlaces(siteId, tx)).map((place) => String(place.id))
  const group = await createGroup(
    siteId,
    {
      slug: SEWING_GROUP,
      name: { ru: 'Пошив', en: 'Sewing', ar: 'الخياطة' },
      summary: {
        ru: 'Пошив партии по нашим моделям или вашим лекалам: работа без ткани, от десяти штук.',
        en: 'Batch production to our models or your patterns: work only, without fabric, from ten pieces.',
        ar: 'إنتاج الدفعات وفق موديلاتنا أو بتروناتكم: العمل فقط دون قماش، من عشر قطع.',
      },
    },
    tx,
  )
  const shared = {
    groupId: group.id,
    status: 'published' as const,
    venue: 'place' as const,
    placeIds: places,
    formId: String(form.id),
  }
  const unit = { ru: 'шт', en: 'pc', ar: 'قطعة' }

  // Read as the price list, top to bottom: the six shelves of the catalogue first, the work by
  // somebody else's patterns after them, then the one-off jobs.
  for (const piece of PIECES) {
    await createService(
      siteId,
      null,
      {
        ...shared,
        slug: piece.slug,
        name: piece.name,
        summary: piece.summary,
        description: {
          blocks: [{ type: 'paragraph' as const, data: { text: piece.paragraph } }],
        },
        pricing: 'from',
        basis: 'unit',
        unit,
        unitKey: 'pcs',
        price: toMinor(piece.price, SAIMA_ORG.currency),
      },
      tx,
    )
  }

  await createService(
    siteId,
    null,
    {
      ...shared,
      slug: SEWING,
      name: {
        ru: 'Пошив по вашим лекалам',
        en: 'Production from your patterns',
        ar: 'الخياطة وفق بتروناتكم',
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
                ru: 'Берём тиражи от десяти единиц. По лекалам заказчика шьём сразу; с готовой вещи сначала снимаем лекала и отшиваем образец, тираж запускаем после его утверждения.',
                en: 'We take runs from ten pieces. From your patterns we sew straight away; from a finished garment we first draft patterns and sew a sample, and the run starts once it is approved.',
                ar: 'نقبل الدفعات من عشر قطع. نخيط مباشرة حسب باترونات العميل؛ ومن قطعة جاهزة نرسم الباترون أولاً ونخيط عيّنة، وتبدأ الدفعة بعد اعتمادها.',
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
    },
    tx,
  )

  await createService(
    siteId,
    null,
    {
      ...shared,
      slug: 'razrabotka-lekal',
      name: {
        ru: 'Разработка лекал с образца',
        en: 'Pattern drafting from a sample',
        ar: 'رسم الباترون من عينة',
      },
      summary: {
        ru: 'Снимаем лекала с готовой вещи и отшиваем образец до запуска тиража.',
        en: 'We draft patterns from a finished garment and sew a sample before the run.',
        ar: 'نرسم الباترون من قطعة جاهزة ونخيط عينة قبل بدء الدفعة.',
      },
      description: {
        blocks: [
          {
            type: 'paragraph' as const,
            data: {
              text: {
                ru: 'Разовая работа, не за штуку. Лекала остаются в цехе: по ним шьём повторные тиражи. Образец оплачивается отдельно.',
                en: 'A one-off job, not per piece. The patterns stay at the workshop and carry repeat runs. The sample is paid apart.',
                ar: 'عمل لمرة واحدة، وليس لكل قطعة. تبقى البترونات في الورشة وتُستخدم للدفعات المتكررة. وتُدفع العينة منفصلة.',
              },
            },
          },
        ],
      },
      pricing: 'fixed',
      price: toMinor(2500, SAIMA_ORG.currency),
    },
    tx,
  )

  await createService(
    siteId,
    null,
    {
      ...shared,
      slug: 'signalnyj-obrazec',
      name: { ru: 'Сигнальный образец', en: 'Prototype sample', ar: 'عينة نموذجية' },
      summary: {
        ru: 'Одна вещь до запуска тиража: проверяете посадку, швы и ткань.',
        en: 'One piece before the run: you check the fit, the seams and the cloth.',
        ar: 'قطعة واحدة قبل بدء الدفعة: تفحصون القصة والدرزات والقماش.',
      },
      description: {
        blocks: [
          {
            type: 'paragraph' as const,
            data: {
              text: {
                ru: 'Разовая работа, не за штуку. Образец шьём по вашим или нашим лекалам; после вашего «да» запускаем тираж. Образец остаётся у вас.',
                en: 'A one-off job, not per piece. The sample is sewn to your patterns or ours; the run starts after your yes. The sample stays with you.',
                ar: 'عمل لمرة واحدة، وليس لكل قطعة. نخيط العينة وفق بتروناتكم أو بتروناتنا؛ وتبدأ الدفعة بعد موافقتكم. وتبقى العينة لديكم.',
              },
            },
          },
        ],
      },
      pricing: 'fixed',
      price: toMinor(800, SAIMA_ORG.currency),
    },
    tx,
  )
}
