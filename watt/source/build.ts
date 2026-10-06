import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { GROUP_OF, GROUPS, SECTIONS, SHELVES, type Shelf } from './decisions.ts'
import { at, Translations } from './translations.ts'

/**
 * Step three: turn a heap of `{name, value}` strings into the engine's vocabulary.
 *
 * Nothing here touches the network. The rules below are guesses about language — is «12.5 кг» a
 * number with a unit, is «да» a flag, is «сухая, влажная» a list — and guesses get revised. That is
 * why they read from disk: a wrong threshold costs a re-run of two seconds, not another walk over
 * the source.
 */

/**
 * What the source gave for one product, as it was stored. The crawler that wrote these is gone —
 * there is nothing left to download — so this shape is now a description of `raw/` on disk rather
 * than of anything that runs.
 */
interface Raw {
  shelf: string
  slug: string
  product: Record<string, unknown>
  details: Record<string, unknown>
  shots: string[][]
  photos: string[]
}

const LETTERS: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/**
 * The catalogue is written in Russian and its addresses are not: a property slug is a filter
 * parameter and a template path, and both are read and typed by people who will not switch keyboard
 * layouts to do it. Latin transliteration keeps the source name legible in the slug — `obem-duhovki`
 * is recognisably «Объем духовки», which a hash or a number never would be.
 */
