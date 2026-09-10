# chikota for mac

The macOS app keeps an atomic bookmark cache in the `group.com.chikota.shared` App Group. The widget reads only that cache, so rendering and link access remain available offline. The app flushes queued widget changes before downloading the newest cloud snapshot whenever connectivity returns.

Generate the Xcode project with `xcodegen generate --spec macos/project.yml`. Set the development team and replace the bundle and App Group identifiers if `com.chikota` is unavailable, then run the `Chikota` scheme. Create a connection code from the browser-extension sheet in the web app and paste it into the Mac app with the deployed chikota URL. Control-click the macOS desktop, choose **Edit Widgets**, search for **chikota**, and add the widget.
