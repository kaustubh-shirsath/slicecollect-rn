// TODO backend: GET /api/home/summary?agent={username}
import { ALL_CUSTOMERS } from './customers'
import { getActivity } from './activityLog'

export interface BucketSummary {
  name: string
  cases: number
  overdue: number
  collected: number
  collectedCases: number   // count of cases with any collection
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
  donut: { full: number; partial: number; notAttempted: number }
}

export function getHomeData(username: string): HomeData {
  const myCases = ALL_CUSTOMERS.filter(c => c.username === username)
  const today = new Date().toDateString()
  const thisMonth = new Date().getMonth()

  let collectedToday = 0, monthlyCollected = 0, cashToDeposit = 0
  let pendingReceiptCount = 0, pendingVisits = 0
  let fullOD = 0, partial = 0, notAttempted = 0

  const bucketMap: Record<string, BucketSummary> = {}

  for (const c of myCases) {
    const b = c.assetClassification
    if (!bucketMap[b]) bucketMap[b] = { name: b, cases: 0, overdue: 0, collected: 0, collectedCases: 0 }
    bucketMap[b].cases++
    bucketMap[b].overdue += c.emiOs

    const act = getActivity(c.partyId)
    if (!act?.latestDisposition) { pendingVisits++; notAttempted++; continue }

    const totalCollected = act.collections.reduce((s, x) => s + x.amount, 0)
    bucketMap[b].collected += totalCollected
    if (totalCollected > 0) bucketMap[b].collectedCases++

    const todayStr = new Date().toISOString().split('T')[0]  // 'YYYY-MM-DD'
    for (const col of act.collections) {
      const isToday = col.date === todayStr
      const colMonth = parseInt(col.date.split('-')[1]) - 1
      if (isToday) collectedToday += col.amount
      if (colMonth === thisMonth) monthlyCollected += col.amount
      // Cash to deposit = only today's undeposited cash (field agent deposits daily)
      if (isToday && !col.deposited && col.mode === 'Cash') { cashToDeposit += col.amount; pendingReceiptCount++ }
    }

    if (totalCollected >= c.emiOs) fullOD++
    else if (totalCollected > 0) partial++
    else notAttempted++
  }

  return {
    agentUsername: username,
    totalCases: myCases.length,
    overdueTotal: myCases.reduce((s, c) => s + c.emiOs, 0),
    collectedToday,
    monthlyCollected,
    pendingVisits,
    cashToDeposit,
    pendingReceiptCount,
    weeklyTarget: 2000000,
    bucketSummary: Object.values(bucketMap),
    donut: { full: fullOD, partial, notAttempted },
  }
}
