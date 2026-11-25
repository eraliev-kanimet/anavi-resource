import type { LocalizedLabel } from '@anavi/shared'
import { seedImage } from './assets'
import { ru } from './labels'

type Text = string | LocalizedLabel
const label = (value: Text): LocalizedLabel => (typeof value === 'string' ? ru(value) : value)

export function plainHero(title: Text, subtitle?: Text) {
  return {
    layout: 'plain',
    slides: [{ title: label(title), ...(subtitle ? { subtitle: label(subtitle) } : {}) }],
  }
}

interface SliderImage {
  key: string
  width: number
  height: number
}

/*
 * The slides of a slider with their photographs — every one, or none. The engine refuses a mixture
 * (a slide without a picture leaves the strip above the words standing empty on a phone), and a
 * photograph that has not arrived must not fail the seed: so one missing frame leaves the whole
 * screen to its words until the folder is complete.
 */
export function pictured<T extends object>(
  slides: readonly T[],
  images: readonly (SliderImage | null)[],
) {
  const complete = slides.every((_, index) => images[index])
  return slides.map((slide, index) => {
    const image = images[index]
    return complete && image
      ? { ...slide, image: { key: image.key, width: image.width, height: image.height } }
      : slide
  })
}

export interface SeedShot {
  file: string
  name: Text
}

export async function galleryImages(folder: string, shots: readonly SeedShot[]) {
  const images = []
  for (const shot of shots) {
    const text = typeof shot.name === 'string' ? shot.name : shot.name.ru
    const image = await seedImage(`${folder}/${shot.file}.jpg`, text)
    images.push({ key: image.key, width: image.width, height: image.height, alt: text })
  }
  return images
}