function slugify(value: string, fallback: string): string {
  const latin = [...value.toLowerCase()].map((char) => LETTERS[char] ?? char).join('')
  const slug = latin
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

/** Slugs must be unique within their table, and two different names can transliterate alike. */
function unique(taken: Set<string>, candidate: string): string {
  if (!taken.has(candidate)) {
    taken.add(candidate)
    return candidate
  }
  for (let n = 2; ; n++) {
    const next = `${candidate.slice(0, 45)}-${n}`
    if (!taken.has(next)) {
      taken.add(next)
      return next
    }
  }
}

/** A characteristic present on a quarter of a shelf or less is a hole in the table, not a column. */
const KEEP_FILL = 0.25
/** Beyond this a set of words is prose, not a vocabulary. */
const ENUM_MAX = 15
const ATOM_MAX = 25
/** A filter panel of thirty checkboxes does not help anyone choose. */
const FILTERS_PER_TYPE = 8
const FILTER_FILL = 0.4
/** Dimensions are answered by everything and chosen by nobody; two is already generous. */
const SIZE_FILTERS = 2
/** How alike two shelves' vocabularies must be, on average, for one name to mean one property. */
const VOCABULARY_OVERLAP = 0.25

/**
 * Three places where the source writes one idea two ways, folded by hand because there are exactly
 * three: an automatic rule for Russian adjective endings would be a grammar engine guessing at a
 * catalogue, and it would fold «сухая» into «сухой» the day someone adds a cleaning type.
 */
const SAME_VALUE: Record<string, string> = {
  электронный: 'электронное',
  механический: 'механическое',
  электрический: 'электрическая',
}

/** The source types degrees with a Cyrillic С about half the time, making two units out of one. */
function unitOf(raw: string): string | null {
  const unit = raw.replace(/С/g, 'C').trim()
  return unit || null
}

const YES = new Set(['да', 'есть'])
const NO = new Set(['нет', 'отсутствует'])
const JUNK = /сайт производителя|руководство|инструкц|скачать|штрих|barcode|артикул/i
const NUMBER = /^(?:до\s+|от\s+|~\s*)?(-?\d+(?:[.,]\d+)?)\s*(.*)$/
// «1250-1750 Вт» parses as 1250 with a unit of «-1750 Вт», which then becomes its own unit and its
// own property. A span is not a measurement this catalogue can hold, so it stays a word.
const SPAN = /^[-–—]\s*\d/

type Kind = 'bool' | 'number' | 'enum' | 'multi' | 'text'

interface Row {
  group: string
  name: string
  value: string
}

interface Shape {
  kind: Kind
  unit: string | null
  /** dictionary kinds only, in first-seen order */
  values: string[]
}

interface Trait {
  slug: string
  name: string
  kind: Kind
  unit: string | null
  group: string
  /** which shelves carry it, and how full it is on each */
  fill: Map<string, number>
  values: Map<string, string>
}

function rows(raw: Raw): Row[] {
  const full = (
    raw.details.specifications as
      | { full?: { name: string; list: { name: string; value: unknown }[] }[] }
      | undefined
  )?.full
  if (!Array.isArray(full)) return []
  const out: Row[] = []
  for (const group of full) {
    for (const item of group.list) {
      const name = item.name.trim()
      const value = String(item.value ?? '').trim()
      if (!name || !value || JUNK.test(name)) continue
      out.push({ group: group.name.trim(), name, value: canonical(value) })
    }
  }
  return out
}

function canonical(value: string): string {
  const trimmed = value.trim()
  return SAME_VALUE[trimmed.toLowerCase()] ?? trimmed
}

function atoms(values: Iterable<string>): string[] {
  const out = new Set<string>()
  for (const value of values) for (const atom of value.split(',')) out.add(canonical(atom))
  return [...out].filter((atom) => atom.length > 0)
}

/**
 * What a column of strings turns out to be.
 *
 * Order matters: flags are checked before numbers because a source that omits a row rather than
 * writing «нет» leaves a column of nothing but «да», and lists before enumerations because
 * «сухая, влажная» is two values and not a thirteenth word in the vocabulary.
 */
function shapeOf(seen: string[]): Shape {
  const distinct = [...new Set(seen)]
  const lower = distinct.map((value) => value.toLowerCase())

  if (lower.every((value) => YES.has(value) || NO.has(value))) {
    return { kind: 'bool', unit: null, values: [] }
  }

  const parsed = distinct.map((value) => NUMBER.exec(value))
  if (parsed.every((match) => match !== null)) {
    const units = new Map<string, number>()
    for (const match of parsed) {
      const unit = (match?.[2] ?? '').trim()
      if (SPAN.test(unit)) {
        units.clear()
        break
      }
      units.set(unit, (units.get(unit) ?? 0) + 1)
    }
    const ranked = [...units].sort((a, b) => b[1] - a[1])
    const best = ranked[0]
    // Mixed units are not one column: «315 аВт» and «16000 Па» measure suction two different ways,
    // and averaging them into a range filter would invent a comparison nobody can make.
    if (best && (units.size === 1 || best[1] >= distinct.length * 0.8)) {
      return { kind: 'number', unit: unitOf(best[0]), values: [] }
    }
  }

  const listed = atoms(distinct)
  if (
    distinct.some((value) => value.includes(',')) &&
    listed.length <= ATOM_MAX &&
    listed.every((atom) => atom.length <= 40)
  ) {
    return { kind: 'multi', unit: null, values: listed }
  }

  if (distinct.length <= ENUM_MAX && distinct.every((value) => value.length <= 45)) {
    return { kind: 'enum', unit: null, values: distinct }
  }

  return { kind: 'text', unit: null, values: [] }
}

/**
 * Whether one name means one thing across shelves.
 *
 * «Высота» in centimetres is the same measurement on a kettle and on a refrigerator, and merging it
 * gives the shop one height filter instead of ten. «Тип» is not: a vacuum's type and a washer's
 * type share nothing but the word, and merging them yields a vocabulary of nineteen unrelated
 * options that no filter can present.
 *
 * So the test is compatibility of KIND, not of values — with vocabularies the one exception, since
 * that is exactly where an accidental merge does its damage.
 */
function mergeable(shapes: Shape[]): boolean {
  const kinds = new Set(shapes.map((shape) => shape.kind))
  // Two of these disagreements are not disagreements. A vocabulary written with commas on one shelf
  // and single words on another is one vocabulary — «Цвет» is «чёрный» on a kettle and «чёрный,
  // стальной» on a washing machine. And free text absorbs anything wordy: «Дополнительная
  // информация» is a paragraph on nine shelves and a short phrase on the tenth, and ten separate
  // properties for it buy nothing, since text carries no dictionary to pollute.
  const wordy = new Set(['enum', 'multi', 'text'])
  if (kinds.has('text') && [...kinds].every((kind) => wordy.has(kind))) return true
  if (kinds.has('enum') && kinds.has('multi') && kinds.size === 2) kinds.delete('enum')
  if (kinds.size > 1) return false
  const kind = shapes[0]?.kind
  if (kind === 'number') return new Set(shapes.map((shape) => shape.unit)).size === 1
  if (kind === 'bool' || kind === 'text') return true

  // Averaged, not worst-case. «Цвет» runs from 0.20 between the two most distant shelves to 0.39 on
  // average, and a rule strict enough to reject that pair rejects colour itself — ten «Цвет» entries
  // in one dictionary. «Тип» averages a flat zero and splits, which is the whole point.
  const sets = shapes.map((shape) => new Set(shape.values.map((value) => value.toLowerCase())))
  const scores: number[] = []
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i]
      const b = sets[j]
      if (!a || !b) continue
      const shared = [...a].filter((value) => b.has(value)).length
      scores.push(shared / new Set([...a, ...b]).size)
    }
  }
  const total = scores.reduce((sum, one) => sum + one, 0)
  return scores.length === 0 || total / scores.length >= VOCABULARY_OVERLAP
}

