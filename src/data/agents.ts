export interface Agent {
  employeeCode: string
  username: string
  name: string
  branch: string
  region: string
  role: 'FOA'
  glCode: string
  password: string
  lat: number
  lng: number
}

export const AGENTS: Agent[] = [
  { employeeCode: 'EMP-DBR-001', username: 'Gakul_Khanikar',  name: 'Gakul Khanikar',   branch: 'DIBRUGARH',  region: 'Upper Assam',   role: 'FOA', glCode: '11799', password: '000000', lat: 27.4728, lng: 94.9120 },
  { employeeCode: 'EMP-DDM-001', username: 'Mampee_Tanti',    name: 'Mampee Tanti',      branch: 'DOOMDOMA',   region: 'Upper Assam',   role: 'FOA', glCode: '11802', password: '000000', lat: 27.4582, lng: 95.3914 },
  { employeeCode: 'EMP-DDM-002', username: 'Mantu_Sonowal',   name: 'Mantu Sonowal',     branch: 'DOOMDOMA',   region: 'Upper Assam',   role: 'FOA', glCode: '11802', password: '000000', lat: 27.4582, lng: 95.3914 },
  { employeeCode: 'EMP-DBR-002', username: 'Ripon_Mech7',     name: 'Ripon Mech',        branch: 'DIBRUGARH',  region: 'Upper Assam',   role: 'FOA', glCode: '11799', password: '000000', lat: 27.4728, lng: 94.9120 },
  { employeeCode: 'EMP-NGN-001', username: 'Dipanjali_Das7',  name: 'Dipanjali Das',     branch: 'NAGAON',     region: 'Central Assam', role: 'FOA', glCode: '11815', password: '000000', lat: 26.3509, lng: 92.6843 },
  { employeeCode: 'EMP-NGN-002', username: 'Niku_Das7',       name: 'Niku Das',          branch: 'NAGAON',     region: 'Central Assam', role: 'FOA', glCode: '11815', password: '000000', lat: 26.3509, lng: 92.6843 },
  { employeeCode: 'EMP-GGM-001', username: 'Jitu_Moni',       name: 'Jitu Moni',         branch: 'GOGAMUKH',   region: 'North Bank',    role: 'FOA', glCode: '11821', password: '000000', lat: 27.2642, lng: 94.1128 },
  { employeeCode: 'EMP-SRP-001', username: 'Pankaj_Sil',      name: 'Pankaj Sil',        branch: 'SARUPATHAR', region: 'Central Assam', role: 'FOA', glCode: '11818', password: '000000', lat: 26.5474, lng: 93.6693 },
  { employeeCode: 'EMP-SVS-001', username: 'Sumi_Buragohain', name: 'Sumi Buragohain',   branch: 'SIVASAGAR',  region: 'Upper Assam',   role: 'FOA', glCode: '11807', password: '000000', lat: 26.9840, lng: 94.6363 },
  { employeeCode: 'EMP-DBR-003', username: 'Anurag_Gogoi7',   name: 'Anurag Gogoi',      branch: 'DIBRUGARH',  region: 'Upper Assam',   role: 'FOA', glCode: '11799', password: '000000', lat: 27.4728, lng: 94.9120 },
]

export function findAgent(input: string): Agent | undefined {
  return AGENTS.find(a => a.employeeCode === input || a.username === input)
}
