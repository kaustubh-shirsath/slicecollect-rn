import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface AgentInfo {
  id: string
  username: string
  name: string
  branch: string
  region: string
  role: string
  glCode: string
  employeeCode: string
  lat: number
  lng: number
  portfolioType: 'bank' | 'slice' | 'all'  // 'all' = unified login, product mix comes from allocation data
}

interface AgentContextValue {
  agentInfo: AgentInfo | null
  setAgentInfo: (info: AgentInfo | null) => void
  dataVersion: number
  triggerReroute: () => void
}

const AgentContext = createContext<AgentContextValue>({
  agentInfo: null,
  setAgentInfo: () => {},
  dataVersion: 0,
  triggerReroute: () => {},
})

const DEFAULT_AGENT: AgentInfo = {
  id: 'emp01',
  username: 'Gakul_Khanikar',
  name: 'Gakul Khanikar',
  branch: 'DIBRUGARH',
  region: 'Upper Assam',
  role: 'FOA',
  glCode: '11799',
  employeeCode: 'emp01',
  lat: 27.4728,
  lng: 94.9120,
  portfolioType: 'all',
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(DEFAULT_AGENT)
  const [dataVersion, setDataVersion] = useState(0)

  const triggerReroute = () => {
    setDataVersion(v => v + 1)
  }

  return (
    <AgentContext.Provider value={{ agentInfo, setAgentInfo, dataVersion, triggerReroute }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  return useContext(AgentContext)
}
