import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { getAgentPerf } from '../data/leaderboard'

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']


export default function ProfileScreen({ navigation }: Props) {
  const { agentInfo, setAgentInfo } = useAgent()

  const localPerf = agentInfo?.username ? getAgentPerf(agentInfo.username) : null

  const weeklyTarget    = localPerf?.weeklyTarget    ?? 2000000
  const weeklyCollected = localPerf?.weeklyCollected ?? 0
  const barHeights      = localPerf?.dailyBar        ?? [0,0,0,0,0,0]
  const pct = Math.round((weeklyCollected / weeklyTarget) * 100)

  function handleLogout() {
    setAgentInfo(null)
    navigation.replace('Login')
  }

  const initials = agentInfo?.name
    ? agentInfo.name.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()
    : 'SF'

  const todayIdx = (new Date().getDay() + 6) % 7

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      {/* Header */}
      <SafeAreaView className="bg-white" edges={['top']}>
        <View className="px-4 pb-6" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-3">
            <Text className="text-black/70 text-xl">←</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-[#FAE2FA] items-center justify-center">
              <Text className="text-[#A008A3] font-bold text-2xl">{initials}</Text>
            </View>
            <View>
              <Text className="text-[rgba(0,0,0,0.9)] font-medium text-xl">{agentInfo?.name || '—'}</Text>
              <Text className="text-black/50 text-sm mt-0.5">{agentInfo?.branch || '—'}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {/* Agent Details */}
        <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
          <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm mb-3">Agent Details</Text>
          <View className="gap-2">
            {[
              ['Total Cases', localPerf ? String(localPerf.totalCases) : '—'],
              ['Total Overdue', localPerf ? localPerf.totalOverdueFormatted : '—'],
              ['Branch', agentInfo?.branch || localPerf?.branch || '—'],
              ['Region', localPerf?.region || agentInfo?.region || '—'],
              ['Zone', localPerf?.zone || '—'],
              ['Reporting To', localPerf?.reportingTo || '—'],
              ['Employee Code', agentInfo?.employeeCode || localPerf?.employeeCode || '—'],
            ].map(([k, v]) => (
              <View key={k} className="flex-row justify-between">
                <Text className="text-black/50 text-xs">{k}</Text>
                <Text className="text-[rgba(0,0,0,0.9)] text-xs font-medium">{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance */}
        <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
          <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm mb-3">Performance This Week</Text>
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-xs text-black/50">
              {`₹${(weeklyCollected / 100000).toFixed(1)}L / ₹${(weeklyTarget / 100000).toFixed(0)}L target`}
            </Text>
            <Text className="text-xs font-medium text-[#D30AD7]">{pct}%</Text>
          </View>
          <View className="w-full bg-[#F0F4F7] rounded-full h-2.5 mb-4">
            <View className="bg-[#D30AD7] h-2.5 rounded-full" style={{ width: `${pct}%` }} />
          </View>

          {/* Bar chart */}
          <View className="flex-row items-end gap-1.5 h-16">
            {days.map((day, i) => {
              const isToday = i === todayIdx
              const isFuture = i > todayIdx
              return (
                <View key={day} className="flex-1 items-center gap-1">
                  <View className="w-full items-end justify-center" style={{ height: 48, justifyContent: 'flex-end' }}>
                    <View
                      className="w-full rounded-t"
                      style={{
                        height: `${barHeights[i]}%`,
                        minHeight: barHeights[i] > 0 ? 4 : 0,
                        backgroundColor: isToday ? '#D30AD7' : isFuture ? '#EAEBED' : '#FAE2FA',
                      }}
                    />
                  </View>
                  <Text className={`text-[10px] font-medium ${isToday ? 'text-[#D30AD7]' : 'text-black/40'}`}>{day}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="w-full bg-[#F9E4E5] rounded-full py-3 items-center mb-6"
        >
          <Text className="text-[#CE1D26] font-medium text-sm">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
