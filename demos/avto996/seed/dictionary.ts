import type { FilterWidget, PropertyKind } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createGroup } from '@anavi/backend/src/modules/dictionary/group.service'
import { createProperty, createValue } from '@anavi/backend/src/modules/dictionary/property.service'
import {
  createType,
  setTypeProperties,
  setTypeSummary,
} from '@anavi/backend/src/modules/dictionary/type.service'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { ru } from '../../../seed/lib/labels'

export interface LotCar {
  slug: string
  // what is stamped on the car itself
  vin: string
  name: string
  shelf: string
  make: string
  makeName: string
  year: number
  mileage: number
  // whole dollars, as the seller wrote it
  price: number
  photos: string[]
  characteristics: Record<string, string | number | boolean>
}

const GROUPS = [
  { slug: 'main', name: 'Основное' },
  { slug: 'engine', name: 'Двигатель и привод' },
  { slug: 'deal', name: 'Документы и сделка' },
]

interface PropertyDef {
  slug: string
  name: string
  kind: PropertyKind
  group: string
  unit?: string
  filter?: FilterWidget
  // A fact of this one car and never of its model: a page about the model never fills it.
  piece?: boolean
}

/*
 * The year is a DICTIONARY and not a number, and that is a workaround written down rather than a
 * preference: a numeric value is printed with the locale's digit grouping, so a car of 2022 would
 * read «2 022». A list of years ticks like any other facet and prints as it was typed; what it costs
 * is the «from — to» slider a year deserves.
 */
const PROPERTIES: PropertyDef[] = [
  { slug: 'make', name: 'Марка', kind: 'enum', group: 'main', filter: 'checkbox' },
  {
    slug: 'year',
    name: 'Год выпуска',
    kind: 'enum',
    group: 'main',
    filter: 'checkbox',
    piece: true,
  },
  {
    slug: 'mileage',
    name: 'Пробег',
    kind: 'number',
    group: 'main',
    unit: 'km',
    filter: 'range',
    piece: true,
  },
  { slug: 'body', name: 'Кузов', kind: 'enum', group: 'main', filter: 'checkbox' },
  { slug: 'color', name: 'Цвет', kind: 'color', group: 'main', piece: true },
  { slug: 'steering', name: 'Руль', kind: 'enum', group: 'main', piece: true },
  { slug: 'state', name: 'Состояние', kind: 'enum', group: 'main', piece: true },
  // Which of the three lots the car stands on: the first thing asked on the telephone, and a facet
  // because a buyer from the south of the city looks at the nearest lot before the rest.
  { slug: 'lot', name: 'Площадка', kind: 'enum', group: 'main', filter: 'checkbox', piece: true },
  { slug: 'fuel', name: 'Топливо', kind: 'enum', group: 'engine', filter: 'checkbox' },
  { slug: 'engine-volume', name: 'Объём двигателя', kind: 'number', group: 'engine', unit: 'l' },
  { slug: 'power', name: 'Мощность', kind: 'number', group: 'engine', unit: 'hp' },
  { slug: 'transmission', name: 'Коробка', kind: 'enum', group: 'engine', filter: 'checkbox' },
  { slug: 'drive', name: 'Привод', kind: 'enum', group: 'engine', filter: 'checkbox' },
  { slug: 'registration', name: 'Учёт', kind: 'enum', group: 'deal', piece: true },
  { slug: 'customs-cleared', name: 'Растаможена', kind: 'bool', group: 'deal', piece: true },
  { slug: 'freshly-imported', name: 'Свежепригнана', kind: 'bool', group: 'deal', piece: true },
  { slug: 'tax-paid', name: 'Налог уплачен', kind: 'bool', group: 'deal', piece: true },
  {
    slug: 'inspection-passed',
    name: 'Техосмотр пройден',
    kind: 'bool',
    group: 'deal',
    piece: true,
  },
  { slug: 'exchange', name: 'Обмен', kind: 'enum', group: 'deal', piece: true },
  { slug: 'installment', name: 'Рассрочка', kind: 'bool', group: 'deal', piece: true },
]

// The source's own words for its own codes, in the order a seller reads them out.
const LABELS: Record<string, Record<string, string>> = {
  body: {
    sedan: 'Седан',
    suv: 'Кроссовер',
    wagon: 'Универсал',
    pickup: 'Пикап',
    minivan: 'Минивэн',
  },
  steering: { left: 'Слева', right: 'Справа' },
  state: { perfect: 'Идеальное', good: 'Хорошее' },
  lot: { 'archa-beshik': 'Арча-Бешик', 'ak-orgo': 'Ак-Орго', 'ala-too': 'Ала-Тоо' },
  fuel: {
    petrol: 'Бензин',
    diesel: 'Дизель',
    hybrid: 'Гибрид',
    gas: 'Газ / бензин',
  },
  transmission: { automatic: 'Автомат', cvt: 'Вариатор', robot: 'Робот' },
  drive: { front: 'Передний', rear: 'Задний', full: 'Полный' },
  registration: { kg: 'Кыргызстан', none: 'Не стоит на учёте' },
  exchange: {
    no: 'Не предлагать',
    any: 'Рассмотрим варианты',
    surcharge: 'С доплатой покупателя',
    'seller-surcharge': 'С нашей доплатой',
  },
}

