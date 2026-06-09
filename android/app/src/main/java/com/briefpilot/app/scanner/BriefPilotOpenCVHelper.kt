package com.briefpilot.app.scanner

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import org.opencv.android.Utils
import org.opencv.core.*
import org.opencv.imgproc.Imgproc
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.*

/** iOS'taki BriefPilotOpenCVHelper.mm'in Kotlin karşılığı */
object BriefPilotOpenCVHelper {

    data class CornerResult(
        val topLeft:     PointF,
        val topRight:    PointF,
        val bottomRight: PointF,
        val bottomLeft:  PointF,
        val confidence:  Float,
        val isBlurry:    Boolean,
        val needsFlash:  Boolean,
        val blurVariance:  Double,
        val avgBrightness: Double,
    )

    data class PointF(val x: Float, val y: Float)

    // ── Corner sorting: sum/diff yöntemi (iOS ile aynı mantık) ──────────────
    private fun sortCorners(pts: List<Point>): Array<Point> {
        val sorted = Array(4) { Point() }
        var minSum = Double.MAX_VALUE; var maxSum = Double.MIN_VALUE
        var minDiff = Double.MAX_VALUE; var maxDiff = Double.MIN_VALUE
        var iMinSum = 0; var iMaxSum = 0; var iMinDiff = 0; var iMaxDiff = 0
        pts.forEachIndexed { i, p ->
            val s = p.x + p.y; val d = p.y - p.x
            if (s < minSum) { minSum = s; iMinSum = i }
            if (s > maxSum) { maxSum = s; iMaxSum = i }
            if (d < minDiff) { minDiff = d; iMinDiff = i }
            if (d > maxDiff) { maxDiff = d; iMaxDiff = i }
        }
        sorted[0] = pts[iMinSum]   // TL
        sorted[1] = pts[iMinDiff]  // TR
        sorted[2] = pts[iMaxSum]   // BR
        sorted[3] = pts[iMaxDiff]  // BL
        return sorted
    }

    // ── Gerçek confidence: açı skoru × 0.6 + alan oranı × 0.4 ──────────────
    private fun cornerAngle(a: Point, p: Point, b: Point): Double {
        val v1x = a.x - p.x; val v1y = a.y - p.y
        val v2x = b.x - p.x; val v2y = b.y - p.y
        val dot = v1x * v2x + v1y * v2y
        val mag = sqrt(v1x*v1x + v1y*v1y) * sqrt(v2x*v2x + v2y*v2y)
        if (mag < 1e-6) return 0.0
        return acos((dot / mag).coerceIn(-1.0, 1.0)) * 180.0 / PI
    }

    private fun computeConfidence(c: Array<Point>, area: Double, imageArea: Double): Float {
        var angleScore = 0.0
        for (i in 0..3) {
            val angle = cornerAngle(c[(i+3)%4], c[i], c[(i+1)%4])
            angleScore += max(0.0, 1.0 - abs(angle - 90.0) / 45.0)
        }
        angleScore /= 4.0
        val areaScore = max(0.0, min(1.0, (area / imageArea - 0.15) / 0.80))
        return (angleScore * 0.6 + areaScore * 0.4).toFloat().coerceAtMost(0.95f)
    }

    // ── FAZ 3: Laplacian variance (blur) + ortalama parlaklık ───────────────
    private fun qualityMetrics(gray: Mat): Pair<Double, Double> {
        val small = Mat()
        val smallW = min(200, gray.cols())
        val smallH = (smallW.toDouble() * gray.rows() / gray.cols()).toInt()
        Imgproc.resize(gray, small, Size(smallW.toDouble(), smallH.toDouble()))

        val brightness = Core.mean(small).`val`[0]

        val lap = Mat()
        Imgproc.Laplacian(small, lap, CvType.CV_64F)
        val stddev = MatOfDouble(); val mean = MatOfDouble()
        Core.meanStdDev(lap, mean, stddev)
        val variance = stddev.toArray()[0].pow(2)

        small.release(); lap.release()
        return Pair(variance, brightness)
    }

