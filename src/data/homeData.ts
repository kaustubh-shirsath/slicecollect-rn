// TODO backend: GET /api/home/summary?agent={username}
import { ALL_CUSTOMERS } from './customers'
import { getActivity } from './activityLog'
import { getBorrowData } from './emis'
import { getCCBill } from './ccBills'
import { getResolutionStatus, isResolved } from './resolutionStatus'

// Buckets split into two objective types, per business logic:
//   'collection' (NPA, Settlement) — agent's job is to maximise ₹ collected vs a ₹ target.
//   'resolution' (SMA-0/1/2/3/4..., BKT-1..6+, Standard) — agent's job is to resolve as much
//   POS-weighted exposure as possible; ledger status FWD = unresolved, anything else = resolved.
export type BucketKind = 'collection' | 'resolution'

export interface BucketSummary {
  name: string
  kind: BucketKind
  cases: number
  posAllocated: number   // BOM POS from the daily allocation file
  // collection buckets (NPA/Settlement)
  collected: number
  target: number         // absolute ₹, from FileOps
  // resolution buckets (SMA/BKT/...)
  resolvedPos: number
  resolutionPct: number  // POS-weighted share of resolved cases
  targetPct: number      // resolution % target, from FileOps
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

function bucketKind(bucketName: string): BucketKind {
  return (bucketName === 'NPA' || bucketName === 'Settlement') ? 'collection' : 'resolution'
}

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
    let posAmt: number
    if (c.userType === 'borrow') {
      const bd = getBorrowData(String(c.partyId))
      b = bd?.bucketLabel ?? c.assetClassification
      posAmt = bd?.totalOverdue ?? c.emiOs
    } else if (c.userType === 'cc') {
      const cc = getCCBill(String(c.partyId))
      b = cc?.bucketLabel ?? c.assetClassification
      posAmt = cc?.minDueAmount ?? c.emiOs
    } else {
      b = c.assetClassification
      posAmt = c.emiOs
    }
    if (!groupMaps[c.userType]) groupMaps[c.userType] = {}
    const bucketMap = groupMaps[c.userType]
    if (!bucketMap[b]) {
      bucketMap[b] = {
        name: b, kind: bucketKind(b), cases: 0, posAllocated: 0,
        collected: 0, target: 0, resolvedPos: 0, resolutionPct: 0, targetPct: 0,
      }
    }
    bucketMap[b].cases++
    bucketMap[b].posAllocated += posAmt

    // Resolution-type buckets: POS-weighted resolved share, driven by the allocation file's
    // per-case status (FWD = unresolved; STBL/ROLLBACK/NORM = resolved) — independent of whether
    // the agent has visited yet today, since this reflects ledger state, not visit activity.
    if (bucketMap[b].kind === 'resolution' && isResolved(getResolutionStatus(c.partyId))) {
      bucketMap[b].resolvedPos += posAmt
    }

    const act = getActivity(c.partyId)
    if (!act?.latestDisposition) { pendingVisits++; notAttempted++; continue }

    const totalCollected = act.collections.reduce((s, x) => s + x.amount, 0)
    bucketMap[b].collected += totalCollected

    const todayStr = new Date().toISOString().split('T')[0]  // 'YYYY-MM-DD'
    for (const col of act.collections) {
      const isToday = col.date === todayStr
      const colMonth = parseInt(col.date.split('-')[1]) - 1
      if (isToday) collectedToday += col.amount
      if (colMonth === thisMonth) monthlyCollected += col.amount
      // Cash to deposit = only today's undeposited cash (field agent deposits daily)
      if (isToday && !col.deposited && col.mode === 'Cash') { cashToDeposit += col.amount; pendingReceiptCount++ }
    }

    if (totalCollected >= posAmt) fullOD++
    else if (totalCollected > 0) partial++
    else notAttempted++
  }

  const overdueTotal = myCases.reduce((s, c) => {
    if (c.userType === 'borrow') return s + (getBorrowData(String(c.partyId))?.totalOverdue ?? c.emiOs)
    if (c.userType === 'cc') return s + (getCCBill(String(c.partyId))?.minDueAmount ?? c.emiOs)
    return s + c.emiOs
  }, 0)

  // TODO backend: targets passed per agent per bucket via FileOps.
  // Collection buckets get an absolute ₹ target; resolution buckets get a % target.
  const bucketGroups: ProductBucketGroup[] = (['bank', 'cc', 'borrow'] as const)
    .filter(pt => groupMaps[pt] && Object.keys(groupMaps[pt]).length > 0)
    .map(pt => ({
      productType: pt,
      label: PRODUCT_LABELS[pt],
      buckets: Object.values(groupMaps[pt]).map(b => ({
        ...b,
        target: b.kind === 'collection' ? Math.round(b.posAllocated * 0.6) : 0,
        targetPct: b.kind === 'resolution' ? 70 : 0,
        resolutionPct: b.kind === 'resolution' && b.posAllocated > 0
          ? Math.round((b.resolvedPos / b.posAllocated) * 100)
          : 0,
      })),
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
