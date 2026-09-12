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

    private var limit: Int {
        switch family {
        case .systemSmall: 2
        case .systemMedium: 4
        case .systemLarge: 8
        case .systemExtraLarge: 12
        default: 4
        }
    }

    private var widgetItems: [WidgetBookmark] {
        entry.snapshot.items.filter(\.belongsOnWidget)
    }

    private var items: [WidgetBookmark] {
        let sorted = widgetItems.sorted {
            if $0.isPinned != $1.isPinned { return $0.isPinned }
            return $0.updatedAt > $1.updatedAt
        }
        return Array(sorted.prefix(limit))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 7 : 10) {
            header
            if items.isEmpty {
                Spacer()
                Link(destination: URL(string: "chikota://add")!) {
                    VStack(alignment: .leading, spacing: 5) {
                        Image(systemName: "plus.circle.fill").font(.title2)
                        Text("save your first bookmark")
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundStyle(.orange)
                }
                Spacer()
            } else {
                if family != .systemSmall { collectionStrip }
                ForEach(items) { bookmark in
                    bookmarkRow(bookmark)
                }
                Spacer(minLength: 0)
            }
            footer
        }
        .containerBackground(for: .widget) {
            ZStack {
                Color(nsColor: .windowBackgroundColor)
                LinearGradient(
                    colors: [.orange.opacity(0.11), .clear, .brown.opacity(0.05)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        }
        .widgetURL(family == .systemSmall ? URL(string: "chikota://pinned") : nil)
    }

    private var header: some View {
        HStack(spacing: 7) {
            ZStack {
                RoundedRectangle(cornerRadius: 7).fill(.orange.gradient)
                Image(systemName: "bookmark.fill")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
            }
            .frame(width: 25, height: 25)
            VStack(alignment: .leading, spacing: 0) {
                Text("chikota").font(.headline)
                if family != .systemSmall {
                    Text("\(widgetItems.count) on your widget")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Circle()
                .fill(entry.snapshot.isOnline ? Color.green : Color.secondary)
                .frame(width: 6, height: 6)
            Link(destination: URL(string: "chikota://add")!) {
                Image(systemName: "plus")
                    .font(.caption.weight(.bold))
                    .frame(width: 23, height: 23)
                    .background(.orange.opacity(0.15), in: Circle())
                    .foregroundStyle(.orange)
            }
        }
    }

    private var collectionStrip: some View {
        HStack(spacing: 6) {
            Label("\(entry.snapshot.items.filter(\.isPinned).count)", systemImage: "pin.fill")
            if family == .systemMedium {
                Label("\(entry.snapshot.categories.count)", systemImage: "folder.fill")
            } else {
                ForEach(entry.snapshot.categories.prefix(2)) { category in
                    Label(category.name, systemImage: "folder.fill").lineLimit(1)
                }
            }
            Spacer()
            Link("manage collections", destination: URL(string: "chikota://collections")!)
                .foregroundStyle(.orange)
        }
        .font(.caption2.weight(.medium))
        .foregroundStyle(.secondary)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(.primary.opacity(0.045), in: Capsule())
    }

    private func bookmarkRow(_ bookmark: WidgetBookmark) -> some View {
        HStack(spacing: 8) {
            Link(destination: openLink(bookmark)) {
                HStack(spacing: 8) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(bookmark.isPinned ? Color.orange.opacity(0.16) : Color.primary.opacity(0.055))
                        Image(systemName: bookmark.isPinned ? "pin.fill" : "bookmark")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(bookmark.isPinned ? .orange : .secondary)
                    }
                    .frame(width: 27, height: 27)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(bookmark.title)
                            .font(.caption.weight(.semibold))
                            .lineLimit(1)
                        HStack(spacing: 4) {
                            Text(bookmark.url.host() ?? bookmark.url.absoluteString)
                            if let category = categoryName(bookmark.categoryId) {
                                Text("· \(category)")
                            }
                        }
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    }
                }
            }
            Spacer(minLength: 2)
            if family != .systemSmall {
                Link(destination: manageLink(bookmark, action: "pin")) {
                    Image(systemName: bookmark.isPinned ? "pin.slash" : "pin")
                }
                Link(destination: manageLink(bookmark, action: "delete")) {
                    Image(systemName: "trash")
                }
            }
        }
        .foregroundStyle(.primary)
    }

    private var footer: some View {
        HStack {
            Text(entry.snapshot.isOnline ? "synced" : "saved offline")
            Spacer()
            if family != .systemSmall, let syncedAt = entry.snapshot.syncedAt {
                Text(syncedAt, style: .relative)
            }
        }
        .font(.system(size: 9, weight: .medium))
        .foregroundStyle(.tertiary)
    }

    private func categoryName(_ id: String?) -> String? {
        entry.snapshot.categories.first(where: { $0.id == id })?.name
    }

    private func openLink(_ bookmark: WidgetBookmark) -> URL {
        var components = URLComponents()
        components.scheme = "chikota"
        components.host = "open"
        components.queryItems = [
            URLQueryItem(name: "url", value: bookmark.url.absoluteString),
            URLQueryItem(name: "browser", value: entry.snapshot.browser.rawValue)
        ]
        return components.url!
    }

    private func manageLink(_ bookmark: WidgetBookmark, action: String) -> URL {
        var components = URLComponents()
        components.scheme = "chikota"
        components.host = "manage"
        components.queryItems = [
            URLQueryItem(name: "id", value: bookmark.id),
            URLQueryItem(name: "action", value: action)
        ]
        return components.url!
    }
}

struct ChikotaWidget: Widget {
    let kind = "ChikotaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ChikotaProvider()) { entry in
            ChikotaWidgetView(entry: entry)
        }
        .configurationDisplayName("chikota library")
        .description("browse and manage bookmarks, pinned links, and collections.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
    }
}

@main
struct ChikotaWidgetBundle: WidgetBundle {
    var body: some Widget {
        ChikotaWidget()
    }
}
