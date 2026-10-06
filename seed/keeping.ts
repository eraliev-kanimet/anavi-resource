import { and, db, eq, inArray, isNull, type Db, type Transaction } from '@anavi/backend/src/db'
import { toMinor, type Currency, type StaffRole } from '@anavi/shared'
import type { Actor } from '@anavi/backend/src/lib/actor'
import {
  catInbound,
  catProduct,
  catQuarantine,
  catStockMove,
  catVariant,
} from '@anavi/backend/src/db/schema/cat'
import { orgSite, type OrgSite } from '@anavi/backend/src/db/schema/org'
import { catStorage } from '@anavi/backend/src/db/schema/cat'
import { cntBlock, cntPage } from '@anavi/backend/src/db/schema/cnt'
import { updateBlock } from '@anavi/backend/src/modules/content/block.service'
import { shpCarriage } from '@anavi/backend/src/db/schema/shp'
import { asSiteId } from '@anavi/backend/src/db/ids'
import { setTariff } from '@anavi/backend/src/modules/catalog/bill.service'
import {
  announceInbound,
  confirmInbound,
  receiveInbound,
} from '@anavi/backend/src/modules/catalog/inbound.service'
import { acceptStorage, inviteStorage } from '@anavi/backend/src/modules/catalog/storage.service'
import { listZones, setZones } from '@anavi/backend/src/modules/order/zone.service'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import {
  actOnCarriage,
  inviteCarriage,
  setCarriageTerms,
} from '@anavi/backend/src/modules/shipment/carriage.service'
import { createDistrict, listDistricts } from '@anavi/backend/src/modules/shipment/district.service'
import { listRoutes } from '@anavi/backend/src/modules/shipment/route.service'
import { follow } from '@anavi/backend/src/modules/subscription/follow.service'
import { listOrgStaffMembers } from '@anavi/backend/src/modules/staff/staff.service'
import { tulparTariffs } from './tulpar/site'
import { VEGA_KEPT } from './vega/kept'

/*
 * What the logistics operator does FOR the other demos — agreements that name two sites and so
 * belong to neither, like the supplies beside them.
 *
 * Only what STANDS is written here: who keeps whose goods, who carries for whom, and what lies on
 * whose floor. What HAPPENS on top of it — an order collected by the operator's storekeeper and
 * taken to a door by its courier — is sales, and the sales fixture owns it (`sales/carry.ts`): an
 * order does not exist until that script runs.
 */
export async function seedKeeping(tx: Db | Transaction = db): Promise<void> {
  await vegaAtTulpar(tx)
  await dyikanWithTulpar(tx)
  await saimaToOsh(tx)
  // The importer moves its own goods between its own cities with the same carrier: an agreement
  // and nothing else — a relocation names its direction when it is handed over.
  await agreeCarriage(await siteBySlug('demo1', tx), await siteBySlug('demo12', tx), tx)
  /*
   * And buys from it. The operator's fleet runs on the importer's oil, and an organization buys
   * only from a catalogue it follows — the subscription is the proof it may look at the shelf at
   * all. The purchases themselves are sales, and the sales fixture owns them.
   */
  const operator = await siteBySlug('demo12', tx)
  await follow(
    asSiteId((await siteBySlug('demo1', tx)).id),
    { type: 'org', id: operator.orgId },
    tx,
  )
}

async function siteBySlug(slug: string, tx: Db | Transaction): Promise<OrgSite> {
  const [row] = await tx
    .select()
    .from(orgSite)
    .where(and(eq(orgSite.slug, slug), isNull(orgSite.deletedAt)))
    .limit(1)
  if (!row) throw new Error(`keeping: no site «${slug}»`)
  return row
}

/**
 * Whoever holds this role at the organization, as the pair every act is signed with.
 *
 * The first of them, in the order they were hired. Refuses a role nobody holds rather than falling
 * back to the owner: a delivery counted «by the owner» at a warehouse that has a storekeeper is a
 * fixture showing the back office something no real day produces.
 */
