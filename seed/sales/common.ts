import { resourceJson } from '../resource'

/**
 * The little that ten demos genuinely share: the names of the banks a receipt is drawn on, and the
 * words an order's journal is written in.
 *
 * It used to carry the material a general script was assembled from as well — forty people, six
 * ways of saying «здравствуйте», three pools of stock answers — and that script is gone: every demo
 * writes its own appeals and its own orders, so the pools were read by nobody. What is left is here
 * because it belongs to the ENGINE's side of a sale rather than to any business's voice: a status
 * comment and a bank name would read the same in all ten.
 */
export interface OrderWords {
  discount: string
  discountComment: string
  removed: string
  priced: string
  raised: string
  lowered: string
  confirmed: string
  status: Record<string, string>
}

export interface CommonScript {
  orders: { banks: string[]; words: Record<string, OrderWords> }
}

export function loadCommon(): Promise<CommonScript> {
  return resourceJson<CommonScript>('sales.json')
}

export function wordsIn(common: CommonScript, locale: string): OrderWords {
  return common.orders.words[locale] ?? common.orders.words.ru!
}

/** The telephone as the engine keeps it — an answered form strips the spaces out of one. */
export function digitsOf(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}
