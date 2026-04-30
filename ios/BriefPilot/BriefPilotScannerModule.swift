import Foundation
import React
import UIKit

@objc(BriefPilotScanner)
class BriefPilotScanner: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { false }

  // MARK: - Capabilities

  @objc(getCapabilities:rejecter:)
  func getCapabilities(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve([
      "edgeDetection":         true,
      "perspectiveCorrection": true,
      "adaptiveThreshold":     true,
      "clahe":                 true,
      "shadowRemoval":         true,
      "frameProcessor":        false,
      "platform":              "ios",
      "version":               "ios-opencv-1.0",
    ])
  }

  // MARK: - Edge Detection

  @objc(detectDocumentEdges:resolver:rejecter:)
  func detectDocumentEdges(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let uriString = payload["uri"] as? String,
          let image = loadImage(from: uriString) else {
      reject("INVALID_INPUT", "detectDocumentEdges: geçerli bir uri gerekli.", nil)
      return
    }

    DispatchQueue.global(qos: .userInitiated).async {
      guard let result = BriefPilotOpenCVHelper.detectDocumentCorners(image) else {
        resolve(NSNull())
        return
      }
      resolve(Self.cornerDict(result))
    }
  }

  // MARK: - Perspective Warp

  @objc(warpPerspective:resolver:rejecter:)
  func warpPerspective(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let uriString = payload["imageUri"] as? String,
          let image = loadImage(from: uriString) else {
      reject("INVALID_INPUT", "warpPerspective: geçerli bir imageUri gerekli.", nil)
      return
    }

    let corners = DocumentCornerResult()
    corners.topLeft     = parsePoint(payload["topLeft"])
    corners.topRight    = parsePoint(payload["topRight"])
    corners.bottomRight = parsePoint(payload["bottomRight"])
    corners.bottomLeft  = parsePoint(payload["bottomLeft"])
    corners.confidence  = 1.0

    let outW = payload["outWidth"]  as? CGFloat ?? 2480
    let outH = payload["outHeight"] as? CGFloat ?? 3508

    DispatchQueue.global(qos: .userInitiated).async {
      guard let warped = BriefPilotOpenCVHelper.warpPerspective(
        image, corners: corners,
        outputSize: CGSize(width: outW, height: outH)
      ) else {
        reject("WARP_FAILED", "Perspektif düzeltme başarısız.", nil)
        return
      }
      if let outUri = self.saveImage(warped) {
        resolve(["uri": outUri])
      } else {
        reject("SAVE_FAILED", "Görüntü kaydedilemedi.", nil)
      }
    }
  }

  // MARK: - Filter / Enhancement

  @objc(applyFilter:resolver:rejecter:)
  func applyFilter(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let uriString = payload["imageUri"] as? String,
          let image = loadImage(from: uriString) else {
      reject("INVALID_INPUT", "applyFilter: geçerli bir imageUri gerekli.", nil)
      return
    }

    let filter = payload["filter"] as? String ?? "original"

    DispatchQueue.global(qos: .userInitiated).async {
      let processed: UIImage?
      switch filter {
      case "bw", "document", "thresh":
        processed = BriefPilotOpenCVHelper.applyAdaptiveThreshold(image)
      case "enhance", "clahe":
        let clip = payload["clipLimit"] as? Double ?? 2.0
        processed = BriefPilotOpenCVHelper.applyCLAHE(image, clipLimit: clip)
      case "shadow":
        processed = BriefPilotOpenCVHelper.removeShadow(image)
      default:
        processed = image
      }

      guard let result = processed, let outUri = self.saveImage(result) else {
        resolve(["uri": uriString])
        return
      }
      resolve(["uri": outUri])
    }
  }

  // MARK: - Frame-level Detection
  @objc(detectEdgesInFrame:resolver:rejecter:)
  func detectEdgesInFrame(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let uriString = payload["uri"] as? String,
          let image = loadImage(from: uriString) else {
      resolve(NSNull())
      return
    }
    DispatchQueue.global(qos: .userInteractive).async {
      guard let result = BriefPilotOpenCVHelper.detectDocumentCorners(image) else {
        resolve(NSNull())
        return
      }
      resolve(Self.cornerDict(result))
    }
  }

  // MARK: - Document Magic Filter (FAZ 3.3)
  @objc(applyMagicFilter:resolver:rejecter:)
  func applyMagicFilter(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let uriString = payload["imageUri"] as? String,
          let image = loadImage(from: uriString) else {
      reject("INVALID_INPUT", "applyMagicFilter: geçerli imageUri gerekli.", nil)
      return
    }
    DispatchQueue.global(qos: .userInitiated).async {
      guard let result = BriefPilotOpenCVHelper.applyDocumentMagicFilter(image),
            let outUri = self.saveImage(result) else {
        resolve(["uri": uriString])
        return
      }
      resolve(["uri": outUri])
    }
  }

  // MARK: - Helpers

  // DocumentCornerResult → JS dict (tüm FAZ 3 alanları dahil)
  private static func cornerDict(_ r: DocumentCornerResult) -> [String: Any] {
    var dict: [String: Any] = [
      "confidence":    r.confidence,
      "isBlurry":      r.isBlurry,
      "needsFlash":    r.needsFlash,
      "blurVariance":  r.blurVariance,
      "avgBrightness": r.avgBrightness,
    ]
    if r.confidence > 0 {
      dict["topLeft"]     = ["x": r.topLeft.x,     "y": r.topLeft.y]
      dict["topRight"]    = ["x": r.topRight.x,    "y": r.topRight.y]
      dict["bottomRight"] = ["x": r.bottomRight.x, "y": r.bottomRight.y]
      dict["bottomLeft"]  = ["x": r.bottomLeft.x,  "y": r.bottomLeft.y]
    }
    return dict
  }

  private func loadImage(from uriString: String) -> UIImage? {
    let path = uriString.hasPrefix("file://")
      ? String(uriString.dropFirst(7))
      : uriString
    return UIImage(contentsOfFile: path)
  }

  private func saveImage(_ image: UIImage) -> String? {
    let path = NSTemporaryDirectory() + UUID().uuidString + ".jpg"
    guard let data = image.jpegData(compressionQuality: 0.95) else { return nil }
    do {
      try data.write(to: URL(fileURLWithPath: path))
      return "file://" + path
    } catch {
      return nil
    }
  }

  private func parsePoint(_ value: Any?) -> CGPoint {
    guard let dict = value as? NSDictionary,
          let x = dict["x"] as? CGFloat,
          let y = dict["y"] as? CGFloat else { return .zero }
    return CGPoint(x: x, y: y)
  }
}
