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
  const [role, setRole] = useState('Collections')
  const [portfolioType, setPortfolioType] = useState<'bank' | 'slice'>('bank')
  const { setAgentInfo } = useAgent()

  function handleLogin() {
    const agent = findAgent(empId)
    const pt = role === 'Collections' ? portfolioType : 'bank'
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
        portfolioType: pt,
      })
    } else {
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
        portfolioType: pt,
      })
    }
    if (role === 'Collections') {
      navigation.replace('Main')
    } else {
      navigation.replace('SalesMain')
    }
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
          <Text className="text-[rgba(0,0,0,0.9)] text-xl font-medium mb-8">Field Agent Login</Text>

          {/* Employee ID */}
          <View className="mb-8">
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-2">Employee ID</Text>
            <TextInput
              value={empId}
              onChangeText={setEmpId}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your employee ID"
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="w-full bg-transparent py-3 text-sm text-[rgba(0,0,0,0.9)]"
              style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
            />
          </View>

          {/* Password */}
          <View className="mb-8">
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-2">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter password"
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="w-full bg-transparent py-3 text-sm text-[rgba(0,0,0,0.9)]"
              style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
            />
          </View>

          {/* Role toggle */}
          <View className="mb-5">
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-2">Role</Text>
            <View className="flex-row gap-3">
              {['Collections', 'Sales'].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  className={`flex-1 py-3.5 rounded-full items-center ${role === r ? 'bg-[#D30AD7]' : 'bg-white border border-black/10'}`}
                >
                  <Text className={`text-sm font-medium ${role === r ? 'text-white' : 'text-[rgba(0,0,0,0.7)]'}`}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Portfolio type — only for Collections */}
          {role === 'Collections' && (
            <View className="mb-8">
              <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-2">Portfolio</Text>
              <View className="flex-row gap-3">
                {([['bank', 'Bank', 'Field collections'], ['slice', 'Slice', 'CC & Borrow']] as const).map(([val, label, sub]) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setPortfolioType(val)}
                    className={`flex-1 py-3 rounded-2xl items-center border ${portfolioType === val ? 'bg-[#D30AD7] border-[#D30AD7]' : 'bg-white border-black/10'}`}
                  >
                    <Text className={`text-sm font-semibold ${portfolioType === val ? 'text-white' : 'text-[rgba(0,0,0,0.8)]'}`}>{label}</Text>
                    <Text className={`text-[10px] mt-0.5 ${portfolioType === val ? 'text-white/70' : 'text-black/40'}`}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            className="w-full mt-2 bg-[#D30AD7] py-4 rounded-full items-center"
          >
            <Text className="text-white font-medium text-sm">Login →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
