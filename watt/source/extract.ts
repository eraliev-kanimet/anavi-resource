import { join } from 'node:path'
import { at, type Label, type Sheet } from './translations.ts'

/**
 * Where the translations in `source/translations/` came from, run once.
 *
 * English and Arabic were made against the generator's output and lived inside `data/*.json` for as
 * long as nobody re-ran the build. This lifts all 2121 of them out to the input side, addressing
 * each one exactly the way `build.ts` will ask for it — hence the shared `at` helpers rather than
 * two spellings of the same path. Kept in the repository as the record of that move; it reads
 * `../data` and writes `translations/`, which is the one direction the build itself never takes.
 */

const dir = import.meta.dir
const DATA = join(dir, '../data')
const OUT = join(dir, 'translations')

const read = <T>(name: string): Promise<T> =>
  Bun.file(join(DATA, `${name}.json`)).json() as Promise<T>

const isLabel = (value: unknown): value is Label =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as Record<string, unknown>).ru === 'string'

const sheets = new Map<Sheet, Record<string, Label>>()
function put(sheet: Sheet, address: string, label: unknown) {
  if (!isLabel(label)) return
  const held = sheets.get(sheet) ?? {}
  held[address] = label
  sheets.set(sheet, held)
}

interface Named {
  slug: string
  name: unknown
}
interface Property extends Named {
  unit?: unknown
  values?: { slug: string; label: unknown }[]
}
interface Type extends Named {
  summary: unknown[]
}
interface Product extends Named {
  values: Record<string, unknown>
}

for (const one of await read<Named[]>('sections')) put('sections', at.name(one.slug), one.name)
for (const one of await read<Named[]>('groups')) put('groups', at.name(one.slug), one.name)

for (const one of await read<Property[]>('properties')) {
  put('properties', at.name(one.slug), one.name)
  put('properties', at.unit(one.slug), one.unit)
  for (const value of one.values ?? [])
    put('properties', at.value(one.slug, value.slug), value.label)
}

for (const one of await read<Type[]>('types')) {
  put('types', at.name(one.slug), one.name)
  one.summary.forEach((segment, index) => put('types', at.summary(one.slug, index), segment))
}

for (const one of await read<Product[]>('products')) {
  put('products', at.name(one.slug), one.name)
  for (const [property, value] of Object.entries(one.values)) {
    put('products', at.text(one.slug, property), value)
  }
}

let total = 0
for (const [sheet, body] of sheets) {
  const count = Object.keys(body).length
  total += count
  await Bun.write(join(OUT, `${sheet}.json`), `${JSON.stringify(body, null, 2)}\n`)
  console.info(`${sheet.padEnd(12)} ${count}`)
}
console.info(`всего ${total}`)
