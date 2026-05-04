import Foundation
import React
import VisionKit
import UIKit

@objc(BriefPilotVisionScanner)
class BriefPilotVisionScanner: NSObject, VNDocumentCameraViewControllerDelegate {

  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc func methodsToExport() -> [AnyObject] { [] }

  // Must run on main thread — UI presentation
  @objc(scanDocuments:rejecter:)
  func scanDocuments(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    self.resolve = resolve
    self.reject  = reject

    DispatchQueue.main.async {
      guard VNDocumentCameraViewController.isSupported else {
        reject("UNSUPPORTED", "VisionKit document scanner not available on this device", nil)
        return
      }
      let scanner = VNDocumentCameraViewController()
      scanner.delegate = self

      guard let windowScene = UIApplication.shared.connectedScenes
              .compactMap({ $0 as? UIWindowScene })
              .first(where: { $0.activationState == .foregroundActive }),
            let root = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController
              ?? windowScene.windows.first?.rootViewController else {
        reject("NO_ROOT_VC", "Cannot find root view controller", nil)
        return
      }
      // Present over any modal if needed
      var presenter = root
      while let presented = presenter.presentedViewController {
        presenter = presented
      }
      presenter.present(scanner, animated: true)
    }
  }

  // MARK: - VNDocumentCameraViewControllerDelegate

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFinishWith scan: VNDocumentCameraScan
  ) {
    controller.dismiss(animated: true)

    var uris: [String] = []
    for i in 0..<scan.pageCount {
      let image = scan.imageOfPage(at: i)
      if let uri = saveImage(image, index: i) {
        uris.append(uri)
      }
    }
    resolve?(["imageUris": uris, "pageCount": scan.pageCount, "corrected": true, "source": "visionkit"])
    cleanup()
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    controller.dismiss(animated: true)
    resolve?(["imageUris": [], "pageCount": 0, "corrected": false, "cancelled": true, "source": "visionkit"])
    cleanup()
  }

  func documentCameraViewController(
    _ controller: VNDocumentCameraViewController,
    didFailWithError error: Error
  ) {
    controller.dismiss(animated: true)
    reject?("SCAN_ERROR", error.localizedDescription, error)
    cleanup()
  }

  // MARK: - Helpers

  private func saveImage(_ image: UIImage, index: Int) -> String? {
    guard let data = image.jpegData(compressionQuality: 0.92) else { return nil }
    let name = "bp_vision_scan_\(Int(Date().timeIntervalSince1970 * 1000))_\(index).jpg"
    let url  = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(name)
    do {
      try data.write(to: url)
      return url.absoluteString
    } catch {
      return nil
    }
  }

  private func cleanup() {
    resolve = nil
    reject  = nil
  }
}
