#import "BriefPilotOpenCVHelper.h"

#ifdef __cplusplus
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdocumentation"
#pragma push_macro("NO")
#undef NO
#import <opencv2/opencv.hpp>
#import <opencv2/imgproc.hpp>
#pragma pop_macro("NO")
#pragma clang diagnostic pop
#endif

@implementation DocumentCornerResult
@end

@implementation BriefPilotOpenCVHelper

static DocumentCornerResult *sLastStableResult = nil;
static int sConsecutiveMisses = 0;

#pragma mark - Geometry helpers

// Corner angle at P between neighbours A and B (degrees)
static double cornerAngle(cv::Point A, cv::Point P, cv::Point B) {
    cv::Point2d v1(A.x - P.x, A.y - P.y);
    cv::Point2d v2(B.x - P.x, B.y - P.y);
    double dot  = v1.x*v2.x + v1.y*v2.y;
    double mag  = sqrt(v1.x*v1.x + v1.y*v1.y) * sqrt(v2.x*v2.x + v2.y*v2.y);
    if (mag < 1e-6) return 0;
    return acos(MAX(-1.0, MIN(1.0, dot/mag))) * 180.0 / CV_PI;
}

// TL / TR / BR / BL ordering using sum/diff method (robust for rotated docs)
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

// Confidence: angle × 0.50 + area × 0.30 + aspect × 0.20
// aspectScore (A4/Letter proximity) is the key false-positive filter:
// furniture, rugs, phones all fail the A4 ratio check.
// Capped at 0.97 to leave headroom for quality penalties.
static float computeConfidence(
    std::array<cv::Point,4>& c,
    double area, double imageArea,
    int edgeW, int edgeH,
    float *outAreaScore, float *outAngleScore,
    float *outAspectScore, float *outCenterScore
) {
    // Angle score: 90° corner proximity
    double angleSum = 0;
    for (int i = 0; i < 4; i++) {
        cv::Point prev = c[(i+3)%4], curr = c[i], next = c[(i+1)%4];
        double deviation = fabs(cornerAngle(prev, curr, next) - 90.0);
        angleSum += MAX(0, 1.0 - deviation / 45.0);
    }
    float aAngle = (float)(angleSum / 4.0);

    // Area score: previous calibration was too harsh and collapsed to 0 for many valid mobile frames.
    // New mapping gives partial credit from ~3% upward and reaches 1.0 around ~28%.
    double areaRatio = area / imageArea;
    float aArea = (float)MAX(0, MIN(1.0, (areaRatio - 0.03) / 0.25));

    // Aspect score: proximity to A4 (1.414) or Letter (1.294) ratio
    double qw = cv::norm(cv::Point2d(c[1].x - c[0].x, c[1].y - c[0].y));
    double qh = cv::norm(cv::Point2d(c[3].x - c[0].x, c[3].y - c[0].y));
    float aAspect = 0;
    if (qw > 1 && qh > 1) {
        double ratio = qh / qw;
        if (ratio < 1.0) ratio = 1.0 / ratio;
        double a4Dev  = fabs(ratio - 1.414) / 1.414;
        double letDev = fabs(ratio - 1.294) / 1.294;
        aAspect = (float)MAX(0, 1.0 - MIN(a4Dev, letDev) * 3.0);
    }

    // Center score: quad centroid distance from image center (0=edge, 1=center)
    double cx = (c[0].x + c[1].x + c[2].x + c[3].x) / 4.0;
    double cy = (c[0].y + c[1].y + c[2].y + c[3].y) / 4.0;
    double normDx = fabs(cx - edgeW / 2.0) / (edgeW / 2.0 + 1e-6);
    double normDy = fabs(cy - edgeH / 2.0) / (edgeH / 2.0 + 1e-6);
    float aCenter = (float)MAX(0, 1.0 - sqrt(normDx*normDx + normDy*normDy));

    if (outAngleScore)  *outAngleScore  = aAngle;
    if (outAreaScore)   *outAreaScore   = aArea;
    if (outAspectScore) *outAspectScore = aAspect;
    if (outCenterScore) *outCenterScore = aCenter;

    return (float)MIN(0.97, aAngle * 0.50 + aArea * 0.30 + aAspect * 0.20);
}

