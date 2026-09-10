import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var sync: SyncManager
    @State private var server = ""
    @State private var token = ""

    var body: some View {
        NavigationSplitView {
            List {
                Section("connection") {
                    TextField("chikota address", text: $server)
                    SecureField("connection code", text: $token)
                    Button("connect") {
                        Task { await sync.connect(server: server, token: token) }
                    }
                }
                Section("open links in") {
                    Picker("browser", selection: browserBinding) {
                        ForEach(BrowserChoice.allCases) { browser in
                            Text(browser.label).tag(browser)
                        }
                    }
                    .labelsHidden()
                }
            }
            .navigationTitle("chikota")
        } detail: {
            VStack(spacing: 0) {
                HStack {
                    statusView
                    Spacer()
                    if let syncedAt = sync.snapshot.syncedAt {
                        Text(syncedAt, style: .relative)
                            .foregroundStyle(.secondary)
                    }
                    Button {
                        Task { await sync.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .buttonStyle(.plain)
                }
                .font(.caption)
                .padding()

                if sync.snapshot.items.isEmpty {
                    ContentUnavailableView(
                        "no saved bookmarks",
                        systemImage: "bookmark",
                        description: Text(sync.message.isEmpty ? "connect to sync your library." : sync.message)
                    )
                } else {
                    List(sync.snapshot.items) { bookmark in
                        HStack(spacing: 10) {
                            Image(systemName: symbol(for: bookmark))
                                .frame(width: 18)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(bookmark.title).lineLimit(1)
                                Text(bookmark.url.host() ?? bookmark.url.absoluteString)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Toggle(
                                "widget",
                                isOn: Binding(
                                    get: { bookmark.widgetEnabled },
                                    set: { enabled in
                                        Task {
                                            await sync.setWidgetEnabled(bookmark, enabled: enabled)
                                        }
                                    }
                                )
                            )
                            .toggleStyle(.switch)
                            .labelsHidden()
                        }
                        .padding(.vertical, 3)
                    }
                }
            }
            .navigationTitle("desktop widget")
        }
        .frame(minWidth: 760, minHeight: 480)
        .onAppear {
            server = sync.serverAddress
            Task { await sync.refresh() }
        }
    }

    private var statusView: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(sync.status == .online ? Color.green : sync.status == .syncing ? Color.orange : Color.secondary)
                .frame(width: 7, height: 7)
            Text(sync.status.label)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("sync status \(sync.status.label)")
    }

    private var browserBinding: Binding<BrowserChoice> {
        Binding(get: { sync.browser }, set: { sync.browser = $0 })
    }

    private func symbol(for bookmark: WidgetBookmark) -> String {
        if bookmark.hasActiveReminder { return "bell.fill" }
        if bookmark.hasCompletedReminder { return "calendar.badge.checkmark" }
        if bookmark.isPinned { return "pin.fill" }
        if bookmark.isRecent { return "clock.fill" }
        return "bookmark.fill"
    }
}
