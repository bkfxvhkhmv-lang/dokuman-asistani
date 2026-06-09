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
    rejecter _: RCTPromiseRejectBlock
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

  // MARK: - Edge detection (photo)

  @objc(detectDocumentEdges:resolver:rejecter:)
  func detectDocumentEdges(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter _: RCTPromiseRejectBlock
  ) {
    guard let uri = payload["uri"] as? String,
          let image = loadImage(from: uri) else {
      resolve(NSNull()); return
    }
    guard let result = BriefPilotOpenCVHelper.detectDocumentCorners(image) else {
      resolve(NSNull()); return
    }
    resolve(cornerToMap(result))
  }

  // MARK: - Edge detection (live frame)

  @objc(detectEdgesInFrame:resolver:rejecter:)
  func detectEdgesInFrame(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter _: RCTPromiseRejectBlock
  ) {
    guard let uri = payload["uri"] as? String,
          let image = loadImage(from: uri) else {
      resolve(NSNull()); return
    }
    let result = BriefPilotOpenCVHelper.detectDocumentCorners(image)
    resolve(result.map { cornerToMap($0) } ?? NSNull())
  }

  // MARK: - Perspective warp

  @objc(warpPerspective:resolver:rejecter:)
  func warpPerspective(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let imageUri = payload["imageUri"] as? String,
          let image = loadImage(from: imageUri) else {
      reject("INVALID_INPUT", "imageUri gerekli veya yüklenemedi", nil); return
    }

    let corners = DocumentCornerResult()
    corners.topLeft     = readPoint(payload["topLeft"])
    corners.topRight    = readPoint(payload["topRight"])
    corners.bottomRight = readPoint(payload["bottomRight"])
    corners.bottomLeft  = readPoint(payload["bottomLeft"])
    corners.confidence  = 1.0

    let outW = (payload["outWidth"]  as? Double) ?? 2480.0
    let outH = (payload["outHeight"] as? Double) ?? 3508.0

    guard let warped = BriefPilotOpenCVHelper.warpPerspective(
      image, corners: corners, outputSize: CGSize(width: outW, height: outH)
    ), let outUri = saveImage(warped) else {
      reject("WARP_FAILED", "Perspektif düzeltme başarısız", nil); return
    }
    resolve(["uri": outUri])
  }

  // MARK: - Filter

  @objc(applyFilter:resolver:rejecter:)
  func applyFilter(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let imageUri = payload["imageUri"] as? String else {
      reject("INVALID_INPUT", "imageUri gerekli", nil); return
    }
    guard let image = loadImage(from: imageUri) else {
      resolve(["uri": imageUri]); return
    }
    let filter = (payload["filter"] as? String) ?? "original"

    let processed: UIImage?
    switch filter {
    case "bw", "document", "thresh":
      processed = BriefPilotOpenCVHelper.applyAdaptiveThreshold(image)
    case "enhance", "clahe":
      let clip = (payload["clipLimit"] as? Double) ?? 2.5
      processed = BriefPilotOpenCVHelper.applyCLAHE(image, clipLimit: clip)
    case "shadow":
      processed = BriefPilotOpenCVHelper.removeShadow(image)
    case "color", "colorEnhance":
      processed = BriefPilotOpenCVHelper.applyColorEnhancement(image)
    default:
      processed = image
    }

    let outUri = processed.flatMap { saveImage($0) } ?? imageUri
    resolve(["uri": outUri])
  }

  // MARK: - Magic filter

  @objc(applyMagicFilter:resolver:rejecter:)
  func applyMagicFilter(
    _ payload: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let imageUri = payload["imageUri"] as? String else {
      reject("INVALID_INPUT", "imageUri gerekli", nil); return
    }
    guard let image = loadImage(from: imageUri) else {
      resolve(["uri": imageUri]); return
    }
    let result = BriefPilotOpenCVHelper.applyDocumentMagicFilter(image)
    let outUri = result.flatMap { saveImage($0) } ?? imageUri
    resolve(["uri": outUri])
  }

  // MARK: - Helpers

  private func cornerToMap(_ r: DocumentCornerResult) -> NSDictionary {
    [
      "topLeft":        ["x": r.topLeft.x,     "y": r.topLeft.y],
      "topRight":       ["x": r.topRight.x,    "y": r.topRight.y],
      "bottomRight":    ["x": r.bottomRight.x, "y": r.bottomRight.y],
      "bottomLeft":     ["x": r.bottomLeft.x,  "y": r.bottomLeft.y],
      "confidence":     r.confidence,
      "isBlurry":       r.isBlurry,
      "needsFlash":     r.needsFlash,
      "blurVariance":   r.blurVariance,
      "avgBrightness":  r.avgBrightness,
      "areaScore":      r.areaScore,
      "angleScore":     r.angleScore,
      "aspectScore":    r.aspectScore,
      "centerScore":    r.centerScore,
    ]
  }

  private func readPoint(_ val: Any?) -> CGPoint {
    guard let d = val as? NSDictionary,
          let x = d["x"] as? Double,
          let y = d["y"] as? Double else { return .zero }
    return CGPoint(x: x, y: y)
  }

  private func loadImage(from uri: String) -> UIImage? {
    let path = uri.hasPrefix("file://") ? String(uri.dropFirst(7)) : uri
    return UIImage(contentsOfFile: path)
  }

  private func saveImage(_ image: UIImage) -> String? {
    guard let data = image.jpegData(compressionQuality: 0.92) else { return nil }
    let name = "bp_scan_\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
    let url  = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(name)
    do {
      try data.write(to: url)
      return url.absoluteString
    } catch { return nil }
  }
}
