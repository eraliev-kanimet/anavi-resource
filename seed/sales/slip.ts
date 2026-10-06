import { encodePng } from '@anavi/backend/src/lib/images'

/**
 * The picture a buyer attaches as proof of a transfer, drawn rather than photographed.
 *
 * A payment state exists that no fixture can reach without one — `claimed` is set by attaching a
 * receipt and by nothing else — and the back office has a whole viewer for it. Drawn dot by dot
 * because the SVG renderer sharp ships here has no text at all: shapes come out, letters do not, so
 * a slip built out of `<text>` would arrive as a blank white rectangle.
 *
 * Latin and uppercase, which is what a banking application's confirmation screen looks like anyway.
 */
const GLYPHS: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.###.',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '#####|..#..|..#..|..#..|..#..|..#..|#####',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#...#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#...#|#.#.#|##.##|#...#',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '#####|...#.|..#..|...#.|....#|#...#|.###.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '.....|.....|.....|.....|.....|.##..|.##..',
  ',': '.....|.....|.....|.....|.##..|.##..|.#...',
  ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
  '-': '.....|.....|.....|#####|.....|.....|.....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  ' ': '.....|.....|.....|.....|.....|.....|.....',
}

const CELL_W = 5
const CELL_H = 7
const WIDTH = 520
const HEIGHT = 320

interface Rgb {
  r: number
  g: number
  b: number
}

const PAPER: Rgb = { r: 248, g: 249, b: 251 }
const INK: Rgb = { r: 24, g: 26, b: 32 }
const FAINT: Rgb = { r: 150, g: 156, b: 168 }

class Canvas {
  readonly pixels = new Uint8Array(WIDTH * HEIGHT * 4)

  constructor(background: Rgb) {
    for (let i = 0; i < WIDTH * HEIGHT; i += 1) this.put(i, background)
  }

  private put(index: number, color: Rgb) {
    const at = index * 4
    this.pixels[at] = color.r
    this.pixels[at + 1] = color.g
    this.pixels[at + 2] = color.b
    this.pixels[at + 3] = 255
  }

  rect(x: number, y: number, width: number, height: number, color: Rgb) {
    for (let row = Math.max(0, y); row < Math.min(HEIGHT, y + height); row += 1) {
      for (let column = Math.max(0, x); column < Math.min(WIDTH, x + width); column += 1) {
        this.put(row * WIDTH + column, color)
      }
    }
  }

  text(x: number, y: number, value: string, scale: number, color: Rgb) {
    let cursor = x
    for (const character of value.toUpperCase()) {
      const glyph = GLYPHS[character] ?? GLYPHS[' ']!
      const rows = glyph.split('|')
      for (let row = 0; row < CELL_H; row += 1) {
        for (let column = 0; column < CELL_W; column += 1) {
          if (rows[row]![column] !== '#') continue
          this.rect(cursor + column * scale, y + row * scale, scale, scale, color)
        }
      }
      cursor += (CELL_W + 1) * scale
    }
  }
}

export interface SlipLines {
  /** the name the file arrives under, which is also the caption the library shows */
  name: string
  /** what the confirmation is called at the top of the screen */
  title: string
  /** the sum, set large — the one thing a manager actually reads off a receipt */
  amount: string
  /** the account, the reference, the date */
  rows: readonly string[]
}

export interface SheetLines {
  /** the name the file arrives under, which is also the caption the library shows */
  name: string
  title: string
  rows: readonly string[]
}

/**
 * The other thing people attach to a questionnaire: a photograph of what they want made.
 *
 * The same canvas without the big sum, because a drawing of patterns has no sum to set large. Latin
 * and uppercase for the reason above — the glyph table has no Cyrillic, and a Russian caption would
 * arrive as an empty sheet. The FILE NAME carries the language; what is drawn is a stand-in.
 */
export async function drawSheet(lines: SheetLines): Promise<File> {
  const canvas = new Canvas(PAPER)
  canvas.rect(0, 0, WIDTH, 6, INK)
  canvas.text(40, 46, lines.title, 3, INK)
  canvas.rect(40, 92, WIDTH - 80, 1, FAINT)
  canvas.rect(60, 120, WIDTH - 120, HEIGHT - 220, FAINT)
  canvas.rect(64, 124, WIDTH - 128, HEIGHT - 228, PAPER)
  lines.rows.forEach((row, index) => {
    canvas.text(40, HEIGHT - 84 + index * 30, row, 2, index === 0 ? INK : FAINT)
  })

  const png = await encodePng(canvas.pixels, WIDTH, HEIGHT)
  return new File([png], lines.name, { type: 'image/png' })
}

export async function drawSlip(lines: SlipLines): Promise<File> {
  const canvas = new Canvas(PAPER)
  canvas.rect(0, 0, WIDTH, 6, INK)
  canvas.text(40, 46, lines.title, 3, INK)
  canvas.rect(40, 92, WIDTH - 80, 1, FAINT)
  canvas.text(40, 118, lines.amount, 6, INK)
  lines.rows.forEach((row, index) => {
    canvas.text(40, 200 + index * 30, row, 2, index === 0 ? INK : FAINT)
  })

  const png = await encodePng(canvas.pixels, WIDTH, HEIGHT)
  return new File([png], lines.name, { type: 'image/png' })
}
