"""
Abrahamic Remedies — KAYAL Synthesis Platform
===============================================
Islamic, Christian, and Jewish spiritual remedies.

Islamic remedies draw from the Quran, Hadith, and classical
scholars — Imam al-Ghazali's Ihya Ulum al-Din, Ibn Qayyim's
Zad al-Ma'ad, and traditional Ruqyah practice.

Christian remedies draw from scripture, Catholic and Protestant
prayer traditions, and contemplative practice.

All remedies are presented with deep respect for the traditions
they come from. They are offered as spiritual support, not
medical advice.

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations
from typing import Dict, List, Optional
from ..models import SpiritualRemedy, RemedyTradition, RemedyUrgency, Domain, CulturalOrigin


# ---------------------------------------------------------------------------
# Islamic — Quranic Surah prescriptions per domain
# ---------------------------------------------------------------------------

_QURAN_DOMAIN_REMEDIES: Dict[str, Dict] = {
    Domain.LOVE.value: {
        "surah":       "Surah Ya-Sin (36) and Surah Al-Rum (30)",
        "count":       "Recite Surah Ya-Sin once after Fajr (dawn) prayer for 7 days",
        "dua":         "Rabbi hab li min ladunka rahmatan — 'My Lord, grant me mercy from Yourself'",
        "sadaqah":     "Give food to a family in need on a Friday",
        "timing":      "After Fajr prayer, facing Qibla",
        "additional":  "Make du'a for your partner's wellbeing before making du'a for yourself",
    },
    Domain.HEALTH.value: {
        "surah":       "Surah Al-Fatiha (1) — the greatest healing chapter",
        "count":       "Recite Al-Fatiha 7 times with hand on the affected area, or over water to drink",
        "dua":         "Allahumma Rabb al-nas, adhhibi al-ba's, ishfi anta al-Shafi — 'O Allah, Lord of mankind, remove the harm and heal, for You are the Healer'",
        "sadaqah":     "Give water or food to those who are sick or hungry",
        "timing":      "Morning and evening, consistent practice",
        "additional":  "Black seed (Nigella sativa): consume half teaspoon with honey daily — the Prophet said it is a remedy for every disease except death",
    },
    Domain.WEALTH.value: {
        "surah":       "Surah Al-Waqiah (56) — the chapter of the inevitable",
        "count":       "Recite Surah Al-Waqiah every night before sleep, consistently",
        "dua":         "Allahumma inni as'aluka rizqan halalan wasian — 'O Allah, I ask You for lawful and abundant provision'",
        "sadaqah":     "Give charity regularly — even a small amount. The Prophet said: 'Charity does not decrease wealth'",
        "timing":      "After Maghrib (sunset) prayer and before sleep",
        "additional":  "Begin and end every financial transaction with Bismillah",
    },
    Domain.CAREER.value: {
        "surah":       "Surah Al-Inshirah (94) — the chapter of the opening of the breast",
        "count":       "Recite 11 times after Fajr for 40 days when facing professional difficulty",
        "dua":         "Rabbi yassir wa la tu'assir — 'My Lord, make it easy and do not make it difficult'",
        "sadaqah":     "Teach someone a skill you have. Knowledge sadaqah is among the highest",
        "timing":      "After Fajr prayer, during the blessed morning hours",
        "additional":  "Istikharah prayer before major career decisions",
    },
    Domain.SPIRITUAL.value: {
        "surah":       "Surah Al-Kahf (18) — recited every Friday for protection and light",
        "count":       "Recite every Friday — full chapter or first and last 10 verses",
        "dua":         "Allahumma inni as'aluka hubbak wa hubba man yuhibbuk — 'O Allah, I ask You for Your love and the love of those who love You'",
        "sadaqah":     "Teach someone about prayer or assist them in connecting to their faith",
        "timing":      "Friday, between Asr and Maghrib — the blessed hour",
        "additional":  "Increase dhikr: 'SubhanAllah, Alhamdulillah, Allahu Akbar' — 33 times each after every prayer",
    },
    Domain.FINANCE.value: {
        "surah":       "Surah Al-Mulk (67) and the last two verses of Surah Al-Baqarah",
        "count":       "Recite Surah Al-Mulk every night before sleep",
        "dua":         "Allahumma akfini bi halalika an haramik — 'O Allah, make Your lawful provision sufficient for me against what is unlawful'",
        "sadaqah":     "Give 2.5% of savings annually (Zakat) — this is obligatory and purifies wealth",
        "timing":      "After Isha prayer",
        "additional":  "Avoid riba (interest) where possible — its spiritual effect on wealth is well-documented in Islamic tradition",
    },
    Domain.CHARACTER.value: {
        "surah":       "Surah Al-Hujurat (49) — the chapter of character and community",
        "count":       "Recite and reflect on one verse per day for 49 days",
        "dua":         "Allahumma ahsin khalqi kama ahsanta khalqi — 'O Allah, perfect my character as You perfected my creation'",
        "sadaqah":     "Apologise to someone you have wronged — this is the most powerful character remedy",
        "timing":      "After Isha prayer, in reflection",
        "additional":  "Fast on Mondays and Thursdays — the Prophet's voluntary fast for self-purification",
    },
}

# ---------------------------------------------------------------------------
# Christian remedies per domain
# ---------------------------------------------------------------------------

_CHRISTIAN_DOMAIN_REMEDIES: Dict[str, Dict] = {
    Domain.LOVE.value: {
        "scripture":   "1 Corinthians 13 — meditate on verses 4-8 daily",
        "prayer":      "Lord, let Your love flow through me. Heal what is wounded in my heart and open me to give and receive love freely.",
        "practice":    "Daily act of kindness toward someone you find difficult",
        "novena":      "Nine-day novena to Saint Valentine or the Sacred Heart",
        "timing":      "Morning prayer and evening reflection",
    },
    Domain.HEALTH.value: {
        "scripture":   "Psalm 103:2-3 — 'Praise the Lord, O my soul... who heals all your diseases'",
        "prayer":      "Lord Jesus, by Your stripes we are healed. I receive Your healing power into every part of my body, mind, and spirit.",
        "practice":    "Anointing with blessed oil if in Catholic or charismatic tradition. Laying on of hands in prayer.",
        "novena":      "Novena to Saint Raphael the Archangel — patron of healing",
        "timing":      "Morning and before sleep",
    },
    Domain.WEALTH.value: {
        "scripture":   "Deuteronomy 8:18 — 'Remember the Lord your God, for it is He who gives you the ability to produce wealth'",
        "prayer":      "Lord, I dedicate my work to You. Bless the labor of my hands and teach me to be a faithful steward of all You provide.",
        "practice":    "Tithing — giving the first 10% of income. This is the biblical wealth practice.",
        "novena":      "Novena to Saint Joseph — patron of workers",
        "timing":      "Before beginning work each day",
    },
    Domain.CAREER.value: {
        "scripture":   "Proverbs 16:3 — 'Commit to the Lord whatever you do, and He will establish your plans'",
        "prayer":      "Lord, I surrender my career into Your hands. Guide me to work that honors You and serves others.",
        "practice":    "Lectio Divina — sacred reading of scripture for clarity and direction",
        "novena":      "Novena to Saint Joseph or your patron saint",
        "timing":      "Morning prayer before work",
    },
    Domain.SPIRITUAL.value: {
        "scripture":   "Psalm 46:10 — 'Be still and know that I am God'",
        "prayer":      "Lord, draw me deeper into Your presence. Let me know You and be known by You.",
        "practice":    "Centering prayer or contemplative prayer — 20 minutes daily in silence",
        "novena":      "Novena to the Holy Spirit for spiritual gifts",
        "timing":      "Dawn or dusk — the liminal hours",
    },
    Domain.CHARACTER.value: {
        "scripture":   "Romans 12:2 — 'Be transformed by the renewing of your mind'",
        "prayer":      "Lord, transform my character into the likeness of Christ. Where I am weak, be my strength.",
        "practice":    "Daily examination of conscience — the Ignatian Examen prayer",
        "novena":      "Novena to your patron saint for virtue",
        "timing":      "Evening reflection before sleep",
    },
}

# ---------------------------------------------------------------------------
# Main remedy builders
# ---------------------------------------------------------------------------

def build_islamic_remedy(
    domain:   Domain,
    urgency:  RemedyUrgency,
) -> SpiritualRemedy:
    """Build an Islamic Quranic remedy for a specific domain."""
    data = _QURAN_DOMAIN_REMEDIES.get(domain.value, _QURAN_DOMAIN_REMEDIES[Domain.CHARACTER.value])

    description = (
        f"Quranic prescription for {domain.value}: "
        f"Recite {data['surah']}. "
        f"Instructions: {data['count']}. "
        f"Du'a: {data['dua']}. "
        f"Sadaqah: {data['sadaqah']}. "
        f"Additional guidance: {data.get('additional', '')}"
    )

    return SpiritualRemedy(
        tradition        = RemedyTradition.ISLAMIC,
        domain           = domain,
        urgency          = urgency,
        title            = f"Quranic Practice — {domain.value.title()} Domain",
        description      = description,
        timing           = data["timing"],
        duration         = "Maintain consistently — spiritual practice is cumulative",
        materials        = ["Quran (physical copy or app)", "Prayer beads (Misbaha) for dhikr"],
        mantra_or_prayer = data["dua"],
        expected_shift   = (
            "Consistent Quranic recitation and du'a create both spiritual protection "
            "and practical barakah (blessing) in the area of practice. "
            "The shift is often subtle at first — increased tawakkul (trust) "
            "followed by tangible doors opening."
        ),
        caution = "Seek knowledge of proper tajweed (Quranic recitation) for maximum benefit.",
    )


def build_christian_remedy(
    domain:   Domain,
    urgency:  RemedyUrgency,
) -> SpiritualRemedy:
    """Build a Christian prayer remedy for a specific domain."""
    data = _CHRISTIAN_DOMAIN_REMEDIES.get(domain.value, _CHRISTIAN_DOMAIN_REMEDIES[Domain.CHARACTER.value])

    description = (
        f"Scripture and prayer practice for {domain.value}: "
        f"Meditate on {data['scripture']}. "
        f"Prayer: {data['prayer']} "
        f"Daily practice: {data['practice']}. "
        f"Extended intercession: {data.get('novena', '')}."
    )

    return SpiritualRemedy(
        tradition        = RemedyTradition.CHRISTIAN,
        domain           = domain,
        urgency          = urgency,
        title            = f"Scripture and Prayer Practice — {domain.value.title()} Domain",
        description      = description,
        timing           = data["timing"],
        duration         = "Ongoing daily practice — spiritual growth is a lifelong journey",
        materials        = ["Bible", "Journal for reflection"],
        mantra_or_prayer = data["prayer"],
        expected_shift   = (
            "Regular scripture meditation and prayer create a shift in perspective first, "
            "then in circumstance. The inner transformation precedes the outer change."
        ),
        caution = None,
    )
