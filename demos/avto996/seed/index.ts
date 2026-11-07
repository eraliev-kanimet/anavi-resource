import { quoteRate } from '@anavi/shared'
import type { SeedPlace } from '../../../seed/lib/places'

/*
 * «Авто996» — a used-car lot, and the smallest demo on purpose.
 *
 * Every other demo shows how far the platform goes; this one shows how little a business needs to
 * take. A reseller keeps forty cars on three rented yards and a telephone: a catalogue with
 * a filter, a page of contacts and a request that lands in the inbox. No basket, no till, no
 * readers, no partners, no carrier — and nothing here touches another demo, so it can be removed or
 * replaced without reading a line of anybody else's script.
 *
 * The cars are not invented: they are listings collected for the archived marketplace project this
 * material was moved from, with the facts as their sellers stated them. See `DEMO.md` for what that
 * means for the photographs.
 */
export const AVTO_ORG = {
  name: 'Авто996',
  slug: 'avto996',
  // One language, like the lot it is drawn from: the material carries Russian only, and a second
  // locale would be forty cards translated by nobody.
  defaultLocale: 'ru',
  locales: ['ru'],
  // Cars on this market are priced in dollars and paid in whatever the buyer brings, so the shop
  // counts in dollars and is READ in som at the rate it hangs out itself.
  currency: 'USD' as const,
  country: 'KG' as const,
  rates: { KGS: quoteRate(87.5, 'USD', 'KGS') },
  tagline: { ru: 'Автомобили с пробегом в наличии в Бишкеке' },
  about: {
    ru: 'Авто996 — три площадки в жилмассивах Бишкека: Арча-Бешик, Ак-Орго и Ала-Тоо. Привозим машины из Кореи, Европы и США, часть берём у владельцев в городе. Всё, что на сайте, стоит на одной из площадок, и в карточке написано, на какой: приезжайте смотреть со своим мастером, документы покажем до разговора о цене.',
  },
  deliveryNote: { ru: 'Осмотр на трёх площадках каждый день с 9:00 до 19:00' },
  paymentNote: { ru: 'Наличные или перевод, по части машин возможен обмен' },
  warrantyNote: { ru: 'Проверка у вашего мастера до сделки' },
  channels: { whatsapp: '+996555712040' },
  mapProvider: 'twogis' as const,
  // Goods and nothing else. The price of a car is talked over, so there is no basket to put it in;
  // each switch is answered on its own, and here every one but the first is «no».
  features: { goods: true, stock: true, trade_in: true },
  // A car is photographed where it stands, so the picture is a scene and fills the card.
  fillsCard: true,
  theme: {
    look: 'showcase' as const,
    font: 'modern' as const,
    accent: '#c8452f',
    radius: 'sm' as const,
    register: 'light' as const,
  },
}

// Three lots, each in a housing estate on the edge of the city and none on the car market: that is
// where a reseller of this size actually stands — a fenced yard by the road, rented by the month.
// Which car stands on which is a property of the car (`lot`), not a stock count per point.
export const AVTO_PLACES: SeedPlace[] = [
  {
    city: 'bishkek',
    name: { ru: 'Площадка в Арча-Бешике' },
    address: { ru: 'Бишкек, жилмассив Арча-Бешик, ул. Тыналиева, 41' },
    phone: '+996 555 712 040',
    hours: { ru: 'Ежедневно 9:00–19:00' },
    lat: 42.8213,
    lng: 74.5562,
  },
  {
    city: 'bishkek',
    name: { ru: 'Площадка в Ак-Орго' },
    address: { ru: 'Бишкек, жилмассив Ак-Орго, ул. Ак-Ордо, 118' },
    phone: '+996 555 712 041',
    hours: { ru: 'Ежедневно 9:00–19:00' },
    lat: 42.8431,
    lng: 74.5297,
  },
  {
    city: 'bishkek',
    name: { ru: 'Площадка в Ала-Тоо' },
    address: { ru: 'Бишкек, жилмассив Ала-Тоо, ул. Жайыл-Баатыра, 67' },
    phone: '+996 555 712 042',
    hours: { ru: 'Ежедневно 9:00–19:00' },
    lat: 42.8086,
    lng: 74.6348,
  },
]
