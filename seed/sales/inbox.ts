import { actorOf } from '../links/keeping'
import { visitorOf } from './person'
import { and, asc, eq } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { FormField } from '@anavi/backend/src/db/schema/form'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import {
  deskThread,
  msgMessage,
  msgThread,
  msgVisitor,
  onVisitor,
  type MsgThread,
} from '@anavi/backend/src/db/schema/msg'
import { createContact } from '@anavi/backend/src/modules/crm/contact.service'
import { listFields, listForms } from '@anavi/backend/src/modules/form/form.service'
import { sendQuestionnaire } from '@anavi/backend/src/modules/appeal/appeal.service'
import { postMessage, receiveMessage } from '@anavi/backend/src/modules/inbox/message.service'
import { receiveGuestPost } from '@anavi/backend/src/modules/inbox/guest.service'
import { consultantSaid } from '@anavi/backend/src/modules/storefront/consultant.service'
import { assign, setStatus } from '@anavi/backend/src/modules/inbox/thread.service'
import { dayAfter } from './answers'
import { directionOf } from '../links/keeping'
import { digitsOf } from './common'
import { drawSheet } from './slip'
import { raiseFromAppeal } from './raise'
import { holdFromPage } from '@anavi/backend/src/modules/service/booking.hold'
import { findPublishedService } from '@anavi/backend/src/modules/service/service.public'
import { choiceOf, freeTime } from '@anavi/backend/src/modules/service/slots.service'
import { bookByCall } from '@anavi/backend/src/modules/order/calendar.call'
import { callStarts } from '@anavi/backend/src/modules/order/calendar.service'
import {
  addClosure,
  listResources,
  setDay,
} from '@anavi/backend/src/modules/service/resource.service'
import { srvBooking } from '@anavi/backend/src/db/schema/srv'
import { ordOrder, ordOrderItem, ordItemVisit } from '@anavi/backend/src/db/schema/ord'
import { countFromService, countsFromService, dayIn } from '@anavi/shared'
import { countBase, visitOf } from '@anavi/backend/src/modules/service/service.count'
import { fillAsked } from '@anavi/backend/src/modules/order/options.service'
import { visitZones } from '@anavi/backend/src/modules/network/site-zones'
import { siteBySlug } from '../lib/sites'
import { resourcePath } from '../lib/resource'
import { voiceNote } from './voice'
import { runSteps } from './orders'
import { reviewPlaced } from './review'
import type { SiteRun } from './context'
import {
  daysAgo,
  daytime,
  markSeen,
  settleThreads,
  stampContact,
  stampIntake,
  stampMessage,
  stampOrder,
} from './stamp'
import type { SalesScript, ScriptAppeal, ScriptLine, ScriptPerson } from './script'

export const HOUR = 60 * 60 * 1000

// ─── the demo's own words ────────────────────────────────────────────────────────────────────────

/**
 * The appeal as the person wrote it.
 *
 * Roles are filled the way they always are — an inbox reads a telephone by role and not by guessing
 * — and everything else comes from the file. A field the file did not name STAYS EMPTY: a generated
 * sentence inside a hand-written questionnaire is exactly the thing this replaces.
 */
export async function scriptedAnswers(
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
     * questionnaire is answered with the direction's key — which does not exist until the reset has
     * run. Resolved here, by the same door the agreements between demos name a direction through.
     */
    answers[key] =
      field.role === 'route'
        ? (await directionOf(site, String(value), tx)).key
        : field.type === 'date'
          ? dayAfter(on, Number(value))
          : value
  }
  return answers
}

/**
 * A visitor's line, said through the door the storefront posts to — so a photograph or a voice note
 * goes through the same checks and the same storage a visitor's does. A bare line goes the short way.
 */
