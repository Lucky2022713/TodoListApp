// App.js (entrypoint)

import { LogBox } from 'react-native';

// Suppress the Reanimated “Reduced motion setting…” warning (development only)
LogBox.ignoreLogs([
  '[Reanimated] Reduced motion setting is enabled on this device.',
]);

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Asset } from 'expo-asset';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions } from './src/notifications';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './context/AuthContext';
import LoginRegisterScreen from './screens/LoginRegisterScreen';
import DrawerNav from './navigation/DrawerNav';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        // Preload any custom sound (e.g., alarm.mp3)
        await Asset.loadAsync(require('./assets/sound/alarm.mp3'));

        // Request notification permissions from the user
        await requestNotificationPermissions();
      } catch (e) {
        console.warn('App preload error:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Auth">
          <Stack.Screen
            name="Auth"
            component={LoginRegisterScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Drawer"
            component={DrawerNav}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
