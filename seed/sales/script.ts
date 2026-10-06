import { findResourceJson } from '../resource'

/**
 * A demo's own sales, written by hand.
 *
 * The general script covers the STATES — five statuses against four payment states, an estimate, a
 * correction — and it cannot cover the content: a hard case is not something that can be generated,
 * and a dozen appeals drawn from one pool of phrases read as one appeal drawn twelve times. So the
 * matrix stays shared machinery and the words become the demo's own material, living beside its
 * photographs in the resource library.
 *
 * What the file does NOT carry is plumbing. Name, telephone and mail are filled by role the way they
 * always were; the file names only what a person wrote in their own words and what they were
 * answered. A field the file does not name stays empty — generated text inside a hand-written
 * questionnaire is exactly what this is getting away from.
 */
export interface ScriptPerson {
  /** how appeals and orders point at them inside the file */
  key: string
  name: string
  phone: string
  email?: string
  /** where an order is carried to; a demo that only takes appeals has no use for it */
  address?: string
  /**
   * What this person switched OFF in their own notifications.
   *
   * The reader's own screen on the storefront offers exactly this — a category and a channel — and
   * until a demo had one, «gets it by the channel they chose» was a sentence nothing in the base
   * could show. Silencing every channel of a category is not the same as switching one off: the
   * platform then writes no row at all, which is what respecting the choice looks like from inside.
   */
  quiet?: { category: string; off: ('feed' | 'push' | 'mail')[] }[]
  /**
   * Whether this person follows the site.
   *
   * Named here rather than left to «the last four cards», because WHEN somebody starts following
   * decides what they were told: an announcement is said to whoever is already standing behind the
   * catalogue, and the readers are born after the demo's own transaction has closed. A script that
   * names its followers gets them subscribed before a word is said; one that names none keeps the
   * old behaviour exactly, which is what the market and Watt still rely on.
   */
  follows?: boolean
  /**
   * A client somebody answers for: a wholesale customer run by one manager for years, whoever
   * happens to pick up their appeal. The card is taken by the shop's own person once it exists —
   * through the door a manager presses, so «my clients» is a list with something in it.
   */
  kept?: boolean
}

/**
 * What the shop said to everyone following it — its own words, on its own morning.
 *
 * Publishing and telling are one act here, so a row with `sent: false` is the one state where the
 * text still belongs to the owner: after it has been said it is frozen, and the strip on the page
 * and the line in five hundred feeds may not say different things.
 */
export interface ScriptAnnouncement {
  text: string
  /** how long ago it was said, in days */
  days: number
  /** how many days the strip stood on the arrivals page: 1, 3 or 7 */
  term: 1 | 3 | 7
  /**
   * The button under it, NAMING what it leads to rather than spelling an address: the prefix is a
   * setting the owner may rename tomorrow, and a frozen path would die that day.
   */
  action?: {
    kind: 'route' | 'category' | 'product' | 'service' | 'selection' | 'page' | 'post'
    /** for `route`: one of the platform's own addresses; otherwise the thing's own slug */
    target: string
    label: string
  }
  /** A draft nobody was told about — the only state whose text is still editable. */
  sent?: boolean
}

export interface ScriptLine {
  /** `note` is the manager writing for themselves — never an answer to the visitor */
  by: 'guest' | 'staff' | 'note'
  text: string
}

export interface ScriptAppeal {
  person: string
  /** which questionnaire it came through, by slug */
  form: string
  /** how long ago, in days */
  days: number
  /** the hour it was written at, so a feed of a dozen lines does not read as one minute */
  at?: [number, number]
  locale?: string
  /**
   * The card the request was opened FROM, by address.
   *
   * A request opened from a card names its subject, and the engine then never asks what it is about
   * — so a fixture that never names one exercises only half of what a request is. Ten demos named
   * none until this arrived.
   */
  subject?: { type: 'product'; slug: string }
  /**
   * What came WITH the questionnaire, where it has anywhere to put it.
   *
   * A file field is not decoration: Сайма asks for patterns and Апекс for a photograph, and until
   * this arrived not one appeal in ten demos carried either — the field, the viewer beside the
   * answers and the row in the media library were all drawn by nothing.
   */
  file?: { field: string; name: string; title: string; rows?: string[] }
  /** what the person answered, by field key; a date field takes days from the appeal instead */
  answers?: Record<string, string | number>
  talk?: ScriptLine[]
  status?: 'new' | 'open' | 'done'
  /** on somebody's desk rather than nobody's */
  assign?: boolean
  /**
   * WHAT THIS CONVERSATION CAME TO — the sale, written down out of the appeal it was agreed in.
   *
   * The platform's second door into an order, and the only one a business without a basket has. It
   * hangs on the appeal rather than standing beside it in `orders` for the reason the door itself
   * does: the client, the questionnaire and the whole conversation come from here, and a document
   * written against a name somebody typed would have none of them.
   */
  order?: ScriptRaise
}

