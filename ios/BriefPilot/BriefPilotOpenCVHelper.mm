#import "BriefPilotOpenCVHelper.h"

#ifdef __cplusplus
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#import <opencv2/opencv.hpp>
#import <opencv2/imgproc.hpp>
#pragma clang diagnostic pop
#endif

@implementation DocumentCornerResult
@end

@implementation BriefPilotOpenCVHelper

#pragma mark - Edge Detection

// Köşe açısını hesaplar (vektör çarpım ile): P-A-B açısı (derece)
static double cornerAngle(cv::Point A, cv::Point P, cv::Point B) {
    cv::Point2d v1(A.x - P.x, A.y - P.y);
    cv::Point2d v2(B.x - P.x, B.y - P.y);
    double dot  = v1.x*v2.x + v1.y*v2.y;
    double mag  = sqrt(v1.x*v1.x + v1.y*v1.y) * sqrt(v2.x*v2.x + v2.y*v2.y);
    if (mag < 1e-6) return 0;
    return acos(MAX(-1.0, MIN(1.0, dot/mag))) * 180.0 / CV_PI;
}

// TL/TR/BR/BL sıralaması — sum/diff yöntemi (eğik belgeler için doğru)
// TL: min(x+y)  BR: max(x+y)  TR: min(y-x)  BL: max(y-x)
static std::array<cv::Point,4> sortCorners(std::vector<cv::Point>& pts) {
    std::array<cv::Point,4> result;
    int minSum=INT_MAX, maxSum=INT_MIN, minDiff=INT_MAX, maxDiff=INT_MIN;
    int iMinSum=0, iMaxSum=0, iMinDiff=0, iMaxDiff=0;
    for (int i=0; i<4; i++) {
        int s = pts[i].x + pts[i].y;
        int d = pts[i].y - pts[i].x;
        if (s < minSum) { minSum = s; iMinSum = i; }
        if (s > maxSum) { maxSum = s; iMaxSum = i; }
        if (d < minDiff){ minDiff = d; iMinDiff = i; }
        if (d > maxDiff){ maxDiff = d; iMaxDiff = i; }
    }
    result[0] = pts[iMinSum];   // TL
    result[1] = pts[iMinDiff];  // TR
    result[2] = pts[iMaxSum];   // BR
    result[3] = pts[iMaxDiff];  // BL
    return result;
}

// Gerçek confidence: açı skoru (90°'a yakınlık) * 0.6 + alan oranı * 0.4
static float computeConfidence(std::array<cv::Point,4>& c, double area, double imageArea) {
    // Açı skoru: 4 köşenin 90°'a yakınlığı
    double angleScore = 0;
    for (int i=0; i<4; i++) {
        cv::Point prev = c[(i+3)%4], curr = c[i], next = c[(i+1)%4];
        double angle = cornerAngle(prev, curr, next);
        double deviation = fabs(angle - 90.0);
        angleScore += MAX(0, 1.0 - deviation / 45.0); // 45° sapma = skor 0
    }
    angleScore /= 4.0;

    // Alan skoru: %15 ile %95 arasını 0→1'e map et
    double areaRatio = area / imageArea;
    double areaScore = MAX(0, MIN(1.0, (areaRatio - 0.15) / 0.80));

    return (float)MIN(0.95, angleScore * 0.6 + areaScore * 0.4);
}

+ (nullable DocumentCornerResult *)detectDocumentCorners:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    int imgW = mat.cols, imgH = mat.rows;

    double scale = 1.0;
    cv::Mat resized;
    if (imgW > 800) {
        scale = 800.0 / imgW;
        cv::resize(mat, resized, cv::Size(), scale, scale);
    } else {
        resized = mat;
    }

    cv::Mat gray;
    cv::cvtColor(resized, gray, resized.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);

    return runCornerPipeline(gray, imgW, imgH, scale);
}

