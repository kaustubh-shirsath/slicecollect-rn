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
import { getBorrowData } from '../data/emis'
import { getCCBill } from '../data/ccBills'
import { submitWaiverRequest } from '../data/waiverRequests'

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

// ─── Slice Disposition Flow (CC + Borrow) ────────────────────────────────────

type SliceActionType = 'Collected' | 'PTP' | 'Broken PTP' | 'Not Contactable' | 'Not Reachable' | 'Dispute'
type PostSubmitState = 'payment_sent' | 'payment_received' | 'waiver_submitted' | 'success'

const SLICE_ACTION_TILES: { label: SliceActionType; icon: string; color: string; bg: string }[] = [
  { label: 'Collected',        icon: '✓',  color: '#166534', bg: '#F0FDF4' },
  { label: 'PTP',              icon: '📅', color: '#1D4ED8', bg: '#EFF6FF' },
  { label: 'Broken PTP',       icon: '⚡', color: '#92400E', bg: '#FFF7ED' },
  { label: 'Not Contactable',  icon: '📵', color: '#374151', bg: '#F3F4F6' },
  { label: 'Not Reachable',    icon: '📍', color: '#374151', bg: '#F3F4F6' },
  { label: 'Dispute',          icon: '⚠',  color: '#991B1B', bg: '#FEF2F2' },
]

const CC_PAYMENT_TYPES = ['Min Due', 'Pay Overdue', 'Full Outstanding', 'Custom Amount'] as const
const BORROW_PAYMENT_TYPES = ['Min Due', 'Pay Overdue', 'Overdue EMIs', 'Foreclose', 'Full Outstanding', 'Custom Amount'] as const

