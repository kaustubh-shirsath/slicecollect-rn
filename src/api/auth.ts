import { apiFetch } from './client'

export interface LoginResponse {
  accessToken: string
  agent: {
    agentId: string
    name: string
    email: string
    branchCode: string
    mobileNo: string | null
    isActive: boolean
  }
}

export function login(agentId: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ agentId, password }),
  })
}
