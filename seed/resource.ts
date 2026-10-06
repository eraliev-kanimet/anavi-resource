import { join } from 'node:path'

/**
 * Where everything a demo is made of lives — which is one directory up from this file.
 *
 * The seed used to live in the code repository and look for its material in a sibling checkout,
 * through an environment variable for machines laid out differently. Now the seed IS in the
 * library: the photographs, the exported tables of a catalogue, the words of every appeal and the
 * code that walks them through the service layer are one thing in one place, and there is nothing
 * left to point at anything.
 */
export const RESOURCE_DIR = join(import.meta.dir, '..')

export function resourcePath(relativePath: string): string {
  return join(RESOURCE_DIR, relativePath)
}

/**
 * A data file of the library.
 *
 * The cast is the boundary and there is deliberately no schema behind it: the file is the demo's own
 * material, written and re-exported by whoever reads it here, and a parser in between would be a
 * second description of a shape the fixture already is. A missing one is fatal, unlike a missing
 * photograph: a catalogue that half arrived is not a demo.
 */
export async function resourceJson<T>(relativePath: string): Promise<T> {
  const file = Bun.file(resourcePath(relativePath))
  if (!(await file.exists())) {
    throw new Error(`the demo file ${relativePath} is not in the library at ${RESOURCE_DIR}`)
  }
  return (await file.json()) as T
}

/**
 * The same file, when the demo may not have one.
 *
 * The tolerant twin of `resourceJson`, exactly as `findImage` is the tolerant twin of `seedImage`:
 * a demo whose own material has not been written yet is filled by the general script, and that is
 * absence rather than breakage.
 */
export async function findResourceJson<T>(relativePath: string): Promise<T | null> {
  const file = Bun.file(resourcePath(relativePath))
  if (!(await file.exists())) return null
  return (await file.json()) as T
}
