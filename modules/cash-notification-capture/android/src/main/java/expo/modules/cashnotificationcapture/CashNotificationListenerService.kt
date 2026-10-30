package expo.modules.cashnotificationcapture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.security.MessageDigest
import java.text.Normalizer
import java.util.Locale
import java.text.NumberFormat
import org.json.JSONArray
import org.json.JSONObject

class CashNotificationListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName) return
    val notification = sbn.notification ?: return
    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val expandedText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
    val bodyText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString().orEmpty()
    val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.joinToString(" ").orEmpty()
    val text = listOf(expandedText, bodyText, subText, lines).filter { it.isNotBlank() }.distinct().joinToString(" ")
    val combined = "$title $text".trim()
    if (combined.isBlank()) return

    val normalized = Normalizer.normalize(combined, Normalizer.Form.NFD)
      .replace("\\p{Mn}+".toRegex(), "")
      .lowercase(Locale.ROOT)
    val purchaseSignal = listOf(
      "compra", "voce pagou", "pagamento aprovado", "transacao aprovada",
      "cartao aprovado", "gastou", "purchase", "you paid", "you spent", "payment approved"
    ).any { normalized.contains(it) }
    val excludedSignal = listOf(
      "estorno", "reembolso", "compra cancelada", "compra recusada", "pagamento recusado",
      "transferencia recebida", "pix recebido", "compra devolvida"
    ).any { normalized.contains(it) }
    if (!purchaseSignal || excludedSignal) return

    val amountMatch = Regex("(?i)(?:R\\$\\s*)?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2})")
      .find(combined) ?: return
    val amount = amountMatch.groupValues[1]
      .replace(".", "")
      .replace(',', '.')
      .toDoubleOrNull() ?: return
    if (amount <= 0 || amount > 100000000) return

    val eventId = sha256("${sbn.packageName}|${sbn.key}|$combined|${sbn.postTime / 60000}")
    val sourceLabel = try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(sbn.packageName, 0)).toString()
    } catch (_: Exception) {
      sbn.packageName
    }
    val event = JSONObject()
      .put("id", eventId)
      .put("valor", amount)
      .put("data", sbn.postTime)
      .put("origem", sourceLabel)
      .put("texto", combined.take(500))

    synchronized(CashNotificationListenerService::class.java) {
      val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
      val pending = JSONArray(prefs.getString(PENDING_KEY, "[]"))
      if ((0 until pending.length()).any { pending.optJSONObject(it)?.optString("id") == eventId }) return
      pending.put(event)
      while (pending.length() > 50) pending.remove(0)
      prefs.edit().putString(PENDING_KEY, pending.toString()).apply()
    }
    notificarParaRevisao(eventId, amount, sourceLabel)
  }

  private fun notificarParaRevisao(eventId: String, amount: Double, sourceLabel: String) {
    if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    val manager = getSystemService(NotificationManager::class.java) ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Compras para revisar", NotificationManager.IMPORTANCE_DEFAULT)
      )
    }
    val intent = Intent(this, CashPurchaseReviewReceiver::class.java).putExtra(EXTRA_EVENT_ID, eventId)
    val pendingIntent = PendingIntent.getBroadcast(
      this,
      eventId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val valorFormatado = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(amount)
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }
    val notification = builder
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Compra detectada — $valorFormatado")
      .setContentText("${sourceLabel.take(80)} • toque para revisar e incluir")
      .setContentIntent(pendingIntent)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setAutoCancel(true)
      .setPriority(Notification.PRIORITY_DEFAULT)
      .build()
    manager.notify(eventId.hashCode(), notification)
  }

  private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
    .digest(value.toByteArray())
    .joinToString("") { "%02x".format(it) }

  companion object {
    const val PREFS = "cash_notification_capture"
    const val PENDING_KEY = "pending_purchases"
    const val SELECTED_KEY = "selected_purchase_id"
    const val CHANNEL_ID = "cash_purchase_review"
    const val EXTRA_EVENT_ID = "cash_purchase_event_id"
  }
}

class CashPurchaseReviewReceiver : android.content.BroadcastReceiver() {
  override fun onReceive(context: android.content.Context, intent: Intent) {
    val eventId = intent.getStringExtra(CashNotificationListenerService.EXTRA_EVENT_ID) ?: return
    context.getSharedPreferences(CashNotificationListenerService.PREFS, 0)
      .edit().putString(CashNotificationListenerService.SELECTED_KEY, eventId).apply()
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    context.startActivity(launch)
  }
}
