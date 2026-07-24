// TODO backend: priorityOrder, riskBand, remarks arrive as columns on the daily allocation file.
// Prototype mock data predates these fields — derive deterministically per partyId where absent.
import { Customer } from './customers'

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function getRiskBand(c: Customer): 'High' | 'Medium' | 'Low' {
  if (c.riskBand) return c.riskBand
  if (c.cibilAlert) return 'High'
  if ((c.priorityScore || 0) >= 4) return 'High'
  if ((c.priorityScore || 0) >= 2) return 'Medium'
  return 'Low'
}

export function getPriorityOrder(c: Customer): number {
  if (c.priorityOrder != null) return c.priorityOrder
  return (hashString(c.partyId) % 500) + 1
}

const REMARK_POOL = [
  'Customer is repaying an existing loan with HDFC Bank',
  'CIBIL score of 702 recorded at last bureau pull',
  'Customer runs a small retail shop, income seasonal around harvest',
  'Prefers evening visits after 6 PM',
  'Has an active loan with a local NBFC in addition to this account',
  'CIBIL score of 641, marked under watch',
  'Family member employed with state govt, salary account elsewhere',
  'Customer travels for work frequently, hard to reach on weekdays',
  'Previously settled a card dues case with another bank',
  'CIBIL score of 758, generally prompt payer historically',
  'Runs household on remittances from a family member working abroad',
  'Multiple active loans across lenders, high existing indebtedness',
]

export function getRemarks(c: Customer): string {
  if (c.remarks) return c.remarks
  return REMARK_POOL[hashString(c.partyId + 'remarks') % REMARK_POOL.length]
}
