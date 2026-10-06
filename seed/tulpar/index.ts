import type { LocalizedLabel, StaffRole } from '@anavi/shared'

/*
 * «Тулпар» — a logistics operator, the seventh demo standing and the first with NO catalogue.
 *
 * It keeps other businesses' goods, picks their orders, carries them around the city and between
 * cities, and brings parcels from Guangzhou — so its clients are the other six demos, and what it
 * sells is never on a shelf. Goods are switched off; the site is pages, a tariff, a calculator and
 * tracking. There is no entity of a service here and the demo exists partly to show that none is
 * needed.
 *
 * Its WORDS are data and live beside its photographs (`tulpar/site.json`, `content.json`,
 * `tariffs.json`), unlike every earlier demo, whose texts are typed into the seed. A catalogue is a
 * fixture a compiler can check; seven pages of prose are not, and prose in a TypeScript file is
 * prose a person edits through escaped quotes. What stays here is what a compiler CAN hold — the
 * shape the file is read by, and the settings that are decisions rather than copy.
 *
 * The material is INVENTED, the way the butcher's was: see `DEFERRED.md`.
 */
export interface TulparPlace {
  key: string
  image: string
  name: LocalizedLabel
  address: LocalizedLabel
  hours: LocalizedLabel
  phone: string
  note: LocalizedLabel
  lat: number
  lng: number
  isPickup: boolean
}

export interface TulparStaff {
  login: string
  role: StaffRole
  name: string
  title: LocalizedLabel
}

export interface TulparSite {
  org: {
    name: string
    slug: string
    tagline: LocalizedLabel
    about: LocalizedLabel
    phone: string
    email: string
  }
  places: TulparPlace[]
  staff: TulparStaff[]
}

export const TULPAR = {
  // What an invoice names the operator by when it is the one buying.
  legal: {
    taxId: 'ИНН 02104201810126',
    address: 'Кыргызская Республика, г. Бишкек, ул. Льва Толстого, 126/4',
    bank: 'ОАО «Демо Банк», БИК 109018, р/с 1240020003816455',
  },
  defaultLocale: 'ru',
  // Two, and Russian first: the clients are Bishkek shops, and English is for the expatriate with
  // six boxes and the supplier reading the terms from abroad.
  locales: ['ru', 'en'],
  currency: 'KGS' as const,
  country: 'KG' as const,
  // What one dollar is worth here — the cargo line quotes in dollars, and a parcel's price is that
  // sum turned into the site's money at the site's own sign.
  dollar: 87.5,
  mapProvider: 'twogis' as const,
  /*
   * Carriage on, goods OFF — the first site born with a catalogue that switches it off. Readers on,
   * because a cargo client has to sign in to be shown a code; payments on, because carriage is paid
   * for. No basket and no shortlist: there is nothing to put in either.
   */
  features: { goods: false, shipments: true, payments: true, readers: true },
  // The brand storefront and not the shop floor: there is no shelf to stand a visitor in front of.
  theme: {
    look: 'showcase' as const,
    font: 'technical' as const,
    accent: '#1f5f8b',
    radius: 'sm' as const,
    register: 'light' as const,
  },
  payments: [
    {
      label: 'MBank, сомы',
      merchant: 'ОсОО Тулпар Логистик',
      city: 'Бишкек',
      country: 'KG',
      // ISO 4217 numeric; 4215 is the merchant category for couriers and freight forwarders.
      currency: '417',
      mcc: '4215',
      account: '1240020003816455',
      scheme: 'KG.DEMOBANK',
    },
    // The second account is the cargo line's: a client who was quoted in dollars pays in dollars.
    {
      label: 'Demir Bank, доллары',
      merchant: 'ОсОО Тулпар Логистик',
      city: 'Бишкек',
      country: 'KG',
      currency: '840',
      mcc: '4215',
      account: '1180000094127730',
      scheme: 'KG.DEMOBANK',
    },
  ],
}
