import Foundation
import AVFoundation
import UIKit
import React

// MARK: - BriefPilotLiveScannerView

@objc(BriefPilotLiveScannerView)
class BriefPilotLiveScannerView: UIView {

  // Singleton ref so BriefPilotLiveScanModule can call takePhoto
  static weak var activeScanner: BriefPilotLiveScannerView?

  // MARK: - RN Props
  @objc var flash: NSString = "off"
  @objc var zoom: Double = 0 {
    didSet { applyZoom() }
  }
  @objc var active: Bool = true {
    didSet { active ? startSession() : stopSession() }
  }

  // MARK: - AVCapture
  private var captureSession: AVCaptureSession?
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private var videoOutput: AVCaptureVideoDataOutput?
  private var photoOutput: AVCapturePhotoOutput?
  private var device: AVCaptureDevice?

  private let processingQueue = DispatchQueue(
    label: "com.briefpilot.scanner.live",
    qos: .userInteractive
  )

  // MARK: - Detection throttle
  private var frameCount = 0
  private var isProcessingFrame = false

  // MARK: - Photo capture
  typealias PhotoCallback = (_ uri: String?, _ width: Int, _ height: Int, _ error: Error?) -> Void
  private var photoCaptureCallback: PhotoCallback?

  // MARK: - Init

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupCapture()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupCapture()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }

  deinit {
    stopSession()
    if BriefPilotLiveScannerView.activeScanner === self {
      BriefPilotLiveScannerView.activeScanner = nil
    }
  }

  // MARK: - Setup

  private func setupCapture() {
    guard let dev = AVCaptureDevice.default(
      .builtInWideAngleCamera, for: .video, position: .back
    ) else { return }

    let session = AVCaptureSession()
    session.sessionPreset = .hd1280x720

    guard let input = try? AVCaptureDeviceInput(device: dev),
          session.canAddInput(input) else { return }
    session.addInput(input)

    // Video output — live detection
    let videoOut = AVCaptureVideoDataOutput()
    videoOut.videoSettings = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
    ]
    videoOut.alwaysDiscardsLateVideoFrames = true
    videoOut.setSampleBufferDelegate(self, queue: processingQueue)
    guard session.canAddOutput(videoOut) else { return }
    session.addOutput(videoOut)

    // Photo output — final hi-res capture
    let photoOut = AVCapturePhotoOutput()
    photoOut.isHighResolutionCaptureEnabled = true
    guard session.canAddOutput(photoOut) else { return }
    session.addOutput(photoOut)

    // Preview layer
    let preview = AVCaptureVideoPreviewLayer(session: session)
    preview.videoGravity = .resizeAspectFill
    preview.frame = bounds
    layer.insertSublayer(preview, at: 0)

    self.captureSession = session
    self.previewLayer = preview
    self.videoOutput = videoOut
    self.photoOutput = photoOut
    self.device = dev

    BriefPilotLiveScannerView.activeScanner = self
    startSession()
  }

  private func startSession() {
    guard let session = captureSession, !session.isRunning else { return }
    processingQueue.async { session.startRunning() }
  }

  private func stopSession() {
    guard let session = captureSession, session.isRunning else { return }
    processingQueue.async { session.stopRunning() }
  }

  private func applyZoom() {
    guard let dev = device else { return }
    let factor = CGFloat(1.0 + zoom * (dev.activeFormat.videoMaxZoomFactor - 1.0))
    try? dev.lockForConfiguration()
    dev.videoZoomFactor = max(1.0, min(factor, dev.activeFormat.videoMaxZoomFactor))
    dev.unlockForConfiguration()
  }

  // MARK: - Photo capture (called by module)

  func takePhoto(completion: @escaping PhotoCallback) {
    guard let photoOut = photoOutput else {
      completion(nil, 0, 0, NSError(
        domain: "BriefPilot", code: -1,
        userInfo: [NSLocalizedDescriptionKey: "Photo output not ready"]
      ))
      return
    }
    self.photoCaptureCallback = completion

    let settings = AVCapturePhotoSettings()
    settings.isHighResolutionPhotoEnabled = true
    if (flash as String) == "on",
       let dev = device, dev.isFlashAvailable {
      settings.flashMode = .on
    }
    photoOut.capturePhoto(with: settings, delegate: self)
  }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension BriefPilotLiveScannerView: AVCaptureVideoDataOutputSampleBufferDelegate {

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    // Process every 3rd frame → ~10fps at 30fps input
    frameCount &+= 1
    guard frameCount % 3 == 0 else { return }
    guard !isProcessingFrame else { return }
    isProcessingFrame = true
    defer { isProcessingFrame = false }

    guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

    guard let result = BriefPilotOpenCVHelper.detectCorners(in: pixelBuffer) else { return }
    guard result.confidence >= 0.20 else { return }

    let bufW = CVPixelBufferGetWidth(pixelBuffer)   // 1280 landscape
    let bufH = CVPixelBufferGetHeight(pixelBuffer)  // 720  landscape

    // Transform landscape corners → portrait coords
    // iPhone back camera buffer is landscape. Preview rotates it to portrait.
    // landscape (lx, ly) → portrait: px = ly, py = 1 - lx
    func toPortrait(_ p: CGPoint) -> [String: Double] {
      return ["x": Double(p.y), "y": 1.0 - Double(p.x)]
    }

    let body: [String: Any] = [
      "topLeft":       toPortrait(result.topLeft),
      "topRight":      toPortrait(result.topRight),
      "bottomRight":   toPortrait(result.bottomRight),
      "bottomLeft":    toPortrait(result.bottomLeft),
      "confidence":    result.confidence,
      "isBlurry":      result.isBlurry,
      "needsFlash":    result.needsFlash,
      "blurVariance":  result.blurVariance,
      "avgBrightness": result.avgBrightness,
      "areaScore":     result.areaScore,
      "angleScore":    result.angleScore,
      "aspectScore":   result.aspectScore,
      "centerScore":   result.centerScore,
      // Portrait dimensions after transform
      "width":  bufH,   // 720  → portrait width
      "height": bufW,   // 1280 → portrait height
    ]

    BriefPilotLiveScanModule.shared?.sendScanResult(body)
  }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension BriefPilotLiveScannerView: AVCapturePhotoCaptureDelegate {

  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
  ) {
    let cb = photoCaptureCallback
    photoCaptureCallback = nil

    if let err = error { cb?(nil, 0, 0, err); return }

    guard let data = photo.fileDataRepresentation() else {
      cb?(nil, 0, 0, NSError(
        domain: "BriefPilot", code: -2,
        userInfo: [NSLocalizedDescriptionKey: "No photo data"]
      ))
      return
    }

    let w = photo.resolvedSettings.photoDimensions.width
    let h = photo.resolvedSettings.photoDimensions.height

    let name = "bp_scan_\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
    let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(name)
    do {
      try data.write(to: url)
      cb?(url.absoluteString, Int(w), Int(h), nil)
    } catch {
      cb?(nil, 0, 0, error)
    }
  }
}
