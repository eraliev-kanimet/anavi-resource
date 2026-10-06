/**
 * Every decision a person made about this catalogue, in one place.
 *
 * The rest of the folder is mechanical: `build.ts` reads what the source said and folds it into the
 * engine's vocabulary. What it cannot work out is here — which shelves exist, which parent each
 * belongs to, what a card prints under a name, and which of the source's fifty-eight section titles
 * mean the same thing. Nothing infers these; a machine reading the data would fold a washing drum
 * into the same group as a freezer and be sure it was right.
 *
 * The source these were taken from is no longer walked. `raw/` holds what it gave, and that is the
 * whole of it — see SOURCE.md.
 */

export interface Section {
  slug: string
  name: string
}

export interface Shelf {
  /** address of the leaf category, and the slug of the product type it holds */
  slug: string
  name: string
  /** the parent shelf in the catalogue tree */
  section: string
  /**
   * What is printed under the name on a card, in the source's own words — `build.ts` resolves each
   * to a property slug. Segments, not one sentence: a segment that finds no value drops out whole,
   * so a kettle without a thermostat is a line shorter rather than a sentence with a hole.
   *
   * Which three facts a buyer picks by is a decision about the goods, and no amount of reading the
   * data yields it: capacity and freezing decide a refrigerator, load and spin decide a washer.
   */
  summary: string[]
  /**
   * What stands in «Коротко о товаре» on the product page, beyond what the caption already says.
   *
   * The caption and this list are not the same size and were wrong to be derived from one another.
   * The caption is a line under a name in a grid — five figures is all that fits before it wraps
   * twice. The list is the specification table shortened, and four rows of it under a page holding
   * eighty properties reads as a page that knows nothing about what it sells.
   *
   * Eight rows in total, so these are three or four apiece. Chosen the same way the caption is:
   * what a buyer weighs. No dimensions — height and width are answered by everything and decide
   * nothing, and the filter panel already carries them.
   */
  card: string[]
}

export const SECTIONS: Section[] = [
  { slug: 'krupnaya-tehnika', name: 'Крупная техника' },
  { slug: 'kuhnya', name: 'Кухня' },
  { slug: 'uborka-i-klimat', name: 'Уборка и климат' },
]

export const SHELVES: Shelf[] = [
  {
    slug: 'holodilniki',
    name: 'Холодильники',
    section: 'krupnaya-tehnika',
    summary: [
      '{Общий полезный объем}',
      '{Размораживание холодильной камеры}',
      '{Количество камер} камеры',
      '{Высота}',
      '{Класс энергопотребления?}',
    ],
    card: ['Тип', 'Тип компрессора', 'Уровень шума'],
  },
  {
    slug: 'stiralnye-mashiny',
    name: 'Стиральные машины',
    section: 'krupnaya-tehnika',
    summary: [
      '{Максимальная загрузка белья}',
      '{Максимальная скорость отжима}',
      '{Тип загрузки} загрузка',
      '{Количество программ} программ',
      '{Класс энергопотребления?}',
    ],
    card: ['Конструкция стиральной машины', 'Тип двигателя', 'Установка'],
  },
  {
    slug: 'posudomoechnye-mashiny',
    name: 'Посудомоечные машины',
    section: 'krupnaya-tehnika',
    summary: [
      '{Количество комплектов посуды?}',
      '{Количество программ} программ',
      '{Вид сушки} сушка',
      '{Установка}',
      '{Класс энергопотребления?}',
    ],
    card: ['Уровень шума', 'Защита от протечек', 'Расход воды за цикл', 'Количество корзин'],
  },
  {
    slug: 'plity',
    name: 'Плиты',
    section: 'krupnaya-tehnika',
    summary: [
      '{Тип}',
      '{Всего конфорок} конфорки',
      '{Объем духовки}',
      '{Рабочая поверхность}',
      '{Ширина}',
    ],
    card: ['Класс энергопотребления', 'Очистка духовки', 'Тип управления'],
  },
  {
    slug: 'duhovye-shkafy',
    name: 'Духовые шкафы',
    section: 'kuhnya',
    summary: [
      '{Объем духовки}',
      '{Количество режимов работы} режимов',
      '{Очистка}',
      '{Максимальная температура духового шкафа?}',
      '{Класс энергопотребления?}',
    ],
    card: ['Тип', 'Тип управления', 'Материал камеры'],
  },
  {
    slug: 'mikrovolnovye-pechi',
    name: 'Микроволновые печи',
    section: 'kuhnya',
    summary: [
      '{Внутренний объем}',
      '{Мощность микроволн}',
      '{Тип управления} управление',
      '{Внутреннее покрытие камеры?}',
    ],
    card: [
      'Тип',
      'Потребляемая мощность',
      'Количество режимов работы',
      'Диаметр поворотного столика',
    ],
  },
  {
    slug: 'kofemashiny',
    name: 'Кофеварки и кофемашины',
    section: 'kuhnya',
    summary: [
      '{Тип}',
      '{Используемый кофе} кофе',
      '{Объем резервуара для воды}',
      '{Потребляемая мощность?}',
    ],
    card: ['Установка', 'Материал корпуса', 'Максимальное давление', 'Капучинатор'],
  },
  {
    slug: 'chayniki',
    name: 'Чайники',
    section: 'kuhnya',
    summary: ['{Объем}', '{Мощность}', '{Материал корпуса}', '{Нагревательный элемент?}'],
    card: ['Количество режимов нагрева', 'Фильтр от накипи', 'Открывание крышки', 'Цвет'],
  },
  {
    slug: 'pylesosy',
    name: 'Пылесосы',
    section: 'uborka-i-klimat',
    summary: [
      '{Тип}',
      '{Уборка} уборка',
      '{Пылесборник}',
      '{Мощность всасывания?}',
      '{Время работы от аккумулятора?}',
    ],
    card: ['Источник питания', 'Уровень шума', 'Объем пылесборника'],
  },
  {
    slug: 'konditsionery',
    name: 'Кондиционеры',
    section: 'uborka-i-klimat',
    summary: [
      '{Площадь помещения}',
      '{Мощность в режиме охлаждения}',
      '{Размещение внутреннего блока}',
      '{Максимальный уровень шума внутреннего блока?}',
    ],
    card: [
      'Тип',
      'Класс энергоэффективности',
      'Потребляемая мощность при охлаждении',
      'Тип хладагента',
    ],
  },
]

