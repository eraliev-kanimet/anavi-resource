import { asc, eq } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { FormField } from '@anavi/backend/src/db/schema/form'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import { msgMessage, msgThread, type MsgThread } from '@anavi/backend/src/db/schema/msg'
import { createContact } from '@anavi/backend/src/modules/crm/contact.service'
import { listFields, listForms } from '@anavi/backend/src/modules/form/form.service'
import { submitForm } from '@anavi/backend/src/modules/form/submission.service'
import { postMessage, receiveMessage } from '@anavi/backend/src/modules/inbox/message.service'
import { assign, setStatus } from '@anavi/backend/src/modules/inbox/thread.service'
import { dayAfter } from './answers'
import { directionOf } from '../keeping'
import { digitsOf } from './common'
import { drawSheet } from './slip'
import { raiseFromAppeal } from './raise'
import type { SiteRun } from './context'
import {
  daysAgo,
  daytime,
  markSeen,
  settleThreads,
  stampContact,
  stampIntake,
  stampMessage,
} from './stamp'
import type { SalesScript, ScriptAppeal, ScriptPerson } from './script'

export const HOUR = 60 * 60 * 1000

// ─── the demo's own words ────────────────────────────────────────────────────────────────────────

/**
 * The appeal as the person wrote it.
 *
 * Roles are filled the way they always are — an inbox reads a telephone by role and not by guessing
 * — and everything else comes from the file. A field the file did not name STAYS EMPTY: a generated
 * sentence inside a hand-written questionnaire is exactly the thing this replaces.
 */
async function scriptedAnswers(
  site: OrgSite,
  fields: readonly FormField[],
  person: ScriptPerson,
  appeal: ScriptAppeal,
  on: Date,
  tx: Db | Transaction,
): Promise<Record<string, unknown>> {
  const answers: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.role === 'name') answers[field.key] = person.name
    if (field.role === 'phone') answers[field.key] = person.phone
    if (field.role === 'email' && person.email) answers[field.key] = person.email
  }
  for (const [key, value] of Object.entries(appeal.answers ?? {})) {
    const field = fields.find((one) => one.key === key)
    if (!field) throw new Error(`no field «${key}» on form «${appeal.form}»`)
    /*
     * A direction is named in the file by the key the carrier's own material gives it, and the
     * questionnaire is answered with the direction's id — which does not exist until the reset has
     * run. Resolved here, by the same door the agreements between demos name a direction through.
     */
    answers[key] =
      field.role === 'route'
        ? String((await directionOf(site, String(value), tx)).id)
        : field.type === 'date'
          ? dayAfter(on, Number(value))
          : value
  }
  return answers
}

/** Which conversation this submission's line landed in — its own, or the one it joined. */
async function threadOf(submissionId: bigint, tx: Db | Transaction): Promise<MsgThread | null> {
  const [line] = await tx
    .select({ threadId: msgMessage.threadId })
    .from(msgMessage)
    .where(eq(msgMessage.submissionId, submissionId))
    .orderBy(asc(msgMessage.id))
    .limit(1)
  if (!line) return null
  const [thread] = await tx.select().from(msgThread).where(eq(msgThread.id, line.threadId)).limit(1)
  return thread ?? null
}