// Ortak köşe sıralama ve confidence hesabı
static DocumentCornerResult* _Nullable cornersFromApprox(
    std::vector<cv::Point>& approx, double area, int imgW, int imgH,
    double imageArea, double scale, BOOL isBlurry, BOOL needsFlash
) {
    auto corners = sortCorners(approx);
    float confidence = computeConfidence(corners, area / (scale*scale), imageArea);

    // FAZ 3: Kalite cezalandırması
    if (isBlurry)    confidence *= 0.20f;  // Bulanıksa güveni çökert
    if (needsFlash)  confidence *= 0.70f;  // Karanlıksa hafif düşür

    if (confidence < 0.20f) return nil;

    float invScale = (float)(1.0 / scale);
    DocumentCornerResult *result = [[DocumentCornerResult alloc] init];
    result.topLeft     = CGPointMake(corners[0].x * invScale / imgW, corners[0].y * invScale / imgH);
    result.topRight    = CGPointMake(corners[1].x * invScale / imgW, corners[1].y * invScale / imgH);
    result.bottomRight = CGPointMake(corners[2].x * invScale / imgW, corners[2].y * invScale / imgH);
    result.bottomLeft  = CGPointMake(corners[3].x * invScale / imgW, corners[3].y * invScale / imgH);
    result.confidence  = confidence;
    result.isBlurry    = isBlurry;
    result.needsFlash  = needsFlash;
    return result;
}

// Paylaşılan pipeline: grayscale mat → corners (FAZ 1 + FAZ 3 kalite kontrolleri)
static DocumentCornerResult* _Nullable runCornerPipeline(
    cv::Mat& gray, int origW, int origH, double scale
) {
    double workArea = (double)(gray.cols * gray.rows);
    double imageArea = (double)(origW * origH);

    // ── FAZ 3.1 & 3.2: Hızlı kalite kontrolü (küçük mat üzerinde) ──────────
    cv::Mat smallMat;
    int smallW = MIN(200, gray.cols);
    int smallH = (int)(smallW * (double)gray.rows / gray.cols);
    cv::resize(gray, smallMat, cv::Size(smallW, smallH));

    // Parlaklık — ortalama piksel değeri
    double avgBrightness = cv::mean(smallMat)[0];
    BOOL needsFlash = avgBrightness < 80.0;

    // Bulanıklık — Laplacian varyansı
    cv::Mat lap;
    cv::Laplacian(smallMat, lap, CV_64F);
    cv::Scalar mean_, stddev_;
    cv::meanStdDev(lap, mean_, stddev_);
    double variance = stddev_[0] * stddev_[0];
    BOOL isBlurry = variance < 120.0;
    // ────────────────────────────────────────────────────────────────────────

    // ── FAZ 1: Kenar tespiti ────────────────────────────────────────────────
    // Adaptive Canny — medyan tabanlı otomatik threshold
    cv::Mat sortedMat;
    gray.reshape(1,1).copyTo(sortedMat);
    cv::sort(sortedMat, sortedMat, cv::SORT_ASCENDING);
    double med = sortedMat.at<uchar>(sortedMat.cols / 2);
    double lo = MAX(0,   0.67 * med);
    double hi = MIN(255, 1.33 * med);

    cv::Mat blurred, edges;
    cv::GaussianBlur(gray, blurred, cv::Size(5, 5), 0);
    cv::Canny(blurred, edges, lo, hi);

    cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(3, 3));
    cv::dilate(edges, edges, kernel);

    std::vector<std::vector<cv::Point>> contours;
    cv::findContours(edges, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);

    std::sort(contours.begin(), contours.end(), [](const std::vector<cv::Point>& a, const std::vector<cv::Point>& b) {
        return cv::contourArea(a) > cv::contourArea(b);
    });

    for (const auto& contour : contours) {
        double area = cv::contourArea(contour);
        if (area < workArea * 0.10) break;

        std::vector<cv::Point> approx;
        double peri = cv::arcLength(contour, true);
        cv::approxPolyDP(contour, approx, peri * 0.02, true);
        if (approx.size() != 4 || !cv::isContourConvex(approx)) continue;

        DocumentCornerResult *r = cornersFromApprox(
            approx, area, origW, origH, imageArea, scale, isBlurry, needsFlash
        );
        if (r) {
            r.blurVariance   = variance;
            r.avgBrightness  = avgBrightness;
            return r;
        }
    }

    // Köşe bulunamadı ama kalite bilgisini döndür (JS tarafında status label için)
    DocumentCornerResult *noCorner = [[DocumentCornerResult alloc] init];
    noCorner.confidence    = 0;
    noCorner.isBlurry      = isBlurry;
    noCorner.needsFlash    = needsFlash;
    noCorner.blurVariance  = variance;
    noCorner.avgBrightness = avgBrightness;
    return noCorner;
}

