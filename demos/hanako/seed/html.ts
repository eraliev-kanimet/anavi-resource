import type { EditorDoc } from '@anavi/shared'

type Label = Record<string, string>

// Only for the seed: what a business types in the back office arrives as a document already, and a
// general HTML parser in the domain would be an invitation to paste anything at all. Everything the
// walk does not recognize becomes a paragraph rather than disappearing.
export function htmlToDoc(label: Label): EditorDoc {
  const locales = Object.keys(label)
  const perLocale = new Map<string, ReturnType<typeof parseHtml>>()
  for (const locale of locales) perLocale.set(locale, parseHtml(label[locale] ?? ''))

  // Blocks are matched by position across languages: the translations of one page keep the same
  // structure.
  const length = Math.max(...[...perLocale.values()].map((blocks) => blocks.length))
  const blocks: EditorDoc['blocks'] = []

  for (let index = 0; index < length; index++) {
    const sample = perLocale.get(locales[0]!)![index]
    if (!sample) continue

    if (sample.type === 'list') {
      const items: Label[] = []
      for (let item = 0; item < sample.items.length; item++) {
        const value: Label = {}
        for (const locale of locales) {
          const block = perLocale.get(locale)![index]
          if (block?.type === 'list' && block.items[item]) value[locale] = block.items[item]!
        }
        items.push(value)
      }
      blocks.push({ type: 'list', data: { style: 'unordered', items } })
      continue
    }

    const text: Label = {}
    for (const locale of locales) {
      const block = perLocale.get(locale)![index]
      if (block && block.type !== 'list') text[locale] = block.text
    }
    if (sample.type === 'header') {
      blocks.push({ type: 'header', data: { level: sample.level, text } })
    } else {
      blocks.push({ type: 'paragraph', data: { text } })
    }
  }

  return { blocks }
}

type Parsed =
  | { type: 'paragraph'; text: string }
  | { type: 'header'; level: number; text: string }
  | { type: 'list'; items: string[] }

function parseHtml(html: string): Parsed[] {
  const out: Parsed[] = []
  const pattern = /<(p|h2|h3|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let match = pattern.exec(html)

  while (match) {
    const tag = match[1]!.toLowerCase()
    const inner = match[2] ?? ''
    if (tag === 'ul' || tag === 'ol') {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((li) =>
        clean(li[1] ?? ''),
      )
      if (items.length > 0) out.push({ type: 'list', items })
    } else if (tag === 'h2' || tag === 'h3') {
      out.push({ type: 'header', level: tag === 'h2' ? 2 : 3, text: clean(inner) })
    } else {
      out.push({ type: 'paragraph', text: clean(inner) })
    }
    match = pattern.exec(html)
  }

  return out
}

// Inline markup survives — the storefront renders it — while line breaks and stray spacing do not.
function clean(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
