import { midnightIn } from '@anavi/backend/src/lib/clock'

/*
 * A calendar day some days back, for material that carries a day and not a moment — when a review
 * was said, when a work was finished.
 *
 * Counted back from today and never written as a date: a demo filled in March and opened in
 * October would otherwise show its newest testimonial as seven months old. Read by Bishkek's
 * calendar, because the demos stand there, and a day worked out in UTC is tomorrow for six hours
 * of every night — which a service that refuses a day in the future would rightly turn away.
 */
const DAY = 24 * 60 * 60 * 1000
const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bishkek' })

export function dayAgo(days: number): string {
  return calendar.format(new Date(Date.now() - days * DAY))
}

/*
 * The clock the whole fixture runs by. Every demo stands in Kyrgyzstan, and the fixture sets hours
 * with `setHours` and reads days with `getDate`: those read the PROCESS's zone, which is the
 * developer's own Bishkek on a laptop and UTC on the server `db:reset` runs on — couriers' windows,
 * mornings and evening hand-ins would slide six hours there. Pinned once, at each entry, so the
 * process and `dayOfMoment` below say the same day.
 */
export const SEED_ZONE = 'Asia/Bishkek'

export function pinSeedZone(): void {
  process.env.TZ = SEED_ZONE
}

/** The calendar day of a moment on the fixture's clock — never the UTC day, which is yesterday for six hours of the morning. */
export const dayOfMoment = (at: Date): string => calendar.format(at)

/** The calendar month of a moment on the fixture's clock, `YYYY-MM`. */
export const monthOfMoment = (at: Date): string => dayOfMoment(at).slice(0, 7)

/** A given hour of a calendar day on a clock — the organization's own, never an offset written by hand. */
export const atHour = (timezone: string, day: string, hour: number): Date =>
  new Date(midnightIn(timezone, day).getTime() + hour * 3_600_000)
