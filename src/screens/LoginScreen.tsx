import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { findAgent } from '../data/agents'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Bank')
  const { setAgentInfo } = useAgent()

  function handleLogin() {
    const agent = findAgent(empId)
    if (agent) {
      setAgentInfo({
        id: agent.employeeCode,
        username: agent.username,
        name: agent.name,
        branch: agent.branch,
        region: agent.region || '',
        role: role,
        glCode: (agent as any).glCode || '11799',
        employeeCode: (agent as any).employeeCode || empId,
        lat: agent.lat || 27.4728,
        lng: agent.lng || 94.9120,
      })
    } else {
      // Fallback agent for demo
      setAgentInfo({
        id: empId || 'demo',
        username: empId || 'agent001',
        name: empId || 'Field Agent',
        branch: 'TINSUKIA',
        region: 'NORTH EAST',
        role: role,
        glCode: '11799',
        employeeCode: empId || 'EMP001',
        lat: 27.4728,
        lng: 94.9120,
      })
    }
    navigation.replace('Main')
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Branding */}
        <View className="items-center pt-16 pb-10 px-6">
          <View className="w-16 h-16 rounded-full bg-[#FAE2FA] items-center justify-center mb-4">
            <Text className="text-[#A008A3] text-2xl font-black">S</Text>
          </View>
          <Text className="text-[rgba(0,0,0,0.9)] text-3xl font-medium tracking-tight">SliceField</Text>
          <Text className="text-[rgba(0,0,0,0.5)] text-sm mt-1">Slice Small Finance Bank</Text>
          <View className="flex-row items-center gap-2 mt-3">
            <View className="w-2 h-2 rounded-full bg-[#00A63E]" />
            <Text className="text-[#00A63E] text-xs">Online — All systems operational</Text>
          </View>
        </View>

        {/* Form area */}
        <View className="flex-1 bg-[#F0F4F7] rounded-t-3xl px-6 pt-8 pb-10">
          <Text className="text-[rgba(0,0,0,0.9)] text-xl font-medium mb-6">Field Agent Login</Text>

          {/* Employee ID */}
          <View className="mb-5">
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Employee ID</Text>
            <TextInput
              value={empId}
              onChangeText={setEmpId}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your employee ID"
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="w-full bg-transparent py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
              style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
            />
          </View>

          {/* Password */}
          <View className="mb-5">
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter password"
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="w-full bg-transparent py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
              style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
            />
          </View>

          {/* Role toggle */}
          <View className="mb-5">
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Role</Text>
            <View className="flex-row gap-3">
              {['Bank', 'Slice'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  className={`flex-1 py-3 rounded-full items-center ${role === r ? 'bg-[#D30AD7]' : 'bg-white border border-black/10'}`}
                >
                  <Text className={`text-sm font-medium ${role === r ? 'text-white' : 'text-[rgba(0,0,0,0.7)]'}`}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-xs text-[rgba(0,0,0,0.5)] mt-1.5">Bank = NESFB Field Agent · Slice = Consumer Collections</Text>
          </View>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            className="w-full mt-8 bg-[#D30AD7] py-4 rounded-full items-center"
          >
            <Text className="text-white font-medium text-sm">Login →</Text>
          </TouchableOpacity>

          {/* Hint */}
          <View className="mt-6 bg-[#FAE2FA] border border-[#D30AD7]/20 rounded-3xl p-3">
            <Text className="text-xs text-[#A008A3] font-medium">Field Agent Login</Text>
            <Text className="text-xs text-[rgba(0,0,0,0.5)] mt-0.5">Enter your agent username and password 000000</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
