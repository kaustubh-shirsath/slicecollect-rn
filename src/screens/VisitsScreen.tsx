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
import { getCustomerRef, getPaymentLinkStatus, formatName } from '../data/caseMeta'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Visits'>,
  NativeStackScreenProps<RootStackParamList>
>

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

function DonutChart({ segments }: { segments: { pct: number; color: string }[] }) {
  const size = 124
  const r = 48
  const cx = size / 2
  const cy = size / 2

  function arc(startPct: number, pct: number, color: string, key: number) {
    if (pct <= 0) return null
    const startAngle = (startPct / 100) * 360 - 90
    const endAngle = ((startPct + Math.min(pct, 99.99)) / 100) * 360 - 90
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
    return <Path key={key} d={d} stroke={color} strokeWidth="14" fill="none" strokeLinecap="butt" />
  }

  let acc = 0
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="#EAEBED" strokeWidth="14" fill="none" />
      {segments.map((seg, i) => {
        const el = arc(acc, seg.pct, seg.color, i)
        acc += seg.pct
        return el
      })}
    </Svg>
  )
}


// slice Activity-style avatar colours — stable pastel per name
const AVATAR_COLORS = [
  { bg: '#EDEBFB', fg: '#6D5AE6' },
  { bg: '#FDEEDC', fg: '#E58A2E' },
  { bg: '#E3F5E9', fg: '#2FA35C' },
  { bg: '#FBE5E7', fg: '#D9485A' },
  { bg: '#E4EFFB', fg: '#3B7BD8' },
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

type StatusTab = 'Cash in Hand' | 'Cash Deposited' | 'Payment Link' | 'PTP Marked'

export default function VisitsScreen(_props: Props) {
  const { agentInfo, dataVersion } = useAgent()
  // Cash exists only for Loans (bank). Pure Credit Card / Borrow agents have no cash flow:
  // they see Collections + PTP Marked tabs and no deposit entry point.
  const hasBankCases = agentInfo
    ? ALL_CUSTOMERS.some((c: any) => c.username === agentInfo.username && c.userType === 'bank')
    : false
  const [statusTab, setStatusTab] = useState<StatusTab>(hasBankCases ? 'Cash in Hand' : 'Payment Link')
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
        // Per-case amount split: Cash in Hand / Deposited / PTP Marked
        const cashInHand = act.collections.filter((x: any) => !x.deposited && x.mode === 'Cash').reduce((s: number, x: any) => s + x.amount, 0)
        const deposited  = act.collections.filter((x: any) => x.deposited && x.mode === 'Cash').reduce((s: number, x: any) => s + x.amount, 0)
        const ptpMarked  = disp.ptpDate ? (disp.ptpAmount ?? 0) : 0
        // Payment-link collections: amount counts only when the link status is Success
        const linkCols = act.collections.filter((x: any) => x.mode === 'Payment Link')
        const linkAmount = linkCols.reduce((s: number, x: any) => s + x.amount, 0)
        const linkSuccessAmount = linkCols.filter((x: any) => getPaymentLinkStatus(x.receiptId) === 'Success').reduce((s: number, x: any) => s + x.amount, 0)
        const linkStatus = linkCols.length > 0 ? getPaymentLinkStatus(linkCols[linkCols.length - 1].receiptId) : null
        const lastVisit = act.visitHistory && act.visitHistory.length > 0 ? act.visitHistory[act.visitHistory.length - 1] : null
        return [{
          name: c.name,
          partyId: c.partyId,
          waiverRaised: (lastVisit?.waiverPct ?? 0) > 0,
          time: new Date(disp.visitedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(disp.visitedAt),
          amount: totalCollected,
          cashInHand, deposited, ptpMarked,
          linkAmount, linkSuccessAmount, linkStatus,
          type: disp.code,
          category: totalCollected >= c.emiOs && c.emiOs > 0 ? 'collected' : totalCollected > 0 ? 'partial' : 'contacted',
          ptpDate: disp.ptpDate ?? null,
          userType: c.userType,
        }]
      })
      .sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
  }, [agentInfo, dataVersion])

  const today = new Date().toDateString()
  const todayEntries = allEntries.filter((e: any) => e.date.toDateString() === today)

  // Entries filtered by the active status tab
  const filteredEntries = useMemo(() => {
    if (statusTab === 'Cash in Hand')   return allEntries.filter((e: any) => e.cashInHand > 0)
    if (statusTab === 'Cash Deposited') return allEntries.filter((e: any) => e.deposited > 0)
    if (statusTab === 'Payment Link')   return allEntries.filter((e: any) => e.linkAmount > 0)
    return allEntries.filter((e: any) => e.ptpMarked > 0 || e.ptpDate)
  }, [allEntries, statusTab])

  // Amount an entry contributes on the active tab (Payment Link counts Success only)
  const tabAmount = (e: any) =>
    statusTab === 'PTP Marked' ? e.ptpMarked
    : statusTab === 'Cash Deposited' ? e.deposited
    : statusTab === 'Payment Link' ? e.linkSuccessAmount
    : e.cashInHand
  const overallTabTotal = filteredEntries.reduce((s: number, e: any) => s + tabAmount(e), 0)

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

  // Disposition mix for today: Collected (with payment-type split) > Waiver Raised > PTP > Others
  const dispCollected = todayEntries.filter((e: any) => e.amount > 0)
  const dispWaiver = todayEntries.filter((e: any) => e.amount === 0 && e.waiverRaised)
  const dispPtp = todayEntries.filter((e: any) => e.amount === 0 && !e.waiverRaised && e.ptpDate)
  const dispOthers = todayEntries.filter((e: any) => e.amount === 0 && !e.waiverRaised && !e.ptpDate)
  const dispTotal = todayEntries.length || 1
  const collectedSplit = Object.entries(
    dispCollected.reduce((m: Record<string, number>, e: any) => { m[e.type || 'Other'] = (m[e.type || 'Other'] || 0) + 1; return m }, {})
  ).sort((a, b) => b[1] - a[1])
  const dispSegments = [
    { label: 'Collected', count: dispCollected.length, color: '#00A63E' },
    { label: 'Waiver Raised', count: dispWaiver.length, color: '#7C3AED' },
    { label: 'PTP', count: dispPtp.length, color: '#FF8100' },
    { label: 'Others', count: dispOthers.length, color: '#94A3B8' },
  ]

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
        {/* Donut chart — today's disposition mix */}
        <View className="bg-white px-5 py-5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-4">Today&apos;s Dispositions</Text>
          <View className="flex-row items-center gap-5">
            <View className="relative">
              <DonutChart segments={dispSegments.map(seg => ({ pct: (seg.count / dispTotal) * 100, color: seg.color }))} />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-[rgba(0,0,0,0.9)] font-bold text-lg text-center">{todayEntries.length}</Text>
                <Text className="text-black/40 text-[9px]">dispositions</Text>
              </View>
            </View>
            <View className="flex-1 gap-1.5">
              {dispSegments.map(seg => (
                <View key={seg.label}>
                  <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                    <Text className="text-[11px] text-black/60 flex-1">{seg.label}</Text>
                    <Text className="text-[11px] font-semibold text-[rgba(0,0,0,0.75)] w-8 text-right">{seg.count}</Text>
                  </View>
                  {seg.label === 'Collected' && collectedSplit.length > 0 && (
                    <View className="gap-0.5 mt-0.5 mb-1" style={{ paddingLeft: 16 }}>
                      {collectedSplit.map(([type, n]) => (
                        <View key={type} className="flex-row items-center">
                          <Text className="text-[10px] text-black/40 flex-1" numberOfLines={1}>{type}</Text>
                          <Text className="text-[10px] text-black/45 w-8 text-right">{n}</Text>
                        </View>
                      ))}
                    </View>
                  )}
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
              <Text className="text-[10px] text-white/55 mt-2.5">Please deposit this cash in your branch before you click 'Deposit'.</Text>
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
          {((hasBankCases ? ['Cash in Hand', 'Cash Deposited', 'Payment Link', 'PTP Marked'] : ['Payment Link', 'PTP Marked']) as StatusTab[]).map(t => (
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

        {/* Overall total — slice History style: quiet label over one large centred figure */}
        {dateSections.length > 0 && (
          <View className="items-center pt-5 pb-2">
            <Text className="text-[13px] text-black/40">
              {statusTab === 'Payment Link' ? 'Total via payment link' : `Total ${statusTab.toLowerCase()}`}
            </Text>
            <Text style={{ fontSize: 38, fontWeight: '800', color: 'rgba(0,0,0,0.9)', letterSpacing: -1, marginTop: 2 }}>
              {statusTab === 'PTP Marked'
                ? `${filteredEntries.length} case${filteredEntries.length === 1 ? '' : 's'}`
                : fmt(overallTabTotal)}
            </Text>
          </View>
        )}

        {/* Date-wise summary — descending */}
        <View className="px-4 py-3 gap-3">
          {dateSections.length === 0 ? (
            <View className="bg-white rounded-[24px] p-8 items-center" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
              <Text className="text-black/50 text-sm">No {statusTab.toLowerCase()} entries</Text>
            </View>
          ) : (
            dateSections.map(section => (
              <View key={section.key} className="gap-2">
                {/* Date header — aligned with the row content padding */}
                <View className="flex-row items-end px-4 pt-2">
                  <Text className="flex-1 text-[16px] font-bold text-[rgba(0,0,0,0.85)]">{section.label}</Text>
                  <Text className="text-[11px] text-black/45">
                    {section.entries.length} case{section.entries.length > 1 ? 's' : ''}  ·  <Text className="font-semibold text-black/65">{fmt(section.entries.reduce((s: number, e: any) => s + tabAmount(e), 0))}</Text>
                  </Text>
                </View>

                <View className="bg-white rounded-[20px]" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
                {section.entries.map((e: any, i: number) => {
              const maskedId = getCustomerRef(e.partyId, e.userType).masked
              const av = avatarColor(e.name)
              return (
                <View key={i} className="flex-row items-center px-4 py-3.5" style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' } : undefined}>
                  {/* Avatar */}
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: av.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ color: av.fg, fontSize: 16, fontWeight: '700' }}>{e.name.trim()[0]}</Text>
                  </View>

                  {/* Name + left-aligned disposition tag + ref */}
                  <View className="flex-1 min-w-0 pr-2">
                    <Text className="font-semibold text-[rgba(0,0,0,0.9)] text-[15px] leading-tight" numberOfLines={1}>{formatName(e.name)}</Text>
                    <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                      {e.type ? (
                        <View className="bg-[#FAE2FA] px-2 py-0.5 rounded-full self-start">
                          <Text className="text-[9px] text-[#A008A3] font-medium" numberOfLines={1}>{e.type}</Text>
                        </View>
                      ) : null}
                      {statusTab === 'PTP Marked' && e.ptpDate ? (
                        <Text className="text-[10px] text-black/45">Due {e.ptpDate}</Text>
                      ) : null}
                    </View>
                    <Text className="text-black/35 text-[10px] font-mono tracking-wider mt-1" numberOfLines={1}>{maskedId}</Text>
                  </View>

                  {/* Amount, time, then link status below the timestamp */}
                  <View className="items-end">
                    <Text className="font-semibold text-[15px]" style={{ color: statusTab === 'PTP Marked' ? 'rgba(0,0,0,0.85)' : '#0B9D48' }} numberOfLines={1}>
                      {statusTab === 'PTP Marked'
                        ? (e.ptpMarked > 0 ? fmt(e.ptpMarked) : '—')
                        : statusTab === 'Cash Deposited'
                        ? fmt(e.deposited)
                        : statusTab === 'Payment Link'
                        ? fmt(e.linkAmount)
                        : fmt(e.cashInHand)}
                    </Text>
                    <Text className="text-black/35 text-[10px] mt-0.5">{e.time}</Text>
                    {statusTab === 'Payment Link' && e.linkStatus ? (
                      <View className="px-1.5 py-0.5 rounded-full mt-1" style={{ backgroundColor: e.linkStatus === 'Success' ? '#E0F4E8' : e.linkStatus === 'Pending' ? '#FFF0E0' : '#F9E4E5' }}>
                        <Text className="text-[9px] font-medium" style={{ color: e.linkStatus === 'Success' ? '#007E2F' : e.linkStatus === 'Pending' ? '#A35300' : '#CE1D26' }}>{e.linkStatus}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              )
                })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
