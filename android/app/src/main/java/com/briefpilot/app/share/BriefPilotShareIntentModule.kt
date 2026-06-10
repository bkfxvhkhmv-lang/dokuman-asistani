package com.briefpilot.app.share

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class BriefPilotShareIntentModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    init {
        ShareIntentRouter.attachModule(this)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun getPendingShareUris(promise: Promise) {
        try {
            val uris = ShareIntentRouter.drainPending()
            promise.resolve(Arguments.fromList(uris))
        } catch (e: Exception) {
            promise.reject("SHARE_INTENT_ERROR", e.message, e)
        }
    }

    /** Called from ShareIntentRouter when a warm share intent arrives. */
    fun emitShareUris(uris: List<String>) {
        if (uris.isEmpty() || !reactContext.hasActiveReactInstance()) return
        val payload = Arguments.createMap().apply {
            putArray("uris", Arguments.fromList(uris))
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_NAME, payload)
        ShareIntentRouter.removePending(uris)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter on Android.
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter on Android.
    }

    companion object {
        const val NAME = "BriefPilotShareIntent"
        const val EVENT_NAME = "BriefPilotShareIntentReceived"
    }
}
