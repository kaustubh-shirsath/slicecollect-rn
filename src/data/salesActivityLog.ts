export interface CashCollection {
  collectionId: string
  merchantId: string
  date: string
  amount: number
  notes: string
  deposited: boolean
  depositId?: string
  agentId: string
}

export interface SalesActivityRecord {
  merchantId: string
  username: string
  collections: CashCollection[]
  lastVisitDate: string | null
  lastVisitResult: 'Collected' | 'Not Home' | 'Refused' | null
}

const SALES_ACTIVITY_STORE: Map<string, SalesActivityRecord> = new Map([
  ['MCH-DBR-001', {
    merchantId: 'MCH-DBR-001',
    username: 'Gakul_Khanikar',
    collections: [
      { collectionId: 'CC-001-A', merchantId: 'MCH-DBR-001', date: '2026-05-31', amount: 42000, notes: '4x₹500, 20x₹100, 10x₹200', deposited: true, depositId: 'DP-20260531-001', agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-001-B', merchantId: 'MCH-DBR-001', date: '2026-05-24', amount: 38000, notes: '3x₹500, 15x₹100, 8x₹200', deposited: true, depositId: 'DP-20260524-001', agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-001-C', merchantId: 'MCH-DBR-001', date: '2026-06-07', amount: 42000, notes: '4x₹500, 22x₹100', deposited: false, agentId: 'Gakul_Khanikar' },
    ],
    lastVisitDate: '2026-06-07',
    lastVisitResult: 'Collected',
  }],
  ['MCH-DBR-002', {
    merchantId: 'MCH-DBR-002',
    username: 'Gakul_Khanikar',
    collections: [
      { collectionId: 'CC-002-A', merchantId: 'MCH-DBR-002', date: '2026-06-04', amount: 18500, notes: '1x₹2000, 5x₹500, 3x₹100', deposited: false, agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-002-B', merchantId: 'MCH-DBR-002', date: '2026-05-29', amount: 21000, notes: '2x₹2000, 3x₹500, 1x₹1000', deposited: true, depositId: 'DP-20260529-002', agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-002-C', merchantId: 'MCH-DBR-002', date: '2026-05-22', amount: 17500, notes: '1x₹2000, 4x₹500, 5x₹100', deposited: true, depositId: 'DP-20260522-002', agentId: 'Gakul_Khanikar' },
    ],
    lastVisitDate: '2026-06-04',
    lastVisitResult: 'Collected',
  }],
  ['MCH-DBR-003', {
    merchantId: 'MCH-DBR-003',
    username: 'Gakul_Khanikar',
    collections: [
      { collectionId: 'CC-003-A', merchantId: 'MCH-DBR-003', date: '2026-05-27', amount: 75000, notes: '5x₹2000, 10x₹500, 25x₹100', deposited: false, agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-003-B', merchantId: 'MCH-DBR-003', date: '2026-05-15', amount: 80000, notes: '6x₹2000, 8x₹500', deposited: true, depositId: 'DP-20260515-003', agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-003-C', merchantId: 'MCH-DBR-003', date: '2026-04-30', amount: 65000, notes: '4x₹2000, 12x₹500, 5x₹100', deposited: true, depositId: 'DP-20260430-003', agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-003-D', merchantId: 'MCH-DBR-003', date: '2026-04-15', amount: 70000, notes: '5x₹2000, 10x₹500', deposited: true, depositId: 'DP-20260415-003', agentId: 'Gakul_Khanikar' },
    ],
    lastVisitDate: '2026-05-27',
    lastVisitResult: 'Collected',
  }],
  ['MCH-TNS-010', {
    merchantId: 'MCH-TNS-010',
    username: 'Gakul_Khanikar',
    collections: [
      { collectionId: 'CC-010-A', merchantId: 'MCH-TNS-010', date: '2026-05-25', amount: 80000, notes: '6x₹2000, 20x₹500, 10x₹100', deposited: false, agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-010-B', merchantId: 'MCH-TNS-010', date: '2026-05-10', amount: 85000, notes: '5x₹2000, 25x₹500', deposited: true, depositId: 'DP-20260510-010', agentId: 'Gakul_Khanikar' },
      { collectionId: 'CC-010-C', merchantId: 'MCH-TNS-010', date: '2026-04-25', amount: 72000, notes: '4x₹2000, 20x₹500', deposited: true, depositId: 'DP-20260425-010', agentId: 'Gakul_Khanikar' },
    ],
    lastVisitDate: '2026-05-25',
    lastVisitResult: 'Collected',
  }],
])

export function getSalesActivity(merchantId: string): SalesActivityRecord | undefined {
  return SALES_ACTIVITY_STORE.get(merchantId)
}

export function updateSalesActivity(merchantId: string, update: Partial<SalesActivityRecord>): void {
  const existing = SALES_ACTIVITY_STORE.get(merchantId)
  if (existing) {
    SALES_ACTIVITY_STORE.set(merchantId, { ...existing, ...update })
  } else {
    SALES_ACTIVITY_STORE.set(merchantId, {
      merchantId,
      username: 'Gakul_Khanikar',
      collections: [],
      lastVisitDate: null,
      lastVisitResult: null,
      ...update,
    })
  }
}

export { SALES_ACTIVITY_STORE as SALES_ACTIVITY_LOG }
