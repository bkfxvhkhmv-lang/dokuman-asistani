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

typedef NS_ENUM(NSInteger, BPDetectorMode) {
    BPDetectorModeStill = 0,
    BPDetectorModeLive = 1,
};

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

// Robust TL / TR / BR / BL ordering:
// centroid-angle ordering avoids the duplicate-corner failures of sum/diff.
static std::array<cv::Point,4> sortCorners(const std::vector<cv::Point>& pts) {
    std::array<cv::Point,4> result;
    if (pts.size() != 4) return result;

    cv::Point2f centroid(0.0f, 0.0f);
    for (const auto& p : pts) {
        centroid.x += p.x;
        centroid.y += p.y;
    }
    centroid.x /= 4.0f;
    centroid.y /= 4.0f;

    std::vector<cv::Point> ordered = pts;
    std::sort(ordered.begin(), ordered.end(), [&](const cv::Point& a, const cv::Point& b) {
        double angleA = atan2((double)a.y - centroid.y, (double)a.x - centroid.x);
        double angleB = atan2((double)b.y - centroid.y, (double)b.x - centroid.x);
        return angleA < angleB;
    });

    int topLeftIdx = 0;
    int minSum = INT_MAX;
    for (int i = 0; i < 4; i++) {
        int s = ordered[i].x + ordered[i].y;
        if (s < minSum) {
            minSum = s;
            topLeftIdx = i;
        }
    }

    std::array<cv::Point,4> rotated = {
        ordered[topLeftIdx],
        ordered[(topLeftIdx + 1) % 4],
        ordered[(topLeftIdx + 2) % 4],
        ordered[(topLeftIdx + 3) % 4],
    };

    cv::Point2f v1(rotated[1].x - rotated[0].x, rotated[1].y - rotated[0].y);
    cv::Point2f v2(rotated[3].x - rotated[0].x, rotated[3].y - rotated[0].y);
    double cross = v1.x * v2.y - v1.y * v2.x;
    if (cross < 0) {
        std::swap(rotated[1], rotated[3]);
    }

    return rotated;
}

// Confidence: angle × 0.50 + aspect × 0.28 + area × 0.22
// angle is now primary: a tight rectangle beats a large loose quad.
// area is tertiary: presence signal, not a reward for size.
// aspect rewards A4/Letter shape, further penalising background envelopes.
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

    // Area score: presence signal only.
    // Full score at 60% frame coverage; tiny quads stay near 0.
    double areaRatio = area / imageArea;
    float aArea = (float)MAX(0, MIN(1.0, (areaRatio - 0.05) / 0.55));

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

    // Border proximity penalty: corners within 2% of any image border suggest
    // the quad extends into background. Soft penalty (0.90 per corner) to avoid
    // over-penalising legitimate close-up shots where the document fills the frame.
    float bPenalty = 1.0f;
    const float bMarginX = edgeW * 0.02f;
    const float bMarginY = edgeH * 0.02f;
    for (auto& pt : c) {
        if (pt.x < bMarginX || pt.x > edgeW - bMarginX ||
            pt.y < bMarginY || pt.y > edgeH - bMarginY) {
            bPenalty *= 0.90f;
        }
    }

    if (outAngleScore)  *outAngleScore  = aAngle;
    if (outAreaScore)   *outAreaScore   = aArea;
    if (outAspectScore) *outAspectScore = aAspect;
    if (outCenterScore) *outCenterScore = aCenter;

    float raw = (float)MIN(0.97, aAngle * 0.50 + aAspect * 0.28 + aArea * 0.22);
    return raw * bPenalty;
}

#pragma mark - Edge detection core