#pragma mark - Edge detection core

// Build edge map optimised for document scanning:
//   bilateral filter (preserves edges) → adaptive-Canny → dilate → morph-close
static cv::Mat buildEdgeMap(const cv::Mat& gray) {
    // CLAHE: boost local contrast before edge detection (essential for dark / low-light frames).
    // Without this, median-based Canny thresholds collapse to near-zero in dark rooms.
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(2.0, cv::Size(8, 8));
    cv::Mat equalized;
    clahe->apply(gray, equalized);

    // Bilateral filter preserves sharp text/border edges while smoothing noise
    cv::Mat bilateral;
    cv::bilateralFilter(equalized, bilateral, 9, 75, 75);

    // Fixed thresholds work across all lighting conditions after CLAHE normalisation.
    // Sigma=0.33 adaptive approach collapsed to [13,27] on dark frames → no edges found.
    cv::Mat edges;
    cv::Canny(bilateral, edges, 30, 90);

    // Dilate to connect nearby edge segments
    cv::Mat k3 = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(3,3));
    cv::dilate(edges, edges, k3);

    // Morphological close to bridge small gaps at document corners
    // 3x3 (not 7x7) — larger kernel connects border to internal table lines, ruining quad detection
    cv::Mat k3c = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(3,3));
    cv::morphologyEx(edges, edges, cv::MORPH_CLOSE, k3c);

    return edges;
}

// Build a DocumentCornerResult from a normalized candidate quad.
static DocumentCornerResult* _Nullable buildCandidateResult(
    std::array<cv::Point,4>& corners,
    double area,
    int origW, int origH,
    double scale,
    double imageArea,
    int edgeW, int edgeH,
    BOOL isBlurry, BOOL needsFlash,
    double blurVar, double avgBright,
    float confidencePenalty
) {
    float aArea = 0, aAngle = 0, aAspect = 0, aCenter = 0;
    float conf = computeConfidence(
        corners, area / (scale*scale), imageArea,
        edgeW, edgeH,
        &aArea, &aAngle, &aAspect, &aCenter
    );
    if (isBlurry)   conf *= 0.50f;
    if (needsFlash) conf *= 0.75f;
    conf *= confidencePenalty;
    if (conf < 0.20f) return nil;

    float inv = (float)(1.0 / scale);
    DocumentCornerResult *r = [[DocumentCornerResult alloc] init];
    r.topLeft     = CGPointMake(corners[0].x * inv / origW, corners[0].y * inv / origH);
    r.topRight    = CGPointMake(corners[1].x * inv / origW, corners[1].y * inv / origH);
    r.bottomRight = CGPointMake(corners[2].x * inv / origW, corners[2].y * inv / origH);
    r.bottomLeft  = CGPointMake(corners[3].x * inv / origW, corners[3].y * inv / origH);
    r.confidence     = conf;
    r.isBlurry       = isBlurry;
    r.needsFlash     = needsFlash;
    r.blurVariance   = blurVar;
    r.avgBrightness  = avgBright;
    r.areaScore      = aArea;
    r.angleScore     = aAngle;
    r.aspectScore    = aAspect;
    r.centerScore    = aCenter;
    return r;
}

