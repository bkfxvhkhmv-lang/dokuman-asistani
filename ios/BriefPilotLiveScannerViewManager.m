#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(BriefPilotLiveScannerViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(flash,  NSString)
RCT_EXPORT_VIEW_PROPERTY(zoom,   double)
RCT_EXPORT_VIEW_PROPERTY(active, BOOL)

@end
