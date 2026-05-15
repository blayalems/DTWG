package io.github.blayalems.dtwg

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.Calendar

/**
 * Native AlarmManager-backed daily reminder.
 *
 * The web-side reminder via `setTimeout` only fires while the page is in the
 * foreground; periodic-sync availability is uneven across Android browsers. By
 * registering a real alarm here we get system-level reliability even when the
 * WebView isn't running. The bridge schedules it; this receiver fires daily
 * at the configured time and posts a one-shot notification.
 */
class ReminderAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val open = PendingIntent.getActivity(
            context,
            REQ_OPEN,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_bible)
            .setContentTitle("Daily Time with God")
            .setContentText("Time for today's readings")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setColor(0xFF6750A4.toInt())
            .setContentIntent(open)

        runCatching {
            NotificationManagerCompat.from(context).notify(NOTIF_ID, builder.build())
        }

        // Re-arm for tomorrow at the same time.
        intent.getIntExtra(EXTRA_HOUR, -1).let { hour ->
            intent.getIntExtra(EXTRA_MINUTE, -1).let { minute ->
                if (hour in 0..23 && minute in 0..59) {
                    schedule(context, hour, minute)
                }
            }
        }
    }

    companion object {
        const val CHANNEL_ID = "dtwg_reading"
        const val NOTIF_ID = 88
        const val REQ_ALARM = 0xD1B5
        const val REQ_OPEN = 0xD1B6
        const val EXTRA_HOUR = "hour"
        const val EXTRA_MINUTE = "minute"

        fun schedule(context: Context, hour: Int, minute: Int) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            val pi = pendingIntent(context, hour, minute)
            val next = nextTrigger(hour, minute)

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi)
                } else {
                    @Suppress("DEPRECATION")
                    am.setExact(AlarmManager.RTC_WAKEUP, next, pi)
                }
            } catch (se: SecurityException) {
                // Android 12+ may require SCHEDULE_EXACT_ALARM; fall back to inexact.
                Log.w("ReminderAlarm", "Falling back to inexact alarm: ${se.message}")
                am.set(AlarmManager.RTC_WAKEUP, next, pi)
            }
        }

        fun cancel(context: Context) {
            val am = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
            am.cancel(pendingIntent(context, 0, 0))
        }

        private fun pendingIntent(context: Context, hour: Int, minute: Int): PendingIntent {
            val intent = Intent(context, ReminderAlarmReceiver::class.java).apply {
                putExtra(EXTRA_HOUR, hour)
                putExtra(EXTRA_MINUTE, minute)
            }
            return PendingIntent.getBroadcast(
                context,
                REQ_ALARM,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun nextTrigger(hour: Int, minute: Int): Long {
            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            if (cal.timeInMillis <= System.currentTimeMillis()) {
                cal.add(Calendar.DAY_OF_YEAR, 1)
            }
            return cal.timeInMillis
        }
    }
}
