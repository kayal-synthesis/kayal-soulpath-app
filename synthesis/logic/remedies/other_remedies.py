"""
Additional Remedy Traditions — KAYAL Synthesis Platform
=========================================================
African ancestral, Western metaphysical, Buddhist merit-making,
and Syncretic (Latin American/Caribbean) traditions.

Author: KAYAL Engineering
Version: 1.0.0
"""

from __future__ import annotations
from typing import Dict, List, Optional
from ..models import SpiritualRemedy, RemedyTradition, RemedyUrgency, Domain


# ---------------------------------------------------------------------------
# African ancestral remedies
# ---------------------------------------------------------------------------

_AFRICAN_DOMAIN_REMEDIES: Dict[str, Dict] = {
    Domain.LOVE.value: {
        "practice":   "Ancestral invocation for relationship blessing. Light a white candle and speak your ancestors' names aloud, asking for their guidance in love.",
        "offering":   "Offer water, palm wine, or kola nut to the ancestors. Water is universally sacred — pour a small amount on the earth.",
        "community":  "Seek counsel from a respected elder in your family or community on relationship matters. Ancestral wisdom lives in the elders.",
        "herbs":      "Rose petals, honey, and cinnamon in bathwater for attracting loving energy",
        "timing":     "During the full moon, at dawn or dusk",
    },
    Domain.HEALTH.value: {
        "practice":   "Ancestral healing: ask your ancestors to stand with you in healing. They walked this earth and understand the body's challenges.",
        "offering":   "Pour libation — water mixed with a drop of local palm spirit if available — and ask for healing intervention.",
        "community":  "Traditional plant medicine consultation with a trusted herbalist or traditional healer in your community where available.",
        "herbs":      "Bitter leaf, moringa, or African ginger tea — specific plants vary by region. What grows near you is often what your body needs.",
        "timing":     "Early morning, before the world is fully awake",
    },
    Domain.WEALTH.value: {
        "practice":   "Gratitude ceremony: acknowledge the material blessings already present, however small. Gratitude is the seed of abundance in African tradition.",
        "offering":   "Offer grain, fruit, or earth to your ancestors, asking them to clear the path to prosperity.",
        "community":  "Join or form a savings circle (Susu/Esusu/Chama) — collective prosperity is the African wealth model.",
        "herbs":      "Cinnamon, ginger, and cloves — warming prosperity herbs burned as incense or carried",
        "timing":     "At sunrise, the beginning of the active day",
    },
    Domain.CAREER.value: {
        "practice":   "Ask your ancestors who excelled in their work to stand behind you. You carry their gifts — they want to see them used.",
        "offering":   "Offer their favourite food or drink to the ancestral shrine before important career events.",
        "community":  "Seek a mentor who has walked a similar path. The African model of learning is apprenticeship and community.",
        "herbs":      "Bay leaves — write your career intention on a bay leaf and burn it as an offering",
        "timing":     "Thursday mornings — the day of Jupiter and expansion",
    },
    Domain.SPIRITUAL.value: {
        "practice":   "Ancestral altar: create a small space with photos, objects, and offerings for those who have passed. Visit it daily.",
        "offering":   "White flowers, white candle, water — universal ancestral offering across African traditions",
        "community":  "Find your community's spiritual practice and participate. Collective spiritual practice is more powerful than solitary.",
        "herbs":      "Frankincense or locally available sacred plants for smoke purification",
        "timing":     "Dawn — the ancestors are closest at the threshold moments",
    },
    Domain.CHARACTER.value: {
        "practice":   "Ubuntu practice: 'I am because we are.' For 21 days, do one act that benefits your community without recognition.",
        "offering":   "Offer time and presence to someone who needs it — this is the highest character offering.",
        "community":  "Ask a respected elder for honest feedback on your character. The community is your mirror.",
        "herbs":      "Frankincense and myrrh for purification",
        "timing":     "Daily — character is built in the accumulation of small daily choices",
    },
}

# ---------------------------------------------------------------------------
# Western metaphysical remedies
# ---------------------------------------------------------------------------

