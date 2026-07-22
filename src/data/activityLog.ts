import { ALL_CUSTOMERS } from './customers'
import type { Customer } from './customers'

export interface Collection {
  date: string
  amount: number
  mode: 'Cash' | 'Payment Link'
  receiptId: string
  deposited: boolean
  depositId?: string
}

export interface VisitEntry {
  date: string
  dispositionType: string
  summary: string
  amount?: number
  contactPerson?: string
  contactPlace?: string
  ptpDate?: string
  waiverPct?: number
  waiverAmount?: number
  paymentStatus?: string
  altNumber?: string
  altAddress?: string
  lat?: number
  lng?: number
}

export interface ActivityRecord {
  partyId: string
  username: string
  latestDisposition: {
    type: string
    code: string
    date: string
    ptpDate?: string
    ptpAmount?: number
    remarks: string
    visitedAt: string
  } | null
  collections: Collection[]
  visitHistory: VisitEntry[]
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function todayAt(hour: number, min: number): string {
  const d = new Date()
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

function futureDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}

let _receiptSeq = 1000
function makeReceiptId(partyId: string): string {
  return 'MB' + String(++_receiptSeq).padStart(6, '0') + partyId.slice(-4)
}

// Deterministic multi-dim seed
function s(partyId: string, offset = 0): number {
  const base = parseInt(partyId.slice(-6)) || parseInt(partyId.slice(-4)) || 1234
  return Math.abs(base + offset * 9973) % 10000
}

function generateRecord(c: Customer): ActivityRecord {
  const seed0 = s(c.partyId, 0)   // disposition class
  const seed1 = s(c.partyId, 1)   // collection type
  const seed2 = s(c.partyId, 2)   // date offset
  const seed3 = s(c.partyId, 3)   // mode / extra variation

  const dispClass = seed0 % 10    // 0-9

  // ~25% no activity
  if (dispClass < 2) {
    return { partyId: c.partyId, username: c.username, latestDisposition: null, collections: [], visitHistory: [] }
  }

  // Shared date helpers
  const visitDaysAgo = [0, 0, 1, 1, 2, 3, 4, 5, 7, 10][dispClass]
  const visitIsToday = visitDaysAgo === 0
  const visitedAt = visitIsToday ? todayAt(8 + (seed3 % 5), seed3 % 60) : daysAgo(visitDaysAgo)
  const visitDate = visitIsToday ? new Date().toISOString().split('T')[0] : daysAgo(visitDaysAgo).split('T')[0]

  // ── PTP (no collection) ──────────────────────────────────────────────────
  if (dispClass === 2 || dispClass === 3) {
    const ptpAmt = dispClass === 2
      ? c.minimumAmountDue                                          // min due PTP
      : Math.round(c.emiOs * (0.4 + (seed1 % 4) * 0.1) / 100) * 100  // partial PTP
    return {
      partyId: c.partyId, username: c.username,
      latestDisposition: {
        type: 'Connected-PTP', code: 'PTP – Promise to Pay',
        date: visitDate,
        ptpDate: futureDate(3 + (seed2 % 10)),
        ptpAmount: ptpAmt,
        remarks: 'Customer committed to pay by PTP date.',
        visitedAt,
      },
      collections: [],
      visitHistory: visitDaysAgo > 0 ? [{ date: daysAgo(visitDaysAgo + 5).split('T')[0], dispositionType: 'Non-Contacted', summary: 'Not home' }] : [],
    }
  }

  // ── Non-contacted ────────────────────────────────────────────────────────
  if (dispClass === 4) {
    const codes = ['Out of Station (OOS)', 'Not Home', 'Door Locked', 'Shifted']
    return {
      partyId: c.partyId, username: c.username,
      latestDisposition: {
        type: 'Non-Contacted', code: codes[seed1 % codes.length],
        date: visitDate,
        remarks: 'Customer not available.',
        visitedAt,
      },
      collections: [],
      visitHistory: [{ date: daysAgo(visitDaysAgo + 4).split('T')[0], dispositionType: 'Non-Contacted', summary: 'Not home on prior attempt' }],
    }
  }

  // ── Refused / Dispute ────────────────────────────────────────────────────
  if (dispClass === 5) {
    const codes = ['RTP_C – Refuse (Capacity)', 'RTP_W – Refuse (Willful)', 'Dispute – Amount Incorrect']
    return {
      partyId: c.partyId, username: c.username,
      latestDisposition: {
        type: 'Contacted Negative', code: codes[seed1 % codes.length],
        date: visitDate,
        remarks: 'Customer refuses to pay. Escalation recommended.',
        visitedAt,
      },
      collections: [],
      visitHistory: [{ date: daysAgo(visitDaysAgo + 3).split('T')[0], dispositionType: 'Non-Contacted', summary: 'Not home' }],
    }
  }

  // ── COLLECTED ────────────────────────────────────────────────────────────
  // dispClass 6-9 → various collection types

  // Determine collection amount type
  const collType = seed1 % 5
  let amount: number
  let dispCode: string
  let remarks: string

  if (collType === 0) {
    // Full overdue
    amount = c.emiOs
    dispCode = 'Full OD – Regular Settlement'
    remarks = 'Full overdue collected.'
  } else if (collType === 1) {
    // Min due only
    amount = c.minimumAmountDue || Math.round(c.emiOs * 0.15 / 100) * 100
    dispCode = 'Minimum Amount Due'
    remarks = 'Minimum due collected.'
  } else if (collType === 2) {
    // Partial (30-70% of emiOs)
    const pct = 0.3 + (seed2 % 5) * 0.08
    amount = Math.round(c.emiOs * pct / 100) * 100
    dispCode = 'Partial Payment'
    remarks = 'Partial amount collected.'
  } else if (collType === 3) {
    // Rollback / foreclosure
    amount = c.rollbackAmount || Math.round(c.outstandingBalance * 0.9 / 100) * 100
    dispCode = 'Foreclosure – Rollback Amount'
    remarks = 'Customer paid rollback/foreclosure amount.'
  } else {
    // Settlement (between emiOs and outstanding)
    amount = Math.round(
      (c.emiOs + (c.outstandingBalance - c.emiOs) * 0.3) / 100
    ) * 100
    dispCode = 'Settlement Payment'
    remarks = 'Settlement amount collected per agreement.'
  }

  // Collection date spread — today weighted 3/8 so ~3-4 per agent show today
  const collDaysOptions = [0, 0, 0, 1, 1, 2, 4, 7]
  const collDaysBack = collDaysOptions[seed2 % collDaysOptions.length]
  const isToday = collDaysBack === 0
  const collDate = isToday ? new Date().toISOString().split('T')[0] : daysAgo(collDaysBack).split('T')[0]
  const colVisitedAt = isToday ? todayAt(9 + (seed3 % 4), seed3 % 60) : daysAgo(collDaysBack)

  const mode: 'Cash' | 'Payment Link' = (seed3 % 3 === 0) ? 'Payment Link' : 'Cash'
  const deposited = !isToday || (seed3 % 2 === 0)

  // Some users have 2 collection entries (part-payments across 2 dates)
  const hasSecondCollection = seed0 % 3 === 0 && collType === 2
  const collections: Collection[] = [{
    date: collDate,
    amount,
    mode,
    receiptId: makeReceiptId(c.partyId),
    deposited,
    depositId: deposited ? 'DP' + c.partyId.slice(-8) : undefined,
  }]

  if (hasSecondCollection) {
    const prevDays = collDaysBack + 3 + (seed1 % 5)
    const prevAmt = Math.round(amount * 0.4 / 100) * 100
    collections.push({
      date: daysAgo(prevDays).split('T')[0],
      amount: prevAmt,
      mode: 'Cash',
      receiptId: makeReceiptId(c.partyId),
      deposited: true,
      depositId: 'DP' + c.partyId.slice(-6) + 'B',
    })
  }

  return {
    partyId: c.partyId, username: c.username,
    latestDisposition: {
      type: 'Collected', code: dispCode,
      date: collDate,
      remarks,
      visitedAt: colVisitedAt,
    },
    collections,
    visitHistory: collDaysBack > 0
      ? [{ date: daysAgo(collDaysBack + 5).split('T')[0], dispositionType: 'Connected-PTP', summary: 'PTP ₹' + amount.toLocaleString('en-IN') }]
      : [],
  }
}

const _log: ActivityRecord[] = ALL_CUSTOMERS.map(generateRecord)

export const ACTIVITY_LOG = _log

export function getActivity(partyId: string): ActivityRecord | undefined {
  return _log.find(r => r.partyId === partyId)
}

export function updateActivity(partyId: string, update: Partial<ActivityRecord>): void {
  const idx = _log.findIndex(r => r.partyId === partyId)
  if (idx >= 0) Object.assign(_log[idx], update)
}
