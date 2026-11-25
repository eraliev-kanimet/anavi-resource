import type { SeedPayment } from '../../../seed/lib/requisite'
import type { SeedPlace } from '../../../seed/lib/places'

/*
 * «Signal» — a network-equipment shop in the Bishkek department store, moved here from the archived
 * Mokuroku project it was first made in.
 *
 * It is the demo of a catalogue whose cards are answered by their characteristics: a buyer comes
 * with «Wi-Fi 6, four gigabit ports» or «4G with an outdoor antenna», and the filters are different
 * for a router, a switch, a radio bridge and a cable. So the dictionary has six kinds of goods and
 * each section belongs to one of them; Vega does the same with two.
 *
 * The material was written once, for the shop it is drawn from, and moved as it was: one language,
 * prices in som, one point. Nothing here touches another demo.
 */
export const SIGNAL_ORG = {
  name: 'Signal',
  slug: 'signal',
  defaultLocale: 'ru',
  locales: ['ru'],
  currency: 'KGS' as const,
  country: 'KG' as const,
  tagline: { ru: 'Сетевое оборудование в Бишкеке: роутеры, коммутаторы, 4G и усиление сигнала' },
  about: {
    ru: 'Signal — магазин сетевого оборудования в ЦУМе, на Чуй, 155. Продаём и помогаем настроить маршрутизаторы MikroTik, Wi-Fi роутеры, коммутаторы, точки доступа, 4G и 5G, антенны и усилители сигнала — для квартиры, офиса и объектов за городом. Работаем с оригинальным оборудованием, гарантия производителя на всё.',
  },
  deliveryNote: {
    ru: 'Самовывоз из магазина в день заказа, доставка по Бишкеку, транспортной компанией по Кыргызстану от 1 до 3 дней',
  },
  paymentNote: {
    ru: 'Наличные, перевод по QR, безналичный расчёт для организаций',
  },
  warrantyNote: { ru: 'Гарантия производителя, обычно 12 месяцев' },
  // One price for the whole city is one district, and the buyer is not asked where they live; the
  // regions go by a carrier, whose price is named when the order is confirmed.
  zones: [
    {
      name: { ru: 'Доставка по Бишкеку' },
      fee: 25000,
      freeFrom: 1500000,
    },
  ],
  channels: { whatsapp: '+996558039979' },
  mapProvider: 'twogis' as const,
  features: { goods: true, stock: true, cart: true, favorites: true },
  fulfilments: ['pickup' as const, 'delivery' as const],
  // What the shop has not got on the shelf is brought for the buyer: the basket may ask for more than
  // the shelf holds, and the ORDER becomes an estimate the shop confirms with the date.
  shortage: 'request' as const,
  payment: {
    label: 'MBank',
    merchant: 'ОсОО Хетвок',
    city: 'Бишкек',
    country: 'KG',
    currency: '417',
    mcc: '5732',
    account: '1234567890123456',
    scheme: 'KG.DEMOBANK',
  } satisfies SeedPayment,
  theme: {
    look: 'retail' as const,
    font: 'modern' as const,
    accent: '#0e7490',
    radius: 'sm' as const,
    register: 'light' as const,
  },
}

export const SIGNAL_PLACES: SeedPlace[] = [
  {
    city: 'bishkek',
    name: { ru: 'Магазин Signal в ЦУМе' },
    address: { ru: 'ЦУМ, проспект Чуй, 155, 4 этаж, A1' },
    phone: '+996 558 039 979',
    email: 'trade@signal.kg',
    hours: { ru: 'Пн–Сб 10:00–20:00' },
    lat: 42.876499,
    lng: 74.614196,
  },
]

export interface SignalProperty {
  slug: string
  name: string
  kind: 'enum' | 'number' | 'bool' | 'text'
  unit?: string
  multiple?: boolean
  group: string
  values?: { slug: string; label: string }[]
}

export interface SignalDictionary {
  groups: { slug: string; name: string }[]
  properties: SignalProperty[]
}

export interface SignalType {
  slug: string
  name: string
  categories: string[]
  properties: {
    property: string
    filter: boolean
    widget: 'checkbox' | 'range' | 'boolean' | null
  }[]
}

export interface SignalCategory {
  slug: string
  name: string
}

export type SignalValue =
  | { property: string; value: string }
  | { property: string; number: number }
  | { property: string; bool: boolean }
  | { property: string; text: string }

export interface SignalProduct {
  slug: string
  category: string
  article: string
  name: string
  price: number
  inStock: boolean
  photos: string[]
  values: SignalValue[]
  text: string[]
}

export interface SignalQuestion {
  group: string
  question: string
  answer: string[]
}
