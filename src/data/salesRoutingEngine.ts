import { ALL_MERCHANTS } from './merchants'
import type { Merchant } from './merchants'
import { haversine } from './routingEngine'
import { getSalesActivity } from './salesActivityLog'

export interface SalesRouteStop {
  merchant: Merchant
  distanceFromPrev: number
  estimatedArrival: string
  visited: boolean
  visitedAt?: string
  collectedAmount?: number
}

// Session-level visit tracker
const _visitedMerchants = new Map<string, { visitedAt: string; amount: number }>()

export function buildSalesRoute(username: string, agentLat: number, agentLng: number): SalesRouteStop[] {
  const myMerchants = ALL_MERCHANTS.filter(m => m.assignedAgent === username)

  // Include merchants with pending amount > 0 or days without deposit > 3
  const candidates = myMerchants.filter(m => m.pendingAmount > 0 || m.daysWithoutDeposit > 3)

  const visited: SalesRouteStop[] = []
  const unvisited: Merchant[] = []

  for (const m of candidates) {
    const v = _visitedMerchants.get(m.merchantId)
    if (v) {
      visited.push({
        merchant: m,
        distanceFromPrev: 0,
        estimatedArrival: new Date(v.visitedAt).toTimeString().slice(0, 5),
        visited: true,
        visitedAt: v.visitedAt,
        collectedAmount: v.amount,
      })
    } else {
      unvisited.push(m)
    }
  }

  // Greedy nearest-first TSP
  const ordered: SalesRouteStop[] = []
  let fromLat = agentLat
  let fromLng = agentLng
  const now = new Date()
  let minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < 540) minutes = 540  // start no earlier than 09:00

  const remaining = [...unvisited]

  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversine(fromLat, fromLng, remaining[i].lat, remaining[i].lng)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0]
    const dist = Math.round(haversine(fromLat, fromLng, chosen.lat, chosen.lng) * 10) / 10
    const travelMins = Math.round((dist / 20) * 60)
    minutes += travelMins + 15  // 15 min per stop
    const h = Math.floor(minutes / 60) % 24
    const m = minutes % 60

    ordered.push({
      merchant: chosen,
      distanceFromPrev: dist,
      estimatedArrival: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      visited: false,
    })

    fromLat = chosen.lat
    fromLng = chosen.lng
  }

  return [...visited, ...ordered]
}

export function recordSalesVisit(merchantId: string, visitedAt: string, amount: number): void {
  _visitedMerchants.set(merchantId, { visitedAt, amount })
}
