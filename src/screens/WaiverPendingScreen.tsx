import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/types'
import { getWaiverRequest } from '../data/waiverRequests'

type Props = NativeStackScreenProps<RootStackParamList, 'WaiverPending'>

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

function fmtTimestamp(ts: number) {
  const d = new Date(ts)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

export default function WaiverPendingScreen({ navigation, route }: Props) {
  const { customer, waiverRequestId } = route.params
  const waiver = getWaiverRequest(waiverRequestId)

  const customerName: string = customer?.name ?? customer?.customerName ?? '—'
  const partyId: string = customer?.partyId ?? customer?.id ?? '—'

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Waiver Request</Text>
          <Text style={styles.headerSub}>{customerName} · {partyId}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.amberCircle}>
            <Text style={styles.amberIcon}>⏳</Text>
          </View>
          <Text style={styles.statusHeading}>Approval Pending</Text>
          <Text style={styles.statusBody}>
            Your waiver request has been sent to your Agency Manager for approval. You'll be notified once it's reviewed.
          </Text>
          <View style={styles.refBadge}>
            <Text style={styles.refLabel}>Reference</Text>
            <Text style={styles.refValue}>{waiverRequestId}</Text>
          </View>
        </View>

        {/* Summary card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request Summary</Text>
          <View style={styles.divider} />
          <Row label="Customer" value={customerName} />
          <Row label="Party ID" value={partyId} />
          {waiver ? (
            <>
              <Row label="Waiver %" value={`${waiver.waiverPct}%`} />
              <Row label="Waiver Amount" value={fmt(waiver.waiverAmount)} />
              <Row label="Net Collectible" value={fmt(waiver.netCollectible)} />
              <Row label="Submitted" value={fmtTimestamp(waiver.submittedAt)} />
            </>
          ) : (
            <Text style={styles.noData}>Details unavailable</Text>
          )}
        </View>

        {/* What happens next */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Happens Next</Text>
          <View style={styles.divider} />

          {/* Step 1 — completed */}
          <View style={styles.step}>
            <View style={styles.stepLeft}>
              <View style={[styles.stepDot, styles.stepDotDone]}>
                <Text style={styles.stepDotText}>✓</Text>
              </View>
              <View style={styles.stepLine} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, styles.stepTitleDone]}>Disposition marked by you</Text>
              <Text style={styles.stepSub}>Completed</Text>
            </View>
          </View>

          {/* Step 2 — pending */}
          <View style={styles.step}>
            <View style={styles.stepLeft}>
              <View style={[styles.stepDot, styles.stepDotPending]}>
                <Text style={styles.stepDotText}>⏳</Text>
              </View>
              <View style={styles.stepLine} />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, styles.stepTitlePending]}>Agency Manager reviews waiver</Text>
              <Text style={styles.stepSub}>In progress</Text>
            </View>
          </View>

          {/* Step 3 — not started */}
          <View style={[styles.step, { marginBottom: 0 }]}>
            <View style={styles.stepLeft}>
              <View style={[styles.stepDot, styles.stepDotTodo]}>
                <Text style={[styles.stepDotText, { color: '#999' }]}>○</Text>
              </View>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, styles.stepTitleTodo]}>Payment link sent to customer</Text>
              <Text style={styles.stepSub}>Waiting for approval</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.btnPrimaryText}>Back to Cases</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnOutlineText}>View Customer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F0F4F7',
    fontFamily: '-apple-system',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  backArrow: {
    fontSize: 20,
    color: '#D30AD7',
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.9)',
    fontFamily: '-apple-system',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    marginTop: 1,
    fontFamily: '-apple-system',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.25)',
  },
  amberCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  amberIcon: {
    fontSize: 32,
  },
  statusHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 10,
    fontFamily: '-apple-system',
  },
  statusBody: {
    fontSize: 14,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
    marginBottom: 20,
    fontFamily: '-apple-system',
  },
  refBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.35)',
  },
  refLabel: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
    fontFamily: '-apple-system',
  },
  refValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#78350F',
    fontFamily: '-apple-system',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.85)',
    marginBottom: 12,
    fontFamily: '-apple-system',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: '-apple-system',
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.85)',
    fontFamily: '-apple-system',
    flex: 1,
    textAlign: 'right',
  },
  noData: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.35)',
    fontStyle: 'italic',
    fontFamily: '-apple-system',
  },
  step: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepLeft: {
    alignItems: 'center',
    width: 36,
    marginRight: 12,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#D30AD7',
  },
  stepDotPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  stepDotTodo: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  stepDotText: {
    fontSize: 13,
    color: '#D30AD7',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 4,
    marginBottom: -4,
    borderRadius: 1,
    minHeight: 16,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: '-apple-system',
  },
  stepTitleDone: {
    color: '#7C3AED',
  },
  stepTitlePending: {
    color: '#B45309',
  },
  stepTitleTodo: {
    color: 'rgba(0,0,0,0.35)',
  },
  stepSub: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
    fontFamily: '-apple-system',
  },
  buttonRow: {
    gap: 12,
    marginTop: 4,
  },
  btnPrimary: {
    backgroundColor: '#D30AD7',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#D30AD7',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: '-apple-system',
  },
  btnOutline: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D30AD7',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  btnOutlineText: {
    color: '#D30AD7',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: '-apple-system',
  },
})
