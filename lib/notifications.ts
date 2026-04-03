import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { registerPushToken, updateNotificationSettings as updateSettingsApi } from './api'

// Configure notification handler (show notifications when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Request permission and get the Expo push token.
 * Returns the token string, or null if permission was denied or on a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications are not available on simulators')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  })

  // Android: set a default notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  return tokenData.data
}

/**
 * Sync the push token to the backend.
 */
export async function syncPushToken(token: string): Promise<void> {
  await registerPushToken(token, Platform.OS)
}

/**
 * Update notification settings on the backend.
 */
export async function updateNotificationSettings(enabled: boolean): Promise<void> {
  await updateSettingsApi(enabled)
}
