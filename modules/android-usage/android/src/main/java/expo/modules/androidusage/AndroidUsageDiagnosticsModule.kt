package expo.modules.androidusage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidUsageDiagnosticsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidUsageDiagnostics")

    OnCreate {
      if (reminderPreferences().getBoolean(KEY_ENABLED, false)) {
        Log.i(TAG, "Restoring enabled reminder service after app startup")
        startReminderService()
      }
    }

    Function("hasUsageAccess") {
      hasUsageAccess()
    }

    Function("openUsageAccessSettings") {
      val context = requireContext()
      context.startActivity(
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }

    Function("getRecentEvents") { windowMs: Double ->
      getRecentEvents(windowMs.toLong())
    }

    Function("isReminderEnabled") {
      reminderPreferences().getBoolean(KEY_ENABLED, false)
    }

    Function("setReminderConfiguration") { enabled: Boolean, dueCardCount: Double ->
      require(dueCardCount >= 0) { "dueCardCount must not be negative" }
      reminderPreferences().edit()
        .putBoolean(KEY_ENABLED, enabled)
        .putInt(KEY_DUE_CARD_COUNT, dueCardCount.toInt())
        .apply()
      Log.i(TAG, "Reminder configuration: enabled=$enabled dueCardCount=${dueCardCount.toInt()}")
      if (enabled) startReminderService() else stopReminderService()
    }

    Function("sendTestNotification") {
      AndroidUsageReminderService.sendTestNotification(requireContext())
    }

    Function("setInterventionPromptMode") { mode: String ->
      require(mode == "notification" || mode == "direct") { "Invalid intervention prompt mode." }
      reminderPreferences().edit().putBoolean(KEY_DIRECT_PROMPT, mode == "direct").apply()
    }
  }

  private fun requireContext(): Context {
    return requireNotNull(appContext.reactContext) { "Android context unavailable" }
  }

  private fun reminderPreferences() =
    requireContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

  private fun startReminderService() {
    val context = requireContext()
    val intent = Intent(context, AndroidUsageReminderService::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(intent)
    } else {
      context.startService(intent)
    }
  }

  private fun stopReminderService() {
    requireContext().stopService(Intent(requireContext(), AndroidUsageReminderService::class.java))
  }

  private fun hasUsageAccess(): Boolean {
    val context = requireContext()
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      context.applicationInfo.uid,
      context.packageName,
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun getRecentEvents(windowMs: Long): List<Map<String, Any?>> {
    require(windowMs in 1_000..86_400_000) { "windowMs must be between 1 second and 24 hours" }
    if (!hasUsageAccess()) return emptyList()

    val now = System.currentTimeMillis()
    val usageStatsManager = requireContext().getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val usageEvents = usageStatsManager.queryEvents(now - windowMs, now)
    val event = UsageEvents.Event()
    val events = mutableListOf<Map<String, Any?>>()

    while (usageEvents.hasNextEvent()) {
      usageEvents.getNextEvent(event)
      events += mapOf(
        "timestamp" to event.timeStamp,
        "type" to eventTypeName(event.eventType),
        "typeCode" to event.eventType,
        "packageName" to event.packageName,
        "className" to event.className,
      )
    }

    return events
  }

  private fun eventTypeName(type: Int): String {
    return when (type) {
      UsageEvents.Event.ACTIVITY_RESUMED -> "ACTIVITY_RESUMED"
      UsageEvents.Event.ACTIVITY_PAUSED -> "ACTIVITY_PAUSED"
      UsageEvents.Event.ACTIVITY_STOPPED -> "ACTIVITY_STOPPED"
      UsageEvents.Event.SCREEN_INTERACTIVE -> "SCREEN_INTERACTIVE"
      UsageEvents.Event.SCREEN_NON_INTERACTIVE -> "SCREEN_NON_INTERACTIVE"
      UsageEvents.Event.KEYGUARD_SHOWN -> "KEYGUARD_SHOWN"
      UsageEvents.Event.KEYGUARD_HIDDEN -> "KEYGUARD_HIDDEN"
      UsageEvents.Event.DEVICE_SHUTDOWN -> "DEVICE_SHUTDOWN"
      UsageEvents.Event.CONFIGURATION_CHANGE -> "CONFIGURATION_CHANGE"
      else -> "TYPE_$type"
    }
  }

  companion object {
    const val PREFERENCES_NAME = "android_usage_reminders"
    const val KEY_ENABLED = "enabled"
    const val KEY_DUE_CARD_COUNT = "due_card_count"
    const val KEY_LAST_UNLOCK_AT = "last_unlock_at"
    const val KEY_DIRECT_PROMPT = "direct_prompt"
    const val TAG = "AndroidUsageReminder"
  }
}
