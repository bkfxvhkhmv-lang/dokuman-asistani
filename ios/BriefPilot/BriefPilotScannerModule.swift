import Foundation
import React

@objc(BriefPilotScanner)
class BriefPilotScanner: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(getCapabilities:rejecter:)
  func getCapabilities(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve([
      "edgeDetection": false,
      "perspectiveCorrection": false,
      "filters": false,
      "frameProcessor": false,
      "platform": "ios",
      "version": "ios-bridge-stub",
    ])
  }

  @objc(detectDocumentEdges:resolver:rejecter:)
  func detectDocumentEdges(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(NSNull())
  }

  @objc(warpPerspective:resolver:rejecter:)
  func warpPerspective(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let imageUri = payload["imageUri"] as? String else {
      reject("scanner_invalid_input", "warpPerspective requires imageUri.", nil)
      return
    }

    resolve(["uri": imageUri])
  }

  @objc(applyFilter:resolver:rejecter:)
  func applyFilter(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let imageUri = payload["imageUri"] as? String else {
      reject("scanner_invalid_input", "applyFilter requires imageUri.", nil)
      return
    }

    resolve(["uri": imageUri])
  }
}
