import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { submitSettlement } from '../api/allocations'
import { useAgent } from '../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Settlement'>

const reasons = ['Financial Hardship', 'Deceased', 'Dispute', 'Business Loss', 'Natural Calamity', 'Other']
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

function formatDisplay(str: string) {
  if (!str) return ''
  const d = new Date(str + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ReasonPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="w-full bg-[#F0F4F7] rounded-[24px] px-3 py-2.5 flex-row items-center justify-between"
        style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
      >
        <Text className={`text-sm ${value ? 'text-[rgba(0,0,0,0.9)]' : 'text-black/30'}`}>{value || 'Why is settlement needed?'}</Text>
        <Text className="text-black/30 text-xs">▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity className="flex-1 justify-end bg-black/40" activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <View className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-4" />
            {reasons.map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => { onChange(r); setOpen(false) }}
                className="py-3 flex-row items-center justify-between"
                style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}
              >
                <Text className="text-sm text-[rgba(0,0,0,0.9)]">{r}</Text>
                {value === r && <Text className="text-[#D30AD7] font-bold">✓</Text>}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

function CalendarModal({ visible, onClose, onSelect, minDate }: {
  visible: boolean; onClose: () => void; onSelect: (date: string) => void; minDate?: Date
}) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = minDate ? new Date(minDate) : new Date()
    d.setDate(d.getDate() + 1)
    return d
  })
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() - 1); setCalMonth(d) }} style={{ padding: 8 }}>
              <Text style={{ color: '#D30AD7', fontSize: 20 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '600', fontSize: 15, color: 'rgba(0,0,0,0.9)' }}>
              {calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() + 1); setCalMonth(d) }} style={{ padding: 8 }}>
              <Text style={{ color: '#D30AD7', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: 'rgba(0,0,0,0.35)' }}>{d}</Text>
            ))}
          </View>
          {(() => {
            const today = new Date(); today.setHours(0,0,0,0)
            const earliest = minDate ? new Date(minDate) : today
            earliest.setHours(0,0,0,0)
            const maxDate = new Date(today); maxDate.setDate(today.getDate() + 90)
            const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
            const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate()
            const startPad = firstDay.getDay()
            const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
            while (cells.length % 7 !== 0) cells.push(null)
            const weeks: (number | null)[][] = []
            for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
            return weeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: 'row', marginBottom: 4 }}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={{ flex: 1 }} />
                  const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day)
                  d.setHours(0,0,0,0)
                  const isDisabled = d <= earliest || d > maxDate
                  const dateStr = d.toISOString().split('T')[0]
                  return (
                    <TouchableOpacity
                      key={di}
                      disabled={isDisabled}
                      onPress={() => { onSelect(dateStr); onClose() }}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, color: isDisabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.85)', fontWeight: '400' }}>{day}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))
          })()}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