+ (nullable DocumentCornerResult *)detectCornersInPixelBuffer:(CVPixelBufferRef)pixelBuffer {
    if (!pixelBuffer) return nil;

    CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    int w = (int)CVPixelBufferGetWidth(pixelBuffer);
    int h = (int)CVPixelBufferGetHeight(pixelBuffer);
    uint8_t *base = (uint8_t *)CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0);
    size_t stride = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0);

    // Y-plane: zaten grayscale — dönüşüm yok
    cv::Mat yPlane(h, w, CV_8UC1, base, stride);

    double scale = 1.0;
    cv::Mat gray;
    if (w > 720) {
        scale = 720.0 / w;
        cv::resize(yPlane, gray, cv::Size(), scale, scale);
    } else {
        yPlane.copyTo(gray);
    }

    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

    return runCornerPipeline(gray, w, h, scale);
}

#pragma mark - Perspective Warp

+ (nullable UIImage *)warpPerspective:(UIImage *)image
                              corners:(DocumentCornerResult *)corners
                           outputSize:(CGSize)outputSize {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    int w = mat.cols, h = mat.rows;
    int outW = (int)outputSize.width;
    int outH = (int)outputSize.height;

    cv::Point2f src[4] = {
        cv::Point2f(corners.topLeft.x * w,     corners.topLeft.y * h),
        cv::Point2f(corners.topRight.x * w,    corners.topRight.y * h),
        cv::Point2f(corners.bottomRight.x * w, corners.bottomRight.y * h),
        cv::Point2f(corners.bottomLeft.x * w,  corners.bottomLeft.y * h),
    };
    cv::Point2f dst[4] = {
        cv::Point2f(0,    0),
        cv::Point2f(outW, 0),
        cv::Point2f(outW, outH),
        cv::Point2f(0,    outH),
    };

    cv::Mat M = cv::getPerspectiveTransform(src, dst);
    cv::Mat warped;
    cv::warpPerspective(mat, warped, M, cv::Size(outW, outH), cv::INTER_LANCZOS4);

    return [self UIImageFromMat:warped];
}

#pragma mark - Image Enhancement

+ (nullable UIImage *)applyAdaptiveThreshold:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat gray;
    cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);

    cv::Mat thresh;
    cv::adaptiveThreshold(gray, thresh, 255,
                          cv::ADAPTIVE_THRESH_GAUSSIAN_C,
                          cv::THRESH_BINARY, 11, 2);

    // Gürültü temizleme
    cv::Mat denoised;
    cv::fastNlMeansDenoising(thresh, denoised, 10, 7, 21);

    cv::Mat result;
    cv::cvtColor(denoised, result, cv::COLOR_GRAY2BGRA);
    return [self UIImageFromMat:result];
}

+ (nullable UIImage *)applyCLAHE:(UIImage *)image clipLimit:(double)clipLimit {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    // LAB renk uzayına çevir
    cv::Mat lab;
    cv::cvtColor(mat, lab, mat.channels() == 4 ? cv::COLOR_BGRA2Lab : cv::COLOR_BGR2Lab);

    std::vector<cv::Mat> channels;
    cv::split(lab, channels);

    // Sadece L (Luminance) kanalına CLAHE uygula
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(clipLimit, cv::Size(8, 8));
    clahe->apply(channels[0], channels[0]);

    cv::merge(channels, lab);

    cv::Mat result;
    cv::cvtColor(lab, result, mat.channels() == 4 ? cv::COLOR_Lab2BGRA : cv::COLOR_Lab2BGR);
    return [self UIImageFromMat:result];
}

