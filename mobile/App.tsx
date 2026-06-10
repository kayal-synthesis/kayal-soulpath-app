import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

import { store, persistor } from './src/store'
import { AuthProvider } from './src/contexts/AuthContext'
import { NotificationProvider } from './src/contexts/NotificationContext'

import HomeScreen from './src/screens/HomeScreen'
import InsightsScreen from './src/screens/InsightsScreen'
import CameraScreen from './src/screens/CameraScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import ReferralScreen from './src/screens/ReferralScreen'

const Tab = createBottomTabNavigator()

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <NotificationProvider>
            <NavigationContainer>
              <Tab.Navigator>
                <Tab.Screen name="Home" component={HomeScreen} />
                <Tab.Screen name="Insights" component={InsightsScreen} />
                <Tab.Screen name="Camera" component={CameraScreen} />
                <Tab.Screen name="Referral" component={ReferralScreen} />
                <Tab.Screen name="Profile" component={ProfileScreen} />
              </Tab.Navigator>
            </NavigationContainer>
          </NotificationProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  )
}