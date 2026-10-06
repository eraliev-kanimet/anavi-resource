import type { LocalizedLabel } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createProduct } from '@anavi/backend/src/modules/catalog/product.service'
import { createVariant } from '@anavi/backend/src/modules/catalog/variant.service'
import { setComponents } from '@anavi/backend/src/modules/catalog/link.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { findTypeBySlug } from '@anavi/backend/src/modules/catalog/type.service'
import { seedImage } from '../assets'
import { resourceJson } from '../resource'
import { assetBase, componentPool, paragraphs, slugify, values } from './helpers'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { isKept } from './kept'

const read = <T>(name: string): Promise<T> => resourceJson<T>(`vega/data/${name}.json`)

interface LaptopRow {
  code: string
  laptop_manufacturer_id: number
  laptop_cpu_id: number
  laptop_gpu_id?: number | null
  laptop_display_id: number
  laptop_storage_id: number
  laptop_battery_id: number
  laptop_camera_id?: number | null
  laptop_os_id?: number | null
  laptop_card_reader_id?: number | null
  laptop_ethernet_id?: number | null
  laptop_storage_slot_id?: number | null
  wifi_id?: number | null
  bluetooth_id?: number | null
  color_id?: number | null
  material?: number | null
  price: number
  warranty: number
  weight: number
  width: number
  height: number
  depth: number
  ram_type: number
  ram_installed: number
  ram_max?: number | null
  ram_slots?: number | null
  keyboard_backlight?: number | null
  has_fingerprint: boolean
  has_numpad: boolean
  ports: Record<string, number>
}

interface ContentRow {
  name: LocalizedLabel
  content: LocalizedLabel[]
  images: string[]
}

interface CpuRow {
  laptop_cpu_series_id?: number | null
  laptop_cpu_npu_id?: number | null
  name: string
  base_clock: number
  max_clock: number
  core_count: number
  thread_count: number
  performance_cores: number | null
  efficient_cores: number | null
}

interface SeriesRow {
  manufacturer: number
  name: string
  full_name: string
}

interface NpuRow {
  name: string
  performance: number
}

interface GpuRow {
  name: LocalizedLabel
  type: number
  manufacturer: number
  memory?: number
  boost_clock?: number
  max_power?: number
}

interface DisplayRow {
  diagonal: number
  resolution: string
  matrix_type: number
  backlight_type?: number | null
  refresh_rate: number
  screen_brightness?: number | null
  maximum_screen_brightness?: number | null
  color_gamut?: string | null
  screen_surface?: number | null
}

interface StorageRow {
  type: number
  capacity: number
}

interface BatteryRow {
  type: number
  capacity: number
  cells?: number | null
}

interface CameraRow {
  name?: LocalizedLabel | null
  has_shutter: boolean
  has_face_unlock: boolean
}

// A row whose name the visitor reads is localized; a row whose name is only a key into one of the
// dictionaries below stays a plain string, because nothing ever prints it.
interface LabelRow {
  name: LocalizedLabel
}

interface NamedRow {
  name: string
}