_WESTERN_CRYSTALS: Dict[str, Dict] = {
    Domain.LOVE.value:     {"crystals": "Rose Quartz (primary), Rhodonite, Green Aventurine", "placement": "bedroom or worn near the heart"},
    Domain.HEALTH.value:   {"crystals": "Clear Quartz, Bloodstone, Moss Agate", "placement": "near your bed or carried during healing"},
    Domain.WEALTH.value:   {"crystals": "Citrine, Green Aventurine, Pyrite", "placement": "southeast corner of home or workspace (abundance corner)"},
    Domain.CAREER.value:   {"crystals": "Tiger's Eye, Carnelian, Pyrite", "placement": "on your desk or workspace"},
    Domain.SPIRITUAL.value:{"crystals": "Amethyst, Labradorite, Selenite", "placement": "meditation space or bedside"},
    Domain.FINANCE.value:  {"crystals": "Citrine, Green Jade, Gold Sheen Obsidian", "placement": "wallet, purse, or financial documents"},
    Domain.CHARACTER.value:{"crystals": "Lapis Lazuli, Sodalite, Black Tourmaline", "placement": "worn or carried throughout the day"},
    Domain.TIMING.value:   {"crystals": "Labradorite, Moonstone, Clear Quartz", "placement": "worn during decision-making or transitions"},
}

_WESTERN_AFFIRMATIONS: Dict[str, str] = {
    Domain.LOVE.value:     "I am worthy of deep, enduring love. I give freely and receive graciously.",
    Domain.HEALTH.value:   "My body knows how to heal. Every cell is being restored to perfect health and vitality.",
    Domain.WEALTH.value:   "Abundance flows to me naturally. I am open to receiving in expected and unexpected ways.",
    Domain.CAREER.value:   "I am exactly where I need to be. My gifts are recognised and rewarded.",
    Domain.SPIRITUAL.value:"I am guided, protected, and deeply connected to the intelligence that created me.",
    Domain.FINANCE.value:  "Money flows to me easily and I manage it wisely. My relationship with money is healthy and growing.",
    Domain.CHARACTER.value:"I am continuously becoming the best version of myself. Growth is my natural state.",
    Domain.TIMING.value:   "I trust the timing of my life. Everything is unfolding in perfect divine order.",
}

# ---------------------------------------------------------------------------
# Buddhist merit-making remedies
# ---------------------------------------------------------------------------

_BUDDHIST_DOMAIN_REMEDIES: Dict[str, Dict] = {
    Domain.LOVE.value: {
        "practice":  "Metta (loving-kindness) meditation — begin with yourself, expand to loved ones, then all beings",
        "mantra":    "Om Mani Padme Hum — the mantra of compassion, 108 times",
        "offering":  "Offer flowers at your local temple or Buddha image",
        "merit":     "Volunteer at a care home or hospital — generate merit through service to those who suffer",
        "timing":    "Morning, before your mind is cluttered with the day",
    },
    Domain.HEALTH.value: {
        "practice":  "Medicine Buddha meditation — visualise the deep blue Medicine Buddha radiating healing light into your body",
        "mantra":    "Tayata Om Bekandze Bekandze Maha Bekandze Radza Samudgate Soha — Medicine Buddha mantra, 7 times",
        "offering":  "Offer light (candle or lamp) at the temple — light offerings purify obscurations to health",
        "merit":     "Donate to a hospital, clinic, or medical mission",
        "timing":    "Morning — before eating or drinking",
    },
    Domain.WEALTH.value: {
        "practice":  "Dzambhala (deity of wealth) practice or generosity practice — give something daily, however small",
        "mantra":    "Om Dzambhala Dzalendra Hri — Dzambhala mantra for prosperity, 108 times",
        "offering":  "Offer clean water in 7 bowls at a Buddha shrine each morning — representing the seven offerings",
        "merit":     "Donate food to monks, nuns, or a food bank. Feeding others is the primary wealth merit practice.",
        "timing":    "Early morning — before sunrise if possible",
    },
    Domain.SPIRITUAL.value: {
        "practice":  "Refuge prayer: 'I take refuge in the Buddha, the Dharma, and the Sangha'",
        "mantra":    "Om Ah Hum — the three syllables of body, speech, and mind, 108 times",
        "offering":  "Circumambulate (walk around) a stupa or sacred place clockwise",
        "merit":     "Study and share the Dharma — teaching others liberates both teacher and student",
        "timing":    "Dawn and dusk — the liminal times of greatest spiritual potency",
    },
    Domain.CHARACTER.value: {
        "practice":  "Tonglen — breathing in the suffering of others, breathing out relief. Radical compassion practice.",
        "mantra":    "Om Mani Padme Hum — the mantra that purifies all six realms of suffering",
        "offering":  "Prostrations — three to 108 per session — the physical practice of humility",
        "merit":     "Confession practice — honestly acknowledge harmful actions and commit to change",
        "timing":    "Evening — review the day's actions before sleep",
    },
}

