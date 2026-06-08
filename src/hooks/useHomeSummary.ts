import { useState, useEffect } from 'react'
import { getHomeSummary, HomeSummary } from '../api/allocations'
import { getToken } from '../api/client'
import { getHomeData } from '../data/homeData'

export function useHomeSummary(username: string, dataVersion: number) {
  const [data, setData] = useState<HomeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  useEffect(() => {
    setLoading(true)

    if (getToken()) {
      getHomeSummary()
        .then(res => {
          setData(res)
          setIsFallback(false)
        })
        .catch(() => {
          useFallback()
        })
        .finally(() => setLoading(false))
    } else {
      useFallback()
      setLoading(false)
    }

    function useFallback() {
      const local = getHomeData(username)
      setData({
        totalCases: local.totalCases,
        overdueTotal: local.overdueTotal,
        outstanding: local.overdueTotal,
        collectedToday: local.collectedToday,
        monthlyCollected: local.monthlyCollected,
        pendingVisits: local.pendingVisits,
        bucketSummary: local.bucketSummary.map(b => ({
          bucket: b.name,
          cases: b.cases,
          overdue: b.overdue,
          outstanding: b.overdue,
          collected: b.collected,
          collectedCases: b.collectedCases,
        })),
      })
      setIsFallback(true)
    }
  }, [username, dataVersion])

  return { data, loading, isFallback }
}
