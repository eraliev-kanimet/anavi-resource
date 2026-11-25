import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { and, eq, inArray } from '@anavi/backend/src/db'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { catType } from '@anavi/backend/src/db/schema/cat'
import type { SiteId } from '@anavi/backend/src/db/ids'
import { orgSite } from '@anavi/backend/src/db/schema/org'
import { putBrief } from '@anavi/backend/src/modules/ai/brief.service'
import { setTariff, topUp } from '@anavi/backend/src/modules/ai/allowance.service'
import { giveConsent } from '@anavi/backend/src/modules/ai/consent'
import { createPreset } from '@anavi/backend/src/modules/ai/preset.service'
import { AI_CONSENT_VERSION, type AiScope } from '@anavi/shared'
import type { Actor } from '@anavi/backend/src/lib/actor'

/*
 * WHAT EACH DEMO TELLS THE AGENT ABOUT ITSELF — its own words, kept as data beside its material
 * (`demos/<slug>/brief.json`) and written through the service a person's own words go through. A
 * demo without the file says nothing; a kind the file names that the demo never made fails the
 * reset, because words about a kind nobody keeps are a fixture gone wrong, not a choice.
 */

interface Brief {
  site: { trade?: string; cards?: string }
  kinds?: Record<string, { cards?: string }>
}

export async function seedBrief(slug: string, siteId: SiteId, tx: Db | Transaction) {
  const file = resolve(import.meta.dir, '../../demos', slug, 'brief.json')
  if (!existsSync(file)) return
  const brief = (await Bun.file(file).json()) as Brief
  // The kinds are named by their slugs in the file and by their ids at the door: found first, then
  // written with the site's words in the one call a person's «save» makes.
  const kinds: { id: bigint; cards: string }[] = []
  for (const [kind, words] of Object.entries(brief.kinds ?? {})) {
    const [type] = await tx
      .select({ id: catType.id })
      .from(catType)
      .where(and(eq(catType.siteId, siteId), eq(catType.slug, kind)))
      .limit(1)
    if (!type)
      throw new Error(
        `demos/${slug}/brief.json names the kind «${kind}», which the demo does not make`,
      )
    kinds.push({ id: type.id, cards: words.cards ?? '' })
  }
  await putBrief(siteId, { ...brief.site, kinds }, tx as Transaction)
}

/*
 * HOW EACH DEMO SHOOTS ITS GOODS — its presets (`demos/<slug>/presets.json`): a name, the words of the presentation
 * and, where the demo has decided them, the ground and the way a frame is made. Written through the service a
 * person's own presets go through. A demo without the file has none, and its goods are shot the platform's way.
 */
export async function seedPresets(slug: string, siteId: SiteId, tx: Db | Transaction) {
  const file = resolve(import.meta.dir, '../../demos', slug, 'presets.json')
  if (!existsSync(file)) return
  // A preset names the kinds it is the way of by their slugs; a slug the demo never made fails the reset.
  const presets = (await Bun.file(file).json()) as { kinds?: string[] }[]
  for (const { kinds = [], ...preset } of presets) {
    const ids = kinds.length
      ? await tx
          .select({ id: catType.id, slug: catType.slug })
          .from(catType)
          .where(and(eq(catType.siteId, siteId), inArray(catType.slug, kinds)))
      : []
    const missing = kinds.filter((slug) => !ids.some((one) => one.slug === slug))
    if (missing.length) throw new Error(`presets of ${slug}: no kind ${missing.join(', ')}`)
    await createPreset(siteId, { ...preset, kinds: ids.map((one) => one.id) }, tx as Transaction)
  }
}

/*
 * THE AGENT READY TO TRY ON A DEMO: the platform's tariff (`platform/agent.json`), and for a demo whose folder says so
 * (`demos/<slug>/agent.json`) its organization's wallet topped up as a gift and its consent given at the version that
 * stands — so a reset does not leave the agent closed until somebody sets the three by hand. Written through the doors
 * the platform's administrator and the organization's owner press; the seed calls no model.
 */
export async function seedAgentTariff(tx: Transaction) {
  const file = resolve(import.meta.dir, '../../platform/agent.json')
  if (!existsSync(file)) return
  const { tariff } = (await Bun.file(file).json()) as { tariff?: unknown }
  if (tariff) await setTariff(tariff, tx)
}

export async function seedAgent(slug: string, siteId: SiteId, owner: Actor, tx: Transaction) {
  const file = resolve(import.meta.dir, '../../demos', slug, 'agent.json')
  if (!existsSync(file)) return
  const agent = (await Bun.file(file).json()) as {
    // A gift, in dollars: the wallet's own money.
    wallet?: string
    // Money the client paid, in its own money, and the dollars it went in for (the seed holds no bank rate).
    paid?: { sum: string; currency: string; dollars: string }
    consents?: AiScope[]
  }
  const [site] = await tx
    .select({ orgId: orgSite.orgId })
    .from(orgSite)
    .where(eq(orgSite.id, siteId))
    .limit(1)
  if (agent.wallet) {
    await topUp(
      site!.orgId,
      {
        key: crypto.randomUUID(),
        reason: 'gift',
        amount: agent.wallet,
        note: 'Демо: агент готов к пробе',
      },
      tx,
    )
  }
  if (agent.paid) {
    await topUp(
      site!.orgId,
      {
        key: crypto.randomUUID(),
        reason: 'paid',
        paid: agent.paid.sum,
        currency: agent.paid.currency,
        amount: agent.paid.dollars,
        note: 'Демо: оплата клиента',
      },
      tx,
    )
  }
  for (const scope of agent.consents ?? []) {
    await giveConsent(siteId, { scope, version: AI_CONSENT_VERSION[scope] }, owner, tx)
  }
}
