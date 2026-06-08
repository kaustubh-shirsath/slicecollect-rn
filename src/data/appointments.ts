export type TimeSlot = 'morning' | 'afternoon' | 'evening'

export interface Appointment {
  id: string
  partyId: string
  module: 'collections' | 'sales'
  date: string           // YYYY-MM-DD
  timeSlot: TimeSlot
  addressLabel: string   // 'Home' | 'Home 2' | 'Home 3' | 'Custom'
  address: string
  location?: { lat: number; lng: number }
  confirmedAt: number
  agentUsername: string
}

const APPOINTMENTS: Appointment[] = []

export function getAppointments(agentUsername: string): Appointment[] {
  return APPOINTMENTS.filter(a => a.agentUsername === agentUsername)
}

export function getAppointmentForCustomer(partyId: string): Appointment | undefined {
  return APPOINTMENTS.find(a => a.partyId === partyId)
}

export function setAppointment(appt: Omit<Appointment, 'id' | 'confirmedAt'>): Appointment {
  const existing = APPOINTMENTS.findIndex(a => a.partyId === appt.partyId && a.module === appt.module)
  const newAppt: Appointment = {
    ...appt,
    id: `${appt.partyId}_${Date.now()}`,
    confirmedAt: Date.now(),
  }
  if (existing >= 0) {
    APPOINTMENTS[existing] = newAppt
  } else {
    APPOINTMENTS.push(newAppt)
  }
  return newAppt
}

export function cancelAppointment(partyId: string): void {
  const idx = APPOINTMENTS.findIndex(a => a.partyId === partyId)
  if (idx >= 0) APPOINTMENTS.splice(idx, 1)
}

export function getTimeSlotLabel(slot: TimeSlot): string {
  if (slot === 'morning') return '🌅 Morning (9–12)'
  if (slot === 'afternoon') return '☀️ Afternoon (12–4)'
  return '🌆 Evening (4–7)'
}
