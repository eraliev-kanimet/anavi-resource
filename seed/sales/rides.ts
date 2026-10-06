import { and, eq, inArray, isNull, or, sql, type Db, type Transaction } from '@anavi/backend/src/db'
import {
  catRelocation,
  catStock,
  catStockMove,
  catStorage,
  catStorageBill,
  catStorageBillLine,
  catVariant,
} from '@anavi/backend/src/db/schema/cat'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import {
  shpActItem,
  shpCash,
  shpClaim,
  shpClient,
  shpExpected,
  shpShipment,
  shpTrip,
  shpTripItem,
} from '@anavi/backend/src/db/schema/shp'
import { stlEntry } from '@anavi/backend/src/db/schema/stl'
import { marked, markedAll, unmark, unmarkGoneTrips } from './fixture'

/*
 * What a shop's sales left OUTSIDE its own section, taken back with them.
 *
 * An order handed to a carrier becomes a shipment at the carrier's; goods sent between two of the
 * shop's points become a relocation and another shipment; every one of those may ride a trip, owe a
 * fee, carry money taken at a door, and end as rows of the journal two organizations settle by. None
 * of it hangs on the order by a foreign key — the pointers are polymorphic on purpose — so deleting
 * the orders alone left all of it standing, pointing at nothing: a debt with no source, a courier
 * holding money for an order that no longer exists.
 *
 * Taken back in the order the pointers run: what is owed first, then what rides, then what was
 * ridden in. A trip is the carrier's, so it goes only when nothing is left aboard.
 */

/**
 * The warehouse put back by the journal's own rows, and the rows removed — the very undoing the
 * orders get, for any set of movements: the site totals, the same one level down by point of sale,
 * and then the rows themselves.
 *
 * The point's row is put back by the PAIR (variant, point) and never only through the site total:
 * the total would come out right while the point stayed sold out, and the next run would fail on
 * `order.out_of_stock`.
 */
export async function reverseMoves(
  where: ReturnType<typeof and>,
  tx: Db | Transaction,
): Promise<void> {
  const applied = await tx
    .select({
      variantId: catStockMove.variantId,
      placeId: catStockMove.placeId,
      stock: sql<number>`sum(${catStockMove.stockDelta})::int`,
      reserved: sql<number>`sum(${catStockMove.reservedDelta})::int`,
    })
    .from(catStockMove)
    .where(where)
    .groupBy(catStockMove.variantId, catStockMove.placeId)
  const totals = new Map<bigint, { stock: number; reserved: number }>()
  for (const row of applied) {
    const sum = totals.get(row.variantId) ?? { stock: 0, reserved: 0 }
    totals.set(row.variantId, {
      stock: sum.stock + row.stock,
      reserved: sum.reserved + row.reserved,
    })
    if (row.placeId === null) continue
    await tx
      .update(catStock)
      .set({
        stock: sql`${catStock.stock} - ${row.stock}`,
        reserved: sql`${catStock.reserved} - ${row.reserved}`,
      })
      .where(and(eq(catStock.variantId, row.variantId), eq(catStock.placeId, row.placeId)))
  }
  for (const [variantId, sum] of totals) {
    await tx
      .update(catVariant)
      .set({
        // Null stays null: a variant nobody counts was never moved, only journalled.
        stock: sql`${catVariant.stock} - ${sum.stock}`,
        reserved: sql`${catVariant.reserved} - ${sum.reserved}`,
      })
      .where(eq(catVariant.id, variantId))
  }
  await tx.delete(catStockMove).where(where)
}

/** Shipments removed with everything that points at them, and the trips left with nothing aboard. */
async function dropShipments(ids: readonly bigint[], tx: Db | Transaction): Promise<void> {
  if (ids.length === 0) return
  const list = [...ids]
  const claims = await tx
    .select({ id: shpClaim.id })
    .from(shpClaim)
    .where(inArray(shpClaim.shipmentId, list))
  // What the two organizations owe each other BECAUSE of these: the fee, the money taken at the
  // door, a claim admitted. A debt whose source is gone is the thing this file exists to prevent.
  await tx.delete(stlEntry).where(
    or(
      and(
        inArray(stlEntry.sourceType, ['shipment', 'shipment_fee']),
        inArray(stlEntry.sourceId, list),
      ),
      claims.length > 0
        ? and(
            eq(stlEntry.sourceType, 'shipment_claim'),
            inArray(
              stlEntry.sourceId,
              claims.map((row) => row.id),
            ),
          )
        : undefined,
    ),
  )
  await tx.delete(shpClaim).where(inArray(shpClaim.shipmentId, list))
  await tx.delete(shpExpected).where(inArray(shpExpected.shipmentId, list))
  await tx.delete(shpActItem).where(inArray(shpActItem.shipmentId, list))
  await tx.delete(shpTripItem).where(inArray(shpTripItem.shipmentId, list))
  // A box points at the parcels repacked into it by a plain number: cleared, so nothing is left
  // saying it went into a box that is gone.
  await tx
    .update(shpShipment)
    .set({ mergedIntoId: null })
    .where(inArray(shpShipment.mergedIntoId, list))
  // Its history, boxes, hands, weighings and counter payments go with it by cascade.
  await tx.delete(shpShipment).where(inArray(shpShipment.id, list))
  // A trip is the carrier's own document — but one THIS FIXTURE made, left with nothing aboard, is
  // a vehicle that carried nothing, and its stops and its words go with it. By the mark and not by
  // emptiness alone: a trip a dispatcher made by hand and has not loaded yet is empty too.
  await tx
    .delete(shpTrip)
    .where(
      and(
        inArray(shpTrip.id, markedAll('trip', tx)),
        sql`not exists (select 1 from ${shpTripItem} where ${shpTripItem.tripId} = ${shpTrip.id})`,
      ),
    )
  await unmarkGoneTrips(tx)
}

