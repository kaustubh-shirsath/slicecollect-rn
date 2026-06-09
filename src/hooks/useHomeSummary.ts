import { useState, useEffect } from 'react'
import { getHomeSummary, HomeSummary } from '../api/allocations'

export function useHomeSummary(_username: string, dataVersion: number) {
  const [data, setData] = useState<HomeSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getHomeSummary()
      .then(res => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [dataVersion])

  return { data, loading }
}