// Source codes are numbers, the dictionary is written in words. Both tables come from market and
// stay as they are — renaming them here would only make the transfer harder to check.
const CPU_VENDOR: Record<number, string> = { 0: 'intel', 1: 'amd', 2: 'apple' }
const GPU_VENDOR: Record<number, string> = { 0: 'nvidia', 1: 'amd', 2: 'intel', 3: 'apple' }
const MATRIX: Record<number, string> = { 0: 'ips', 3: 'oled' }
const BACKLIGHT: Record<number, string> = { 1: 'led', 3: 'mini-led' }
const MATERIAL: Record<number, LocalizedLabel> = {
  1: { ru: 'алюминий', en: 'aluminum', ar: 'ألومنيوم' },
}
const OS: Record<string, string> = {
  MacOS: 'macos',
  'Windows 11 Professional': 'windows-11-pro',
  'Windows 11 Home': 'windows-11-home',
  Linux: 'linux',
}
const WIFI: Record<string, string> = {
  '6E (802.11ax)': 'wifi-6e',
  '7 (802.11be)': 'wifi-7',
  '6 (802.11ax)': 'wifi-6',
  '5 (802.11ac)': 'wifi-5',
}
const ETHERNET: Record<string, string> = {
  'Gigabit Ethernet': 'gigabit',
  '2.5 Gigabit Ethernet': 'gigabit-2-5',
}
const PORTS: Record<string, string> = {
  'Thunderbolt 5 (120 Гбит/с)': 'thunderbolt-5',
  'HDMI 2.1': 'hdmi-2-1',
  'Jack 3.5 мм (микрофон/аудио)': 'jack-3-5',
  'USB-A 3.2 Gen2 (10 Гбит/с)': 'usb-a-3-2-gen2',
  'Thunderbolt 4 (40 Гбит/с)': 'thunderbolt-4',
  'RJ-45': 'rj45',
  'USB-C 3.2 Gen2 (10 Гбит/с)': 'usb-c-3-2-gen2',
  'USB-A 3.2 Gen1 (5 Гбит/с)': 'usb-a-3-2-gen1',
  'HDMI 1.4': 'hdmi-1-4',
  'USB-A 2.0 (480 Мбит/с)': 'usb-a-2-0',
  'USB-C 3.2 Gen1 (5 Гбит/с)': 'usb-c-3-2-gen1',
  'USB 4 (40 Гбит/с)': 'usb-4',
  'USB Type-C': 'usb-c',
}

const at = <T>(rows: T[], id: number | null | undefined): T | null =>
  id === null || id === undefined ? null : (rows[id - 1] ?? null)

