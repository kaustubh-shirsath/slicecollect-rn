import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { useAllocations } from '../hooks/useAllocations'
import { getBucketColor } from '../utils/bucketColors'
import { getActivity } from '../data/activityLog'
import { haversine } from '../data/routingEngine'
import { getBorrowData } from '../data/emis'
import { getCCBill } from '../data/ccBills'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Allocations'>,
  NativeStackScreenProps<RootStackParamList>
>

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

function riskLabel(cibilAlert: boolean, priorityScore: number): 'High' | 'Medium' | 'Low' {
  if (cibilAlert) return 'High'
  if (priorityScore >= 4) return 'High'
  if (priorityScore >= 2) return 'Medium'
  return 'Low'
}

type SortKey = 'distance' | 'amount' | 'ptpSoonest' | 'riskHigh' | 'lastVisited'
type DistFilter = 'all' | '2' | '5' | '10'
type PtpFilter = 'all' | 'active' | 'broken' | 'none'

const STAGE_OPTIONS = ['NPA', 'SMA-0', 'SMA-1', 'SMA-2', 'Settlement', 'Standard', 'Write-Off', 'BKT-1', 'BKT-2', 'BKT-3', 'BKT-4', 'BKT-5', 'BKT-6+']
const DIST_OPTIONS: { id: DistFilter; label: string }[] = [
  { id: 'all', label: 'Any distance' },
  { id: '2', label: 'Within 2 km' },
  { id: '5', label: 'Within 5 km' },
  { id: '10', label: 'Within 10 km' },
]
const PTP_OPTIONS: { id: PtpFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Has active PTP' },
  { id: 'broken', label: 'PTP broken' },
  { id: 'none', label: 'No PTP' },
]
const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'distance', label: '📍 Nearest first' },
  { id: 'amount', label: '💰 Highest amount' },
  { id: 'ptpSoonest', label: '🕐 PTP due soonest' },
  { id: 'riskHigh', label: '⚡ High risk first' },
  { id: 'lastVisited', label: '🗓 Last visited (oldest)' },
]

