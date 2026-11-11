import { loadBooks, partyNamed } from '../lib/books'
import {
  and,
  db,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  type Db,
  type Transaction,
} from '@anavi/backend/src/db'
import { toMinor, type Currency, type StaffRole } from '@anavi/shared'
import type { Actor } from '@anavi/backend/src/lib/actor'
import { catProduct, catVariant } from '@anavi/backend/src/db/schema/cat'
import { stkInbound, stkQuarantine, stkMove } from '@anavi/backend/src/db/schema/stk'
import { type OrgSite } from '@anavi/backend/src/db/schema/org'
import { stkStorage } from '@anavi/backend/src/db/schema/stk'
import { cntBlock, cntPage } from '@anavi/backend/src/db/schema/cnt'
import { updateBlock } from '@anavi/backend/src/modules/content/block.service'
import { shpCarriage } from '@anavi/backend/src/db/schema/shp'
import { asOrgId, asSiteId } from '@anavi/backend/src/db/ids'
import { setTariff } from '@anavi/backend/src/modules/keeping/bill.service'
import { confirmInbound, receiveInbound } from '@anavi/backend/src/modules/keeping/inbound.service'
import { binNamed } from '../lib/bins'
import { createArrival } from '@anavi/backend/src/modules/supply/arrival.service'
import { acceptStorage, inviteStorage } from '@anavi/backend/src/modules/keeping/storage.service'
import { waitingOf } from '@anavi/backend/src/modules/edition/edition.service'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import { listZones } from '@anavi/backend/src/modules/network/site-zones'
import { listPlaces } from '@anavi/backend/src/modules/org/place.service'
import {
  actOnCarriage,
  inviteCarriage,
  answerCarriageTerms,
  setCarriageTerms,
} from '@anavi/backend/src/modules/shipment/carriage.service'
import { createDistrict, listDistricts } from '@anavi/backend/src/modules/network/district.service'
import { listRoutes } from '@anavi/backend/src/modules/network/route.service'
import { follow } from '@anavi/backend/src/modules/subscription/follow.service'
import { listOrgStaffMembers } from '@anavi/backend/src/modules/staff/staff.service'
import { tulparTariffs } from '../../demos/tulpar/seed/site'
import { VEGA_KEPT } from '../../demos/vega/seed/kept'
import { dayOfMoment } from '../lib/days'
import { siteBySlug } from '../lib/sites'
import { agrAgreement, agrWord } from '@anavi/backend/src/db/schema/agr'
import { ediEdition } from '@anavi/backend/src/db/schema/edi'

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
  await agreeCarriage(await siteBySlug('hanako', tx), await siteBySlug('tulpar', tx), tx)
  /*
   * And buys from it. The operator's fleet runs on the importer's oil, and an organization buys
   * only from a catalogue it follows — the subscription is the proof it may look at the shelf at
   * all. The purchases themselves are sales, and the sales fixture owns them.
   */
  const operator = await siteBySlug('tulpar', tx)
  await follow(
    asSiteId((await siteBySlug('hanako', tx)).id),
    { type: 'org', id: operator.orgId },
    tx,
  )
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
  return { userId: held.staff.userId, activeRole: role, viaOrgId: null }
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
  // The carrier names its terms; the ones it only OFFERS — the terms of handing on the shop's money and of paying the carriage —
  // stands from the shop's yes, which the shop says here.
  const terms = await setCarriageTerms(
    operatorId,
    carriage.id,
    await actorOf(operator, 'dispatcher', tx),
    grid.carriage,
    tx,
  )
  if (terms.termsOffer)
    await answerCarriageTerms(
      shopId,
      carriage.id,
      'accept',
      { editionId: terms.termsOffer.editionId },
      await actorOf(shop, 'owner', tx),
      tx,
    )
  const asked = new Date(Date.now() - AGREED_SINCE_DAYS * DAY)
  asked.setHours(11, 40, 0, 0)
  const answered = new Date(asked.getTime() + 3 * 3_600_000)
  await tx
    .update(shpCarriage)
    .set({ createdAt: asked, updatedAt: answered })
    .where(eq(shpCarriage.id, carriage.id))
  await backdateAgreement(carriage.id, asked, answered, tx)
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
  { zone: 'Центр и левый берег', route: 'bishkek', share: 50, district: 'Центр' },
  { zone: 'Правый берег', route: 'bishkek', share: 100, district: 'Правый берег' },
  { zone: 'Пригород', route: 'bishkek-suburbs', share: 100, district: 'Пригород' },
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
 * along «Бишкек → Ош» and charged to the buyer whole.
 *
 * With two districts the till begins to ASK where the order goes — which is why the workshop's
 * questionnaire carries a district question that stayed unasked while there was one. The city
 * district is said again exactly as it stood, so its row keeps its identity.
 */
