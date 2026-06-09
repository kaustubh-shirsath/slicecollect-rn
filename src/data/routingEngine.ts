export interface Customer {
  partyId: string
  name: string
  mobile: string
  mobile1: string
  address: string
  region: string
  branch: string
  assetClassification: string
  dpd: number
  emiOs: number
  outstandingBalance: number
  rollbackAmount: number
  minimumAmountDue: number
  emiAmt: number
  lastPaymentDate: string
  product: string
  lat: number
  lng: number
  cibilAlert: boolean
  status?: string
  id?: string
  [key: string]: any
}

export interface RouteStop {
  customer: Customer
  distanceFromPrev: number
  estimatedArrival: string
  visited: boolean
  visitedAt?: string
  priorityScore: number
  visitReason: string
}

const BUCKET_SCORE: Record<string, number> = {
  'NPA': 1.0,
  'SMA-2': 0.9,
  'SMA-1': 0.7,
  'SMA-0': 0.5,
  'Sub-Standard': 0.85,
  'Doubtful': 0.95,
  'Standard': 0.3,
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function computePriorityScore(c: Customer, maxEmiOs: number): { score: number; reason: string } {
  const reasons: string[] = []

  // 1. Collection value (40% weight) — higher overdue = higher priority
  const collectionScore = maxEmiOs > 0 ? (c.emiOs / maxEmiOs) : 0

  // 2. Bucket urgency (25% weight)
  const bucketScore = BUCKET_SCORE[c.assetClassification] ?? 0.4
  if (bucketScore >= 0.85) reasons.push(`${c.assetClassification} — urgent`)

  // 3. DPD urgency (20% weight) — higher DPD = higher priority
  const dpdScore = Math.min(c.dpd / 180, 1.0)
  if (c.dpd >= 90) reasons.push(`${c.dpd} DPD — high risk`)

  // 4. Minimum amount due ratio (15% weight)
  const minDueScore = c.minimumAmountDue > 0 && c.outstandingBalance > 0
    ? Math.min(c.minimumAmountDue / c.outstandingBalance, 1.0)
    : 0.3

  if (c.emiOs >= 50000) reasons.push(`High overdue ₹${Math.round(c.emiOs / 1000)}K`)

  const score = collectionScore * 0.40 + bucketScore * 0.25 + dpdScore * 0.20 + minDueScore * 0.15

  const reason = reasons.length > 0 ? reasons.join(' · ') : 'Balanced priority'
  return { score, reason }
}

export function buildRoute(_username: string, currentLat: number, currentLng: number, customers?: Customer[], todayAppointments?: { allocationId: string; timeSlot: string }[]): RouteStop[] {
  const myCases = customers || []
  if (myCases.length === 0) return []

  const apptMap = new Map<string, string>()
  if (todayAppointments) {
    for (const a of todayAppointments) {
      apptMap.set(a.allocationId, a.timeSlot)
    }
  }

  const maxEmiOs = Math.max(...myCases.map(c => c.emiOs || 0), 1)

  const visited: RouteStop[] = []
  const pending: { customer: Customer; score: number; reason: string }[] = []

  for (const c of myCases) {
    if (c.status === 'visited') {
      visited.push({
        customer: c,
        distanceFromPrev: 0,
        estimatedArrival: '',
        visited: true,
        visitedAt: new Date().toISOString(),
        priorityScore: 0,
        visitReason: 'Completed',
      })
    } else {
      let { score, reason } = computePriorityScore(c, maxEmiOs)
      const apptSlot = apptMap.get(c.id || '')
      if (apptSlot) {
        score += 0.5
        reason = `📅 Appointment (${apptSlot}) · ${reason}`
      }
      pending.push({ customer: c, score, reason })
    }
  }

  // Sort pending by score (highest first)
  pending.sort((a, b) => b.score - a.score)

  // Build ordered route using greedy nearest-neighbor with priority bias
  const ordered: RouteStop[] = []
  let fromLat = currentLat, fromLng = currentLng
  const remaining = [...pending]
  const now = new Date()
  let minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < 540) minutes = 540

  while (remaining.length > 0) {
    let bestIdx = 0
    let bestFinalScore = -Infinity

    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i].customer
      const dist = haversine(fromLat, fromLng, c.lat, c.lng)
      const proximityBonus = 1 / (1 + dist)
      const finalScore = remaining[i].score * 0.7 + proximityBonus * 0.3
      if (finalScore > bestFinalScore) {
        bestFinalScore = finalScore
        bestIdx = i
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0]
    const c = chosen.customer
    const dist = haversine(fromLat, fromLng, c.lat, c.lng)

    const travelMins = Math.round((dist / 20) * 60)
    minutes += travelMins + 20
    const h = Math.floor(minutes / 60) % 24
    const m = minutes % 60

    ordered.push({
      customer: c,
      distanceFromPrev: Math.round(dist * 10) / 10,
      estimatedArrival: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      visited: false,
      priorityScore: chosen.score,
      visitReason: chosen.reason,
    })

    fromLat = c.lat
    fromLng = c.lng
  }

  return [...visited, ...ordered]
}
