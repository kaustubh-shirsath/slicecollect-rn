export type WaiverStatus = 'pending' | 'approved' | 'rejected'

export interface SelectedEMI {
  emiNo: number
  pos: number
  interest: number
  penalty: number
}

export interface WaiverRequest {
  id: string
  partyId: string
  agentUsername: string
  userType: 'bank' | 'borrow' | 'cc'   // bank → Branch Head checker; cc/borrow → Agency Manager
  paymentType: string
  selectedEmis: SelectedEMI[]
  waiverPct: number
  waiverableBase: number
  waiverAmount: number
  grossAmount: number
  netCollectible: number
  dispositionType: string
  remarks: string
  status: WaiverStatus
  submittedAt: number
  resolvedAt?: number
  resolvedBy?: string
  rejectionReason?: string
}

const WAIVER_REQUESTS: WaiverRequest[] = []

export function submitWaiverRequest(
  req: Omit<WaiverRequest, 'id' | 'submittedAt' | 'status'>
): WaiverRequest {
  const now = Date.now()
  const id = 'WVR-' + String(now).slice(-8)
  const entry: WaiverRequest = {
    ...req,
    id,
    submittedAt: now,
    status: 'pending',
  }
  WAIVER_REQUESTS.push(entry)
  return entry
}

export function getWaiverRequestsForAgent(username: string): WaiverRequest[] {
  return WAIVER_REQUESTS.filter(r => r.agentUsername === username)
}

export function getWaiverRequest(id: string): WaiverRequest | undefined {
  return WAIVER_REQUESTS.find(r => r.id === id)
}

export function approveWaiverRequest(
  id: string,
  resolvedBy: string
): WaiverRequest | undefined {
  const req = WAIVER_REQUESTS.find(r => r.id === id)
  if (!req) return undefined
  req.status = 'approved'
  req.resolvedAt = Date.now()
  req.resolvedBy = resolvedBy
  return req
}

export function rejectWaiverRequest(
  id: string,
  resolvedBy: string,
  reason: string
): WaiverRequest | undefined {
  const req = WAIVER_REQUESTS.find(r => r.id === id)
  if (!req) return undefined
  req.status = 'rejected'
  req.resolvedAt = Date.now()
  req.resolvedBy = resolvedBy
  req.rejectionReason = reason
  return req
}

export function getPendingWaiverForCustomer(partyId: string): WaiverRequest | undefined {
  return WAIVER_REQUESTS.find(r => r.partyId === partyId && r.status === 'pending')
}
