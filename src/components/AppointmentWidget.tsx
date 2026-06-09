import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Pressable } from 'react-native'
import { createAppointment, getAppointmentByAllocation, rescheduleAppointment, cancelAppointment } from '../api/allocations'

const TIME_SLOTS = [
  { label: 'Morning', sub: '9–12' },
  { label: 'Afternoon', sub: '12–4' },
  { label: 'Evening', sub: '4–7' },
]

const LOCATION_TYPES = ['Home', 'Work', 'Other']

interface Props {
  customer: any
  onAppointmentChange?: () => void
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function CalendarModal({ visible, onClose, onSelect }: {
  visible: boolean; onClose: () => void; onSelect: (date: string) => void
}) {
  const [calMonth, setCalMonth] = useState(() => new Date())
  const today = new Date(); today.setHours(0, 0, 0, 0)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
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
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: 'rgba(0,0,0,0.35)' }}>{d}</Text>
            ))}
          </View>
          {(() => {
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
                  d.setHours(0, 0, 0, 0)
                  const isDisabled = d < today
                  const dateStr = d.toISOString().split('T')[0]
                  return (
                    <Pressable
                      key={di}
                      disabled={isDisabled}
                      onPress={() => { onSelect(dateStr); onClose() }}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, color: isDisabled ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.85)' }}>{day}</Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            ))
          })()}
        </View>
      </View>
    </Modal>
  )
}

