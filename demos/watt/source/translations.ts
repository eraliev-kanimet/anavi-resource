import { join } from 'node:path'

/**
 * Translations are an INPUT of the build, not a layer laid on top of its output.
 *
 * English and Arabic reached this catalogue after the generator had already written it, and they
 * landed inside `data/*.json` — the generator's own output. One re-run would have overwritten two
 * languages in 2121 places and said nothing. The fix is not a merge guarded by a flag: it is that
 * the translations live where `build.ts` never writes, so a re-run CANNOT destroy them. Nothing
 * here ever reads `../data`.
 */

/** locale → text. `ru` is always present: it is the source the translation was made from. */
export type Label = { ru: string } & Record<string, string>

export type Sheet = 'sections' | 'groups' | 'properties' | 'types' | 'products'

const SHEETS: Sheet[] = ['sections', 'groups', 'properties', 'types', 'products']

/**
 * An address is a path inside its own sheet. The segment after the owner names the KIND of slot,
 * and both the generator and `extract.ts` build addresses through these functions rather than by
 * writing the strings twice — a translation is worth nothing if the two sides spell its address
 * differently.
 */
export const at = {
  name: (owner: string) => `${owner}/name`,
  unit: (owner: string) => `${owner}/unit`,
  value: (owner: string, value: string) => `${owner}/value/${value}`,
  summary: (owner: string, index: number) => `${owner}/summary/${index}`,
  text: (owner: string, property: string) => `${owner}/text/${property}`,
}

const kindOf = (address: string) => address.split('/')[1] ?? ''

/** A stub carries the source and nothing else: it marks a slot waiting for a translator. */
const isStub = (entry: Label) => Object.keys(entry).every((locale) => locale === 'ru')

function sorted(entry: Label): Record<string, string> {
  const out: Record<string, string> = {}
  for (const locale of Object.keys(entry).sort()) out[locale] = entry[locale]!
  return out
}

const same = (a: Label, b: Label) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))

interface Stale {
  sheet: Sheet
  address: string
  was: string
  now: string
}

export class Translations {
  private loaded = new Map<Sheet, Map<string, Label>>()
  /** kind + source text → the one entry that text unambiguously translates to, or null if two */
  private byText = new Map<Sheet, Map<string, Label | null>>()
  private order = new Map<Sheet, string[]>()
  private out = new Map<Sheet, Map<string, Label>>()
  private used = new Map<Sheet, Set<string>>()
  private asked = new Map<Sheet, Map<string, string>>()
  private applied = 0
  private moved = 0
  private missing: { sheet: Sheet; address: string; ru: string }[] = []
  private stale: Stale[] = []

  private constructor(private dir: string) {
    for (const sheet of SHEETS) {
      this.loaded.set(sheet, new Map())
      this.byText.set(sheet, new Map())
      this.order.set(sheet, [])
      this.out.set(sheet, new Map())
      this.used.set(sheet, new Set())
      this.asked.set(sheet, new Map())
    }
  }

  static async load(dir: string): Promise<Translations> {
    const self = new Translations(dir)
    for (const sheet of SHEETS) {
      const file = Bun.file(join(dir, `${sheet}.json`))
      if (!(await file.exists())) continue
      const raw = (await file.json()) as Record<string, Label>
      const held = self.loaded.get(sheet)!
      for (const [address, entry] of Object.entries(raw)) {
        if (typeof entry?.ru !== 'string') {
          throw new Error(`${sheet}.json: у записи «${address}» нет русского исходника`)
        }
        held.set(address, entry)
        self.order.get(sheet)!.push(address)
      }
      // Same source text under two addresses is usable as a fallback only while both say the same
      // thing. Thirty-five of this catalogue's 1761 source strings are worded two ways in English,
      // all of them inside long product descriptions; those stay unusable rather than guessed at.
      const seen = self.byText.get(sheet)!
      for (const [address, entry] of held) {
        if (isStub(entry)) continue
        const key = `${kindOf(address)} ${entry.ru}`
        const before = seen.get(key)
        if (before === undefined) seen.set(key, entry)
        else if (before !== null && !same(before, entry)) seen.set(key, null)
      }
    }
    return self
  }

