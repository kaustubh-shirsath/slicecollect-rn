import './global.css'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { View, Text, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'

import { AgentProvider } from './src/navigation/AgentContext'
import { RootStackParamList, MainTabParamList, SalesTabParamList } from './src/navigation/types'

import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import AllocationsScreen from './src/screens/AllocationsScreen'
import SmartScreen from './src/screens/SmartScreen'
import VisitsScreen from './src/screens/VisitsScreen'
import CustomerDetailScreen from './src/screens/CustomerDetailScreen'
import DispositionScreen from './src/screens/DispositionScreen'
import ReceiptScreen from './src/screens/ReceiptScreen'
import SettlementScreen from './src/screens/SettlementScreen'
import PaymentLinkScreen from './src/screens/PaymentLinkScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import DepositionScreen from './src/screens/DepositionScreen'

// Sales screens
import SalesHomeScreen from './src/screens/sales/SalesHomeScreen'
import SalesMerchantsScreen from './src/screens/sales/SalesMerchantsScreen'
import SalesRouteScreen from './src/screens/sales/SalesRouteScreen'
import SalesDepositionScreen from './src/screens/sales/SalesDepositionScreen'
import SalesMerchantDetailScreen from './src/screens/sales/SalesMerchantDetailScreen'
import SalesCollectScreen from './src/screens/sales/SalesCollectScreen'
import SalesReceiptScreen from './src/screens/sales/SalesReceiptScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab   = createBottomTabNavigator<MainTabParamList>()
const SalesTab = createBottomTabNavigator<SalesTabParamList>()

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={{ width: '100%', height: 68, alignItems: 'center', justifyContent: 'center', paddingTop: 28}}>
      <View style={{
        backgroundColor: focused ? '#FAE2FA' : 'transparent',
        borderRadius: 18,
        paddingHorizontal: focused ? 12 : 0,
        paddingVertical: focused ? 4 : 0,
        minWidth: focused ? 44 : undefined,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 20, lineHeight: 24 }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 10, marginTop: 3, color: focused ? '#D30AD7' : 'rgba(0,0,0,0.35)', fontWeight: focused ? '700' : '400', lineHeight: 13 }}>
        {label}
      </Text>
    </View>
  )
}

function SalesTabs() {
  return (
    <SalesTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: '#FFFFFF',
          borderRadius: 32,
          height: 68,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.14,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarItemStyle: {
          height: 68,
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <SalesTab.Screen
        name="SalesHome"
        component={SalesHomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" emoji="🏠" focused={focused} /> }}
      />
      <SalesTab.Screen
        name="SalesMerchants"
        component={SalesMerchantsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Merchants" emoji="🏪" focused={focused} /> }}
      />
      <SalesTab.Screen
        name="SalesRoute"
        component={SalesRouteScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Route" emoji="⚡" focused={focused} /> }}
      />
      <SalesTab.Screen
        name="SalesDeposit"
        component={SalesDepositionScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Deposit" emoji="🏦" focused={focused} /> }}
      />
    </SalesTab.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: '#FFFFFF',
          borderRadius: 32,
          height: 68,
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.14,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarItemStyle: {
          height: 68,
          paddingTop: 0,
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Allocations"
        component={AllocationsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Cases" emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Smart"
        component={SmartScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Route" emoji="⚡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Visits"
        component={VisitsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Visits" emoji="📊" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#E5E7EB', alignItems: Platform.OS === 'web' ? 'center' : undefined }}>
      <View style={Platform.OS === 'web' ? { width: 390, flex: 1, overflow: 'hidden', backgroundColor: '#F0F4F7' } : { flex: 1 }}>
      <SafeAreaProvider>
        <AgentProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="SalesMain" component={SalesTabs} />
              <Stack.Screen
                name="SalesMerchantDetail"
                component={SalesMerchantDetailScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="SalesCollect"
                component={SalesCollectScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="SalesReceipt"
                component={SalesReceiptScreen}
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="CustomerDetail"
                component={CustomerDetailScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Disposition"
                component={DispositionScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Settlement"
                component={SettlementScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="PaymentLink"
                component={PaymentLinkScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Receipt"
                component={ReceiptScreen}
                options={{ animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ animation: 'slide_from_right' }}
              />
              <Stack.Screen
                name="Deposition"
                component={DepositionScreen}
                options={{ animation: 'slide_from_right' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AgentProvider>
      </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  )
}