# ---------------------------------------------------------------------------
# Syncretic remedies (Santería / Candomblé / Curanderismo)
# ---------------------------------------------------------------------------

_SYNCRETIC_DOMAIN_REMEDIES: Dict[str, Dict] = {
    Domain.LOVE.value: {
        "orisha":    "Oshun — the Orisha of love, beauty, rivers, and sweetness",
        "offering":  "Yellow flowers, honey, cinnamon sticks, and oranges — Oshun's sacred items",
        "candle":    "Yellow candle anointed with honey and cinnamon, lit on Friday",
        "bath":      "Honey and cinnamon bath — soak for 20 minutes, do not shower immediately after",
        "prayer":    "Oshun, Yeyé Omo Ejá, open the rivers of love in my heart and bring sweet connection into my life",
        "timing":    "Friday — Oshun's sacred day",
    },
    Domain.HEALTH.value: {
        "orisha":    "Babalu-Aye — the Orisha of healing, illness, and the earth",
        "offering":  "Purple or white candle, sesame seeds, pennies at the crossroads",
        "bath":      "Herbal cleansing bath with rosemary, rue, and basil for purification",
        "prayer":    "Babalu-Aye, Sopona, heal what is broken in my body. I offer my gratitude for continued life.",
        "limpia":    "Egg limpia (cleansing) — pass a fresh egg over the body to absorb negative energy, then crack into water to read",
        "timing":    "Monday or Friday, at dawn",
    },
    Domain.WEALTH.value: {
        "orisha":    "Elegua — the Orisha of crossroads, opportunity, and doors",
        "offering":  "Red and black candle, candy, rum, cigars — offerings at crossroads or front door",
        "bath":      "Cinnamon and bay leaf bath for attracting prosperity",
        "prayer":    "Elegua, Eshu Elegbara, open the roads before me. Remove the obstacles and let abundance flow through the open door.",
        "timing":    "Monday — Elegua's sacred day, at a crossroads if possible",
    },
    Domain.CAREER.value: {
        "orisha":    "Ogun — the Orisha of iron, work, and clearing the path",
        "offering":  "Green and black candle, rum, cigars, iron objects — Ogun's sacred items",
        "bath":      "Bay rum and mint bath for strength and clarity",
        "prayer":    "Ogun, clear the path before me with your machete. Let my work be strong, honest, and rewarded.",
        "timing":    "Tuesday — Ogun's sacred day",
    },
    Domain.SPIRITUAL.value: {
        "orisha":    "Obatala — the Orisha of purity, wisdom, and peace",
        "offering":  "White candle, white flowers, cocoa butter, white cloth — Obatala's sacred items",
        "bath":      "White flower bath with coconut milk for spiritual clarity and purification",
        "prayer":    "Obatala, Orisha Nla, clothe me in your white light. Let my mind be clear, my heart be pure, my path be guided by wisdom.",
        "timing":    "Sunday — Obatala's sacred day, dressed in white if possible",
    },
}

# ---------------------------------------------------------------------------
# Main remedy builders
# ---------------------------------------------------------------------------

def build_african_remedy(domain: Domain, urgency: RemedyUrgency) -> SpiritualRemedy:
    data = _AFRICAN_DOMAIN_REMEDIES.get(domain.value, _AFRICAN_DOMAIN_REMEDIES[Domain.CHARACTER.value])
    description = (
        f"Ancestral practice for {domain.value}: {data['practice']} "
        f"Offering: {data['offering']} "
        f"Community practice: {data['community']} "
        f"Herbal support: {data.get('herbs', '')} "
    )
    return SpiritualRemedy(
        tradition=RemedyTradition.AFRICAN, domain=domain, urgency=urgency,
        title=f"Ancestral Remedy — {domain.value.title()} Domain",
        description=description, timing=data["timing"],
        duration="Consistent practice — ancestors respond to sincerity and consistency",
        materials=["White candle", "A glass of clean water", "Photograph or object representing ancestors"],
        mantra_or_prayer=None,
        expected_shift="When ancestors are honored, they clear the path. The shift often comes as unexpected help or opened doors.",
        caution="Approach with deep sincerity and respect. These are sacred practices, not transactions.",
    )