const COLORS: Record<string, { label: string; swatch: string }> = {
  white: { label: 'Белый', swatch: '#f4f4f2' },
  black: { label: 'Чёрный', swatch: '#1b1b1d' },
  silver: { label: 'Серебристый', swatch: '#c3c6ca' },
  grey: { label: 'Серый', swatch: '#7b7f85' },
  blue: { label: 'Синий', swatch: '#2f5fa8' },
  red: { label: 'Красный', swatch: '#b3262b' },
  green: { label: 'Зелёный', swatch: '#3f6b4c' },
  brown: { label: 'Коричневый', swatch: '#6d4c3a' },
  'other-color': { label: 'Другой', swatch: '#a58fb5' },
}

// What a buyer reads under the name before opening the card: how far it has gone, what it burns
// and what it shifts with. The year is in the name already and the price stands beside it.
const SUMMARY = ['{mileage}', '{engine-volume} {fuel}', '{transmission}']

/**
 * The words a lot describes a car in — and only the ones these forty cars actually use.
 *
 * A dictionary carrying every body style the source knew would open the filter on «Кабриолет (0)».
 * Values are written from the cars themselves, so the facet lists what is on the lot and nothing
 * else; a code the tables above cannot name fails here, which is where a new arrival with a new
 * word should be noticed.
 */
export async function seedDictionary(
  siteId: SiteId,
  cars: readonly LotCar[],
  tx: Db | Transaction,
): Promise<void> {
  for (const group of GROUPS)
    await createGroup(siteId, { slug: group.slug, name: ru(group.name) }, tx)

  const ids = new Map<string, bigint>()
  for (const property of PROPERTIES) {
    const row = await createProperty(
      siteId,
      {
        slug: property.slug,
        name: ru(property.name),
        kind: property.kind,
        unit: property.unit ?? null,
        group: property.group,
        piece: property.piece ?? false,
        // a filter is turned on by the kind of goods below, never dictionary-wide
        isFilterable: false,
      },
      tx,
    )
    ids.set(property.slug, row.id)
  }

  const makes = new Map(cars.map((car) => [car.make, car.makeName]))
  for (const [slug, label] of [...makes].sort((a, b) => a[1].localeCompare(b[1])))
    await createValue(siteId, ids.get('make')!, { slug, label: ru(label) }, tx)

  // Newest first: that is the end of the list a buyer starts from.
  for (const year of [...new Set(cars.map((car) => car.year))].sort((a, b) => b - a))
    await createValue(siteId, ids.get('year')!, { slug: String(year), label: ru(String(year)) }, tx)

  for (const [property, labels] of Object.entries(LABELS)) {
    const used = new Set(cars.map((car) => car.characteristics[property]))
    for (const [slug, label] of Object.entries(labels))
      if (used.has(slug))
        await createValue(siteId, ids.get(property)!, { slug, label: ru(label) }, tx)
    for (const code of used)
      if (typeof code === 'string' && !(code in labels))
        throw new Error(`avto996: no word for ${property} «${code}»`)
  }

  const painted = new Set(cars.map((car) => car.characteristics.color))
  for (const [slug, color] of Object.entries(COLORS))
    if (painted.has(slug))
      await createValue(
        siteId,
        ids.get('color')!,
        { slug, label: ru(color.label), swatch: color.swatch },
        tx,
      )

  // A used car is one of a kind: its frame is its own photograph, never redrawn, dents and all.
  // A buyer of a car looks at it from every side: its card keeps every photograph, the first few shot
  // by the studio and the rest made to the frame's ratio and sharpness.
  const type = await createType(
    siteId,
    { slug: 'car', name: ru('Автомобиль'), singular: true, framesAll: true, frameFinish: 'fitted' },
    tx,
  )
  await setTypeProperties(
    siteId,
    type.id,
    {
      properties: PROPERTIES.map((property) => ({
        property: property.slug,
        group: property.group,
        isFilterable: property.filter !== undefined,
        filterWidget: property.filter ?? null,
      })),
    },
    tx,
  )
  await setTypeSummary(
    siteId,
    type.id,
    { segments: SUMMARY.map((template) => ({ template: ru(template) })) },
    tx,
  )
}