/** Whichever shape holds the most: text over a list, a list over a vocabulary. */
function mergedKind(shapes: Shape[]): Kind {
  if (shapes.some((shape) => shape.kind === 'text')) return 'text'
  if (shapes.some((shape) => shape.kind === 'multi')) return 'multi'
  return shapes[0]?.kind ?? 'text'
}

const dir = import.meta.dir
const RAW = join(dir, 'raw')

/**
 * Where the result goes: next door, in this same repository.
 *
 * It used to write across the border into the code repo through a `ANAVI_DIR` variable, and that
 * crossing was the shape of the mistake the whole move corrected — the raw material lived here and
 * its output lived there. Now the pipeline fits in one place: `raw/` in, `../data/` out, and the
 * seed reads the result from here the same way it reads the photographs beside it.
 */
const OUT = join(dir, '../data')

/**
 * Translations come from `source/translations/` — an INPUT this build reads and only ever adds to.
 * Nothing below reads `../data`, and that is the whole of the protection: a re-run cannot destroy a
 * translation, rather than being merely warned about destroying one. See `translations.ts`.
 */
const say = await Translations.load(join(dir, 'translations'))

const goods: Raw[] = []
for (const file of await readdir(RAW)) {
  if (file.endsWith('.json')) goods.push((await Bun.file(join(RAW, file)).json()) as Raw)
}
const byShelf = new Map<string, Raw[]>()
for (const one of goods) {
  const list = byShelf.get(one.shelf) ?? []
  list.push(one)
  byShelf.set(one.shelf, list)
}

// What each shelf says about each characteristic, before anything is merged.
interface Local {
  shape: Shape
  fill: number
  group: string
}
const local = new Map<string, Map<string, Local>>()
for (const shelf of SHELVES) {
  const here = byShelf.get(shelf.slug) ?? []
  const seen = new Map<string, string[]>()
  const owners = new Map<string, Map<string, number>>()
  const carriers = new Map<string, number>()
  for (const one of here) {
    const own = new Set<string>()
    for (const row of rows(one)) {
      seen.set(row.name, [...(seen.get(row.name) ?? []), row.value])
      const group = GROUP_OF[row.group] ?? 'extra'
      const tally = owners.get(row.name) ?? new Map<string, number>()
      tally.set(group, (tally.get(group) ?? 0) + 1)
      owners.set(row.name, tally)
      if (!own.has(row.name)) {
        own.add(row.name)
        carriers.set(row.name, (carriers.get(row.name) ?? 0) + 1)
      }
    }
  }
  const kept = new Map<string, Local>()
  for (const [name, values] of seen) {
    const fill = (carriers.get(name) ?? 0) / Math.max(1, here.length)
    if (fill < KEEP_FILL) continue
    const tally = [...(owners.get(name) ?? new Map())].sort((a, b) => b[1] - a[1])
    kept.set(name, { shape: shapeOf(values), fill, group: tally[0]?.[0] ?? 'extra' })
  }
  local.set(shelf.slug, kept)
}

