import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Linking, Clipboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentLink'>

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')
const PAYMENT_TYPES = ['Overdue', 'Min Due', 'Foreclosure', 'Rollback', 'Custom'] as const
type PaymentType = typeof PAYMENT_TYPES[number]

export default function PaymentLinkScreen({ navigation, route }: Props) {
  const { customer: c } = route.params
  const [type, setType] = useState<PaymentType>('Overdue')
  const [customAmount, setCustomAmount] = useState('')
  const [generated, setGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)

  const autoAmounts: Record<PaymentType, number> = {
    'Overdue':     c.overdue     ?? c.emiOs     ?? 0,
    'Min Due':     c.minDue      ?? c.minimumAmountDue ?? 0,
    'Foreclosure': c.foreclosure ?? c.outstandingBalance ?? 0,
    'Rollback':    c.rollback    ?? c.rollbackAmount    ?? 0,
    'Custom': parseFloat(customAmount) || 0,
  }
  const amount = autoAmounts[type]
  const fakeLink = `https://pay.slice.bank/c/${String(c.partyId).slice(-6)}`

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 1200)
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      <SafeAreaView className="bg-white" edges={['top']}>
        <View className="px-4 pb-5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-3 flex-row items-center gap-1">
            <Text className="text-[#D30AD7] text-sm">‹ Back</Text>
          </TouchableOpacity>
          <Text className="text-[rgba(0,0,0,0.9)] text-lg font-bold">Generate Payment Link</Text>
          <Text className="text-black/40 text-xs">{c.name} · +91-{c.mobile}</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        <View className="bg-white rounded-[24px] p-4 gap-4" style={{ elevation: 1 }}>
          {/* Payment Type */}
          <View>
            <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-2">Payment Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setType(t); setGenerated(false) }}
                  style={{
                    minHeight: 52, width: '47%', borderRadius: 24, padding: 10,
                    borderWidth: 2,
                    borderColor: type === t ? 'rgba(211,10,215,0.30)' : 'rgba(0,0,0,0.06)',
                    backgroundColor: type === t ? '#FAE2FA' : 'white',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: type === t ? '#D30AD7' : 'rgba(0,0,0,0.9)' }}>{t}</Text>
                  {t !== 'Custom' && (
                    <Text style={{ fontSize: 14, fontWeight: '700', marginTop: 2, color: type === t ? '#D30AD7' : 'rgba(0,0,0,0.5)' }}>{fmt(autoAmounts[t])}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {type === 'Custom' && (
            <View>
              <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5">Custom Amount (₹)</Text>
              <TextInput
                keyboardType="numeric"
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="Enter amount"
                placeholderTextColor="rgba(0,0,0,0.3)"
                className="w-full bg-[#F0F4F7] rounded-[24px] px-3 py-2.5 text-sm"
                style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
              />
            </View>
          )}

          {/* Amount preview */}
          <View className="bg-[#FAE2FA] rounded-[24px] p-3" style={{ borderWidth: 1, borderColor: 'rgba(211,10,215,0.30)' }}>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-black/50">Amount</Text>
              <Text className="text-[#D30AD7] font-bold text-lg">{fmt(amount)}</Text>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-xs text-black/50">Expires in</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">4 hours</Text>
            </View>
          </View>

          {/* SMS info */}
          <View className="flex-row items-center gap-2 py-2" style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
            <View className="w-4 h-4 rounded-full bg-green-500 items-center justify-center">
              <Text className="text-white text-[9px]">✓</Text>
            </View>
            <Text className="text-xs text-black/50 flex-1">
              SMS will be sent to <Text className="font-semibold text-[rgba(0,0,0,0.9)]">+91-{c.mobile}</Text> automatically
            </Text>
          </View>
        </View>

        {!generated ? (
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={amount <= 0 || generating}
            className={`w-full py-3.5 rounded-full items-center ${amount > 0 && !generating ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
          >
            <Text className={`text-sm font-semibold ${amount > 0 && !generating ? 'text-white' : 'text-black/40'}`}>
              {generating ? '⏳ Generating...' : '🔗 Generate Payment Link'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-white rounded-[24px] p-4 gap-4" style={{ elevation: 1 }}>
            <View className="flex-row items-center gap-2">
              <Text className="text-[#00A63E] text-xl">✅</Text>
              <View>
                <Text className="text-[rgba(0,0,0,0.9)] font-bold text-sm">Link Generated!</Text>
                <Text className="text-xs text-[#00A63E]">SMS sent to +91-{c.mobile}</Text>
              </View>
            </View>
            <View className="bg-[#F0F4F7] rounded-[24px] p-3">
              <Text className="text-xs text-black/40 mb-1">Payment Link</Text>
              <Text className="text-xs text-[#D30AD7] font-mono">{fakeLink}</Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => Clipboard.setString(fakeLink)}
                className="flex-1 bg-[#F0F4F7] py-2.5 rounded-full items-center"
              >
                <Text className="text-xs font-semibold text-black/50">📋 Copy Link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://wa.me/91${c.mobile?.replace(/\D/g,'')}?text=${encodeURIComponent(`Payment link: ${fakeLink}`)}`)}
                className="flex-1 bg-[#00A63E] py-2.5 rounded-full items-center"
              >
                <Text className="text-xs font-semibold text-white">💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-[#FAE2FA] rounded-[24px] p-3" style={{ borderWidth: 1, borderColor: 'rgba(211,10,215,0.30)' }}>
              <Text className="text-xs text-[#D30AD7]">Payment type: <Text className="font-bold">{type}</Text> · Amount: <Text className="font-bold">{fmt(amount)}</Text></Text>
              <Text className="text-xs text-black/50 mt-0.5">Expires at {new Date(Date.now() + 4 * 3600000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setGenerated(false)}
              className="w-full rounded-full py-2.5 items-center"
              style={{ borderWidth: 2, borderColor: '#D30AD7' }}
            >
              <Text className="text-xs font-semibold text-[#D30AD7]">Generate New Link</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
