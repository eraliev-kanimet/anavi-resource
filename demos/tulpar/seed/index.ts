import type { LocalizedLabel, StaffRole } from '@anavi/shared'

/*
 * «Тулпар» — a logistics operator, the seventh demo standing and the first with NO catalogue.
 *
 * It keeps other businesses' goods, picks their orders, carries them around the city and between
 * cities, and brings parcels from Guangzhou — so its clients are the other six demos, and what it
 * sells is never on a shelf. Goods are switched off; the site is pages, a tariff, a calculator and
 * tracking. Services are switched on as well — it works under another site's definitions — but it
 * keeps no catalogue of its own.
 *
 * Its WORDS are data and live beside its photographs (`demos/tulpar/site.json`, `content.json`,
 * `tariffs.json`), unlike every earlier demo, whose texts are typed into the seed. A catalogue is a
 * fixture a compiler can check; seven pages of prose are not, and prose in a TypeScript file is
 * prose a person edits through escaped quotes. What stays here is what a compiler CAN hold — the
 * shape the file is read by, and the settings that are decisions rather than copy.
 *
 * The material is INVENTED, the way the butcher's was: see `DEMO.md`.
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
  // The city a pickup point stands in, by the platform's own key (`CITIES` in `shared`) — the one
  // two SITES agree on, and the one the carrier's own list of cities is chosen by.
  cityKey?: string
}

export interface TulparStaff {
  login: string
  role: StaffRole
  name: string
  title: LocalizedLabel
  // The pickup counters this person stands at, by the key of the place: a point operator works at one.
  stands?: string[]
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
  // What an invoice names the operator by when it is the one buying.
  legal: { taxId: string; address: string; bank: string }
  // The accounts a client is shown to pay into, one per currency the carrier is paid in.
  payments: {
    label: string
    merchant: string
    city: string
    country: string
    currency: string
    mcc: string
    account: string
    scheme: string
  }[]
  places: TulparPlace[]
  staff: TulparStaff[]
}

export const TULPAR = {
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
   * Carriage on with both its halves — cargo from China and trips between cities — and goods OFF:
   * the first site born with a catalogue that switches it off. A warehouse all the same: it keeps
   * Vega's pallets on its floor. Readers on, because a cargo client has to sign in to be shown a
   * code. No basket and no shortlist: there is nothing to put in either.
   */
  features: { stock: true, shipments: true, cargo: true, trips: true, readers: true },
  // The brand storefront and not the shop floor: there is no shelf to stand a visitor in front of.
  theme: {
    look: 'showcase' as const,
    font: 'technical' as const,
    accent: '#1f5f8b',
    radius: 'sm' as const,
    register: 'light' as const,
  },
}
