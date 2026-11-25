import { updateOrg } from '@anavi/backend/src/modules/org/org.service'
import { verifyOrg } from '../lib/owner'
import { createPlace } from '@anavi/backend/src/modules/money/account.service'
import { and, eq, type Db, type Transaction } from '@anavi/backend/src/db'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { insProgram } from '@anavi/backend/src/db/schema/ins'
import {} from '@anavi/backend/src/db/schema/org'
import {
  actOnPartner,
  askPartner,
  invitePartner,
} from '@anavi/backend/src/modules/instalment/partner.service'
import { createProgram } from '@anavi/backend/src/modules/instalment/program.service'
import { signupOrg } from '@anavi/backend/src/modules/staff/signup.service'
import { seedRequisite } from '../lib/requisite'
import { createStaffLogin } from '@anavi/backend/src/modules/staff/staff.service'
import { permissionsFor } from '@anavi/shared'
import { siteBySlug } from '../lib/sites'
import { actorOf } from './keeping'

/*
 * AN ORGANIZATION THAT GIVES INSTALMENTS AND SELLS NOTHING — a house that works by murabaha: it
 * buys the thing from the shop and sells it to the buyer for a price named once, paid in parts.
 *
 * It has no site, and that is the point of it: giving instalments is not a kind of organization,
 * it is having a programme. After every demo, like the supplies — an agreement names a site of
 * somebody else.
 *
 * Three states are left standing so each end's screen has something to read: Watt was invited and
 * took the year; Watt asked for the two years and waits for an answer; Dyikan was invited and has
 * not answered.
 */
const LENDER = 'Ынтымак Финанс'

/*
 * What the house asks before it says yes. Short on purpose — it is answered on a telephone, at a
 * till — and the last one is a tick that has to be given: nobody is looked up without a word.
 */
const QUESTIONS = [
  {
    key: 'work',
    type: 'text' as const,
    isRequired: true,
    label: { ru: 'Где вы работаете', en: 'Where do you work', ar: 'أين تعمل' },
  },
  {
    key: 'income',
    type: 'number' as const,
    isRequired: true,
    label: { ru: 'Доход в месяц, сом', en: 'Monthly income, som', ar: 'الدخل الشهري بالسوم' },
  },
  {
    key: 'housing',
    type: 'choice' as const,
    isRequired: false,
    label: { ru: 'Жильё', en: 'Housing', ar: 'السكن' },
    options: [
      { key: 'own', label: { ru: 'Своё', en: 'My own', ar: 'ملك' } },
      { key: 'rent', label: { ru: 'Снимаю', en: 'Rented', ar: 'إيجار' } },
      { key: 'family', label: { ru: 'У родных', en: 'With family', ar: 'مع العائلة' } },
    ],
  },
  {
    key: 'consent',
    type: 'check' as const,
    isRequired: true,
    label: {
      ru: 'Согласен на проверку этих сведений',
      en: 'I agree to these details being checked',
      ar: 'أوافق على التحقق من هذه البيانات',
    },
  },
]

