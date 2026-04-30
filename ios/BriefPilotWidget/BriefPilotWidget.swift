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
  let defaults = UserDefaults(suiteName: "group.com.briefpilot.app")
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
        Text("\(data.urgentCount > 0 ? "\(data.urgentCount) dringend" : "\(data.totalOpen) offen")")
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

        ForEach(data.topItems.prefix(3), id: \.id) { item in
          HStack(spacing: 8) {
            Text(item.emoji)
              .font(.caption)
            VStack(alignment: .leading, spacing: 1) {
              Text(item.absender)
                .font(.caption)
                .fontWeight(.semibold)
                .lineLimit(1)
              if let d = item.daysLeft {
                Text(d < 0 ? "Überfällig!" : d == 0 ? "Heute fällig!" : "\(d) Tage")
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
  let kind = "BriefPilotWidget"

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