// Build edge map optimised for document scanning:
//   CLAHE (clip 1.0) → bilateral filter → Canny (20/70) → morphClose
static cv::Mat buildEdgeMap(const cv::Mat& gray) {
    // CLAHE clip 1.0 (was 2.0): lower clip reduces amplification of marble/fabric texture.
    // Still boosts dark-room contrast without over-amplifying patterned surfaces.
    cv::Ptr<cv::CLAHE> clahe = cv::createCLAHE(1.0, cv::Size(8, 8));
    cv::Mat equalized;
    clahe->apply(gray, equalized);

    // Bilateral filter: intensity sigma 100 (was 75) — blends marble veins (20-60 level
    // gradient) more aggressively while preserving sharp document borders (80-150 level).
    cv::Mat bilateral;
    cv::bilateralFilter(equalized, bilateral, 9, 100, 75);

    // Canny (20/70): low thresholds kept to catch weak paper-to-background transitions.
    // Marble/fabric noise is handled downstream by morphOpen (which removes short isolated
    // segments) rather than by raising thresholds (which would miss real document borders).
    cv::Mat edges;
    cv::Canny(bilateral, edges, 20, 70);

    // MorphClose 3×3: bridges small gaps at document corners (≤3px) without
    // thickening edges enough to merge nearby parallel background lines.
    cv::Mat k3c = cv::getStructuringElement(cv::MORPH_RECT, cv::Size(3,3));
    cv::morphologyEx(edges, edges, cv::MORPH_CLOSE, k3c);

    return edges;
}

// Measures what fraction of each quad side lies along detected edges.
// Samples numSamples points per side, checks a 3×3 neighbourhood in the edge map.
// Returns 0.70 × avgSideRate + 0.30 × worstSideRate.
// Penalises quads with one completely unsupported side even when the other three are fine.
static float computeEdgeSupport(
    const std::array<cv::Point,4>& corners,
    const cv::Mat& edges,
    int numSamples = 12
) {
    const int W = edges.cols, H = edges.rows;
    float minSide = 1.0f, sumAll = 0.0f;

    for (int s = 0; s < 4; s++) {
        cv::Point a = corners[s];
        cv::Point b = corners[(s + 1) % 4];
        int hits = 0;
        for (int i = 0; i < numSamples; i++) {
            float t = (float)i / (numSamples - 1);
            int px = (int)(a.x + t * (b.x - a.x) + 0.5f);
            int py = (int)(a.y + t * (b.y - a.y) + 0.5f);
            bool hit = false;
            for (int dy = -1; dy <= 1 && !hit; dy++) {
                for (int dx = -1; dx <= 1 && !hit; dx++) {
                    int nx = px + dx, ny = py + dy;
                    if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                        if (edges.at<uint8_t>(ny, nx) > 0) hit = true;
                    }
                }
            }
            if (hit) hits++;
        }
        float sideRate = (float)hits / numSamples;
        sumAll += sideRate;
        if (sideRate < minSide) minSide = sideRate;
    }

    float avgRate = sumAll / 4.0f;
    return 0.70f * avgRate + 0.30f * minSide;
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
    float confidencePenalty,
    float edgeSupportScore
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
    r.confidence       = conf;
    r.isBlurry         = isBlurry;
    r.needsFlash       = needsFlash;
    r.blurVariance     = blurVar;
    r.avgBrightness    = avgBright;
    r.areaScore        = aArea;
    r.angleScore       = aAngle;
    r.aspectScore      = aAspect;
    r.centerScore      = aCenter;
    r.edgeSupportScore = edgeSupportScore;
    return r;
}

// Normalized quad area using the shoelace formula on 0-1 corner coordinates.
// Used as a tie-breaker: the full document is always larger than any internal feature.
static double quadNormalizedArea(DocumentCornerResult *r) {
    double ax = r.topLeft.x,     ay = r.topLeft.y;
    double bx = r.topRight.x,    by = r.topRight.y;
    double cx = r.bottomRight.x, cy = r.bottomRight.y;
    double dx = r.bottomLeft.x,  dy = r.bottomLeft.y;
    return fabs(ax*(by-dy) + bx*(cy-ay) + cx*(dy-by) + dx*(ay-cy)) * 0.5;
}

