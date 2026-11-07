import type { Db, Transaction } from '@anavi/backend/src/db'
import { iamIdentity, iamUser } from '@anavi/backend/src/db/schema/iam'
import { signupOrg } from '@anavi/backend/src/modules/staff/signup.service'
import { createOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { getOrg, updateOrg } from '@anavi/backend/src/modules/org/org.service'
import { askVerification } from '@anavi/backend/src/modules/org/verification.service'
import { setOrgVerification } from '@anavi/backend/src/modules/admin/admin.service'
import type { OrgId } from '@anavi/backend/src/db/ids'

const OWNER_EMAIL = 'owner@anavi.dev'
const DEV_PASSWORD = 'password'

/*
 * The platform's own administrator of a developer's machine. Written past the service layer for the
 * one reason the seed may do that — a dev password pinned: the platform has no door that gives an
 * account a password somebody else typed, and no door that makes an account an administrator out of
 * nothing.
 */
export async function seedAdminAccount(tx: Db | Transaction): Promise<bigint> {
  const [admin] = await tx
    .insert(iamUser)
    .values({ role: 'admin', name: 'Администратор' })
    .returning()
  await tx.insert(iamIdentity).values({
    userId: admin!.id,
    provider: 'email',
    identifier: 'admin@admin.com',
    secret: await Bun.password.hash(DEV_PASSWORD),
    verifiedAt: new Date(),
  })
  return admin!.id
}

// No organization is created here on purpose: self-signup is the only way one appears. This account
// exists so that path can be walked in dev.
export async function seedOwnerAccount(tx: Db | Transaction): Promise<bigint> {
  const [owner] = await tx.insert(iamUser).values({ role: 'account', name: 'Канимет' }).returning()
  await tx.insert(iamIdentity).values({
    userId: owner!.id,
    provider: 'email',
    identifier: OWNER_EMAIL,
    secret: await Bun.password.hash(DEV_PASSWORD),
    verifiedAt: new Date(),
  })
  return owner!.id
}

/**
 * A demo wants both halves at once: the legal entity and the site it publishes.
 *
 * The platform stopped offering that as one act on purpose — a partner is a business with no site,
 * and a compulsory site made that unexpressible — but every demo here is a business WITH one, so
 * the two calls are joined here rather than typed out ten times.
 */
export async function seedOrgWithSite(
  ownerId: bigint,
  input: { name: string; slug: string; defaultLocale: string; locales: string[] },
  tx: Db | Transaction,
) {
  const { org, staff, roles } = await signupOrg(ownerId, { name: input.name }, tx)
  const site = await createOrgSite(
    org.id,
    {
      name: input.name,
      slug: input.slug,
      defaultLocale: input.defaultLocale,
      locales: input.locales,
    },
    tx,
  )
  return { org, site, staff, roles }
}

/**
 * An organization signed up by its own person — the only way one appears: an account with a proved
 * address (the seed walks the road rather than stepping over the one check it exists for) and the
 * organization it makes. The dev password is pinned, the one thing a service must not offer.
 */
export async function signUpOrganization(
  input: { person: string; email: string; name: string },
  tx: Db | Transaction,
) {
  const [user] = await tx
    .insert(iamUser)
    .values({ role: 'account', name: input.person })
    .returning()
  await tx.insert(iamIdentity).values({
    userId: user!.id,
    provider: 'email',
    identifier: input.email,
    secret: await Bun.password.hash(DEV_PASSWORD),
    verifiedAt: new Date(),
  })
  return { ...(await signupOrg(user!.id, { name: input.name }, tx)), userId: user!.id }
}

/*
 * The conversation as an organization has it: it asks (a name and a tax number are what the platform
 * looks at, so a demo that was given none gets one in the form of the country's), the platform
 * answers yes. The platform's answer goes through the same door as the real one.
 */
export async function verifyOrg(orgId: OrgId, userId: bigint, tx: Db | Transaction) {
  const found = await getOrg(orgId, tx)
  if (!found.taxId?.trim())
    await updateOrg(orgId, { taxId: `0${String(orgId).padStart(13, '0')}` }, tx)
  await askVerification(orgId, userId, tx)
  await setOrgVerification(orgId, { verification: 'verified' }, tx)
}
