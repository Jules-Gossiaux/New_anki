package expo.modules.androidusage

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.BroadcastReceiver
import android.content.pm.PackageManager
import android.os.Build

class AndroidUsageReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val preferences = context.getSharedPreferences(
      AndroidUsageDiagnosticsModule.PREFERENCES_NAME,
      Context.MODE_PRIVATE,
    )
    if (!preferences.getBoolean(AndroidUsageDiagnosticsModule.KEY_ENABLED, false)) return
    if (preferences.getInt(AndroidUsageDiagnosticsModule.KEY_DUE_CARD_COUNT, 0) <= 0) return

    when (intent.action) {
      Intent.ACTION_USER_PRESENT -> onUnlock(context, preferences)
      AndroidUsageDiagnosticsModule.ACTION_SEQUENCE_CHECK -> onSequenceCheck(context, preferences)
    }
  }

  private fun onUnlock(context: Context, preferences: android.content.SharedPreferences) {
    val unlockAt = System.currentTimeMillis()
    preferences.edit().putLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, unlockAt).apply()
    showNotification(context, "Révision disponible", "3 cartes sont prêtes à être révisées.", 3)

    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = Intent(context, AndroidUsageReminderReceiver::class.java)
      .setAction(AndroidUsageDiagnosticsModule.ACTION_SEQUENCE_CHECK)
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      SEQUENCE_REQUEST_CODE,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    alarmManager.setAndAllowWhileIdle(
      AlarmManager.RTC_WAKEUP,
      unlockAt + AndroidUsageDiagnosticsModule.SEQUENCE_DURATION_MS,
      pendingIntent,
    )
  }

  private fun onSequenceCheck(context: Context, preferences: android.content.SharedPreferences) {
    val unlockAt = preferences.getLong(AndroidUsageDiagnosticsModule.KEY_LAST_UNLOCK_AT, 0L)
    if (unlockAt == 0L) return
    val now = System.currentTimeMillis()
    if (hasThreeMinutesOfEligibleUsage(context, unlockAt, now)) {
      showNotification(context, "Révision après utilisation", "5 cartes sont prêtes à être révisées.", 5)
    }
  }

  private fun hasThreeMinutesOfEligibleUsage(context: Context, start: Long, end: Long): Boolean {
    val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usageStatsManager.queryEvents(start, end)
    val event = UsageEvents.Event()
    var activePackage: String? = null
    var activeSince = 0L
    var eligibleDuration = 0L

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          if (isEligiblePackage(context, event.packageName)) {
            activePackage = event.packageName
            activeSince = event.timeStamp
          }
        }
        UsageEvents.Event.ACTIVITY_PAUSED,
        UsageEvents.Event.ACTIVITY_STOPPED,
        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> {
          if (activePackage != null) {
            eligibleDuration += (event.timeStamp - activeSince).coerceAtLeast(0L)
            activePackage = null
          }
        }
      }
    }

    if (activePackage != null) eligibleDuration += (end - activeSince).coerceAtLeast(0L)
    return eligibleDuration >= AndroidUsageDiagnosticsModule.SEQUENCE_DURATION_MS
  }

  private fun isEligiblePackage(context: Context, packageName: String?): Boolean {
    if (packageName.isNullOrBlank() || packageName == context.packageName) return false
    if (packageName == "com.android.launcher" || packageName == "com.android.launcher3") return false
    return !packageName.startsWith("android") && !packageName.startsWith("com.android.")
  }

  private fun showNotification(context: Context, title: String, message: String, id: Int) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      context.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED
    ) return

    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      notificationManager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Révisions", NotificationManager.IMPORTANCE_DEFAULT),
      )
    }

    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: return
    val contentIntent = PendingIntent.getActivity(
      context,
      id,
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      android.app.Notification.Builder(context, CHANNEL_ID)
    } else {
      android.app.Notification.Builder(context)
    }
      .setSmallIcon(android.R.drawable.ic_popup_reminder)
      .setContentTitle(title)
      .setContentText(message)
      .setContentIntent(contentIntent)
      .setAutoCancel(true)
      .build()
    notificationManager.notify(id, notification)
  }

  companion object {
    private const val CHANNEL_ID = "review-reminders"
    private const val SEQUENCE_REQUEST_CODE = 503
  }
}
