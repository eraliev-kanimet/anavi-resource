import type { SeedPayment } from '../../../seed/lib/requisite'
import type { SeedPlace } from '../../../seed/lib/places'

/*
 * «Лаванда» — a household-chemicals and everyday-goods shop that learned to take orders, moved here
 * from the archived Mokuroku project it was first made in.
 *
 * It is the second shop of the Dyikan kind: delivery only, a basket, zones, and a till that takes a
 * transfer or cash at the door. What it adds is the questionnaire after the delivery, which the
 * market does not run. The material is one language and seventy-odd goods with one photograph each.
 */
export const LAVANDA_ORG = {
  name: 'Лаванда',
  slug: 'lavanda',
  defaultLocale: 'ru',
  locales: ['ru'],
  currency: 'KGS' as const,
  country: 'KG' as const,
  tagline: { ru: 'Бытовая химия и хозтовары с доставкой по Бишкеку' },
  about: {
    ru: 'Лаванда — отдел бытовой химии, который научился принимать заказы: стирка, уборка, посуда, гигиена и мелочи для дома с доставкой в день заказа. Семьдесят с лишним позиций по разделам, цена за штуку, фасовка в карточке.',
  },
  deliveryNote: {
    ru: 'Привозим в день заказа с 10:00 до 20:00. Заказы после 18:00 — на следующее утро',
  },
  paymentNote: { ru: 'Перевод по QR или наличные курьеру' },
  warrantyNote: { ru: 'Не подошло — заберём и вернём деньги' },
  zones: [
    { name: { ru: 'Город' }, fee: 15000, freeFrom: 150000 },
    { name: { ru: 'Дальние жилмассивы' }, fee: 25000, freeFrom: null },
  ],
  channels: { whatsapp: '+996312660440' },
  mapProvider: 'twogis' as const,
  features: { goods: true, stock: true, cart: true, favorites: true },
  fulfilments: ['delivery' as const],
  payWays: ['transfer' as const, 'cash' as const],
  minDelivery: 50000,
  productPages: false,
  payment: {
    label: 'MBank',
    merchant: 'Лаванда',
    city: 'Бишкек',
    country: 'KG',
    currency: '417',
    mcc: '5499',
    account: '1234567890123456',
    scheme: 'KG.DEMOBANK',
  } satisfies SeedPayment,
  theme: {
    look: 'retail' as const,
    font: 'modern' as const,
    accent: '#7c3aed',
    radius: 'md' as const,
    register: 'light' as const,
  },
}

export const LAVANDA_PLACES: SeedPlace[] = [
  {
    city: 'bishkek',
    name: { ru: 'Лаванда на Моссовете' },
    address: { ru: 'улица Киевская, 148, цокольный этаж' },
    phone: '+996 312 660 440',
    email: 'zakaz@lavanda.kg',
    hours: { ru: 'Ежедневно 09:00–20:00' },
    lat: 42.8746,
    lng: 74.5934,
  },
]

export interface LavandaProperty {
  slug: string
  name: string
  filter: boolean
  values: { slug: string; label: string }[]
}

export interface LavandaCategory {
  slug: string
  name: string
  description: string
}

export interface LavandaProduct {
  slug: string
  category: string
  article: string
  name: string
  price: number
  oldPrice: number | null
  inStock: boolean
  hit: boolean
  photo: string
  values: { property: string; value: string }[]
  text: string[]
}

export interface LavandaHome {
  hits: string[]
  steps: { title: string; text: string }[]
}

export interface LavandaPrivacy {
  title: string
  text: string[]
}