def build_western_remedy(domain: Domain, urgency: RemedyUrgency) -> SpiritualRemedy:
    crystal_data = _WESTERN_CRYSTALS.get(domain.value, _WESTERN_CRYSTALS[Domain.CHARACTER.value])
    affirmation  = _WESTERN_AFFIRMATIONS.get(domain.value, _WESTERN_AFFIRMATIONS[Domain.CHARACTER.value])
    description = (
        f"Crystal work: {crystal_data['crystals']} — place {crystal_data['placement']}. "
        f"Daily affirmation (speak aloud morning and evening): '{affirmation}' "
        f"Journal practice: write 3 pieces of evidence daily that this affirmation is already true."
    )
    return SpiritualRemedy(
        tradition=RemedyTradition.WESTERN, domain=domain, urgency=urgency,
        title=f"Crystal and Affirmation Practice — {domain.value.title()} Domain",
        description=description,
        timing="Morning upon waking and evening before sleep",
        duration="21 days minimum — neural pathways take 21 days to begin forming new patterns",
        materials=[crystal_data["crystals"].split(",")[0].strip(), "Journal", "Candle (color matching domain)"],
        mantra_or_prayer=affirmation,
        expected_shift="Affirmation and crystal work shift the energetic field first — synchronicities appear before circumstances change.",
        caution="Cleanse crystals under moonlight or with sound before first use.",
    )


def build_buddhist_remedy(domain: Domain, urgency: RemedyUrgency) -> SpiritualRemedy:
    data = _BUDDHIST_DOMAIN_REMEDIES.get(domain.value, _BUDDHIST_DOMAIN_REMEDIES[Domain.SPIRITUAL.value])
    description = (
        f"Buddhist practice for {domain.value}: {data['practice']} "
        f"Mantra: {data['mantra']} "
        f"Offering: {data['offering']} "
        f"Merit generation: {data['merit']} "
    )
    return SpiritualRemedy(
        tradition=RemedyTradition.BUDDHIST, domain=domain, urgency=urgency,
        title=f"Buddhist Merit Practice — {domain.value.title()} Domain",
        description=description, timing=data["timing"],
        duration="108 days is the traditional Buddhist practice period for transformation",
        materials=["Mala beads (108 beads)", "Candle or butter lamp", "Incense"],
        mantra_or_prayer=data["mantra"],
        expected_shift="Merit practice purifies karma that creates obstacles. The shift is often experienced as things becoming lighter and easier.",
        caution="The sincerity of intention is more important than the precise form of practice.",
    )


def build_syncretic_remedy(domain: Domain, urgency: RemedyUrgency) -> SpiritualRemedy:
    data = _SYNCRETIC_DOMAIN_REMEDIES.get(domain.value, _SYNCRETIC_DOMAIN_REMEDIES[Domain.SPIRITUAL.value])
    description = (
        f"Orisha: {data['orisha']}. "
        f"Offering: {data['offering']} "
        f"Candle work: {data.get('candle', '')} "
        f"Cleansing: {data.get('bath', data.get('limpia', ''))} "
        f"Prayer: {data['prayer']} "
    )
    return SpiritualRemedy(
        tradition=RemedyTradition.SYNCRETIC, domain=domain, urgency=urgency,
        title=f"Orisha Practice — {domain.value.title()} Domain",
        description=description, timing=data["timing"],
        duration="Follow the natural completion of the practice — typically 7 or 21 days",
        materials=["Candle in appropriate color", "Fresh flowers", "Offering items as listed"],
        mantra_or_prayer=data["prayer"],
        expected_shift="The Orishas respond to sincere offering and clear intention. Signs of response appear in the natural world.",
        caution="Work with a respected Santero/Santera or Babalawo for more complex situations. These remedies are gentle starting points.",
    )
