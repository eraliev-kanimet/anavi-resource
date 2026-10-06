import type { LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createGroup, createQuestion } from '@anavi/backend/src/modules/qa/qa.service'
import { ru } from './labels'
import type { SiteId } from '@anavi/backend/src/db/ids'

/**
 * A string is single-language text, a map is already keyed by language. The latter is needed by
 * demos with multi-language data: the platform promises multi-language content, and a shared
 * helper that supports only one forces a bilingual site to write its loop all over again.
 */
type Text = string | LocalizedLabel

const label = (value: Text): LocalizedLabel => (typeof value === 'string' ? ru(value) : value)

export interface SeedFaqGroup {
  slug: string
  name: Text
}

export interface SeedFaqItem {
  /** group slug; can be omitted when there is only one group */
  group?: string
  question: Text
  answer: Text
  /** article where the answer directs the reader; no demo sets it today */
  postId?: bigint | null
}

/**
 * Questions and answers. Demos set them up with the exact same loop, differing only in data:
 * one or multiple groups, question, answer paragraph, position.
 *
 * Position is derived from the array order rather than an explicit field: the list is the order,
 * and a second place where it is recorded is a second place where it will drift.
 */
export async function seedQuestions(
  siteId: SiteId,
  groups: readonly SeedFaqGroup[],
  items: readonly SeedFaqItem[],
  tx: Db | Transaction,
): Promise<Map<string, bigint>> {
  const made = new Map<string, bigint>()
  for (const [index, group] of groups.entries()) {
    const row = await createGroup(
      siteId,
      { slug: group.slug, name: label(group.name), position: index },
      tx,
    )
    made.set(group.slug, row.id)
  }

  for (const [index, item] of items.entries())
    await createQuestion(
      siteId,
      {
        // A single group for everything is the common case, no need to name it in every question.
        groupId: made.get(item.group ?? groups[0]!.slug) ?? null,
        question: label(item.question),
        answer: { blocks: [{ type: 'paragraph', data: { text: label(item.answer) } }] },
        ...(item.postId ? { postId: item.postId } : {}),
        position: index,
      },
      tx,
    )

  return made
}
