import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/types'
import { getSalesActivity } from '../../data/salesActivityLog'

type Props = NativeStackScreenProps<RootStackParamList, 'SalesMerchantDetail'>

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

function maskAccount(acct: string): string {
  if (acct.length <= 4) return acct
  return 'XXXXXX' + acct.slice(-4)
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}

const BUSINESS_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Grocery:     { bg: '#E0F4E8', text: '#007E2F' },
  Pharmacy:    { bg: '#E0F0FF', text: '#1D4ED8' },
  Hardware:    { bg: '#FFF3E0', text: '#A35300' },
  Textile:     { bg: '#FAE2FA', text: '#A008A3' },
  Restaurant:  { bg: '#FFF0E0', text: '#CE1D26' },
  Electronics: { bg: '#F0F0FF', text: '#5B21B6' },
}

export default function SalesMerchantDetailScreen({ navigation, route }: Props) {
  const { merchant: m } = route.params
  const activity = getSalesActivity(m.merchantId)
  const recentCollections = activity?.collections.slice().reverse().slice(0, 5) ?? []
  const typeColors = BUSINESS_TYPE_COLORS[m.businessType] ?? { bg: '#F0F4F7', text: 'rgba(0,0,0,0.6)' }
  const isOverdue = m.daysWithoutDeposit > 7

  function handleCall() {
    Linking.openURL(`tel:+91${m.mobile}`)
  }

  function handleWhatsApp() {
    Linking.openURL(`https://wa.me/91${m.mobile}`)
  }

  function openMaps() {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address)}`)
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      {/* Header */}
      <SafeAreaView className="bg-white" edges={['top']}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }} className="px-4 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity onPress={() => navigation.goBack()} className="w-8 h-8 items-center justify-center">
              <Text className="text-black/70 text-xl">←</Text>
            </TouchableOpacity>
            <View className="flex-1 mx-3">
              <Text className="text-[rgba(0,0,0,0.9)] font-medium text-base" numberOfLines={1}>{m.businessName}</Text>
              <Text className="text-[rgba(0,0,0,0.4)] text-xs">{m.ownerName}</Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text className="text-[#A008A3] font-bold text-xs">{initials(m.ownerName)}</Text>
            </View>
          </View>
          {/* CASA Account */}
          <View className="flex-row items-center gap-2 bg-[#F0F4F7] rounded-xl px-4 py-2.5">
            <Text className="text-[10px] text-black/50 font-medium uppercase tracking-wider">CASA Account</Text>
            <Text className="text-sm font-mono font-medium text-[rgba(0,0,0,0.9)]">{maskAccount(m.casaAccountNo)}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>

        {/* Business Info */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 1 }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Business Info</Text>
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-black/50">Type</Text>
              <View style={{ backgroundColor: typeColors.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: typeColors.text }}>{m.businessType}</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }} />
            <View className="flex-row items-start justify-between gap-4">
              <Text className="text-xs text-black/50">Address</Text>
              <TouchableOpacity onPress={openMaps} className="flex-1">
                <Text className="text-xs font-medium text-[#1D4ED8] text-right" numberOfLines={2}>{m.address} ↗</Text>
              </TouchableOpacity>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }} />
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-black/50">Mobile</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">+91 {m.mobile}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }} />
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-black/50">Branch</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">{m.branch}</Text>
            </View>
          </View>
        </View>

        {/* Financial Info */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 1 }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Financial Details</Text>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#E0F4E8' }}>
              <Text style={{ fontSize: 10, color: '#007E2F', fontWeight: '500' }}>Pending Amount</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#007E2F', marginTop: 2 }}>{fmt(m.pendingAmount)}</Text>
            </View>
            <View className="flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: isOverdue ? '#F9E4E5' : '#F0F4F7' }}>
              <Text style={{ fontSize: 10, color: isOverdue ? '#CE1D26' : 'rgba(0,0,0,0.5)', fontWeight: '500' }}>Days Since Deposit</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: isOverdue ? '#CE1D26' : 'rgba(0,0,0,0.9)', marginTop: 2 }}>
                {m.daysWithoutDeposit}d
              </Text>
            </View>
          </View>
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-xs text-black/50">Last Deposit Date</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">{m.lastDepositDate}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }} />
            <View className="flex-row justify-between">
              <Text className="text-xs text-black/50">Avg Monthly Deposit</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">{fmt(m.averageMonthlyDeposit)}</Text>
            </View>
          </View>
        </View>

        {/* Recent Collections */}
        {recentCollections.length > 0 && (
          <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 1 }}>
            <View className="px-5 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
              <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">Recent Collections</Text>
            </View>
            {recentCollections.map((c, i) => (
              <View
                key={c.collectionId}
                className="flex-row items-center justify-between px-5 py-3"
                style={{ borderBottomWidth: i < recentCollections.length - 1 ? 1 : 0, borderBottomColor: 'rgba(0,0,0,0.04)' }}
              >
                <View>
                  <Text className="text-sm font-medium text-[rgba(0,0,0,0.9)]">{fmt(c.amount)}</Text>
                  <Text className="text-[10px] text-black/40 mt-0.5">{c.notes}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text className="text-xs text-black/50">{c.date}</Text>
                  <View style={{
                    marginTop: 4, backgroundColor: c.deposited ? '#E0F4E8' : '#FFF3E0',
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '500', color: c.deposited ? '#007E2F' : '#A35300' }}>
                      {c.deposited ? 'Deposited' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Contact */}
        <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 1 }}>
          <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Contact</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleCall}
              style={{ flex: 1, backgroundColor: '#D30AD7', borderRadius: 999, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            >
              <Text style={{ fontSize: 14 }}>📞</Text>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleWhatsApp}
              style={{ flex: 1, backgroundColor: '#25D366', borderRadius: 999, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
            >
              <Text style={{ fontSize: 14 }}>💬</Text>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
        borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
        elevation: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -2 },
        flexDirection: 'row', gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('SalesCollect', { merchant: m })}
          style={{ flex: 1, backgroundColor: '#D30AD7', borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Collect Cash</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {}}
          style={{ flex: 1, backgroundColor: '#F0F4F7', borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: 'rgba(0,0,0,0.7)', fontWeight: '600', fontSize: 14 }}>View History</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