    // ── Ana pipeline (FAZ 1 + FAZ 3) ────────────────────────────────────────
    private fun runPipeline(gray: Mat, origW: Int, origH: Int, scale: Double): CornerResult? {
        val (variance, brightness) = qualityMetrics(gray)
        val isBlurry   = variance < 120.0
        val needsFlash = brightness < 80.0

        // Adaptive Canny — medyan tabanlı threshold
        val sorted = Mat(); gray.reshape(1, 1).copyTo(sorted)
        Core.sort(sorted, sorted, Core.SORT_ASCENDING)
        val med = sorted.get(0, sorted.cols() / 2)[0]
        sorted.release()
        val lo = max(0.0, 0.67 * med); val hi = min(255.0, 1.33 * med)

        val blurred = Mat(); val edges = Mat()
        Imgproc.GaussianBlur(gray, blurred, Size(5.0, 5.0), 0.0)
        Imgproc.Canny(blurred, edges, lo, hi)
        blurred.release()

        val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(3.0, 3.0))
        Imgproc.dilate(edges, edges, kernel)

        val contours = mutableListOf<MatOfPoint>()
        Imgproc.findContours(edges, contours, Mat(), Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
        edges.release()

        val workArea = gray.cols().toDouble() * gray.rows()
        val imageArea = origW.toDouble() * origH

        contours.sortByDescending { Imgproc.contourArea(it) }

        for (contour in contours) {
            val area = Imgproc.contourArea(contour)
            if (area < workArea * 0.10) break

            val approx = MatOfPoint2f()
            val c2f = MatOfPoint2f(*contour.toArray())
            val peri = Imgproc.arcLength(c2f, true)
            Imgproc.approxPolyDP(c2f, approx, peri * 0.02, true)
            c2f.release()

            val pts = approx.toList()
            approx.release()
            if (pts.size != 4 || !Imgproc.isContourConvex(MatOfPoint(*pts.toTypedArray()))) continue

            val corners = sortCorners(pts)
            var confidence = computeConfidence(corners, area / (scale * scale), imageArea)
            if (isBlurry)   confidence *= 0.20f
            if (needsFlash) confidence *= 0.70f
            if (confidence < 0.20f) continue

            val inv = (1.0 / scale).toFloat()
            return CornerResult(
                topLeft     = PointF(corners[0].x.toFloat() * inv / origW, corners[0].y.toFloat() * inv / origH),
                topRight    = PointF(corners[1].x.toFloat() * inv / origW, corners[1].y.toFloat() * inv / origH),
                bottomRight = PointF(corners[2].x.toFloat() * inv / origW, corners[2].y.toFloat() * inv / origH),
                bottomLeft  = PointF(corners[3].x.toFloat() * inv / origW, corners[3].y.toFloat() * inv / origH),
                confidence  = confidence,
                isBlurry    = isBlurry,
                needsFlash  = needsFlash,
                blurVariance  = variance,
                avgBrightness = brightness,
            )
        }

        // Köşe bulunamadı — sadece kalite meta döndür
        return CornerResult(
            topLeft = PointF(0f,0f), topRight = PointF(0f,0f),
            bottomRight = PointF(0f,0f), bottomLeft = PointF(0f,0f),
            confidence = 0f, isBlurry = isBlurry, needsFlash = needsFlash,
            blurVariance = variance, avgBrightness = brightness,
        )
    }

    // ── Public API ───────────────────────────────────────────────────────────

    fun detectDocumentCorners(bitmap: Bitmap): CornerResult? {
        val mat = Mat()
        Utils.bitmapToMat(bitmap, mat)
        val origW = mat.cols(); val origH = mat.rows()

        val scale = if (origW > 800) 800.0 / origW else 1.0
        val gray = Mat()
        if (scale < 1.0) {
            val resized = Mat()
            Imgproc.resize(mat, resized, Size(), scale, scale)
            Imgproc.cvtColor(resized, gray, Imgproc.COLOR_RGBA2GRAY)
            resized.release()
        } else {
            Imgproc.cvtColor(mat, gray, Imgproc.COLOR_RGBA2GRAY)
        }
        mat.release()

        val result = runPipeline(gray, origW, origH, scale)
        gray.release()
        return result
    }

