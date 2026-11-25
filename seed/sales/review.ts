import { desc, eq, type Db, type Transaction } from '@anavi/backend/src/db'
import type { OrdOrder } from '@anavi/backend/src/db/schema/ord'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import { revReview } from '@anavi/backend/src/db/schema/rev'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { reviewOrder } from '@anavi/backend/src/modules/order/order.review'
import { updateReview } from '@anavi/backend/src/modules/review/review.service'
import { replyToShelfReview } from '@anavi/backend/src/modules/review/review-shelf.service'
import { dayIn } from '@anavi/shared'
import type { ScriptReview } from './script'

const DAY = 24 * 60 * 60 * 1000

/**
 * What the buyer said of an order once it was closed — through the door the order's own page
 * calls, so the record lands where the engine puts it: on the site the order was PLACED on, naming
 * whoever did the job or owns the card. An order that is not closed is refused there, and the run
 * with it: a fixture must not believe in a review the buyer could not have written.
 *
 * Publishing is the act of the site the buying was done on, and the answer is given by the one
 * spoken of — each by its own door. `line` is which of the order's cards, counting from nought in
 * the order the order lists them. `on` is when the order was placed.
 */
export async function reviewPlaced(
  page: OrgSite,
  order: OrdOrder,
  said: ScriptReview,
  line: number,
  on: Date,
  tx: Db | Transaction,
): Promise<void> {
  await reviewOrder(order, { line, rating: said.rating, text: said.text }, page.defaultLocale, tx)
  const [written] = await tx
    .select()
    .from(revReview)
    .where(eq(revReview.orderId, order.id))
    .orderBy(desc(revReview.id))
    .limit(1)
  if (!written) throw new Error(`${page.slug}: the review of №${order.number} was not written`)
  // The one thing no door offers: a review said some days ago.
  const day = new Date(Math.min(on.getTime() + said.after * DAY, Date.now()))
  await tx
    .update(revReview)
    .set({ saidOn: dayIn(page.timezone, day), createdAt: day })
    .where(eq(revReview.id, written.id))
  if (said.shown) await updateReview(asSiteId(page.id), written.id, { visible: true }, tx)
  if (said.reply) {
    // Whoever is spoken of: the site that did the job, or the one whose card it is.
    const spoken = written.subjectSiteId
    if (spoken === null || spoken === page.id) {
      throw new Error(
        `${page.slug}: the review of №${order.number} is of the shop's own — nobody else to answer it`,
      )
    }
    await replyToShelfReview(asSiteId(spoken), written.id, { text: said.reply }, tx)
  }
}
