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
}

export const VEGA_KEPT: KeptLine[] = [
  { slug: 'legion-pro-5-16irx9-83df00e9rk', announced: 6 },
  // One short: eight on the paper, seven on the pallet. The shop looked and agreed.
  { slug: 'thinkbook-14-g6-21kg00b8cd-win11p', announced: 8, received: 7 },
  { slug: 'x1605va-vivobook-16-ux3405ma-qd379w', announced: 6 },
  { slug: 'ux3405ma-zenbook-14-oled-m5406wa-pp086w', announced: 5 },
  { slug: 'creatorpro-x18-hx-a14vmg-9s7-182253-456', announced: 2 },
  {
    slug: 'rog-zephyrus-g16-2025-platinum-white-gu605cx-qr0',
    announced: 4,
    damaged: 1,
    damage: 'Коробка смята с угла, заводская пломба надорвана',
  },
  { slug: 'legion-pro-7-16iax10h-83f50025rk', announced: 3 },
  { slug: 'g835lw-rog-strix-scar-2025-g835lw-sa112w', announced: 2 },
]

const KEPT = new Set(VEGA_KEPT.map((line) => line.slug))

export const isKept = (slug: string) => KEPT.has(slug)
