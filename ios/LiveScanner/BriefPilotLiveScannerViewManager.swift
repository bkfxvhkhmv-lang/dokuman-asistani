import Foundation
import ExpoModulesCore

public class BriefPilotLiveScannerViewManager: ExpoViewManager {
  public override func view() -> UIView {
    return BriefPilotLiveScannerView()
  }

  public override func definition() -> ModuleDefinition {
    Name("BriefPilotLiveScannerView")
  }
}
