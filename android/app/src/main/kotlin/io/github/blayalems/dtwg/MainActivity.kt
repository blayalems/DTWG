package io.github.blayalems.dtwg

import android.graphics.Color
import android.content.Intent
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject
import kotlin.math.roundToInt

class MainActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_NOTIF_ACTION = "notif_action"
        private const val PWA_URL = "https://blayalems.github.io/DTWG/"
        private const val PREFS_NAME = "dtwg"
        private const val PREFS_KEY_VC = "vc"
    }

    private lateinit var webView: WebView
    private var pendingAction: String? = null
    private var pendingAssetRefreshVersion: Int = 0

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private data class NativeInsetsCss(
        val top: Int = 0,
        val right: Int = 0,
        val bottom: Int = 0,
        val left: Int = 0,
    )

    private var latestInsetsCss = NativeInsetsCss()

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris: Array<Uri>? = if (result.resultCode == RESULT_OK) {
            val data = result.data
            when {
                data?.clipData != null ->
                    Array(data.clipData!!.itemCount) { data.clipData!!.getItemAt(it).uri }
                data?.data != null -> arrayOf(data.data!!)
                else -> null
            }
        } else null
        filePathCallback?.onReceiveValue(uris)
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        webView = WebView(this).also { wv ->
            wv.settings.apply {
                javaScriptEnabled                = true
                domStorageEnabled                = true
                databaseEnabled                  = true
                cacheMode                        = WebSettings.LOAD_DEFAULT
                allowFileAccess                  = false
                mediaPlaybackRequiresUserGesture = false
                mixedContentMode                 = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                builtInZoomControls              = false
                displayZoomControls              = false
                setSupportZoom(false)
                // Prevent the system from auto-darkening web content; the PWA
                // manages its own dark/oled theme via CSS data-theme attributes.
                // API 29-32: deprecated setForceDark (no androidx.webkit dep needed)
                if (Build.VERSION.SDK_INT in 29..32) {
                    @Suppress("DEPRECATION")
                    setForceDark(android.webkit.WebSettings.FORCE_DARK_OFF)
                }
                // API 33+: replacement API
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    isAlgorithmicDarkeningAllowed = false
                }
            }
            wv.isVerticalScrollBarEnabled   = false
            wv.isHorizontalScrollBarEnabled = false
            wv.webChromeClient = DtwgChromeClient()
            wv.webViewClient   = DtwgWebViewClient()
            wv.addJavascriptInterface(DtwgBridge(this), "DTWGAndroid")
            ViewCompat.setOnApplyWindowInsetsListener(wv) { _, insets ->
                val bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() or
                        WindowInsetsCompat.Type.displayCutout()
                )
                val density = resources.displayMetrics.density.coerceAtLeast(1f)
                latestInsetsCss = NativeInsetsCss(
                    top = (bars.top / density).roundToInt(),
                    right = (bars.right / density).roundToInt(),
                    bottom = (bars.bottom / density).roundToInt(),
                    left = (bars.left / density).roundToInt(),
                )
                pushNativeInsets()
                WindowInsetsCompat.CONSUMED
            }
            setContentView(wv)
            ViewCompat.requestApplyInsets(wv)
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (!::webView.isInitialized) {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    return
                }
                webView.evaluateJavascript(
                    "(function(){return !!(window.__dtwgHandleNativeBack&&window.__dtwgHandleNativeBack());})()"
                ) { handled ->
                    if (handled == "true") return@evaluateJavascript
                    if (webView.canGoBack()) {
                        webView.goBack()
                        return@evaluateJavascript
                    }
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        pendingAction = intent?.getStringExtra(EXTRA_NOTIF_ACTION)
        intent?.removeExtra(EXTRA_NOTIF_ACTION)

        val initialUrl = prepareUrlForVersion()
        webView.loadUrl(initialUrl)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val action = intent.getStringExtra(EXTRA_NOTIF_ACTION) ?: return
        intent.removeExtra(EXTRA_NOTIF_ACTION)
        if (pendingAssetRefreshVersion > 0 || !::webView.isInitialized) {
            pendingAction = action
            return
        }
        dispatchAction(action)
    }

    override fun onResume()  { super.onResume();  webView.onResume()  }
    override fun onPause()   { super.onPause();   webView.onPause()   }
    override fun onDestroy() { super.onDestroy(); webView.destroy()   }

    private fun dispatchAction(action: String) {
        val safe = JSONObject.quote(action)
        webView.post {
            webView.evaluateJavascript(
                "if(window.__dtwgDispatchNativeAction){window.__dtwgDispatchNativeAction($safe);}else{window.dispatchEvent(new CustomEvent('dtwgNativeAction',{detail:$safe}));}",
                null
            )
        }
    }

    private fun pushNativeInsets() {
        if (!::webView.isInitialized) return
        val i = latestInsetsCss
        webView.post {
            webView.evaluateJavascript(
                "if(window.__dtwgSetNativeInsets){window.__dtwgSetNativeInsets(${i.top},${i.right},${i.bottom},${i.left});}",
                null
            )
        }
    }

    private fun prepareUrlForVersion(): String {
        val prefs   = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val stored  = prefs.getInt(PREFS_KEY_VC, 0)
        val current = currentVersionCode()
        if (stored != current) {
            webView.clearCache(true)
            webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE
            pendingAssetRefreshVersion = current
            return Uri.parse(PWA_URL).buildUpon()
                .appendQueryParameter("nativeVersion", current.toString())
                .appendQueryParameter("cacheBust", System.currentTimeMillis().toString())
                .build()
                .toString()
        }
        return PWA_URL
    }

    private fun currentVersionCode(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
        } else {
            @Suppress("DEPRECATION")
            packageManager.getPackageInfo(packageName, 0).versionCode
        }

    private inner class DtwgWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = false

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            val isSystemDark = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES
            view.evaluateJavascript("""
                (function(){
                    if(window.__dtwgNativeHooked)return;
                    window.__dtwgNativeHooked=true;
                    window.DTWG_IS_NATIVE=true;
                    window.DTWG_SYSTEM_IS_DARK=$isSystemDark;
                    window.__dtwgPendingNativeActions=window.__dtwgPendingNativeActions||[];
                    window.__dtwgDispatchNativeAction=function(a){
                        if(!a)return;
                        if(!window.__dtwgNativeActionReady){
                            window.__dtwgPendingNativeActions.push(String(a));
                        }
                        window.dispatchEvent(new CustomEvent('dtwgNativeAction',{detail:String(a)}));
                    };
                })();
            """.trimIndent(), null)
            pushNativeInsets()

            if (pendingAssetRefreshVersion > 0) {
                refreshPwaAssetsAfterApkUpdate(view, pendingAssetRefreshVersion)
                return
            }

            pendingAction?.let { action ->
                pendingAction = null
                dispatchAction(action)
            }
        }

        override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
            handler.cancel()
        }
    }

    private inner class DtwgChromeClient : WebChromeClient() {
        override fun onPermissionRequest(request: PermissionRequest) {
            if (request.origin.toString().startsWith("https://blayalems.github.io")) {
                request.grant(request.resources)
            } else {
                request.deny()
            }
        }

        override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams
        ): Boolean {
            this@MainActivity.filePathCallback?.onReceiveValue(null)
            this@MainActivity.filePathCallback = filePathCallback
            return try {
                fileChooserLauncher.launch(fileChooserParams.createIntent())
                true
            } catch (e: Exception) {
                this@MainActivity.filePathCallback = null
                false
            }
        }
    }

    private fun refreshPwaAssetsAfterApkUpdate(view: WebView, versionCode: Int) {
        pendingAssetRefreshVersion = 0
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putInt(PREFS_KEY_VC, versionCode)
            .apply()

        val freshUrl = Uri.parse(PWA_URL).buildUpon()
            .appendQueryParameter("nativeVersion", versionCode.toString())
            .appendQueryParameter("assetRefresh", System.currentTimeMillis().toString())
            .build()
            .toString()
        val safeUrl = JSONObject.quote(freshUrl)
        view.settings.cacheMode = WebSettings.LOAD_DEFAULT
        view.evaluateJavascript("""
            (function(){
                var clearCaches = window.caches ? caches.keys().then(function(keys){
                    return Promise.all(keys.filter(function(key){
                        return key.indexOf('dtwg-') === 0;
                    }).map(function(key){ return caches.delete(key); }));
                }) : Promise.resolve();
                var unregister = navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function(regs){
                    return Promise.all(regs.map(function(reg){ return reg.unregister(); }));
                }) : Promise.resolve();
                Promise.all([clearCaches, unregister]).catch(function(){}).then(function(){
                    location.replace($safeUrl);
                });
            })();
        """.trimIndent(), null)
    }
}
