package io.github.blayalems.dtwg

import android.Manifest
import android.app.*
import android.content.ClipData
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.util.Base64
import android.util.Log
import android.view.HapticFeedbackConstants
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.ArrayDeque
import java.util.Locale

class DtwgBridge(private val context: Context) {

    companion object {
        const val NOTIF_ID   = 42
        const val CHANNEL_ID = "dtwg_reading"
        private const val DTWG_PURPLE = 0xFF6750A4.toInt()
        private const val TAG = "DtwgBridge"
    }

    init {
        createChannel()
    }

    @JavascriptInterface
    fun onReadingState(json: String) {
        val snap = runCatching { JSONObject(json) }.getOrNull() ?: return
        if (snap.optString("phase") == "idle") {
            clearReading()
            return
        }
        val done = snap.optInt("done", 0)
        val total = snap.optInt("total", 0)
        val isComplete = snap.optString("phase") == "complete" || (total > 0 && done >= total)
        DtwgWidgetProvider.updateAll(context, snap)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM && !isComplete) {
            val serviceIntent = Intent(context, ReadingService::class.java).apply {
                action = ReadingService.ACTION_UPDATE
                putExtra(ReadingService.EXTRA_SNAP, json)
            }
            Handler(Looper.getMainLooper()).post {
                try {
                    context.startForegroundService(serviceIntent)
                } catch (e: Exception) {
                    postFallbackNotification(snap)
                }
            }
        } else {
            if (isComplete) {
                runCatching { context.stopService(Intent(context, ReadingService::class.java)) }
            }
            postFallbackNotification(snap)
        }
    }

    @JavascriptInterface
    fun clearReading() {
        DtwgWidgetProvider.updateAll(context, null)
        Handler(Looper.getMainLooper()).post {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                runCatching { context.stopService(Intent(context, ReadingService::class.java)) }
                runCatching { NotificationManagerCompat.from(context).cancel(NOTIF_ID) }
            }
            runCatching { NotificationManagerCompat.from(context).cancel(NOTIF_ID) }
        }
    }

    @JavascriptInterface
    fun isNative(): Boolean = true

    /* ----- v1.6.0: native status-bar / system-bar sync ----- */
    @JavascriptInterface
    fun setStatusBarStyle(hex: String, isDark: Boolean) {
        val activity = context as? Activity ?: return
        val parsed = runCatching { Color.parseColor(hex.trim()) }.getOrElse { return }
        Handler(Looper.getMainLooper()).post {
            val window = activity.window ?: return@post
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                window.statusBarColor = Color.TRANSPARENT
                window.navigationBarColor = Color.TRANSPARENT
            } else {
                window.statusBarColor = parsed
                window.navigationBarColor = parsed
            }
            val decor = window.decorView
            // light status bar = dark icons (used in our light theme)
            val controller = androidx.core.view.WindowInsetsControllerCompat(window, decor)
            controller.isAppearanceLightStatusBars = !isDark
            controller.isAppearanceLightNavigationBars = !isDark
        }
    }

    @JavascriptInterface
    fun getSystemAccentColor(): String {
        val color = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.getColor(context, android.R.color.system_accent1_500)
        } else {
            DTWG_PURPLE
        }
        return String.format("#%06X", 0xFFFFFF and color)
    }

    @JavascriptInterface
    fun setKeepScreenOn(enabled: Boolean): Boolean {
        val activity = context as? Activity ?: return false
        Handler(Looper.getMainLooper()).post {
            if (enabled) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
        return true
    }

    @JavascriptInterface
    fun getNotificationPermissionState(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return "granted"
        return if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED
        ) {
            "granted"
        } else {
            "prompt"
        }
    }

    @JavascriptInterface
    fun requestNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED
        ) return true
        val activity = context as? Activity ?: return false
        Handler(Looper.getMainLooper()).post {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                0xD710,
            )
        }
        return false
    }

    @JavascriptInterface
    fun openAppNotificationSettings() {
        val activity = context as? Activity ?: return
        Handler(Looper.getMainLooper()).post {
            try {
                val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, activity.packageName)
                    }
                } else {
                    Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = android.net.Uri.fromParts("package", activity.packageName, null)
                    }
                }
                activity.startActivity(intent)
            } catch (e: Exception) {
                showToast("Couldn't open notification settings: ${e.message}", long = true)
            }
        }
    }

    /* ----- v1.6.0: native alarm-backed reminder ----- */
    @JavascriptInterface
    fun scheduleNativeReminder(timeHHMM: String): Boolean {
        val parts = timeHHMM.split(":")
        if (parts.size != 2) return false
        val hour = parts[0].toIntOrNull() ?: return false
        val minute = parts[1].toIntOrNull() ?: return false
        return try {
            ReminderAlarmReceiver.schedule(context, hour, minute)
            true
        } catch (e: Exception) {
            Log.w(TAG, "scheduleNativeReminder failed", e)
            false
        }
    }

    @JavascriptInterface
    fun canScheduleExactAlarms(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return false
        return alarmManager.canScheduleExactAlarms()
    }

    @JavascriptInterface
    fun openExactAlarmSettings(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        val activity = context as? Activity ?: return false
        Handler(Looper.getMainLooper()).post {
            try {
                activity.startActivity(
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                        data = android.net.Uri.parse("package:${activity.packageName}")
                    }
                )
            } catch (e: Exception) {
                showToast("Couldn't open exact alarm settings: ${e.message}", long = true)
            }
        }
        return true
    }

    @JavascriptInterface
    fun cancelNativeReminder(): Boolean {
        return try { ReminderAlarmReceiver.cancel(context); true } catch (e: Exception) { false }
    }

    /* ----- v1.6.2: native TTS for Android WebView (no speechSynthesis API) ----- */
    private data class TtsRequest(val text: String, val rate: Float)

    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var ttsInitializing = false
    private var ttsUtteranceSeq = 0
    private val ttsQueue = ArrayDeque<TtsRequest>()

    @JavascriptInterface
    fun speakText(text: String, rate: Float) {
        val safeText = text.take(50_000)
        val safeRate = rate.coerceIn(0.5f, 2.0f)
        Handler(Looper.getMainLooper()).post {
            ttsQueue.add(TtsRequest(safeText, safeRate))
            if (tts != null && ttsReady) {
                flushTtsQueue()
                return@post
            }
            if (!ttsInitializing) {
                ttsInitializing = true
                tts = TextToSpeech(context) { status ->
                    Handler(Looper.getMainLooper()).post {
                        ttsInitializing = false
                        if (status == TextToSpeech.SUCCESS) {
                            ttsReady = true
                            tts?.language = Locale.US
                            flushTtsQueue()
                        } else {
                            ttsReady = false
                            ttsQueue.clear()
                        }
                    }
                }
            }
        }
    }

    @JavascriptInterface
    fun stopNativeTts() {
        Handler(Looper.getMainLooper()).post {
            ttsQueue.clear()
            tts?.stop()
        }
    }

    private fun flushTtsQueue() {
        val engine = tts ?: return
        if (!ttsReady || ttsQueue.isEmpty()) return
        val firstMode = if (engine.isSpeaking) TextToSpeech.QUEUE_ADD else TextToSpeech.QUEUE_FLUSH
        var mode = firstMode
        while (ttsQueue.isNotEmpty()) {
            val request = ttsQueue.removeFirst()
            engine.setSpeechRate(request.rate)
            engine.speak(request.text, mode, null, "dtwg_tts_${++ttsUtteranceSeq}")
            mode = TextToSpeech.QUEUE_ADD
        }
    }

    @JavascriptInterface
    fun saveBackupFile(filename: String, json: String) {
        try {
            val safeName = cleanFilename(filename, "dtwg-backup.json", ".json")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                    put(MediaStore.Downloads.MIME_TYPE, "application/json")
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: throw Exception("MediaStore insert returned null")
                try {
                    resolver.openOutputStream(uri)
                        ?.use { it.write(json.toByteArray(Charsets.UTF_8)) }
                        ?: throw Exception("MediaStore output stream returned null")
                    values.clear()
                    values.put(MediaStore.Downloads.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                } catch (e: Exception) {
                    runCatching { resolver.delete(uri, null, null) }
                    throw e
                }
            } else {
                val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                dir.mkdirs()
                File(dir, safeName).writeText(json, Charsets.UTF_8)
            }
            (context as? Activity)?.runOnUiThread {
                Toast.makeText(context, "Backup saved to Downloads/$safeName", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            (context as? Activity)?.runOnUiThread {
                Toast.makeText(context, "Backup save failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun saveImageFile(filename: String, dataUrl: String) {
        try {
            val safeName = cleanFilename(filename, "dtwg-image.png", ".png")
            val bytes = decodeDataUrl(dataUrl)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                    put(MediaStore.Downloads.MIME_TYPE, "image/png")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: throw Exception("MediaStore insert returned null")
                try {
                    resolver.openOutputStream(uri)
                        ?.use { it.write(bytes) }
                        ?: throw Exception("MediaStore output stream returned null")
                    values.clear()
                    values.put(MediaStore.Downloads.IS_PENDING, 0)
                    resolver.update(uri, values, null, null)
                } catch (e: Exception) {
                    runCatching { resolver.delete(uri, null, null) }
                    throw e
                }
            } else {
                val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                dir.mkdirs()
                File(dir, safeName).writeBytes(bytes)
            }
            (context as? Activity)?.runOnUiThread {
                Toast.makeText(context, "Image saved to Downloads/$safeName", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            (context as? Activity)?.runOnUiThread {
                Toast.makeText(context, "Image save failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun shareText(title: String, text: String): Boolean {
        val safeTitle = title.ifBlank { "Share DTWG note" }
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TITLE, safeTitle)
            putExtra(Intent.EXTRA_SUBJECT, safeTitle)
            putExtra(Intent.EXTRA_TEXT, text)
        }
        return launchShare(sendIntent, safeTitle)
    }

    @JavascriptInterface
    fun shareJsonFile(filename: String, json: String, title: String): Boolean =
        shareCacheFile(
            cleanFilename(filename, "dtwg-backup.json", ".json"),
            json.toByteArray(Charsets.UTF_8),
            "application/json",
            title.ifBlank { "Share DTWG backup" },
        )

    @JavascriptInterface
    fun shareImageFile(filename: String, dataUrl: String, title: String): Boolean =
        runCatching {
            shareCacheFile(
                cleanFilename(filename, "dtwg-image.png", ".png"),
                decodeDataUrl(dataUrl),
                "image/png",
                title.ifBlank { "Share DTWG image" },
            )
        }.getOrElse { err ->
            showToast("Image share failed: ${err.message}", long = true)
            false
        }

    @JavascriptInterface
    fun haptic(patternJson: String): Boolean {
        val pattern = parseHapticPattern(patternJson)
        val decor = (context as? Activity)?.window?.decorView
        val vibrator = getVibrator()
        return try {
            if (pattern.size <= 1) {
                if (vibratePrimitiveClick(vibrator)) return true
                Handler(Looper.getMainLooper()).post {
                    decor?.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK)
                }
                return true
            }
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val effect = VibrationEffect.createWaveform(longArrayOf(0L, *pattern), -1)
                    vibrator.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(longArrayOf(0L, *pattern), -1)
                }
                true
            } else {
                Handler(Looper.getMainLooper()).post {
                    decor?.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK)
                }
                true
            }
        } catch (e: Exception) {
            Handler(Looper.getMainLooper()).post {
                decor?.performHapticFeedback(HapticFeedbackConstants.CONTEXT_CLICK)
            }
            false
        }
    }

    private fun vibratePrimitiveClick(vibrator: Vibrator?): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return false
        if (vibrator == null || !vibrator.hasVibrator()) return false
        return try {
            if (!vibrator.areAllPrimitivesSupported(VibrationEffect.Composition.PRIMITIVE_CLICK)) {
                return false
            }
            val effect = VibrationEffect.startComposition()
                .addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.5f)
                .compose()
            vibrator.vibrate(effect)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun buildNotification(snap: JSONObject): Notification {
        if (Build.VERSION.SDK_INT >= 36) {
            val progress = runCatching { buildProgressStyleNotification(context, snap, CHANNEL_ID) }
            progress.getOrNull()?.let { return it }
            progress.exceptionOrNull()?.let { err ->
                Log.w(TAG, "Progress-style notification failed; falling back to compat", err)
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
            context, 0,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
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

        builder.addAction(notifAction("open", "Open"))
        if (!isComplete) {
            builder.addAction(notifAction("complete", "Mark all done"))
        }

        if (Build.VERSION.SDK_INT >= 36) {
            builder.setCategory("live_update")
        } else {
            builder.setCategory(NotificationCompat.CATEGORY_PROGRESS)
        }

        return builder.build()
    }

    private fun notifAction(actionKey: String, label: String): NotificationCompat.Action {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_NOTIF_ACTION, actionKey)
        }
        val pi = PendingIntent.getActivity(
            context, actionKey.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Action.Builder(0, label, pi).build()
    }

    private fun postFallbackNotification(snap: JSONObject) {
        runCatching {
            NotificationManagerCompat.from(context).notify(NOTIF_ID, buildNotification(snap))
        }.onFailure { err ->
            Log.w(TAG, "Fallback notification failed", err)
        }
    }

    private fun decodeDataUrl(dataUrl: String): ByteArray {
        val payload = dataUrl.substringAfter(",", dataUrl).trim()
        return Base64.decode(payload, Base64.DEFAULT)
    }

    private fun cleanFilename(filename: String, fallback: String, extension: String): String {
        val cleaned = filename
            .replace(Regex("""[\\/:*?"<>|]"""), "_")
            .trim()
            .take(96)
        return when {
            cleaned.isEmpty() -> fallback
            cleaned.endsWith(extension, ignoreCase = true) -> cleaned
            else -> "$cleaned$extension"
        }
    }

    private fun shareCacheFile(
        safeName: String,
        bytes: ByteArray,
        mimeType: String,
        title: String,
    ): Boolean {
        return try {
            val dir = File(context.cacheDir, "shared").apply { mkdirs() }
            val file = File(dir, safeName)
            file.writeBytes(bytes)
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file,
            )
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(Intent.EXTRA_TITLE, title)
                putExtra(Intent.EXTRA_SUBJECT, title)
                putExtra(Intent.EXTRA_STREAM, uri)
                clipData = ClipData.newUri(context.contentResolver, title, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            launchShare(sendIntent, title)
        } catch (e: Exception) {
            showToast("Share failed: ${e.message}", long = true)
            false
        }
    }

    private fun launchShare(sendIntent: Intent, title: String): Boolean {
        val chooser = Intent.createChooser(sendIntent, title.ifBlank { "Share with" }).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        Handler(Looper.getMainLooper()).post {
            try {
                context.startActivity(chooser)
            } catch (e: Exception) {
                showToast("Share failed: ${e.message}", long = true)
            }
        }
        return true
    }

    private fun showToast(message: String, long: Boolean = false) {
        (context as? Activity)?.runOnUiThread {
            Toast.makeText(context, message, if (long) Toast.LENGTH_LONG else Toast.LENGTH_SHORT).show()
        }
    }

    private fun parseHapticPattern(patternJson: String): LongArray {
        return runCatching {
            val trimmed = patternJson.trim()
            val values = if (trimmed.startsWith("[")) {
                val array = JSONArray(trimmed)
                (0 until array.length()).map { array.optLong(it, 18L) }
            } else {
                listOf(trimmed.toLongOrNull() ?: 18L)
            }
            values
                .filter { it > 0L }
                .map { it.coerceIn(1L, 400L) }
                .ifEmpty { listOf(18L) }
                .toLongArray()
        }.getOrDefault(longArrayOf(18L))
    }

    private fun getVibrator(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID, "Daily Reading", NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Shows daily Bible reading progress and quick actions"
            lightColor = Color.parseColor("#6750A4")
            enableLights(true)
            setShowBadge(false)
        }
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .createNotificationChannel(channel)
    }
}