// One dictionary for the organization, with a name split in two only when the shelves disagree
// about what it means.
const traits = new Map<string, Trait>()
const slugs = new Set<string>()
const bound = new Map<string, Map<string, string>>()

const names = new Set<string>()
for (const kept of local.values()) for (const name of kept.keys()) names.add(name)

for (const name of names) {
  const holders = SHELVES.filter((shelf) => local.get(shelf.slug)?.has(name))
  const shapes = holders.map((shelf) => local.get(shelf.slug)!.get(name)!.shape)
  const groups = holders.map((shelf) => local.get(shelf.slug)!.get(name)!)
  const together = holders.length === 1 || mergeable(shapes)

  const make = (owners: Shelf[], scoped: boolean) => {
    const first = local.get(owners[0]!.slug)!.get(name)!
    const slug = unique(
      slugs,
      scoped ? `${slugify(owners[0]!.slug, 'x')}-${slugify(name, 'p')}` : slugify(name, 'p'),
    )
    const mine = owners.map((owner) => local.get(owner.slug)!.get(name)!.shape)
    const trait: Trait = {
      slug,
      name,
      kind: mergedKind(mine),
      unit: first.shape.unit,
      group: first.group,
      fill: new Map(),
      values: new Map(),
    }
    for (const owner of owners) {
      const here = local.get(owner.slug)!.get(name)!
      trait.fill.set(owner.slug, here.fill)
      for (const value of here.shape.values) {
        const key = value.toLowerCase()
        if (!trait.values.has(key)) trait.values.set(key, value)
      }
      const map = bound.get(owner.slug) ?? new Map<string, string>()
      map.set(name, slug)
      bound.set(owner.slug, map)
    }
    traits.set(slug, trait)
  }

  if (together) make(holders, false)
  else for (const shelf of holders) make([shelf], true)
  void groups
}

/**
 * A filter is a claim about how people choose, and there is room for eight of them beside a listing.
 * Ranked by how much of the shelf actually carries the characteristic: a column three products in
 * four answer sorts the shelf, one that four in ten answer only shortens it.
 */
function filters(shelf: Shelf): Set<string> {
  const here = bound.get(shelf.slug) ?? new Map<string, string>()
  const wanted = new Set(
    summary(shelf)
      .flatMap((segment) => [...segment.matchAll(/\{([^}?]+)\??\}/g)])
      .map((match) => match[1] ?? ''),
  )

  const able: { slug: string; fill: number; rank: number; size: boolean }[] = []
  for (const slug of here.values()) {
    const trait = traits.get(slug)
    if (!trait) continue
    const fill = trait.fill.get(shelf.slug) ?? 0
    if (fill < FILTER_FILL || trait.kind === 'text') continue
    if ((trait.kind === 'enum' || trait.kind === 'multi') && trait.values.size < 2) continue
    // What the shop prints under a name is its own statement about how this thing is chosen, so it
    // leads. Then vocabularies, then numbers, and flags last: a checkbox for «вращение подставки на
    // 360 градусов» is true of half the shelf and decides nothing.
    const rank = wanted.has(slug)
      ? 0
      : trait.kind === 'enum' || trait.kind === 'multi'
        ? 1
        : trait.kind === 'number'
          ? 2
          : 3
    able.push({ slug, fill, rank, size: trait.group === 'size' })
  }

  able.sort((a, b) => a.rank - b.rank || b.fill - a.fill)
  const chosen = new Set<string>()
  let sizes = 0
  for (const one of able) {
    if (chosen.size >= FILTERS_PER_TYPE) break
    // Height, width, depth and weight are answered by every product and chosen by almost nobody;
    // ranked on fill alone they take half the panel and push out load and spin speed.
    if (one.size && one.rank !== 0) {
      if (sizes >= SIZE_FILTERS) continue
      sizes++
    }
    chosen.add(one.slug)
  }
  return chosen
}

