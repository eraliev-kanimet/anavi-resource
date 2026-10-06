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

const read = <T>(name: string): Promise<T> => resourceJson<T>(`vega/data/${name}.json`)

interface PhoneRow {
  code: string
  housing_type: number
  price: number
  phone_manufacturer_id: number
  phone_model_id: number
  phone_destination_country_id?: number | null
  phone_os_id: number
  phone_cpu_id: number
  phone_display_id: number
  phone_wifi_id: number
  phone_bluetooth_id: number
  phone_camera_id: number
  phone_battery_id: number
  phone_protection_level_id?: number | null
  phone_color_id: number
  phone_material_id: number
  charging_port: number
  sim_type: number
  sim_slots: number
  navigation_systems: number[]
  sensors: number[]
  communication_standards: number[]
  ram: number
  storage: number
  has_esim?: boolean
  has_nfc?: boolean
  has_jack?: boolean
  has_flashlight?: boolean
  has_sd_slot?: boolean
  has_fingerprint?: boolean
  has_face_unlock?: boolean
  has_fm_radio?: boolean
  warranty: number
  weight?: number | null
  folded_dimensions?: LocalizedLabel | null
}

interface ContentRow {
  name: LocalizedLabel
  content: LocalizedLabel[]
  images: string[]
}

interface CpuRow {
  name: string
  gpu_name?: string
  core_count: number
  base_clock?: number
  max_clock?: number
  gpu_core_count?: number
}

interface DisplayRow {
  type: number
  diagonal: number
  refresh_rate: number
  ppi: number
  resolution: string
  ratio: string
}

interface CameraRow {
  rear_count: number
  rear_res: LocalizedLabel
  rear_lens?: LocalizedLabel
  rear_zoom?: LocalizedLabel
  rear_video?: LocalizedLabel
  rear_features?: LocalizedLabel
  front_res?: LocalizedLabel
  front_video?: LocalizedLabel
}

interface BatteryRow {
  type?: number | null
  capacity: number
  talk_time?: number | null
  audio_playback_time?: number | null
  charging_power?: number | null
  wireless_charging_power?: number | null
  charging_features?: LocalizedLabel | null
}

// A row whose name the visitor reads is localized; a row whose name is only a key into one of the
// dictionaries below stays a plain string, because nothing ever prints it.
interface LabelRow {
  name: LocalizedLabel
}

interface NamedRow {
  name: string
}

const OS: Record<string, string> = { Android: 'android', iOS: 'ios' }
const MATRIX: Record<number, string> = { 0: 'ips', 1: 'amoled', 2: 'oled' }
const WIFI: Record<string, string> = {
  'Wi-Fi 5 (802.11ac)': 'wifi-5',
  'Wi-Fi 6 (802.11ax)': 'wifi-6',
  'Wi-Fi 6E (802.11ax)': 'wifi-6e',
  'Wi-Fi 7 (802.11be)': 'wifi-7',
}
const NETWORK: Record<string, string> = { '2G': '2g', '3G': '3g', '4G (LTE)': '4g', '5G': '5g' }
const NAVIGATION: Record<string, string> = {
  GPS: 'gps',
  ГЛОНАСС: 'glonass',
  Galileo: 'galileo',
  'BeiDou (BDS)': 'beidou',
  QZSS: 'qzss',
  'NavIC (IRNSS)': 'navic',
}
const SENSORS: Record<string, string> = {
  акселерометр: 'accelerometer',
  компас: 'compass',
  освещенности: 'light',
  приближения: 'proximity',
  гироскоп: 'gyroscope',
  холла: 'hall',
  барометр: 'barometer',
  'сканер LiDAR': 'lidar',
}
const CHARGING_PORT: Record<number, string> = { 0: 'usb-c' }
const SIM_TYPE: Record<number, string> = { 0: 'nano' }

const at = <T>(rows: T[], id: number | null | undefined): T | null =>
  id === null || id === undefined ? null : (rows[id - 1] ?? null)

