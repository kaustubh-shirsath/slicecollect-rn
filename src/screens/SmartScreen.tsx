import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MainTabParamList, RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { buildRoute } from '../data/routingEngine'
import type { RouteStop } from '../data/routingEngine'
import { getBucketColor } from '../utils/bucketColors'

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Smart'>,
  NativeStackScreenProps<RootStackParamList>
>

function maskId(id: string): string {
  const s = String(id)
  if (s.length <= 4) return s
  return 'XXXX' + s.slice(-4)
}

export default function SmartScreen({ navigation }: Props) {
  const { agentInfo, dataVersion } = useAgent()
  const [routeStops, setRouteStops] = useState<RouteStop[]>([])
  const [loading, setLoading] = useState(true)
  const [rerouting, setRerouting] = useState(false)
  const currentPos = useRef<[number, number]>([agentInfo?.lat ?? 27.4728, agentInfo?.lng ?? 94.9120])
  const prevVersion = useRef(0)
  const spinAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (rerouting) {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
      ).start()
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.9, duration: 600, useNativeDriver: true }),
        ])
      ).start()
    } else {
      spinAnim.stopAnimation()
      pulseAnim.stopAnimation()
      spinAnim.setValue(0)
      pulseAnim.setValue(1)
    }
  }, [rerouting])

  const load = (lat: number, lng: number, isReroute = false) => {
    const username = agentInfo?.username
    if (!username) return
    currentPos.current = [lat, lng]
    if (isReroute) {
      setRerouting(true)
      setTimeout(() => {
        const stops = buildRoute(username, lat, lng)
        setRouteStops(stops)
        setRerouting(false)
      }, 2200)
    } else {
      setLoading(true)
      const stops = buildRoute(username, lat, lng)
      setRouteStops(stops)
      setLoading(false)
    }
  }

  useEffect(() => {
    const fallbackLat = agentInfo?.lat ?? 27.4728
    const fallbackLng = agentInfo?.lng ?? 94.9120
    load(fallbackLat, fallbackLng)
  }, [agentInfo?.username])

  useEffect(() => {
    if (dataVersion > 0 && dataVersion !== prevVersion.current) {
      prevVersion.current = dataVersion
      load(currentPos.current[0], currentPos.current[1], true)
    }
  }, [dataVersion])

  const visitedStops = routeStops.filter(s => s.visited)
  const pendingStops = routeStops.filter(s => !s.visited)
  const totalVisited = visitedStops.length
  const totalStops   = routeStops.length

  type NodeState = 'done' | 'current' | 'upcoming'

  const timeline: Array<{ stop: RouteStop; state: NodeState; index: number }> = [
    ...visitedStops.map((s, i) => ({ stop: s, state: 'done' as NodeState, index: i + 1 })),
    ...pendingStops.map((s, i) => ({
      stop: s,
      state: (i === 0 ? 'current' : 'upcoming') as NodeState,
      index: visitedStops.length + i + 1,
    })),
  ]

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      {/* Dark header */}
      <SafeAreaView className="bg-[#090B0C]" edges={['top']}>
        <View className="px-5 pb-5" style={{ paddingTop: 16 }}>
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-2">
                <Text className="text-[#D30AD7] text-lg">✦</Text>
                <Text className="text-white font-medium text-lg">AI Route</Text>
              </View>
              {!loading && (
                <Text className="text-white/40 text-xs mt-1">{totalVisited}/{totalStops} visited</Text>
              )}
            </View>
            <View className="flex-row items-center gap-2">
              {!loading && (
                <TouchableOpacity
                  onPress={() => load(agentInfo?.lat ?? 27.4728, agentInfo?.lng ?? 94.9120)}
                  className="border border-white/10 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-white/40 text-[11px]">Refresh</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
              >
                <Text className="text-white text-xs font-bold">
                  {agentInfo?.name ? agentInfo.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'SF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!loading && totalStops > 0 && (
            <View className="mt-4">
              <View className="bg-white/10 rounded-full h-1.5 overflow-hidden">
                <View
                  className="bg-[#D30AD7] h-1.5 rounded-full"
                  style={{ width: `${Math.round((totalVisited / totalStops) * 100)}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-white/30 text-[10px]">{totalVisited} done</Text>
                <Text className="text-white/30 text-[10px]">{pendingStops.length} left</Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {rerouting && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9,11,12,0.80)', zIndex: 100, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{
            transform: [{ scale: pulseAnim }],
            alignItems: 'center',
            gap: 16,
          }}>
            <Animated.View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#D30AD7',
              alignItems: 'center', justifyContent: 'center',
              transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
            }}>
              <Text style={{ color: '#fff', fontSize: 28 }}>✦</Text>
            </Animated.View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Recalculating route…</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Optimising stops after new visit</Text>
            </View>
          </Animated.View>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-[#D30AD7] text-4xl">✦</Text>
          <Text className="text-black/40 text-sm">Optimising your route…</Text>
        </View>
      ) : timeline.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-black/30">No route available</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {timeline.map(({ stop, state, index }, ti) => {
            // Section headers: visited nodes = "Today's Route" (blurred), pending = "Suggested Visits" (live)
            const isFirstVisited = state === 'done' && ti === 0
            const isFirstPending = state !== 'done' && (ti === 0 || timeline[ti - 1].state === 'done')
            const bucket  = stop.customer.assetClassification
            const bc      = getBucketColor(bucket)
            const isLast  = ti === timeline.length - 1
            const distNext = isLast ? 0 : (timeline[ti + 1]?.stop?.distanceFromPrev || 0)
            const timeStr = stop.visitedAt
              ? new Date(stop.visitedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
              : stop.estimatedArrival ? `~${stop.estimatedArrival}` : ''

            return (
              <View key={String(stop.customer.partyId) + ti}>
                {isFirstVisited && (
                  <View className="flex-row items-center gap-2 mb-3">
                    <Text className="text-[13px] font-semibold text-black/45">Today's Route</Text>
                    <View className="flex-1 h-px bg-black/10" />
                    <Text className="text-[10px] text-black/35">{visitedStops.length} visited</Text>
                  </View>
                )}
                {isFirstPending && (
                  <View className={`flex-row items-center gap-2 mb-3 ${ti > 0 ? 'mt-2' : ''}`}>
                    <Text className="text-[13px] font-semibold text-[#A008A3]">✦ Suggested Visits</Text>
                    <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(211,10,215,0.25)' }} />
                    <Text className="text-[10px] text-[#A008A3]">{pendingStops.length} pending</Text>
                  </View>
                )}
                {/* Stop row */}
                <View className="flex-row items-center gap-3">
                  {/* Node */}
                  <View className="w-9 items-center">
                    <View
                      className={`items-center justify-center rounded-full border-2 ${
                        state === 'done' ? 'w-6 h-6 bg-[#E0F4E8] border-[#00A63E]'
                        : state === 'current' ? 'w-8 h-8 bg-[#D30AD7] border-[#D30AD7]'
                        : 'w-5 h-5 bg-white border-black/20'
                      }`}
                    >
                      {state === 'done'     && <Text className="text-[#00A63E] text-[10px] font-bold">✓</Text>}
                      {state === 'current'  && <Text className="text-white text-[11px] font-bold">{index}</Text>}
                      {state === 'upcoming' && <Text className="text-black/30 text-[9px] font-medium">{index}</Text>}
                    </View>
                  </View>

                  {/* Card */}
                  <TouchableOpacity
                    className="flex-1"
                    onPress={() => navigation.navigate('CustomerDetail', { customer: stop.customer, fromScreen: 'Smart' })}
                  >
                    <View
                      className={`rounded-[18px] px-4 py-3 ${
                        state === 'done' ? 'bg-white/50'
                        : state === 'current' ? 'bg-white border border-[#D30AD7]/15'
                        : 'bg-white'
                      }`}
                      style={state === 'done' ? { opacity: 0.55 } : state === 'current' ? { elevation: 4, shadowColor: '#D30AD7', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } } : { elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}
                    >
                      <View className="flex-row items-center justify-between gap-2">
                        <View className="flex-1 min-w-0">
                          <Text
                            className={`font-semibold leading-tight ${state === 'current' ? 'text-black/90 text-[15px]' : state === 'done' ? 'text-black/40 text-[13px]' : 'text-black/80 text-[13px]'}`}
                            numberOfLines={1}
                          >
                            {stop.customer.name}
                          </Text>
                          <View className="flex-row items-center gap-2 mt-1.5 flex-wrap">
                            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: bc.bg }}>
                              <Text className="text-[10px] font-medium" style={{ color: bc.text }}>{bucket}</Text>
                            </View>
                            <Text className={`text-[10px] font-mono ${state === 'done' ? 'text-black/25' : 'text-black/35'}`}>
                              {maskId(stop.customer.partyId)}
                            </Text>
                            {stop.appointmentSlot && (
                              <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                                <Text style={{ fontSize: 10, color: '#A35300', fontWeight: '500' }}>
                                  {stop.appointmentSlot === 'morning' ? '9–12' : stop.appointmentSlot === 'afternoon' ? '12–4' : '4–7'}
                                </Text>
                              </View>
                            )}
                          </View>
                          {state !== 'done' && stop.visitReason && (
                            <Text className="text-[10px] mt-1.5 leading-snug" style={{ color: state === 'current' ? '#A008A3' : 'rgba(0,0,0,0.35)' }}>
                              ✦ {stop.visitReason}
                            </Text>
                          )}
                        </View>
                        <Text className={`text-[10px] ${state === 'done' ? 'text-[#00A63E] font-medium' : 'text-black/30'}`}>
                          {timeStr}
                        </Text>
                      </View>

                      {state === 'current' && (
                        <View className="mt-3 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1 bg-[#D30AD7]/10 px-2.5 py-1 rounded-full">
                            <View className="w-1.5 h-1.5 rounded-full bg-[#D30AD7]" />
                            <Text className="text-[10px] font-medium text-[#D30AD7]">You are here</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => navigation.navigate('CustomerDetail', { customer: stop.customer, fromScreen: 'Smart' })}
                            className="bg-[#D30AD7] px-4 py-1.5 rounded-full"
                          >
                            <Text className="text-xs text-white font-medium">View Profile →</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Connector */}
                {!isLast && (
                  <View className="flex-row" style={{ height: 32 }}>
                    <View className="w-9 items-center">
                      <View
                        className="w-px flex-1"
                        style={{ backgroundColor: state === 'done' ? 'rgba(0,166,62,0.35)' : 'rgba(0,0,0,0.15)' }}
                      />
                    </View>
                    {distNext > 0 && (
                      <Text className="text-[9px] text-black/30 font-medium ml-1 self-center">{distNext} km</Text>
                    )}
                  </View>
                )}
              </View>
            )
          })}

          {pendingStops.length === 0 && totalVisited > 0 && (
            <View className="items-center py-8">
              <Text className="text-sm font-medium text-black/60">All visits done for today</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
