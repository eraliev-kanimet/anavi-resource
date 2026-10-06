import type { Actor } from '@anavi/backend/src/lib/actor'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { iamIdentity, iamUser } from '@anavi/backend/src/db/schema/iam'
import { signupOrg } from '@anavi/backend/src/modules/org/signup.service'
import { createStaffLogin, updateStaff } from '@anavi/backend/src/modules/staff/staff.service'
import {
  acceptPartnership,
  appointSeller,
  invitePartner,
} from '@anavi/backend/src/modules/referral/partnership.service'
import { permissionsFor, type LocalizedLabel, type PromoKind } from '@anavi/shared'
import type { OrgId, SiteId } from '@anavi/backend/src/db/ids'

/**
 * The people and businesses a shop pays a percentage to, made the way the platform makes them.
 *
 * Both doors are walked in full rather than short-circuited into rows: an agency is INVITED and the
 * invitation is then accepted by an organization that signed itself up — which is the only way one
 * appears — and a seller is appointed out of the staff that already works here. A fixture writing
 * two `ref_partnership` rows directly would prove nothing about either.
 */
export interface SeedAgency {
  /** the shop's own word for the row until somebody takes the invitation */
  label: string
  /** the business on the other side, and the person who answers for it */
  name: string
  person: string
  email: string
  /** Empty leaves the site's own default standing, which is the ordinary case. */
  rewardKind?: PromoKind
  rewardValue?: number
}

/**
 * A partner organization with NO SITE of its own — a business with one employee and nothing
 * published, which is exactly the shape the platform describes and the reason signup stopped making
 * a site in the same movement.
 */
export async function seedAgency(
  siteId: SiteId,
  actor: Actor,
  input: SeedAgency,
  tx: Db | Transaction,
): Promise<void> {
  const partnership = await invitePartner(
    siteId,
    actor,
    {
      label: input.label,
      ...(input.rewardKind ? { rewardKind: input.rewardKind, rewardValue: input.rewardValue } : {}),
    },
    tx,
  )

  const [user] = await tx
    .insert(iamUser)
    .values({ role: 'account', name: input.person })
    .returning()
  await tx.insert(iamIdentity).values({
    userId: user!.id,
    provider: 'email',
    identifier: input.email,
    secret: await Bun.password.hash('password'),
    // Signing an organization up requires a proved address, so the address is proved: the seed walks
    // the road rather than stepping over the one check that road exists for.
    verifiedAt: new Date(),
  })
  const { org } = await signupOrg(user!.id, { name: input.name }, tx)
  // The token the letter would have carried. An invitation stands exactly where a token does.
  await acceptPartnership(partnership.token!, org.id, tx)
}

export interface SeedSeller {
  login: string
  name: string
  /** A label map like every other text a visitor may read: a title is what puts somebody on the site. */
  title: LocalizedLabel
  rewardKind?: PromoKind
  rewardValue?: number
}

/**
 * Somebody who works here and earns a percentage of what they sell.
 *
 * The account first and the partnership second, in that order and never as one act: the platform
 * refuses to promise money to a person who does not work in the organization, and that refusal is
 * what makes the seed's road the same road the back office walks.
 */
export async function seedSeller(
  orgId: OrgId,
  siteId: SiteId,
  actor: Actor,
  input: SeedSeller,
  tx: Db | Transaction,
): Promise<bigint> {
  const permitted = { ...actor, permissions: permissionsFor([actor.activeRole]) }
  const { staff } = await createStaffLogin(
    orgId,
    { login: input.login, password: 'password', name: input.name, roles: ['manager'] },
    permitted,
    tx,
  )
  // A title is what puts somebody on the site, and a seller who talks to clients belongs there.
  await updateStaff(orgId, staff.id, { title: input.title }, permitted, tx)
  await appointSeller(
    siteId,
    actor,
    {
      userId: String(staff.userId),
      ...(input.rewardKind ? { rewardKind: input.rewardKind, rewardValue: input.rewardValue } : {}),
    },
    tx,
  )
  return staff.userId
}
