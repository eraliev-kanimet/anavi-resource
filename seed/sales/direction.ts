import type { Db, Transaction } from '@anavi/backend/src/db'
import { asOrgId, asSiteId } from '@anavi/backend/src/db/ids'
import type { OrgSite } from '@anavi/backend/src/db/schema/org'
import { eq } from '@anavi/backend/src/db'
import { catCategory } from '@anavi/backend/src/db/schema/cat'
import { shpRoute } from '@anavi/backend/src/db/schema/shp'
import { setDirectionLinks } from '@anavi/backend/src/modules/desk/money-direction.service'
import {
  listDirections,
  setClientDirection,
} from '@anavi/backend/src/modules/money/direction.service'
import { loadBooks } from '../lib/books'

// The seller's direction a client's purchases go to, by its name: every sale of this client then
// stands in it, as a shop keeping wholesale apart from its retail keeps it.
export async function directClient(
  seller: OrgSite,
  cardId: bigint,
  name: string | undefined,
  tx: Db | Transaction,
): Promise<void> {
  if (!name) return
  const direction = (await listDirections(asOrgId(seller.orgId), tx)).find(
    (one) => one.name === name,
  )
  if (!direction) throw new Error(`${seller.slug}: no direction «${name}»`)
  await setClientDirection(asSiteId(seller.id), cardId, { directionId: direction.id }, tx)
}

// What each direction of a demo is made of, said in its books: the shelves it sells and the routes it
// carries. Done before the first sale is booked, since a sale takes its direction on the day.
export async function linkDirections(seller: OrgSite, tx: Db | Transaction): Promise<void> {
  const books = await loadBooks(seller.slug)
  const made = (books?.directions ?? []).flatMap((one) => (typeof one === 'string' ? [] : [one]))
  if (made.length === 0) return
  const orgId = asOrgId(seller.orgId)
  const shelves = await tx.select().from(catCategory).where(eq(catCategory.siteId, seller.id))
  const routes = await tx.select().from(shpRoute).where(eq(shpRoute.siteId, seller.id))
  const directions = await listDirections(orgId, tx)
  for (const one of made) {
    const direction = directions.find((row) => row.name === one.name)
    if (!direction) throw new Error(`${seller.slug}: no direction «${one.name}»`)
    const named = (slug: string) => {
      const found = shelves.find((row) => row.slug === slug)
      if (!found) throw new Error(`${seller.slug}: no shelf «${slug}» for «${one.name}»`)
      return String(found.id)
    }
    const carried = (name: string) => {
      const found = routes.find((row) => row.name.ru === name)
      if (!found) throw new Error(`${seller.slug}: no route «${name}» for «${one.name}»`)
      return String(found.id)
    }
    await setDirectionLinks(
      orgId,
      direction.id,
      { categories: (one.categories ?? []).map(named), routes: (one.routes ?? []).map(carried) },
      tx,
    )
  }
}
