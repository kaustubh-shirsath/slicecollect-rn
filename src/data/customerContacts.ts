// TODO backend: agent-added contact points persist to the phone-variant and
// address-variant tables in copsdb_gold. Prototype keeps them in-memory so the
// disposition dropdowns see them immediately.
export interface ContactEntry { label: string; value: string }

const extraPhones: Record<string, ContactEntry[]> = {}
const extraAddresses: Record<string, ContactEntry[]> = {}

export function getExtraPhones(partyId: string | number): ContactEntry[] {
  return extraPhones[String(partyId)] ?? []
}
export function addExtraPhone(partyId: string | number, entry: ContactEntry): void {
  const k = String(partyId)
  extraPhones[k] = [...(extraPhones[k] ?? []), entry]
}
export function getExtraAddresses(partyId: string | number): ContactEntry[] {
  return extraAddresses[String(partyId)] ?? []
}
export function addExtraAddress(partyId: string | number, entry: ContactEntry): void {
  const k = String(partyId)
  extraAddresses[k] = [...(extraAddresses[k] ?? []), entry]
}
