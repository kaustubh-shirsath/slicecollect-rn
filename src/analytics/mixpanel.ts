// Analytics wrapper — the ONLY file that touches the Mixpanel SDK.
// Web/PWA only: on native platforms every call is a silent no-op, so the
// native code path is completely untouched. Screens import { track, identify }
// from here and never the SDK directly.
//
// Token comes from EXPO_PUBLIC_MIXPANEL_TOKEN (never hardcoded). With no token
// set (e.g. the public demo), analytics is disabled and calls are no-ops.
import { Platform } from 'react-native'

type Props = Record<string, string | number | boolean | null | undefined>

let mp: any = null

const TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN

export function initAnalytics(): void {
  if (Platform.OS !== 'web' || !TOKEN || mp) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mp = require('mixpanel-browser')
    mp.init(TOKEN, {
      // sendBeacon survives tab kills — important for field agents closing the PWA mid-flow
      api_transport: 'sendBeacon',
      persistence: 'localStorage',
      ignore_dnt: false,
    })
    // Installed-PWA vs plain browser usage, attached to every event
    const standalone = typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)')?.matches
    mp.register({ display_mode: standalone ? 'pwa' : 'browser', app: 'slicefield' })
  } catch {
    mp = null
  }
}

/** Identify the agent after login. Never pass customer identifiers here. */
export function identify(employeeCode: string, profile: Props = {}): void {
  if (!mp) return
  mp.identify(employeeCode)
  mp.people.set(profile)
  // Agent context on every subsequent event
  mp.register({ branch: profile.branch, region: profile.region, agent_role: profile.role })
}

/** Track an event. Props must never contain customer PII — masked refs only. */
export function track(event: string, props: Props = {}): void {
  if (!mp) return
  mp.track(event, props)
}

export function resetAnalytics(): void {
  if (!mp) return
  mp.reset()
}
