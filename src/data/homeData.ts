// TODO backend: GET /api/home/summary?agent={username}
import { ALL_CUSTOMERS } from './customers'
import { getActivity } from './activityLog'
import { getBorrowData } from './emis'
import { getCCBill } from './ccBills'

export interface BucketSummary {
  name: string
  cases: number        // Allocated
  overdue: number
  collected: number
  collectedCases: number   // count of cases with any collection
  unresolved: number   // cases with no full resolution (was: pending)
  target: number       // TODO backend: per-agent per-bucket target from allocation service
}

// Bucket tables grouped by product type — one table per product on Home
export interface ProductBucketGroup {
  productType: 'bank' | 'cc' | 'borrow'
  label: string        // display heading: 'Loans', 'Credit Card', 'Borrow'
  buckets: BucketSummary[]
}

export interface HomeData {
  agentUsername: string
  totalCases: number
  overdueTotal: number
  collectedToday: number
  monthlyCollected: number
  pendingVisits: number
  cashToDeposit: number
  pendingReceiptCount: number
  weeklyTarget: number
  bucketSummary: BucketSummary[]
  bucketGroups: ProductBucketGroup[]
  donut: { full: number; partial: number; notAttempted: number }
}

import { PRODUCT_LABEL } from '../utils/productLabels'
const PRODUCT_LABELS = PRODUCT_LABEL   // bank → Loans, cc → Credit Card, borrow → Borrow

export function getHomeData(username: string, portfolioType?: 'bank' | 'slice' | 'all'): HomeData {
  const myCases = ALL_CUSTOMERS.filter(c => {
    if (c.username !== username) return false
    if (!portfolioType || portfolioType === 'all') return true
    return portfolioType === 'bank' ? c.userType === 'bank' : c.userType !== 'bank'
  })
  const today = new Date().toDateString()
  const thisMonth = new Date().getMonth()

  let collectedToday = 0, monthlyCollected = 0, cashToDeposit = 0
  let pendingReceiptCount = 0, pendingVisits = 0
  let fullOD = 0, partial = 0, notAttempted = 0

  // Buckets keyed per product type so Home can render one table per product
  const groupMaps: Record<string, Record<string, BucketSummary>> = {}

  for (const c of myCases) {
    let b: string
    let overdueAmt: number
    if (c.userType === 'borrow') {
      const bd = getBorrowData(String(c.partyId))
      b = bd?.bucketLabel ?? c.assetClassification
      overdueAmt = bd?.totalOverdue ?? c.emiOs
    } else if (c.userType === 'cc') {
      const cc = getCCBill(String(c.partyId))
      b = cc?.bucketLabel ?? c.assetClassification
      overdueAmt = cc?.minDueAmount ?? c.emiOs
    } else {
      b = c.assetClassification
      overdueAmt = c.emiOs
    }
    if (!groupMaps[c.userType]) groupMaps[c.userType] = {}
    const bucketMap = groupMaps[c.userType]
    if (!bucketMap[b]) bucketMap[b] = { name: b, cases: 0, overdue: 0, collected: 0, collectedCases: 0, unresolved: 0, target: 0 }
    bucketMap[b].cases++
    bucketMap[b].overdue += overdueAmt

    const act = getActivity(c.partyId)
    if (!act?.latestDisposition) { pendingVisits++; notAttempted++; bucketMap[b].unresolved++; continue }

    const totalCollected = act.collections.reduce((s, x) => s + x.amount, 0)
    bucketMap[b].collected += totalCollected
    if (totalCollected > 0) bucketMap[b].collectedCases++
    if (totalCollected < overdueAmt) bucketMap[b].unresolved++

    const todayStr = new Date().toISOString().split('T')[0]  // 'YYYY-MM-DD'
    for (const col of act.collections) {
      const isToday = col.date === todayStr
      const colMonth = parseInt(col.date.split('-')[1]) - 1
      if (isToday) collectedToday += col.amount
      if (colMonth === thisMonth) monthlyCollected += col.amount
      // Cash to deposit = only today's undeposited cash (field agent deposits daily)
      if (isToday && !col.deposited && col.mode === 'Cash') { cashToDeposit += col.amount; pendingReceiptCount++ }
    }

    if (totalCollected >= overdueAmt) fullOD++
    else if (totalCollected > 0) partial++
    else notAttempted++
  }

  const overdueTotal = myCases.reduce((s, c) => {
    if (c.userType === 'borrow') return s + (getBorrowData(String(c.partyId))?.totalOverdue ?? c.emiOs)
    if (c.userType === 'cc') return s + (getCCBill(String(c.partyId))?.minDueAmount ?? c.emiOs)
    return s + c.emiOs
  }, 0)

  // TODO backend: target passed per agent per bucket. Mock = 60% of bucket overdue.
  const bucketGroups: ProductBucketGroup[] = (['bank', 'cc', 'borrow'] as const)
    .filter(pt => groupMaps[pt] && Object.keys(groupMaps[pt]).length > 0)
    .map(pt => ({
      productType: pt,
      label: PRODUCT_LABELS[pt],
      buckets: Object.values(groupMaps[pt]).map(b => ({ ...b, target: Math.round(b.overdue * 0.6) })),
    }))

  return {
    agentUsername: username,
    totalCases: myCases.length,
    overdueTotal,
    collectedToday,
    monthlyCollected,
    pendingVisits,
    cashToDeposit,
    pendingReceiptCount,
    weeklyTarget: 2000000,
    bucketSummary: bucketGroups.flatMap(g => g.buckets),
    bucketGroups,
    donut: { full: fullOD, partial, notAttempted },
  }
}