/** `{Объем духовки}` in the plan becomes `{obem-duhovki}` here, once the slug is known. */
function summary(shelf: Shelf): string[] {
  const here = bound.get(shelf.slug) ?? new Map<string, string>()
  return shelf.summary
    .map((segment) =>
      segment.replace(/\{([^}?]+)(\??)\}/g, (whole, name: string, optional: string) => {
        const slug = here.get(name.trim())
        return slug ? `{${slug}${optional}}` : whole
      }),
    )
    .filter((segment) => !/\{[^}]*[А-Яа-яЁё][^}]*\}/.test(segment))
}

function valueOf(trait: Trait, raw: string): unknown {
  if (trait.kind === 'bool') return YES.has(raw.toLowerCase())
  if (trait.kind === 'number') {
    const match = NUMBER.exec(raw)
    const digits = match?.[1]?.replace(',', '.')
    const number = digits ? Number(digits) : Number.NaN
    return Number.isFinite(number) ? number : null
  }
  if (trait.kind === 'enum') return [canonical(raw).toLowerCase()]
  if (trait.kind === 'multi') {
    return raw
      .split(',')
      .map((atom) => canonical(atom).toLowerCase())
      .filter((atom) => atom.length > 0 && trait.values.has(atom))
  }
  return raw
}

/**
 * `multi` is this file's own word, not the engine's. There a property that carries several values is
 * an `enum` whose binding says so — multivaluedness belongs to the pair type–property, because the
 * same vocabulary is one answer on one shelf and several on another.
 */
const dictionary = [...traits.values()].map((trait) => {
  // A dictionary belongs only to a dictionary kind. When shelves disagreed and free text absorbed
  // the property, the vocabulary collected from the other shelves has to go with it — the engine
  // refuses a value on a text property, and rightly: there is nowhere to put it.
  const dictated = trait.values.size > 0 && (trait.kind === 'enum' || trait.kind === 'multi')
  // Value slugs must be unique inside their own property, not across the catalogue — and the slug
  // is settled before the label is asked for, because the slug is half of the label's address.
  const taken = new Set<string>()
  const values = dictated
    ? [...trait.values].map(([key, label]) => {
        const slug = unique(taken, slugify(key, 'v'))
        return { slug, key, label: say.label('properties', at.value(trait.slug, slug), label) }
      })
    : []
  return {
    slug: trait.slug,
    name: say.label('properties', at.name(trait.slug), trait.name),
    kind: trait.kind === 'multi' ? 'enum' : trait.kind,
    ...(trait.unit ? { unit: say.label('properties', at.unit(trait.slug), trait.unit) } : {}),
    group: trait.group,
    ...(dictated ? { values } : {}),
  }
})

const types = SHELVES.map((shelf) => {
  const here = bound.get(shelf.slug) ?? new Map<string, string>()
  const filtered = filters(shelf)
  const segments = summary(shelf)
  const carded = new Set(
    segments
      .flatMap((segment) => [...segment.matchAll(/\{([^}?]+)\??\}/g)])
      .map((match) => match[1] ?? ''),
  )
  // What the caption says, plus what the shelf named on top of it. A name resolving to nothing is a
  // typo in `decisions.ts` and says so out loud: one row quietly missing is the failure nobody sees.
  for (const name of shelf.card) {
    const slug = here.get(name.trim())
    if (slug) carded.add(slug)
    else console.warn(`  ! ${shelf.slug}: свойства «${name}» на полке нет`)
  }
  return {
    slug: shelf.slug,
    name: say.label('types', at.name(shelf.slug), shelf.name),
    section: shelf.section,
    summary: segments.map((segment, index) =>
      say.label('types', at.summary(shelf.slug, index), segment),
    ),
    properties: [...here.values()].map((slug) => {
      const trait = traits.get(slug)!
      const filterable = filtered.has(slug)
      return {
        property: slug,
        group: trait.group,
        ...(filterable
          ? {
              isFilterable: true,
              filterWidget:
                trait.kind === 'number' ? 'range' : trait.kind === 'bool' ? 'boolean' : 'checkbox',
            }
          : {}),
        ...(trait.kind === 'multi' ? { isMultivalued: true } : {}),
        ...(carded.has(slug) ? { showInCard: true } : {}),
      }
    }),
  }
})

