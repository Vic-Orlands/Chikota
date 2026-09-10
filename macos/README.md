# chikota for mac

The macOS app keeps an atomic bookmark and collection cache in the `group.com.chikota.shared` App Group. The widget reads only that cache, so browsing and link access remain available offline. The companion app manages the full library: add or delete bookmarks, pin and unpin links, and create or remove collections.

Generate the Xcode project with `xcodegen generate --spec macos/project.yml`, select the `Chikota` scheme, and run it on **My Mac**. The development build uses ad-hoc “Sign to Run Locally” signing and does not require an Apple Developer account. Create a connection code from the Mac widget setup panel in the web app and paste it into the Mac app with the deployed chikota URL. Control-click the macOS desktop, choose **Edit Widgets**, search for **chikota**, and add the widget.

The widget supports Apple's small, medium, large, and extra-large desktop sizes. Larger layouts include quick pin and delete actions; add and collection actions open the focused form in the companion app, as WidgetKit does not support text-entry forms inside a widget.

The local build shares its offline cache through `~/Library/Application Support/Chikota`. Before distribution, switch to Developer ID signing and a registered App Group container.
