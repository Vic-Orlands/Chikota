import Foundation

enum BrowserChoice: String, Codable, CaseIterable, Identifiable {
    case system
    case safari
    case chrome
    case firefox
    case arc

    var id: String { rawValue }
    var label: String {
        switch self {
        case .system: "default browser"
        case .safari: "safari"
        case .chrome: "chrome"
        case .firefox: "firefox"
        case .arc: "arc"
        }
    }
}

struct WidgetBookmark: Codable, Identifiable, Hashable {
    let id: String
    let url: URL
    var title: String
    var reminderAt: Date?
    var isPinned: Bool
    var isRead: Bool
    var widgetEnabled: Bool
    var openedAt: Date?
    var updatedAt: Date

    var isRecent: Bool {
        guard let openedAt else { return false }
        return openedAt > Date().addingTimeInterval(-604_800)
    }

    var hasActiveReminder: Bool {
        guard let reminderAt else { return false }
        return reminderAt > Date()
    }

    var hasCompletedReminder: Bool {
        guard let reminderAt else { return false }
        return reminderAt <= Date()
    }

    var belongsOnWidget: Bool {
        widgetEnabled || isPinned || isRecent || hasActiveReminder
    }
}

struct WidgetSnapshot: Codable {
    var items: [WidgetBookmark]
    var syncedAt: Date?
    var isOnline: Bool
    var browser: BrowserChoice

    static let empty = WidgetSnapshot(
        items: [],
        syncedAt: nil,
        isOnline: false,
        browser: .system
    )
}

struct WidgetFeed: Codable {
    let items: [WidgetBookmark]
    let syncedAt: Date
}

struct PendingWidgetChange: Codable, Identifiable {
    let id: String
    let widgetEnabled: Bool
    let updatedAt: Date
}
