import { useState, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CompositeScreenProps } from '@react-navigation/native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SalesTabParamList, RootStackParamList } from '../../navigation/types'
import { useAgent } from '../../navigation/AgentContext'
import { ALL_MERCHANTS } from '../../data/merchants'
import { getSalesActivity, updateSalesActivity } from '../../data/salesActivityLog'

type Props = CompositeScreenProps<
  BottomTabScreenProps<SalesTabParamList, 'SalesDeposit'>,
  NativeStackScreenProps<RootStackParamList>
>

type Tab = 'pending' | 'submitted' | 'transfers'
const noteValues = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1]
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

export default function SalesDepositionScreen({ navigation }: Props) {
  const { agentInfo } = useAgent()
  const [tab, setTab] = useState<Tab>('pending')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [toast, setToast] = useState('')
  const [depositedIds, setDepositedIds] = useState<Set<string>>(new Set())
  const [subSearch, setSubSearch] = useState('')
  const [denomOpen, setDenomOpen] = useState(false)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0])
  const [txnRef, setTxnRef] = useState('')
  const [agree, setAgree] = useState(false)
  const [slipUploaded, setSlipUploaded] = useState(false)
  const dpNumber = useRef('SDP' + Date.now() + Math.floor(Math.random() * 9999))

  const glAcct = (agentInfo as any)?.glCode || '11799'
  const branch = agentInfo?.branch || 'DIBRUGARH'

  const pendingItems = useMemo(() => {
    if (!agentInfo) return []
    return ALL_MERCHANTS
      .filter(m => m.assignedAgent === agentInfo.username)
      .flatMap(m => {
        const act = getSalesActivity(m.merchantId)
        return (act?.collections ?? [])
          .filter(c => !c.deposited && !depositedIds.has(c.collectionId))
          .map(c => ({
            id: c.collectionId,
            businessName: m.businessName,
            merchantId: m.merchantId,
            date: c.date,
            amount: c.amount,
            notes: c.notes,
          }))
      })
  }, [agentInfo, depositedIds])

  const submittedItems = useMemo(() => {
    if (!agentInfo) return []
    return ALL_MERCHANTS
      .filter(m => m.assignedAgent === agentInfo.username)
      .flatMap(m => {
        const act = getSalesActivity(m.merchantId)
        return (act?.collections ?? [])
          .filter(c => c.deposited && c.depositId)
          .map(c => ({
            dpNumber: c.depositId!,
            businessName: m.businessName,
            date: c.date,
            amount: c.amount,
            branch: agentInfo.branch,
          }))
      })
      .slice(0, 10)
  }, [agentInfo])

  const selectedItems = pendingItems.filter(r => selectedIds.has(r.id))
  const totalPending  = pendingItems.reduce((s, r) => s + r.amount, 0)
  const denomTotal = noteValues.reduce((s, n) => s + n * (counts[n] || 0), 0)
  const depositFormValid = depDate && txnRef.trim() && agree && slipUploaded

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDepositSubmit() {
    // Mark selected collections as deposited
    const byMerchant = new Map<string, string[]>()
    for (const item of pendingItems.filter(r => selectedIds.has(r.id))) {
      const existing = byMerchant.get(item.merchantId) ?? []
      existing.push(item.id)
      byMerchant.set(item.merchantId, existing)
    }

    for (const [merchantId, collectionIds] of byMerchant.entries()) {
      const act = getSalesActivity(merchantId)
      if (act) {
        const updated = act.collections.map(c =>
          collectionIds.includes(c.collectionId)
            ? { ...c, deposited: true, depositId: dpNumber.current }
            : c
        )
        updateSalesActivity(merchantId, { collections: updated })
      }
    }

    setDepositedIds(prev => new Set([...prev, ...selectedIds]))
    setShowDepositModal(false)
    setSelectedIds(new Set())
    setToast('Deposit submitted successfully')
    setCounts({}); setTxnRef(''); setAgree(false); setSlipUploaded(false)
    setTimeout(() => setToast(''), 3000)
  }

  const tabItems: { id: Tab; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'transfers', label: 'Transfers' },
  ]

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      <SafeAreaView className="bg-white" edges={['top']}>
        <View className="px-5 py-3 flex-row items-center justify-between" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <Text className="text-[rgba(0,0,0,0.9)] text-lg font-medium">Cash to Deposit</Text>
        </View>
        {/* Tab bar */}
        <View className="flex-row" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          {tabItems.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              className="flex-1 py-3 items-center relative"
            >
              <Text style={{ color: tab === t.id ? '#D30AD7' : 'rgba(0,0,0,0.4)', fontSize: 14, fontWeight: '500' }}>{t.label}</Text>
              {tab === t.id && (
                <View className="absolute bottom-0 self-center w-12 h-0.5 rounded-full bg-[#D30AD7]" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Pending tab */}
      {tab === 'pending' && (
        <View className="flex-1">
          <View className="mx-4 mt-4 bg-white rounded-[20px] px-4 py-3 flex-row items-center justify-between" style={{ borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }}>
            <View>
              <Text className="text-[10px] text-black/40 font-medium">GL Account</Text>
              <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)] font-mono">{glAcct}</Text>
            </View>
            <View className="w-px h-8 bg-black/[0.08]" />
            <View>
              <Text className="text-[10px] text-black/40 font-medium">Branch</Text>
              <Text className="text-sm font-semibold text-[rgba(0,0,0,0.9)]">{branch}</Text>
            </View>
            <View className="w-px h-8 bg-black/[0.08]" />
            <View>
              <Text className="text-[10px] text-black/40 font-medium">Deposit To</Text>
              <Text className="text-[11px] font-medium text-[rgba(0,0,0,0.7)]">Slice SFB</Text>
            </View>
          </View>

          <Text className="text-[10px] text-black/40 font-medium uppercase tracking-wider mx-4 mt-4 mb-2">Cash collections pending deposit</Text>

          <FlatList
            data={pendingItems}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 160 }}
            renderItem={({ item: r }) => {
              const isSelected = selectedIds.has(r.id)
              return (
                <TouchableOpacity
                  onPress={() => toggleSelect(r.id)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 1,
                    borderWidth: 2, borderColor: isSelected ? '#D30AD7' : 'transparent',
                    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,0.9)' }}>{r.businessName}</Text>
                      <Text style={{ fontSize: 11, color: '#D30AD7', fontWeight: '500', marginTop: 2 }}>{r.id}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{r.date}</Text>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: isSelected ? '#D30AD7' : '#F0F4F7',
                        borderWidth: isSelected ? 0 : 1.5, borderColor: 'rgba(0,0,0,0.15)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }} numberOfLines={1}>{r.notes}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#00A63E' }}>{fmt(r.amount)}</Text>
                  </View>
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>🏦</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: 'rgba(0,0,0,0.9)' }}>No Pending Deposits!</Text>
                <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 4 }}>All collections have been deposited.</Text>
              </View>
            }
          />

          {pendingItems.length > 0 && (
            <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3 gap-3" style={{ elevation: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-black/50 font-medium">Total Pending</Text>
                <Text className="text-base font-medium text-[rgba(0,0,0,0.9)]">{fmt(totalPending)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDepositModal(true)}
                className="w-full py-3 rounded-full bg-[#D30AD7] items-center"
              >
                <Text className="text-white text-sm font-medium">Start Deposit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Submitted tab */}
      {tab === 'submitted' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
          <View className="bg-white rounded-[24px] px-4 py-3 flex-row items-center gap-2" style={{ elevation: 1 }}>
            <TextInput
              value={subSearch}
              onChangeText={setSubSearch}
              placeholder="Search using DP Number"
              placeholderTextColor="rgba(0,0,0,0.3)"
              className="flex-1 text-sm"
              style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)', paddingVertical: 8 }}
            />
          </View>
          {submittedItems
            .filter(s => !subSearch || s.dpNumber.toLowerCase().includes(subSearch.toLowerCase()))
            .map(s => (
              <View key={s.dpNumber} className="bg-white rounded-[24px] px-4 py-4" style={{ elevation: 1 }}>
                <View className="flex-row items-start justify-between mb-2">
                  <View>
                    <Text className="text-xs text-[#D30AD7] font-medium">{s.dpNumber}</Text>
                    <Text className="text-[11px] text-black/40 mt-0.5">{s.date} · {s.businessName}</Text>
                  </View>
                  <View className="bg-[#E0F4E8] px-2 py-1 rounded-full">
                    <Text className="text-xs font-medium text-[#007E2F]">Submitted</Text>
                  </View>
                </View>
                <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)]">{fmt(s.amount)}</Text>
              </View>
            ))}
          {submittedItems.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🏦</Text>
              <Text style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)' }}>No submitted deposits</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Transfers tab */}
      {tab === 'transfers' && (
        <View className="flex-1 items-center justify-center">
          <View className="w-20 h-20 rounded-full bg-[#F0F4F7] items-center justify-center mb-4">
            <Text className="text-4xl">🏦</Text>
          </View>
          <Text className="text-base font-medium text-[rgba(0,0,0,0.9)] mb-1">No Transfers Pending!</Text>
          <Text className="text-xs text-black/40 text-center">All transfers have been processed.</Text>
        </View>
      )}

      {/* Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="slide" onRequestClose={() => setShowDepositModal(false)}>
        <TouchableOpacity className="flex-1 justify-end bg-black/40" activeOpacity={1} onPress={() => setShowDepositModal(false)}>
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl px-5 pt-5 pb-10" style={{ maxHeight: '88%' }}>
            <View className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-base font-medium text-[#D30AD7] mb-4">Sales Cash Deposit Form</Text>

              <View className="bg-[#FAE2FA] rounded-[24px] px-4 py-3 mb-4" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <View style={{ width: '45%' }}>
                  <Text className="text-[10px] text-black/40">Deposit To</Text>
                  <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">Slice Small Finance Bank</Text>
                </View>
                <View style={{ width: '45%' }}>
                  <Text className="text-[10px] text-black/40">GL Account</Text>
                  <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">{glAcct}</Text>
                </View>
                <View style={{ width: '45%' }}>
                  <Text className="text-[10px] text-black/40">Branch</Text>
                  <Text className="text-xs font-medium text-[rgba(0,0,0,0.9)]">{branch}</Text>
                </View>
                <View style={{ width: '45%' }}>
                  <Text className="text-[10px] text-black/40">Total Amount</Text>
                  <Text className="text-xs font-medium text-[#00A63E]">{fmt(totalPending)}</Text>
                </View>
              </View>

              {/* Date */}
              <View className="mb-4">
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Deposition Date *</Text>
                <TextInput
                  value={depDate}
                  onChangeText={setDepDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  className="w-full py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
                  style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
                />
              </View>

              {/* Note counter */}
              <View className="mb-4">
                <TouchableOpacity
                  onPress={() => setDenomOpen(o => !o)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: denomOpen ? '#D30AD7' : 'rgba(0,0,0,0.10)' }}
                >
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Note Count</Text>
                    {denomTotal > 0 && (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: denomTotal === totalPending ? '#00A63E' : '#CE1D26', marginTop: 2 }}>
                        {fmt(denomTotal)} {denomTotal === totalPending ? '✓ Matches' : `≠ Expected ${fmt(totalPending)}`}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: denomOpen ? '#D30AD7' : 'rgba(0,0,0,0.3)', fontSize: 13 }}>{denomOpen ? '▴' : '▾'}</Text>
                </TouchableOpacity>

                {denomOpen && (
                  <View style={{ backgroundColor: '#F0F4F7', borderRadius: 20, padding: 12, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {noteValues.map(note => {
                        const count = counts[note] || 0
                        const active = count > 0
                        return (
                          <View key={note} style={{
                            width: '30.5%', backgroundColor: active ? '#FAE2FA' : '#fff',
                            borderRadius: 16, borderWidth: 1.5,
                            borderColor: active ? 'rgba(211,10,215,0.30)' : 'rgba(0,0,0,0.08)',
                            padding: 10, alignItems: 'center', gap: 6,
                          }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#A008A3' : 'rgba(0,0,0,0.55)' }}>{fmt(note)}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <TouchableOpacity
                                onPress={() => setCounts(prev => ({ ...prev, [note]: Math.max(0, (prev[note] || 0) - 1) }))}
                                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: active ? '#D30AD7' : '#EAEBED', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Text style={{ color: active ? '#fff' : 'rgba(0,0,0,0.3)', fontSize: 18, lineHeight: 22, fontWeight: '700' }}>−</Text>
                              </TouchableOpacity>
                              <Text style={{ minWidth: 18, textAlign: 'center', fontSize: 15, fontWeight: '800', color: active ? '#D30AD7' : 'rgba(0,0,0,0.35)' }}>{count}</Text>
                              <TouchableOpacity
                                onPress={() => setCounts(prev => ({ ...prev, [note]: (prev[note] || 0) + 1 }))}
                                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#D30AD7', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Text style={{ color: '#fff', fontSize: 18, lineHeight: 22, fontWeight: '700' }}>+</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: active ? '#A008A3' : 'rgba(0,0,0,0.25)' }}>
                              {active ? fmt(count * note) : '—'}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10 }}>
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.7)' }}>Total Counted</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: denomTotal === totalPending ? '#00A63E' : denomTotal > 0 ? '#CE1D26' : 'rgba(0,0,0,0.4)' }}>
                        {fmt(denomTotal)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Upload slip */}
              <View className="mb-4">
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Upload Deposition Slip *</Text>
                <TouchableOpacity
                  onPress={() => setSlipUploaded(true)}
                  style={{
                    padding: 24, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', gap: 8,
                    borderColor: slipUploaded ? '#00A63E' : 'rgba(0,0,0,0.20)',
                    backgroundColor: slipUploaded ? '#E0F4E8' : '#F0F4F7',
                  }}
                >
                  <Text className="text-2xl">{slipUploaded ? '✅' : '📷'}</Text>
                  <Text className="text-xs text-black/50">{slipUploaded ? 'Slip uploaded' : 'Upload Deposition Slip *'}</Text>
                </TouchableOpacity>
              </View>

              {/* DP Number */}
              <View className="mb-4">
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">DP Number</Text>
                <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.10)', paddingVertical: 10 }}>
                  <Text className="text-sm text-black/60 font-mono">{dpNumber.current}</Text>
                </View>
              </View>

              {/* Txn ref */}
              <View className="mb-4">
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Transaction / Reference No. *</Text>
                <TextInput
                  value={txnRef}
                  onChangeText={setTxnRef}
                  placeholder="Enter reference number"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  className="w-full py-2.5 text-sm text-[rgba(0,0,0,0.9)]"
                  style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.15)' }}
                />
              </View>

              {/* Agreement */}
              <TouchableOpacity onPress={() => setAgree(!agree)} className="flex-row items-start gap-3 mb-6">
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: agree ? '#D30AD7' : 'rgba(0,0,0,0.2)', backgroundColor: agree ? '#D30AD7' : 'white', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  {agree && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-xs text-black/60 leading-relaxed flex-1">
                  I confirm the selected cash collections have been deposited into the bank account and the deposition slip is attached.
                </Text>
              </TouchableOpacity>

              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setShowDepositModal(false)} className="flex-1 py-3 rounded-full bg-[#F0F4F7] items-center">
                  <Text className="text-[rgba(0,0,0,0.9)] text-sm font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDepositSubmit}
                  disabled={!depositFormValid}
                  className={`flex-1 py-3 rounded-full items-center ${depositFormValid ? 'bg-[#D30AD7]' : 'bg-[#EAEBED]'}`}
                >
                  <Text className={`text-sm font-medium ${depositFormValid ? 'text-white' : 'text-black/40'}`}>Submit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Toast */}
      {toast ? (
        <View className="absolute bottom-24 self-center bg-[#00A63E] rounded-full px-5 py-3" style={{ elevation: 8 }}>
          <Text className="text-white text-sm font-medium">✓ {toast}</Text>
        </View>
      ) : null}
    </View>
  )
}
