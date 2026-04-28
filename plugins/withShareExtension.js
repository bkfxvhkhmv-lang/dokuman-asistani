'use strict';

/**
 * Expo Config Plugin — Share Extension
 *
 * iOS: Registers CFBundleDocumentTypes so the app appears in "Open With" for PDFs
 *      and images. When the user taps "Open With → BriefPilot" the file URL arrives
 *      via Linking.getInitialURL() as a file:// URI.
 *
 * Android: Adds ACTION_SEND intent filters so the app appears in the system
 *          share sheet for PDFs and images.
 */

const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

// ── iOS ───────────────────────────────────────────────────────────────────────

function withIOSDocumentTypes(config) {
  return withInfoPlist(config, mod => {
    const plist = mod.modResults;

    plist.CFBundleDocumentTypes = [
      ...(plist.CFBundleDocumentTypes || []),
      {
        CFBundleTypeName: 'PDF-Dokument',
        CFBundleTypeRole: 'Viewer',
        LSHandlerRank: 'Alternate',
        LSItemContentTypes: ['com.adobe.pdf'],
      },
      {
        CFBundleTypeName: 'Bild',
        CFBundleTypeRole: 'Viewer',
        LSHandlerRank: 'Alternate',
        LSItemContentTypes: ['public.image', 'public.jpeg', 'public.png', 'public.tiff'],
      },
    ];

    // Allow opening files from other apps
    plist.LSSupportsOpeningDocumentsInPlace = false;
    plist.UIFileSharingEnabled = true;

    return mod;
  });
}

// ── Android ───────────────────────────────────────────────────────────────────

function withAndroidShareIntent(config) {
  return withAndroidManifest(config, mod => {
    const manifest = mod.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return mod;

    const mainActivity = application.activity?.find(
      a => a.$['android:name'] === '.MainActivity'
    );
    if (!mainActivity) return mod;

    if (!mainActivity['intent-filter']) mainActivity['intent-filter'] = [];

    // ACTION_SEND for PDFs
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: [{ $: { 'android:mimeType': 'application/pdf' } }],
    });

    // ACTION_SEND for images
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
      category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
      data: [{ $: { 'android:mimeType': 'image/*' } }],
    });

    // ACTION_VIEW for PDF files (from Files / email attachments)
    mainActivity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [{ $: { 'android:mimeType': 'application/pdf' } }],
    });

    return mod;
  });
}

// ── Combined plugin ───────────────────────────────────────────────────────────

module.exports = function withShareExtension(config) {
  config = withIOSDocumentTypes(config);
  config = withAndroidShareIntent(config);
  return config;
};