// Attempt to find a document quad in the given edge map.
// Returns the best DocumentCornerResult* or nil.
static DocumentCornerResult* _Nullable findQuadInEdges(
    const cv::Mat& edges,
    int origW, int origH,
    double scale,
    double imageArea,
    BOOL isBlurry, BOOL needsFlash,
    double blurVar, double avgBright
) {
    double workArea = (double)(edges.cols * edges.rows);

    std::vector<std::vector<cv::Point>> contours;
    cv::findContours(edges, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_SIMPLE);
    std::sort(contours.begin(), contours.end(), [](auto& a, auto& b){
        return cv::contourArea(a) > cv::contourArea(b);
    });

    DocumentCornerResult *best = nil;

    for (const auto& contour : contours) {
        double area = cv::contourArea(contour);
        if (area < workArea * 0.03) break; // too small — stop early

        // Try multiple epsilon values for approxPolyDP (robust to noise)
        double peri = cv::arcLength(contour, true);
        bool acceptedContour = false;
        for (double eps : {0.015, 0.025, 0.04, 0.06, 0.10}) {
            std::vector<cv::Point> approx;
            cv::approxPolyDP(contour, approx, peri * eps, true);
            if (approx.size() != 4 || !cv::isContourConvex(approx)) continue;

            auto corners = sortCorners(approx);
            DocumentCornerResult *r = buildCandidateResult(
                corners,
                area,
                origW, origH,
                scale,
                imageArea,
                edges.cols,
                edges.rows,
                isBlurry,
                needsFlash,
                blurVar,
                avgBright,
                1.0f
            );
            if (!r) continue;
            if (!best || r.confidence > best.confidence) best = r;
            acceptedContour = true;
            break; // found valid quad for this contour
        }

        if (!acceptedContour) {
            cv::RotatedRect rect = cv::minAreaRect(contour);
            double rectArea = rect.size.width * rect.size.height;
            if (rectArea >= workArea * 0.05) {
                cv::Point2f rectPtsF[4];
                rect.points(rectPtsF);
                std::vector<cv::Point> rectPts;
                rectPts.reserve(4);
                for (int i = 0; i < 4; i++) {
                    rectPts.emplace_back((int)rectPtsF[i].x, (int)rectPtsF[i].y);
                }
                auto rectCorners = sortCorners(rectPts);
                DocumentCornerResult *r = buildCandidateResult(
                    rectCorners,
                    rectArea,
                    origW, origH,
                    scale,
                    imageArea,
                    edges.cols,
                    edges.rows,
                    isBlurry,
                    needsFlash,
                    blurVar,
                    avgBright,
                    0.90f
                );
                if (r && (!best || r.confidence > best.confidence)) {
                    best = r;
                }
            }
        }

        if (best && best.confidence > 0.85f) break; // high enough — stop searching
    }

    // Convex-hull candidate: merge all large contours into one hull.
    // When the document fills the frame, the table lines produce many internal
    // contours — none of them individually matches the full document quad.
    // The convex hull of all large contours gives the outer document boundary.
    if (!best || best.confidence < 0.75f) {
        std::vector<cv::Point> allPts;
        for (const auto& c : contours) {
            if (cv::contourArea(c) < workArea * 0.01) break;
            allPts.insert(allPts.end(), c.begin(), c.end());
        }
        if (allPts.size() >= 4) {
            std::vector<cv::Point> hull;
            cv::convexHull(allPts, hull);
            double hullArea = cv::contourArea(hull);
            if (hullArea >= workArea * 0.05) {
                double hullPeri = cv::arcLength(hull, true);
                for (double eps : {0.02, 0.04, 0.06, 0.10, 0.15}) {
                    std::vector<cv::Point> approx;
                    cv::approxPolyDP(hull, approx, hullPeri * eps, true);
                    if (approx.size() != 4 || !cv::isContourConvex(approx)) continue;
                    auto corners = sortCorners(approx);
                    DocumentCornerResult *r = buildCandidateResult(
                        corners, hullArea, origW, origH, scale, imageArea,
                        edges.cols, edges.rows, isBlurry, needsFlash, blurVar, avgBright,
                        0.95f
                    );
                    if (r && (!best || r.confidence > best.confidence)) best = r;
                    break;
                }
            }
        }
    }

    return best;
}

// Quality analysis on a small thumbnail
static void analyseQuality(const cv::Mat& gray,
                            BOOL *outBlurry, BOOL *outNeedsFlash,
                            double *outBlurVar, double *outAvgBright) {
    int smallW = MIN(200, gray.cols);
    int smallH = (int)(smallW * (double)gray.rows / gray.cols);
    cv::Mat small;
    cv::resize(gray, small, cv::Size(smallW, smallH));

    *outAvgBright = cv::mean(small)[0];
    *outNeedsFlash = (*outAvgBright < 72.0);

    cv::Mat lap;
    cv::Laplacian(small, lap, CV_64F);
    cv::Scalar mean_, std_;
    cv::meanStdDev(lap, mean_, std_);
    *outBlurVar = std_[0] * std_[0];
    *outBlurry  = (*outBlurVar < 20.0);  // 100 was too strict for compressed mobile JPEG
}

