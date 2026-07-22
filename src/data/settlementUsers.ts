// TODO backend: GET /api/settlement-users?agent={username}
// Active settlement data comes from the settlement user API — NOT the daily allocation file.
import { ALL_CUSTOMERS } from './customers'

export interface ActiveSettlement {
  partyId: string
  settlementId: string
  totalAmount: number
  instalmentCount: number
  instalmentsPaid: number
  nextInstalmentAmount: number
  nextInstalmentDue: string   // YYYY-MM-DD
  startedOn: string
}

// Mock store — replace with API fetch. Seeded deterministically: every 7th customer has one.
const activeSettlements: Record<string, ActiveSettlement> = {}

ALL_CUSTOMERS.forEach((c, i) => {
  if (i % 7 === 3) {
    const total = Math.round((c.emiOs || 50000) * 0.6)
    activeSettlements[String(c.partyId)] = {
      partyId: String(c.partyId),
      settlementId: 'STL' + String(c.partyId).slice(-6),
      totalAmount: total,
      instalmentCount: 3,
      instalmentsPaid: 1,
      nextInstalmentAmount: Math.round(total / 3),
      nextInstalmentDue: '2026-07-15',
      startedOn: '2026-06-01',
    }
  }
})

export function getActiveSettlement(partyId: string | number): ActiveSettlement | undefined {
  return activeSettlements[String(partyId)]
}

export function hasActiveSettlement(partyId: string | number): boolean {
  return !!activeSettlements[String(partyId)]
}
