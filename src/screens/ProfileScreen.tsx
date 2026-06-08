import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { getProfile, getLeaderboard, getCollectionSummary, AgentProfileResponse, LeaderboardEntry, CollectionSummary } from '../api/allocations'
import { getToken } from '../api/client'
import { getBranchLeaderboard, getAgentPerf } from '../data/leaderboard'

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>

const medals = ['🥇', '🥈', '🥉']

function fmtL(n: number) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr'
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n.toLocaleString('en-IN')
}

export default function ProfileScreen({ navigation }: Props) {
  const { agentInfo, setAgentInfo } = useAgent()
  const [profile, setProfile] = useState<AgentProfileResponse | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [collection, setCollection] = useState<CollectionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)

  const monthlyTarget = 2500000

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    Promise.all([getProfile(), getLeaderboard(), getCollectionSummary()])
      .then(([p, lb, col]) => {
        setProfile(p)
        setLeaderboard(lb)
        setCollection(col)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = profile?.stats
  const totalCases = stats?.totalCases ?? 0
  const totalEmiOs = stats?.totalEmiOs ?? 0

  const monthlyPl = collection?.totalPlAmt ?? 0
  const monthlyDeposited = collection?.totalCashDepositedAmt ?? 0
  const monthlyInhand = collection?.totalCashInhand ?? 0
  const monthlyCollected = collection?.total ?? 0
  const pct = Math.min(Math.round((monthlyCollected / monthlyTarget) * 100), 100)

  const agentName = (profile?.agent?.name ?? agentInfo?.name) || ''
  const nameParts = agentName.trim().split(/\s+/)
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : agentName.slice(0, 2).toUpperCase() || 'SF'

  const myAgentId = agentInfo?.agentId

  const rankRows = leaderboard.length > 0 ? leaderboard : (
    agentInfo?.branchCode ? getBranchLeaderboard(agentInfo.branchCode).map(r => ({
      agentId: r.username,
      name: r.name,
      username: r.username,
      totalCases: String(r.cases),
      totalEmiOs: '0',
      rank: r.rank,
    })) : []
  )

  const myRankEntry = rankRows.find(r => r.agentId === myAgentId)
  const myRank = myRankEntry?.rank ?? null
  const inTop5 = myRank !== null && myRank <= 5

  let displayList = rankRows.slice(0, 5)
  if (!inTop5 && myRankEntry) displayList = [...rankRows.slice(0, 4), myRankEntry]
  const fullList = showFullLeaderboard ? rankRows : displayList

  function handleLogout() {
    setAgentInfo(null)
    navigation.replace('Login')
  }

  return (
    <View className="flex-1 bg-[#F0F4F7]">
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
              <Text className="text-[rgba(0,0,0,0.9)] font-medium text-xl">{agentName || '—'}</Text>
              <Text className="text-black/50 text-sm mt-0.5">Collection Agent · Branch {profile?.agent?.branchCode ?? agentInfo?.branchCode ?? '—'}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#D30AD7" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>

          {/* Agent Details */}
          <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
            <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm mb-3">Agent Details</Text>
            <View className="gap-2">
              {[
                ['Employee ID', profile?.agent?.agentId ?? agentInfo?.agentId ?? '—'],
                ['Total Cases', String(totalCases)],
                ['Total Overdue', fmtL(totalEmiOs)],
                ['Branch', profile?.agent?.branchCode ?? agentInfo?.branchCode ?? '—'],
                ['Email', profile?.agent?.email ?? agentInfo?.email ?? '—'],
                ['Mobile', profile?.agent?.mobileNo ?? agentInfo?.mobileNo ?? '—'],
              ].map(([k, v]) => (
                <View key={k} className="flex-row justify-between">
                  <Text className="text-black/50 text-xs">{k}</Text>
                  <Text className="text-[rgba(0,0,0,0.9)] text-xs font-medium">{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bucket Breakdown */}
          {profile?.buckets && profile.buckets.length > 0 && (
            <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
              <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm mb-3">Portfolio by Bucket</Text>
              {profile.buckets.map(b => (
                <View key={b.bucket} className="flex-row justify-between py-1.5" style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                  <Text className="text-xs text-[rgba(0,0,0,0.8)]">{b.bucket}</Text>
                  <View className="flex-row gap-4">
                    <Text className="text-xs text-black/50">{b.count} cases</Text>
                    <Text className="text-xs font-medium text-[#CE1D26]">{fmtL(parseFloat(b.totalEmiOs || '0'))}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Monthly Performance */}
          <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
            <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm mb-3">Performance This Month</Text>
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className="text-xs text-black/50">
                {`${fmtL(monthlyCollected)} / ${fmtL(monthlyTarget)} target`}
              </Text>
              <Text className="text-xs font-medium text-[#D30AD7]">{pct}%</Text>
            </View>
            <View className="w-full bg-[#F0F4F7] rounded-full h-2.5 mb-4">
              <View className="bg-[#D30AD7] h-2.5 rounded-full" style={{ width: `${pct}%` }} />
            </View>
            <View className="flex-row gap-2">
              {[
                { label: 'PL Amount', value: monthlyPl, color: '#CE1D26' },
                { label: 'Deposited', value: monthlyDeposited, color: '#1DA462' },
                { label: 'In Hand', value: monthlyInhand, color: '#D30AD7' },
              ].map(({ label, value, color }) => (
                <View key={label} className="flex-1 bg-[#F0F4F7] rounded-2xl p-3 items-center gap-1">
                  <Text className="text-[10px] text-black/50 text-center">{label}</Text>
                  <Text className="text-xs font-semibold" style={{ color }}>{fmtL(value)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Leaderboard */}
          <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1 }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-medium text-[rgba(0,0,0,0.9)] text-sm">Branch Leaderboard</Text>
              <Text className="text-[10px] text-black/40">{rankRows.length} agents</Text>
            </View>

            {rankRows.length === 0 ? (
              <Text className="text-center text-black/40 text-xs py-2">No leaderboard data yet</Text>
            ) : (
              <>
                <View className="flex-row px-3 mb-1">
                  <Text className="text-[10px] text-black/40 w-8">Rank</Text>
                  <Text className="text-[10px] text-black/40 flex-1">Agent</Text>
                  <Text className="text-[10px] text-black/40">Cases</Text>
                </View>
                <View className="gap-1.5">
                  {fullList.map((row) => {
                    const isMe = row.agentId === myAgentId
                    return (
                      <View
                        key={row.agentId}
                        className={`flex-row items-center gap-2 px-3 py-2.5 rounded-xl ${isMe ? 'bg-[#FAE2FA]' : 'bg-[#F0F4F7]'}`}
                        style={isMe ? { borderWidth: 1, borderColor: 'rgba(211,10,215,0.30)' } : {}}
                      >
                        <View className="w-8 flex-row items-center gap-1">
                          {row.rank <= 3 ? (
                            <Text className="text-base leading-none">{medals[row.rank - 1]}</Text>
                          ) : (
                            <Text className={`text-xs font-medium ${isMe ? 'text-[#D30AD7]' : 'text-black/40'}`}>#{row.rank}</Text>
                          )}
                        </View>
                        <Text
                          className={`text-sm flex-1 font-medium ${isMe ? 'text-[#A008A3]' : 'text-[rgba(0,0,0,0.7)]'}`}
                          numberOfLines={1}
                        >
                          {row.name || row.username}{isMe ? ' (You)' : ''}
                        </Text>
                        <Text className={`text-sm font-medium ${isMe ? 'text-[#D30AD7]' : 'text-[rgba(0,0,0,0.7)]'}`}>
                          {row.totalCases}
                        </Text>
                      </View>
                    )
                  })}
                </View>
                {rankRows.length > 5 && (
                  <TouchableOpacity
                    onPress={() => setShowFullLeaderboard(v => !v)}
                    className="w-full mt-3 py-2 rounded-full items-center"
                    style={{ borderWidth: 1, borderColor: '#D30AD7' }}
                  >
                    <Text className="text-xs font-medium text-[#D30AD7]">
                      {showFullLeaderboard ? 'Show Less ↑' : `View All ${rankRows.length} Agents ↓`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            className="w-full bg-[#F9E4E5] rounded-full py-3 items-center mb-6"
          >
            <Text className="text-[#CE1D26] font-medium text-sm">Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  )
}
