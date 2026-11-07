import { findResourceJson } from '../lib/resource'

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
  /**
   * `note` is the manager writing for themselves — never an answer to the visitor; `agent` is the
   * site's consultant answering by itself, through the very door its turn says an answer by
   * (`consultantSaid`), so a demo's reply meets what code checks of a real one
   */
  by: 'guest' | 'staff' | 'note' | 'agent'
  text: string
  /** the cards the consultant puts under its line, by slug */
  cards?: { type: 'product' | 'service'; slug: string }[]
  /** the consultant hands the conversation to a person instead of answering, for this reason */
  hand?: 'asked' | 'topic'
  /**
   * How many MINUTES after the line before it, where that is the point: how fast a desk answers is
   * read off these moments, and a demo of a desk that answers within the hour has to say so.
   * Left out, the line follows by a few hours, as a conversation usually goes.
   */
  in?: number
  /** A photograph of the library the visitor attaches to the line — only a visitor's line carries one. */
  photo?: string
  /** A voice note of this many seconds the visitor leaves with the line. */
  voice?: number
}

export interface ScriptAppeal {
  person: string
  /**
   * The site whose PAGE it was written on, by address, where that is not this one: a request for a
   * service somebody else defined, sent by pressing this site's row in the list of those who
   * provide it. The form and the service named below are then that site's.
   *
   * It lives in THIS file because the request is this site's — it lands on this desk, is answered
   * by these people and becomes this site's order — and the site it was written on is told nothing
   * of what was said. The fixture fails if the engine routed it anywhere else.
   */
  from?: string
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
  subject?:
    | { type: 'product'; slug: string }
    /*
     * A request sent from the page of a SERVICE. `order` says which button was pressed there: the
     * one that orders. What the request then becomes — an order with a sum, an estimate, or nothing
     * more than a request — is the engine's own reading of the service, never the file's.
     */
    | { type: 'service'; slug: string; order?: boolean }
  /**
   * The request was sent WITH A TIME: the visitor pressed an hour on the service's page, which held
   * it, and the questionnaire went with the hold — so the order is born booked. `ahead` counts the
   * days after the run that still have this hour free (1 is the nearest), `time` is the hour on
   * the clock of whoever does the service. Counted from the run because a calendar has no past:
   * the fixture fails where no such day is left in the horizon.
   */
  /**
   * The sum the page showed, in minor units — where the questionnaire counts from the price of the
   * service and the file wants to say what the person read. Left out, the fixture sends what the
   * page would have shown, counted by the function the page counts by.
   */
  total?: number
  // `who` — whom they chose on the page, by the place in the list it printed; absent is «anybody».
  slot?: { ahead: number; time: string; who?: number }
  /**
   * What happened to the order such a request BECAME — the one a visitor made by pressing «order» on
   * a service. Named only where the file expects one: a fixture that believes a document was written
   * fails here if the engine wrote none, instead of going on believing it.
   */
  placed?: {
    steps?: ScriptStep[]
    /**
     * The buyer COMPLAINS of that order — to the site whose page it was ordered on, which is the
     * only place a complaint about somebody else's order is heard. So it is said only of an order
     * taken off another site (`from` above): about one's own there is nobody else to complain to.
     * `after` — how many hours after the request; the words are the buyer's own.
     */
    complaint?: { text: string; after: number }
    /**
     * The buyer REVIEWS that order, by its key, once it was closed — one mark for its first
     * service or card, in their own words. Written through the buyer's own door, so an order the
     * script did not close is refused there. `shown` — the site the order was placed on published
     * it; `reply` — whoever did the job answered, which only a published review can be. `after` —
     * how many days after the request it was said.
     */
    review?: ScriptReview
  }
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
  /** `defer` — the shop says an order placed without signing in is the organization's */
  /** `agree` — the BUYER says yes to a sum the shop has just written into an estimate */
  /** `day` — the day of the order's service moves: see `day` below */
  /** `render` — every service of the order is marked as done */
  /** `give` — the order's services are given to the member of staff named in `to` */
  do:
    | 'status'
    | 'ship'
    | 'receipt'
    | 'confirm'
    | 'correct'
    | 'defer'
    | 'agree'
    | 'day'
    | 'move'
    | 'miss'
    | 'render'
    | 'give'
  /**
   * for `move`: the business moves the order's BOOKING to another hour of the day it stands on,
   * and says why — through the desk's own door, so the hour must be one its calendar has free.
   * The line then waits for the client's yes.
   */
  move?: { time: string; reason: string }
  /**
   * for `miss`: the client did not come to the order's service — marked through the desk's door,
   * of a day that was agreed and has come. `back` then sets that day so many days into the past:
   * a demo's no-shows are old ones, and no door will agree a day that has gone.
   */
  back?: number
  /** for `status` */
  to?: 'new' | 'confirmed' | 'done' | 'canceled'
  /** for `give`: the name of whoever does the work, as the shop's own staff list has it */
  doer?: string
  /** for `correct` */
  how?: 'discount' | 'remove' | 'price' | 'raise' | 'lower'
  /**
   * For `day`, which of the three movements: the desk says yes to the day the client asked for,
   * the desk names another — `in` days from the run, between ten and noon — or the client says yes
   * to that. Always relative to the run: an agreed day in the past is a reminder that never comes.
   */
  day?: { desk: 'confirm' } | { desk: 'move'; in: number } | { client: 'accept' }
  /**
   * for `confirm`: how much came, in whole currency — a deposit before the rest. Without it, the
   * whole of what is still owed.
   */
  amount?: number
  /** what the journal says about it, in this demo's words */
  say?: string
}

