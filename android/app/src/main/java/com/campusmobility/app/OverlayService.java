package com.campusmobility.app;

import android.animation.ObjectAnimator;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.LinearInterpolator;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class OverlayService extends Service {

    private static final String TAG = "OverlayService";
    private static final String CHANNEL_ID = "ride_overlay_channel";
    private static final int NOTIFICATION_ID = 2001;
    private static final long OVERLAY_TIMEOUT_MS = 30_000; // 30 seconds auto-dismiss

    private WindowManager windowManager;
    private View overlayView;
    private CountDownTimer countDownTimer;
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;

    // Ride data
    private String rideId;
    private String pickup;
    private String dropoff;
    private String fare;
    private String rideType;
    private String distance;

    // Callback action constants
    public static final String ACTION_SHOW = "com.campusmobility.app.SHOW_OVERLAY";
    public static final String ACTION_DISMISS = "com.campusmobility.app.DISMISS_OVERLAY";
    public static final String ACTION_ACCEPTED = "com.campusmobility.app.RIDE_ACCEPTED";
    public static final String ACTION_REJECTED = "com.campusmobility.app.RIDE_REJECTED";

    // Static listener for plugin communication
    private static OverlayActionListener actionListener;

    public interface OverlayActionListener {
        void onRideAccepted(String rideId);
        void onRideRejected(String rideId);
        void onOverlayDismissed(String rideId);
    }

    public static void setActionListener(OverlayActionListener listener) {
        actionListener = listener;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();

        if (ACTION_DISMISS.equals(action)) {
            dismissOverlay("dismissed");
            return START_NOT_STICKY;
        }

        if (ACTION_SHOW.equals(action)) {
            // Extract ride data from intent
            rideId = intent.getStringExtra("rideId");
            pickup = intent.getStringExtra("pickup");
            dropoff = intent.getStringExtra("dropoff");
            fare = intent.getStringExtra("fare");
            rideType = intent.getStringExtra("rideType");
            distance = intent.getStringExtra("distance");

            // Start as foreground service
            startForeground(NOTIFICATION_ID, buildForegroundNotification());

            // Show the overlay
            showOverlay();

            // Start haptic feedback + sound
            startAlertFeedback();
        }

        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Ride Request Overlay",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Shows ride requests as overlay");
            channel.enableVibration(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager mgr = getSystemService(NotificationManager.class);
            if (mgr != null) {
                mgr.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("New Ride Request!")
                .setContentText(pickup != null ? "Pickup: " + pickup : "A new ride is waiting")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setOngoing(true)
                .build();
    }

    private void showOverlay() {
        // Remove any existing overlay first
        removeOverlayView();

        LayoutInflater inflater = (LayoutInflater) getSystemService(LAYOUT_INFLATER_SERVICE);
        overlayView = inflater.inflate(R.layout.overlay_ride_request, null);

        // Setup window params
        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                        | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;

        // Populate views
        TextView textFare = overlayView.findViewById(R.id.text_fare);
        TextView textRideType = overlayView.findViewById(R.id.text_ride_type);
        TextView textDistance = overlayView.findViewById(R.id.text_distance);
        TextView textPickup = overlayView.findViewById(R.id.text_pickup);
        TextView textDropoff = overlayView.findViewById(R.id.text_dropoff);
        TextView btnAccept = overlayView.findViewById(R.id.btn_accept);
        TextView btnReject = overlayView.findViewById(R.id.btn_reject);
        View timerBar = overlayView.findViewById(R.id.timer_bar);
        View pulseDot = overlayView.findViewById(R.id.pulse_dot);

        if (fare != null) textFare.setText("₹" + fare);
        if (rideType != null) textRideType.setText(rideType);
        if (distance != null && !distance.isEmpty()) textDistance.setText(distance);
        if (pickup != null) textPickup.setText(pickup);
        if (dropoff != null) textDropoff.setText(dropoff);

        // Pulsing animation for the green dot
        AlphaAnimation pulse = new AlphaAnimation(1f, 0.3f);
        pulse.setDuration(800);
        pulse.setRepeatMode(Animation.REVERSE);
        pulse.setRepeatCount(Animation.INFINITE);
        pulseDot.startAnimation(pulse);

        // Slide-in animation for the card
        LinearLayout card = overlayView.findViewById(R.id.card_container);
        card.setTranslationY(-500f);
        card.setAlpha(0f);
        card.animate()
                .translationY(0f)
                .alpha(1f)
                .setDuration(400)
                .setInterpolator(new android.view.animation.OvershootInterpolator(0.8f))
                .start();

        // Accept button
        btnAccept.setOnClickListener(v -> {
            Log.d(TAG, "Ride ACCEPTED: " + rideId);
            if (actionListener != null) {
                actionListener.onRideAccepted(rideId);
            }
            
            // Bring app to foreground
            Intent openAppIntent = new Intent(this, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openAppIntent.putExtra("overlay_action", "accepted");
            openAppIntent.putExtra("rideId", rideId);
            startActivity(openAppIntent);

            // Also broadcast for the app to pick up
            Intent broadcastIntent = new Intent(ACTION_ACCEPTED);
            broadcastIntent.putExtra("rideId", rideId);
            broadcastIntent.setPackage(getPackageName());
            sendBroadcast(broadcastIntent);

            dismissOverlay("accepted");
        });

        // Reject button
        btnReject.setOnClickListener(v -> {
            Log.d(TAG, "Ride REJECTED: " + rideId);
            if (actionListener != null) {
                actionListener.onRideRejected(rideId);
            }
            
            // Bring app to foreground
            Intent openAppIntent = new Intent(this, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            openAppIntent.putExtra("overlay_action", "rejected");
            openAppIntent.putExtra("rideId", rideId);
            startActivity(openAppIntent);

            Intent broadcastIntent = new Intent(ACTION_REJECTED);
            broadcastIntent.putExtra("rideId", rideId);
            broadcastIntent.setPackage(getPackageName());
            sendBroadcast(broadcastIntent);

            dismissOverlay("rejected");
        });

        // Timer countdown animation
        ObjectAnimator timerAnim = ObjectAnimator.ofFloat(timerBar, "scaleX", 1f, 0f);
        timerAnim.setDuration(OVERLAY_TIMEOUT_MS);
        timerAnim.setInterpolator(new LinearInterpolator());
        timerBar.setPivotX(0f);
        timerAnim.start();

        // Auto-dismiss timer
        countDownTimer = new CountDownTimer(OVERLAY_TIMEOUT_MS, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                // Timer tick - bar animation handles visual feedback
            }

            @Override
            public void onFinish() {
                Log.d(TAG, "Overlay timed out for ride: " + rideId);
                if (actionListener != null) {
                    actionListener.onOverlayDismissed(rideId);
                }
                dismissOverlay("timeout");
            }
        }.start();

        try {
            windowManager.addView(overlayView, params);
            Log.d(TAG, "Overlay shown successfully for ride: " + rideId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to add overlay view", e);
        }
    }

    private void startAlertFeedback() {
        // Vibrate pattern: wait, vibrate, wait, vibrate (ride-hailing style)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = vm.getDefaultVibrator();
            } else {
                vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 500, 200, 500, 200, 500, 1000, 500, 200, 500, 200, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Vibration failed", e);
        }

        // Play notification sound
        try {
            mediaPlayer = MediaPlayer.create(this, R.raw.sound);
            if (mediaPlayer != null) {
                mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                mediaPlayer.setLooping(true); // Loop so it's not missed
                mediaPlayer.start();
            }
        } catch (Exception e) {
            Log.e(TAG, "Sound playback failed", e);
        }
    }

    private void stopAlertFeedback() {
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping media player", e);
            }
            mediaPlayer = null;
        }
    }

    private void dismissOverlay(String reason) {
        Log.d(TAG, "Dismissing overlay, reason: " + reason);

        if (countDownTimer != null) {
            countDownTimer.cancel();
            countDownTimer = null;
        }

        stopAlertFeedback();

        // Animate out
        if (overlayView != null) {
            LinearLayout card = overlayView.findViewById(R.id.card_container);
            if (card != null) {
                card.animate()
                        .translationY(-500f)
                        .alpha(0f)
                        .setDuration(250)
                        .withEndAction(() -> {
                            removeOverlayView();
                            stopForeground(true);
                            stopSelf();
                        })
                        .start();
            } else {
                removeOverlayView();
                stopForeground(true);
                stopSelf();
            }
        } else {
            stopForeground(true);
            stopSelf();
        }
    }

    private void removeOverlayView() {
        if (overlayView != null && overlayView.isAttachedToWindow()) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                Log.e(TAG, "Error removing overlay view", e);
            }
        }
        overlayView = null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (countDownTimer != null) {
            countDownTimer.cancel();
        }
        stopAlertFeedback();
        removeOverlayView();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