function fmt2(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN') }

function SliceDispositionScreen({ navigation, route }: Props) {
  const { customer: c } = route.params
  const { agentInfo, triggerReroute } = useAgent()
  const isCC = c.userType === 'cc'
  const borrowData = !isCC ? getBorrowData(c.partyId) : undefined
  const ccBill = isCC ? getCCBill(c.partyId) : undefined

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [postSubmit, setPostSubmit] = useState<PostSubmitState | null>(null)
  const [repaymentId] = useState(() => 'RPY' + String(Date.now()).slice(-10))

  // Step 1
  const [sliceAction, setSliceAction] = useState<SliceActionType | null>(null)

  // Step 2 — Collected
  const [paymentType, setPaymentType] = useState('')
  const [selectedEmiNos, setSelectedEmiNos] = useState<number[]>([])
  const [customAmount, setCustomAmount] = useState('')
  const [waiverPct, setWaiverPct] = useState(0)
  const [sliderWidth, setSliderWidth] = useState(0)

  // Step 2 — PTP
  const [ptpDate, setPtpDate] = useState('')
  const [ptpAmount, setPtpAmount] = useState('')

  // Step 3 — contact (all types)
  const [visitedAddress, setVisitedAddress] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPlace, setContactPlace] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [remarks, setRemarks] = useState('')
  const [photoCaptured, setPhotoCaptured] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const isCollected = sliceAction === 'Collected'
  const isPTP = sliceAction === 'PTP'
  const isBrokenPTP = sliceAction === 'Broken PTP'
  const isDispute = sliceAction === 'Dispute'
  const isNotReachable = sliceAction === 'Not Reachable'
  const isNotContactable = sliceAction === 'Not Contactable'
  const paymentTypes = isCC ? CC_PAYMENT_TYPES : BORROW_PAYMENT_TYPES

  // Contact field matrix (strict bank rules)
  // Collected: person=REQ, place=REQ, number=OPT
  // PTP: person=REQ, place=REQ, number=REQ
  // Broken PTP: person=REQ, place=REQ, number=REQ
  // Dispute: person=REQ, place=REQ, number=REQ
  // Not Contactable: person=HIDDEN, place=HIDDEN, number=OPT
  // Not Reachable: person=HIDDEN, place=HIDDEN, number=HIDDEN
  const requireContactPerson  = isCollected || isPTP || isBrokenPTP || isDispute
  const requireContactPlace   = isCollected || isPTP || isBrokenPTP || isDispute
  const requireContactNumber  = isPTP || isBrokenPTP || isDispute
  const showContactPerson     = requireContactPerson  // hidden for Not Contactable & Not Reachable
  const showContactPlace      = requireContactPlace
  const showContactNumber     = !isNotReachable
  const showContactSection    = !isNotReachable && !(isNotContactable)
    ? true
    : isNotContactable  // show number (optional) but hide person/place
  const remarksRequired       = sliceAction !== 'Collected'

  // Amount calculations
  const selectedEmis = (borrowData?.emis ?? []).filter(e => selectedEmiNos.includes(e.emiNo))
  const selectedPos = selectedEmis.reduce((s, e) => s + e.pos, 0)
  const selectedInterest = selectedEmis.reduce((s, e) => s + e.interest, 0)
  const selectedPenalty = selectedEmis.reduce((s, e) => s + e.penalty, 0)
  const waiverableBase = isCC
    ? (ccBill ? ccBill.remainingLatePenalty + ccBill.remainingLateFees : 0)
    : selectedInterest + selectedPenalty
  const waiverAmount = Math.round(waiverableBase * waiverPct / 100)

  function getGrossAmount(): number {
    if (!isCC) {
      if (paymentType === 'Min Due') return borrowData?.minDueAmount ?? 0
      if (paymentType === 'Pay Overdue') return borrowData?.totalOverdue ?? 0
      if (paymentType === 'Overdue EMIs') return selectedPos + selectedInterest + selectedPenalty
      if (paymentType === 'Foreclose') return borrowData?.foreclosureAmount ?? 0
      if (paymentType === 'Full Outstanding') return borrowData?.currentPos ?? 0
      if (paymentType === 'Custom Amount') return Number(customAmount) || 0
    } else {
      if (paymentType === 'Min Due') return ccBill?.minDueAmount ?? 0
      if (paymentType === 'Pay Overdue') return ccBill?.remainingBillAmount ?? 0
      if (paymentType === 'Full Outstanding') return ccBill?.billAmount ?? 0
      if (paymentType === 'Custom Amount') return Number(customAmount) || 0
    }
    return 0
  }
  const grossAmount = getGrossAmount()
  const netCollectible = Math.max(0, grossAmount - waiverAmount)

  // Validation per step
  const step1Valid = sliceAction !== null
  const step2Valid = (() => {
    if (isCollected) {
      if (!paymentType) return false
      if (paymentType === 'Overdue EMIs' && selectedEmiNos.length === 0) return false
      if (paymentType === 'Custom Amount' && !customAmount) return false
    }
    if (isPTP && !ptpDate) return false
    return true
  })()
  const step3Valid = (() => {
    if (requireContactPerson && !contactPerson) return false
    if (requireContactPlace && !contactPlace) return false
    if (requireContactNumber && contactNumber.length !== 10) return false
    if (!photoCaptured) return false
    if (remarksRequired && remarks.length < 15) return false
    return true
  })()

  function toggleEmi(emiNo: number) {
    setSelectedEmiNos(prev => prev.includes(emiNo) ? prev.filter(n => n !== emiNo) : [...prev, emiNo])
  }

  function handleSubmit() {
    setSubmitAttempted(true)
    if (!step3Valid) return
    const todayStr = new Date().toISOString().split('T')[0]
    const existing = getActivity(c.partyId)
    const newVisitHistory = [
      ...(existing?.visitHistory ?? []),
      {
        date: todayStr,
        dispositionType: `${sliceAction}${paymentType ? ` — ${paymentType}` : ''}`,
        summary: remarks || (isCollected ? `Net collectible: ${fmt2(netCollectible)}` : `${sliceAction} recorded`),
        amount: isCollected ? netCollectible : 0,
        contactPerson, contactPlace,
        ptpDate: isPTP ? ptpDate : undefined,
        waiverPct: waiverPct > 0 ? waiverPct : undefined,
        waiverAmount: waiverAmount > 0 ? waiverAmount : undefined,
        paymentStatus: isCollected ? 'awaiting_payment' : undefined,
      },
    ]
    updateActivity(c.partyId, {
      latestDisposition: {
        type: sliceAction || 'Unknown',
        code: paymentType || sliceAction || '',
        date: todayStr,
        ptpDate: ptpDate || undefined,
        ptpAmount: isCollected ? netCollectible : undefined,
        remarks: remarks || '',
        visitedAt: new Date().toISOString(),
      },
      visitHistory: newVisitHistory,
      collections: existing?.collections ?? [],
    })
    recordActualVisit(c.partyId, new Date().toISOString(), 0)
    triggerReroute()

    if (isCollected && waiverPct > 0) {
      submitWaiverRequest({
        partyId: c.partyId,
        agentUsername: agentInfo?.username ?? '',
        userType: c.userType as 'borrow' | 'cc',
        paymentType,
        selectedEmis: selectedEmis.map(e => ({ emiNo: e.emiNo, pos: e.pos, interest: e.interest, penalty: e.penalty })),
        waiverPct,
        waiverableBase,
        waiverAmount,
        grossAmount,
        netCollectible,
        dispositionType: sliceAction || '',
        remarks,
      })
      setPostSubmit('waiver_submitted')
      return
    }

    if (isCollected && waiverPct === 0) {
      setPostSubmit('payment_sent')
      return
    }

    setPostSubmit('success')
  }

  // ── Step indicator ────────────────────────────────────────────────────────
  function StepIndicator() {
    const labels = ['Type', 'Details', 'Submit']
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
        {labels.map((label, idx) => {
          const num = idx + 1
          const active = step === num
          const done = step > num
          return (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', flex: idx < labels.length - 1 ? 1 : undefined }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: done ? '#D30AD7' : active ? '#D30AD7' : 'rgba(0,0,0,0.08)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: (active || done) ? '#fff' : 'rgba(0,0,0,0.3)' }}>
                    {done ? '✓' : String(num)}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, marginTop: 4, color: active ? '#D30AD7' : done ? '#A008A3' : 'rgba(0,0,0,0.35)', fontWeight: active ? '600' : '400' }}>{label}</Text>
              </View>
              {idx < labels.length - 1 && (
                <View style={{ flex: 1, height: 2, backgroundColor: done ? '#D30AD7' : 'rgba(0,0,0,0.08)', marginHorizontal: 6, marginBottom: 14 }} />
              )}
            </View>
          )
        })}
      </View>
    )
  }

  // ── Post-submit screens ───────────────────────────────────────────────────
  if (postSubmit === 'payment_sent') {
    const maskedMobile = 'XXXXXX' + (c.mobile ?? '').slice(-4)
    const refNo = 'REF-' + c.partyId.slice(-6).toUpperCase() + '-' + String(Date.now()).slice(-6)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F7' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', elevation: 1 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28, color: '#7C3AED' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: 'rgba(0,0,0,0.9)', marginBottom: 6 }}>Payment Link Sent</Text>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textAlign: 'center', marginBottom: 20 }}>
              Link for {fmt2(netCollectible)} sent to {maskedMobile}
            </Text>
            <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', width: '100%', marginBottom: 16 }} />
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, width: '100%', marginBottom: 16 }}>
              <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Reference No.</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.8)', fontFamily: 'monospace' }}>{refNo}</Text>
            </View>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', textAlign: 'center', marginBottom: 20 }}>
              Waiting for customer to complete payment...
            </Text>
            <TouchableOpacity
              onPress={() => setPostSubmit('payment_received')}
              style={{ borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 24, paddingVertical: 12, alignItems: 'center', width: '100%', marginBottom: 10 }}
            >
              <Text style={{ color: '#7C3AED', fontWeight: '600', fontSize: 14 }}>Simulate Payment Received</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main')}
              style={{ backgroundColor: '#F3F4F6', borderRadius: 24, paddingVertical: 12, alignItems: 'center', width: '100%' }}
            >
              <Text style={{ color: 'rgba(0,0,0,0.6)', fontWeight: '600', fontSize: 14 }}>Back to Cases</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (postSubmit === 'payment_received') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F7' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', elevation: 1 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28, color: '#16A34A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: 'rgba(0,0,0,0.9)', marginBottom: 6 }}>Payment Received!</Text>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textAlign: 'center', marginBottom: 20 }}>Disposition successfully submitted</Text>
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, width: '100%', gap: 8, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#166534' }}>Customer</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534' }}>{c.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#166534' }}>Amount</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534' }}>{fmt2(netCollectible)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#166534' }}>Type</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534' }}>{paymentType}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: 'rgba(22,101,52,0.15)', marginVertical: 2 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#166534' }}>Repayment ID</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534', fontFamily: 'monospace' }}>{repaymentId}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main')}
              style={{ backgroundColor: '#D30AD7', borderRadius: 24, paddingVertical: 14, alignItems: 'center', width: '100%' }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Back to Cases</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (postSubmit === 'waiver_submitted') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F7' }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 1, marginBottom: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28 }}>⏳</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: 'rgba(0,0,0,0.9)', marginBottom: 6 }}>Waiver Request Submitted</Text>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textAlign: 'center' }}>Pending Agency Manager approval</Text>
          </View>

          <View style={{ backgroundColor: '#FFF7ED', borderRadius: 20, padding: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Waiver Details</Text>
            {[
              ['Waiver %', `${waiverPct}%`],
              ['Waiver Amount', fmt2(waiverAmount)],
              ['Gross Amount', fmt2(grossAmount)],
              ['Net Collectible (post approval)', fmt2(netCollectible)],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#92400E' }}>{k}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E' }}>{v}</Text>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 1 }}>
            <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Agency Manager</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FAE2FA', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#A008A3' }}>RK</Text>
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,0.85)' }}>Rajesh Kumar</Text>
                <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>Agency Manager · {agentInfo?.branch ?? 'Branch'}</Text>
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, elevation: 1 }}>
            <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>What Happens Next</Text>
            {[
              'Agency Manager reviews your waiver request',
              'On approval, payment link is auto-sent to customer',
              'Disposition marked complete on payment',
            ].map((txt, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FAE2FA', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#A008A3' }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.7)', flex: 1 }}>{txt}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            style={{ backgroundColor: '#D30AD7', borderRadius: 24, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Back to Cases</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (postSubmit === 'success') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F7' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', elevation: 1 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28, color: '#16A34A' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: 'rgba(0,0,0,0.9)', marginBottom: 6 }}>Disposition Submitted</Text>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', textAlign: 'center', marginBottom: 20 }}>
              {sliceAction} recorded for {c.name}
            </Text>
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, width: '100%', gap: 8, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>Action</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.8)' }}>{sliceAction}</Text>
              </View>
              {contactPerson ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>Spoke with</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.8)' }}>{contactPerson}</Text>
                </View>
              ) : null}
              {ptpDate ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>PTP Date</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.8)' }}>{ptpDate}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main')}
              style={{ backgroundColor: '#D30AD7', borderRadius: 24, paddingVertical: 14, alignItems: 'center', width: '100%' }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Back to Cases</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F7' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1 }}>
        <TouchableOpacity
          onPress={() => {
            if (step === 1) navigation.goBack()
            else setStep((step - 1) as 1 | 2 | 3)
          }}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 20, color: 'rgba(0,0,0,0.6)' }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(0,0,0,0.9)' }}>{c.name}</Text>
          <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>Add Disposition</Text>
        </View>
        <View style={{ backgroundColor: isCC ? '#DBEAFE' : '#FAE2FA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, color: isCC ? '#1D4ED8' : '#A008A3', fontWeight: '700' }}>{isCC ? '💳 CC' : '🏦 Borrow'}</Text>
        </View>
      </View>

      {/* Step indicator */}
      <StepIndicator />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>

        {/* ── STEP 1: Disposition Type ── */}
        {step === 1 && (
          <>
            <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginBottom: 4 }}>Select a disposition type to proceed</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SLICE_ACTION_TILES.map(tile => {
                const selected = sliceAction === tile.label
                return (
                  <TouchableOpacity
                    key={tile.label}
                    onPress={() => { setSliceAction(tile.label); setPaymentType(''); setSelectedEmiNos([]); setCustomAmount(''); setWaiverPct(0) }}
                    style={{
                      width: '47%',
                      backgroundColor: selected ? tile.bg : '#fff',
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? tile.color : 'rgba(0,0,0,0.08)',
                      elevation: selected ? 2 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 8 }}>{tile.icon}</Text>
                    <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? tile.color : 'rgba(0,0,0,0.75)' }}>{tile.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              onPress={() => setStep(2)}
              disabled={!step1Valid}
              style={{ backgroundColor: step1Valid ? '#D30AD7' : 'rgba(0,0,0,0.1)', borderRadius: 24, paddingVertical: 15, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ color: step1Valid ? '#fff' : 'rgba(0,0,0,0.3)', fontWeight: '600', fontSize: 14 }}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <>
            {/* Collected flow */}
            {isCollected && (
              <>
                {/* Financial summary card */}
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1 }}>
                  <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, fontWeight: '600' }}>
                    {isCC ? 'Bill Summary' : 'Loan Summary'}
                  </Text>
                  {isCC && ccBill ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {[
                        ['Bill Amount', fmt2(ccBill.billAmount)],
                        ['Min Due', fmt2(ccBill.minDueAmount)],
                        ['Late Penalty', fmt2(ccBill.remainingLatePenalty)],
                      ].map(([k, v]) => (
                        <View key={k} style={{ width: '30%' }}>
                          <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>{k}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.85)' }}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  ) : borrowData ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {[
                        ['Current POS', fmt2(borrowData.currentPos)],
                        ['Min Due', fmt2(borrowData.minDueAmount)],
                        ['Late Interest', fmt2(borrowData.lateInterest)],
                        ['Late Penalty', fmt2(borrowData.latePenalty)],
                      ].map(([k, v]) => (
                        <View key={k} style={{ width: '45%' }}>
                          <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', marginBottom: 2 }}>{k}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.85)' }}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {/* Payment type chips */}
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1, gap: 14 }}>
                  <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>Payment Type</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {paymentTypes.map(pt => (
                      <TouchableOpacity
                        key={pt}
                        onPress={() => { setPaymentType(pt); setSelectedEmiNos([]); setCustomAmount('') }}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: paymentType === pt ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: paymentType === pt ? '#FAE2FA' : '#fff' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: paymentType === pt ? '600' : '400', color: paymentType === pt ? '#A008A3' : 'rgba(0,0,0,0.7)' }}>{pt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* EMI selector — only for Borrow + Overdue EMIs */}
                  {paymentType === 'Overdue EMIs' && borrowData && (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>Select EMIs to Collect</Text>
                        <TouchableOpacity
                          onPress={() => {
                            const allNos = borrowData.emis.filter(e => e.status === 'overdue').map(e => e.emiNo)
                            const allSelected = allNos.every(n => selectedEmiNos.includes(n))
                            setSelectedEmiNos(allSelected ? [] : allNos)
                          }}
                          style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#FAE2FA' }}
                        >
                          <Text style={{ fontSize: 11, color: '#A008A3', fontWeight: '600' }}>
                            {borrowData.emis.filter(e => e.status === 'overdue').every(e => selectedEmiNos.includes(e.emiNo)) ? 'Deselect All' : 'Select All'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {selectedEmiNos.length > 0 && (
                        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: '#166534' }}>{selectedEmiNos.length} EMI{selectedEmiNos.length > 1 ? 's' : ''} selected</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>{fmt2(grossAmount)}</Text>
                        </View>
                      )}
                      {borrowData.emis.filter(e => e.status === 'overdue').map(e => {
                        const sel = selectedEmiNos.includes(e.emiNo)
                        const total = e.pos + e.interest + e.penalty
                        return (
                          <TouchableOpacity
                            key={e.emiNo}
                            onPress={() => toggleEmi(e.emiNo)}
                            style={{ borderRadius: 14, borderWidth: 1.5, borderColor: sel ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: sel ? '#FAE2FA' : '#F9FAFB', padding: 12 }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                              <Text style={{ fontWeight: '600', fontSize: 13, color: sel ? '#A008A3' : 'rgba(0,0,0,0.85)' }}>EMI #{e.emiNo}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? '#A008A3' : 'rgba(0,0,0,0.85)' }}>{fmt2(total)}</Text>
                                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: sel ? '#D30AD7' : 'rgba(0,0,0,0.2)', backgroundColor: sel ? '#D30AD7' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                  {sel && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                                </View>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)' }}>POS: {fmt2(e.pos)}</Text>
                              <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)' }}>Interest: {fmt2(e.interest)}</Text>
                              <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)' }}>Penalty: {fmt2(e.penalty)}</Text>
                            </View>
                            <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginTop: 4 }}>Due: {e.dueDate}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}

                  {/* Custom amount */}
                  {paymentType === 'Custom Amount' && (
                    <View>
                      <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 8 }}>Amount</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: customAmount ? '#D30AD7' : 'rgba(0,0,0,0.15)', paddingBottom: 8 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(0,0,0,0.7)', marginRight: 6 }}>₹</Text>
                        <TextInput
                          value={customAmount}
                          onChangeText={v => setCustomAmount(v.replace(/\D/g, ''))}
                          keyboardType="numeric"
                          placeholder="Enter amount"
                          placeholderTextColor="rgba(0,0,0,0.3)"
                          style={{ flex: 1, fontSize: 16, color: 'rgba(0,0,0,0.9)' }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Locked amount for non-custom, non-EMI types */}
                  {paymentType !== '' && paymentType !== 'Custom Amount' && paymentType !== 'Overdue EMIs' && (
                    <View style={{ backgroundColor: '#F0F4F7', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Amount (system calculated)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(0,0,0,0.85)' }}>{fmt2(grossAmount)}</Text>
                        <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)' }}>🔒</Text>
                      </View>
                    </View>
                  )}

                  {/* Waiver section — redesigned with slider */}
                  {(isCollected || isPTP) && (
                    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 14, gap: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>Waiver on Interest + Penalty</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>Base: {fmt2(waiverableBase)}</Text>
                      </View>

                      {waiverableBase === 0 && (
                        <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontStyle: 'italic' }}>No interest/penalty base to waive for this payment type</Text>
                      )}

                      {/* Custom text input + slider + breakdown — only when base exists */}
                      {waiverableBase > 0 && <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>Custom %:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#D30AD7', flex: 1 }}>
                          <TextInput
                            value={String(waiverPct)}
                            onChangeText={v => {
                              const n = parseInt(v.replace(/\D/g, ''), 10)
                              if (!isNaN(n)) setWaiverPct(Math.min(100, Math.max(0, n)))
                              else if (v === '') setWaiverPct(0)
                            }}
                            keyboardType="numeric"
                            maxLength={3}
                            style={{ flex: 1, fontSize: 14, color: 'rgba(0,0,0,0.9)', paddingVertical: 6 }}
                          />
                          <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', paddingRight: 4 }}>%</Text>
                        </View>
                      </View>

                      {/* Touch slider */}
                      <View
                        style={{ height: 36, justifyContent: 'center' }}
                        onLayout={e => setSliderWidth(e.nativeEvent.layout.width)}
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={e => {
                          const pct = Math.round(Math.min(100, Math.max(0, (e.nativeEvent.locationX / (sliderWidth || 1)) * 100)))
                          setWaiverPct(pct)
                        }}
                        onResponderMove={e => {
                          const pct = Math.round(Math.min(100, Math.max(0, (e.nativeEvent.locationX / (sliderWidth || 1)) * 100)))
                          setWaiverPct(pct)
                        }}
                      >
                        {/* Track background */}
                        <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'visible' }}>
                          {/* Filled portion */}
                          <View style={{ height: 6, backgroundColor: '#A008A3', borderRadius: 3, width: `${waiverPct}%` }} />
                        </View>
                        {/* Thumb */}
                        <View style={{
                          position: 'absolute',
                          left: `${waiverPct}%`,
                          width: 22, height: 22, borderRadius: 11,
                          backgroundColor: '#fff',
                          borderWidth: 2, borderColor: '#A008A3',
                          marginLeft: -11,
                          top: 7,
                          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                          elevation: 3,
                        }} />
                      </View>

                      {/* Waiver breakdown card */}
                      {waiverPct > 0 ? (
                        <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, gap: 6 }}>
                          <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Waiver Breakdown</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#92400E' }}>Gross Amount</Text>
                            <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>{fmt2(grossAmount)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#92400E' }}>Waiver ({waiverPct}% of {fmt2(waiverableBase)})</Text>
                            <Text style={{ fontSize: 12, color: '#CE1D26', fontWeight: '600' }}>− {fmt2(waiverAmount)}</Text>
                          </View>
                          <View style={{ height: 1, backgroundColor: 'rgba(146,64,14,0.2)', marginVertical: 2 }} />
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '700' }}>Net Collectible</Text>
                            <Text style={{ fontSize: 15, color: '#92400E', fontWeight: '800' }}>{fmt2(netCollectible)}</Text>
                          </View>
                          <Text style={{ fontSize: 10, color: '#B45309', marginTop: 4 }}>⚠ Waiver requires Agency Manager approval</Text>
                        </View>
                      ) : (
                        grossAmount > 0 && (
                          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#166534', fontWeight: '600' }}>Net Collectible</Text>
                            <Text style={{ fontSize: 16, color: '#166534', fontWeight: '800' }}>{fmt2(netCollectible)}</Text>
                          </View>
                        )
                      )}
                      </>}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* PTP flow */}
            {isPTP && (
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1, gap: 16 }}>
                <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>PTP Details</Text>
                <View>
                  <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Promise Date <Text style={{ color: '#CE1D26' }}>*</Text></Text>
                  <TextInput
                    value={ptpDate}
                    onChangeText={setPtpDate}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    style={{ borderBottomWidth: 1, borderBottomColor: ptpDate ? '#D30AD7' : 'rgba(0,0,0,0.15)', paddingVertical: 10, fontSize: 14, color: 'rgba(0,0,0,0.9)' }}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>PTP Amount (Optional)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)', paddingBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', marginRight: 6 }}>₹</Text>
                    <TextInput
                      value={ptpAmount}
                      onChangeText={v => setPtpAmount(v.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      placeholder="Enter expected amount"
                      placeholderTextColor="rgba(0,0,0,0.3)"
                      style={{ flex: 1, fontSize: 14, color: 'rgba(0,0,0,0.9)' }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Non-collected, non-PTP: no financial details needed */}
            {!isCollected && !isPTP && (
              <View style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>ℹ️</Text>
                <Text style={{ fontSize: 13, color: '#1E40AF', flex: 1 }}>No financial details needed. Contact information will be captured next.</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setStep(3)}
              disabled={!step2Valid}
              style={{ backgroundColor: step2Valid ? '#D30AD7' : 'rgba(0,0,0,0.1)', borderRadius: 24, paddingVertical: 15, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: step2Valid ? '#fff' : 'rgba(0,0,0,0.3)', fontWeight: '600', fontSize: 14 }}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── STEP 3: Contact & Submit ── */}
        {step === 3 && (
          <>
            {/* 1. Summary pill(s) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: '#FAE2FA', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 24 }}>
                <Text style={{ fontSize: 12, color: '#A008A3', fontWeight: '600' }}>{sliceAction}{paymentType ? ` — ${paymentType}` : ''}</Text>
              </View>
              {isCollected && netCollectible > 0 && (
                <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 24 }}>
                  <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>{fmt2(netCollectible)}</Text>
                </View>
              )}
              {isPTP && ptpDate ? (
                <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 24 }}>
                  <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '600' }}>PTP: {ptpDate}</Text>
                </View>
              ) : null}
            </View>

            {/* 2. Contact section — conditional per field matrix */}
            {/* For Not Reachable: person=HIDDEN, place=HIDDEN, number=HIDDEN — skip contact section entirely */}
            {/* For Not Contactable: person=HIDDEN, place=HIDDEN, number=OPTIONAL — show only number */}
            {!isNotReachable && (
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1, gap: 16 }}>
                <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>Contact Details</Text>

                {/* Contact Person — REQUIRED for Collected, PTP, Broken PTP, Dispute; HIDDEN for Not Contactable */}
                {showContactPerson && (
                  <View>
                    <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      Spoke With{requireContactPerson ? <Text style={{ color: '#CE1D26' }}> *</Text> : ' (Optional)'}
                    </Text>
                    <SimpleSelect
                      value={contactPerson}
                      onChange={setContactPerson}
                      options={['Self', 'Spouse', 'Parent', 'Sibling', 'Neighbor', 'Other']}
                      placeholder="Select contact person"
                    />
                  </View>
                )}

                {/* Contact Place — REQUIRED for Collected, PTP, Broken PTP, Dispute; HIDDEN for Not Contactable */}
                {showContactPlace && (
                  <View>
                    <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      Met At{requireContactPlace ? <Text style={{ color: '#CE1D26' }}> *</Text> : ' (Optional)'}
                    </Text>
                    <SimpleSelect
                      value={contactPlace}
                      onChange={setContactPlace}
                      options={['Home', 'Phone', 'Field', 'Office', 'Other']}
                      placeholder="Select contact place"
                    />
                  </View>
                )}

                {/* 3. Contact Number — OPTIONAL for Collected/Not Contactable, REQUIRED for PTP/Broken PTP/Dispute, HIDDEN for Not Reachable */}
                {showContactNumber && (
                  <View>
                    <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                      Contact Number{requireContactNumber ? <Text style={{ color: '#CE1D26' }}> *</Text> : ' (Optional)'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: contactNumber.length > 0 && contactNumber.length !== 10 ? '#CE1D26' : contactNumber.length === 10 ? '#D30AD7' : 'rgba(0,0,0,0.15)' }}>
                      <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.9)', paddingVertical: 10, paddingRight: 6, fontWeight: '500' }}>+91</Text>
                      <TextInput
                        keyboardType="phone-pad"
                        value={contactNumber}
                        onChangeText={t => setContactNumber(t.replace(/\D/g, '').slice(0, 10))}
                        placeholder={c.mobile ? 'XXXXXX' + c.mobile.slice(-4) : '10-digit number'}
                        placeholderTextColor="rgba(0,0,0,0.3)"
                        maxLength={10}
                        style={{ flex: 1, fontSize: 14, color: 'rgba(0,0,0,0.9)', paddingVertical: 10 }}
                      />
                      {contactNumber.length > 0 && (
                        <Text style={{ fontSize: 11, color: contactNumber.length === 10 ? '#00A63E' : '#CE1D26' }}>{contactNumber.length}/10</Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Address selection */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1 }}>
              <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 8 }}>
                Address Visited <Text style={{ color: 'rgba(0,0,0,0.3)', fontWeight: '400', fontSize: 10 }}>(Optional)</Text>
              </Text>
              <SimpleSelect
                value={visitedAddress}
                onChange={setVisitedAddress}
                options={[
                  c.address && `Home: ${c.address.slice(0, 40)}`,
                  c.address_line2 && `Alt: ${c.address_line2.slice(0, 40)}`,
                  c.address_line3 && `Other: ${c.address_line3.slice(0, 40)}`,
                ].filter(Boolean) as string[]}
                placeholder="Select address visited"
              />
            </View>

            {/* 4. Remarks — OPTIONAL for Collected, REQUIRED(15+) for all others */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1 }}>
              <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 8 }}>
                Remarks {remarksRequired ? <Text style={{ color: '#CE1D26' }}>* (Min 15 chars)</Text> : '(Optional)'}
              </Text>
              <TextInput
                value={remarks}
                onChangeText={setRemarks}
                placeholder={remarksRequired ? 'Describe what happened (min 15 characters)...' : 'Add notes about this visit...'}
                placeholderTextColor="rgba(0,0,0,0.3)"
                multiline
                numberOfLines={4}
                style={{ fontSize: 14, color: 'rgba(0,0,0,0.85)', borderWidth: 1, borderColor: remarksRequired && submitAttempted && remarks.length < 15 ? '#CE1D26' : 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top' }}
              />
              {remarksRequired && remarks.length > 0 && remarks.length < 15 && (
                <Text style={{ fontSize: 11, color: '#CE1D26', marginTop: 4 }}>{15 - remarks.length} more characters needed</Text>
              )}
            </View>

            {/* 5. Photo capture — REQUIRED for ALL */}
            <TouchableOpacity
              onPress={() => setPhotoCaptured(v => !v)}
              style={{
                backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1,
                flexDirection: 'row', alignItems: 'center', gap: 12,
                borderWidth: submitAttempted && !photoCaptured ? 1.5 : 0,
                borderColor: submitAttempted && !photoCaptured ? '#CE1D26' : 'transparent',
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: photoCaptured ? '#F0FDF4' : '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>{photoCaptured ? '✅' : '📷'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: photoCaptured ? '#166534' : '#991B1B' }}>
                  {photoCaptured ? 'Photo Captured' : 'Capture Photo *'}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>
                  {photoCaptured ? 'Tap to retake' : 'Required for all dispositions'}
                </Text>
              </View>
              {photoCaptured && <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>✓</Text>}
            </TouchableOpacity>

            {/* 6. Validation hint */}
            {submitAttempted && !step3Valid && (
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, gap: 4 }}>
                {requireContactPerson && !contactPerson && <Text style={{ fontSize: 11, color: '#92400E' }}>• Select who you spoke with</Text>}
                {requireContactPlace && !contactPlace && <Text style={{ fontSize: 11, color: '#92400E' }}>• Select where you met</Text>}
                {requireContactNumber && contactNumber.length !== 10 && <Text style={{ fontSize: 11, color: '#92400E' }}>• Enter valid 10-digit contact number</Text>}
                {!photoCaptured && <Text style={{ fontSize: 11, color: '#92400E' }}>• Photo is required</Text>}
                {remarksRequired && remarks.length < 15 && <Text style={{ fontSize: 11, color: '#92400E' }}>• Remarks must be at least 15 characters</Text>}
              </View>
            )}

            {/* 7. Submit button */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ backgroundColor: '#D30AD7', borderRadius: 24, paddingVertical: 16, alignItems: 'center', marginTop: 4, opacity: step3Valid ? 1 : 0.7 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                {isCollected && waiverPct > 0
                  ? 'Submit for Waiver Approval →'
                  : isCollected
                  ? 'Submit & Send Payment Link →'
                  : 'Submit Disposition →'}
              </Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Bank Disposition Flow (unchanged) ───────────────────────────────────────

export default function DispositionScreen(props: Props) {
  if (props.route.params.customer?.userType === 'cc' || props.route.params.customer?.userType === 'borrow') {
    return <SliceDispositionScreen {...props} />
  }
  return <BankDispositionScreen {...props} />
}

function BankDispositionScreen({ navigation, route }: Props) {
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
  const [bankWaiverPct, setBankWaiverPct] = useState(0)
  const [bankSliderWidth, setBankSliderWidth] = useState(0)
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

  const bankWaiverableBase = isCollected ? (c.latePenalty ?? c.penaltyOs ?? 0) + (c.lateFees ?? c.interestOs ?? 0) : 0
  const bankWaiverAmount = Math.round(bankWaiverableBase * bankWaiverPct / 100)
  const bankNetCollectible = Math.max(0, (Number(amount) || 0) - bankWaiverAmount)

  const remarksMinChars = 15
  const remarksValid = !remarksRequired || remarks.length >= remarksMinChars

  const step1Valid = actionType !== null && code !== ''
  const step2Valid = (() => {
    if (isCollected) return amount !== '' && payMode !== '' && contactPerson !== '' && contactPlace !== ''
    if (isContacted) return contactPerson !== '' && contactPlace !== '' && contactNumber.length === 10 && (showFollowUpDate ? followUpDate !== '' : true)
    return true
  })()
  const step3Valid = photoCaptured && remarksValid

  function resetStep2() {
    setAmount(''); setPayMode(''); setContactPerson(''); setContactPlace(''); setContactNumber('')
    setFollowUpDate(''); setAltAddress(''); setAltNumber(''); setBankWaiverPct(0)
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
        branchName: agentInfo?.branch || c.branch || '',
        glCode: agentInfo?.glCode || '',
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

            {/* Waiver — Bank */}
            {isCollected && (
              <View className="bg-white rounded-[24px] p-4 gap-4" style={{ elevation: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider">Waiver on Penalty + Fees</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>Base: ₹{bankWaiverableBase.toLocaleString('en-IN')}</Text>
                </View>
                {bankWaiverableBase === 0 ? (
                  <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', fontStyle: 'italic' }}>No penalty/fees to waive for this customer</Text>
                ) : (
                  <>
                    {/* Text input */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>Waiver %:</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#D30AD7', flex: 1 }}>
                        <TextInput
                          value={String(bankWaiverPct)}
                          onChangeText={v => {
                            const n = parseInt(v.replace(/\D/g, ''), 10)
                            if (!isNaN(n)) setBankWaiverPct(Math.min(100, Math.max(0, n)))
                            else if (v === '') setBankWaiverPct(0)
                          }}
                          keyboardType="numeric"
                          maxLength={3}
                          style={{ flex: 1, fontSize: 14, color: 'rgba(0,0,0,0.9)', paddingVertical: 6 }}
                        />
                        <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', paddingRight: 4 }}>%</Text>
                      </View>
                    </View>
                    {/* Touch slider */}
                    <View
                      style={{ height: 36, justifyContent: 'center' }}
                      onLayout={e => setBankSliderWidth(e.nativeEvent.layout.width)}
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={e => setBankWaiverPct(Math.round(Math.min(100, Math.max(0, (e.nativeEvent.locationX / (bankSliderWidth || 1)) * 100))))}
                      onResponderMove={e => setBankWaiverPct(Math.round(Math.min(100, Math.max(0, (e.nativeEvent.locationX / (bankSliderWidth || 1)) * 100))))}
                    >
                      <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3 }}>
                        <View style={{ height: 6, backgroundColor: '#D30AD7', borderRadius: 3, width: `${bankWaiverPct}%` }} />
                      </View>
                      <View style={{ position: 'absolute', left: `${bankWaiverPct}%`, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 2, borderColor: '#D30AD7', marginLeft: -11, top: 7, elevation: 3 }} />
                    </View>
                    {/* Breakdown */}
                    {bankWaiverPct > 0 && (
                      <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: '#92400E' }}>Collected Amount</Text>
                          <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>₹{(Number(amount)||0).toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: '#92400E' }}>Waiver ({bankWaiverPct}%)</Text>
                          <Text style={{ fontSize: 12, color: '#CE1D26', fontWeight: '600' }}>− ₹{bankWaiverAmount.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: 'rgba(146,64,14,0.2)' }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '700' }}>Net Collectible</Text>
                          <Text style={{ fontSize: 15, color: '#92400E', fontWeight: '800' }}>₹{bankNetCollectible.toLocaleString('en-IN')}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#B45309', marginTop: 4 }}>⚠ Waiver requires supervisor approval</Text>
                      </View>
                    )}
                  </>
                )}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: contactNumber.length > 0 && contactNumber.length !== 10 ? '#CE1D26' : 'rgba(0,0,0,0.15)' }}>
                    <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.9)', paddingVertical: 10, paddingRight: 6, fontWeight: '500' }}>+91</Text>
                    <TextInput
                      keyboardType="phone-pad"
                      value={contactNumber}
                      onChangeText={t => setContactNumber(t.replace(/\D/g, '').slice(0, 10))}
                      placeholder={c.mobile ? c.mobile.slice(-10) : '10-digit number'}
                      placeholderTextColor="rgba(0,0,0,0.3)"
                      maxLength={10}
                      style={{ flex: 1, fontSize: 14, color: 'rgba(0,0,0,0.9)', paddingVertical: 10 }}
                    />
                    {contactNumber.length > 0 && (
                      <Text style={{ fontSize: 11, color: contactNumber.length === 10 ? '#00A63E' : '#CE1D26', paddingLeft: 4 }}>
                        {contactNumber.length}/10
                      </Text>
                    )}
                  </View>
                  {contactNumber.length > 0 && contactNumber.length !== 10 && (
                    <Text style={{ fontSize: 10, color: '#CE1D26', marginTop: 3 }}>Enter 10-digit number</Text>
                  )}
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