const products = goods.map((one) => {
  const here = bound.get(one.shelf) ?? new Map<string, string>()
  const product = one.product as Record<string, unknown>
  // The source's own slug is an address, not a catalogue key, and one of them carries non-breaking
  // spaces. The photographs on disk are named after the original, so the two part company here
  // rather than by renaming files a re-run would recreate.
  const slug = slugify(one.slug, `tovar-${one.product.article}`)
  const price = product.price as { default: number | null; old: number | null }
  const brand = product.brand as { name: string } | null
  const values: Record<string, unknown> = {}
  const texts = new Set<string>()
  for (const row of rows(one)) {
    const property = here.get(row.name)
    if (!property) continue
    const trait = traits.get(property)!
    const value = valueOf(trait, row.value)
    if (value === null || (Array.isArray(value) && value.length === 0)) continue
    values[property] = value
    if (trait.kind === 'text') texts.add(property)
  }
  // Labels are asked for after the loop, not inside it. The source repeats a characteristic across
  // two specification groups of the same card often enough, with different wording each time, and
  // the later row wins; asking per row asks about text that never ships, and the answer comes back
  // as «this translation is stale» about a value nobody will ever see.
  for (const property of texts) {
    values[property] = say.label('products', at.text(slug, property), values[property] as string)
  }
  return {
    shelf: one.shelf,
    slug,
    photo: one.slug,
    name: say.label('products', at.name(slug), (product.name as { full: string }).full),
    sku: product.article as string,
    brand: brand?.name ?? null,
    price: price.default ?? 0,
    old: price.old,
    photos: one.photos.length,
    values,
  }
})

const groups = GROUPS.map((group) => ({
  slug: group.slug,
  name: say.label('groups', at.name(group.slug), group.name),
}))
const sections = SECTIONS.map((section) => ({
  slug: section.slug,
  name: say.label('sections', at.name(section.slug), section.name),
}))

await say.save()

await Bun.write(join(OUT, 'groups.json'), JSON.stringify(groups, null, 1))
await Bun.write(join(OUT, 'sections.json'), JSON.stringify(sections, null, 1))
await Bun.write(join(OUT, 'properties.json'), JSON.stringify(dictionary, null, 1))
await Bun.write(join(OUT, 'types.json'), JSON.stringify(types, null, 1))
await Bun.write(join(OUT, 'products.json'), JSON.stringify(products, null, 1))

const kinds = new Map<Kind, number>()
for (const trait of traits.values()) kinds.set(trait.kind, (kinds.get(trait.kind) ?? 0) + 1)
console.info(`свойств: ${traits.size}`)
console.info(`  ${[...kinds].map(([kind, n]) => `${kind} ${n}`).join(', ')}`)
console.info(
  `товаров: ${products.length}, значений: ${products.reduce((n, p) => n + Object.keys(p.values).length, 0)}`,
)
for (const type of types) {
  const shown = type.properties.filter((p) => p.isFilterable).length
  const card = type.properties.filter((p) => p.showInCard).length
  console.info(
    `  ${type.slug.padEnd(24)} свойств ${String(type.properties.length).padStart(3)}, фильтров ${shown}, подпись ${type.summary.length}, карточка ${card}`,
  )
}

say.report()
