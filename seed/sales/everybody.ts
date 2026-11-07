import { visitorOf } from './person'
import { and, asc, db, desc, eq, gte, isNotNull } from '@anavi/backend/src/db'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { msgMessage, msgThread, msgRequest, msgRequestDesk } from '@anavi/backend/src/db/schema/msg'
import { srvService } from '@anavi/backend/src/db/schema/srv'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { listFields, listForms } from '@anavi/backend/src/modules/form/form.service'
import { sendQuestionnaire } from '@anavi/backend/src/modules/appeal/appeal.service'
import { postMessage } from '@anavi/backend/src/modules/inbox/message.service'
import { confirmByBuyer } from '@anavi/backend/src/modules/order/status.service'
import { lapseRequests } from '@anavi/backend/src/modules/appeal/close'
import { answerDesk, declineDesk } from '@anavi/backend/src/modules/appeal/desk'
import { resendRequest } from '@anavi/backend/src/modules/appeal/resend'
import { tellRequestDigests } from '@anavi/backend/src/modules/appeal/digest'
import { ntfNotice } from '@anavi/backend/src/db/schema/ntf'
import { REQUEST_SILENCE_DAYS, toMinor, type Currency } from '@anavi/shared'
import { DEMOS } from '../demos'
import { actorOf } from '../links/keeping'
import { siteBySlug } from '../lib/sites'
import { scriptedAnswers } from './inbox'
import { loadScript } from './script'
import { daysAgo, markSeen, settleThreads, stampIntake, stampMessage, stampOrder } from './stamp'

const MINUTE = 60_000
const DAY = 86_400_000

/**
 * Requests sent to EVERYBODY who provides a service — one questionnaire on the owner's page, a
 * request on the desk of each of them.
 *
 * After the loop, like every piece of work that belongs to several demos: the requests lie on the
 * desks of the owner AND of each provider, and every one of those desks stands only once the loop
 * has filled them all.
 *
 * The file is the OWNER's (`everybody` in its script): the page is its own. Who receives it is
 * not written there — that is the engine's reading of the list the page prints, and the fixture
 * fails where a site the file says answered was not among them.
 */
