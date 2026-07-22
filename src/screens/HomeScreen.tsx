import { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { CompositeScreenProps } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { getHomeData } from '../data/homeData'
import LeaderboardCard from '../components/LeaderboardCard'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>

const fmtL = (n: number) => {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr'
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  return '₹' + n.toLocaleString('en-IN')
}

export default function HomeScreen({ navigation }: Props) {
  const { agentInfo, dataVersion } = useAgent()
  const [bucketMode, setBucketMode] = useState<'count' | 'amount'>('count')
  const [search, setSearch] = useState('')

  const homeData = useMemo(() => getHomeData(agentInfo?.username ?? '', agentInfo?.portfolioType), [agentInfo?.username, agentInfo?.portfolioType, dataVersion])

  const bucketGroups = homeData.bucketGroups
  const totalOverdue = homeData.overdueTotal
  const totalCollected = homeData.collectedToday

  const initials = agentInfo?.name
    ? agentInfo.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0,2)
    : 'SF'

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-5 py-3 flex-row items-center justify-between border-b border-black/[0.06]">
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#D30AD7', letterSpacing: -0.5 }}>pulse</Text>
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

        {/* Portfolio Overview — equal 2x2 grid, single consistent color scheme */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Portfolio Overview</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Total\nAllocated', value: String(homeData.totalCases), unit: 'cases' },
              { label: 'Pending\nCases', value: String(homeData.pendingVisits), unit: 'cases' },
              { label: 'Collected\nToday', value: fmtL(homeData.collectedToday), unit: 'today' },
              { label: 'Amount\nDue', value: fmtL(totalOverdue), unit: 'overdue' },
            ].map(tile => (
              <View key={tile.label} style={{ width: '47%' }} className="bg-[#F0F4F7] rounded-xl px-3 py-2.5">
                <Text className="text-[10px] text-black/50 font-medium">{tile.label}</Text>
                <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{tile.value}</Text>
                <Text className="text-[10px] text-black/40 mt-0.5">{tile.unit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bucket Summary — one table per product type */}
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

          {bucketGroups.map((group, gi) => (
            <View key={group.productType} style={gi > 0 ? { marginTop: 8, borderTopWidth: 6, borderTopColor: '#F0F4F7' } : {}}>
              {/* Product heading */}
              <View className="px-5 pt-4 pb-2 flex-row items-center gap-2">
                <Text className="text-[11px] font-semibold text-[#A008A3] uppercase tracking-wider">{group.label}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(160,8,163,0.12)' }} />
                <Text className="text-[10px] text-black/35">{group.buckets.reduce((s, b) => s + b.cases, 0)} cases</Text>
              </View>

              {/* Table header */}
              <View className="flex-row bg-[#F0F4F7] px-4 py-2">
                <Text className="flex-1 text-[10px] text-black/40 font-medium">Bucket</Text>
                <Text className="w-16 text-right text-[10px] text-black/40 font-medium">Allocated</Text>
                <Text className="w-16 text-right text-[10px] text-black/40 font-medium">Unresolved</Text>
                <Text className="w-16 text-right text-[10px] text-black/40 font-medium">Target</Text>
                <View className="w-4" />
              </View>

              {group.buckets.map((b: any, i: number) => {
                const allocated  = bucketMode === 'count' ? b.cases : b.overdue
                const unresolved = bucketMode === 'count' ? b.unresolved : Math.max(0, b.overdue - b.collected)
                return (
                  <TouchableOpacity
                    key={b.name}
                    onPress={() => navigation.navigate('Allocations', { defaultBucket: b.name })}
                    className={`flex-row items-center px-4 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F0F4F7]/40'}`}
                    style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.04)' }}
                  >
                    <Text className="flex-1 font-medium text-xs text-[rgba(0,0,0,0.9)]">{b.name}</Text>
                    <Text className="w-16 text-right text-xs text-black/50">{bucketMode === 'count' ? allocated : fmtL(allocated)}</Text>
                    <Text className="w-16 text-right text-xs text-[rgba(0,0,0,0.7)]">{bucketMode === 'count' ? unresolved : fmtL(unresolved)}</Text>
                    {/* Target — non-clickable, backend-driven */}
                    <Text className="w-16 text-right text-xs text-black/40">{fmtL(b.target)}</Text>
                    <Text className="w-4 text-center text-black/20 text-sm">›</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>

        {/* Summary footer */}
        <Text className="text-center text-xs text-black/40">{fmtL(totalCollected)} collected of {fmtL(totalOverdue)} total</Text>

        {/* Leaderboard — top 10 monthly collections + my rank */}
        <LeaderboardCard myUsername={agentInfo?.username} />
      </ScrollView>
    </SafeAreaView>
  )
}
