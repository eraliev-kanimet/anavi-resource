import type { Transaction } from '@anavi/backend/src/db'
import {
  confirmAccrual,
  listAccruals,
  payAccrual,
} from '@anavi/backend/src/modules/referral/accrual.service'
import { listPartnerships } from '@anavi/backend/src/modules/referral/partnership.service'
import type { SiteRun } from './context'

/**
 * What the shop has DONE about what it owes — the other half of a partner's journal.
 *
 * A section where every row says «pending» shows the arithmetic and nothing about the relationship:
 * the platform's own word is only «this is what came out, look at it», and confirming and paying are
 * decisions the organization makes. So the journal is settled by AGE, the way a business actually
 * does it — this month's work is checked, last month's has been paid, this week's has not been
 * looked at yet.
 *
 * By age and never at random: a fixture whose money moves differently on every run is a fixture
 * nobody can check twice. And only the positive rows are touched — a claw-back is settled by
 * whatever settled the row it corrects, and confirming one on its own would be reading the journal
 * backwards.
 */
const CHECKED_AFTER = 14
const SETTLED_AFTER = 30
const DAY = 24 * 60 * 60 * 1000

export async function seedRewards(ctx: SiteRun, tx: Transaction): Promise<number> {
  const rows = await listPartnerships(ctx.site.id, tx)
  let moved = 0
  for (const row of rows) {
    const journal = await listAccruals(row.partnership.id, tx)
    for (const one of journal) {
      if (one.accrual.amount <= 0 || one.accrual.status !== 'pending') continue
      const days = (Date.now() - one.accrual.createdAt.getTime()) / DAY
      if (days < CHECKED_AFTER) continue
      await confirmAccrual([row.partnership.id], one.accrual.id, ctx.actor, tx)
      moved += 1
      if (days < SETTLED_AFTER) continue
      await payAccrual([row.partnership.id], one.accrual.id, ctx.actor, tx)
    }
  }
  return moved
}
