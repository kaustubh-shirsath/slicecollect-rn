import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { ALL_CUSTOMERS } from '../data/customers'
import { getActivity, updateActivity } from '../data/activityLog'
import { getCustomerRef } from '../data/caseMeta'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Visits'>,
  NativeStackScreenProps<RootStackParamList>
>

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

function DonutChart({ fullPct, partialPct }: { fullPct: number; partialPct: number }) {
  const size = 112
  const r = 50
  const cx = size / 2
  const cy = size / 2

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

type StatusTab = 'Cash in Hand' | 'Deposited' | 'PTP Marked' | 'Collections'

export default function VisitsScreen({ navigation }: Props) {
  const { agentInfo, dataVersion } = useAgent()
  // Cash exists only for Loans (bank). Pure Credit Card / Borrow agents have no cash flow:
  // they see Collections + PTP Marked tabs and no deposit entry point.
  const hasBankCases = agentInfo
    ? ALL_CUSTOMERS.some((c: any) => c.username === agentInfo.username && c.userType === 'bank')
    : false
  const [statusTab, setStatusTab] = useState<StatusTab>(hasBankCases ? 'Cash in Hand' : 'Collections')
  const [depositing, setDepositing] = useState(false)
  const [lastDeposit, setLastDeposit] = useState<{ amount: number; date: string } | null>(null)

  const allEntries = useMemo(() => {
    if (!agentInfo) return []
    return ALL_CUSTOMERS
      .filter((c: any) => c.username === agentInfo.username)
      .flatMap((c: any) => {
        const act = getActivity(c.partyId)
        if (!act?.latestDisposition) return []
        const disp = act.latestDisposition
        const totalCollected = act.collections.reduce((s: number, x: any) => s + x.amount, 0)
        const latestCol = act.collections.length > 0 ? act.collections[act.collections.length - 1] : null
        // Per-case amount split: Cash in Hand / Deposited / PTP Marked
        const cashInHand = act.collections.filter((x: any) => !x.deposited && x.mode === 'Cash').reduce((s: number, x: any) => s + x.amount, 0)
        const deposited  = act.collections.filter((x: any) => x.deposited).reduce((s: number, x: any) => s + x.amount, 0)
        const ptpMarked  = disp.ptpDate ? (disp.ptpAmount ?? 0) : 0
        return [{
          name: c.name,
          partyId: c.partyId,
          visitedAt: disp.visitedAt,
          time: new Date(disp.visitedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(disp.visitedAt),
          amount: totalCollected,
          cashInHand, deposited, ptpMarked,
          type: disp.code,
          mode: act.collections[0]?.mode ?? '',
          category: totalCollected >= c.emiOs && c.emiOs > 0 ? 'collected' : totalCollected > 0 ? 'partial' : 'contacted',
          bucket: c.assetClassification,
          dpd: c.dpd,
          receiptId: latestCol?.receiptId ?? null,
          ptpDate: disp.ptpDate ?? null,
          remarks: disp.remarks,
          latestCol,
          customerName: c.name,
          customerMobile: c.mobile || '',
          branchName: c.branch,
          product: c.product,
          userType: c.userType,
        }]
      })
      .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
  }, [agentInfo, dataVersion])

  const today = new Date().toDateString()
  const todayEntries = allEntries.filter((e: any) => e.date.toDateString() === today)

  // Entries filtered by the active status tab
  const filteredEntries = useMemo(() => {
    if (statusTab === 'Cash in Hand') return allEntries.filter((e: any) => e.cashInHand > 0)
    if (statusTab === 'Deposited')    return allEntries.filter((e: any) => e.deposited > 0)
    if (statusTab === 'Collections')  return allEntries.filter((e: any) => e.amount > 0)
    return allEntries.filter((e: any) => e.ptpMarked > 0 || e.ptpDate)
  }, [allEntries, statusTab])

  // Date-wise sections, descending
  const dateSections = useMemo(() => {
    const map: Record<string, { key: string; label: string; date: Date; entries: any[] }> = {}
    for (const e of filteredEntries) {
      const key = e.date.toISOString().split('T')[0]
      if (!map[key]) {
        map[key] = {
          key,
          label: e.date.toDateString() === today
            ? 'Today'
            : e.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          date: e.date,
          entries: [],
        }
      }
      map[key].entries.push(e)
    }
    return Object.values(map).sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [filteredEntries])

  const totalCollectedToday = todayEntries.reduce((s: number, e: any) => s + (e.category !== 'contacted' ? e.amount : 0), 0)
  const fullAmt    = todayEntries.filter((e: any) => e.category === 'collected').reduce((s: number, e: any) => s + e.amount, 0)
  const partialAmt = todayEntries.filter((e: any) => e.category === 'partial').reduce((s: number, e: any) => s + e.amount, 0)
  const totalAmt   = fullAmt + partialAmt || 1
  const fullPct    = Math.round(fullAmt / totalAmt * 100)
  const partialPct = Math.round(partialAmt / totalAmt * 100)
  const notCollectedCount = todayEntries.filter((e: any) => e.category === 'contacted').length

  const cashToDeposit = agentInfo ? ALL_CUSTOMERS
    .filter((c: any) => c.username === agentInfo.username)
    .flatMap((c: any) => (getActivity(c.partyId)?.collections ?? []).filter((col: any) => !col.deposited && col.mode === 'Cash'))
    .reduce((s: number, col: any) => s + col.amount, 0) : 0

  const glCode = agentInfo?.glCode || '11799'
  const branch = agentInfo?.branch || ''

  // TODO backend: POST to branch banking's maker-entry API with { glCode, branch, amount },
  // which creates a maker entry for checker approval. Prototype simulates the round trip.
  async function handleDeposit() {
    if (!agentInfo || cashToDeposit <= 0 || depositing) return
    setDepositing(true)
    const depositedAmount = cashToDeposit
    await new Promise(res => setTimeout(res, 900))
    const depositId = 'DP' + Date.now()
    for (const c of ALL_CUSTOMERS.filter((c: any) => c.username === agentInfo.username)) {
      const act = getActivity(c.partyId)
      if (!act) continue
      const hasCash = act.collections.some((col: any) => !col.deposited && col.mode === 'Cash')
      if (!hasCash) continue
      const updated = act.collections.map((col: any) =>
        (!col.deposited && col.mode === 'Cash') ? { ...col, deposited: true, depositId } : col
      )
      updateActivity(c.partyId, { collections: updated })
    }
    setDepositing(false)
    const d = new Date()
    const dateStr = [d.getDate(), d.getMonth() + 1, d.getFullYear() % 100].map(n => String(n).padStart(2, '0')).join('-')
    setLastDeposit({ amount: depositedAmount, date: dateStr })
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pb-5" style={{ paddingTop: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
        <View>
          <Text className="text-[rgba(0,0,0,0.9)] font-medium text-xl">My Collections</Text>
          <Text className="text-black/40 text-xs mt-0.5">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Donut chart */}
        <View className="bg-white px-4 py-5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <View className="flex-row items-center gap-5">
            <View className="relative">
              <DonutChart fullPct={fullPct} partialPct={partialPct} />
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
                  <Text className="text-[11px] text-black/35 w-11 text-right" numberOfLines={1}>{l.pct}</Text>
                  <Text className="text-[11px] font-medium text-[rgba(0,0,0,0.75)] w-20 text-right" numberOfLines={1}>{l.amount}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Cash in Hand widget (Loans agents) / Today's Collections (Credit Card & Borrow only) */}
        {hasBankCases ? (
          cashToDeposit > 0 ? (
            <View className="mx-4 my-3 bg-[#D30AD7] rounded-[24px] px-5 py-4" style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[10px] text-white/60 uppercase tracking-widest font-medium mb-0.5">Cash in Hand</Text>
                  <Text className="text-2xl font-medium text-white">{fmt(cashToDeposit)}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleDeposit}
                  disabled={depositing}
                  className="bg-white px-5 py-2.5 rounded-full"
                >
                  <Text className="text-[#D30AD7] text-xs font-semibold">{depositing ? 'Depositing…' : 'Deposit →'}</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center gap-5 mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}>
                <View>
                  <Text className="text-[9px] text-white/50 uppercase tracking-wider">GL Code</Text>
                  <Text className="text-xs font-medium text-white font-mono mt-0.5">{glCode}</Text>
                </View>
                <View>
                  <Text className="text-[9px] text-white/50 uppercase tracking-wider">Branch</Text>
                  <Text className="text-xs font-medium text-white mt-0.5">{branch}</Text>
                </View>
              </View>
            </View>
          ) : lastDeposit ? (
            <View className="mx-4 my-3 bg-[#E0F4E8] rounded-[24px] px-5 py-4" style={{ borderWidth: 1, borderColor: 'rgba(0,166,62,0.25)' }}>
              <Text className="text-[#007E2F] text-sm font-semibold text-center">
                {fmt(lastDeposit.amount)} has been deposited on {lastDeposit.date}
              </Text>
            </View>
          ) : null
        ) : (
          <View className="mx-4 my-3 bg-[#D30AD7] rounded-[24px] px-5 py-4" style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}>
            <Text className="text-[10px] text-white/60 uppercase tracking-widest font-medium mb-0.5">Today's Collections</Text>
            <Text className="text-2xl font-medium text-white">{fmt(totalCollectedToday)}</Text>
            <Text className="text-[10px] text-white/60 mt-1">All collections via payment link — no cash deposit needed</Text>
          </View>
        )}

        {/* Status tabs — Loans agents: Cash in Hand / Deposited / PTP; cc-borrow-only agents: Collections / PTP */}
        <View className="flex-row bg-white" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          {((hasBankCases ? ['Cash in Hand', 'Deposited', 'PTP Marked'] : ['Collections', 'PTP Marked']) as StatusTab[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setStatusTab(t)}
              className="flex-1 py-3 items-center"
              style={{ borderBottomWidth: 2, borderBottomColor: statusTab === t ? '#D30AD7' : 'transparent' }}
            >
              <Text className={`text-[11px] font-medium ${statusTab === t ? 'text-[#D30AD7]' : 'text-black/50'}`}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date-wise summary — descending */}
        <View className="px-4 py-3 gap-3">
          {dateSections.length === 0 ? (
            <View className="bg-white rounded-[24px] p-8 items-center" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
              <Text className="text-black/50 text-sm">No {statusTab.toLowerCase()} entries</Text>
            </View>
          ) : (
            dateSections.map(section => (
              <View key={section.key} className="gap-2">
                {/* Date header — top left */}
                <View className="flex-row items-center justify-between px-1 pt-2">
                  <Text className="text-[13px] font-semibold text-[rgba(0,0,0,0.8)]">{section.label}</Text>
                  <Text className="text-[10px] text-black/40">{section.entries.length} case{section.entries.length > 1 ? 's' : ''}</Text>
                </View>

                {section.entries.map((e: any, i: number) => {
              const maskedId = String(e.partyId).replace(/^(.{4})(.+)(.{4})$/, (_: string, a: string, m: string, z: string) => a + '·'.repeat(Math.min(4, m.length)) + z)
              return (
                <View key={i} className="bg-white rounded-[20px] px-4 py-4 gap-2.5" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0">
                      <Text className="font-semibold text-[rgba(0,0,0,0.9)] text-[15px] leading-tight">{e.name}</Text>
                      <Text className="text-black/35 text-[11px] font-mono tracking-wider mt-0.5">{maskedId}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-[15px] text-[rgba(0,0,0,0.85)]">
                        {statusTab === 'PTP Marked'
                          ? (e.ptpMarked > 0 ? fmt(e.ptpMarked) : '—')
                          : statusTab === 'Deposited'
                          ? fmt(e.deposited)
                          : statusTab === 'Collections'
                          ? fmt(e.amount)
                          : fmt(e.cashInHand)}
                      </Text>
                      <Text className="text-black/35 text-[10px] mt-0.5">{e.time}</Text>
                    </View>
                  </View>

                  {/* PTP due date only — amounts live in the amount column */}
                  {statusTab === 'PTP Marked' && e.ptpDate ? (
                    <Text className="text-[11px] text-black/45">Due {e.ptpDate}</Text>
                  ) : null}

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
                              customerMobile: e.customerMobile || '',
                              refLabel: getCustomerRef(e.partyId, e.userType).label,
                              refValue: getCustomerRef(e.partyId, e.userType).value,
                              dispositionType: e.type,
                              actionType: e.type,
                              amount: e.amount,
                              advanceAmount: 0,
                              paymentMode: e.mode || e.latestCol?.mode || '',
                              agentName: agentInfo?.name || '',
                              branchName: agentInfo?.branch || e.branchName || '',
                              glCode: agentInfo?.glCode || '',
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
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
