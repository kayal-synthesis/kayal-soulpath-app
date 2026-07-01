"""
Chinese Remedies — KAYAL Synthesis Platform
=============================================
Five-element (Wu Xing) balancing remedies and Ba Zi prescriptions
drawn from Classical Chinese Medicine and Taoist feng shui tradition.

Sources:
    Huang Di Nei Jing (Yellow Emperor's Classic of Medicine)
    Ba Zi classical texts
    Traditional feng shui — San Yuan and San He schools

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations
from typing import Dict, List, Optional
from ..models import (
    SpiritualRemedy, RemedyTradition, RemedyUrgency, Domain, ChineseElement
)


# ---------------------------------------------------------------------------
# Five-element balancing prescriptions
# ---------------------------------------------------------------------------

_ELEMENT_REMEDIES: Dict[str, Dict] = {
    ChineseElement.WOOD.value: {
        "colors":    ["green", "teal", "light blue"],
        "direction": "East",
        "season":    "Spring",
        "foods":     "Leafy greens, sour foods, liver and gallbladder nourishing foods: lemons, vinegar, green tea",
        "activity":  "Stretching, yoga, tai chi, walking in nature among trees",
        "organ":     "Liver and gallbladder",
        "emotion":   "Transform anger into compassion through movement practices",
        "sound":     "Shh — the liver sound. Exhale slowly making the 'shh' sound 6 times",
        "plants":    "Place healthy green plants — bamboo, pothos — in the east area of your home",
        "avoid":     "Alcohol, rancid or processed foods, excessive planning without action",
    },
    ChineseElement.FIRE.value: {
        "colors":    ["red", "orange", "purple", "pink"],
        "direction": "South",
        "season":    "Summer",
        "foods":     "Bitter foods, red foods, heart-nourishing: dark chocolate, red berries, hawthorn berries",
        "activity":  "Joyful movement, dancing, laughter, social gathering",
        "organ":     "Heart and small intestine",
        "emotion":   "Transform anxiety into joy through heart-opening practices",
        "sound":     "Ha — the heart sound. Exhale laughing 'ha ha ha' to release excess heat",
        "plants":    "Red flowering plants in the south area of your home",
        "avoid":     "Over-stimulation, excessive heat, caffeine, competitive environments when stressed",
    },
    ChineseElement.EARTH.value: {
        "colors":    ["yellow", "beige", "brown", "terracotta"],
        "direction": "Centre",
        "season":    "Late summer",
        "foods":     "Sweet (naturally sweet) foods, root vegetables, millet, warming foods: yams, squash, ginger",
        "activity":  "Grounding practices, gardening, pottery, cooking, walking barefoot on earth",
        "organ":     "Stomach and spleen",
        "emotion":   "Transform worry into intention through grounding and presence",
        "sound":     "Who — the spleen sound. Exhale 'whoooo' slowly to release worry",
        "plants":    "Earthy terracotta pots with yellow flowers in the centre of your home",
        "avoid":     "Cold and raw foods, excessive thinking, eating while distracted or anxious",
    },
    ChineseElement.METAL.value: {
        "colors":    ["white", "silver", "grey", "gold"],
        "direction": "West",
        "season":    "Autumn",
        "foods":     "Pungent/spicy foods, white foods, lung-nourishing: pears, radish, onion, garlic",
        "activity":  "Breathwork, pranayama, singing, decluttering and releasing",
        "organ":     "Lung and large intestine",
        "emotion":   "Transform grief into release through breathing and letting go",
        "sound":     "Ssss — the lung sound. Exhale making the 'ssss' sound to release grief",
        "plants":    "White flowers, orchids, in the west area of your home",
        "avoid":     "Holding on — physically and emotionally. Clutter is Metal imbalance made visible",
    },
    ChineseElement.WATER.value: {
        "colors":    ["black", "dark blue", "navy"],
        "direction": "North",
        "season":    "Winter",
        "foods":     "Salty foods (in moderation), black foods, kidney-nourishing: black beans, walnuts, seaweed",
        "activity":  "Deep rest, swimming, meditation, journaling, contemplation",
        "organ":     "Kidney and bladder",
        "emotion":   "Transform fear into wisdom through stillness and introspection",
        "sound":     "Chway — the kidney sound. Exhale 'chway' while bending forward to release fear",
        "plants":    "Water features — small fountain — in the north area of your home",
        "avoid":     "Excessive cold, overwork, fear-based decisions, not enough sleep",
    },
}

# ---------------------------------------------------------------------------
# Ba Zi Day Master remedies
# When Day Master element is under pressure, strengthen it
# ---------------------------------------------------------------------------

_BAZI_DAY_MASTER_SUPPORT: Dict[str, str] = {
    ChineseElement.WOOD.value:  (
        "Your Day Master is Wood. To strengthen it: spend time in nature daily, "
        "eat more green foods, face east during morning practice, "
        "and cultivate one long-term project with patient daily effort."
    ),
    ChineseElement.FIRE.value:  (
        "Your Day Master is Fire. To strengthen it: cultivate genuine joy, "
        "connect with inspiring people, eat warm cooked foods, "
        "and engage in creative expression daily — even briefly."
    ),
    ChineseElement.EARTH.value: (
        "Your Day Master is Earth. To strengthen it: establish steady routines, "
        "eat warming nourishing foods slowly and mindfully, "
        "spend time with the ground beneath your feet, and practice gratitude."
    ),
    ChineseElement.METAL.value: (
        "Your Day Master is Metal. To strengthen it: practice letting go — "
        "of clutter, old emotions, and the need to be right. "
        "Breathwork is your most powerful daily practice."
    ),
    ChineseElement.WATER.value: (
        "Your Day Master is Water. To strengthen it: prioritise deep rest, "
        "reduce fear-based decisions, eat kidney-nourishing foods, "
        "and spend time near water — even a bath counts."
    ),
}

# ---------------------------------------------------------------------------
# I Ching action guidance per hexagram group
# ---------------------------------------------------------------------------

_ICHING_ACTION: Dict[str, str] = {
    "initiative":      "The I Ching calls for bold, creative action. Begin the thing you have been delaying. The energy supports new starts.",
    "patience":        "The I Ching calls for stillness and preparation. Do not force. Gather resources and wait for the right moment.",
    "release":         "The I Ching calls for letting go. Something must end before the new can begin. Release with gratitude.",
    "community":       "The I Ching calls for connection. Reach out to aligned others. What you cannot do alone becomes possible together.",
    "transformation":  "The I Ching marks a period of fundamental change. Do not resist what is transforming — work with it.",
    "completion":      "The I Ching marks a completion point. Honor what has been built. Prepare for a new cycle beginning.",
}

# ---------------------------------------------------------------------------
# Domain-specific remedy builder
# ---------------------------------------------------------------------------

def build_chinese_remedy(
    domain:          Domain,
    lacking_element: Optional[ChineseElement],
    dominant_element:ChineseElement,
    iching_meaning:  Optional[str],
    urgency:         RemedyUrgency,
) -> SpiritualRemedy:
    """Build a Chinese five-element remedy for a specific domain."""

    # Domain → element affinity
    domain_element_map = {
        Domain.LOVE:     ChineseElement.FIRE,
        Domain.HEALTH:   ChineseElement.WATER,
        Domain.WEALTH:   ChineseElement.EARTH,
        Domain.CAREER:   ChineseElement.WOOD,
        Domain.SPIRITUAL:ChineseElement.WATER,
        Domain.FINANCE:  ChineseElement.METAL,
        Domain.CHARACTER:ChineseElement.EARTH,
        Domain.TIMING:   ChineseElement.WOOD,
    }

    target_element = lacking_element or domain_element_map.get(domain, ChineseElement.EARTH)
    elem_data      = _ELEMENT_REMEDIES.get(target_element.value, _ELEMENT_REMEDIES[ChineseElement.EARTH.value])
    dm_support     = _BAZI_DAY_MASTER_SUPPORT.get(dominant_element.value, "")

    # I Ching action guidance
    iching_guidance = ""
    if iching_meaning:
        iching_lower = iching_meaning.lower()
        if any(w in iching_lower for w in ["begin", "start", "initiative", "creative"]):
            iching_guidance = _ICHING_ACTION["initiative"]
        elif any(w in iching_lower for w in ["wait", "patient", "prepare", "still"]):
            iching_guidance = _ICHING_ACTION["patience"]
        elif any(w in iching_lower for w in ["release", "let go", "end", "transform"]):
            iching_guidance = _ICHING_ACTION["release"]
        elif any(w in iching_lower for w in ["together", "community", "gather"]):
            iching_guidance = _ICHING_ACTION["community"]
        elif any(w in iching_lower for w in ["revolution", "fundamental", "radical"]):
            iching_guidance = _ICHING_ACTION["transformation"]
        elif any(w in iching_lower for w in ["completion", "after", "wholeness"]):
            iching_guidance = _ICHING_ACTION["completion"]

    title = f"{target_element.value.title()} Element Balancing — {domain.value.title()} Domain"

    description = (
        f"Your {domain.value} domain is supported by cultivating the "
        f"{target_element.value.title()} element. "
        f"Colors to introduce: {', '.join(elem_data['colors'])}. "
        f"Direction to activate: face {elem_data['direction']} during morning practice. "
        f"Nourishing foods: {elem_data['foods']}. "
        f"Practice: {elem_data['activity']}. "
        f"Organ focus: {elem_data['organ']} — {elem_data['emotion']}. "
        f"Healing sound: {elem_data['sound']}. "
        f"Home adjustment: {elem_data['plants']}. "
        f"Avoid: {elem_data['avoid']}. "
    )
    if dm_support:
        description += f" Ba Zi Day Master guidance: {dm_support}"
    if iching_guidance:
        description += f" I Ching guidance for this period: {iching_guidance}"

    return SpiritualRemedy(
        tradition        = RemedyTradition.CHINESE,
        domain           = domain,
        urgency          = urgency,
        title            = title,
        description      = description,
        timing           = f"Morning practice facing {elem_data['direction']}, ideally during {elem_data['season']}",
        duration         = "Practice daily for 21 days, then reassess",
        materials        = [
            f"Items in {', '.join(elem_data['colors'][:2])} for your {elem_data['direction'].lower()} corner",
            elem_data["plants"],
        ],
        mantra_or_prayer = f"Healing sound: {elem_data['sound']}",
        expected_shift   = (
            f"The {target_element.value} element will begin to strengthen within 21 days "
            "of consistent practice. You will notice more ease in the "
            f"{domain.value} area and less friction."
        ),
        caution = None,
    )
