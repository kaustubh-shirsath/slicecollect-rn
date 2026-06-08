import { useState, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Path, G } from 'react-native-svg'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { ALL_CUSTOMERS } from '../data/customers'
import { getActivity } from '../data/activityLog'
import { getCollectionSummary, CollectionSummary } from '../api/allocations'
import { getToken } from '../api/client'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Visits'>,
  NativeStackScreenProps<RootStackParamList>
>

type TabFilter = 'Today' | 'Last 7 Days' | 'Earlier'

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

function DonutChart({ fullPct, partialPct, total }: { fullPct: number; partialPct: number; total: number }) {
  const size = 112
  const r = 50
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  function arc(startPct: number, pct: number, color: string) {
    if (pct <= 0) return null
    const startAngle = (startPct / 100) * 360 - 90
    const endAngle = ((startPct + pct) / 100) * 360 - 90
    const start = {
      x: cx + r * Math.cos((startAngle * Math.PI) / 180),
      y: cy + r * Math.sin((startAngle * Math.PI) / 180),
    }
    const end = {
      x: cx + r * Math.cos((endAngle * Math.PI) / 180),
      y: cy + r * Math.sin((endAngle * Math.PI) / 180),
    }
    const largeArc = pct > 50 ? 1 : 0
    const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
    return <Path d={d} stroke={color} strokeWidth="14" fill="none" strokeLinecap="butt" />
  }

  const grayPct = Math.max(0, 100 - fullPct - partialPct)

  return (
    <Svg width={size} height={size}>
      {/* Base gray */}
      <Circle cx={cx} cy={cy} r={r} stroke="#d1d5db" strokeWidth="14" fill="none" />
      {/* Full green */}
      {arc(0, fullPct, '#00A63E')}
      {/* Partial purple */}
      {arc(fullPct, partialPct, '#D30AD7')}
    </Svg>
  )
}

