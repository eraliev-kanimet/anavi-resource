/*
 * What of this shop lies at an operator's warehouse instead of in its own showroom.
 *
 * The heavy and the dear: gaming machines and workstations a showroom of forty square metres has no
 * room to stack, plus four models that sell by delivery far more often than over the counter. They
 * are born with NOTHING on the shop's own shelf — the whole of them arrives at the operator's by an
 * announced delivery — and that is what makes the fixture show the feature rather than assert it:
 * an order for one of these can be covered from one floor only, so the till points it there and the
 * work of collecting it becomes the operator's by itself.
 *
 * The list lives beside the catalogue and is read by two things that must agree: the catalogue,
 * which leaves these shelves empty, and the agreement between the two demos, which fills them.
 */
export interface KeptLine {
  slug: string
  /** what the shop said was coming */
  announced: number
  /** what the operator counted; the same where nothing is said */
  received?: number
  /** how many of those came unfit to sell, and why */
  damaged?: number
  damage?: string
  /** the operator's spot the storekeeper put it down in, a code of `demos/tulpar/bins.json` */
  bin: string
}

export const VEGA_KEPT: KeptLine[] = [
  { slug: 'legion-pro-5-16irx9-83df00e9rk', announced: 6, bin: 'A-01-1' },
  // One short: eight on the paper, seven on the pallet. The shop looked and agreed.
  { slug: 'thinkbook-14-g6-21kg00b8cd-win11p', announced: 8, received: 7, bin: 'A-01-2' },
  { slug: 'ux3405ma-zenbook-14-oled-qd379w', announced: 6, bin: 'A-02-1' },
  { slug: 'm5406wa-vivobook-s14-oled-pp086w', announced: 5, bin: 'A-02-2' },
  { slug: 'creatorpro-x18-hx-a14vmg-9s7-182253-456', announced: 2, bin: 'B-01-1' },
  {
    slug: 'rog-zephyrus-g16-2025-platinum-white-gu605cx-qr077w',
    announced: 4,
    damaged: 1,
    damage: 'Коробка смята с угла, заводская пломба надорвана',
    bin: 'B-01-2',
  },
  { slug: 'legion-pro-7-16iax10h-83f50025rk', announced: 3, bin: 'B-02-1' },
  { slug: 'g835lw-rog-strix-scar-2025-sa112w', announced: 2, bin: 'B-02-2' },
  /*
   * Two boxes on the pallet the paper never named — the distributor's loader put them on. They came
   * at no price, and the shop is asked what they cost: until it answers they lie at nought and the
   * distributor is owed nothing for them. Sold in the showroom as well, so its shelf stays.
   */
  { slug: 'fa506ncr-tuf-gaming-a15-hn044', announced: 0, received: 2, bin: 'C-01' },
]

// What the shop announced lies at the operator's only; a line that merely turned up there does not.
const KEPT = new Set(VEGA_KEPT.filter((line) => line.announced > 0).map((line) => line.slug))

export const isKept = (slug: string) => KEPT.has(slug)

/*
 * One instruction to the operator: laptops for a firm's new office, carried by the operator itself.
 * It leaves in two parts — the third ThinkBook was found on the wrong rack the next day — so the
 * storekeeper's screen shows a document that left part by part, and the first part delivered while
 * the second has only just been handed to the desk.
 */
export interface KeptSending {
  /** how many days before the run the shop gave the instruction */
  days: number
  recipient: string
  phone: string
  address: string
  note: string
  /** the operator's direction it rides, by the key its tariff names it with */
  route: string
  lines: { slug: string; qty: number }[]
  /** what left each time, by slug, and when; the first part is carried to the door */
  parts: { days: number; packages: number; weight: number; lines: Record<string, number> }[]
}

export const VEGA_SENT: KeptSending = {
  days: 6,
  recipient: 'ОсОО «Ала-Тоо Консалтинг», Айбек Жумабаев',
  phone: '+996 555 41 27 90',
  address: 'Бишкек, ул. Токтогула, 125, офис 402',
  note: 'Ноутбуки для нового офиса, оплачено переводом. Звонить за час.',
  route: 'bishkek',
  lines: [
    { slug: 'legion-pro-5-16irx9-83df00e9rk', qty: 2 },
    { slug: 'thinkbook-14-g6-21kg00b8cd-win11p', qty: 3 },
  ],
  parts: [
    {
      days: 5,
      packages: 4,
      weight: 11_400,
      lines: { 'legion-pro-5-16irx9-83df00e9rk': 2, 'thinkbook-14-g6-21kg00b8cd-win11p': 2 },
    },
    { days: 0, packages: 1, weight: 2_100, lines: { 'thinkbook-14-g6-21kg00b8cd-win11p': 1 } },
  ],
}
