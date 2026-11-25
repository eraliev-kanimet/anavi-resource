import { and, desc, eq, isNull, sql, type Db, type Transaction } from '@anavi/backend/src/db'
import { finAccount } from '@anavi/backend/src/db/schema/fin'
import { asOrgId, type OrgId } from '@anavi/backend/src/db/ids'
import { recordAction } from '@anavi/backend/src/modules/staff/action.service'
import { balanceOf } from '@anavi/backend/src/modules/money/account.service'
import { createParty } from '@anavi/backend/src/modules/money/counterpart.service'
import { updateOrg } from '@anavi/backend/src/modules/org/org.service'
import {
  answerAccess,
  callAccess,
  setAccessPerson,
} from '@anavi/backend/src/modules/access/access.service'
import { createMove } from '@anavi/backend/src/modules/money/document.write'
import {
  createStaffLogin,
  listOrgStaffMembers,
} from '@anavi/backend/src/modules/staff/staff.service'
import { monthOf, permissionsFor, toMinor } from '@anavi/shared'
import { orgToday } from '@anavi/backend/src/lib/clock'
import { answerFee, feeOf, offerFee } from '@anavi/backend/src/modules/retainer/retainer.service'
import { signUpOrganization, verifyOrg } from '../lib/owner'
import { siteBySlug } from '../lib/sites'

/*
 * A FIRM THAT KEEPS ANOTHER'S BOOKS AND HAS NO SITE: an accounting office with two people, called in
 * by Saima's organization. The accountant works the books and the auditor only reads them, each on the
 * access in the roles it carries, so the client's screens show a visitor's hand in the journal, the
 * documents and the staff list — a thing the platform cannot be looked at without.
 *
 * After every demo: an access names two organizations. Its month of work is dated back by the same
 * pass the sales fixture uses for its rows.
 */
const FIRM = 'Ала-Тоо Аудит'
const CLIENT = 'saima'
const DAY = 86_400_000

export async function seedAccess(tx: Db | Transaction): Promise<void> {
  const { org: firm, staff: head } = await signUpOrganization(
    { person: 'Айгуль Сыдыкова', email: 'alatoo@anavi.dev', name: FIRM },
    tx,
  )
  await updateOrg(firm.id, { features: { books: true } }, tx)
  await verifyOrg(firm.id, head.userId, tx)
  const firmOwner = {
    userId: head.userId,
    activeRole: 'owner' as const,
    permissions: permissionsFor(['owner']),
    viaOrgId: null,
  }
  for (const person of [
    { login: 'alatoo-books', name: 'Бекзат Маратов', roles: ['accountant' as const] },
    { login: 'alatoo-audit', name: 'Динара Касымова', roles: ['auditor' as const] },
  ]) {
    await createStaffLogin(firm.id, { ...person, password: 'password' }, firmOwner, tx)
  }

  const client = await siteBySlug(CLIENT, tx)
  const clientOrg = asOrgId(client.orgId)
  const clientStaff = await listOrgStaffMembers(clientOrg, tx)
  const clientOwner = clientStaff.find((one) => one.roles.includes('owner'))!
  const owner = {
    userId: clientOwner.staff.userId,
    activeRole: 'owner' as const,
    permissions: permissionsFor(['owner']),
    viaOrgId: null,
  }

  // The firm asks to come in as the books' people; the client answers to exactly those roles.
  const roles = ['accountant', 'auditor'] as ('accountant' | 'auditor')[]
  const access = await callAccess(
    asOrgId(firm.id),
    { side: 'serving', target: CLIENT, roles, endsOn: null },
    firmOwner,
    tx,
  )
  await answerAccess(clientOrg, access.id, { act: 'accept', roles, endsOn: null }, owner, tx)

  const mine = await listOrgStaffMembers(asOrgId(firm.id), tx)
  const accountant = mine.find((one) => one.roles.includes('accountant'))!
  const auditor = mine.find((one) => one.roles.includes('auditor'))!
  await setAccessPerson(
    asOrgId(firm.id),
    access.id,
    { staffId: accountant.staff.id, roles: ['accountant'] },
    firmOwner,
    tx,
  )
  await setAccessPerson(
    asOrgId(firm.id),
    access.id,
    { staffId: auditor.staff.id, roles: ['auditor'] },
    firmOwner,
    tx,
  )

  /*
   * The firm's price, from this month: offered by its owner and agreed by the client's, the yes to
   * exactly the edition the client's screen showed. Its first month is written on the morning after
   * this one ends.
   */
  await offerFee(
    asOrgId(firm.id),
    access.id,
    {
      amount: toMinor(18000, 'KGS'),
      currency: 'KGS',
      from: monthOf(await orgToday(asOrgId(firm.id), tx)),
      payDays: 10,
    },
    firmOwner,
    tx as Transaction,
  )
  const asked = (await feeOf(clientOrg, access.id, tx)).waiting
  if (!asked) throw new Error('the firm offered a price and the client sees nothing to answer')
  await answerFee(
    clientOrg,
    access.id,
    { editionId: asked.id, act: 'accept' },
    owner,
    tx as Transaction,
  )

  await monthOfWork(clientOrg, asOrgId(firm.id), accountant.staff.userId, tx)
}

