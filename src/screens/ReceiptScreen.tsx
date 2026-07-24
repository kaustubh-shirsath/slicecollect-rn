import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Receipt'>

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

export default function ReceiptScreen({ navigation, route }: Props) {
  const { receipt } = route.params
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

  // Receipt is sent to BOTH the registered number and the alternate number when present.
  // Alternate number also serves as the fallback contact when no registered number is on file.
  const registeredMobile: string = receipt.customerMobile || ''
  const [customMobile, setCustomMobile] = useState(receipt.alternateMobile || '')
  const altMobile = customMobile.replace(/\D/g, '')
  const primaryTarget = (registeredMobile || altMobile).replace(/\D/g, '')

  function shareWhatsApp(number: string) {
    const text = `slice Collection Receipt\n${receipt.receiptNo}\nCustomer: ${receipt.customerName}\nAmount: ${fmt(receipt.amount)}\nDate: ${dateStr}`
    const target = number ? `91${number.slice(-10)}` : ''
    Linking.openURL(`https://wa.me/${target}?text=${encodeURIComponent(text)}`)
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
              <Text className="text-white font-medium text-base">slice</Text>
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

        {/* Share-to number */}
        <View className="bg-white rounded-[24px] px-5 py-4 mt-4" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Share Receipt To</Text>
          {registeredMobile ? (
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs text-black/50">Registered number</Text>
              <Text className="text-sm font-medium text-black/90">{registeredMobile}</Text>
            </View>
          ) : (
            <View className="bg-[#FFF3E0] rounded-xl px-3 py-2 mb-3">
              <Text className="text-xs text-[#A35300]">No registered mobile number on file for this customer.</Text>
            </View>
          )}
          <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-1.5">
            Alternate Number <Text className="normal-case text-black/30">(optional)</Text>
          </Text>
          <TextInput
            value={customMobile}
            onChangeText={setCustomMobile}
            keyboardType="phone-pad"
            placeholder="Enter a 10-digit number to share to"
            placeholderTextColor="rgba(0,0,0,0.3)"
            className="w-full bg-[#F0F4F7] rounded-[24px] px-4 py-3 text-sm text-[rgba(0,0,0,0.9)]"
            style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
            maxLength={10}
          />
          <Text className="text-[10px] text-black/40 mt-1.5 leading-relaxed">
            {registeredMobile
              ? 'Payment receipt will be sent to this number as well, in addition to the registered number.'
              : 'Payment receipt will be sent to this number, since no registered number is on file.'}
          </Text>
        </View>

        {/* Actions */}
        <View className="mt-3 gap-2">
          <TouchableOpacity
            disabled
            className="w-full border border-[#D30AD7] rounded-full py-3.5 items-center"
            style={{ opacity: 0.5 }}
          >
            <Text className="text-[#D30AD7] text-sm font-medium">Download Receipt (PDF) — Coming Soon</Text>
          </TouchableOpacity>
          {/* Receipt is sent to both numbers — one share action per number that's available */}
          <TouchableOpacity
            onPress={() => shareWhatsApp(primaryTarget)}
            disabled={!primaryTarget}
            className="w-full bg-[#25D366] rounded-full py-3.5 items-center"
            style={!primaryTarget ? { opacity: 0.4 } : undefined}
          >
            <Text className="text-white text-sm font-medium">
              {primaryTarget ? `Share on WhatsApp · ${primaryTarget}` : 'Share on WhatsApp'}
            </Text>
          </TouchableOpacity>
          {registeredMobile && altMobile && altMobile !== registeredMobile.replace(/\D/g, '') && (
            <TouchableOpacity
              onPress={() => shareWhatsApp(altMobile)}
              className="w-full border border-[#25D366] rounded-full py-3.5 items-center"
            >
              <Text className="text-[#128C4A] text-sm font-medium">Share on WhatsApp · {altMobile} (alternate)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