const pair = (rear: LocalizedLabel, front: LocalizedLabel | undefined): LocalizedLabel => ({
  ru: `${rear.ru} / ${front?.ru ?? '—'}`,
  en: `${rear.en} / ${front?.en ?? '—'}`,
  ar: `${rear.ar ?? rear.ru} / ${front?.ar ?? front?.en ?? '—'}`,
})

export async function seedPhones(siteId: SiteId, categoryId: bigint, tx: Db | Transaction) {
  const [
    phones,
    contents,
    manufacturers,
    models,
    osList,
    cpus,
    displays,
    cameras,
    batteries,
    colors,
    materials,
    wifis,
    bluetooths,
    protections,
    sensors,
    navigation,
    networks,
    countries,
  ] = await Promise.all([
    read<PhoneRow[]>('phones'),
    read<ContentRow[]>('phone-contents'),
    read<NamedRow[]>('phone-manufacturers'),
    read<NamedRow[]>('phone-models'),
    read<NamedRow[]>('phone-os'),
    read<CpuRow[]>('phone-cpus'),
    read<DisplayRow[]>('phone-displays'),
    read<CameraRow[]>('phone-cameras'),
    read<BatteryRow[]>('phone-batteries'),
    read<LabelRow[]>('phone-colors'),
    read<LabelRow[]>('phone-materials'),
    read<NamedRow[]>('phone-wifis'),
    read<{ name: string | number }[]>('phone-bluetooths'),
    read<NamedRow[]>('phone-protection-levels'),
    read<NamedRow[]>('phone-sensors'),
    read<NamedRow[]>('phone_navigation_systems'),
    read<NamedRow[]>('phone_communication_standards'),
    read<LabelRow[]>('countries'),
  ])

  const type = (await findTypeBySlug(siteId, 'phone', tx))!
  const ensure = componentPool(siteId, tx)

  const socNode = async (row: CpuRow) => {
    const v = values()
    v.text('soc-model', row.name)
    v.text('soc-gpu', row.gpu_name)
    v.number('soc-cores', row.core_count)
    v.number('soc-base-freq', row.base_clock)
    v.number('soc-max-freq', row.max_clock)
    v.number('soc-gpu-cores', row.gpu_core_count)
    return ensure('phone-soc', row.name, v.out)
  }

  const displayNode = async (row: DisplayRow) => {
    const v = values()
    v.number('diagonal', row.diagonal)
    v.text('resolution', row.resolution)
    v.option('matrix-type', MATRIX[row.type])
    v.number('refresh-rate', row.refresh_rate)
    v.number('ppi', row.ppi)
    v.text('aspect-ratio', row.ratio)
    return ensure('phone-display', `${row.diagonal}" ${row.resolution}`, v.out)
  }

  const cameraNode = async (row: CameraRow) => {
    const v = values()
    v.number('cam-rear-count', row.rear_count)
    v.text('cam-rear-res', row.rear_res)
    v.text('cam-rear-lens', row.rear_lens)
    v.text('cam-rear-zoom', row.rear_zoom)
    v.text('cam-rear-video', row.rear_video)
    v.text('cam-rear-features', row.rear_features)
    v.text('cam-front-res', row.front_res)
    v.text('cam-front-video', row.front_video)
    return ensure('phone-camera', pair(row.rear_res, row.front_res), v.out)
  }

  const batteryNode = async (row: BatteryRow) => {
    const v = values()
    v.number('battery-capacity-mah', row.capacity)
    if (row.type !== null && row.type !== undefined)
      v.option('battery-type', row.type === 0 ? 'li-ion' : 'li-pol')
    v.number('battery-charging-power', row.charging_power)
    v.number('battery-wireless-power', row.wireless_charging_power)
    v.text('battery-charging-features', row.charging_features)
    v.number('battery-talk-time', row.talk_time)
    v.number('battery-audio-time', row.audio_playback_time)
    return ensure(
      'phone-battery',
      {
        ru: `${row.capacity} мА·ч`,
        en: `${row.capacity} mAh`,
        ar: `${row.capacity} مللي أمبير/ساعة`,
      },
      v.out,
    )
  }

  let count = 0
  for (const [index, row] of phones.entries()) {
    const content = contents[index]
    const cpu = at(cpus, row.phone_cpu_id)
    const display = at(displays, row.phone_display_id)
    const camera = at(cameras, row.phone_camera_id)
    const battery = at(batteries, row.phone_battery_id)
    if (!content || !cpu || !display || !camera || !battery) continue

    const composition = [
      { slot: 'soc', component: await socNode(cpu) },
      { slot: 'display', component: await displayNode(display) },
      { slot: 'camera', component: await cameraNode(camera) },
      { slot: 'battery', component: await batteryNode(battery) },
    ]

    const v = values()
    v.option('manufacturer', at(manufacturers, row.phone_manufacturer_id)?.name.toLowerCase())
    v.text('model', at(models, row.phone_model_id)?.name)
    const os = at(osList, row.phone_os_id)
    v.option('mobile-os', os ? OS[os.name] : null)
    v.text('part-code', row.code)
    v.number('warranty-months', row.warranty)
    v.text('ip-rating', at(protections, row.phone_protection_level_id)?.name)
    v.text('destination-country', at(countries, row.phone_destination_country_id)?.name)
    v.option('housing-type', row.housing_type === 1 ? 'foldable' : 'monoblock')

    v.number('ram-gb', row.ram)
    v.number('storage-gb', row.storage)
    v.bool('has-sd-slot', row.has_sd_slot)

    const wifi = at(wifis, row.phone_wifi_id)
    v.option('wifi-standard', wifi ? WIFI[wifi.name] : null)
    const bluetooth = at(bluetooths, row.phone_bluetooth_id)
    v.text('bluetooth', bluetooth ? String(bluetooth.name) : null)
    for (const id of row.communication_standards) {
      const network = at(networks, id)
      v.option('network', network ? NETWORK[network.name] : null)
    }
    for (const id of row.navigation_systems) {
      const system = at(navigation, id)
      v.option('navigation', system ? NAVIGATION[system.name] : null)
    }
    for (const id of row.sensors) {
      const sensor = at(sensors, id)
      v.option('sensors', sensor ? SENSORS[sensor.name] : null)
    }
    v.option('charging-port', CHARGING_PORT[row.charging_port])
    v.option('sim-type', SIM_TYPE[row.sim_type])
    v.number('sim-slots', row.sim_slots)
    v.bool('has-nfc', row.has_nfc)
    v.bool('has-esim', row.has_esim)
    v.bool('has-jack', row.has_jack)
    v.bool('has-fm-radio', row.has_fm_radio)

    v.number(
      'weight-kg',
      row.weight === null || row.weight === undefined ? null : row.weight / 1000,
    )
    v.text('color', at(colors, row.phone_color_id)?.name)
    v.text('material', at(materials, row.phone_material_id)?.name)
    v.text('dimensions', row.folded_dimensions)
    v.bool('has-flashlight', row.has_flashlight)
    v.bool('has-fingerprint', row.has_fingerprint)
    v.bool('has-face-unlock', row.has_face_unlock)

    const product = await createProduct(
      siteId,
      {
        slug: slugify(`${content.name.ru}-${row.code}`, `phone-${index + 1}`),
        name: content.name,
        type: 'phone',
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
      { sku: row.code, price: row.price * 100, stock: 5 + ((index * 5) % 16), isPrimary: true },
      tx,
    )
    await setComponents(siteId, 'product', product.id, type.id, { components: composition }, tx)

    const base = assetBase(content.name, index + 1)
    for (let n = 1; n <= Math.min(content.images.length, 5); n++) {
      const image = await seedImage(`vega/phones/${base}-${n}.webp`).catch(() => null)
      if (!image) continue
      await attachMedia(
        siteId,
        'product',
        product.id,
        { key: image.key, width: image.width, height: image.height, caption: content.name },
        tx,
      )
    }
    count++
  }
  return count
}
