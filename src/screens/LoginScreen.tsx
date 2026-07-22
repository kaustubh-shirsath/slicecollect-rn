import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { findAgent } from '../data/agents'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const { setAgentInfo } = useAgent()

  const canSubmit = username.trim().length > 0 && password.length > 0

  function handleLogin() {
    setError('')
    const agent = findAgent(username.trim())
    if (!agent || agent.password !== password) {
      setError('Invalid username or password')
      return
    }
    setAgentInfo({
      id: agent.employeeCode,
      username: agent.username,
      name: agent.name,
      branch: agent.branch,
      region: agent.region || '',
      role: agent.role === 'Sales' ? 'Sales' : 'Collections',
      glCode: agent.glCode || '11799',
      employeeCode: agent.employeeCode,
      lat: agent.lat || 27.4728,
      lng: agent.lng || 94.9120,
      portfolioType: 'all',
    })
    navigation.replace(agent.role === 'Sales' ? 'SalesMain' : 'Main')
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F0F4F7]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
        {/* Brand block — pulse wordmark + heartbeat line */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 46, fontWeight: '800', color: '#D30AD7', letterSpacing: -2 }}>pulse</Text>
            <Text style={{ fontSize: 46, fontWeight: '800', color: '#D30AD7' }}>.</Text>
          </View>
          {/* heartbeat pulse line */}
          <Svg width={140} height={26} viewBox="0 0 140 26" style={{ marginTop: 6 }}>
            <Path
              d="M0 13 H40 L48 4 L58 22 L68 13 H140"
              stroke="#D30AD7" strokeWidth={2.5} fill="none"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </Svg>
          <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Field Collections</Text>
        </View>

        {/* Sign-in card */}
        <View
          style={{ backgroundColor: '#fff', borderRadius: 28, paddingHorizontal: 24, paddingVertical: 28, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(0,0,0,0.9)', marginBottom: 22 }}>Sign in to continue</Text>

          {/* Username */}
          <View style={{ marginBottom: 18 }}>
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider" style={{ marginBottom: 8 }}>Username</Text>
            <TextInput
              value={username}
              onChangeText={v => { setUsername(v); setError('') }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Username or employee ID"
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="w-full bg-[#F0F4F7] rounded-[24px] px-5 py-4 text-sm text-[rgba(0,0,0,0.9)]"
              style={{ borderWidth: 1, borderColor: error ? 'rgba(206,29,38,0.4)' : 'rgba(0,0,0,0.06)' }}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: 12 }}>
            <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider" style={{ marginBottom: 8 }}>Password</Text>
            <View
              className="flex-row items-center bg-[#F0F4F7] rounded-[24px] pr-2"
              style={{ borderWidth: 1, borderColor: error ? 'rgba(206,29,38,0.4)' : 'rgba(0,0,0,0.06)' }}
            >
              <TextInput
                value={password}
                onChangeText={v => { setPassword(v); setError('') }}
                secureTextEntry={!showPassword}
                placeholder="Enter password"
                placeholderTextColor="rgba(0,0,0,0.3)"
                className="flex-1 px-5 py-4 text-sm text-[rgba(0,0,0,0.9)]"
                onSubmitEditing={canSubmit ? handleLogin : undefined}
              />
              <TouchableOpacity onPress={() => setShowPassword(s => !s)} className="px-2 py-2">
                <Text className="text-[11px] text-[#A008A3] font-medium">{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View className="bg-[#F9E4E5] rounded-xl px-3 py-2 mb-2">
              <Text className="text-xs text-[#CE1D26]">{error}</Text>
            </View>
          ) : null}

          {/* Forgot password */}
          <TouchableOpacity onPress={() => { setShowForgot(true); setForgotSent(false) }} className="self-end" style={{ marginBottom: 28 }}>
            <Text className="text-xs text-[#A008A3] font-medium">Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign in */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={!canSubmit}
            className={`w-full py-4 rounded-full items-center ${canSubmit ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
          >
            <Text className={`font-medium text-sm ${canSubmit ? 'text-white' : 'text-black/40'}`}>Sign in</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center gap-3" style={{ marginVertical: 28 }}>
            <View className="flex-1 h-px bg-black/[0.08]" />
            <Text className="text-[11px] text-black/35">or</Text>
            <View className="flex-1 h-px bg-black/[0.08]" />
          </View>

          {/* Microsoft SSO — UI layer only */}
          <TouchableOpacity
            onPress={() => {}}
            className="w-full py-3.5 rounded-full items-center bg-[#F0F4F7] flex-row justify-center gap-2.5"
            style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
          >
            <View style={{ width: 16, height: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ width: 7, height: 7, backgroundColor: '#F25022', marginRight: 2, marginBottom: 2 }} />
              <View style={{ width: 7, height: 7, backgroundColor: '#7FBA00', marginBottom: 2 }} />
              <View style={{ width: 7, height: 7, backgroundColor: '#00A4EF', marginRight: 2 }} />
              <View style={{ width: 7, height: 7, backgroundColor: '#FFB900' }} />
            </View>
            <Text className="text-sm font-medium text-[rgba(0,0,0,0.75)]">Sign in with Microsoft</Text>
          </TouchableOpacity>
        </View>

        {/* Bank name pinned to bottom */}
        <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
          <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', letterSpacing: 0.3 }}>Slice Small Finance Bank</Text>
        </View>
      </ScrollView>

      {/* Forgot Password Modal — UI layer only */}
      <Modal visible={showForgot} transparent animationType="slide" onRequestClose={() => setShowForgot(false)}>
        <TouchableOpacity className="flex-1 justify-end bg-black/40" activeOpacity={1} onPress={() => setShowForgot(false)}>
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl px-6 pt-5 pb-10" style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
            <View className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-5" />
            {forgotSent ? (
              <View className="items-center py-4">
                <Text className="text-4xl mb-3">📩</Text>
                <Text className="text-base font-semibold text-[rgba(0,0,0,0.9)] mb-1">Reset link sent</Text>
                <Text className="text-xs text-black/45 text-center leading-relaxed mb-6">
                  If an account exists for this username, a password reset link has been sent to the registered email/mobile.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowForgot(false)}
                  className="w-full bg-[#090B0C] rounded-full py-3.5 items-center"
                >
                  <Text className="text-white text-sm font-medium">Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text className="text-base font-semibold text-[rgba(0,0,0,0.9)] mb-1">Forgot password</Text>
                <Text className="text-xs text-black/45 mb-5 leading-relaxed">
                  Enter your username or employee ID. We'll send a reset link to your registered email/mobile.
                </Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholder="Username or employee ID"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  className="w-full bg-[#F0F4F7] rounded-[24px] px-4 py-3 text-sm text-[rgba(0,0,0,0.9)] mb-5"
                  style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}
                />
                <TouchableOpacity
                  onPress={() => setForgotSent(true)}
                  disabled={!username.trim()}
                  className={`w-full rounded-full py-3.5 items-center ${username.trim() ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
                >
                  <Text className={`text-sm font-medium ${username.trim() ? 'text-white' : 'text-black/40'}`}>Send reset link</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}
