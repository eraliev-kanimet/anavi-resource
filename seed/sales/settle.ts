import {
  and,
  asc,
  db,
  eq,
  gt,
  isNull,
  lt,
  or,
  sql,
  type Db,
  type Transaction,
} from '@anavi/backend/src/db'
import type { Currency } from '@anavi/shared'
import {
  catProduct,
  catStorage,
  catStorageBill,
  catVariant,
} from '@anavi/backend/src/db/schema/cat'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { ordOrder, ordOrderItem } from '@anavi/backend/src/db/schema/ord'
import { orgSite, type OrgSite } from '@anavi/backend/src/db/schema/org'
import { shpCarriage, shpClaim, shpShipment } from '@anavi/backend/src/db/schema/shp'
import { stlEntry, type StlEntry } from '@anavi/backend/src/db/schema/stl'
import { asOrgId, type OrgId, type SiteId } from '@anavi/backend/src/db/ids'
import {
  answerAbout,
  askAbout,
  claimPayment,
  offsetDebts,
  recordPayment,
  statementOf,
} from '@anavi/backend/src/modules/settlement/settlement.service'
import { actorOf } from '../keeping'
import { tulparSettlements } from '../tulpar/hauls'
import { lastId } from './carry'
import { at, past, siteBySlug } from './haul'
import { daysAgo } from './stamp'

/*
 * What the carrier and each of its clients did about the month's debts.
 *
 * The debts are already in the journal by the time this runs — every one written by the platform at
 * the moment its cause happened: a parcel handed over, money taken at a door, a storage bill
 * issued. This pass adds only what people do on top (`tulpar/settlements.json`): one set-off
 * declared, money sent and acknowledged by whoever received it, one line questioned and answered.
 *
 * And then it READS the journal, row by row, beside what each row says it was written for. A
 * balance that adds up proves nothing here: a fee written onto the wrong pair of organizations
 * leaves every total in the base exactly as it should be. So every sourced movement is traced to
 * its document and the two organizations on the row are compared with the two the document names.
 */

/** What the debtor owes the creditor in one currency, as it stood before a moment. */
async function owed(
  debtor: OrgId,
  creditor: OrgId,
  currency: Currency,
  before: Date | null,
  tx: Db | Transaction,
): Promise<number> {
  const [row] = await tx
    .select({ value: sql<number>`coalesce(sum(${stlEntry.amount}), 0)`.mapWith(Number) })
    .from(stlEntry)
    .where(
      and(
        eq(stlEntry.debtorOrgId, debtor),
        eq(stlEntry.creditorOrgId, creditor),
        eq(stlEntry.currency, currency),
        isNull(stlEntry.voidedAt),
        ...(before ? [lt(stlEntry.createdAt, before)] : []),
      ),
    )
  return row?.value ?? 0
}

/** The two organizations a movement's own source says it stands between: who owes, and whom. */
async function sidesOf(
  entry: StlEntry,
  tx: Db | Transaction,
): Promise<{ debtor: bigint; creditors: bigint[] } | null> {
  if (entry.sourceType === null || entry.sourceId === null) return null
  const orgOf = async (siteId: SiteId) =>
    (
      await tx.select({ orgId: orgSite.orgId }).from(orgSite).where(eq(orgSite.id, siteId)).limit(1)
    )[0]?.orgId ?? null

  if (entry.sourceType === 'storage_bill') {
    // The seller of the goods owes the operator that keeps them.
    const [bill] = await tx
      .select({ seller: catStorage.sellerSiteId, operator: catStorage.operatorSiteId })
      .from(catStorageBill)
      .innerJoin(catStorage, eq(catStorage.id, catStorageBill.storageId))
      .where(eq(catStorageBill.id, entry.sourceId))
      .limit(1)
    if (!bill) return null
    const [debtor, creditor] = [await orgOf(bill.seller), await orgOf(bill.operator)]
    return debtor && creditor ? { debtor, creditors: [creditor] } : null
  }

  if (entry.sourceType === 'order') {
    // The shop owes whoever supplied a line of the order.
    const [order] = await tx
      .select({ siteId: ordOrder.siteId })
      .from(ordOrder)
      .where(eq(ordOrder.id, entry.sourceId))
      .limit(1)
    if (!order) return null
    const suppliers = await tx
      .selectDistinct({ orgId: orgSite.orgId })
      .from(ordOrderItem)
      .innerJoin(catVariant, eq(catVariant.id, ordOrderItem.itemId))
      .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
      .innerJoin(orgSite, eq(orgSite.id, catProduct.siteId))
      .where(and(eq(ordOrderItem.orderId, entry.sourceId), eq(ordOrderItem.itemType, 'variant')))
    const debtor = await orgOf(order.siteId)
    return debtor ? { debtor, creditors: suppliers.map((row) => row.orgId) } : null
  }

  // The three that hang on a shipment: the shop of its agreement and the carrier that bore it.
  const shipmentId =
    entry.sourceType === 'shipment_claim'
      ? (
          await tx
            .select({ id: shpClaim.shipmentId })
            .from(shpClaim)
            .where(eq(shpClaim.id, entry.sourceId))
            .limit(1)
        )[0]?.id
      : entry.sourceId
  if (shipmentId === undefined) return null
  const [ride] = await tx
    .select({ carrier: shpShipment.siteId, shop: shpCarriage.shopSiteId })
    .from(shpShipment)
    .innerJoin(shpCarriage, eq(shpCarriage.id, shpShipment.carriageId))
    .where(eq(shpShipment.id, shipmentId))
    .limit(1)
  if (!ride) return null
  const [shop, carrier] = [await orgOf(ride.shop), await orgOf(ride.carrier)]
  if (!shop || !carrier) return null
  // A fee is the shop's debt; money taken at a door and an admitted claim are the carrier's.
  return entry.sourceType === 'shipment_fee'
    ? { debtor: shop, creditors: [carrier] }
    : { debtor: carrier, creditors: [shop] }
}

