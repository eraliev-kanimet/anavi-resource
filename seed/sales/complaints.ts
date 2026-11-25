import { visitorOf } from './person'
import { and, db, desc, eq, isNull } from '@anavi/backend/src/db'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { ordOrder } from '@anavi/backend/src/db/schema/ord'
import { listFields, listForms } from '@anavi/backend/src/modules/form/form.service'
import { sendQuestionnaire } from '@anavi/backend/src/modules/appeal/appeal.service'
import { DEMOS } from '../demos'
import { phoneOf } from './common'
import { HOUR, scriptedAnswers } from './inbox'
import { loadScript } from './script'
import { daysAgo, settleThreads, stampIntake } from './stamp'
import { siteBySlug } from '../lib/sites'

/**
 * Buyers complaining of orders one demo took off another's site.
 *
 * After the loop, like every piece of work that belongs to two demos: the complaint is said about
 * the PROVIDER's order and heard on the OWNER's desk, so it is written only where both were filled
 * in this run — the order it is about exists only once the provider's pass has run.
 *
 * Through the door the order's own page opens — the owner's intake, with the order named and the
 * mark of a complaint — and it fails if the engine heard it as anything else.
 */
export async function seedComplaints(filled: readonly string[]): Promise<number> {
  let heard = 0
  for (const demo of DEMOS) {
    const script = await loadScript(demo.slug)
    const said = (script?.appeals ?? []).filter(
      (appeal) =>
        appeal.placed?.complaint &&
        appeal.from &&
        filled.includes(demo.slug) &&
        filled.includes(appeal.from),
    )
    for (const appeal of said) {
      await db.transaction(async (tx) => {
        const provider = await siteBySlug(demo.slug, tx)
        const owner = await siteBySlug(appeal.from!, tx)
        const person = script!.people.find((one) => one.key === appeal.person)
        if (!person) throw new Error(`${demo.slug}: no person «${appeal.person}»`)
        const [order] = await tx
          .select({ order: ordOrder })
          .from(ordOrder)
          .innerJoin(crmContact, eq(crmContact.id, ordOrder.contactId))
          .where(
            and(
              eq(ordOrder.siteId, provider.id),
              eq(ordOrder.shelfSiteId, owner.id),
              eq(crmContact.phone, phoneOf(person.phone, provider.country)),
              isNull(ordOrder.deletedAt),
            ),
          )
          .orderBy(desc(ordOrder.id))
          .limit(1)
        if (!order)
          throw new Error(
            `${demo.slug}: ${appeal.person} has no order from ${appeal.from} to complain of`,
          )

        const intake = (await listForms(owner.id, tx)).find((one) => one.request)
        if (!intake) throw new Error(`${owner.slug}: no intake to complain through`)
        const asked = await listFields(intake.id, tx)
        const words =
          asked.find((one) => one.type === 'textarea') ?? asked.find((one) => one.role === 'none')
        if (!words) throw new Error(`${owner.slug}: the intake has nowhere to write a complaint`)
        const [hour, minute] = appeal.at ?? [12, 0]
        const on = daysAgo(appeal.days, hour, minute)
        const complaint = appeal.placed!.complaint!
        const { submission } = await sendQuestionnaire(
          owner,
          intake,
          {
            answers: {
              ...(await scriptedAnswers(owner, asked, person, { ...appeal, answers: {} }, on, tx)),
              [words.key]: complaint.text,
            },
            locale: appeal.locale ?? owner.defaultLocale,
            subject: { type: 'order', slug: order.order.token, complaint: true },
          },
          { ipHash: null, visitor: await visitorOf(person, tx) },
          tx,
        )
        if (!submission || submission.siteId !== owner.id)
          throw new Error(`${demo.slug}: the complaint about №${order.order.number} was not heard`)
        await stampIntake(submission.id, new Date(on.getTime() + complaint.after * HOUR), tx)
        await settleThreads(owner.id, tx)
      })
      heard += 1
    }
  }
  return heard
}
