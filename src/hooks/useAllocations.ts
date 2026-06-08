import { useState, useEffect, useCallback } from 'react'
import { getPortfolio, Allocation } from '../api/allocations'
import { ALL_CUSTOMERS } from '../data/customers'
import { getToken } from '../api/client'

interface UseAllocationsResult {
  allocations: any[]
  loading: boolean
  error: string | null
  refetch: () => void
  isFallback: boolean
}

function toCustomerShape(a: Allocation) {
  const addr = [a.addressLine1, a.addressLine2, a.addressLine3].filter(Boolean).join(', ')
  return {
    partyId: a.partyId,
    name: a.partyName,
    mobile: a.partyMobileNumber ?? '',
    mobile1: a.mobile1 ?? '',
    address: addr,
    region: a.region ?? '',
    branch: a.branchName ?? '',
    assetClassification: a.assetClassification ?? 'Unknown',
    dpd: a.dpd ?? 0,
    emiOs: Number(a.emiOs) || 0,
    overdue: Number(a.emiOs) || 0,
    outstandingBalance: Number(a.outstandingBalance) || 0,
    rollbackAmount: Number(a.rollbackAmount) || 0,
    minimumAmountDue: Number(a.minimumAmountDue) || 0,
    emiAmt: Number(a.emiAmt) || 0,
    lastPaymentDate: a.lastPaymentDate ?? '',
    lastPayment: a.lastPaymentDate ?? '',
    product: a.product ?? '',
    openingBucket: a.openingBucket ?? '',
    lat: Number(a.lat) || 27.4728,
    lng: Number(a.lng) || 94.9120,
    cibilAlert: false,
    priorityScore: a.dpd ? Math.min(Math.floor(a.dpd / 30), 5) : 0,
    id: a.id,
  }
}

export function useAllocations(bucket?: string, search?: string, _username?: string): UseAllocationsResult {
  const [allocations, setAllocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (getToken()) {
      // Live API
      getPortfolio({ bucket: bucket === 'All' ? undefined : bucket, search, limit: 200 })
        .then(res => {
          if (cancelled) return
          setAllocations(res.data.map(toCustomerShape))
          setIsFallback(false)
          setLoading(false)
        })
        .catch(err => {
          if (cancelled) return
          setError(err.message)
          fallback()
        })
    } else {
      fallback()
    }

    function fallback() {
      const filtered = ALL_CUSTOMERS.filter((c: any) => {
        const matchBucket = !bucket || bucket === 'All' || c.openingBucket === bucket
        const matchSearch =
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          String(c.partyId).includes(search)
        return matchBucket && matchSearch
      })
      if (!cancelled) {
        setAllocations(filtered)
        setIsFallback(true)
        setLoading(false)
      }
    }

    return () => { cancelled = true }
  }, [bucket, search, trigger])

  return { allocations, loading, error, refetch, isFallback }
}

export default useAllocations
