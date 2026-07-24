// TODO backend: this comes as a column on the daily allocation file, one status per case per day.
// FWD = case has moved forward (unresolved). Anything else (STBL/ROLLBACK/NORM) = resolved for the day.
// Prototype has no real allocation file, so status is derived deterministically per partyId
// (stable across renders, not random) until the real field is wired in.
export type ResolutionStatus = 'FWD' | 'STBL' | 'ROLLBACK' | 'NORM'

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function getResolutionStatus(partyId: string | number): ResolutionStatus {
  const h = hashString(String(partyId)) % 100
  if (h < 40) return 'FWD'        // ~40% unresolved
  if (h < 60) return 'STBL'
  if (h < 80) return 'ROLLBACK'
  return 'NORM'
}

export function isResolved(status: ResolutionStatus): boolean {
  return status !== 'FWD'
}
