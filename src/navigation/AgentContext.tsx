import { createContext, useContext, useState, ReactNode } from 'react'
import { setToken } from '../api/client'

export interface AgentInfo {
  agentId: string
  name: string
  email: string
  branchCode: string
  mobileNo: string | null
  lat: number
  lng: number
}

interface AgentContextValue {
  agentInfo: AgentInfo | null
  setAgentInfo: (info: AgentInfo | null) => void
  token: string | null
  setToken: (token: string | null) => void
  dataVersion: number
  triggerReroute: () => void
}

const AgentContext = createContext<AgentContextValue>({
  agentInfo: null,
  setAgentInfo: () => {},
  token: null,
  setToken: () => {},
  dataVersion: 0,
  triggerReroute: () => {},
})

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null)
  const [token, _setToken] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0)

  function handleSetToken(t: string | null) {
    _setToken(t)
    setToken(t) // sync to the fetch client module
  }

  function handleSetAgentInfo(info: AgentInfo | null) {
    setAgentInfo(info)
    if (!info) handleSetToken(null)
  }

  const triggerReroute = () => setDataVersion(v => v + 1)

  return (
    <AgentContext.Provider value={{
      agentInfo,
      setAgentInfo: handleSetAgentInfo,
      token,
      setToken: handleSetToken,
      dataVersion,
      triggerReroute,
    }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  return useContext(AgentContext)
}
