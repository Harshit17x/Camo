package com.campusmobility.app;

import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Custom FCM service that intercepts HIGH-PRIORITY DATA-ONLY messages
 * (type = "ride_request_overlay") even when the app is in the background
 * or killed, and starts OverlayService to show the floating ride-request card.
 *
 * Registration: declared in AndroidManifest.xml below the <application> tag.
 */
public class RideRequestMessagingService extends FirebaseMessagingService {

    private static final String TAG = "RideRequestMsgService";
    private static final String OVERLAY_TYPE = "ride_request_overlay";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();

        if (data.isEmpty()) {
            // Regular notification message — let FCM handle it normally
            return;
        }

        String type = data.get("type");
        if (!OVERLAY_TYPE.equals(type)) {
            // Not our ride-request overlay message — ignore
            return;
        }

        Log.d(TAG, "Received ride_request_overlay FCM data message");

        // Extract ride fields
        String rideId    = data.getOrDefault("rideId",   "");
        String pickup    = data.getOrDefault("pickup",   "");
        String dropoff   = data.getOrDefault("dropoff",  "");
        String fare      = data.getOrDefault("fare",     "0");
        String rideType  = data.getOrDefault("rideType", "Ride");
        String distance  = data.getOrDefault("distance", "");

        // Only show overlay if SYSTEM_ALERT_WINDOW permission is granted
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !Settings.canDrawOverlays(getApplicationContext())) {
            Log.w(TAG, "SYSTEM_ALERT_WINDOW not granted — skipping overlay for ride: " + rideId);
            return;
        }

        // Avoid showing "over the display" overlay if the driver already has the app open
        if (MainActivity.isAppInForeground) {
            Log.d(TAG, "App is in foreground. Skipping native overlay... React UI will handle it.");
            return;
        }

        // Start OverlayService
        Intent serviceIntent = new Intent(getApplicationContext(), OverlayService.class);
        serviceIntent.setAction(OverlayService.ACTION_SHOW);
        serviceIntent.putExtra("rideId",   rideId);
        serviceIntent.putExtra("pickup",   pickup);
        serviceIntent.putExtra("dropoff",  dropoff);
        serviceIntent.putExtra("fare",     fare);
        serviceIntent.putExtra("rideType", rideType);
        serviceIntent.putExtra("distance", distance);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getApplicationContext().startForegroundService(serviceIntent);
        } else {
            getApplicationContext().startService(serviceIntent);
        }

        Log.d(TAG, "OverlayService started for rideId=" + rideId);
    }

    /**
     * Called when FCM issues a new registration token.
     * The Capacitor Push Notifications plugin already handles token refresh,
     * but we log it here for debugging.
     */
    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed (handled by Capacitor plugin): " + token.substring(0, 12) + "...");
    }
}