export async function actorOf(
  site: OrgSite,
  role: StaffRole,
  tx: Db | Transaction,
): Promise<Actor> {
  const staff = await listOrgStaffMembers(site.orgId, tx)
  const held = staff.find((member) => member.roles.includes(role))
  if (!held) throw new Error(`keeping: nobody at «${site.slug}» is a ${role}`)
  return { userId: held.staff.userId, activeRole: role }
}

const DAY = 86_400_000

/** How long ago the pallet came: before the oldest order the sales script places for these goods. */
export const KEPT_SINCE_DAYS = 45

/** How long ago the agreements were struck: before anything the sales script does under them. */
const AGREED_SINCE_DAYS = 60

/**
 * «Carry my orders», asked by a shop and answered by the operator's desk, with the operator's own
 * term for a parcel brought back.
 *
 * Dated two months back past the services, like the pallet below: every order the sales script
 * hands over is older than this second, and a box carried under an agreement struck after it was
 * delivered is a history that reads backwards.
 */
async function agreeCarriage(shop: OrgSite, operator: OrgSite, tx: Db | Transaction) {
  const shopId = asSiteId(shop.id)
  const operatorId = asSiteId(operator.id)
  const grid = await tulparTariffs()
  const carriage = await inviteCarriage(
    shopId,
    await actorOf(shop, 'owner', tx),
    { address: operator.slug },
    tx,
  )
  await actOnCarriage(
    operatorId,
    carriage.id,
    'accept',
    await actorOf(operator, 'dispatcher', tx),
    tx,
  )
  await setCarriageTerms(operatorId, carriage.id, grid.carriage, tx)
  const asked = new Date(Date.now() - AGREED_SINCE_DAYS * DAY)
  asked.setHours(11, 40, 0, 0)
  const answered = new Date(asked.getTime() + 3 * 3_600_000)
  await tx
    .update(shpCarriage)
    .set({ createdAt: asked, answeredAt: answered, updatedAt: answered })
    .where(eq(shpCarriage.id, carriage.id))
}

/*
 * Which of «Тулпар»'s directions each of the market's districts is priced by, in the order the
 * market declared them, and how much of the carrier's price the buyer is charged.
 *
 * The centre is where the market's own van used to be cheapest, so there the market pays half the
 * carriage itself; the far bank and the villages are passed on whole. The thresholds past which
 * delivery is free stay the market's own — who pays the carrier then is the market, by its choice.
 */
const DYIKAN_DISTRICTS = [
  { route: 'bishkek', share: 50, district: 'Центр' },
  { route: 'bishkek', share: 100, district: 'Правый берег' },
  { route: 'bishkek-suburbs', share: 100, district: 'Пригород' },
]

/**
 * A district of the operator's OWN list, by the word its dispatchers say — added the first time a
 * shop's district is named as it. The market calls the first one «Центр и левый берег»; the carrier
 * lays its mornings out by «Центр», and the shop says once which is which.
 */
async function carrierDistrict(operator: OrgSite, name: string, tx: Db | Transaction) {
  const operatorId = asSiteId(operator.id)
  const found = (await listDistricts(operatorId, tx)).find((one) => one.name === name)
  return found ?? (await createDistrict(operatorId, { name }, tx))
}

/** A direction of the operator's tariff, by the key the material names it with. */
export async function directionOf(operator: OrgSite, key: string, tx: Db | Transaction) {
  const grid = await tulparTariffs()
  // By the name the material gives it: the key is the material's own word and is kept nowhere.
  const named = grid.routes.find((one) => one.key === key)?.name[operator.defaultLocale]
  const found = (await listRoutes(asSiteId(operator.id), tx)).find(
    (one) => one.name[operator.defaultLocale] === named,
  )
  if (!named || !found) throw new Error(`keeping: the operator has no direction «${key}»`)
  return found
}

/**
 * The workshop starts sending to the south: a second district beside its one, carried by «Тулпар»
 * along «Бишкек — Ош» and charged to the buyer whole.
 *
 * With two districts the till begins to ASK where the order goes — which is why the workshop's
 * questionnaire carries a district question that stayed unasked while there was one. The city
 * district is said again exactly as it stood, so its row keeps its identity.
 */
