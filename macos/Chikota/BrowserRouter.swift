import AppKit
import Foundation

enum BrowserRouter {
    static func open(_ deepLink: URL) {
        guard let components = URLComponents(url: deepLink, resolvingAgainstBaseURL: false),
              let value = components.queryItems?.first(where: { $0.name == "url" })?.value,
              let url = URL(string: value)
        else { return }
        let browserValue = components.queryItems?.first(where: { $0.name == "browser" })?.value
        open(url, in: BrowserChoice(rawValue: browserValue ?? "") ?? .system)
    }

    static func open(_ url: URL, in browser: BrowserChoice) {
        guard let bundleIdentifier = bundleIdentifier(for: browser),
              let application = NSWorkspace.shared.urlForApplication(
                withBundleIdentifier: bundleIdentifier
              )
        else {
            NSWorkspace.shared.open(url)
            return
        }
        let configuration = NSWorkspace.OpenConfiguration()
        NSWorkspace.shared.open(
            [url],
            withApplicationAt: application,
            configuration: configuration
        )
    }

    private static func bundleIdentifier(for browser: BrowserChoice) -> String? {
        switch browser {
        case .system: nil
        case .safari: "com.apple.Safari"
        case .chrome: "com.google.Chrome"
        case .firefox: "org.mozilla.firefox"
        case .arc: "company.thebrowser.Browser"
        }
    }
}
