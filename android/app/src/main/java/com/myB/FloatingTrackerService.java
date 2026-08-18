package com.myB;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import android.view.WindowManager;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.TextView;

public class FloatingTrackerService extends Service {

    private WindowManager windowManager;
    private View floatingView;
    private Handler handler;
    private Runnable runnable;

    private static class TimelineEvent {
        String time; // "HH:mm"
        String title;
        String subtitle;
        String emoji;
    }
    
    private List<TimelineEvent> eventList = new ArrayList<>();

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("timelineJson")) {
            String json = intent.getStringExtra("timelineJson");
            Log.d("FloatingTracker", "Received timelineJson: " + json);
            try {
                eventList.clear();
                JSONArray arr = new JSONArray(json);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    TimelineEvent ev = new TimelineEvent();
                    ev.time = obj.optString("time", "");
                    ev.title = obj.optString("title", "");
                    ev.subtitle = obj.optString("subtitle", "");
                    ev.emoji = obj.optString("emoji", "");
                    eventList.add(ev);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        
        // Start or restart updater
        startUpdater();
        
        return START_NOT_STICKY;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        // 뷰 팽창
        floatingView = LayoutInflater.from(this).inflate(R.layout.layout_floating_tracker, null);

        // WindowManager 설정
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
                PixelFormat.TRANSLUCENT);

        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = 150; // 상단에서 약간 띄움

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        windowManager.addView(floatingView, params);

        // UI 요소 연결
        TextView tvTime = floatingView.findViewById(R.id.tvPopupTime);
        TextView tvTitle = floatingView.findViewById(R.id.tvPopupTitle);
        TextView tvSub = floatingView.findViewById(R.id.tvPopupStatus);
        TextView tvEmoji = floatingView.findViewById(R.id.tvStatusEmoji);
        ProgressBar pbProgress = floatingView.findViewById(R.id.pbPopupProgress);
        ImageButton btnClose = floatingView.findViewById(R.id.btnClosePopup);

        // 닫기 버튼
        btnClose.setOnClickListener(v -> stopSelf());

        // 드래그 기능 (선택)
        floatingView.setOnTouchListener(new View.OnTouchListener() {
            private int initialY;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialY = params.y;
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_UP:
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(floatingView, params);
                        return true;
                }
                return false;
            }
        });
    }

    private int getCurrentStepIndex() {
        if (eventList.isEmpty()) return -1;
        
        Calendar now = Calendar.getInstance();
        int currentMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        
        int currentIndex = 0;
        for (int i = 0; i < eventList.size(); i++) {
            String t = eventList.get(i).time;
            try {
                if (t != null && t.contains(":")) {
                    String[] parts = t.split(":");
                    int h = Integer.parseInt(parts[0].trim());
                    int m = Integer.parseInt(parts[1].trim());
                    int eventMinutes = h * 60 + m;
                    
                    if (currentMinutes >= eventMinutes) {
                        currentIndex = i;
                    }
                }
            } catch (Exception e) {
                // Ignore parse errors, keep current index
            }
        }
        return currentIndex;
    }

    private String formatAmPm(String hhmm) {
        try {
            if (hhmm == null || !hhmm.contains(":")) return hhmm;
            String[] parts = hhmm.split(":");
            int h = Integer.parseInt(parts[0].trim());
            int m = Integer.parseInt(parts[1].trim());
            String ampm = (h < 12) ? "오전" : "오후";
            int h12 = (h == 0) ? 12 : (h > 12 ? h - 12 : h);
            return String.format("%s %02d:%02d", ampm, h12, m);
        } catch (Exception e) {
            return hhmm;
        }
    }

    private void startUpdater() {
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
        handler = new Handler(Looper.getMainLooper());
        runnable = new Runnable() {
            @Override
            public void run() {
                updateUI();
                // Check again in 1 minute
                handler.postDelayed(this, 60000);
            }
        };
        handler.post(runnable); // immediate first run
    }

    private void updateUI() {
        if (floatingView == null || eventList.isEmpty()) return;
        
        TextView tvTime = floatingView.findViewById(R.id.tvPopupTime);
        TextView tvTitle = floatingView.findViewById(R.id.tvPopupTitle);
        TextView tvSub = floatingView.findViewById(R.id.tvPopupStatus);
        TextView tvEmoji = floatingView.findViewById(R.id.tvStatusEmoji);
        ProgressBar pbProgress = floatingView.findViewById(R.id.pbPopupProgress);

        int step = getCurrentStepIndex();
        if (step < 0 || step >= eventList.size()) return;
        
        TimelineEvent ev = eventList.get(step);
        tvTime.setText(formatAmPm(ev.time));
        tvTitle.setText(ev.title);
        tvSub.setText(ev.subtitle);
        tvEmoji.setText(ev.emoji);
        
        // 간단한 진행률 계산
        int progress = (int) (((step + 1) / (float) eventList.size()) * 100);
        pbProgress.setProgress(progress);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingView != null) {
            windowManager.removeView(floatingView);
        }
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
    }
}