async function saimaToOsh(tx: Db | Transaction): Promise<void> {
  const shop = await siteBySlug('demo8', tx)
  const operator = await siteBySlug('demo12', tx)
  const shopId = asSiteId(shop.id)
  await agreeCarriage(shop, operator, tx)
  const south = await directionOf(operator, 'bishkek-osh', tx)
  const zones = await listZones(shopId, tx)
  await setZones(
    shopId,
    [
      ...zones.map((zone) => ({
        id: String(zone.id),
        name: zone.name,
        fee: zone.fee,
        freeFrom: zone.freeFrom,
      })),
      {
        name: {
          ru: 'Ош и юг, сборным рейсом',
          en: 'Osh and the south, by line-haul',
          ar: 'أوش والجنوب، بالشحن المجمّع',
        },
        fee: 0,
        routeId: String(south.id),
        share: 100,
        districtId: String((await carrierDistrict(operator, 'Ош', tx)).id),
      },
    ],
    tx,
  )
}

/**
 * «Дыйкан» stops running a van of its own: every district is carried by «Тулпар».
 *
 * The agreement first, because a district may only hang on a direction of a carrier the shop has a
 * standing agreement with. Then the market's own three districts are said again whole, each naming
 * its direction — the rows keep their identity, so nothing that pointed at them moves. From here a
 * buyer's delivery costs what the tariff says for the weight of the basket, and an order handed
 * over is born at the carrier's already priced.
 */
async function dyikanWithTulpar(tx: Db | Transaction): Promise<void> {
  const shop = await siteBySlug('demo5', tx)
  const operator = await siteBySlug('demo12', tx)
  const shopId = asSiteId(shop.id)
  await agreeCarriage(shop, operator, tx)

  const zones = await listZones(shopId, tx)
  if (zones.length !== DYIKAN_DISTRICTS.length) {
    throw new Error(
      `keeping: the market declares ${zones.length} districts, ${DYIKAN_DISTRICTS.length} are priced here`,
    )
  }
  const priced = []
  for (const [index, zone] of zones.entries()) {
    const district = DYIKAN_DISTRICTS[index]!
    priced.push({
      id: String(zone.id),
      name: zone.name,
      fee: zone.fee,
      freeFrom: zone.freeFrom,
      routeId: String((await directionOf(operator, district.route, tx)).id),
      share: district.share,
      districtId: String((await carrierDistrict(operator, district.district, tx)).id),
    })
  }
  await setZones(shopId, priced, tx)
}

/**
 * «Вега» keeps part of its range at «Тулпар» and has «Тулпар» carry its orders.
 *
 * Every step through the door a person would use, in the order they would use it: the shop asks,
 * the operator answers naming a floor and its rates; the shop says what is coming, the storekeeper
 * counts what came — one line short, one box crushed — and the shop agrees with the difference. The
 * crushed box is left in quarantine on purpose, undecided: it is the state an owner has to act on.
 */
