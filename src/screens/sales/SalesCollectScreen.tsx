import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/types'
import { useAgent } from '../../navigation/AgentContext'
import { updateSalesActivity, getSalesActivity } from '../../data/salesActivityLog'
import { recordSalesVisit } from '../../data/salesRoutingEngine'
import type { SalesReceiptData } from '../../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'SalesCollect'>

const noteValues = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1]
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

type ContactPersonType = 'Self' | 'Owner' | 'Staff' | 'Other'
const CONTACT_OPTIONS: ContactPersonType[] = ['Self', 'Owner', 'Staff', 'Other']

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}

export default function SalesCollectScreen({ navigation, route }: Props) {
  const { merchant: m } = route.params
  const { agentInfo } = useAgent()

  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState(String(m.pendingAmount))
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [denomOpen, setDenomOpen] = useState(false)
  const [contactPerson, setContactPerson] = useState<ContactPersonType | ''>('')
  const [gpsCaptured, setGpsCaptured] = useState(false)
  const [photoCaptured, setPhotoCaptured] = useState(false)
  const [remarks, setRemarks] = useState('')

  const denomTotal = noteValues.reduce((s, n) => s + n * (counts[n] || 0), 0)
  const amountNum = Number(amount)

  const step1Valid = amountNum > 0
  const step2Valid = contactPerson !== '' && gpsCaptured
  const step3Valid = photoCaptured

  function buildNoteString(): string {
    const parts: string[] = []
    for (const note of noteValues) {
      if ((counts[note] || 0) > 0) {
        parts.push(`${counts[note]}x${fmt(note)}`)
      }
    }
    return parts.join(', ') || `${fmt(amountNum)} cash`
  }

  function handleSubmit() {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const collectionId = 'CC-' + Date.now().toString().slice(-8)

    const existing = getSalesActivity(m.merchantId)
    const newCollection = {
      collectionId,
      merchantId: m.merchantId,
      date: todayStr,
      amount: amountNum,
      notes: buildNoteString(),
      deposited: false,
      agentId: agentInfo?.username ?? 'Gakul_Khanikar',
    }

    updateSalesActivity(m.merchantId, {
      collections: [...(existing?.collections ?? []), newCollection],
      lastVisitDate: todayStr,
      lastVisitResult: 'Collected',
    })

    recordSalesVisit(m.merchantId, now.toISOString(), amountNum)

    const receipt: SalesReceiptData = {
      receiptNo: collectionId,
      merchantId: m.merchantId,
      businessName: m.businessName,
      ownerName: m.ownerName,
      casaAccountNo: m.casaAccountNo,
      amount: amountNum,
      notes: buildNoteString(),
      agentName: agentInfo?.name ?? '',
      branchName: agentInfo?.branch ?? m.branch,
      createdAt: now.toISOString(),
    }

    navigation.replace('SalesReceipt', { receipt, backTo: 'SalesMain' })
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      <SafeAreaView className="bg-white" edges={['top']}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }} className="px-4 pb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <TouchableOpacity
              onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}
            >
              <Text className="text-black/70 text-xl font-medium">←</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-[rgba(0,0,0,0.9)] font-medium" numberOfLines={1}>{m.businessName}</Text>
              <Text className="text-[#00A63E] text-xs font-medium">Pending {fmt(m.pendingAmount)}</Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text className="text-[#A008A3] font-medium text-xs">{initials(m.ownerName)}</Text>
            </View>
          </View>
          {/* Step indicator */}
          <View className="flex-row items-center gap-2">
            {[1, 2, 3].map(s => (
              <View key={s} className="flex-row items-center gap-2 flex-1">
                <View className={`w-6 h-6 rounded-full items-center justify-center ${step >= s ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}>
                  <Text className={`text-xs font-medium ${step >= s ? 'text-white' : 'text-black/40'}`}>{s}</Text>
                </View>
                {s < 3 && <View className={`h-0.5 flex-1 ${step > s ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`} />}
              </View>
            ))}
          </View>
          <Text className="text-black/40 text-xs mt-1">
            {step === 1 ? 'Step 1 — Amount & Denominations' : step === 2 ? 'Step 2 — Visit Details' : 'Step 3 — Summary & Submit'}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1, gap: 16 }}>
              <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider">Cash Amount (₹)</Text>
              <TextInput
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount collected"
                placeholderTextColor="rgba(0,0,0,0.3)"
                className="w-full py-2.5 text-lg font-medium text-[rgba(0,0,0,0.9)]"
                style={{ borderBottomWidth: 2, borderBottomColor: amountNum > 0 ? '#D30AD7' : 'rgba(0,0,0,0.15)' }}
              />

              {/* Note denomination */}
              <TouchableOpacity
                onPress={() => setDenomOpen(o => !o)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: denomOpen ? '#D30AD7' : 'rgba(0,0,0,0.10)' }}
              >
                <View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Note Breakdown</Text>
                  {denomTotal > 0 && (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: denomTotal === amountNum ? '#00A63E' : '#CE1D26', marginTop: 2 }}>
                      {fmt(denomTotal)} {denomTotal === amountNum ? '✓ Matches' : `≠ Expected ${fmt(amountNum)}`}
                    </Text>
                  )}
                </View>
                <Text style={{ color: denomOpen ? '#D30AD7' : 'rgba(0,0,0,0.3)', fontSize: 13 }}>{denomOpen ? '▴' : '▾'}</Text>
              </TouchableOpacity>

              {denomOpen && (
                <View style={{ backgroundColor: '#F0F4F7', borderRadius: 20, padding: 12 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {noteValues.map(note => {
                      const count = counts[note] || 0
                      const active = count > 0
                      return (
                        <View key={note} style={{
                          width: '30.5%', backgroundColor: active ? '#FAE2FA' : '#fff',
                          borderRadius: 16, borderWidth: 1.5,
                          borderColor: active ? 'rgba(211,10,215,0.30)' : 'rgba(0,0,0,0.08)',
                          padding: 10, alignItems: 'center', gap: 6,
                        }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#A008A3' : 'rgba(0,0,0,0.55)' }}>{fmt(note)}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => setCounts(prev => ({ ...prev, [note]: Math.max(0, (prev[note] || 0) - 1) }))}
                              style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: active ? '#D30AD7' : '#EAEBED', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ color: active ? '#fff' : 'rgba(0,0,0,0.3)', fontSize: 18, lineHeight: 22, fontWeight: '700' }}>−</Text>
                            </TouchableOpacity>
                            <Text style={{ minWidth: 18, textAlign: 'center', fontSize: 15, fontWeight: '800', color: active ? '#D30AD7' : 'rgba(0,0,0,0.35)' }}>{count}</Text>
                            <TouchableOpacity
                              onPress={() => setCounts(prev => ({ ...prev, [note]: (prev[note] || 0) + 1 }))}
                              style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#D30AD7', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ color: '#fff', fontSize: 18, lineHeight: 22, fontWeight: '700' }}>+</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: active ? '#A008A3' : 'rgba(0,0,0,0.25)' }}>
                            {active ? fmt(count * note) : '—'}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10 }}>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.7)' }}>Total Counted</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: denomTotal === amountNum ? '#00A63E' : denomTotal > 0 ? '#CE1D26' : 'rgba(0,0,0,0.4)' }}>
                      {fmt(denomTotal)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              disabled={!step1Valid}
              onPress={() => setStep(2)}
              className={`w-full py-3.5 rounded-full items-center ${step1Valid ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
            >
              <Text className={`font-medium text-sm ${step1Valid ? 'text-white' : 'text-black/40'}`}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <View className="flex-row items-center justify-between bg-[#FAE2FA] rounded-xl px-3.5 py-2">
              <Text className="text-[#A008A3] font-medium text-sm">Cash · {fmt(amountNum)}</Text>
              <TouchableOpacity onPress={() => setStep(1)}>
                <Text className="text-black/40 text-xs">Edit</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1, gap: 14 }}>
              <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider">Contact Person</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CONTACT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setContactPerson(opt)}
                    style={{
                      paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
                      backgroundColor: contactPerson === opt ? '#FAE2FA' : '#F0F4F7',
                      borderWidth: contactPerson === opt ? 1 : 0,
                      borderColor: contactPerson === opt ? 'rgba(211,10,215,0.25)' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: contactPerson === opt ? '600' : '400', color: contactPerson === opt ? '#A008A3' : 'rgba(0,0,0,0.6)' }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }} />

              {/* GPS */}
              <TouchableOpacity
                onPress={() => setGpsCaptured(true)}
                style={{
                  padding: 16, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', gap: 6,
                  borderColor: gpsCaptured ? '#00A63E' : 'rgba(0,0,0,0.20)',
                  backgroundColor: gpsCaptured ? '#E0F4E8' : '#F0F4F7',
                }}
              >
                <Text style={{ fontSize: 20 }}>{gpsCaptured ? '✅' : '📍'}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: gpsCaptured ? '#007E2F' : 'rgba(0,0,0,0.5)' }}>
                  {gpsCaptured ? 'GPS Captured' : 'Capture GPS Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setStep(1)} className="flex-1 bg-[#F0F4F7] py-3 rounded-full items-center">
                <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!step2Valid}
                onPress={() => setStep(3)}
                className={`flex-1 py-3 rounded-full items-center ${step2Valid ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
              >
                <Text className={`font-medium text-sm ${step2Valid ? 'text-white' : 'text-black/40'}`}>Next →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            {/* Summary */}
            <View className="bg-white rounded-[24px] px-5 py-4" style={{ elevation: 1 }}>
              <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-3">Collection Summary</Text>
              <View className="gap-2.5">
                {[
                  ['Merchant', m.businessName],
                  ['CASA Account', 'XXXXXX' + m.casaAccountNo.slice(-4)],
                  ['Amount', fmt(amountNum)],
                  ['Note Breakdown', buildNoteString()],
                  ['Contact Person', contactPerson],
                  ['GPS', gpsCaptured ? 'Captured' : 'Not captured'],
                ].map(([k, v]) => (
                  <View key={k} className="flex-row justify-between">
                    <Text className="text-xs text-black/50">{k}</Text>
                    <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)] text-right max-w-[60%]">{v}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Photo proof */}
            <TouchableOpacity
              onPress={() => setPhotoCaptured(true)}
              style={{
                padding: 20, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', gap: 8,
                borderColor: photoCaptured ? '#00A63E' : 'rgba(206,29,38,0.4)',
                backgroundColor: photoCaptured ? '#E0F4E8' : 'rgba(249,228,229,0.30)',
              }}
            >
              <Text style={{ fontSize: 24 }}>{photoCaptured ? '✅' : '📷'}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: photoCaptured ? '#007E2F' : '#CE1D26' }}>
                {photoCaptured ? 'Photo Captured' : 'Capture Visit Photo *'}
              </Text>
            </TouchableOpacity>

            {/* Remarks */}
            <View>
              <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Remarks (optional)</Text>
              <TextInput
                multiline
                numberOfLines={3}
                value={remarks}
                onChangeText={t => setRemarks(t.slice(0, 200))}
                placeholder="Add any notes..."
                placeholderTextColor="rgba(0,0,0,0.3)"
                className="w-full py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
                style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)', textAlignVertical: 'top', minHeight: 64 }}
              />
            </View>

            <View className="flex-row gap-3 pb-4">
              <TouchableOpacity onPress={() => setStep(2)} className="flex-1 bg-[#F0F4F7] py-3 rounded-full items-center">
                <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!step3Valid}
                onPress={handleSubmit}
                className={`flex-1 py-3 rounded-full items-center ${step3Valid ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
              >
                <Text className={`font-medium text-sm ${step3Valid ? 'text-white' : 'text-black/40'}`}>Submit Collection</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}