+ (nullable UIImage *)applyDocumentMagicFilter:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat gray;
    cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);

    // 1. CLAHE — gölgeli/soluk alanları eşitle
    cv::Mat enhanced;
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(2.0, cv::Size(8, 8));
    clahe->apply(gray, enhanced);

    // 2. Adaptive Threshold — saf beyaz kağıt + siyah yazı
    // blockSize:21, C:8 mobil kameralar için optimize (kullanıcının değerleri)
    cv::Mat binary;
    cv::adaptiveThreshold(enhanced, binary, 255,
                          cv::ADAPTIVE_THRESH_GAUSSIAN_C,
                          cv::THRESH_BINARY, 21, 8);

    // 3. Gürültü temizleme — küçük nokta/kırıntıları yok et
    cv::Mat kernel = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(2, 2));
    cv::Mat cleaned;
    cv::morphologyEx(binary, cleaned, cv::MORPH_CLOSE, kernel);

    cv::Mat result;
    cv::cvtColor(cleaned, result, cv::COLOR_GRAY2BGRA);
    return [self UIImageFromMat:result];
}

+ (nullable UIImage *)removeShadow:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat gray;
    cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);

    // Büyük kernel ile blur → arka plan tahmini
    cv::Mat bg;
    cv::GaussianBlur(gray, bg, cv::Size(21, 21), 0);

    // Normalize: gri / arka plan
    cv::Mat normalized;
    cv::divide(gray, bg, normalized, 255.0);

    // Kontrast artırma
    cv::Mat enhanced;
    normalized.convertTo(enhanced, CV_8U, 1.0, 0);
    cv::normalize(enhanced, enhanced, 0, 255, cv::NORM_MINMAX);

    cv::Mat result;
    cv::cvtColor(enhanced, result, cv::COLOR_GRAY2BGRA);
    return [self UIImageFromMat:result];
}

#pragma mark - Mat ↔ UIImage Conversion

+ (cv::Mat)matFromUIImage:(UIImage *)image {
    CGImageRef cgImage = image.CGImage;
    if (!cgImage) return cv::Mat();

    size_t cols = CGImageGetWidth(cgImage);
    size_t rows = CGImageGetHeight(cgImage);

    cv::Mat mat((int)rows, (int)cols, CV_8UC4);

    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(
        mat.data, cols, rows, 8,
        mat.step[0], colorSpace,
        kCGImageAlphaNoneSkipLast | kCGBitmapByteOrderDefault
    );
    CGContextDrawImage(context, CGRectMake(0, 0, cols, rows), cgImage);
    CGContextRelease(context);
    CGColorSpaceRelease(colorSpace);

    return mat;
}

+ (UIImage *)UIImageFromMat:(cv::Mat)mat {
    int channels = mat.channels();
    CGColorSpaceRef colorSpace = channels == 1
        ? CGColorSpaceCreateDeviceGray()
        : CGColorSpaceCreateDeviceRGB();

    NSData *data = [NSData dataWithBytes:mat.data length:mat.elemSize() * mat.total()];
    CGDataProviderRef provider = CGDataProviderCreateWithCFData((__bridge CFDataRef)data);

    CGBitmapInfo bitmapInfo = channels == 1
        ? kCGBitmapByteOrderDefault
        : kCGImageAlphaNoneSkipLast | kCGBitmapByteOrderDefault;

    CGImageRef imageRef = CGImageCreate(
        mat.cols, mat.rows, 8,
        8 * channels, mat.step[0],
        colorSpace, bitmapInfo,
        provider, NULL, false, kCGRenderingIntentDefault
    );

    UIImage *result = [UIImage imageWithCGImage:imageRef];
    CGImageRelease(imageRef);
    CGDataProviderRelease(provider);
    CGColorSpaceRelease(colorSpace);
    return result;
}

@end
