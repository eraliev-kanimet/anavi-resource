# Каталог «Ватта»: откуда взялся и как пересобрать

Исходный материал седьмого демо и то, что превратило его в данные. Живёт здесь, а не в репозитории кода: сырьё — восемнадцать мегабайт, и коду они не нужны. Готовые `data/*.json` лежат теперь этажом выше, в `watt/data/`, — раньше генератор писал их через границу репозиториев.

```
raw/            261 карточка, как их отдал источник
decisions.ts    всё, что решил человек: полки, разделы, подписи карточек, свод групп
translations/   английский и арабский, пять файлов зеркалом пяти файлов данных
translations.ts как перевод находит свой слот; extract.ts — как он сюда попал, разово
build.ts        raw + decisions + translations → data, сети не требует
```

Сид читает `watt/data/*.json` — соседнюю папку, — а сюда не заглядывает.

## Источник

`technopark.ru`, выбран после проверки шестнадцати магазинов: остальные либо закрыты защитой (DNS, Ситилинк, Эльдорадо, OnlineTrade, ВсеИнструменты, Розетка, Wildberries), либо отдают пустую оболочку без публичного API (М.Видео, technodom.kg), либо не держат крупную технику вовсе — у regard нет ни холодильников, ни стиральных машин.

Разметка не разбиралась. Технопарк — приложение на Nuxt, и вся карточка лежала в её payload: `data[0].product` — название, цена, бренд, раздел, артикул, наличие, галерея; `data[1].specifications .full` — таблица характеристик группами, парами «имя — значение». В `raw/` попал сам payload, поэтому он переживёт редизайн, который убил бы любой селектор.

**Обход закончен и не повторяется.** Страницы стояли за проверкой QRATOR: кука `qrator_jsid` бралась из живого Chrome, жила около сорока минут и переиздавалась на каждом ответе. Скрипта обхода здесь больше нет — всё, что он добыл, лежит в `raw/`.

Отбор был отказами: не в наличии, архив, без цены, меньше трёх фотографий, и не больше четырёх моделей одной марки на полку. Вышло 261 товар и 56 марок. Две полки перекошены по вине источника: у него пятьдесят девять посудомоечных машин на весь раздел и тринадцать плит с тремя фотографиями.

## Почему данные выглядят так

Правила, по которым разнородные строки стали словарём движка. Они объясняют то, что лежит в `data/*.json`, и меняются только здесь.

**Вид свойства выведен из значений**, и порядок проверок неслучаен. Флаги раньше чисел: источник не пишет «нет», он опускает строку, поэтому столбец состоит из одних «да». Перечисления через запятую раньше словарей: «сухая, влажная» — два значения, а не тринадцатое слово. Единица принадлежит свойству и написана один раз: «12.5 кг» — это число 12.5 при свойстве с единицей «кг».

**Разные единицы — не один столбец.** «315 аВт» и «16000 Па» меряют всасывание по-разному, и общий диапазонный фильтр придумал бы сравнение, которого никто не сделает. Диапазон «1250-1750 Вт» тоже не число: иначе он разбирается как 1250 с единицей «-1750 Вт».

**Одно имя — одно свойство, но не всегда.** «Высота» в сантиметрах — та же величина у чайника и у холодильника, и слитая она даёт один фильтр вместо десяти. «Тип» — нет: у пылесоса и у стиральной машины общего только слово. Поэтому сравнивается совместимость вида, а не совпадение значений: число делится при совпадении единицы, булево и текст делятся всегда, словарь — если словари пересекаются в среднем на четверть. Среднее, а не худшая пара: у «Цвета» дальние полки пересекаются на 0.20, а в среднем на 0.39. Расщепилось десять имён из 536.

**Названия групп сложены вручную** — пятьдесят восемь имён источника в семнадцать. Машина этого не выведет: только человек знает, что барабан и отжим — один раздел спецификации, а холодильная и морозильная камеры — два.

**Редкое выброшено:** характеристика осталась, если её несёт хотя бы четверть товаров полки. Мусор не брался вовсе — «Сайт производителя», ссылки на инструкции, артикул.

