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
        guard status != .offline else { return }
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
