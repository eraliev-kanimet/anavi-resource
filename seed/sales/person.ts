import { and, eq, isNotNull } from '@anavi/backend/src/db'
import { type Db, type Transaction } from '@anavi/backend/src/db'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { iamIdentity, iamUser } from '@anavi/backend/src/db/schema/iam'
import type { Visitor } from '@anavi/backend/src/modules/user/visitor.service'
import { digitsOf } from './common'
import type { ScriptPerson } from './script'

/*
 * THE PERSON OF THE PLATFORM a character of the script is — the browser they would have come from.
 *
 * A buyer on a living site is a guest the moment they first order or write, and the same guest on
 * every site they do it on. The script's characters are that too: David and Ruslan are written into
 * several demos on purpose, with one telephone and one name, and they are ONE person across all of
 * them — which is what a card pointing at a person exists to show.
 *
 * Told apart by the telephone AND the name: a mother and her daughter share a number and are two
 * people.
 *
 * Kept for the length of a run, and found again on the next one through a card that already points
 * at them — so filling one demo a second time meets the person the other demos still hold, instead
 * of making a second David. The guest is born by the till or the questionnaire itself (`embody`),
 * exactly as on a living site; nothing here writes a row.
 */
const people = new Map<string, Visitor>()

export async function visitorOf(
  person: Pick<ScriptPerson, 'name' | 'phone' | 'email'>,
  tx: Db | Transaction,
): Promise<Visitor> {
  const phone = digitsOf(person.phone)
  const key = `${phone}|${person.name}`
  const held = people.get(key)
  if (held) return held
  // Somebody who signed in on an earlier run is found by the address they proved: their cards may
  // all have been emptied since, and the account outlives them.
  const [proved] = person.email
    ? await tx
        .select({ user: iamUser })
        .from(iamIdentity)
        .innerJoin(iamUser, eq(iamUser.id, iamIdentity.userId))
        .where(and(eq(iamIdentity.provider, 'email'), eq(iamIdentity.identifier, person.email)))
        .limit(1)
    : []
  if (proved) {
    const visitor: Visitor = { user: proved.user, issued: null }
    people.set(key, visitor)
    return visitor
  }
  const [known] = await tx
    .select({ user: iamUser })
    .from(crmContact)
    .innerJoin(iamUser, eq(iamUser.id, crmContact.userId))
    .where(
      and(
        eq(crmContact.phone, phone),
        eq(crmContact.name, person.name),
        isNotNull(crmContact.userId),
      ),
    )
    .orderBy(crmContact.id)
    .limit(1)
  const visitor: Visitor = { user: known?.user ?? null, issued: null }
  people.set(key, visitor)
  return visitor
}
