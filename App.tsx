import './global.css'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { View, Text } from 'react-native'
import { StatusBar } from 'expo-status-bar'

import { AgentProvider } from './src/navigation/AgentContext'
import { RootStackParamList, MainTabParamList } from './src/navigation/types'

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

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab   = createBottomTabNavigator<MainTabParamList>()

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text style={{ fontSize: 10, marginTop: 2, color: focused ? '#D30AD7' : 'rgba(0,0,0,0.4)', fontWeight: focused ? '600' : '400' }}>
        {label}
      </Text>
    </View>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(0,0,0,0.06)',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
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
          tabBarIcon: ({ focused }) => <TabIcon label="Route" emoji="✦" focused={focused} />,
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  )
}