async function saimaToOsh(tx: Db | Transaction): Promise<void> {
  const shop = await siteBySlug('saima', tx)
  const operator = await siteBySlug('tulpar', tx)
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
  const shop = await siteBySlug('dyikan', tx)
  const operator = await siteBySlug('tulpar', tx)
  const shopId = asSiteId(shop.id)
  await agreeCarriage(shop, operator, tx)

  const zones = await listZones(shopId, tx)
  if (zones.length !== DYIKAN_DISTRICTS.length) {
    throw new Error(
      `keeping: the market declares ${zones.length} districts, ${DYIKAN_DISTRICTS.length} are priced here`,
    )
  }
  const priced = []
  for (const zone of zones) {
    // By the word the market says, never by the place in its list: a district added or moved must
    // fail here and not be priced as its neighbour.
    const district = DYIKAN_DISTRICTS.find((one) => one.zone === zone.name.ru)
    if (!district)
      throw new Error(`keeping: the market's district «${zone.name.ru}» is not priced here`)
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
  const shop = await siteBySlug('vega', tx)
  const operator = await siteBySlug('tulpar', tx)
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

  // The keeper names its tariff before answering, and answers with it: a price is the owner's to
  // agree to, so the keeping stands from the owner's yes to the very terms the keeper wrote.
  const storage = await inviteStorage(shopId, owner, { address: operator.slug }, tx)
  await setTariff(
    operatorId,
    storage.id,
    {
      receive: money(grid.storage.receive),
      pick: money(grid.storage.pick),
      pack: money(grid.storage.pack),
      keep: money(grid.storage.keep),
      // The rest the operator's grid does not name: not charged for.
      volume: null,
      return: null,
      withdraw: null,
      write_off: null,
    },
    tx,
  )
  await acceptStorage(operatorId, storage.id, boss, { placeIds: [String(warehouse.id)] }, tx)
  const offered = await waitingOf('storage', storage.id, tx)
  if (!offered) throw new Error('keeping: the keeper answered with no terms to agree to')
  await acceptStorage(shopId, storage.id, owner, { editionId: String(offered.id) }, tx)

  /*
   * The operator's page of tariffs prints its warehouse rates off an agreement, and this is the one:
   * the block was laid pointing at none — the page is built before any agreement exists — and is
   * pointed here, through the door a person would use.
   */
  const pages = await tx
    .select({ block: cntBlock })
    .from(cntBlock)
    .innerJoin(cntPage, eq(cntPage.id, cntBlock.pageId))
    .where(and(eq(cntPage.siteId, operatorId), eq(cntBlock.type, 'storage')))
  for (const { block } of pages) {
    await updateBlock(
      operatorId,
      block.pageId,
      block.id,
      { data: { ...(block.data as object), agreement: String(storage.id) } },
      tx,
    )
  }

  const struck = new Date(Date.now() - AGREED_SINCE_DAYS * DAY)
  struck.setHours(10, 5, 0, 0)
  await tx.update(stkStorage).set({ createdAt: struck }).where(eq(stkStorage.id, storage.id))
  await backdateAgreement(storage.id, struck, new Date(struck.getTime() + 2 * 3_600_000), tx)
  // The tariff it was agreed on stands from the day it was agreed: its days are billed at it.
  await tx
    .update(ediEdition)
    .set({ dueOn: struck.toISOString().slice(0, 10), createdAt: struck, appliedAt: struck })
    .where(
      and(
        eq(ediEdition.subjectType, 'storage'),
        eq(ediEdition.subjectId, storage.id),
        isNotNull(ediEdition.appliedAt),
      ),
    )

  await agreeCarriage(shop, operator, tx)

  const variants = await tx
    .select({ id: catVariant.id, slug: catProduct.slug, price: catVariant.price })
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
  // Bought from the distributor at the share of the price the shop's books name as its cost.
  const share = (await loadBooks(shop.slug))?.cost
  if (!share) throw new Error(`keeping: demos/${shop.slug}/books.json names no cost`)
  const priceOf = new Map(
    variants.map((row) => [row.slug, Math.max(1, Math.round((row.price ?? 0) * share))]),
  )
  const missing = VEGA_KEPT.filter((line) => !bySlug.has(line.slug))
  // Never sent short in silence: a delivery quietly missing a model looks like a working fixture.
  if (missing.length > 0) {
    throw new Error(
      `keeping: the shop sells nothing at ${missing.map((one) => one.slug).join(', ')}`,
    )
  }

  const came = new Date(Date.now() - KEPT_SINCE_DAYS * DAY)
  came.setHours(10, 20, 0, 0)
  // Bought from the distributor and sent straight to the operator's floor: the shop's own paper,
  // which announces the pallet to the keeper and owes the supplier what the keeper finds.
  const arrival = await createArrival(
    shopId,
    owner,
    {
      counterpart: {
        type: 'party',
        id: await partyNamed(asOrgId(shop.orgId), 'ОсОО «Азия Дистрибьюшн»', tx),
      },
      placeId: warehouse.id,
      on: dayOfMoment(came),
      number: 'АД-2187',
      note: 'Две паллеты от дистрибьютора, коробки заводские. Серийные номера в накладной.',
      lines: VEGA_KEPT.filter((line) => line.announced > 0).map((line) => ({
        variantId: bySlug.get(line.slug)!,
        qty: line.announced,
        price: priceOf.get(line.slug)!,
      })),
    },
    tx,
  )
  const [inbound] = await tx
    .select({ id: stkInbound.id })
    .from(stkInbound)
    .where(and(eq(stkInbound.sourceType, 'arrival'), eq(stkInbound.sourceId, arrival.id)))
    .limit(1)
  if (!inbound) throw new Error('keeping: the paper announced no delivery to the operator')
  const spots = new Map<string, bigint>()
  for (const line of VEGA_KEPT)
    spots.set(line.bin, await binNamed(operatorId, warehouse.id, line.bin, tx))
  await receiveInbound(
    operatorId,
    inbound.id,
    storekeeper,
    {
      note: 'Пересчитано при водителе. Одной коробки ThinkBook на паллете не было, одна коробка Zephyrus смята, две коробки TUF A15 в накладной не значились.',
      // Each box put down in its spot on the operator's floor, named at the count as the storekeeper would.
      items: VEGA_KEPT.map((line) => ({
        variantId: String(bySlug.get(line.slug)!),
        binId: String(spots.get(line.bin)!),
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
    .update(stkInbound)
    .set({ createdAt: announced, receivedAt: came, updatedAt: agreed })
    .where(eq(stkInbound.id, inbound.id))
  // The words about it carry the same days: the count in the morning, the shop's yes that afternoon.
  const about = and(eq(agrWord.subjectType, 'inbound'), eq(agrWord.subjectId, inbound.id))
  await tx
    .update(agrWord)
    .set({ at: came })
    .where(and(about, eq(agrWord.word, 'count')))
  await tx
    .update(agrWord)
    .set({ at: agreed })
    .where(and(about, eq(agrWord.word, 'accept')))
  await tx
    .update(stkMove)
    .set({ createdAt: came, on: dayOfMoment(came) })
    .where(and(eq(stkMove.sourceType, 'inbound'), eq(stkMove.sourceId, inbound.id)))
  const lots = await tx
    .update(stkQuarantine)
    // The free days run from the morning it was set aside, as they would have.
    .set({
      createdAt: came,
      updatedAt: came,
      payableAt: sql`${came.toISOString()}::timestamptz + (${stkQuarantine.payableAt} - ${stkQuarantine.createdAt})`,
    })
    .where(eq(stkQuarantine.inboundId, inbound.id))
    .returning({ id: stkQuarantine.id })
  // The box set aside moved the shelf the same morning; the books' document follows its move.
  if (lots.length > 0) {
    await tx
      .update(stkMove)
      .set({ createdAt: came, on: dayOfMoment(came) })
      .where(
        and(
          eq(stkMove.sourceType, 'quarantine'),
          inArray(
            stkMove.sourceId,
            lots.map((one) => one.id),
          ),
        ),
      )
  }
}

// The demo's agreements were struck months ago: the agreement and its journal say the same day.
async function backdateAgreement(id: bigint, asked: Date, answered: Date, tx: Db | Transaction) {
  await tx
    .update(agrAgreement)
    .set({ createdAt: asked, answeredAt: answered, updatedAt: answered })
    .where(eq(agrAgreement.id, id))
  const said = (word: 'invite' | 'accept') =>
    and(eq(agrWord.subjectType, 'agreement'), eq(agrWord.subjectId, id), eq(agrWord.word, word))
  await tx.update(agrWord).set({ at: asked }).where(said('invite'))
  await tx.update(agrWord).set({ at: answered }).where(said('accept'))
}
