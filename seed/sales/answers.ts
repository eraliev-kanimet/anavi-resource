/**
 * A date field is answered with days FROM the appeal, never a literal that would go stale.
 *
 * All that is left of a filler that answered any questionnaire the platform could hold — roles from
 * a person, lists by a rotating counter, everything else out of three pools of phrases. It was
 * written for a general script that no longer exists: every demo names its own answers, and a field
 * its file does not name stays empty on purpose. A generated sentence inside a hand-written
 * questionnaire is exactly what that was getting away from.
 */
export function dayAfter(from: Date, shift: number): string {
  const at = new Date(from.getTime() + shift * 24 * 60 * 60 * 1000)
  return at.toISOString().slice(0, 10)
}
