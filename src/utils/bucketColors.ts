export const BUCKET_COLORS: Record<string, { bg: string; text: string }> = {
  'Standard':   { bg: '#E0F4E8', text: '#007E2F' },
  'SMA-0':      { bg: '#FFF0E0', text: '#A35300' },
  'SMA-1':      { bg: '#FFF0E0', text: '#A35300' },
  'SMA-2':      { bg: '#F9E4E5', text: '#CE1D26' },
  'NPA':        { bg: '#F9E4E5', text: '#CE1D26' },
  'Settlement': { bg: '#FAE2FA', text: '#A008A3' },
  'Write-Off':  { bg: '#EAEBED', text: 'rgba(0,0,0,0.7)' },
  // Slice buckets
  'BKT-1':      { bg: '#E0F4E8', text: '#007E2F' },
  'BKT-2':      { bg: '#FFF0E0', text: '#A35300' },
  'BKT-3':      { bg: '#FFF0E0', text: '#A35300' },
  'BKT-4':      { bg: '#F9E4E5', text: '#CE1D26' },
  'BKT-5':      { bg: '#F9E4E5', text: '#CE1D26' },
  'BKT-6+':     { bg: '#F9E4E5', text: '#CE1D26' },
}

export const getBucketColor = (bucket: string): { bg: string; text: string } =>
  BUCKET_COLORS[bucket] ?? { bg: '#EAEBED', text: 'rgba(0,0,0,0.7)' }
