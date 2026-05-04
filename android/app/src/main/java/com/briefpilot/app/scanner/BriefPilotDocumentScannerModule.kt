package com.briefpilot.app.scanner

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.RESULT_FORMAT_JPEG
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions.SCANNER_MODE_FULL
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult

class BriefPilotDocumentScannerModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var pendingPromise: Promise? = null

    companion object {
        private const val SCAN_REQUEST_CODE = 0xB4F1
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName() = "BriefPilotVisionScanner"

    @ReactMethod
    fun scanDocuments(promise: Promise) {
        val activity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "No current activity")
            return
        }

        if (pendingPromise != null) {
            promise.reject("BUSY", "Scanner already active")
            return
        }
        pendingPromise = promise

        val options = GmsDocumentScannerOptions.Builder()
            .setScannerMode(SCANNER_MODE_FULL)
            .setResultFormats(RESULT_FORMAT_JPEG)
            .setGalleryImportAllowed(true)
            .build()

        GmsDocumentScanning.getClient(options)
            .getStartScanIntent(activity)
            .addOnSuccessListener { intentSender ->
                activity.startIntentSenderForResult(
                    intentSender, SCAN_REQUEST_CODE, null, 0, 0, 0
                )
            }
            .addOnFailureListener { e ->
                pendingPromise?.reject("LAUNCH_FAILED", e.message, e)
                pendingPromise = null
            }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != SCAN_REQUEST_CODE) return
        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode == Activity.RESULT_CANCELED) {
            val result = Arguments.createMap().apply {
                putArray("imageUris", Arguments.createArray())
                putInt("pageCount", 0)
                putBoolean("corrected", false)
                putBoolean("cancelled", true)
                putString("source", "mlkit")
            }
            promise.resolve(result)
            return
        }

        val scanResult = GmsDocumentScanningResult.fromActivityResultIntent(data)
        if (scanResult == null) {
            promise.reject("NO_RESULT", "Scanner returned no result")
            return
        }

        val pages = scanResult.pages ?: emptyList()
        val uris = Arguments.createArray()
        for (page in pages) {
            uris.pushString(page.imageUri.toString())
        }

        val result = Arguments.createMap().apply {
            putArray("imageUris", uris)
            putInt("pageCount", pages.size)
            putBoolean("corrected", true)
            putBoolean("cancelled", false)
            putString("source", "mlkit")
        }
        promise.resolve(result)
    }

    override fun onNewIntent(intent: Intent?) {}
}
