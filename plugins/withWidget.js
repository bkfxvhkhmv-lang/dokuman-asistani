'use strict';

/**
 * Expo Config Plugin — Widget Extension
 *
 * iOS : Adds an App Group entitlement and creates a WidgetKit extension target
 *       with SwiftUI code that reads from the shared UserDefaults group.
 *
 * Android: Adds an AppWidget receiver and creates the necessary XML resources.
 *
 * Requires a development build — run:
 *   npx expo prebuild --clean
 *   npx expo run:ios  (or run:android)
 */

const {
  withEntitlementsPlist,
  withInfoPlist,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const APP_GROUP      = 'group.com.briefpilot.app';
const WIDGET_TARGET  = 'BriefPilotWidget';
const BUNDLE_ID      = 'com.briefpilot.app';

// ── iOS App Group entitlement ─────────────────────────────────────────────────

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, mod => {
    const ent = mod.modResults;
    const groups = ent['com.apple.security.application-groups'] || [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    ent['com.apple.security.application-groups'] = groups;
    return mod;
  });
}

// ── iOS Info.plist — widget bundle reference ──────────────────────────────────

function withWidgetInfoPlist(config) {
  return withInfoPlist(config, mod => {
    const plugins = mod.modResults.NSExtension || [];
    mod.modResults.WKExtensionMainStoryboardFile = undefined;  // not needed
    return mod;
  });
}

// ── iOS Swift widget files ────────────────────────────────────────────────────

const WIDGET_SWIFT = `
import WidgetKit
import SwiftUI

// ── Data model (mirrors WidgetSnapshot from WidgetDataService.ts) ─────────────

struct WidgetItem: Codable {
  var id: String
  var titel: String
  var absender: String
  var typ: String
  var betrag: String?
  var daysLeft: Int?
  var risk: String
  var emoji: String
}

struct WidgetData: Codable {
  var updated: String
  var urgentCount: Int
  var totalOpen: Int
  var offenBetrag: String?
  var topItems: [WidgetItem]
  var summaryLine: String
  var emptyState: Bool
}

func loadWidgetData() -> WidgetData? {
  let defaults = UserDefaults(suiteName: "${APP_GROUP}")
  guard let json = defaults?.string(forKey: "briefpilot_widget"),
        let data = json.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(WidgetData.self, from: data)
}

// ── Timeline provider ─────────────────────────────────────────────────────────

struct BriefPilotEntry: TimelineEntry {
  let date: Date
  let data: WidgetData?
}

struct BriefPilotProvider: TimelineProvider {
  func placeholder(in context: Context) -> BriefPilotEntry {
    BriefPilotEntry(date: Date(), data: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (BriefPilotEntry) -> Void) {
    completion(BriefPilotEntry(date: Date(), data: loadWidgetData()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<BriefPilotEntry>) -> Void) {
    let entry = BriefPilotEntry(date: Date(), data: loadWidgetData())
    // Refresh every 30 minutes
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// ── Small widget view ─────────────────────────────────────────────────────────

struct SmallWidgetView: View {
  var data: WidgetData?

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("✈️")
          .font(.caption2)
        Text("BriefPilot")
          .font(.caption2)
          .fontWeight(.semibold)
          .foregroundColor(.secondary)
        Spacer()
      }

      if let data = data, !data.emptyState {
        Text("\\(data.urgentCount > 0 ? "\\(data.urgentCount) dringend" : "\\(data.totalOpen) offen")")
          .font(.title3)
          .fontWeight(.bold)
          .foregroundColor(data.urgentCount > 0 ? Color(red: 0.89, green: 0.29, blue: 0.29) : .primary)

        if let top = data.topItems.first {
          Text(top.emoji + " " + top.absender)
            .font(.caption)
            .foregroundColor(.secondary)
            .lineLimit(1)
          if let betrag = top.betrag {
            Text(betrag)
              .font(.caption2)
              .fontWeight(.semibold)
          }
        }
      } else {
        Image(systemName: "checkmark.circle.fill")
          .foregroundColor(.green)
          .font(.title2)
        Text("Alles OK")
          .font(.caption)
          .foregroundColor(.secondary)
      }
      Spacer()
    }
    .padding(12)
  }
}

// ── Medium widget view ────────────────────────────────────────────────────────

struct MediumWidgetView: View {
  var data: WidgetData?

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("✈️ BriefPilot")
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundColor(.secondary)
        Spacer()
        if let data = data, let betrag = data.offenBetrag {
          Text(betrag + " offen")
            .font(.caption2)
            .foregroundColor(.secondary)
        }
      }

      if let data = data, !data.emptyState {
        Text(data.summaryLine)
          .font(.subheadline)
          .fontWeight(.bold)
          .foregroundColor(data.urgentCount > 0 ? Color(red: 0.89, green: 0.29, blue: 0.29) : .primary)

        Divider()

        ForEach(data.topItems.prefix(3), id: \\.id) { item in
          HStack(spacing: 8) {
            Text(item.emoji)
              .font(.caption)
            VStack(alignment: .leading, spacing: 1) {
              Text(item.absender)
                .font(.caption)
                .fontWeight(.semibold)
                .lineLimit(1)
              if let d = item.daysLeft {
                Text(d < 0 ? "Überfällig!" : d == 0 ? "Heute fällig!" : "\\(d) Tage")
                  .font(.caption2)
                  .foregroundColor(d <= 0 ? Color(red: 0.89, green: 0.29, blue: 0.29) : .secondary)
              }
            }
            Spacer()
            if let betrag = item.betrag {
              Text(betrag)
                .font(.caption2)
                .fontWeight(.semibold)
            }
          }
        }
      } else {
        HStack {
          Image(systemName: "checkmark.circle.fill")
            .foregroundColor(.green)
          Text("Alles erledigt")
            .font(.subheadline)
        }
      }
      Spacer(minLength: 0)
    }
    .padding(14)
  }
}

// ── Widget configuration ──────────────────────────────────────────────────────

struct BriefPilotWidget: Widget {
  let kind = "${WIDGET_TARGET}"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: BriefPilotProvider()) { entry in
      Group {
        if #available(iOSApplicationExtension 17.0, *) {
          MediumWidgetView(data: entry.data)
            .containerBackground(.fill.tertiary, for: .widget)
        } else {
          MediumWidgetView(data: entry.data)
            .background(Color(UIColor.systemBackground))
        }
      }
    }
    .configurationDisplayName("BriefPilot")
    .description("Dringende Dokumente auf einen Blick.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct BriefPilotWidgetBundle: WidgetBundle {
  var body: some Widget {
    BriefPilotWidget()
  }
}
`;

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;

