import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SalesTabParamList, RootStackParamList } from '../../navigation/types'
import { useAgent } from '../../navigation/AgentContext'
import { ALL_MERCHANTS } from '../../data/merchants'
import type { Merchant } from '../../data/merchants'
import { haversine } from '../../data/routingEngine'

type Props = CompositeScreenProps<
  BottomTabScreenProps<SalesTabParamList, 'SalesMerchants'>,
  NativeStackScreenProps<RootStackParamList>
>

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

type SortKey = 'nearest' | 'pending' | 'overdue' | 'lastvisit'
type BusinessTypeFilter = '' | Merchant['businessType']

const BUSINESS_TYPE_COLORS: Record<Merchant['businessType'], { bg: string; text: string }> = {
  Grocery:     { bg: '#E0F4E8', text: '#007E2F' },
  Pharmacy:    { bg: '#E0F0FF', text: '#1D4ED8' },
  Hardware:    { bg: '#FFF3E0', text: '#A35300' },
  Textile:     { bg: '#FAE2FA', text: '#A008A3' },
  Restaurant:  { bg: '#FFF0E0', text: '#CE1D26' },
  Electronics: { bg: '#F0F0FF', text: '#5B21B6' },
}

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'nearest',  label: '📍 Nearest' },
  { id: 'pending',  label: '💰 Highest Pending' },
  { id: 'overdue',  label: '📅 Most Overdue' },
  { id: 'lastvisit',label: '🕐 Last Visit' },
]

const TYPE_OPTIONS: Merchant['businessType'][] = ['Grocery', 'Pharmacy', 'Hardware', 'Textile', 'Restaurant', 'Electronics']

export default function SalesMerchantsScreen({ navigation }: Props) {
  const { agentInfo } = useAgent()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('nearest')
  const [typeFilter, setTypeFilter] = useState<BusinessTypeFilter>('')
  const [daysFilter, setDaysFilter] = useState<number | null>(null)
  const [showSort, setShowSort] = useState(false)

  const agentLat = agentInfo?.lat ?? 27.4728
  const agentLng = agentInfo?.lng ?? 94.9120

  const merchants = useMemo(() => {
    let list = ALL_MERCHANTS.filter(m => m.assignedAgent === (agentInfo?.username ?? 'Gakul_Khanikar'))

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.businessName.toLowerCase().includes(q) ||
        m.ownerName.toLowerCase().includes(q) ||
        m.address.toLowerCase().includes(q)
      )
    }

    if (typeFilter) list = list.filter(m => m.businessType === typeFilter)
    if (daysFilter !== null) list = list.filter(m => m.daysWithoutDeposit >= daysFilter)

    const withDist = list.map(m => ({
      ...m,
      distKm: Math.round(haversine(agentLat, agentLng, m.lat, m.lng) * 10) / 10,
    }))

    withDist.sort((a, b) => {
      if (sortBy === 'nearest')  return a.distKm - b.distKm
      if (sortBy === 'pending')  return b.pendingAmount - a.pendingAmount
      if (sortBy === 'overdue')  return b.daysWithoutDeposit - a.daysWithoutDeposit
      if (sortBy === 'lastvisit') return new Date(a.lastDepositDate).getTime() - new Date(b.lastDepositDate).getTime()
      return 0
    })

    return withDist
  }, [agentInfo?.username, search, typeFilter, daysFilter, sortBy, agentLat, agentLng])

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-5 py-3 flex-row items-center justify-between border-b border-black/[0.06]">
        <Text className="text-[rgba(0,0,0,0.9)] text-lg font-medium tracking-tight">Merchants</Text>
        <TouchableOpacity
          onPress={() => setShowSort(o => !o)}
          className="w-9 h-9 rounded-full bg-[#F0F4F7] items-center justify-center"
        >
          <Text className="text-sm">⇅</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View className="bg-white px-5 pb-3 pt-2" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
        <View className="flex-row items-center bg-[#F0F4F7] rounded-full px-4" style={{ height: 36 }}>
          <Text className="text-black/30 text-sm">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search merchants..."
            placeholderTextColor="rgba(0,0,0,0.3)"
            className="flex-1 text-sm text-[rgba(0,0,0,0.7)] ml-2"
          />
        </View>
      </View>

      {/* Filter chips */}
      <View className="bg-white" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {TYPE_OPTIONS.map(t => {
            const active = typeFilter === t
            const colors = BUSINESS_TYPE_COLORS[t]
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTypeFilter(active ? '' : t)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: active ? colors.bg : '#F0F4F7',
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? colors.text + '40' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: active ? colors.text : 'rgba(0,0,0,0.5)' }}>{t}</Text>
              </TouchableOpacity>
            )
          })}
          {([7, 5, 3] as const).map(d => {
            const active = daysFilter === d
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDaysFilter(active ? null : d)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
                  backgroundColor: active ? '#F9E4E5' : '#F0F4F7',
                  borderWidth: active ? 1 : 0,
                  borderColor: active ? '#CE1D2640' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#CE1D26' : 'rgba(0,0,0,0.5)' }}>{d}+ days</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={{
          position: 'absolute', top: 130, right: 16, zIndex: 100,
          backgroundColor: '#fff', borderRadius: 20, padding: 8,
          elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 }, minWidth: 200,
        }}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => { setSortBy(opt.id); setShowSort(false) }}
              style={{
                paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
                backgroundColor: sortBy === opt.id ? '#FAE2FA' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 13, color: sortBy === opt.id ? '#A008A3' : 'rgba(0,0,0,0.8)', fontWeight: sortBy === opt.id ? '600' : '400' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={merchants}
        keyExtractor={item => item.merchantId}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        renderItem={({ item: m }) => {
          const colors = BUSINESS_TYPE_COLORS[m.businessType]
          const distKm = Math.round(haversine(agentLat, agentLng, m.lat, m.lng) * 10) / 10
          const isOverdue = m.daysWithoutDeposit > 7
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('SalesMerchantDetail', { merchant: m, fromScreen: 'SalesMerchants' })}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#fff', borderRadius: 24, padding: 16,
                elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,0.9)' }} numberOfLines={1}>
                    {m.businessName}
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{m.ownerName}</Text>
                </View>
                <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>{m.businessType}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', fontWeight: '500' }}>Pending</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#00A63E' }}>{fmt(m.pendingAmount)}</Text>
                </View>
                <View style={{ width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                <View>
                  <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', fontWeight: '500' }}>Days</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isOverdue ? '#CE1D26' : 'rgba(0,0,0,0.9)' }}>
                    {m.daysWithoutDeposit}d
                  </Text>
                </View>
                <View style={{ marginLeft: 'auto' as any }}>
                  <View style={{
                    backgroundColor: '#F0F4F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                  }}>
                    <Text style={{ fontSize: 10 }}>📍</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', fontWeight: '500' }}>{distKm} km</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('SalesCollect', { merchant: m })}
                style={{ backgroundColor: '#D30AD7', borderRadius: 999, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Collect Cash</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
            <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)' }}>No merchants found</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}
