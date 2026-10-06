import type { SeedPlace } from '../places'

// One counter, and the address is what a person actually says on the telephone: the row, not the
// building. A butcher has one place; a second would be a second business.
export const KHALIF_PLACES: SeedPlace[] = [
  {
    name: {
      ru: 'Лавка на Ошском рынке',
      en: 'The counter at Osh bazaar',
      ar: 'المحل في سوق أوش',
    },
    address: {
      ru: 'Ошский рынок, мясной ряд, место 14 · вход с ул. Кулатова',
      en: 'Osh bazaar, meat row, stall 14 · entrance from Kulatov St',
      ar: 'سوق أوش، صف اللحوم، محل 14 · المدخل من شارع كولاتوف',
    },
    phone: '+996 555 430 770',
    lat: 42.8687,
    lng: 74.5824,
    url: 'https://2gis.kg/bishkek/search/%D0%9E%D1%88%D1%81%D0%BA%D0%B8%D0%B9%20%D1%80%D1%8B%D0%BD%D0%BE%D0%BA',
  },
]
