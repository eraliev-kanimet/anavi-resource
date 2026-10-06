import type { FilterWidget, LocalizedLabel, PropertyKind } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { createGroup } from '@anavi/backend/src/modules/catalog/group.service'
import {
  createProperty,
  createValue,
  findPropertyBySlug,
  listValues,
} from '@anavi/backend/src/modules/catalog/property.service'
import { attachMedia } from '@anavi/backend/src/modules/media/media.service'
import { seedImage } from '../assets'
import {
  createType,
  setTypeProperties,
  setTypeSlots,
  setTypeSummary,
} from '@anavi/backend/src/modules/catalog/type.service'
import { findTypeBySlug } from '@anavi/backend/src/modules/catalog/type.service'
import type { SiteId } from '@anavi/backend/src/db/ids'

// Names, units and groups are the source's own: the point of the transfer is that nothing had to be
// reshaped to fit.
const GROUPS = [
  { slug: 'main', name: { ru: 'Основные', en: 'Main', ar: 'الرئيسية' } },
  { slug: 'cpu', name: { ru: 'Процессор', en: 'CPU', ar: 'المعالج' } },
  { slug: 'series', name: { ru: 'Линейка', en: 'Series', ar: 'السلسلة' } },
  { slug: 'npu', name: { ru: 'Нейропроцессор', en: 'NPU', ar: 'معالج الذكاء الاصطناعي (NPU)' } },
  { slug: 'gpu', name: { ru: 'Видеокарта', en: 'GPU', ar: 'بطاقة الرسومات' } },
  { slug: 'soc', name: { ru: 'Процессор (SoC)', en: 'Processor (SoC)', ar: 'المعالج (SoC)' } },
  { slug: 'display', name: { ru: 'Дисплей', en: 'Display', ar: 'الشاشة' } },
  { slug: 'camera', name: { ru: 'Камера', en: 'Camera', ar: 'الكاميرا' } },
  { slug: 'memory', name: { ru: 'Память', en: 'Memory', ar: 'الذاكرة' } },
  { slug: 'storage', name: { ru: 'Накопитель', en: 'Storage', ar: 'وحدة التخزين' } },
  { slug: 'performance', name: { ru: 'Производительность', en: 'Performance', ar: 'الأداء' } },
  { slug: 'connectivity', name: { ru: 'Подключение', en: 'Connectivity', ar: 'الاتصال' } },
  { slug: 'battery', name: { ru: 'Аккумулятор', en: 'Battery', ar: 'البطارية' } },
  {
    slug: 'design',
    name: { ru: 'Дизайн и размеры', en: 'Design and dimensions', ar: 'التصميم والأبعاد' },
  },
  {
    slug: 'expansion',
    name: { ru: 'Апгрейд и расширение', en: 'Upgrade and expansion', ar: 'الترقية والتوسعة' },
  },
]

interface PropertyDef {
  slug: string
  name: LocalizedLabel
  kind: PropertyKind
  unit?: LocalizedLabel
  group: string
}

