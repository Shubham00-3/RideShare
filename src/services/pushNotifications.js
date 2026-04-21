import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();

  if (!projectId) {
    return null;
  }

  try {
    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return {
      deviceLabel: Platform.OS,
      expoPushToken: token.data,
      platform: Platform.OS,
    };
  } catch (_error) {
    return null;
  }
}
