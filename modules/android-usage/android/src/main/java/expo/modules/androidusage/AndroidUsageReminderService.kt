package expo.modules.androidusage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper

class AndroidUsageReminderService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var usageCheck: Runnable? = null
  private var screenReceiver: BroadcastReceiver? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel(this)
    startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification(this))
    registerScreenReceiver()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!hasAvailableCards()) stopSelf()
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    cancelUsageCheck()
    screenReceiver?.let { receiver -> runCatching { unregisterReceiver(receiver) } }
    screenReceiver = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun registerScreenReceiver() {
    if (screenReceiver != null) return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
          Intent.ACTION_USER_PRESENT -> onPhoneUnlocked()
          Intent.ACTION_SCREEN_OFF -> onScreenLocked()
        }
      }
    }
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_USER_PRESENT)
      addAction(Intent.ACTION_SCREEN_OFF)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(receiver, filter)
    }
    screenReceiver = receiver
  }

  private fun onPhoneUnlocked() {
    if (!hasAvailableCards()) return
    val unlockedAt = System.currentTimeMillis()
    preferences().edit().putLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, unlockedAt).apply()
    showReviewNotification(this, "Révision disponible", "3 cartes sont prêtes à être révisées.", 3)
    scheduleUsageCheck(unlockedAt)
  }

  private fun onScreenLocked() {
    preferences().edit().remove(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT).apply()
    cancelUsageCheck()
  }

  private fun scheduleUsageCheck(unlockedAt: Long) {
    cancelUsageCheck()
    val check = object : Runnable {
      override fun run() {
        if (!hasAvailableCards() || preferences().getLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, 0L) != unlockedAt) {
          cancelUsageCheck()
          return
        }
        if (hasEligibleForegroundDuration(unlockedAt, System.currentTimeMillis())) {
          showReviewNotification(this@AndroidUsageReminderService, "Révision après utilisation", "5 cartes sont prêtes à être révisées.", 5)
          cancelUsageCheck()
          return
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

  private fun hasEligibleForegroundDuration(start: Long, end: Long): Boolean {
    val manager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = manager.queryEvents(start, end)
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
          }
        }
        UsageEvents.Event.ACTIVITY_PAUSED,
        UsageEvents.Event.ACTIVITY_STOPPED -> {
          if (event.packageName == activePackage) activePackage = null
        }
        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> return false
      }
    }

    return activePackage != null && end - activeSince >= TEST_USAGE_DURATION_MS
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
    private const val TEST_NOTIFICATION_ID = 504
    private const val USAGE_CHECK_INTERVAL_MS = 1_000L
    private const val TEST_USAGE_DURATION_MS = 10_000L

    fun sendTestNotification(context: Context) {
      showReviewNotification(context, "Notification de test", "Les notifications Android fonctionnent.", TEST_NOTIFICATION_ID)
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

    private fun showReviewNotification(context: Context, title: String, message: String, id: Int) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        context.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED
      ) return
      createNotificationChannel(context)
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
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
