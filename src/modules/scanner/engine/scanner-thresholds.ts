/**
 * Single source of truth for all scanner quality thresholds.
 *
 * Tier vocabulary (descending quality):
 *   excellent → high-confidence auto-capture candidate
 *   good      → solid detection, suitable for auto-capture scoring
 *   acceptable → document visible, manual capture ok
 *   poor       → detected but too weak to capture
 *   rejected   → geometry invalid or below poor
 *
 * Gate assignments (referencing tiers):
 *   LIVE_GATE   — minimum to pass the live-stream frame filter and show the polygon.
 *                 Currently sits between acceptable and good (conf 0.50, angle 0.60).
 *                 TODO: align to a named tier once corner quality is tuned.
 *   LAST_GOOD   — minimum to store corners in the fallback cache.
 *   CAPTURE     — minimum for still-photo capture (used by camera-capture-decision).
 */

export const GEOM_MARGIN = 0.03;

// ---------------------------------------------------------------------------
// Tier thresholds
// ---------------------------------------------------------------------------

export const TIER_THRESHOLDS = {
  excellent: {
    confidence: 0.75,
    area_min:   0.10,
    area_max:   1.00,
    angle:      0.72,
    aspect:     0.60,
    center:     0.40,
  },
  good: {
    confidence: 0.62,
    area_min:   0.08,
    area_max:   1.00,
    angle:      0.60,
    aspect:     0.35,
    center:     0.30,
  },
  acceptable: {
    confidence: 0.45,
    area_min:   0.01,
    area_max:   1.00,
    angle:      0.40,
    aspect:     0.22,
    center:     0.25,
  },
  poor: {
    confidence: 0.30,
    area_min:   0.03,
    area_max:   1.00,
    angle:      0.20,
    aspect:     0.00,
    center:     0.00,
  },
} as const;

// ---------------------------------------------------------------------------
// Gate configurations (current values — kept stable; align to tiers in a
// separate calibration pass once corner quality issues are resolved)
// ---------------------------------------------------------------------------

/** Minimum quality to pass the live-stream gate and render the polygon overlay. */
export const LIVE_GATE = {
  GEOM_MARGIN,
  CONFIDENCE_MIN: 0.50,   // between acceptable (0.45) and good (0.62)
  AREA_MIN:       0.08,   // matches TIER.good.area_min
  AREA_MAX:       1.00,
  ANGLE_MIN:      0.60,   // matches TIER.good.angle
  CENTER_MIN:     0.20,   // below TIER.acceptable.center (0.25) — intentional lenience
  ASPECT_MIN:     0.20,   // below TIER.acceptable.aspect (0.22)
} as const;

/** Minimum quality for a detection to be stored in the fallback corner cache. */
export const LAST_GOOD_GATE = {
  WINDOW_MS:      2500,
  CONFIDENCE_MIN: 0.45,   // matches TIER.acceptable.confidence
  AREA_MIN:       0.08,   // matches TIER.good.area_min
  ANGLE_MIN:      0.55,   // between acceptable (0.40) and good (0.60)
} as const;

/** Minimum quality for still-photo capture (manual or auto-fallback). */
export const CAPTURE_GATE = {
  CONFIDENCE_MIN: 0.35,   // intentionally below acceptable — still capture is lenient
  AREA_MIN:       0.01,
  AREA_MAX:       1.00,
  ANGLE_MIN:      0.40,   // matches TIER.acceptable.angle
  ASPECT_MIN:     0.20,
  CENTER_MIN:     0.20,
} as const;