async function guestLine(site: OrgSite, thread: MsgThread, line: ScriptLine, tx: Transaction) {
  if (!line.photo && !line.voice) return receiveMessage(site.id, thread, { body: line.text }, tx)
  const photo = line.photo ? Bun.file(resourcePath(line.photo)) : null
  if (photo && !(await photo.exists()))
    throw new Error(`no photograph ${line.photo} in the library`)
  const files = photo
    ? [new File([await photo.arrayBuffer()], line.photo!.split('/').pop()!, { type: photo.type })]
    : []
  return receiveGuestPost(
    site,
    thread,
    { body: line.text, files, voice: line.voice ? voiceNote(line.voice) : null },
    site.defaultLocale,
    tx,
  )
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
  const [thread] = await tx
    .select(deskThread)
    .from(msgThread)
    .innerJoin(msgVisitor, onVisitor)
    .where(eq(msgThread.id, line.threadId))
    .limit(1)
  return thread ?? null
}

/**
 * The hour a fixture names, held the way a visitor holds it: the page's free time is read, the
 * `ahead`-th day after today that still offers the hour is taken, and the hold is put through the
 * door the storefront posts to. Whether the hour may be taken is the engine's reading either way.
 */
async function holdAhead(
  page: OrgSite,
  doer: OrgSite | null,
  slug: string,
  slot: { ahead: number; time: string; who?: number },
  tx: Transaction,
) {
  const service = await findPublishedService(page, slug, tx)
  if (!service) throw new Error(`${page.slug}: no service «${slug}» to book`)
  const minute = Number(slot.time.slice(0, 2)) * 60 + Number(slot.time.slice(3))
  const whose = doer ?? page
  const today = dayIn(whose.timezone, new Date())
  // Whom they chose, where the page lets them: then the hour has to be free with THAT one.
  const named = slot.who ? (await choiceOf(whose, service.id, null, tx))[slot.who - 1] : null
  if (slot.who && !named) throw new Error(`${whose.slug}: «${slug}» offers no choice №${slot.who}`)
  const days = (
    (await freeTime(whose, service.id, { resourceId: named?.id ?? null }, tx)) ?? []
  ).filter((one) => one.day > today && one.starts.includes(minute))
  const day = days[slot.ahead - 1]
  if (!day)
    throw new Error(`${whose.slug}: «${slug}» has no ${slot.time} free ${slot.ahead} days ahead`)
  return holdFromPage(
    page,
    { service: slug, doer: doer?.slug ?? null, who: slot.who ?? null, day: day.day, minute },
    { ipHash: null },
    tx,
  )
}

/**
 * The sum a visitor would have been SHOWN, where the questionnaire counts from the price of the
 * service it was opened from — sent with the answers, because the door refuses a request that
 * agreed to no sum. The file's own number where it names one; otherwise what the page shows,
 * by the function the page shows it by. Nothing where nothing is counted.
 */
async function shownTotal(
  page: OrgSite,
  doer: OrgSite | null,
  appeal: ScriptAppeal,
  fields: readonly FormField[],
  answers: Record<string, unknown>,
  tx: Transaction,
): Promise<{ total?: number | null }> {
  if (appeal.subject?.type !== 'service') return {}
  const service = await findPublishedService(page, appeal.subject.slug, tx)
  const base = service ? await countBase(page, service.id, doer, tx) : null
  // The questions as the page draws them: the district's options, with what coming costs, are
  // put in by the platform, and a count over the bare fields would miss the road.
  const drawn = service
    ? await fillAsked(page, fields, tx, answers, await visitOf(page, service.id, doer, tx))
    : fields
  if (!base || !countsFromService(drawn)) return {}
  if (appeal.total !== undefined) return { total: appeal.total }
  return { total: countFromService(base.price, drawn, answers as never)?.total ?? null }
}