export async function seedLending(ownerId: bigint, tx: Db | Transaction): Promise<void> {
  const { org } = await signupOrg(ownerId, { name: LENDER }, tx)
  // A lender with no site: it lends and keeps its books, and buys nothing.
  await updateOrg(org.id, { features: { instalments: true, books: true } }, tx)
  await verifyOrg(org.id, ownerId, tx)
  // The house's own money, brought in from before: what it pays shops with when it buys an order out.
  // Without it the lender's bank stands below nought from the first buyout, and the books show a bankrupt.
  await createPlace(
    org.id,
    { userId: ownerId, activeRole: 'owner', viaOrgId: null },
    { kind: 'bank', name: 'Айыл Банк', currency: 'KGS', opening: 1_000_000_000 },
    tx,
  )
  // The account a buyer's payments go to: the order's code is drawn from the giver's, not the shop's.
  await seedRequisite(
    org.id,
    ownerId,
    {
      label: 'Айыл Банк',
      merchant: 'ОсОО Ынтымак Финанс',
      city: 'Бишкек',
      country: 'KG',
      // ISO 4217 numeric for KGS; 6012 is the MCC of a financial institution selling goods
      currency: '417',
      mcc: '6012',
      account: '1234509876123450',
      scheme: 'KG.DEMOBANK',
    },
    tx,
  )

  await createProgram(
    org.id,
    {
      name: {
        ru: 'Мурабаха на 12 месяцев',
        en: 'Murabaha for 12 months',
        ar: 'مرابحة لمدة 12 شهراً',
      },
      terms: {
        ru: 'Первый взнос 10%, наценка 12% от цены — названа один раз и не растёт. Пени за просрочку нет. Нужен паспорт.',
        en: 'A first payment of 10% and a markup of 12% of the price — named once, it does not grow. No penalty for a late payment. A passport is needed.',
        ar: 'دفعة أولى 10% وزيادة 12% من السعر — تُحدد مرة واحدة ولا تزيد. لا غرامة على التأخير. يلزم جواز السفر.',
      },
      months: 12,
      down: 1000,
      markup: 1200,
      minSum: 1000000,
      currency: 'KGS',
      isOpen: true,
      questions: QUESTIONS,
      answerDays: 2,
    },
    tx,
  )
  await createProgram(
    org.id,
    {
      name: {
        ru: 'Мурабаха на 24 месяца',
        en: 'Murabaha for 24 months',
        ar: 'مرابحة لمدة 24 شهراً',
      },
      terms: {
        ru: 'Первый взнос 20%, наценка 22% от цены — названа один раз и не растёт. Пени за просрочку нет. Нужен паспорт и справка о доходе.',
        en: 'A first payment of 20% and a markup of 22% of the price — named once, it does not grow. No penalty for a late payment. A passport and proof of income are needed.',
        ar: 'دفعة أولى 20% وزيادة 22% من السعر — تُحدد مرة واحدة ولا تزيد. لا غرامة على التأخير. يلزم جواز السفر وإثبات الدخل.',
      },
      months: 24,
      down: 2000,
      markup: 2200,
      // Two years is the house's long money: goods that come back lower the debt by their own
      // price and the markup stays owed — said on every page the programme is offered on.
      markupBack: false,
      minSum: 5000000,
      currency: 'KGS',
      isOpen: true,
      questions: QUESTIONS,
      answerDays: 2,
    },
    tx,
  )
  const programs = await tx
    .select()
    .from(insProgram)
    .where(and(eq(insProgram.orgId, org.id)))
    .orderBy(insProgram.months)
  const [year, two] = programs
  if (!year || !two) throw new Error("the lender's programmes were not written")

  const watt = await siteBySlug('watt', tx)
  const dyikan = await siteBySlug('dyikan', tx)

  // Whoever answers the applications, and nothing else here: the one screen an underwriter holds.
  await createStaffLogin(
    org.id,
    { login: 'yntymak-desk', password: 'password', name: 'Назира Бекова', roles: ['underwriter'] },
    {
      userId: ownerId,
      activeRole: 'owner' as const,
      permissions: permissionsFor(['owner']),
      viaOrgId: null,
    },
    tx,
  )

  /*
   * The money between the house and a shop, named with the invitation and read by the shop before
   * its yes: Watt gives up three per cent of each price for a sale it would not have made, and is
   * paid within ten days of the house agreeing to a buyer.
   */
  const terms = { share: 300, payDays: 10 }
  const house = { userId: ownerId, activeRole: 'owner' as const, viaOrgId: null }
  const shop = await actorOf(watt, 'owner', tx)
  const invited = await invitePartner(org.id, year.id, { address: watt.slug, ...terms }, house, tx)
  await actOnPartner({ siteId: asSiteId(watt.id) }, invited.id, 'accept', shop, tx, terms)
  await askPartner(asSiteId(watt.id), { programId: String(two.id) }, shop, tx)
  await invitePartner(org.id, year.id, { address: dyikan.slug, share: 200, payDays: 14 }, house, tx)
}
