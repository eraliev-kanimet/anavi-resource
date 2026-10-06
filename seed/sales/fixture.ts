import { and, eq, sql, type Db, type Transaction } from '@anavi/backend/src/db'
import { sysFixture } from '@anavi/backend/src/db/schema/sys'
import type { SiteId } from '@anavi/backend/src/db/ids'

/*
 * The mark this fixture leaves on what it makes outside the sales section — see `sys_fixture`.
 *
 * A raw touch, and one of the kind the seed is allowed: no service of the platform offers «this
 * row is a demo's», and none may. Everything here is found again by the mark and by nothing else —
 * not by the words of a note, not by a trip being empty.
 */

type Subject = (typeof sysFixture.subjectType.enumValues)[number]

/** These rows are this run's own, to be taken back by the run of `siteId`. */
export async function mark(
  siteId: SiteId,
  subject: Subject,
  ids: readonly bigint[],
  tx: Db | Transaction,
): Promise<void> {
  if (ids.length === 0) return
  await tx
    .insert(sysFixture)
    .values(ids.map((id) => ({ siteId, subjectType: subject, subjectId: id })))
    .onConflictDoNothing()
}

/** The ids one site's runs have marked — a subquery, to be put inside `inArray`. */
export const marked = (siteId: SiteId, subject: Subject, tx: Db | Transaction) =>
  tx
    .select({ id: sysFixture.subjectId })
    .from(sysFixture)
    .where(and(eq(sysFixture.siteId, siteId), eq(sysFixture.subjectType, subject)))

/** Every marked row of one kind, whoever's run made it. */
export const markedAll = (subject: Subject, tx: Db | Transaction) =>
  tx
    .select({ id: sysFixture.subjectId })
    .from(sysFixture)
    .where(eq(sysFixture.subjectType, subject))

/** The marks themselves, once what they pointed at has been taken back. */
export async function unmark(
  siteId: SiteId,
  subject: Subject,
  tx: Db | Transaction,
): Promise<void> {
  await tx
    .delete(sysFixture)
    .where(and(eq(sysFixture.siteId, siteId), eq(sysFixture.subjectType, subject)))
}

/** Marks left pointing at trips that are gone. */
export async function unmarkGoneTrips(tx: Db | Transaction): Promise<void> {
  await tx
    .delete(sysFixture)
    .where(
      and(
        eq(sysFixture.subjectType, 'trip'),
        sql`not exists (select 1 from shp_trip t where t.id = ${sysFixture.subjectId})`,
      ),
    )
}
