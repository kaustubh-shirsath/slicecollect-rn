// TODO backend: GET /api/settlement-users?agent={username}
// Active settlement data comes from the settlement user API — NOT the daily allocation file.
import { ALL_CUSTOMERS } from './customers'

export interface SettlementInstalment {
  no: number
  dueDate: string      // YYYY-MM-DD
  amount: number
  paidAmount: number   // 0 = unpaid, < amount = partial, >= amount = paid
}

export interface ActiveSettlement {
  partyId: string
  settlementId: string
  totalAmount: number
  instalments: SettlementInstalment[]
  startedOn: string
}

export type InstalmentStatus = 'paid' | 'partial' | 'unpaid'
export function instalmentStatus(inst: SettlementInstalment): InstalmentStatus {
  if (inst.paidAmount >= inst.amount) return 'paid'
  if (inst.paidAmount > 0) return 'partial'
  return 'unpaid'
}

/** Earliest instalment that still has money due — the only one payable next. */
export function nextPayableInstalment(s: ActiveSettlement): SettlementInstalment | undefined {
  return s.instalments.find(i => i.paidAmount < i.amount)
}

// Mock store — replace with API fetch. Seeded deterministically: every 7th bank customer.
const activeSettlements: Record<string, ActiveSettlement> = {}

// Settlement exists only for Loans (bank) — CC/Borrow settlement is out of Phase 1 scope.
ALL_CUSTOMERS.forEach((c, i) => {
  if (c.userType === 'bank' && i % 7 === 3) {
    const total = Math.round((c.emiOs || 50000) * 0.6)
    const per = Math.round(total / 3)
    activeSettlements[String(c.partyId)] = {
      partyId: String(c.partyId),
      settlementId: 'STL' + String(c.partyId).slice(-6),
      totalAmount: total,
      // Advance payment is NOT an instalment — instalments start unpaid and fill only
      // when Settlement Instalment collections are recorded.
      instalments: [
        { no: 1, dueDate: '2026-08-15', amount: per, paidAmount: 0 },
        { no: 2, dueDate: '2026-09-15', amount: per, paidAmount: 0 },
        { no: 3, dueDate: '2026-10-15', amount: total - 2 * per, paidAmount: 0 },
      ],
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

// TODO backend: instalment payment is recorded server-side; this mirrors it in the mock
// store. Payment always applies to the EARLIEST instalment with money still due.
export function recordInstalmentPayment(partyId: string | number, amount: number): void {
  const s = activeSettlements[String(partyId)]
  if (!s) return
  let left = amount
  for (const inst of s.instalments) {
    if (left <= 0) break
    const due = inst.amount - inst.paidAmount
    if (due <= 0) continue
    const pay = Math.min(due, left)
    inst.paidAmount += pay
    left -= pay
  }
}