export default function AllocationsScreen({ navigation, route }: Props) {
  const { agentInfo } = useAgent()
  const defaultBucket = route.params?.defaultBucket
  const [search, setSearch] = useState('')
  const [highChancesOnly, setHighChancesOnly] = useState(false)
  const [stageFilter, setStageFilter] = useState<string[]>(defaultBucket && defaultBucket !== 'All' ? [defaultBucket] : [])
  const [distFilter, setDistFilter] = useState<DistFilter>('all')
  const [ptpFilter, setPtpFilter] = useState<PtpFilter>('all')
  const [sortBy, setSortBy] = useState<SortKey>('distance')
  const [openDropdown, setOpenDropdown] = useState<'none' | 'bucket' | 'distance' | 'ptp' | 'sort'>('none')

  useEffect(() => {
    if (defaultBucket && defaultBucket !== 'All') setStageFilter([defaultBucket])
    else if (defaultBucket === 'All') setStageFilter([])
  }, [defaultBucket])

  const { allocations, loading, isFallback } = useAllocations('All', search, agentInfo?.username)

  const today = new Date().toDateString()

  const withMeta = allocations.map((c: any) => {
    const agentLat = agentInfo?.lat ?? 27.4728
    const agentLng = agentInfo?.lng ?? 94.9120
    const distKm = parseFloat(haversine(agentLat, agentLng, c.lat, c.lng).toFixed(1))
    const act = getActivity(c.partyId)
    const disp = act?.latestDisposition
    const hasPtp = disp?.type === 'Connected-PTP'
    const ptpBroken = hasPtp && disp?.ptpDate && new Date(disp.ptpDate).toDateString() < today && act!.collections.length === 0
    const latestCollection = act && act.collections.length > 0 ? act.collections[act.collections.length - 1] : null
    return { ...c, distKm, risk: riskLabel(c.cibilAlert, c.priorityScore || 0), hasPtp, ptpBroken, latestCollection }
  })

  const sorted = [...withMeta].sort((a: any, b: any) => {
    if (sortBy === 'distance') return a.distKm - b.distKm
    if (sortBy === 'amount') return (b.emiOs || 0) - (a.emiOs || 0)
    if (sortBy === 'ptpSoonest') return (b.hasPtp ? 1 : 0) - (a.hasPtp ? 1 : 0)
    if (sortBy === 'riskHigh') return (b.priorityScore || 0) - (a.priorityScore || 0)
    if (sortBy === 'lastVisited') return (a.lastPayment || '').localeCompare(b.lastPayment || '')
    return 0
  })

  const filtered = sorted.filter((c: any) => {
    const effectiveBucket = c.userType === 'borrow' ? (getBorrowData(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.userType === 'cc' ? (getCCBill(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.assetClassification
    if (stageFilter.length > 0 && !stageFilter.includes(effectiveBucket)) return false
    if (distFilter !== 'all' && c.distKm > parseFloat(distFilter)) return false
    if (ptpFilter === 'active' && !c.hasPtp) return false
    if (ptpFilter === 'broken' && !c.ptpBroken) return false
    if (ptpFilter === 'none' && (c.hasPtp || c.ptpBroken)) return false
    if (highChancesOnly && !c.cibilAlert) return false
    return true
  })

  const activeCount = (stageFilter.length > 0 ? 1 : 0) + (distFilter !== 'all' ? 1 : 0) +
    (ptpFilter !== 'all' ? 1 : 0) + (highChancesOnly ? 1 : 0)

  const closeDropdown = () => setOpenDropdown('none')

  const renderItem = ({ item: c }: { item: any }) => {
    const sliceBucket = c.userType === 'borrow' ? (getBorrowData(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.userType === 'cc' ? (getCCBill(c.partyId)?.bucketLabel ?? c.assetClassification)
      : c.assetClassification
    const bc = getBucketColor(sliceBucket)
    const maskedId = c.partyId
      ? String(c.partyId).replace(/^(.{4})(.+)(.{4})$/, (_: string, a: string, m: string, z: string) => a + '·'.repeat(Math.min(4, m.length)) + z)
      : '—'
    const riskColor = c.risk === 'High' ? '#CE1D26' : c.risk === 'Medium' ? '#A35300' : '#007E2F'

    return (
      <TouchableOpacity
        className="bg-white rounded-[20px] px-4 py-4 mb-2.5"
        style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
        onPress={() => navigation.navigate('CustomerDetail', { customer: c, fromScreen: 'Allocations' })}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 min-w-0 mr-3">
            <View className="flex-row items-center gap-1.5">
              {c.cibilAlert && <View className="w-2 h-2 rounded-full bg-[#CE1D26]" />}
              <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm" numberOfLines={1}>{c.name}</Text>
              {c.hasPtp && (
                <View className="bg-[#FFF0E0] px-1.5 py-0.5 rounded-full">
                  <Text className="text-[9px] text-[#A35300] font-medium">PTP</Text>
                </View>
              )}
            </View>
            <Text className="text-black/30 text-[11px] mt-0.5">{maskedId}</Text>
            <View className="flex-row items-center gap-2 mt-2 flex-wrap">
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: bc.bg }}>
                <Text className="text-[10px] font-medium" style={{ color: bc.text }}>{sliceBucket}</Text>
              </View>
              <Text className="text-[10px] text-black/40">{c.dpd} DPD</Text>
              <Text className="text-[10px] text-black/30">{c.distKm} km</Text>
              {c.risk === 'High' && (
                <Text className="text-[10px] font-medium" style={{ color: riskColor }}>⚡ High</Text>
              )}
            </View>
          </View>
          <View className="items-end gap-2">
            <Text className="text-sm font-medium text-[#CE1D26]">{fmt(c.overdue ?? c.emiOs)}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerDetail', { customer: c, fromScreen: 'Allocations' })}
              className="bg-[#D30AD7] px-3 py-1.5 rounded-full"
            >
              <Text className="text-[11px] text-white font-medium">Profile</Text>
            </TouchableOpacity>
            {c.latestCollection && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Receipt', {
                  receipt: {
                    receiptNo: c.latestCollection.receiptId,
                    partyId: c.partyId,
                    customerName: c.name,
                    dispositionType: c.latestCollection.mode === 'Payment Link' ? 'Payment Link' : 'Cash Collection',
                    actionType: c.latestCollection.mode === 'Payment Link' ? 'Payment Link' : 'Cash Collection',
                    amount: c.latestCollection.amount,
                    advanceAmount: 0,
                    paymentMode: c.latestCollection.mode,
                    agentName: agentInfo?.name || '',
                    branchName: agentInfo?.branch || c.branch || '',
                    glCode: agentInfo?.glCode || '',
                    createdAt: c.latestCollection.date,
                  },
                  backTo: 'Allocations',
                })}
                className="border border-black/15 bg-[#F0F4F7] px-2.5 py-1 rounded-full"
              >
                <Text className="text-[10px] text-black/55 font-medium">View Receipt</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      <TouchableOpacity activeOpacity={1} onPress={closeDropdown} className="flex-1">
        {/* Header */}
        <View className="bg-white px-5 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-[rgba(0,0,0,0.9)] text-lg font-medium">My Cases</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-black/40 text-xs">
                {loading ? '…' : `${filtered.length}${isFallback ? ' (offline)' : ''}`}
              </Text>
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

        {/* Search + filters */}
        <View className="bg-white" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
          <View className="flex-row items-center gap-2 px-4 pt-2 pb-2">
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F4F7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: 'rgba(0,0,0,0.3)', fontSize: 14 }}>🔍</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or ID…"
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
              className={`w-9 h-9 rounded-full items-center justify-center ${sortBy !== 'distance' ? 'bg-[#D30AD7]' : 'bg-[#F0F4F7]'}`}
            >
              <Text className={`text-base ${sortBy !== 'distance' ? 'text-white' : 'text-black/50'}`}>⇅</Text>
            </TouchableOpacity>
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-3" contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => {
                if (stageFilter.length > 0) { setStageFilter([]); setOpenDropdown('none') }
                else setOpenDropdown(prev => prev === 'bucket' ? 'none' : 'bucket')
              }}
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${stageFilter.length > 0 ? 'bg-[#D30AD7]' : 'bg-[#F0F4F7]'}`}
            >
              <Text className={`text-xs font-medium ${stageFilter.length > 0 ? 'text-white' : 'text-black/60'}`}>
                Bucket{stageFilter.length > 0 ? ` ×${stageFilter.length} ✕` : ' ▾'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (distFilter !== 'all') setDistFilter('all')
                else setOpenDropdown(prev => prev === 'distance' ? 'none' : 'distance')
              }}
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${distFilter !== 'all' ? 'bg-[#2B6ACF]' : 'bg-[#F0F4F7]'}`}
            >
              <Text className={`text-xs font-medium ${distFilter !== 'all' ? 'text-white' : 'text-black/60'}`}>
                {distFilter === 'all' ? 'Distance ▾' : `≤ ${distFilter} km ✕`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (ptpFilter !== 'all') setPtpFilter('all')
                else setOpenDropdown(prev => prev === 'ptp' ? 'none' : 'ptp')
              }}
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${ptpFilter !== 'all' ? 'bg-[#FF8100]' : 'bg-[#F0F4F7]'}`}
            >
              <Text className={`text-xs font-medium ${ptpFilter !== 'all' ? 'text-white' : 'text-black/60'}`}>
                {ptpFilter === 'all' ? 'PTP ▾' : `${PTP_OPTIONS.find(o => o.id === ptpFilter)?.label} ✕`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setHighChancesOnly(v => !v)}
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${highChancesOnly ? 'bg-[#CE1D26]' : 'bg-[#F0F4F7]'}`}
            >
              <Text className={`text-xs font-medium ${highChancesOnly ? 'text-white' : 'text-black/60'}`}>
                ⚡ High Chances{highChancesOnly ? ' ✕' : ''}
              </Text>
            </TouchableOpacity>

            {activeCount > 0 && (
              <TouchableOpacity
                onPress={() => { setStageFilter([]); setDistFilter('all'); setPtpFilter('all'); setHighChancesOnly(false); closeDropdown() }}
                className="px-3 py-1.5 rounded-full bg-[#F9E4E5]"
              >
                <Text className="text-xs font-medium text-[#CE1D26]">Clear all</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Bucket Dropdown */}
          {openDropdown === 'bucket' && (
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View className="mx-4 mb-2 bg-white rounded-2xl overflow-hidden border border-black/[0.06]" style={{ elevation: 8 }}>
                {STAGE_OPTIONS.map(s => {
                  const bc = getBucketColor(s)
                  const active = stageFilter.includes(s)
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => {
                        setStageFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
                      }}
                      className="flex-row items-center justify-between px-4 py-3"
                      style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}
                    >
                      <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: bc.bg }}>
                        <Text className="text-xs font-medium" style={{ color: bc.text }}>{s}</Text>
                      </View>
                      {active && <Text className="text-[#D30AD7] text-sm font-bold">✓</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </TouchableOpacity>
          )}

          {openDropdown === 'distance' && (
            <View className="mx-4 mb-2 bg-white rounded-2xl overflow-hidden border border-black/[0.06]" style={{ elevation: 8 }}>
              {DIST_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { setDistFilter(opt.id); closeDropdown() }}
                  className="flex-row items-center justify-between px-4 py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}
                >
                  <Text className="text-sm text-black/80">{opt.label}</Text>
                  {distFilter === opt.id && <Text className="text-[#2B6ACF] text-sm">✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {openDropdown === 'ptp' && (
            <View className="mx-4 mb-2 bg-white rounded-2xl overflow-hidden border border-black/[0.06]" style={{ elevation: 8 }}>
              {PTP_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { setPtpFilter(opt.id); closeDropdown() }}
                  className="flex-row items-center justify-between px-4 py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}
                >
                  <Text className="text-sm text-black/80">{opt.label}</Text>
                  {ptpFilter === opt.id && <Text className="text-[#FF8100] text-sm">✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {openDropdown === 'sort' && (
            <View className="mx-4 mb-2 bg-white rounded-2xl overflow-hidden border border-black/[0.06]" style={{ elevation: 8 }}>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => { setSortBy(opt.id); closeDropdown() }}
                  className="flex-row items-center justify-between px-4 py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}
                >
                  <Text className="text-sm text-black/80">{opt.label}</Text>
                  {sortBy === opt.id && <Text className="text-[#D30AD7] text-sm">✓</Text>}
                </TouchableOpacity>
              ))}
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
                <Text className="text-3xl mb-2">🔍</Text>
                <Text className="text-sm text-black/40">No cases match these filters</Text>
              </View>
            )
          }
        />
      </TouchableOpacity>
    </SafeAreaView>
  )
}
