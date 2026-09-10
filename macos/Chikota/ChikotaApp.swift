import SwiftUI

@main
struct ChikotaApp: App {
    @StateObject private var sync = SyncManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(sync)
                .onOpenURL(perform: BrowserRouter.open)
        }
    }
}
