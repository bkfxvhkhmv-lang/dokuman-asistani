import ExpoModulesCore
import Foundation

public final class BriefPilotLiveScannerModule: Module {
  static weak var shared: BriefPilotLiveScannerModule?

  public func definition() -> ModuleDefinition {
    Name("BriefPilotLiveScanner")

    Events("onLiveScanResult")

    OnCreate {
      BriefPilotLiveScannerModule.shared = self
    }

    OnDestroy {
      if BriefPilotLiveScannerModule.shared === self {
        BriefPilotLiveScannerModule.shared = nil
      }
    }

    AsyncFunction("takePhoto") { (promise: Promise) in
      guard let view = BriefPilotLiveScannerView.current else {
        promise.reject("NO_VIEW", "Camera view is not mounted")
        return
      }

      view.capturePhoto { result in
        switch result {
        case .success(let photo):
          promise.resolve([
            "uri": photo.uri,
            "width": photo.width,
            "height": photo.height,
          ])
        case .failure(let error):
          promise.reject("CAPTURE_FAILED", error.localizedDescription)
        }
      }
    }

    View(BriefPilotLiveScannerView.self) {
      Prop("active") { (view, active: Bool?) in
        view.active = active ?? false
      }

      Prop("flash") { (view, flash: String?) in
        view.flash = flash ?? "off"
      }

      Prop("zoom") { (view, zoom: Double?) in
        view.zoom = CGFloat(zoom ?? 0)
      }
    }
  }

  func sendScanResult(body: [String: Any]) {
    sendEvent("onLiveScanResult", body)
  }
}
