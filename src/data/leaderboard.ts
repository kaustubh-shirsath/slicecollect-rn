import { AGENTS } from './agents'
import { ALL_CUSTOMERS } from './customers'
import { getActivity } from './activityLog'

export interface LeaderboardEntry {
  rank: number
  username: string
  name: string
  collected: number
  cases: number
}

export interface AgentPerf {
  username: string
  name: string
  branch: string
  region: string
  employeeCode: string
  totalCases: number
  totalOverdue: number
  weeklyCollected: number
  weeklyTarget: number
  monthlyCollected: number
  // Mon–Sat daily collected amounts for current week
  dailyBar: number[]   // index 0 = Mon, 5 = Sat
  totalOverdueFormatted: string
  zone: string
  reportingTo: string
}

// Returns ISO date string 'YYYY-MM-DD' for a given weekday of the current week
// weekday: 1=Mon, 2=Tue ... 6=Sat
function weekdayDate(weekday: number): string {
  const now = new Date()
  const day = now.getDay() || 7   // 0=Sun → 7
  const diff = weekday - day
  const d = new Date(now)
  d.setDate(now.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export function getAgentPerf(username: string): AgentPerf | null {
  const agent = AGENTS.find(a => a.username === username)
  if (!agent) return null

  const myCases = ALL_CUSTOMERS.filter(c => c.username === username)
  const thisMonth = new Date().getMonth()
  const thisYear  = new Date().getFullYear()

  // Build weekday date set (Mon–Sat of current week)
  const weekDates = [1,2,3,4,5,6].map(weekdayDate)   // ['2026-06-01', ..., '2026-06-06']
  const dailyBar  = [0,0,0,0,0,0]

  let weeklyCollected  = 0
  let monthlyCollected = 0
  let totalOverdue     = 0

  for (const c of myCases) {
    totalOverdue += c.emiOs
    const act = getActivity(c.partyId)
    if (!act) continue
    for (const col of act.collections) {
      const [y, m] = col.date.split('-').map(Number)
      if (m - 1 === thisMonth && y === thisYear) monthlyCollected += col.amount

      const idx = weekDates.indexOf(col.date)
      if (idx >= 0) {
        dailyBar[idx]     += col.amount
        weeklyCollected   += col.amount
      }
    }
  }

  // Normalise bar heights to max 100 (percentage)
  const maxBar = Math.max(...dailyBar, 1)
  const dailyBarPct = dailyBar.map(v => Math.round((v / maxBar) * 80))  // max 80% height

  const REPORTING: Record<string, string> = {
    'DIBRUGARH':  'Ashok Mehta (ROA)',
    'DOOMDOMA':   'Ashok Mehta (ROA)',
    'NAGAON':     'Bipul Bora (ROA)',
    'GOGAMUKH':   'Ranjit Das (ROA)',
    'SARUPATHAR': 'Bipul Bora (ROA)',
    'SIVASAGAR':  'Ashok Mehta (ROA)',
  }

  return {
    username,
    name: agent.name,
    branch: agent.branch,
    region: agent.region,
    employeeCode: agent.employeeCode,
    totalCases: myCases.length,
    totalOverdue,
    weeklyCollected,
    weeklyTarget: 2000000,
    monthlyCollected,
    dailyBar: dailyBarPct,
    totalOverdueFormatted: '₹' + totalOverdue.toLocaleString('en-IN'),
    zone: agent.region.includes('Upper') ? 'North East' : agent.region.includes('Central') ? 'Central NE' : 'North Bank',
    reportingTo: REPORTING[agent.branch] || 'Area Manager',
  }
}

export function getBranchLeaderboard(branch: string): LeaderboardEntry[] {
  const branchAgents = AGENTS.filter(a => a.branch === branch)

  const rows = branchAgents.map(agent => {
    const myCases = ALL_CUSTOMERS.filter(c => c.username === agent.username)
    const collected = myCases.reduce((sum, c) => {
      const act = getActivity(c.partyId)
      return sum + (act?.collections.reduce((s, col) => s + col.amount, 0) ?? 0)
    }, 0)
    return { username: agent.username, name: agent.name, collected, cases: myCases.length }
  })

  rows.sort((a, b) => b.collected - a.collected)
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}
