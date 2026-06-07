import { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { CompositeScreenProps } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { getHomeData } from '../data/homeData'

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

  const homeData = useMemo(() => getHomeData(agentInfo?.username ?? ''), [agentInfo?.username, dataVersion])

  const buckets = homeData.bucketSummary
  const totalOverdue = homeData.overdueTotal
  const totalCollected = homeData.collectedToday
  const monthlyCollected = homeData.monthlyCollected

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
      <View className="bg-white px-5 pb-3 flex-row items-center justify-between border-b border-black/[0.06]">
        <Text className="text-[rgba(0,0,0,0.9)] text-lg font-medium tracking-tight">SliceField</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          className="w-9 h-9 rounded-full bg-[#FAE2FA] items-center justify-center"
        >
          <Text className="text-[#A008A3] text-xs font-bold">{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="px-5 py-3 bg-white">
        <View className="flex-row items-center gap-3 bg-[#F0F4F7] rounded-full px-4 py-2.5">
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
              <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{homeData.totalCases}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">cases</Text>
            </View>
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Pending{'\n'}Cases</Text>
              <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{homeData.pendingVisits}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">cases</Text>
            </View>
            <View className="flex-1 bg-[#FAE2FA] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-[#A008A3] font-medium">Collected{'\n'}Today</Text>
              <Text className="text-lg font-medium text-[#D30AD7] mt-1">{fmtL(homeData.collectedToday)}</Text>
              <Text className="text-[10px] text-[#D30AD7] mt-0.5" style={{ opacity: 0.7 }}>today</Text>
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
                key={b.bucket || b.name}
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

        {/* Weekly Target */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-[rgba(0,0,0,0.9)]">Weekly Target</Text>
            <Text className="text-xs text-black/40">{fmtL(homeData.monthlyCollected)} / {fmtL(homeData.weeklyTarget)}</Text>
          </View>
          <View className="w-full bg-[#F0F4F7] rounded-full h-2.5 mb-2">
            <View
              className="bg-[#D30AD7] h-2.5 rounded-full"
              style={{ width: `${Math.min(100, Math.round((homeData.monthlyCollected / homeData.weeklyTarget) * 100))}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-black/50">{Math.min(100, Math.round((homeData.monthlyCollected / homeData.weeklyTarget) * 100))}% achieved</Text>
            <Text className="text-xs text-[#D30AD7] font-medium">{fmtL(Math.max(0, homeData.weeklyTarget - homeData.monthlyCollected))} remaining</Text>
          </View>
        </View>

        {/* Earnings Tier Widget */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-sm font-medium text-[rgba(0,0,0,0.9)]">Your Earnings · June</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">Monthly incentive tracker</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: curTier.bg }}>
                <Text className="text-[11px] font-semibold" style={{ color: curTier.color }}>
                  {curTier.emoji} {curTier.name}{curTier.rate > 0 ? ` · ${curTier.rate}%` : ' · Fixed'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTierInfo(true)}
                className="w-6 h-6 rounded-full bg-[#F0F4F7] items-center justify-center"
              >
                <Text className="text-black/40 text-[11px] font-semibold">i</Text>
              </TouchableOpacity>
            </View>
          </View>

          {curTier.rate === 0 ? (
            <View className="rounded-2xl px-4 py-3 mb-4" style={{ backgroundColor: curTier.bg }}>
              <Text className="text-xs font-semibold mb-1" style={{ color: curTier.color }}>No variable incentive yet this month</Text>
              <Text className="text-[10px] text-black/50">Collect ₹10L to unlock Bronze — earn 0.5% on every rupee collected</Text>
            </View>
          ) : (
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-[#E0F4E8] rounded-2xl px-3 py-3">
                <Text className="text-[10px] text-[#007E2F] font-medium mb-1">Earned so far</Text>
                <Text className="text-2xl font-semibold text-[#007E2F]">{fmtL(totalEarned)}</Text>
                <Text className="text-[10px] text-[#007E2F] mt-1.5" style={{ opacity: 0.6 }}>{curTier.rate}% of {fmtL(monthlyCollected)}</Text>
              </View>
              <View className="flex-1 bg-[#FAE2FA] rounded-2xl px-3 py-3">
                <Text className="text-[10px] text-[#A008A3] font-medium mb-1">💎 At Platinum</Text>
                <Text className="text-2xl font-semibold text-[#D30AD7]">{fmtL(platEarned)}</Text>
                <Text className="text-[10px] text-[#A008A3] mt-1.5" style={{ opacity: 0.6 }}>1.8% of same collections</Text>
              </View>
            </View>
          )}

          <Text className="text-[10px] text-black/30 mt-2 mb-3">
            {fmtL(monthlyCollected)} collected this month
            {nextTier ? ` · ${fmtL(toNext)} to ${nextTier.name}` : ' · Platinum achieved 🎉'}
          </Text>

          {nextTier ? (
            <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: nextTier.bg }}>
              <Text className="text-xs font-semibold" style={{ color: nextTier.color }}>
                {nextTier.emoji} {fmtL(toNext)} more to unlock {nextTier.name} ({nextTier.rate}%)
              </Text>
              <Text className="text-[10px] mt-0.5" style={{ color: nextTier.color + 'BB' }}>
                Same {fmtL(monthlyCollected)} collected → earn {fmtL(totalExtra)} extra
              </Text>
            </View>
          ) : (
            <View className="rounded-2xl px-4 py-3 flex-row items-center gap-2 bg-[#F5F3FF]">
              <Text>🏆</Text>
              <Text className="text-xs font-semibold text-[#818cf8]">Platinum unlocked — maximum 1.8% rate</Text>
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