**Фильтр — утверждение о том, чем выбирают**, поэтому первыми идут свойства из подписи карточки: их назвал человек, знающий товар. Дальше словари, потом числа, флаги последними. Габаритов не больше двух: по заполненности высота с шириной вытесняли из панели загрузку белья и скорость отжима. Всего восемь на полку.

**Подпись карточки и «Коротко о товаре» — разного размера, и выводить одно из другого было ошибкой.** Подпись — строка под названием в сетке, и после пятой величины она заворачивается второй раз. Список на странице товара — сокращённая таблица, и четыре строки под страницей, где у товара восемьдесят свойств, читаются как страница, ничего о товаре не знающая. Поэтому у полки, кроме `summary`, есть `card` — что добавить к подписи, чтобы строк стало восемь. Ровно восемь, а не двенадцать: список стоит выше карточки с ценой, и каждая лишняя строка отодвигает кнопку покупки.

## Переводы

**Перевод — вход генератора, а не слой поверх его выгрузки.** Английский и арабский пришли к каталогу «Ватта» позже сборки и легли внутрь `data/*.json` — в то, что генератор пишет сам. Пока это было так, один прогон возвращал голые строки и молча выбрасывал два языка из 2121 подписи. Теперь переводы лежат в `translations/`, куда `build.ts` только дописывает и откуда никогда не удаляет, а `../data` он не читает вовсе. Потерять перевод пересборкой **нельзя** — не «нежелательно» и не «под флагом»: этого места сборка не касается.

Пять файлов зеркалят пять файлов данных, запись — «адрес → `{ru, en, ar}`». Адрес это путь внутри своего файла: `<слаг>/name`, `<слаг>/unit`, `<слаг>/value/<слаг значения>`, `<слаг>/summary/<номер>`, `<слаг товара>/text/<слаг свойства>`. `ru` в записи — исходник, по которому проверяется, что перевод всё ещё про эти слова.

**Подпись всегда пишется картой**, даже одноязычной. Сборка на пустой `translations/` даёт одноязычный, но валидный результат: `{ru: "Тип"}`, а не `"Тип"`. Интерфейсы сида объявляют здесь `LocalizedLabel`, и форма файла не должна зависеть от того, дошёл ли переводчик.

**Перевод ищется дважды.** Сперва по адресу — и применяется, только если `ru` в записи совпадает с тем, что генератор посчитал заново. Потом по самому русскому тексту среди слотов того же рода в том же файле, и только если этот текст там единственный: так перевод переезжает вместе со сменившимся слагом, а тридцать пять строк, переведённых в двух редакциях, остаются неопознанными вместо того, чтобы быть угаданными. Не нашлось ни там, ни там — слот уходит с одним русским, и адрес называется в отчёте.

**Отчёт в конце прогона** говорит: применено (и сколько из них переехало по тексту), без перевода, устарело, лишних записей. `устарело` — по адресу лежит перевод старых слов; запись **не тронута**, решает человек: вернуть текст, перевести заново или удалить. `лишних записей` — адреса больше нет, их удаляют руками. Обе строки — работа для человека, а не поломка сборки.

Два случая сборка считает поломкой и падает, ничего не записав: запись в `translations/` без `ru` (проверить её нечем) и один адрес, запрошенный дважды с разным исходником — это значит, что слаги перестали быть уникальными, и один слот вот-вот наденет чужой перевод.

```bash
cd anavi-resource/watt/source
bun run build.ts     # пишет в ../data — ту самую папку, которую читает сид
```

Сети не требует, занимает секунды. Повторный прогон не меняет ни байта ни в `data/`, ни в `translations/`. Шага с `lint:fix` для данных нет: `oxfmt` до `data/` не дотягивается — формат файла теперь дело генератора, а не настроек форматировщика в другом репозитории. Сам код в `source/` с тех пор попал и под `tsc`, и под `oxlint` корневой сверки: единственный генератор в репозитории не проверялся ничем.

## Картинки

Фотографии товаров — `watt/products/`, 1382 файла, взяты с CDN источника в лучшем из существующих размеров и не сжаты. Знаки брендов — `watt/brands/`, 55 файлов.

