import type { EditorDoc, LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import type { SiteId } from '@anavi/backend/src/db/ids'
import {
  createBlock,
  listBlocks,
  reorderBlocks,
  updateBlock,
} from '@anavi/backend/src/modules/content/block.service'
import { updateMenuItem } from '@anavi/backend/src/modules/content/menu.service'
import { updatePage } from '@anavi/backend/src/modules/content/page.service'
import { findPolicyPage, policyLinks } from '@anavi/backend/src/modules/content/policy.service'

/*
 * The policy page every site is born with, written in a demo's own words. A demo never makes its own
 * page or its own link: the platform's stand, and what a business may do with them — rewrite the
 * text, name the page in its own words, put a heading over it — is done through the doors an owner
 * has.
 */
export async function ownPolicy(
  siteId: SiteId,
  input: { content: EditorDoc; title?: LocalizedLabel; hero?: Record<string, unknown> },
  tx: Db | Transaction,
) {
  const page = (await findPolicyPage(siteId, tx))!
  if (input.title) {
    await updatePage(siteId, page.id, { title: input.title }, tx)
    for (const link of await policyLinks(siteId, tx))
      await updateMenuItem(siteId, link.id, { label: input.title }, tx)
  }
  const [body] = await listBlocks(page.id, tx)
  await updateBlock(siteId, page.id, body!.id, { data: { content: input.content } }, tx)
  if (input.hero) {
    const hero = await createBlock(siteId, page.id, { type: 'hero', data: input.hero }, tx)
    await reorderBlocks(siteId, page.id, { ids: [hero.id, body!.id] }, tx)
  }
}
