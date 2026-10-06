import { and, asc, eq, isNull, sql } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { NEW_DAYS } from '@anavi/shared'
import { catProduct } from '@anavi/backend/src/db/schema/cat'
import { listVariants, updateVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

/**
 * A catalogue that was not all built this morning.
 *
 * Every service stamps «now», so a freshly seeded shop has EVERY product inside the platform's own
 * thirty-day horizon: the «new» badge stands on all two hundred cards at once and therefore says
 * nothing, and a fresh follower opening the updates page is shown the entire catalogue as news. Both
 * are the same defect — a demo with no past.
 *
 * The last handful keep today's date, so «new» and «what appeared since you last looked» have
 * something true to point at. Written past the service layer on purpose: this is the post-hoc
 * fixture adjustment the convention names in as many words — a service must never offer to backdate
 * a product, and a fixture is useless without it.
 */
/**
 * How many of a shop's newest goods stay recent — a tenth of the shelf, never more than six and
 * never fewer than two.
 *
 * A flat six is right for two hundred goods and absurd for thirteen: half of a small brand's
 * catalogue would wear the «new» badge, which is the very thing being fixed.
 */
const RECENT_MAX = 6
const recentCount = (total: number) => Math.max(2, Math.min(RECENT_MAX, Math.ceil(total / 10)))

export async function ageCatalog(siteId: SiteId, tx: Db | Transaction): Promise<void> {
  const rows = await tx
    .select({ id: catProduct.id })
    .from(catProduct)
    .where(and(eq(catProduct.siteId, siteId), isNull(catProduct.deletedAt)))
    .orderBy(asc(catProduct.position), asc(catProduct.id))

  if (rows.length === 0) return

  // The newest are the last ones the fixture wrote: a shop adds to the end of its own list.
  const keep = recentCount(rows.length)
  const recent = rows.slice(-keep)
  const older = rows.slice(0, -keep)

  for (const [index, row] of older.entries()) {
    // Spread over half a year, oldest first, so the listing has an order to sort by and the badge
    // has a boundary to fall on rather than a single stale date shared by two hundred rows.
    const days = NEW_DAYS + 5 + Math.floor((index / Math.max(1, older.length)) * 150)
    await tx
      .update(catProduct)
      .set({ createdAt: sql`now() - ${`${days} days`}::interval` })
      .where(eq(catProduct.id, row.id))
  }

  for (const [index, row] of recent.entries()) {
    // Yesterday and the day before, not this second: a follower who signed up an hour ago must still
    // find something, and «appeared at 03:41 today» reads like a machine rather than a shop.
    const hours = (recent.length - index) * 9
    await tx
      .update(catProduct)
      .set({ createdAt: sql`now() - ${`${hours} hours`}::interval` })
      .where(eq(catProduct.id, row.id))
  }

  /*
   * A catalogue built in one transaction has already recorded a price move on every product with two
   * differently-priced packs: the second pack widened the range the instant it appeared, and the
   * writer noted it truthfully. True of the machinery, false of the shop — nobody's price moved. So
   * the past is wiped before it is written, and afterwards exactly the goods below carry a mark.
   */
  await tx
    .update(catProduct)
    .set({ priceChangedAt: null })
    .where(and(eq(catProduct.siteId, siteId), isNull(catProduct.deletedAt)))

  await movePrices(siteId, older, tx)
}

/** A tenth of the shelf again, and never more than five: a price list, not a clearance. */
const REPRICED_MAX = 5

/**
 * A catalogue whose prices have moved at least once.
 *
 * The other half of «a demo with no past». Aging alone leaves every price exactly as the fixture
 * typed it, so the follower's page can only ever show arrivals — and the shop this was built for is
 * one whose entire morning is new prices on the same thirty goods.
 *
 * Deliberately through the SERVICE and not by writing the column: the mark is set by the single
 * writer of the price snapshot, and if it ever stops being set this fixture produces nothing and the
 * page goes empty. A fixture that wrote `price_changed_at` by hand would go on looking correct with
 * the mechanism underneath it broken.
 *
 * Only the aged part of the shelf, so «new price» stands on goods that are not also «new» — the two
 * badges together are true and legal, but a demo where they always coincide shows neither.
 */
async function movePrices(
  siteId: SiteId,
  older: { id: bigint }[],
  tx: Db | Transaction,
): Promise<void> {
  const picked = older.slice(-Math.max(0, Math.min(REPRICED_MAX, Math.ceil(older.length / 10))))

  for (const [index, row] of picked.entries()) {
    const variant = (await listVariants(row.id, tx)).find((one) => one.price !== null)
    if (!variant) continue

    // Down and up in turn: a morning price list moves both ways, and a demo where everything only
    // ever falls teaches the eye that the badge means «sale».
    const down = index % 2 === 0
    const step = down ? 0.9 : 1.08
    // To ten whole units of the currency: a price is kept in minor units, and rounding it «to ten»
    // there left a socket at 604.80 — a figure no shop writes on a tag.
    const price = Math.max(1000, Math.round((variant.price! * step) / 1000) * 1000)
    if (price === variant.price) continue

    await updateVariant(
      siteId,
      row.id,
      variant.id,
      {
        price,
        // What the shop says itself, and the only «was» on this platform — a cut is shown struck
        // through, a rise is not, because a struck-through lower price beside a higher one is an
        // anti-sale nobody has ever printed.
        oldPrice: down ? variant.price : null,
      },
      tx,
    )

    // The one post-hoc touch the convention allows a fixture and forbids a service: the service has
    // just stamped «now», and a price list that all moved in the same second reads like a machine.
    await tx
      .update(catProduct)
      .set({ priceChangedAt: sql`now() - ${`${(index + 1) * 7} hours`}::interval` })
      .where(eq(catProduct.id, row.id))
  }
}