async function seedScripted(
  ctx: SiteRun,
  script: SalesScript,
  // A transaction and not a connection: submitting a form may take an hour on the calendar, and a
  // row lock outside a transaction is taken and released in the same breath.
  tx: Transaction,
): Promise<number> {
  const { site, random } = ctx
  const forms = await listForms(site.id, tx)
  const people = new Map(script.people.map((one) => [one.key, one]))
  const fieldsOf = new Map<string, FormField[]>()
  // When the desk last looked at each conversation. Kept across appeals rather than per appeal:
  // several appeals of one person are ONE conversation, and the one written after the manager last
  // answered is what leaves it unread.
  const seenOf = new Map<string, Date | null>()

  // Oldest first, whatever order the file is written in. The file is grouped by person, because that
  // is how it is read and edited; a conversation is ordered by time, because that is what it is.
  const appeals = [...script.appeals].sort((a, b) => b.days - a.days)

  for (const [turn, appeal] of appeals.entries()) {
    // Whose appeal this is. One person answers one conversation — that is how a desk works — and
    // the next conversation goes to the next colleague. An organization of one notices nothing; one
    // of four gets four colours in the feed instead of «Мы» four times.
    const desk = ctx.staff[turn % Math.max(1, ctx.staff.length)] ?? ctx.actor.userId
    const form = forms.find((one) => one.slug === appeal.form)
    if (!form) throw new Error(`${site.slug}: no form «${appeal.form}»`)
    const person = people.get(appeal.person)
    if (!person) throw new Error(`${site.slug}: no person «${appeal.person}»`)

    if (!fieldsOf.has(form.slug)) fieldsOf.set(form.slug, await listFields(form.id, tx))
    const fields = fieldsOf.get(form.slug)!
    const [hour, minute] = appeal.at ?? [random.int(9, 19), random.int(0, 59)]
    const on = daysAgo(appeal.days, hour, minute)
    const locale = appeal.locale ?? site.defaultLocale

    // Refused rather than dropped: a fixture naming a field the questionnaire does not have is a
    // fixture whose author believed something was attached, and a silent skip would keep them
    // believing it.
    let files: Record<string, File[]> | undefined
    if (appeal.file) {
      const field = fields.find((one) => one.key === appeal.file!.field)
      if (!field || field.type !== 'file')
        throw new Error(`${site.slug}: «${appeal.file.field}» on «${appeal.form}» takes no file`)
      files = {
        [appeal.file.field]: [
          await drawSheet({
            name: appeal.file.name,
            title: appeal.file.title,
            rows: appeal.file.rows ?? [],
          }),
        ],
      }
    }

    const submission = await submitForm(
      site,
      form,
      {
        answers: await scriptedAnswers(site, fields, person, appeal, on, tx),
        locale,
        subject: appeal.subject ?? null,
      },
      { ipHash: null, files },
      tx,
    )
    if (!submission) continue
    await stampIntake(submission.id, on, tx)

    const thread = await threadOf(submission.id, tx)
    if (!thread) continue
    const key = String(thread.id)
    let cursor = on
    const later = (hours: number) => {
      const moved = daytime(new Date(cursor.getTime() + hours * HOUR))
      cursor = new Date(Math.min(moved.getTime(), Date.now() - 20 * 60_000))
      return cursor
    }
    // Starting from what the desk has already seen — an order this person placed may have been
    // worked on before this appeal arrived, and starting at null would forget it.
    let seen = seenOf.get(key) ?? ctx.seenByOrders.get(key) ?? null

    for (const line of appeal.talk ?? []) {
      if (line.by === 'guest') {
        const message = await receiveMessage(site.id, thread, { body: line.text }, tx)
        await stampMessage(message.id, later(random.int(3, 26)), tx)
        continue
      }
      const message = await postMessage(
        site.id,
        thread.id,
        desk,
        { body: line.text, isInternal: line.by === 'note' },
        tx,
      )
      const at = later(random.int(1, 14))
      await stampMessage(message.id, at, tx)
      // writing a note is reading the appeal too, which is why both count
      seen = new Date(at.getTime() + 60_000)
    }

    /*
     * And what the conversation came TO, where it came to anything: the sale, written down out of
     * it a couple of hours after the last line or however many days later the file says.
     *
     * After the talk and never before it: the document is what the two of them agreed, so it cannot
     * predate the agreeing. Writing it is the desk working this conversation, which is why the read
     * mark moves with it — a manager who has just written somebody's order has read their appeal.
     */
    if (appeal.order) {
      const at = later((appeal.order.after ?? 0) * 24 + 2)
      await raiseFromAppeal(ctx, thread, appeal.order, at, tx, submission.id)
      seen = new Date(at.getTime() + HOUR)
    }

    // Moving a conversation to «in progress» or «resolved» IS reading it: without this every
    // exchange that ends with the client's «спасибо» stayed unread, and a resolved conversation with
    // an unread mark on it is a state nobody put it in.
    if (appeal.status === 'open' || appeal.status === 'done') {
      seen = new Date(cursor.getTime() + HOUR)
    }
    seenOf.set(key, seen)
    if (appeal.status) await setStatus(site.id, thread.id, { status: appeal.status }, tx)
    // Handed to the one who answered it: whose desk it is on and who is talking must not disagree.
    if (appeal.assign && ctx.staff.length > 0) {
      await assign(site.id, thread.id, { assignee: desk }, tx)
    }
  }

  await settleThreads(site.id, tx)
  // The LATER of the two: an appeal says when the desk answered it, an order says when the desk
  // worked the line it put in the same conversation, and whichever happened last is when the
  // conversation was actually looked at. Writing the appeal's answer over the order's left Дыйкан
  // with nine unread out of ten — every one of them an order somebody had already confirmed.
  for (const [id, seen] of seenOf) {
    const worked = ctx.seenByOrders.get(id) ?? null
    const latest = seen && worked ? (seen > worked ? seen : worked) : (seen ?? worked)
    await markSeen(BigInt(id), latest, tx)
  }

  for (const card of script.cards ?? []) {
    const made = await createContact(
      site.id,
      ctx.actor,
      {
        name: card.name,
        // As the engine keeps it, not as it was typed: an answered form strips the spaces out of a
        // telephone, so a card written by hand on the same number has to be spelled the same way, or
        // the two never meet and the mark that counts them never appears.
        phone: card.phone ? digitsOf(card.phone) : null,
        email: card.email ?? null,
        note: card.note ?? null,
      },
      tx,
    )
    await stampContact(made.id, daysAgo(card.days, 15, 20), tx)
  }

  return appeals.length
}

/**
 * One path and no other: the demo's own words.
 *
 * There used to be a second — a dozen appeals assembled out of a shared pool of phrases, walked
 * through six fixed choreographies — and it was the fallback for a demo that had not written its
 * own. All ten have now, so it ran for nobody, and a dead branch beside a live one is where the
 * next person makes a change nobody sees.
 */
export async function seedInbox(ctx: SiteRun, tx: Transaction): Promise<number> {
  return seedScripted(ctx, ctx.script, tx)
}
