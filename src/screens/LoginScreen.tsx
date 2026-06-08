import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { login } from '../api/auth'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAgentInfo, setToken } = useAgent()

  async function handleLogin() {
    if (!empId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter employee ID and password')
      return
    }
    setLoading(true)
    try {
      const res = await login(empId.trim(), password)
      setToken(res.accessToken)
      setAgentInfo({
        agentId: res.agent.agentId,
        name: res.agent.name,
        email: res.agent.email,
        branchCode: res.agent.branchCode,
        mobileNo: res.agent.mobileNo,
        lat: 27.4728,
        lng: 94.9120,
      })
      navigation.replace('Main')
    } catch (e: any) {
      Alert.alert('Login failed', e.message ?? 'Invalid credentials')
    } finally {
      setLoading(false)
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

        {/* Form */}
        <View className="flex-1 bg-[#F0F4F7] rounded-t-3xl px-6 pt-8 pb-10">
          <Text className="text-[rgba(0,0,0,0.9)] text-xl font-medium mb-8">Field Agent Login</Text>

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

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="w-full mt-2 bg-[#D30AD7] py-4 rounded-full items-center"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-medium text-sm">Login →</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
