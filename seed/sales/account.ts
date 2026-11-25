import { and, eq, isNull, type Db, type Transaction } from '@anavi/backend/src/db'
import { directClient } from './direction'
import { toMinor, type Currency } from '@anavi/shared'
import { crmContact } from '@anavi/backend/src/db/schema/crm'
import { ordOrder, ordOrderCredit } from '@anavi/backend/src/db/schema/ord'
import { org } from '@anavi/backend/src/db/schema/org'
import { linkOrgContact, updateContact } from '@anavi/backend/src/modules/crm/contact.service'
import { setCredit } from '@anavi/backend/src/modules/order/credit.service'
import { settledOf } from '@anavi/backend/src/modules/ordermoney/order.payments'
import { actorOf } from '../links/keeping'
import type { SiteRun } from './context'

/*
 * An organization that buys at the TILL — and whose telephone anybody may type there.
 *
 * The card is the organization's, the terms are written on it, and the shop has put the number of
 * the client's office manager beside them, which is what a shop does. Every order below is placed
 * the way the rest of this demo's are: by a visitor who did not sign in. So each lands on that card
 * and on nobody's account, and what the organization owes moves only where the script says the
 * shop looked at the order and said whose it was.
 *
 * The cards are written BEFORE the orders, because a till finds a card by the number typed into it.
 */
export async function seedAccounts(ctx: SiteRun, tx: Db | Transaction): Promise<void> {
  for (const account of ctx.script.accounts ?? []) {
    const person = ctx.script.people.find((one) => one.key === account.person)
    if (!person) throw new Error(`${ctx.site.slug}: no person «${account.person}»`)
    const [buyer] = await tx
      .select()
      .from(org)
      .where(and(eq(org.name, account.org), isNull(org.deletedAt)))
      .limit(1)
    if (!buyer) throw new Error(`${ctx.site.slug}: no organization «${account.org}»`)
    const card = await linkOrgContact(ctx.site.id, buyer, tx)
    await directClient(ctx.site, card.id, account.direction, tx)
    await setCredit(
      ctx.site.id,
      card.id,
      await actorOf(ctx.site, 'owner', tx),
      {
        days: account.terms.days,
        limit: toMinor(account.terms.limit, ctx.site.currency as Currency),
      },
      tx,
    )
    await updateContact(
      ctx.site.id,
      card.id,
      await actorOf(ctx.site, 'owner', tx),
      { phone: person.phone, ...(person.email ? { email: person.email } : {}) },
      tx,
    )
  }
}

/*
 * The scenario's intent, read back: an order on the account, and an unpaid one off it on the very
 * same card — the pair the rule «only what is on the account is the organization's debt» is
 * proved on at the screen. What the debt comes to is the platform's to say, and is never added up
 * here.
 */
export async function checkAccounts(ctx: SiteRun, tx: Db | Transaction): Promise<number> {
  let read = 0
  for (const account of ctx.script.accounts ?? []) {
    const [card] = await tx
      .select()
      .from(crmContact)
      .innerJoin(org, eq(org.id, crmContact.orgId))
      .where(
        and(
          eq(crmContact.siteId, ctx.site.id),
          eq(org.name, account.org),
          isNull(crmContact.deletedAt),
        ),
      )
      .limit(1)
    if (!card) throw new Error(`${ctx.site.slug}: «${account.org}» has no card after the orders`)
    const orders = await tx
      .select({ order: ordOrder, credit: ordOrderCredit })
      .from(ordOrder)
      .leftJoin(ordOrderCredit, eq(ordOrderCredit.orderId, ordOrder.id))
      .where(and(eq(ordOrder.contactId, card.crm_contact.id), isNull(ordOrder.deletedAt)))
    let on = 0
    let off = 0
    for (const { order, credit: onAccount } of orders) {
      if (order.status === 'canceled') continue
      if (onAccount !== null) on += 1
      else if (order.total > (await settledOf(order.id, tx))) off += 1
    }
    const where = `${ctx.site.slug}: «${account.org}»`
    if (on === 0)
      throw new Error(`${where} has nothing on its account — the script puts an order there`)
    if (off === 0)
      throw new Error(`${where} has no unpaid order off its account to prove the rule on`)
    read += orders.length
  }
  return read
}
