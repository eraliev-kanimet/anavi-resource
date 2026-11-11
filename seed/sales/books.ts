import { sql } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { MoneySource } from '@anavi/shared'
import { sourceRows } from '@anavi/backend/src/modules/money/sources'

/*
 * The rows a document can stand on, by the source it names — the books' own registry, whole, so a
 * new source is never left out of the clean-up: a row the sales pass deletes takes its document with
 * it, whichever door wrote it. A partial list here once left a second run's piecework standing on
 * batches already deleted, and the next month paid it out.
 */
const SOURCE_TABLES: Record<MoneySource, string> = Object.fromEntries(
  Object.entries(sourceRows()).map(([type, row]) => [type, row.table]),
) as Record<MoneySource, string>

/*
 * The day of each of them: the moment of its row. The sales pass sets those moments back past the
 * service layer — the one exception the seed allows itself — and the document a door posted beside
 * the row stood on the day of the run until this put it beside its row again. A sale is the day
 * the order last moved on its status or shipped; an order's own purchase paid, the day it last moved.
 */
const SOURCE_MOMENTS: Partial<Record<MoneySource, string>> = {
  ...Object.fromEntries(
    Object.entries(SOURCE_TABLES)
      // A machine's documents stand on their own days — its purchase, each month's wear, its sale —
      // and a batch's piecework on the day it was released: none of them follows its row's moment.
      .filter(([type]) => type !== 'asset' && type !== 'batch')
      .map(([type, table]) => [type, `select created_at from ${table} s where s.id = e.source_id`]),
  ),
  // The money of an order keeps its own day (`ord_payment.on`), stamped with its moment.
  order_payment: `select "on"::timestamp at time zone o.timezone from ord_payment s where s.id = e.source_id`,
  // A carriage's money keeps its own day too; `followDays` first sets it to the moment the pass gave the row.
  order_transfer: `select "on"::timestamp at time zone o.timezone from ord_transfer s where s.id = e.source_id`,
  shp_payment: `select "on"::timestamp at time zone o.timezone from shp_payment s where s.id = e.source_id`,
  shp_refund: `select "on"::timestamp at time zone o.timezone from shp_refund s where s.id = e.source_id`,
  shp_transfer: `select "on"::timestamp at time zone o.timezone from shp_transfer s where s.id = e.source_id`,
  shp_payout: `select "on"::timestamp at time zone o.timezone from shp_payout s where s.id = e.source_id`,
  arrival: `select "on"::timestamp at time zone o.timezone from fin_arrival s where s.id = e.source_id`,
  charge: `select "on"::timestamp at time zone o.timezone from fin_charge s where s.id = e.source_id`,
  ref_paid: `select coalesce(paid_at, created_at) from ref_accrual s where s.id = e.source_id`,
  order: `select max(created_at) from ord_event s where s.order_id = e.source_id and s.kind in ('status', 'shipment')`,
  purchase: `select updated_at from ord_order s where s.id = e.source_id`,
  purchase_payment: `select "on"::timestamp at time zone o.timezone from ord_send s where s.id = e.source_id`,
  ai_topup: `select created_at from bil_topup s where s.id = e.source_id`,
  // A seller is paid the day the desk said it was bought.
  shp_purchase: `select bought_at from shp_purchase s where s.id = e.source_id`,
  // The road's loss is written the day the relocation closed short.
  relocation: `select received_at from stk_relocation s where s.id = e.source_id`,
  // A payroll and a month's tax stand on the month's last day by their own doors.
  payroll: `select e."on"::timestamp at time zone o.timezone`,
  batch_work: `select e."on"::timestamp at time zone o.timezone`,
  shift: `select opened_at from fin_shift s where s.id = e.source_id`,
  tax: `select e."on"::timestamp at time zone o.timezone`,
}

/** Every document of the books moved to the day of the row it stands on, in its organization's days. */
// The journal's own days, and the terms that run from them, follow the moment the sales pass set
// each row to, in the days of the organization that dates it (the creditor's). Asked wherever the platform is asked what stood on a
// day, since it answers by these days and the pass moves the moments after the rows are written.
export async function followSettlementDays(tx: Db | Transaction): Promise<void> {
  // The term moves with the day: a debt is due the same number of days after its own day as it was
  // the day the platform wrote it, so a row set back a month is overdue a month earlier too.
  await tx.execute(sql`
    update stl_entry s set
      due_on = s.due_on + ((s.created_at at time zone o.timezone)::date - s."on"),
      "on" = (s.created_at at time zone o.timezone)::date
    from org o
    where o.id = s.creditor_org_id and s."on" <> (s.created_at at time zone o.timezone)::date`)
}

export async function followDays(tx: Db | Transaction): Promise<number> {
  let moved = 0
  await followSettlementDays(tx)
  await followObligationDays(tx)
  // The day on a carriage's money row is the moment the pass set it to, in its carrier's days.
  for (const table of ['shp_transfer', 'shp_payout', 'shp_refund']) {
    await tx.execute(sql`
      update ${sql.identifier(table)} s set "on" = (s.created_at at time zone o.timezone)::date
      from org_site t join org o on o.id = t.org_id
      where t.id = s.site_id and s."on" <> (s.created_at at time zone o.timezone)::date`)
  }
  await tx.execute(sql`
    update shp_payment s set "on" = (s.created_at at time zone o.timezone)::date
    from shp_shipment h join org_site t on t.id = h.site_id join org o on o.id = t.org_id
    where h.id = s.shipment_id and s."on" <> (s.created_at at time zone o.timezone)::date`)
  for (const [type, moment] of Object.entries(SOURCE_MOMENTS)) {
    const result = await tx.execute(sql`
      update fin_entry e set "on" = ((${sql.raw(moment)}) at time zone o.timezone)::date
      from org o
      where o.id = e.org_id and e.source_type = ${type}
        and (${sql.raw(moment)}) is not null
        and e."on" <> ((${sql.raw(moment)}) at time zone o.timezone)::date`)
    moved += (result as unknown as { count?: number }).count ?? 0
  }
  return moved
}

/*
 * The obligations follow the days of what they stand on: the passes set a schedule, a term or a
 * journal's day back in time after the platform wrote its obligation, and an obligation must fall due
 * on the very day its source does — a debt the demo shows a month late is a month late to its
 * morning too. A raw touch for exactly what the seed may do by hand: a backdated day.
 */
export async function followObligationDays(tx: Db | Transaction): Promise<void> {
  await tx.execute(sql`
    update obl_due o set due_on = s.due_on from stl_entry s
    where o.source_type = 'settlement' and o.source_id = s.id and s.due_on is not null and o.due_on <> s.due_on`)
  await tx.execute(sql`
    update obl_due o set due_on = d.due_on from ins_due d
    where o.source_type = 'instalment' and o.source_id = d.id and d.due_on is not null and o.due_on <> d.due_on`)
  await tx.execute(sql`
    update obl_due o set due_on = c.due_on from ord_order_credit c
    where o.source_type = 'credit' and o.source_id = c.order_id and c.due_on is not null and o.due_on <> c.due_on`)
  await tx.execute(sql`
    update obl_due o set due_on = b.due_on from fin_bill b
    where o.source_type = 'bill' and o.source_id = b.entry_id and b.due_on is not null and o.due_on <> b.due_on`)
}
