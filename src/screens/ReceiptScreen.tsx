import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Linking, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Receipt'>

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

// UI-layer confirmation only — the actual receipt is generated on the backend and
// SMS-triggered to the customer's registered + alternate numbers. This screen is
// a GPay-style success animation the agent can screenshot and share.
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
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const registeredMobile = (receipt.customerMobile || '').replace(/\D/g, '')
  const altMobile = (receipt.alternateMobile || '').replace(/\D/g, '')

  function shareWhatsApp() {
    const text = `slice — Collection Confirmation\nCustomer: ${receipt.customerName}\nCIF: ${receipt.partyId}\nAmount: ${fmt(receipt.amount)}\nMode: ${receipt.paymentMode}\nBranch: ${receipt.branchName}\nDate: ${dateStr} ${timeStr}\nCollected by: ${receipt.agentName || agentInfo?.name || ''}`
    const target = registeredMobile ? `91${registeredMobile.slice(-10)}` : ''
    Linking.openURL(`https://wa.me/${target}?text=${encodeURIComponent(text)}`)
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#0E1B12' }}>
      <SafeAreaView edges={['top']} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: 24, paddingBottom: 48 }}>

        {/* Animated success check */}
        <Animated.View
          style={{
            transform: [{ scale: checkScale }],
            width: 96, height: 96, borderRadius: 48,
            backgroundColor: '#00A63E',
            alignItems: 'center', justifyContent: 'center',
            marginTop: 36, marginBottom: 20,
            shadowColor: '#00A63E', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
            elevation: 12,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 48, fontWeight: '700', lineHeight: 56 }}>✓</Text>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentSlide }], width: '100%', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>Collection Successful</Text>
          <Text style={{ color: '#fff', fontSize: 44, fontWeight: '700', marginTop: 6 }}>{fmt(receipt.amount)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 }}>{dateStr} · {timeStr}</Text>

          {/* Details card */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 18, width: '100%', marginTop: 28, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            {[
              ['Customer', receipt.customerName],
              ['CIF', String(receipt.partyId)],
              ['Payment Mode', receipt.paymentMode],
              ['Branch', receipt.branchName],
              ['Collected By', receipt.agentName || agentInfo?.name || '—'],
            ].map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{label}</Text>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Backend receipt note */}
          <View style={{ backgroundColor: 'rgba(0,166,62,0.12)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginTop: 14, width: '100%' }}>
            <Text style={{ color: '#7BE3A0', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
              Payment receipt is generated by the bank and sent via SMS to the registered
              {altMobile ? ' and alternate numbers.' : ' number.'}
            </Text>
          </View>

          {/* Share block */}
          <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
            {altMobile ? (
              <TouchableOpacity
                onPress={() => setShareAlternate(v => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: shareAlternate ? '#25D366' : 'rgba(255,255,255,0.3)', backgroundColor: shareAlternate ? '#25D366' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {shareAlternate && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Also send screenshot to alternate number ({altMobile})</Text>
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
              style={{ borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* slice branding */}
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={{ color: '#D30AD7', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>slice</Text>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>Slice Small Finance Bank</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  )
}