export interface ScriptReview {
  rating: number
  text: string
  after: number
  shown?: boolean
  reply?: string
  /** For a basket: WHICH of its cards, by the address its line names. The first without it. */
  item?: string
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
   * `services` are the addresses of services ticked beside the thing — the fitting taken with the
   * machine, in the same order. One the shop only keeps the definition of names WHO does it, by
   * the address of that provider's site: then the line leaves in the provider's own order, born
   * beside this one.
   */
  lines: {
    item: string
    qty?: number
    pick?: number
    services?: (string | { service: string; doer: string })[]
  }[]
  /**
   * THE HOUR of the services of this basket, picked at the till the way a buyer picks it: the
   * first free one that many days of the calendar ahead, of whoever does each service. Only a
   * service somebody keeps a calendar for is asked — the rest leave with no time, as always.
   */
  visit?: number
  /**
   * WHAT THE PAGE SHOWED the services come to once their own questions were answered at the till —
   * in whole currency, like every sum of this file. Named where an answer moves the number: the
   * till counts for itself and refuses a press that agreed to another figure, so a fixture that
   * answers «carry the old one out, +500» has to say what its buyer then read. Written by hand
   * and never worked out by the seeder — a fixture that counts with the engine's own function
   * agrees with it by construction and proves nothing.
   */
  counted?: number
  /**
   * What the buyer ATTACHED at the till, where a question there asks for a file — the photograph
   * of the place a machine goes, asked by the fitting's own questionnaire. `field` is the till's
   * key for the question (`photo~<questionnaire>` in a service's step); the sheet is drawn, like
   * every attachment of this library.
   */
  file?: { field: string; name: string; title: string; rows?: string[] }
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
  /**
   * The buyer REVIEWS this order once it is closed — the same step an order born of a request has
   * (`ScriptAppeal.placed.review`), with `after` counted in days from the order. Written where the
   * order closes: after its own steps, or after the carrier handed it over (`carry`). Of an order
   * the script never closes it is refused by the buyer's door, and the run fails there.
   */
  review?: ScriptReview
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
  /**
   * The courier's first «taken» was a mistake: the carrier's desk strikes it with these words, the
   * shop takes the goods back onto its shelf, and the courier takes the box again.
   */
  mistaken?: string
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
   * material (`demos/tulpar/hauls.json`), and this is the one thread between the two files.
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

/*
 * A COMMERCIAL OFFER the shop made somebody, and what became of it: written out of the person's own
 * conversation where `thread` says so, issued, opened in the person's browser so many times, and
 * then taken (`take`, the variant by its place), past its day, withdrawn with the shop's words — or
 * left standing.
 */
export interface ScriptOffer {
  person: string
  thread?: boolean
  locale?: string
  intro?: string
  terms?: { label: string; value: string }[]
  variants: {
    name?: string
    lines: (
      | { item: string; qty?: number; price?: number; reason?: string }
      | { custom: string; qty?: number; price: number; reason?: string }
    )[]
  }[]
  opened?: number
  take?: number
  expired?: boolean
  withdrawn?: string
}

export interface SalesScript {
  people: ScriptPerson[]
  /** Commercial offers the shop made; absent where it makes none. */
  offers?: ScriptOffer[]
  /** What the shop announced to its followers. Absent for a demo nobody follows, which is most. */
  announcements?: ScriptAnnouncement[]
  appeals: ScriptAppeal[]
  /** absent for a demo with no basket at all, which is half of them */
  orders?: ScriptOrder[]
  /** Who signed in. Absent everywhere the site has no readers. */
  readers?: ScriptReader[]
  cards?: ScriptCard[]
  /** Callers the desk booked in from its calendar. Absent where no calendar is kept. */
  calls?: ScriptCall[]
  /** What stands on top of the resources' weeks: days off, a leave, a day with hours of its own. */
  timetable?: ScriptTimetable
  /** Organizations that buy from this one on terms. Absent for a shop that sells to people only. */
  dealers?: ScriptDealer[]
  /** The trade agent's round: orders written at the client's own counter, from the client's card. */
  agent?: ScriptAgent
  /**
   * The doors somebody has already put a point to — a courier who stood there, a desk that copied
   * the pair off a map. By the address line exactly as an order or a card of this site writes it:
   * that line is what the platform keeps the point by. Not every address is here, on purpose —
   * a walk has to show what it does with a door nobody has pinned.
   */
  spots?: { address: string; at: [number, number] }[]
  /** Organizations whose people order at the till, by the telephone on the organization's card. */
  accounts?: ScriptAccount[]
  /** Sellers who asked for a place on this shelf. Absent wherever the shop takes none. */
  shelf?: ScriptShelfTalk[]
  /** Requests sent from this site's pages to everybody who provides one of its services. */
  everybody?: ScriptEverybody[]
}

/**
 * ONE REQUEST TO EVERYBODY who provides a service of this site — written in the owner's file,
 * because the page it is sent from is the owner's.
 *
 * Who receives it is NOT written: that is the engine's reading of the list the page prints, in
 * the city named. `replies` are the answers of those who gave one, each by the address of its
 * site and so many minutes after the request — the rest stay silent, which is the point of the
 * scene: several desks hold one request, and the client hears from whoever is quickest.
 */
export interface ScriptEverybody {
  person: string
  form: string
  days: number
  at: [number, number]
  /** the service, by address */
  service: string
  /** the city the visitor named, where the page offers a choice */
  city?: string
  answers?: Record<string, string | number>
  /**
   * `sum`, in whole units of that site's money, makes the reply an ANSWER: an order raised out of
   * its request, which is what the client compares and chooses among. Without one it is words.
   */
  replies?: { by: string; in: number; text: string; sum?: number }[]
  /** Whose answer the client agreed to, by the address of its site — which closes the sending. */
  chosen?: string
  /** When they chose: how many days ago and at what hour. Absent — the moment the fixture runs. */
  chosenOn?: { days: number; at: [number, number] }
  /** Who said «we will not take this one», by the address of each site. */
  declined?: string[]
  /**
   * Nobody said a word, and the platform's own round closed it when its silence ran out — three
   * days after `days`. Only for a sending with no `replies`: one that was answered is not silent.
   */
  silent?: boolean
  /** The client pressed «send again» on the closed page: how many days ago and at what hour. */
  resentOn?: { days: number; at: [number, number] }
}

/**
 * A SELLER ASKING FOR A PLACE ON THIS SHELF — a conversation between two businesses of the platform.
 *
 * The file is the shop's, because the conversation lies in the shop's inbox; the seller writes into
 * it from its own back office and is named here by the address of its site. A `guest` line is the
 * seller's, a `staff` line the shop's desk. Nothing here calls a supply: that is an act, and the
 * reset's own fixture makes it.
 */
export interface ScriptShelfTalk {
  /** the seller, by the address of its site */
  seller: string
  /** how many days ago the first line was written; each next one is a few hours later */
  days: number
  talk: ScriptLine[]
}

/**
 * AN ORGANIZATION THAT ORDERS AT THE TILL. Its card carries the terms and the telephone of one of
 * the people of this file — so every order that person places lands on the organization's card
 * without proving anything, and counts against it only once the shop says so (a `defer` step).
 */
export interface ScriptAccount {
  /** the organization, by the name it signed up under */
  org: string
  /** whose telephone the shop wrote on the card, by the key in `people` */
  person: string
  /** days after dispatch, and the ceiling in whole currency */
  terms: { days: number; limit: number }
  /** the seller's direction this organization's purchases go to, by its name */
  direction?: string
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
    /** where the client's door is, written on its card — what the agent's walk is laid out by */
    address?: string
    terms: { days: number; limit: number }
    direction?: string
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
  /** what left, so many hours after it was written down — every line, or only the ones named by `item` */
  shipped?: { after: number; say: string; only?: string[] }
  /**
   * The money, so many days AGO — absent on an order still owed. The whole order, or with `gone` only
   * what has left: a client on terms pays the dispatch, not the goods still on the shelf.
   */
  paid?: { days: number; say: string; gone?: boolean }
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
  /** the seller's direction this buyer's purchases go to, by its name */
  direction?: string
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
  /**
   * Counted in by the buyer, and where what lies on no position of the buyer's went: an expense of
   * its own by name (made the first time it is named), or a machine.
   */
  received?: {
    after: number
    into?: { expense: string } | { asset: { name: string; lifeMonths: number } }
  }
  /** the money, so many DAYS after the goods left — absent on a purchase still owed */
  paid?: { after: number; say: string }
  /** what the seller's journal says when it closes the document */
  closed?: string
}

/** A demo's own words, kept beside its material; null for a demo that has not written them yet. */
export function loadScript(slug: string): Promise<SalesScript | null> {
  return findResourceJson<SalesScript>(`demos/${slug}/sales.json`)
}

/**
 * Somebody rang, and the desk booked them in — through the calendar's own door, which makes the
 * card where the telephone is nobody's yet. `resource` is the name the site gave it; `ahead`
 * counts the days after the run on which that resource still has `time` free for the service.
 */
export interface ScriptCall {
  person: string
  service: string
  resource: string
  ahead: number
  time: string
  note?: string
}

/**
 * Days that are not like their weekday. Every date is counted from the run — a calendar has no
 * past — except a closure laid `over` somebody's booking, which takes its date from that booking:
 * the one case the demo is there to show is a day closed AFTER a client booked it.
 */
export interface ScriptTimetable {
  closures?: {
    /** the resource by the name the site gave it; absent is the whole site */
    resource?: string
    /** days from the run to its first day, and how many days it lasts */
    ahead?: number
    days?: number
    /** …or the day this person's booking stands on */
    over?: string
    note?: string
  }[]
  days?: { resource: string; ahead: number; spans: [string, string][] }[]
}