Витрина нарисована генератором по промптам ниже и лежит в WebP: сид ищет `watt/hero/hero-<n>.webp`, `watt/categories/<слаг>.webp` — и для раздела, и для полки, — `watt/collections/<слаг>.webp` и `watt/posts/<слаг>.webp`.

Генератор отдаёт JPEG на два-пять мегабайт. Ресайз не нужен — размеры и так те, что заказаны, — а вес снять надо: медиатека это git, и каждая версия останется в ней навсегда. Потолок 600 КБ на файл, и это потолок, а не цель: студийная съёмка полки достигает прозрачного качества уже на 250–380 КБ. Качество подбирается под файл — наибольшее, влезающее в бюджет, с ограничением сверху на 96, потому что сид всё равно перекодирует в WebP качеством 90.

```python
from PIL import Image
import io

BUDGET, CEILING, FLOOR = 600 * 1024, 96, 84

def best(im):                      # наибольшее качество, влезающее в бюджет
    lo, hi, chosen = FLOOR, CEILING, None
    while lo <= hi:
        mid = (lo + hi) // 2
        b = io.BytesIO(); im.save(b, 'WEBP', quality=mid, method=6)
        if b.tell() <= BUDGET: chosen = (mid, b.getvalue()); lo = mid + 1
        else: hi = mid - 1
    return chosen
```

46.6 МБ превратились в 6.1. Шестнадцать файлов из восемнадцати удержали q96; две самые насыщенные плитки подборок опустились до q90 и q89, чтобы влезть в потолок.

# Промпты для генерации

Каждый промпт — одной строкой в блоке кода, чтобы копировался целиком. Путь над блоком — куда положить готовый файл; имя значимо, сид ищет обложку по слагу полки и подборки.

Ни в одном нет людей, надписей, логотипов и цифр на дисплеях. Последнее не придирка: панель с часами на микроволновке — это та же надпись, только светящаяся, и на другом языке сайта она останется как была.

## Логотипа нет

Четыре варианта знака нарисованы и все отклонены, а `watt/logo.webp` удалён: у «Ватта» логотипа нет намеренно, и знак ему рисует облик — пиксельная надпись из названия в акцентном цвете организации (`website/src/components/shared/pixel-mark.astro`). Это и есть тот случай, ради которого движку понадобился запасной вариант, так что промпты для файла, которого не должно быть, здесь больше не лежат.

## Обложки разделов

Раздел — не полка, и снимается иначе: на полке три однотипных прибора, в разделе разные, потому что плитка «Крупная техника» обещает четыре полки, а не четыре холодильника. Студия та же, 3:2.

### Крупная техника

`anavi-resource/watt/categories/krupnaya-tehnika.png`

```text
Four different large home appliances standing together as one group: a tall two-door refrigerator in brushed stainless steel in the centre, a white front-loading washing machine at the left, a stainless dishwasher with a flat closed door at the right, and a freestanding cooker with a dark glass oven door and four burners set slightly behind them, shot in a bright seamless studio, four units of different kinds arranged in a shallow staggered lineup so the group reads as a department rather than as one product, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Кухня

`anavi-resource/watt/categories/kuhnya.png`

```text
Four different kitchen appliances standing together on a plain pale grey studio plinth: a built-in oven with a dark glass door at the left, a stainless microwave beside it, a brushed steel espresso machine with a portafilter and a small white cup in the centre, and a steel electric kettle on its base at the right, shot in a bright seamless studio, four units of different kinds arranged in a shallow staggered lineup so the group reads as a department rather than as one product, the two built-in units taller and behind, the two countertop ones lower and in front, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint reflection on the plinth, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Уборка и климат

`anavi-resource/watt/categories/uborka-i-klimat.png`

