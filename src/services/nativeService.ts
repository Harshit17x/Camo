import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

export const initNativeApp = async () => {
  if (!isNative) return;

  try {
    // Set Status Bar
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#000000' });
    }
    
    // Hide Splash Screen
    await SplashScreen.hide();
    
    console.log(`Native app initialized on ${Capacitor.getPlatform()}`);
  } catch (err) {
    console.error('Error initializing native app:', err);
  }
};

export const requestNativePermissions = async () => {
  if (!isNative) return;

  try {
    // Request Geolocation
    const geoStatus = await Geolocation.requestPermissions();
    console.log('Geolocation permission:', geoStatus);

    // Request Push Notifications
    const pushStatus = await PushNotifications.requestPermissions();
    console.log('Push notification permission:', pushStatus);
  } catch (err) {
    console.error('Error requesting native permissions:', err);
  }
};

export const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
  if (!isNative) return;
  try {
    await Haptics.impact({ style });
  } catch (err) {
    console.error('Error triggering haptic:', err);
  }
};

export const getCurrentPosition = async () => {
  if (!isNative) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }),
        (err) => reject(err)
      );
    });
  }

  try {
    const pos = await Geolocation.getCurrentPosition();
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude
    };
  } catch (err) {
    console.error('Error getting native position:', err);
    throw err;
  }
};
