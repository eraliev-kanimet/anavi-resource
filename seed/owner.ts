import type { Db, Transaction } from '@anavi/backend/src/db'
import { iamIdentity, iamUser } from '@anavi/backend/src/db/schema/iam'
import { signupOrg } from '@anavi/backend/src/modules/org/signup.service'
import { createOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { bootstrapSite } from '@anavi/backend/src/modules/org/site-bootstrap.service'

const OWNER_EMAIL = 'owner@anavi.dev'
const DEV_PASSWORD = 'password'

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
  await bootstrapSite(site.id, site.locales, tx)
  return { org, site, staff, roles }
}
