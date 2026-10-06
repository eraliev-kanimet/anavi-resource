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

export interface SeedStep {
  file: string
  title: Text
  text: Text
}

export async function imageItems(folder: string, steps: readonly SeedStep[]) {
  const items = []
  for (const step of steps) {
    const titleText = typeof step.title === 'string' ? step.title : step.title.ru
    const image = await seedImage(`${folder}/${step.file}.jpg`, titleText)
    items.push({
      image: { key: image.key, width: image.width, height: image.height },
      title: label(step.title),
      text: label(step.text),
    })
  }
  return items
}
