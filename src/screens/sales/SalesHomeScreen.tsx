import { useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SalesTabParamList, RootStackParamList } from '../../navigation/types'
import { useAgent } from '../../navigation/AgentContext'
import { ALL_MERCHANTS } from '../../data/merchants'
import { getSalesActivity } from '../../data/salesActivityLog'

type Props = CompositeScreenProps<
  BottomTabScreenProps<SalesTabParamList, 'SalesHome'>,
  NativeStackScreenProps<RootStackParamList>
>

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

export default function SalesHomeScreen({ navigation }: Props) {
  const { agentInfo } = useAgent()

  const initials = agentInfo?.name
    ? agentInfo.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'SF'

  const myMerchants = useMemo(() =>
    ALL_MERCHANTS.filter(m => m.assignedAgent === (agentInfo?.username ?? 'Gakul_Khanikar')),
    [agentInfo?.username]
  )

  const todayStr = new Date().toISOString().split('T')[0]

  const { collectedToday, cashInHand, pendingVisits, totalMerchants, overdueWarnings, todayCollections } = useMemo(() => {
    let collectedToday = 0
    let cashInHand = 0
    let pendingVisits = 0
    const overdueWarnings: string[] = []
    const todayCollections: Array<{ businessName: string; amount: number; merchantId: string }> = []

    for (const m of myMerchants) {
      const act = getSalesActivity(m.merchantId)
      if (!act) {
        pendingVisits++
        continue
      }

      const todayCols = act.collections.filter(c => c.date === todayStr)
      if (todayCols.length > 0) {
        const sum = todayCols.reduce((s, c) => s + c.amount, 0)
        collectedToday += sum
        todayCollections.push({ businessName: m.businessName, amount: sum, merchantId: m.merchantId })
      } else {
        pendingVisits++
      }

      const undeposited = act.collections.filter(c => !c.deposited).reduce((s, c) => s + c.amount, 0)
      cashInHand += undeposited

      if (m.daysWithoutDeposit > 7) {
        overdueWarnings.push(m.businessName)
      }
    }

    return {
      collectedToday,
      cashInHand,
      pendingVisits,
      totalMerchants: myMerchants.length,
      overdueWarnings,
      todayCollections,
    }
  }, [myMerchants, todayStr])

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F7]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-5 py-3 flex-row items-center justify-between border-b border-black/[0.06]">
        <Text className="text-[rgba(0,0,0,0.9)] text-lg font-medium tracking-tight">SliceField · Sales</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          className="w-9 h-9 rounded-full bg-[#FAE2FA] items-center justify-center"
        >
          <Text className="text-[#A008A3] text-xs font-bold">{initials}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}>

        {/* Overdue warning */}
        {overdueWarnings.length > 0 && (
          <View style={{ backgroundColor: '#F9E4E5', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#CE1D26' }}>Overdue Deposits — Action Required</Text>
              <Text style={{ fontSize: 11, color: '#CE1D26', opacity: 0.8, marginTop: 2 }}>
                {overdueWarnings.slice(0, 2).join(', ')}{overdueWarnings.length > 2 ? ` +${overdueWarnings.length - 2} more` : ''} — {overdueWarnings.length > 1 ? 'these merchants have' : 'this merchant has'} not deposited in over 7 days
              </Text>
            </View>
          </View>
        )}

        {/* Stats cards */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Today's Overview</Text>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Merchants{'\n'}Assigned</Text>
              <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{totalMerchants}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">total</Text>
            </View>
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Collected{'\n'}Today</Text>
              <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{todayCollections.length}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">merchants</Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-[#FAE2FA] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-[#A008A3] font-medium">Cash in{'\n'}Hand</Text>
              <Text className="text-lg font-medium text-[#D30AD7] mt-1">{fmt(cashInHand)}</Text>
              <Text className="text-[10px] text-[#D30AD7] mt-0.5" style={{ opacity: 0.7 }}>undeposited</Text>
            </View>
            <View className="flex-1 bg-[#F0F4F7] rounded-xl px-3 py-2.5">
              <Text className="text-[10px] text-black/50 font-medium">Pending{'\n'}Visits</Text>
              <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mt-1">{pendingVisits}</Text>
              <Text className="text-[10px] text-black/40 mt-0.5">merchants</Text>
            </View>
          </View>
        </View>

        {/* Cash to Deposit */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Cash to Deposit</Text>
          <Text style={{ fontSize: 36, fontWeight: '700', color: '#00A63E' }}>{fmt(cashInHand)}</Text>
          <Text className="text-xs text-black/40 mt-1 mb-4">Undeposited cash in hand</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SalesDeposit' as any)}
            style={{ backgroundColor: '#D30AD7', borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Deposit Now →</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Collections */}
        {todayCollections.length > 0 && (
          <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
            <View className="px-5 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
              <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">Today's Collections</Text>
            </View>
            {todayCollections.map((c, i) => (
              <View
                key={c.merchantId}
                className={`flex-row items-center justify-between px-5 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F0F4F7]/40'}`}
                style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.04)' }}
              >
                <Text className="text-sm text-[rgba(0,0,0,0.9)] font-medium flex-1" numberOfLines={1}>{c.businessName}</Text>
                <Text className="text-sm font-medium text-[#00A63E]">{fmt(c.amount)}</Text>
              </View>
            ))}
            <View className="px-5 py-3 flex-row justify-between" style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
              <Text className="text-xs font-medium text-black/50">Total Collected Today</Text>
              <Text className="text-sm font-medium text-[rgba(0,0,0,0.9)]">{fmt(collectedToday)}</Text>
            </View>
          </View>
        )}

        {todayCollections.length === 0 && (
          <View className="bg-white rounded-[24px] px-5 py-8 items-center" style={{ elevation: 1 }}>
            <Text className="text-3xl mb-3">🏪</Text>
            <Text className="text-sm font-medium text-[rgba(0,0,0,0.9)] mb-1">No collections today</Text>
            <Text className="text-xs text-black/40 text-center">Start your route to begin collecting deposits from merchants</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SalesRoute' as any)}
              style={{ marginTop: 16, backgroundColor: '#D30AD7', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>View Today's Route →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
