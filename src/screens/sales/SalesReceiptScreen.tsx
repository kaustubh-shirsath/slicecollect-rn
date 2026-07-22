import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/types'
import { useAgent } from '../../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'SalesReceipt'>

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

function maskAccount(acct: string): string {
  if (acct.length <= 4) return acct
  return 'XXXXXX' + acct.slice(-4)
}

export default function SalesReceiptScreen({ navigation, route }: Props) {
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

  function shareWhatsApp() {
    const text = `slice Sales Receipt\n${receipt.receiptNo}\nMerchant: ${receipt.businessName}\nCASA: ${maskAccount(receipt.casaAccountNo)}\nAmount: ${fmt(receipt.amount)}\nNotes: ${receipt.notes}\nDate: ${dateStr} ${timeStr}`
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      <SafeAreaView className="bg-white" edges={['top']}>
        <View className="px-5 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <TouchableOpacity onPress={() => navigation.navigate('SalesMain')} className="mb-2">
            <Text className="text-black/70 text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-[rgba(0,0,0,0.9)] font-medium text-xl">Cash Deposit Receipt</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Receipt card */}
        <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          {/* Purple header */}
          <View className="bg-[#D30AD7] px-5 py-4 flex-row items-center justify-between">
            <View>
              <Text className="text-white font-medium text-base">slice · sales</Text>
              <Text className="text-white/70 text-xs">Slice Small Finance Bank</Text>
            </View>
            <View className="bg-white/20 px-2.5 py-1 rounded-full flex-row items-center gap-1">
              <Text className="text-[#00FF88]">✓</Text>
              <Text className="text-white text-[10px] font-medium">Deposit Recorded</Text>
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
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.15)', borderStyle: 'dashed' }} />

            {/* Details */}
            <View className="gap-2.5">
              {[
                ['Merchant', receipt.businessName],
                ['Owner', receipt.ownerName],
                ['CASA Account', maskAccount(receipt.casaAccountNo)],
                ['Note Breakdown', receipt.notes],
                ['Branch', receipt.branchName],
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
                <Text className="text-xs text-black/40">{receipt.branchName}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] text-black/40 uppercase tracking-wider">Module</Text>
                <Text className="text-xs font-medium text-black/70 mt-0.5">Sales — Doorstep</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="mt-4 gap-2">
          <TouchableOpacity
            onPress={shareWhatsApp}
            className="w-full bg-[#25D366] rounded-full py-3.5 items-center"
          >
            <Text className="text-white text-sm font-medium">Share on WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('SalesMain')}
            className="w-full border border-[#D30AD7] rounded-full py-3.5 items-center"
          >
            <Text className="text-[#D30AD7] text-sm font-medium">Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}
