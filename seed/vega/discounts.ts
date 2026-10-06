import type { Db, Transaction } from '@anavi/backend/src/db'
import { createRule } from '@anavi/backend/src/modules/order/rule.service'
import { createPromo } from '@anavi/backend/src/modules/order/promo.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

/*
 * What takes money off at this shop, and the two of them are written against the orders that already
 * exist rather than against each other.
 *
 * Ten orders stand in this demo, from fifty-three thousand to three hundred and twenty-two. «From
 * two hundred thousand» fires on three of them and MISSES the fourth by a hair — a near miss is
 * worth more in a demo than another hit, because it shows the threshold is a threshold. «From the
 * third order» fires on exactly one, the third of the buyer who has three, and it is the only way to
 * live the most fragile part of the engine: counting somebody's finished orders.
 *
 * Two rather than one deliberately: with a single rule `bestRule` chooses the only candidate, which
 * proves nothing. With two it chooses, and on the order carrying the code below it is `chooseDiscount`
 * that chooses — between a rule and a code, which never add up.
 */
export async function seedDiscounts(siteId: SiteId, tx: Db | Transaction) {
  await createRule(
    siteId,
    {
      name: {
        ru: 'От 200 000 — 5%',
        en: '5% from 200,000',
        ar: 'خصم 5% من 200,000',
      },
      kind: 'volume',
      // In minor units, like every sum on this platform.
      threshold: 200_000_00,
      rewardKind: 'percent',
      rewardValue: 5,
    },
    tx,
  )

  await createRule(
    siteId,
    {
      name: {
        ru: 'Постоянному покупателю',
        en: 'Returning customer',
        ar: 'للعميل الدائم',
      },
      kind: 'loyal',
      // «From the third» means the third one is already discounted, so the order being placed counts.
      threshold: 3,
      rewardKind: 'percent',
      rewardValue: 7,
    },
    tx,
  )

  /*
   * One code — a fixed sum off, and that is what makes the three states reachable at all.
   *
   * A percentage was tried first and collapses the demo: ten per cent beats five and seven on every
   * basket, so the code wins always and the one thing worth showing — that a rule can beat a code,
   * and that the order then carries both — never happens. A flat ten thousand loses to five per cent
   * on a large basket and wins on a small one, which is exactly how a coupon behaves in a shop where
   * a laptop costs three hundred thousand.
   *
   * The floor is what refuses it on the smallest basket, in words the buyer can act on. The ceiling
   * is finite and above the three uses of this fixture, so the screen reads «3 of 20» rather than
   * «3 of ∞» — a limit nobody can reach teaches nothing about limits.
   */
  await createPromo(
    siteId,
    {
      code: 'VEGA10',
      kind: 'amount',
      value: 10_000_00,
      maxUses: 20,
      minTotal: 100_000_00,
    },
    tx,
  )
}
