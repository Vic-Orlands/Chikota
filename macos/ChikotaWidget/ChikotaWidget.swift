import SwiftUI
import WidgetKit

struct ChikotaEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct ChikotaProvider: TimelineProvider {
    func placeholder(in context: Context) -> ChikotaEntry {
        ChikotaEntry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (ChikotaEntry) -> Void) {
        completion(ChikotaEntry(date: Date(), snapshot: SharedStore.loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ChikotaEntry>) -> Void) {
        let entry = ChikotaEntry(date: Date(), snapshot: SharedStore.loadSnapshot())
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900))))
    }
}

struct ChikotaWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ChikotaEntry

    private var items: [WidgetBookmark] {
        Array(entry.snapshot.items.filter(\.belongsOnWidget).prefix(family == .systemLarge ? 8 : 4))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("chikota")
                    .font(.headline)
                Spacer()
                Circle()
                    .fill(entry.snapshot.isOnline ? Color.green : Color.secondary)
                    .frame(width: 7, height: 7)
                Text(entry.snapshot.isOnline ? "online" : "offline")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            if items.isEmpty {
                Spacer()
                Text("add a bookmark from the chikota app")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            } else {
                ForEach(items) { bookmark in
                    Link(destination: deepLink(for: bookmark)) {
                        HStack(spacing: 8) {
                            Image(systemName: symbol(for: bookmark))
                                .frame(width: 15)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(bookmark.title)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .lineLimit(1)
                                Text(bookmark.url.host() ?? bookmark.url.absoluteString)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                            Spacer()
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            if let syncedAt = entry.snapshot.syncedAt {
                Text("updated \(syncedAt, style: .relative)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .containerBackground(.background, for: .widget)
    }

    private func deepLink(for bookmark: WidgetBookmark) -> URL {
        var components = URLComponents()
        components.scheme = "chikota"
        components.host = "open"
        components.queryItems = [
            URLQueryItem(name: "url", value: bookmark.url.absoluteString),
            URLQueryItem(name: "browser", value: entry.snapshot.browser.rawValue)
        ]
        return components.url!
    }

    private func symbol(for bookmark: WidgetBookmark) -> String {
        if bookmark.hasActiveReminder { return "bell.fill" }
        if bookmark.hasCompletedReminder { return "calendar.badge.checkmark" }
        if bookmark.isPinned { return "pin.fill" }
        if bookmark.isRecent { return "clock.fill" }
        return "bookmark.fill"
    }
}

struct ChikotaWidget: Widget {
    let kind = "ChikotaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ChikotaProvider()) { entry in
            ChikotaWidgetView(entry: entry)
        }
        .configurationDisplayName("chikota bookmarks")
        .description("reminders, pinned links, and recent opens on your desktop.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

@main
struct ChikotaWidgetBundle: WidgetBundle {
    var body: some Widget {
        ChikotaWidget()
    }
}
