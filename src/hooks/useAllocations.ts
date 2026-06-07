import { useState, useEffect, useCallback } from 'react'
import { ALL_CUSTOMERS } from '../data/customers'

interface UseAllocationsResult {
  allocations: any[]
  loading: boolean
  error: string | null
  refetch: () => void
  isFallback: boolean
}

export function useAllocations(bucket?: string, search?: string, username?: string): UseAllocationsResult {
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
      const matchBucket = !bucket || bucket === 'All' || c.assetClassification === bucket
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        String(c.partyId).includes(search)
      return matchAgent && matchBucket && matchSearch
    })
    setAllocations(filtered)
    setLoading(false)
  }, [bucket, search, username, trigger])

  return { allocations, loading, error: null, refetch, isFallback: false }
}

export default useAllocations