// Multi-scale pipeline: detect at 3 resolutions, return best quad.
static DocumentCornerResult* _Nullable runMultiScalePipeline(
    cv::Mat& gray, int origW, int origH
) {
    double imageArea = (double)(origW * origH);

    BOOL isBlurry, needsFlash;
    double blurVar, avgBright;
    analyseQuality(gray, &isBlurry, &needsFlash, &blurVar, &avgBright);

    // Target widths to try (largest to smallest for early exit)
    const int targets[] = {900, 600, 400};
    DocumentCornerResult *best = nil;

    for (int tw : targets) {
        double scale = (gray.cols > tw) ? (double)tw / gray.cols : 1.0;
        cv::Mat resized;
        if (scale < 1.0) cv::resize(gray, resized, cv::Size(), scale, scale);
        else resized = gray;

        cv::Mat edges = buildEdgeMap(resized);

        DocumentCornerResult *candidate = findQuadInEdges(
            edges, origW, origH, scale, imageArea,
            isBlurry, needsFlash, blurVar, avgBright
        );
        if (candidate && (!best || candidate.confidence > best.confidence)) {
            best = candidate;
        }
        if (best && best.confidence > 0.80f) break; // high-confidence early exit
    }

    if (!best) {
        sConsecutiveMisses += 1;
        if (sLastStableResult != nil && sConsecutiveMisses <= 2) {
            return sLastStableResult;
        }

        // Return quality data even when no quad found
        DocumentCornerResult *noCorner = [[DocumentCornerResult alloc] init];
        noCorner.confidence    = 0;
        noCorner.isBlurry      = isBlurry;
        noCorner.needsFlash    = needsFlash;
        noCorner.blurVariance  = blurVar;
        noCorner.avgBrightness = avgBright;
        noCorner.areaScore     = 0;
        noCorner.angleScore    = 0;
        noCorner.aspectScore   = 0;
        noCorner.centerScore   = 0;
        return noCorner;
    }

    sConsecutiveMisses = 0;
    if (best.confidence >= 0.55f && best.areaScore >= 0.04f) {
        sLastStableResult = best;
    }
    return best;
}

#pragma mark - Public edge detection

+ (nullable DocumentCornerResult *)detectDocumentCorners:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;
    int imgW = mat.cols, imgH = mat.rows;
    cv::Mat gray;
    cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);
    return runMultiScalePipeline(gray, imgW, imgH);
}

+ (nullable DocumentCornerResult *)detectCornersInPixelBuffer:(CVPixelBufferRef)pixelBuffer {
    if (!pixelBuffer) return nil;
    CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    int w = (int)CVPixelBufferGetWidth(pixelBuffer);
    int h = (int)CVPixelBufferGetHeight(pixelBuffer);
    uint8_t *base = (uint8_t *)CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0);
    size_t stride = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0);
    cv::Mat yPlane(h, w, CV_8UC1, base, stride);

    // Live-frame path: single scale at 480px for speed
    double scale = (w > 480) ? 480.0 / w : 1.0;
    cv::Mat gray;
    if (scale < 1.0) cv::resize(yPlane, gray, cv::Size(), scale, scale);
    else yPlane.copyTo(gray);
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    return runMultiScalePipeline(gray, gray.cols, gray.rows);
}

#pragma mark - Perspective warp (INTER_LANCZOS4)

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

#pragma mark - Image enhancement

// Classic B&W document mode: CLAHE → adaptive threshold → denoise
+ (nullable UIImage *)applyAdaptiveThreshold:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat gray;
    cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);

    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(2.0, cv::Size(8,8));
    cv::Mat enhanced;
    clahe->apply(gray, enhanced);

    cv::Mat thresh;
    cv::adaptiveThreshold(enhanced, thresh, 255,
                          cv::ADAPTIVE_THRESH_GAUSSIAN_C, cv::THRESH_BINARY, 11, 2);

    cv::Mat denoised;
    cv::fastNlMeansDenoising(thresh, denoised, 10, 7, 21);

    cv::Mat result;
    cv::cvtColor(denoised, result, cv::COLOR_GRAY2BGRA);
    return [self UIImageFromMat:result];
}

