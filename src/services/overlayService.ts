import { Capacitor, registerPlugin } from '@capacitor/core';

// ─────────────────────────────────────────────────────────────────────────────
// Plugin definition – mirrors RideOverlayPlugin.java on Android.
// On web/iOS it degrades gracefully (no-ops).
// ─────────────────────────────────────────────────────────────────────────────

export interface RideOverlayPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  showOverlay(options: {
    rideId: string;
    pickup: string;
    dropoff: string;
    fare: string;
    rideType: string;
    distance?: string;
  }): Promise<void>;
  dismissOverlay(): Promise<void>;
  addListener(
    event: 'overlayAction',
    handler: (data: { rideId: string; action: 'accepted' | 'rejected' | 'dismissed' }) => void
  ): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
  getPendingAction(): Promise<{ rideId?: string; action?: 'accepted' | 'rejected' | 'dismissed' }>;
}

// Register the native plugin – resolves to the Java class on Android,
// returns a no-op proxy on web / iOS.
const RideOverlayNative = registerPlugin<RideOverlayPlugin>('RideOverlay', {
  web: () =>
    import('./overlayServiceWeb').then((m) => new m.RideOverlayWeb()),
});

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers
// ─────────────────────────────────────────────────────────────────────────────

const isAndroid = Capacitor.getPlatform() === 'android';

/**
 * Returns whether the app currently has the "Display over other apps"
 * permission granted.  Always true on non-Android platforms.
 */
export const checkOverlayPermission = async (): Promise<boolean> => {
  if (!isAndroid) return false; // Overlay only makes sense on Android
  try {
    const { granted } = await RideOverlayNative.checkPermission();
    return granted;
  } catch {
    return false;
  }
};

/**
 * Opens the Android system settings page for the overlay permission.
 * Resolves once the user returns to the app.
 * On non-Android platforms this is a no-op that returns `false`.
 */
export const requestOverlayPermission = async (): Promise<boolean> => {
  if (!isAndroid) return false;
  try {
    const { granted } = await RideOverlayNative.requestPermission();
    return granted;
  } catch {
    return false;
  }
};

export interface OverlayRideData {
  rideId: string;
  pickup: string;
  dropoff: string;
  fare: number;
  rideType: string;
  distance?: string;
}

/**
 * Displays the floating ride-request overlay on top of all other apps.
 * Requires the SYSTEM_ALERT_WINDOW permission to have been granted first.
 * Returns `true` if the overlay was shown, `false` otherwise.
 */
export const showRideOverlay = async (ride: OverlayRideData): Promise<boolean> => {
  if (!isAndroid) return false;

  try {
    const hasPermission = await checkOverlayPermission();
    if (!hasPermission) {
      console.warn('[Overlay] Missing SYSTEM_ALERT_WINDOW permission – skipping overlay.');
      return false;
    }

    await RideOverlayNative.showOverlay({
      rideId: ride.rideId,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      fare: String(Math.round(ride.fare)),
      rideType: ride.rideType,
      distance: ride.distance ?? '',
    });

    return true;
  } catch (err) {
    console.error('[Overlay] Failed to show overlay:', err);
    return false;
  }
};

/**
 * Programmatically dismiss the overlay (e.g. when the driver accepts/rejects
 * from within the app while the overlay is showing).
 */
export const dismissRideOverlay = async (): Promise<void> => {
  if (!isAndroid) return;
  try {
    await RideOverlayNative.dismissOverlay();
  } catch {
    // Ignore – service may not be running
  }
};

export type OverlayActionHandler = (data: {
  rideId: string;
  action: 'accepted' | 'rejected' | 'dismissed';
}) => void;

export const addOverlayActionListener = (
  handler: OverlayActionHandler
): (() => void) => {
  if (!isAndroid) return () => {};

  let listenerHandle: { remove: () => void } | null = null;
  let isRemoved = false;

  RideOverlayNative.addListener('overlayAction', handler).then((handle) => {
    if (isRemoved) {
      handle.remove();
    } else {
      listenerHandle = handle;
    }
  });

  return () => {
    isRemoved = true;
    if (listenerHandle) {
      listenerHandle.remove();
    }
  };
};

export const getPendingOverlayAction = async () => {
  if (!isAndroid) return {};
  try {
    return await RideOverlayNative.getPendingAction();
  } catch {
    return {};
  }
};
