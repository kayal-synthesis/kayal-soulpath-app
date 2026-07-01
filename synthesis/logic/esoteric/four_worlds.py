"""
Esoteric — Four Worlds
=======================
Maps available input systems to the Kabbalistic Four Worlds.

The Four Worlds (Arba Olam) describe four levels of reality
from the most archetypal to the most physical.
Each input system in KAYAL corresponds to one world exactly.

    Atziluth  (אֲצִילוּת) — World of Emanation / Archetypal
              Astrology: the soul's original blueprint written in the stars.
              The planets are archetypes expressing through the individual.

    Beriah    (בְּרִיאָה) — World of Creation / Creative
              Numerology: the soul's expressed purpose encoded in name and date.
              Numbers are the creative principle — vibration made countable.

    Yetzirah  (יְצִירָה) — World of Formation / Formative
              Physiognomy: the soul taking on form — character made visible in face.
              The formative world is where pattern becomes structure.

    Assiah    (עֲשִׂיָּה) — World of Action / Material
              Palmistry: the soul made completely physical — karma etched in skin.
              The lowest world is where the soul's pattern is most concretely expressed.

The more worlds are illuminated, the more complete the reading.
Four worlds = the reading reflects all levels of existence simultaneously.

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations

from typing import Any, List, Optional
from ..models import FourWorldsMap


# ---------------------------------------------------------------------------
# World definitions
# ---------------------------------------------------------------------------

_WORLD_DESCRIPTIONS = {
    "atziluth": (
        "The archetypal blueprint — what was written before birth. "
        "Your natal chart reveals the soul's original design."
    ),
    "beriah": (
        "The creative pattern — what the soul came to express. "
        "Your name and birth date encode the vibrational signature of your purpose."
    ),
    "yetzirah": (
        "The formative field — how the soul has taken shape. "
        "Your face reveals the character that has formed through experience."
    ),
    "assiah": (
        "The physical record — what the soul has actually done with its potential. "
        "Your palm carries the physical imprint of your life's karma."
    ),
}


# ---------------------------------------------------------------------------
# Main function
# ---------------------------------------------------------------------------

def map_four_worlds(tier_assessment: Any) -> FourWorldsMap:
    """
    Map available systems to Kabbalistic four worlds.

    Args:
        tier_assessment: SimpleNamespace with .tier (tier_detector deprecated)

    Returns:
        FourWorldsMap indicating which worlds are active
    """
    active_worlds = getattr(tier_assessment, "worlds_active", ["atziluth", "beriah"])
    count         = getattr(tier_assessment, "worlds_count", len(active_worlds))

    return FourWorldsMap(
        atziluth_active = "atziluth" in active_worlds,
        beriah_active   = "beriah"   in active_worlds,
        yetzirah_active = "yetzirah" in active_worlds,
        assiah_active   = "assiah"   in active_worlds,
        worlds_count    = count,
        completeness    = count / 4.0,
    )


def worlds_narrative(four_worlds: FourWorldsMap) -> str:
    """
    Generate a plain-language narrative of which worlds are active.
    Used by payload_builder for the journey narrative.
    Invisible to the user as esoteric language — pure insight expression.
    """
    active = []
    if four_worlds.atziluth_active:
        active.append("archetypal blueprint (astrology)")
    if four_worlds.beriah_active:
        active.append("vibrational signature (numerology)")
    if four_worlds.yetzirah_active:
        active.append("formed character (physiognomy)")
    if four_worlds.assiah_active:
        active.append("physical record (palmistry)")

    count = four_worlds.worlds_count
    if count == 4:
        return (
            "All four levels of your being are illuminated in this reading — "
            "from the archetypal patterns written at your birth "
            "to the physical karma recorded in your hands."
        )
    elif count == 3:
        return (
            f"Three levels are illuminated: {', '.join(active)}. "
            "A deep and well-grounded reading."
        )
    elif count == 2:
        return (
            f"Two levels are illuminated: {', '.join(active)}. "
            "A solid foundation for insight."
        )
    else:
        return (
            f"The {active[0] if active else 'foundational'} level is illuminated. "
            "A clear reading at the archetypal and creative levels."
        )


def cross_world_confirmation(
    four_worlds: FourWorldsMap,
    domain: str,
) -> Optional[str]:
    """
    If multiple worlds speak to the same domain, return a confirmation note.
    Used by synthesiser to amplify convergent signals.
    Returns None if only one world is active.
    """
    if four_worlds.worlds_count < 2:
        return None

    world_count = four_worlds.worlds_count

    confirmations = {
        "love": {
            4: "All four systems confirm this love pattern — from soul blueprint to physical karma.",
            3: "Three independent levels of your being reflect this relationship truth.",
            2: "Both levels examined confirm this pattern in your love life.",
        },
        "career": {
            4: "Your calling is confirmed at every level — from cosmic design to physical record.",
            3: "Three systems align on this career signal — a strong vocational confirmation.",
            2: "Two independent systems point toward the same professional direction.",
        },
        "health": {
            4: "All four levels reflect this health pattern — a complete constitutional picture.",
            3: "Three systems confirm this vitality reading.",
            2: "Both systems examined reflect this health signal.",
        },
        "wealth": {
            4: "Your wealth pattern is confirmed from archetype to physical form.",
            3: "Three systems align on this prosperity signal.",
            2: "Both systems speak to this financial pattern.",
        },
        "spiritual": {
            4: "All four worlds confirm this spiritual path — rare and significant alignment.",
            3: "Three levels of your being resonate with this spiritual signal.",
            2: "Both levels examined point toward this spiritual truth.",
        },
    }

    domain_confirmations = confirmations.get(domain, {})
    return domain_confirmations.get(world_count, None)