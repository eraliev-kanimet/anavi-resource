import type { Db, Transaction } from '@anavi/backend/src/db'
import { permissionsFor, quoteRate } from '@anavi/shared'
import { setOrgVerification } from '@anavi/backend/src/modules/admin/admin.service'
import { updateOrg } from '@anavi/backend/src/modules/org/org.service'
import {
  setSitePublished,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { createPlace } from '@anavi/backend/src/modules/org/place.service'
import { createStaffLogin, updateStaff } from '@anavi/backend/src/modules/staff/staff.service'
import type { OrgId } from '@anavi/backend/src/db/ids'
import { seedOrgWithSite } from '../owner'
import { seedRequisite } from '../requisite'
import { TULPAR, type TulparStaff } from './index'
import { seedContent, seedForms, seedPages, seedTariff, tulparSiteFile } from './site'
import { seedFleet } from './hauls'

export async function seedTulpar(ownerId: bigint, tx: Db | Transaction) {
  const material = await tulparSiteFile()
  const { org, site } = await seedOrgWithSite(
    ownerId,
    {
      name: material.org.name,
      slug: material.org.slug,
      defaultLocale: TULPAR.defaultLocale,
      locales: TULPAR.locales,
    },
    tx,
  )

  await updateOrgSite(
    site.id,
    {
      currency: TULPAR.currency,
      country: TULPAR.country,
      tagline: material.org.tagline,
      about: material.org.about,
      mapProvider: TULPAR.mapProvider,
      features: TULPAR.features,
      rates: { USD: quoteRate(TULPAR.dollar, TULPAR.currency, 'USD') },
    },
    tx,
  )
  await updateSiteTheme(site.id, TULPAR.theme, tx)

  // One after another: the order of the file is the order the storefront prints, and the first
  // point — the warehouse — is the one it treats as the main.
  for (const place of material.places) {
    await createPlace(
      site.id,
      {
        name: place.name,
        address: place.address,
        hours: place.hours,
        phone: place.phone,
        lat: place.lat,
        lng: place.lng,
        isPickup: place.isPickup,
      },
      tx,
    )
  }

  await seedStaff(org.id, ownerId, material.staff, tx)

  // The tariff before the forms, the forms and the content before the pages: a calculator asks
  // with the directions, a button names a form, and a block lists posts that must already exist.
  await seedTariff(site.id, tx)
  await seedFleet(site.id, tx)
  await seedForms(site.id, material, tx)
  await seedContent(site.id, tx)
  await seedPages(site.id, material, tx)
  for (const payment of TULPAR.payments) await seedRequisite(org.id, ownerId, payment, tx)

  await updateOrg(org.id, TULPAR.legal, tx)
  await setOrgVerification(org.id, { verification: 'verified' }, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

/*
 * Everybody who works here, each in ONE role — and every role carriage and the warehouse brought.
 *
 * They sign in with a login the owner issued rather than an address: a storekeeper and a courier
 * are the people least likely to have a work mailbox, and that door exists for them. Three couriers
 * and not one, because a round divided between districts is the whole of what a dispatcher does;
 * with a single courier there is nothing to divide.
 */
async function seedStaff(
  orgId: OrgId,
  ownerId: bigint,
  people: TulparStaff[],
  tx: Db | Transaction,
): Promise<void> {
  const owner = {
    userId: ownerId,
    activeRole: 'owner' as const,
    permissions: permissionsFor(['owner']),
  }
  for (const person of people) {
    const { staff } = await createStaffLogin(
      orgId,
      { login: person.login, password: 'password', name: person.name, roles: [person.role] },
      owner,
      tx,
    )
    await updateStaff(orgId, staff.id, { title: person.title }, owner, tx)
  }
}
