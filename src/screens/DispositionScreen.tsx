import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { updateActivity, getActivity } from '../data/activityLog'
import { recordActualVisit } from '../data/routingEngine'
import { recordCashInhand } from '../api/allocations'
import { getToken } from '../api/client'

type Props = NativeStackScreenProps<RootStackParamList, 'Disposition'>

type ActionType = 'Collected' | 'Contacted Positive' | 'Contacted Negative' | 'Non-Contacted'

const DEFAULT_CODES: Record<string, string[]> = {
  'Collected': ['Regular Settlement', 'Rollback', 'Partial Payment', 'Foreclosure', 'New Settlement', 'Advance'],
  'Contacted Positive': ['PTP – Promise to Pay', 'CPTP – Continued Promise to Pay', 'Wants Settlement'],
  'Contacted Negative': ['BPTP – Broken Promise to Pay', 'SF – Suspected Fraud', 'RTP_I – Refuse (Intentional)', 'RTP_NC – Refuse (Nat. Calamity)', 'RTP_C – Refuse (Capacity)', 'RTP_P – Refuse (Political)'],
  'Non-Contacted': ['Out of Station (OOS)', 'Wrong Address (WR)', 'Non-Contactable (NC)', 'Shifted Permanently'],
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}
function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

const PERSON_OPTIONS = ['Self', 'Spouse', 'Parent', 'Sibling', 'Neighbor', 'Other']
const PLACE_OPTIONS = ['Home', 'Office', 'Field', 'Phone', 'Other']

function SimpleSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(o => !o)}
        style={{ borderBottomWidth: 1, borderBottomColor: open ? '#D30AD7' : 'rgba(0,0,0,0.15)', paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Text style={{ fontSize: 14, color: value ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.3)' }}>{value || placeholder}</Text>
        <Text style={{ color: open ? '#D30AD7' : 'rgba(0,0,0,0.3)', fontSize: 12 }}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginTop: 4, borderWidth: 1, borderColor: 'rgba(211,10,215,0.15)', elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={opt}
              onPress={() => { onChange(opt); setOpen(false) }}
              style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: idx < options.length - 1 ? 1 : 0, borderBottomColor: 'rgba(0,0,0,0.05)', backgroundColor: value === opt ? '#FAE2FA' : 'transparent' }}
            >
              <Text style={{ fontSize: 14, color: value === opt ? '#A008A3' : 'rgba(0,0,0,0.85)', fontWeight: value === opt ? '600' : '400' }}>{opt}</Text>
              {value === opt && <Text style={{ color: '#D30AD7', fontWeight: '700' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

export default function DispositionScreen({ navigation, route }: Props) {
  const { customer: c, fromScreen } = route.params
  const { agentInfo, triggerReroute } = useAgent()
  const [step, setStep] = useState(1)
  const [actionType, setActionType] = useState<ActionType | null>(null)
  const [code, setCode] = useState('')
  const [amount, setAmount] = useState('')
  const [payMode, setPayMode] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPlace, setContactPlace] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [altAddress, setAltAddress] = useState('')
  const [altNumber, setAltNumber] = useState('')
  const [photoCaptured, setPhotoCaptured] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [sfConfirm, setSfConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date())

  const isCollected     = actionType === 'Collected'
  const isContactedPos  = actionType === 'Contacted Positive'
  const isContactedNeg  = actionType === 'Contacted Negative'
  const isContacted     = isContactedPos || isContactedNeg
  const isNonContacted  = actionType === 'Non-Contacted'
  const isSF            = code.startsWith('SF')
  const isPTP           = code.startsWith('PTP') || code.startsWith('CPTP')

  useEffect(() => {
    if (step === 2 && isCollected) {
      if (code === 'Rollback') setAmount(String(c.rollback ?? c.rollbackAmount ?? 0))
      else if (code === 'Foreclosure') setAmount(String(c.foreclosure ?? c.outstandingBalance ?? 0))
      else if (code === 'Partial Payment') setAmount(String(c.minDue ?? c.minimumAmountDue ?? 0))
      else setAmount(String(c.overdue ?? c.emiOs ?? 0))
    }
  }, [step, isCollected, code])

  const showContactPerson  = isCollected || isContacted
  const showContactPlace   = isCollected || isContacted
  const contactNumberRequired = isContacted
  const showFollowUpDate   = isPTP
  const remarksRequired    = !isCollected

  const remarksMinChars = 15
  const remarksValid = !remarksRequired || remarks.length >= remarksMinChars

  const step1Valid = actionType !== null && code !== ''
  const step2Valid = (() => {
    if (isCollected) return amount !== '' && payMode !== '' && contactPerson !== '' && contactPlace !== ''
    if (isContacted) return contactPerson !== '' && contactPlace !== '' && contactNumber !== '' && (showFollowUpDate ? followUpDate !== '' : true)
    return true
  })()
  const step3Valid = photoCaptured && remarksValid

  function resetStep2() {
    setAmount(''); setPayMode(''); setContactPerson(''); setContactPlace(''); setContactNumber('')
    setFollowUpDate(''); setAltAddress(''); setAltNumber('')
  }

  function handleSubmit() {
    if (isSF && !sfConfirm) { setSfConfirm(true); return }

    const todayStr = new Date().toISOString().split('T')[0]
    const existing = getActivity(c.partyId)
    const newCollections = existing ? [...existing.collections] : []
    if (amount && Number(amount) > 0) {
      newCollections.push({
        date: todayStr,
        amount: Number(amount),
        mode: (payMode as any) || 'Cash',
        receiptId: 'MB' + Date.now().toString().slice(-8) + String(c.partyId).slice(-4),
        deposited: false,
      })
    }
    const newVisitHistory = [
      ...(existing?.visitHistory ?? []),
      {
        date: todayStr,
        dispositionType: `${actionType} — ${code}`,
        summary: remarks || (amount ? `Collected ₹${Number(amount).toLocaleString('en-IN')}` : contactPerson ? `Met ${contactPerson} at ${contactPlace}` : 'Visit recorded'),
      },
    ]
    updateActivity(c.partyId, {
      latestDisposition: {
        type: actionType || 'Unknown',
        code: code || '',
        date: todayStr,
        ptpDate: followUpDate || undefined,
        ptpAmount: amount ? Number(amount) : undefined,
        remarks: remarks || '',
        visitedAt: new Date().toISOString(),
      },
      collections: newCollections,
      visitHistory: newVisitHistory,
    })

    recordActualVisit(c.partyId, new Date().toISOString(), amount ? Number(amount) : 0)
    triggerReroute()

    // Record cash collected in agent_collections table
    if (amount && Number(amount) > 0 && (payMode === 'Cash' || !payMode) && getToken()) {
      const now = new Date()
      const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`
      recordCashInhand(Number(amount), monthYear).catch(() => {})
    }

    if (amount && Number(amount) > 0) {
      const receipt = {
        receiptNo: newCollections[newCollections.length - 1]?.receiptId || '',
        partyId: c.partyId,
        customerName: c.name,
        dispositionType: actionType || '',
        actionType: actionType || '',
        amount: Number(amount),
        advanceAmount: 0,
        paymentMode: payMode || 'Cash',
        agentName: agentInfo?.name || '',
        branchName: agentInfo?.branchCode || c.branch || '',
        glCode: agentInfo?.branchCode || '',
        createdAt: new Date().toISOString(),
      }
      navigation.replace('Receipt', { receipt, backTo: fromScreen || 'Main' })
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) return (
    <View className="flex-1 bg-[#F0F4F7] items-center justify-center px-6">
      <View className="bg-white rounded-[24px] p-8 items-center w-full" style={{ elevation: 2 }}>
        <View className="w-16 h-16 bg-[#E0F4E8] rounded-full items-center justify-center mx-auto mb-4">
          <Text className="text-3xl">✅</Text>
        </View>
        <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)] mb-1">Disposition Submitted</Text>
        <Text className="text-black/50 text-sm mb-4">Successfully recorded for {c.name}</Text>
        <View className="bg-[#F0F4F7] rounded-[24px] p-3 w-full mb-6 gap-1.5">
          {([
            ['Action', actionType],
            ['Code', code],
            payMode ? ['Payment Mode', payMode] : null,
            contactPerson ? ['Contact Person', contactPerson] : null,
            followUpDate ? ['Follow-up Date', followUpDate] : null,
            remarks ? ['Remarks', remarks] : null,
          ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
            <View key={k} className="flex-row justify-between">
              <Text className="text-xs text-black/50">{k}</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)] max-w-[60%] text-right">{v}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main')}
          className="w-full bg-[#D30AD7] rounded-full py-3.5 items-center"
        >
          <Text className="text-white font-medium">Back to Cases</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (sfConfirm) return (
    <View className="flex-1 bg-[#F0F4F7] items-center justify-center px-6">
      <View className="bg-white rounded-[24px] p-6 w-full" style={{ elevation: 2 }}>
        <Text className="text-[#CE1D26] text-2xl mb-3">⚠️</Text>
        <Text className="font-medium text-[rgba(0,0,0,0.9)] text-lg mb-2">Suspected Fraud — Confirm</Text>
        <Text className="text-black/50 text-sm mb-4">This will be flagged for supervisor review. Are you sure?</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={() => setSfConfirm(false)} className="flex-1 bg-[#F0F4F7] py-2.5 rounded-full items-center">
            <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setSfConfirm(false); setSubmitted(true) }} className="flex-1 bg-[#CE1D26] py-2.5 rounded-full items-center">
            <Text className="text-white font-medium text-sm">Confirm SF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      {/* Header */}
      <SafeAreaView className="bg-white" edges={['top']}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }} className="px-4 pb-4">
          <View className="flex-row items-center gap-3 mb-4">
            <TouchableOpacity
              onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}
              className="text-xl"
            >
              <Text className="text-black/70 text-xl font-medium">←</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-[rgba(0,0,0,0.9)] font-medium">{c.name}</Text>
              <Text className="text-[#CE1D26] text-xs font-medium">Overdue {fmt(c.overdue ?? c.emiOs ?? 0)}</Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text className="text-[#A008A3] font-medium text-xs">{initials(c.name)}</Text>
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
            {step === 1 ? 'Step 1 — Select Action & Code' : step === 2 ? 'Step 2 — Visit Details' : 'Step 3 — Evidence & Submit'}
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <View>
              <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-2">Action Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {([
                  { key: 'Collected',          activeBg: '#00A63E',           icon: '✓' },
                  { key: 'Contacted Positive', activeBg: '#2B6ACF',           icon: '+' },
                  { key: 'Contacted Negative', activeBg: '#A35300',           icon: '−' },
                  { key: 'Non-Contacted',      activeBg: 'rgba(0,0,0,0.6)',  icon: '?' },
                ] as const).map(a => {
                  const isActive = actionType === a.key
                  return (
                    <TouchableOpacity
                      key={a.key}
                      onPress={() => { setActionType(a.key as ActionType); setCode(''); resetStep2() }}
                      style={{
                        width: '47.5%', borderRadius: 20, padding: 16,
                        backgroundColor: isActive ? a.activeBg : 'white',
                        borderWidth: isActive ? 0 : 1, borderColor: 'rgba(0,0,0,0.10)',
                        alignItems: 'flex-start',
                      }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: isActive ? 'white' : 'rgba(0,0,0,0.5)' }}>{a.icon}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? 'white' : 'rgba(0,0,0,0.75)', lineHeight: 18 }}>{a.key}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {actionType && (
              <View className="bg-white rounded-[24px] overflow-hidden" style={{ elevation: 1 }}>
                <View className="px-4 py-2.5 flex-row items-center gap-2" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
                  <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider">Disposition Code</Text>
                  <Text className="text-[#CE1D26] text-sm font-bold">*</Text>
                </View>
                {(DEFAULT_CODES[actionType] || []).map(cd => (
                  <TouchableOpacity
                    key={cd}
                    onPress={() => setCode(cd)}
                    className={`flex-row items-center justify-between px-4 py-3.5 ${code === cd ? 'bg-[#FAE2FA]' : ''}`}
                    style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' }}
                  >
                    <Text className={`text-sm ${code === cd ? 'text-[#A008A3] font-medium' : 'text-[rgba(0,0,0,0.9)]'}`}>{cd}</Text>
                    {code === cd && <Text className="text-[#D30AD7] text-base">✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

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
              <View className="flex-row items-center gap-2 min-w-0">
                <Text className="text-[#A008A3] font-medium text-xs">{actionType}</Text>
                <Text className="text-[#D30AD7]/40 text-xs">·</Text>
                <Text className="text-[#A008A3] font-medium text-xs" numberOfLines={1}>{code}</Text>
              </View>
              <TouchableOpacity onPress={() => setStep(1)}>
                <Text className="text-black/40 text-xs">Edit</Text>
              </TouchableOpacity>
            </View>

            {isCollected && (
              <View className="bg-white rounded-[24px] p-4 gap-4" style={{ elevation: 1 }}>
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider">Payment Details</Text>
                <View className="bg-[#F0F4F7] rounded-xl px-3 py-2 flex-row gap-4">
                  <Text className="text-xs text-black/50">Overdue <Text className="font-semibold text-[#CE1D26]">{fmt(c.overdue ?? c.emiOs ?? 0)}</Text></Text>
                  <Text className="text-xs text-black/50">Rollback <Text className="font-semibold text-[#D30AD7]">{fmt(c.rollback ?? c.rollbackAmount ?? 0)}</Text></Text>
                </View>
                <View>
                  <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Amount Collected (₹) *</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    className="w-full py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
                    style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
                  />
                </View>
                <View>
                  <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-2">Payment Mode *</Text>
                  <View className="flex-row gap-2">
                    {['Cash', 'Payment Link'].map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setPayMode(m)}
                        style={{ minHeight: 48, flex: 1, borderRadius: 24, padding: 10, alignItems: 'center', backgroundColor: payMode === m ? '#FAE2FA' : '#F0F4F7', borderWidth: payMode === m ? 1 : 0, borderColor: 'rgba(211,10,215,0.20)' }}
                      >
                        <Text className="text-lg">{m === 'Cash' ? '💵' : '🔗'}</Text>
                        <Text className={`text-xs font-medium mt-1 ${payMode === m ? 'text-[#A008A3]' : 'text-black/60'}`}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {(showContactPerson || isNonContacted) && (
              <View className="bg-white rounded-[24px] p-4 gap-4" style={{ elevation: 1 }}>
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider">Contact Details</Text>
                {showContactPerson && (
                  <View>
                    <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Contact Person *</Text>
                    <SimpleSelect value={contactPerson} onChange={setContactPerson} options={PERSON_OPTIONS} placeholder="Who did you meet?" />
                  </View>
                )}
                {showContactPlace && (
                  <View>
                    <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Contact Place *</Text>
                    <SimpleSelect value={contactPlace} onChange={setContactPlace} options={PLACE_OPTIONS} placeholder="Where did you meet?" />
                  </View>
                )}
                <View>
                  <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">
                    Contact Number{contactNumberRequired ? ' *' : ' (optional)'}
                  </Text>
                  <TextInput
                    keyboardType="phone-pad"
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    placeholder={c.mobile ? `+91-${c.mobile}` : 'Enter contact number'}
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    className="w-full py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
                    style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
                  />
                </View>
                {showFollowUpDate && (
                  <View>
                    <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Follow-up Date *</Text>
                    <TouchableOpacity
                      onPress={() => setShowDateModal(true)}
                      style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)', paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 14, color: followUpDate ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.3)' }}>
                        {followUpDate || 'Select date'}
                      </Text>
                      <Text style={{ fontSize: 16 }}>🗓</Text>
                    </TouchableOpacity>
                    <Text className="text-[10px] text-black/40 mt-1">Up to 90 days from today</Text>

                    <Modal visible={showDateModal} transparent animationType="slide" onRequestClose={() => setShowDateModal(false)}>
                      <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setShowDateModal(false)}>
                        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
                          <View style={{ width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                          {/* Month nav */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() - 1); setCalMonth(d) }} style={{ padding: 8 }}>
                              <Text style={{ color: '#D30AD7', fontSize: 18 }}>‹</Text>
                            </TouchableOpacity>
                            <Text style={{ fontWeight: '600', fontSize: 15, color: 'rgba(0,0,0,0.9)' }}>
                              {calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </Text>
                            <TouchableOpacity onPress={() => { const d = new Date(calMonth); d.setMonth(d.getMonth() + 1); setCalMonth(d) }} style={{ padding: 8 }}>
                              <Text style={{ color: '#D30AD7', fontSize: 18 }}>›</Text>
                            </TouchableOpacity>
                          </View>
                          {/* Day headers */}
                          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                            {['S','M','T','W','T','F','S'].map((d, i) => (
                              <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: 'rgba(0,0,0,0.35)' }}>{d}</Text>
                            ))}
                          </View>
                          {/* Calendar grid */}
                          {(() => {
                            const today = new Date(); today.setHours(0,0,0,0)
                            const maxDate = new Date(today); maxDate.setDate(today.getDate() + 90)
                            const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1)
                            const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate()
                            const startPad = firstDay.getDay()
                            const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)]
                            while (cells.length % 7 !== 0) cells.push(null)
                            const weeks: (number | null)[][] = []
                            for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
                            return weeks.map((week, wi) => (
                              <View key={wi} style={{ flexDirection: 'row', marginBottom: 4 }}>
                                {week.map((day, di) => {
                                  if (!day) return <View key={di} style={{ flex: 1 }} />
                                  const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day)
                                  d.setHours(0,0,0,0)
                                  const isDisabled = d <= today || d > maxDate
                                  const dateStr = d.toISOString().split('T')[0]
                                  const isSelected = followUpDate === dateStr
                                  return (
                                    <TouchableOpacity
                                      key={di}
                                      disabled={isDisabled}
                                      onPress={() => { setFollowUpDate(dateStr); setShowDateModal(false) }}
                                      style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
                                    >
                                      <View style={{
                                        width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: isSelected ? '#D30AD7' : 'transparent',
                                      }}>
                                        <Text style={{ fontSize: 13, color: isSelected ? '#fff' : isDisabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.8)', fontWeight: isSelected ? '700' : '400' }}>
                                          {day}
                                        </Text>
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
                  </View>
                )}
              </View>
            )}

            <View className="flex-row gap-3 pb-4">
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
            <View className="flex-row items-center justify-between bg-[#FAE2FA] rounded-xl px-4 py-2.5">
              <Text className="text-[#A008A3] font-medium text-sm">{actionType}</Text>
              <Text className="text-black/40 text-xs">· {code}</Text>
            </View>

            <View>
              <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Visit Photo *</Text>
              <TouchableOpacity
                onPress={() => setPhotoCaptured(true)}
                style={{
                  padding: 20, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', gap: 8,
                  borderColor: photoCaptured ? '#00A63E' : 'rgba(206,29,38,0.4)',
                  backgroundColor: photoCaptured ? '#E0F4E8' : 'rgba(249,228,229,0.30)',
                }}
              >
                <Text className="text-2xl">{photoCaptured ? '✅' : '📷'}</Text>
                <Text className={`text-sm font-medium ${photoCaptured ? 'text-[#007E2F]' : 'text-[#CE1D26]'}`}>
                  {photoCaptured ? 'Photo Captured' : 'Tap to Capture Photo'}
                </Text>
                {!photoCaptured && <Text className="text-xs text-[#CE1D26]" style={{ opacity: 0.7 }}>Required for all dispositions</Text>}
              </TouchableOpacity>
            </View>

            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider">
                  Remarks{remarksRequired ? ' *' : ' (optional)'}
                </Text>
                <Text className={`text-xs font-medium ${remarksRequired ? (remarks.length >= remarksMinChars ? 'text-[#00A63E]' : 'text-[#CE1D26]') : 'text-black/40'}`}>
                  {remarks.length}/{remarksRequired ? `${remarksMinChars} min` : '200'}
                </Text>
              </View>
              <TextInput
                multiline
                numberOfLines={4}
                value={remarks}
                onChangeText={t => setRemarks(t.slice(0, 200))}
                placeholder={remarksRequired ? `Minimum ${remarksMinChars} characters required...` : 'Add any remarks (optional)...'}
                placeholderTextColor="rgba(0,0,0,0.3)"
                className="w-full py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
                style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)', textAlignVertical: 'top', minHeight: 80 }}
              />
            </View>

            {!step3Valid && (
              <View className="bg-[#FFF0E0] border border-[#A35300]/20 rounded-[24px] p-3 gap-1">
                {!photoCaptured && <Text className="text-xs text-[#A35300]">* Visit photo is required</Text>}
                {remarksRequired && remarks.length < remarksMinChars && (
                  <Text className="text-xs text-[#A35300]">* Remarks must be at least {remarksMinChars} characters</Text>
                )}
              </View>
            )}

            <View className="flex-row gap-3 pb-4">
              <TouchableOpacity onPress={() => setStep(2)} className="flex-1 bg-[#F0F4F7] py-3 rounded-full items-center">
                <Text className="text-[rgba(0,0,0,0.9)] font-medium text-sm">← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!step3Valid}
                onPress={handleSubmit}
                className={`flex-1 py-3 rounded-full items-center ${step3Valid ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
              >
                <Text className={`font-medium text-sm ${step3Valid ? 'text-white' : 'text-black/40'}`}>Submit Disposition</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}