export interface ScriptRaise {
  /**
   * What was sold, by the address of the card — and what one unit went for, in whole currency.
   *
   * The price is the point of the whole road: a wholesale run of hoodies is quoted per piece, and
   * what three hundred of them actually cost is what two people agreed on the telephone. Leave it out and the catalogue's own number
   * stands, which is what an ordinary card wants.
   */
  /**
   * The order is made out of the FORK of this very appeal, by the one press the back office has:
   * one indicative line for the whole job, priced at the bottom of what the visitor was shown.
   * Nothing is named in `lines` then — retyping the job by hand is exactly what this replaces.
   */
  estimate?: boolean
  lines?: (
    | { item: string; qty?: number; pick?: number; price?: number }
    /*
     * A line that stands for no card: a thing the client asked to have bought, named with the page
     * it is sold on, or a charge that is a line and not a thing — a commission, carriage abroad.
     * The price is in whole currency, like every price of this file.
     */
    | { name: string; link?: string; qty?: number; price?: number; note?: string }
  )[]
  /** Who brought the client, by the partner's own name or the shop's word for the row. */
  partner?: string
  /** How long after the appeal the document was written, in days. The same day by default. */
  after?: number
  /** what the journal says about where this order came from */
  say?: string
  steps?: ScriptStep[]
  /**
   * What the shop put beside the order as the work went — a correction to the pattern, a
   * photograph of the approved sample. The customer's own drawing is NOT here: it came with the
   * appeal (`file` above) and is read from the order through the request it grew out of.
   */
  files?: {
    name: string
    /** what the back office calls it, in the shop's own language */
    caption: string
    /** what is drawn on the sheet itself — Latin, like every drawn fixture: the drawer has one face */
    title: string
    rows?: string[]
  }[]
}

/**
 * What a demo puts in its own order.
 *
 * The demo owns who bought, when, WHAT — by the slug of the card, so the line is a real thing off
 * this shelf — the answers the till was given, the sequence of what happened afterwards and the
 * words its journal is written in. The arithmetic of a correction stays where it was: how much a
 * discount is and how far a price moves are rules of the engine, not facts about a shop.
 */
export interface ScriptStep {
  do: 'status' | 'ship' | 'receipt' | 'confirm' | 'correct'
  /** for `status` */
  to?: 'new' | 'confirmed' | 'done' | 'canceled'
  /** for `correct` */
  how?: 'discount' | 'remove' | 'price' | 'raise' | 'lower'
  /** what the journal says about it, in this demo's words */
  say?: string
}