// Returns 0–1: consistency of opposite side lengths.
// 1.0 = perfect parallelogram. Real documents with mild perspective: ~0.65–0.95.
// Strongly skewed background artifacts (laptop frame corner, marble tile): < 0.50.
static float computeSideLengthConsistency(DocumentCornerResult *r) {
    auto dist = [](CGPoint a, CGPoint b) -> float {
        float dx = a.x - b.x, dy = a.y - b.y;
        return sqrtf(dx*dx + dy*dy);
    };
    float topLen    = dist(r.topLeft,     r.topRight);
    float rightLen  = dist(r.topRight,    r.bottomRight);
    float bottomLen = dist(r.bottomRight, r.bottomLeft);
    float leftLen   = dist(r.bottomLeft,  r.topLeft);
    if (topLen < 1e-5f || bottomLen < 1e-5f || leftLen < 1e-5f || rightLen < 1e-5f) return 0;
    float tbRatio = MIN(topLen, bottomLen) / MAX(topLen, bottomLen);
    float lrRatio = MIN(leftLen, rightLen) / MAX(leftLen, rightLen);
    return (tbRatio + lrRatio) * 0.5f;
}

static float candidateRank(DocumentCornerResult *r, BPDetectorMode mode) {
    if (!r) return 0.0f;

    float rank = r.confidence;
    if (mode == BPDetectorModeLive) {
        float sideCons = computeSideLengthConsistency(r);
        // edgeSupportScore now leads: it discriminates true document borders from
        // marble veins / laptop frame edges better than confidence alone.
        rank = r.edgeSupportScore * 0.35f
             + r.confidence       * 0.25f
             + r.areaScore        * 0.20f
             + sideCons           * 0.12f
             + r.centerScore      * 0.05f
             + r.aspectScore      * 0.03f;

        double area = quadNormalizedArea(r);
        if (area < 0.12) rank *= 0.72f;
        else if (area < 0.18) rank *= 0.86f;

        // Background/laptop quads hug the frame edges; document rarely does.
        // Stronger tiered penalty (was a single ×0.78 for 2+).
        const CGFloat border = 0.035f;
        const CGPoint pts[] = { r.topLeft, r.topRight, r.bottomRight, r.bottomLeft };
        int borderHits = 0;
        for (CGPoint p : pts) {
            if (p.x < border || p.x > 1.0f - border || p.y < border || p.y > 1.0f - border)
                borderHits++;
        }
        if      (borderHits >= 3) rank *= 0.45f;
        else if (borderHits >= 2) rank *= 0.65f;
        else if (borderHits >= 1) rank *= 0.88f;
    }

    return rank;
}

static BOOL isBetter(DocumentCornerResult *r, DocumentCornerResult *best, BPDetectorMode mode) {
    if (!best) return YES;
    float rank = candidateRank(r, mode);
    float bestRank = candidateRank(best, mode);
    if (fabs(rank - bestRank) > 0.015f) return rank > bestRank;
    if (fabs(r.confidence - best.confidence) > 0.01f) return r.confidence > best.confidence;
    return quadNormalizedArea(r) > quadNormalizedArea(best);
}

static BOOL candidateLooksLikeDocument(DocumentCornerResult *r, BPDetectorMode mode) {
    if (!r) return NO;

    float sideCons = computeSideLengthConsistency(r);

    if (mode == BPDetectorModeLive) {
        // Live mode must be conservative: a wrong polygon is worse than no polygon.
        if (r.areaScore < 0.08f) return NO;
        if (r.aspectScore < 0.35f) return NO;
        if (r.angleScore < 0.55f) return NO;
        // Real documents (camera stable): min 0.488, typical 0.60–1.00.
        // Motion/transition/ghost frames: max 0.406.
        if (r.edgeSupportScore < 0.45f) return NO;
        // Reject strongly skewed/trapezoidal quads — real documents keep opposite
        // sides roughly parallel even under mild perspective.
        if (sideCons < 0.50f) return NO;
        // Hard-reject quads where 3+ corners hug the image border — these are
        // background/frame objects (laptop lid, table edge), not documents.
        {
            const CGFloat bdr = 0.05f;
            const CGPoint bpts[] = { r.topLeft, r.topRight, r.bottomRight, r.bottomLeft };
            int bHits = 0;
            for (CGPoint p : bpts)
                if (p.x < bdr || p.x > 1.0f-bdr || p.y < bdr || p.y > 1.0f-bdr) bHits++;
            if (bHits >= 3) return NO;
        }
    } else {
        if (r.areaScore < 0.03f) return NO;
        if (r.angleScore < 0.45f) return NO;
        if (sideCons < 0.35f) return NO;
    }

    return YES;
}

