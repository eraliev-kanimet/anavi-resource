import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Transaction } from '@anavi/backend/src/db'
import { createSkill } from '@anavi/backend/src/modules/ai/skill.service'

/*
 * THE AGENT'S SKILLS THE PLATFORM STARTS WITH — words kept as data (`skills/<key>.md`: a head naming the key, the
 * skill it is a part of, its name and when it applies; then the words themselves, and after a line `<!-- model -->`
 * what the narrow model of the skill's task is told of a thing of that class — the drawing model under «image», the
 * card's readers and writer under «card») and written through the service the
 * platform's own surface writes them by. They are the platform's and no demo's, so they stand before any site does.
 * A skill written at `/admin` lives in the base alone: a reset brings back these and nothing else, so one worth
 * keeping is put here too.
 */
interface Written {
  key: string
  parent: string | null
  name: string
  when: string
  body: string
  words: string | null
}

const MODEL = '\n<!-- model -->\n'

function read(file: string, text: string): Written {
  const found = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text)
  if (!found) throw new Error(`skills/${file} has no head`)
  const head = new Map(
    found[1]!.split('\n').map((line) => {
      const at = line.indexOf(':')
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()] as const
    }),
  )
  const said = (name: string) => {
    const value = head.get(name)
    if (!value) throw new Error(`skills/${file} says no «${name}»`)
    return value
  }
  const [body, words] = found[2]!.split(MODEL)
  return {
    key: said('key'),
    parent: head.get('parent') || null,
    name: said('name'),
    when: said('when'),
    body: body!.trim(),
    words: words?.trim() || null,
  }
}

export async function seedSkills(tx: Transaction) {
  const dir = resolve(import.meta.dir, '../../skills')
  const waiting = await Promise.all(
    readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .sort()
      .map(async (file) => read(file, await Bun.file(resolve(dir, file)).text())),
  )
  // A part is written after what it is a part of, whatever the order of the files.
  const ids = new Map<string, bigint>()
  while (waiting.length > 0) {
    const ready = waiting.findIndex((one) => one.parent === null || ids.has(one.parent))
    if (ready < 0) {
      throw new Error(
        `skills: «${waiting[0]!.key}» is a part of «${waiting[0]!.parent}», which no file writes`,
      )
    }
    const [one] = waiting.splice(ready, 1)
    const skill = await createSkill(
      {
        key: one!.key,
        parentId: one!.parent === null ? null : ids.get(one!.parent)!,
        name: one!.name,
        whenToUse: one!.when,
        body: one!.body,
        words: one!.words,
      },
      tx,
    )
    ids.set(skill.key, skill.id)
  }
}