// CLAHE on L-channel (color-preserving contrast enhancement)
+ (nullable UIImage *)applyCLAHE:(UIImage *)image clipLimit:(double)clipLimit {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat bgr, lab;
    if (mat.channels() == 4) cv::cvtColor(mat, bgr, cv::COLOR_BGRA2BGR);
    else bgr = mat;
    cv::cvtColor(bgr, lab, cv::COLOR_BGR2Lab);

    std::vector<cv::Mat> channels;
    cv::split(lab, channels);
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(clipLimit, cv::Size(8,8));
    clahe->apply(channels[0], channels[0]);
    cv::merge(channels, lab);

    cv::Mat bgrResult, result;
    cv::cvtColor(lab, bgrResult, cv::COLOR_Lab2BGR);
    if (mat.channels() == 4) cv::cvtColor(bgrResult, result, cv::COLOR_BGR2BGRA);
    else result = bgrResult;
    return [self UIImageFromMat:result];
}

// Magic filter — professional document mode (CamScanner / Adobe Scan level):
//   CLAHE contrast → adaptive threshold → denoise → unsharp-mask sharpening
+ (nullable UIImage *)applyDocumentMagicFilter:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat gray;
    cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);

    // 1. CLAHE — equalise shadows and highlights
    cv::Mat claheMat;
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(3.0, cv::Size(8,8));
    clahe->apply(gray, claheMat);

    // 2. Adaptive threshold — crisp black text on white background
    //    blockSize=21, C=10 tuned for mobile camera shots
    cv::Mat binary;
    cv::adaptiveThreshold(claheMat, binary, 255,
                          cv::ADAPTIVE_THRESH_GAUSSIAN_C, cv::THRESH_BINARY, 21, 10);

    // 3. Morphological close — fill tiny holes in text strokes
    cv::Mat k2 = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(2,2));
    cv::Mat cleaned;
    cv::morphologyEx(binary, cleaned, cv::MORPH_CLOSE, k2);

    // 4. Unsharp-mask sharpening — crisper output
    cv::Mat blurred;
    cv::GaussianBlur(cleaned, blurred, cv::Size(0,0), 1.5);
    cv::Mat sharpened;
    cv::addWeighted(cleaned, 1.5, blurred, -0.5, 0, sharpened);

    cv::Mat result;
    cv::cvtColor(sharpened, result, cv::COLOR_GRAY2BGRA);
    return [self UIImageFromMat:result];
}

// Color enhance — for receipts, colored forms, photos.
// Preserves color while maximising readability.
+ (nullable UIImage *)applyColorEnhancement:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat bgr;
    if (mat.channels() == 4) cv::cvtColor(mat, bgr, cv::COLOR_BGRA2BGR);
    else bgr = mat.clone();

    // CLAHE on Lab L-channel → better contrast without color shift
    cv::Mat lab;
    cv::cvtColor(bgr, lab, cv::COLOR_BGR2Lab);
    std::vector<cv::Mat> channels;
    cv::split(lab, channels);
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(2.5, cv::Size(8,8));
    clahe->apply(channels[0], channels[0]);
    cv::merge(channels, lab);
    cv::Mat enhanced;
    cv::cvtColor(lab, enhanced, cv::COLOR_Lab2BGR);

    // Unsharp mask to sharpen fine text
    cv::Mat blurred;
    cv::GaussianBlur(enhanced, blurred, cv::Size(0,0), 1.2);
    cv::Mat sharpened;
    cv::addWeighted(enhanced, 1.4, blurred, -0.4, 0, sharpened);

    // Slight saturation boost (multiply S channel × 1.15 in HSV)
    cv::Mat hsv;
    cv::cvtColor(sharpened, hsv, cv::COLOR_BGR2HSV);
    std::vector<cv::Mat> hsvCh;
    cv::split(hsv, hsvCh);
    hsvCh[1] *= 1.15f;
    cv::merge(hsvCh, hsv);
    cv::Mat saturated;
    cv::cvtColor(hsv, saturated, cv::COLOR_HSV2BGR);

    cv::Mat result;
    if (mat.channels() == 4) cv::cvtColor(saturated, result, cv::COLOR_BGR2BGRA);
    else result = saturated;
    return [self UIImageFromMat:result];
}