/**
 * The source names its specification sections freely, and fifty-eight names came back for what is
 * really about a dozen ideas: «Питание» and «Электропитание», «Безопасность» and «Защита и
 * безопасность», four separate words for modes. Left alone they would become fifty-eight groups in
 * the dictionary, and the spec table would read like four different shops.
 *
 * So the names are folded here, by hand. Nothing infers this: only a person knows that a washing
 * drum and a spin cycle are one section of a spec sheet while a freezer and a fridge compartment are
 * two. An unlisted name keeps itself — a new section shows up as itself rather than silently landing
 * in «прочее».
 */
export interface Group {
  slug: string
  name: string
}

export const GROUPS: Group[] = [
  { slug: 'main', name: 'Основное' },
  { slug: 'performance', name: 'Производительность' },
  { slug: 'power', name: 'Питание и энергопотребление' },
  { slug: 'control', name: 'Управление' },
  { slug: 'display', name: 'Дисплей и индикация' },
  { slug: 'modes', name: 'Режимы и программы' },
  { slug: 'safety', name: 'Безопасность' },
  { slug: 'body', name: 'Корпус и материалы' },
  { slug: 'size', name: 'Размеры и вес' },
  { slug: 'kit', name: 'Комплектация' },
  { slug: 'noise', name: 'Шум' },
  { slug: 'filtration', name: 'Фильтрация' },
  { slug: 'chambers', name: 'Камеры и отделения' },
  { slug: 'drum', name: 'Барабан, стирка и сушка' },
  { slug: 'cooking', name: 'Готовка' },
  { slug: 'climate', name: 'Воздух и охлаждение' },
  { slug: 'extra', name: 'Дополнительно' },
]

export const GROUP_OF: Record<string, string> = {
  'Основные характеристики': 'main',
  'Общие характеристики': 'main',

  Производительность: 'performance',
  'Расход воды': 'performance',
  Отжим: 'drum',

  Питание: 'power',
  Электропитание: 'power',
  Энергопотребление: 'power',
  'Мощность и энергопотребление': 'power',

  Управление: 'control',
  Таймер: 'control',
  'Комфорт использования': 'control',

  Дисплей: 'display',
  Индикация: 'display',
  Освещение: 'display',

  'Режимы работы': 'modes',
  'Режим работы': 'modes',
  'Основные режимы': 'modes',
  Функции: 'modes',
  'Функции и возможности': 'modes',
  'Функции и режимы': 'modes',
  'Дополнительные функции': 'modes',
  Технологии: 'modes',
  'Температурные режимы': 'modes',
  'Температурный режим работы': 'modes',

  Безопасность: 'safety',
  'Защита и безопасность': 'safety',

  Корпус: 'body',
  'Особенности конструкции': 'body',
  'Цвет и материал': 'body',
  Покрытие: 'body',
  'Ориентация в пространстве': 'body',

  'Размеры и вес': 'size',

  Комплектация: 'kit',
  Насадки: 'kit',
  'Заварник для чая': 'kit',

  'Уровень шума': 'noise',

  Фильтрация: 'filtration',
  'Фильтрация воздуха': 'filtration',
  Сенсоры: 'filtration',
  'База самоочистки': 'filtration',

  'Холодильная камера': 'chambers',
  'Морозильная камера': 'chambers',
  'Зона свежести': 'chambers',
  'Контейнеры и полки': 'chambers',
  Отделения: 'chambers',
  'Генератор льда': 'chambers',

  'Основной барабан': 'drum',
  Сушка: 'drum',

  'Варочная панель': 'cooking',
  Духовка: 'cooking',
  'Дополнительная духовка': 'cooking',
  'Приготовление напитка': 'cooking',

  'Регулировка воздушного потока': 'climate',
  'Фреоновые магистрали': 'climate',

  Особенности: 'extra',
  'Дополнительная информация': 'extra',
  'Дополнительные характеристики': 'extra',
}
