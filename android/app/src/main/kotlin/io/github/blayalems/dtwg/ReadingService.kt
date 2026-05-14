package io.github.blayalems.dtwg

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

class ReadingService : Service() {
    private val tag = "ReadingService"

    companion object {
        const val ACTION_UPDATE = "io.github.blayalems.dtwg.UPDATE"
        const val ACTION_CLEAR  = "io.github.blayalems.dtwg.CLEAR"
        const val EXTRA_SNAP    = "snap"
        const val CHANNEL_ID    = "dtwg_reading"
        const val NOTIF_ID      = 42
        private const val DTWG_PURPLE = 0xFF6750A4.toInt()
    }

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_UPDATE -> {
                val json = intent.getStringExtra(EXTRA_SNAP) ?: return START_NOT_STICKY
                val snap = runCatching { JSONObject(json) }.getOrNull()
                    ?: return START_NOT_STICKY

                if (snap.optString("phase") == "idle") {
                    DtwgWidgetProvider.updateAll(this, null)
                    stopForegroundNotification()
                    stopSelf()
                    return START_NOT_STICKY
                }

                DtwgWidgetProvider.updateAll(this, snap)
                val notification = buildNotification(snap)
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
                    } else {
                        startForeground(NOTIF_ID, notification)
                    }
                } catch (e: Exception) {
                    runCatching { NotificationManagerCompat.from(this).notify(NOTIF_ID, notification) }
                        .onFailure { err -> Log.w(tag, "Fallback notification failed", err) }
                    stopSelf()
                    return START_NOT_STICKY
                }
            }
            ACTION_CLEAR -> {
                DtwgWidgetProvider.updateAll(this, null)
                stopForegroundNotification()
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun buildNotification(snap: JSONObject): Notification {
        if (Build.VERSION.SDK_INT >= 36) {
            val progress = runCatching { buildProgressStyleNotification(this, snap, CHANNEL_ID) }
            progress.getOrNull()?.let { return it }
            progress.exceptionOrNull()?.let { err ->
                Log.w(tag, "Progress-style notification failed; falling back to compat", err)
            }
        }
        val phase = snap.optString("phase", "reading")
        val dayTitle = snap.optString("dayTitle", "Daily Time with God")
        val done = snap.optInt("done", 0).coerceAtLeast(0)
        val total = snap.optInt("total", 0).coerceAtLeast(0)
        val nextTitle = snap.optString("nextTitle", "")
        val progressText = snap.optString("progressText", "$done/$total readings")
        val startedAt = snap.optLong("startedAt", 0L)
        val isComplete = phase == "complete" || (total > 0 && done >= total)

        val title = if (isComplete) "Daily readings complete" else dayTitle
        val body = when {
            isComplete -> "$progressText complete"
            nextTitle.isNotBlank() -> "$progressText - Next: $nextTitle"
            else -> progressText
        }

        val openPi = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_bible)
            .setContentTitle(title)
            .setContentText(body)
            .setColor(DTWG_PURPLE)
            .setColorized(true)
            .setOngoing(!isComplete)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openPi)
            .setOnlyAlertOnce(true)

        if (total > 0) {
            builder.setProgress(total, done.coerceAtMost(total), false)
        }

        if (startedAt > 0L && !isComplete) {
            builder
                .setUsesChronometer(true)
                .setChronometerCountDown(false)
                .setWhen(startedAt)
        }

        builder.addAction(action("open", "Open"))
        if (!isComplete) {
            builder.addAction(action("complete", "Mark all done"))
        }

        if (Build.VERSION.SDK_INT >= 36) {
            builder.setCategory("live_update")
        } else {
            builder.setCategory(NotificationCompat.CATEGORY_PROGRESS)
        }

        return builder.build()
    }

    private fun stopForegroundNotification() {
        runCatching { stopForeground(STOP_FOREGROUND_REMOVE) }
        runCatching { NotificationManagerCompat.from(this).cancel(NOTIF_ID) }
    }

    private fun action(actionKey: String, label: String): NotificationCompat.Action {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_NOTIF_ACTION, actionKey)
        }
        val pi = PendingIntent.getActivity(
            this, actionKey.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Action.Builder(0, label, pi).build()
    }

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notif_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = getString(R.string.notif_channel_desc)
            lightColor = Color.parseColor("#6750A4")
            enableLights(true)
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
