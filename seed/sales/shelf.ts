import { db, desc, eq } from '@anavi/backend/src/db'
import { msgMessage } from '@anavi/backend/src/db/schema/msg'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { sayToShelf } from '@anavi/backend/src/modules/supply/supply-talk.service'
import { postMessage } from '@anavi/backend/src/modules/inbox/message.service'
import { DEMOS } from '../demos'
import { actorOf } from '../links/keeping'
import { loadScript } from './script'
import { daysAgo, daytime, markSeen, settleThreads, stampMessage } from './stamp'
import { siteBySlug } from '../lib/sites'

const HOUR = 3_600_000

/**
 * Sellers asking shops for a place on their shelves.
 *
 * After the loop and outside any transaction of ours, for the reason the morning round is: the
 * seller's door talks on the platform's own connection and looks for a shop that is committed.
 *
 * A conversation is written where BOTH of its demos were filled in this run: it lies on the shop's
 * desk and in the seller's feed, and a half of it is a conversation nobody told the other end of.
 */
export async function seedShelfTalks(filled: readonly string[]): Promise<number> {
  let written = 0
  for (const one of DEMOS) {
    const script = await loadScript(one.slug)
    const asking = (script?.shelf ?? []).filter(
      (asked) => filled.includes(one.slug) && filled.includes(asked.seller),
    )
    if (asking.length === 0) continue
    const shop = await siteBySlug(one.slug)
    const desk = (await actorOf(shop, 'owner', db)).userId

    for (const asked of asking) {
      const seller = await siteBySlug(asked.seller)
      let cursor = daysAgo(asked.days, 10, 40)
      let seen: Date | null = null
      let threadId: bigint | null = null
      for (const line of asked.talk) {
        if (line.by === 'guest') {
          const thread = await sayToShelf(
            asSiteId(seller.id),
            threadId === null ? { address: shop.slug } : { threadId },
            { body: line.text, files: [] },
            'ru',
            await actorOf(seller, 'owner', db),
          )
          threadId = thread.id
        } else {
          if (threadId === null)
            throw new Error(`shelf: «${asked.seller}» is answered before it asked`)
          await postMessage(
            asSiteId(shop.id),
            threadId,
            desk,
            { body: line.text, isInternal: line.by === 'note' },
            db,
          )
          seen = new Date(cursor.getTime() + 4 * HOUR)
        }
        // The line just written, whichever door wrote it: the seller's hands back the conversation
        // and not the message.
        const [last] = await db
          .select({ id: msgMessage.id })
          .from(msgMessage)
          .where(eq(msgMessage.threadId, threadId))
          .orderBy(desc(msgMessage.id))
          .limit(1)
        await stampMessage(last!.id, cursor, db)
        const next = daytime(new Date(cursor.getTime() + 5 * HOUR))
        cursor = new Date(Math.min(next.getTime(), Date.now() - 20 * 60_000))
      }
      if (threadId !== null) await markSeen(threadId, seen, db)
      written += 1
    }
    await settleThreads(asSiteId(shop.id), db)
  }
  return written
}