```text
Three different home appliances standing together as one group: a long matte white split-system indoor unit mounted high on a plain pale grey panel at the upper left with its louvre tilted slightly open, a slim cordless stick vacuum standing upright on its floor dock in the centre, and a low round robot vacuum resting on the floor at the right, shot in a bright seamless studio, three units of different kinds arranged in a shallow staggered lineup so the group reads as a department rather than as one product, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

## Обложки полок

Не один прибор, а небольшой строй из трёх с разной отделкой: обложка раздела должна читаться как полка, а не как конкретный товар. Первый предмет резкий и главный, два позади мягче. Соотношение 3:2.

### Холодильники

`anavi-resource/watt/categories/holodilniki.png`

```text
Three refrigerators standing together: in front a tall two-door model in brushed stainless steel with a recessed vertical handle, behind it to the left a compact white top-freezer, behind to the right a graphite French-door unit, all doors closed and seams crisp, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Стиральные машины

`anavi-resource/watt/categories/stiralnye-mashiny.png`

```text
Three front-loading washing machines in a row: the front one in matte white with a large dark glass door standing ajar to show the empty stainless drum inside, behind it a graphite machine with the door shut, and at the side a slim narrow-depth model, rubber gaskets and drum ribs clearly rendered, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Посудомоечные машины

`anavi-resource/watt/categories/posudomoechnye-mashiny.png`

```text
Three dishwashers: the front one freestanding in stainless steel with its door dropped fully open to reveal empty chrome baskets and a cutlery tray, behind it a full-size white unit with the door closed, and beside them a slim forty-five centimetre model, the interior of the open one lit a shade brighter than the body, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Плиты

`anavi-resource/watt/categories/plity.png`

```text
Three freestanding cookers: the front one in white enamel with four cast-iron burner grates and a black glass oven door, behind it a stainless steel model with a glass lid raised, and to the side a dark induction-top cooker, knobs and grates sharply defined, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Духовые шкафы

`anavi-resource/watt/categories/duhovye-shkafy.png`

```text
Three built-in ovens presented as floating standalone units in a shallow descending staircase: the front one in black glass with stainless trim and its door swung open to show empty wire racks and a warm interior lamp, the two behind closed, one all black and one steel-fronted, no cabinetry around them, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Микроволновые печи

`anavi-resource/watt/categories/mikrovolnovye-pechi.png`

```text
Three countertop microwave ovens: the front one in black mirror glass with the door slightly open and the interior lamp casting a soft glow over the glass turntable, behind it a white unit and a small brushed steel one, door handles and vent grilles crisp, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Кофеварки и кофемашины

`anavi-resource/watt/categories/kofemashiny.png`

```text
Three coffee makers grouped together: in front a tall automatic bean-to-cup machine in brushed steel and black with its group head and steam wand facing the camera, beside it a compact portafilter espresso machine with the basket seated, behind them a drip coffee maker with an empty glass carafe, a loose portafilter and a tamper lying flat in the foreground, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Чайники

`anavi-resource/watt/categories/chayniki.png`

```text
Four electric kettles standing on their power bases in a loose staggered line: a brushed stainless hero with a black handle in front, a clear glass-bodied kettle beside it showing an empty interior and a heating disc, a matte black one and a cream rounded retro one behind, spouts turned at slightly different angles, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Пылесосы

`anavi-resource/watt/categories/pylesosy.png`

```text
Three vacuum cleaners of different builds: a cordless stick vacuum standing upright on its floor head in front, a low disc-shaped robot vacuum on the floor beside it, and a wheeled canister vacuum with its hose neatly coiled behind, two spare nozzles and a crevice tool laid out flat in the foreground, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

### Кондиционеры

`anavi-resource/watt/categories/konditsionery.png`

```text
A split-system air conditioner shown as a pair plus a spare: a long matte white wall unit floating in front with its louvre tilted slightly open, the matching grey outdoor condenser with a visible fan grille standing lower and behind it, and a second slimmer indoor unit turned three-quarters at the side, a slim remote control lying flat in the foreground, shot in a bright seamless studio, three units of the same kind arranged in a shallow staggered lineup, the front one sharp and dominant, the two behind it softer and slightly turned, finishes deliberately different from one another, soft broad light from the upper left with a low fill from the right, gentle contact shadows and a faint floor reflection, pale cool grey backdrop with a smooth vertical gradient, no room, no props beyond what is named, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, high-end catalogue photography, three-to-two landscape composition with generous empty space around the group.
```

