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

// Settlement exists only for Loans (bank) — CC/Borrow settlement is out of Phase 1 scope.
ALL_CUSTOMERS.forEach((c, i) => {
  if (c.userType === 'bank' && i % 7 === 3) {
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

// TODO backend: instalment payment is recorded server-side; this mirrors it in the mock store
// so the profile's settlement schedule updates immediately after a Settlement Instalment collection.
export function markInstalmentPaid(partyId: string | number): void {
  const s = activeSettlements[String(partyId)]
  if (!s || s.instalmentsPaid >= s.instalmentCount) return
  s.instalmentsPaid += 1
  if (s.instalmentsPaid < s.instalmentCount) {
    const due = new Date(s.nextInstalmentDue)
    due.setMonth(due.getMonth() + 1)
    s.nextInstalmentDue = due.toISOString().split('T')[0]
  }
}

export function hasActiveSettlement(partyId: string | number): boolean {
  return !!activeSettlements[String(partyId)]
}
