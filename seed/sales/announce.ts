import { and, asc, db, eq } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { NoticeCategory, NoticeChannel } from '@anavi/shared'
import { cntAnnouncement } from '@anavi/backend/src/db/schema/cnt'
import { subFollow } from '@anavi/backend/src/db/schema/sub'
import {
  createAnnouncement,
  sendAnnouncement,
} from '@anavi/backend/src/modules/content/announcement.service'
import { setPreference } from '@anavi/backend/src/modules/notify/preference.service'
import { markSeen } from '@anavi/backend/src/modules/subscription/follow.service'
import { tellFollowers } from '@anavi/backend/src/modules/subscription/follow.jobs'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import { cardOf } from './cards'
import { daysAgo } from './stamp'
import type { SiteRun } from './context'

/**
 * WHAT THE SHOP SAID to the people following it — and the whole road, not the rows it leaves.
 *
 * Everything here goes through the service: it is what freezes the text once it has been said, what
 * refuses a second announcement inside a day, what counts how many were actually told and what
 * honours the choice each of them made about channels. A fixture writing `cnt_announcement` by hand
 * would leave a section that looks filled and proves nothing — the same trap the catalogue's own
 * ageing pass warns about where it moves prices through the service rather than stamping the column.
 *
 * It lives in the sales pass and not in the demo's own build because an announcement is told to
 * CARDS, and cards are born here.
 */
export async function seedAnnouncements(ctx: SiteRun, tx: Transaction): Promise<number> {
  const said = ctx.script.announcements ?? []
  if (said.length === 0) return 0

  await choose(ctx, tx)

  // Oldest first, and that order is load-bearing — see the backdating below.
  const ordered = [...said].sort((a, b) => b.days - a.days)
  let sent = 0
  for (const one of ordered) {
    const row = await createAnnouncement(
      ctx.site.id,
      {
        text: { [ctx.site.defaultLocale]: one.text },
        ...(one.action
          ? {
              action: {
                ...(one.action.kind === 'route'
                  ? { kind: 'route' as const, route: one.action.target }
                  : { kind: one.action.kind, slug: one.action.target }),
                label: { [ctx.site.defaultLocale]: one.action.label },
              },
            }
          : {}),
      },
      tx,
    )

    const at = daysAgo(one.days, 7, 30)
    if (one.sent === false) {
      // A draft was never said, so it has no moment of saying — only the day it was written.
      await tx
        .update(cntAnnouncement)
        .set({ createdAt: at, updatedAt: at })
        .where(eq(cntAnnouncement.id, row.id))
      continue
    }

    await sendAnnouncement(ctx.site.id, row.id, { term: one.term }, tx)
    /*
     * Moved into the past the moment it has been said, and BEFORE the next one is.
     *
     * The service allows one announcement a day and measures it from the last one sent — which is
     * right, and which a fixture saying four things over three weeks would otherwise walk straight
     * into on the second. The same documented way round the service layer the orders and the
     * delivery window already take: what is written here could not have been asked for through the
     * door, and the door must go on refusing it.
     */
    await tx
      .update(cntAnnouncement)
      .set({
        createdAt: at,
        updatedAt: at,
        sentAt: at,
        showUntil: new Date(at.getTime() + one.term * 24 * 60 * 60 * 1000),
      })
      .where(eq(cntAnnouncement.id, row.id))
    sent += 1
  }
  return sent
}

/**
 * What two of the followers switched off for themselves.
 *
 * The one thing on this platform that nobody had ever chosen: `ntf_preference` was empty on every
 * demo, so «gets it by the channel they chose» had never been anything but a sentence. Written
 * through the same door the reader's own screen writes through, which is what makes it a choice
 * rather than a row.
 */
async function choose(ctx: SiteRun, tx: Db | Transaction): Promise<void> {
  for (const person of ctx.script.people) {
    for (const rule of person.quiet ?? []) {
      const card = await cardOf(ctx.site.id, person, tx)
      // A person the script silences must exist by now: cards are made by the orders and the appeals
      // above this pass. Refused loudly rather than skipped — a preference written for nobody is a
      // demo that looks configured and behaves as though it were not.
      if (!card) throw new Error(`${ctx.site.slug}: «${person.key}» has no card to silence`)
      for (const channel of rule.off) {
        await setPreference(
          { type: 'contact', id: card.id },
          'client',
          rule.category as NoticeCategory,
          channel as NoticeChannel,
          false,
          tx,
        )
      }
    }
  }
}

/**
 * THE MORNING ITSELF — the round the platform makes at nine, made here on demand.
 *
 * Called after the demo's own transaction has closed, and that is not a detail: the round is
 * ordinary code that talks to the database on its own connection, so inside an open transaction it
 * would look for cards and follows that have not been committed yet and find a shop with nobody in
 * it. Which is also how it happens in life — the morning comes after the day that filled the shelf.
 *
 * The round itself is the platform's (`tellFollowers`), not a copy of it: what a fixture must never
 * do is write «told» marks and feed rows by hand and go on looking correct while the machinery under
 * it is broken.
 *
 * Afterwards one follower is marked as having LOOKED — the oldest of them — so the demo holds both
 * states of the bell. After and not before: reading yesterday's arrivals does not un-tell this
 * morning's.
 */
export async function seedMorning(site: OrgSite): Promise<void> {
  await tellFollowers(site)

  const [oldest] = await db
    .select({ id: subFollow.id })
    .from(subFollow)
    .where(and(eq(subFollow.siteId, site.id), eq(subFollow.subscriberType, 'contact')))
    .orderBy(asc(subFollow.id))
    .limit(1)
  if (oldest) await markSeen(oldest.id)
}