## Первый экран

Широкие, 16:9. **Места под заголовок в кадре быть не должно** — и промпты ниже этим испорчены. Они просили оставить левую половину пустой и мягко расфокусированной, как делают, когда текст лежит на фотографии. В торговом зале первый экран устроен иначе: заголовок стоит на своей тёмной панели слева, снимок — отдельной плиткой справа, и пустая половина внутри снимка оказывается лишней дважды. У `hero-1` она была ещё и размыта; кадр перерисован целиком и лежит полным, 2752×1536. Оставшиеся два промпта эту оговорку всё ещё содержат — при перегенерации уберите её и заполните кадр целиком.

### Первый экран — кухня

`anavi-resource/watt/hero/hero-1.png`

```text
A calm modern kitchen in the late morning, warm daylight raking across matte pale cabinetry and a pale stone worktop, a built-in oven with a dark glass door and a tall brushed-steel refrigerator standing at the right edge of the frame, a shallow ceramic bowl of lemons and a folded linen towel on the counter for life, the whole left half of the image deliberately empty and softly out of focus so that a headline can be laid over it, muted palette of warm grey, oat and brushed steel, no clutter, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide cinematic sixteen-by-nine composition, shallow depth of field, shot on a full-frame camera with a thirty-five millimetre lens at f/2.
```

### Первый экран — постирочная

`anavi-resource/watt/hero/hero-2.png`

```text
A quiet utility corner of a modern home, a front-loading washing machine with a slim dryer stacked above it set into a niche of pale birch joinery, a stack of neatly folded white linen on an open wooden shelf and a wicker basket on the floor, cool even daylight arriving from a window out of frame to the right, the left third of the image an uncluttered plaster wall left empty for text, restrained palette of white, pale birch and graphite, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide cinematic sixteen-by-nine composition, shallow depth of field, natural light photography.
```

### Первый экран — утро

`anavi-resource/watt/hero/hero-3.png`

```text
A close warm still life on a kitchen counter at breakfast time, an espresso machine in brushed steel and a matching electric kettle standing together on a dark stone surface, a small white cup and a scattering of coffee beans beside them, low morning sun raking in from the right and throwing long soft shadows across the stone to the left, the left portion of the frame open and gently shadowed so text can sit over it, palette of amber light, brushed steel and warm grey, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide cinematic sixteen-by-nine composition, shallow depth of field.
```

## Плитки подборок

Квадратные, 1:1, сюжетные, а не предметные — это подборки, а не полки. Имя файла = слаг подборки, он же адрес: `/collections/<слаг>`.

### Духовки с пиролизом

`anavi-resource/watt/collections/s-pirolizom.png`

```text
A tightly framed corner of a fitted modern kitchen where a tall column of dark cabinetry holds a built-in oven with its door swung fully open, empty wire racks and clean enamel walls lit by the warm interior lamp, a warming drawer below it and an induction hob flush in the worktop above, warm directional light grazing the stainless trim, deep shadow in the corners of the frame, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, square one-to-one composition, moody and premium, shallow depth of field.
```

### Холодильники No Frost

`anavi-resource/watt/collections/no-frost.png`

```text
A wide side-by-side refrigerator in dark steel standing in a dim kitchen at dusk with one door open just far enough to spill cool blue-white interior light across the wooden floor, the shelves inside empty, spotless and evenly lit, warm ambient light from the room beyond falling on the closed door, a faint bloom where the two lights meet, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, square one-to-one composition, atmospheric and calm, shallow depth of field.
```

### Беспроводные пылесосы

`anavi-resource/watt/collections/besprovodnye-pylesosy.png`

```text
A cordless stick vacuum leaning upright against a pale plaster wall on a wide oak floor in a sunlit empty room, its floor head resting flat and its transparent dust container catching the light, one long soft shadow stretching diagonally across the boards, dust motes suspended in the sunbeam, a spare crevice nozzle lying on the floor nearby, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, square one-to-one composition, quiet and airy, shallow depth of field.
```

