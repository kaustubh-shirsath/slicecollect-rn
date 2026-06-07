import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Receipt'>

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

export default function ReceiptScreen({ navigation, route }: Props) {
  const { receipt, backTo } = route.params
  const { agentInfo } = useAgent()

  if (!receipt) {
    return (
      <SafeAreaView className="flex-1 bg-[#F0F4F7] items-center justify-center gap-3" edges={['top']}>
        <Text className="text-black/40 text-sm">No receipt to display</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-[#D30AD7] text-sm font-medium">← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const date = new Date(receipt.createdAt)
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  function shareWhatsApp() {
    const text = `SliceField Collection Receipt\n${receipt.receiptNo}\nCustomer: ${receipt.customerName}\nAmount: ${fmt(receipt.amount)}\nDate: ${dateStr}`
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      <SafeAreaView className="bg-white" edges={['top']}>
        <View className="px-5 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-2">
            <Text className="text-black/70 text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-[rgba(0,0,0,0.9)] font-medium text-xl">Collection Receipt</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Receipt card */}
        <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          {/* Purple header */}
          <View className="bg-[#D30AD7] px-5 py-4 flex-row items-center justify-between">
            <View>
              <Text className="text-white font-medium text-base">SliceField</Text>
              <Text className="text-white/70 text-xs">Slice Small Finance Bank</Text>
            </View>
            <View className="bg-white/20 px-2.5 py-1 rounded-full flex-row items-center gap-1">
              <Text className="text-[#00A63E]">✓</Text>
              <Text className="text-white text-[10px] font-medium">Collection Recorded</Text>
            </View>
          </View>

          <View className="px-5 py-4 gap-3">
            {/* Receipt no + date */}
            <View className="flex-row justify-between items-center">
              <Text className="font-mono text-xs text-black/40">{receipt.receiptNo}</Text>
              <Text className="text-xs text-black/40">{dateStr} · {timeStr}</Text>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.15)', borderStyle: 'dashed' }} />

            {/* Amount hero */}
            <View className="items-center py-3">
              <Text className="text-[10px] text-black/40 uppercase tracking-wider mb-1">Amount Collected</Text>
              <Text className="text-4xl font-medium text-[#00A63E]">{fmt(receipt.amount)}</Text>
              {receipt.advanceAmount > 0 && (
                <Text className="text-xs text-black/40 mt-1">incl. advance {fmt(receipt.advanceAmount)}</Text>
              )}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.15)', borderStyle: 'dashed' }} />

            {/* Details */}
            <View className="gap-2.5">
              {[
                ['Customer', receipt.customerName],
                ['Party ID', String(receipt.partyId)],
                ['Disposition Type', receipt.dispositionType || receipt.actionType],
                ['Payment Mode', receipt.paymentMode],
                ['Branch', receipt.branchName],
                ...(receipt.glCode || agentInfo?.glCode ? [['GL Code', receipt.glCode || agentInfo?.glCode || '']] : []),
              ].map(([label, value]) => (
                <View key={label} className="flex-row justify-between">
                  <Text className="text-xs text-black/50">{label}</Text>
                  <Text className="text-xs font-medium text-black/90 text-right max-w-[60%]">{value}</Text>
                </View>
              ))}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.15)', borderStyle: 'dashed' }} />

            {/* Agent signature */}
            <View className="flex-row justify-between items-end">
              <View>
                <Text className="text-[10px] text-black/40 uppercase tracking-wider">Collected by</Text>
                <Text className="text-sm font-medium text-black/90 mt-0.5">{receipt.agentName || agentInfo?.name || '—'}</Text>
                <Text className="text-xs text-black/40">{agentInfo?.branch || receipt.branchName}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] text-black/40 uppercase tracking-wider">Role</Text>
                <Text className="text-xs font-medium text-black/70 mt-0.5">{agentInfo?.role || 'FOA'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="mt-4 gap-2">
          <TouchableOpacity
            disabled
            className="w-full border border-[#D30AD7] rounded-full py-3.5 items-center"
            style={{ opacity: 0.5 }}
          >
            <Text className="text-[#D30AD7] text-sm font-medium">Download Receipt (PDF) — Coming Soon</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={shareWhatsApp}
            className="w-full bg-[#25D366] rounded-full py-3.5 items-center"
          >
            <Text className="text-white text-sm font-medium">Share on WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}
