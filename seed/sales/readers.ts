import { and, db, eq } from '@anavi/backend/src/db'
import { crmCode } from '@anavi/backend/src/db/schema/crm'
import { hasFeature } from '@anavi/shared'
import { openSession, requestCode } from '@anavi/backend/src/modules/reader/reader.service'
import { daysAgo, stampContact } from './stamp'
import type { SiteRun } from './context'
import type { ScriptReader } from './script'

/**
 * SOMEBODY WHO SIGNED IN.
 *
 * Every part of it goes through the platform's own code: a code requested and posted, read back out
 * of the table the way a person reads it out of their inbox, entered at the door. Nothing here
 * writes `crm_session` by hand, and that is the whole discipline — a fixture that
 * stamps the columns itself goes on looking correct for exactly as long as it takes the machinery
 * under it to break.
 *
 * It runs AFTER the demo's own transaction has closed, and that is not a detail either. The door
 * keeps its attempt and resend counters on its own connection on purpose — a counter that rolls back
 * with the error announcing it is not a counter — so it cannot be handed a transaction; and the
 * cards it looks for by address are written by the passes above, which are inside one.
 */
export async function seedReaders(ctx: SiteRun): Promise<number> {
  const wanted = ctx.script.readers ?? []
  if (wanted.length === 0) return 0
  // A script promising readers to a site whose door is shut is a mistake worth a sentence: the pass
  // would otherwise fail deep inside the service with «readers are off» and name nothing.
  if (!hasFeature(ctx.site.features, 'readers'))
    throw new Error(`${ctx.site.slug}: the script has readers and the site has none switched on`)

  for (const one of wanted) await signIn(ctx, one)
  return wanted.length
}

async function signIn(ctx: SiteRun, wanted: ScriptReader): Promise<void> {
  const person = ctx.script.people.find((one) => one.key === wanted.person)
  if (!person) throw new Error(`${ctx.site.slug}: no person «${wanted.person}» to sign in`)
  // The door knows a person by their address and by nothing else. A reader named in the script with
  // no mail is a demo whose author meant something the platform cannot do.
  if (!person.email)
    throw new Error(`${ctx.site.slug}: «${person.key}» has no address to sign in by`)

  const locale = ctx.site.defaultLocale
  await requestCode(ctx.site, { email: person.email }, locale)
  /*
   * The code read out of the table, which is what a person does with their inbox.
   *
   * The letter itself is silenced at the boundary (`muteMail`) like every other one this fixture
   * causes — a machine with a transport configured would post six digits to an address that looks
   * exactly like somebody's.
   */
  const [sent] = await db
    .select({ code: crmCode.code })
    .from(crmCode)
    .where(and(eq(crmCode.siteId, ctx.site.id), eq(crmCode.email, person.email)))
    .limit(1)
  if (!sent) throw new Error(`${ctx.site.slug}: no code was posted to «${person.key}»`)

  const { contact } = await openSession(ctx.site, { email: person.email, code: sent.code }, locale)
  /*
   * A card the DOOR made — nobody who ever wrote to this business — is moved back to the day they
   * first signed in.
   *
   * The card's own date is printed on the contacts screen, and one card dated today among a demo of
   * backdated ones reads as the fixture that it is. Only that card: everybody else's was stamped by
   * the pass that made them, from the appeal or the order they came through.
   */
  if (contact.meta?.born === 'reader') await stampContact(contact.id, daysAgo(wanted.days, 21), db)
}
