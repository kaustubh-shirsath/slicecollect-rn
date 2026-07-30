import { useState, useEffect, useMemo, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { PRODUCT_LABEL, type ProductType } from '../utils/productLabels'
import { useAllocations } from '../hooks/useAllocations'
import { getBucketColor } from '../utils/bucketColors'
import { getActivity } from '../data/activityLog'
import { haversine } from '../data/routingEngine'
import { getBorrowData } from '../data/emis'
import { getCCBill } from '../data/ccBills'
import { getRiskBand, getPriorityOrder, getCustomerRef, formatName } from '../data/caseMeta'
import { hasActiveSettlement } from '../data/settlementUsers'
import { track } from '../analytics/mixpanel'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Allocations'>,
  NativeStackScreenProps<RootStackParamList>
>

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

type SortKey = 'priority' | 'ptpSoonest' | 'amount' | 'riskHigh' | 'lastVisited' | 'distance'
type DistFilter = 'all' | 'lt2' | 'lt5' | 'lt10' | '10plus'
type PtpFilter = 'all' | 'yes' | 'no'
type YesNoFilter = 'all' | 'yes' | 'no'
type RiskFilter = 'all' | 'High' | 'Medium' | 'Low'

const DIST_OPTIONS: { id: DistFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'Any distance', emoji: '📍' },
  { id: 'lt2', label: '< 2 km', emoji: '🟢' },
  { id: 'lt5', label: '< 5 km', emoji: '🟡' },
  { id: 'lt10', label: '< 10 km', emoji: '🟠' },
  { id: '10plus', label: '10 km+', emoji: '🔴' },
]
const PTP_OPTIONS: { id: PtpFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '➖' },
  { id: 'yes', label: 'Yes', emoji: '📅' },
  { id: 'no', label: 'No', emoji: '➖' },
]
const COLLECTED_OPTIONS: { id: YesNoFilter; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]
const RISK_OPTIONS: { id: RiskFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '➖' },
  { id: 'High', label: 'High', emoji: '🔴' },
  { id: 'Medium', label: 'Medium', emoji: '🟠' },
  { id: 'Low', label: 'Low', emoji: '🟢' },
]
const VISITED_OPTIONS: { id: 'visited' | 'notVisited'; label: string }[] = [
  { id: 'visited', label: 'Yes' },
  { id: 'notVisited', label: 'No' },
]
const SORT_OPTIONS: { id: SortKey; label: string; emoji: string }[] = [
  { id: 'priority', label: 'Priority order', emoji: '🎯' },
  { id: 'ptpSoonest', label: 'PTP due soonest', emoji: '⏰' },
  { id: 'amount', label: 'Highest amount first', emoji: '💵' },
  { id: 'riskHigh', label: 'High risk first', emoji: '🔥' },
  { id: 'lastVisited', label: 'Oldest visit date', emoji: '🕰️' },
  { id: 'distance', label: 'Nearest first', emoji: '📍' },
]