// Attempt to find a document quad in the given edge map.
// Returns the best DocumentCornerResult* or nil.
static DocumentCornerResult* _Nullable findQuadInEdges(
    const cv::Mat& edges,
    int origW, int origH,
    double scale,
    double imageArea,
    BPDetectorMode mode,
    BOOL isBlurry, BOOL needsFlash,
    double blurVar, double avgBright
) {
    double workArea = (double)(edges.cols * edges.rows);

    std::vector<std::vector<cv::Point>> contours;
    // RETR_LIST instead of RETR_EXTERNAL: when the document lies on a textured
    // surface (marble, dark laptop) the background may form the outermost contour,
    // making the document boundary an "inner" contour invisible to RETR_EXTERNAL.
    // RETR_LIST returns all contours without hierarchy so the document rectangle
    // is findable regardless of nesting depth.
    cv::findContours(edges, contours, cv::RETR_LIST, cv::CHAIN_APPROX_SIMPLE);
    std::sort(contours.begin(), contours.end(), [](auto& a, auto& b){
        return cv::contourArea(a) > cv::contourArea(b);
    });

    DocumentCornerResult *best = nil;

    for (const auto& contour : contours) {
        double area = cv::contourArea(contour);
        if (area < workArea * 0.03) break;

        double peri = cv::arcLength(contour, true);
        bool acceptedContour = false;
        for (double eps : {0.015, 0.025, 0.04, 0.06, 0.10}) {
            std::vector<cv::Point> approx;
            cv::approxPolyDP(contour, approx, peri * eps, true);
            if (approx.size() != 4 || !cv::isContourConvex(approx)) continue;

            auto corners = sortCorners(approx);
            float edgeSupport = computeEdgeSupport(corners, edges);
            DocumentCornerResult *r = buildCandidateResult(
                corners, area, origW, origH, scale, imageArea,
                edges.cols, edges.rows, isBlurry, needsFlash, blurVar, avgBright, 1.0f,
                edgeSupport
            );
            if (!r) continue;
            if (!candidateLooksLikeDocument(r, mode)) continue;
            if (isBetter(r, best, mode)) best = r;
            acceptedContour = true;
        }

        if (!acceptedContour && mode == BPDetectorModeStill) {
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
                float rectEdgeSupport = computeEdgeSupport(rectCorners, edges);
                // Require minimum edge support for minAreaRect path — without this,
                // a laptop frame or large background shape can win via size alone.
                if (rectEdgeSupport < 0.35f) continue;
                DocumentCornerResult *r = buildCandidateResult(
                    rectCorners, rectArea, origW, origH, scale, imageArea,
                    edges.cols, edges.rows, isBlurry, needsFlash, blurVar, avgBright, 0.90f,
                    rectEdgeSupport
                );
                if (r && !candidateLooksLikeDocument(r, mode)) r = nil;
                if (r && isBetter(r, best, mode)) best = r;
            }
        }

        if (best && best.confidence > 0.85f && quadNormalizedArea(best) > 0.25) break;
    }

    // Convex-hull fallback: only used when no contour produced a usable quad.
    // The hull of ALL edge pixels can include background objects, so apply a
    // heavy confidence penalty (0.70) and skip if we already have a contour result.
    if (!best && mode == BPDetectorModeStill) {
        std::vector<cv::Point> allPts;
        cv::findNonZero(edges, allPts);
        if (allPts.size() >= 4) {
            std::vector<cv::Point> hull;
            cv::convexHull(allPts, hull);
            double hullArea = cv::contourArea(hull);
            if (hullArea >= workArea * 0.04) {
                double hullPeri = cv::arcLength(hull, true);
                for (double eps : {0.02, 0.04, 0.06, 0.10, 0.15}) {
                    std::vector<cv::Point> approx;
                    cv::approxPolyDP(hull, approx, hullPeri * eps, true);
                    if (approx.size() != 4 || !cv::isContourConvex(approx)) continue;
                    auto corners = sortCorners(approx);
                    float hullEdgeSupport = computeEdgeSupport(corners, edges);
                    DocumentCornerResult *r = buildCandidateResult(
                        corners, hullArea, origW, origH, scale, imageArea,
                        edges.cols, edges.rows, isBlurry, needsFlash, blurVar, avgBright, 0.70f,
                        hullEdgeSupport
                    );
                    if (r && !candidateLooksLikeDocument(r, mode)) r = nil;
                    if (r && isBetter(r, best, mode)) best = r;
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
    cv::Mat& gray, int origW, int origH, BPDetectorMode mode
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
            edges, origW, origH, scale, imageArea, mode,
            isBlurry, needsFlash, blurVar, avgBright
        );
        if (candidate && (!best || candidate.confidence > best.confidence)) {
            best = candidate;
        }
        if (best && best.confidence > 0.80f) break; // high-confidence early exit
    }

    if (!best) {
        // Return quality data even when no quad found
        DocumentCornerResult *noCorner = [[DocumentCornerResult alloc] init];
        noCorner.confidence       = 0;
        noCorner.isBlurry         = isBlurry;
        noCorner.needsFlash       = needsFlash;
        noCorner.blurVariance     = blurVar;
        noCorner.avgBrightness    = avgBright;
        noCorner.areaScore        = 0;
        noCorner.angleScore       = 0;
        noCorner.aspectScore      = 0;
        noCorner.centerScore      = 0;
        noCorner.edgeSupportScore = 0;
        return noCorner;
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
    return runMultiScalePipeline(gray, imgW, imgH, BPDetectorModeStill);
}

+ (nullable DocumentCornerResult *)detectCornersInPixelBuffer:(CVPixelBufferRef)pixelBuffer {
    if (!pixelBuffer) return nil;

    // Only accept planar YpCbCr formats (BiPlanar full/video range) — reject BGRA and unknowns.
    OSType fmt = CVPixelBufferGetPixelFormatType(pixelBuffer);
    BOOL isPlanarYUV = (fmt == kCVPixelFormatType_420YpCbCr8BiPlanarFullRange ||
                        fmt == kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange);
    if (!isPlanarYUV) return nil;

    if (CVPixelBufferGetPlaneCount(pixelBuffer) < 1) return nil;

    CVReturn lockErr = CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    if (lockErr != kCVReturnSuccess) return nil;

    int w = (int)CVPixelBufferGetWidth(pixelBuffer);
    int h = (int)CVPixelBufferGetHeight(pixelBuffer);
    uint8_t *base = (uint8_t *)CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0);
    size_t stride = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0);

    if (!base || w <= 0 || h <= 0 || stride == 0) {
        CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
        return nil;
    }

    DocumentCornerResult *result = nil;
    try {
        cv::Mat yPlane(h, w, CV_8UC1, base, stride);

        // Pass the full Y-plane to the pipeline without pre-resizing.
        // The pipeline handles its own downscaling (900→600→400px) and uses
        // w/h as the normalisation anchor for corner coordinates.
        // A pre-resize to 480px here broke everything: the pipeline's internal
        // `scale` only corrected for its own resize step, leaving corner coords
        // ~4x too small and area scores ~16x too low — causing conf=0 on all live frames.
        cv::Mat gray;
        yPlane.copyTo(gray);

        CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
        result = runMultiScalePipeline(gray, w, h, BPDetectorModeLive);
    } catch (const cv::Exception&) {
        CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    } catch (...) {
        CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);
    }
    return result;
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

