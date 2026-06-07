/**
 * SliceCollect — Color Schema Reference
 *
 * Single source of truth for all colors used across the app.
 * Update this file whenever a new color is introduced or an existing one changes.
 *
 * Usage: import { COLORS } from '../utils/colorSchema'
 */

export const COLORS = {

  // ─── Primary Brand ───────────────────────────────────────────────────────
  brand: {
    primary:     '#D30AD7',  // Main purple — buttons, active states, CTAs
    dark:        '#A008A3',  // Dark purple — hover states, text on light bg
    light:       '#FAE2FA',  // Light purple — chip bg, avatar bg, highlights
    violet:      '#7B2FFF',  // Deep violet — occasional accent
    magentaAlt:  '#818cf8',  // Soft indigo — secondary accent (rare)
  },

  // ─── App Backgrounds & Surfaces ──────────────────────────────────────────
  surface: {
    appBg:       '#F0F4F7',  // Main app background (grey-blue)
    card:        '#FFFFFF',  // Card / panel background
    nearBlack:   '#090B0C',  // SmartScreen header, dark sections
    darkText:    '#1A1A1A',  // Dark headings
    neutralPill: '#EAEBED',  // Neutral tag / chip background
    divider:     '#E8E8E8',  // Borders and dividers
    inputBg:     '#F5F5F5',  // Input field background
  },

  // ─── Status — Green (Collected / Success) ────────────────────────────────
  green: {
    primary:     '#00A63E',  // Collected, checkmarks, success
    dark:        '#007E2F',  // Text on green background
    light:       '#E0F4E8',  // Light green background — collected badges
  },

  // ─── Status — Red (Overdue / Danger) ─────────────────────────────────────
  red: {
    primary:     '#CE1D26',  // Overdue amounts, logout, danger actions
    bright:      '#EF4444',  // Alerts, critical flags
    light:       '#F9E4E5',  // Light red background — danger chip bg
  },

  // ─── Status — Orange / Amber (PTP / Warning) ─────────────────────────────
  orange: {
    primary:     '#FF8100',  // PTP chip active state
    dark:        '#A35300',  // PTP / warning text on light bg
    darkAlt:     '#B45309',  // Alternative dark amber (rare)
    muted:       '#C05000',  // Muted orange (rare)
    light:       '#FFF0E0',  // PTP badge background
    lightAlt:    '#FFF9F0',  // Alternate light amber bg
    amber:       '#f59e0b',  // CIBIL / warning signal dot
    amberLight:  '#FFD580',  // Gold medal, amber highlight
  },

  // ─── Status — Blue (Neutral / Contacted) ─────────────────────────────────
  blue: {
    primary:     '#2B6ACF',  // Contacted-only, distance chip, sort button
    slate:       '#94A3B8',  // Silver medal, muted blue-grey
    slateAlt:    '#94a3b8',  // (same, keep consistent casing)
    stone:       '#78716c',  // Warm grey (rare)
  },

  // ─── Leaderboard / Tier Medals ───────────────────────────────────────────
  medals: {
    gold:        '#FFD580',
    silver:      '#94A3B8',
    bronze:      '#cd7f32',
  },

  // ─── External Integrations ───────────────────────────────────────────────
  external: {
    whatsapp:    '#25D366',  // WhatsApp share button
  },

  // ─── Text Opacity Scale (on white backgrounds) ───────────────────────────
  text: {
    primary:    'rgba(0,0,0,0.90)',  // Headings, primary content
    secondary:  'rgba(0,0,0,0.70)',  // Secondary content
    muted:      'rgba(0,0,0,0.50)',  // Labels, meta info
    faint:      'rgba(0,0,0,0.35)',  // Placeholders, captions
    ghost:      'rgba(0,0,0,0.15)',  // Dividers, subtle borders
  },

  // ─── Text Opacity Scale (on dark / #090B0C backgrounds) ─────────────────
  textOnDark: {
    primary:    'rgba(255,255,255,1.00)',
    secondary:  'rgba(255,255,255,0.60)',
    muted:      'rgba(255,255,255,0.40)',
    faint:      'rgba(255,255,255,0.30)',
    ghost:      'rgba(255,255,255,0.10)',
  },

} as const

// ─── Bucket Badge Colors ──────────────────────────────────────────────────
// See bucketColors.ts for the full map used in components.
// Reproduced here for reference:
//
//  Standard    bg: '#E0F4E8'  text: '#007E2F'           (green)
//  SMA-0       bg: '#FFF0E0'  text: '#A35300'           (orange)
//  SMA-1       bg: '#FFF0E0'  text: '#A35300'           (orange)
//  SMA-2       bg: '#F9E4E5'  text: '#CE1D26'           (red)
//  NPA         bg: '#F9E4E5'  text: '#CE1D26'           (red)
//  Settlement  bg: '#FAE2FA'  text: '#A008A3'           (purple)
//  Write-Off   bg: '#EAEBED'  text: 'rgba(0,0,0,0.7)'  (neutral grey)
