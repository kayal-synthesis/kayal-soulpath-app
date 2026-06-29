"""
Palm Analysis Engine — KAYAL Synthesis Platform
================================================
Production-ready feature extraction engine.

Responsibility:
    Observe and extract deterministic palm features from images.
    This engine does NOT interpret. It reports what it sees.
    Interpretation is handled by the Logic Layer upstream.

Dual-hand support:
    Each hand is submitted as a separate image for maximum quality.
    The engine analyses them independently, then produces a
    CrossHandComparison payload highlighting differences between
    dominant and non-dominant hands — a key signal for the Logic Layer.

    Dominant hand   = current life expression / choices made
    Non-dominant    = innate blueprint / karmic baseline
    Delta between   = growth, suppression, or deviation from potential

Output contract:
    PalmFeatures       — single hand analysis
    DualPalmFeatures   — both hands + cross-hand comparison

v4.0.0 additions:
    - ChildrenLineFeature  — percussion-edge children lines
    - HealthMarker         — health vulnerability markers from mounts/lines
    - SpiritualMarker      — spiritual gift indicators
    - LifeLineAssessment   — longevity assessment from life line
    - FateLineAssessment   — career/wealth assessment from fate line
    - InfidelityMarker     — fidelity indicators from palm features
    - PalmFeatures extended: children_lines, health_markers, spiritual_markers,
      life_line_assessment, fate_line_assessment, infidelity_markers
    - All v3.0.2 code preserved intact

Author: KAYAL Engineering
Version: 4.0.0
"""

from __future__ import annotations

import hashlib
import logging
import math
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Enums — strict vocabulary for the logic layer  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

class LinePresence(str, Enum):
    STRONG   = "strong"
    MODERATE = "moderate"
    FAINT    = "faint"
    ABSENT   = "absent"
    UNCLEAR  = "unclear"


class LineCurvature(str, Enum):
    CURVED   = "curved"
    STRAIGHT = "straight"
    WAVY     = "wavy"
    UNCLEAR  = "unclear"


class Magnitude(str, Enum):
    HIGH     = "high"
    MODERATE = "moderate"
    LOW      = "low"
    UNCLEAR  = "unclear"


class SkinTone(str, Enum):
    LIGHT     = "light"
    MEDIUM    = "medium"
    DARK      = "dark"
    VERY_DARK = "very_dark"


class SkinTexture(str, Enum):
    SMOOTH   = "smooth"
    MODERATE = "moderate"
    COARSE   = "coarse"


class HandShape(str, Enum):
    EARTH = "earth"   # Square palm, short fingers
    AIR   = "air"     # Square palm, long fingers
    FIRE  = "fire"    # Rectangular palm, short fingers
    WATER = "water"   # Rectangular palm, long fingers
    MIXED = "mixed"


class FingerLength(str, Enum):
    LONG    = "long"
    AVERAGE = "average"
    SHORT   = "short"


class FingerFlexibility(str, Enum):
    FLEXIBLE = "flexible"
    MODERATE = "moderate"
    STIFF    = "stiff"


class ImageQuality(str, Enum):
    GOOD       = "good"
    ACCEPTABLE = "acceptable"
    POOR       = "poor"
    UNUSABLE   = "unusable"


# ---------------------------------------------------------------------------
# Data contracts  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class LineFeature:
    """Raw observed features of a single palm line."""
    presence:   LinePresence
    length_pct: float
    depth:      Magnitude
    curvature:  LineCurvature
    continuity: float
    branches:   int
    islands:    int
    start_zone: str
    end_zone:   str


@dataclass
class FingerFeature:
    length:             FingerLength
    length_px:          float
    flexibility:        FingerFlexibility
    tip_shape:          str
    knuckle_prominence: Magnitude


@dataclass
class MountFeature:
    """Fleshy mound elevation relative to palm plane."""
    elevation: Magnitude
    firmness:  Magnitude
    location:  str


@dataclass
class SkinFeature:
    tone:       SkinTone
    texture:    SkinTexture
    moisture:   Magnitude
    elasticity: Magnitude
    color_cast: str


@dataclass
class GeometryFeature:
    palm_width_px:    float
    palm_length_px:   float
    palm_ratio:       float
    total_length_px:  float
    dominant_hand:    str
    finger_spread:    Magnitude


@dataclass
class MarriageLineFeature:
    """
    Marriage / union lines sit on the percussion edge of the palm,
    between the base of the pinky and the heart line.
    """
    count:         int
    lines:         List[Dict]
    strongest_idx: int


# ---------------------------------------------------------------------------
# Data contracts  (v4.0.0 — new dataclasses)
# ---------------------------------------------------------------------------

@dataclass
class ChildrenLineFeature:
    """
    Children lines are small vertical lines on the percussion edge,
    just above the marriage lines and running toward the heart line.
    Each line traditionally represents a potential child.
    """
    count:         int
    lines:         List[Dict]    # each: {strength, length_pct, clarity, position_pct}
    strongest_idx: int
    note:          str           # e.g. "3 lines detected — 2 strong, 1 faint"


@dataclass
class HealthMarker:
    """
    A specific health vulnerability or health-related marking on the palm.
    Derived from mount conditions, line interruptions, and minor lines.
    """
    marker_type:   str        # "mercury_line_strong", "island_life", "cross_saturn", etc.
    location:      str        # anatomical zone on the palm
    severity:      Magnitude  # LOW / MODERATE / HIGH
    system:        str        # body system: "digestive", "nervous", "cardiovascular", etc.
    note:          str        # plain description for Logic Layer


@dataclass
class SpiritualMarker:
    """
    Spiritual gift or psychic sensitivity indicator on the palm.
    Drawn from mount elevations, minor lines, and cross formations.
    """
    marker_type:   str          # "mystic_cross", "ring_of_solomon", "intuition_arc", etc.
    presence:      LinePresence # how clearly the marker appears
    strength:      Magnitude
    gift_indicated:str          # "psychic_sensitivity", "healing", "prophecy", etc.
    note:          str


@dataclass
class LifeLineAssessment:
    """
    Longevity and vitality assessment derived from life line characteristics.
    Does not replace astrology or numerology — adds a fourth-pillar signal.
    """
    longevity_indicator:        str       # "long", "average", "shortened"
    vitality_level:             Magnitude
    health_challenges_indicated:bool
    island_count:               int       # islands = temporary health disruptions
    break_count:                int       # breaks = major life disruptions
    fork_at_end:                bool      # fork = significant life change in later years
    chain_formation:            bool      # chained section = period of lowered vitality
    strength_over_time:         str       # "strengthening", "weakening", "consistent"
    assessment_note:            str


@dataclass
class FateLineAssessment:
    """
    Career and wealth potential assessment derived from the fate line.
    A strong, continuous fate line from the wrist indicates self-made success.
    """
    career_strength:  Magnitude
    wealth_potential: Magnitude
    career_start:     str       # "early" / "mid" / "late" / "absent"
    self_made:        bool      # line from wrist base = self-made; from luna = helped
    breaks_in_line:   int
    forks_detected:   int       # forks = career change or multiple income streams
    career_stability: str       # "stable", "varied", "late_bloomer", "absent"
    assessment_note:  str


@dataclass
class InfidelityMarker:
    """
    Fidelity or infidelity indicator from specific palm features.
    Multiple markers increase significance; single marker is contextual.
    """
    marker_type:   str        # "forked_heart", "girdle_venus", "high_venus_mount", etc.
    location:      str
    significance:  Magnitude
    direction:     str        # "risk_factor" / "stabilising"
    note:          str


# ---------------------------------------------------------------------------
# PalmFeatures  (v3.0.2 fields preserved exactly + v4.0.0 new fields appended)
# ---------------------------------------------------------------------------

@dataclass
class PalmFeatures:
    """
    Complete palm feature payload.
    This is the ONLY output this engine produces.
    The Logic Layer owns all interpretation.
    v4.0.0: 6 new optional fields appended — all existing fields unchanged.
    """
    # Metadata
    image_hash:    str
    hand_label:    str
    image_quality: ImageQuality
    confidence:    float
    processing_ms: int
    error:         Optional[str]  = None

    # Structural
    geometry:      Optional[GeometryFeature]      = None
    hand_shape:    Optional[HandShape]            = None

    # Fingers
    thumb:          Optional[FingerFeature]        = None
    index:          Optional[FingerFeature]        = None
    middle:         Optional[FingerFeature]        = None
    ring:           Optional[FingerFeature]        = None
    pinky:          Optional[FingerFeature]        = None
    finger_spacing: Optional[Dict[str, Magnitude]] = None

    # Major lines
    life_line:    Optional[LineFeature]           = None
    heart_line:   Optional[LineFeature]           = None
    head_line:    Optional[LineFeature]           = None
    fate_line:    Optional[LineFeature]           = None
    sun_line:     Optional[LineFeature]           = None
    mercury_line: Optional[LineFeature]           = None

    # Minor lines
    marriage_lines: Optional[MarriageLineFeature] = None
    girdle_venus:   Optional[LinePresence]        = None
    intuition_line: Optional[LinePresence]        = None
    via_lascivia:   Optional[LinePresence]        = None

    # Mounts
    mount_venus:      Optional[MountFeature]      = None
    mount_jupiter:    Optional[MountFeature]      = None
    mount_saturn:     Optional[MountFeature]      = None
    mount_apollo:     Optional[MountFeature]      = None
    mount_mercury:    Optional[MountFeature]      = None
    mount_mars_upper: Optional[MountFeature]      = None
    mount_mars_lower: Optional[MountFeature]      = None
    mount_moon:       Optional[MountFeature]      = None
    mount_neptune:    Optional[MountFeature]      = None

    # Skin
    skin: Optional[SkinFeature]                   = None

    # Special markings
    markings: List[Dict]                          = field(default_factory=list)

    # ── v4.0.0 new fields ────────────────────────────────────────────────
    children_lines:       Optional[ChildrenLineFeature] = None
    health_markers:       List[HealthMarker]            = field(default_factory=list)
    spiritual_markers:    List[SpiritualMarker]         = field(default_factory=list)
    life_line_assessment: Optional[LifeLineAssessment]  = None
    fate_line_assessment: Optional[FateLineAssessment]  = None
    infidelity_markers:   List[InfidelityMarker]        = field(default_factory=list)

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# CrossHandComparison and DualPalmFeatures  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

