package io.github.blayalems.dtwg

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

class DtwgWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        val snap = loadSnap(context)
        appWidgetIds.forEach { id ->
            manager.updateAppWidget(id, views(context, snap))
        }
    }

    companion object {
        private const val PREFS_NAME = "dtwg_widget"
        private const val PREFS_KEY_SNAP = "snap"

        fun updateAll(context: Context, snap: JSONObject?) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .apply {
                    if (snap == null) remove(PREFS_KEY_SNAP) else putString(PREFS_KEY_SNAP, snap.toString())
                }
                .apply()
            val manager = context.getSystemService(AppWidgetManager::class.java) ?: return
            val ids = manager.getAppWidgetIds(ComponentName(context, DtwgWidgetProvider::class.java))
            if (ids.isEmpty()) return
            val remoteViews = views(context, snap)
            ids.forEach { id -> manager.updateAppWidget(id, remoteViews) }
        }

        private fun views(context: Context, snap: JSONObject?): RemoteViews {
            val phase = snap?.optString("phase", "idle") ?: "idle"
            val dayTitle = snap?.optString("dayTitle", "Daily Time with God") ?: "Daily Time with God"
            val done = snap?.optInt("done", 0) ?: 0
            val total = snap?.optInt("total", 0) ?: 0
            val nextTitle = snap?.optString("nextTitle", "") ?: ""

            val status = when (phase) {
                "complete" -> "Readings complete"
                "idle" -> "Ready to read"
                else -> "$done/$total complete"
            }

            val detail = when {
                phase == "idle" -> "Tap to open today's readings"
                nextTitle.isNotBlank() -> "Next: $nextTitle"
                else -> dayTitle
            }

            val openIntent = PendingIntent.getActivity(
                context,
                0,
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            return RemoteViews(context.packageName, R.layout.dtwg_widget).apply {
                setTextViewText(R.id.widget_title, dayTitle)
                setTextViewText(R.id.widget_status, status)
                setTextViewText(R.id.widget_detail, detail)
                setOnClickPendingIntent(R.id.widget_root, openIntent)
            }
        }

        private fun loadSnap(context: Context): JSONObject? {
            val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(PREFS_KEY_SNAP, null)
            return raw?.let { runCatching { JSONObject(it) }.getOrNull() }
        }
    }
}