  /**
   * The label to write for one slot.
   *
   * By address first, and only while the stored source still matches what the generator computed —
   * a translation made for other words is not a translation of these. Then by the source text
   * itself among slots of the same kind, which is what carries translations across a slug that
   * changed while its wording did not: renaming a shelf in `decisions.ts` renames every property
   * scoped to it. Neither — the slot goes out with Russian alone.
   */
  label(sheet: Sheet, address: string, ru: string): Label {
    const entry = this.loaded.get(sheet)!.get(address)
    if (entry && entry.ru !== ru) this.stale.push({ sheet, address, was: entry.ru, now: ru })
    const resolved = this.resolve(sheet, address, ru, entry)
    this.claim(sheet, address, ru, entry ?? resolved)
    return resolved
  }

  private resolve(sheet: Sheet, address: string, ru: string, entry: Label | undefined): Label {
    if (entry && entry.ru === ru && !isStub(entry)) {
      this.applied++
      return entry
    }
    const alike = this.byText.get(sheet)!.get(`${kindOf(address)} ${ru}`)
    if (alike) {
      this.applied++
      this.moved++
      return alike
    }
    this.missing.push({ sheet, address, ru })
    return { ru }
  }

  /**
   * One address, one source text — and the build stops if that is ever false.
   *
   * An address is built out of slugs, so two slots colliding on one means two slugs collided, and
   * nothing uniques a product slug. Left alone, one of the two would silently wear the other's
   * translation, which is exactly the failure this whole file exists to make impossible.
   *
   * What gets remembered for writing back is the STORED entry when there is one — verbatim, stale
   * wording and all — and otherwise the label that was actually used. That second half matters: a
   * translation rescued by its source text must be written at its new address, or the next run
   * finds a stub sitting there and the rescue happens exactly once.
   */
  private claim(sheet: Sheet, address: string, ru: string, entry: Label) {
    const before = this.asked.get(sheet)!.get(address)
    if (before !== undefined && before !== ru) {
      throw new Error(
        `${sheet}.json: адрес «${address}» просят дважды с разным исходником — «${cut(before)}» и «${cut(ru)}». Слаги не уникальны.`,
      )
    }
    this.asked.get(sheet)!.set(address, ru)
    this.used.get(sheet)!.add(address)
    const out = this.out.get(sheet)!
    if (!out.has(address)) out.set(address, entry)
  }

  /**
   * Writing back is ADDITIVE and provably so: every address the build asked about keeps whatever
   * was stored under it, untouched, and a slot with no entry at all gains a stub carrying its
   * source so the next translator sees what to fill in. Nothing is ever rewritten or removed — a
   * stale entry keeps its old wording for a human to judge, an entry nobody asked about stays. The
   * assertion below is the guard against a future edit to this function quietly dropping a key.
   */
  async save() {
    for (const sheet of SHEETS) {
      const held = this.loaded.get(sheet)!
      const body: Record<string, Label> = {}
      for (const [address, entry] of this.out.get(sheet)!) body[address] = entry
      for (const address of this.order.get(sheet)!) {
        if (!(address in body)) body[address] = held.get(address)!
      }
      for (const address of held.keys()) {
        if (!(address in body)) throw new Error(`${sheet}.json: запись «${address}» потерялась`)
      }
      const text = `${JSON.stringify(body, null, 2)}\n`
      const path = join(this.dir, `${sheet}.json`)
      const file = Bun.file(path)
      if ((await file.exists()) && (await file.text()) === text) continue
      await Bun.write(path, text)
    }
  }

  report() {
    const unused: string[] = []
    for (const sheet of SHEETS) {
      const seen = this.used.get(sheet)!
      for (const address of this.loaded.get(sheet)!.keys()) {
        if (!seen.has(address)) unused.push(`${sheet}: ${address}`)
      }
    }
    console.info(
      `переводы: применено ${this.applied} (из них перенесено по тексту ${this.moved}), без перевода ${this.missing.length}, устарело ${this.stale.length}, лишних записей ${unused.length}`,
    )
    list(
      'без перевода',
      this.missing.map((one) => `${one.sheet}: ${one.address} — ${cut(one.ru)}`),
    )
    list(
      'устарело — исходник по адресу изменился, запись не тронута, решает человек',
      this.stale.map(
        (one) => `${one.sheet}: ${one.address} — было «${cut(one.was)}», стало «${cut(one.now)}»`,
      ),
    )
    list('лишних записей (адреса больше нет)', unused)
  }
}

const cut = (value: string) => (value.length > 70 ? `${value.slice(0, 69)}…` : value)

function list(title: string, lines: string[]) {
  if (lines.length === 0) return
  console.info(`  ${title}: ${lines.length}`)
  for (const line of lines.slice(0, 20)) console.info(`    ${line}`)
  if (lines.length > 20) console.info(`    … и ещё ${lines.length - 20}`)
}
