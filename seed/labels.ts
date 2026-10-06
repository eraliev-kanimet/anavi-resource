import type { EditorDoc } from '@anavi/shared'

/**
 * Two helper functions that were previously copied across fourteen files.
 *
 * Neither is a "utility for the future": both describe the shape the engine requires from every
 * seed. A label is a language map rather than a string, even for a single-language site; a
 * text paragraph is an editor document rather than a string, even for a single paragraph. Fourteen
 * copies of the same pattern meant fourteen places that would eventually diverge.
 */
export const ru = (value: string) => ({ ru: value })

/**
 * A string that is identical across all languages: "0W-20", "4 L", SKU, dimension.
 *
 * Translators have nothing to do here, but the engine does: a property value must be a language map,
 * otherwise the storefront filter will not find it when a visitor browses in the second language.
 * One string under each language key is not duplication; it is the same word read from each locale perspective.
 *
 * The list of locales is passed in rather than hardcoded: Hanako has three, others have two, and a
 * hardcoded pair would be yet another place where the locales list drifts apart from `org.locales`.
 * Hence the factory pattern — locales are named once at the top of the seed, rather than in every
 * line assembling a label.
 */
export const sameIn = (locales: readonly string[]) => (value: string) =>
  Object.fromEntries(locales.map((locale) => [locale, value]))

export function paragraphs(texts: readonly string[]): EditorDoc {
  return { blocks: texts.map((text) => ({ type: 'paragraph', data: { text: ru(text) } })) }
}

/** Same, but the text is already keyed by language: in bilingual demos paragraphs arrive as maps. */
export function paragraphsOf(labels: readonly Record<string, string>[]): EditorDoc {
  return { blocks: labels.map((text) => ({ type: 'paragraph', data: { text } })) }
}