export interface ScriptOrder {
  person: string
  days: number
  at?: [number, number]
  locale?: string
  /**
   * What was bought: the slug of a product, and how much — in steps, as everywhere. `pick` names
   * WHICH modification, counting from one in the order the card lists them; without it the primary
   * one is taken. An oil importer sells a one-litre and a four-litre canister under one address, and
   * «1 л» in an order whose client wrote «4 л» is a fixture lying.
   */
  lines: { item: string; qty?: number; pick?: number }[]
  /**
   * WHERE it was brought — the district, counting from one in the order the site declared them.
   *
   * Named only where the shop has several: with one district nobody is asked, and the fixture must
   * not answer a question that was never put — the engine drops the field, and an answer to a field
   * that is not there is ignored in silence, which is exactly the kind of quiet a fixture must not
   * rely on.
   */
  zone?: number
  /**
   * WHEN it was brought — the round off the shop's own timetable, and the day relative to the order.
   *
   * `window` counts from one in the order the site declared them; `after` is how many days later
   * than the order it was delivered, so `0` is the same day.
   *
   * The two are used differently on purpose. The window is CHOSEN through the till, off the live
   * list, so the whole road is walked for real — the option, its capacity, the membership check. The
   * day cannot be: the till refuses a window in the past, and a demo order placed six weeks ago has
   * to have been delivered six weeks ago. So the fixture picks a live day, and the backdating pass
   * moves the delivery to `after` days from the order, rewriting the frozen answer with it.
   */
  slot?: { window: number; after?: number }
  /**
   * Whose LINK this buyer came in on, by the person who holds it.
   *
   * A customer's own referral is the third kind of holder and the only one that needs a till: the
   * code is minted by the platform and cannot be written into a fixture, so the file names the
   * PERSON and the run takes their link for them, exactly as the storefront would. Buying through
   * one's own link earns nothing — that is the platform's rule — so this never names the buyer.
   */
  broughtBy?: string
  /*
   * The code this buyer typed, where they typed one.
   *
   * A code and a rule meet at the till and never add up — the larger wins — so a demo needs orders
   * of three kinds to show that at all: one where the code won, one where a rule beat it and the
   * code stayed on the document to say who brought the customer, and one where the basket never
   * reached the code's minimum. None of the three was expressible until this field existed.
   */
  promo?: string
  /** the till's own questions, by field key; a date takes days from the order */
  answers?: Record<string, string | number>
  steps?: ScriptStep[]
  /**
   * HOW FAR SOMEBODY ELSE TOOK IT — the business that keeps this shop's goods and carries its orders.
   *
   * Not a step, and that is the point of it being separate: a step is something the SHOP does to its
   * own order, in the shop's own transaction. This is what another organization's storekeeper and
   * courier did, through their own doors and signed by their own people, and it can only happen once
   * the order exists — so it is walked after every demo has been filled, by `carry.ts`.
   *
   * Each stage includes the ones before it. `taken` — a storekeeper has it and has not packed it;
   * `packed` — boxes made and weighed; `handed` — the shop gave it to the carrier and no courier has
   * it yet; `offered` — the desk named a courier who has not answered; `agreed` — the courier said
   * yes and has not come for the box; `road` — a courier took it and is on the way. Then one of
   * three ends: `delivered` — handed over by the code, and the shop closed the order; `failed` —
   * the last attempt did not end in a hand-over and nothing has been decided since; `returned` —
   * brought back to the shop, which cancelled the order.
   *
   * A shop that keeps its goods at nobody's has no storekeeper to wait for: it packs the order
   * itself, and `taken` means nothing there.
   */
  carry?: ScriptCarry
}

export interface ScriptCarry {
  to:
    | 'taken'
    | 'packed'
    | 'handed'
    | 'offered'
    | 'agreed'
    | 'road'
    | 'delivered'
    | 'failed'
    | 'returned'
  /** into how many boxes; one where nothing is said */
  boxes?: number
  /**
   * What each bag showed on the scales, in kilograms — and by being a list, how many bags there
   * were. Said where the shop packs itself; left out, one bag weighs what its goods state.
   */
  weights?: number[]
  /** the courier takes the money at the door — what the order still owes when it is handed over */
  collect?: boolean
  /**
   * The attempts that did NOT end in a hand-over, in the order they happened, before whatever `to`
   * says came next: with `delivered` it was handed over on a later attempt, with `road` the courier
   * is out again, with `failed` the last of these is where it stands, with `returned` they are why.
   */
  fails?: ScriptFail[]
  /** what the shop's own journal says when it closes the order, or cancels it after a return */
  say?: string
  /**
   * How many days after the order it was packed. Nought where nothing is said — but a run of sixty
   * garments sewn to order is not on a pallet ninety minutes after it was asked for.
   */
  after?: number
  /**
   * The word a carrier's TRIP names this order by, where it rides between cities instead of going
   * out with a courier. The script stops at `handed`; what happens on the road is the carrier's own
   * material (`tulpar/hauls.json`), and this is the one thread between the two files.
   */
  ride?: string
}

export interface ScriptFail {
  /** off the platform's closed list: what the courier pressed at the door */
  reason: 'absent' | 'unreachable' | 'reschedule' | 'address' | 'unpaid' | 'refused'
  /** the courier's own words beside it */
  note?: string
  /** «not today»: how many days later the next attempt is, and between which hours */
  again?: { after: number; hours?: [number, number] }
}

