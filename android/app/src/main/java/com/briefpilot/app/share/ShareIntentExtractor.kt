package com.briefpilot.app.share

import android.content.Intent
import android.net.Uri
import android.os.Build

object ShareIntentExtractor {
    /** Extract shareable content URIs from Android share / view intents. */
    fun extract(intent: Intent?): List<Uri> {
        if (intent == null) return emptyList()
        return when (intent.action) {
            Intent.ACTION_SEND -> listOfNotNull(readStreamUri(intent))
            Intent.ACTION_SEND_MULTIPLE -> readStreamUriList(intent)
            else -> emptyList()
        }
    }

    private fun readStreamUri(intent: Intent): Uri? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(Intent.EXTRA_STREAM)
        }
    }

    private fun readStreamUriList(intent: Intent): List<Uri> {
        val list =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM)
            }
        return list?.filterNotNull() ?: emptyList()
    }
}