#pragma mark - Perspective correction (preview coords → full-res warp)

+ (UIImage *)correctPerspective:(UIImage *)image
                        topLeft:(CGPoint)tl
                       topRight:(CGPoint)tr
                    bottomRight:(CGPoint)br
                     bottomLeft:(CGPoint)bl
                    previewSize:(CGSize)previewSize {
    if (!image || previewSize.width <= 0 || previewSize.height <= 0) return image;

    @try {
        UIImage *oriented = [self normalizedImage:image];
        cv::Mat mat = [self matFromUIImage:oriented];
        if (mat.empty()) return image;

        int imgW = mat.cols, imgH = mat.rows;
        CGFloat scaleX = (CGFloat)imgW / previewSize.width;
        CGFloat scaleY = (CGFloat)imgH / previewSize.height;

        // Scale preview coords → image coords, clamp to bounds
        auto scaled = [&](CGPoint p) -> cv::Point2f {
            return cv::Point2f(
                (float)MIN(MAX(p.x * scaleX, 0), imgW - 1),
                (float)MIN(MAX(p.y * scaleY, 0), imgH - 1)
            );
        };

        cv::Point2f src[4] = { scaled(tl), scaled(tr), scaled(br), scaled(bl) };

        // Measure document edges
        auto edgeDist = [](cv::Point2f a, cv::Point2f b) -> CGFloat {
            float dx = a.x - b.x, dy = a.y - b.y;
            return sqrtf(dx*dx + dy*dy);
        };

        CGFloat docW = MAX(edgeDist(src[0], src[1]), edgeDist(src[3], src[2]));
        CGFloat docH = MAX(edgeDist(src[0], src[3]), edgeDist(src[1], src[2]));

        if (docW <= 1 || docH <= 1) return image;

        // Landscape detection: longer side → output width
        BOOL landscape = docW > docH;
        CGFloat outW = landscape ? MAX(docW, docH) : MIN(docW, docH);
        CGFloat outH = landscape ? MIN(docW, docH) : MAX(docW, docH);

        // Enforce A4 aspect ratio (297/210 ≈ 1.414)
        static const CGFloat kA4 = 1.414f;
        if ((outW / outH) > kA4) outH = outW / kA4;
        else                      outW = outH * kA4;

        // Cap at A4 @ 300 DPI (2480 × 3508)
        CGFloat cap = MIN(2480.0f / outW, 3508.0f / outH);
        if (cap < 1.0f) { outW = floorf(outW * cap); outH = floorf(outH * cap); }

        int iW = MAX(1, (int)roundf((float)outW));
        int iH = MAX(1, (int)roundf((float)outH));

        cv::Point2f dst[4] = {
            {0.0f,          0.0f},
            {(float)iW - 1, 0.0f},
            {(float)iW - 1, (float)iH - 1},
            {0.0f,          (float)iH - 1}
        };

        cv::Mat M = cv::getPerspectiveTransform(src, dst);
        if (M.empty()) return image;

        cv::Mat warped;
        cv::warpPerspective(mat, warped, M, cv::Size(iW, iH),
                            cv::INTER_LANCZOS4, cv::BORDER_REPLICATE);

        if (warped.empty()) return image;

        return [self UIImageFromMat:warped] ?: image;
    } @catch (...) {
        return image;
    }
}

