import { hasFeature, withFeature, type SiteFeature, type SiteFeatures } from '@anavi/shared'

/*
 * What every demo kept before these switches existed: articles, reviews, the knowledge base, partners
 * and carriers had no switch and stood everywhere, and what stood on goods, stock and the basket
 * (fitments, supplies, storage, promo codes, other organizations' instalments) stood wherever those did.
 *
 * Written once for the demos so each keeps showing what its material was made for. A client's site
 * says what it keeps in its own walk, and keeps less.
 */
const EVERYWHERE: SiteFeature[] = ['posts', 'reviews', 'faq', 'partners', 'carriers']
const WITH: [SiteFeature, SiteFeature][] = [
  ['fitments', 'goods'],
  ['supply', 'goods'],
  ['storage', 'stock'],
  ['discounts', 'cart'],
  ['lenders', 'cart'],
]

export function keptByAll(features: SiteFeatures): SiteFeatures {
  let out = features
  for (const one of EVERYWHERE) out = withFeature(out, one, true)
  for (const [one, needs] of WITH) if (hasFeature(out, needs)) out = withFeature(out, one, true)
  return out
}
