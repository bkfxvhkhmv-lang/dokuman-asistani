#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BriefPilotVisionScanner, NSObject)

RCT_EXTERN_METHOD(scanDocuments:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
