import { updateReferralTerms } from '@anavi/backend/src/modules/referral/site-terms.service'
import { keptByAll } from '../../../seed/lib/features'
import { updateCatalogTerms } from '@anavi/backend/src/modules/catalog/site-terms.service'
import { updateOrderTerms } from '@anavi/backend/src/modules/order/site-terms.service'
import { seedSaimaServices } from './services'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import { openLending } from '../../../seed/lib/instalments'
import { createProgram } from '@anavi/backend/src/modules/instalment/program.service'
import { seedOrgWithSite, verifyOrg } from '../../../seed/lib/owner'
import {
  setSiteLogo,
  setSitePublished,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { assetFile, findImage } from '../../../seed/lib/assets'
import { seedHighlights } from '../../../seed/lib/highlights'
import { seedPlaces } from '../../../seed/lib/places'
import { seedDictionary, seedGarments, seedSelections, seedShelves } from './catalog'
import { seedChat, seedCheckout, seedRequest } from './forms'
import {
  seedCatalogPage,
  seedContactsPage,
  seedFaq,
  seedHomePage,
  seedMenu,
  seedOptPage,
  seedPartnersPage,
  seedPrivacyPage,
  seedProductionPage,
  seedWorks,
  seedWorksPage,
} from './site'
import { SAIMA_DOLLAR, SAIMA_ORG, SAIMA_PLACES, SAIMA_TIERS } from './index'
import { seedSaimaExport } from './markets'
import { quoteRate } from '@anavi/shared'
import { seedRequisite } from '../../../seed/lib/requisite'
import { seedAgency, seedSeller } from '../../../seed/lib/partners'
import type { OrgId, SiteId } from '@anavi/backend/src/db/ids'

export async function seedSaima(ownerId: bigint, tx: Db | Transaction) {
  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: SAIMA_ORG.name,
      slug: SAIMA_ORG.slug,
      defaultLocale: SAIMA_ORG.defaultLocale,
      locales: SAIMA_ORG.locales,
    },
    tx,
  )

  const share = await findImage('demos/saima/share.webp', SAIMA_ORG.name)
  await updateOrgSite(
    site.id,
    {
      currency: SAIMA_ORG.currency,
      tagline: SAIMA_ORG.tagline,
      about: SAIMA_ORG.about,
      deliveryNote: SAIMA_ORG.deliveryNote,
      paymentNote: SAIMA_ORG.paymentNote,
      warrantyNote: SAIMA_ORG.warrantyNote,
      channels: SAIMA_ORG.channels,
      mapProvider: SAIMA_ORG.mapProvider,
      features: keptByAll(SAIMA_ORG.features),
      ...(share ? { ogImage: { key: share.key, width: share.width, height: share.height } } : {}),
    },
    tx,
  )
  // After the currency and on its own: changing the base wipes the hung rates. Read in dollars at
  // the workshop's own sign, «1 $ = 87,50 сом», which the export market's orders are counted by.
  await updateOrgSite(site.id, { rates: { USD: quoteRate(SAIMA_DOLLAR, 'KGS', 'USD') } }, tx)
  await seedRequisite(org.id, ownerId, SAIMA_ORG.payment, tx)
  await updateOrderTerms(
    site.id,
    {
      fulfilments: SAIMA_ORG.fulfilments,
      payWays: ['transfer'],
      correction: SAIMA_ORG.correction,
    },
    tx,
  )
  const SAIMA_RUN_MIN = 100
  await updateCatalogTerms(
    site.id,
    {
      shortage: SAIMA_ORG.shortage,
      // Said once for the whole workshop: every model is sold by the same steps, and no card
      // repeats them — the goods inherit the site's ladder.
      tiers: SAIMA_TIERS,
      // …and sews a run of a model: no order from the storefront takes fewer than a hundred pieces
      // of it, every size and colour together.
      runMin: SAIMA_RUN_MIN,
    },
    tx,
  )
  await setZones(site.id, SAIMA_ORG.zones, tx)
  await updateSiteTheme(site.id, SAIMA_ORG.theme, tx)
  await setSiteLogo(site.id, await assetFile('demos/saima/logo.svg', 'image/svg+xml'), tx)
  await seedPlaces(site.id, SAIMA_PLACES, tx)

  await seedDictionary(site.id, tx)
  const shelves = await seedShelves(site.id, tx)
  await seedGarments(site.id, shelves, tx)
  await seedSelections(site.id, tx)
  await seedSaimaExport(site.id, ownerId, tx)
  await seedHighlights(site.id, tx)
  await seedFaq(site.id, tx)
  await seedWorks(site.id, tx)

  await seedHomePage(site.id, tx)
  await seedCatalogPage(site.id, tx)
  await seedOptPage(site.id, tx)
  await seedProductionPage(site.id, tx)
  await seedWorksPage(site.id, tx)
  await seedPartnersPage(site.id, tx)
  await seedContactsPage(site.id, tx)
  await seedPrivacyPage(site.id, tx)

  /*
   * The workshop does not cut cloth on a promise. A run — and anything the warehouse cannot cover,
   * which is sewn to the order — is begun with thirty per cent, and the rest is paid when the
   * boxes are handed over. A CONDITION and not an offer; below its least sum a piece off the rail
   * is simply sold, and an order nobody has priced yet takes it whatever the sum turns out to be.
   */
  await openLending(org.id, tx)
  await createProgram(
    org.id,
    {
      name: {
        ru: 'Задаток за партию',
        en: 'Deposit for a run',
        ar: 'عربون الدفعة',
      },
      terms: {
        ru: 'Партию и всё, что шьём под заказ, запускаем после задатка 30%. Остаток — при получении, без наценки.',
        en: 'A run, and anything sewn to order, is started after a 30% deposit. The rest is paid on receipt, with nothing added.',
        ar: 'نبدأ إنتاج الدفعة وكل ما يُخاط حسب الطلب بعد عربون 30%. الباقي عند الاستلام، دون أي زيادة.',
      },
      months: 0,
      down: 3000,
      markup: 0,
      minSum: 2000000,
      placements: [{ siteId: site.id, isRequired: true }],
    },
    tx,
  )
  await seedPartners(org.id, site.id, ownerId, tx)
  await seedChat(site.id, tx)
  await seedCheckout(site.id, tx)
  await seedRequest(site.id, tx)
  await seedSaimaServices(site.id, tx)
  await seedMenu(site.id, tx)

  await verifyOrg(org.id, ownerId, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

/**
 * Who earns on what they bring: a showroom that sends small brands to the workshop and the manager
 * who runs the wholesale clients.
 *
 * The showroom is INVITED and the invitation is taken by an organization that signed itself up with
 * no site of its own — the shape the platform describes for a partner. The manager is appointed out
 * of the staff. Neither earns through a code: a run of three hundred hoodies is agreed in a
 * conversation, and the order is written out of it naming who brought the client.
 */
async function seedPartners(
  orgId: OrgId,
  siteId: SiteId,
  ownerId: bigint,
  tx: Db | Transaction,
): Promise<void> {
  const actor = { userId: ownerId, activeRole: 'owner' as const, viaOrgId: null }
  await updateReferralTerms(
    siteId,
    { partnerRewardKind: 'percent', partnerRewardValue: 500 },
    actor,
    tx,
  )
  await seedAgency(
    siteId,
    actor,
    {
      label: 'Ала-Тоо Маркет',
      name: 'Ала-Тоо Маркет',
      person: 'Жибек Орозбекова',
      email: 'partners@alatoo-market.dev',
      rewardKind: 'percent',
      rewardValue: 700,
    },
    tx,
  )
  await seedSeller(
    orgId,
    siteId,
    actor,
    {
      login: 'saima-opt',
      name: 'Айгерим Сыдыкова',
      title: { ru: 'Менеджер по опту', en: 'Wholesale manager', ar: 'مديرة مبيعات الجملة' },
      rewardKind: 'percent',
      rewardValue: 250,
    },
    tx,
  )
}