/**
 * Every movement that names a source, read beside that source. Says what is wrong, row by row,
 * and fails the run: a demo whose journal points at the wrong organization is not a smaller demo.
 *
 * A source that has died under its pointer — an order purged by a later run — is passed over: the
 * pointing side tolerates that, here as everywhere.
 */
async function readJournal(tx: Db | Transaction): Promise<number> {
  const entries = await tx
    .select()
    .from(stlEntry)
    .where(sql`${stlEntry.sourceType} is not null`)
    .orderBy(asc(stlEntry.id))
  const wrong: string[] = []
  let read = 0
  for (const entry of entries) {
    const sides = await sidesOf(entry, tx)
    if (!sides) continue
    read += 1
    if (entry.debtorOrgId !== sides.debtor || !sides.creditors.includes(entry.creditorOrgId)) {
      wrong.push(
        `№${entry.id} (${entry.sourceType} ${entry.sourceId}): the journal says ${entry.debtorOrgId} owes ` +
          `${entry.creditorOrgId}, its source says ${sides.debtor} owes ${sides.creditors.join(' or ')}`,
      )
    }
  }
  // And each cancelling is two rows of one sum on one pair, turned round.
  const offsets = await tx.select().from(stlEntry).where(eq(stlEntry.kind, 'offset'))
  const halves = new Map<string, StlEntry[]>()
  for (const row of offsets) {
    // An offset laid against an order is one row here: its other half is that order's own money.
    if (row.pairId === null && row.sourceType === 'order_offset') continue
    const key = String(row.pairId)
    halves.set(key, [...(halves.get(key) ?? []), row])
  }
  for (const [pairId, rows] of halves) {
    const [a, b] = rows
    if (
      rows.length !== 2 ||
      a!.amount !== b!.amount ||
      a!.currency !== b!.currency ||
      a!.debtorOrgId !== b!.creditorOrgId ||
      a!.creditorOrgId !== b!.debtorOrgId
    ) {
      wrong.push(`offset ${pairId}: not two mirrored rows of one sum`)
    }
  }
  if (wrong.length > 0) throw new Error(`settlements do not read true:\n${wrong.join('\n')}`)
  return read
}

