import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { getBucketColor } from '../utils/bucketColors'

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetail'>

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}
function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }
function fmtProduct(p: string) {
  return p.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
}
function isCallAllowed() {
  const h = new Date().getHours()
  return h >= 8 && h < 19
}

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const { customer: c, fromScreen } = route.params
  const [callBlocked, setCallBlocked] = useState(false)

  const bc = getBucketColor(c.assetClassification || c.assetClass || '')
  const isVisited = c.status === 'visited'

  function handleCall(mobile: string) {
    if (!isCallAllowed()) {
      setCallBlocked(true)
      setTimeout(() => setCallBlocked(false), 3000)
      return
    }
    const clean = mobile.replace(/\D/g, '')
    Linking.openURL(`tel:+91${clean}`)
  }

  function openMaps(address: string) {
    const q = encodeURIComponent(address)
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`)
  }

  function openWhatsApp(mobile: string) {
    const clean = mobile.replace(/\D/g, '')
    Linking.openURL(`https://wa.me/91${clean}`)
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      {/* Header */}
      <SafeAreaView className="bg-white" edges={['top']}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }} className="px-4 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-9 h-9 items-center justify-center"
            >
              <Text className="text-black/60 text-xl">←</Text>
            </TouchableOpacity>
            <Text className="text-[#CE1D26] text-xs font-medium">Escalate</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text className="text-[#A008A3] font-bold text-base">{initials(c.name)}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[rgba(0,0,0,0.9)] font-semibold text-base leading-tight" numberOfLines={1}>{c.name}</Text>
              <Text className="text-black/40 text-[10px] font-mono mt-0.5">{c.partyId}</Text>
              <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: bc.bg }}>
                  <Text className="text-[10px] font-semibold" style={{ color: bc.text }}>
                    {c.assetClassification || c.assetClass}
                  </Text>
                </View>
                {c.cibilAlert && (
                  <View className="bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] text-[#C05000] font-semibold">⚠ CIBIL</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {callBlocked && (
        <View className="mx-4 mt-3 bg-[#F9E4E5] border border-[#CE1D26]/20 rounded-2xl px-4 py-3 flex-row items-center gap-2">
          <Text className="text-[#CE1D26] text-base">🚫</Text>
          <View>
            <Text className="text-[#CE1D26] text-xs font-medium">Cannot call at this time</Text>
            <Text className="text-[10px]" style={{ color: 'rgba(206,29,38,0.7)' }}>Calling allowed only 8:00 AM – 7:00 PM</Text>
          </View>
        </View>
      )}

      <ScrollView className="flex-1 px-4 py-3" contentContainerStyle={{ gap: 12, paddingBottom: 120 }}>

        {/* Visit status */}
        {isVisited && (
          <View className="bg-white rounded-2xl px-3 py-2.5 flex-row items-center justify-between" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#00A63E]" />
              <Text className="text-[10px] text-black/40 uppercase tracking-wide">Status</Text>
              <Text className="text-xs font-medium text-[#00A63E]">Visited</Text>
            </View>
          </View>
        )}

        {/* Overdue highlight */}
        <View className="bg-white rounded-[20px] px-4 py-3 flex-row items-center justify-between" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <View>
            <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium">Overdue</Text>
            <Text className="text-[#CE1D26] text-2xl font-bold mt-0.5">{fmt(c.emiOs)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium">Status</Text>
            <Text className={`text-xl font-bold mt-0.5 ${isVisited ? 'text-[#00A63E]' : 'text-black/40'}`}>{isVisited ? 'Visited' : 'Pending'}</Text>
          </View>
        </View>

        {/* Loan Details */}
        <View className="bg-white rounded-[20px] px-4 py-3" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2.5">Loan Details</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              ['Product', fmtProduct(c.product || '')],
              ['DPD', `${c.dpd} days`],
              ['POS Amt', fmt(c.outstandingBalance || 0)],
              ['EMI Amt', fmt(c.emiAmt || 0)],
              ['Min Pay', fmt(c.minimumAmountDue || 0)],
              ['Rollback', fmt(c.rollbackAmount || 0)],
              ['Settlement', fmt(c.outstandingBalance || 0)],
              ['Last Payment', c.lastPaymentDate || '—'],
            ].map(([k, v]) => (
              <View key={k} style={{ width: '45%' }}>
                <Text className="text-[10px] text-black/40 font-medium">{k}</Text>
                <Text className="text-xs font-semibold text-[rgba(0,0,0,0.85)] mt-0.5 leading-tight">{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View className="bg-white rounded-[20px] overflow-hidden" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <View className="px-4 pt-3 pb-2.5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Primary</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)] tracking-wide">XXXXXX{c.mobile?.slice(-4)}</Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => handleCall(c.mobile)}
                  className="w-9 h-9 rounded-full bg-[#D30AD7] items-center justify-center"
                >
                  <Text className="text-white text-sm">📞</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openWhatsApp(c.mobile)}
                  className="w-9 h-9 rounded-full bg-[#25D366] items-center justify-center"
                >
                  <Text style={{ color: '#fff', fontSize: 15 }}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {c.mobile1 && (
            <View className="px-4 py-2.5">
              <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Alternate</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)] tracking-wide">XXXXXX{c.mobile1.slice(-4)}</Text>
                <TouchableOpacity
                  onPress={() => handleCall(c.mobile1)}
                  className="w-9 h-9 rounded-full border-2 border-[#D30AD7] items-center justify-center"
                >
                  <Text className="text-[#D30AD7] text-sm">📞</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Address */}
        <TouchableOpacity
          onPress={() => openMaps(c.address)}
          className="w-full bg-white rounded-[20px] px-4 py-3"
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
        >
          <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-1.5">Address</Text>
          <View className="flex-row items-start gap-2">
            <Text className="text-[#D30AD7] mt-0.5">📍</Text>
            <Text className="text-xs font-medium text-[rgba(0,0,0,0.85)] leading-relaxed flex-1">{c.address}</Text>
            <View className="w-8 h-8 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text>📍</Text>
            </View>
          </View>
          <Text className="text-[#D30AD7] text-[10px] font-semibold mt-1.5">Open in Google Maps →</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Action buttons */}
      <View className="absolute bottom-6 left-0 right-0 px-4">
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 12, elevation: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Disposition', { customer: c, fromScreen })}
            style={{ flex: 1, backgroundColor: '#D30AD7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }}>Add Feedback</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settlement', { customer: c })}
            style={{ flex: 1, backgroundColor: '#F0F4F7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'rgba(0,0,0,0.7)', fontSize: 12, fontWeight: '600' }}>Settlement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('PaymentLink', { customer: c })}
            style={{ flex: 1, backgroundColor: '#F0F4F7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'rgba(0,0,0,0.7)', fontSize: 12, fontWeight: '600' }}>Pay Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