export async function seedLaptops(siteId: SiteId, categoryId: bigint, tx: Db | Transaction) {
  const [
    laptops,
    contents,
    manufacturers,
    colors,
    cpus,
    cpuSeries,
    gpus,
    displays,
    storages,
    batteries,
    cameras,
    ports,
    osList,
    wifis,
    bluetooths,
    ethernets,
    cardReaders,
    storageSlots,
  ] = await Promise.all([
    read<LaptopRow[]>('laptops'),
    read<ContentRow[]>('laptop_contents'),
    read<NamedRow[]>('laptop_manufacturers'),
    read<LabelRow[]>('colors'),
    read<CpuRow[]>('laptop_cpus'),
    read<{ cpu_series: SeriesRow[]; cpu_npu: NpuRow[] }>('laptop_cpu_series'),
    read<GpuRow[]>('laptop_gpus'),
    read<DisplayRow[]>('laptop_displays'),
    read<StorageRow[]>('laptop_storages'),
    read<BatteryRow[]>('laptop_batteries'),
    read<CameraRow[]>('laptop_cameras'),
    read<NamedRow[]>('laptop_ports'),
    read<NamedRow[]>('laptop_os'),
    read<NamedRow[]>('wifis'),
    read<{ name: string | number }[]>('bluetooths'),
    read<NamedRow[]>('laptop_ethernets'),
    read<NamedRow[]>('laptop_card_readers'),
    read<NamedRow[]>('laptop_storage_slots'),
  ])

  const type = (await findTypeBySlug(siteId, 'laptop', tx))!
  const ensure = componentPool(siteId, tx)

  const seriesNode = async (row: SeriesRow) => {
    const v = values()
    v.option('cpu-vendor', CPU_VENDOR[row.manufacturer])
    v.text('cpu-series-name', row.name)
    v.text('cpu-series-full', row.full_name)
    return ensure('laptop-cpu-series', row.full_name, v.out)
  }

  const npuNode = async (row: NpuRow) => {
    const v = values()
    v.text('npu-name', row.name)
    v.number('npu-tops', row.performance)
    const label = [row.name, row.performance ? `${row.performance} TOPS` : '']
      .filter(Boolean)
      .join(' · ')
    return ensure('laptop-cpu-npu', label, v.out)
  }

  const cpuNode = async (row: CpuRow) => {
    const series = at(cpuSeries.cpu_series, row.laptop_cpu_series_id)
    const npu = at(cpuSeries.cpu_npu, row.laptop_cpu_npu_id)
    const v = values()
    v.option('cpu-vendor', series ? CPU_VENDOR[series.manufacturer] : null)
    v.text('cpu-model', row.name)
    v.number('cpu-cores', row.core_count)
    v.number('cpu-threads', row.thread_count)
    v.number('cpu-base-freq', row.base_clock)
    v.number('cpu-boost-freq', row.max_clock)
    v.number('cpu-perf-cores', row.performance_cores)
    v.number('cpu-eff-cores', row.efficient_cores)

    const nested: { slot: string; component: string }[] = []
    if (series) nested.push({ slot: 'series', component: await seriesNode(series) })
    if (npu) nested.push({ slot: 'npu', component: await npuNode(npu) })
    const label = [series?.full_name, row.name].filter(Boolean).join(' ').trim() || row.name
    return ensure('laptop-cpu', label, v.out, nested)
  }

  const gpuNode = async (row: GpuRow) => {
    const v = values()
    v.option('gpu-type', row.type === 1 ? 'discrete' : 'integrated')
    v.option('gpu-vendor', GPU_VENDOR[row.manufacturer])
    v.text('gpu-chipset', row.name)
    if (row.memory) v.number('gpu-vram', Math.round(row.memory / 1024))
    v.number('gpu-boost-freq', row.boost_clock)
    v.number('gpu-max-power', row.max_power)
    return ensure('laptop-gpu', row.name, v.out)
  }

  const displayNode = async (row: DisplayRow) => {
    const v = values()
    v.number('diagonal', row.diagonal)
    v.text('resolution', row.resolution)
    v.option('matrix-type', MATRIX[row.matrix_type])
    v.number('refresh-rate', row.refresh_rate)
    v.number('brightness', row.screen_brightness)
    v.bool('is-glossy', row.screen_surface === 0)
    v.number('display-peak-brightness', row.maximum_screen_brightness)
    if (row.backlight_type !== null && row.backlight_type !== undefined)
      v.option('display-backlight', BACKLIGHT[row.backlight_type])
    v.text('display-color-gamut', row.color_gamut)
    const matrix = MATRIX[row.matrix_type]?.toUpperCase() ?? ''
    return ensure('laptop-display', `${row.diagonal}" ${row.resolution} ${matrix}`.trim(), v.out)
  }

  const storageNode = async (row: StorageRow) => {
    const v = values()
    v.number('storage-gb', row.capacity)
    v.option('storage-type', row.type === 0 ? 'ssd' : 'hdd')
    return ensure(
      'laptop-storage',
      {
        ru: `${row.capacity} ГБ ${row.type === 0 ? 'SSD' : 'HDD'}`,
        en: `${row.capacity} GB ${row.type === 0 ? 'SSD' : 'HDD'}`,
        ar: `${row.capacity} جيجابايت ${row.type === 0 ? 'SSD' : 'HDD'}`,
      },
      v.out,
    )
  }

  const batteryNode = async (row: BatteryRow) => {
    const v = values()
    v.number('battery-capacity-wh', row.capacity)
    v.option('battery-type', row.type === 1 ? 'li-ion' : 'li-pol')
    v.number('battery-cells', row.cells)
    const kind = row.type === 1 ? 'Li-Ion' : 'Li-Pol'
    return ensure(
      'laptop-battery',
      {
        ru: `${row.capacity} Вт·ч ${kind}`,
        en: `${row.capacity} Wh ${kind}`,
        ar: `${row.capacity} واط/ساعة ${kind}`,
      },
      v.out,
    )
  }

  const cameraNode = async (row: CameraRow) => {
    const v = values()
    v.text('camera-resolution', row.name)
    v.bool('camera-has-shutter', row.has_shutter)
    v.bool('camera-face-unlock', row.has_face_unlock)
    return ensure(
      'laptop-camera',
      row.name ?? { ru: 'веб-камера', en: 'webcam', ar: 'كاميرا ويب' },
      v.out,
    )
  }

  const ramNode = async (row: LaptopRow) => {
    const v = values()
    v.number('ram-gb', row.ram_installed)
    v.option('ram-type', row.ram_type === 1 ? 'ddr5' : 'ddr4')
    const kind = row.ram_type === 1 ? 'DDR5' : 'DDR4'
    return ensure(
      'laptop-ram',
      {
        ru: `${row.ram_installed} ГБ ${kind}`,
        en: `${row.ram_installed} GB ${kind}`,
        ar: `${row.ram_installed} جيجابايت ${kind}`,
      },
      v.out,
    )
  }

  let count = 0
  for (const [index, row] of laptops.entries()) {
    const content = contents[index]
    const cpu = at(cpus, row.laptop_cpu_id)
    const display = at(displays, row.laptop_display_id)
    const storage = at(storages, row.laptop_storage_id)
    const battery = at(batteries, row.laptop_battery_id)
    if (!content || !cpu || !display || !storage || !battery) continue

    const gpu = at(gpus, row.laptop_gpu_id)
    const camera = at(cameras, row.laptop_camera_id)
    const composition = [
      { slot: 'cpu', component: await cpuNode(cpu) },
      { slot: 'display', component: await displayNode(display) },
      { slot: 'ram', component: await ramNode(row) },
      { slot: 'storage', component: await storageNode(storage) },
      { slot: 'battery', component: await batteryNode(battery) },
    ]
    if (gpu) composition.push({ slot: 'gpu', component: await gpuNode(gpu) })
    if (camera) composition.push({ slot: 'camera', component: await cameraNode(camera) })

    const v = values()
    v.option('manufacturer', at(manufacturers, row.laptop_manufacturer_id)?.name.toLowerCase())
    v.text('part-code', row.code)
    const os = at(osList, row.laptop_os_id)
    v.option('os', os ? OS[os.name] : null)
    v.bool('has-fingerprint', row.has_fingerprint)
    v.bool('has-numpad', row.has_numpad)
    v.number('warranty-months', row.warranty)
    v.number('ram-max-gb', row.ram_max)
    v.number('ram-slots', row.ram_slots)
    v.text('storage-slot', at(storageSlots, row.laptop_storage_slot_id)?.name)

    // The source counts ports («three Thunderbolt 5»); a multivalued property carries the set, not the
    // count. The number is the one thing this transfer loses.
    for (const portId of Object.keys(row.ports)) {
      const port = at(ports, Number(portId))
      if (port) v.option('ports', PORTS[port.name])
    }
    const wifi = at(wifis, row.wifi_id)
    v.option('wifi-standard', wifi ? WIFI[wifi.name] : null)
    const bluetooth = at(bluetooths, row.bluetooth_id)
    v.text('bluetooth', bluetooth ? String(bluetooth.name) : null)
    const ethernet = at(ethernets, row.laptop_ethernet_id)
    v.option('ethernet', ethernet ? ETHERNET[ethernet.name] : null)
    v.text('card-reader', at(cardReaders, row.laptop_card_reader_id)?.name)

    v.number('weight-kg', row.weight / 1000)
    v.number('thickness-mm', row.height)
    v.number('width-mm', row.width)
    v.number('depth-mm', row.depth)
    v.text('color', at(colors, row.color_id)?.name)
    if (row.material !== null && row.material !== undefined)
      v.text('material', MATERIAL[row.material])
    v.bool('has-kbd-backlight', row.keyboard_backlight === 1)

    const slug = slugify(`${content.name.ru}-${row.code}`, `laptop-${index + 1}`)
    const product = await createProduct(
      siteId,
      {
        slug,
        name: content.name,
        type: 'laptop',
        categoryId,
        description: paragraphs(content.content),
        values: v.out,
        position: index,
      },
      tx,
    )

    await createVariant(
      siteId,
      product.id,
      {
        sku: row.code,
        price: row.price * 100,
        // Nothing in the showroom for what an operator keeps: see `kept.ts`.
        stock: isKept(slug) ? 0 : 4 + ((index * 7) % 17),
        isPrimary: true,
      },
      tx,
    )
    await setComponents(siteId, 'product', product.id, type.id, { components: composition }, tx)

    const base = assetBase(content.name, index + 1)
    for (let n = 1; n <= Math.min(content.images.length, 5); n++) {
      const image = await seedImage(`vega/laptops/${base}-${n}.webp`).catch(() => null)
      if (!image) continue
      await attachMedia(
        siteId,
        'product',
        product.id,
        {
          key: image.key,
          width: image.width,
          height: image.height,
          caption: content.name,
        },
        tx,
      )
    }
    count++
  }
  return count
}
