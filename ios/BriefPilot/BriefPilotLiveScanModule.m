#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(BriefPilotLiveScanModule, RCTEventEmitter)

RCT_EXTERN_METHOD(startLiveDetection)
RCT_EXTERN_METHOD(stopLiveDetection)
RCT_EXTERN_METHOD(takePhoto:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return NO; }

@end
