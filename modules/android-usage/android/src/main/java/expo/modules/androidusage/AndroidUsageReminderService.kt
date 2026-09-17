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
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.net.Uri
import android.util.Log
import java.util.concurrent.atomic.AtomicInteger

class AndroidUsageReminderService : Service() {
  private data class ForegroundSession(
    val packageName: String,
    val startedAt: Long,
  )

  private val handler = Handler(Looper.getMainLooper())
  private var usageCheck: Runnable? = null
  private var unlockMonitor: Runnable? = null
  private var notifiedUsageSessionStartedAt: Long? = null
  private var loggedUsageSessionStartedAt: Long? = null
  private var lastUnlockEventAt = 0L

  override fun onCreate() {
    super.onCreate()
    Log.i(TAG, "Foreground reminder service created")
    createNotificationChannel(this)
    startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification(this))
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
    cancelUsageCheck()
    cancelUnlockMonitor()
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startUnlockMonitor() {
    if (unlockMonitor != null) return
    var queryStart = System.currentTimeMillis()
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
          when (event.eventType) {
            UsageEvents.Event.KEYGUARD_HIDDEN -> onPhoneUnlocked(event.timeStamp)
            UsageEvents.Event.SCREEN_NON_INTERACTIVE -> onScreenLocked()
          }
        }

        queryStart = now
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
    Log.i(TAG, "Phone unlocked from Usage Access event: sending 3-card notification")
    preferences().edit().putLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, unlockedAt).apply()
    promptForReviews(3, "Révision disponible", "3 cartes sont prêtes à être révisées.")
    scheduleUsageCheck(unlockedAt)
  }

  private fun onScreenLocked() {
    if (usageCheck != null) Log.i(TAG, "Screen locked: cancelling usage check")
    preferences().edit().remove(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT).apply()
    notifiedUsageSessionStartedAt = null
    loggedUsageSessionStartedAt = null
    cancelUsageCheck()
  }

  private fun scheduleUsageCheck(unlockedAt: Long) {
    cancelUsageCheck()
    notifiedUsageSessionStartedAt = null
    loggedUsageSessionStartedAt = null
    val check = object : Runnable {
      override fun run() {
        if (!hasAvailableCards() || preferences().getLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, 0L) != unlockedAt) {
          Log.i(TAG, "Usage check cancelled")
          cancelUsageCheck()
          return
        }
        val session = getEligibleForegroundSession(unlockedAt, System.currentTimeMillis())
        if (session == null) {
          notifiedUsageSessionStartedAt = null
          loggedUsageSessionStartedAt = null
        } else if (loggedUsageSessionStartedAt != session.startedAt) {
          Log.i(TAG, "Eligible foreground session started for ${session.packageName}")
          loggedUsageSessionStartedAt = session.startedAt
        } else if (
          System.currentTimeMillis() - session.startedAt >= TEST_USAGE_DURATION_MS &&
          notifiedUsageSessionStartedAt != session.startedAt
        ) {
          Log.i(TAG, "Eligible usage threshold reached for ${session.packageName}: sending 5-card notification")
          promptForReviews(
            5,
            "Révision après utilisation",
            "5 cartes sont prêtes à être révisées.",
          )
          notifiedUsageSessionStartedAt = session.startedAt
        }
        handler.postDelayed(this, USAGE_CHECK_INTERVAL_MS)
      }
    }
    usageCheck = check
    handler.postDelayed(check, USAGE_CHECK_INTERVAL_MS)
  }

  private fun cancelUsageCheck() {
    usageCheck?.let(handler::removeCallbacks)
    usageCheck = null
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

  private fun promptForReviews(limit: Int, title: String, message: String) {
    if (preferences().getBoolean(AndroidUsageDiagnosticsModule.KEY_DIRECT_PROMPT, false) &&
      openStudyScreen(limit)
    ) return
    showReviewNotification(this, title, message, limit)
  }

  private fun openStudyScreen(limit: Int): Boolean {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName) ?: return false
    return runCatching {
      launchIntent.data = Uri.parse("vocabulary://study/intervention?limit=$limit")
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      startActivity(launchIntent)
    }.onFailure {
      Log.w(TAG, "Direct study launch blocked; falling back to notification", it)
    }.isSuccess
  }

  private fun getEligibleForegroundSession(start: Long, end: Long): ForegroundSession? {
    val manager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    // The unlock event and foreground activity can be emitted in either order. The small
    // lookback retains the activity event without carrying a session across a screen lock:
    // screen events below always clear the active session.
    val events = manager.queryEvents(start - EVENT_LOOKBACK_MS, end)
    val event = UsageEvents.Event()
    var activePackage: String? = null
    var activeSince = 0L

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          if (isEligiblePackage(event.packageName)) {
            if (event.packageName != activePackage) activeSince = event.timeStamp
            activePackage = event.packageName
          } else {
            activePackage = null
            activeSince = 0L
          }
        }
        UsageEvents.Event.ACTIVITY_PAUSED,
        UsageEvents.Event.ACTIVITY_STOPPED -> {
          if (event.packageName == activePackage) {
            activePackage = null
            activeSince = 0L
          }
        }
        UsageEvents.Event.SCREEN_NON_INTERACTIVE,
        UsageEvents.Event.SCREEN_INTERACTIVE -> {
          activePackage = null
          activeSince = 0L
        }
      }
    }

    return activePackage?.let { ForegroundSession(it, activeSince) }
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
    private const val TEST_USAGE_DURATION_MS = 10_000L
    private const val EVENT_LOOKBACK_MS = 2_000L
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
      ) return
      createNotificationChannel(context)
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
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
