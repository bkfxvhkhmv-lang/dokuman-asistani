import Foundation
import React

@objc(BriefPilotLiveScanModule)
class BriefPilotLiveScanModule: RCTEventEmitter {

  static weak var shared: BriefPilotLiveScanModule?

  override init() {
    super.init()
    BriefPilotLiveScanModule.shared = self
  }

  override func supportedEvents() -> [String]! {
    return ["onLiveScanResult"]
  }

  override static func requiresMainQueueSetup() -> Bool { return false }

  // Called by BriefPilotLiveScannerView on every processed frame
  func sendScanResult(_ body: [String: Any]) {
    sendEvent(withName: "onLiveScanResult", body: body)
  }

  // MARK: - JS-callable methods

  @objc(startLiveDetection)
  func startLiveDetection() {
    DispatchQueue.main.async {
      BriefPilotLiveScannerView.activeScanner?.active = true
    }
  }

  @objc(stopLiveDetection)
  func stopLiveDetection() {
    DispatchQueue.main.async {
      BriefPilotLiveScannerView.activeScanner?.active = false
    }
  }

  @objc(takePhoto:rejecter:)
  func takePhoto(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard let scanner = BriefPilotLiveScannerView.activeScanner else {
        reject("NO_SCANNER", "No active scanner view", nil); return
      }
      scanner.takePhoto { uri, width, height, error in
        if let error = error {
          reject("PHOTO_FAILED", error.localizedDescription, nil)
        } else if let uri = uri {
          resolve(["uri": uri, "width": width, "height": height])
        }
      }
    }
  }
}