/**
 * SOMEBODY WHO SIGNED IN. The door is the platform's own — a code requested, read out of the table
 * and entered — so what the base ends up holding is a session the door issued rather than a row a
 * fixture invented.
 */
export interface ScriptReader {
  /** whose it is, by the key in `people` — the address on the card is what the door knows them by */
  person: string
  /** how many days ago they first signed in */
  days: number
}

export interface ScriptCard {
  name: string
  phone?: string
  email?: string
  note?: string
  days: number
}

export interface SalesScript {
  people: ScriptPerson[]
  /** What the shop announced to its followers. Absent for a demo nobody follows, which is most. */
  announcements?: ScriptAnnouncement[]
  appeals: ScriptAppeal[]
  /** absent for a demo with no basket at all, which is half of them */
  orders?: ScriptOrder[]
  /** Who signed in. Absent everywhere the site has no readers. */
  readers?: ScriptReader[]
  cards?: ScriptCard[]
  /** Organizations that buy from this one on terms. Absent for a shop that sells to people only. */
  dealers?: ScriptDealer[]
  /** The trade agent's round: orders written at the client's own counter, from the client's card. */
  agent?: ScriptAgent
}

/**
 * WHAT AN AGENT WROTE ON HIS ROUND — the door on the client's card.
 *
 * No appeal stands behind these orders and no code was typed: the agent is a member of staff who
 * holds a partnership, the client is in the room, and writing the order IS the attribution. Each
 * client is an organization, named by the name it signed up under, with the terms the seller wrote
 * on its card.
 */
export interface ScriptAgent {
  clients: {
    org: string
    terms: { days: number; limit: number }
    visits: ScriptVisit[]
  }[]
}

export interface ScriptVisit {
  days: number
  at: [number, number]
  /** what was written down, with the price named per unit in whole currency */
  lines: { item: string; pick?: number; qty: number; price: number }[]
  /** what the journal says about where the order came from */
  say?: string
  shipped?: { after: number; say: string }
  /** the money, so many days AGO — absent on an order still owed */
  paid?: { days: number; say: string }
  /**
   * The order the ceiling refused: nothing is written, the agent reads the refusal to the client
   * and leaves these words on the card. The fixture fails if the door lets it through.
   */
  refused?: { note: string }
}

/**
 * AN ORGANIZATION THAT BUYS HERE — the third door into an order, and the only fixture where both
 * sides of one document are businesses of the platform.
 *
 * The file is the seller's, because the document is: a purchase is the seller's order read from
 * the other side. What the buyer does — places it, agrees to the priced sum, counts what arrived —
 * is walked through the buyer's own doors and signed by the buyer's own people.
 */
export interface ScriptDealer {
  /** the buying organization, by the address of its site */
  buyer: string
  /** what the seller wrote on the buyer's card: days after dispatch, and the ceiling in whole currency */
  terms: { days: number; limit: number }
  purchases: ScriptPurchase[]
}

export interface ScriptPurchase {
  days: number
  at: [number, number]
  /** where the buyer wants it, and what they said to the seller with the order */
  address?: string
  comment?: string
  /**
   * What is bought. Left out, it is «the same as last time»: the previous purchase laid out again
   * through the buyer's own repeat, on the ladder and the shelf as they stand today.
   */
  lines?: { item: string; pick?: number; qty: number }[]
  /**
   * What the seller wrote per unit, in whole currency, by the address of the card. A catalogue
   * that publishes no prices makes every purchase an estimate, and this is the answer to it.
   */
  prices: Record<string, number>
  /** each of these is so many hours after the purchase was placed, and what the journal says */
  priced: { after: number; say: string }
  agreed: { after: number }
  shipped?: { after: number; say: string }
  received?: { after: number }
  /** the money, so many DAYS after the goods left — absent on a purchase still owed */
  paid?: { after: number; say: string }
  /** what the seller's journal says when it closes the document */
  closed?: string
}

/**
 * A demo's own words, by the folder its material lives in — never by the site's slug.
 *
 * The two are different names (see `seed/demos.ts`): the site answers at `demo7`, its photographs,
 * price tables and sales script live under `watt`. Asking for `demo7/sales.json` found nothing and
 * failed the whole fixture, which is what happened for as long as nobody ran it by hand.
 */
export function loadScript(dir: string): Promise<SalesScript | null> {
  return findResourceJson<SalesScript>(`${dir}/sales.json`)
}