/** A site's relocations, their rides and the stock they moved — put back as if nothing was sent. */
export async function purgeRelocations(site: OrgSite, tx: Db | Transaction): Promise<void> {
  const sent = await tx
    .select({ id: catRelocation.id })
    .from(catRelocation)
    .where(eq(catRelocation.siteId, site.id))
  if (sent.length === 0) return
  const ids = sent.map((row) => row.id)
  const rides = await tx
    .select({ id: shpShipment.id })
    .from(shpShipment)
    .where(and(eq(shpShipment.sourceType, 'relocation'), inArray(shpShipment.sourceId, ids)))
  await dropShipments(
    rides.map((row) => row.id),
    tx,
  )
  await reverseMoves(
    and(eq(catStockMove.sourceType, 'relocation'), inArray(catStockMove.sourceId, ids)),
    tx,
  )
  // The lines go with the document by cascade.
  await tx.delete(catRelocation).where(inArray(catRelocation.id, ids))
}

/**
 * Everything of one site's sales that lives outside its sales section. Called by the purge of that
 * section BEFORE the orders go: the orders are what the pointers are found by.
 */
export async function purgeRides(
  site: OrgSite,
  orderIds: readonly bigint[],
  tx: Db | Transaction,
): Promise<void> {
  // Its orders handed to somebody's couriers, wherever those shipments live.
  if (orderIds.length > 0) {
    const handed = await tx
      .select({ id: shpShipment.id })
      .from(shpShipment)
      .where(and(eq(shpShipment.sourceType, 'order'), inArray(shpShipment.sourceId, [...orderIds])))
    await dropShipments(
      handed.map((row) => row.id),
      tx,
    )
    // And what a shop owes its suppliers for the orders that are going: the same rule, for the
    // debt that has always been written here and was never taken back.
    await tx
      .delete(stlEntry)
      .where(and(eq(stlEntry.sourceType, 'order'), inArray(stlEntry.sourceId, [...orderIds])))
  }
  await purgeRelocations(site, tx)

  /*
   * A carrier's own cargo: parcels taken in at its depots and the boxes repacked from them, the
   * numbers clients said are coming, and the codes those clients were given. All of it is this
   * site's, all of it is put back by the run, and the cards those rows held in place are then free
   * to go with the rest.
   */
  const cargo = await tx
    .select({ id: shpShipment.id })
    .from(shpShipment)
    .where(and(eq(shpShipment.siteId, site.id), sql`${shpShipment.depotId} is not null`))
  await dropShipments(
    cargo.map((row) => row.id),
    tx,
  )
  await tx.delete(shpExpected).where(eq(shpExpected.siteId, site.id))
  await tx.delete(shpClient).where(eq(shpClient.siteId, site.id))

  // What its couriers' takings were handed in for. A hand-in belongs to the carrier and names no
  // order by pointer, so it is found by the mark the run left on it — never by the words of its
  // note, which a person at the desk is free to type too.
  await tx.delete(shpCash).where(inArray(shpCash.id, marked(site.id, 'cash', tx)))
  await unmark(site.id, 'cash', tx)

  // The bills for keeping its goods, with the debt each wrote; the run issues them again.
  const bills = await tx
    .select({ id: catStorageBill.id })
    .from(catStorageBill)
    .innerJoin(catStorage, eq(catStorage.id, catStorageBill.storageId))
    .where(eq(catStorage.sellerSiteId, site.id))
  if (bills.length > 0) {
    const ids = bills.map((row) => row.id)
    await tx
      .delete(stlEntry)
      .where(and(eq(stlEntry.sourceType, 'storage_bill'), inArray(stlEntry.sourceId, ids)))
    await tx.delete(catStorageBillLine).where(inArray(catStorageBillLine.billId, ids))
    await tx.delete(catStorageBill).where(inArray(catStorageBill.id, ids))
  }

  /*
   * And what PEOPLE wrote between this organization and anybody: money acknowledged, a set-off
   * declared, and the cancelling the platform did by itself. None of them names a source — they
   * settle the balance of a pair, not a document — so they are found by the pair. Whatever sourced
   * debts remain on such a pair belong to the other side's own sales, and the settling pass at the
   * end of the run reads the balance afresh and settles it again.
   */
  await tx
    .delete(stlEntry)
    .where(
      and(
        isNull(stlEntry.sourceType),
        or(eq(stlEntry.debtorOrgId, site.orgId), eq(stlEntry.creditorOrgId, site.orgId)),
      ),
    )
}
