import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { getOverallLeaderboard } from '../data/leaderboard'


function fmtL(n: number) {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr'
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'
  return '₹' + n.toLocaleString('en-IN')
}

// Top 10 by monthly collections. If my rank > 10, drop row 10 and append my row with real rank.
export default function LeaderboardCard({ myUsername }: { myUsername?: string }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLeaderboard(getOverallLeaderboard())
  }, [myUsername])

  const myEntry = leaderboard.find(r => r.username === myUsername)
  const limit = expanded ? 10 : 5
  const isInTop = myEntry ? myEntry.rank <= limit : false
  const displayList = isInTop
    ? leaderboard.slice(0, limit)
    : [
        ...leaderboard.slice(0, limit - 1),
        myEntry ? { ...myEntry, _isAppended: true } : null,
      ].filter(Boolean)

  const initials = (row: any) =>
    (row.name || row.username || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  // Rank badge colors for podium positions
  const podium: Record<number, { bg: string; text: string }> = {
    1: { bg: '#FEF3C7', text: '#B45309' },
    2: { bg: '#F1F5F9', text: '#64748B' },
    3: { bg: '#FCE7D8', text: '#C2620F' },
  }

  return (
    <View className="bg-white rounded-[24px] p-4" style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <View>
            <Text className="font-semibold text-[rgba(0,0,0,0.9)] text-sm">Leaderboard</Text>
            <Text className="text-[10px] text-black/40">Monthly collections</Text>
          </View>
        </View>
      </View>

      {leaderboard.length === 0 ? (
        <Text className="text-center text-black/40 text-xs py-2">Loading leaderboard...</Text>
      ) : (
        <>
          <View className="gap-2">
            {displayList.map((row: any) => {
              const isMe = row.username === myUsername
              const rank = row.rank
              const isAppended = !!row._isAppended
              const medal = podium[rank]
              return (
                <View key={row.username}>
                  {isAppended && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                      <Text style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)' }}>your position</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} />
                    </View>
                  )}
                  <View
                    className="flex-row items-center gap-3 px-2.5 py-2 rounded-2xl"
                    style={isMe
                      ? { backgroundColor: '#FAE2FA', borderWidth: 1, borderColor: 'rgba(211,10,215,0.25)' }
                      : { backgroundColor: '#fff' }}
                  >
                    {/* Rank badge */}
                    <View
                      style={{
                        width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: medal ? medal.bg : '#F0F4F7',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: medal ? medal.text : 'rgba(0,0,0,0.45)' }}>{rank}</Text>
                    </View>
                    {/* Avatar */}
                    <View
                      style={{
                        width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isMe ? '#D30AD7' : '#EDE9FE',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isMe ? '#fff' : '#7C3AED' }}>{initials(row)}</Text>
                    </View>
                    {/* Name */}
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold ${isMe ? 'text-[#A008A3]' : 'text-[rgba(0,0,0,0.8)]'}`} numberOfLines={1}>
                        {row.name || row.username}{isMe ? '  (You)' : ''}
                      </Text>
                    </View>
                    {/* Amount */}
                    <Text className={`text-sm font-bold ${isMe ? 'text-[#D30AD7]' : 'text-[rgba(0,0,0,0.85)]'}`}>
                      {row.collected > 0 ? fmtL(row.collected) : '₹0'}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
          {leaderboard.length > 5 && (
            <TouchableOpacity onPress={() => setExpanded(e => !e)} style={{ alignItems: 'center', paddingTop: 14 }}>
              <Text style={{ fontSize: 11, color: '#A008A3', fontWeight: '600' }}>
                {expanded ? 'Show less ▲' : 'View top 10 ▼'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  )
}