// market's `int` and `decimal` are one kind here: precision is a matter of what was written.
const PROPERTIES: PropertyDef[] = [
  {
    slug: 'manufacturer',
    name: { ru: 'Производитель', en: 'Manufacturer', ar: 'الشركة المصنعة' },
    kind: 'enum',
    group: 'main',
  },
  {
    slug: 'os',
    name: { ru: 'Операционная система', en: 'Operating system', ar: 'نظام التشغيل' },
    kind: 'enum',
    group: 'main',
  },
  {
    slug: 'part-code',
    name: {
      ru: 'Артикул производителя',
      en: 'Manufacturer part code',
      ar: 'رمز القطعة من الشركة المصنعة',
    },
    kind: 'text',
    group: 'main',
  },
  {
    slug: 'has-fingerprint',
    name: { ru: 'Сканер отпечатка', en: 'Fingerprint scanner', ar: 'ماسح بصمات الأصابع' },
    kind: 'bool',
    group: 'main',
  },
  {
    slug: 'has-numpad',
    name: { ru: 'Цифровой блок', en: 'Numpad', ar: 'لوحة الأرقام' },
    kind: 'bool',
    group: 'main',
  },
  {
    slug: 'warranty-months',
    name: { ru: 'Гарантия', en: 'Warranty', ar: 'الضمان' },
    kind: 'number',
    unit: { ru: 'мес', en: 'mo', ar: 'شهر' },
    group: 'main',
  },

  {
    slug: 'cpu-vendor',
    name: { ru: 'Производитель CPU', en: 'CPU vendor', ar: 'الشركة المصنعة للمعالج' },
    kind: 'enum',
    group: 'performance',
  },
  {
    slug: 'cpu-series-name',
    name: { ru: 'Линейка CPU', en: 'CPU series', ar: 'سلسلة المعالج' },
    kind: 'text',
    group: 'series',
  },
  {
    slug: 'cpu-series-full',
    name: {
      ru: 'Линейка CPU (поколение)',
      en: 'CPU series (generation)',
      ar: 'سلسلة المعالج (الجيل)',
    },
    kind: 'text',
    group: 'series',
  },
  {
    slug: 'cpu-model',
    name: { ru: 'Модель CPU', en: 'CPU model', ar: 'طراز المعالج' },
    kind: 'text',
    group: 'performance',
  },
  {
    slug: 'cpu-cores',
    name: { ru: 'Ядра', en: 'Cores', ar: 'الأنوية' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'performance',
  },
  {
    slug: 'cpu-threads',
    name: { ru: 'Потоки', en: 'Threads', ar: 'خيوط المعالجة' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'performance',
  },
  {
    slug: 'cpu-base-freq',
    name: { ru: 'Базовая частота', en: 'Base clock', ar: 'التردد الأساسي' },
    kind: 'number',
    unit: { ru: 'МГц', en: 'MHz', ar: 'ميجاهرتز' },
    group: 'performance',
  },
  {
    slug: 'cpu-boost-freq',
    name: { ru: 'Частота Turbo Boost', en: 'Boost clock', ar: 'تردد Turbo Boost' },
    kind: 'number',
    unit: { ru: 'МГц', en: 'MHz', ar: 'ميجاهرتز' },
    group: 'performance',
  },
  {
    slug: 'cpu-perf-cores',
    name: { ru: 'Производительные ядра', en: 'Performance cores', ar: 'أنوية الأداء' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'performance',
  },
  {
    slug: 'cpu-eff-cores',
    name: { ru: 'Энергоэффективные ядра', en: 'Efficient cores', ar: 'أنوية الكفاءة' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'performance',
  },
  {
    slug: 'npu-name',
    name: { ru: 'Название NPU', en: 'NPU name', ar: 'اسم NPU' },
    kind: 'text',
    group: 'npu',
  },
  {
    slug: 'npu-tops',
    name: { ru: 'Производительность NPU', en: 'NPU performance', ar: 'أداء NPU' },
    kind: 'number',
    unit: { ru: 'TOPS', en: 'TOPS', ar: 'TOPS' },
    group: 'npu',
  },

  {
    slug: 'gpu-type',
    name: { ru: 'Тип видеокарты', en: 'GPU type', ar: 'نوع بطاقة الرسومات' },
    kind: 'enum',
    group: 'performance',
  },
  {
    slug: 'gpu-vendor',
    name: { ru: 'Производитель GPU', en: 'GPU vendor', ar: 'الشركة المصنعة لبطاقة الرسومات' },
    kind: 'enum',
    group: 'performance',
  },
  {
    slug: 'gpu-chipset',
    name: { ru: 'Чипсет GPU', en: 'GPU chipset', ar: 'شريحة GPU' },
    kind: 'text',
    group: 'performance',
  },
  {
    slug: 'gpu-vram',
    name: { ru: 'Видеопамять', en: 'VRAM', ar: 'ذاكرة الفيديو' },
    kind: 'number',
    unit: { ru: 'ГБ', en: 'GB', ar: 'جيجابايت' },
    group: 'performance',
  },
  {
    slug: 'gpu-boost-freq',
    name: { ru: 'Boost-частота GPU', en: 'GPU boost clock', ar: 'تردد المعزز لـ GPU' },
    kind: 'number',
    unit: { ru: 'МГц', en: 'MHz', ar: 'ميجاهرتز' },
    group: 'performance',
  },
  {
    slug: 'gpu-max-power',
    name: { ru: 'Энергопотребление GPU', en: 'GPU max power', ar: 'استهلاك الطاقة لـ GPU' },
    kind: 'number',
    unit: { ru: 'Вт', en: 'W', ar: 'واط' },
    group: 'performance',
  },

  {
    slug: 'diagonal',
    name: { ru: 'Диагональ', en: 'Screen size', ar: 'حجم الشاشة' },
    kind: 'number',
    unit: { ru: 'дюйм', en: 'in', ar: 'بوصة' },
    group: 'display',
  },
  {
    slug: 'resolution',
    name: { ru: 'Разрешение', en: 'Resolution', ar: 'دقة الشاشة' },
    kind: 'text',
    group: 'display',
  },
  {
    slug: 'matrix-type',
    name: { ru: 'Тип матрицы', en: 'Display panel type', ar: 'نوع لوحة الشاشة' },
    kind: 'enum',
    group: 'display',
  },
  {
    slug: 'refresh-rate',
    name: { ru: 'Частота обновления', en: 'Refresh rate', ar: 'معدل التحديث' },
    kind: 'number',
    unit: { ru: 'Гц', en: 'Hz', ar: 'هرتز' },
    group: 'display',
  },
  {
    slug: 'brightness',
    name: { ru: 'Яркость', en: 'Brightness', ar: 'السطوع' },
    kind: 'number',
    unit: { ru: 'нит', en: 'nits', ar: 'شمعة' },
    group: 'display',
  },
  {
    slug: 'is-glossy',
    name: { ru: 'Глянцевое покрытие', en: 'Glossy display', ar: 'شاشة لامعة' },
    kind: 'bool',
    group: 'display',
  },
  {
    slug: 'display-peak-brightness',
    name: { ru: 'Пиковая яркость', en: 'Peak brightness', ar: 'ذروة السطوع' },
    kind: 'number',
    unit: { ru: 'нит', en: 'nits', ar: 'شمعة' },
    group: 'display',
  },
  {
    slug: 'display-backlight',
    name: { ru: 'Тип подсветки', en: 'Backlight type', ar: 'نوع الإضاءة الخلفية' },
    kind: 'enum',
    group: 'display',
  },
  {
    slug: 'display-color-gamut',
    name: { ru: 'Цветовой охват', en: 'Color gamut', ar: 'التدرج اللوني' },
    kind: 'text',
    group: 'display',
  },
  {
    slug: 'ppi',
    name: { ru: 'Плотность пикселей', en: 'Pixel density', ar: 'كثافة البكسل' },
    kind: 'number',
    unit: { ru: 'ppi', en: 'ppi', ar: 'ppi' },
    group: 'display',
  },
  {
    slug: 'aspect-ratio',
    name: { ru: 'Соотношение сторон', en: 'Aspect ratio', ar: 'نسبة الارتفاع إلى العرض' },
    kind: 'text',
    group: 'display',
  },

  {
    slug: 'ram-gb',
    name: { ru: 'Объём ОЗУ', en: 'RAM', ar: 'حجم ذاكرة الوصول العشوائي' },
    kind: 'number',
    unit: { ru: 'ГБ', en: 'GB', ar: 'جيجابايت' },
    group: 'memory',
  },
  {
    slug: 'ram-type',
    name: { ru: 'Тип ОЗУ', en: 'RAM type', ar: 'نوع ذاكرة الوصول العشوائي' },
    kind: 'enum',
    group: 'memory',
  },
  {
    slug: 'storage-gb',
    name: { ru: 'Объём накопителя', en: 'Storage', ar: 'سعة التخزين' },
    kind: 'number',
    unit: { ru: 'ГБ', en: 'GB', ar: 'جيجابايت' },
    group: 'memory',
  },
  {
    slug: 'storage-type',
    name: { ru: 'Тип накопителя', en: 'Storage type', ar: 'نوع وحدة التخزين' },
    kind: 'enum',
    group: 'memory',
  },
  {
    slug: 'has-sd-slot',
    name: { ru: 'Слот microSD', en: 'microSD slot', ar: 'منفذ microSD' },
    kind: 'bool',
    group: 'memory',
  },
  {
    slug: 'ram-max-gb',
    name: { ru: 'Максимум ОЗУ', en: 'Max RAM', ar: 'أقصى سعة للذاكرة' },
    kind: 'number',
    unit: { ru: 'ГБ', en: 'GB', ar: 'جيجابايت' },
    group: 'expansion',
  },
  {
    slug: 'ram-slots',
    name: { ru: 'Слотов памяти', en: 'RAM slots', ar: 'منافذ الذاكرة' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'expansion',
  },
  {
    slug: 'storage-slot',
    name: { ru: 'Слот накопителя', en: 'Storage slot', ar: 'منفذ وحدة التخزين' },
    kind: 'text',
    group: 'expansion',
  },

  {
    slug: 'battery-capacity-wh',
    name: { ru: 'Ёмкость', en: 'Capacity', ar: 'السعة' },
    kind: 'number',
    unit: { ru: 'Вт⋅ч', en: 'Wh', ar: 'واط/ساعة' },
    group: 'battery',
  },
  {
    slug: 'battery-capacity-mah',
    name: { ru: 'Ёмкость', en: 'Capacity', ar: 'السعة' },
    kind: 'number',
    unit: { ru: 'мА⋅ч', en: 'mAh', ar: 'مللي أمبير/ساعة' },
    group: 'battery',
  },
  {
    slug: 'battery-type',
    name: { ru: 'Тип аккумулятора', en: 'Battery type', ar: 'نوع البطارية' },
    kind: 'enum',
    group: 'battery',
  },
  {
    slug: 'battery-cells',
    name: { ru: 'Число ячеек', en: 'Battery cells', ar: 'عدد الخلايا' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'battery',
  },
  {
    slug: 'battery-charging-power',
    name: { ru: 'Мощность зарядки', en: 'Charging power', ar: 'قدرة الشحن' },
    kind: 'number',
    unit: { ru: 'Вт', en: 'W', ar: 'واط' },
    group: 'battery',
  },
  {
    slug: 'battery-wireless-power',
    name: { ru: 'Беспроводная зарядка', en: 'Wireless charging power', ar: 'قدرة الشحن اللاسلكي' },
    kind: 'number',
    unit: { ru: 'Вт', en: 'W', ar: 'واط' },
    group: 'battery',
  },
  {
    slug: 'battery-charging-features',
    name: { ru: 'Особенности зарядки', en: 'Charging features', ar: 'ميزات الشحن' },
    kind: 'text',
    group: 'battery',
  },
  {
    slug: 'battery-talk-time',
    name: { ru: 'Время разговора', en: 'Talk time', ar: 'وقت التحدث' },
    kind: 'number',
    unit: { ru: 'ч', en: 'h', ar: 'ساعة' },
    group: 'battery',
  },
  {
    slug: 'battery-audio-time',
    name: { ru: 'Время прослушивания', en: 'Audio playback time', ar: 'وقت تشغيل الصوت' },
    kind: 'number',
    unit: { ru: 'ч', en: 'h', ar: 'ساعة' },
    group: 'battery',
  },

  {
    slug: 'camera-resolution',
    name: { ru: 'Разрешение камеры', en: 'Camera resolution', ar: 'دقة الكاميرا' },
    kind: 'text',
    group: 'camera',
  },
  {
    slug: 'camera-has-shutter',
    name: { ru: 'Шторка камеры', en: 'Privacy shutter', ar: 'غطاء الكاميرا للخصوصية' },
    kind: 'bool',
    group: 'camera',
  },
  {
    slug: 'camera-face-unlock',
    name: { ru: 'Распознавание лица', en: 'Face unlock', ar: 'التعرف على الوجه' },
    kind: 'bool',
    group: 'camera',
  },
  {
    slug: 'cam-rear-count',
    name: { ru: 'Число основных камер', en: 'Rear cameras', ar: 'عدد الكاميرات الخلفية' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'camera',
  },
  {
    slug: 'cam-rear-res',
    name: { ru: 'Разрешение основной', en: 'Rear camera resolution', ar: 'دقة الكاميرا الخلفية' },
    kind: 'text',
    group: 'camera',
  },
  {
    slug: 'cam-rear-lens',
    name: { ru: 'Объективы', en: 'Lenses', ar: 'العدسات' },
    kind: 'text',
    group: 'camera',
  },
  {
    slug: 'cam-rear-zoom',
    name: { ru: 'Зум', en: 'Zoom', ar: 'التقريب' },
    kind: 'text',
    group: 'camera',
  },
  {
    slug: 'cam-rear-video',
    name: { ru: 'Видео', en: 'Video recording', ar: 'تسجيل الفيديو' },
    kind: 'text',
    group: 'camera',
  },
  {
    slug: 'cam-rear-features',
    name: { ru: 'Особенности камеры', en: 'Camera features', ar: 'ميزات الكاميرا' },
    kind: 'text',
    group: 'camera',
  },
  {
    slug: 'cam-front-res',
    name: { ru: 'Фронтальная камера', en: 'Front camera resolution', ar: 'دقة الكاميرا الأمامية' },
    kind: 'text',
    group: 'camera',
  },
  {
    slug: 'cam-front-video',
    name: { ru: 'Видео фронтальной', en: 'Front camera video', ar: 'فيديو الكاميرا الأمامية' },
    kind: 'text',
    group: 'camera',
  },

  {
    slug: 'ports',
    name: { ru: 'Порты', en: 'Ports', ar: 'المنافذ' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'wifi-standard',
    name: { ru: 'Стандарт Wi-Fi', en: 'Wi-Fi standard', ar: 'معيار Wi-Fi' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'bluetooth',
    name: { ru: 'Bluetooth', en: 'Bluetooth', ar: 'بلوتوث' },
    kind: 'text',
    group: 'connectivity',
  },
  {
    slug: 'has-nfc',
    name: { ru: 'NFC', en: 'NFC', ar: 'NFC' },
    kind: 'bool',
    group: 'connectivity',
  },
  {
    slug: 'ethernet',
    name: { ru: 'Ethernet', en: 'Ethernet', ar: 'إيثرنت' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'card-reader',
    name: { ru: 'Картридер', en: 'Card reader', ar: 'قارئ البطاقات' },
    kind: 'text',
    group: 'connectivity',
  },
  {
    slug: 'sim-slots',
    name: { ru: 'Слотов SIM', en: 'SIM slots', ar: 'منافذ SIM' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'connectivity',
  },
  {
    slug: 'sim-type',
    name: { ru: 'Тип SIM', en: 'SIM type', ar: 'نوع SIM' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'charging-port',
    name: { ru: 'Порт зарядки', en: 'Charging port', ar: 'منفذ الشحن' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'network',
    name: { ru: 'Мобильная сеть', en: 'Cellular network', ar: 'شبكة الهاتف المحمول' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'navigation',
    name: { ru: 'Навигация', en: 'Navigation', ar: 'الملاحة' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'sensors',
    name: { ru: 'Датчики', en: 'Sensors', ar: 'المستشعرات' },
    kind: 'enum',
    group: 'connectivity',
  },
  {
    slug: 'has-esim',
    name: { ru: 'eSIM', en: 'eSIM', ar: 'eSIM' },
    kind: 'bool',
    group: 'connectivity',
  },
  {
    slug: 'has-jack',
    name: { ru: 'Разъём 3.5 мм', en: '3.5 mm jack', ar: 'منفذ 3.5 ملم' },
    kind: 'bool',
    group: 'connectivity',
  },
  {
    slug: 'has-fm-radio',
    name: { ru: 'FM-радио', en: 'FM radio', ar: 'راديو FM' },
    kind: 'bool',
    group: 'connectivity',
  },

  {
    slug: 'weight-kg',
    name: { ru: 'Вес', en: 'Weight', ar: 'الوزن' },
    kind: 'number',
    unit: { ru: 'кг', en: 'kg', ar: 'كجم' },
    group: 'design',
  },
  {
    slug: 'thickness-mm',
    name: { ru: 'Толщина', en: 'Thickness', ar: 'السُمك' },
    kind: 'number',
    unit: { ru: 'мм', en: 'mm', ar: 'ملم' },
    group: 'design',
  },
  {
    slug: 'width-mm',
    name: { ru: 'Ширина', en: 'Width', ar: 'العرض' },
    kind: 'number',
    unit: { ru: 'мм', en: 'mm', ar: 'ملم' },
    group: 'design',
  },
  {
    slug: 'depth-mm',
    name: { ru: 'Глубина', en: 'Depth', ar: 'العمق' },
    kind: 'number',
    unit: { ru: 'мм', en: 'mm', ar: 'ملم' },
    group: 'design',
  },
  { slug: 'color', name: { ru: 'Цвет', en: 'Color', ar: 'اللون' }, kind: 'text', group: 'design' },
  {
    slug: 'material',
    name: { ru: 'Материал корпуса', en: 'Body material', ar: 'مادة الهيكل' },
    kind: 'text',
    group: 'design',
  },
  {
    slug: 'has-kbd-backlight',
    name: { ru: 'Подсветка клавиатуры', en: 'Backlit keyboard', ar: 'إضاءة لوحة المفاتيح' },
    kind: 'bool',
    group: 'design',
  },
  {
    slug: 'dimensions',
    name: { ru: 'Габариты', en: 'Dimensions', ar: 'الأبعاد' },
    kind: 'text',
    group: 'design',
  },
  {
    slug: 'has-flashlight',
    name: { ru: 'Вспышка', en: 'Flashlight', ar: 'الفلاش' },
    kind: 'bool',
    group: 'design',
  },
  {
    slug: 'has-face-unlock',
    name: { ru: 'Разблокировка по лицу', en: 'Face unlock', ar: 'فتح القفل بالوجه' },
    kind: 'bool',
    group: 'design',
  },

  {
    slug: 'mobile-os',
    name: { ru: 'Мобильная ОС', en: 'Mobile OS', ar: 'نظام تشغيل الهاتف' },
    kind: 'enum',
    group: 'main',
  },
  { slug: 'model', name: { ru: 'Модель', en: 'Model', ar: 'الطراز' }, kind: 'text', group: 'main' },
  {
    slug: 'ip-rating',
    name: { ru: 'Защита (IP)', en: 'IP rating', ar: 'معيار الحماية (IP)' },
    kind: 'text',
    group: 'main',
  },
  {
    slug: 'destination-country',
    name: { ru: 'Страна-назначение', en: 'Destination country', ar: 'بلد الوجهة' },
    kind: 'text',
    group: 'main',
  },
  {
    slug: 'housing-type',
    name: { ru: 'Тип корпуса', en: 'Form factor', ar: 'نوع الهيكل' },
    kind: 'enum',
    group: 'main',
  },

  {
    slug: 'soc-model',
    name: { ru: 'Модель SoC', en: 'SoC model', ar: 'طراز SoC' },
    kind: 'text',
    group: 'soc',
  },
  {
    slug: 'soc-gpu',
    name: { ru: 'GPU процессора', en: 'Integrated GPU', ar: 'معالج الرسومات المدمج' },
    kind: 'text',
    group: 'soc',
  },
  {
    slug: 'soc-cores',
    name: { ru: 'Ядра SoC', en: 'SoC cores', ar: 'أنوية SoC' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'soc',
  },
  {
    slug: 'soc-base-freq',
    name: { ru: 'Базовая частота SoC', en: 'SoC base clock', ar: 'التردد الأساسي لـ SoC' },
    kind: 'number',
    unit: { ru: 'МГц', en: 'MHz', ar: 'ميجاهرتز' },
    group: 'soc',
  },
  {
    slug: 'soc-max-freq',
    name: { ru: 'Макс. частота SoC', en: 'SoC max clock', ar: 'أقصى تردد لـ SoC' },
    kind: 'number',
    unit: { ru: 'МГц', en: 'MHz', ar: 'ميجاهرتز' },
    group: 'soc',
  },
  {
    slug: 'soc-gpu-cores',
    name: { ru: 'Ядра GPU', en: 'GPU cores', ar: 'أنوية GPU' },
    kind: 'number',
    unit: { ru: 'шт', en: 'pcs', ar: 'قطع' },
    group: 'soc',
  },
]

const VALUES: { property: string; slug: string; label: LocalizedLabel }[] = [
  { property: 'manufacturer', slug: 'apple', label: { ru: 'Apple', en: 'Apple', ar: 'Apple' } },
  { property: 'manufacturer', slug: 'asus', label: { ru: 'ASUS', en: 'ASUS', ar: 'ASUS' } },
  { property: 'manufacturer', slug: 'lenovo', label: { ru: 'Lenovo', en: 'Lenovo', ar: 'Lenovo' } },
  { property: 'manufacturer', slug: 'msi', label: { ru: 'MSI', en: 'MSI', ar: 'MSI' } },
  { property: 'manufacturer', slug: 'xiaomi', label: { ru: 'Xiaomi', en: 'Xiaomi', ar: 'Xiaomi' } },
  { property: 'manufacturer', slug: 'huawei', label: { ru: 'Huawei', en: 'Huawei', ar: 'Huawei' } },
  {
    property: 'manufacturer',
    slug: 'samsung',
    label: { ru: 'Samsung', en: 'Samsung', ar: 'Samsung' },
  },
  { property: 'manufacturer', slug: 'honor', label: { ru: 'Honor', en: 'Honor', ar: 'Honor' } },
  { property: 'manufacturer', slug: 'realme', label: { ru: 'realme', en: 'realme', ar: 'realme' } },
  { property: 'manufacturer', slug: 'tecno', label: { ru: 'Tecno', en: 'Tecno', ar: 'Tecno' } },
  {
    property: 'manufacturer',
    slug: 'infinix',
    label: { ru: 'Infinix', en: 'Infinix', ar: 'Infinix' },
  },
  { property: 'manufacturer', slug: 'poco', label: { ru: 'POCO', en: 'POCO', ar: 'POCO' } },
  { property: 'manufacturer', slug: 'oppo', label: { ru: 'OPPO', en: 'OPPO', ar: 'OPPO' } },
  { property: 'manufacturer', slug: 'vivo', label: { ru: 'vivo', en: 'vivo', ar: 'vivo' } },
  { property: 'manufacturer', slug: 'google', label: { ru: 'Google', en: 'Google', ar: 'Google' } },
  {
    property: 'manufacturer',
    slug: 'nothing',
    label: { ru: 'Nothing', en: 'Nothing', ar: 'Nothing' },
  },
  { property: 'manufacturer', slug: 'zte', label: { ru: 'ZTE', en: 'ZTE', ar: 'ZTE' } },

  {
    property: 'os',
    slug: 'windows-11',
    label: { ru: 'Windows 11', en: 'Windows 11', ar: 'Windows 11' },
  },
  {
    property: 'os',
    slug: 'windows-11s',
    label: { ru: 'Windows 11 S', en: 'Windows 11 S', ar: 'Windows 11 S' },
  },
  {
    property: 'os',
    slug: 'windows-11-pro',
    label: { ru: 'Windows 11 Pro', en: 'Windows 11 Pro', ar: 'Windows 11 Pro' },
  },
  {
    property: 'os',
    slug: 'windows-11-home',
    label: { ru: 'Windows 11 Home', en: 'Windows 11 Home', ar: 'Windows 11 Home' },
  },
  { property: 'os', slug: 'freedos', label: { ru: 'FreeDOS', en: 'FreeDOS', ar: 'FreeDOS' } },
  { property: 'os', slug: 'linux', label: { ru: 'Linux', en: 'Linux', ar: 'Linux' } },
  { property: 'os', slug: 'no-os', label: { ru: 'Без ОС', en: 'No OS', ar: 'بدون نظام تشغيل' } },
  { property: 'os', slug: 'macos', label: { ru: 'macOS', en: 'macOS', ar: 'macOS' } },

  { property: 'cpu-vendor', slug: 'intel', label: { ru: 'Intel', en: 'Intel', ar: 'Intel' } },
  { property: 'cpu-vendor', slug: 'amd', label: { ru: 'AMD', en: 'AMD', ar: 'AMD' } },
  { property: 'cpu-vendor', slug: 'apple', label: { ru: 'Apple', en: 'Apple', ar: 'Apple' } },

  {
    property: 'gpu-type',
    slug: 'integrated',
    label: { ru: 'Интегрированная', en: 'Integrated', ar: 'مدمجة' },
  },
  {
    property: 'gpu-type',
    slug: 'discrete',
    label: { ru: 'Дискретная', en: 'Discrete', ar: 'منفصلة' },
  },

  { property: 'gpu-vendor', slug: 'intel', label: { ru: 'Intel', en: 'Intel', ar: 'Intel' } },
  { property: 'gpu-vendor', slug: 'amd', label: { ru: 'AMD', en: 'AMD', ar: 'AMD' } },
  { property: 'gpu-vendor', slug: 'nvidia', label: { ru: 'NVIDIA', en: 'NVIDIA', ar: 'NVIDIA' } },
  { property: 'gpu-vendor', slug: 'apple', label: { ru: 'Apple', en: 'Apple', ar: 'Apple' } },

  { property: 'matrix-type', slug: 'ips', label: { ru: 'IPS', en: 'IPS', ar: 'IPS' } },
  { property: 'matrix-type', slug: 'oled', label: { ru: 'OLED', en: 'OLED', ar: 'OLED' } },
  { property: 'matrix-type', slug: 'amoled', label: { ru: 'AMOLED', en: 'AMOLED', ar: 'AMOLED' } },
  { property: 'matrix-type', slug: 'va', label: { ru: 'VA', en: 'VA', ar: 'VA' } },
  { property: 'matrix-type', slug: 'tn', label: { ru: 'TN', en: 'TN', ar: 'TN' } },

  { property: 'ram-type', slug: 'ddr4', label: { ru: 'DDR4', en: 'DDR4', ar: 'DDR4' } },
  { property: 'ram-type', slug: 'ddr5', label: { ru: 'DDR5', en: 'DDR5', ar: 'DDR5' } },

  { property: 'storage-type', slug: 'ssd', label: { ru: 'SSD', en: 'SSD', ar: 'SSD' } },
  { property: 'storage-type', slug: 'hdd', label: { ru: 'HDD', en: 'HDD', ar: 'HDD' } },
  {
    property: 'storage-type',
    slug: 'hybrid',
    label: { ru: 'Гибридный', en: 'Hybrid', ar: 'هجين' },
  },

  {
    property: 'ports',
    slug: 'usb-a-2-0',
    label: { ru: 'USB-A 2.0', en: 'USB-A 2.0', ar: 'USB-A 2.0' },
  },
  { property: 'ports', slug: 'usb-c', label: { ru: 'USB-C', en: 'USB-C', ar: 'USB-C' } },
  {
    property: 'ports',
    slug: 'thunderbolt-4',
    label: { ru: 'Thunderbolt 4', en: 'Thunderbolt 4', ar: 'Thunderbolt 4' },
  },
  {
    property: 'ports',
    slug: 'thunderbolt-5',
    label: { ru: 'Thunderbolt 5', en: 'Thunderbolt 5', ar: 'Thunderbolt 5' },
  },
  {
    property: 'ports',
    slug: 'hdmi-2-1',
    label: { ru: 'HDMI 2.1', en: 'HDMI 2.1', ar: 'HDMI 2.1' },
  },
  {
    property: 'ports',
    slug: 'hdmi-1-4',
    label: { ru: 'HDMI 1.4', en: 'HDMI 1.4', ar: 'HDMI 1.4' },
  },
  {
    property: 'ports',
    slug: 'jack-3-5',
    label: { ru: 'Jack 3.5 мм', en: '3.5 mm jack', ar: 'مقبس 3.5 ملم' },
  },
  {
    property: 'ports',
    slug: 'usb-a-3-2-gen2',
    label: { ru: 'USB-A 3.2 Gen2', en: 'USB-A 3.2 Gen2', ar: 'USB-A 3.2 Gen2' },
  },
  {
    property: 'ports',
    slug: 'usb-a-3-2-gen1',
    label: { ru: 'USB-A 3.2 Gen1', en: 'USB-A 3.2 Gen1', ar: 'USB-A 3.2 Gen1' },
  },
  {
    property: 'ports',
    slug: 'usb-c-3-2-gen2',
    label: { ru: 'USB-C 3.2 Gen2', en: 'USB-C 3.2 Gen2', ar: 'USB-C 3.2 Gen2' },
  },
  {
    property: 'ports',
    slug: 'usb-c-3-2-gen1',
    label: { ru: 'USB-C 3.2 Gen1', en: 'USB-C 3.2 Gen1', ar: 'USB-C 3.2 Gen1' },
  },
  { property: 'ports', slug: 'usb-4', label: { ru: 'USB4', en: 'USB4', ar: 'USB4' } },
  { property: 'ports', slug: 'rj45', label: { ru: 'RJ-45', en: 'RJ-45', ar: 'RJ-45' } },

  {
    property: 'wifi-standard',
    slug: 'wifi-4',
    label: { ru: 'Wi-Fi 4 (802.11n)', en: 'Wi-Fi 4 (802.11n)', ar: 'Wi-Fi 4 (802.11n)' },
  },
  {
    property: 'wifi-standard',
    slug: 'wifi-5',
    label: { ru: 'Wi-Fi 5 (802.11ac)', en: 'Wi-Fi 5 (802.11ac)', ar: 'Wi-Fi 5 (802.11ac)' },
  },
  {
    property: 'wifi-standard',
    slug: 'wifi-6',
    label: { ru: 'Wi-Fi 6 (802.11ax)', en: 'Wi-Fi 6 (802.11ax)', ar: 'Wi-Fi 6 (802.11ax)' },
  },
  {
    property: 'wifi-standard',
    slug: 'wifi-6e',
    label: { ru: 'Wi-Fi 6E', en: 'Wi-Fi 6E', ar: 'Wi-Fi 6E' },
  },
  {
    property: 'wifi-standard',
    slug: 'wifi-7',
    label: { ru: 'Wi-Fi 7 (802.11be)', en: 'Wi-Fi 7 (802.11be)', ar: 'Wi-Fi 7 (802.11be)' },
  },

  { property: 'display-backlight', slug: 'led', label: { ru: 'LED', en: 'LED', ar: 'LED' } },
  {
    property: 'display-backlight',
    slug: 'mini-led',
    label: { ru: 'Mini-LED', en: 'Mini-LED', ar: 'Mini-LED' },
  },

  { property: 'battery-type', slug: 'li-ion', label: { ru: 'Li-Ion', en: 'Li-Ion', ar: 'Li-Ion' } },
  { property: 'battery-type', slug: 'li-pol', label: { ru: 'Li-Pol', en: 'Li-Pol', ar: 'Li-Pol' } },

  {
    property: 'ethernet',
    slug: 'gigabit',
    label: { ru: 'Gigabit Ethernet', en: 'Gigabit Ethernet', ar: 'Gigabit Ethernet' },
  },
  {
    property: 'ethernet',
    slug: 'gigabit-2-5',
    label: { ru: '2.5 Gigabit Ethernet', en: '2.5 Gigabit Ethernet', ar: '2.5 Gigabit Ethernet' },
  },

  {
    property: 'mobile-os',
    slug: 'android',
    label: { ru: 'Android', en: 'Android', ar: 'Android' },
  },
  { property: 'mobile-os', slug: 'ios', label: { ru: 'iOS', en: 'iOS', ar: 'iOS' } },

  {
    property: 'housing-type',
    slug: 'monoblock',
    label: { ru: 'Моноблок', en: 'Candy bar', ar: 'قطعة واحدة' },
  },
  {
    property: 'housing-type',
    slug: 'foldable',
    label: { ru: 'Складной', en: 'Foldable', ar: 'قابل للطي' },
  },

  { property: 'sim-type', slug: 'nano', label: { ru: 'nano-SIM', en: 'nano-SIM', ar: 'nano-SIM' } },
  { property: 'sim-type', slug: 'esim', label: { ru: 'eSIM', en: 'eSIM', ar: 'eSIM' } },
  {
    property: 'sim-type',
    slug: 'micro',
    label: { ru: 'micro-SIM', en: 'micro-SIM', ar: 'micro-SIM' },
  },

  { property: 'charging-port', slug: 'usb-c', label: { ru: 'USB-C', en: 'USB-C', ar: 'USB-C' } },
  {
    property: 'charging-port',
    slug: 'lightning',
    label: { ru: 'Lightning', en: 'Lightning', ar: 'Lightning' },
  },
  {
    property: 'charging-port',
    slug: 'micro-usb',
    label: { ru: 'micro-USB', en: 'micro-USB', ar: 'micro-USB' },
  },

  { property: 'network', slug: '2g', label: { ru: '2G', en: '2G', ar: '2G' } },
  { property: 'network', slug: '3g', label: { ru: '3G', en: '3G', ar: '3G' } },
  { property: 'network', slug: '4g', label: { ru: '4G (LTE)', en: '4G (LTE)', ar: '4G (LTE)' } },
  { property: 'network', slug: '5g', label: { ru: '5G', en: '5G', ar: '5G' } },

  { property: 'navigation', slug: 'gps', label: { ru: 'GPS', en: 'GPS', ar: 'GPS' } },
  {
    property: 'navigation',
    slug: 'glonass',
    label: { ru: 'ГЛОНАСС', en: 'GLONASS', ar: 'GLONASS' },
  },
  {
    property: 'navigation',
    slug: 'galileo',
    label: { ru: 'Galileo', en: 'Galileo', ar: 'Galileo' },
  },
  { property: 'navigation', slug: 'beidou', label: { ru: 'BeiDou', en: 'BeiDou', ar: 'BeiDou' } },
  { property: 'navigation', slug: 'qzss', label: { ru: 'QZSS', en: 'QZSS', ar: 'QZSS' } },
  { property: 'navigation', slug: 'navic', label: { ru: 'NavIC', en: 'NavIC', ar: 'NavIC' } },

  {
    property: 'sensors',
    slug: 'accelerometer',
    label: { ru: 'Акселерометр', en: 'Accelerometer', ar: 'مقياس التسارع' },
  },
  { property: 'sensors', slug: 'compass', label: { ru: 'Компас', en: 'Compass', ar: 'بوصلة' } },
  {
    property: 'sensors',
    slug: 'light',
    label: { ru: 'Освещённости', en: 'Ambient light sensor', ar: 'مستشعر الإضاءة المحيطة' },
  },
  {
    property: 'sensors',
    slug: 'proximity',
    label: { ru: 'Приближения', en: 'Proximity sensor', ar: 'مستشعر التقارب' },
  },
  {
    property: 'sensors',
    slug: 'gyroscope',
    label: { ru: 'Гироскоп', en: 'Gyroscope', ar: 'جيروسكوب' },
  },
  {
    property: 'sensors',
    slug: 'hall',
    label: { ru: 'Холла', en: 'Hall sensor', ar: 'مستشعر هول' },
  },
  {
    property: 'sensors',
    slug: 'barometer',
    label: { ru: 'Барометр', en: 'Barometer', ar: 'مقياس الضغط الجوي' },
  },
  { property: 'sensors', slug: 'lidar', label: { ru: 'LiDAR', en: 'LiDAR', ar: 'LiDAR' } },
]

const TYPES = [
  {
    slug: 'laptop',
    name: { ru: 'Ноутбук', en: 'Laptop', ar: 'كمبيوتر محمول' },
    kind: 'product' as const,
  },
  {
    slug: 'phone',
    name: { ru: 'Смартфон', en: 'Smartphone', ar: 'هاتف ذكي' },
    kind: 'product' as const,
  },
  {
    slug: 'laptop-cpu',
    name: { ru: 'Процессор ноутбука', en: 'Laptop processor', ar: 'معالج الكمبيوتر المحمول' },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-cpu-series',
    name: { ru: 'Линейка процессоров', en: 'Processor series', ar: 'سلسلة المعالجات' },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-cpu-npu',
    name: { ru: 'Нейропроцессор', en: 'Neural processing unit', ar: 'وحدة المعالجة العصبية' },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-gpu',
    name: {
      ru: 'Видеокарта ноутбука',
      en: 'Laptop graphics card',
      ar: 'بطاقة رسومات الكمبيوتر المحمول',
    },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-display',
    name: { ru: 'Дисплей ноутбука', en: 'Laptop display', ar: 'شاشة الكمبيوتر المحمول' },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-ram',
    name: { ru: 'Оперативная память', en: 'RAM', ar: 'ذاكرة الوصول العشوائي' },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-storage',
    name: { ru: 'Накопитель ноутбука', en: 'Laptop storage', ar: 'وحدة تخزين الكمبيوتر المحمول' },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-battery',
    name: { ru: 'Аккумулятор ноутбука', en: 'Laptop battery', ar: 'بطارية الكمبيوتر المحمول' },
    kind: 'component' as const,
  },
  {
    slug: 'laptop-camera',
    name: { ru: 'Веб-камера ноутбука', en: 'Laptop webcam', ar: 'كاميرا ويب الكمبيوتر المحمول' },
    kind: 'component' as const,
  },
  {
    slug: 'phone-soc',
    name: { ru: 'Процессор смартфона', en: 'Smartphone SoC', ar: 'معالج الهاتف الذكي (SoC)' },
    kind: 'component' as const,
  },
  {
    slug: 'phone-display',
    name: { ru: 'Дисплей смартфона', en: 'Smartphone display', ar: 'شاشة الهاتف الذكي' },
    kind: 'component' as const,
  },
  {
    slug: 'phone-camera',
    name: { ru: 'Камера смартфона', en: 'Smartphone camera', ar: 'كاميرا الهاتف الذكي' },
    kind: 'component' as const,
  },
  {
    slug: 'phone-battery',
    name: { ru: 'Аккумулятор смартфона', en: 'Smartphone battery', ar: 'بطارية الهاتف الذكي' },
    kind: 'component' as const,
  },
]

interface Binding {
  property: string
  group?: string
  isRequired?: boolean
  isFilterable?: boolean
  filterWidget?: FilterWidget
  isMultivalued?: boolean
  showInCard?: boolean
}

const BINDINGS: Record<string, Binding[]> = {
  'laptop-cpu': [
    { property: 'cpu-vendor', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'cpu-model', showInCard: true },
    { property: 'cpu-cores' },
    { property: 'cpu-threads' },
    { property: 'cpu-base-freq' },
    { property: 'cpu-boost-freq' },
    { property: 'cpu-perf-cores' },
    { property: 'cpu-eff-cores' },
  ],
  'laptop-cpu-series': [
    { property: 'cpu-vendor' },
    { property: 'cpu-series-name' },
    { property: 'cpu-series-full' },
  ],
  'laptop-cpu-npu': [{ property: 'npu-name' }, { property: 'npu-tops' }],
  'laptop-gpu': [
    { property: 'gpu-type', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'gpu-vendor', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'gpu-chipset', showInCard: true },
    { property: 'gpu-vram' },
    { property: 'gpu-boost-freq' },
    { property: 'gpu-max-power' },
  ],
  'laptop-display': [
    { property: 'diagonal', isFilterable: true, filterWidget: 'range', showInCard: true },
    { property: 'resolution' },
    { property: 'matrix-type', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'refresh-rate' },
    { property: 'brightness' },
    { property: 'is-glossy' },
    { property: 'display-peak-brightness' },
    { property: 'display-backlight' },
    { property: 'display-color-gamut' },
  ],
  'laptop-ram': [
    { property: 'ram-gb', isFilterable: true, filterWidget: 'checkbox', showInCard: true },
    { property: 'ram-type' },
  ],
  'laptop-storage': [
    { property: 'storage-gb', isFilterable: true, filterWidget: 'checkbox', showInCard: true },
    { property: 'storage-type' },
  ],
  'laptop-battery': [
    { property: 'battery-capacity-wh', isFilterable: true, filterWidget: 'range' },
    { property: 'battery-type' },
    { property: 'battery-cells' },
  ],
  'laptop-camera': [
    { property: 'camera-resolution' },
    { property: 'camera-has-shutter' },
    { property: 'camera-face-unlock' },
  ],
  'phone-soc': [
    { property: 'soc-model', showInCard: true },
    { property: 'soc-gpu' },
    { property: 'soc-cores' },
    { property: 'soc-base-freq' },
    { property: 'soc-max-freq' },
    { property: 'soc-gpu-cores' },
  ],
  'phone-display': [
    { property: 'diagonal', isFilterable: true, filterWidget: 'range', showInCard: true },
    { property: 'resolution' },
    { property: 'matrix-type', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'refresh-rate', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'ppi' },
    { property: 'aspect-ratio' },
  ],
  'phone-camera': [
    { property: 'cam-rear-count' },
    { property: 'cam-rear-res' },
    { property: 'cam-rear-lens' },
    { property: 'cam-rear-zoom' },
    { property: 'cam-rear-video' },
    { property: 'cam-rear-features' },
    { property: 'cam-front-res' },
    { property: 'cam-front-video' },
  ],
  'phone-battery': [
    { property: 'battery-capacity-mah', showInCard: true },
    { property: 'battery-type' },
    { property: 'battery-charging-power' },
    { property: 'battery-wireless-power' },
    { property: 'battery-charging-features' },
    { property: 'battery-talk-time' },
    { property: 'battery-audio-time' },
  ],
  laptop: [
    {
      property: 'manufacturer',
      group: 'main',
      isRequired: true,
      isFilterable: true,
      filterWidget: 'checkbox',
      showInCard: true,
    },
    { property: 'os', group: 'main', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'part-code', group: 'main' },
    { property: 'has-fingerprint', group: 'main' },
    { property: 'has-numpad', group: 'main' },
    { property: 'warranty-months', group: 'main' },
    { property: 'ram-max-gb', group: 'expansion' },
    { property: 'ram-slots', group: 'expansion' },
    { property: 'storage-slot', group: 'expansion' },
    { property: 'ports', group: 'connectivity', isMultivalued: true },
    { property: 'wifi-standard', group: 'connectivity' },
    { property: 'bluetooth', group: 'connectivity' },
    { property: 'has-nfc', group: 'connectivity' },
    { property: 'ethernet', group: 'connectivity', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'card-reader', group: 'connectivity' },
    { property: 'weight-kg', group: 'design' },
    { property: 'thickness-mm', group: 'design' },
    { property: 'width-mm', group: 'design' },
    { property: 'depth-mm', group: 'design' },
    { property: 'color', group: 'design' },
    { property: 'material', group: 'design' },
    { property: 'has-kbd-backlight', group: 'design' },
  ],
  phone: [
    {
      property: 'manufacturer',
      group: 'main',
      isRequired: true,
      isFilterable: true,
      filterWidget: 'checkbox',
      showInCard: true,
    },
    { property: 'model', group: 'main' },
    {
      property: 'mobile-os',
      group: 'main',
      isRequired: true,
      isFilterable: true,
      filterWidget: 'checkbox',
    },
    { property: 'part-code', group: 'main' },
    { property: 'warranty-months', group: 'main' },
    { property: 'ip-rating', group: 'main', isFilterable: true, filterWidget: 'checkbox' },
    { property: 'destination-country', group: 'main' },
    { property: 'housing-type', group: 'main' },
    {
      property: 'ram-gb',
      group: 'memory',
      isFilterable: true,
      filterWidget: 'checkbox',
      showInCard: true,
    },
    {
      property: 'storage-gb',
      group: 'memory',
      isFilterable: true,
      filterWidget: 'checkbox',
      showInCard: true,
    },
    { property: 'has-sd-slot', group: 'memory' },
    { property: 'wifi-standard', group: 'connectivity' },
    { property: 'bluetooth', group: 'connectivity' },
    {
      property: 'network',
      group: 'connectivity',
      isFilterable: true,
      filterWidget: 'checkbox',
      isMultivalued: true,
    },
    { property: 'navigation', group: 'connectivity', isMultivalued: true },
    { property: 'sensors', group: 'connectivity', isMultivalued: true },
    { property: 'charging-port', group: 'connectivity' },
    { property: 'sim-type', group: 'connectivity' },
    { property: 'sim-slots', group: 'connectivity' },
    { property: 'has-nfc', group: 'connectivity' },
    { property: 'has-esim', group: 'connectivity' },
    { property: 'has-jack', group: 'connectivity' },
    { property: 'has-fm-radio', group: 'connectivity' },
    { property: 'weight-kg', group: 'design' },
    { property: 'color', group: 'design' },
    { property: 'material', group: 'design' },
    { property: 'dimensions', group: 'design' },
    { property: 'has-flashlight', group: 'design' },
    { property: 'has-fingerprint', group: 'design' },
    { property: 'has-face-unlock', group: 'design' },
  ],
}

const SLOTS: Record<
  string,
  { slug: string; name: LocalizedLabel; type: string; group: string; min?: number; max?: number }[]
> = {
  laptop: [
    {
      slug: 'cpu',
      name: { ru: 'Процессор', en: 'Processor', ar: 'المعالج' },
      type: 'laptop-cpu',
      group: 'cpu',
      min: 1,
      max: 1,
    },
    {
      slug: 'gpu',
      name: { ru: 'Видеокарта', en: 'Graphics card', ar: 'بطاقة الرسومات' },
      type: 'laptop-gpu',
      group: 'gpu',
      min: 0,
      max: 1,
    },
    {
      slug: 'display',
      name: { ru: 'Дисплей', en: 'Display', ar: 'الشاشة' },
      type: 'laptop-display',
      group: 'display',
      min: 1,
      max: 1,
    },
    {
      slug: 'ram',
      name: { ru: 'Оперативная память', en: 'RAM', ar: 'ذاكرة الوصول العشوائي' },
      type: 'laptop-ram',
      group: 'memory',
      min: 1,
      max: 2,
    },
    {
      slug: 'storage',
      name: { ru: 'Накопитель', en: 'Storage', ar: 'وحدة التخزين' },
      type: 'laptop-storage',
      group: 'storage',
      min: 1,
      max: 2,
    },
    {
      slug: 'battery',
      name: { ru: 'Аккумулятор', en: 'Battery', ar: 'البطارية' },
      type: 'laptop-battery',
      group: 'battery',
      min: 1,
      max: 1,
    },
    {
      slug: 'camera',
      name: { ru: 'Веб-камера', en: 'Webcam', ar: 'كاميرا ويب' },
      type: 'laptop-camera',
      group: 'camera',
      min: 0,
      max: 1,
    },
  ],
  phone: [
    {
      slug: 'soc',
      name: { ru: 'Процессор', en: 'Processor', ar: 'المعالج' },
      type: 'phone-soc',
      group: 'soc',
      min: 1,
      max: 1,
    },
    {
      slug: 'display',
      name: { ru: 'Дисплей', en: 'Display', ar: 'الشاشة' },
      type: 'phone-display',
      group: 'display',
      min: 1,
      max: 1,
    },
    {
      slug: 'camera',
      name: { ru: 'Камера', en: 'Camera', ar: 'الكاميرا' },
      type: 'phone-camera',
      group: 'camera',
      min: 1,
      max: 1,
    },
    {
      slug: 'battery',
      name: { ru: 'Аккумулятор', en: 'Battery', ar: 'البطارية' },
      type: 'phone-battery',
      group: 'battery',
      min: 1,
      max: 1,
    },
  ],
  // the nested branch: a processor points at its series, and the series at its NPU
  'laptop-cpu': [
    {
      slug: 'series',
      name: { ru: 'Линейка', en: 'Series', ar: 'السلسلة' },
      type: 'laptop-cpu-series',
      group: 'series',
      min: 0,
      max: 1,
    },
    {
      slug: 'npu',
      name: { ru: 'Нейропроцессор', en: 'NPU', ar: 'معالج الذكاء الاصطناعي (NPU)' },
      type: 'laptop-cpu-npu',
      group: 'npu',
      min: 0,
      max: 1,
    },
  ],
}

const SUMMARY: Record<string, LocalizedLabel[]> = {
  laptop: [
    { ru: '{cpu.cpu-model}', en: '{cpu.cpu-model}', ar: '{cpu.cpu-model}' },
    { ru: '{ram.ram-gb} ОЗУ', en: '{ram.ram-gb} RAM', ar: '{ram.ram-gb} رام' },
    {
      ru: '{storage.storage-gb} {storage.storage-type}',
      en: '{storage.storage-gb} {storage.storage-type}',
      ar: '{storage.storage-gb} {storage.storage-type}',
    },
    {
      ru: '{display.diagonal} {display.matrix-type} {display.refresh-rate?}',
      en: '{display.diagonal} {display.matrix-type} {display.refresh-rate?}',
      ar: '{display.diagonal} {display.matrix-type} {display.refresh-rate?}',
    },
    { ru: '{gpu.gpu-chipset?}', en: '{gpu.gpu-chipset?}', ar: '{gpu.gpu-chipset?}' },
  ],
  phone: [
    { ru: '{soc.soc-model}', en: '{soc.soc-model}', ar: '{soc.soc-model}' },
    { ru: '{ram-gb}/{storage-gb}', en: '{ram-gb}/{storage-gb}', ar: '{ram-gb}/{storage-gb}' },
    {
      ru: '{display.diagonal} {display.matrix-type} {display.refresh-rate}',
      en: '{display.diagonal} {display.matrix-type} {display.refresh-rate}',
      ar: '{display.diagonal} {display.matrix-type} {display.refresh-rate}',
    },
    { ru: '{cam-rear-res}', en: '{cam-rear-res}', ar: '{cam-rear-res}' },
    {
      ru: '{battery.battery-capacity-mah}',
      en: '{battery.battery-capacity-mah}',
      ar: '{battery.battery-capacity-mah}',
    },
  ],
}

export async function seedDictionary(siteId: SiteId, tx: Db | Transaction) {
  for (const [index, group] of GROUPS.entries())
    await createGroup(siteId, { slug: group.slug, name: group.name, position: index }, tx)

  for (const [index, property] of PROPERTIES.entries())
    await createProperty(
      siteId,
      {
        slug: property.slug,
        name: property.name,
        kind: property.kind,
        unit: property.unit ?? null,
        group: property.group,
        // a filter is turned on per type, never dictionary-wide
        isFilterable: false,
        position: index,
      },
      tx,
    )

  for (const value of VALUES) {
    const property = (await findPropertyBySlug(siteId, value.property, tx))!
    await createValue(siteId, property.id, { slug: value.slug, label: value.label }, tx)
  }

  for (const [index, type] of TYPES.entries())
    await createType(
      siteId,
      { slug: type.slug, name: type.name, kind: type.kind, position: index },
      tx,
    )

  for (const [slug, bindings] of Object.entries(BINDINGS)) {
    const type = (await findTypeBySlug(siteId, slug, tx))!
    await setTypeProperties(
      siteId,
      type.id,
      {
        properties: bindings.map((binding) => ({
          property: binding.property,
          group: binding.group ?? null,
          isRequired: binding.isRequired ?? false,
          isFilterable: binding.isFilterable ?? false,
          isMultivalued: binding.isMultivalued ?? false,
          showInCard: binding.showInCard ?? false,
          filterWidget: binding.filterWidget ?? null,
        })),
      },
      tx,
    )
  }

  for (const [slug, slots] of Object.entries(SLOTS)) {
    const type = (await findTypeBySlug(siteId, slug, tx))!
    await setTypeSlots(
      siteId,
      type.id,
      {
        slots: slots.map((slot) => ({
          slug: slot.slug,
          name: slot.name,
          componentType: slot.type,
          group: slot.group,
          minCount: slot.min ?? 0,
          maxCount: slot.max ?? 1,
        })),
      },
      tx,
    )
  }

  for (const [slug, segments] of Object.entries(SUMMARY)) {
    const type = (await findTypeBySlug(siteId, slug, tx))!
    await setTypeSummary(
      siteId,
      type.id,
      { segments: segments.map((template) => ({ template })) },
      tx,
    )
  }
}

// Marks hang on the VALUE of the property, not on the goods: one Apple mark serves every iPhone.
// Only the brands whose mark we have get one; the rest print their name.
export async function seedBrandLogos(siteId: SiteId, tx: Db | Transaction) {
  const property = await findPropertyBySlug(siteId, 'manufacturer', tx)
  if (!property) return
  for (const { value } of await listValues(siteId, property.id, tx)) {
    const image = await seedImage(`vega/brands/${value.slug}.webp`).catch(() => null)
    if (!image) continue
    await attachMedia(
      siteId,
      'property_value',
      value.id,
      { key: image.key, width: image.width, height: image.height },
      tx,
    )
  }
}