export async function seedSettlements(): Promise<{ pairs: number; read: number } | null> {
  const material = await tulparSettlements()
  return db.transaction(async (tx) => {
    const carrier = await siteBySlug('demo12', tx)
    const carrierOrg = asOrgId(carrier.orgId)
    const currency = carrier.currency as Currency
    const boss = await actorOf(carrier, 'owner', tx)
    let pairs = 0

    for (const pair of material.pairs) {
      const client: OrgSite = await siteBySlug(pair.client, tx)
      const clientOrg = asOrgId(client.orgId)
      const owner = await actorOf(client, 'owner', tx)
      const [standing] = await tx
        .select({ id: stlEntry.id })
        .from(stlEntry)
        .where(
          or(
            and(eq(stlEntry.debtorOrgId, clientOrg), eq(stlEntry.creditorOrgId, carrierOrg)),
            and(eq(stlEntry.debtorOrgId, carrierOrg), eq(stlEntry.creditorOrgId, clientOrg)),
          ),
        )
        .limit(1)
      // Nothing between the two in this run — the client's own demo was not filled.
      if (!standing) continue
      pairs += 1
      const beforeNotice = await lastId(ntfNotice, tx)

      if (pair.offset) {
        const mark = await lastId(stlEntry, tx)
        const [who, other, actor] =
          pair.offset.by === 'carrier'
            ? [carrierOrg, clientOrg, boss]
            : [clientOrg, carrierOrg, owner]
        // Only where a debt stands each way: the door refuses a set-off against nothing, and a
        // run that did not hand a paid-at-the-door order over has nothing to set off.
        const [one, two] = await Promise.all([
          owed(who, other, currency, null, tx),
          owed(other, who, currency, null, tx),
        ])
        if (one > 0 && two > 0) {
          await offsetDebts(who, other, actor, { currency }, tx)
          await tx
            .update(stlEntry)
            .set({ createdAt: past(at(pair.offset)) })
            .where(gt(stlEntry.id, mark))
        }
      }

      if (pair.pay) {
        // Everything that stood when the period closed, less whatever has been settled since —
        // read both ways, because who pays is whoever is left owing.
        const closed = pair.pay.asOf > 0 ? daysAgo(pair.pay.asOf, 0, 0) : null
        const due = async (debtor: OrgId, creditor: OrgId) => {
          const now = await owed(debtor, creditor, currency, null, tx)
          const then = closed ? await owed(debtor, creditor, currency, closed, tx) : now
          return Math.min(then, now)
        }
        const [fromCarrier, fromClient] = [
          (await due(carrierOrg, clientOrg)) - (await due(clientOrg, carrierOrg)),
          (await due(clientOrg, carrierOrg)) - (await due(carrierOrg, clientOrg)),
        ]
        const carrierPays = fromCarrier > 0
        const [debtor, creditor, payer, receiver] = carrierPays
          ? [carrierOrg, clientOrg, boss, owner]
          : [clientOrg, carrierOrg, owner, boss]
        const amount = Math.min(
          carrierPays ? fromCarrier : fromClient,
          await owed(debtor, creditor, currency, null, tx),
        )
        if (amount > 0) {
          const input = {
            currency,
            amount,
            comment: carrierPays ? pair.pay.say.carrier : pair.pay.say.client,
          }
          if (pair.pay.claim) await claimPayment(debtor, creditor, payer, input, tx)
          const row = await recordPayment(creditor, debtor, receiver, input, tx)
          await tx
            .update(stlEntry)
            .set({ createdAt: past(at(pair.pay)) })
            .where(eq(stlEntry.id, row.id))
        }
      }

      if (pair.question) {
        // The fee of a parcel that came back: what the client reads as «charged for nothing».
        const [fee] = await tx
          .select({ id: stlEntry.id })
          .from(stlEntry)
          .innerJoin(shpShipment, eq(shpShipment.id, stlEntry.sourceId))
          .where(
            and(
              eq(stlEntry.sourceType, 'shipment_fee'),
              eq(stlEntry.debtorOrgId, clientOrg),
              eq(stlEntry.creditorOrgId, carrierOrg),
              eq(shpShipment.state, pair.question.about),
              gt(stlEntry.amount, 0),
            ),
          )
          .orderBy(asc(stlEntry.id))
          .limit(1)
        if (fee) {
          await askAbout(clientOrg, fee.id, owner, { text: pair.question.ask }, tx)
          await answerAbout(carrierOrg, fee.id, boss, { text: pair.question.answer }, tx)
        }
      }
      await tx
        .update(ntfNotice)
        .set({ createdAt: past(at(pair.pay ?? pair.offset ?? { days: 0, at: [10, 0] })) })
        .where(gt(ntfNotice.id, beforeNotice))

      // One list read from two chairs: what one side closes on, the other closes on with the sign
      // turned. Said here because it is the sentence the act of reconciliation is opened for.
      const [ours, theirs] = await Promise.all([
        statementOf(carrierOrg, clientOrg, { currency }, tx),
        statementOf(clientOrg, carrierOrg, { currency }, tx),
      ])
      if (ours.closing !== -theirs.closing || ours.entries.length !== theirs.entries.length) {
        throw new Error(
          `settlements: «${carrier.slug}» and «${client.slug}» read different statements — ` +
            `${ours.closing} against ${theirs.closing}`,
        )
      }
    }
    if (pairs === 0) return null
    return { pairs, read: await readJournal(tx) }
  })
}
