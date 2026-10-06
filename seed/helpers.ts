import { and, eq } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { iamIdentity } from '@anavi/backend/src/db/schema/iam'

// A deliberate local exception: inviting staff offers no password on purpose, so a dev account is
// pinned here after the fact, past the service layer — like a backdated demo timestamp.
export async function pinDevPassword(email: string, password: string, tx: Db | Transaction) {
  const secret = await Bun.password.hash(password)
  await tx
    .update(iamIdentity)
    .set({ secret, verifiedAt: new Date() })
    .where(and(eq(iamIdentity.provider, 'email'), eq(iamIdentity.identifier, email.toLowerCase())))
}
