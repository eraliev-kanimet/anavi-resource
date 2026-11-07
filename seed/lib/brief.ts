import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { and, eq } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catType } from '@anavi/backend/src/db/schema/cat'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { putBrief } from '@anavi/backend/src/modules/ai/brief.service'
import { createPreset } from '@anavi/backend/src/modules/ai/preset.service'
import type { AiRecipeStep } from '@anavi/shared'

/*
 * WHAT EACH DEMO TELLS THE AGENT ABOUT ITSELF — its own words, kept as data beside its material
 * (`demos/<slug>/brief.json`) and written through the service a person's own words go through. A
 * demo without the file says nothing; a kind the file names that the demo never made fails the
 * reset, because words about a kind nobody keeps are a fixture gone wrong, not a choice.
 */

interface Brief {
  site: { trade?: string; cards?: string }
  kinds?: Record<string, { cards?: string }>
}

export async function seedBrief(slug: string, siteId: SiteId, tx: Db | Transaction) {
  const file = resolve(import.meta.dir, '../../demos', slug, 'brief.json')
  if (!existsSync(file)) return
  const brief = (await Bun.file(file).json()) as Brief
  // The kinds are named by their slugs in the file and by their ids at the door: found first, then
  // written with the site's words in the one call a person's «save» makes.
  const kinds: { id: bigint; cards: string }[] = []
  for (const [kind, words] of Object.entries(brief.kinds ?? {})) {
    const [type] = await tx
      .select({ id: catType.id })
      .from(catType)
      .where(and(eq(catType.siteId, siteId), eq(catType.slug, kind)))
      .limit(1)
    if (!type)
      throw new Error(
        `demos/${slug}/brief.json names the kind «${kind}», which the demo does not make`,
      )
    kinds.push({ id: type.id, cards: words.cards ?? '' })
  }
  await putBrief(siteId, { ...brief.site, kinds }, tx as Transaction)
}

/*
 * HOW EACH DEMO SHOOTS ITS GOODS — its presets (`demos/<slug>/presets.json`), a name and a recipe
 * each (the steps a frame is made by, and whether one photograph gives a second way), written through
 * the service a person's own presets go through, so a recipe the platform's rules refuse fails the
 * seed. A demo without the file has none, and its goods are shot by the platform's recipes.
 */
export async function seedPresets(slug: string, siteId: SiteId, tx: Db | Transaction) {
  const file = resolve(import.meta.dir, '../../demos', slug, 'presets.json')
  if (!existsSync(file)) return
  const presets = (await Bun.file(file).json()) as {
    name: string
    extra: boolean
    steps: AiRecipeStep[]
  }[]
  for (const preset of presets) await createPreset(siteId, preset, tx as Transaction)
}