@dataclass
class LineDelta:
    presence_shift:        str
    depth_shift:           str
    continuity_delta:      float
    length_delta:          float
    branch_delta:          int
    island_delta:          int
    interpretation_signal: str


@dataclass
class CrossHandComparison:
    dominant_label:     str
    non_dominant_label: str
    shape_match:  bool
    shape_delta:  str
    life_line:    Optional[LineDelta] = None
    heart_line:   Optional[LineDelta] = None
    head_line:    Optional[LineDelta] = None
    fate_line:    Optional[LineDelta] = None
    sun_line:     Optional[LineDelta] = None
    mercury_line: Optional[LineDelta] = None
    marriage_count_delta: int = 0
    mount_deltas:  Dict[str, Dict] = field(default_factory=dict)
    finger_deltas: Dict[str, Dict] = field(default_factory=dict)
    comparison_confidence: float = 0.0

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class DualPalmFeatures:
    """
    Complete dual-hand payload delivered to the Logic Layer.
    Dominant hand = current life expression / choices made.
    Non-dominant  = innate blueprint / karmic baseline.
    Delta         = growth, suppression, or deviation from potential.
    """
    dominant:            PalmFeatures
    non_dominant:        PalmFeatures
    comparison:          CrossHandComparison
    total_processing_ms: int
    both_hands_valid:    bool
    partial_error:       Optional[str] = None

    def to_dict(self) -> Dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal geometry helpers  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _lm(landmarks, idx: int, h: int, w: int) -> Tuple[int, int]:
    pt = landmarks.landmark[idx]
    return int(pt.x * w), int(pt.y * h)


def _dist(p1: Tuple, p2: Tuple) -> float:
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def _angle_deg(p1: Tuple, p2: Tuple, p3: Tuple) -> float:
    v1 = (p1[0] - p2[0], p1[1] - p2[1])
    v2 = (p3[0] - p2[0], p3[1] - p2[1])
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    mag = math.sqrt(v1[0] ** 2 + v1[1] ** 2) * math.sqrt(v2[0] ** 2 + v2[1] ** 2)
    if mag == 0:
        return 0.0
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / mag))))


def _mirror_image(image_bytes: bytes) -> bytes:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is not None:
        mirrored = cv2.flip(img, 1)
        _, buffer = cv2.imencode(".jpg", mirrored)
        return buffer.tobytes()
    return image_bytes


def _enhance_image(image_bytes: bytes) -> bytes:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is not None:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced_lab = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        _, buffer = cv2.imencode(".jpg", enhanced)
        return buffer.tobytes()
    return image_bytes


# ---------------------------------------------------------------------------
# Image quality gate  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _assess_image_quality(gray: np.ndarray) -> Tuple[ImageQuality, float]:
    lap_var         = cv2.Laplacian(gray, cv2.CV_64F).var()
    mean_brightness = float(np.mean(gray))
    contrast        = float(np.std(gray))

    blur_ok     = lap_var > 60
    exposure_ok = 45 < mean_brightness < 225
    contrast_ok = contrast > 20

    passed = sum([blur_ok, exposure_ok, contrast_ok])

    if passed == 3:
        return ImageQuality.GOOD, 1.00
    elif passed == 2:
        return ImageQuality.ACCEPTABLE, 0.80
    elif passed == 1:
        return ImageQuality.POOR, 0.55
    else:
        return ImageQuality.UNUSABLE, 0.20


# ---------------------------------------------------------------------------
# Palm ROI isolation  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _extract_palm_roi(
    img: np.ndarray,
    landmarks,
    h: int,
    w: int,
) -> Tuple[np.ndarray, np.ndarray]:
    mp_h = mp.solutions.hands.HandLandmark

    hull_indices = [
        mp_h.WRIST,
        mp_h.THUMB_CMC, mp_h.THUMB_MCP,
        mp_h.INDEX_FINGER_MCP,
        mp_h.MIDDLE_FINGER_MCP,
        mp_h.RING_FINGER_MCP,
        mp_h.PINKY_MCP,
        mp_h.PINKY_TIP,
    ]
    points = np.array([_lm(landmarks, i, h, w) for i in hull_indices], dtype=np.int32)
    hull   = cv2.convexHull(points)

    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, hull, 255)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    mask   = cv2.erode(mask, kernel, iterations=1)

    masked = cv2.bitwise_and(img, img, mask=mask)
    return masked, mask


# ---------------------------------------------------------------------------
# Line detection  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _build_line_map(gray_masked: np.ndarray, mask: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    eq    = clahe.apply(gray_masked)

    thresh = cv2.adaptiveThreshold(
        eq, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=31,
        C=8,
    )
    thresh = cv2.bitwise_and(thresh, thresh, mask=mask)

    k_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    k_open  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, k_close)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN,  k_open)
    return cleaned


