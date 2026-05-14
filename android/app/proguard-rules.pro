# Keep the JavaScript interface so Proguard doesn't strip annotated methods
-keepclassmembers class io.github.blayalems.dtwg.DtwgBridge {
    @android.webkit.JavascriptInterface <methods>;
}
