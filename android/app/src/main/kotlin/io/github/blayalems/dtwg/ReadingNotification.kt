package io.github.blayalems.dtwg

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.Icon
import android.os.Bundle
import androidx.annotation.RequiresApi
import org.json.JSONObject

private const val DTWG_PURPLE = 0xFF6750A4.toInt()
private const val DTWG_PURPLE_FILLED = 0xFF4F378B.toInt()
private const val DTWG_TRACK_REMAIN = 0xFF888888.toInt()
private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

@RequiresApi(36)
internal fun buildProgressStyleNotification(
    context: Context,
    snap: JSONObject,
    channelId: String,
): Notification {
    val phase = snap.optString("phase", "reading")
    val dayTitle = snap.optString("dayTitle", "Daily Time with God")
    val done = snap.optInt("done", 0).coerceAtLeast(0)
    val total = snap.optInt("total", 0).coerceAtLeast(1)
    val nextTitle = snap.optString("nextTitle", "")
    val progressText = snap.optString("progressText", "$done/$total readings")
    val startedAt = snap.optLong("startedAt", 0L)
    val isComplete = phase == "complete" || done >= total

    val title = if (isComplete) "Daily readings complete" else dayTitle
    val body = when {
        isComplete -> "$progressText complete"
        nextTitle.isNotBlank() -> "$progressText - Next: $nextTitle"
        else -> progressText
    }

    val openPi = PendingIntent.getActivity(
        context, 0,
        Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        },
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = Notification.Builder(context, channelId)
        .setSmallIcon(R.drawable.ic_bible)
        .setContentTitle(title)
        .setContentText(body)
        .setColor(DTWG_PURPLE)
        .setOngoing(!isComplete)
        .setVisibility(Notification.VISIBILITY_PUBLIC)
        .setContentIntent(openPi)
        .setOnlyAlertOnce(true)
        .setCategory("live_update")
        .setShortCriticalText(if (isComplete) "Done" else "$done/$total")
        .addExtras(Bundle().apply {
            putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true)
        })

    if (startedAt > 0L && !isComplete) {
        builder
            .setUsesChronometer(true)
            .setChronometerCountDown(false)
            .setWhen(startedAt)
    }

    builder.addAction(platformAction(context, "open", "Open"))
    if (!isComplete) {
        builder.addAction(platformAction(context, "complete", "Mark all done"))
    }

    val segUnits = 100
    val totalUnits = segUnits * total
    val progress = (done.coerceIn(0, total) * segUnits).coerceIn(0, totalUnits)

    val segments = (1..total).map { idx ->
        val color = when {
            isComplete || idx <= done -> DTWG_PURPLE_FILLED
            idx == done + 1 -> DTWG_PURPLE
            else -> DTWG_TRACK_REMAIN
        }
        Notification.ProgressStyle.Segment(segUnits).setColor(color)
    }

    val points = (1 until total).map { idx ->
        Notification.ProgressStyle.Point(idx * segUnits).setColor(Color.WHITE)
    }

    val style = Notification.ProgressStyle()
        .setStyledByProgress(false)
        .setProgress(progress)
        .setProgressTrackerIcon(Icon.createWithResource(context, R.drawable.ic_bible))
        .setProgressSegments(segments)
        .setProgressPoints(points)

    builder.setStyle(style)
    return builder.build()
}

@RequiresApi(23)
private fun platformAction(
    context: Context,
    actionKey: String,
    label: String,
): Notification.Action {
    val intent = Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        putExtra(MainActivity.EXTRA_NOTIF_ACTION, actionKey)
    }
    val pi = PendingIntent.getActivity(
        context, actionKey.hashCode(), intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    return Notification.Action.Builder(
        Icon.createWithResource(context, R.drawable.ic_bible),
        label, pi
    ).build()
}
