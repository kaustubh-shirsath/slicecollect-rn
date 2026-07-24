import { useState, useEffect, useCallback } from 'react'
import { ALL_CUSTOMERS } from '../data/customers'
import { getCustomerRef } from '../data/caseMeta'

interface UseAllocationsResult {
  allocations: any[]
  loading: boolean
  error: string | null
  refetch: () => void
  isFallback: boolean
}

export function useAllocations(bucket?: string, search?: string, username?: string, portfolioType?: 'bank' | 'slice' | 'all'): UseAllocationsResult {
  const [allocations, setAllocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => {
    setTrigger(t => t + 1)
  }, [])

  useEffect(() => {
    setLoading(true)
    const filtered = ALL_CUSTOMERS.filter((c: any) => {
      const matchAgent = !username || c.username === username
      const matchPortfolio = !portfolioType || portfolioType === 'all' ||
        (portfolioType === 'bank' ? c.userType === 'bank' : c.userType !== 'bank')
      const matchBucket = !bucket || bucket === 'All' || c.assetClassification === bucket
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        String(c.partyId).includes(search) ||
        String(c.mobile || '').includes(search) ||
        String(c.mobile1 || '').includes(search) ||
        getCustomerRef(c.partyId, c.userType).value.toLowerCase().includes(search.toLowerCase())
      return matchAgent && matchPortfolio && matchBucket && matchSearch
    })
    setAllocations(filtered)
    setLoading(false)
  }, [bucket, search, username, portfolioType, trigger])

  return { allocations, loading, error: null, refetch, isFallback: false }
}

export default useAllocations
