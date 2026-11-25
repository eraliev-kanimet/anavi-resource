import { updateSupplyTerms } from '@anavi/backend/src/modules/supply/site-terms.service'
import { and, db, eq, inArray, isNull, sql, type Db, type Transaction } from '@anavi/backend/src/db'
import { catCategory, catProduct, catType, catVariant } from '@anavi/backend/src/db/schema/cat'
import { supPlacement, supSupply } from '@anavi/backend/src/db/schema/sup'
import { formForm } from '@anavi/backend/src/db/schema/form'
import { iamIdentity } from '@anavi/backend/src/db/schema/iam'
import {} from '@anavi/backend/src/db/schema/org'
import { type SiteId } from '@anavi/backend/src/db/ids'
import { getOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { actorOf } from '../links/keeping'
import { addBarcode } from '@anavi/backend/src/modules/stock/barcode.service'
import { currentTerms } from '@anavi/backend/src/modules/supply/shelf-terms.service'
import { setShelf } from '@anavi/backend/src/modules/supply/supply-shelf.service'
import { proposeTerms, publishTerms } from '@anavi/backend/src/modules/supply/supply-terms.service'
import {
  answerSupply,
  getSupply,
  inviteSupply,
  setSelection,
} from '@anavi/backend/src/modules/supply/supply.service'
import {
  createFitment,
  createFitmentNode,
  setTypeFitment,
} from '@anavi/backend/src/modules/catalog/fitment.service'
import { setProfile } from '@anavi/backend/src/modules/supply/supply-profile.service'
import { updateCategory } from '@anavi/backend/src/modules/catalog/category.service'
import { createType, updateType } from '@anavi/backend/src/modules/dictionary/type.service'
import { createForm, setStructure, updateForm } from '@anavi/backend/src/modules/form/form.service'
import { updateOrgSite } from '@anavi/backend/src/modules/org/org-site.service'
import { createReview } from '@anavi/backend/src/modules/review/review.service'
import type { LocalizedLabel } from '@anavi/shared'
import { resourceJson } from '../lib/resource'
import { dayOfMoment } from '../lib/days'
import { siteIdBySlug } from '../lib/sites'

/*
 * A SHARED SHELF WITH SEVERAL SELLERS ON IT — built by hand-run, and never part of `db:reset`.
 *
 * The demos show one shelf with one seller, and that is what a demo of a market is. It is also why
 * item after item about the shared shelf was checked by a scenario on the service layer and never
 * by a press: there was nothing on any screen to press. This puts the state there — on the demos
 * that exist, through the doors a person would use and in the order they would use them — so that
 * a group, a queue, a seller's own order and an edition with a day can be opened in a browser.
 *
 * It is a FIXTURE FOR A WALK-THROUGH and not a demo: a meat market laying out phones is nobody's
 * shop. It runs once, right after `db:reset`, and refuses a second run: `db:reset` takes all of it
 * away, and there is no second, partial copy of that here. Nothing here is shown to a client.
 *
 * What it builds:
 *   «Дыйкан» (retail) — beside the butcher it already has, two more sellers. One sells for
 *   itself, on terms of its own that let the shelf's discounts reach its goods, is trusted and so
 *   lies on the shelf at once. The other is sold by the market, is not trusted, and its cards WAIT:
 *   the shelf checks new cards. One card of each carries the same barcode, so the platform has a
 *   pair to propose; one kind of goods is named «one of a kind». A review about a seller's card,
 *   and an edition of the terms with a day on it. The market's own «every third item free» is the
 *   demo's and is what a basket of several sellers is pressed against.
 *   And «cannot find it? ask the sellers»: the market names a questionnaire with a photograph for
 *   it, and the self-selling seller's cards lie in one of the market's own sections, so a request
 *   from that section reaches two desks. The requests themselves are pressed.
 *   And the PROFILE: the market gives that section's kind of goods a small applicability tree, and
 *   a third seller that sells for itself lays nothing out and names the section and one make — so
 *   a request for that make reaches three desks, and one for another make two.
 *   «Авто996» (showcase, in dollars) — the oil distributor's call, which the demo leaves standing,
 *   is answered: a seller that sells for itself, in another currency, on the other look.
 *
 * What it does NOT build is anything a person does at a till or in a conversation: orders,
 * complaints and buyers' reviews are what the walk-through itself is there to press.
 */

const MARKET = 'dyikan'
const SELLS_ITSELF = 'watt'
const SOLD_BY_MARKET = 'vega'
const LOT = 'avto996'
const DISTRIBUTOR = 'hanako'
/**
 * The section of the market the self-selling seller's cards are laid into, so that it holds goods
 * of TWO who deal with the buyer themselves — the market and that seller — and «cannot find it?
 * ask the sellers» has two desks to reach. Fridges among washing powders: a walk-through, as above.
 */
const ASK_SECTION = 'bytovaya-himiya'
/**
 * A seller that lays NOTHING out and is asked by its profile alone — the section above and one
 * make of the tree below. A sewing workshop answering about washing machines: a walk-through.
 */
const BY_PROFILE = 'saima'
/** The market's own applicability tree for that section's kind of goods: two levels, three makes. */
const ASK_TREE = 'tehnika'
/**
 * A kind of goods of the section's own, made here. Every section of the market names one kind,
 * «a product», and a tree hung on that would ask «for which make» in the bread section as well.
 */
const ASK_KIND = 'tehnika'
/** The questionnaire the sellers are asked with, made here: the market's demo has no use for one. */
const ASK_FORM = 'sprosit-prodavcov'
/** One code on one card of each of the two sellers: what the platform proposes a pair by. */
const SHARED_CODE = '4700000000017'

interface Words {
  review: { author: string; rating: number; text: LocalizedLabel }
}

async function supplyOf(shop: SiteId, supplier: SiteId, tx: Db | Transaction) {
  const [row] = await tx
    .select()
    .from(supSupply)
    .where(and(eq(supSupply.shopSiteId, shop), eq(supSupply.supplierSiteId, supplier)))
    .limit(1)
  return row ?? null
}

/**
 * The fixture starts from the demo and from nothing else: a second run on its own state would be a
 * walk-through of whatever the first one and the presses since left behind. Taking that back by
 * hand would be a second, partial copy of what `db:reset` does, so it refuses instead and says so.
 */
async function requireFreshReset(tx: Db | Transaction): Promise<void> {
  const market = await siteIdBySlug(MARKET, tx)
  const sellers = [
    await siteIdBySlug(SELLS_ITSELF, tx),
    await siteIdBySlug(SOLD_BY_MARKET, tx),
    await siteIdBySlug(BY_PROFILE, tx),
  ]
  const [laid] = await tx
    .select({ id: supSupply.id })
    .from(supSupply)
    .where(and(eq(supSupply.shopSiteId, market), inArray(supSupply.supplierSiteId, sellers)))
    .limit(1)
  if (laid) throw new Error('shelf: already run on this database — `db:reset`, then run it once')
}

/** A card of this seller to hang the shared code on: its first live variant of its first goods. */
async function firstVariants(
  siteId: SiteId,
  tx: Db | Transaction,
  inSection: bigint | null = null,
) {
  return tx
    .select({
      productId: catProduct.id,
      typeId: catProduct.typeId,
      slug: catProduct.slug,
      variantId: sql<bigint>`min(${catVariant.id})`.mapWith(BigInt),
    })
    .from(catProduct)
    .innerJoin(
      catVariant,
      and(eq(catVariant.productId, catProduct.id), isNull(catVariant.deletedAt)),
    )
    .where(
      and(
        eq(catProduct.siteId, siteId),
        isNull(catProduct.deletedAt),
        eq(catProduct.visible, true),
        ...(inSection === null ? [] : [eq(catProduct.categoryId, inSection)]),
      ),
    )
    .groupBy(catProduct.id)
    .orderBy(catProduct.id)
}

// Who answers for a demo's site in these scenes: its owner, in the owner's chair.
const ownerOf = async (siteId: SiteId, tx: Db | Transaction) =>
  actorOf(await getOrgSite(siteId, tx), 'owner', tx)

export async function seedShelf(): Promise<string[]> {
  const words = await resourceJson<Words>('shared/shelf-run.json')
  const [owner] = await db
    .select({ userId: iamIdentity.userId })
    .from(iamIdentity)
    .where(eq(iamIdentity.identifier, 'owner@anavi.dev'))
    .limit(1)
  if (!owner) throw new Error('shelf: no owner account — run db:reset first')
  const actor = { userId: owner.userId, activeRole: 'owner' as const, viaOrgId: null }
  const told: string[] = []

  await db.transaction(async (tx) => {
    await requireFreshReset(tx)

    const market = await siteIdBySlug(MARKET, tx)
    const sells = await siteIdBySlug(SELLS_ITSELF, tx)
    const sold = await siteIdBySlug(SOLD_BY_MARKET, tx)

    // A card on this shelf needs a page: the complaint, the offers of a group and a buyer's review
    // all stand on it, and the market's demo keeps its pages off.
    await updateOrgSite(market, { productPages: true }, tx)
    await updateSupplyTerms(market, { namesSupplier: true }, tx)
    const general = (await currentTerms(market, tx))!

    // The seller the MARKET sells for, on the shelf's general terms. Everything it has goes out.
    const plain = await inviteSupply(
      market,
      { address: SOLD_BY_MARKET, as: 'shop' },
      await ownerOf(market, tx),
      tx,
    )
    await answerSupply(
      sold,
      plain.id,
      'accept',
      { terms: String(general.id) },
      await ownerOf(sold, tx),
      tx,
    )
    await setSelection(sold, plain.id, { scope: 'all', targets: [] }, tx)

    // The seller that sells for ITSELF: terms of its own, put before it while the call stands,
    // and they let the shelf's discounts reach its goods. One section of its catalogue goes out —
    // a whole wholesaler's list on a market's shelf would bury everything else on it.
    const own = await inviteSupply(
      market,
      { address: SELLS_ITSELF, as: 'shop' },
      await ownerOf(market, tx),
      tx,
    )
    const offered = await proposeTerms(
      market,
      own.id,
      { seller: 'supplier', commission: 500, days: 14, discounts: true, original: 'shop' },
      actor,
      tx,
    )
    await answerSupply(
      sells,
      own.id,
      'accept',
      { terms: String(offered.termsId) },
      await ownerOf(sells, tx),
      tx,
    )
    const [section] = await tx.execute<{ id: string; goods: number }>(sql`
      select category_id as id, count(*)::int as goods from cat_product
       where site_id = ${sells} and deleted_at is null and visible and category_id is not null
       group by category_id having count(*) between 4 and 30 order by category_id limit 1`)
    if (!section) throw new Error(`shelf: «${SELLS_ITSELF}» has no section of a size to send`)
    await setSelection(
      sells,
      own.id,
      { scope: 'picked', targets: [{ type: 'category', id: section.id }] },
      tx,
    )

    // One code on one card of each: the pair the platform proposes. And one KIND of the market-sold
    // seller's goods named «one of a kind» — a card that may be found and may not be picked.
    const ofSells = await firstVariants(sells, tx, BigInt(section.id))
    const ofSold = await firstVariants(sold, tx)
    if (!ofSells[0] || !ofSold[0]) throw new Error('shelf: a seller has no card to carry the code')
    await addBarcode(sells, ofSells[0].variantId, { code: SHARED_CODE }, tx)
    await addBarcode(sold, ofSold[0].variantId, { code: SHARED_CODE }, tx)
    const lone = ofSold.find((one) => one.typeId !== null && one.typeId !== ofSold[0]!.typeId)
    if (lone?.typeId) await updateType(sold, lone.typeId, { singular: true }, tx)

    // The shelf checks new cards — switched on BEFORE anything is laid out, so the untrusted
    // seller's cards are born waiting and the trusted one's are not.
    await updateSupplyTerms(market, { review: true }, tx)
    const bare = { markupKind: null, markupValue: null, section: null }
    // Into one of the market's own sections — see `ASK_SECTION`.
    await setShelf(
      market,
      own.id,
      { fills: true, trusted: true, ...bare, section: ASK_SECTION },
      tx,
    )
    await setShelf(market, plain.id, { fills: true, trusted: false, ...bare }, tx)

    // The questionnaire the sellers are asked with: what is sought, a photograph of it, and who
    // asks. Made once; a later run finds it and only gives it the mark back.
    const [standingForm] = await tx
      .select()
      .from(formForm)
      .where(
        and(eq(formForm.siteId, market), eq(formForm.slug, ASK_FORM), isNull(formForm.deletedAt)),
      )
      .limit(1)
    const askForm =
      standingForm ??
      (await createForm(
        market,
        null,
        {
          slug: ASK_FORM,
          name: { ru: 'Спросить продавцов', en: 'Ask the sellers', ky: 'Сатуучулардан суроо' },
          success: {
            ru: 'Спросили — ответ каждого продавца придёт отдельно.',
            en: 'Asked — each seller will answer separately.',
            ky: 'Сурадык — ар бир сатуучунун жообу өзүнчө келет.',
          },
        },
        tx,
      ))
    if (!standingForm) {
      await setStructure(
        market,
        askForm.id,
        {
          steps: [],
          fields: [
            {
              key: 'thing',
              type: 'textarea',
              label: { ru: 'Что ищете', en: 'What you are looking for', ky: 'Эмне издеп жатасыз' },
              placeholder: {
                ru: 'Название, модель, размер — что знаете',
                en: 'Name, model, size — whatever you know',
                ky: 'Аталышы, модели, өлчөмү — билгениңизди жазыңыз',
              },
              isRequired: true,
            },
            {
              key: 'photo',
              type: 'file',
              label: { ru: 'Фото', en: 'Photo', ky: 'Сүрөт' },
            },
            {
              key: 'name',
              type: 'text',
              role: 'name',
              label: { ru: 'Имя', en: 'Name', ky: 'Атыңыз' },
              isRemembered: true,
              isRequired: true,
            },
            {
              key: 'phone',
              type: 'phone',
              role: 'phone',
              label: { ru: 'Телефон', en: 'Phone', ky: 'Телефон' },
              isRemembered: true,
              isRequired: true,
            },
          ],
          outcomes: [],
        },
        tx,
      )
    }
    await updateForm(market, askForm.id, { sellers: true }, tx)

    // «For what»: a tree of the market's own on the kind of goods that section names, and a seller
    // asked by its word alone — it sells for itself, lays nothing out, and says what it deals in.
    const [askSection] = await tx
      .select()
      .from(catCategory)
      .where(and(eq(catCategory.siteId, market), eq(catCategory.slug, ASK_SECTION)))
      .limit(1)
    if (!askSection) throw new Error(`shelf: the market has no section «${ASK_SECTION}»`)
    const [standingKind] = await tx
      .select()
      .from(catType)
      .where(and(eq(catType.siteId, market), eq(catType.slug, ASK_KIND), isNull(catType.deletedAt)))
      .limit(1)
    const askKind =
      standingKind ??
      (await createType(
        market,
        { slug: ASK_KIND, name: { ru: 'Техника', en: 'Appliances', ky: 'Техника' } },
        tx,
      ))
    await updateCategory(market, askSection.id, { type: ASK_KIND }, tx)
    const tree = await createFitment(
      market,
      {
        slug: ASK_TREE,
        name: { ru: 'Техника', en: 'Appliances', ky: 'Техника' },
        levels: [
          { ru: 'Марка', en: 'Make', ky: 'Марка' },
          { ru: 'Серия', en: 'Series', ky: 'Серия' },
        ],
      },
      tx,
    )
    const makes: Record<string, string[]> = {
      Bosch: ['Serie 4', 'Serie 6'],
      LG: ['F2', 'F4'],
      Samsung: ['WW60', 'WW70'],
    }
    let named: bigint | null = null
    for (const [make, series] of Object.entries(makes)) {
      const slug = make.toLowerCase()
      const top = await createFitmentNode(
        market,
        tree.id,
        { slug, label: { ru: make, en: make, ky: make } },
        tx,
      )
      if (make === 'Bosch') named = top.id
      for (const one of series)
        await createFitmentNode(
          market,
          tree.id,
          {
            parentId: top.id,
            slug: `${slug}-${one.toLowerCase().replace(/\s+/g, '-')}`,
            label: { ru: one, en: one, ky: one },
          },
          tx,
        )
    }
    await setTypeFitment(askKind.id, tree.id, tx)
    const byProfile = await siteIdBySlug(BY_PROFILE, tx)
    const word = await inviteSupply(
      market,
      { address: BY_PROFILE, as: 'shop' },
      await ownerOf(market, tx),
      tx,
    )
    const wordTerms = await proposeTerms(
      market,
      word.id,
      { seller: 'supplier', commission: 500, days: 14, discounts: false, original: 'shop' },
      actor,
      tx,
    )
    await answerSupply(
      byProfile,
      word.id,
      'accept',
      { terms: String(wordTerms.termsId) },
      await ownerOf(byProfile, tx),
      tx,
    )
    await setProfile(
      byProfile,
      word.id,
      { sections: [String(askSection.id)], fits: [String(named)] },
      tx,
    )

    // What the market wrote down about the seller's card: something for the seller to answer. Typed
    // in by the shop and not written by an order, so the seller's rating on this shelf — which is
    // made of buyers' own words alone — does not count it.
    const [laid] = await tx
      .select({ slug: supPlacement.slug })
      .from(supPlacement)
      .innerJoin(catProduct, eq(catProduct.id, supPlacement.productId))
      .where(and(eq(supPlacement.siteId, market), eq(catProduct.siteId, sells)))
      .orderBy(supPlacement.id)
      .limit(1)
    if (laid) await createReview(market, { ...words.review, product: laid.slug }, tx)

    // The next edition, with a day on it: the suppliers on the general terms are asked, and told
    // until when. A commission one point higher, so there is something to agree to.
    const day = dayOfMoment(new Date(Date.now() + 10 * 864e5))
    const next = await publishTerms(
      market,
      {
        seller: general.seller,
        commission: general.commission + 100,
        days: general.days,
        discounts: general.discounts,
        original: general.original,
        text: general.text,
        dueOn: day,
      },
      actor,
      tx,
    )

    // The other look, and another currency: the distributor's call to the car lot is answered.
    const lot = await siteIdBySlug(LOT, tx)
    const distributor = await siteIdBySlug(DISTRIBUTOR, tx)
    const call = await supplyOf(lot, distributor, tx)
    if (!call) throw new Error('shelf: the distributor has not called the lot — run db:reset first')
    await answerSupply(
      lot,
      call.id,
      'accept',
      { terms: String(call.termsId) },
      await ownerOf(lot, tx),
      tx,
    )
    await updateSupplyTerms(lot, { namesSupplier: true }, tx)
    await setShelf(lot, call.id, { fills: true, trusted: true, ...bare }, tx)

    const count = async (shop: SiteId, seller: SiteId, where = sql`true`) =>
      (
        await tx.execute<{ n: number }>(sql`
          select count(*)::int as n from sup_placement pl join cat_product p on p.id = pl.product_id
           where pl.site_id = ${shop} and p.site_id = ${seller} and ${where}`)
      )[0]!.n
    const standing = await getSupply(market, own.id, tx)
    told.push(
      `${MARKET}: ${SELLS_ITSELF} sells for itself (${standing.terms.seller}, discounts ${standing.terms.discounts}) — ${await count(market, sells)} cards on the shelf`,
      `${MARKET}: ${SOLD_BY_MARKET} is sold by the market — ${await count(market, sold, sql`pl.pending_at is not null`)} cards wait for the shelf's word`,
      `${MARKET}: one barcode on «${ofSells[0].slug}» and «${ofSold[0].slug}»${lone ? `; «${lone.slug}» is one of a kind` : ''}`,
      `${MARKET}: edition ${next.terms.number} waits until ${day} — asked of ${next.asked}`,
      `${MARKET}: «${ASK_FORM}» asks the sellers; section «${ASK_SECTION}» holds the market's goods and ${await count(market, sells, sql`pl.category_id is not null`)} cards of ${SELLS_ITSELF}`,
      `${MARKET}: ${BY_PROFILE} lays nothing out and is asked by its profile — «${ASK_SECTION}», for Bosch; the section asks «for what» by the tree «${ASK_TREE}»`,
      `${LOT}: ${DISTRIBUTOR} sells for itself in another currency — ${await count(lot, distributor)} cards on the shelf`,
    )
  })
  return told
}
