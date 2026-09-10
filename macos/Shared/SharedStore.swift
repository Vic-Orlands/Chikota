import Foundation

enum SharedStore {
    static let appGroup = "group.com.chikota.shared"
    private static let snapshotName = "widget-snapshot.json"
    private static let pendingName = "widget-pending.json"

    static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    private static var directory: URL {
        if let group = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroup
        ) {
            return group
        }
        return FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        )[0].appendingPathComponent("Chikota", isDirectory: true)
    }

    private static var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    static func loadSnapshot() -> WidgetSnapshot {
        read(WidgetSnapshot.self, from: snapshotName) ?? .empty
    }

    static func saveSnapshot(_ snapshot: WidgetSnapshot) throws {
        try write(snapshot, to: snapshotName)
    }

    static func loadPendingChanges() -> [PendingWidgetChange] {
        read([PendingWidgetChange].self, from: pendingName) ?? []
    }

    static func savePendingChanges(_ changes: [PendingWidgetChange]) throws {
        try write(changes, to: pendingName)
    }

    private static func read<T: Decodable>(_ type: T.Type, from name: String) -> T? {
        try? decoder.decode(type, from: Data(contentsOf: directory.appendingPathComponent(name)))
    }

    private static func write<T: Encodable>(_ value: T, to name: String) throws {
        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
        try encoder.encode(value).write(
            to: directory.appendingPathComponent(name),
            options: .atomic
        )
    }
}