export default function AppointmentWidget({ customer, onAppointmentChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [appointment, setAppointment] = useState<any>(null)
  const [isRescheduling, setIsRescheduling] = useState(false)

  // Form state
  const [selectedAddress, setSelectedAddress] = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [locationType, setLocationType] = useState('Home')
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [calVisible, setCalVisible] = useState(false)

  const addresses = [
    customer.addressLine1 || customer.address,
    customer.addressLine2,
    customer.addressLine3,
  ].filter(Boolean)

  useEffect(() => {
    if (customer.id) {
      getAppointmentByAllocation(customer.id)
        .then(appt => { if (appt) setAppointment(appt) })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [customer.id])

  const resetForm = () => {
    setSelectedAddress('')
    setCustomAddress('')
    setLocationType('Home')
    setDate('')
    setTimeSlot('')
  }

  const handleSave = async () => {
    const addr = selectedAddress === 'custom' ? customAddress : selectedAddress
    if (!addr || !date || !timeSlot) {
      Alert.alert('Missing Fields', 'Please select address, date, and time slot')
      return
    }
    setSaving(true)
    try {
      if (isRescheduling && appointment) {
        const result = await rescheduleAppointment(appointment.id, { date, timeSlot, address: addr })
        setAppointment(result)
      } else {
        const result = await createAppointment({
          allocationId: customer.id,
          partyId: customer.partyId,
          partyName: customer.name || customer.partyName,
          address: addr,
          locationType,
          date,
          timeSlot,
          lat: customer.lat,
          lng: customer.lng,
        })
        setAppointment(result)
      }
      setIsRescheduling(false)
      resetForm()
      onAppointmentChange?.()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save appointment')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    Alert.alert('Cancel Appointment', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await cancelAppointment(appointment.id)
            setAppointment(null)
            onAppointmentChange?.()
          } catch (err: any) {
            Alert.alert('Error', err.message)
          }
        }
      },
    ])
  }

  const handleReschedule = () => {
    setIsRescheduling(true)
    setSelectedAddress(appointment.address)
    setDate('')
    setTimeSlot('')
  }

  if (loading) return null

  // Confirmed state (collapsed view)
  if (appointment && !isRescheduling) {
    return (
      <View className="bg-white rounded-[20px] px-4 py-3" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">📆</Text>
            <Text className="text-sm font-bold text-[rgba(0,0,0,0.9)]">Appointment</Text>
          </View>
          <View className="bg-[#E0F4E8] px-2.5 py-1 rounded-full">
            <Text className="text-[10px] font-semibold text-[#007E2F]">Confirmed</Text>
          </View>
        </View>
        <Text className="text-xs text-black/60 mb-1">
          {appointment.date} · 📆 {appointment.timeSlot} ({appointment.timeSlot === 'Morning' ? '9–12' : appointment.timeSlot === 'Afternoon' ? '12–4' : '4–7'})
        </Text>
        <Text className="text-xs text-black/50 mb-3" numberOfLines={2}>
          {appointment.locationType}: {appointment.address}
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={handleReschedule}
            className="flex-1 border-2 border-[#D30AD7] rounded-full py-2 items-center"
          >
            <Text className="text-[#D30AD7] text-xs font-semibold">Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCancel}
            className="flex-1 border-2 border-black/20 rounded-full py-2 items-center"
          >
            <Text className="text-[#CE1D26] text-xs font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Collapsed — no appointment
  if (!expanded && !isRescheduling) {
    return (
      <TouchableOpacity
        onPress={() => setExpanded(true)}
        className="bg-white rounded-[20px] px-4 py-3 flex-row items-center justify-between"
        style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-base">📆</Text>
          <Text className="text-sm font-bold text-[rgba(0,0,0,0.9)]">Appointment</Text>
        </View>
        <View className="bg-[#FAE2FA] px-3 py-1.5 rounded-full">
          <Text className="text-[#D30AD7] text-xs font-semibold">+ Confirm</Text>
        </View>
      </TouchableOpacity>
    )
  }

  // Expanded form
  return (
    <View className="bg-white rounded-[20px] px-4 py-4" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-base">📆</Text>
          <Text className="text-sm font-bold text-[rgba(0,0,0,0.9)]">Appointment</Text>
        </View>
        <TouchableOpacity onPress={() => setExpanded(true)}>
          <View className="bg-[#FAE2FA] px-3 py-1.5 rounded-full">
            <Text className="text-[#D30AD7] text-xs font-semibold">+ Confirm</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Select Address */}
      <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Select Address</Text>
      <View className="gap-2 mb-4">
        {addresses.map((addr, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelectedAddress(addr)}
            className="rounded-2xl px-3 py-2.5"
            style={{ borderWidth: 2, borderColor: selectedAddress === addr ? '#D30AD7' : 'rgba(0,0,0,0.08)', backgroundColor: selectedAddress === addr ? '#FAE2FA' : '#fff' }}
          >
            <Text className="text-xs text-[rgba(0,0,0,0.8)]" numberOfLines={2}>
              {LOCATION_TYPES[i] || 'Home'} {i > 0 ? i + 1 : ''}: {addr}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setSelectedAddress('custom')}
          className="rounded-2xl px-3 py-2.5"
          style={{ borderWidth: 2, borderColor: selectedAddress === 'custom' ? '#D30AD7' : 'rgba(0,0,0,0.08)', backgroundColor: selectedAddress === 'custom' ? '#FAE2FA' : '#fff' }}
        >
          <Text className="text-xs text-[rgba(0,0,0,0.8)]">✏️ Custom</Text>
        </TouchableOpacity>
        {selectedAddress === 'custom' && (
          <TextInput
            value={customAddress}
            onChangeText={setCustomAddress}
            placeholder="Enter custom address..."
            placeholderTextColor="rgba(0,0,0,0.3)"
            className="bg-[#F0F4F7] rounded-xl px-3 py-2.5 text-xs"
            style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
          />
        )}
      </View>

      {/* Location Type */}
      <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Location Type</Text>
      <View className="flex-row gap-2 mb-4">
        {LOCATION_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setLocationType(t)}
            className="px-4 py-2 rounded-full"
            style={{ borderWidth: 2, borderColor: locationType === t ? '#D30AD7' : 'rgba(0,0,0,0.08)', backgroundColor: locationType === t ? '#FAE2FA' : '#fff' }}
          >
            <Text className={`text-xs font-medium ${locationType === t ? 'text-[#D30AD7]' : 'text-black/50'}`}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Select Date */}
      <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Select Date</Text>
      <TouchableOpacity
        onPress={() => setCalVisible(true)}
        className="rounded-2xl px-3 py-2.5 mb-4 flex-row items-center gap-2"
        style={{ borderWidth: 1, borderColor: date ? '#D30AD7' : 'rgba(0,0,0,0.08)', backgroundColor: date ? '#FAE2FA' : '#fff' }}
      >
        <Text className="text-sm">📆</Text>
        <Text className={`text-xs ${date ? 'text-[#D30AD7] font-semibold' : 'text-black/30'}`}>
          {date ? formatDate(date) : 'Choose date'}
        </Text>
      </TouchableOpacity>
      <CalendarModal visible={calVisible} onClose={() => setCalVisible(false)} onSelect={setDate} />

      {/* Time Slot */}
      <Text className="text-[10px] text-black/40 uppercase tracking-wider font-medium mb-2">Time Slot</Text>
      <View className="flex-row gap-2 mb-5">
        {TIME_SLOTS.map(s => (
          <TouchableOpacity
            key={s.label}
            onPress={() => setTimeSlot(s.label)}
            className="flex-1 py-2.5 rounded-full items-center"
            style={{ borderWidth: 2, borderColor: timeSlot === s.label ? '#D30AD7' : 'rgba(0,0,0,0.08)', backgroundColor: timeSlot === s.label ? '#FAE2FA' : '#fff' }}
          >
            <Text className={`text-xs font-semibold ${timeSlot === s.label ? 'text-[#D30AD7]' : 'text-black/50'}`}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-full items-center bg-[#D30AD7] mb-2"
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text className="text-white text-sm font-bold">
            {isRescheduling ? 'Reschedule Appointment' : 'Save Appointment'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Cancel link */}
      <TouchableOpacity
        onPress={() => { setExpanded(false); setIsRescheduling(false); resetForm() }}
        className="items-center py-2"
      >
        <Text className="text-black/40 text-xs">Cancel</Text>
      </TouchableOpacity>
    </View>
  )
}
