"""
Esoteric Submodule — KAYAL Logic Engine
=========================================
Invisible infrastructure layer that applies seven knowledge frameworks
beneath the synthesis engine. The user never sees any of this.
They receive insight. The frameworks decide the depth.

Frameworks:
    hermetic    — Seven Hermetic Principles (Kybalion)
                  Correspondence detection (as above, so below)
                  Polarity resolution for conflicting signals

    sephiroth   — Tree of Life (Etz Chaim) — ten sephiroth
                  Domain mapping to divine emanations
                  Pillar balance detection (Mercy / Severity / Middle)

    paths       — 22 paths of the Tree of Life
                  Journey narrative between activated sephiroth
                  Timing notes for transformative path activations

    chinese     — Five Elements (Wu Xing) + Ba Zi (Four Pillars)
                  Day Master element identification
                  I Ching hexagram timing signal

    vedic       — Jyotish synthesis + Ayurvedic constitution
                  Nakshatra (lunar mansion) character signal
                  Vimshottari Dasha timing approximation
                  Dosha (Vata/Pitta/Kapha) health domain signal

    four_worlds — Kabbalistic Four Worlds (Arba Olam)
                  Atziluth → Astrology
                  Beriah   → Numerology
                  Yetzirah → Physiognomy
                  Assiah   → Palmistry

    pillars     — Pillar of Mercy / Pillar of Severity balance detection
                  Generates synthesis balance directives
                  Prevents unrealistically positive or bleak readings

Author: KAYAL Engineering
Version: 1.0.0
"""

from .hermetic import (
    apply_hermetic_principles,
    get_polarity_resolutions,
    PolarityResult,
    CorrespondenceResult,
    _broad_system,
)

from .sephiroth import (
    activate_sephiroth,
    sephirah_domain_amplifier,
)

from .paths import (
    derive_journey_path,
    path_timing_note,
)

from .chinese import (
    synthesise_chinese,
    get_element_domain_reading,
)

from .vedic import (
    synthesise_vedic,
    get_dosha_domain_reading,
    get_planet_domain_signal,
)

from .four_worlds import (
    map_four_worlds,
    worlds_narrative,
    cross_world_confirmation,
)

from .pillars import (
    assess_pillars,
    PillarAssessment,
)

__all__ = [
    # Hermetic
    "apply_hermetic_principles",
    "get_polarity_resolutions",
    "PolarityResult",
    "CorrespondenceResult",
    "_broad_system",

    # Sephiroth
    "activate_sephiroth",
    "sephirah_domain_amplifier",

    # Paths
    "derive_journey_path",
    "path_timing_note",

    # Chinese
    "synthesise_chinese",
    "get_element_domain_reading",

    # Vedic
    "synthesise_vedic",
    "get_dosha_domain_reading",
    "get_planet_domain_signal",

    # Four Worlds
    "map_four_worlds",
    "worlds_narrative",
    "cross_world_confirmation",

    # Pillars
    "assess_pillars",
    "PillarAssessment",
]