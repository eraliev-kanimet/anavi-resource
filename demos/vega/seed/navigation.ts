import type { LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createSelection } from '@anavi/backend/src/modules/catalog/selection.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { findImage } from '../../../seed/lib/assets'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Two of the source's categories are shelves and become categories here; the rest are saved filters,
// which is exactly what a selection is. `category` on a selection restores the tree the transfer
// would otherwise lose: «For gaming» lives inside «Laptops», not beside it.
interface SectionPick {
  slug: string
  name: LocalizedLabel
  values?: string
  price?: string
}

interface Section {
  slug: string
  name: LocalizedLabel
  type: string
  description: LocalizedLabel
  selections: SectionPick[]
}

// Prices are in minor units, exactly as the catalogue stores them.
const SECTIONS: Section[] = [
  {
    slug: 'laptop',
    name: { ru: 'Ноутбуки', en: 'Laptops', ar: 'أجهزة الكمبيوتر المحمولة' },
    type: 'laptop',
    description: {
      ru: 'Ноутбуки для работы, учёбы и игр: от лёгких ультрабуков до мощных станций с дискретной графикой.',
      en: 'Laptops for work, study, and gaming: from lightweight ultrabooks to high-performance workstations with discrete graphics.',
      ar: 'أجهزة كمبيوتر محمولة للعمل والدراسة والألعاب: من الألترا بوك الخفيفة إلى محطات العمل القوية ببطاقات رسومات منفصلة.',
    },
    selections: [
      {
        slug: 'igrovye-noutbuki',
        name: { ru: 'Игровые ноутбуки', en: 'Gaming laptops', ar: 'أجهزة كمبيوتر محمولة للألعاب' },
        values: 'gpu.gpu-type:discrete',
      },
      {
        slug: 'noutbuki-dlya-raboty',
        name: { ru: 'Для работы и учёбы', en: 'For work and study', ar: 'للعمل والدراسة' },
        values: 'gpu.gpu-type:integrated',
      },
      {
        slug: 'noutbuki-oled',
        name: { ru: 'С OLED-экраном', en: 'With OLED display', ar: 'بشاشة OLED' },
        values: 'display.matrix-type:oled',
      },
      {
        slug: 'byudzhetnye-noutbuki',
        name: {
          ru: 'Бюджетные ноутбуки',
          en: 'Budget laptops',
          ar: 'أجهزة كمبيوتر محمولة اقتصادية',
        },
        price: '..6000000',
      },
      {
        slug: 'premialnye-noutbuki',
        name: {
          ru: 'Премиальные ноутбуки',
          en: 'Premium laptops',
          ar: 'أجهزة كمبيوتر محمولة فاخرة',
        },
        price: '30000000..',
      },
    ],
  },
  {
    slug: 'phone',
    name: { ru: 'Смартфоны', en: 'Smartphones', ar: 'الهواتف الذكية' },
    type: 'phone',
    description: {
      ru: 'Смартфоны с гарантией: флагманы, рабочие лошадки и модели на каждый день.',
      en: 'Smartphones with warranty: flagships, everyday workhorses, and daily drivers.',
      ar: 'هواتف ذكية مع ضمان: هواتف رائدة، وأجهزة عملية للاستخدام اليومي.',
    },
    selections: [
      {
        slug: 'igrovye-smartfony',
        name: { ru: 'Игровые от 120 Гц', en: 'Gaming, 120 Hz and up', ar: 'ألعاب 120 هرتز فأكثر' },
        // A number has no dictionary entry to be pinned by: a bare `120` reads as the address of
        // one and matches nothing. The open range also takes in the 144 Hz phone added tomorrow.
        values: 'display.refresh-rate:120..',
      },
      {
        slug: 'smartfony-5g',
        name: { ru: 'С поддержкой 5G', en: 'With 5G support', ar: 'بدعم 5G' },
        values: 'network:5g',
      },
      {
        slug: 'iphone',
        name: { ru: 'Apple iPhone', en: 'Apple iPhone', ar: 'Apple iPhone' },
        values: 'mobile-os:ios',
      },
      {
        slug: 'byudzhetnye-smartfony',
        name: { ru: 'Бюджетные смартфоны', en: 'Budget smartphones', ar: 'هواتف ذكية اقتصادية' },
        price: '..2000000',
      },
      {
        slug: 'flagmanskie-smartfony',
        name: { ru: 'Флагманские смартфоны', en: 'Flagship smartphones', ar: 'هواتف ذكية رائدة' },
        price: '10000000..',
      },
    ],
  },
]

export async function seedNavigation(siteId: SiteId, tx: Db | Transaction) {
  const categories = new Map<string, bigint>()

  for (const [index, section] of SECTIONS.entries()) {
    const category = await createCategory(
      siteId,
      {
        slug: section.slug,
        name: section.name,
        type: section.type,
        description: {
          blocks: [{ type: 'paragraph', data: { text: section.description } }],
        },
        position: index,
      },
      tx,
    )
    categories.set(section.slug, category.id)
    await cover(siteId, 'category', category.id, section.slug, section.name, tx)

    for (const [order, selection] of section.selections.entries()) {
      const shelf = await createSelection(
        siteId,
        {
          slug: selection.slug,
          name: selection.name,
          category: section.slug,
          mode: 'filter',
          shelf: {
            category: section.slug,
            ...(selection.values ? { values: selection.values.split(',') } : {}),
            ...(selection.price ? { price: selection.price } : {}),
          },
          position: index * 10 + order,
        },
        tx,
      )
      await cover(siteId, 'selection', shelf.id, selection.slug, selection.name, tx)
    }
  }

  return categories
}

// The file is named after the slug, so adding a section means adding one image; a section whose
// picture is missing goes without one rather than stopping the seed.
async function cover(
  siteId: SiteId,
  owner: 'category' | 'selection',
  id: bigint,
  slug: string,
  name: LocalizedLabel,
  tx: Db | Transaction,
) {
  const image = (await findImage(`demos/vega/categories/${slug}.png`)) ?? null
  if (!image) return
  await attachMedia(
    siteId,
    owner,
    id,
    { key: image.key, width: image.width, height: image.height, caption: name },
    tx,
  )
}