/*
 * The accountant's month in the client's books: a counterparty entered through the same door the
 * screen presses (so the organization's journal says who and through whom), and a few payments the
 * firm typed from the client's papers, one a week back to the start of the month. The days they bear
 * and the moments of their lines are set back together, as every demo's rows are.
 */
async function monthOfWork(
  clientOrg: OrgId,
  firm: OrgId,
  accountantId: bigint,
  tx: Db | Transaction,
): Promise<void> {
  const by = { userId: accountantId, activeRole: 'accountant' as const, viaOrgId: firm }
  // The line the screen's door would have left for it: the seed is one transaction, which a door
  // walked by `run` (its own connection) could not see.
  await createParty(
    clientOrg,
    { name: 'ОсОО Кыргыз Электро', taxId: '02305200610187', legalKind: 'org' },
    tx,
  )
  await recordAction(
    {
      orgId: clientOrg,
      siteId: null,
      actor: by,
      act: 'money.parties:create',
      subject: null,
    },
    tx,
  )

  // The till that holds the most: a typed payment out of an empty one is refused, as it should be.
  const places = await tx
    .select({ id: finAccount.id })
    .from(finAccount)
    .where(
      and(
        eq(finAccount.orgId, clientOrg),
        eq(finAccount.type, 'money'),
        isNull(finAccount.deletedAt),
      ),
    )
  const held = await Promise.all(
    places.map(async (one) => ({ id: one.id, held: await balanceOf(one.id, tx) })),
  )
  const place = held.sort((a, b) => b.held - a.held)[0]
  const [rent] = await tx
    .select({ id: finAccount.id })
    .from(finAccount)
    .where(
      and(
        eq(finAccount.orgId, clientOrg),
        eq(finAccount.type, 'expense'),
        isNull(finAccount.deletedAt),
      ),
    )
    .orderBy(desc(finAccount.position))
    .limit(1)
  if (!place || !rent)
    throw new Error('saima has no till or expense item for the accountant to type into')

  const today = Date.now()
  for (const [back, share, note] of [
    [26, 0.04, 'Электричество, по счёту поставщика'],
    [19, 0.02, 'Интернет за месяц, по счёту'],
    [12, 0.06, 'Аренда торгового места, по договору'],
    [5, 0.01, 'Канцелярия для офиса, по чеку'],
  ] as const) {
    const on = new Date(today - back * DAY).toISOString().slice(0, 10)
    await createMove(
      clientOrg,
      by,
      {
        placeId: place.id,
        accountId: rent.id,
        direction: 'out',
        amount: Math.max(1, Math.floor(place.held * share)),
        on,
        note,
      },
      tx,
    )
  }

  // The lines of the organization's journal were written now; they stand as the week they belong to.
  await tx.execute(sql`
    update sys_action set created_at = now() - ((id % 25) + 2) * interval '1 day'
    where org_id = ${clientOrg} and actor_via_org_id = ${firm}`)
}
