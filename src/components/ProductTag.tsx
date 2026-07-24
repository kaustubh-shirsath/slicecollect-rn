import { View, Text } from 'react-native'
import { PRODUCT_LABEL, PRODUCT_COLORS, type ProductType } from '../utils/productLabels'

// Uniform product pill — rendered for ALL products (Loans / Credit Card / Borrow)
export default function ProductTag({ userType }: { userType?: string }) {
  const pt = (userType || 'bank') as ProductType
  const colors = PRODUCT_COLORS[pt] ?? PRODUCT_COLORS.bank
  return (
    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg }}>
      <Text className="text-[10px] font-bold" style={{ color: colors.text }}>
        {PRODUCT_LABEL[pt]}
      </Text>
    </View>
  )
}
