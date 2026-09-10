# chikota for mac

The macOS app keeps an atomic bookmark cache in the `group.com.chikota.shared` App Group. The widget reads only that cache, so rendering and link access remain available offline. The app flushes queued widget changes before downloading the newest cloud snapshot whenever connectivity returns.

Generate the Xcode project with `xcodegen generate --spec macos/project.yml`, select the `Chikota` scheme, and run it on **My Mac**. The development build uses ad-hoc “Sign to Run Locally” signing and does not require an Apple Developer account. Create a connection code from the Mac widget setup panel in the web app and paste it into the Mac app with the deployed chikota URL. Control-click the macOS desktop, choose **Edit Widgets**, search for **chikota**, and add the widget.

The local build shares its offline cache through `~/Library/Application Support/Chikota`. Before distribution, switch to Developer ID signing and a registered App Group container.