def _sample_zone(
    line_map: np.ndarray,
    zone: Tuple[int, int, int, int],
    palm_width: float,
) -> LineFeature:
    img_h, img_w = line_map.shape[:2]
    x, y, zw, zh = zone
    x  = max(0, x);  y  = max(0, y)
    x2 = min(img_w, x + zw)
    y2 = min(img_h, y + zh)

    roi = line_map[y:y2, x:x2]
    if roi.size == 0:
        return _absent_line()

    pixel_density = float(np.sum(roi > 0)) / roi.size

    if pixel_density < 0.018:
        return _absent_line()

    presence = (
        LinePresence.STRONG   if pixel_density > 0.14 else
        LinePresence.MODERATE if pixel_density > 0.055 else
        LinePresence.FAINT
    )

    n_slices      = max(1, (y2 - y) // 10)
    slice_h       = max(1, (y2 - y) // n_slices)
    filled_slices = 0
    for i in range(n_slices):
        sy1 = y + i * slice_h
        sy2 = min(img_h, sy1 + slice_h)
        band = line_map[sy1:sy2, x:x2]
        if band.size > 0 and float(np.sum(band > 0)) / band.size > 0.025:
            filled_slices += 1
    continuity = round(filled_slices / n_slices, 3)

    cols_active = int(np.any(roi > 0, axis=0).sum())
    length_pct  = round(cols_active / max(1, roi.shape[1]), 3)

    active_vals = roi[roi > 0]
    depth_val   = float(np.mean(active_vals)) / 255.0 if active_vals.size > 0 else 0.0
    depth = (
        Magnitude.HIGH     if depth_val > 0.68 else
        Magnitude.MODERATE if depth_val > 0.38 else
        Magnitude.LOW
    )

    half   = max(1, roi.shape[0] // 2)
    top_h  = roi[:half, :]
    bot_h  = roi[half:, :]

    def _col_cm(patch: np.ndarray) -> float:
        col_sums = np.sum(patch, axis=0).astype(float)
        total    = col_sums.sum()
        if total == 0:
            return patch.shape[1] / 2.0
        return float(np.dot(col_sums, np.arange(patch.shape[1])) / total)

    cm_diff = abs(_col_cm(top_h) - _col_cm(bot_h)) / max(1, roi.shape[1])
    curvature = (
        LineCurvature.CURVED   if cm_diff > 0.10 else
        LineCurvature.WAVY     if cm_diff > 0.05 else
        LineCurvature.STRAIGHT
    )

    _, _, stats, _ = cv2.connectedComponentsWithStats(roi)
    significant = [s for s in stats[1:] if s[cv2.CC_STAT_AREA] > 12]
    branches = max(0, len(significant) - 1)
    islands  = sum(
        1 for s in significant
        if s[cv2.CC_STAT_AREA] < 75 and s[cv2.CC_STAT_WIDTH] < zw * 0.10
    )

    return LineFeature(
        presence=presence, length_pct=length_pct, depth=depth,
        curvature=curvature, continuity=continuity, branches=branches,
        islands=islands, start_zone="auto", end_zone="auto",
    )


def _absent_line() -> LineFeature:
    return LineFeature(
        presence=LinePresence.ABSENT, length_pct=0.0,
        depth=Magnitude.LOW, curvature=LineCurvature.UNCLEAR,
        continuity=0.0, branches=0, islands=0,
        start_zone="unknown", end_zone="unknown",
    )


def _extract_all_lines(
    line_map: np.ndarray,
    landmarks,
    h: int, w: int,
    palm_width: float,
    palm_length: float,
) -> Dict[str, LineFeature]:
    mp_h = mp.solutions.hands.HandLandmark

    wrist     = _lm(landmarks, mp_h.WRIST,              h, w)
    idx_mcp   = _lm(landmarks, mp_h.INDEX_FINGER_MCP,   h, w)
    mid_mcp   = _lm(landmarks, mp_h.MIDDLE_FINGER_MCP,  h, w)
    ring_mcp  = _lm(landmarks, mp_h.RING_FINGER_MCP,    h, w)
    pinky_mcp = _lm(landmarks, mp_h.PINKY_MCP,          h, w)
    thumb_mcp = _lm(landmarks, mp_h.THUMB_MCP,          h, w)
    thumb_ip  = _lm(landmarks, mp_h.THUMB_IP,           h, w)

    pw = int(palm_width)
    pl = int(palm_length)

    life_zone = (
        int((thumb_mcp[0] + idx_mcp[0]) / 2) - pw // 4,
        thumb_mcp[1],
        pw // 3,
        int(abs(wrist[1] - thumb_mcp[1]) * 0.85),
    )
    heart_zone = (
        min(idx_mcp[0], pinky_mcp[0]) - pw // 10,
        int(idx_mcp[1] + (wrist[1] - idx_mcp[1]) * 0.13),
        abs(idx_mcp[0] - pinky_mcp[0]) + pw // 5,
        pl // 6,
    )
    head_zone = (
        thumb_ip[0],
        int(idx_mcp[1] + (wrist[1] - idx_mcp[1]) * 0.33),
        abs(pinky_mcp[0] - thumb_ip[0]),
        pl // 6,
    )
    fate_zone = (
        mid_mcp[0] - pw // 8,
        int(wrist[1] - pl * 0.88),
        pw // 4,
        int(pl * 0.78),
    )
    sun_zone = (
        ring_mcp[0] - pw // 10,
        int(ring_mcp[1] + (wrist[1] - ring_mcp[1]) * 0.08),
        pw // 5,
        int(pl * 0.45),
    )
    mercury_zone = (
        pinky_mcp[0] - pw // 10,
        int(pinky_mcp[1] + (wrist[1] - pinky_mcp[1]) * 0.08),
        pw // 5,
        int(pl * 0.50),
    )

    return {
        "life_line":    _sample_zone(line_map, life_zone,    palm_width),
        "heart_line":   _sample_zone(line_map, heart_zone,   palm_width),
        "head_line":    _sample_zone(line_map, head_zone,    palm_width),
        "fate_line":    _sample_zone(line_map, fate_zone,    palm_width),
        "sun_line":     _sample_zone(line_map, sun_zone,     palm_width),
        "mercury_line": _sample_zone(line_map, mercury_zone, palm_width),
    }


# ---------------------------------------------------------------------------
# Marriage lines  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _extract_marriage_lines(
    line_map: np.ndarray,
    landmarks,
    h: int, w: int,
    palm_width: float,
    palm_length: float,
) -> MarriageLineFeature:
    mp_h = mp.solutions.hands.HandLandmark

    pinky_mcp = _lm(landmarks, mp_h.PINKY_MCP,  h, w)
    idx_mcp   = _lm(landmarks, mp_h.INDEX_FINGER_MCP, h, w)

    heart_y  = int(idx_mcp[1] + (h - idx_mcp[1]) * 0.13)
    zone_x   = pinky_mcp[0]
    zone_y   = heart_y
    zone_w   = max(1, w - zone_x)
    zone_h   = max(1, abs(pinky_mcp[1] - heart_y))

    zone_x = max(0, zone_x);  zone_y = max(0, zone_y)
    zone_w = min(zone_w, w - zone_x)
    zone_h = min(zone_h, h - zone_y)

    roi = line_map[zone_y:zone_y + zone_h, zone_x:zone_x + zone_w]
    if roi.size == 0:
        return MarriageLineFeature(count=0, lines=[], strongest_idx=-1)

    slice_h    = max(3, zone_h // 14)
    step       = max(1, slice_h // 2)
    candidates = []

    for i in range(0, zone_h - slice_h + 1, step):
        band    = roi[i:i + slice_h, :]
        density = float(np.sum(band > 0)) / max(1, band.size)
        if density > 0.07:
            col_hit = float(np.sum(np.any(band > 0, axis=0))) / max(1, band.shape[1])
            candidates.append({
                "position_pct": round(i / zone_h, 3),
                "length_pct":   round(col_hit, 3),
                "depth": (
                    Magnitude.HIGH.value     if density > 0.18 else
                    Magnitude.MODERATE.value if density > 0.10 else
                    Magnitude.LOW.value
                ),
                "continuity": round(min(1.0, density / 0.18), 3),
            })

    merged: List[Dict] = []
    depth_rank = {Magnitude.HIGH.value: 3, Magnitude.MODERATE.value: 2, Magnitude.LOW.value: 1}
    for c in candidates:
        if merged and abs(c["position_pct"] - merged[-1]["position_pct"]) < 0.10:
            if depth_rank.get(c["depth"], 0) > depth_rank.get(merged[-1]["depth"], 0):
                merged[-1] = c
        else:
            merged.append(c)

    strongest_idx = -1
    if merged:
        strongest_idx = max(
            range(len(merged)),
            key=lambda i: depth_rank.get(merged[i]["depth"], 0)
        )

    return MarriageLineFeature(count=len(merged), lines=merged, strongest_idx=strongest_idx)


# ---------------------------------------------------------------------------
# Mount analysis  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _extract_mounts(
    gray: np.ndarray,
    mask: np.ndarray,
    landmarks,
    h: int, w: int,
) -> Dict[str, MountFeature]:
    mp_h = mp.solutions.hands.HandLandmark

    palm_pixels = gray[mask > 0]
    palm_mean   = float(np.mean(palm_pixels)) if palm_pixels.size > 0 else 128.0
    r           = max(10, int(w * 0.055))

    def _mount(center: Tuple[int, int], name: str) -> MountFeature:
        cx, cy = center
        x1 = max(0, cx - r);  y1 = max(0, cy - r)
        x2 = min(w, cx + r);  y2 = min(h, cy + r)
        region = gray[y1:y2, x1:x2]
        m_mask = mask[y1:y2, x1:x2]
        valid  = region[m_mask > 0]

        if valid.size < 20:
            return MountFeature(elevation=Magnitude.UNCLEAR, firmness=Magnitude.UNCLEAR, location=name)

        region_mean = float(np.mean(valid))
        region_std  = float(np.std(valid))

        delta = region_mean - palm_mean
        elevation = (
            Magnitude.HIGH     if delta > 14 else
            Magnitude.MODERATE if delta >  4 else
            Magnitude.LOW
        )
        firmness = (
            Magnitude.HIGH     if region_std < 17 else
            Magnitude.MODERATE if region_std < 30 else
            Magnitude.LOW
        )
        return MountFeature(elevation=elevation, firmness=firmness, location=name)

    wrist     = _lm(landmarks, mp_h.WRIST,             h, w)
    idx_mcp   = _lm(landmarks, mp_h.INDEX_FINGER_MCP,  h, w)
    mid_mcp   = _lm(landmarks, mp_h.MIDDLE_FINGER_MCP, h, w)
    ring_mcp  = _lm(landmarks, mp_h.RING_FINGER_MCP,   h, w)
    pinky_mcp = _lm(landmarks, mp_h.PINKY_MCP,         h, w)
    thumb_mcp = _lm(landmarks, mp_h.THUMB_MCP,         h, w)

    venus_center = (
        int((thumb_mcp[0] + wrist[0]) / 2),
        int((thumb_mcp[1] + wrist[1]) / 2),
    )
    moon_center = (
        int(pinky_mcp[0] + (w - pinky_mcp[0]) * 0.30),
        int(wrist[1] - (wrist[1] - pinky_mcp[1]) * 0.22),
    )
    neptune_center = (
        int((thumb_mcp[0] + pinky_mcp[0]) / 2),
        int(wrist[1] - (wrist[1] - mid_mcp[1]) * 0.04),
    )
    mars_upper_center = (
        int((idx_mcp[0] + pinky_mcp[0]) / 2),
        int(idx_mcp[1] + (wrist[1] - idx_mcp[1]) * 0.28),
    )
    mars_lower_center = (
        int((thumb_mcp[0] + idx_mcp[0]) / 2),
        int(idx_mcp[1] + (wrist[1] - idx_mcp[1]) * 0.50),
    )

    return {
        "mount_venus":       _mount(venus_center,      "venus"),
        "mount_jupiter":     _mount(idx_mcp,           "jupiter"),
        "mount_saturn":      _mount(mid_mcp,           "saturn"),
        "mount_apollo":      _mount(ring_mcp,          "apollo"),
        "mount_mercury":     _mount(pinky_mcp,         "mercury"),
        "mount_mars_upper":  _mount(mars_upper_center, "mars_upper"),
        "mount_mars_lower":  _mount(mars_lower_center, "mars_lower"),
        "mount_moon":        _mount(moon_center,       "moon"),
        "mount_neptune":     _mount(neptune_center,    "neptune"),
    }


# ---------------------------------------------------------------------------
# Finger analysis  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _classify_finger(
    landmarks,
    tip_idx: int,
    pip_idx: int,
    mcp_idx: int,
    h: int, w: int,
    avg_length: float,
) -> FingerFeature:
    tip = _lm(landmarks, tip_idx, h, w)
    pip = _lm(landmarks, pip_idx, h, w)
    mcp = _lm(landmarks, mcp_idx, h, w)

    length_px = _dist(tip, mcp)

    length = (
        FingerLength.LONG    if length_px > avg_length * 1.08 else
        FingerLength.SHORT   if length_px < avg_length * 0.92 else
        FingerLength.AVERAGE
    )

    pip_angle = _angle_deg(tip, pip, mcp)
    flexibility = (
        FingerFlexibility.FLEXIBLE if pip_angle > 175 else
        FingerFlexibility.STIFF   if pip_angle < 158 else
        FingerFlexibility.MODERATE
    )

    tip_to_pip  = _dist(tip, pip)
    tip_ratio   = tip_to_pip / max(1.0, length_px)
    tip_shape = (
        "pointed"   if tip_ratio < 0.25 else
        "rounded"   if tip_ratio < 0.36 else
        "square"    if tip_ratio < 0.46 else
        "spatulate"
    )

    knuckle_seg        = _dist(pip, mcp)
    knuckle_ratio      = knuckle_seg / max(1.0, length_px)
    knuckle_prominence = (
        Magnitude.HIGH     if knuckle_ratio > 0.54 else
        Magnitude.MODERATE if knuckle_ratio > 0.41 else
        Magnitude.LOW
    )

    return FingerFeature(
        length=length, length_px=round(length_px, 2),
        flexibility=flexibility, tip_shape=tip_shape,
        knuckle_prominence=knuckle_prominence,
    )


def _extract_fingers(
    landmarks, h: int, w: int
) -> Tuple[Dict[str, FingerFeature], Dict[str, Magnitude]]:
    mp_h = mp.solutions.hands.HandLandmark

    specs = [
        ("thumb",  mp_h.THUMB_TIP,         mp_h.THUMB_IP,           mp_h.THUMB_MCP),
        ("index",  mp_h.INDEX_FINGER_TIP,  mp_h.INDEX_FINGER_PIP,  mp_h.INDEX_FINGER_MCP),
        ("middle", mp_h.MIDDLE_FINGER_TIP, mp_h.MIDDLE_FINGER_PIP, mp_h.MIDDLE_FINGER_MCP),
        ("ring",   mp_h.RING_FINGER_TIP,   mp_h.RING_FINGER_PIP,   mp_h.RING_FINGER_MCP),
        ("pinky",  mp_h.PINKY_TIP,         mp_h.PINKY_PIP,         mp_h.PINKY_MCP),
    ]

    raw_lengths = []
    for _, ti, pi, mi in specs:
        raw_lengths.append(_dist(_lm(landmarks, ti, h, w), _lm(landmarks, mi, h, w)))
    avg_length = sum(raw_lengths) / len(raw_lengths)

    fingers: Dict[str, FingerFeature] = {}
    for name, ti, pi, mi in specs:
        fingers[name] = _classify_finger(landmarks, ti, pi, mi, h, w, avg_length)

    mcp_pts = [
        _lm(landmarks, mp_h.INDEX_FINGER_MCP,  h, w),
        _lm(landmarks, mp_h.MIDDLE_FINGER_MCP, h, w),
        _lm(landmarks, mp_h.RING_FINGER_MCP,   h, w),
        _lm(landmarks, mp_h.PINKY_MCP,         h, w),
    ]
    pair_names = ["index_middle", "middle_ring", "ring_pinky"]
    spacing: Dict[str, Magnitude] = {}
    ref_len = max(1.0, raw_lengths[1])
    for i, pair_name in enumerate(pair_names):
        gap   = _dist(mcp_pts[i], mcp_pts[i + 1])
        ratio = gap / ref_len
        spacing[pair_name] = (
            Magnitude.HIGH     if ratio > 0.35 else
            Magnitude.LOW      if ratio < 0.22 else
            Magnitude.MODERATE
        )

    return fingers, spacing


# ---------------------------------------------------------------------------
# Skin analysis  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _extract_skin(
    img_bgr: np.ndarray,
    gray: np.ndarray,
    mask: np.ndarray,
) -> SkinFeature:
    valid_gray  = gray[mask > 0]
    valid_color = img_bgr[mask > 0]

    if valid_gray.size == 0:
        return SkinFeature(
            tone=SkinTone.MEDIUM, texture=SkinTexture.MODERATE,
            moisture=Magnitude.MODERATE, elasticity=Magnitude.MODERATE,
            color_cast="neutral",
        )

    brightness  = float(np.mean(valid_gray))
    tone = (
        SkinTone.LIGHT     if brightness > 180 else
        SkinTone.MEDIUM    if brightness > 118 else
        SkinTone.DARK      if brightness > 68  else
        SkinTone.VERY_DARK
    )

    texture_std = float(np.std(valid_gray))
    texture = (
        SkinTexture.SMOOTH   if texture_std < 20 else
        SkinTexture.COARSE   if texture_std > 40 else
        SkinTexture.MODERATE
    )

    bright_ratio = float(np.sum(valid_gray > 228)) / max(1, valid_gray.size)
    moisture = (
        Magnitude.HIGH     if bright_ratio > 0.028 else
        Magnitude.LOW      if bright_ratio < 0.004 else
        Magnitude.MODERATE
    )

    lap      = np.abs(cv2.Laplacian(gray, cv2.CV_64F))
    lap_mean = float(np.mean(lap[mask > 0]))
    elasticity = (
        Magnitude.LOW      if lap_mean > 18 else
        Magnitude.HIGH     if lap_mean < 7  else
        Magnitude.MODERATE
    )

    mean_b = float(np.mean(valid_color[:, 0]))
    mean_g = float(np.mean(valid_color[:, 1]))
    mean_r = float(np.mean(valid_color[:, 2]))

    if mean_r > mean_g + 14 and mean_r > mean_b + 14:
        color_cast = "red"
    elif mean_g > mean_r + 9 and mean_g > mean_b + 9:
        color_cast = "yellow"
    elif mean_b > mean_r + 14 and mean_b > mean_g + 9:
        color_cast = "blue"
    elif brightness < 88:
        color_cast = "pale"
    else:
        color_cast = "neutral"

    return SkinFeature(
        tone=tone, texture=texture,
        moisture=moisture, elasticity=elasticity,
        color_cast=color_cast,
    )


# ---------------------------------------------------------------------------
# Geometry + hand shape  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _extract_geometry(
    landmarks, h: int, w: int, hand_label: str
) -> Tuple[GeometryFeature, HandShape]:
    mp_h = mp.solutions.hands.HandLandmark

    wrist     = _lm(landmarks, mp_h.WRIST,              h, w)
    idx_mcp   = _lm(landmarks, mp_h.INDEX_FINGER_MCP,   h, w)
    mid_mcp   = _lm(landmarks, mp_h.MIDDLE_FINGER_MCP,  h, w)
    mid_tip   = _lm(landmarks, mp_h.MIDDLE_FINGER_TIP,  h, w)
    pinky_mcp = _lm(landmarks, mp_h.PINKY_MCP,          h, w)

    palm_width  = _dist(idx_mcp, pinky_mcp)
    palm_length = abs(float(wrist[1]) - float(mid_mcp[1]))
    total_len   = abs(float(wrist[1]) - float(mid_tip[1]))
    palm_ratio  = palm_length / max(1.0, palm_width)

    angle  = _angle_deg(idx_mcp, wrist, pinky_mcp)
    spread = (
        Magnitude.HIGH     if angle > 35 else
        Magnitude.LOW      if angle < 18 else
        Magnitude.MODERATE
    )

    geo = GeometryFeature(
        palm_width_px   = round(palm_width, 2),
        palm_length_px  = round(palm_length, 2),
        palm_ratio      = round(palm_ratio, 3),
        total_length_px = round(total_len, 2),
        dominant_hand   = hand_label,
        finger_spread   = spread,
    )

    square_palm  = palm_ratio < 1.05
    mid_len      = abs(float(mid_mcp[1]) - float(mid_tip[1]))
    long_fingers = (mid_len / max(1.0, palm_length)) > 0.75

    if square_palm and not long_fingers:
        shape = HandShape.EARTH
    elif square_palm and long_fingers:
        shape = HandShape.AIR
    elif not square_palm and not long_fingers:
        shape = HandShape.FIRE
    elif not square_palm and long_fingers:
        shape = HandShape.WATER
    else:
        shape = HandShape.MIXED

    return geo, shape