export default function VisitsScreen({ navigation }: Props) {
  const { agentInfo, dataVersion } = useAgent()
  const [tab, setTab] = useState<TabFilter>('Today')
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null)

  useEffect(() => {
    if (!getToken()) return
    getCollectionSummary().then(setCollectionSummary).catch(() => {})
  }, [dataVersion])

  const allEntries = useMemo(() => {
    if (!agentInfo) return []
    return ALL_CUSTOMERS
      .filter((c: any) => c.username === agentInfo.agentId)
      .flatMap((c: any) => {
        const act = getActivity(c.partyId)
        if (!act?.latestDisposition) return []
        const disp = act.latestDisposition
        const totalCollected = act.collections.reduce((s: number, x: any) => s + x.amount, 0)
        const latestCol = act.collections.length > 0 ? act.collections[act.collections.length - 1] : null
        return [{
          name: c.name,
          partyId: c.partyId,
          visitedAt: disp.visitedAt,
          time: new Date(disp.visitedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(disp.visitedAt),
          amount: totalCollected,
          type: disp.code,
          mode: act.collections[0]?.mode ?? '',
          category: totalCollected >= c.emiOs && c.emiOs > 0 ? 'collected' : totalCollected > 0 ? 'partial' : 'contacted',
          bucket: c.assetClassification,
          dpd: c.dpd,
          receiptId: latestCol?.receiptId ?? null,
          ptpDate: disp.type === 'Connected-PTP' ? disp.ptpDate : null,
          remarks: disp.remarks,
          latestCol,
          customerName: c.name,
          branchName: c.branch,
          product: c.product,
        }]
      })
      .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
  }, [agentInfo, dataVersion])

  const today = new Date().toDateString()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const todayEntries   = allEntries.filter((e: any) => e.date.toDateString() === today)
  const last7Entries   = allEntries.filter((e: any) => e.date > sevenDaysAgo && e.date.toDateString() !== today)
  const earlierEntries = allEntries.filter((e: any) => e.date <= sevenDaysAgo)

  const tabEntries = tab === 'Today' ? todayEntries : tab === 'Last 7 Days' ? last7Entries : earlierEntries

  const totalCollectedToday = todayEntries.reduce((s: number, e: any) => s + (e.category !== 'contacted' ? e.amount : 0), 0)
  const fullAmt    = todayEntries.filter((e: any) => e.category === 'collected').reduce((s: number, e: any) => s + e.amount, 0)
  const partialAmt = todayEntries.filter((e: any) => e.category === 'partial').reduce((s: number, e: any) => s + e.amount, 0)
  const totalAmt   = fullAmt + partialAmt || 1
  const fullPct    = Math.round(fullAmt / totalAmt * 100)
  const partialPct = Math.round(partialAmt / totalAmt * 100)
  const notCollectedCount = todayEntries.filter((e: any) => e.category === 'contacted').length

  const totalCollected = collectionSummary?.total ?? 0
  const cashInhand = collectionSummary?.totalCashInhand ?? 0
  const cashDeposited = collectionSummary?.totalCashDepositedAmt ?? 0
  const plAmt = collectionSummary?.totalPlAmt ?? 0

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pb-5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[rgba(0,0,0,0.9)] font-medium text-xl">My Collections</Text>
            <Text className="text-black/40 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View className="bg-[#E0F4E8] border border-[#00A63E]/20 rounded-full px-3 py-1">
            <Text className="text-[#007E2F] text-xs font-medium">{todayEntries.length} Today</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Donut chart */}
        <View className="bg-white px-4 py-5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <View className="flex-row items-center gap-5">
            <View className="relative">
              <DonutChart fullPct={fullPct} partialPct={partialPct} total={totalCollectedToday} />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-[rgba(0,0,0,0.9)] font-semibold text-[11px] text-center">{fmt(totalCollectedToday)}</Text>
                <Text className="text-black/40 text-[9px] mt-0.5">Total</Text>
              </View>
            </View>
            <View className="flex-1 gap-2.5">
              {[
                { color: '#00A63E', label: 'Full OD', pct: `${fullPct}%`, amount: fmt(fullAmt) },
                { color: '#D30AD7', label: 'Partial OD', pct: `${partialPct}%`, amount: fmt(partialAmt) },
                { color: '#EAEBED', label: 'Not Collected', pct: `${notCollectedCount}`, amount: '—' },
              ].map(l => (
                <View key={l.label} className="flex-row items-center gap-2">
                  <View className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <Text className="text-[11px] text-black/60 flex-1">{l.label}</Text>
                  <Text className="text-[11px] text-black/35 w-7 text-right">{l.pct}</Text>
                  <Text className="text-[11px] font-medium text-[rgba(0,0,0,0.75)] w-20 text-right">{l.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Collection summary widget */}
        <View className="mx-4 my-3 bg-[#D30AD7] rounded-[24px] px-4 py-3.5" style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}>
          <View className="flex-row items-start justify-between mb-3">
            <View>
              <Text className="text-[10px] text-white/60 uppercase tracking-widest font-medium mb-0.5">Total Collected (This Month)</Text>
              <Text className="text-2xl font-medium text-white">{fmt(totalCollected)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Deposition')}
              className="bg-white px-4 py-2 rounded-full"
            >
              <Text className="text-[#D30AD7] text-xs font-medium">Deposit →</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-2">
            {[
              { label: 'PL Amount', value: plAmt },
              { label: 'Deposited', value: cashDeposited },
              { label: 'In Hand', value: cashInhand },
            ].map(item => (
              <View key={item.label} className="flex-1 bg-white/15 rounded-2xl px-3 py-2">
                <Text className="text-[9px] text-white/60 uppercase tracking-wider mb-0.5">{item.label}</Text>
                <Text className="text-sm font-semibold text-white">{fmt(item.value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tab bar */}
        <View className="flex-row bg-white" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          {(['Today', 'Last 7 Days', 'Earlier'] as TabFilter[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className="flex-1 py-2.5 items-center"
              style={{ borderBottomWidth: 2, borderBottomColor: tab === t ? '#D30AD7' : 'transparent' }}
            >
              <Text className={`text-[10px] font-medium ${tab === t ? 'text-[#D30AD7]' : 'text-black/50'}`}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Entries */}
        <View className="px-4 py-3 gap-3">
          {tabEntries.length === 0 ? (
            <View className="bg-white rounded-[24px] p-8 items-center" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
              <Text className="text-black/20 text-3xl mb-2">📋</Text>
              <Text className="text-black/50 text-sm">No entries for {tab}</Text>
            </View>
          ) : (
            tabEntries.map((e: any, i: number) => {
              const maskedId = String(e.partyId).replace(/^(.{4})(.+)(.{4})$/, (_: string, a: string, m: string, z: string) => a + '·'.repeat(Math.min(4, m.length)) + z)
              const dateLabel = tab === 'Today' ? e.time : e.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' + e.time
              return (
                <View key={i} className="bg-white rounded-[20px] px-4 py-4 gap-2.5" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0">
                      <Text className="font-semibold text-[rgba(0,0,0,0.9)] text-[15px] leading-tight">{e.name}</Text>
                      <Text className="text-black/35 text-[11px] font-mono tracking-wider mt-0.5">{maskedId}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-[15px] text-[rgba(0,0,0,0.85)]">
                        {e.category === 'contacted' ? '—' : fmt(e.amount)}
                      </Text>
                      <Text className="text-black/35 text-[10px] mt-0.5">{dateLabel}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <View className="bg-[#EAEBED] px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] text-black/60 font-medium">{e.type}</Text>
                    </View>
                    {e.mode ? (
                      <View className="bg-[#EAEBED] px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] text-black/55 font-medium">{e.mode}</Text>
                      </View>
                    ) : null}
                    {e.bucket ? (
                      <View className="bg-[#F0F4F7] px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] text-black/50 font-medium">{e.bucket}</Text>
                      </View>
                    ) : null}
                    {e.dpd > 0 && <Text className="text-[10px] text-black/35">{e.dpd} DPD</Text>}
                    {e.ptpDate && (
                      <View className="bg-[#F0F4F7] px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] text-black/55 font-medium">PTP {e.ptpDate}</Text>
                      </View>
                    )}
                  </View>

                  {e.receiptId && (
                    <View className="flex-row items-center justify-between pt-2" style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-[10px] text-black/30">Receipt</Text>
                        <Text className="text-[10px] font-mono text-black/45 tracking-wide">{e.receiptId}</Text>
                      </View>
                      {e.latestCol && (
                        <TouchableOpacity
                          onPress={() => navigation.navigate('Receipt', {
                            receipt: {
                              receiptNo: e.receiptId,
                              partyId: e.partyId,
                              customerName: e.customerName,
                              dispositionType: e.type,
                              actionType: e.type,
                              amount: e.amount,
                              advanceAmount: 0,
                              paymentMode: e.mode || e.latestCol?.mode || '',
                              agentName: agentInfo?.name || '',
                              branchName: agentInfo?.branchCode || e.branchName || '',
                              glCode: agentInfo?.branchCode || '',
                              createdAt: e.visitedAt,
                            },
                            backTo: 'Visits',
                          })}
                          className="border border-black/15 bg-[#F0F4F7] px-3 py-1 rounded-full"
                        >
                          <Text className="text-[10px] font-medium text-black/60">View Receipt</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
