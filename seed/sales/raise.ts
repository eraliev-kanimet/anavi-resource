import { toMinor } from '@anavi/shared'
import type { Transaction } from '@anavi/backend/src/db'
import type { MsgThread } from '@anavi/backend/src/db/schema/msg'
import { listOffers } from '@anavi/backend/src/modules/order/offer.service'
import { listPartnerships } from '@anavi/backend/src/modules/referral/partnership.service'
import { raiseFromEstimate, raiseOrder } from '@anavi/backend/src/modules/order/order.service'
import { addImage } from '@anavi/backend/src/modules/media/media.service'
import { runSteps } from './orders'
import { drawSheet } from './slip'
import { stampOrder } from './stamp'
import type { SiteRun } from './context'
import type { ScriptRaise } from './script'

/**
 * The sale a conversation came to, written down out of it.
 *
 * The second door into an order, and for a business with no basket the only one. Everything the
 * demo owns is here — what was sold, for how much, who brought the client and what happened to the
 * document afterwards; everything the engine owns stays where it was, including the refusals: a
 * quantity off the ladder, a partnership that is not live and a shelf that cannot cover the line are
 * all answered by the service, and a fixture that walked round them would prove nothing.
 *
 * The position is found through the SAME door the back office picker reads — `listOffers` — so a
 * card the screen cannot offer is a card this cannot sell either.
 */
export async function raiseFromAppeal(
  ctx: SiteRun,
  thread: MsgThread,
  spec: ScriptRaise,
  on: Date,
  tx: Transaction,
  // The questionnaire this appeal was written with — what a counted request is raised from.
  submissionId: bigint | null = null,
): Promise<void> {
  const { site } = ctx

  if (spec.estimate) {
    if (submissionId === null) throw new Error(`${site.slug}: an estimate needs its request`)
    const raised = await raiseFromEstimate(site.id, thread.id, submissionId, ctx.actor, tx)
    const row = await runSteps(ctx, raised, spec.steps ?? [], tx)
    await stampOrder(row.id, on, tx, { intake: false })
    await workFiles(ctx, row.id, spec, tx)
    return
  }

  let partnershipId: string | null = null
  if (spec.partner) {
    const rows = await listPartnerships(site.id, tx)
    // By the partner's real name or by the shop's own word for the row — an appointed seller has no
    // label at all, and an agency keeps the one it was invited under.
    const found = rows.find(
      (row) => row.holderName === spec.partner || row.partnership.label === spec.partner,
    )
    if (!found) throw new Error(`${site.slug}: no partner «${spec.partner}»`)
    if (found.partnership.status !== 'active') {
      throw new Error(`${site.slug}: partnership «${spec.partner}» is ${found.partnership.status}`)
    }
    partnershipId = String(found.partnership.id)
  }

  const items = []
  for (const line of spec.lines ?? []) {
    if ('name' in line) {
      items.push({
        name: line.name,
        link: line.link ?? null,
        qty: line.qty ?? 1,
        price: line.price === undefined ? null : toMinor(line.price, site.currency),
        note: line.note ?? null,
      })
      continue
    }
    const offers = await listOffers(site.id, line.item, tx)
    // By the address exactly, never by what the search happened to rank first: a term that matches
    // three cards must not quietly sell one of the other two.
    const offer = offers.find((one) => one.item.slug === line.item)
    if (!offer) throw new Error(`${site.slug}: nothing on sale at «${line.item}»`)
    const packages = [...offer.variants].sort((a, b) => a.position - b.position)
    const variant = line.pick
      ? packages[line.pick - 1]
      : (packages.find((one) => one.isPrimary) ?? packages[0])
    if (!variant) {
      throw new Error(
        `${site.slug}: «${line.item}» has ${packages.length} packages, the file asks for №${line.pick}`,
      )
    }
    items.push({
      variantId: String(variant.id),
      qty: Math.max(line.qty ?? variant.minQty, variant.minQty),
      // Whole currency in the file, minor units on the wire: a demo is written in the money a person
      // says out loud.
      price: line.price === undefined ? null : toMinor(line.price, site.currency),
    })
  }

  const raised = await raiseOrder(
    site.id,
    thread.id,
    ctx.actor,
    { items, partnershipId, comment: spec.say ?? null },
    tx,
  )
  const row = await runSteps(ctx, raised, spec.steps ?? [], tx)
  // The questionnaire stays where it was: this document points at the APPEAL's answers, and moving
  // them would drag the whole conversation forward to the day the order was written.
  await stampOrder(row.id, on, tx, { intake: false })
  await workFiles(ctx, row.id, spec, tx)
}

/** The shop's own papers beside the order, drawn the way an appeal's attachment is. */
async function workFiles(ctx: SiteRun, orderId: bigint, spec: ScriptRaise, tx: Transaction) {
  for (const file of spec.files ?? []) {
    await addImage(
      ctx.site.id,
      'order_file',
      orderId,
      await drawSheet({ name: file.name, title: file.title, rows: file.rows ?? [] }),
      { caption: { [ctx.site.defaultLocale]: file.caption } },
      tx,
    )
  }
}
