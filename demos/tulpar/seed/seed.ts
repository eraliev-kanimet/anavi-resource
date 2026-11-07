import { assetFile } from '../../../seed/lib/assets'
import { keptByAll } from '../../../seed/lib/features'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { updateOrderTerms } from '@anavi/backend/src/modules/order/site-terms.service'
import { permissionsFor, quoteRate } from '@anavi/shared'
import { updateOrg } from '@anavi/backend/src/modules/org/org.service'
import {
  setSitePublished,
  setSiteLogo,
  updateOrgSite,
  updateSiteTheme,
} from '@anavi/backend/src/modules/org/org-site.service'
import { createPlace } from '@anavi/backend/src/modules/org/place.service'
import { setOperators } from '@anavi/backend/src/modules/shipment/point.service'
import { createStaffLogin, updateStaff } from '@anavi/backend/src/modules/staff/staff.service'
import type { OrgId } from '@anavi/backend/src/db/ids'
import { seedOrgWithSite, verifyOrg } from '../../../seed/lib/owner'
import { seedRequisite } from '../../../seed/lib/requisite'
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
      features: keptByAll(TULPAR.features),
      rates: { USD: quoteRate(TULPAR.dollar, TULPAR.currency, 'USD') },
    },
    tx,
  )
  // Carriage is paid for by transfer: a buyout is an ordinary order, and its till points at the account.
  for (const payment of material.payments) await seedRequisite(org.id, ownerId, payment, tx)
  await updateOrderTerms(site.id, { payWays: ['transfer'] }, tx)
  await updateSiteTheme(site.id, TULPAR.theme, tx)
  await setSiteLogo(site.id, await assetFile('demos/tulpar/logo.svg', 'image/svg+xml'), tx)

  // One after another: the order of the file is the order the storefront prints, and the first
  // point — the warehouse — is the one it treats as the main.
  const placed = new Map<string, bigint>()
  for (const place of material.places) {
    const row = await createPlace(
      site.id,
      {
        name: place.name,
        address: place.address,
        city: place.cityKey,
        hours: place.hours,
        phone: place.phone,
        lat: place.lat,
        lng: place.lng,
        isPickup: place.isPickup,
      },
      tx,
    )
    placed.set(place.key, row.id)
  }

  const people = await seedStaff(org.id, ownerId, material.staff, tx)

  // The tariff before the forms, the forms and the content before the pages: a calculator asks
  // with the directions, a button names a form, and a block lists posts that must already exist.
  // The counters stand where their places say, in the cities the tariff has just listed.
  await seedTariff(site.id, tx)
  await seedFleet(site.id, people.users, tx)
  // Whoever stands at a counter is put there by the desk, as the owner does it from the point's card.
  for (const person of material.staff) {
    const stands = (person.stands ?? []).flatMap((key) =>
      placed.has(key) ? [placed.get(key)!] : [],
    )
    for (const placeId of stands)
      await setOperators(
        site.id,
        placeId,
        people.owner,
        { userIds: [people.users.get(person.login)!] },
        tx,
      )
  }
  await seedForms(site.id, material, tx)
  await seedContent(site.id, tx)
  await seedPages(site.id, material, tx)

  await updateOrg(org.id, material.legal, tx)
  await verifyOrg(org.id, ownerId, tx)
  await setSitePublished(site.id, true, tx)

  return site
}

/*
 * Everybody who works here, each in ONE role: a dispatcher, couriers, a storekeeper, a manager, the
 * line-haul driver of the book and the operator of the central pickup counter — the last two have
 * their own screens (`/driver`, `/point`) and a demo that gave nobody the role never showed them.
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
) {
  const owner = {
    userId: ownerId,
    activeRole: 'owner' as const,
    viaOrgId: null,
    permissions: permissionsFor(['owner']),
  }
  const users = new Map<string, bigint>()
  for (const person of people) {
    const { staff } = await createStaffLogin(
      orgId,
      { login: person.login, password: 'password', name: person.name, roles: [person.role] },
      owner,
      tx,
    )
    await updateStaff(orgId, staff.id, { title: person.title }, owner, tx)
    users.set(person.login, staff.userId)
  }
  return { users, owner }
}
