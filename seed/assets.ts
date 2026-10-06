import { createHash } from 'node:crypto'
import { audioConfigured, transcodeVoice } from '@anavi/backend/src/lib/audio'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ImageRef } from '@anavi/shared'
import {
  compressImage,
  compressThumbnail,
  thumbKeyOf,
  validateImage,
} from '@anavi/backend/src/lib/images'
import { objectExists, putObject } from '@anavi/backend/src/lib/storage'
import { resourcePath } from './resource'

// Where the library IS lives in `resource.ts`; this module is what to do with a media file taken
// out of it — validate, re-encode, store, remember by hash.
const CACHE_FILE = join(import.meta.dir, '../.seed-cache/assets.json')

// Set when an object was removed from storage by hand, or when the compression settings changed:
// quality lives in the code while the hash is taken from the source.
const FRESH = process.env.SEED_FRESH_ASSETS === '1'

interface CacheEntry {
  key: string
  thumbKey: string
  width: number
  height: number
  size: number
}

type Cache = Record<string, CacheEntry>

let cache: Cache | null = null

async function loadCache(): Promise<Cache> {
  if (cache) return cache
  if (FRESH) {
    cache = {}
    return cache
  }
  const file = Bun.file(CACHE_FILE)
  cache = (await file.exists()) ? ((await file.json()) as Cache) : {}
  return cache
}

async function remember(hash: string, entry: CacheEntry): Promise<void> {
  const current = await loadCache()
  current[hash] = entry
  await mkdir(dirname(CACHE_FILE), { recursive: true })
  await Bun.write(CACHE_FILE, JSON.stringify(current, null, 2))
}

// The manifest caches the RESULT of processing, keyed by the hash of the source: the expensive part
// of a full seed is sharp, not the network. Storage is never asked whether the object exists — that
// is the trade: delete it by hand and the manifest lies until SEED_FRESH_ASSETS=1.
export async function seedImage(relativePath: string, alt?: string): Promise<ImageRef> {
  const bytes = new Uint8Array(await Bun.file(resourcePath(relativePath)).arrayBuffer())
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 32)

  /*
   * Remembered — but only believed while the file is still there.
   *
   * The cache exists so that a reset does not re-compress a thousand photographs, and for a long
   * time it was believed unconditionally: a demo object deleted from storage for any reason was
   * gone for good, because every later reset saw the hash, returned the key and uploaded nothing.
   * The row in the database then pointed at a 404 and the page printed an empty space. One HEAD per
   * picture is what makes `db:reset` able to repair a demo instead of repeating it.
   */
  const cached = (await loadCache())[hash]
  if (cached && (await objectExists(cached.key))) {
    return { key: cached.key, width: cached.width, height: cached.height, alt }
  }

  const validated = await validateImage(new File([bytes], relativePath))
  const processed = await compressImage(validated)
  const key = `demo/${hash}.webp`
  const thumbKey = thumbKeyOf(key)

  await putObject(key, processed.bytes, processed.contentType)
  await putObject(thumbKey, await compressThumbnail(validated), 'image/webp')
  await remember(hash, {
    key,
    thumbKey,
    width: processed.width,
    height: processed.height,
    size: processed.size,
  })

  return { key, width: processed.width, height: processed.height, alt }
}

// `seedImage` refuses a file that is not there, which is wrong while a demo's photographs have not
// arrived yet: the demo comes up, the picture joins it when it exists.
export async function findImage(relativePath: string, alt?: string): Promise<ImageRef | undefined> {
  if (!(await Bun.file(resourcePath(relativePath)).exists())) return undefined
  // Tolerant of ABSENCE only: a file that is there and fails validation still throws, because that is
  // a wrong file dropped in the folder.
  return seedImage(relativePath, alt)
}

// No caching here on purpose: the point is to walk the same road the owner walks, through
// `setOrgLogo`.
export async function assetFile(relativePath: string, mime: string): Promise<File> {
  const bytes = new Uint8Array(await Bun.file(resourcePath(relativePath)).arrayBuffer())
  return new File([bytes], relativePath.split('/').pop() ?? 'asset', { type: mime })
}

export interface SeededFile {
  key: string
  size: number
  mime: string
}

/** Stores a file exactly as it is — a vector logo must not go through an image encoder. */
export async function seedRaw(relativePath: string, mime: string): Promise<SeededFile> {
  return seedFile(relativePath, mime)
}

/** Reads a non-image asset (a datasheet, an audio file) and stores it under a hashed key. */
export async function seedFile(relativePath: string, mime: string): Promise<SeededFile> {
  const bytes = new Uint8Array(await Bun.file(resourcePath(relativePath)).arrayBuffer())
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
  const ext = relativePath.split('.').pop() ?? 'bin'
  const key = `demo/${hash}.${ext}`

  const cached = (await loadCache())[hash]
  if (cached) return { key: cached.key, size: cached.size, mime }

  await putObject(key, bytes, mime)
  await remember(hash, { key, thumbKey: key, width: 0, height: 0, size: bytes.byteLength })
  return { key, size: bytes.byteLength, mime }
}

export interface SeededAudio extends SeededFile {
  durationMs: number | null
  waveform: number[] | null
}

// `ffmpeg` counts the samples and draws the waveform, and it is not on every machine a demo is
// built on. Without it the file still arrives and still plays.
export async function seedAudio(relativePath: string, mime: string): Promise<SeededAudio> {
  const file = await seedFile(relativePath, mime)
  if (!audioConfigured()) return { ...file, durationMs: null, waveform: null }

  try {
    const bytes = new Uint8Array(await Bun.file(resourcePath(relativePath)).arrayBuffer())
    const processed = await transcodeVoice({ bytes, mime })
    return { ...file, durationMs: processed.durationMs, waveform: processed.waveform }
  } catch {
    // measuring failed on a file that is otherwise fine: the recording is worth more than its picture
    return { ...file, durationMs: null, waveform: null }
  }
}
