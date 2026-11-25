import type { Db, Transaction } from '@anavi/backend/src/db'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { saveDriver, saveVehicle } from '@anavi/backend/src/modules/shipment/fleet.service'
import { resourceJson } from '../../../seed/lib/resource'
import type { HaulMoment } from '../../../seed/sales/stamp'

/*
 * What rides between cities, as the material writes it: kilograms, millimetres, whole soms, and a
 * point named by its number in its own site's list. Whoever walks it turns those into what the
 * platform keeps.
 *
 * A moment is «so many days ago, at this hour» — the way every date of a demo is said.
 */
export type { HaulMoment }

export interface HaulRelocation {
  /** how a trip's loading list names it */
  key: string
  /** whose goods, by the address of the site */
  shop: string
  /** the two points of that site, counting from one */
  from: number
  to: number
  /** the carrier's direction that prices the ride, by the key of the tariff */
  route: string
  note: string
  /** what leaves, and — where the road lost some — what was counted at the other end */
  lines: { item: string; pick?: number; qty: number; received?: number }[]
  boxes: { weight: number; length: number; width: number; height: number }[]
  claim?: { kind: 'loss' | 'damage'; amount: number; note: string }
}

/** The head of a trip and what was said about it from the road — shared by every kind of trip. */
export interface HaulRoad {
  /** a vehicle of the fleet by its key — or, for a hired lorry, the words it is known by */
  vehicle: string
  /** the same for whoever drives */
  driver: string
  note: string
  /** how many days ago the dispatcher put it together */
  planned: number
  /** the carrier's own point by its number, or a place said in words */
  stops: ({ place: number } | { where: string })[]
  said: (HaulMoment & { kind: 'departed' | 'border' | 'arrived'; where?: string; note?: string })[]
  /**
   * The day it is expected in, in days ago — NEGATIVE for a trip still on the road. Left out, it
   * is the day of the last word said.
   */
  arrives?: number
}

export interface HaulTrip extends HaulRoad {
  /**
   * What is meant to ride: a relocation by its key, or a shop's order by the word its own script
   * hands it over under. `stop` counts from one; `left` is what stayed in the yard, and why.
   */
  loads: {
    ride: string
    stop: number
    left?: { boxes: number; reason: string }
    /**
     * A shop's order handed over at the far end, and what the shop's own journal says when it
     * closes it. Absent on one still waiting — and on a relocation, which is always handed over.
     */
    delivered?: string
  }[]
  /** when the carrier came for the boxes */
  collected: HaulMoment
  /** when what rode to the end was handed over, counted in, and argued about */
  handed: HaulMoment
  counted?: HaulMoment
  claimed?: HaulMoment
}

export interface Hauls {
  fleet: {
    vehicles: { key: string; name: string; plate: string; payload: number; volume: number }[]
    // `login`: the member of staff this driver is, where they sign in — then the book names the person
    // and never copies their words.
    drivers: { key: string; name: string; phone: string; login?: string }[]
  }
  relocations: HaulRelocation[]
  trips: HaulTrip[]
}

export const tulparHauls = () => resourceJson<Hauls>('demos/tulpar/hauls.json')

/** The carrier's own vehicles and drivers: what a trip is named after, and what it may carry. */
export async function seedFleet(
  siteId: SiteId,
  users: ReadonlyMap<string, bigint>,
  tx: Db | Transaction,
): Promise<void> {
  const { fleet } = await tulparHauls()
  for (const vehicle of fleet.vehicles) {
    await saveVehicle(
      siteId,
      null,
      {
        name: vehicle.name,
        plate: vehicle.plate,
        // kilograms → grams; litres stay litres
        payload: vehicle.payload * 1000,
        volume: vehicle.volume,
      },
      tx,
    )
  }
  for (const driver of fleet.drivers) {
    const userId = driver.login ? users.get(driver.login) : undefined
    await saveDriver(
      siteId,
      null,
      userId === undefined ? { name: driver.name, phone: driver.phone } : { userId },
      tx,
    )
  }
}

/*
 * Cargo from abroad: clients with a code of their own, the parcels they named and the ones that
 * came, and the two vehicles a parcel changes between.
 */
interface CargoBox {
  weight: number
  length: number
  width: number
  height: number
}

export interface CargoParcel {
  /** whose it is, by the client's key — absent on a parcel nobody can be told for */
  client?: string
  /** the seller's own carrier's number, off the label */
  track: string
  note?: string
  /** how many days ago the client said it was coming; absent where they never did */
  named?: number
  /** nobody named the number: the owner is read off the code written on the box */
  code?: boolean
  /**
   * bought FOR the client by the carrier, and what the seller was paid for it out of the carrier's
   * bank, in the carrier's money: the desk writes the seller's number in with it
   */
  bought?: { amount: number }
  box: CargoBox
  /** repacked with others of the same client into the box of this key */
  into?: string
  /** handed over at the counter */
  issued?: HaulMoment
  /**
   * and, by a client that is a shop, taken onto its own shelf — by its seller's paper: whom it was
   * bought from, and what one of each cost, in the shop's books' money
   */
  receipt?: HaulMoment & {
    note: string
    supplier: { name: string; note?: string }
    lines: { item: string; qty: number; price: number }[]
  }
}

export interface Cargo {
  clients: {
    key: string
    /** one of the carrier's own sales script, by key — or a shop of the platform, by address */
    person?: string
    shop?: string
    /** «pack mine together», where the client said so either way */
    combine?: boolean
  }[]
  /** what was taken in at the depot on one day, and travels together from then on */
  batches: { key: string; taken: HaulMoment; parcels: CargoParcel[] }[]
  boxes: (HaulMoment & { key: string; note: string; box: CargoBox })[]
  /** named by a client and not come yet */
  waiting: { client: string; track: string; note: string; named: number }[]
  trips: (HaulRoad & { batch: string })[]
}

export const tulparCargo = () => resourceJson<Cargo>('demos/tulpar/cargo.json')
