package expo.modules.cashnotificationcapture

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class CashNotificationCaptureModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CashNotificationCapture")

    Function("hasNotificationAccess") {
      val context = requireNotNull(appContext.reactContext)
      val component = ComponentName(context, CashNotificationListenerService::class.java)
      val enabled = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      ) ?: return@Function false
      enabled.split(":").any { it == component.flattenToString() }
    }

    Function("openNotificationAccessSettings") {
      val context = requireNotNull(appContext.reactContext)
      context.startActivity(
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    Function("getPendingPurchases") {
      val context = requireNotNull(appContext.reactContext)
      context.getSharedPreferences(CashNotificationListenerService.PREFS, 0)
        .getString(CashNotificationListenerService.PENDING_KEY, "[]") ?: "[]"
    }

    Function("takeSelectedPurchaseId") {
      val context = requireNotNull(appContext.reactContext)
      val prefs = context.getSharedPreferences(CashNotificationListenerService.PREFS, 0)
      val selected = prefs.getString(CashNotificationListenerService.SELECTED_KEY, "") ?: ""
      prefs.edit().remove(CashNotificationListenerService.SELECTED_KEY).apply()
      selected
    }

    Function("acknowledgePurchases") { ids: List<String> ->
      val context = requireNotNull(appContext.reactContext)
      val prefs = context.getSharedPreferences(CashNotificationListenerService.PREFS, 0)
      val current = JSONArray(prefs.getString(CashNotificationListenerService.PENDING_KEY, "[]"))
      val acknowledged = ids.toSet()
      val remaining = JSONArray()
      val manager = context.getSystemService(android.app.NotificationManager::class.java)
      for (index in 0 until current.length()) {
        val item = current.optJSONObject(index) ?: continue
        val id = item.optString("id")
        if (!acknowledged.contains(id)) {
          remaining.put(item)
        } else {
          manager?.cancel(id.hashCode())
        }
      }
      prefs.edit().putString(CashNotificationListenerService.PENDING_KEY, remaining.toString()).apply()
      val selected = prefs.getString(CashNotificationListenerService.SELECTED_KEY, "")
      if (acknowledged.contains(selected)) prefs.edit().remove(CashNotificationListenerService.SELECTED_KEY).apply()
    }
  }
}
