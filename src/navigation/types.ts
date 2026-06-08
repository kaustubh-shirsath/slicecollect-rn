import type { Merchant } from '../data/merchants'

export interface SalesReceiptData {
  receiptNo: string
  merchantId: string
  businessName: string
  ownerName: string
  casaAccountNo: string
  amount: number
  notes: string
  agentName: string
  branchName: string
  createdAt: string
}

export type RootStackParamList = {
  Login: undefined
  Main: undefined
  CustomerDetail: { customer: any; fromScreen: string }
  Disposition: { customer: any; fromScreen: string }
  Settlement: { customer: any }
  PaymentLink: { customer: any }
  Receipt: { receipt: any; backTo: string }
  Import: undefined
  Deposition: undefined
  Profile: undefined
  // Sales screens
  SalesMain: undefined
  SalesMerchantDetail: { merchant: Merchant; fromScreen: string }
  SalesCollect: { merchant: Merchant }
  SalesReceipt: { receipt: SalesReceiptData; backTo: string }
}

export type MainTabParamList = {
  Home: undefined
  Allocations: { defaultBucket?: string }
  Smart: undefined
  Visits: undefined
}

export type SalesTabParamList = {
  SalesHome: undefined
  SalesMerchants: undefined
  SalesRoute: undefined
  SalesDeposit: undefined
}
