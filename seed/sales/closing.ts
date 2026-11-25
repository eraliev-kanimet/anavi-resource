import { and, db, eq, isNull, min } from '@anavi/backend/src/db'
import { finClosing, finEntry } from '@anavi/backend/src/db/schema/fin'
import { org, orgSite } from '@anavi/backend/src/db/schema/org'
import { asOrgId, type OrgId } from '@anavi/backend/src/db/ids'
import { monthQuestions } from '@anavi/backend/src/modules/money/closing.service'
import { taxMonth } from '@anavi/backend/src/modules/money/tax.service'
import { closeMonth } from '@anavi/backend/src/modules/money/month-end.service'
import { dayIn, lastDayOf, monthAfter, monthOf, previousMonthEnd } from '@anavi/shared'
import { listOrgStaffMembers } from '@anavi/backend/src/modules/staff/staff.service'
import { loadBooks, openingDay } from '../lib/books'
import { atHour } from '../lib/days'
import { isDemo } from '../demos'

/*
 * CLOSED MONTHS, as an accountant keeps them: every month older than the last ended one is closed,
 * in order, once its bank lines are decided — the last ended month is still being read against its
 * statement.
 */

/*
 * The organizations that keep books: a demo's own — one each, however many sites it runs — and any
 * other with documents, such as a lender with no site. Each is told by the day its books begin.
 */
async function bookKeepers() {
  const sites = await db
    .select({ slug: orgSite.slug, orgId: orgSite.orgId })
    .from(orgSite)
    .where(isNull(orgSite.deletedAt))
    .orderBy(orgSite.id)
  const slugs = new Map<OrgId, string>()
  for (const site of sites) {
    if (isDemo(site.slug) && !slugs.has(asOrgId(site.orgId)))
      slugs.set(asOrgId(site.orgId), site.slug)
  }
  const kept = await db
    .select({ orgId: finEntry.orgId, first: min(finEntry.on), timezone: org.timezone })
    .from(finEntry)
    .innerJoin(org, eq(org.id, finEntry.orgId))
    .groupBy(finEntry.orgId, org.timezone)
  const out = new Map<OrgId, { slug: string | null; first: string; timezone: string }>()
  for (const row of kept) {
    const slug = slugs.get(asOrgId(row.orgId)) ?? null
    if (slug === null && !row.first) continue
    out.set(asOrgId(row.orgId), { slug, first: row.first!, timezone: row.timezone })
  }
  return out
}

export async function closeMonths(): Promise<number> {
  let closed = 0
  for (const [orgId, kept] of await bookKeepers()) {
    const slug = kept.slug ?? String(orgId)
    // «Today» is the organization's own: a run before six in the morning at Bishkek is still the
    // day before at Greenwich.
    const lastEnded = monthOf(previousMonthEnd(dayIn(kept.timezone, new Date())))
    const books = kept.slug ? await loadBooks(kept.slug) : null
    const opening = books ? openingDay(books, kept.timezone) : kept.first
    await db.transaction(async (tx) => {
      const staff = await listOrgStaffMembers(orgId, tx)
      const keeper =
        staff.find((member) => member.roles.includes('accountant')) ??
        staff.find((member) => member.roles.includes('owner'))
      if (!keeper) throw new Error(`${slug}: nobody to close the months`)
      const role = keeper.roles.includes('accountant') ? 'accountant' : 'owner'
      const actor = { userId: keeper.staff.userId, activeRole: role, viaOrgId: null } as const
      for (let month = opening.slice(0, 7); month < lastEnded; month = monthAfter(month)) {
        // The demo's accountant answers «close anyway»: what the month asks about is part of its story.
        const asked = await monthQuestions(orgId, lastDayOf(month), tx)
        const seen = asked.map(({ kind, count }) => ({ kind, count }))
        // And the taxes the window would list, as the platform counts them.
        const shown = (await taxMonth(orgId, month, tx)).rows
          .filter((row) => row.withPay === null && row.accrual === null && row.periodEnd === month)
          .map((row) => ({ taxId: row.tax.id, counted: row.counted }))
        await closeMonth(orgId, actor, { month, seen, shown }, tx).catch((error) => {
          throw new Error(
            `${slug}: ${month} does not close — ${error?.code ?? error}. A draft or an undecided bank line of a month older than the last is a story the demo forgot to finish`,
          )
        })
        // Closed on the tenth of the month after, when the accountant had the papers.
        await tx
          .update(finClosing)
          .set({ createdAt: atHour(kept.timezone, `${monthAfter(month)}-10`, 18) })
          .where(and(eq(finClosing.orgId, orgId), eq(finClosing.through, lastDayOf(month))))
        closed += 1
      }
    })
  }
  return closed
}
