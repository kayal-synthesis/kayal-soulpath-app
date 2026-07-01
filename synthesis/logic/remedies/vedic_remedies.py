"""
Vedic Remedies — KAYAL Synthesis Platform
==========================================
Jyotish (Vedic astrology) remedies drawn from classical texts:
Brihat Parashara Hora Shastra, Saravali, Phaladeepika.

Remedy categories:
    Mantra     — Sanskrit planetary mantras with repetition counts
    Gemstone   — Jyotish gemstone prescriptions
    Fasting    — Planetary fasting days
    Dana       — Charitable giving (specific items, specific days)
    Puja       — Ritual worship recommendations
    Yantra     — Geometric meditation tools
    Rudraksha  — Sacred bead prescriptions
    Color/Food — Elemental and planetary diet/color therapy

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations
from typing import Dict, List, Optional
from ..models import SpiritualRemedy, RemedyTradition, RemedyUrgency, Domain


# ---------------------------------------------------------------------------
# Planetary mantra prescriptions
# ---------------------------------------------------------------------------

_PLANETARY_MANTRAS: Dict[str, Dict] = {
    "Sun": {
        "mantra":   "Om Suryaya Namah",
        "count":    108,
        "timing":   "Sunday morning at sunrise, facing east",
        "duration": "40 consecutive days",
    },
    "Moon": {
        "mantra":   "Om Chandraya Namah",
        "count":    108,
        "timing":   "Monday evening, facing north",
        "duration": "40 consecutive days",
    },
    "Mars": {
        "mantra":   "Om Angarakaya Namah",
        "count":    108,
        "timing":   "Tuesday morning, facing south",
        "duration": "40 consecutive days",
    },
    "Mercury": {
        "mantra":   "Om Budhaya Namah",
        "count":    108,
        "timing":   "Wednesday morning, facing north",
        "duration": "40 consecutive days",
    },
    "Jupiter": {
        "mantra":   "Om Gurave Namah",
        "count":    108,
        "timing":   "Thursday morning, facing northeast",
        "duration": "40 consecutive days",
    },
    "Venus": {
        "mantra":   "Om Shukraya Namah",
        "count":    108,
        "timing":   "Friday morning, facing east",
        "duration": "40 consecutive days",
    },
    "Saturn": {
        "mantra":   "Om Shanaishcharaya Namah",
        "count":    108,
        "timing":   "Saturday morning before sunrise",
        "duration": "40 consecutive days — Saturn remedies require patience",
    },
    "Rahu": {
        "mantra":   "Om Rahave Namah",
        "count":    108,
        "timing":   "Saturday at dusk, facing southwest",
        "duration": "18 consecutive days",
    },
    "Ketu": {
        "mantra":   "Om Ketave Namah",
        "count":    108,
        "timing":   "Tuesday at dusk, facing south",
        "duration": "18 consecutive days",
    },
}

# ---------------------------------------------------------------------------
# Gemstone prescriptions per planet
# ---------------------------------------------------------------------------

_PLANETARY_GEMSTONES: Dict[str, Dict] = {
    "Sun":     {"primary": "Ruby",           "alternative": "Red Garnet or Red Spinel",
                "metal": "Gold",             "finger": "Ring finger"},
    "Moon":    {"primary": "Pearl",          "alternative": "Moonstone or White Coral",
                "metal": "Silver",           "finger": "Little finger"},
    "Mars":    {"primary": "Red Coral",      "alternative": "Red Carnelian",
                "metal": "Gold or Copper",   "finger": "Ring finger"},
    "Mercury": {"primary": "Emerald",        "alternative": "Green Tourmaline or Peridot",
                "metal": "Gold",             "finger": "Little finger"},
    "Jupiter": {"primary": "Yellow Sapphire","alternative": "Yellow Topaz or Citrine",
                "metal": "Gold",             "finger": "Index finger"},
    "Venus":   {"primary": "Diamond",        "alternative": "White Sapphire or Zircon",
                "metal": "Silver or Platinum","finger": "Middle finger"},
    "Saturn":  {"primary": "Blue Sapphire",  "alternative": "Amethyst or Blue Topaz",
                "metal": "Silver or Iron",   "finger": "Middle finger"},
    "Rahu":    {"primary": "Hessonite Garnet","alternative": "Smoky Quartz",
                "metal": "Silver",           "finger": "Middle finger"},
    "Ketu":    {"primary": "Cat's Eye",      "alternative": "Tiger's Eye",
                "metal": "Silver",           "finger": "Ring finger"},
}

# ---------------------------------------------------------------------------
# Dana (charitable giving) prescriptions
# ---------------------------------------------------------------------------

_PLANETARY_DANA: Dict[str, str] = {
    "Sun":     "Donate wheat, jaggery, or copper items on Sundays to a temple or those in need",
    "Moon":    "Donate white items — rice, milk, white cloth — on Mondays, especially to women",
    "Mars":    "Donate red lentils, red cloth, or sweets to young men on Tuesdays",
    "Mercury": "Donate green vegetables, books, or stationary on Wednesdays to students",
    "Jupiter": "Donate yellow items — turmeric, chickpeas, bananas — on Thursdays to teachers",
    "Venus":   "Donate white sweets, dairy products, or white flowers on Fridays",
    "Saturn":  "Donate black sesame, iron items, or mustard oil on Saturdays to the elderly or poor",
    "Rahu":    "Donate blue or black items, coconut, or sesame on Saturdays at dusk",
    "Ketu":    "Donate spotted or multi-coloured items, sesame, or blankets on Tuesdays",
}

# ---------------------------------------------------------------------------
# Fasting prescriptions
# ---------------------------------------------------------------------------

_PLANETARY_FASTING: Dict[str, str] = {
    "Sun":     "Fast on Sundays — consume only fruits and water until sunset",
    "Moon":    "Fast on Mondays — consume only milk, fruits, and white foods",
    "Mars":    "Fast on Tuesdays — abstain from salt and non-vegetarian food",
    "Mercury": "Fast on Wednesdays — consume only green vegetables and fruits",
    "Jupiter": "Fast on Thursdays — consume only yellow foods and no salt",
    "Venus":   "Fast on Fridays — consume only white foods, avoid spices",
    "Saturn":  "Fast on Saturdays — this is the most powerful Saturn remedy",
    "Rahu":    "Fast on Saturdays, particularly on dark moon Saturdays",
    "Ketu":    "Fast on Tuesdays, avoid non-vegetarian food entirely",
}

# ---------------------------------------------------------------------------
# Rudraksha prescriptions
# ---------------------------------------------------------------------------

_RUDRAKSHA: Dict[str, str] = {
    "general_protection":   "5 Mukhi Rudraksha — the Pancha Mukhi, ruled by Shiva. Suitable for all. Wear on Monday after purification ritual.",
    "love_relationship":    "2 Mukhi Rudraksha — represents the union of Shiva and Shakti. Strengthens bonds and harmony in love.",
    "career_authority":     "1 Mukhi Rudraksha — the rarest. Ruled by Sun. Bestows clarity, authority, and soul alignment.",
    "health_vitality":      "6 Mukhi Rudraksha — ruled by Kartikeya. Strengthens willpower and physical vitality.",
    "wealth_prosperity":    "8 Mukhi Rudraksha — ruled by Ganesha. Removes obstacles on the path to prosperity.",
    "spiritual_liberation": "12 Mukhi Rudraksha — ruled by Sun/Aditya. For spiritual seekers and those on liberation path.",
    "saturn_karma":         "7 Mukhi Rudraksha — ruled by Mahalaxmi and Saturn. Transforms karmic debt into wisdom.",
    "mercury_intelligence": "4 Mukhi Rudraksha — ruled by Brahma. Enhances intelligence, communication, and learning.",
}

# ---------------------------------------------------------------------------
# Domain-specific remedy builder
# ---------------------------------------------------------------------------

def build_vedic_remedy(
    domain:          Domain,
    planet_weakness: Optional[str],
    nakshatra:       Optional[str],
    karmic_debt:     Optional[int],
    urgency:         RemedyUrgency,
) -> SpiritualRemedy:
    """
    Build a Vedic spiritual remedy for a specific domain.

    Args:
        domain:          Which domain needs the remedy
        planet_weakness: Weak planet identified in chart (if any)
        nakshatra:       Person's birth nakshatra
        karmic_debt:     Karmic debt number if present (13/14/16/19)
        urgency:         How urgently the remedy is needed

    Returns:
        SpiritualRemedy with full prescription
    """
    # Domain → primary planet mapping
    domain_planet_map = {
        Domain.LOVE:     "Venus",
        Domain.HEALTH:   "Sun",
        Domain.WEALTH:   "Jupiter",
        Domain.CAREER:   "Saturn",
        Domain.SPIRITUAL:"Ketu",
        Domain.FINANCE:  "Jupiter",
        Domain.CHARACTER:"Sun",
        Domain.TIMING:   "Saturn",
    }

    target_planet = planet_weakness or domain_planet_map.get(domain, "Saturn")
    mantra_data   = _PLANETARY_MANTRAS.get(target_planet, _PLANETARY_MANTRAS["Saturn"])
    gem_data      = _PLANETARY_GEMSTONES.get(target_planet, {})
    dana          = _PLANETARY_DANA.get(target_planet, "")
    fasting       = _PLANETARY_FASTING.get(target_planet, "")

    # Rudraksha selection
    rudraksha_key = {
        Domain.LOVE:     "love_relationship",
        Domain.HEALTH:   "health_vitality",
        Domain.WEALTH:   "wealth_prosperity",
        Domain.CAREER:   "career_authority",
        Domain.SPIRITUAL:"spiritual_liberation",
        Domain.FINANCE:  "wealth_prosperity",
        Domain.CHARACTER:"career_authority",
        Domain.TIMING:   "saturn_karma",
    }.get(domain, "general_protection")
    rudraksha = _RUDRAKSHA.get(rudraksha_key, _RUDRAKSHA["general_protection"])

    # Karmic debt specific additions
    karmic_addition = ""
    if karmic_debt == 13:
        karmic_addition = (
            " Additionally, this chart carries Karmic Debt 13. "
            "Dedicate your practice to honest effort — offer 10% of your earnings "
            "or time to service without expectation of return."
        )
    elif karmic_debt == 14:
        karmic_addition = (
            " Karmic Debt 14 is present. Add a structured discipline practice — "
            "wake at the same time each day for 40 days and spend 15 minutes "
            "in silent meditation before any digital activity."
        )
    elif karmic_debt == 16:
        karmic_addition = (
            " Karmic Debt 16 requires humility practice. "
            "Perform seva (selfless service) at a temple, community kitchen, "
            "or hospital for at least one day per month."
        )
    elif karmic_debt == 19:
        karmic_addition = (
            " Karmic Debt 19 calls for independence and responsibility. "
            "Stop asking others to carry what is yours. "
            "Begin each morning by writing three things you take full responsibility for today."
        )

    title = f"{target_planet} Strengthening Practice — {domain.value.title()} Domain"

    description = (
        f"To strengthen {target_planet} and clear the pattern affecting your "
        f"{domain.value} domain, the following Vedic practice is prescribed. "
        f"Mantra: recite '{mantra_data['mantra']}' {mantra_data['count']} times "
        f"{mantra_data['timing']}. "
        f"Charitable giving: {dana}. "
        f"Optional fast: {fasting}. "
        f"Rudraksha: {rudraksha}."
        f"{karmic_addition}"
    )

    materials = ["Mala (prayer beads) — 108 beads"]
    if gem_data:
        materials.append(
            f"{gem_data['primary']} gemstone set in {gem_data['metal']}, "
            f"worn on {gem_data['finger']} of right hand"
        )
    materials.append("Incense (sandalwood or camphor) for the practice space")

    return SpiritualRemedy(
        tradition        = RemedyTradition.VEDIC,
        domain           = domain,
        urgency          = urgency,
        title            = title,
        description      = description,
        timing           = mantra_data["timing"],
        duration         = mantra_data["duration"],
        materials        = materials,
        mantra_or_prayer = f"{mantra_data['mantra']} × {mantra_data['count']}",
        expected_shift   = (
            f"Within 40 days of sincere practice, the {target_planet} energy "
            f"in the {domain.value} domain will begin to shift. "
            "The first sign is usually increased clarity and reduced friction "
            "in the area that was blocked."
        ),
        caution = (
            "Blue Sapphire (for Saturn) should only be worn after a 3-day trial period. "
            "If you feel discomfort, remove immediately and consult a Jyotishi."
            if target_planet == "Saturn" else None
        ),
    )
