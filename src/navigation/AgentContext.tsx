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

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
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