    fun warpPerspective(bitmap: Bitmap, corners: CornerResult, outW: Int = 2480, outH: Int = 3508): Bitmap? {
        val mat = Mat()
        Utils.bitmapToMat(bitmap, mat)
        val w = mat.cols().toDouble(); val h = mat.rows().toDouble()

        val src = MatOfPoint2f(
            Point(corners.topLeft.x * w,     corners.topLeft.y * h),
            Point(corners.topRight.x * w,    corners.topRight.y * h),
            Point(corners.bottomRight.x * w, corners.bottomRight.y * h),
            Point(corners.bottomLeft.x * w,  corners.bottomLeft.y * h),
        )
        val dst = MatOfPoint2f(
            Point(0.0, 0.0), Point(outW.toDouble(), 0.0),
            Point(outW.toDouble(), outH.toDouble()), Point(0.0, outH.toDouble()),
        )

        val M = Imgproc.getPerspectiveTransform(src, dst)
        val warped = Mat()
        Imgproc.warpPerspective(mat, warped, M, Size(outW.toDouble(), outH.toDouble()), Imgproc.INTER_LANCZOS4)
        mat.release(); src.release(); dst.release(); M.release()

        val result = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
        Utils.matToBitmap(warped, result)
        warped.release()
        return result
    }

    /** FAZ 3.3: CLAHE → adaptiveThreshold → morphClose */
    fun applyDocumentMagicFilter(bitmap: Bitmap): Bitmap? {
        val mat = Mat()
        Utils.bitmapToMat(bitmap, mat)

        val gray = Mat()
        Imgproc.cvtColor(mat, gray, Imgproc.COLOR_RGBA2GRAY)
        mat.release()

        // CLAHE
        val enhanced = Mat()
        val clahe = Imgproc.createCLAHE(2.0, Size(8.0, 8.0))
        clahe.apply(gray, enhanced)
        gray.release()

        // Adaptive Threshold
        val binary = Mat()
        Imgproc.adaptiveThreshold(enhanced, binary, 255.0,
            Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY, 21, 8.0)
        enhanced.release()

        // Gürültü temizleme
        val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(2.0, 2.0))
        val cleaned = Mat()
        Imgproc.morphologyEx(binary, cleaned, Imgproc.MORPH_CLOSE, kernel)
        binary.release()

        val rgba = Mat()
        Imgproc.cvtColor(cleaned, rgba, Imgproc.COLOR_GRAY2RGBA)
        cleaned.release()

        val result = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
        Utils.matToBitmap(rgba, result)
        rgba.release()
        return result
    }

    fun applyAdaptiveThreshold(bitmap: Bitmap): Bitmap? {
        val mat = Mat(); Utils.bitmapToMat(bitmap, mat)
        val gray = Mat(); Imgproc.cvtColor(mat, gray, Imgproc.COLOR_RGBA2GRAY); mat.release()
        val thresh = Mat()
        Imgproc.adaptiveThreshold(gray, thresh, 255.0,
            Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY, 11, 2.0)
        gray.release()
        val rgba = Mat(); Imgproc.cvtColor(thresh, rgba, Imgproc.COLOR_GRAY2RGBA); thresh.release()
        val result = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
        Utils.matToBitmap(rgba, result); rgba.release()
        return result
    }

    fun applyCLAHE(bitmap: Bitmap, clipLimit: Double = 2.0): Bitmap? {
        val mat = Mat(); Utils.bitmapToMat(bitmap, mat)
        val lab = Mat(); Imgproc.cvtColor(mat, lab, Imgproc.COLOR_RGBA2RGB); mat.release()
        val labFull = Mat(); Imgproc.cvtColor(lab, labFull, Imgproc.COLOR_RGB2Lab); lab.release()
        val channels = mutableListOf<Mat>(); Core.split(labFull, channels)
        val clahe = Imgproc.createCLAHE(clipLimit, Size(8.0, 8.0))
        clahe.apply(channels[0], channels[0])
        Core.merge(channels, labFull)
        val rgb = Mat(); Imgproc.cvtColor(labFull, rgb, Imgproc.COLOR_Lab2RGB); labFull.release()
        val rgba = Mat(); Imgproc.cvtColor(rgb, rgba, Imgproc.COLOR_RGB2RGBA); rgb.release()
        val result = Bitmap.createBitmap(rgba.cols(), rgba.rows(), Bitmap.Config.ARGB_8888)
        Utils.matToBitmap(rgba, result); rgba.release()
        return result
    }

    // ── Dosya yardımcıları ───────────────────────────────────────────────────

    fun loadBitmap(uriString: String): Bitmap? {
        val path = uriString.removePrefix("file://")
        return try { BitmapFactory.decodeFile(path) } catch (e: Exception) { null }
    }

    fun saveBitmap(bitmap: Bitmap, cacheDir: File): String? {
        return try {
            val file = File(cacheDir, "${UUID.randomUUID()}.jpg")
            FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) }
            "file://${file.absolutePath}"
        } catch (e: Exception) { null }
    }
}
