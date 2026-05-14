package io.github.blayalems.dtwg

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat

class NotificationActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.getStringExtra(EXTRA_ACTION) ?: return

        if (action == "complete") {
            runCatching { context.stopService(Intent(context, ReadingService::class.java)) }
            runCatching { NotificationManagerCompat.from(context).cancel(DtwgBridge.NOTIF_ID) }
        }

        runCatching {
            context.startActivity(
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                    putExtra(MainActivity.EXTRA_NOTIF_ACTION, action)
                }
            )
        }
    }

    companion object {
        const val EXTRA_ACTION = "notif_action"
    }
}