export default function SettlementScreen({ navigation, route }: Props) {
  const { customer: c } = route.params
  const { triggerReroute } = useAgent()
  const [settAmount, setSettAmount] = useState((c.emiOs ?? c.overdue ?? 0).toString())
  const [advance, setAdvance] = useState('')
  const [mode, setMode] = useState('Cash')
  const [lokAdalat, setLokAdalat] = useState(false)
  const [installments, setInstallments] = useState(1)
  const [reason, setReason] = useState('')
  const [desc, setDesc] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [instAmounts, setInstAmounts] = useState<number[]>([0])
  const [instDates, setInstDates] = useState<string[]>([''])
  const [openCalIdx, setOpenCalIdx] = useState<number | null>(null)
  const [files, setFiles] = useState<{ uri: string; name: string; type: string }[]>([])

  const pickFiles = async () => {
    try {
      // @ts-ignore — expo-image-picker only available in dev builds
      const mod = await import(/* webpackIgnore: true */ 'expo-image-picker')
      const result = await mod.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - files.length,
      })
      if (!result.canceled && result.assets) {
        const picked = result.assets.map((a: any) => ({
          uri: a.uri,
          name: a.fileName || `photo_${Date.now()}.jpg`,
          type: a.mimeType || 'image/jpeg',
        }))
        setFiles(prev => [...prev, ...picked].slice(0, 5))
      }
    } catch {
      Alert.alert('Not Available', 'File picker requires a development build.\nRun: npx expo run:android')
    }
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    try {
      const settlementPlan = Array.from({ length: installments }, (_, i) => ({
        amount: instAmounts[i] || 0,
        date: instDates[i] || '',
      }))
      const payload = {
        allocationId: c.id,
        partyId: c.partyId,
        settlementAmount: sAmount,
        advancePayment: advAmount,
        repaymentMode: mode,
        isLokAdalat: lokAdalat,
        settlementReason: reason,
        settlementDescription: desc,
        dpd: c.dpd || 0,
        assetClassification: c.assetClassification || '',
        settlementPlan,
      }
      await submitSettlement(payload, files)
      triggerReroute()
      setSubmitted(true)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit settlement')
    } finally {
      setSubmitting(false)
    }
  }

  const sAmount   = parseFloat(settAmount) || 0
  const advAmount = parseFloat(advance) || 0
  const remaining = sAmount - advAmount
  const instSum   = instAmounts.reduce((s, v) => s + v, 0)
  const totalCheck = advAmount + instSum
  const isBalanced = sAmount > 0 ? Math.abs(totalCheck - sAmount) < 1 : true
  const allDatesSet = instDates.slice(0, installments).every(d => d !== '')
  const isValid = sAmount > 0 && advAmount >= 0 && advAmount <= sAmount && reason !== '' && allDatesSet && isBalanced

  useEffect(() => {
    setInstAmounts(prev => {
      const arr = [...prev]
      while (arr.length < installments) arr.push(0)
      return arr.slice(0, installments)
    })
    setInstDates(prev => {
      const arr = [...prev]
      while (arr.length < installments) arr.push('')
      return arr.slice(0, installments)
    })
  }, [installments])

  useEffect(() => {
    const equal = remaining > 0 && installments > 0 ? Math.round(remaining / installments) : 0
    setInstAmounts(Array(installments).fill(equal))
  }, [installments, settAmount, advance])

  if (submitted) return (
    <View className="flex-1 bg-[#F0F4F7] items-center justify-center px-6">
      <Text className="text-5xl mb-4">🤝</Text>
      <Text className="text-[rgba(0,0,0,0.9)] text-xl font-bold mb-2">Settlement Raised</Text>
      <Text className="text-black/50 text-sm text-center mb-2">Sent to Branch Head for CBS review</Text>
      <View className="bg-[#FAE2FA] border border-[#D30AD7]/30 rounded-[24px] p-4 w-full mb-4 gap-1">
        <Text className="text-xs text-[#D30AD7] font-semibold mb-1">Settlement Summary</Text>
        <View className="flex-row justify-between"><Text className="text-xs text-black/50">Settlement Amount</Text><Text className="text-xs font-semibold text-[rgba(0,0,0,0.9)]">{fmt(sAmount)}</Text></View>
        {advAmount > 0 && <View className="flex-row justify-between"><Text className="text-xs text-black/50">Advance</Text><Text className="text-xs font-semibold text-[#00A63E]">{fmt(advAmount)}</Text></View>}
        <View className="flex-row justify-between"><Text className="text-xs text-black/50">Installments</Text><Text className="text-xs font-semibold text-[rgba(0,0,0,0.9)]">{installments}</Text></View>
        <View className="flex-row justify-between"><Text className="text-xs text-black/50">Mode</Text><Text className="text-xs font-semibold text-[rgba(0,0,0,0.9)]">{mode}</Text></View>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Main')} className="w-full bg-[#D30AD7] py-3.5 rounded-full items-center">
        <Text className="text-white font-semibold">Back to Allocations</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      <SafeAreaView className="bg-white" edges={['top']}>
        <View className="px-4 pb-5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-3 flex-row items-center gap-1">
            <Text className="text-[#D30AD7] text-sm">‹ Back</Text>
          </TouchableOpacity>
          <Text className="text-[rgba(0,0,0,0.9)] text-lg font-bold">Raise Settlement</Text>
          <Text className="text-black/40 text-xs">{c.name} · Overdue: {fmt(c.emiOs ?? c.overdue ?? 0)}</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        <View className="bg-white rounded-[24px] p-4 gap-4" style={{ elevation: 1 }}>
          {/* Settlement Amount */}
          <View>
            <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5">Settlement Amount (₹) *</Text>
            <TextInput
              keyboardType="numeric"
              value={settAmount}
              onChangeText={setSettAmount}
              className="w-full bg-[#F0F4F7] rounded-[24px] px-3 py-2.5 text-sm"
              style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
            />
            <Text className="text-xs text-black/40 mt-1">Max: {fmt(c.emiOs ?? c.overdue ?? 0)} (full overdue)</Text>
          </View>

          {/* Advance */}
          <View className="bg-[#FFF9F0] rounded-[24px] p-3" style={{ borderWidth: 1, borderColor: '#FFD580' }}>
            <Text className="text-xs font-semibold text-[#B45309] uppercase tracking-wider mb-1.5">Advance Payment (₹) — Paid Today</Text>
            <TextInput
              keyboardType="numeric"
              value={advance}
              onChangeText={setAdvance}
              placeholder="Upfront amount collected now"
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="w-full bg-white rounded-xl px-3 py-2.5 text-sm"
              style={{ borderWidth: 1, borderColor: '#FFD580' }}
            />
            {advAmount > 0 && <Text className="text-xs text-[#B45309] mt-1 font-medium">Remaining: {fmt(Math.max(0, sAmount - advAmount))}</Text>}
          </View>

          {/* Mode */}
          <View>
            <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-2">Repayment Mode *</Text>
            <View className="flex-row gap-2">
              {['Cash', 'Payment Link'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={{ minHeight: 40, flex: 1, borderRadius: 100, paddingVertical: 8, alignItems: 'center', backgroundColor: mode === m ? '#D30AD7' : '#F0F4F7', borderWidth: 2, borderColor: mode === m ? '#D30AD7' : 'rgba(0,0,0,0.06)' }}
                >
                  <Text style={{ color: mode === m ? 'white' : 'rgba(0,0,0,0.5)', fontSize: 11, fontWeight: '600' }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Lok Adalat toggle */}
          <View className="flex-row items-center justify-between py-2">
            <View>
              <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)]">Lok Adalat</Text>
              <Text className="text-xs text-black/40">Under Lok Adalat order?</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLokAdalat(!lokAdalat)}
              style={{ width: 48, height: 24, borderRadius: 12, backgroundColor: lokAdalat ? '#D30AD7' : '#EAEBED', justifyContent: 'center', paddingHorizontal: 2 }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', transform: [{ translateX: lokAdalat ? 24 : 0 }] }} />
            </TouchableOpacity>
          </View>

          {/* Installments */}
          <View>
            <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-2">Number of Instalments (max 3)</Text>
            <View className="flex-row gap-2">
              {[1, 2, 3].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setInstallments(n)}
                  style={{ flex: 1, minHeight: 48, borderRadius: 24, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: installments === n ? 'rgba(211,10,215,0.30)' : 'rgba(0,0,0,0.06)', backgroundColor: installments === n ? '#FAE2FA' : 'white' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: installments === n ? '#D30AD7' : 'rgba(0,0,0,0.5)' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason */}
          <View>
            <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5">Reason *</Text>
            <ReasonPicker value={reason} onChange={setReason} />
          </View>

          {/* Description */}
          <View>
            <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-1.5">Description</Text>
            <TextInput
              multiline
              numberOfLines={3}
              value={desc}
              onChangeText={setDesc}
              placeholder="Negotiation details..."
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="w-full bg-[#F0F4F7] rounded-[24px] px-3 py-2.5 text-sm"
              style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', textAlignVertical: 'top', minHeight: 80 }}
            />
          </View>
        </View>

        {/* Installment Schedule */}
        {sAmount > 0 && (
          <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 1 }}>
            <View className="px-4 py-3 bg-[#FAE2FA] flex-row items-center justify-between" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(211,10,215,0.30)' }}>
              <View>
                <Text className="text-[#D30AD7] font-bold text-sm">Instalment Schedule</Text>
                <Text className="text-black/50 text-xs">{installments} instalment{installments > 1 ? 's' : ''} · {fmt(Math.round(remaining))} to split</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const equal = remaining > 0 ? Math.round(remaining / installments) : 0
                  setInstAmounts(Array(installments).fill(equal))
                }}
                className="bg-[#D30AD7] px-3 py-1.5 rounded-full"
              >
                <Text className="text-white text-xs font-semibold">Split equally</Text>
              </TouchableOpacity>
            </View>

            <View className="px-4 pb-3 gap-3 mt-2">
              {Array.from({ length: installments }, (_, i) => (
                <View key={i} style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', borderRadius: 24, overflow: 'hidden' }}>
                  <View className="flex-row items-center justify-between px-3 py-2 bg-[#F0F4F7]">
                    <Text className="text-xs font-bold text-[#D30AD7]">Instalment {i + 1}</Text>
                    <View className={`px-2 py-0.5 rounded-full ${instDates[i] ? 'bg-green-100' : 'bg-amber-100'}`}>
                      <Text className={`text-[10px] font-medium ${instDates[i] ? 'text-green-700' : 'text-amber-700'}`}>
                        {instDates[i] ? formatDisplay(instDates[i]) : 'Date not set'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 px-3 py-2.5">
                    <View className="flex-1">
                      <Text className="text-[10px] text-black/40 mb-1">Amount (₹)</Text>
                      <TextInput
                        keyboardType="numeric"
                        value={instAmounts[i] ? String(instAmounts[i]) : ''}
                        onChangeText={v => {
                          const updated = [...instAmounts]
                          updated[i] = parseFloat(v) || 0
                          setInstAmounts(updated)
                        }}
                        className="w-full bg-[#F0F4F7] rounded-xl px-3 py-2 text-sm font-semibold text-[rgba(0,0,0,0.9)]"
                        style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
                      />
                    </View>
                    <View className="pt-4">
                      <TouchableOpacity
                        onPress={() => setOpenCalIdx(i)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: instDates[i] ? '#D30AD7' : 'rgba(0,0,0,0.10)', backgroundColor: instDates[i] ? '#FAE2FA' : '#F0F4F7', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: instDates[i] ? '#D30AD7' : 'rgba(0,0,0,0.4)' }}>
                          {instDates[i] ? formatDisplay(instDates[i]) : 'Pick date'}
                        </Text>
                        <Text style={{ fontSize: 13 }}>🗓</Text>
                      </TouchableOpacity>
                      <CalendarModal
                        visible={openCalIdx === i}
                        onClose={() => setOpenCalIdx(null)}
                        onSelect={dateStr => {
                          const updated = [...instDates]
                          updated[i] = dateStr
                          setInstDates(updated)
                        }}
                        minDate={new Date()}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View className="px-4 py-3 gap-1.5" style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
              {advAmount > 0 && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-[#B45309]">Advance (today)</Text>
                  <Text className="text-xs font-semibold text-[#B45309]">{fmt(advAmount)}</Text>
                </View>
              )}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-black/50">Instalments Total</Text>
                <Text className="text-xs font-bold text-[rgba(0,0,0,0.9)]">{fmt(instSum)}</Text>
              </View>
              <View className="flex-row items-center justify-between pt-1.5" style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
                <Text className="text-xs font-semibold text-black/50">Grand Total</Text>
                <Text className={`text-sm font-bold ${isBalanced ? 'text-[#00A63E]' : 'text-[#EF4444]'}`}>{fmt(totalCheck)}</Text>
              </View>
              {isBalanced && sAmount > 0 && (
                <View className="bg-green-50 rounded-xl p-2 mt-1" style={{ borderWidth: 1, borderColor: '#86EFAC' }}>
                  <Text className="text-[#00A63E] text-xs font-medium">✅ Amounts balanced</Text>
                </View>
              )}
              {!isBalanced && sAmount > 0 && (
                <View className="bg-red-50 rounded-xl p-2 mt-1" style={{ borderWidth: 1, borderColor: '#FCA5A5' }}>
                  <Text className="text-[#EF4444] text-xs font-medium">❌ Total ({fmt(totalCheck)}) ≠ Settlement ({fmt(sAmount)})</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* File Upload */}
        <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
          <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-3">Supporting Documents</Text>
          <Text className="text-xs text-black/40 mb-3">Upload proof (images or PDFs) — max 5 files</Text>

          {files.length > 0 && (
            <View className="gap-2 mb-3">
              {files.map((f, i) => (
                <View key={i} className="flex-row items-center justify-between bg-[#F0F4F7] rounded-xl px-3 py-2" style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
                  <View className="flex-1 mr-2">
                    <Text className="text-xs text-[rgba(0,0,0,0.9)] font-medium" numberOfLines={1}>{f.name}</Text>
                    <Text className="text-[10px] text-black/40">{f.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFile(i)} className="w-6 h-6 rounded-full bg-red-100 items-center justify-center">
                    <Text className="text-red-500 text-xs font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {files.length < 5 && (
            <TouchableOpacity
              onPress={pickFiles}
              className="border-2 border-dashed border-[#D30AD7]/30 rounded-[18px] py-4 items-center"
              style={{ backgroundColor: '#FAE2FA20' }}
            >
              <Text className="text-[#D30AD7] text-2xl mb-1">+</Text>
              <Text className="text-[#D30AD7] text-xs font-semibold">Pick Files</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || submitting}
          className={`w-full py-3.5 rounded-full items-center mb-6 ${isValid && !submitting ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className={`text-sm font-semibold ${isValid ? 'text-white' : 'text-black/40'}`}>Submit Settlement</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
