import { and, eq, inArray, lt, sql } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catStockMove } from '@anavi/backend/src/db/schema/cat'
import { cntAnnouncement } from '@anavi/backend/src/db/schema/cnt'
import { crmCode, crmContact, crmHandover, crmVisit } from '@anavi/backend/src/db/schema/crm'
import { subFollow } from '@anavi/backend/src/db/schema/sub'
import { formSubmission } from '@anavi/backend/src/db/schema/form'
import { msgMessage, msgThread } from '@anavi/backend/src/db/schema/msg'
import {
  ordCart,
  ordEvent,
  ordOrder,
  ordOrderItem,
  ordPromo,
} from '@anavi/backend/src/db/schema/ord'
import { refAccrual, refPartnership } from '@anavi/backend/src/db/schema/ref'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { sysMedia } from '@anavi/backend/src/db/schema/sys'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { getOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { purgeRides, reverseMoves } from './rides'

/**
 * The sales section of one site, emptied.
 *
 * The script is run by hand and run again, so it has to be able to take back what it put — and what
 * it put reaches into the warehouse. The journal is what makes that exact: every row `cat_stock_move`
 * wrote under `source = order` carries the deltas the service applied, so subtracting their sum is
 * not a second implementation of the warehouse rules, it is the undoing of what was recorded.
 *
 * It empties the section rather than «its own» rows: an order placed by hand on the storefront while
 * testing is the same data, and leaving half of it behind is how a fixture run stops being repeatable.
 * The objects in storage are left where they are — a file with no row costs nothing in development.
 */
export async function purgeSales(
  siteId: SiteId,
  tx: Db | Transaction,
  /*
   * The moment this RUN began, and it exists for one row: a supplier is told about the shop's order
   * («part_placed»), so that notice carries the SUPPLIER's site while the event belongs to the
   * shop's. The demos are purged and filled one after another, so purging the butcher after the
   * market had just filled it would eat the market's fresh news to him.
   *
   * Everything older than the run is what earlier runs left; everything newer is this one's own work
   * and is never touched.
   */
  since: Date,
): Promise<void> {
  const orders = await tx
    .select({ id: ordOrder.id })
    .from(ordOrder)
    .where(eq(ordOrder.siteId, siteId))
  const orderIds = orders.map((row) => row.id)

  // What these sales left outside the section — shipments at a carrier's, relocations, trips,
  // the settlements between organizations — while the orders still exist to find it by.
  await purgeRides(await getOrgSite(siteId, tx), orderIds, tx)

  if (orderIds.length > 0) {
    /*
     * The orders alone, and deliberately NOT the site.
     *
     * A move is signed by the site the VARIANT belongs to, so an order of this shop carrying a
     * supplier's goods journals against the supplier. Filtering by site here found none of those:
     * the orders went, the journal rows stayed, and the butcher's counter dropped a little further
     * on every re-run of the sales fixture. The order ids already narrow this exactly — they ARE
     * this shop's — and the site column narrowed it to the wrong half.
     */
    await reverseMoves(
      and(eq(catStockMove.sourceType, 'order'), inArray(catStockMove.sourceId, orderIds)),
      tx,
    )
    /*
     * What a partner earned on these orders goes with them, and it has to be said out loud.
     *
     * The journal points at the order with a plain foreign key and NO cascade — deliberately, since
     * an accrual that lost its order would be money owed for nothing — so a second run of this
     * fixture would not quietly leave orphans, it would fail on the delete below. The partnerships
     * themselves stay: they are part of the demo, made by the reset, and the shop's list of who it
     * works with is not a sale.
     */
    await tx.delete(refAccrual).where(inArray(refAccrual.orderId, orderIds))
    await tx.delete(ordEvent).where(inArray(ordEvent.orderId, orderIds))
    await tx.delete(ordOrderItem).where(inArray(ordOrderItem.orderId, orderIds))
    await tx.delete(ordOrder).where(inArray(ordOrder.id, orderIds))
  }

  // items go with it — the line points at its basket with `cascade`
  await tx.delete(ordCart).where(eq(ordCart.siteId, siteId))

  const threads = await tx
    .select({ id: msgThread.id })
    .from(msgThread)
    .where(eq(msgThread.siteId, siteId))
  if (threads.length > 0) {
    await tx.delete(msgMessage).where(
      inArray(
        msgMessage.threadId,
        threads.map((row) => row.id),
      ),
    )
    await tx.delete(msgThread).where(eq(msgThread.siteId, siteId))
  }

  await tx
    .delete(sysMedia)
    .where(
      and(
        eq(sysMedia.siteId, siteId),
        inArray(sysMedia.ownerType, ['submission', 'message', 'order']),
      ),
    )

  /*
   * The links CUSTOMERS took, and their codes — the only partnerships this fixture makes.
   *
   * A buyer's link hangs on a card, and the cards go below: a partnership left pointing at a deleted
   * contact is exactly the orphan the platform's own rule about polymorphic pairs warns of, and the
   * next run would mint a second link for the same person, so half their friends would bring them
   * money and half would not. The shop's own partners — invited agencies, appointed sellers — are
   * made by the reset and stay: whom a business works with is not a sale.
   */
  const taken = await tx
    .select({ id: refPartnership.id })
    .from(refPartnership)
    .where(and(eq(refPartnership.siteId, siteId), eq(refPartnership.holderType, 'contact')))
  if (taken.length > 0) {
    const ids = taken.map((row) => row.id)
    await tx.delete(ordPromo).where(inArray(ordPromo.partnershipId, ids))
    await tx.delete(refPartnership).where(inArray(refPartnership.id, ids))
  }

  /*
   * And what the shop ANNOUNCED, which is the same class of thing as an order: made by this fixture,
   * told to the cards below, and pointed at by nothing.
   *
   * Left behind, the second run does not merely double the list — it FAILS: the service allows one
   * announcement a day and measures it from the last one sent, and the newest of the previous run's
   * is younger than that. Found by running the fixture twice, which is the only way this shape of
   * defect is ever found.
   */
  await tx.delete(cntAnnouncement).where(eq(cntAnnouncement.siteId, siteId))

  /*
   * What this shop SAID to its clients, and it has to go with them.
   *
   * A notice hangs on a card by a polymorphic pair — no foreign key, nothing to cascade — and the
   * cards below are deleted outright. Left behind, every row of the feed goes on pointing at a
   * person who no longer exists, and the next run creates the same people with new numbers: two
   * hundred and seventeen orphans after the second pass, doubling on every one after that. The same
   * shape the accruals had, found the same way — by running the fixture twice and counting.
   *
   * Only what was said to a CARD: the same feed holds what the platform told this organization's own
   * staff, and staff are not made here.
   */
  await tx
    .delete(ntfNotice)
    .where(
      and(
        eq(ntfNotice.siteId, siteId),
        eq(ntfNotice.recipientType, 'contact'),
        lt(ntfNotice.createdAt, since),
      ),
    )

  /*
   * И то, что платформа сказала СОТРУДНИКАМ об этих же продажах.
   *
   * Ту же ленту наполняет каждое обращение, каждый заказ и каждый ушедший в ноль остаток, и она не
   * чистилась никогда: после двух прогонов у владельца 706 строк «пришло сообщение» вместо 353, после
   * трёх — 1059. Дефект не мой и старше этого пункта; найден тем же способом — прогоном фикстуры
   * дважды и подсчётом.
   *
   * По `site_id`, а не по организации: `staff_joined` пишет сборка демо, у неё сайта нет, и она
   * должна пережить чистку продаж.
   */
  await tx
    .delete(ntfNotice)
    .where(
      and(
        eq(ntfNotice.siteId, siteId),
        eq(ntfNotice.recipientType, 'user'),
        lt(ntfNotice.createdAt, since),
      ),
    )

  /*
   * Кроме одной строки без сайта: утренний обход говорит СЛЕДЯЩЕЙ организации, и её уведомление
   * принадлежит чужому бэкофису — сайта в нём нет по устройству, зато есть указатель на подписку
   * этого сайта. По нему и находится.
   */
  await tx
    .delete(ntfNotice)
    .where(
      and(
        eq(ntfNotice.kind, 'catalog_supplier'),
        lt(ntfNotice.createdAt, since),
        inArray(
          ntfNotice.subjectId,
          tx.select({ id: subFollow.id }).from(subFollow).where(eq(subFollow.siteId, siteId)),
        ),
      ),
    )

  await tx.delete(formSubmission).where(eq(formSubmission.siteId, siteId))
  /*
   * Before the cards themselves, and it has to be said out loud: a follower points at a card through
   * a POLYMORPHIC pair, so there is no foreign key to take it down and no error if it is left. A
   * second run would leave rows following people who no longer exist — the kind of orphan that shows
   * up months later as a digest sent about nobody.
   */
  await tx
    .delete(subFollow)
    .where(and(eq(subFollow.siteId, siteId), eq(subFollow.subscriberType, 'contact')))
  /*
   * A business following this catalogue is NOT deleted — that subscription is made by the reset,
   * between two demos, and is part of what the shop is rather than of what happened in it. What is
   * part of what happened is the morning it was told about: the marks go back, so the next run has a
   * morning of its own instead of a silent one.
   */
  await tx
    .update(subFollow)
    .set({ notifiedAt: null, seenAt: null })
    .where(and(eq(subFollow.siteId, siteId), eq(subFollow.subscriberType, 'org')))
  /*
   * The codes on their way to somebody's inbox, and they are deliberately deleted BEFORE the cards.
   *
   * Nothing points at them — a code is keyed by site and address and belongs to nobody until it is
   * entered — so the cards going below take nothing of the sort with them. Left behind, a run that
   * failed half way through leaves a live one, and the next run's first request for the same address
   * meets the resend cooldown and fails on flat ground. The sessions need no line of their own: they
   * hang on a card with `cascade`.
   */
  await tx.delete(crmCode).where(eq(crmCode.siteId, siteId))
  /*
   * Every card but the ones a carrier's documents stand on.
   *
   * A carrier's shipment names its sender and its recipient by card, a cargo client's code and
   * the parcels they said are coming hang on one — and none of those is cleared here yet: this
   * purge empties the SALES section, and what rides is not in it. Deleting such a card would be
   * refused by the database, and the run with it. So it stays, its conversations go like everybody
   * else's, and the next appeal from the same telephone finds the card it already had.
   */
  // The visits an agent marked on these cards go before them: a plain foreign key, no cascade.
  await tx.delete(crmVisit).where(eq(crmVisit.siteId, siteId))
  // Whose each client is was said by this seeder too — a card taken, a first order written — so it
  // is unsaid with its history: a card that survives the purge would otherwise keep its keeper and
  // lose the line that explains them, and the second run would not read as the first.
  await tx.delete(crmHandover).where(eq(crmHandover.siteId, siteId))
  await tx.update(crmContact).set({ assigneeId: null }).where(eq(crmContact.siteId, siteId))
  await tx.delete(crmContact).where(
    and(
      eq(crmContact.siteId, siteId),
      sql`not exists (
        select 1 from shp_shipment s
        where s.sender_contact_id = ${crmContact.id} or s.recipient_contact_id = ${crmContact.id}
      )`,
      sql`not exists (select 1 from shp_client c where c.contact_id = ${crmContact.id})`,
      sql`not exists (select 1 from shp_expected e where e.contact_id = ${crmContact.id})`,
    ),
  )
}
