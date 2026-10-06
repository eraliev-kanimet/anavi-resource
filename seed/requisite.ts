import { emvCrc, writeTlv } from '@anavi/shared'
import type { Db, Transaction } from '@anavi/backend/src/db'
import { drawQrPng } from '@anavi/backend/src/lib/qr'
import { createRequisite } from '@anavi/backend/src/modules/org/requisite.service'
import { ru } from './labels'
import type { OrgId } from '@anavi/backend/src/db/ids'

export interface SeedPayment {
  label: string
  merchant: string
  city: string
  /** two-letter country code */
  country: string
  /** ISO 4217 numeric — "417" for KGS */
  currency: string
  /** merchant category code */
  mcc: string
  account: string
  scheme: string
}

/**
 * Organization requisite: payment payload is assembled following EMVCo, rendered to an image,
 * and passed through the same ingestion pipeline that owners use for bank photos. The seed does
 * not write a raw row to the database — bypassing validation would not prove that the gateway works.
 *
 * The payee is intentionally named in Cyrillic: the checksum is calculated over UTF-8 bytes,
 * which was the exact case that broke the initial implementation.
 */
export async function seedRequisite(
  orgId: OrgId,
  ownerId: bigint,
  pay: SeedPayment,
  tx: Db | Transaction,
) {
  const body = `${writeTlv([
    { id: '00', value: '01' },
    // "11" — reusable QR: amount is filled in by the order, not the merchant
    { id: '01', value: '11' },
    {
      id: '29',
      value: writeTlv([
        { id: '00', value: pay.scheme },
        { id: '01', value: pay.account },
      ]),
    },
    { id: '52', value: pay.mcc },
    { id: '53', value: pay.currency },
    { id: '58', value: pay.country },
    { id: '59', value: pay.merchant },
    { id: '60', value: pay.city },
  ])}6304`

  const png = await drawQrPng(`${body}${emvCrc(body)}`)
  const file = new File([png], 'requisite.png', { type: 'image/png' })
  return createRequisite(
    orgId,
    { userId: ownerId, activeRole: 'owner' },
    { label: ru(pay.label) },
    { file },
    tx,
  )
}
