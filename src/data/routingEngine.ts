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

// ─── Scoring weights (backend-configurable in production) ──────────────────
// Each weight is a multiplier 0–1. Sum need not equal 1 — scores are normalised
// before route selection. Tune these via /config/routing endpoint in production.
export const ROUTE_WEIGHTS = {
  /** Raw collection value (emiOs normalised across portfolio) */
  collectionValue: 0.25,
  /** Bucket urgency — NPA/SMA-2 over Standard */
  bucketUrgency: 0.20,
  /** PTP due proximity — higher as PTP date approaches / expires */
  ptpUrgency: 0.20,
  /** CIBIL signal — customer paying other banks = high recovery probability */
  cibilSignal: 0.15,
  /** Proximity — inverse of haversine distance */
  proximity: 0.15,
  /** Time-of-day contact probability — JLG/farmers vs business vs salaried */
  contactProbability: 0.05,
}

// Bucket urgency scores — higher = agent should prioritise visiting today
const BUCKET_URGENCY: Record<string, number> = {
  'NPA':        1.00,
  'Write-Off':  0.85,  // still valuable but lower yield expectation
  'SMA-2':      0.90,
  'SMA-1':      0.70,
  'SMA-0':      0.50,
  'Settlement': 1.10,  // settlement in pipeline = approved = high priority
  'Standard':   0.20,
}

// Product-type → likely customer availability window
// Returns 0–1 score for how reachable this customer is at currentHour
function contactProbabilityScore(product: string, currentHour: number): number {
  const isJLG = product.toLowerCase().includes('joint_liability') ||
                product.toLowerCase().includes('jlg')
  const isBusiness = product.toLowerCase().includes('business') ||
                     product.toLowerCase().includes('unnati') ||
                     product.toLowerCase().includes('edl')

  if (isJLG) {
    // Farmers/daily wage — home early morning and evening
    if (currentHour >= 6 && currentHour <= 9)   return 1.0
    if (currentHour >= 17 && currentHour <= 19)  return 0.9
    if (currentHour >= 10 && currentHour <= 16)  return 0.4  // likely in field
    return 0.3
  }
  if (isBusiness) {
    // Shop owners / business — mid-day available
    if (currentHour >= 10 && currentHour <= 15)  return 1.0
    if (currentHour >= 16 && currentHour <= 18)  return 0.8
    if (currentHour < 9)                          return 0.3
    return 0.6
  }
  // Salaried / unknown — morning before office or evening
  if (currentHour >= 7 && currentHour <= 9)    return 0.9
  if (currentHour >= 18 && currentHour <= 20)  return 1.0
  if (currentHour >= 10 && currentHour <= 17)  return 0.5
  return 0.4
}

