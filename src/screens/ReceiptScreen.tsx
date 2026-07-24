import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Linking, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Receipt'>

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

// UI-layer confirmation only — the actual receipt is generated on the backend and
// SMS-triggered to the customer's registered + alternate numbers. This screen follows
// the slice payment-success design language: light canvas, white card, green check.
export default function ReceiptScreen({ navigation, route }: Props) {
  const { receipt } = route.params
  const { agentInfo } = useAgent()

  const checkScale = useRef(new Animated.Value(0)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentSlide = useRef(new Animated.Value(24)).current
  const [shareAlternate, setShareAlternate] = useState(true)

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

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
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ (\d{2})$/, " '$1")
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toLowerCase()
  const registeredMobile = (receipt.customerMobile || '').replace(/\D/g, '')
  const altMobile = (receipt.alternateMobile || '').replace(/\D/g, '')

  function shareWhatsApp() {
    const text = `slice — Collection Confirmation\nCustomer: ${receipt.customerName}\nCIF: ${receipt.partyId}\nAmount: ${fmt(receipt.amount)}\nMode: ${receipt.paymentMode}\nBranch: ${receipt.branchName}\nDate: ${dateStr}, ${timeStr}\nCollected by: ${receipt.agentName || agentInfo?.name || ''}`
    const target = registeredMobile ? `91${registeredMobile.slice(-10)}` : ''
    Linking.openURL(`https://wa.me/${target}?text=${encodeURIComponent(text)}`)
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#EFF1FA' }}>
      <SafeAreaView edges={['top']} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: 20, paddingBottom: 48 }}>

        {/* Header — collected securely on slice */}
        <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, letterSpacing: 2, marginTop: 20 }}>COLLECTED SECURELY ON</Text>
        <Text style={{ color: '#D30AD7', fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 2 }}>slice</Text>

        {/* White card with soft purple halo */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 32,
            width: '100%',
            marginTop: 24,
            paddingVertical: 32,
            paddingHorizontal: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(211,10,215,0.18)',
            shadowColor: '#D30AD7',
            shadowOpacity: 0.15,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 13, letterSpacing: 2 }}>COLLECTION SUCCESSFUL</Text>

          {/* Animated green check */}
          <Animated.View
            style={{
              transform: [{ scale: checkScale }],
              width: 84, height: 84, borderRadius: 42,
              backgroundColor: '#22C55E',
              alignItems: 'center', justifyContent: 'center',
              marginTop: 24, marginBottom: 24,
              shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 42, fontWeight: '700', lineHeight: 50 }}>✓</Text>
          </Animated.View>

          <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentSlide }], width: '100%', alignItems: 'center' }}>
            {/* Amount hero */}
            <Text style={{ color: 'rgba(0,0,0,0.9)', fontSize: 52, fontWeight: '800', letterSpacing: -1 }}>{fmt(receipt.amount)}</Text>

            {/* From customer */}
            <Text style={{ color: 'rgba(0,0,0,0.85)', fontSize: 22, fontWeight: '700', marginTop: 14 }}>From {receipt.customerName}</Text>
            <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 14, marginTop: 4 }}>CIF: {receipt.partyId}</Text>

            <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 14, marginTop: 14 }}>{dateStr}, {timeStr}</Text>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', width: '100%', marginVertical: 22 }} />

            {/* Mode + branch + agent */}
            <Text style={{ color: 'rgba(0,0,0,0.85)', fontSize: 20, fontWeight: '700' }}>Via {receipt.paymentMode}</Text>
            <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 13, marginTop: 4 }}>{receipt.branchName} Branch</Text>

            <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 12, marginTop: 18 }}>Collected by {receipt.agentName || agentInfo?.name || '—'}</Text>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentSlide }], width: '100%', alignItems: 'center' }}>
          {/* Backend receipt note */}
          <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 16, paddingHorizontal: 12 }}>
            Payment receipt is generated by the bank and sent via SMS to the registered
            {altMobile ? ' and alternate numbers.' : ' number.'}
          </Text>

          {/* Share block */}
          <View style={{ width: '100%', marginTop: 18, gap: 10 }}>
            {altMobile ? (
              <TouchableOpacity
                onPress={() => setShareAlternate(v => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: shareAlternate ? '#D30AD7' : 'rgba(0,0,0,0.25)', backgroundColor: shareAlternate ? '#D30AD7' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {shareAlternate && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
                </View>
                <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12 }}>Also send screenshot to alternate number ({altMobile})</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={shareWhatsApp}
              style={{ backgroundColor: '#25D366', borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Share Screenshot on WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', backgroundColor: '#fff' }}
            >
              <Text style={{ color: 'rgba(0,0,0,0.7)', fontSize: 14, fontWeight: '500' }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Footer branding */}
          <View style={{ marginTop: 28, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(0,0,0,0.35)', fontSize: 9, letterSpacing: 1.5 }}>POWERED BY</Text>
            <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, fontWeight: '700', marginTop: 2 }}>Slice Small Finance Bank</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
