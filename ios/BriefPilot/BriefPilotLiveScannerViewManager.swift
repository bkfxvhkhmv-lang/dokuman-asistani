import Foundation
import React

@objc(BriefPilotLiveScannerViewManager)
class BriefPilotLiveScannerViewManager: RCTViewManager {
  override func view() -> UIView! {
    return BriefPilotLiveScannerView()
  }
  override static func requiresMainQueueSetup() -> Bool { return true }
}
