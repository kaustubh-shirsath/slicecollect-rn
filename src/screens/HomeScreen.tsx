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
  const [search, setSearch] = useState('')

  const homeData = useMemo(() => getHomeData(agentInfo?.username ?? '', agentInfo?.portfolioType), [agentInfo?.username, agentInfo?.portfolioType, dataVersion])

  const bucketGroups = homeData.bucketGroups
  const totalOverdue = homeData.overdueTotal

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

        {/* Portfolio Overview — 2x2 grid of subtle raised chips, one-line labels */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Portfolio Overview</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Total Allocated', value: String(homeData.totalCases), accent: '#6D5AE6' },
              { label: 'Pending Cases', value: String(homeData.pendingVisits), accent: '#B45309' },
              { label: 'Visited Cases', value: String(homeData.totalCases - homeData.pendingVisits), accent: '#1D4ED8' },
              { label: 'POS Allocated', value: fmtL(totalOverdue), accent: '#A008A3' },
              { label: 'Collected Today', value: fmtL(homeData.collectedToday), accent: '#00A63E' },
              { label: 'Amount Due', value: fmtL(totalOverdue), accent: '#CE1D26' },
            ].map(tile => (
              <View
                key={tile.label}
                style={{
                  width: '47%',
                  flexDirection: 'row',
                  backgroundColor: '#FAFBFC',
                  borderRadius: 14,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.05)',
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                }}
              >
                <View style={{ width: 4, backgroundColor: tile.accent }} />
                <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 10 }}>
                  <Text className="text-[10px] text-black/45 font-medium" numberOfLines={1}>{tile.label}</Text>
                  <Text className="text-lg font-bold mt-1" style={{ color: tile.accent }} numberOfLines={1}>{tile.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bucket Summary — one card per product type, split by agent objective */}
        <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <View className="px-5 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
            <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">Bucket Summary</Text>
          </View>

          {bucketGroups.map((group, gi) => {
            const collectionBuckets = group.buckets.filter((b: any) => b.kind === 'collection')
            const resolutionBuckets = group.buckets.filter((b: any) => b.kind === 'resolution')
            return (
              <View key={group.productType} style={gi > 0 ? { marginTop: 8, borderTopWidth: 6, borderTopColor: '#F0F4F7' } : {}}>
                {/* Product heading */}
                <View className="px-5 pt-4 pb-2 flex-row items-center gap-2">
                  <Text className="text-[11px] font-semibold text-[#A008A3] uppercase tracking-wider">{group.label}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(160,8,163,0.12)' }} />
                  <Text className="text-[10px] text-black/35">{group.buckets.reduce((s: number, b: any) => s + b.cases, 0)} cases</Text>
                </View>

                {/* Collections sub-table: NPA / Settlement — objective is ₹ collected vs target */}
                {collectionBuckets.length > 0 && (
                  <View className="px-5 pb-2">
                    <Text className="text-[9px] text-black/35 mb-1.5">Maximise ₹ collected against target</Text>
                    <View className="rounded-2xl overflow-hidden" style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
                      <View className="flex-row bg-[#F0F4F7] px-3 py-2">
                        <Text className="flex-1 text-[10px] text-black/40 font-medium text-center">Bucket</Text>
                        <Text className="w-[76px] text-[10px] text-black/40 font-medium text-center">POS Allocated</Text>
                        <Text className="w-[70px] text-[10px] text-black/40 font-medium text-center">Collected</Text>
                        <Text className="w-[70px] text-[10px] text-black/40 font-medium text-center">Target</Text>
                      </View>
                      {collectionBuckets.map((b: any, i: number) => {
                        const onTarget = b.collected >= b.target
                        const collectedPct = b.target > 0 ? Math.round((b.collected / b.target) * 100) : 0
                        return (
                          <TouchableOpacity
                            key={b.name}
                            onPress={() => navigation.navigate('Allocations', { defaultBucket: b.name })}
                            className={`px-3 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F0F4F7]/40'}`}
                            style={{ borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: 'rgba(0,0,0,0.04)' }}
                          >
                            <View className="flex-row items-center">
                              <Text className="flex-1 font-medium text-xs text-[rgba(0,0,0,0.9)] text-center">{b.name}</Text>
                              <Text className="w-[76px] text-xs text-black/50 text-center">{fmtL(b.posAllocated)}</Text>
                              <Text className="w-[70px] text-xs text-center" style={{ color: onTarget ? '#00A63E' : 'rgba(0,0,0,0.7)' }}>{fmtL(b.collected)}</Text>
                              <Text className="w-[70px] text-xs text-black/40 text-center">{fmtL(b.target)}</Text>
                            </View>
                            {/* Collection progress bar vs target */}
                            <View className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.055)' }}>
                              <View
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(100, collectedPct)}%`, backgroundColor: onTarget ? '#00A63E' : 'rgba(211,10,215,0.55)' }}
                              />
                            </View>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                )}

                {/* Resolution sub-table: SMA/BKT/... — objective is resolving highest-POS cases */}
                {resolutionBuckets.length > 0 && (
                  <View className="px-5 pb-4">
                    <Text className="text-[9px] text-black/35 mb-1.5">Resolve highest-POS cases first</Text>
                    <View className="rounded-2xl overflow-hidden" style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
                      <View className="flex-row bg-[#F0F4F7] px-3 py-2">
                        <Text className="flex-1 text-[10px] text-black/40 font-medium text-center">Bucket</Text>
                        <Text className="w-[76px] text-[10px] text-black/40 font-medium text-center">POS Allocated</Text>
                        <Text className="w-[70px] text-[10px] text-black/40 font-medium text-center">Resolved%</Text>
                        <Text className="w-[60px] text-[10px] text-black/40 font-medium text-center">Target</Text>
                      </View>
                      {resolutionBuckets.map((b: any, i: number) => {
                        const onTarget = b.resolutionPct >= b.targetPct
                        return (
                          <TouchableOpacity
                            key={b.name}
                            onPress={() => navigation.navigate('Allocations', { defaultBucket: b.name })}
                            className={`px-3 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F0F4F7]/40'}`}
                            style={{ borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: 'rgba(0,0,0,0.04)' }}
                          >
                            <View className="flex-row items-center">
                              <Text className="flex-1 font-medium text-xs text-[rgba(0,0,0,0.9)] text-center">{b.name}</Text>
                              <Text className="w-[76px] text-xs text-black/50 text-center">{fmtL(b.posAllocated)}</Text>
                              <Text className="w-[70px] text-xs font-semibold text-center" style={{ color: onTarget ? '#00A63E' : '#B45309' }}>{b.resolutionPct}%</Text>
                              <Text className="w-[60px] text-xs text-black/40 text-center">{b.targetPct}%</Text>
                            </View>
                            {/* Resolution progress bar vs target */}
                            <View className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.055)' }}>
                              <View
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(100, b.resolutionPct)}%`, backgroundColor: onTarget ? '#00A63E' : 'rgba(211,10,215,0.55)' }}
                              />
                            </View>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                )}
              </View>
            )
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