#pragma mark - Enhancement dispatcher

+ (UIImage *)enhanceDocument:(UIImage *)image mode:(NSString *)mode {
    if (!image) return image;

    @try {
        NSString *m = [(mode ? mode : @"color") lowercaseString];

        if ([m isEqualToString:@"bw"]) {
            // Crisp B&W: CLAHE → adaptive threshold → morph close → unsharp
            return [self applyDocumentMagicFilter:image] ?: image;
        }
        if ([m isEqualToString:@"grayscale"]) {
            // Grayscale: CLAHE on L-channel, then desaturate
            UIImage *enhanced = [self applyCLAHE:image clipLimit:2.0] ?: image;
            // Convert to actual grayscale via shadow-removal path (returns BGRA gray)
            cv::Mat mat = [self matFromUIImage:enhanced];
            if (mat.empty()) return image;
            cv::Mat gray;
            cv::cvtColor(mat, gray, mat.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);
            cv::Mat denoised;
            cv::fastNlMeansDenoising(gray, denoised, 10, 7, 21);
            cv::Mat blurred;
            cv::GaussianBlur(denoised, blurred, cv::Size(0,0), 1.0);
            cv::Mat sharpened;
            cv::addWeighted(denoised, 1.6, blurred, -0.6, 0, sharpened);
            cv::Mat result;
            cv::cvtColor(sharpened, result, cv::COLOR_GRAY2BGRA);
            return [self UIImageFromMat:result] ?: image;
        }
        // Default: "color"
        return [self applyColorEnhancement:image] ?: image;
    } @catch (...) {
        return image;
    }
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
