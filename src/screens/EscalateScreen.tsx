import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'

type Props = NativeStackScreenProps<RootStackParamList, 'Escalate'>

type Category = {
  id: string
  icon: string
  title: string
  subtitle: string
  fields: Field[]
}

type Field = {
  key: string
  label: string
  placeholder: string
  multiline?: boolean
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address'
}

// User (customer)-level escalations only. Raised from a specific customer's detail page.
const CATEGORIES: Category[] = [
  {
    id: 'user_fraud',
    icon: '🚨',
    title: 'Report User Fraud',
    subtitle: 'Flag suspicious or fraudulent activity by this customer',
    fields: [
      { key: 'fraud_type', label: 'Fraud Type', placeholder: 'e.g. Identity theft, Fake payment receipt...' },
      { key: 'description', label: 'Description', placeholder: 'Describe what happened in detail...', multiline: true },
      { key: 'evidence', label: 'Evidence / Reference', placeholder: 'Receipt no., transaction ID, etc.' },
    ],
  },
  {
    id: 'incorrect_details',
    icon: '📝',
    title: 'Incorrect User Details',
    subtitle: 'Report wrong name, contact, address or loan data',
    fields: [
      { key: 'field', label: 'Which detail is wrong?', placeholder: 'e.g. Mobile number, Address, Name' },
      { key: 'correct_value', label: 'Correct Value (if known)', placeholder: 'What it should be' },
      { key: 'remarks', label: 'Remarks', placeholder: 'Any additional context...', multiline: true },
    ],
  },
  {
    id: 'other',
    icon: '💬',
    title: 'Other Feedback',
    subtitle: 'Anything else about this customer',
    fields: [
      { key: 'subject', label: 'Subject', placeholder: 'What is this about?' },
      { key: 'feedback', label: 'Feedback', placeholder: 'Share your feedback...', multiline: true },
    ],
  },
]

export default function EscalateScreen({ navigation, route }: Props) {
  const { agentInfo } = useAgent()
  const customer = route.params?.customer
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const selected = CATEGORIES.find(c => c.id === selectedId)

  function setValue(key: string, val: string) {
    setFormValues(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit() {
    if (!selected) return
    const missing = selected.fields.filter(f => !f.multiline && !formValues[f.key]?.trim())
    if (missing.length > 0) {
      Alert.alert('Required', `Please fill: ${missing.map(f => f.label).join(', ')}`)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <View className="flex-1 bg-[#F0F4F7] items-center justify-center px-8">
        <View className="bg-white rounded-2xl p-8 items-center gap-4 w-full" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}>
          <View className="w-16 h-16 rounded-full bg-[#DCFCE7] items-center justify-center">
            <Text style={{ fontSize: 28 }}>✅</Text>
          </View>
          <Text className="text-[rgba(0,0,0,0.9)] text-lg font-semibold text-center">Request Submitted</Text>
          <Text className="text-black/50 text-sm text-center leading-relaxed">
            Your {selected?.title.toLowerCase()} request has been sent to ops. You'll be notified once actioned.
          </Text>
          <View className="bg-[#F0F4F7] rounded-xl px-4 py-3 w-full">
            <Text className="text-[10px] text-black/40 uppercase tracking-wide font-medium mb-1">Reference</Text>
            <Text className="text-xs font-mono text-black/70">ESC-{Date.now().toString().slice(-8)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-full bg-[#D30AD7] py-3.5 rounded-full items-center mt-2"
          >
            <Text className="text-white font-medium text-sm">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#F0F4F7]" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => { if (selectedId) { setSelectedId(null); setFormValues({}) } else navigation.goBack() }} className="w-9 h-9 items-center justify-center">
            <Text className="text-black/60 text-xl">←</Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[rgba(0,0,0,0.9)] font-semibold text-base">
              {selected ? selected.title : 'Escalate'}
            </Text>
            {customer && (
              <Text className="text-black/40 text-[10px]" numberOfLines={1}>{customer.name} · {customer.partyId}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!selectedId ? (
          <>
            <Text className="text-black/40 text-xs mb-4 leading-relaxed">
              Select the type of request. Your submission goes directly to the ops team and branch head.
            </Text>
            <View className="gap-3">
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => { setSelectedId(cat.id); setFormValues({}) }}
                  className="bg-white rounded-2xl px-4 py-4 flex-row items-center gap-4"
                  style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                >
                  <View className="w-11 h-11 rounded-xl bg-[#F0F4F7] items-center justify-center">
                    <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[rgba(0,0,0,0.9)] font-semibold text-sm">{cat.title}</Text>
                    <Text className="text-black/40 text-xs mt-0.5">{cat.subtitle}</Text>
                  </View>
                  <Text className="text-black/30 text-base">›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : selected ? (
          <View className="gap-4">
            {/* Category header card */}
            <View className="bg-white rounded-2xl px-4 py-4 flex-row items-center gap-4" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View className="w-11 h-11 rounded-xl bg-[#FAE2FA] items-center justify-center">
                <Text style={{ fontSize: 20 }}>{selected.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[rgba(0,0,0,0.9)] font-semibold text-sm">{selected.title}</Text>
                <Text className="text-black/40 text-xs mt-0.5">{selected.subtitle}</Text>
              </View>
            </View>

            {/* Agent info read-only */}
            <View className="bg-white rounded-2xl px-4 py-4 gap-3" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <Text className="text-[10px] text-black/40 uppercase tracking-wide font-medium">Agent Details</Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[10px] text-black/30 mb-0.5">Name</Text>
                  <Text className="text-xs text-black/80 font-medium">{agentInfo?.name ?? '—'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-black/30 mb-0.5">Branch</Text>
                  <Text className="text-xs text-black/80 font-medium">{agentInfo?.branch ?? '—'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-black/30 mb-0.5">Emp ID</Text>
                  <Text className="text-xs font-mono text-black/80">{agentInfo?.employeeCode ?? '—'}</Text>
                </View>
              </View>
            </View>

            {/* Form fields */}
            <View className="bg-white rounded-2xl px-4 py-4 gap-5" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              {selected.fields.map(field => (
                <View key={field.key}>
                  <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-2">{field.label}</Text>
                  <TextInput
                    value={formValues[field.key] ?? ''}
                    onChangeText={v => setValue(field.key, v)}
                    placeholder={field.placeholder}
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    keyboardType={field.keyboardType ?? 'default'}
                    multiline={field.multiline}
                    numberOfLines={field.multiline ? 3 : 1}
                    style={{
                      borderBottomWidth: field.multiline ? 0 : 1,
                      borderBottomColor: 'rgba(0,0,0,0.12)',
                      borderWidth: field.multiline ? 1 : 0,
                      borderColor: field.multiline ? 'rgba(0,0,0,0.1)' : undefined,
                      borderRadius: field.multiline ? 10 : 0,
                      paddingHorizontal: field.multiline ? 10 : 0,
                      paddingVertical: field.multiline ? 8 : 10,
                      fontSize: 13,
                      color: 'rgba(0,0,0,0.85)',
                      minHeight: field.multiline ? 72 : undefined,
                      textAlignVertical: field.multiline ? 'top' : 'auto',
                    }}
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              className="w-full bg-[#D30AD7] py-4 rounded-full items-center mt-2"
            >
              <Text className="text-white font-medium text-sm">Submit Request →</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
