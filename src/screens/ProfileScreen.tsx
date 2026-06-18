import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { getBranchLeaderboard, getAgentPerf } from '../data/leaderboard'
import { ACTIVITY_LOG } from '../data/activityLog'
import { ALL_CUSTOMERS } from '../data/customers'

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const medals = ['🥇', '🥈', '🥉']

function fmtL(n: number) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr'
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n.toLocaleString('en-IN')
}

export default function ProfileScreen({ navigation }: Props) {
  const { agentInfo, setAgentInfo } = useAgent()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)

  const localPerf = agentInfo?.username ? getAgentPerf(agentInfo.username) : null

  useEffect(() => {
    if (!agentInfo?.username) return
    const local = getBranchLeaderboard(agentInfo?.branch || '')
    setLeaderboard(local)
  }, [agentInfo?.username, agentInfo?.branch])

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

  const myUsername = agentInfo?.username
  const myEntry = leaderboard.find(r => r.username === myUsername)
  const myRank = myEntry?.rank ?? null

  const myHistory = ACTIVITY_LOG
    .filter((a: any) => a.username === myUsername && a.latestDisposition)
    .map((a: any) => {
      const cust = ALL_CUSTOMERS.find((c: any) => c.partyId === a.partyId)
      return {
        name: cust?.name || a.partyId,
        type: a.latestDisposition!.type,
        code: a.latestDisposition!.code,
        date: a.latestDisposition!.date,
        amount: a.collections.reduce((s: number, x: any) => s + x.amount, 0),
      }
    })
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 10)
  const inTop5 = myRank !== null && myRank <= 5

  let displayList = leaderboard.slice(0, 5)
  if (!inTop5 && myEntry) {
    displayList = [...leaderboard.slice(0, 4), myEntry]
  }
  const fullList = showFullLeaderboard ? leaderboard : displayList

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

        {/* Leaderboard */}
        <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm">Branch Leaderboard · June</Text>
            <Text className="text-[10px] text-black/40">{leaderboard.length} agents</Text>
          </View>

          {leaderboard.length === 0 ? (
            <Text className="text-center text-black/40 text-xs py-2">Loading leaderboard...</Text>
          ) : (
            <>
              <View className="flex-row px-3 mb-1">
                <Text className="text-[10px] text-black/40 w-8">Rank</Text>
                <Text className="text-[10px] text-black/40 flex-1">Agent</Text>
                <Text className="text-[10px] text-black/40">Collected</Text>
              </View>
              <View className="gap-1.5">
                {fullList.map((row: any) => {
                  const isMe = row.username === myUsername
                  const rank = row.rank
                  return (
                    <View
                      key={row.username}
                      className={`flex-row items-center gap-2 px-3 py-2.5 rounded-xl ${isMe ? 'bg-[#FAE2FA]' : 'bg-[#F0F4F7]'}`}
                      style={isMe ? { borderWidth: 1, borderColor: 'rgba(211,10,215,0.30)' } : {}}
                    >
                      <View className="w-8 flex-row items-center gap-1">
                        {rank <= 3 ? (
                          <Text className="text-base leading-none">{medals[rank - 1]}</Text>
                        ) : (
                          <Text className={`text-xs font-medium ${isMe ? 'text-[#D30AD7]' : 'text-black/40'}`}>#{rank}</Text>
                        )}
                      </View>
                      <Text className={`text-sm flex-1 font-medium ${isMe ? 'text-[#A008A3]' : 'text-[rgba(0,0,0,0.7)]'}`} numberOfLines={1}>
                        {row.name || row.username}{isMe ? ' (You)' : ''}
                      </Text>
                      <Text className={`text-sm font-medium ${isMe ? 'text-[#D30AD7]' : 'text-[rgba(0,0,0,0.7)]'}`}>
                        {row.collected > 0 ? fmtL(row.collected) : '₹0'}
                      </Text>
                    </View>
                  )
                })}
              </View>
              {leaderboard.length > 5 && (
                <TouchableOpacity
                  onPress={() => setShowFullLeaderboard(v => !v)}
                  className="w-full mt-3 py-2 rounded-full items-center"
                  style={{ borderWidth: 1, borderColor: '#D30AD7' }}
                >
                  <Text className="text-xs font-medium text-[#D30AD7]">
                    {showFullLeaderboard ? 'Show Less ↑' : `View All ${leaderboard.length} Agents ↓`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Recent Disposition Activity */}
        {myHistory.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 16, elevation: 1 }}>
            <Text style={{ fontWeight: '600', color: 'rgba(0,0,0,0.9)', fontSize: 14, marginBottom: 12 }}>Recent Activity</Text>
            {myHistory.map((item: any, i: number) => {
              const dotColor = item.type === 'Collected' ? '#00A63E' : item.type === 'Contacted Positive' ? '#2B6ACF' : item.type === 'Contacted Negative' ? '#A35300' : 'rgba(0,0,0,0.3)'
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: i < myHistory.length - 1 ? 12 : 0 }}>
                  <View style={{ alignItems: 'center', marginTop: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
                    {i < myHistory.length - 1 && <View style={{ width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.08)', marginTop: 3 }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.85)', flex: 1 }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', marginLeft: 8 }}>{item.date}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: dotColor, fontWeight: '500', marginTop: 1 }}>{item.code}</Text>
                    {item.amount > 0 && <Text style={{ fontSize: 11, color: '#00A63E', fontWeight: '600', marginTop: 1 }}>+{fmtL(item.amount)}</Text>}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Escalate */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Escalate', { customer: null })}
          className="w-full bg-[#FAE2FA] rounded-full py-3 items-center mb-3"
        >
          <Text className="text-[#A008A3] font-medium text-sm">🚨 Escalate / Raise Request</Text>
        </TouchableOpacity>

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
