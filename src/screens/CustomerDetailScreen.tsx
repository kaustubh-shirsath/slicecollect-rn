import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Linking, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { getBorrowData } from '../data/emis'
import { getCCBill } from '../data/ccBills'
import { getBucketColor } from '../utils/bucketColors'
import { getActivity } from '../data/activityLog'
import { getAppointmentForCustomer, setAppointment, cancelAppointment, getTimeSlotLabel, type TimeSlot, type Appointment } from '../data/appointments'
import { useAgent } from '../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetail'>

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}
function fmt(n: number) { return '₹' + n.toLocaleString('en-IN') }
function fmtProduct(p: string) {
  return p.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
}
function isCallAllowed() {
  const h = new Date().getHours()
  return h >= 8 && h < 19
}

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const { customer: c, fromScreen } = route.params
  const { agentInfo } = useAgent()
  const [callBlocked, setCallBlocked] = useState(false)

  // Appointment state
  const [appt, setAppt] = useState<Appointment | undefined>(() => getAppointmentForCustomer(c.partyId))
  const [showApptForm, setShowApptForm] = useState(false)
  const [apptAddressIdx, setApptAddressIdx] = useState<number | null>(null)
  const [apptCustomAddress, setApptCustomAddress] = useState('')
  const [apptAddressLabel, setApptAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home')
  const [apptDate, setApptDate] = useState('')
  const [apptSlot, setApptSlot] = useState<TimeSlot>('morning')
  const [showApptCalendar, setShowApptCalendar] = useState(false)

  const addressOptions = [
    c.address && { label: 'Home', value: c.address },
    c.address_line2 && { label: 'Home 2', value: c.address_line2 },
    c.address_line3 && { label: 'Home 3', value: c.address_line3 },
  ].filter(Boolean) as { label: string; value: string }[]

  // Calendar helpers
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + 90)

  function generateCalendarDays(): Date[] {
    const days: Date[] = []
    const d = new Date(today)
    for (let i = 0; i < 90; i++) {
      days.push(new Date(d))
      d.setDate(d.getDate() + 1)
    }
    return days
  }

  function saveAppointment() {
    let selectedAddress = ''
    let addressLabel = 'Custom'
    if (apptAddressIdx !== null && apptAddressIdx < addressOptions.length) {
      selectedAddress = addressOptions[apptAddressIdx].value
      addressLabel = apptAddressLabel
    } else {
      selectedAddress = apptCustomAddress.trim()
      addressLabel = apptAddressLabel
    }
    if (!apptDate || !selectedAddress) return
    const newAppt = setAppointment({
      partyId: c.partyId,
      module: 'collections',
      date: apptDate,
      timeSlot: apptSlot,
      addressLabel,
      address: selectedAddress,
      agentUsername: agentInfo?.username ?? '',
    })
    setAppt(newAppt)
    setShowApptForm(false)
  }

  const isSlice = c.userType === 'cc' || c.userType === 'borrow'
  const borrowData = c.userType === 'borrow' ? getBorrowData(c.partyId) : undefined
  const ccBill = c.userType === 'cc' ? getCCBill(c.partyId) : undefined
  const sliceBucket = borrowData?.bucketLabel ?? ccBill?.bucketLabel ?? c.assetClassification
  const displayBucket = isSlice ? sliceBucket : (c.assetClassification || c.assetClass || '')
  const bc = getBucketColor(displayBucket)
  const activity = getActivity(c.partyId)
  const visitHistory = activity?.visitHistory ?? []
  const latestDisp = activity?.latestDisposition
  const amtCollected = activity?.collections.reduce((s: number, x: any) => s + x.amount, 0) ?? 0

  function handleCall(mobile: string) {
    if (!isCallAllowed()) {
      setCallBlocked(true)
      setTimeout(() => setCallBlocked(false), 3000)
      return
    }
    const clean = mobile.replace(/\D/g, '')
    Linking.openURL(`tel:+91${clean}`)
  }

  function openMaps(address: string) {
    const q = encodeURIComponent(address)
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`)
  }

  function openWhatsApp(mobile: string) {
    const clean = mobile.replace(/\D/g, '')
    Linking.openURL(`https://wa.me/91${clean}`)
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      {/* Header */}
      <SafeAreaView className="bg-white" edges={['top']}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }} className="px-4 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-9 h-9 items-center justify-center"
            >
              <Text className="text-black/60 text-xl">←</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Escalate', { customer: c })}>
              <Text className="text-[#CE1D26] text-xs font-medium">Escalate</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text className="text-[#A008A3] font-bold text-base">{initials(c.name)}</Text>
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[rgba(0,0,0,0.9)] font-semibold text-base leading-tight" numberOfLines={1}>{c.name}</Text>
              <Text className="text-black/40 text-[10px] font-mono mt-0.5">{c.partyId}</Text>
              <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: bc.bg }}>
                  <Text className="text-[10px] font-semibold" style={{ color: bc.text }}>
                    {displayBucket}
                  </Text>
                </View>
                {c.cibilAlert && (
                  <View className="bg-[#FFF0E0] px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] text-[#C05000] font-semibold">⚠ CIBIL</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {callBlocked && (
        <View className="mx-4 mt-3 bg-[#F9E4E5] border border-[#CE1D26]/20 rounded-2xl px-4 py-3 flex-row items-center gap-2">
          <Text className="text-[#CE1D26] text-base">🚫</Text>
          <View>
            <Text className="text-[#CE1D26] text-xs font-medium">Cannot call at this time</Text>
            <Text className="text-[10px]" style={{ color: 'rgba(206,29,38,0.7)' }}>Calling allowed only 8:00 AM – 7:00 PM</Text>
          </View>
        </View>
      )}

      <ScrollView className="flex-1 px-4 py-3" contentContainerStyle={{ gap: 12, paddingBottom: 120 }}>

        {/* Last visit */}
        {latestDisp && (
          <View className="bg-white rounded-2xl px-3 py-2.5 flex-row items-center justify-between" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="flex-row items-center gap-2">
              <View className="w-1.5 h-1.5 rounded-full bg-[#D30AD7]" />
              <Text className="text-[10px] text-black/40 uppercase tracking-wide">Last Visit</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.85)]">{latestDisp.code}</Text>
            </View>
            <Text className="text-[10px] text-black/40">{latestDisp.date}</Text>
          </View>
        )}

        {/* Financial summary — adapts per userType */}
        {isSlice ? (
          <View className="bg-white rounded-[20px] px-4 py-3" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium">{c.userType === 'cc' ? 'Bill Summary' : 'Loan Summary'}</Text>
              <View style={{ backgroundColor: '#FAE2FA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                <Text style={{ fontSize: 10, color: '#A008A3', fontWeight: '600' }}>{sliceBucket}</Text>
              </View>
            </View>
            {c.userType === 'cc' && ccBill ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {[
                  ['Bill Amount', fmt(ccBill.billAmount)],
                  ['Remaining', fmt(ccBill.remainingBillAmount)],
                  ['Min Due', fmt(ccBill.minDueAmount)],
                  ['Late Penalty', fmt(ccBill.remainingLatePenalty)],
                  ['Late Fees', fmt(ccBill.remainingLateFees)],
                  ['DPD', `${ccBill.currentDpd} days`],
                  ['Due Since', ccBill.dueSince],
                  ['Account', ccBill.accountStatus],
                ].map(([k, v]) => (
                  <View key={k} style={{ width: '45%' }}>
                    <Text className="text-[10px] text-black/40 font-medium">{k}</Text>
                    <Text className="text-xs font-semibold text-[rgba(0,0,0,0.85)] mt-0.5 leading-tight">{v}</Text>
                  </View>
                ))}
              </View>
            ) : borrowData ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {[
                  ['Current POS', fmt(borrowData.currentPos)],
                  ['Min Due', fmt(borrowData.minDueAmount)],
                  ['Late Interest', fmt(borrowData.lateInterest)],
                  ['Late Penalty', fmt(borrowData.latePenalty)],
                  ['Overdue EMIs', String(borrowData.totalEmisOverdue)],
                  ['DPD', `${borrowData.currentDpd} days`],
                  ['Due Since', borrowData.dueSince],
                  ['Foreclosure', fmt(borrowData.foreclosureAmount)],
                ].map(([k, v]) => (
                  <View key={k} style={{ width: '45%' }}>
                    <Text className="text-[10px] text-black/40 font-medium">{k}</Text>
                    <Text className="text-xs font-semibold text-[rgba(0,0,0,0.85)] mt-0.5 leading-tight">{v}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <View className="bg-white rounded-[20px] px-4 py-3 flex-row items-center justify-between" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
              <View>
                <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium">Overdue</Text>
                <Text className="text-[#CE1D26] text-2xl font-bold mt-0.5">{fmt(c.emiOs)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium">Collected</Text>
                <Text className={`text-xl font-bold mt-0.5 ${amtCollected > 0 ? 'text-[#00A63E]' : 'text-black/20'}`}>{fmt(amtCollected)}</Text>
              </View>
            </View>
            <View className="bg-white rounded-[20px] px-4 py-3" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
              <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2.5">Loan Details</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {[
                  ['Product', fmtProduct(c.product || '')],
                  ['DPD', `${c.dpd} days`],
                  ['POS Amt', fmt(c.outstandingBalance || 0)],
                  ['EMI Amt', fmt(c.emiAmt || 0)],
                  ['Min Pay', fmt(c.minimumAmountDue || 0)],
                  ['Rollback', fmt(c.rollbackAmount || 0)],
                  ['Settlement', fmt(c.outstandingBalance || 0)],
                  ['Last Payment', c.lastPaymentDate || '—'],
                ].map(([k, v]) => (
                  <View key={k} style={{ width: '45%' }}>
                    <Text className="text-[10px] text-black/40 font-medium">{k}</Text>
                    <Text className="text-xs font-semibold text-[rgba(0,0,0,0.85)] mt-0.5 leading-tight">{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Contact */}
        <View className="bg-white rounded-[20px] overflow-hidden" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <View className="px-4 pt-3 pb-2.5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Primary</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)] tracking-wide">XXXXXX{c.mobile?.slice(-4)}</Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => handleCall(c.mobile)}
                  className="w-9 h-9 rounded-full bg-[#D30AD7] items-center justify-center"
                >
                  <Text className="text-white text-sm">📞</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openWhatsApp(c.mobile)}
                  className="w-9 h-9 rounded-full bg-[#25D366] items-center justify-center"
                >
                  <Text style={{ color: '#fff', fontSize: 15 }}>💬</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {c.mobile1 && (
            <View className="px-4 py-2.5">
              <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Alternate</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)] tracking-wide">XXXXXX{c.mobile1.slice(-4)}</Text>
                <TouchableOpacity
                  onPress={() => handleCall(c.mobile1)}
                  className="w-9 h-9 rounded-full border-2 border-[#D30AD7] items-center justify-center"
                >
                  <Text className="text-[#D30AD7] text-sm">📞</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Address */}
        <TouchableOpacity
          onPress={() => openMaps(c.address)}
          className="w-full bg-white rounded-[20px] px-4 py-3"
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
        >
          <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-1.5">Address</Text>
          <View className="flex-row items-start gap-2">
            <Text className="text-[#D30AD7] mt-0.5">📍</Text>
            <Text className="text-xs font-medium text-[rgba(0,0,0,0.85)] leading-relaxed flex-1">{c.address}</Text>
            <View className="w-8 h-8 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text>📍</Text>
            </View>
          </View>
          <Text className="text-[#D30AD7] text-[10px] font-semibold mt-1.5">Open in Google Maps →</Text>
        </TouchableOpacity>

        {/* Appointment Section */}
        <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-[rgba(0,0,0,0.85)]">📅 Appointment</Text>
            {appt ? (
              <View className="bg-[#E0F4E8] px-2 py-0.5 rounded-full">
                <Text className="text-[10px] text-[#00A63E] font-semibold">Confirmed</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowApptForm(v => !v)}
                className="bg-[#FAE2FA] px-3 py-1 rounded-full"
              >
                <Text className="text-[11px] text-[#A008A3] font-semibold">+ Confirm</Text>
              </TouchableOpacity>
            )}
          </View>

          {appt && !showApptForm && (
            <View className="gap-1 mb-3">
              <Text className="text-xs text-black/60">{appt.date} · {getTimeSlotLabel(appt.timeSlot)}</Text>
              <Text className="text-xs text-black/70 leading-snug">{appt.addressLabel}: {appt.address}</Text>
              <View className="flex-row gap-2 mt-2">
                <TouchableOpacity
                  onPress={() => setShowApptForm(true)}
                  className="flex-1 border border-[#D30AD7] rounded-xl py-1.5 items-center"
                >
                  <Text className="text-[11px] text-[#D30AD7] font-semibold">Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { cancelAppointment(c.partyId); setAppt(undefined) }}
                  className="flex-1 border border-[#CE1D26]/40 rounded-xl py-1.5 items-center"
                >
                  <Text className="text-[11px] text-[#CE1D26] font-semibold">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showApptForm && (
            <View className="gap-3 mt-1">
              {/* Address selection */}
              <View>
                <Text className="text-[10px] text-black/40 uppercase tracking-wide font-medium mb-1.5">Select Address</Text>
                <View className="gap-2">
                  {addressOptions.map((opt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setApptAddressIdx(idx)}
                      className="w-full px-3 py-2.5 rounded-xl border"
                      style={{ borderColor: apptAddressIdx === idx ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: apptAddressIdx === idx ? '#FAE2FA' : '#fff' }}
                    >
                      <Text className="text-[11px]" style={{ color: apptAddressIdx === idx ? '#A008A3' : 'rgba(0,0,0,0.7)' }}>
                        {opt.value}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => setApptAddressIdx(addressOptions.length)}
                    className="w-full px-3 py-2.5 rounded-xl border"
                    style={{ borderColor: apptAddressIdx === addressOptions.length ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: apptAddressIdx === addressOptions.length ? '#FAE2FA' : '#fff' }}
                  >
                    <Text className="text-[11px] font-medium" style={{ color: apptAddressIdx === addressOptions.length ? '#A008A3' : 'rgba(0,0,0,0.7)' }}>✏️ Custom</Text>
                  </TouchableOpacity>
                  {apptAddressIdx === addressOptions.length && (
                    <TextInput
                      value={apptCustomAddress}
                      onChangeText={setApptCustomAddress}
                      placeholder="Enter custom address"
                      placeholderTextColor="rgba(0,0,0,0.3)"
                      className="border border-[#D30AD7]/40 rounded-xl px-3 py-2 text-xs text-black/80"
                      multiline
                    />
                  )}
                </View>
              </View>

              {/* Address type label chips — always visible */}
              <View>
                <Text className="text-[10px] text-black/40 uppercase tracking-wide font-medium mb-1.5">Address Type</Text>
                <View className="flex-row gap-2">
                  {(['Home', 'Work', 'Other'] as const).map(lbl => (
                    <TouchableOpacity
                      key={lbl}
                      onPress={() => setApptAddressLabel(lbl)}
                      className="px-4 py-1.5 rounded-full border"
                      style={{ borderColor: apptAddressLabel === lbl ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: apptAddressLabel === lbl ? '#FAE2FA' : '#fff' }}
                    >
                      <Text className="text-[11px] font-medium" style={{ color: apptAddressLabel === lbl ? '#A008A3' : 'rgba(0,0,0,0.6)' }}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date selection */}
              <View>
                <Text className="text-[10px] text-black/40 uppercase tracking-wide font-medium mb-1.5">Select Date</Text>
                <View className="flex-row gap-2 mb-2">
                  {[
                    { label: 'Today', ds: today.toISOString().split('T')[0] },
                    { label: 'Tomorrow', ds: (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })() },
                  ].map(({ label, ds }) => (
                    <TouchableOpacity
                      key={label}
                      onPress={() => { setApptDate(ds); setShowApptCalendar(false) }}
                      className="px-4 py-1.5 rounded-full border"
                      style={{ borderColor: apptDate === ds ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: apptDate === ds ? '#FAE2FA' : '#fff' }}
                    >
                      <Text className="text-[11px] font-medium" style={{ color: apptDate === ds ? '#A008A3' : 'rgba(0,0,0,0.6)' }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => setShowApptCalendar(v => !v)}
                    className="px-4 py-1.5 rounded-full border flex-row items-center gap-1"
                    style={{ borderColor: showApptCalendar || (apptDate && apptDate !== today.toISOString().split('T')[0] && apptDate !== (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()) ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: showApptCalendar ? '#FAE2FA' : '#fff' }}
                  >
                    <Text style={{ fontSize: 11 }}>🗓</Text>
                    <Text className="text-[11px] font-medium" style={{ color: showApptCalendar ? '#A008A3' : 'rgba(0,0,0,0.6)' }}>Pick date</Text>
                  </TouchableOpacity>
                </View>
                {showApptCalendar && (
                  <View className="mt-2 border border-black/10 rounded-xl p-2 bg-white">
                    <View className="flex-row flex-wrap gap-1">
                      {generateCalendarDays().map((day, di) => {
                        const ds = day.toISOString().split('T')[0]
                        const isSelected = ds === apptDate
                        return (
                          <TouchableOpacity
                            key={di}
                            onPress={() => { setApptDate(ds); setShowApptCalendar(false) }}
                            style={{
                              width: '13%',
                              paddingVertical: 4,
                              borderRadius: 6,
                              alignItems: 'center',
                              backgroundColor: isSelected ? '#D30AD7' : 'transparent',
                            }}
                          >
                            <Text style={{ fontSize: 10, color: isSelected ? '#fff' : 'rgba(0,0,0,0.7)' }}>
                              {day.getDate()}
                            </Text>
                            <Text style={{ fontSize: 8, color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.3)' }}>
                              {['Su','Mo','Tu','We','Th','Fr','Sa'][day.getDay()]}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Time slot */}
              <View>
                <Text className="text-[10px] text-black/40 uppercase tracking-wide font-medium mb-1.5">Time Slot</Text>
                <View className="flex-row gap-2">
                  {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map(slot => (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => setApptSlot(slot)}
                      className="flex-1 py-2 rounded-xl border items-center"
                      style={{ borderColor: apptSlot === slot ? '#D30AD7' : 'rgba(0,0,0,0.1)', backgroundColor: apptSlot === slot ? '#FAE2FA' : '#fff' }}
                    >
                      <Text className="text-[10px] font-medium capitalize" style={{ color: apptSlot === slot ? '#A008A3' : 'rgba(0,0,0,0.6)' }}>
                        {slot === 'morning' ? 'Morning' : slot === 'afternoon' ? 'Afternoon' : 'Evening'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save button */}
              <TouchableOpacity
                onPress={saveAppointment}
                className="bg-[#D30AD7] rounded-xl py-3 items-center"
              >
                <Text className="text-white text-sm font-bold">Save Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowApptForm(false)}>
                <Text className="text-center text-[11px] text-black/40 mt-1">Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Visit history */}
        {visitHistory.length > 0 && (
          <View className="bg-white rounded-[20px] overflow-hidden" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
            <View className="px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-[rgba(0,0,0,0.9)] text-sm">Visit History</Text>
                <View className="bg-[#FAE2FA] px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] text-[#A008A3] font-medium">{visitHistory.length} visits</Text>
                </View>
              </View>
            </View>
            <View className="px-4 py-3 gap-3">
              {visitHistory.map((v: any, i: number) => (
                <View key={i} className="flex-row items-start gap-3">
                  <View className="items-center">
                    <View className="w-2.5 h-2.5 rounded-full bg-[#D30AD7] mt-1" />
                    {i < visitHistory.length - 1 && <View className="w-0.5 flex-1 bg-black/10 mt-1" style={{ minHeight: 24 }} />}
                  </View>
                  <View className="flex-1 pb-3" style={i < visitHistory.length - 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' } : {}}>
                    <View className="flex-row items-center justify-between mb-0.5">
                      <Text className="text-xs font-semibold text-[rgba(0,0,0,0.9)]">{v.dispositionType}</Text>
                      <Text className="text-[10px] text-black/40">{v.date}</Text>
                    </View>
                    <Text className="text-[10px] text-black/50 leading-relaxed">{v.summary}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Action buttons */}
      <View className="absolute bottom-6 left-0 right-0 px-4">
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 12, elevation: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Disposition', { customer: c, fromScreen })}
            style={{ flex: 2, backgroundColor: '#D30AD7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }}>Add Feedback</Text>
          </TouchableOpacity>
          {!isSlice && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settlement', { customer: c })}
              style={{ flex: 1, backgroundColor: '#F0F4F7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: 'rgba(0,0,0,0.7)', fontSize: 12, fontWeight: '600' }}>Settlement</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('PaymentLink', { customer: c })}
            style={{ flex: 1, backgroundColor: '#F0F4F7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'rgba(0,0,0,0.7)', fontSize: 12, fontWeight: '600' }}>Pay Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
