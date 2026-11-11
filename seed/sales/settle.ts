import { and, asc, db, eq, gt, or, type Db, type Transaction } from '@anavi/backend/src/db'
import { dayIn, type Currency } from '@anavi/shared'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import { shpShipment } from '@anavi/backend/src/db/schema/shp'
import { stlEntry } from '@anavi/backend/src/db/schema/stl'
import { asOrgId, type OrgId } from '@anavi/backend/src/db/ids'
import { answerAbout, askAbout } from '@anavi/backend/src/modules/settlement/settlement.question'
import {
  acknowledgePayment,
  recordPayment,
  sendPayment,
} from '@anavi/backend/src/modules/settlement/settlement.payment'
import { offsetDebts } from '@anavi/backend/src/modules/settlement/settlement.offset'
import { pairBalance } from '@anavi/backend/src/modules/settlement/settlement.balance'
import { actorOf } from '../links/keeping'
import { DEMOS } from '../demos'
import { findResourceJson } from '../lib/resource'
import { followSettlementDays } from './books'
import { lastId } from './carry'
import { at } from './haul'
import { siteBySlug } from '../lib/sites'
import { daysAgo, past, type HaulMoment } from './stamp'
import { dayOfMoment } from '../lib/days'

/*
 * What the carrier and each of its clients did about the month's debts.
 *
 * The debts are already in the journal by the time this runs — every one written by the platform at
 * the moment its cause happened: a parcel handed over, money taken at a door, a storage bill
 * issued. This pass adds only what people do on top (`demos/tulpar/settlements.json`): one set-off
 * declared, money sent and acknowledged by whoever received it, one line questioned and answered.
 */

/** What the debtor owes the creditor in one currency, as it stood before a moment — the platform's own sum. */
const owed = (
  debtor: OrgId,
  creditor: OrgId,
  currency: Currency,
  before: Date | null,
  tx: Db | Transaction,
): Promise<number> =>
  pairBalance(debtor, creditor, currency, tx, before ? dayOfMoment(before) : undefined)

/** One carrier's file: its sentence about the pairs it carries for, and the carrier it names. */
/*
 * What was settled between the carrier and each of its clients, and who said what about it.
 *
 * The debts themselves are not here: they are written by the platform when a parcel is handed
 * over, money is taken at a door or a bill is issued. This is only what PEOPLE did on top — a
 * set-off declared, money sent and acknowledged, a line questioned.
 */
export interface Settlements {
  /** the carrier the file is about, by the address of its site */
  carrier: string
  pairs: {
    /** the client, by the address of its site */
    client: string
    /** a debt each way cancelled by one side's declaration */
    offset?: HaulMoment & { by: 'carrier' | 'client' }
    /**
     * Money sent, for everything that stood `asOf` days ago — a remittance covers a period that
     * has closed, and what was taken since waits for the next one. WHO sends is not said here: it
     * is whoever owes once the fees and the money taken at doors have been netted, and that is
     * read off the journal. Each side has its own words for the transfer. `claim` is the payer
     * saying «we have sent it» before the receiver says it came.
     */
    pay?: HaulMoment & { asOf: number; say: { carrier: string; client: string }; claim?: boolean }
    /** one movement the client asked about, and the carrier's answer */
    question?: { about: 'returned'; ask: string; answer: string }
  }[]
}

export async function seedSettlements(): Promise<number | null> {
  return db.transaction(async (tx) => {
    let pairs = 0
    // Every demo that says what was settled — its folder holds the file, and the file names the carrier.
    for (const demo of DEMOS) {
      const material = await findResourceJson<Settlements>(`demos/${demo.slug}/settlements.json`)
      if (material) pairs += await settleCarrier(material, tx)
    }
    return pairs === 0 ? null : pairs
  })
}

async function settleCarrier(material: Settlements, tx: Db | Transaction): Promise<number> {
  {
    const carrier = await siteBySlug(material.carrier, tx)
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
        await followSettlementDays(tx)
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
            // The carrier remits what its couriers took at the door; the client pays for carriage.
            basis: carrierPays ? 'collected' : 'carriage',
          }
          const paidAt = past(at(pair.pay))
          // The day the money moved is said to the doors: each side's books and the journal stand
          // on it, in the days of the organization that says it.
          const zoneOf = (orgId: OrgId) => (orgId === carrierOrg ? carrier : client).timezone
          const dated = (orgId: OrgId) => ({ ...input, on: dayIn(zoneOf(orgId), paidAt) })
          // Said by the payer, the receiver's «it came» confirms it; said by nobody, the payer
          // names the place the money left from once it has seen the receiver's word.
          const send = pair.pay.claim
            ? await sendPayment(debtor, creditor, payer, dated(debtor), tx)
            : null
          const row = await recordPayment(
            creditor,
            debtor,
            receiver,
            { ...dated(creditor), sendId: send?.id },
            tx,
          )
          if (!send) await acknowledgePayment(debtor, row.id, payer, {}, tx)
          await tx.update(stlEntry).set({ createdAt: paidAt }).where(eq(stlEntry.id, row.id))
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
    }
    return pairs
  }
}
