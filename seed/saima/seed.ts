import type { Db, Transaction } from '@anavi/backend/src/db'
import { setOrgVerification } from '@anavi/backend/src/modules/admin/admin.service'
import { setZones } from '@anavi/backend/src/modules/order/zone.service'
import { seedOrgWithSite } from '../owner'
import {
  setSiteLogo,
  setSitePublished,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { assetFile, findImage } from '../assets'
import { seedHighlights } from '../highlights'
import { seedPlaces } from '../places'
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
import { SAIMA_ORG, SAIMA_PLACES } from './index'
import { seedRequisite } from '../requisite'
import { seedAgency, seedSeller } from '../partners'
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

  const share = await findImage('saima/share.webp', SAIMA_ORG.name)
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
      features: SAIMA_ORG.features,
      fulfilments: SAIMA_ORG.fulfilments,
      correction: SAIMA_ORG.correction,
      shortage: SAIMA_ORG.shortage,
      ...(share ? { ogImage: { key: share.key, width: share.width, height: share.height } } : {}),
    },
    tx,
  )
  await setZones(site.id, SAIMA_ORG.zones, tx)
  await updateSiteTheme(site.id, SAIMA_ORG.theme, tx)
  await setSiteLogo(site.id, await assetFile('saima/logo.png', 'image/png'), tx)
  await seedPlaces(site.id, SAIMA_PLACES, tx)

  await seedDictionary(site.id, tx)
  const shelves = await seedShelves(site.id, tx)
  await seedGarments(site.id, shelves, tx)
  await seedSelections(site.id, tx)
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

  await seedRequisite(org.id, ownerId, SAIMA_ORG.payment, tx)
  await seedPartners(org.id, site.id, ownerId, tx)
  await seedChat(site.id, tx)
  await seedCheckout(site.id, tx)
  await seedRequest(site.id, tx)
  await seedMenu(site.id, tx)

  await setOrgVerification(org.id, { verification: 'verified' }, tx)
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
  const actor = { userId: ownerId, activeRole: 'owner' as const }
  await updateOrgSite(siteId, { partnerRewardKind: 'percent', partnerRewardValue: 5 }, tx)
  await seedAgency(
    siteId,
    actor,
    {
      label: 'Ала-Тоо Маркет',
      name: 'Ала-Тоо Маркет',
      person: 'Жибек Орозбекова',
      email: 'partners@alatoo-market.dev',
      rewardKind: 'percent',
      rewardValue: 7,
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
      rewardValue: 2,
    },
    tx,
  )
}