// PTP urgency score — peaks when PTP date is today or already broken (overdue PTP)
function ptpUrgencyScore(ptpDate: string | undefined): number {
  if (!ptpDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ptp = new Date(ptpDate)
  ptp.setHours(0, 0, 0, 0)
  const diffDays = Math.round((ptp.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0)  return 0.95  // broken PTP — urgent follow-up
  if (diffDays === 0) return 1.00  // PTP due today
  if (diffDays <= 2)  return 0.80
  if (diffDays <= 5)  return 0.50
  if (diffDays <= 10) return 0.25
  return 0.05
}

// ─── Outcome Logging ──────────────────────────────────────────────────────
// Each visit suggestion is logged with its score breakdown.
// In production this feeds the ML model for weight learning.
export interface RouteDecisionLog {
  partyId: string
  suggestedRank: number            // 1 = first suggested stop
  actualVisitRank: number | null   // null until agent visits
  scoreBreakdown: {
    collectionValue: number
    bucketUrgency: number
    ptpUrgency: number
    cibilSignal: number
    proximity: number
    contactProbability: number
    composite: number
  }
  distanceKm: number
  suggestedAt: string              // ISO timestamp when route was built
  visitedAt: string | null         // filled when agent actually visits
  collectedAmount: number | null   // filled post-visit
  ptpDate: string | null
  bucket: string
  product: string
  currentHour: number              // hour when route was built (for contact prob analysis)
}

// Session-level decision log — cleared on logout
const _decisionLog: RouteDecisionLog[] = []

export function getDecisionLog(): RouteDecisionLog[] { return _decisionLog }

export function recordActualVisit(partyId: string, visitedAt: string, collectedAmount: number) {
  const entry = _decisionLog.find(e => e.partyId === partyId)
  if (!entry) return
  // Actual rank = how many unique customers were visited before this one today
  const visitedBefore = _decisionLog.filter(
    e => e.visitedAt !== null && new Date(e.visitedAt!) < new Date(visitedAt)
  ).length
  entry.actualVisitRank = visitedBefore + 1
  entry.visitedAt = visitedAt
  entry.collectedAmount = collectedAmount
}

// ─── Session state ────────────────────────────────────────────────────────
const _plannedIds = new Set<string>()
let _routeInitialised = false

export function markPlannedRoute(ids: string[]) {
  if (_routeInitialised) return
  ids.forEach(id => _plannedIds.add(id))
  _routeInitialised = true
}

export function isOffRoute(partyId: string): boolean {
  return _routeInitialised && !_plannedIds.has(partyId)
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export interface RouteStop {
  customer: Customer
  distanceFromPrev: number
  estimatedArrival: string
  visited: boolean
  visitedAt?: string
  offRoute?: boolean
  scoreBreakdown?: RouteDecisionLog['scoreBreakdown']
  visitReason?: string   // human-readable explanation for Smart Screen tooltip
}

// ─── Main: Build composite-scored route ──────────────────────────────────
export function buildRoute(_username: string, currentLat: number, currentLng: number, customers?: Customer[]): RouteStop[] {
  const todayStr = new Date().toISOString().split('T')[0]
  const currentHour = new Date().getHours()

  const myCases = customers || []

  const maxEmiOs = Math.max(...myCases.map(c => c.emiOs), 1)

  const unvisited: Customer[] = []
  const visitedToday: { customer: Customer; visitedAt: string; offRoute: boolean }[] = []

  for (const c of myCases) {
    if (c.status === 'visited') {
      visitedToday.push({ customer: c, visitedAt: new Date().toISOString(), offRoute: isOffRoute(c.partyId) })
    } else {
      unvisited.push(c)
    }
  }

  markPlannedRoute([...unvisited.map(c => c.partyId)])

  // ─── Score every unvisited customer ─────────────────────────────────────
  interface ScoredCustomer {
    customer: Customer
    ptpDate?: string
    breakdown: RouteDecisionLog['scoreBreakdown']
  }

  const scored: ScoredCustomer[] = unvisited.map(c => {
    const ptpDate: string | undefined = undefined

    // 1. Collection value (normalised 0–1)
    const collectionValue = c.emiOs / maxEmiOs

    // 2. Bucket urgency
    const bucketUrgency = BUCKET_URGENCY[c.assetClassification] ?? 0.5

    // 3. PTP urgency
    const ptpUrgency = ptpUrgencyScore(ptpDate)

    // 4. CIBIL signal — paying other banks = proven capacity
    const cibilSignal = c.cibilAlert ? 1.0 : 0.0

    // 5. Proximity — computed per step (dynamic), placeholder 0 here; applied in route loop
    const proximity = 0

    // 6. Contact probability at current hour
    const contactProbability = contactProbabilityScore(c.product, currentHour)

    const composite =
      ROUTE_WEIGHTS.collectionValue   * collectionValue +
      ROUTE_WEIGHTS.bucketUrgency     * bucketUrgency +
      ROUTE_WEIGHTS.ptpUrgency        * ptpUrgency +
      ROUTE_WEIGHTS.cibilSignal       * cibilSignal +
      ROUTE_WEIGHTS.contactProbability * contactProbability
      // proximity applied dynamically in greedy loop below

    return {
      customer: c,
      ptpDate,
      breakdown: { collectionValue, bucketUrgency, ptpUrgency, cibilSignal, proximity, contactProbability, composite },
    }
  })

  // ─── Greedy selection: argmax(score + proximity_bonus) / step ────────────
  // At each step, pick the customer with highest: composite_score + w_proximity * (1 / distance)
  // Normalise proximity as 1 / (1 + distanceKm) so 0km → 1.0, 5km → 0.17, 20km → 0.05

  const ordered: RouteStop[] = []
  let fromLat = currentLat, fromLng = currentLng
  const remaining = [...scored]
  const now = new Date()
  let minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < 540) minutes = 540  // start no earlier than 09:00

  let suggestedRank = 1

  while (remaining.length > 0) {
    // Compute live proximity for each remaining candidate
    let bestIdx = 0
    let bestFinalScore = -Infinity

    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i].customer
      const dist = haversine(fromLat, fromLng, c.lat, c.lng)
      const proximityScore = 1 / (1 + dist)  // 0–1, distance-agnostic normalisation
      const finalScore = remaining[i].breakdown.composite + ROUTE_WEIGHTS.proximity * proximityScore
      if (finalScore > bestFinalScore) {
        bestFinalScore = finalScore
        bestIdx = i
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0]
    const c = chosen.customer
    const dist = haversine(fromLat, fromLng, c.lat, c.lng)
    const proximityScore = 1 / (1 + dist)

    // Finalise breakdown with actual proximity
    chosen.breakdown.proximity = proximityScore
    chosen.breakdown.composite += ROUTE_WEIGHTS.proximity * proximityScore

    const travelMins = Math.round((dist / 20) * 60)
    minutes += travelMins + 20
    const h = Math.floor(minutes / 60) % 24
    const m = minutes % 60

    // Generate human-readable "why this stop" reason
    const reasons: string[] = []
    if (chosen.breakdown.ptpUrgency >= 0.8)
      reasons.push(chosen.breakdown.ptpUrgency >= 0.95 ? 'Broken PTP — follow up now' : `PTP due ${chosen.ptpDate === todayStr ? 'today' : 'soon'}`)
    if (c.cibilAlert)
      reasons.push('Paying other banks — high recovery chance')
    if (chosen.breakdown.bucketUrgency >= 0.9)
      reasons.push(`${c.assetClassification} bucket — urgent`)
    if (chosen.breakdown.collectionValue >= 0.7)
      reasons.push(`High overdue ₹${(c.emiOs/1000).toFixed(0)}K`)
    if (dist <= 0.5)
      reasons.push('Nearest stop')
    const visitReason = reasons.length > 0 ? reasons.join(' · ') : 'Balanced priority'

    // Log decision for ML feedback
    const logEntry: RouteDecisionLog = {
      partyId: c.partyId,
      suggestedRank,
      actualVisitRank: null,
      scoreBreakdown: { ...chosen.breakdown },
      distanceKm: Math.round(dist * 10) / 10,
      suggestedAt: new Date().toISOString(),
      visitedAt: null,
      collectedAmount: null,
      ptpDate: chosen.ptpDate ?? null,
      bucket: c.assetClassification,
      product: c.product,
      currentHour,
    }
    // Only push if not already logged (avoid duplicate on reroute)
    if (!_decisionLog.find(e => e.partyId === c.partyId)) {
      _decisionLog.push(logEntry)
    }

    ordered.push({
      customer: c,
      distanceFromPrev: Math.round(dist * 10) / 10,
      estimatedArrival: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
      visited: false,
      scoreBreakdown: chosen.breakdown,
      visitReason,
    })

    fromLat = c.lat; fromLng = c.lng
    suggestedRank++
  }

  // Visited stops prepended (sorted by actual visit time)
  const visitedStops: RouteStop[] = visitedToday
    .sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime())
    .map(v => ({
      customer: v.customer,
      distanceFromPrev: 0,
      estimatedArrival: new Date(v.visitedAt).toTimeString().slice(0, 5),
      visited: true,
      visitedAt: v.visitedAt,
      offRoute: v.offRoute,
    }))

  return [...visitedStops, ...ordered]
}
