// Android emulator: 10.0.2.2 → host machine localhost
// iOS simulator / physical device: change to your machine's LAN IP
export const API_BASE = 'http://10.0.2.2:3001/api/v1'

let _token: string | null = null

export function setToken(token: string | null) {
  _token = token
}

export function getToken() {
  return _token
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const { params, ...fetchOpts } = options

  let url = API_BASE + path
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (qs) url += '?' + qs
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOpts.headers as Record<string, string>),
  }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const res = await fetch(url, { ...fetchOpts, headers })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}