export async function seedEverybody(slugs: readonly string[]): Promise<number> {
  let sent = 0
  // The demos of this run, like every step beside it: a request is sent by a reader whom this run's
  // own sales signed in, and a run of one shop has signed in nobody at the others.
  for (const demo of DEMOS.filter((one) => slugs.includes(one.slug))) {
    const script = await loadScript(demo.slug)
    const sendings = script?.everybody ?? []
    if (sendings.length === 0) continue
    await db.transaction(async (tx) => {
      const owner = await siteBySlug(demo.slug, tx)
      const ownerId = asSiteId(owner.id)
      for (const sending of sendings) {
        const person = script!.people.find((one) => one.key === sending.person)
        if (!person) throw new Error(`${demo.slug}: no person «${sending.person}»`)
        const form = (await listForms(ownerId, tx)).find((one) => one.slug === sending.form)
        if (!form) throw new Error(`${demo.slug}: no form «${sending.form}»`)
        const [about] = await tx
          .select()
          .from(srvService)
          .where(and(eq(srvService.siteId, ownerId), eq(srvService.slug, sending.service)))
          .limit(1)
        if (!about) throw new Error(`${demo.slug}: no service «${sending.service}»`)
        /*
         * Such a request is a READER's to send: whoever the file names signed in at this site's
         * own door earlier in the run (`readers` in the same file), and the request goes out under
         * that card — found by the address the door knows them by, and only where that address
         * was proved there. A script that sends one for somebody who never signed in is the mistake the door
         * exists to refuse, and is named here rather than left to fail inside it.
         */
        const [reader] = person.email
          ? await tx
              .select({ card: crmContact })
              .from(crmContact)
              .where(
                and(
                  eq(crmContact.siteId, ownerId),
                  eq(crmContact.email, person.email),
                  // signed in: the card is a person's, and its address was proved at the door
                  isNotNull(crmContact.userId),
                  isNotNull(crmContact.emailVerifiedAt),
                ),
              )
              .limit(1)
          : []
        if (!reader)
          throw new Error(`${demo.slug}: «${sending.person}» sends to everybody without signing in`)
        const fields = await listFields(form.id, tx)
        // Never ahead of the clock: a request of today written for an hour that has not come.
        const on = new Date(
          Math.min(
            daysAgo(sending.days, sending.at[0], sending.at[1]).getTime(),
            Date.now() - 30 * MINUTE,
          ),
        )
        const { submission } = await sendQuestionnaire(
          owner,
          form,
          {
            answers: await scriptedAnswers(
              owner,
              fields,
              person,
              {
                person: sending.person,
                form: sending.form,
                days: sending.days,
                answers: sending.answers,
              },
              on,
              tx,
            ),
            locale: owner.defaultLocale,
            subject: {
              type: 'service',
              slug: sending.service,
              everybody: true,
              ...(sending.city ? { city: sending.city } : {}),
            },
          },
          {
            ipHash: null,
            reader: () => Promise.resolve(reader.card),
            visitor: await visitorOf(person, tx),
          },
          tx,
        )
        if (!submission?.sent)
          throw new Error(`${demo.slug}: «${sending.service}» went to one desk, not to everybody`)

        const [request] = await tx
          .select()
          .from(msgRequest)
          .where(eq(msgRequest.key, submission.sent.key))
        const mine = await tx
          .select({ desk: msgRequestDesk, thread: msgThread })
          .from(msgRequestDesk)
          .innerJoin(msgThread, eq(msgThread.submissionId, msgRequestDesk.submissionId))
          .where(eq(msgRequestDesk.requestId, request!.id))
          .orderBy(asc(msgRequestDesk.submissionId))
        for (const { desk } of mine) await stampIntake(desk.submissionId, on, tx)
        // Sent when the file says it was, so its term is counted from that day.
        await tx.update(msgRequest).set({ createdAt: on }).where(eq(msgRequest.id, request!.id))

        const tokens = new Map<string, { token: string; total: number }>()
        for (const reply of sending.replies ?? []) {
          const site = await siteBySlug(reply.by, tx)
          const link = mine.find((one) => one.desk.siteId === site.id)
          if (!link)
            throw new Error(`${demo.slug}: ${reply.by} answers a request it did not receive`)
          const actor = await actorOf(site, 'owner', tx)
          const at = new Date(Math.min(on.getTime() + reply.in * MINUTE, Date.now() - MINUTE))
          /*
           * A sum named is an ANSWER, given the way a desk gives one from its feed of such
           * requests: one act that writes the document and says the words beside it. Without a
           * sum the reply is words alone, and the page of the sending says so.
           */
          if (reply.sum !== undefined) {
            const order = await answerDesk(
              asSiteId(site.id),
              link.thread.id,
              actor,
              { price: toMinor(reply.sum, site.currency as Currency), words: reply.text },
              tx,
            )
            await stampOrder(order.id, at, tx, { intake: false })
            tokens.set(reply.by, { token: order.token, total: order.total })
          } else {
            await postMessage(
              asSiteId(site.id),
              link.thread.id,
              actor.userId,
              { body: reply.text, isInternal: false },
              tx,
            )
          }
          const [message] = await tx
            .select({ id: msgMessage.id })
            .from(msgMessage)
            .where(and(eq(msgMessage.threadId, link.thread.id), eq(msgMessage.author, 'staff')))
            .orderBy(desc(msgMessage.id))
            .limit(1)
          await stampMessage(message!.id, at, tx)
          await markSeen(link.thread.id, new Date(at.getTime() + MINUTE), tx)
        }

        // «We will not take this one», said from the desk's own feed.
        for (const slug of sending.declined ?? []) {
          const site = await siteBySlug(slug, tx)
          const link = mine.find((one) => one.desk.siteId === site.id)
          if (!link) throw new Error(`${demo.slug}: ${slug} declines a request it did not receive`)
          await declineDesk(asSiteId(site.id), link.thread.id, tx)
        }

        // The client's choice, through the door the order's own page opens: consent to one answer.
        if (sending.chosen) {
          const answer = tokens.get(sending.chosen)
          if (!answer)
            throw new Error(`${demo.slug}: ${sending.chosen} was chosen without a sum to choose`)
          // …to the sum its page showed them.
          await confirmByBuyer(ownerId, answer.token, { total: answer.total }, tx)
          // …on the day the file says they made up their mind, not the day the fixture ran.
          if (sending.chosenOn) {
            const at = daysAgo(
              sending.chosenOn.days,
              sending.chosenOn.at[0],
              sending.chosenOn.at[1],
            )
            await tx
              .update(msgRequest)
              .set({ closedAt: new Date(Math.min(at.getTime(), Date.now() - MINUTE)) })
              .where(eq(msgRequest.id, request!.id))
          }
        }
        /*
         * NOBODY SAID A WORD — closed by the platform's own round, asked at the hour the silence
         * ran out. The round is handed that hour, so it finds this sending and no younger one; the
         * closing is then dated there, not at the minute the fixture ran.
         */
        if (sending.silent) {
          const due = new Date(on.getTime() + REQUEST_SILENCE_DAYS * DAY + MINUTE)
          await lapseRequests(due, tx)
          const [closed] = await tx
            .update(msgRequest)
            .set({ closedAt: due })
            .where(and(eq(msgRequest.id, request!.id), eq(msgRequest.closedBy, 'silence')))
            .returning()
          if (!closed)
            throw new Error(`${demo.slug}: «${sending.service}» did not close in silence`)

          // …and sent again by the client, through the door the closed page's button opens.
          if (sending.resentOn) {
            const at = new Date(
              Math.min(
                daysAgo(
                  sending.resentOn.days,
                  sending.resentOn.at[0],
                  sending.resentOn.at[1],
                ).getTime(),
                Date.now() - 20 * MINUTE,
              ),
            )
            const again = await resendRequest(
              owner,
              closed,
              { ipHash: null, visitor: await visitorOf(person, tx) },
              tx,
            )
            if (!again.sent)
              throw new Error(`${demo.slug}: «${sending.service}» sent again reached one desk`)
            const [second] = await tx
              .update(msgRequest)
              .set({ createdAt: at })
              .where(eq(msgRequest.key, again.sent.key))
              .returning()
            await tx.update(msgRequest).set({ resentAt: at }).where(eq(msgRequest.id, closed.id))
            const reached = await tx
              .select()
              .from(msgRequestDesk)
              .where(eq(msgRequestDesk.requestId, second!.id))
            for (const desk of reached) await stampIntake(desk.submissionId, at, tx)
            for (const one of again.sent.desks) await settleThreads(asSiteId(one.site.id), tx)
            sent += 1
          }
        }
        for (const one of submission.sent.desks) await settleThreads(asSiteId(one.site.id), tx)
        sent += 1
      }
    })
  }
  await seedDigests()
  return sent
}

/**
 * The morning's count of such requests, as each desk would have been told it today.
 *
 * Told by the platform's own round, asked hour by hour through the day that is passing: «morning»
 * is each site's own hour, and the round itself knows whose it is.
 */
async function seedDigests(): Promise<void> {
  // Before the transaction opens: a row written inside it is dated at its beginning.
  const began = new Date(Date.now() - 1000)
  const start = new Date(began)
  start.setUTCMinutes(0, 0, 0)
  // The last day and a half, so a base built before a site's morning still holds yesterday's.
  // The round walks each site in a transaction of its own, so this is no transaction either.
  for (let hour = -36; hour <= 0; hour += 1) {
    const at = new Date(start.getTime() + hour * 60 * MINUTE)
    if ((await tellRequestDigests(at)) === 0) continue
    // Dated at the hour it would have been said.
    await db
      .update(ntfNotice)
      .set({ createdAt: at })
      .where(and(eq(ntfNotice.kind, 'requests_digest'), gte(ntfNotice.createdAt, began)))
  }
}
