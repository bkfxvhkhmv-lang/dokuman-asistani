package com.briefpilot.app.share

import android.content.Intent
import java.lang.ref.WeakReference

/** Holds pending ACTION_SEND URIs until JS consumes them. */
object ShareIntentRouter {
    private val pending = LinkedHashSet<String>()
    private var moduleRef = WeakReference<BriefPilotShareIntentModule>(null)

    @Synchronized
    fun attachModule(module: BriefPilotShareIntentModule) {
        moduleRef = WeakReference(module)
    }

    @Synchronized
    fun captureIntent(intent: Intent?) {
        val uris = ShareIntentExtractor.extract(intent).map { it.toString() }
        if (uris.isEmpty()) return
        pending.addAll(uris)
        moduleRef.get()?.emitShareUris(uris)
    }

    @Synchronized
    fun drainPending(): List<String> {
        val copy = pending.toList()
        pending.clear()
        return copy
    }

    @Synchronized
    fun removePending(uris: List<String>) {
        pending.removeAll(uris.toSet())
    }
}
