import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { CompositeScreenProps } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { useHomeSummary } from '../hooks/useHomeSummary'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>

const fmtL = (n: number) => {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr'
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  return '₹' + n.toLocaleString('en-IN')
}

const INCENTIVE_TIERS = [
  { name: 'Base',     emoji: '🟫', rate: 0,   bottom: 0,        top: 1000000, color: '#78716c', bg: 'rgba(120,113,108,0.10)', label: '< ₹10L'  },
  { name: 'Bronze',   emoji: '🥉', rate: 0.5, bottom: 1000000,  top: 1200000, color: '#cd7f32', bg: 'rgba(205,127,50,0.10)',  label: '₹10–12L' },
  { name: 'Silver',   emoji: '🥈', rate: 0.8, bottom: 1200000,  top: 1500000, color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',label: '₹12–15L' },
  { name: 'Gold',     emoji: '🥇', rate: 1.2, bottom: 1500000,  top: 2000000, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: '₹15–20L' },
  { name: 'Platinum', emoji: '💎', rate: 1.8, bottom: 2000000,  top: Infinity,color: '#818cf8', bg: 'rgba(129,140,248,0.10)',label: '> ₹20L'  },
]

export default function HomeScreen({ navigation }: Props) {
  const { agentInfo, dataVersion } = useAgent()
  const [bucketMode, setBucketMode] = useState<'count' | 'amount'>('count')
  const [search, setSearch] = useState('')
  const [showTierInfo, setShowTierInfo] = useState(false)

  const { data: homeData } = useHomeSummary(agentInfo?.agentId ?? '', dataVersion)

  const buckets = homeData?.bucketSummary ?? []
  const totalOverdue = homeData?.overdueTotal ?? 0
  const totalCollected = homeData?.collectedToday ?? 0
  const monthlyCollected = homeData?.monthlyCollected ?? 0

  const curTierIdx = INCENTIVE_TIERS.reduce((best, t, i) => monthlyCollected >= t.bottom ? i : best, 0)
  const curTier    = INCENTIVE_TIERS[curTierIdx]
  const nextTier   = INCENTIVE_TIERS[curTierIdx + 1] ?? null

  const totalEarned = curTier.rate > 0 ? Math.round(monthlyCollected * curTier.rate / 100) : 0
  const platEarned  = Math.round(monthlyCollected * 1.8 / 100)
  const toNext     = nextTier ? Math.max(0, nextTier.bottom - monthlyCollected) : 0
  const totalExtra = nextTier ? Math.round(monthlyCollected * (nextTier.rate - curTier.rate) / 100) : 0

  const initials = agentInfo?.name
    ? agentInfo.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0,2)
    : 'SF'

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-5 py-3 flex-row items-center justify-between border-b border-black/[0.06]">
        <Text className="text-[rgba(0,0,0,0.9)] text-lg font-medium tracking-tight">SliceField</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          className="w-9 h-9 rounded-full bg-[#FAE2FA] items-center justify-center"
        >
          <Text className="text-[#A008A3] text-xs font-bold">{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="px-5 py-2 bg-white">
        <View className="flex-row items-center gap-3 bg-[#F0F4F7] rounded-full px-4 py-1.5">
          <Text className="text-black/30">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search cases..."
            placeholderTextColor="rgba(0,0,0,0.3)"
            className="flex-1 text-sm text-[rgba(0,0,0,0.7)]"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}>

        {/* Portfolio Overview */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Portfolio Overview</Text>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Total{'\n'}Allocated</Text>
              <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{homeData?.totalCases ?? 0}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">cases</Text>
            </View>
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Pending{'\n'}Cases</Text>
              <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{homeData?.pendingVisits ?? 0}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">cases</Text>
            </View>
            <View className="flex-1 bg-[#FAE2FA] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-[#A008A3] font-medium">Collected{'\n'}(Month)</Text>
              <Text className="text-lg font-medium text-[#D30AD7] mt-1">{fmtL(homeData?.collectedToday ?? 0)}</Text>
              <Text className="text-[10px] text-[#D30AD7] mt-0.5" style={{ opacity: 0.7 }}>this month</Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Amount Due</Text>
              <Text className="text-base font-medium text-[#CE1D26] mt-1">{fmtL(totalOverdue)}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">overdue</Text>
            </View>
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Outstanding</Text>
              <Text className="text-base font-medium text-[rgba(0,0,0,0.9)] mt-1">{fmtL(totalOverdue)}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">total</Text>
            </View>
          </View>
        </View>

        {/* Bucket Summary */}
        <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <View className="px-5 py-3 flex-row items-center justify-between" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
            <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">Bucket Summary</Text>
            <View className="flex-row rounded-full overflow-hidden border border-black/10">
              <TouchableOpacity
                onPress={() => setBucketMode('count')}
                className={`px-2.5 py-1 ${bucketMode === 'count' ? 'bg-[#D30AD7]' : 'bg-white'}`}
              >
                <Text className={`text-xs font-medium ${bucketMode === 'count' ? 'text-white' : 'text-black/50'}`}>#</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBucketMode('amount')}
                className={`px-2.5 py-1 ${bucketMode === 'amount' ? 'bg-[#D30AD7]' : 'bg-white'}`}
              >
                <Text className={`text-xs font-medium ${bucketMode === 'amount' ? 'text-white' : 'text-black/50'}`}>₹</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Table header */}
          <View className="flex-row bg-[#F0F4F7] px-4 py-2">
            <Text className="flex-1 text-[10px] text-black/40 font-medium">Bucket</Text>
            <Text className="w-16 text-right text-[10px] text-black/40 font-medium">Opening</Text>
            <Text className="w-16 text-right text-[10px] text-black/40 font-medium">Collected</Text>
            <Text className="w-16 text-right text-[10px] text-black/40 font-medium">Pending</Text>
            <View className="w-4" />
          </View>

          {buckets.map((b: any, i: number) => {
            const opening   = bucketMode === 'count' ? b.cases : b.overdue
            const collected = bucketMode === 'count' ? (b.collectedCases ?? 0) : b.collected
            const pending   = bucketMode === 'count' ? b.cases - (b.collectedCases ?? 0) : Math.max(0, b.overdue - b.collected)
            return (
              <TouchableOpacity
                key={`bucket-${i}-${b.bucket ?? b.name ?? ''}`}
                onPress={() => navigation.navigate('Allocations', { defaultBucket: b.bucket || b.name })}
                className={`flex-row items-center px-4 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F0F4F7]/40'}`}
                style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.04)' }}
              >
                <Text className="flex-1 font-medium text-xs text-[rgba(0,0,0,0.9)]">{b.bucket || b.name}</Text>
                <Text className="w-16 text-right text-xs text-black/50">{bucketMode === 'count' ? opening : fmtL(opening)}</Text>
                <Text className="w-16 text-right text-xs text-[#00A63E] font-medium">
                  {collected > 0 ? (bucketMode === 'count' ? collected : fmtL(collected)) : '—'}
                </Text>
                <Text className="w-16 text-right text-xs text-[rgba(0,0,0,0.7)]">{bucketMode === 'count' ? pending : fmtL(pending)}</Text>
                <Text className="w-4 text-center text-black/20 text-sm">›</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Summary footer */}
        <Text className="text-center text-xs text-black/40">{fmtL(totalCollected)} collected of {fmtL(totalOverdue)} total</Text>

        {/* ═══ EARNINGS TRACKER ═══ */}
        <View style={{ backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,0.9)' }}>Earnings Tracker</Text>
                <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 1 }}>June 2025 · Variable Pay</Text>
              </View>
              <View style={{ backgroundColor: curTier.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: curTier.color }}>{curTier.emoji} {curTier.name}</Text>
              </View>
            </View>
          </View>

          {/* Big earned number */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 }}>Variable Pay Earned</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: curTier.rate > 0 ? '#007E2F' : 'rgba(0,0,0,0.3)' }}>
                {curTier.rate > 0 ? fmtL(totalEarned) : '₹0'}
              </Text>
              {nextTier && (
                <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontWeight: '500' }}>
                  → {fmtL(Math.round((monthlyCollected + toNext) * nextTier.rate / 100))} at {nextTier.name}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{fmtL(monthlyCollected)} collected this month</Text>
          </View>

          {/* Progress track — horizontal line with tier markers */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            {/* Unified progress bar */}
            {(() => {
              const MAX = 2500000
              const fillPct = Math.min(monthlyCollected / MAX, 1) * 100
              const ticks = INCENTIVE_TIERS.slice(1).map(t => ({ pct: (t.bottom / MAX) * 100, color: t.color, label: fmtL(t.bottom), name: t.name }))
              return (
                <>
                  {/* Track */}
                  <View style={{ height: 8, backgroundColor: '#F0F4F7', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                    <View style={{ height: '100%', width: `${fillPct}%`, backgroundColor: curTier.color, borderRadius: 8 }} />
                  </View>

                  {/* Tick marks + labels */}
                  <View style={{ position: 'relative', height: 20 }}>
                    {ticks.map((tick, ti) => (
                      <View key={`tick-${ti}-${tick.name}`} style={{ position: 'absolute', left: `${tick.pct}%`, alignItems: 'center', transform: [{ translateX: -18 }] }}>
                        <Text style={{ fontSize: 8, color: monthlyCollected >= (INCENTIVE_TIERS.find(t => t.name === tick.name)?.bottom ?? 0) ? tick.color : 'rgba(0,0,0,0.3)', fontWeight: '700' }}>
                          {tick.label}
                        </Text>
                        <Text style={{ fontSize: 7, color: 'rgba(0,0,0,0.25)', marginTop: 1 }}>{tick.name}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )
            })()}
          </View>

          {/* Next tier nudge */}
          {nextTier ? (
            <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 14, backgroundColor: nextTier.bg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: nextTier.color }}>
                    {nextTier.emoji} {fmtL(toNext)} away from {nextTier.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: nextTier.color, opacity: 0.75, marginTop: 2 }}>
                    Unlock {nextTier.rate}% rate → earn {fmtL(totalExtra)} extra this month
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowTierInfo(true)}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: nextTier.color }}>i</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 14, backgroundColor: '#F5F3FF', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#818cf8' }}>Platinum unlocked!</Text>
                <Text style={{ fontSize: 11, color: '#818cf8', opacity: 0.8, marginTop: 1 }}>Maximum 1.8% rate · {fmtL(platEarned)} earned</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Tier Info Modal */}
      <Modal visible={showTierInfo} transparent animationType="slide" onRequestClose={() => setShowTierInfo(false)}>
        <TouchableOpacity
          className="flex-1 justify-end bg-black/40"
          activeOpacity={1}
          onPress={() => setShowTierInfo(false)}
        >
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <View className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-5" />
            <Text className="text-base font-semibold text-[rgba(0,0,0,0.9)] mb-1">How incentives work</Text>
            <Text className="text-xs text-black/45 mb-5 leading-relaxed">
              Incentive rate is based on total amount collected in the calendar month. Higher collections unlock a better rate — applied to your entire monthly collection.
            </Text>
            {INCENTIVE_TIERS.map((tier, i) => {
              const isActive = i === curTierIdx
              return (
                <View
                  key={tier.name}
                  className="flex-row items-center justify-between px-4 py-3"
                  style={{ backgroundColor: isActive ? tier.bg : 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}
                >
                  <View className="flex-row items-center gap-2.5">
                    <Text className="text-base">{tier.emoji}</Text>
                    <View>
                      <Text className="text-xs font-semibold" style={{ color: isActive ? tier.color : 'rgba(0,0,0,0.8)' }}>
                        {tier.name}{isActive ? ' ← you' : ''}
                      </Text>
                      <Text className="text-[10px] text-black/40 mt-0.5">{tier.label}</Text>
                    </View>
                  </View>
                  <Text className="text-sm font-bold" style={{ color: tier.rate > 0 ? tier.color : '#94A3B8' }}>
                    {tier.rate > 0 ? `${tier.rate}%` : 'Fixed only'}
                  </Text>
                </View>
              )
            })}
            <TouchableOpacity
              onPress={() => setShowTierInfo(false)}
              className="w-full bg-[#090B0C] rounded-full py-3 mt-4 items-center"
            >
              <Text className="text-white text-sm font-medium">Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}
