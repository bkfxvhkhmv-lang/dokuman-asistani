package com.briefpilot.app.scanner

import com.facebook.react.bridge.*
import org.opencv.android.OpenCVLoader

class BriefPilotScannerModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BriefPilotScanner"

    override fun initialize() {
        super.initialize()
        OpenCVLoader.initLocal() // OpenCV'yi başlat
    }

    @ReactMethod
    fun getCapabilities(promise: Promise) {
        val map = WritableNativeMap().apply {
            putBoolean("edgeDetection",         true)
            putBoolean("perspectiveCorrection",  true)
            putBoolean("adaptiveThreshold",      true)
            putBoolean("clahe",                  true)
            putBoolean("shadowRemoval",          false)
            putBoolean("frameProcessor",         false)
            putString("platform",  "android")
            putString("version",   "android-opencv-1.0")
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun detectDocumentEdges(payload: ReadableMap, promise: Promise) {
        val uri = payload.getString("uri") ?: run { promise.resolve(null); return }
        val bitmap = BriefPilotOpenCVHelper.loadBitmap(uri) ?: run { promise.resolve(null); return }

        Thread {
            try {
                val result = BriefPilotOpenCVHelper.detectDocumentCorners(bitmap)
                if (result == null) { promise.resolve(null); return@Thread }
                promise.resolve(cornerToMap(result))
            } catch (e: Exception) {
                promise.reject("DETECT_FAILED", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun detectEdgesInFrame(payload: ReadableMap, promise: Promise) {
        val uri = payload.getString("uri") ?: run { promise.resolve(null); return }
        val bitmap = BriefPilotOpenCVHelper.loadBitmap(uri) ?: run { promise.resolve(null); return }

        Thread {
            try {
                val result = BriefPilotOpenCVHelper.detectDocumentCorners(bitmap)
                promise.resolve(if (result != null) cornerToMap(result) else null)
            } catch (e: Exception) {
                promise.resolve(null)
            }
        }.start()
    }

    @ReactMethod
    fun warpPerspective(payload: ReadableMap, promise: Promise) {
        val uri = payload.getString("imageUri") ?: run { promise.reject("INVALID_INPUT", "imageUri gerekli"); return }
        val bitmap = BriefPilotOpenCVHelper.loadBitmap(uri) ?: run { promise.reject("LOAD_FAILED", "Görüntü yüklenemedi"); return }

        val corners = BriefPilotOpenCVHelper.CornerResult(
            topLeft     = readPointF(payload.getMap("topLeft")),
            topRight    = readPointF(payload.getMap("topRight")),
            bottomRight = readPointF(payload.getMap("bottomRight")),
            bottomLeft  = readPointF(payload.getMap("bottomLeft")),
            confidence  = 1f,
            isBlurry    = false, needsFlash = false,
            blurVariance = 0.0, avgBrightness = 0.0,
        )

        val outW = if (payload.hasKey("outWidth"))  payload.getInt("outWidth")  else 2480
        val outH = if (payload.hasKey("outHeight")) payload.getInt("outHeight") else 3508

        Thread {
            try {
                val warped = BriefPilotOpenCVHelper.warpPerspective(bitmap, corners, outW, outH)
                val outUri = warped?.let { BriefPilotOpenCVHelper.saveBitmap(it, reactContext.cacheDir) }
                if (outUri != null) {
                    promise.resolve(WritableNativeMap().apply { putString("uri", outUri) })
                } else {
                    promise.reject("WARP_FAILED", "Perspektif düzeltme başarısız")
                }
            } catch (e: Exception) {
                promise.reject("WARP_FAILED", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun applyFilter(payload: ReadableMap, promise: Promise) {
        val uri    = payload.getString("imageUri") ?: run { promise.reject("INVALID_INPUT", "imageUri gerekli"); return }
        val filter = payload.getString("filter") ?: "original"
        val bitmap = BriefPilotOpenCVHelper.loadBitmap(uri) ?: run { promise.resolve(WritableNativeMap().apply { putString("uri", uri) }); return }

        Thread {
            try {
                val processed = when (filter) {
                    "bw", "document", "thresh" -> BriefPilotOpenCVHelper.applyAdaptiveThreshold(bitmap)
                    "enhance", "clahe"         -> {
                        val clip = if (payload.hasKey("clipLimit")) payload.getDouble("clipLimit") else 2.0
                        BriefPilotOpenCVHelper.applyCLAHE(bitmap, clip)
                    }
                    else -> bitmap
                }
                val outUri = processed?.let { BriefPilotOpenCVHelper.saveBitmap(it, reactContext.cacheDir) } ?: uri
                promise.resolve(WritableNativeMap().apply { putString("uri", outUri) })
            } catch (e: Exception) {
                promise.resolve(WritableNativeMap().apply { putString("uri", uri) })
            }
        }.start()
    }

    @ReactMethod
    fun applyMagicFilter(payload: ReadableMap, promise: Promise) {
        val uri = payload.getString("imageUri") ?: run { promise.reject("INVALID_INPUT", "imageUri gerekli"); return }
        val bitmap = BriefPilotOpenCVHelper.loadBitmap(uri) ?: run { promise.resolve(WritableNativeMap().apply { putString("uri", uri) }); return }

        Thread {
            try {
                val result = BriefPilotOpenCVHelper.applyDocumentMagicFilter(bitmap)
                val outUri = result?.let { BriefPilotOpenCVHelper.saveBitmap(it, reactContext.cacheDir) } ?: uri
                promise.resolve(WritableNativeMap().apply { putString("uri", outUri) })
            } catch (e: Exception) {
                promise.resolve(WritableNativeMap().apply { putString("uri", uri) })
            }
        }.start()
    }

    // ── Yardımcılar ─────────────────────────────────────────────────────────

    private fun cornerToMap(r: BriefPilotOpenCVHelper.CornerResult): WritableMap {
        return WritableNativeMap().apply {
            putDouble("confidence",    r.confidence.toDouble())
            putBoolean("isBlurry",     r.isBlurry)
            putBoolean("needsFlash",   r.needsFlash)
            putDouble("blurVariance",  r.blurVariance)
            putDouble("avgBrightness", r.avgBrightness)
            if (r.confidence > 0) {
                putMap("topLeft",     pointMap(r.topLeft))
                putMap("topRight",    pointMap(r.topRight))
                putMap("bottomRight", pointMap(r.bottomRight))
                putMap("bottomLeft",  pointMap(r.bottomLeft))
            }
        }
    }

    private fun pointMap(p: BriefPilotOpenCVHelper.PointF) = WritableNativeMap().apply {
        putDouble("x", p.x.toDouble())
        putDouble("y", p.y.toDouble())
    }

    private fun readPointF(map: ReadableMap?): BriefPilotOpenCVHelper.PointF {
        if (map == null) return BriefPilotOpenCVHelper.PointF(0f, 0f)
        return BriefPilotOpenCVHelper.PointF(
            map.getDouble("x").toFloat(),
            map.getDouble("y").toFloat(),
        )
    }
}
