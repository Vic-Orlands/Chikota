import Combine
import Foundation
@preconcurrency import Network
import WidgetKit

@MainActor
final class SyncManager: ObservableObject {
    enum Status {
        case online
        case offline
        case syncing

        var label: String {
            switch self {
            case .online: "online"
            case .offline: "offline"
            case .syncing: "syncing"
            }
        }
    }

    @Published private(set) var snapshot = SharedStore.loadSnapshot()
    @Published private(set) var status: Status = .offline
    @Published var message = ""

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.chikota.network")
    private var refreshTask: Task<Void, Never>?

    var serverAddress: String {
        get { SharedStore.defaults.string(forKey: "serverAddress") ?? "" }
        set { SharedStore.defaults.set(newValue, forKey: "serverAddress") }
    }

    var browser: BrowserChoice {
        get {
            BrowserChoice(
                rawValue: SharedStore.defaults.string(forKey: "browser") ?? "system"
            ) ?? .system
        }
        set {
            SharedStore.defaults.set(newValue.rawValue, forKey: "browser")
            snapshot.browser = newValue
            persist()
        }
    }

    init() {
        status = snapshot.isOnline ? .online : .offline
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.networkChanged(path.status == .satisfied)
            }
        }
        monitor.start(queue: monitorQueue)
        refreshTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(300))
                await self?.refresh()
            }
        }
    }

    deinit {
        monitor.cancel()
        refreshTask?.cancel()
    }

    func connect(server: String, token: String) async {
        serverAddress = server.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            try KeychainToken.save(token.trimmingCharacters(in: .whitespacesAndNewlines))
            await refresh()
        } catch {
            message = "the connection code could not be saved."
        }
    }

    func refresh() async {
        guard let endpoint = endpoint(), !KeychainToken.load().isEmpty else {
            message = "add your chikota address and connection code."
            return
        }
        status = .syncing
        do {
            try await flushPending(endpoint: endpoint)
            var request = URLRequest(url: endpoint)
            request.setValue("Bearer \(KeychainToken.load())", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                throw URLError(.userAuthenticationRequired)
            }
            let feed = try decoder.decode(WidgetFeed.self, from: data)
            snapshot = WidgetSnapshot(
                items: feed.items,
                categories: feed.categories,
                syncedAt: feed.syncedAt,
                isOnline: true,
                browser: browser
            )
            status = .online
            message = ""
            persist()
        } catch {
            status = .offline
            snapshot.isOnline = false
            message = "showing the latest saved bookmarks."
            persist()
        }
    }

    func setWidgetEnabled(_ bookmark: WidgetBookmark, enabled: Bool) async {
        if let index = snapshot.items.firstIndex(where: { $0.id == bookmark.id }) {
            snapshot.items[index].widgetEnabled = enabled
            snapshot.items[index].updatedAt = Date()
        }
        var pending = SharedStore.loadPendingChanges().filter { $0.id != bookmark.id }
        pending.append(PendingWidgetChange(id: bookmark.id, widgetEnabled: enabled, updatedAt: Date()))
        try? SharedStore.savePendingChanges(pending)
        persist()
        if status != .offline { await refresh() }
    }

    func setPinned(_ bookmark: WidgetBookmark, pinned: Bool) async {
        guard let index = snapshot.items.firstIndex(where: { $0.id == bookmark.id }) else { return }
        snapshot.items[index].isPinned = pinned
        persist()
        do {
            try await mutate(method: "PATCH", body: ["id": bookmark.id, "isPinned": pinned])
            await refresh()
        } catch {
            if let currentIndex = snapshot.items.firstIndex(where: { $0.id == bookmark.id }) {
                snapshot.items[currentIndex].isPinned = bookmark.isPinned
            }
            message = "the bookmark could not be updated."
            persist()
        }
    }

    @discardableResult
    func addBookmark(url: String, title: String, categoryId: String?) async -> Bool {
        var body: [String: Any] = ["url": url, "title": title]
        if let categoryId { body["categoryId"] = categoryId }
        return await saveChange(method: "POST", body: body, failure: "the bookmark could not be added.")
    }

    @discardableResult
    func createCategory(name: String) async -> Bool {
        await saveChange(
            method: "POST",
            body: ["type": "category", "name": name],
            failure: "the collection could not be created."
        )
    }

    @discardableResult
    func deleteBookmark(_ bookmark: WidgetBookmark) async -> Bool {
        await saveChange(
            method: "DELETE",
            body: ["type": "bookmark", "id": bookmark.id],
            failure: "the bookmark could not be deleted."
        )
    }

    @discardableResult
    func deleteCategory(_ category: WidgetCategory) async -> Bool {
        await saveChange(
            method: "DELETE",
            body: ["type": "category", "id": category.id],
            failure: "the collection could not be deleted."
        )
    }

    private func networkChanged(_ online: Bool) {
        status = online ? .online : .offline
        snapshot.isOnline = online
        persist()
        if online { Task { await refresh() } }
    }

    private func endpoint() -> URL? {
        guard let base = URL(string: serverAddress),
              var components = URLComponents(url: base, resolvingAgainstBaseURL: false)
        else { return nil }
        components.path = "/api/widget"
        components.query = nil
        components.fragment = nil
        return components.url
    }

    private func flushPending(endpoint: URL) async throws {
        let pending = SharedStore.loadPendingChanges()
        for change in pending {
            var request = URLRequest(url: endpoint)
            request.httpMethod = "PATCH"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(KeychainToken.load())", forHTTPHeaderField: "Authorization")
            request.httpBody = try JSONEncoder().encode(change)
            let (_, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                throw URLError(.cannotWriteToFile)
            }
        }
        try SharedStore.savePendingChanges([])
    }

    private func saveChange(method: String, body: [String: Any], failure: String) async -> Bool {
        do {
            try await mutate(method: method, body: body)
            await refresh()
            return true
        } catch {
            message = failure
            return false
        }
    }

    private func mutate(method: String, body: [String: Any]) async throws {
        guard let endpoint = endpoint(), !KeychainToken.load().isEmpty else {
            throw URLError(.userAuthenticationRequired)
        }
        var request = URLRequest(url: endpoint)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(KeychainToken.load())", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let statusCode = (response as? HTTPURLResponse)?.statusCode,
              200..<300 ~= statusCode
        else { throw URLError(.cannotWriteToFile) }
    }

    private func persist() {
        try? SharedStore.saveSnapshot(snapshot)
        WidgetCenter.shared.reloadAllTimelines()
    }

    private var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
