import type { EditorDoc, LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createComponent } from '@anavi/backend/src/modules/catalog/component.service'
import { setComponents } from '@anavi/backend/src/modules/catalog/link.service'
import type { ProductValueInput } from '@anavi/backend/src/modules/catalog/catalog.schema'
import type { SiteId } from '@anavi/backend/src/db/ids'

// a name that slugs to nothing gets its index instead of a crash
export function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48)
    // trimmed after the cut too: slicing mid-word leaves a dash the slug pattern rejects
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

// The conversion is a one-off run against the mirror in `sss/market`, so the two sides agree by
// this function and nothing else.
export function assetBase(name: LocalizedLabel, index: number): string {
  return `${slugify(name.ru ?? name.en ?? '', 'item')}-${index}`
}

export function paragraphs(texts: readonly LocalizedLabel[]): EditorDoc {
  return {
    blocks: texts.map((text) => ({ type: 'paragraph', data: { text } })),
  }
}

/** Collects the values of one product or node in the two spellings the write API takes. */
export function values() {
  const out: ProductValueInput[] = []
  return {
    out,
    /** A dictionary value by slug; silently skipped when the source had nothing. */
    option(property: string, value: string | null | undefined) {
      if (value) out.push({ property, value })
    },
    number(property: string, value: number | null | undefined) {
      if (value !== null && value !== undefined && Number.isFinite(value))
        out.push({ property, number: value })
    },
    bool(property: string, value: boolean | null | undefined) {
      if (value !== null && value !== undefined) out.push({ property, bool: value })
    },
    // A plain string is a value that reads the same in every language — a model number, a port
    // name, a resolution — so it goes under both locales. Under `ru` alone the English site would
    // quietly fall back to the site's default language instead.
    text(property: string, value: string | LocalizedLabel | null | undefined) {
      if (!value) return
      if (typeof value !== 'string') return void out.push({ property, text: value })
      const trimmed = value.trim()
      if (trimmed) out.push({ property, text: { ru: trimmed, en: trimmed, ar: trimmed } })
    },
  }
}

// Nodes are shared, not copied: the same processor stands in four laptops. Identity is the whole
// content of the node, so two rows describing the same thing collapse into one.
export function componentPool(siteId: SiteId, tx: Db | Transaction) {
  const made = new Map<string, string>()
  const slugs = new Set<string>()

  return async function ensure(
    type: string,
    label: string | LocalizedLabel,
    input: ProductValueInput[],
    components: { slot: string; component: string }[] = [],
  ): Promise<string> {
    const name: LocalizedLabel =
      typeof label === 'string' ? { ru: label, en: label, ar: label } : label
    const key = `${type}|${JSON.stringify(name)}|${JSON.stringify(input)}|${JSON.stringify(components)}`
    const known = made.get(key)
    if (known) return known

    let slug = slugify(`${type}-${name.ru ?? name.en ?? ''}`, `${type}-${made.size + 1}`)
    while (slugs.has(slug)) slug = `${slug}-x`
    slugs.add(slug)

    const row = await createComponent(siteId, { slug, name, type, values: input }, tx)
    if (components.length > 0)
      await setComponents(siteId, 'component', row.id, row.typeId, { components }, tx)
    made.set(key, slug)
    return slug
  }
}
