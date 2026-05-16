package io.github.blayalems.dtwg

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Build
import android.widget.RemoteViews
import androidx.core.content.ContextCompat
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

/**
 * v1.6.0 — Material 3 Expressive widget.
 *
 * Layout chrome is in `res/layout/dtwg_widget.xml`. This file is in charge of:
 *   - persisting the latest reading snapshot to SharedPreferences
 *   - drawing the progress ring as a Bitmap (so the % readout is dynamic and
 *     anti-aliased rather than a static drawable)
 *   - building a RemoteViews that binds the ring, the done/total numeral, the
 *     status pill copy, the next-reading hint, and the CTA pill label.
 *
 * Colors come from `widget_*` tokens — static fallback in values/colors.xml,
 * dynamic Material You overrides in values-v31/colors.xml.
 */
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
            val done = snap?.optInt("done", 0) ?: 0
            val total = snap?.optInt("total", 0) ?: 0
            val nextTitle = snap?.optString("nextTitle", "") ?: ""
            val dayTitle = snap?.optString("dayTitle", "") ?: ""
            val isComplete = phase == "complete" || (total > 0 && done >= total)
            val isIdle = phase == "idle" || total == 0

            val pill = when {
                isIdle -> context.getString(R.string.widget_ready)
                isComplete -> context.getString(R.string.widget_pill_complete)
                else -> context.getString(R.string.widget_pill_reading)
            }
            val detail = when {
                isIdle -> dayTitle.ifBlank { context.getString(R.string.widget_detail_idle) }
                isComplete -> dayTitle.ifBlank { context.getString(R.string.app_name) }
                nextTitle.isNotBlank() -> "Next: $nextTitle"
                else -> dayTitle
            }
            val cta = if (isComplete) context.getString(R.string.widget_cta_complete)
                      else context.getString(R.string.widget_cta_open)

            val openIntent = PendingIntent.getActivity(
                context, 0,
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )

            return RemoteViews(context.packageName, R.layout.dtwg_widget).apply {
                setTextViewText(R.id.widget_pill, pill)
                setTextViewText(R.id.widget_done_big, "$done/${max(total, 0)}")
                setTextViewText(R.id.widget_next, detail.ifBlank { context.getString(R.string.widget_detail_idle) })
                setTextViewText(R.id.widget_cta, cta)
                setImageViewBitmap(R.id.widget_ring, drawProgressRing(context, done, total, isComplete))
                setOnClickPendingIntent(R.id.widget_root, openIntent)
                setOnClickPendingIntent(R.id.widget_cta, openIntent)
            }
        }

        private fun loadSnap(context: Context): JSONObject? {
            val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(PREFS_KEY_SNAP, null)
            return raw?.let { runCatching { JSONObject(it) }.getOrNull() }
        }

        /** Draw the hero progress ring at runtime. The widget framework only
         *  supports a small set of drawable types via RemoteViews — bitmap
         *  pumping is the cleanest path to a precisely-arc'd, anti-aliased
         *  ring with anti-aliased centre text. */
        private fun drawProgressRing(
            context: Context,
            done: Int,
            total: Int,
            isComplete: Boolean,
        ): Bitmap {
            val density = context.resources.displayMetrics.density
            val sizeDp = 72
            val size = (sizeDp * density).toInt().coerceAtLeast(96)
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            val cx = size / 2f
            val cy = size / 2f
            val strokePx = 7.5f * density
            val radius = cx - strokePx
            val rect = android.graphics.RectF(cx - radius, cy - radius, cx + radius, cy + radius)

            val trackColor = ContextCompat.getColor(context, R.color.widget_ring_track)
            val fillColor  = ContextCompat.getColor(context, R.color.widget_ring_fill)
            val strongFg   = ContextCompat.getColor(context, R.color.widget_fg_strong)

            // Soft inner glow — adds Expressive depth without a separate view
            val glow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = (fillColor and 0x00FFFFFF) or 0x22000000
                style = Paint.Style.FILL
            }
            canvas.drawCircle(cx, cy, radius - strokePx / 2, glow)

            // Track ring
            val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = trackColor
                style = Paint.Style.STROKE
                strokeWidth = strokePx
                strokeCap = Paint.Cap.ROUND
            }
            canvas.drawCircle(cx, cy, radius, track)

            // Filled arc
            val sweep = if (total > 0) 360f * (min(done, total).toFloat() / total) else 0f
            if (sweep > 0f) {
                val arcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = fillColor
                    style = Paint.Style.STROKE
                    strokeWidth = strokePx
                    strokeCap = Paint.Cap.ROUND
                }
                canvas.drawArc(rect, -90f, sweep, false, arcPaint)
            }

            // Centre readout — % when in progress, ✓ when complete, '–' when idle.
            val label = when {
                isComplete -> "✓"
                total <= 0 -> "—"
                else -> "${(100f * done / total).toInt()}%"
            }
            val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = strongFg
                textAlign = Paint.Align.CENTER
                typeface = Typeface.create("sans-serif-black", Typeface.NORMAL)
                textSize = (if (isComplete) 28f else 22f) * density
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    letterSpacing = -0.02f
                }
            }

            // Centre label + subtitle together as a group so neither floats off-axis.
            if (size >= (60 * density)) {
                val sub = if (isComplete) "DONE" else "TODAY"
                val subPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color = (strongFg and 0x00FFFFFF) or 0xAA000000.toInt()
                    textAlign = Paint.Align.CENTER
                    typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
                    textSize = 8.5f * density
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        letterSpacing = 0.18f
                    }
                }
                val gap      = 3f * density
                val labelH   = textPaint.descent() - textPaint.ascent()
                val subH     = subPaint.descent()  - subPaint.ascent()
                val groupTop = cy - (labelH + gap + subH) / 2f
                canvas.drawText(label, cx, groupTop - textPaint.ascent(), textPaint)
                canvas.drawText(sub,   cx, groupTop + labelH + gap - subPaint.ascent(), subPaint)
            } else {
                val baseline = cy - (textPaint.ascent() + textPaint.descent()) / 2
                canvas.drawText(label, cx, baseline, textPaint)
            }

            // Avoid lint about unused 'Rect' import — kept for future bbox needs.
            @Suppress("UNUSED_VARIABLE") val _bbox: Rect? = null
            return bmp
        }
    }
}