# ---------------------------------------------------------------------------
# Image hash  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def _image_hash(image_bytes: bytes) -> str:
    return hashlib.sha256(image_bytes).hexdigest()[:16]


# ===========================================================================
# v4.0.0 — NEW EXTRACTION FUNCTIONS
# All v3.0.2 functions above are untouched.
# ===========================================================================

# ---------------------------------------------------------------------------
# Children lines extraction
# ---------------------------------------------------------------------------

def _extract_children_lines(
    line_map:     np.ndarray,
    landmarks,
    h: int, w: int,
    palm_width:   float,
    palm_length:  float,
    marriage_feat: Optional[MarriageLineFeature],
) -> ChildrenLineFeature:
    """
    Children lines are small VERTICAL lines on the percussion (ulnar) edge,
    found just above the marriage lines and below the heart line.
    They are distinguished from marriage lines by their vertical orientation
    and smaller scale.
    """
    mp_h = mp.solutions.hands.HandLandmark

    pinky_mcp = _lm(landmarks, mp_h.PINKY_MCP, h, w)
    idx_mcp   = _lm(landmarks, mp_h.INDEX_FINGER_MCP, h, w)

    heart_y   = int(idx_mcp[1] + (h - idx_mcp[1]) * 0.13)
    # Children lines zone: above marriage lines — between heart line and marriage area
    marriage_y_approx = int(idx_mcp[1] + (h - idx_mcp[1]) * 0.25)

    zone_x = max(0, pinky_mcp[0] - int(palm_width * 0.05))
    zone_y = max(0, heart_y)
    zone_w = max(1, w - zone_x)
    zone_h = max(1, abs(marriage_y_approx - heart_y))

    zone_w = min(zone_w, w - zone_x)
    zone_h = min(zone_h, h - zone_y)

    roi = line_map[zone_y:zone_y + zone_h, zone_x:zone_x + zone_w]
    if roi.size == 0:
        return ChildrenLineFeature(count=0, lines=[], strongest_idx=-1, note="No children line zone detected")

    # Scan VERTICAL bands (children lines run vertically)
    if roi.shape[1] < 3:
        return ChildrenLineFeature(count=0, lines=[], strongest_idx=-1, note="Zone too narrow")

    slice_w    = max(2, roi.shape[1] // 12)
    step       = max(1, slice_w // 2)
    candidates = []
    depth_rank = {Magnitude.HIGH.value: 3, Magnitude.MODERATE.value: 2, Magnitude.LOW.value: 1}

    for i in range(0, roi.shape[1] - slice_w + 1, step):
        band    = roi[:, i:i + slice_w]
        density = float(np.sum(band > 0)) / max(1, band.size)
        if density > 0.06:
            # Verify vertical orientation: more rows active than columns
            rows_active = int(np.any(band > 0, axis=1).sum())
            row_pct     = rows_active / max(1, band.shape[0])
            if row_pct > 0.25:   # Must span at least 25% of zone height
                candidates.append({
                    "position_pct": round(i / roi.shape[1], 3),
                    "length_pct":   round(row_pct, 3),
                    "strength": (
                        Magnitude.HIGH.value     if density > 0.16 else
                        Magnitude.MODERATE.value if density > 0.09 else
                        Magnitude.LOW.value
                    ),
                    "clarity": round(min(1.0, density / 0.16), 3),
                })

    # Merge adjacent vertical bands (same line detected in adjacent positions)
    merged: List[Dict] = []
    for c in candidates:
        if merged and abs(c["position_pct"] - merged[-1]["position_pct"]) < 0.08:
            if depth_rank.get(c["strength"], 0) > depth_rank.get(merged[-1]["strength"], 0):
                merged[-1] = c
        else:
            merged.append(c)

    strongest_idx = -1
    if merged:
        strongest_idx = max(
            range(len(merged)),
            key=lambda i: depth_rank.get(merged[i]["strength"], 0)
        )

    strong_count    = sum(1 for m in merged if m["strength"] == Magnitude.HIGH.value)
    moderate_count  = sum(1 for m in merged if m["strength"] == Magnitude.MODERATE.value)
    faint_count     = len(merged) - strong_count - moderate_count

    note = (
        f"{len(merged)} children line{'s' if len(merged) != 1 else ''} detected"
        + (f" — {strong_count} strong" if strong_count else "")
        + (f", {moderate_count} moderate" if moderate_count else "")
        + (f", {faint_count} faint" if faint_count else "")
        if merged else "No children lines detected in this zone"
    )

    return ChildrenLineFeature(
        count         = len(merged),
        lines         = merged,
        strongest_idx = strongest_idx,
        note          = note,
    )


# ---------------------------------------------------------------------------
# Health markers extraction
# ---------------------------------------------------------------------------

def _extract_health_markers(
    lines:  Dict[str, LineFeature],
    mounts: Dict[str, MountFeature],
    skin:   Optional[SkinFeature],
) -> List[HealthMarker]:
    """
    Derive health vulnerability markers from already-extracted features.
    Does NOT re-process the image — uses LineFeature and MountFeature data.
    """
    markers: List[HealthMarker] = []

    life = lines.get("life_line")
    heart = lines.get("heart_line")
    head  = lines.get("head_line")
    merc  = lines.get("mercury_line")

    # Life line islands — temporary health disruptions
    if life and life.islands > 0:
        markers.append(HealthMarker(
            marker_type = "islands_life_line",
            location    = "life_line",
            severity    = Magnitude.HIGH if life.islands >= 3 else Magnitude.MODERATE,
            system      = "general_vitality",
            note        = (
                f"{life.islands} island formation{'s' if life.islands > 1 else ''} "
                "on the life line — periods of lowered vitality or health challenges indicated."
            ),
        ))

    # Life line breaks — major disruptions
    if life and life.branches >= 3:
        markers.append(HealthMarker(
            marker_type = "breaks_life_line",
            location    = "life_line",
            severity    = Magnitude.MODERATE,
            system      = "general_vitality",
            note        = (
                "Multiple branch points on the life line suggest significant life "
                "transitions that may involve health shifts."
            ),
        ))

    # Mercury / health line strong presence
    if merc and merc.presence in (LinePresence.STRONG, LinePresence.MODERATE):
        markers.append(HealthMarker(
            marker_type = "health_line_present",
            location    = "mercury_line",
            severity    = Magnitude.LOW,
            system      = "digestive_nervous",
            note        = (
                "Health/Mercury line present — "
                "traditionally indicates sensitivity in the digestive or nervous system. "
                "Presence itself is neutral; interruptions are the concern."
            ),
        ))

    # Mercury line with islands — digestive concern
    if merc and merc.islands > 0:
        markers.append(HealthMarker(
            marker_type = "islands_mercury_line",
            location    = "mercury_line",
            severity    = Magnitude.MODERATE,
            system      = "digestive",
            note        = (
                "Islands on the health/Mercury line suggest periodic digestive "
                "or intestinal sensitivity."
            ),
        ))

    # Head line islands — mental/neurological concern
    if head and head.islands >= 2:
        markers.append(HealthMarker(
            marker_type = "islands_head_line",
            location    = "head_line",
            severity    = Magnitude.MODERATE,
            system      = "nervous_mental",
            note        = (
                f"{head.islands} islands on the head line — "
                "periods of mental stress, headaches, or neurological sensitivity indicated."
            ),
        ))

    # Heart line disruptions — cardiovascular
    if heart and heart.islands >= 2:
        markers.append(HealthMarker(
            marker_type = "islands_heart_line",
            location    = "heart_line",
            severity    = Magnitude.MODERATE,
            system      = "cardiovascular",
            note        = (
                "Islands on the heart line suggest periods of emotional stress "
                "that may manifest as cardiovascular sensitivity."
            ),
        ))

    # Mount of Saturn condition — skeletal/structural health
    sat_mount = mounts.get("mount_saturn")
    if sat_mount and sat_mount.elevation == Magnitude.HIGH:
        markers.append(HealthMarker(
            marker_type = "elevated_saturn_mount",
            location    = "mount_saturn",
            severity    = Magnitude.LOW,
            system      = "skeletal_structural",
            note        = (
                "Elevated Saturn mount — traditionally associated with bone, "
                "joint, and structural health focus."
            ),
        ))

    # Mount of Jupiter — liver/digestion
    jup_mount = mounts.get("mount_jupiter")
    if jup_mount and jup_mount.elevation == Magnitude.HIGH:
        markers.append(HealthMarker(
            marker_type = "elevated_jupiter_mount",
            location    = "mount_jupiter",
            severity    = Magnitude.LOW,
            system      = "liver_digestive",
            note        = (
                "High Jupiter mount — traditional indicator of strong constitution "
                "with some tendency toward excess in diet."
            ),
        ))

    # Skin color cast health indicators
    if skin:
        if skin.color_cast == "yellow":
            markers.append(HealthMarker(
                marker_type = "yellow_skin_cast",
                location    = "overall_skin",
                severity    = Magnitude.MODERATE,
                system      = "liver_biliary",
                note        = (
                    "Yellow skin cast detected — traditional indicator of liver "
                    "or biliary system sensitivity."
                ),
            ))
        elif skin.color_cast == "pale":
            markers.append(HealthMarker(
                marker_type = "pale_skin_cast",
                location    = "overall_skin",
                severity    = Magnitude.LOW,
                system      = "circulatory",
                note        = (
                    "Pale skin tone — traditional indicator of circulatory sensitivity "
                    "or reduced vitality."
                ),
            ))

    return markers


# ---------------------------------------------------------------------------
# Spiritual markers extraction
# ---------------------------------------------------------------------------

def _extract_spiritual_markers(
    mounts:         Dict[str, MountFeature],
    lines:          Dict[str, LineFeature],
    line_map:       Optional[np.ndarray],
    landmarks,
    h: int, w: int,
) -> List[SpiritualMarker]:
    """
    Detect spiritual gift indicators from mount elevations, minor lines,
    and cross formations on the palm.
    """
    markers: List[SpiritualMarker] = []

    moon_mount = mounts.get("mount_moon")
    nept_mount = mounts.get("mount_neptune")
    merc_mount = mounts.get("mount_mercury")
    jup_mount  = mounts.get("mount_jupiter")

    # Moon mount elevation — psychic sensitivity / intuition
    if moon_mount and moon_mount.elevation in (Magnitude.HIGH, Magnitude.MODERATE):
        strength  = moon_mount.elevation
        presence  = LinePresence.STRONG if strength == Magnitude.HIGH else LinePresence.MODERATE
        markers.append(SpiritualMarker(
            marker_type    = "elevated_moon_mount",
            presence       = presence,
            strength       = strength,
            gift_indicated = "psychic_sensitivity",
            note           = (
                f"{'Strongly' if strength == Magnitude.HIGH else 'Moderately'} elevated "
                "Moon mount — traditional indicator of psychic sensitivity, vivid dreams, "
                "and strong connection to intuitive knowing."
            ),
        ))

    # Neptune mount elevation — spiritual mediumship / bridge between worlds
    if nept_mount and nept_mount.elevation == Magnitude.HIGH:
        markers.append(SpiritualMarker(
            marker_type    = "elevated_neptune_mount",
            presence       = LinePresence.STRONG,
            strength       = Magnitude.HIGH,
            gift_indicated = "spiritual_mediumship",
            note           = (
                "High Neptune mount — rare indicator of natural mediumistic ability "
                "and thin veil between physical and spirit world."
            ),
        ))

    # Mercury mount + mercury line — healing and communication gifts
    if merc_mount and merc_mount.elevation == Magnitude.HIGH:
        merc_line = lines.get("mercury_line")
        if merc_line and merc_line.presence in (LinePresence.STRONG, LinePresence.MODERATE):
            markers.append(SpiritualMarker(
                marker_type    = "mercury_mount_line_combo",
                presence       = LinePresence.STRONG,
                strength       = Magnitude.HIGH,
                gift_indicated = "healing_communication",
                note           = (
                    "High Mercury mount + Mercury line — indicator of natural healing "
                    "ability and intuitive communication gifts."
                ),
            ))

    # Jupiter mount — spiritual authority / teacher indicator
    if jup_mount and jup_mount.elevation == Magnitude.HIGH:
        markers.append(SpiritualMarker(
            marker_type    = "elevated_jupiter_mount",
            presence       = LinePresence.MODERATE,
            strength       = Magnitude.MODERATE,
            gift_indicated = "spiritual_leadership",
            note           = (
                "High Jupiter mount — traditional indicator of spiritual authority, "
                "natural leadership, and capacity to guide others."
            ),
        ))

    # Heart line curvature — empathy depth indicator
    heart = lines.get("heart_line")
    if heart and heart.curvature == LineCurvature.CURVED and heart.presence == LinePresence.STRONG:
        markers.append(SpiritualMarker(
            marker_type    = "curved_strong_heart_line",
            presence       = LinePresence.MODERATE,
            strength       = Magnitude.MODERATE,
            gift_indicated = "deep_empathy",
            note           = (
                "Strongly curved heart line — indicator of deep empathic capacity "
                "and spiritually-oriented emotional life."
            ),
        ))

    # Head line — if wavy, suggests intuitive thinking style
    head = lines.get("head_line")
    if head and head.curvature == LineCurvature.WAVY:
        markers.append(SpiritualMarker(
            marker_type    = "wavy_head_line",
            presence       = LinePresence.FAINT,
            strength       = Magnitude.LOW,
            gift_indicated = "intuitive_cognition",
            note           = (
                "Wavy head line — indicator of intuitive rather than purely rational "
                "thinking style. Creative and imaginative cognition."
            ),
        ))

    return markers


# ---------------------------------------------------------------------------
# Life line assessment (longevity)
# ---------------------------------------------------------------------------

def _assess_life_line(life: Optional[LineFeature]) -> Optional[LifeLineAssessment]:
    """
    Derive longevity and vitality assessment from an extracted LineFeature.
    Works on the already-computed LineFeature — does not re-process image.
    """
    if life is None or life.presence == LinePresence.ABSENT:
        return LifeLineAssessment(
            longevity_indicator         = "unclear",
            vitality_level              = Magnitude.UNCLEAR,
            health_challenges_indicated = False,
            island_count                = 0,
            break_count                 = 0,
            fork_at_end                 = False,
            chain_formation             = False,
            strength_over_time          = "unclear",
            assessment_note             = "Life line not detected — longevity cannot be assessed from palm.",
        )

    # Longevity from length
    if life.length_pct >= 0.80:
        longevity = "long"
    elif life.length_pct >= 0.55:
        longevity = "average"
    else:
        longevity = "shortened"

    # Vitality from presence + continuity
    if life.presence == LinePresence.STRONG and life.continuity >= 0.75:
        vitality = Magnitude.HIGH
    elif life.presence in (LinePresence.STRONG, LinePresence.MODERATE) and life.continuity >= 0.50:
        vitality = Magnitude.MODERATE
    else:
        vitality = Magnitude.LOW

    # Challenges from islands
    challenges = life.islands > 0

    # Fork at end: branches > 1 near end of line
    fork_at_end = life.branches >= 2

    # Chain formation proxy: low continuity with many islands
    chain_formation = life.islands >= 2 and life.continuity < 0.60

    # Strength over time: depth + continuity together
    if life.depth == Magnitude.HIGH and life.continuity >= 0.80:
        strength_over_time = "strengthening"
    elif life.depth == Magnitude.LOW or life.continuity < 0.40:
        strength_over_time = "weakening"
    else:
        strength_over_time = "consistent"

    # Assessment note
    note_parts = [f"Life line {life.presence.value} — length {round(life.length_pct*100)}% of palm."]
    if life.islands > 0:
        note_parts.append(f"{life.islands} island formation{'s' if life.islands > 1 else ''} indicating temporary health challenges.")
    if fork_at_end:
        note_parts.append("Fork at end indicates a significant life direction change in later years.")
    if chain_formation:
        note_parts.append("Chain-like formation suggests a period of reduced vitality.")
    note_parts.append(f"Vitality: {vitality.value}. Longevity indicator: {longevity}.")

    return LifeLineAssessment(
        longevity_indicator         = longevity,
        vitality_level              = vitality,
        health_challenges_indicated = challenges,
        island_count                = life.islands,
        break_count                 = max(0, life.branches - 1),
        fork_at_end                 = fork_at_end,
        chain_formation             = chain_formation,
        strength_over_time          = strength_over_time,
        assessment_note             = " ".join(note_parts),
    )


# ---------------------------------------------------------------------------
# Fate line assessment (career/wealth)
# ---------------------------------------------------------------------------

def _assess_fate_line(fate: Optional[LineFeature]) -> Optional[FateLineAssessment]:
    """
    Derive career and wealth potential from an extracted fate line LineFeature.
    """
    if fate is None or fate.presence == LinePresence.ABSENT:
        return FateLineAssessment(
            career_strength  = Magnitude.LOW,
            wealth_potential = Magnitude.LOW,
            career_start     = "absent",
            self_made        = False,
            breaks_in_line   = 0,
            forks_detected   = 0,
            career_stability = "absent",
            assessment_note  = (
                "Fate/Saturn line absent or very faint — career is driven by personal choice "
                "rather than a strong predestined path. Adaptability is the primary career asset."
            ),
        )

    # Career strength from presence
    if fate.presence == LinePresence.STRONG and fate.continuity >= 0.70:
        career_strength = Magnitude.HIGH
    elif fate.presence in (LinePresence.STRONG, LinePresence.MODERATE):
        career_strength = Magnitude.MODERATE
    else:
        career_strength = Magnitude.LOW

    # Wealth potential: depth + length
    if fate.depth == Magnitude.HIGH and fate.length_pct >= 0.70:
        wealth_potential = Magnitude.HIGH
    elif fate.depth in (Magnitude.HIGH, Magnitude.MODERATE) and fate.length_pct >= 0.45:
        wealth_potential = Magnitude.MODERATE
    else:
        wealth_potential = Magnitude.LOW

    # Career start from line length (longer = earlier start)
    if fate.length_pct >= 0.80:
        career_start = "early"
    elif fate.length_pct >= 0.55:
        career_start = "mid"
    else:
        career_start = "late"

    # Self-made proxy: strong line with high continuity from base = self-made
    self_made = fate.continuity >= 0.70 and fate.length_pct >= 0.65

    breaks       = max(0, fate.islands)
    forks        = max(0, fate.branches - 1)

    if fate.presence == LinePresence.ABSENT:
        stability = "absent"
    elif breaks == 0 and fate.continuity >= 0.75:
        stability = "stable"
    elif forks >= 2:
        stability = "varied"
    elif career_start == "late":
        stability = "late_bloomer"
    else:
        stability = "stable"

    note_parts = [
        f"Fate line {fate.presence.value}, length {round(fate.length_pct*100)}%, "
        f"continuity {round(fate.continuity*100)}%."
    ]
    if self_made:
        note_parts.append("Strong unbroken line — self-made career trajectory indicated.")
    if forks >= 2:
        note_parts.append(f"{forks} fork points — multiple career directions or income streams.")
    if breaks >= 2:
        note_parts.append(f"{breaks} breaks — career interruptions or major pivots indicated.")

    return FateLineAssessment(
        career_strength  = career_strength,
        wealth_potential = wealth_potential,
        career_start     = career_start,
        self_made        = self_made,
        breaks_in_line   = breaks,
        forks_detected   = forks,
        career_stability = stability,
        assessment_note  = " ".join(note_parts),
    )


# ---------------------------------------------------------------------------
# Infidelity markers extraction
# ---------------------------------------------------------------------------

def _extract_infidelity_markers(
    lines:          Dict[str, LineFeature],
    mounts:         Dict[str, MountFeature],
    marriage_feat:  Optional[MarriageLineFeature],
) -> List[InfidelityMarker]:
    """
    Extract fidelity / infidelity indicators from palm features.
    Multiple markers increase significance; single marker is contextual only.
    """
    markers: List[InfidelityMarker] = []

    heart  = lines.get("heart_line")
    venus  = mounts.get("mount_venus")

    # Forked heart line — divided affections / dual attachments
    if heart and heart.branches >= 2:
        markers.append(InfidelityMarker(
            marker_type  = "forked_heart_line",
            location     = "heart_line",
            significance = Magnitude.HIGH if heart.branches >= 3 else Magnitude.MODERATE,
            direction    = "risk_factor",
            note         = (
                f"Heart line has {heart.branches} fork points — "
                "traditionally indicates divided affections or capacity for "
                "simultaneous emotional connections."
            ),
        ))

    # Chained heart line — scattered emotional energy
    if heart and heart.islands >= 2:
        markers.append(InfidelityMarker(
            marker_type  = "chained_heart_line",
            location     = "heart_line",
            significance = Magnitude.MODERATE,
            direction    = "risk_factor",
            note         = (
                "Islands on heart line indicate emotional inconsistency "
                "and difficulty with sustained fidelity during these periods."
            ),
        ))

    # Very high Venus mount — strong physical/sensual drive
    if venus and venus.elevation == Magnitude.HIGH and venus.firmness == Magnitude.HIGH:
        markers.append(InfidelityMarker(
            marker_type  = "high_firm_venus_mount",
            location     = "mount_venus",
            significance = Magnitude.MODERATE,
            direction    = "risk_factor",
            note         = (
                "High and firm Venus mount — strong sensual and physical drive. "
                "Without a strong fate/life line, impulse control requires conscious effort."
            ),
        ))

    # Very low Venus mount — reduced physical desire, stabilising
    if venus and venus.elevation == Magnitude.LOW:
        markers.append(InfidelityMarker(
            marker_type  = "low_venus_mount",
            location     = "mount_venus",
            significance = Magnitude.LOW,
            direction    = "stabilising",
            note         = (
                "Low Venus mount — reduced physical drive; fidelity comes naturally "
                "from lower sensual appetite."
            ),
        ))

    # Multiple deep marriage lines — multiple significant relationships
    if marriage_feat and marriage_feat.count >= 3:
        depth_rank = {"high": 3, "moderate": 2, "low": 1}
        deep_count = sum(
            1 for line in marriage_feat.lines
            if depth_rank.get(line.get("depth", "low"), 0) >= 2
        )
        if deep_count >= 2:
            markers.append(InfidelityMarker(
                marker_type  = "multiple_deep_marriage_lines",
                location     = "percussion_edge",
                significance = Magnitude.MODERATE,
                direction    = "risk_factor",
                note         = (
                    f"{deep_count} deep marriage/union lines detected — "
                    "indicates strong capacity for deep connections; "
                    "multiple significant relationships likely across the lifetime."
                ),
            ))

    # Strong continuous life line — stabilising fidelity indicator
    life = lines.get("life_line")
    if life and life.presence == LinePresence.STRONG and life.continuity >= 0.80:
        markers.append(InfidelityMarker(
            marker_type  = "strong_continuous_life_line",
            location     = "life_line",
            significance = Magnitude.MODERATE,
            direction    = "stabilising",
            note         = (
                "Strong continuous life line — indicates consistent character "
                "and reliable follow-through on commitments, including fidelity."
            ),
        ))

    return markers


# ===========================================================================
# Main engine  (v3.0.2 preserved + v4.0.0 new calls in _extract_single)
# ===========================================================================

class PalmEngine:
    """
    Stateless, thread-safe palm feature extraction engine.
    v4.0.0: _extract_single extended with 6 new extraction calls.
    All v3.0.2 logic preserved exactly.
    """

    _MP_CONFIG = dict(
        static_image_mode        = True,
        max_num_hands            = 1,
        min_detection_confidence = 0.5,
        model_complexity         = 1,
    )

    def extract(self, image_bytes: bytes, hand_label: str = "right") -> PalmFeatures:
        t0 = time.monotonic()

        result = self._extract_single(image_bytes, hand_label, t0)

        if hand_label == "left" and result.error and "No hand detected" in result.error:
            logger.info("Left hand detection failed, trying enhancement strategies...")

            enhanced_bytes = _enhance_image(image_bytes)
            result = self._extract_single(enhanced_bytes, hand_label, t0)

            if result.error and "No hand detected" in result.error:
                logger.info("Trying mirrored image for left hand...")
                mirrored_bytes = _mirror_image(image_bytes)
                result = self._extract_single(mirrored_bytes, "right", t0)
                if not result.error:
                    result.hand_label = "left"
                    logger.info("Left hand detection succeeded after mirroring")

            if result.error and "No hand detected" in result.error:
                logger.info("Trying enhanced + mirrored image for left hand...")
                enhanced_mirrored = _mirror_image(enhanced_bytes)
                result = self._extract_single(enhanced_mirrored, "right", t0)
                if not result.error:
                    result.hand_label = "left"
                    logger.info("Left hand detection succeeded after enhancement + mirroring")

        return result

    def _extract_single(self, image_bytes: bytes, hand_label: str, t0: float) -> PalmFeatures:
        """Internal extraction method — v4.0.0 adds 6 new feature extractions."""
        img_hash = _image_hash(image_bytes)

        nparr = np.frombuffer(image_bytes, np.uint8)
        img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return PalmFeatures(
                image_hash=img_hash, hand_label=hand_label,
                image_quality=ImageQuality.UNUSABLE, confidence=0.0,
                processing_ms=0,
                error="Image decode failed. Ensure JPEG/PNG/WebP format.",
            )

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        rgb  = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        quality, quality_modifier = _assess_image_quality(gray)
        if quality == ImageQuality.UNUSABLE:
            return PalmFeatures(
                image_hash=img_hash, hand_label=hand_label,
                image_quality=quality, confidence=0.0,
                processing_ms=int((time.monotonic() - t0) * 1000),
                error=(
                    "Image quality insufficient for analysis. "
                    "Retake in good lighting with palm in focus and clearly visible."
                ),
            )

        with mp.solutions.hands.Hands(**self._MP_CONFIG) as hands:
            result = hands.process(rgb)

        if not result.multi_hand_landmarks:
            return PalmFeatures(
                image_hash=img_hash, hand_label=hand_label,
                image_quality=quality, confidence=0.0,
                processing_ms=int((time.monotonic() - t0) * 1000),
                error=(
                    "No hand detected. Ensure palm faces the camera "
                    "with all fingers visible and good lighting."
                ),
            )

        landmarks  = result.multi_hand_landmarks[0]
        mp_conf    = result.multi_handedness[0].classification[0].score
        confidence = round(float(mp_conf) * quality_modifier, 3)

        # ── v3.0.2 extractions (preserved exactly) ─────────────────────
        geometry, shape = _extract_geometry(landmarks, h, w, hand_label)
        palm_width  = geometry.palm_width_px
        palm_length = geometry.palm_length_px

        masked_img, palm_mask = _extract_palm_roi(img, landmarks, h, w)
        masked_gray = cv2.cvtColor(masked_img, cv2.COLOR_BGR2GRAY)

        line_map = _build_line_map(masked_gray, palm_mask)

        lines    = _extract_all_lines(line_map, landmarks, h, w, palm_width, palm_length)
        marriage = _extract_marriage_lines(line_map, landmarks, h, w, palm_width, palm_length)
        mounts   = _extract_mounts(gray, palm_mask, landmarks, h, w)
        fingers, spacing = _extract_fingers(landmarks, h, w)
        skin     = _extract_skin(img, gray, palm_mask)

        # ── v4.0.0 new extractions ──────────────────────────────────────
        children      = _extract_children_lines(
            line_map, landmarks, h, w, palm_width, palm_length, marriage
        )
        health_mkrs   = _extract_health_markers(lines, mounts, skin)
        spirit_mkrs   = _extract_spiritual_markers(mounts, lines, line_map, landmarks, h, w)
        life_assess   = _assess_life_line(lines.get("life_line"))
        fate_assess   = _assess_fate_line(lines.get("fate_line"))
        infid_mkrs    = _extract_infidelity_markers(lines, mounts, marriage)

        processing_ms = int((time.monotonic() - t0) * 1000)
        logger.info(
            "PalmEngine.extract completed",
            extra={
                "image_hash":       img_hash,
                "hand_label":       hand_label,
                "quality":          quality.value,
                "confidence":       confidence,
                "processing_ms":    processing_ms,
                "hand_shape":       shape.value,
                "children_lines":   children.count,
                "health_markers":   len(health_mkrs),
                "spiritual_markers":len(spirit_mkrs),
                "infidelity_markers":len(infid_mkrs),
            },
        )

        return PalmFeatures(
            image_hash    = img_hash,
            hand_label    = hand_label,
            image_quality = quality,
            confidence    = confidence,
            processing_ms = processing_ms,

            geometry   = geometry,
            hand_shape = shape,

            thumb  = fingers.get("thumb"),
            index  = fingers.get("index"),
            middle = fingers.get("middle"),
            ring   = fingers.get("ring"),
            pinky  = fingers.get("pinky"),
            finger_spacing = spacing,

            life_line    = lines.get("life_line"),
            heart_line   = lines.get("heart_line"),
            head_line    = lines.get("head_line"),
            fate_line    = lines.get("fate_line"),
            sun_line     = lines.get("sun_line"),
            mercury_line = lines.get("mercury_line"),

            marriage_lines = marriage,

            mount_venus      = mounts.get("mount_venus"),
            mount_jupiter    = mounts.get("mount_jupiter"),
            mount_saturn     = mounts.get("mount_saturn"),
            mount_apollo     = mounts.get("mount_apollo"),
            mount_mercury    = mounts.get("mount_mercury"),
            mount_mars_upper = mounts.get("mount_mars_upper"),
            mount_mars_lower = mounts.get("mount_mars_lower"),
            mount_moon       = mounts.get("mount_moon"),
            mount_neptune    = mounts.get("mount_neptune"),

            skin     = skin,
            markings = [],

            # v4.0.0 new fields
            children_lines       = children,
            health_markers       = health_mkrs,
            spiritual_markers    = spirit_mkrs,
            life_line_assessment = life_assess,
            fate_line_assessment = fate_assess,
            infidelity_markers   = infid_mkrs,
        )

    # ------------------------------------------------------------------
    # Cross-hand comparison  (v3.0.2 — preserved exactly)
    # ------------------------------------------------------------------

    @staticmethod
    def _line_delta(
        dom: Optional[LineFeature],
        non: Optional[LineFeature],
    ) -> Optional[LineDelta]:
        if dom is None and non is None:
            return None

        absent = _absent_line()
        d = dom if dom is not None else absent
        n = non if non is not None else absent

        if d.presence == n.presence:
            presence_shift = "same"
        else:
            presence_shift = f"{n.presence.value}->{d.presence.value}"

        if d.depth == n.depth:
            depth_shift = "same"
        else:
            depth_shift = f"{n.depth.value}->{d.depth.value}"

        continuity_delta = round(d.continuity - n.continuity, 3)
        length_delta     = round(d.length_pct  - n.length_pct,  3)
        branch_delta     = d.branches - n.branches
        island_delta     = d.islands  - n.islands

        presence_rank = {
            LinePresence.STRONG:   4,
            LinePresence.MODERATE: 3,
            LinePresence.FAINT:    2,
            LinePresence.ABSENT:   1,
            LinePresence.UNCLEAR:  0,
        }
        dom_rank = presence_rank.get(d.presence, 0)
        non_rank = presence_rank.get(n.presence, 0)
        diff     = dom_rank - non_rank

        if diff == 0 and abs(continuity_delta) < 0.1:
            signal = "unchanged"
        elif diff > 1:
            signal = "overexpressed"
        elif diff == 1 or continuity_delta > 0.15:
            signal = "developed"
        elif diff < -1:
            signal = "suppressed"
        elif diff == -1 or continuity_delta < -0.15:
            signal = "compensated"
        else:
            signal = "unchanged"

        return LineDelta(
            presence_shift        = presence_shift,
            depth_shift           = depth_shift,
            continuity_delta      = continuity_delta,
            length_delta          = length_delta,
            branch_delta          = branch_delta,
            island_delta          = island_delta,
            interpretation_signal = signal,
        )

    @staticmethod
    def _mount_delta(
        dom_mount: Optional[MountFeature],
        non_mount: Optional[MountFeature],
        name: str,
    ) -> Dict:
        rank = {
            Magnitude.HIGH:     3,
            Magnitude.MODERATE: 2,
            Magnitude.LOW:      1,
            Magnitude.UNCLEAR:  0,
        }
        d_elev = dom_mount.elevation if dom_mount else Magnitude.UNCLEAR
        n_elev = non_mount.elevation if non_mount else Magnitude.UNCLEAR
        diff   = rank.get(d_elev, 0) - rank.get(n_elev, 0)

        signal = (
            "developed"  if diff > 0 else
            "suppressed" if diff < 0 else
            "unchanged"
        )
        return {
            "dominant":     d_elev.value,
            "non_dominant": n_elev.value,
            "signal":       signal,
        }

    @staticmethod
    def _finger_delta(
        dom_finger: Optional[FingerFeature],
        non_finger: Optional[FingerFeature],
        name: str,
    ) -> Dict:
        rank  = {FingerLength.LONG: 3, FingerLength.AVERAGE: 2, FingerLength.SHORT: 1}
        d_len = dom_finger.length if dom_finger else FingerLength.AVERAGE
        n_len = non_finger.length if non_finger else FingerLength.AVERAGE
        diff  = rank.get(d_len, 2) - rank.get(n_len, 2)

        signal = (
            "elongated"  if diff > 0 else
            "shortened"  if diff < 0 else
            "consistent"
        )
        return {
            "dominant":     d_len.value,
            "non_dominant": n_len.value,
            "signal":       signal,
        }

    def _build_comparison(
        self,
        dominant:     PalmFeatures,
        non_dominant: PalmFeatures,
    ) -> CrossHandComparison:
        d_shape = dominant.hand_shape
        n_shape = non_dominant.hand_shape
        shape_match = (d_shape == n_shape)
        shape_delta = (
            "identical" if shape_match
            else f"{n_shape.value if n_shape else 'unknown'} vs {d_shape.value if d_shape else 'unknown'}"
        )

        line_names  = ["life_line", "heart_line", "head_line", "fate_line", "sun_line", "mercury_line"]
        line_deltas = {
            name: self._line_delta(
                getattr(dominant, name),
                getattr(non_dominant, name),
            )
            for name in line_names
        }

        d_marriage   = dominant.marriage_lines.count     if dominant.marriage_lines     else 0
        n_marriage   = non_dominant.marriage_lines.count if non_dominant.marriage_lines else 0
        marriage_delta = d_marriage - n_marriage

        mount_names = [
            "mount_venus", "mount_jupiter", "mount_saturn", "mount_apollo",
            "mount_mercury", "mount_mars_upper", "mount_mars_lower",
            "mount_moon", "mount_neptune",
        ]
        mount_deltas = {
            name: self._mount_delta(
                getattr(dominant, name),
                getattr(non_dominant, name),
                name,
            )
            for name in mount_names
        }

        finger_names  = ["thumb", "index", "middle", "ring", "pinky"]
        finger_deltas = {
            name: self._finger_delta(
                getattr(dominant, name),
                getattr(non_dominant, name),
                name,
            )
            for name in finger_names
        }

        comp_conf = round(
            math.sqrt(dominant.confidence * non_dominant.confidence), 3
        )

        return CrossHandComparison(
            dominant_label        = dominant.hand_label,
            non_dominant_label    = non_dominant.hand_label,
            shape_match           = shape_match,
            shape_delta           = shape_delta,
            life_line             = line_deltas["life_line"],
            heart_line            = line_deltas["heart_line"],
            head_line             = line_deltas["head_line"],
            fate_line             = line_deltas["fate_line"],
            sun_line              = line_deltas["sun_line"],
            mercury_line          = line_deltas["mercury_line"],
            marriage_count_delta  = marriage_delta,
            mount_deltas          = mount_deltas,
            finger_deltas         = finger_deltas,
            comparison_confidence = comp_conf,
        )

    # ------------------------------------------------------------------
    # Dual-hand entry point  (v3.0.2 — preserved exactly)
    # ------------------------------------------------------------------

    def extract_both(
        self,
        dominant_bytes:     bytes,
        non_dominant_bytes: bytes,
        dominant_label:     str = "right",
        non_dominant_label: str = "left",
    ) -> DualPalmFeatures:
        t0 = time.monotonic()

        dominant     = self.extract(dominant_bytes,     hand_label=dominant_label)
        non_dominant = self.extract(non_dominant_bytes, hand_label=non_dominant_label)

        dom_valid  = dominant.error     is None and dominant.confidence     > 0.0
        non_valid  = non_dominant.error is None and non_dominant.confidence > 0.0
        both_valid = dom_valid and non_valid

        partial_error: Optional[str] = None
        if not dom_valid and not non_valid:
            partial_error = (
                f"Both hands failed. "
                f"Dominant: {dominant.error} | "
                f"Non-dominant: {non_dominant.error}"
            )
        elif not dom_valid:
            partial_error = f"Dominant hand ({dominant_label}) failed: {dominant.error}"
        elif not non_valid:
            partial_error = f"Non-dominant hand ({non_dominant_label}) failed: {non_dominant.error}"

        comparison = self._build_comparison(dominant, non_dominant)
        total_ms   = int((time.monotonic() - t0) * 1000)

        logger.info(
            "PalmEngine.extract_both completed",
            extra={
                "dominant_hash":     dominant.image_hash,
                "non_dominant_hash": non_dominant.image_hash,
                "dominant_conf":     dominant.confidence,
                "non_dominant_conf": non_dominant.confidence,
                "both_valid":        both_valid,
                "total_ms":          total_ms,
                "shape_match":       comparison.shape_match,
                "shape_delta":       comparison.shape_delta,
            },
        )

        return DualPalmFeatures(
            dominant            = dominant,
            non_dominant        = non_dominant,
            comparison          = comparison,
            total_processing_ms = total_ms,
            both_hands_valid    = both_valid,
            partial_error       = partial_error,
        )


# ---------------------------------------------------------------------------
# Convenience wrappers  (v3.0.2 — preserved exactly)
# ---------------------------------------------------------------------------

def extract_palm_features(
    image_bytes: bytes,
    hand_label: str = "right",
) -> PalmFeatures:
    return PalmEngine().extract(image_bytes, hand_label)


def extract_both_palms(
    dominant_bytes:     bytes,
    non_dominant_bytes: bytes,
    dominant_label:     str = "right",
    non_dominant_label: str = "left",
) -> DualPalmFeatures:
    return PalmEngine().extract_both(
        dominant_bytes, non_dominant_bytes,
        dominant_label, non_dominant_label,
    )


# =============================================================================
# COMPATIBILITY LAYER  (v3.0.2 — preserved exactly, children_lines added)
# =============================================================================

def analyze_palm(image_bytes: bytes, hand: str = "right") -> Dict:
    """
    Legacy wrapper that returns a dictionary in the format expected by the
    orchestrator. v4.0.0: children_lines, health_markers, spiritual_markers,
    life_line_assessment, fate_line_assessment, and infidelity_markers added
    to the output dict without breaking existing keys.
    """
    engine   = PalmEngine()
    features = engine.extract(image_bytes, hand_label=hand)

    if features.error:
        return {"error": features.error}

    result = {
        "hand_shape": {
            "type": features.hand_shape.value if features.hand_shape else "unknown",
            "name": {
                "earth": "The Builder",
                "air":   "The Thinker",
                "fire":  "The Visionary",
                "water": "The Healer",
                "mixed": "The Integrator"
            }.get(features.hand_shape.value if features.hand_shape else "mixed", "The Integrator"),
            "element": {
                "earth": "Earth",
                "air":   "Air",
                "fire":  "Fire",
                "water": "Water",
                "mixed": "All"
            }.get(features.hand_shape.value if features.hand_shape else "mixed", "Mixed"),
        },
        "line_analysis":        {},
        "marriage_lines":       [],
        "marriage_timing":      "Unknown",
        "current_relationship": {"status": "unknown", "quality": "none", "meaning": ""},
        "measurements": {
            "palm_width":  features.geometry.palm_width_px  if features.geometry else 0,
            "palm_length": features.geometry.palm_length_px if features.geometry else 0,
            "palm_ratio":  features.geometry.palm_ratio     if features.geometry else 0,
        },
    }

    # Map lines
    for line_name in ["life_line", "heart_line", "head_line", "fate_line", "sun_line", "mercury_line"]:
        line = getattr(features, line_name)
        if line:
            result["line_analysis"][line_name] = {
                "presence":    line.presence.value,
                "quality":     line.presence.value,
                "length":      "medium",
                "curvature":   line.curvature.value,
                "continuity":  line.continuity,
                "meaning":     (
                    f"Line {line.presence.value} with {line.curvature.value} "
                    f"curvature and {line.depth.value} depth."
                ),
            }
        else:
            result["line_analysis"][line_name] = {"presence": "absent", "quality": "absent"}

    # Marriage lines
    if features.marriage_lines:
        result["marriage_lines"] = features.marriage_lines.lines
        for i, line in enumerate(result["marriage_lines"]):
            line["age"]     = 20 + i * 5
            line["quality"] = line.get("depth", "moderate")
        if features.marriage_lines.count > 0:
            result["marriage_timing"] = (
                f"Next significant relationship opportunity around age "
                f"{20 + features.marriage_lines.count * 5}."
            )
            strongest = features.marriage_lines.strongest_idx
            if strongest >= 0 and features.marriage_lines.lines[strongest].get("depth") in ("high", "moderate"):
                result["current_relationship"] = {
                    "status":  "active",
                    "quality": features.marriage_lines.lines[strongest]["depth"],
                    "meaning": "Likely in a committed relationship or about to enter one.",
                }
            else:
                result["current_relationship"] = {
                    "status":  "developing",
                    "quality": "moderate",
                    "meaning": "A significant relationship is forming or has recently ended.",
                }
    else:
        result["marriage_lines"]       = []
        result["marriage_timing"]       = "Potential for a significant connection in the next 2-3 years."
        result["current_relationship"]  = {
            "status":  "open",
            "quality": "none",
            "meaning": "Your relationship path is still being written; you have many possibilities.",
        }

    result["heart_line_quality"] = result["line_analysis"].get("heart_line", {}).get("quality", "moderate")

    result["hand_shape"].update({
        "name":          result["hand_shape"]["name"],
        "element":       result["hand_shape"]["element"],
        "diagnosis":     f"{result['hand_shape']['type'].title()} hand",
        "strengths":     "To be filled by interpretation layer",
        "challenge":     "To be filled by interpretation layer",
        "relationships": "To be filled by interpretation layer",
    })

    # v4.0.0: new fields added to compatibility output
    if features.children_lines:
        result["children_lines"] = {
            "count":          features.children_lines.count,
            "lines":          features.children_lines.lines,
            "note":           features.children_lines.note,
        }
    else:
        result["children_lines"] = {"count": 0, "lines": [], "note": "Not extracted"}

    result["health_markers"]    = [
        {"type": m.marker_type, "system": m.system, "severity": m.severity.value, "note": m.note}
        for m in (features.health_markers or [])
    ]
    result["spiritual_markers"] = [
        {"type": m.marker_type, "gift": m.gift_indicated, "strength": m.strength.value, "note": m.note}
        for m in (features.spiritual_markers or [])
    ]
    result["infidelity_markers"] = [
        {"type": m.marker_type, "direction": m.direction, "significance": m.significance.value, "note": m.note}
        for m in (features.infidelity_markers or [])
    ]

    if features.life_line_assessment:
        la = features.life_line_assessment
        result["life_line_assessment"] = {
            "longevity":     la.longevity_indicator,
            "vitality":      la.vitality_level.value,
            "note":          la.assessment_note,
        }

    if features.fate_line_assessment:
        fa = features.fate_line_assessment
        result["fate_line_assessment"] = {
            "career_strength":  fa.career_strength.value,
            "wealth_potential": fa.wealth_potential.value,
            "stability":        fa.career_stability,
            "self_made":        fa.self_made,
            "note":             fa.assessment_note,
        }

    return result


def generate_palm_report(analysis: Dict) -> Dict[str, List[str]]:
    """Legacy wrapper — preserved exactly."""
    report = {
        "hand_shape": [
            f"Hand shape: {analysis.get('hand_shape', {}).get('type', 'unknown')}",
            "More detailed interpretation will be added by the logic layer."
        ]
    }
    return report
