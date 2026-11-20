import AppKit
import Foundation

@main
struct SyntheticGeneratorLauncher {
    static func main() {
        guard let page = Bundle.main.url(forResource: "subscription_data_studio", withExtension: "html") else {
            let alert = NSAlert()
            alert.messageText = "Generator page not found"
            alert.informativeText = "The app bundle is missing subscription_data_studio.html. Rebuild the app bundle and try again."
            alert.alertStyle = .critical
            alert.runModal()
            return
        }
        NSWorkspace.shared.open(page)
    }
}
