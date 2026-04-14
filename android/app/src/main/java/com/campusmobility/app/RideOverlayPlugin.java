package com.campusmobility.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RideOverlay")
public class RideOverlayPlugin extends Plugin {

    private static final String TAG = "RideOverlayPlugin";
    private static final int OVERLAY_PERMISSION_REQUEST = 5001;

    private JSObject pendingEvent = null;

    @Override
    public void load() {
        // Register as the overlay action listener so we can relay events to JS
        OverlayService.setActionListener(new OverlayService.OverlayActionListener() {
            @Override
            public void onRideAccepted(String rideId) {
                JSObject data = new JSObject();
                data.put("rideId", rideId);
                data.put("action", "accepted");
                notifyListeners("overlayAction", data);
                Log.d(TAG, "Notified JS: ride accepted " + rideId);
            }

            @Override
            public void onRideRejected(String rideId) {
                JSObject data = new JSObject();
                data.put("rideId", rideId);
                data.put("action", "rejected");
                notifyListeners("overlayAction", data);
                Log.d(TAG, "Notified JS: ride rejected " + rideId);
            }

            @Override
            public void onOverlayDismissed(String rideId) {
                JSObject data = new JSObject();
                data.put("rideId", rideId);
                data.put("action", "dismissed");
                notifyListeners("overlayAction", data);
                Log.d(TAG, "Notified JS: overlay dismissed " + rideId);
            }
        });
    }

    /**
     * Check if the app has overlay (draw over other apps) permission.
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            result.put("granted", Settings.canDrawOverlays(getContext()));
        } else {
            result.put("granted", true); // Pre-M doesn't need runtime permission
        }
        call.resolve(result);
    }

    /**
     * Request the "Display over other apps" permission by opening system settings.
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Settings.canDrawOverlays(getContext())) {
                JSObject result = new JSObject();
                result.put("granted", true);
                call.resolve(result);
                return;
            }

            // Save the call so we can resolve it after the user returns
            saveCall(call);

            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getContext().getPackageName())
            );
            startActivityForResult(call, intent, OVERLAY_PERMISSION_REQUEST);
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void getPendingAction(PluginCall call) {
        Intent intent = getActivity().getIntent();
        if (intent != null && intent.hasExtra("overlay_action")) {
            processIntent(intent);
        }

        if (pendingEvent != null) {
            call.resolve(pendingEvent);
            pendingEvent = null;
        } else {
            call.resolve(new JSObject());
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        processIntent(intent);
    }

    private void processIntent(Intent intent) {
        if (intent != null && intent.hasExtra("overlay_action")) {
            String action = intent.getStringExtra("overlay_action");
            String rideId = intent.getStringExtra("rideId");

            JSObject data = new JSObject();
            data.put("rideId", rideId);
            data.put("action", action);
            
            intent.removeExtra("overlay_action");
            intent.removeExtra("rideId");

            pendingEvent = data;
            notifyListeners("overlayAction", data);
            Log.d(TAG, "Notified JS from intent: ride " + action + " " + rideId);
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        if (requestCode == OVERLAY_PERMISSION_REQUEST) {
            PluginCall savedCall = getSavedCall();
            if (savedCall == null) return;

            JSObject result = new JSObject();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                result.put("granted", Settings.canDrawOverlays(getContext()));
            } else {
                result.put("granted", true);
            }
            savedCall.resolve(result);
            freeSavedCall();
        }
    }

    /**
     * Show the overlay with ride request data.
     */
    @PluginMethod
    public void showOverlay(PluginCall call) {
        String rideId = call.getString("rideId", "");
        String pickup = call.getString("pickup", "");
        String dropoff = call.getString("dropoff", "");
        String fare = call.getString("fare", "0");
        String rideType = call.getString("rideType", "Ride");
        String distance = call.getString("distance", "");

        // Check permission first
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getContext())) {
            call.reject("Overlay permission not granted. Please enable 'Display over other apps' in settings.");
            return;
        }

        Intent serviceIntent = new Intent(getContext(), OverlayService.class);
        serviceIntent.setAction(OverlayService.ACTION_SHOW);
        serviceIntent.putExtra("rideId", rideId);
        serviceIntent.putExtra("pickup", pickup);
        serviceIntent.putExtra("dropoff", dropoff);
        serviceIntent.putExtra("fare", fare);
        serviceIntent.putExtra("rideType", rideType);
        serviceIntent.putExtra("distance", distance);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        Log.d(TAG, "Started overlay service for ride: " + rideId);
        call.resolve();
    }

    /**
     * Dismiss the currently showing overlay.
     */
    @PluginMethod
    public void dismissOverlay(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), OverlayService.class);
        serviceIntent.setAction(OverlayService.ACTION_DISMISS);

        try {
            getContext().startService(serviceIntent);
        } catch (Exception e) {
            Log.w(TAG, "Could not dismiss overlay service (may not be running)", e);
        }

        call.resolve();
    }
}
