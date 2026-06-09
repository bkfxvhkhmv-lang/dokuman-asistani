#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface DocumentCornerResult : NSObject
@property (nonatomic, assign) CGPoint topLeft;
@property (nonatomic, assign) CGPoint topRight;
@property (nonatomic, assign) CGPoint bottomRight;
@property (nonatomic, assign) CGPoint bottomLeft;
@property (nonatomic, assign) float   confidence;
@property (nonatomic, assign) BOOL    isBlurry;      // FAZ 3.1: Laplacian variance < 120
@property (nonatomic, assign) BOOL    needsFlash;    // FAZ 3.2: avg brightness < 80
@property (nonatomic, assign) double  blurVariance;  // Ham değer — JS kalibrasyon için
@property (nonatomic, assign) double  avgBrightness; // Ham değer — JS kalibrasyon için
// Debug/diagnostic scores — each 0.0–1.0
@property (nonatomic, assign) float   areaScore;     // quad area / image area
@property (nonatomic, assign) float   angleScore;    // 90° corner angle proximity
@property (nonatomic, assign) float   aspectScore;   // A4/Letter aspect ratio proximity
@property (nonatomic, assign) float   centerScore;   // quad centroid distance from image center
@property (nonatomic, assign) float   edgeSupportScore; // fraction of quad sides backed by detected edges
@end

/**
 * OpenCV tabanlı belge tarayıcı yardımcı sınıfı.
 * Swift kodu doğrudan C++ kullanamaz — bu Objective-C++ köprüsü aracılar.
 */
@interface BriefPilotOpenCVHelper : NSObject

/**
 * Fotoğraf (UIImage) üzerinde belge köşelerini tespit eder.
 * Algoritma: Grayscale → GaussianBlur → Canny → findContours → approxPolyDP
 * @return 4 köşe (normalize 0-1) veya nil (tespit edilemedi)
 */
+ (nullable DocumentCornerResult *)detectDocumentCorners:(UIImage *)image;

/**
 * Canlı kamera frame'i (CVPixelBufferRef) üzerinde gerçek zamanlı köşe tespiti.
 * YUV420 formatından direkt Y-plane alır — görüntü dönüşümü olmadan hızlı işlem.
 * VisionCamera frame processor veya AVCaptureOutput ile kullanım için.
 * @param pixelBuffer Kameradan gelen ham frame
 * @return Normalize (0-1) köşeler veya nil
 */
+ (nullable DocumentCornerResult *)detectCornersInPixelBuffer:(CVPixelBufferRef)pixelBuffer;

/**
 * OpenCV warpPerspective ile perspektif düzeltme.
 * @param corners Normalize (0-1) köşe koordinatları
 * @param outputSize Çıktı boyutu (A4 300dpi = 2480×3508 önerilen)
 */
+ (nullable UIImage *)warpPerspective:(UIImage *)image
                              corners:(DocumentCornerResult *)corners
                           outputSize:(CGSize)outputSize;

/**
 * Yüksek çözünürlüklü fotoğrafa perspektif düzeltme uygular.
 * Preview koordinatlarını tam görüntü koordinatlarına scale eder,
 * A4 oranına (1.414) uygun çıktı üretir, 2480×3508 ile sınırlar.
 * Herhangi bir hata durumunda orijinal görüntüyü döner.
 */
+ (UIImage *)correctPerspective:(UIImage *)image
                        topLeft:(CGPoint)tl
                       topRight:(CGPoint)tr
                    bottomRight:(CGPoint)br
                     bottomLeft:(CGPoint)bl
                    previewSize:(CGSize)previewSize;

/**
 * Perspektif düzeltilmiş görüntüye enhancement uygular.
 * @param mode "color" | "grayscale" | "bw" — tanınmayan mod "color"'a düşer.
 * @return Orijinal boyutta iyileştirilmiş UIImage; hata durumunda orijinali döner.
 */
+ (UIImage *)enhanceDocument:(UIImage *)image mode:(NSString *)mode;

/**
 * Adaptif eşikleme — siyah-beyaz belge taraması için.
 * Algoritma: Grayscale → adaptiveThreshold(Gaussian, 11, 2)
 */
+ (nullable UIImage *)applyAdaptiveThreshold:(UIImage *)image;

/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization) — renk taraması için.
 * LAB renk uzayında L kanalına uygulanır.
 */
+ (nullable UIImage *)applyCLAHE:(UIImage *)image clipLimit:(double)clipLimit;

/**
 * "Document Magic Filter" — DLT sonrası perspektif düzeltilmiş görüntüye uygulanan
 * tam belge iyileştirme pipeline'ı. Adobe Scan "Document" modu benzeri çıktı.
 * Algoritma: CLAHE → adaptiveThreshold(Gaussian,21,8) → morphClose
 */
+ (nullable UIImage *)applyDocumentMagicFilter:(UIImage *)image;

/**
 * Gölge giderme — düzensiz aydınlatma düzeltmesi.
 * Algoritma: Blur → normalize → bölme → unsharp-mask
 */
+ (nullable UIImage *)removeShadow:(UIImage *)image;

/**
 * Renkli belge iyileştirme — fişler, renkli formlar, fotoğraflar.
 * Rengi korurken okunabilirliği artırır.
 * Algoritma: CLAHE (Lab) → unsharp-mask → satürasyon artışı
 */
+ (nullable UIImage *)applyColorEnhancement:(UIImage *)image;

@end

NS_ASSUME_NONNULL_END
