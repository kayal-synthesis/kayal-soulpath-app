"""
Esoteric — Paths
=================
The 22 paths of the Tree of Life connect the ten sephiroth.
Each path corresponds to a letter of the Hebrew alphabet,
a Major Arcana Tarot card, and a quality of transition or journey.

In KAYAL, the paths are used to describe the movement between
where a person currently is (their dominant sephirah) and where
the synthesis is pointing them (their activated growth sephirah).

The user never sees path numbers, Hebrew letters, or Tarot names.
They receive journey language — the quality of the transition they are on.

Path reference:
    Path 11: Aleph / The Fool       — Pure potential, the leap of faith
    Path 12: Beth  / The Magician   — Focused will bringing potential to form
    Path 13: Gimel / The High Priestess — Hidden wisdom, intuition, cycles
    Path 14: Daleth/ The Empress    — Creative abundance, nurturing, growth
    Path 15: Heh   / The Emperor    — Structure, authority, foundation
    Path 16: Vav   / The Hierophant — Tradition, teaching, initiation
    Path 17: Zayin / The Lovers     — Choice, relationship, values alignment
    Path 18: Cheth / The Chariot    — Directed will, mastery in motion
    Path 19: Teth  / Strength       — Inner strength, patience, courage
    Path 20: Yod   / The Hermit     — Solitude, inner light, retreat and return
    Path 21: Kaph  / Wheel of Fortune — Cycles, timing, turning point
    Path 22: Lamed / Justice        — Balance, karma, right action
    Path 23: Mem   / The Hanged Man — Surrender, new perspective, sacrifice
    Path 24: Nun   / Death          — Transformation, endings, radical change
    Path 25: Samekh/ Temperance     — Integration, alchemy, patient blending
    Path 26: Ayin  / The Devil      — Shadow work, liberation, facing what binds
    Path 27: Peh   / The Tower      — Sudden revelation, breaking of false structure
    Path 28: Tzaddi/ The Star       — Hope, healing, alignment after difficulty
    Path 29: Qoph  / The Moon       — The unconscious, dreams, hidden forces
    Path 30: Resh  / The Sun        — Clarity, joy, conscious vitality
    Path 31: Shin  / Judgement      — Awakening, calling, rebirth
    Path 32: Tav   / The World      — Completion, integration, wholeness

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple
from ..models import SephirahActivation, KabbalahPillar


# ---------------------------------------------------------------------------
# Path journey language
# Expressed purely as quality of the journey — no esoteric vocabulary
# ---------------------------------------------------------------------------

_PATH_JOURNEY_LANGUAGE: Dict[int, str] = {
    11: "stepping into pure possibility — before the first move is made, everything is available",
    12: "bringing focused intention to bear — the time when what you intend begins to take form",
    13: "moving through cycles of knowing and unknowing — trusting the deeper intelligence",
    14: "in a season of creative flourishing — what you tend now grows abundantly",
    15: "building the structures that will hold your future — patient, deliberate foundation",
    16: "receiving teachings that come through tradition, teachers, and accumulated wisdom",
    17: "at a significant choice point — the values you choose here define the next chapter",
    18: "moving with directed purpose — harnessing energy into forward momentum",
    19: "finding the strength that comes from within — patience and courage as a unified force",
    20: "in a necessary period of retreat and inner listening — the light you carry guides others",
    21: "at a turning point — the wheel is moving and timing has become significant",
    22: "in a season of balancing — what was unequal is being brought into alignment",
    23: "in a period of surrender and new perspective — releasing what was held too tightly",
    24: "moving through deep transformation — something is ending to make way for rebirth",
    25: "in a season of patient blending — integrating apparently opposite forces into one",
    26: "facing what has been in shadow — liberation comes through honest encounter",
    27: "experiencing sudden revelation — a structure that needed to fall is falling",
    28: "in a season of healing and alignment after difficulty — hope is being restored",
    29: "moving through deep unconscious currents — what has been hidden is surfacing",
    30: "entering a period of clarity and conscious vitality — what was obscured becomes visible",
    31: "experiencing an awakening — a calling is becoming undeniable",
    32: "approaching completion — the threads of a long arc are weaving into wholeness",
}

# Path transitions between sephiroth
# (from_seph, to_seph): path_number
_SEPHIRAH_PATH_MAP: Dict[Tuple[str, str], int] = {
    ("kether",  "chokmah"):  11,
    ("kether",  "binah"):    12,
    ("kether",  "tiferet"):  13,
    ("chokmah", "binah"):    14,
    ("chokmah", "tiferet"):  15,
    ("chokmah", "chesed"):   16,
    ("binah",   "tiferet"):  17,
    ("binah",   "geburah"):  18,
    ("chesed",  "geburah"):  19,
    ("chesed",  "tiferet"):  20,
    ("chesed",  "netzach"):  21,
    ("geburah", "tiferet"):  22,
    ("geburah", "hod"):      23,
    ("tiferet", "netzach"):  24,
    ("tiferet", "hod"):      25,
    ("tiferet", "yesod"):    26,
    ("netzach", "hod"):      27,
    ("netzach", "yesod"):    28,
    ("netzach", "malkuth"):  29,
    ("hod",     "yesod"):    30,
    ("hod",     "malkuth"):  31,
    ("yesod",   "malkuth"):  32,
}


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def derive_journey_path(sephirah: SephirahActivation) -> str:
    """
    Derive the journey path language from the activated sephiroth.

    Logic:
    1. Primary sephirah = where the person currently is
    2. Secondary sephirah = where the synthesis is pointing
    3. Path between them = the quality of the journey

    Returns:
        Plain language journey narrative for the LLM payload.
        No esoteric vocabulary. Pure qualitative description.
    """
    if not sephirah.activated:
        return "moving steadily along your path, building toward what matters most"

    primary = sephirah.activated[0]
    secondary = sephirah.activated[1] if len(sephirah.activated) > 1 else None

    if secondary is None:
        # Only one activation — use the primary sephirah's own journey quality
        return _primary_journey(primary, sephirah.pillar_balance)

    # Look up the path between primary and secondary
    path_num = _SEPHIRAH_PATH_MAP.get(
        (primary, secondary),
        _SEPHIRAH_PATH_MAP.get((secondary, primary))  # try reverse
    )

    if path_num and path_num in _PATH_JOURNEY_LANGUAGE:
        return _PATH_JOURNEY_LANGUAGE[path_num]

    # No direct path — use primary journey with direction note
    return _primary_journey(primary, sephirah.pillar_balance)


def _primary_journey(primary: str, pillar: KabbalahPillar) -> str:
    """Journey language when only primary sephirah is activated."""
    primary_journeys = {
        "kether":  "moving toward your highest purpose — the crown of what you came here to be",
        "chokmah": "accessing a quality of wisdom that arrives as sudden knowing rather than reasoning",
        "binah":   "building understanding through patient experience and honest reflection",
        "chesed":  "opening to a season of expansion — love and abundance are available",
        "geburah": "developing purposeful strength — the discipline that makes mastery possible",
        "tiferet": "integrating all aspects of yourself — the heart knows what the mind debates",
        "netzach": "following the deeper desire — what you truly want is pointing the way",
        "hod":     "mastering the power of your expression — how you communicate shapes what you create",
        "yesod":   "aligning with deeper cycles — what appears random is moving in meaningful pattern",
        "malkuth": "grounding your gifts — the work now is bringing the inner into outer form",
    }

    base = primary_journeys.get(primary, "moving steadily toward what matters most")

    if pillar == KabbalahPillar.MERCY:
        return base + " — supported by a season of grace"
    elif pillar == KabbalahPillar.SEVERITY:
        return base + " — forged through meaningful challenge"
    else:
        return base


def path_timing_note(path_num: Optional[int]) -> Optional[str]:
    """
    Return a timing note for specific transformative paths.
    Used by TimingLayer in synthesiser.
    """
    transformative_paths = {
        21: "A significant turning point is present or approaching — timing matters now.",
        24: "A deep transformation is underway — completion of one chapter and beginning of another.",
        27: "Sudden change or revelation may occur — what no longer serves is releasing.",
        31: "An awakening or calling is becoming undeniable — this is a pivotal period.",
        32: "A long arc is approaching completion — what you began is reaching fulfilment.",
    }
    if path_num is None:
        return None
    return transformative_paths.get(path_num)