// Shadow removal — useful for crumpled or folded documents
+ (nullable UIImage *)removeShadow:(UIImage *)image {
    cv::Mat mat = [self matFromUIImage:image];
    if (mat.empty()) return nil;

    cv::Mat gray;
    cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);

    // Estimate background with large-kernel Gaussian blur
    cv::Mat bg;
    cv::GaussianBlur(gray, bg, cv::Size(31, 31), 0);

    cv::Mat normalized;
    cv::divide(gray, bg, normalized, 255.0);

    cv::Mat enhanced;
    normalized.convertTo(enhanced, CV_8U, 1.0, 0);
    cv::normalize(enhanced, enhanced, 0, 255, cv::NORM_MINMAX);

    // Unsharp mask after shadow removal
    cv::Mat blurred2;
    cv::GaussianBlur(enhanced, blurred2, cv::Size(0,0), 1.0);
    cv::Mat sharp;
    cv::addWeighted(enhanced, 1.3, blurred2, -0.3, 0, sharp);

    cv::Mat result;
    cv::cvtColor(sharp, result, cv::COLOR_GRAY2BGRA);
    return [self UIImageFromMat:result];
}

#pragma mark - Mat ↔ UIImage

+ (UIImage *)normalizedImage:(UIImage *)image {
    if (image.imageOrientation == UIImageOrientationUp) return image;
    UIGraphicsBeginImageContextWithOptions(image.size, NO, image.scale);
    [image drawInRect:CGRectMake(0, 0, image.size.width, image.size.height)];
    UIImage *result = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return result ?: image;
}

+ (cv::Mat)matFromUIImage:(UIImage *)image {
    UIImage *oriented = [self normalizedImage:image];
    CGImageRef cgImage = oriented.CGImage;
    if (!cgImage) return cv::Mat();

    size_t cols = CGImageGetWidth(cgImage);
    size_t rows = CGImageGetHeight(cgImage);
    cv::Mat mat((int)rows, (int)cols, CV_8UC4);

    CGColorSpaceRef cs  = CGColorSpaceCreateDeviceRGB();
    CGContextRef ctx = CGBitmapContextCreate(
        mat.data, cols, rows, 8, mat.step[0], cs,
        (CGBitmapInfo)((uint32_t)kCGImageAlphaNoneSkipLast | (uint32_t)kCGBitmapByteOrderDefault)
    );
    CGContextDrawImage(ctx, CGRectMake(0, 0, cols, rows), cgImage);
    CGContextRelease(ctx);
    CGColorSpaceRelease(cs);
    return mat;
}

+ (UIImage *)UIImageFromMat:(cv::Mat)mat {
    int ch = mat.channels();
    CGColorSpaceRef cs = ch == 1
        ? CGColorSpaceCreateDeviceGray()
        : CGColorSpaceCreateDeviceRGB();

    NSData *data = [NSData dataWithBytes:mat.data length:mat.elemSize() * mat.total()];
    CGDataProviderRef provider = CGDataProviderCreateWithCFData((__bridge CFDataRef)data);

    CGBitmapInfo bi = ch == 1
        ? (CGBitmapInfo)kCGBitmapByteOrderDefault
        : (CGBitmapInfo)((uint32_t)kCGImageAlphaNoneSkipLast | (uint32_t)kCGBitmapByteOrderDefault);

    CGImageRef imageRef = CGImageCreate(
        mat.cols, mat.rows, 8, 8 * ch, mat.step[0],
        cs, bi, provider, NULL, false, kCGRenderingIntentDefault
    );
    UIImage *result = [UIImage imageWithCGImage:imageRef];
    CGImageRelease(imageRef);
    CGDataProviderRelease(provider);
    CGColorSpaceRelease(cs);
    return result;
}

@end
