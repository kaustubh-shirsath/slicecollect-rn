import { apiFetch, getToken, API_BASE } from './client'

export type AllocationStatus = 'pending' | 'visited'

export interface Allocation {
  id: string
  partyId: string
  partyName: string
  region: string | null
  branchName: string | null
  partyMobileNumber: string | null
  mobile1: string | null
  mobile2: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressLine3: string | null
  assetClassification: string | null
  dpd: number | null
  emiOs: number | null
  outstandingBalance: number | null
  outstandingPrincipal: number | null
  overdueInterest: number | null
  outstandingCharges: number | null
  minimumAmountDue: number | null
  rollbackAmount: number | null
  emiAmt: number | null
  lastPaymentDate: string | null
  nextEmiDate: string | null
  product: string | null
  openingBucket: string | null
  lat: number | null
  lng: number | null
  agentId: string | null
  status: AllocationStatus
}

export interface PortfolioResponse {
  data: Allocation[]
  total: number
  page: number
  limit: number
}

export interface BucketCount {
  bucket: string
  count: string
  totalEmiOs: string
}

export interface AgentProfileResponse {
  agent: {
    agentId: string
    name: string
    email: string
    branchCode: string
    mobileNo: string | null
  }
  stats: {
    totalCases: number
    totalEmiOs: number
    totalOutstanding: number
    totalMinDue: number
  }
  buckets: BucketCount[]
}

export interface LeaderboardEntry {
  agentId: string
  name: string
  username: string
  totalCases: string
  totalEmiOs: string
  rank: number
}

export interface HomeSummary {
  totalCases: number
  overdueTotal: number
  outstanding: number
  collectedToday: number
  monthlyCollected: number
  pendingVisits: number
  bucketSummary: {
    bucket: string
    cases: number
    overdue: number
    outstanding: number
    collected: number
    collectedCases: number
  }[]
}

export function getPortfolio(params?: {
  bucket?: string
  page?: number
  limit?: number
  search?: string
  status?: AllocationStatus
}) {
  return apiFetch<PortfolioResponse>('/allocations', { params: params as any })
}

export function getBucketCounts() {
  return apiFetch<BucketCount[]>('/allocations/bucket-counts')
}

export function getProfile() {
  return apiFetch<AgentProfileResponse>('/allocations/profile')
}

export function getLeaderboard() {
  return apiFetch<LeaderboardEntry[]>('/allocations/leaderboard')
}

export function getAllocationById(id: string) {
  return apiFetch<Allocation>(`/allocations/${id}`)
}

export function getHomeSummary() {
  return apiFetch<HomeSummary>('/home/summary')
}

export interface CollectionSummary {
  totalPlAmt: number
  totalCashDepositedAmt: number
  totalCashInhand: number
  total: number
  allocationMonthYear: string
}

export function recordCashInhand(amount: number, allocationMonthYear: string) {
  return apiFetch<{ totalCashInhand: number }>('/agent-collection/cash-inhand', {
    method: 'POST',
    body: JSON.stringify({ amount, allocationMonthYear }),
  })
}

export function getCollectionSummary() {
  return apiFetch<CollectionSummary>('/agent-collection/summary')
}

export function submitDisposition(payload: any) {
  return apiFetch<any>('/disposition', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getDispositionReceipts() {
  return apiFetch<any[]>('/disposition/receipts')
}

export function getTodayVisits() {
  return apiFetch<any[]>('/disposition/today-visits')
}

export function getVisits(filter?: 'today' | '7days' | 'earlier') {
  return apiFetch<any[]>('/visits', { params: filter ? { filter } : undefined })
}

export function createAppointment(payload: any) {
  return apiFetch<any>('/appointments', { method: 'POST', body: JSON.stringify(payload) })
}

export function getAppointmentByAllocation(allocationId: string) {
  return apiFetch<any>(`/appointments/allocation/${allocationId}`)
}

export function rescheduleAppointment(id: string, payload: any) {
  return apiFetch<any>(`/appointments/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function cancelAppointment(id: string) {
  return apiFetch<any>(`/appointments/${id}/cancel`, { method: 'PATCH' })
}

export function getTodayAppointments() {
  return apiFetch<any[]>('/appointments/today')
}

export async function submitSettlement(payload: any, files: { uri: string; name: string; type: string }[]) {
  const form = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
    }
  })
  for (const file of files) {
    form.append('files', { uri: file.uri, name: file.name, type: file.type } as any)
  }
  const token = getToken()
  const res = await fetch(`${API_BASE}/settlement`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}
