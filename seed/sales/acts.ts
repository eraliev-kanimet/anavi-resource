import { inArray, sql, type Db, type Transaction } from '@anavi/backend/src/db'
import { shpBox } from '@anavi/backend/src/db/schema/shp'
import type { SiteId } from '@anavi/backend/src/db/ids'
import type { Actor } from '@anavi/backend/src/lib/actor'
import {
  closeAct,
  createAct,
  scanIntoAct,
  viewAct,
} from '@anavi/backend/src/modules/shipment/act.service'

/*
 * A change of hands, written the only way the platform writes one: an act that lists the boxes,
 * counts them by their codes and is closed. The shipments it moves are moved by the act's close and
 * by nothing else, so the demo's history stands on the same documents a carrier's would.
 */
export interface Hands {
  direction: 'out' | 'in'
  party: 'courier' | 'vehicle' | 'sender' | 'counter'
  courierId?: bigint
  vehicleId?: bigint
  vehicle?: string
  placeId?: bigint
}

export async function handByAct(
  siteId: SiteId,
  opener: Actor,
  closer: Actor,
  hands: Hands,
  shipmentIds: readonly bigint[],
  tx: Db | Transaction,
): Promise<bigint> {
  const act = await createAct(
    siteId,
    opener,
    {
      direction: hands.direction,
      party: hands.party,
      courierId: hands.courierId === undefined ? null : String(hands.courierId),
      vehicleId: hands.vehicleId === undefined ? null : String(hands.vehicleId),
      vehicle: hands.vehicle ?? null,
      placeId: hands.placeId === undefined ? null : String(hands.placeId),
    },
    tx,
  )
  const boxes = await tx
    .select({ code: shpBox.code })
    .from(shpBox)
    .where(inArray(shpBox.shipmentId, [...shipmentIds]))
  for (const box of boxes) {
    await scanIntoAct(siteId, act.id, { code: box.code, as: 'listed' }, tx)
    await scanIntoAct(siteId, act.id, { code: box.code, as: 'received' }, tx)
  }
  const outcome = await closeAct(siteId, act.id, closer, await shortOf(siteId, act.id, tx), tx)
  if (outcome.moved !== shipmentIds.length) {
    throw new Error(
      `act ${act.number}: ${outcome.moved} of ${shipmentIds.length} shipments changed hands`,
    )
  }
  return act.id
}

// What the act's screen would say is missing: the platform's own count of its list, never ours.
async function shortOf(siteId: SiteId, actId: bigint, tx: Db | Transaction) {
  const { items } = await viewAct(siteId, actId, tx)
  return { missing: items.filter((one) => one.listed && !one.received).length }
}

/**
 * Acts are dated by what they wrote. The fixture moves its events back to the day they happened and
 * must move the document that wrote them with them, or an evening three weeks ago is signed today.
 */
export async function stampActs(tx: Db | Transaction): Promise<void> {
  await tx.execute(sql`
    update shp_act a
    set created_at = w.at,
        closed_at = w.at,
        confirmed_at = case when a.confirmed_at is null then null else w.at end
    from (select act_id, min(created_at) as at from shp_event where act_id is not null group by act_id) w
    where w.act_id = a.id
  `)
}

/**
 * A trip's own count: the loading before it leaves, or the unloading at the stop it has come to.
 * Opened by the dispatcher with the trip's boxes listed, every code in `codes` counted, and closed —
 * and the close of an unloading is the word «arrived», with `note` said beside it.
 */
export async function countTrip(
  siteId: SiteId,
  dispatcher: Actor,
  tripId: bigint,
  way: 'load' | 'unload',
  codes: readonly string[],
  note: string | null,
  tx: Db | Transaction,
): Promise<void> {
  const act = await createAct(
    siteId,
    dispatcher,
    {
      direction: way === 'load' ? 'out' : 'in',
      party: 'vehicle',
      tripId: String(tripId),
      note,
    },
    tx,
  )
  for (const code of codes) await scanIntoAct(siteId, act.id, { code, as: 'received' }, tx)
  await closeAct(siteId, act.id, dispatcher, await shortOf(siteId, act.id, tx), tx)
}
