package expo.modules.androidusage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.PixelFormat
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.net.Uri
import android.util.Log
import java.util.ArrayDeque
import java.util.concurrent.atomic.AtomicInteger

class AndroidUsageReminderService : Service() {
  private data class ForegroundSession(
    val packageName: String,
    val startedAt: Long,
  )

  private val handler = Handler(Looper.getMainLooper())
  private var unlockMonitor: Runnable? = null
  private var notifiedUsageSessionStartedAt: Long? = null
  private var loggedUsageSessionStartedAt: Long? = null
  private var lastUnlockEventAt = 0L
  private var currentUnlockAt: Long? = null
  private var activeUsageSession: ForegroundSession? = null
  private var overlayView: View? = null
  private val processedEventIds = ArrayDeque<String>()
  private val processedEventIdSet = mutableSetOf<String>()

  override fun onCreate() {
    super.onCreate()
    Log.i(TAG, "Foreground reminder service created")
    createNotificationChannel(this)
    startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification(this))
    lastUnlockEventAt = preferences().getLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, 0L)
    startUnlockMonitor()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!hasAvailableCards()) {
      Log.i(TAG, "Foreground reminder service stopped: no available cards")
      stopSelf()
    } else {
      Log.i(TAG, "Foreground reminder service active")
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    Log.i(TAG, "Foreground reminder service destroyed")
    cancelUnlockMonitor()
    removeOverlay()
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startUnlockMonitor() {
    if (unlockMonitor != null) return
    var queryStart = System.currentTimeMillis() - EVENT_LOOKBACK_MS
    val monitor = object : Runnable {
      override fun run() {
        if (!hasAvailableCards()) {
          Log.i(TAG, "Unlock monitor stopped: no available cards")
          stopSelf()
          return
        }

        val now = System.currentTimeMillis()
        val manager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = manager.queryEvents(queryStart, now)
        val event = UsageEvents.Event()

        while (events.hasNextEvent()) {
          events.getNextEvent(event)
          if (isNewEvent(event)) handleUsageEvent(event)
        }

        evaluateUsageSession(now)
        // UsageStats events can arrive late. Re-reading a small overlap prevents event loss;
        // isNewEvent() makes that overlap idempotent.
        queryStart = now - EVENT_LOOKBACK_MS
        handler.postDelayed(this, USAGE_CHECK_INTERVAL_MS)
      }
    }
    unlockMonitor = monitor
    handler.postDelayed(monitor, USAGE_CHECK_INTERVAL_MS)
  }

  private fun cancelUnlockMonitor() {
    unlockMonitor?.let(handler::removeCallbacks)
    unlockMonitor = null
  }

  private fun onPhoneUnlocked(unlockedAt: Long) {
    if (unlockedAt <= lastUnlockEventAt) return
    lastUnlockEventAt = unlockedAt
    if (!hasAvailableCards()) {
      Log.i(TAG, "Unlock ignored: no available cards")
      return
    }
    val limit = interventionCardLimit(
      AndroidUsageDiagnosticsModule.KEY_UNLOCK_INTERVENTION_CARDS,
      AndroidUsageDiagnosticsModule.DEFAULT_UNLOCK_INTERVENTION_CARDS,
    )
    Log.i(TAG, "Phone unlocked from Usage Access event: sending $limit-card notification")
    preferences().edit().putLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, unlockedAt).apply()
    currentUnlockAt = unlockedAt
    promptForReviews(limit, "Révision disponible", "$limit cartes sont prêtes à être révisées.")
  }

  private fun onScreenLocked() {
    if (currentUnlockAt != null) Log.i(TAG, "Screen locked: clearing usage session")
    preferences().edit().remove(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT).apply()
    currentUnlockAt = null
    activeUsageSession = null
    removeOverlay()
    notifiedUsageSessionStartedAt = null
    loggedUsageSessionStartedAt = null
  }

  private fun handleUsageEvent(event: UsageEvents.Event) {
    when (event.eventType) {
      UsageEvents.Event.KEYGUARD_HIDDEN -> onPhoneUnlocked(event.timeStamp)
      UsageEvents.Event.SCREEN_NON_INTERACTIVE -> onScreenLocked()
      UsageEvents.Event.ACTIVITY_RESUMED -> {
        if (currentUnlockAt != null && isEligiblePackage(event.packageName)) {
          activeUsageSession = ForegroundSession(event.packageName, event.timeStamp)
          notifiedUsageSessionStartedAt = null
          loggedUsageSessionStartedAt = null
        } else if (event.packageName != packageName) {
          activeUsageSession = null
        }
      }
      UsageEvents.Event.ACTIVITY_PAUSED,
      UsageEvents.Event.ACTIVITY_STOPPED -> {
        if (event.packageName == activeUsageSession?.packageName) activeUsageSession = null
      }
    }
  }

  private fun evaluateUsageSession(now: Long) {
    val session = activeUsageSession ?: return
    if (!hasAvailableCards() || currentUnlockAt == null) return
    if (loggedUsageSessionStartedAt != session.startedAt) {
      Log.i(TAG, "Eligible foreground session started for ${session.packageName}")
      loggedUsageSessionStartedAt = session.startedAt
      return
    }
    if (now - session.startedAt >= usageReminderDurationMs() && notifiedUsageSessionStartedAt != session.startedAt) {
      val limit = interventionCardLimit(
        AndroidUsageDiagnosticsModule.KEY_APP_USAGE_INTERVENTION_CARDS,
        AndroidUsageDiagnosticsModule.DEFAULT_APP_USAGE_INTERVENTION_CARDS,
      )
      Log.i(TAG, "Eligible usage threshold reached for ${session.packageName}: sending $limit-card notification")
      promptForReviews(limit, "Révision après utilisation", "$limit cartes sont prêtes à être révisées.")
      notifiedUsageSessionStartedAt = session.startedAt
    }
  }

  private fun isNewEvent(event: UsageEvents.Event): Boolean {
    val id = "${event.timeStamp}:${event.eventType}:${event.packageName}:${event.className}"
    if (!processedEventIdSet.add(id)) return false
    processedEventIds.addLast(id)
    if (processedEventIds.size > MAX_RETAINED_EVENT_IDS) {
      processedEventIdSet.remove(processedEventIds.removeFirst())
    }
    return true
  }

  private fun hasAvailableCards(): Boolean {
    val preferences = preferences()
    return preferences.getBoolean(AndroidUsageDiagnosticsModule.KEY_ENABLED, false) &&
      preferences.getInt(AndroidUsageDiagnosticsModule.KEY_DUE_CARD_COUNT, 0) > 0
  }

  private fun preferences() = getSharedPreferences(
    AndroidUsageDiagnosticsModule.PREFERENCES_NAME,
    Context.MODE_PRIVATE,
  )

  private fun usageReminderDurationMs(): Long {
    val minutes = preferences().getInt(
      AndroidUsageDiagnosticsModule.KEY_USAGE_REMINDER_MINUTES,
      AndroidUsageDiagnosticsModule.DEFAULT_USAGE_REMINDER_MINUTES,
    ).coerceIn(
      AndroidUsageDiagnosticsModule.MIN_USAGE_REMINDER_MINUTES,
      AndroidUsageDiagnosticsModule.MAX_USAGE_REMINDER_MINUTES,
    )
    return minutes * 60_000L
  }

  private fun interventionCardLimit(key: String, defaultValue: Int): Int {
    return preferences().getInt(key, defaultValue).coerceIn(
      AndroidUsageDiagnosticsModule.MIN_INTERVENTION_CARDS,
      AndroidUsageDiagnosticsModule.MAX_INTERVENTION_CARDS,
    )
  }

  private fun promptForReviews(limit: Int, title: String, message: String) {
    val promptMode = preferences().getString(AndroidUsageDiagnosticsModule.KEY_PROMPT_MODE, "notification")
      ?: "notification"
    Log.i(TAG, "Review prompt: limit=$limit mode=$promptMode")
    if (promptMode == "direct") {
      if (openStudyScreen(limit)) return
    } else if (promptMode == "overlay_prompt" && showOverlay(limit, title, message)) {
      return
    }
    showReviewNotification(this, title, message, limit)
  }

  private fun showOverlay(limit: Int, title: String, message: String): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
      Log.w(TAG, "Overlay prompt unavailable: overlay permission is not granted")
      return false
    }
    if (overlayView != null) return true

    val density = resources.displayMetrics.density
    fun dp(value: Int) = (value * density).toInt()
    val panel = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(20), dp(16), dp(20), dp(16))
      setBackgroundColor(0xFFF7F9FC.toInt())
      elevation = dp(8).toFloat()
    }
    panel.addView(TextView(this).apply {
      text = "VOCABULARY"
      textSize = 12f
      setTextColor(0xFF667085.toInt())
    })
    panel.addView(TextView(this).apply {
      text = title
      textSize = 20f
      setTextColor(0xFF101828.toInt())
      setPadding(0, dp(6), 0, 0)
    })
    panel.addView(TextView(this).apply {
      text = "$message\nLa session s’ouvrira dans Vocabulary."
      textSize = 15f
      setTextColor(0xFF475467.toInt())
      setPadding(0, dp(6), 0, dp(8))
    })
    val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    actions.addView(Button(this).apply {
      text = "Fermer"
      setOnClickListener { removeOverlay() }
    }, LinearLayout.LayoutParams(0, dp(48), 1f))
    actions.addView(Button(this).apply {
      text = "Commencer"
      setOnClickListener {
        removeOverlay()
        if (!openStudyScreen(limit)) {
          showReviewNotification(this@AndroidUsageReminderService, title, message, limit)
        }
      }
    }, LinearLayout.LayoutParams(0, dp(48), 1f))
    panel.addView(actions)

    val windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_PHONE
      },
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP
      y = dp(48)
    }
    return runCatching {
      windowManager.addView(panel, params)
      overlayView = panel
    }.onFailure {
      Log.e(TAG, "Overlay prompt could not be shown", it)
    }.isSuccess
  }

  private fun removeOverlay() {
    val view = overlayView ?: return
    val windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    runCatching { windowManager.removeView(view) }
    overlayView = null
  }

  private fun openStudyScreen(limit: Int): Boolean {
    val launchIntent = studyIntent(this, limit)
    if (launchIntent.resolveActivity(packageManager) == null) return false
    return runCatching {
      startActivity(launchIntent)
    }.onFailure {
      Log.w(TAG, "Direct study launch blocked; falling back to notification", it)
    }.isSuccess
  }

  private fun isEligiblePackage(packageName: String?): Boolean {
    if (packageName.isNullOrBlank() || packageName == this.packageName) return false
    if (packageName == "com.android.launcher" || packageName == "com.android.launcher3") return false
    return !packageName.startsWith("android") && !packageName.startsWith("com.android.")
  }

  companion object {
    private const val REMINDER_CHANNEL_ID = "review-reminders"
    private const val SERVICE_CHANNEL_ID = "usage-reminder-service"
    private const val SERVICE_NOTIFICATION_ID = 502
    private const val USAGE_CHECK_INTERVAL_MS = 1_000L
    private const val EVENT_LOOKBACK_MS = 15_000L
    private const val MAX_RETAINED_EVENT_IDS = 512
    private const val TAG = "AndroidUsageReminder"
    private val nextReviewNotificationId = AtomicInteger(1_000)

    fun sendTestNotification(context: Context) {
      showReviewNotification(context, "Notification de test", "Les notifications Android fonctionnent.", null)
    }

    private fun createNotificationChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(
        NotificationChannel(REMINDER_CHANNEL_ID, "Révisions", NotificationManager.IMPORTANCE_DEFAULT),
      )
      manager.createNotificationChannel(
        NotificationChannel(SERVICE_CHANNEL_ID, "Rappels de révision actifs", NotificationManager.IMPORTANCE_LOW),
      )
    }

    private fun buildServiceNotification(context: Context): Notification {
      return notificationBuilder(context, SERVICE_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_popup_reminder)
        .setContentTitle("Rappels de révision actifs")
        .setContentText("Vocabulary surveille les déclencheurs choisis.")
        .setOngoing(true)
        .build()
    }

    private fun showReviewNotification(context: Context, title: String, message: String, limit: Int?) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        context.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED
      ) {
        Log.w(TAG, "Review notification skipped: POST_NOTIFICATIONS is not granted")
        return
      }
      createNotificationChannel(context)
      val launchIntent = if (limit == null) {
        context.packageManager.getLaunchIntentForPackage(context.packageName)
      } else {
        studyIntent(context, limit)
      }
      if (launchIntent == null || launchIntent.resolveActivity(context.packageManager) == null) {
        Log.e(TAG, "Review notification skipped: launch intent is unavailable")
        return
      }
      val id = nextReviewNotificationId.incrementAndGet()
      if (limit != null) {
        launchIntent.data = Uri.parse("vocabulary://study/intervention?limit=$limit")
      }
      val contentIntent = PendingIntent.getActivity(
        context,
        id,
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val notification = notificationBuilder(context, REMINDER_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_popup_reminder)
        .setContentTitle(title)
        .setContentText(message)
        .setContentIntent(contentIntent)
        .setAutoCancel(true)
        .build()
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.notify(id, notification)
      Log.i(TAG, "Review notification posted: id=$id limit=$limit")
    }

    private fun studyIntent(context: Context, limit: Int): Intent {
      return Intent(Intent.ACTION_VIEW, Uri.parse("vocabulary://study/intervention?limit=$limit"))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }

    private fun notificationBuilder(context: Context, channelId: String): Notification.Builder {
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, channelId)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context)
      }
    }
  }
}
