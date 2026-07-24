// Single source of truth for product display. Three products, same treatment,
// customized only where business logic differs (payment modes, waiver checker, buckets).
export type ProductType = 'bank' | 'cc' | 'borrow'

export const PRODUCT_LABEL: Record<ProductType, string> = {
  bank: 'Loans',
  cc: 'Credit Card',
  borrow: 'Borrow',
}

export const PRODUCT_COLORS: Record<ProductType, { bg: string; text: string }> = {
  bank:   { bg: '#E0F4E8', text: '#007E2F' },
  cc:     { bg: '#DBEAFE', text: '#1D4ED8' },
  borrow: { bg: '#FAE2FA', text: '#A008A3' },
}
