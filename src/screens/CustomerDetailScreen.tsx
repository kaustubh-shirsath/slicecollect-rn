import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Linking, Alert, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { getBorrowData } from '../data/emis'
import { getCCBill } from '../data/ccBills'
import { getBucketColor } from '../utils/bucketColors'
import { getActivity } from '../data/activityLog'
import { getAppointmentForCustomer, setAppointment, cancelAppointment, getTimeSlotLabel, type TimeSlot, type Appointment } from '../data/appointments'
import { getActiveSettlement } from '../data/settlementUsers'
import { useAgent } from '../navigation/AgentContext'
import ProductTag from '../components/ProductTag'

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

// Accordion metrics grid — collapses past 3 rows (6 items at 2/row), arrow toggles
function MetricsGrid({ items, expanded, onToggle }: {
  items: [string, string][]; expanded: boolean; onToggle: () => void
}) {
  const COLLAPSED_COUNT = 6   // 3 rows × 2 columns
  const needsAccordion = items.length > COLLAPSED_COUNT
  const visible = needsAccordion && !expanded ? items.slice(0, COLLAPSED_COUNT) : items
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {visible.map(([k, v]) => (
          <View key={k} style={{ width: '45%' }}>
            <Text className="text-[10px] text-black/40 font-medium">{k}</Text>
            <Text className="text-xs font-semibold text-[rgba(0,0,0,0.85)] mt-0.5 leading-tight">{v}</Text>
          </View>
        ))}
      </View>
      {needsAccordion && (
        <TouchableOpacity onPress={onToggle} style={{ alignItems: 'center', paddingTop: 10 }}>
          <Text style={{ fontSize: 11, color: '#A008A3', fontWeight: '600' }}>
            {expanded ? '▲ Show less' : `▼ Show all (${items.length})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const { customer: c, fromScreen } = route.params
  const { agentInfo } = useAgent()
  const activeSettlement = getActiveSettlement(c.partyId)
  const [callBlocked, setCallBlocked] = useState(false)
  const [loanDetailsExpanded, setLoanDetailsExpanded] = useState(false)
  const [showAllAddresses, setShowAllAddresses] = useState(false)
  const [showAllPhones, setShowAllPhones] = useState(false)
  const [localAddresses, setLocalAddresses] = useState<{ label: string; value: string }[]>(() =>
    [
      c.address && { label: 'Home', value: c.address },
      c.address_line2 && { label: 'Address 2', value: c.address_line2 },
      c.address_line3 && { label: 'Address 3', value: c.address_line3 },
    ].filter(Boolean) as { label: string; value: string }[]
  )
  const [addingAddr, setAddingAddr] = useState(false)
  const [newAddrLabel, setNewAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home')
  const [newAddrValue, setNewAddrValue] = useState('')

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

  // Last positive disposition (Collected / Contacted Positive / PTP) with a captured location
  const lastPositiveVisit = [...visitHistory].reverse().find(v =>
    /Collected|Contacted Positive|PTP/i.test(v.dispositionType) && !/Broken/i.test(v.dispositionType)
  )
  const lastPositiveLocation = lastPositiveVisit && (lastPositiveVisit as any).lat && (lastPositiveVisit as any).lng
    ? { lat: (lastPositiveVisit as any).lat, lng: (lastPositiveVisit as any).lng }
    : null

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
            {/* User-level escalate (fraud / incorrect details / feedback) */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Escalate', { customer: c })}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-[#F9E4E5]"
            >
              <Text className="text-[#CE1D26] text-xs font-medium">🚨 Escalate</Text>
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
                <ProductTag userType={c.userType} />
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

        {/* Active settlement tag */}
        {activeSettlement && (
          <View className="bg-[#FEF3C7] rounded-2xl px-3 py-2.5 flex-row items-center justify-between" style={{ borderWidth: 1, borderColor: 'rgba(180,83,9,0.25)' }}>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm">🔒</Text>
              <Text className="text-xs font-semibold text-[#92400E]">Active Settlement</Text>
              <Text className="text-[10px] text-[#92400E]">{activeSettlement.instalmentsPaid}/{activeSettlement.instalmentCount} paid</Text>
            </View>
            <Text className="text-[10px] text-[#92400E]">Next: {fmt(activeSettlement.nextInstalmentAmount)} · {activeSettlement.nextInstalmentDue}</Text>
          </View>
        )}

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

        {/* Last positive disposition location */}
        {lastPositiveVisit && (
          <TouchableOpacity
            disabled={!lastPositiveLocation}
            onPress={() => lastPositiveLocation && Linking.openURL(`https://maps.google.com/?q=${lastPositiveLocation.lat},${lastPositiveLocation.lng}`)}
            className="bg-white rounded-2xl px-3 py-2.5 flex-row items-center justify-between"
            style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
          >
            <View className="flex-row items-center gap-2 flex-1">
              <Text className="text-sm">📍</Text>
              <Text className="text-[10px] text-black/40 uppercase tracking-wide">Last +ve Disposition</Text>
              <Text className="text-xs font-medium text-[rgba(0,0,0,0.85)]" numberOfLines={1}>
                {lastPositiveVisit.dispositionType.split('—')[0].trim()} · {lastPositiveVisit.date}
              </Text>
            </View>
            {lastPositiveLocation
              ? <Text className="text-[10px] text-[#D30AD7] font-medium">Map →</Text>
              : <Text className="text-[10px] text-black/30">No GPS</Text>}
          </TouchableOpacity>
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
              <MetricsGrid
                expanded={loanDetailsExpanded}
                onToggle={() => setLoanDetailsExpanded(e => !e)}
                items={[
                  ['Bill Amount', fmt(ccBill.billAmount)],
                  ['Remaining', fmt(ccBill.remainingBillAmount)],
                  ['Min Due', fmt(ccBill.minDueAmount)],
                  ['Late Penalty', fmt(ccBill.remainingLatePenalty)],
                  ['Late Fees', fmt(ccBill.remainingLateFees)],
                  ['DPD', `${ccBill.currentDpd} days`],
                  ['Due Since', ccBill.dueSince],
                  ['Account', ccBill.accountStatus],
                ]}
              />
            ) : borrowData ? (
              <MetricsGrid
                expanded={loanDetailsExpanded}
                onToggle={() => setLoanDetailsExpanded(e => !e)}
                items={[
                  ['Current POS', fmt(borrowData.currentPos)],
                  ['Min Due', fmt(borrowData.minDueAmount)],
                  ['Late Interest', fmt(borrowData.lateInterest)],
                  ['Late Penalty', fmt(borrowData.latePenalty)],
                  ['Overdue EMIs', String(borrowData.totalEmisOverdue)],
                  ['DPD', `${borrowData.currentDpd} days`],
                  ['Due Since', borrowData.dueSince],
                  ['Foreclosure', fmt(borrowData.foreclosureAmount)],
                ]}
              />
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
              <MetricsGrid
                expanded={loanDetailsExpanded}
                onToggle={() => setLoanDetailsExpanded(e => !e)}
                items={[
                  ['Product', fmtProduct(c.product || '')],
                  ['DPD', `${c.dpd} days`],
                  ['POS Amt', fmt(c.outstandingBalance || 0)],
                  ['EMI Amt', fmt(c.emiAmt || 0)],
                  ['Min Pay', fmt(c.minimumAmountDue || 0)],
                  ['Rollback', fmt(c.rollbackAmount || 0)],
                  ['Settlement', fmt(c.outstandingBalance || 0)],
                  ['Last Payment', c.lastPaymentDate || '—'],
                ]}
              />
            </View>
          </>
        )}

        {/* Contact */}
        {(() => {
          const allPhones = [
            c.mobile && { label: 'Primary', number: c.mobile },
            c.mobile1 && { label: 'Alternate', number: c.mobile1 },
            c.mobile2 && { label: 'Alternate 2', number: c.mobile2 },
          ].filter(Boolean) as { label: string; number: string }[]
          const visiblePhones = showAllPhones ? allPhones : allPhones.slice(0, 1)
          return (
            <View className="bg-white rounded-[20px] overflow-hidden" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
              {visiblePhones.map((ph, i) => (
                <View key={i} className="px-4 py-2.5" style={i < visiblePhones.length - 1 || allPhones.length > 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' } : {}}>
                  <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">{ph.label}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)] tracking-wide">XXXXXX{ph.number.slice(-4)}</Text>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity onPress={() => handleCall(ph.number)} className="w-9 h-9 rounded-full bg-[#D30AD7] items-center justify-center">
                        <Text className="text-white text-sm">📞</Text>
                      </TouchableOpacity>
                      {i === 0 && (
                        <TouchableOpacity onPress={() => openWhatsApp(ph.number)} className="w-9 h-9 rounded-full bg-[#25D366] items-center justify-center">
                          <Text style={{ color: '#fff', fontSize: 15 }}>💬</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              {allPhones.length > 1 && (
                <TouchableOpacity onPress={() => setShowAllPhones(v => !v)} className="px-4 py-2.5 flex-row items-center gap-1.5">
                  <Text className="text-[#D30AD7] text-xs font-semibold">
                    {showAllPhones ? 'Show less' : `+${allPhones.length - 1} more number${allPhones.length - 2 > 0 ? 's' : ''}`}
                  </Text>
                  <Text className="text-[#D30AD7] text-xs">{showAllPhones ? '▴' : '▾'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })()}

        {/* Address */}
        <View className="bg-white rounded-[20px] overflow-hidden" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
          {/* Header row with + add button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
            <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' }}>Addresses</Text>
            <TouchableOpacity onPress={() => { setNewAddrLabel('Home'); setNewAddrValue(''); setAddingAddr(true) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#D30AD7', fontSize: 18, fontWeight: '300', lineHeight: 20 }}>+</Text>
              <Text style={{ color: '#D30AD7', fontSize: 11, fontWeight: '600' }}>Add</Text>
            </TouchableOpacity>
          </View>
          {/* Address rows — view + open-in-maps only. Agents can add, never edit an existing address. */}
          {(showAllAddresses ? localAddresses : localAddresses.slice(0, 1)).map((addr, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: i < (showAllAddresses ? localAddresses : localAddresses.slice(0, 1)).length - 1 ? 1 : 0, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
              <TouchableOpacity onPress={() => openMaps(addr.value)} style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500', marginBottom: 4 }}>{addr.label}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Text style={{ color: '#D30AD7', fontSize: 12, marginTop: 1 }}>📍</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(0,0,0,0.85)', flex: 1, lineHeight: 18 }}>{addr.value}</Text>
                </View>
                <Text style={{ color: '#D30AD7', fontSize: 10, fontWeight: '600', marginTop: 4 }}>Open in Maps →</Text>
              </TouchableOpacity>
            </View>
          ))}
          {localAddresses.length > 1 && (
            <TouchableOpacity onPress={() => setShowAllAddresses(v => !v)} style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
              <Text style={{ color: '#D30AD7', fontSize: 12, fontWeight: '600' }}>
                {showAllAddresses ? 'Show less' : `+${localAddresses.length - 1} more`}
              </Text>
              <Text style={{ color: '#D30AD7', fontSize: 10 }}>{showAllAddresses ? '▴' : '▾'}</Text>
            </TouchableOpacity>
          )}
        </View>

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

      {/* Add Address Modal */}
      <Modal visible={addingAddr} transparent animationType="slide" onRequestClose={() => setAddingAddr(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setAddingAddr(false)}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: 'rgba(0,0,0,0.9)', marginBottom: 16 }}>Add Address</Text>
            <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Label</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['Home', 'Work', 'Other'] as const).map(lbl => (
                <TouchableOpacity
                  key={lbl}
                  onPress={() => setNewAddrLabel(lbl)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: newAddrLabel === lbl ? '#D30AD7' : 'rgba(0,0,0,0.15)', backgroundColor: newAddrLabel === lbl ? '#FAE2FA' : '#fff' }}
                >
                  <Text style={{ fontSize: 13, color: newAddrLabel === lbl ? '#A008A3' : 'rgba(0,0,0,0.6)', fontWeight: newAddrLabel === lbl ? '600' : '400' }}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Address</Text>
            <TextInput
              value={newAddrValue}
              onChangeText={setNewAddrValue}
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 12, fontSize: 14, color: 'rgba(0,0,0,0.9)', textAlignVertical: 'top', minHeight: 80, marginBottom: 16 }}
              placeholder="Enter full address..."
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setAddingAddr(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center' }}>
                <Text style={{ fontWeight: '500', color: 'rgba(0,0,0,0.7)' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (newAddrValue.trim()) {
                    setLocalAddresses(prev => [...prev, { label: newAddrLabel, value: newAddrValue.trim() }])
                    setAddingAddr(false)
                    setNewAddrValue('')
                  }
                }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 24, backgroundColor: '#D30AD7', alignItems: 'center' }}
              >
                <Text style={{ fontWeight: '600', color: '#fff' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Action buttons */}
      <View className="absolute bottom-6 left-0 right-0 px-4">
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 12, elevation: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Disposition', { customer: c, fromScreen })}
            style={{ flex: 1, backgroundColor: '#D30AD7', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }}>Add Feedback</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={!!activeSettlement}
            onPress={() => navigation.navigate('Settlement', { customer: c })}
            style={{ flex: 1, backgroundColor: '#1E293B', paddingVertical: 12, borderRadius: 12, alignItems: 'center', opacity: activeSettlement ? 0.35 : 1 }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{activeSettlement ? 'Settlement Active' : 'Settlement'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
