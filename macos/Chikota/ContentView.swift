import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var sync: SyncManager
    @State private var server = ""
    @State private var token = ""
    @State private var selection = "all"
    @State private var showingAddBookmark = false
    @State private var showingAddCategory = false
    @State private var showingManageCategories = false
    @State private var bookmarkToDelete: WidgetBookmark?
    @State private var categoryToDelete: WidgetCategory?

    private var visibleBookmarks: [WidgetBookmark] {
        if selection == "pinned" { return sync.snapshot.items.filter(\.isPinned) }
        if selection.hasPrefix("category:") {
            let id = String(selection.dropFirst("category:".count))
            return sync.snapshot.items.filter { $0.categoryId == id }
        }
        return sync.snapshot.items
    }

    var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                Section("library") {
                    Label("all bookmarks", systemImage: "square.grid.2x2.fill").tag("all")
                    Label("pinned", systemImage: "pin.fill").tag("pinned")
                }
                Section("collections") {
                    ForEach(sync.snapshot.categories) { category in
                        Label(category.name, systemImage: "folder.fill")
                            .tag("category:\(category.id)")
                            .contextMenu {
                                Button("delete collection", role: .destructive) {
                                    categoryToDelete = category
                                }
                            }
                    }
                    Button("new collection", systemImage: "plus") {
                        showingAddCategory = true
                    }
                    .buttonStyle(.plain)
                }
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
            ZStack {
                LinearGradient(
                    colors: [Color(nsColor: .windowBackgroundColor), Color.orange.opacity(0.035)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                VStack(spacing: 0) {
                    header
                    if visibleBookmarks.isEmpty {
                        ContentUnavailableView(
                            selection == "pinned" ? "no pinned bookmarks" : "nothing here yet",
                            systemImage: selection == "pinned" ? "pin" : "bookmark",
                            description: Text(sync.message.isEmpty ? "add a bookmark to start this view." : sync.message)
                        )
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 9) {
                                ForEach(visibleBookmarks) { bookmark in
                                    bookmarkCard(bookmark)
                                }
                            }
                            .padding(18)
                        }
                    }
                }
            }
            .navigationTitle(pageTitle)
            .toolbar {
                ToolbarItemGroup {
                    Button("new collection", systemImage: "folder.badge.plus") {
                        showingAddCategory = true
                    }
                    Button("add bookmark", systemImage: "plus") {
                        showingAddBookmark = true
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
        .frame(minWidth: 720, minHeight: 460)
        .sheet(isPresented: $showingAddBookmark) {
            AddBookmarkView(categories: sync.snapshot.categories) { url, title, categoryId in
                await sync.addBookmark(url: url, title: title, categoryId: categoryId)
            }
        }
        .sheet(isPresented: $showingAddCategory) {
            AddCategoryView { name in await sync.createCategory(name: name) }
        }
        .sheet(isPresented: $showingManageCategories) {
            ManageCategoriesView(
                categories: sync.snapshot.categories,
                create: { name in await sync.createCategory(name: name) },
                delete: { category in await sync.deleteCategory(category) }
            )
        }
        .confirmationDialog(
            "Delete this bookmark?",
            isPresented: Binding(get: { bookmarkToDelete != nil }, set: { if !$0 { bookmarkToDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("delete bookmark", role: .destructive) {
                if let bookmarkToDelete { Task { await sync.deleteBookmark(bookmarkToDelete) } }
            }
        }
        .confirmationDialog(
            "Delete this collection? The bookmarks inside it will stay in your library.",
            isPresented: Binding(get: { categoryToDelete != nil }, set: { if !$0 { categoryToDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("delete collection", role: .destructive) {
                if let categoryToDelete {
                    selection = "all"
                    Task { await sync.deleteCategory(categoryToDelete) }
                }
            }
        }
        .onAppear {
            server = sync.serverAddress
            Task { await sync.refresh() }
        }
        .onOpenURL(perform: handleDeepLink)
    }

    private var header: some View {
        HStack(spacing: 9) {
            statusView
            Text("\(visibleBookmarks.count) bookmarks")
                .foregroundStyle(.secondary)
            Spacer()
            if let syncedAt = sync.snapshot.syncedAt {
                Text("updated \(syncedAt, style: .relative)")
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
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }

    private func bookmarkCard(_ bookmark: WidgetBookmark) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 9)
                    .fill(Color.orange.opacity(0.13))
                Image(systemName: bookmark.isPinned ? "pin.fill" : "bookmark.fill")
                    .foregroundStyle(bookmark.isPinned ? .orange : .secondary)
            }
            .frame(width: 38, height: 38)
            VStack(alignment: .leading, spacing: 3) {
                Text(bookmark.title).fontWeight(.semibold).lineLimit(1)
                HStack(spacing: 6) {
                    Text(bookmark.url.host() ?? bookmark.url.absoluteString).lineLimit(1)
                    if let category = categoryName(bookmark.categoryId) {
                        Text("·")
                        Text(category).lineLimit(1)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                Task { await sync.setPinned(bookmark, pinned: !bookmark.isPinned) }
            } label: {
                Image(systemName: bookmark.isPinned ? "pin.slash" : "pin")
            }
            .buttonStyle(.borderless)
            .help(bookmark.isPinned ? "unpin" : "pin")
            Button(role: .destructive) {
                bookmarkToDelete = bookmark
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.borderless)
            .help("delete")
        }
        .padding(12)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(.primary.opacity(0.07)))
        .contentShape(Rectangle())
        .onTapGesture { BrowserRouter.open(bookmark.url, in: sync.browser) }
    }

    private var pageTitle: String {
        if selection == "pinned" { return "pinned" }
        if selection.hasPrefix("category:"),
           let category = sync.snapshot.categories.first(where: { "category:\($0.id)" == selection }) {
            return category.name
        }
        return "library"
    }

    private func categoryName(_ id: String?) -> String? {
        sync.snapshot.categories.first(where: { $0.id == id })?.name
    }

    private func handleDeepLink(_ url: URL) {
        switch url.host {
        case "open": BrowserRouter.open(url)
        case "add": showingAddBookmark = true
        case "collections": showingManageCategories = true
        case "pinned": selection = "pinned"
        case "manage":
            let values = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
            let id = values?.first(where: { $0.name == "id" })?.value
            let action = values?.first(where: { $0.name == "action" })?.value
            guard let bookmark = sync.snapshot.items.first(where: { $0.id == id }) else { return }
            if action == "delete" { bookmarkToDelete = bookmark }
            if action == "pin" { Task { await sync.setPinned(bookmark, pinned: !bookmark.isPinned) } }
        default: break
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
}

private struct AddBookmarkView: View {
    @Environment(\.dismiss) private var dismiss
    let categories: [WidgetCategory]
    let save: (String, String, String?) async -> Bool
    @State private var url = ""
    @State private var title = ""
    @State private var categoryId = ""
    @State private var saving = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("add bookmark").font(.title2.bold())
            TextField("https://example.com", text: $url)
                .textFieldStyle(.roundedBorder)
            TextField("title", text: $title)
                .textFieldStyle(.roundedBorder)
            Picker("collection", selection: $categoryId) {
                Text("no collection").tag("")
                ForEach(categories) { Text($0.name).tag($0.id) }
            }
            HStack {
                Spacer()
                Button("cancel") { dismiss() }
                Button(saving ? "adding…" : "add") {
                    saving = true
                    Task {
                        let fallback = URL(string: url)?.host ?? url
                        if await save(url, title.trimmingCharacters(in: .whitespaces).isEmpty ? fallback : title, categoryId.isEmpty ? nil : categoryId) { dismiss() }
                        saving = false
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(saving || url.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 420)
    }
}

private struct AddCategoryView: View {
    @Environment(\.dismiss) private var dismiss
    let save: (String) async -> Bool
    @State private var name = ""
    @State private var saving = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("new collection").font(.title2.bold())
            TextField("collection name", text: $name).textFieldStyle(.roundedBorder)
            HStack {
                Spacer()
                Button("cancel") { dismiss() }
                Button(saving ? "creating…" : "create") {
                    saving = true
                    Task {
                        if await save(name.trimmingCharacters(in: .whitespacesAndNewlines)) { dismiss() }
                        saving = false
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(saving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 380)
    }
}

private struct ManageCategoriesView: View {
    @Environment(\.dismiss) private var dismiss
    let categories: [WidgetCategory]
    let create: (String) async -> Bool
    let delete: (WidgetCategory) async -> Bool
    @State private var name = ""
    @State private var categoryToDelete: WidgetCategory?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("collections").font(.title2.bold())
                Spacer()
                Button("done") { dismiss() }
            }
            HStack {
                TextField("new collection", text: $name).textFieldStyle(.roundedBorder)
                Button("create") {
                    let value = name.trimmingCharacters(in: .whitespacesAndNewlines)
                    Task { if await create(value) { name = "" } }
                }
                .buttonStyle(.borderedProminent)
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            if categories.isEmpty {
                ContentUnavailableView("no collections", systemImage: "folder", description: Text("create one above to organise your library."))
            } else {
                List(categories) { category in
                    HStack {
                        Label(category.name, systemImage: "folder.fill")
                        Spacer()
                        Button(role: .destructive) { categoryToDelete = category } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.borderless)
                    }
                }
                .listStyle(.inset)
            }
        }
        .padding(22)
        .frame(width: 440, height: 420)
        .confirmationDialog(
            "Delete this collection? Its bookmarks will stay in your library.",
            isPresented: Binding(get: { categoryToDelete != nil }, set: { if !$0 { categoryToDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("delete collection", role: .destructive) {
                if let categoryToDelete { Task { await delete(categoryToDelete) } }
            }
        }
    }
}
