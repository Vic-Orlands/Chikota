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
    var description: String?
    var categoryId: String?
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

    /// Shared with web (`belongsOnWidget`) and Linux (`belongs_on_widget`).
    /// See docs/widget-membership.md.
    var belongsOnWidget: Bool {
        widgetEnabled || isPinned || isRecent || hasActiveReminder
    }
}

struct WidgetCategory: Codable, Identifiable, Hashable {
    let id: String
    var name: String
    var color: String
}

struct WidgetSnapshot: Codable {
    var items: [WidgetBookmark]
    var categories: [WidgetCategory]
    var syncedAt: Date?
    var isOnline: Bool
    var browser: BrowserChoice

    init(
        items: [WidgetBookmark],
        categories: [WidgetCategory],
        syncedAt: Date?,
        isOnline: Bool,
        browser: BrowserChoice
    ) {
        self.items = items
        self.categories = categories
        self.syncedAt = syncedAt
        self.isOnline = isOnline
        self.browser = browser
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        items = try values.decodeIfPresent([WidgetBookmark].self, forKey: .items) ?? []
        categories = try values.decodeIfPresent([WidgetCategory].self, forKey: .categories) ?? []
        syncedAt = try values.decodeIfPresent(Date.self, forKey: .syncedAt)
        isOnline = try values.decodeIfPresent(Bool.self, forKey: .isOnline) ?? false
        browser = try values.decodeIfPresent(BrowserChoice.self, forKey: .browser) ?? .system
    }

    static let empty = WidgetSnapshot(
        items: [],
        categories: [],
        syncedAt: nil,
        isOnline: false,
        browser: .system
    )
}

struct WidgetFeed: Codable {
    let items: [WidgetBookmark]
    let categories: [WidgetCategory]
    let syncedAt: Date
}

struct PendingWidgetChange: Codable, Identifiable {
    let id: String
    let widgetEnabled: Bool
    let updatedAt: Date
}