async function vegaAtTulpar(tx: Db | Transaction): Promise<void> {
  const shop = await siteBySlug('demo2', tx)
  const operator = await siteBySlug('demo12', tx)
  const shopId = asSiteId(shop.id)
  const operatorId = asSiteId(operator.id)
  const owner = await actorOf(shop, 'owner', tx)
  const boss = await actorOf(operator, 'owner', tx)
  const storekeeper = await actorOf(operator, 'storekeeper', tx)
  const grid = await tulparTariffs()
  const money = (value: number) => toMinor(value, operator.currency as Currency)

  // The warehouse and not a pickup point: the first of the operator's places, by the owner's order.
  const [warehouse] = await listPlaces(operatorId, tx)
  if (!warehouse) throw new Error('keeping: the operator has no floor to keep anything on')

  const storage = await inviteStorage(shopId, owner, { address: operator.slug }, tx)
  await acceptStorage(operatorId, storage.id, boss, { placeIds: [String(warehouse.id)] }, tx)
  await setTariff(
    operatorId,
    storage.id,
    {
      receive: money(grid.storage.receive),
      pick: money(grid.storage.pick),
      pack: money(grid.storage.pack),
      keep: money(grid.storage.keep),
    },
    tx,
  )

  /*
   * The operator's page of tariffs prints its warehouse rates off an agreement, and this is the one:
   * the block was laid pointing at none — the page is built before any agreement exists — and is
   * pointed here, through the door a person would use.
   */
  const pages = await tx
    .select({ block: cntBlock })
    .from(cntBlock)
    .innerJoin(cntPage, eq(cntPage.id, cntBlock.pageId))
    .where(and(eq(cntPage.siteId, operatorId), eq(cntBlock.type, 'tariff')))
  for (const { block } of pages) {
    const data = block.data as { show?: string }
    if (data.show !== 'storage') continue
    await updateBlock(
      operatorId,
      block.pageId,
      block.id,
      { data: { ...data, storage: String(storage.id) } },
      tx,
    )
  }

  const struck = new Date(Date.now() - AGREED_SINCE_DAYS * DAY)
  struck.setHours(10, 5, 0, 0)
  await tx
    .update(catStorage)
    .set({ createdAt: struck, answeredAt: new Date(struck.getTime() + 2 * 3_600_000) })
    .where(eq(catStorage.id, storage.id))

  await agreeCarriage(shop, operator, tx)

  const variants = await tx
    .select({ id: catVariant.id, slug: catProduct.slug })
    .from(catVariant)
    .innerJoin(catProduct, eq(catProduct.id, catVariant.productId))
    .where(
      and(
        eq(catProduct.siteId, shopId),
        inArray(
          catProduct.slug,
          VEGA_KEPT.map((line) => line.slug),
        ),
        eq(catVariant.isPrimary, true),
        isNull(catVariant.deletedAt),
        isNull(catProduct.deletedAt),
      ),
    )
  const bySlug = new Map(variants.map((row) => [row.slug, row.id]))
  const missing = VEGA_KEPT.filter((line) => !bySlug.has(line.slug))
  // Never sent short in silence: a delivery quietly missing a model looks like a working fixture.
  if (missing.length > 0) {
    throw new Error(
      `keeping: the shop sells nothing at ${missing.map((one) => one.slug).join(', ')}`,
    )
  }

  const came = new Date(Date.now() - KEPT_SINCE_DAYS * DAY)
  came.setHours(10, 20, 0, 0)
  const inbound = await announceInbound(
    shopId,
    owner,
    {
      storageId: String(storage.id),
      placeId: String(warehouse.id),
      expectedOn: came.toISOString().slice(0, 10),
      note: 'Две паллеты от дистрибьютора, коробки заводские. Серийные номера в накладной.',
      items: VEGA_KEPT.map((line) => ({
        variantId: String(bySlug.get(line.slug)!),
        qty: line.announced,
      })),
    },
    tx,
  )
  await receiveInbound(
    operatorId,
    inbound.id,
    storekeeper,
    {
      note: 'Пересчитано при водителе. Одной коробки ThinkBook на паллете не было, одна коробка Zephyrus смята.',
      items: VEGA_KEPT.map((line) => ({
        variantId: String(bySlug.get(line.slug)!),
        received: line.received ?? line.announced,
        ...(line.damaged ? { damaged: line.damaged, damage: line.damage } : {}),
      })),
    },
    tx,
  )
  await confirmInbound(shopId, inbound.id, owner, tx)

  /*
   * And the pallet came six weeks ago rather than this second — the allowed exception, like every
   * backdated row of a demo. It is not cosmetic here: the operator's bill counts position-DAYS off
   * the journal's own dates, so a delivery stamped «now» is a month of keeping that costs one day.
   * Announced the evening before, counted in the morning, agreed by the shop that afternoon.
   */
  const announced = new Date(came.getTime() - 16 * 3_600_000)
  const agreed = new Date(came.getTime() + 5 * 3_600_000)
  await tx
    .update(catInbound)
    .set({ createdAt: announced, receivedAt: came, acceptedAt: agreed, updatedAt: agreed })
    .where(eq(catInbound.id, inbound.id))
  await tx
    .update(catStockMove)
    .set({ createdAt: came })
    .where(and(eq(catStockMove.sourceType, 'inbound'), eq(catStockMove.sourceId, inbound.id)))
  await tx
    .update(catQuarantine)
    .set({ createdAt: came, updatedAt: came })
    .where(eq(catQuarantine.inboundId, inbound.id))
}