### Рожковые кофеварки

`anavi-resource/watt/collections/rozhkovye-kofevarki.png`

```text
A portafilter espresso machine mid-extraction seen close and slightly from the side, two dark streams of coffee falling into a small white cup below the group head, crema building on the surface, warm backlight catching the steam and the polished chrome, the background a soft dark blur of a morning kitchen, a tamper and a scattering of ground coffee on the dark counter in front, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, square one-to-one composition, intimate and warm, shallow depth of field.
```

## Обложки статей

Широкие, 16:9 — лента рисует их в этом отношении. Здесь не студия: обзор и статья говорят о технике в доме, а не о товаре на полке, и снимаются как жилая сцена.

### Обзор холодильника

`anavi-resource/watt/posts/obzor-lg-ga-b509sbum.png`

```text
A bright modern kitchen corner in daylight with a tall brushed stainless-steel bottom-freezer refrigerator standing against a pale plaster wall between plain matte cabinets, its upper door open just far enough for the cool interior light to fall across clean empty glass shelves, a wooden worktop with a shallow bowl of apples beside it, soft natural window light from the left, calm palette of warm oak, white and brushed steel, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide sixteen-by-nine composition, shallow depth of field, natural light photography.
```

### Обзор стирально-сушильной машины

`anavi-resource/watt/posts/obzor-lg-f2v7fr1w.png`

```text
A tidy laundry niche in a bright bathroom with a white front-loading washer-dryer built in under a light stone worktop, its round chrome-rimmed door closed and the porthole glass catching the light, a woven basket of neatly folded white towels standing beside it and a narrow shelf of plain unlabelled bottles above, soft diffuse daylight, calm palette of white, pale grey and light wood, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide sixteen-by-nine composition, shallow depth of field, natural light photography.
```

### Обзор робота-пылесоса

`anavi-resource/watt/posts/obzor-roborock-qrevo-curv-2-flow.png`

```text
A low camera close to the floor of a bright living room where a low round robot vacuum crosses light oak parquet towards the edge of a soft beige rug, a faint clean track left on the boards behind it, its tall charging dock standing against the wall in the soft-focus background beside a sofa leg and a plant pot, warm afternoon light raking across the floor, calm palette of oak, beige and graphite, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide sixteen-by-nine composition, shallow depth of field, natural light photography.
```

### Как измерить нишу

`anavi-resource/watt/posts/kak-izmerit-nishu.png`

```text
A close view of an empty kitchen niche between plain matte cabinets under a light stone worktop, a yellow steel tape measure extended across the opening and resting on the floor, a folding rule and a pencil lying on the worktop above, the bare wall and a single power socket visible inside the niche, soft even daylight, calm palette of pale grey cabinetry, warm oak and yellow steel, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no numbers legible on the tape or the rule, wide sixteen-by-nine composition, sharp focus throughout, natural light photography.
```

### Загрузка и отжим

`anavi-resource/watt/posts/zagruzka-i-otzhim.png`

```text
A close view of the open stainless drum of a white front-loading washing machine, its chrome-rimmed door swung towards the camera, folded white and grey cotton laundry resting inside the drum and a little more in a woven basket on the light tiled floor beside it, soft diffuse daylight with gentle highlights on the steel, calm palette of white, brushed steel and pale grey, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide sixteen-by-nine composition, shallow depth of field, natural light photography.
```

### Пиролиз или гидролиз

`anavi-resource/watt/posts/piroliz-ili-gidroliz.png`

```text
A close view of a built-in oven with its dark glass door open and dropped level, showing a spotlessly clean empty enamel cavity with two chrome shelf rails and the warm interior lamp glowing inside, the surrounding plain matte kitchen cabinetry soft in the background and a folded cloth lying on the worktop above, soft even daylight against the warm cavity light, calm palette of graphite, black glass and warm amber, no people, no hands, no text, no lettering, no logos, no brand marks, no readable labels, no digits or glowing numerals on any display — every control panel dark and blank, wide sixteen-by-nine composition, shallow depth of field, natural light photography.
```
