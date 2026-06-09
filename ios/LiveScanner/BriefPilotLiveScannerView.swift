import Foundation
import UIKit
import AVFoundation
import ExpoModulesCore

private final class VideoSampleBufferProxy: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  weak var owner: BriefPilotLiveScannerView?

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    owner?.handleSampleBuffer(sampleBuffer)
  }
}

final class BriefPilotLiveScannerView: ExpoView,
    AVCapturePhotoCaptureDelegate {

  // MARK: - Singleton (weak — module reaches view for takePhoto)
  static weak var current: BriefPilotLiveScannerView?

  // MARK: - Private state
  private var captureSession: AVCaptureSession?
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private let photoOutput = AVCapturePhotoOutput()
  private let videoOutput = AVCaptureVideoDataOutput()
  private let sampleBufferProxy = VideoSampleBufferProxy()
  private let sessionQueue = DispatchQueue(label: "com.briefpilot.session", qos: .userInitiated)
  private let processingQueue = DispatchQueue(label: "com.briefpilot.processing", qos: .userInitiated)
  private var sessionIsConfigured = false
  private var lastProcessTime: TimeInterval = 0
  private let processInterval: TimeInterval = 0.1   // max 10fps to OpenCV

  typealias PhotoCompletion = (Result<(uri: String, width: Int, height: Int), Error>) -> Void
  private var pendingPhotoCompletion: PhotoCompletion?

  // MARK: - React props

  @objc var active: Bool = false {
    didSet { active ? startSession() : stopSession() }
  }

  @objc var flash: String = "off" { didSet { if captureSession?.isRunning == true { applyFlash() } } }
  @objc var zoom: CGFloat = 0     { didSet { if captureSession?.isRunning == true { applyZoom()  } } }

  // MARK: - Init / deinit

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    sampleBufferProxy.owner = self
    BriefPilotLiveScannerView.current = self
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }

  deinit {
    if BriefPilotLiveScannerView.current === self {
      BriefPilotLiveScannerView.current = nil
    }
    captureSession?.stopRunning()
  }

  // MARK: - Session setup (lazy, runs on sessionQueue)

  private func ensureSessionConfigured() {
    guard !sessionIsConfigured else { return }
    sessionIsConfigured = true

    let session = AVCaptureSession()
    session.beginConfiguration()
    session.sessionPreset = .hd1920x1080

    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
      let input = try? AVCaptureDeviceInput(device: device),
      session.canAddInput(input)
    else {
      session.commitConfiguration()
      sessionIsConfigured = false
      return
    }

    session.addInput(input)
    if session.canAddOutput(photoOutput) {
      session.addOutput(photoOutput)
    }

    videoOutput.alwaysDiscardsLateVideoFrames = true
    videoOutput.setSampleBufferDelegate(sampleBufferProxy, queue: processingQueue)
    if session.canAddOutput(videoOutput) {
      session.addOutput(videoOutput)
    }

    if let videoConnection = videoOutput.connection(with: .video),
       videoConnection.isVideoOrientationSupported {
      videoConnection.videoOrientation = .portrait
    }

    if let photoConnection = photoOutput.connection(with: .video),
       photoConnection.isVideoOrientationSupported {
      photoConnection.videoOrientation = .portrait
    }

    session.commitConfiguration()
    captureSession = session
    previewLayer = nil

    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let preview = AVCaptureVideoPreviewLayer()
      preview.videoGravity = .resizeAspectFill
      self.previewLayer = preview
    }
  }

  // MARK: - Session control

  private func startSession() {
    sessionQueue.async { [weak self] in
      guard let self else { return }
      self.ensureSessionConfigured()
      DispatchQueue.main.async { [weak self] in
        guard let self, self.previewLayer?.session == nil else { return }
        self.previewLayer?.session = self.captureSession
        self.previewLayer?.frame = self.bounds
        if let preview = self.previewLayer, preview.superlayer == nil {
          self.layer.insertSublayer(preview, at: 0)
        }
      }
      guard self.captureSession?.isRunning == false else { return }
      self.captureSession?.startRunning()
    }
  }

  private func stopSession() {
    sessionQueue.async { [weak self] in
      guard self?.captureSession?.isRunning == true else { return }
      self?.captureSession?.stopRunning()
    }
  }

  // MARK: - Device props

  private func applyFlash() {
    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
      device.hasTorch,
      (try? device.lockForConfiguration()) != nil
    else { return }
    device.torchMode = (flash == "on") ? .on : .off
    device.unlockForConfiguration()
  }

  private func applyZoom() {
    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
      (try? device.lockForConfiguration()) != nil
    else { return }
    let maxZoom = min(device.activeFormat.videoMaxZoomFactor, 5.0)
    device.videoZoomFactor = max(1.0, min(1.0 + zoom * (maxZoom - 1.0), maxZoom))
    device.unlockForConfiguration()
  }

  // MARK: - Still photo capture

  func capturePhoto(completion: @escaping PhotoCompletion) {
    guard captureSession?.isRunning == true else {
      completion(.failure(BPCameraError.sessionNotRunning))
      return
    }
    pendingPhotoCompletion = completion

    let settings = AVCapturePhotoSettings()
    settings.flashMode = (flash == "on") ? .on : .off

    sessionQueue.async { [weak self] in
      guard let strongSelf = self else {
        completion(.failure(BPCameraError.viewDeallocated))
        return
      }
      strongSelf.photoOutput.capturePhoto(with: settings, delegate: strongSelf)
    }
  }

  // AVCapturePhotoCaptureDelegate
  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
  ) {
    guard let completion = pendingPhotoCompletion else { return }
    pendingPhotoCompletion = nil

    if let error { completion(.failure(error)); return }

    guard let data = photo.fileDataRepresentation() else {
      completion(.failure(BPCameraError.noPhotoData))
      return
    }

    let image  = UIImage(data: data)
    let width  = Int(image?.size.width  ?? 1080)
    let height = Int(image?.size.height ?? 1920)

    let filename = "bp_capture_\(Int(Date().timeIntervalSince1970 * 1000)).jpg"
    let fileURL  = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

    do {
      try data.write(to: fileURL)
      completion(.success((uri: fileURL.absoluteString, width: width, height: height)))
    } catch {
      completion(.failure(error))
    }
  }

  fileprivate func handleSampleBuffer(_ sampleBuffer: CMSampleBuffer) {
    let now = CACurrentMediaTime()
    guard now - lastProcessTime >= processInterval else { return }
    lastProcessTime = now

    if let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) {
      let bufferW = Int(CVPixelBufferGetWidth(pixelBuffer))
      let bufferH = Int(CVPixelBufferGetHeight(pixelBuffer))
      guard let result = BriefPilotOpenCVHelper.detectCorners(in: pixelBuffer) else { return }

      let body: [String: Any] = [
        "topLeft": pointBody(result.topLeft),
        "topRight": pointBody(result.topRight),
        "bottomRight": pointBody(result.bottomRight),
        "bottomLeft": pointBody(result.bottomLeft),
        "confidence": Double(result.confidence),
        "areaScore": Double(result.areaScore),
        "angleScore": Double(result.angleScore),
        "aspectScore": Double(result.aspectScore),
        "centerScore": Double(result.centerScore),
        "edgeSupportScore": Double(result.edgeSupportScore),
        "isBlurry": Bool(result.isBlurry),
        "needsFlash": Bool(result.needsFlash),
        "width": bufferW,
        "height": bufferH,
      ]

      DispatchQueue.main.async {
        BriefPilotLiveScannerModule.shared?.sendScanResult(body: body)
      }
    }
    return
  }
}

private func pointBody(_ p: CGPoint) -> [String: Double] {
  ["x": Double(p.x), "y": Double(p.y)]
}

// MARK: - Error types

private enum BPCameraError: LocalizedError {
  case sessionNotRunning, noPhotoData, viewDeallocated
  var errorDescription: String? {
    switch self {
    case .sessionNotRunning: return "Camera session is not running"
    case .noPhotoData:       return "No photo data received"
    case .viewDeallocated:   return "Camera view was deallocated"
    }
  }
}
