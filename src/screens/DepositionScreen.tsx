import { useState, useMemo, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { useAgent } from '../navigation/AgentContext'
import { ALL_CUSTOMERS } from '../data/customers'
import { getActivity, updateActivity } from '../data/activityLog'

type Props = NativeStackScreenProps<RootStackParamList, 'Deposition'>
type Tab = 'pending' | 'submitted' | 'transfers'

const noteValues = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1]
const fmt = (n: number) => '₹' + n.toLocaleString('en-IN')

function DpdBadge({ dpd }: { dpd: number }) {
  const bg = dpd === 0 ? '#E0F4E8' : dpd <= 7 ? '#FFF0E0' : '#F9E4E5'
  const color = dpd === 0 ? '#007E2F' : dpd <= 7 ? '#A35300' : '#CE1D26'
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 }}>
      <Text style={{ fontSize: 10, fontWeight: '500', color }}>{dpd} DPD</Text>
    </View>
  )
}

export default function DepositionScreen({ navigation }: Props) {
  const { agentInfo } = useAgent()
  const [tab, setTab] = useState<Tab>('pending')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [toast, setToast] = useState('')
  const [depositedIds, setDepositedIds] = useState<Set<string>>(new Set())
  const [subSearch, setSubSearch] = useState('')
  const [denomOpen, setDenomOpen] = useState(false)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [depDate, setDepDate] = useState(new Date().toISOString().split('T')[0])
  const [txnRef, setTxnRef] = useState('')
  const [agree, setAgree] = useState(false)
  const [slipUploaded, setSlipUploaded] = useState(false)
  const dpNumber = useRef('DP' + Date.now() + Math.floor(Math.random() * 9999))

  const glAcct = (agentInfo as any)?.glCode || '11799'
  const branch = agentInfo?.branchCode || 'TINSUKIA'

  const pendingReceipts = useMemo(() => {
    if (!agentInfo) return []
    return ALL_CUSTOMERS
      .filter((c: any) => c.username === agentInfo.agentId)
      .flatMap((c: any) => {
        const act = getActivity(c.partyId)
        return (act?.collections ?? [])
          .filter((col: any) => !col.deposited && col.mode === 'Cash' && !depositedIds.has(col.receiptId))
          .map((col: any) => ({ id: col.receiptId, name: c.name, receipt: col.receiptId, date: col.date, dpd: c.dpd, amount: col.amount, partyId: c.partyId }))
      })
  }, [agentInfo, depositedIds])

  const submittedSamples = useMemo(() => {
    if (!agentInfo) return []
    return ALL_CUSTOMERS
      .filter((c: any) => c.username === agentInfo.agentId)
      .flatMap((c: any) => {
        const act = getActivity(c.partyId)
        return (act?.collections ?? [])
          .filter((col: any) => col.deposited && col.depositId)
          .map((col: any) => ({ dpNumber: col.depositId, date: col.date, amount: col.amount, branch: agentInfo.branchCode, status: 'Submitted' }))
      })
      .slice(0, 10)
  }, [agentInfo])

  const selectedReceipts = pendingReceipts.filter((r: any) => selectedIds.has(r.id))
  const totalPending     = pendingReceipts.reduce((s: number, r: any) => s + r.amount, 0)
  const totalSelected    = selectedReceipts.reduce((s: number, r: any) => s + r.amount, 0)
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
    for (const r of pendingReceipts.filter((r: any) => selectedIds.has(r.id))) {
      const act = getActivity(r.partyId)
      if (act) {
        const updated = act.collections.map((col: any) =>
          col.receiptId === r.receipt ? { ...col, deposited: true, depositId: dpNumber.current } : col
        )
        updateActivity(r.partyId, { collections: updated })
      }
    }
    setDepositedIds(prev => new Set([...prev, ...selectedIds]))
    setShowDepositModal(false)
    setSelectedIds(new Set())
    setToast('Deposit submitted successfully')
    setCounts({}); setTxnRef(''); setAgree(false); setSlipUploaded(false)
    setTimeout(() => setToast(''), 3000)
  }

  const tabItems = [
    { id: 'pending' as Tab, label: 'Pending' },
    { id: 'submitted' as Tab, label: 'Submitted' },
    { id: 'transfers' as Tab, label: 'Transfers' },
  ]

  return (
    <View className="flex-1 bg-[#F0F4F7]">
      <SafeAreaView className="bg-white" edges={['top']}>
        <View className="px-4 pb-3 flex-row items-center gap-3" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-8 h-8 items-center justify-center rounded-full"
          >
            <Text className="text-black/60 text-xl">←</Text>
          </TouchableOpacity>
          <Text className="text-base font-medium text-[rgba(0,0,0,0.9)] flex-1">Cash to Deposit</Text>
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
              <Text className="text-[10px] text-black/40 font-medium">GL Account (BNAPAC)</Text>
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

          <Text className="text-[10px] text-black/40 font-medium uppercase tracking-wider mx-4 mt-4 mb-2">Cash receipts pending deposit</Text>

          <FlatList
            data={pendingReceipts}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 160 }}
            renderItem={({ item: r }: { item: any }) => {
              const isSelected = selectedIds.has(r.id)
              return (
                <TouchableOpacity
                  onPress={() => toggleSelect(r.id)}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 20,
                    padding: 16,
                    elevation: 1,
                    borderWidth: 2,
                    borderColor: isSelected ? '#D30AD7' : 'transparent',
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(0,0,0,0.9)' }}>{r.name}</Text>
                      <Text style={{ fontSize: 11, color: '#D30AD7', fontWeight: '500', marginTop: 2 }}>{r.receipt}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>{r.date}</Text>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: isSelected ? '#D30AD7' : '#F0F4F7',
                        borderWidth: isSelected ? 0 : 1.5,
                        borderColor: 'rgba(0,0,0,0.15)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <DpdBadge dpd={r.dpd} />
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#00A63E' }}>{fmt(r.amount)}</Text>
                  </View>
                </TouchableOpacity>
              )
            }}
          />

          <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-3 gap-3" style={{ elevation: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-black/50 font-medium">Total Amount</Text>
              <Text className="text-base font-medium text-[rgba(0,0,0,0.9)]">{fmt(totalPending)}</Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowTransferModal(true)} className="flex-1 py-3 rounded-full bg-[#F0F4F7] items-center">
                <Text className="text-[rgba(0,0,0,0.9)] text-sm font-medium">Transfer Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDepositModal(true)} className="flex-1 py-3 rounded-full bg-[#D30AD7] items-center">
                <Text className="text-white text-sm font-medium">Start Deposit</Text>
              </TouchableOpacity>
            </View>
          </View>
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
          {submittedSamples
            .filter((s: any) => !subSearch || s.dpNumber.toLowerCase().includes(subSearch.toLowerCase()))
            .map((s: any) => (
              <View key={s.dpNumber} className="bg-white rounded-[24px] px-4 py-4" style={{ elevation: 1 }}>
                <View className="flex-row items-start justify-between mb-2">
                  <View>
                    <Text className="text-xs text-[#D30AD7] font-medium">{s.dpNumber}</Text>
                    <Text className="text-[11px] text-black/40 mt-0.5">{s.date} · {s.branch}</Text>
                  </View>
                  <View className="bg-[#E0F4E8] px-2 py-1 rounded-full">
                    <Text className="text-xs font-medium text-[#007E2F]">{s.status}</Text>
                  </View>
                </View>
                <Text className="text-lg font-medium text-[rgba(0,0,0,0.9)]">{fmt(s.amount)}</Text>
              </View>
            ))}
        </ScrollView>
      )}

      {/* Transfers tab */}
      {tab === 'transfers' && (
        <View className="flex-1 px-4 pt-4 items-center">
          <View className="flex-1 items-center justify-center mt-12">
            <View className="w-20 h-20 rounded-full bg-[#F0F4F7] items-center justify-center mb-4">
              <Text className="text-4xl">🏦</Text>
            </View>
            <Text className="text-base font-medium text-[rgba(0,0,0,0.9)] mb-1">No Deposition Pending!</Text>
            <Text className="text-xs text-black/40 text-center">All transfers have been processed.{'\n'}Check back later.</Text>
          </View>
        </View>
      )}

      {/* Deposit Modal */}
      <Modal visible={showDepositModal} transparent animationType="slide" onRequestClose={() => setShowDepositModal(false)}>
        <TouchableOpacity className="flex-1 justify-end bg-black/40" activeOpacity={1} onPress={() => setShowDepositModal(false)}>
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl px-5 pt-5 pb-10" style={{ maxHeight: '88%' }}>
            <View className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-4" />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-base font-medium text-[#D30AD7] mb-4">Cash Deposit Form</Text>

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
                <Text className="text-[10px] font-medium text-black/50 uppercase tracking-wider mb-1.5">Transaction / Reference / Challan No. *</Text>
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
              <TouchableOpacity
                onPress={() => setAgree(!agree)}
                className="flex-row items-start gap-3 mb-6"
              >
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: agree ? '#D30AD7' : 'rgba(0,0,0,0.2)', backgroundColor: agree ? '#D30AD7' : 'white', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  {agree && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-xs text-black/60 leading-relaxed flex-1">
                  I agree — Amount selected has been deposited by me into respective bank account and deposition slips attached contains same transactions.
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

      {/* Transfer Confirm Modal */}
      <Modal visible={showTransferModal} transparent animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
        <TouchableOpacity className="flex-1 justify-end bg-black/40" activeOpacity={1} onPress={() => setShowTransferModal(false)}>
          <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <View className="w-10 h-1 bg-black/10 rounded-full mx-auto mb-4" />
            <Text className="text-base font-medium text-[#D30AD7] mb-4">Selected Cases for Transfer</Text>
            <View className="gap-2 mb-4">
              {selectedReceipts.map((r: any) => (
                <View key={r.id} className="bg-[#FAE2FA] rounded-xl px-4 py-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm font-medium text-[rgba(0,0,0,0.9)]">{r.name}</Text>
                    <Text className="text-[11px] text-[#D30AD7] font-medium">{r.receipt}</Text>
                  </View>
                  <Text className="text-sm font-medium text-[#00A63E]">{fmt(r.amount)}</Text>
                </View>
              ))}
            </View>
            <View className="flex-row items-center justify-between bg-[#F0F4F7] rounded-xl px-4 py-3 mb-6">
              <Text className="text-sm font-medium text-black/50">Total</Text>
              <Text className="text-base font-medium text-[rgba(0,0,0,0.9)]">{fmt(totalSelected)}</Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setShowTransferModal(false)} className="flex-1 py-3 rounded-full bg-[#F0F4F7] items-center">
                <Text className="text-[rgba(0,0,0,0.9)] text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowTransferModal(false); setSelectedIds(new Set()); setToast('Transfer initiated'); setTimeout(() => setToast(''), 3000) }}
                className="flex-1 py-3 rounded-full bg-[#D30AD7] items-center"
              >
                <Text className="text-white text-sm font-medium">Continue</Text>
              </TouchableOpacity>
            </View>
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