async function seedScripted(
  ctx: SiteRun,
  script: SalesScript,
  // A transaction and not a connection: submitting a form may take an hour on the calendar, and a
  // row lock outside a transaction is taken and released in the same breath.
  tx: Transaction,
): Promise<number> {
  const { site, random } = ctx
  const formsOf = new Map([[site.slug, await listForms(site.id, tx)]])
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
    // Where the visitor stood: this site, or the one whose service this site provides.
    const page = appeal.from ? await siteBySlug(appeal.from, tx) : site
    if (appeal.from && !formsOf.has(page.slug)) formsOf.set(page.slug, await listForms(page.id, tx))
    const form = formsOf.get(page.slug)!.find((one) => one.slug === appeal.form)
    if (!form) throw new Error(`${page.slug}: no form «${appeal.form}»`)
    const person = people.get(appeal.person)
    if (!person) throw new Error(`${site.slug}: no person «${appeal.person}»`)

    const asked = `${page.slug}/${form.slug}`
    if (!fieldsOf.has(asked)) fieldsOf.set(asked, await listFields(form.id, tx))
    const fields = fieldsOf.get(asked)!
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
        throw new Error(`${page.slug}: «${appeal.file.field}» on «${appeal.form}» takes no file`)
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

    // An hour pressed on the service's page before the questionnaire was opened: held through
    // the page's own door, and the key of the hold rides with the subject as the browser sends it.
    const held =
      appeal.slot && appeal.subject?.type === 'service'
        ? await holdAhead(page, appeal.from ? site : null, appeal.subject.slug, appeal.slot, tx)
        : null

    const answers = await scriptedAnswers(page, fields, person, appeal, on, tx)
    /*
     * A district is named in the file by the name the site gave it, and the questionnaire is
     * answered with the district's own number — of the site that DOES the service, which for a
     * request taken off another site's page is this one and not the page's.
     */
    const districtField = fields.find((one) => one.role === 'zone')
    if (districtField && typeof answers[districtField.key] === 'string') {
      const said = answers[districtField.key] as string
      const zone = (await visitZones(site.id, tx)).find((one) =>
        Object.values(one.name).includes(said),
      )
      if (!zone) throw new Error(`${site.slug}: no district «${said}» to come to`)
      answers[districtField.key] = zone.key
    }
    // The door a visitor's press walks through: what the request becomes, an order or a booked
    // visit, is the service's reading of the service and comes back with it.
    const { submission, placed } = await sendQuestionnaire(
      page,
      form,
      {
        answers,
        locale,
        ...(await shownTotal(page, appeal.from ? site : null, appeal, fields, answers, tx)),
        // Somebody else's page: the row pressed there was this site's.
        subject: appeal.subject
          ? {
              ...appeal.subject,
              ...(appeal.from ? { provider: site.slug } : {}),
              ...(held ? { slot: held.key } : {}),
            }
          : null,
      },
      { ipHash: null, files, visitor: await visitorOf(person, tx) },
      tx,
    )
    if (!submission) continue
    // The engine keeps a request with the owner at any doubt about the provider — and a fixture
    // that went on would be answering, from this desk, a request lying on another.
    if (submission.siteId !== site.id)
      throw new Error(
        `${site.slug}: the request for «${appeal.subject?.slug}» on ${page.slug} did not come here`,
      )
    await stampIntake(submission.id, on, tx)

    // Where the file says an order came out (`placed`) and none did, the fixture fails rather than
    // carrying on with a story that never happened.
    if (appeal.placed && !placed)
      throw new Error(`${site.slug}: «${appeal.subject?.slug}» made no order for ${appeal.person}`)
    if (placed) {
      const row = await runSteps(ctx, placed, appeal.placed?.steps ?? [], tx)
      await stampOrder(row.id, on, tx, { intake: false })
      if (appeal.placed?.review) await reviewPlaced(page, row, appeal.placed.review, 0, on, tx)
    }

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
        const message = await guestLine(site, thread, line, tx)
        // Drawn whether or not it is used: a timed line must not shift every line after it.
        const hours = random.int(3, 26)
        await stampMessage(message.id, later(line.in === undefined ? hours : line.in / 60), tx)
        continue
      }
      // The consultant answers within the minute it is asked, whatever the file says of the desk.
      if (line.by === 'agent') {
        const said = await consultantSaid(
          thread.id,
          { reply: line.text, cards: line.cards ?? [], handover: line.hand ?? null },
          tx,
        )
        if (!said) throw new Error(`${site.slug}: the consultant does not answer ${appeal.person}`)
        await stampMessage(said.id, later((line.in ?? 1) / 60), tx)
        continue
      }
      const message = await postMessage(
        site.id,
        thread.id,
        desk,
        { body: line.text, isInternal: line.by === 'note' },
        tx,
      )
      const hours = random.int(1, 14)
      const at = later(line.in === undefined ? hours : line.in / 60)
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
    // Taken by the one who answered it: whose desk it is on and who is talking must not disagree.
    // Taken and not handed over, so no notice of a hand-over is born at the time of the run.
    if (appeal.assign && ctx.staff.length > 0) {
      await assign(site.id, thread.id, { assignee: desk }, { ...ctx.actor, userId: desk }, tx)
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

  /*
   * The callers booked in by the desk. After everything a visitor booked for themselves: the desk
   * takes an hour off the calendar as it stands, and a fixture that booked first would be naming
   * hours the visitors' own appeals then find gone.
   */
  for (const call of script.calls ?? []) {
    const person = people.get(call.person)
    if (!person) throw new Error(`${site.slug}: no person «${call.person}»`)
    const service = await findPublishedService(site, call.service, tx)
    if (!service) throw new Error(`${site.slug}: no service «${call.service}» to book by call`)
    const resource = (await listResources(site.id, tx)).find((one) =>
      Object.values(one.name).includes(call.resource),
    )
    if (!resource) throw new Error(`${site.slug}: no resource «${call.resource}»`)
    const today = dayIn(site.timezone, new Date())
    const days: string[] = []
    for (let ahead = 1; ahead < 14 && days.length < call.ahead; ahead += 1) {
      const day = dayAfter(new Date(`${today}T00:00:00Z`), ahead)
      const times = await callStarts(
        site,
        { serviceId: service.id, resourceId: resource.id, day },
        tx,
      )
      if (times.includes(call.time)) days.push(day)
    }
    const day = days[call.ahead - 1]
    if (!day)
      throw new Error(
        `${site.slug}: «${call.resource}» has no ${call.time} free ${call.ahead} days ahead`,
      )
    const [hour, minute] = call.time.split(':').map(Number)
    await bookByCall(
      site,
      ctx.actor,
      {
        client: { name: person.name, phone: person.phone },
        address: person.address ?? null,
        serviceId: String(service.id),
        resourceId: String(resource.id),
        day,
        minute: hour! * 60 + minute!,
        note: call.note ?? null,
      },
      tx,
    )
  }

  /*
   * And last, what is laid over the weeks — after every booking, because one of these closes a
   * day somebody already booked: the doors take it all the same, and that booking is what the
   * calendar then names as one to be moved.
   */
  const minutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3))
  const resources = script.timetable ? await listResources(site.id, tx) : []
  const named = (name: string) => {
    const found = resources.find((one) => Object.values(one.name).includes(name))
    if (!found) throw new Error(`${site.slug}: no resource «${name}»`)
    return found
  }
  const today = dayIn(site.timezone, new Date())
  const ahead = (days: number) => dayAfter(new Date(`${today}T00:00:00Z`), days)
  const keeper = await actorOf(site, 'owner', tx)
  for (const one of script.timetable?.days ?? [])
    await setDay(
      site.id,
      named(one.resource).id,
      keeper,
      {
        day: ahead(one.ahead),
        spans: one.spans.map(([from, to]) => ({ startsAt: minutes(from), endsAt: minutes(to) })),
      },
      tx,
    )
  for (const one of script.timetable?.closures ?? []) {
    let from = ahead(one.ahead ?? 1)
    if (one.over) {
      const person = people.get(one.over)
      if (!person) throw new Error(`${site.slug}: no person «${one.over}»`)
      const [stands] = await tx
        .select({ day: ordItemVisit.day })
        .from(srvBooking)
        .innerJoin(ordOrderItem, eq(ordOrderItem.id, srvBooking.orderItemId))
        .innerJoin(ordItemVisit, eq(ordItemVisit.itemId, ordOrderItem.id))
        .innerJoin(ordOrder, eq(ordOrder.id, ordOrderItem.orderId))
        .where(and(eq(srvBooking.siteId, site.id), eq(ordOrder.name, person.name)))
        .limit(1)
      if (!stands?.day) throw new Error(`${site.slug}: «${one.over}» has no booking to close over`)
      from = stands.day
    }
    await addClosure(
      site.id,
      keeper,
      {
        resourceId: one.resource ? String(named(one.resource).id) : null,
        from,
        to: dayAfter(new Date(`${from}T00:00:00Z`), (one.days ?? 1) - 1),
        note: one.note ?? null,
      },
      tx,
    )
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
