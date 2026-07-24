import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { updateActivity, getActivity } from '../data/activityLog'

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
    <View>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        className="w-full bg-[#F0F4F7] rounded-[24px] px-3 py-2.5 flex-row items-center justify-between"
        style={{ borderWidth: 1, borderColor: open ? '#D30AD7' : 'rgba(0,0,0,0.06)' }}
      >
        <Text className={`text-sm ${value ? 'text-[rgba(0,0,0,0.9)]' : 'text-black/30'}`}>{value || 'Why is settlement needed?'}</Text>
        <Text className="text-black/30 text-xs">{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: 6, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' }}>
          {reasons.map((r, i) => (
            <TouchableOpacity
              key={r}
              onPress={() => { onChange(r); setOpen(false) }}
              className="px-4 py-3 flex-row items-center justify-between"
              style={i > 0 ? { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' } : undefined}
            >
              <Text className="text-sm text-[rgba(0,0,0,0.85)]">{r}</Text>
              {value === r && <Text className="text-[#D30AD7] font-bold">✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

function CalendarPanel({ onSelect, onClose, minDate }: {
  onSelect: (date: string) => void; onClose: () => void; minDate?: Date
}) {
  const [calMonth, setCalMonth] = useState(() => {
    const d = minDate ? new Date(minDate) : new Date()
    d.setDate(d.getDate() + 1)
    return d
  })
  return (
    <View style={{ marginTop: 8, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', padding: 12, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() - 1); setCalMonth(d) }} style={{ padding: 6 }}>
          <Text style={{ color: '#D30AD7', fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontWeight: '600', fontSize: 14, color: 'rgba(0,0,0,0.9)' }}>
          {calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() + 1); setCalMonth(d) }} style={{ padding: 6 }}>
          <Text style={{ color: '#D30AD7', fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: 'rgba(0,0,0,0.35)' }}>{d}</Text>
        ))}
      </View>
      {(() => {
        const today = new Date(); today.setHours(0,0,0,0)
        const earliest = minDate ? new Date(minDate) : today
        earliest.setHours(0,0,0,0)
        // 90-day settlement deadline minus a 7-day operational buffer
        const maxDate = new Date(today); maxDate.setDate(today.getDate() + 83)
        const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
        const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate()
        const startPad = firstDay.getDay()
        const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
        while (cells.length % 7 !== 0) cells.push(null)
        const weeks: (number | null)[][] = []
        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
        return weeks.map((week, wi) => (
          <View key={wi} style={{ flexDirection: 'row', marginBottom: 2 }}>
            {week.map((day, di) => {
              if (!day) return <View key={di} style={{ flex: 1 }} />
              const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day)
              d.setHours(0,0,0,0)
              const isDisabled = d <= earliest || d > maxDate
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              return (
                <TouchableOpacity
                  key={di}
                  disabled={isDisabled}
                  onPress={() => { onSelect(dateStr); onClose() }}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, color: isDisabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.85)' }}>{day}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        ))
      })()}
    </View>
  )
}

export default function SettlementScreen({ navigation, route }: Props) {
  const { customer: c } = route.params
  const isSlice = c?.userType === 'cc' || c?.userType === 'borrow'
  // Settlement is negotiated against the FORECLOSURE amount (full closure value), not the overdue
  const foreclosureAmount = c.foreclosure ?? c.outstandingBalance ?? c.emiOs ?? 0
  const [settAmount, setSettAmount] = useState(String(foreclosureAmount))
  const [advance, setAdvance] = useState('')
  const [settlementImage, setSettlementImage] = useState<string | null>(null)
  // cc/borrow: Payment Link only (Cash visible but disabled)
  const [mode, setMode] = useState(isSlice ? 'Payment Link' : 'Cash')
  const [installments, setInstallments] = useState(1)
  const [reason, setReason] = useState('')
  const [desc, setDesc] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [altMobile, setAltMobile] = useState('')
  const [instAmounts, setInstAmounts] = useState<number[]>([0])
  const [instDates, setInstDates] = useState<string[]>([''])
  const [openCalIdx, setOpenCalIdx] = useState<number | null>(null)
  const checkScale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (submitted) {
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start()
    }
  }, [submitted])

  const sAmount   = parseFloat(settAmount) || 0
  const advAmount = parseFloat(advance) || 0
  const remaining = sAmount - advAmount
  const instSum   = instAmounts.reduce((s, v) => s + v, 0)
  const totalCheck = advAmount + instSum
  const isBalanced = sAmount > 0 ? Math.abs(totalCheck - sAmount) < 1 : true
  const allDatesSet = instDates.slice(0, installments).every(d => d !== '')
  const withinForeclosure = sAmount <= foreclosureAmount
  const isValid = sAmount > 0 && withinForeclosure && (isSlice || (advAmount >= 0 && advAmount <= sAmount)) && reason !== '' && allDatesSet && isBalanced

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
    <View className="flex-1" style={{ backgroundColor: '#EFF1FA' }}>
      <SafeAreaView edges={['top']} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: 20, paddingBottom: 48 }}>
        <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, letterSpacing: 2, marginTop: 16 }}>RAISED SECURELY ON</Text>
        <Text style={{ color: '#D30AD7', fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 2 }}>slice</Text>

        <View style={{ backgroundColor: '#fff', borderRadius: 32, width: '100%', marginTop: 20, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(211,10,215,0.18)', shadowColor: '#D30AD7', shadowOpacity: 0.15, shadowRadius: 28, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 12, letterSpacing: 2 }}>SETTLEMENT RAISED</Text>
          <Text style={{ color: 'rgba(0,0,0,0.9)', fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 12 }}>{fmt(sAmount)}</Text>
          <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>Sent to Branch Head for approval</Text>

          <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', width: '100%', marginVertical: 18 }} />
          <View style={{ width: '100%', gap: 10 }}>
            {[
              ['Customer', c.name],
              ['Repayment Mode', mode],
              ['Reason', reason],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>{k}</Text>
                <Text style={{ color: 'rgba(0,0,0,0.85)', fontSize: 12, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{v}</Text>
              </View>
            ))}
          </View>

          {/* Agreed instalment schedule */}
          <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', width: '100%', marginVertical: 18 }} />
          <View style={{ width: '100%' }}>
            <Text style={{ color: 'rgba(0,0,0,0.45)', fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>SETTLEMENT SCHEDULE</Text>
            {instAmounts.slice(0, installments).map((amt, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: 'rgba(0,0,0,0.05)' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(0,0,0,0.5)' }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, marginLeft: 10, fontSize: 12, fontWeight: '500', color: 'rgba(0,0,0,0.8)' }}>Instalment {i + 1}</Text>
                <Text style={{ width: 86, fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>{instDates[i] ? formatDisplay(instDates[i]) : '—'}</Text>
                <Text style={{ width: 76, textAlign: 'right', fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.85)' }}>{fmt(amt)}</Text>
              </View>
            ))}
          </View>

          {advAmount > 0 && (
            <>
              <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', width: '100%', marginVertical: 18 }} />
              {/* Advance collected — same success animation theme as every payment */}
              <Animated.View
                style={{
                  transform: [{ scale: checkScale }],
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: '#22C55E',
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#22C55E', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700', lineHeight: 38 }}>✓</Text>
              </Animated.View>
              <Text style={{ color: 'rgba(0,0,0,0.9)', fontSize: 24, fontWeight: '800', marginTop: 12 }}>{fmt(advAmount)}</Text>
              <Text style={{ color: 'rgba(0,0,0,0.5)', fontSize: 13, marginTop: 2 }}>Advance collected via {mode}</Text>
              <Text style={{ color: 'rgba(0,0,0,0.4)', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 10 }}>
                Payment receipt will be sent by the bank via SMS to the registered{altMobile ? ' and alternate numbers.' : ' number.'}
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginTop: 20, width: '100%', backgroundColor: '#D30AD7', paddingVertical: 14, borderRadius: 999, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Back to Cases</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(0,0,0,0.35)', fontSize: 9, letterSpacing: 1.5 }}>POWERED BY</Text>
          <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, fontWeight: '700', marginTop: 2 }}>Slice Small Finance Bank</Text>
        </View>
      </ScrollView>
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
          <Text className="text-black/40 text-xs">{c.name} · Foreclosure: {fmt(foreclosureAmount)}</Text>
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
            <Text className="text-xs mt-1" style={{ color: withinForeclosure ? 'rgba(0,0,0,0.4)' : '#CE1D26' }}>
              {withinForeclosure
                ? `Max: ${fmt(foreclosureAmount)} (foreclosure amount)`
                : `Settlement cannot exceed the foreclosure amount ${fmt(foreclosureAmount)}`}
            </Text>
          </View>

          {/* Advance */}
          {!isSlice && (
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
              {advAmount > 0 && (
                <View className="mt-3">
                  <Text className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wider mb-1.5">
                    Alternate Number for Receipt <Text className="normal-case text-[#B45309]/60">(optional)</Text>
                  </Text>
                  <TextInput
                    keyboardType="phone-pad"
                    value={altMobile}
                    onChangeText={v => setAltMobile(v.replace(/\D/g, ''))}
                    placeholder="10-digit number to also share receipt to"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-sm"
                    style={{ borderWidth: 1, borderColor: '#FFD580' }}
                    maxLength={10}
                  />
                  <Text className="text-[10px] text-[#B45309]/70 mt-1">
                    Payment receipt for this advance will be sent to the registered number{altMobile ? ' and this number' : ''}.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Repayment Mode — Loans only. CC/Borrow have no advance payment, always Payment Link. */}
          {!isSlice && (
            <View>
              <Text className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-2">Repayment Mode *</Text>
              <View className="flex-row gap-2">
                {['Cash', 'Payment Link'].map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMode(m)}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: mode === m ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: mode === m ? '#FAE2FA' : '#fff' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: mode === m ? '600' : '400', color: mode === m ? '#A008A3' : 'rgba(0,0,0,0.7)' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

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
                        onPress={() => setOpenCalIdx(openCalIdx === i ? null : i)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: instDates[i] ? '#D30AD7' : 'rgba(0,0,0,0.10)', backgroundColor: instDates[i] ? '#FAE2FA' : '#F0F4F7', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: instDates[i] ? '#D30AD7' : 'rgba(0,0,0,0.4)' }}>
                          {instDates[i] ? formatDisplay(instDates[i]) : 'Pick date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {openCalIdx === i && (
                    <View className="px-3 pb-3">
                      <CalendarPanel
                        onClose={() => setOpenCalIdx(null)}
                        onSelect={dateStr => {
                          const updated = [...instDates]
                          updated[i] = dateStr
                          setInstDates(updated)
                        }}
                        minDate={new Date()}
                      />
                    </View>
                  )}
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
                  <Text className="text-[#00A63E] text-xs font-medium">Amounts balanced</Text>
                </View>
              )}
              {!isBalanced && sAmount > 0 && (
                <View className="bg-red-50 rounded-xl p-2 mt-1" style={{ borderWidth: 1, borderColor: '#FCA5A5' }}>
                  <Text className="text-[#EF4444] text-xs font-medium">Total ({fmt(totalCheck)}) ≠ Settlement ({fmt(sAmount)})</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => Alert.alert('Upload Settlement Form', 'Choose an option', [
            { text: 'Take Photo', onPress: () => setSettlementImage('captured') },
            { text: 'Choose from Gallery', onPress: () => setSettlementImage('gallery') },
            { text: 'Cancel', style: 'cancel' }
          ])}
          style={{ borderWidth: 1.5, borderColor: '#D30AD7', borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }}
        >
          {settlementImage ? (
            <Text style={{ color: '#D30AD7', fontWeight: '600' }}>✓ Settlement form attached</Text>
          ) : (
            <>
              <Text style={{ color: '#D30AD7', fontWeight: '600', marginTop: 4 }}>Upload Settlement Form</Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>Photo or gallery</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (!isValid) return
            // Advance is money actually collected today (Bank only) — record it like any other collection
            if (advAmount > 0) {
              const receiptId = 'MB' + Date.now().toString().slice(-8) + String(c.partyId).slice(-4)
              const todayStr = new Date().toISOString().split('T')[0]
              const existing = getActivity(c.partyId)
              updateActivity(c.partyId, {
                collections: [
                  ...(existing?.collections ?? []),
                  { date: todayStr, amount: advAmount, mode: mode as 'Cash' | 'Payment Link', receiptId, deposited: false },
                ],
              })
            }
            setSubmitted(true)
          }}
          disabled={!isValid}
          className={`w-full py-3.5 rounded-full items-center mb-6 ${isValid ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
        >
          <Text className={`text-sm font-semibold ${isValid ? 'text-white' : 'text-black/40'}`}>Submit Settlement</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