const WIDGET_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${APP_GROUP}</string>
  </array>
</dict>
</plist>
`;

function withIOSWidgetFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async mod => {
      const iosDir = path.join(mod.modRequest.platformProjectRoot, WIDGET_TARGET);
      if (!fs.existsSync(iosDir)) fs.mkdirSync(iosDir, { recursive: true });

      fs.writeFileSync(path.join(iosDir, `${WIDGET_TARGET}.swift`), WIDGET_SWIFT.trimStart());
      fs.writeFileSync(path.join(iosDir, 'Info.plist'), WIDGET_INFO_PLIST.trimStart());
      fs.writeFileSync(path.join(iosDir, `${WIDGET_TARGET}.entitlements`), WIDGET_ENTITLEMENTS.trimStart());
      return mod;
    },
  ]);
}

// ── Android AppWidget ─────────────────────────────────────────────────────────

const ANDROID_WIDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:orientation="vertical"
  android:padding="16dp"
  android:background="@drawable/widget_background">

  <TextView
    android:id="@+id/widget_title"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="BriefPilot"
    android:textSize="11sp"
    android:textColor="#88FFFFFF"
    android:fontFamily="sans-serif-medium" />

  <TextView
    android:id="@+id/widget_summary"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:layout_marginTop="6dp"
    android:text="Keine dringenden Dokumente"
    android:textSize="16sp"
    android:textColor="#FFFFFF"
    android:fontFamily="sans-serif-bold" />

  <TextView
    android:id="@+id/widget_item1"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="10dp"
    android:text=""
    android:textSize="13sp"
    android:textColor="#CCFFFFFF"
    android:maxLines="1"
    android:ellipsize="end" />

  <TextView
    android:id="@+id/widget_item2"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="4dp"
    android:text=""
    android:textSize="13sp"
    android:textColor="#AAFFFFFF"
    android:maxLines="1"
    android:ellipsize="end" />

  <TextView
    android:id="@+id/widget_item3"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginTop="4dp"
    android:text=""
    android:textSize="13sp"
    android:textColor="#88FFFFFF"
    android:maxLines="1"
    android:ellipsize="end" />

</LinearLayout>
`;

const ANDROID_WIDGET_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:minWidth="250dp"
  android:minHeight="110dp"
  android:updatePeriodMillis="1800000"
  android:initialLayout="@layout/briefpilot_widget"
  android:resizeMode="horizontal|vertical"
  android:widgetCategory="home_screen|keyguard"
  android:description="@string/app_name" />
`;

function withAndroidWidget(config) {
  // Add receiver to manifest
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;

    if (!app.receiver) app.receiver = [];
    const alreadyAdded = app.receiver.some(r => r.$['android:name'] === '.BriefPilotWidgetProvider');
    if (!alreadyAdded) {
      app.receiver.push({
        $: {
          'android:name': '.BriefPilotWidgetProvider',
          'android:exported': 'true',
          'android:label': 'BriefPilot Widget',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        }],
        'meta-data': [{
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/briefpilot_widget_info',
          },
        }],
      });
    }
    return mod;
  });

  // Write resource files
  config = withDangerousMod(config, [
    'android',
    async mod => {
      const resDir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');

      const layoutDir = path.join(resDir, 'layout');
      if (!fs.existsSync(layoutDir)) fs.mkdirSync(layoutDir, { recursive: true });
      fs.writeFileSync(path.join(layoutDir, 'briefpilot_widget.xml'), ANDROID_WIDGET_LAYOUT.trimStart());

      const xmlDir = path.join(resDir, 'xml');
      if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'briefpilot_widget_info.xml'), ANDROID_WIDGET_INFO.trimStart());

      return mod;
    },
  ]);

  return config;
}

// ── Combined plugin ───────────────────────────────────────────────────────────

module.exports = function withWidget(config) {
  config = withAppGroupEntitlement(config);
  config = withWidgetInfoPlist(config);
  config = withIOSWidgetFiles(config);
  config = withAndroidWidget(config);
  return config;
};