// Filter pill — body tap toggles its dropdown open/closed; the ✕ is a separate
// hit target that clears the filter without opening anything.
function FilterChip({ emoji, label, active, activeLabel, open, onToggle, onClear }: {
  emoji?: string; label: string; active: boolean; activeLabel?: string; open: boolean; onToggle: () => void; onClear: () => void
}) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{ borderWidth: 1, borderColor: active || open ? '#D30AD7' : 'rgba(0,0,0,0.12)', backgroundColor: active ? '#FDEBFE' : '#fff', height: 36 }}
    >
      <TouchableOpacity onPress={onToggle} className="flex-row items-center gap-1 pl-3 h-full" style={{ paddingRight: active ? 4 : 12 }}>
        {emoji && <Text style={{ fontSize: 12 }}>{emoji}</Text>}
        <Text className={`text-xs font-medium ${active ? 'text-[#A008A3]' : 'text-black/60'}`} numberOfLines={1}>
          {active ? activeLabel : label}
        </Text>
        {!active && <Text className="text-[10px] text-black/35">{open ? '▴' : '▾'}</Text>}
      </TouchableOpacity>
      {active && (
        <TouchableOpacity onPress={onClear} className="h-full items-center justify-center" style={{ paddingHorizontal: 10 }}>
          <Text className="text-[11px] text-[#A008A3] font-bold">✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// Single row inside the bottom sheet — subtle emoji leading, filled radio dot when selected
function SheetRow({ emoji, label, selected, onPress }: { emoji?: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-5 py-3.5"
      style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}
    >
      <View className="flex-row items-center gap-2.5">
        {emoji && <Text style={{ fontSize: 15 }}>{emoji}</Text>}
        <Text className={`text-sm ${selected ? 'text-[#A008A3] font-medium' : 'text-[rgba(0,0,0,0.75)]'}`}>{label}</Text>
      </View>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: selected ? '#D30AD7' : 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#D30AD7' }} />}
      </View>
    </TouchableOpacity>
  )
}

export default function AllocationsScreen({ navigation, route }: Props) {
  const { agentInfo } = useAgent()
  const defaultBucket = route.params?.defaultBucket
  const defaultProduct = route.params?.defaultProduct
  const focusSearch = route.params?.focusSearch
  const searchInputRef = useRef<TextInput>(null)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  // Bucket filters are product-scoped ('bank:Settlement') — same label can exist across products.
  const [stageFilter, setStageFilter] = useState<string[]>(
    defaultBucket && defaultBucket !== 'All' ? [`${defaultProduct ?? 'bank'}:${defaultBucket}`] : []
  )
  const [distFilter, setDistFilter] = useState<DistFilter>('all')
  const [ptpFilter, setPtpFilter] = useState<PtpFilter>('all')
  const [collectedFilter, setCollectedFilter] = useState<YesNoFilter>('all')
  const [sortBy, setSortBy] = useState<SortKey>('priority')
  const [visitedFilter, setVisitedFilter] = useState<'all' | 'visited' | 'notVisited'>('all')
  const [openDropdown, setOpenDropdown] = useState<'none' | 'bucket' | 'distance' | 'ptp' | 'sort' | 'visited' | 'collected' | 'risk'>('none')
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

  useEffect(() => {
    if (defaultBucket && defaultBucket !== 'All') setStageFilter([`${defaultProduct ?? 'bank'}:${defaultBucket}`])
    else if (defaultBucket === 'All') setStageFilter([])
  }, [defaultBucket, defaultProduct])

  // Home search bar hands off here — focus the real input on arrival
  useEffect(() => {
    if (focusSearch) setTimeout(() => searchInputRef.current?.focus(), 250)
  }, [focusSearch])

  const { allocations, loading } = useAllocations('All', search, agentInfo?.username, agentInfo?.portfolioType)

  // Distinct buckets actually present in this agent's portfolio, grouped by product
  const bucketFilterGroups = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const c of allocations) {
      const eb = c.userType === 'borrow' ? (getBorrowData(c.partyId)?.bucketLabel ?? c.assetClassification)
        : c.userType === 'cc' ? (getCCBill(c.partyId)?.bucketLabel ?? c.assetClassification)
        : c.assetClassification
      if (!map[c.userType]) map[c.userType] = new Set()
      map[c.userType].add(eb)
    }
    return (['bank', 'cc', 'borrow'] as ProductType[])
      .filter(pt => map[pt] && map[pt].size > 0)
      .map(pt => ({ productType: pt, label: PRODUCT_LABEL[pt], buckets: [...map[pt]].sort() }))
  }, [allocations])

  const today = new Date().toDateString()

  const withMeta = useMemo(() => allocations.map((c: any) => {
    const agentLat = agentInfo?.lat ?? 27.4728
    const agentLng = agentInfo?.lng ?? 94.9120
    const distKm = parseFloat(haversine(agentLat, agentLng, c.lat, c.lng).toFixed(1))
    const act = getActivity(c.partyId)
    const disp = act?.latestDisposition
    // PTP = any latest disposition carrying a promise date (unified flow writes category as type)
    const hasPtp = !!disp?.ptpDate
    const ptpBroken = hasPtp && disp?.ptpDate && new Date(disp.ptpDate).toDateString() < today && act!.collections.length === 0
    const latestCollection = act && act.collections.length > 0 ? act.collections[act.collections.length - 1] : null
    const hasCollected = !!act && act.collections.length > 0
    return { ...c, distKm, risk: getRiskBand(c), priorityOrder: getPriorityOrder(c), hasPtp, ptpBroken, latestCollection, hasCollected }
  }), [allocations, agentInfo])

  const RISK_RANK = { High: 2, Medium: 1, Low: 0 }
  const sorted = useMemo(() => [...withMeta].sort((a: any, b: any) => {
    if (sortBy === 'distance') return a.distKm - b.distKm
    if (sortBy === 'amount') return (b.emiOs || 0) - (a.emiOs || 0)
    if (sortBy === 'ptpSoonest') return (b.hasPtp ? 1 : 0) - (a.hasPtp ? 1 : 0)
    if (sortBy === 'riskHigh') return RISK_RANK[b.risk as 'High'|'Medium'|'Low'] - RISK_RANK[a.risk as 'High'|'Medium'|'Low']
    if (sortBy === 'priority') return a.priorityOrder - b.priorityOrder
    if (sortBy === 'lastVisited') return (a.lastPayment || '').localeCompare(b.lastPayment || '')
    return 0
  }), [withMeta, sortBy])

  const filtered = useMemo(() => sorted.filter((c: any) => {
    const effectiveBucket = c.userType === 'borrow' ? (getBorrowData(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.userType === 'cc' ? (getCCBill(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.assetClassification
    if (stageFilter.length > 0 && !stageFilter.includes(`${c.userType}:${effectiveBucket}`)) return false
    if (distFilter === 'lt2' && !(c.distKm < 2)) return false
    if (distFilter === 'lt5' && !(c.distKm < 5)) return false
    if (distFilter === 'lt10' && !(c.distKm < 10)) return false
    if (distFilter === '10plus' && !(c.distKm >= 10)) return false
    if (ptpFilter === 'yes' && !c.hasPtp) return false
    if (ptpFilter === 'no' && c.hasPtp) return false
    if (collectedFilter === 'yes' && !c.hasCollected) return false
    if (collectedFilter === 'no' && c.hasCollected) return false
    if (riskFilter !== 'all' && c.risk !== riskFilter) return false
    if (visitedFilter !== 'all') {
      const activity = getActivity(c.partyId)
      const hasVisit = activity?.latestDisposition != null
      if (visitedFilter === 'visited' && !hasVisit) return false
      if (visitedFilter === 'notVisited' && hasVisit) return false
    }
    return true
  }), [sorted, stageFilter, distFilter, ptpFilter, collectedFilter, riskFilter, visitedFilter])

  const activeCount = (stageFilter.length > 0 ? 1 : 0) + (visitedFilter !== 'all' ? 1 : 0) +
    (collectedFilter !== 'all' ? 1 : 0) + (riskFilter !== 'all' ? 1 : 0) +
    (ptpFilter !== 'all' ? 1 : 0) + (distFilter !== 'all' ? 1 : 0)

  const closeDropdown = () => setOpenDropdown('none')

  const renderItem = ({ item: c }: { item: any }) => {
    const sliceBucket = c.userType === 'borrow' ? (getBorrowData(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.userType === 'cc' ? (getCCBill(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.assetClassification
    const riskColor = c.risk === 'High' ? '#CE1D26' : c.risk === 'Medium' ? '#A35300' : '#007E2F'
    // Status tag priority: Settlement > Collected > PTP > Visited.
    // Visited = any disposition other than Non-Contacted (paid > 0 wins as Collected).
    const latestType = getActivity(c.partyId)?.latestDisposition?.type
    const hasVisit = !!latestType && latestType !== 'Non-Contacted'
    const statusTag = hasActiveSettlement(c.partyId)
      ? { label: 'Active Settlement', bg: '#FEF3C7', color: '#92400E' }
      : c.hasCollected
      ? { label: 'Collected', bg: '#E0F4E8', color: '#007E2F' }
      : c.hasPtp
      ? { label: 'PTP', bg: '#FFF0E0', color: '#A35300' }
      : hasVisit
      ? { label: 'Visited', bg: '#E8EDF2', color: '#3B5266' }
      : null

    return (
      <TouchableOpacity
        className="bg-white rounded-[20px] px-4 py-4 mb-2.5"
        style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
        onPress={() => { track('case_opened', { product_type: c.userType, bucket: sliceBucket, risk_band: c.risk, priority_rank: c.priorityOrder, source: 'list' }); navigation.navigate('CustomerDetail', { customer: c, fromScreen: 'Allocations' }) }}
      >
        {/* Top row — rank (32) | name (flex) | amount (78, centred with Profile below) */}
        <View className="flex-row items-center">
          <View style={{ width: 32 }}>
            <Text className="text-[11px] font-bold text-[#A008A3]">#{c.priorityOrder}</Text>
          </View>
          <Text className="flex-1 font-medium text-[rgba(0,0,0,0.9)] text-sm pr-2" numberOfLines={1}>{formatName(c.name)}</Text>
          <View style={{ width: 78, alignItems: 'center' }}>
            <Text className="text-sm font-medium text-[#CE1D26]" numberOfLines={1}>{fmt(c.overdue ?? c.emiOs)}</Text>
          </View>
        </View>

        <View className="flex-row items-start justify-between mt-1">
          <View className="flex-1 min-w-0 mr-3" style={{ paddingLeft: 32 }}>
            <View className="flex-row items-center gap-2">
              <Text className="text-black/45 text-[11px] font-semibold" numberOfLines={1}>{getCustomerRef(c.partyId, c.userType).masked}</Text>
              {statusTag && (
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: statusTag.bg }}>
                  <Text className="text-[9px] font-semibold" numberOfLines={1} style={{ color: statusTag.color }}>{statusTag.label}</Text>
                </View>
              )}
            </View>
            {/* Jio-style meta line: bucket • product • risk • distance */}
            <Text className="text-[11px] mt-1.5" numberOfLines={1}>
              <Text className="font-medium" style={{ color: '#D30AD7' }}>{PRODUCT_LABEL[(c.userType || 'bank') as ProductType]} • {sliceBucket}</Text>
              <Text className="text-black/30">  •  </Text>
              <Text className="font-medium" style={{ color: riskColor }}>{c.risk} Risk</Text>
              <Text className="text-black/30">  •  </Text>
              <Text className="text-black/40">{c.distKm} km</Text>
            </Text>
          </View>
          <View style={{ width: 78, alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => { track('case_opened', { product_type: c.userType, bucket: sliceBucket, risk_band: c.risk, priority_rank: c.priorityOrder, source: 'list' }); navigation.navigate('CustomerDetail', { customer: c, fromScreen: 'Allocations' }) }}
              className="bg-[#D30AD7] px-3 py-1.5 rounded-full"
            >
              <Text className="text-[11px] text-white font-medium">Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white px-5 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[rgba(0,0,0,0.9)] text-lg font-medium">My Cases</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                className="w-9 h-9 rounded-full bg-[#FAE2FA] items-center justify-center"
              >
                <Text className="text-[#A008A3] text-xs font-bold">
                  {agentInfo?.name ? agentInfo.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'SF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search + filters — Zomato-style pill chips, single accent, opens as bottom sheets */}
        <View className="bg-white" style={{ zIndex: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <View className="flex-row items-center gap-2 px-4 pt-2 pb-2">
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F4F7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
              <TextInput
                ref={searchInputRef}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name, mobile, CIF or UUID…"
                placeholderTextColor="rgba(0,0,0,0.3)"
                style={{ flex: 1, fontSize: 14, color: 'rgba(0,0,0,0.7)', padding: 0 }}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={{ color: 'rgba(0,0,0,0.3)', fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setOpenDropdown(prev => prev === 'sort' ? 'none' : 'sort')}
              className="flex-row items-center gap-1 px-3 h-9 rounded-full"
              style={{ borderWidth: 1, borderColor: sortBy !== 'priority' ? '#D30AD7' : 'rgba(0,0,0,0.12)', backgroundColor: sortBy !== 'priority' ? '#FDEBFE' : '#fff' }}
            >
              <Text style={{ fontSize: 13 }}>{SORT_OPTIONS.find(o => o.id === sortBy)?.emoji}</Text>
              <Text className={`text-xs font-medium ${sortBy !== 'priority' ? 'text-[#A008A3]' : 'text-black/60'}`}>Sort</Text>
            </TouchableOpacity>
          </View>

          {/* Filter chips — priority order: Bucket, Visited, Collected, Risk Band, PTP, Distance */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-3" contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
            <FilterChip
              label="Bucket"
              active={stageFilter.length > 0}
              activeLabel={stageFilter.length > 0 ? `Bucket · ${stageFilter.length}` : undefined}
              open={openDropdown === 'bucket'}
              onToggle={() => setOpenDropdown(prev => prev === 'bucket' ? 'none' : 'bucket')}
              onClear={() => { setStageFilter([]); setOpenDropdown('none') }}
            />
            <FilterChip
              label="Visited"
              active={visitedFilter !== 'all'}
              activeLabel={visitedFilter !== 'all' ? (visitedFilter === 'visited' ? 'Visited: Yes' : 'Visited: No') : undefined}
              open={openDropdown === 'visited'}
              onToggle={() => setOpenDropdown(prev => prev === 'visited' ? 'none' : 'visited')}
              onClear={() => { setVisitedFilter('all'); setOpenDropdown('none') }}
            />
            <FilterChip
              label="Collected"
              active={collectedFilter !== 'all'}
              activeLabel={collectedFilter !== 'all' ? `Collected: ${collectedFilter === 'yes' ? 'Yes' : 'No'}` : undefined}
              open={openDropdown === 'collected'}
              onToggle={() => setOpenDropdown(prev => prev === 'collected' ? 'none' : 'collected')}
              onClear={() => { setCollectedFilter('all'); setOpenDropdown('none') }}
            />
            <FilterChip
              label="Risk Band"
              active={riskFilter !== 'all'}
              activeLabel={riskFilter !== 'all' ? `${riskFilter} Risk` : undefined}
              open={openDropdown === 'risk'}
              onToggle={() => setOpenDropdown(prev => prev === 'risk' ? 'none' : 'risk')}
              onClear={() => { setRiskFilter('all'); setOpenDropdown('none') }}
            />
            <FilterChip
              label="PTP"
              active={ptpFilter !== 'all'}
              activeLabel={ptpFilter !== 'all' ? `PTP: ${ptpFilter === 'yes' ? 'Yes' : 'No'}` : undefined}
              open={openDropdown === 'ptp'}
              onToggle={() => setOpenDropdown(prev => prev === 'ptp' ? 'none' : 'ptp')}
              onClear={() => { setPtpFilter('all'); setOpenDropdown('none') }}
            />
            <FilterChip
              label="Distance"
              active={distFilter !== 'all'}
              activeLabel={distFilter !== 'all' ? DIST_OPTIONS.find(o => o.id === distFilter)?.label : undefined}
              open={openDropdown === 'distance'}
              onToggle={() => setOpenDropdown(prev => prev === 'distance' ? 'none' : 'distance')}
              onClear={() => { setDistFilter('all'); setOpenDropdown('none') }}
            />

            {activeCount > 0 && (
              <TouchableOpacity
                onPress={() => { setStageFilter([]); setVisitedFilter('all'); setCollectedFilter('all'); setRiskFilter('all'); setPtpFilter('all'); setDistFilter('all'); closeDropdown() }}
                className="px-3 rounded-full bg-[#F9E4E5] items-center justify-center"
                style={{ height: 36 }}
              >
                <Text className="text-xs font-medium text-[#CE1D26]">Clear all</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Dropdown panel — anchored right under the filter bar, floats above the card list.
              A transparent backdrop closes it on outside tap; the panel itself is a plain View so
              row presses reach their own touchables directly. */}
          {openDropdown !== 'none' && (
            <View style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100 }}>
              <Pressable onPress={closeDropdown} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1200 }} />
              <View className="mx-4 mb-2 bg-white rounded-2xl overflow-hidden border border-black/[0.06]" style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, maxHeight: 380 }}>
              <ScrollView bounces={false}>
                {openDropdown === 'bucket' && bucketFilterGroups.map(group => {
                  const isOpen = expandedProduct === group.productType || bucketFilterGroups.length === 1
                  const selectedInGroup = group.buckets.filter(b => stageFilter.includes(`${group.productType}:${b}`)).length
                  return (
                    <View key={group.productType}>
                      {bucketFilterGroups.length > 1 && (
                        <TouchableOpacity
                          onPress={() => setExpandedProduct(prev => prev === group.productType ? null : group.productType)}
                          className="flex-row items-center justify-between px-5 py-3 bg-[#F0F4F7]"
                        >
                          <Text className="text-xs font-semibold text-[#A008A3] uppercase tracking-wider">{group.label}</Text>
                          <View className="flex-row items-center gap-2">
                            {selectedInGroup > 0 && <Text className="text-[10px] text-[#D30AD7] font-semibold">{selectedInGroup} selected</Text>}
                            <Text className="text-black/40 text-xs">{isOpen ? '▴' : '▾'}</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      {isOpen && group.buckets.map(s => {
                        const bc = getBucketColor(s)
                        const key = `${group.productType}:${s}`
                        const active = stageFilter.includes(key)
                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => setStageFilter(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])}
                            className="flex-row items-center justify-between px-5 py-3"
                            style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}
                          >
                            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: bc.bg }}>
                              <Text className="text-xs font-medium" style={{ color: bc.text }}>{s}</Text>
                            </View>
                            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: active ? '#D30AD7' : 'rgba(0,0,0,0.15)', backgroundColor: active ? '#D30AD7' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                              {active && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
                            </View>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )
                })}

                {openDropdown === 'visited' && VISITED_OPTIONS.map(opt => (
                  <SheetRow key={opt.id} label={opt.label} selected={visitedFilter === opt.id}
                    onPress={() => { setVisitedFilter(opt.id); closeDropdown() }} />
                ))}
                {openDropdown === 'collected' && COLLECTED_OPTIONS.map(opt => (
                  <SheetRow key={opt.id} label={opt.label} selected={collectedFilter === opt.id}
                    onPress={() => { setCollectedFilter(opt.id); closeDropdown() }} />
                ))}
                {openDropdown === 'risk' && RISK_OPTIONS.map(opt => (
                  <SheetRow key={opt.id} emoji={opt.emoji} label={opt.label} selected={riskFilter === opt.id}
                    onPress={() => { setRiskFilter(opt.id); closeDropdown() }} />
                ))}
                {openDropdown === 'ptp' && PTP_OPTIONS.map(opt => (
                  <SheetRow key={opt.id} label={opt.label} selected={ptpFilter === opt.id}
                    onPress={() => { setPtpFilter(opt.id); closeDropdown() }} />
                ))}
                {openDropdown === 'distance' && DIST_OPTIONS.map(opt => (
                  <SheetRow key={opt.id} emoji={opt.emoji} label={opt.label} selected={distFilter === opt.id}
                    onPress={() => { setDistFilter(opt.id); closeDropdown() }} />
                ))}
                {openDropdown === 'sort' && SORT_OPTIONS.map(opt => (
                  <SheetRow key={opt.id} emoji={opt.emoji} label={opt.label} selected={sortBy === opt.id}
                    onPress={() => { setSortBy(opt.id); closeDropdown() }} />
                ))}
              </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Cards */}
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => String(item.partyId)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-12">
                <Text className="text-sm text-black/30">Loading cases…</Text>
              </View>
            ) : (
              <View className="items-center py-12">
                <Text className="text-sm text-black/40">No cases match these filters</Text>
              </View>
            )
          }
        />
      </View>
    </SafeAreaView>
  )
}
