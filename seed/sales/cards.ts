import { and, asc, eq, isNull } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { digitsOf } from './common'
import type { SiteId } from '@anavi/backend/src/db/ids'
import type { ScriptPerson } from './script'

/**
 * THE CARD OF ONE PERSON of the script — the one rule, in the one place.
 *
 * The ADDRESS is tried first and the telephone only after it, never both in one condition. Two
 * people on one family number is ordinary life and the demos hold a pair of them — a mother and her
 * daughter share a telephone on purpose — so a match on either would return whichever of the two the
 * database happened to hand back first. The oldest living card wins, the same tie-break the reader's
 * own door makes.
 *
 * The fallback is not tidiness either: the file says what a PERSON has, and the card holds only what
 * some questionnaire actually asked for. A demo whose till never asks for mail has cards with a
 * telephone and nothing else, and a rule that stopped at the address would fail to find people who
 * are plainly there.
 *
 * Three passes ask this question — who follows, who silenced a channel, who said something under a
 * text — and they used to answer it two different ways.
 */
export async function cardOf(
  siteId: SiteId,
  person: Pick<ScriptPerson, 'key' | 'phone' | 'email'>,
  tx: Db | Transaction,
): Promise<{ id: bigint } | null> {
  for (const known of [
    person.email ? eq(crmContact.email, person.email) : null,
    eq(crmContact.phone, digitsOf(person.phone)),
  ]) {
    if (!known) continue
    const [card] = await tx
      .select({ id: crmContact.id })
      .from(crmContact)
      .where(and(eq(crmContact.siteId, siteId), known, isNull(crmContact.deletedAt)))
      .orderBy(asc(crmContact.createdAt), asc(crmContact.id))
      .limit(1)
    if (card) return card
  }
  return null
}
