import { and, desc, eq, isNull, sql } from '@anavi/backend/src/db'
import type { Transaction } from '@anavi/backend/src/db'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { msgThread } from '@anavi/backend/src/db/schema/msg'
import { ordOffer } from '@anavi/backend/src/db/schema/ord'
import { orgToday } from '@anavi/backend/src/lib/clock'
import {
  acceptOffer,
  createOffer,
  createOfferFromThread,
  expireOffers,
  issueOffer,
  markOpened,
  withdrawOffer,
} from '@anavi/backend/src/modules/order/commercial-offer.service'
import { phoneOf } from './common'
import type { SiteRun } from './context'

// The browser of a person on a telephone: what opens an offer, where a messenger's preview does not.
const BROWSER =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/*
 * THE SHOP'S COMMERCIAL OFFERS, lived through the platform's own doors: written — out of the person's
 * conversation where the script says so — issued, opened in the person's browser, then taken by the
 * key as the client takes it, withdrawn, or left standing. One thing is touched by hand, the day an
 * offer stands until, moved into the past so the morning's own function ends it as expired: a demo's
 * date, never a rule.
 */
export async function seedOffers(ctx: SiteRun, tx: Transaction): Promise<number> {
  const site = ctx.site
  const siteId = asSiteId(site.id)
  let made = 0
  for (const one of ctx.script.offers ?? []) {
    const person = ctx.script.people.find((p) => p.key === one.person)
    if (!person) throw new Error(`${site.slug}: offer to «${one.person}», who is nobody`)
    const [card] = await tx
      .select({ id: crmContact.id })
      .from(crmContact)
      .where(
        and(
          eq(crmContact.siteId, site.id),
          eq(crmContact.phone, phoneOf(person.phone, site.country)),
          isNull(crmContact.deletedAt),
        ),
      )
      .limit(1)
    if (!card) throw new Error(`${site.slug}: offer to «${one.person}», who has no card`)

    const variants = []
    for (const variant of one.variants) {
      const lines = []
      for (const line of variant.lines) {
        if ('custom' in line) {
          lines.push({
            type: 'custom' as const,
            name: line.custom,
            qty: line.qty ?? 1,
            price: line.price,
            reason: line.reason ?? null,
          })
          continue
        }
        const [found] = await tx
          .select({ id: catVariant.id, min: catVariant.minQty })
          .from(catVariant)
          .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
          .where(
            and(
              eq(catProduct.siteId, site.id),
              eq(catProduct.slug, line.item),
              isNull(catVariant.deletedAt),
            ),
          )
          .limit(1)
        if (!found) throw new Error(`${site.slug}: offer line «${line.item}» names no goods`)
        lines.push({
          type: 'variant' as const,
          id: found.id,
          qty: line.qty ?? found.min,
          price: line.price ?? null,
          reason: line.reason ?? null,
        })
      }
      variants.push({ name: variant.name ?? null, lines })
    }
    const input = {
      intro: one.intro ?? null,
      terms: one.terms ?? [],
      ...(one.locale ? { locale: one.locale } : {}),
      variants,
    }
    let draft
    if (one.thread) {
      const [thread] = await tx
        .select({ id: msgThread.id })
        .from(msgThread)
        .where(and(eq(msgThread.siteId, site.id), eq(msgThread.contactId, card.id)))
        .orderBy(desc(msgThread.id))
        .limit(1)
      if (!thread)
        throw new Error(`${site.slug}: offer out of «${one.person}»'s conversation, who has none`)
      draft = await createOfferFromThread(siteId, thread.id, ctx.actor, input, tx)
    } else {
      draft = await createOffer(siteId, ctx.actor, { ...input, contactId: card.id }, tx)
    }
    const offer = await issueOffer(siteId, draft.id, ctx.actor, tx)
    made += 1
    for (let at = 0; at < (one.opened ?? 0); at++)
      await markOpened(offer, { agent: BROWSER, purpose: null, person: null }, tx)
    if (one.take) await acceptOffer(offer, { variant: one.take }, { actor: null, reader: null }, tx)
    else if (one.withdrawn)
      await withdrawOffer(siteId, offer.id, ctx.actor, { reason: one.withdrawn }, tx)
    else if (one.expired) {
      // The demo's date: its last day put behind today, so the morning's own step ends it.
      const today = await orgToday(site.orgId, tx)
      await tx
        .update(ordOffer)
        .set({ validUntil: sql`${today}::date - 3` })
        .where(eq(ordOffer.id, offer.id))
      await expireOffers(siteId, today, tx)
    }
  }
  return made
}
