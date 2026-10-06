import { and, desc, eq, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { hasFeature } from '@anavi/shared'
import { follow } from '@anavi/backend/src/modules/subscription/follow.service'
import { cardOf } from './cards'
import type { SiteRun } from './context'
import type { ScriptPerson } from './script'

/**
 * A few of this shop's clients following its catalogue.
 *
 * Here rather than in the main seed because a follower IS a client's card, and cards are born here —
 * the seed that builds the demos does not create a single person. Without them the one number on the
 * platform that grows by somebody else's choice reads zero on every demo, and «за каталогом следят»
 * has never been seen with anything in it.
 *
 * Only where the site actually offers it: following is switched on with `readers`, and a follower on
 * a site that cannot show them a page would be a row about nothing.
 */
export async function seedFollows(ctx: SiteRun, tx: Db | Transaction): Promise<number> {
  if (!hasFeature(ctx.site.features, 'readers')) return 0

  const named = ctx.script.people.filter((person) => person.follows)
  const cards = named.length > 0 ? await cardsOf(ctx, named, tx) : await latest(ctx, tx)

  for (const card of cards) await follow(ctx.site.id, { type: 'contact', id: card.id }, tx)
  return cards.length
}

/**
 * The people the script NAMED, found by the one rule every pass uses — see `cardOf`.
 *
 * Refused loudly rather than skipped when there is nobody: a subscription written for nobody is a
 * demo that looks configured and behaves as though it were not, and the announcement that follows
 * would quietly reach one fewer person than the screen says.
 */
async function cardsOf(
  ctx: SiteRun,
  named: ScriptPerson[],
  tx: Db | Transaction,
): Promise<{ id: bigint }[]> {
  const found: { id: bigint }[] = []
  for (const person of named) {
    const card = await cardOf(ctx.site.id, person, tx)
    if (!card) throw new Error(`${ctx.site.slug}: «${person.key}» has no card to follow with`)
    found.push(card)
  }
  return found
}

/**
 * And where the script names nobody, the four newest cards — exactly what this pass has always done.
 *
 * Kept as the fallback rather than replaced: the demos that already follow were filled this way, and
 * a shop whose followers are «somebody, four of them» is the honest shape of a fixture that has no
 * opinion about who.
 */
function latest(ctx: SiteRun, tx: Db | Transaction) {
  return tx
    .select({ id: crmContact.id })
    .from(crmContact)
    .where(and(eq(crmContact.siteId, ctx.site.id), isNull(crmContact.deletedAt)))
    .orderBy(desc(crmContact.id))
    .limit(4)
}
