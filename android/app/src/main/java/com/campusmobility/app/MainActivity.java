package com.campusmobility.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static boolean isAppInForeground = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the RideOverlay plugin before super.onCreate
        registerPlugin(RideOverlayPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        isAppInForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        isAppInForeground = false;
    }
}
