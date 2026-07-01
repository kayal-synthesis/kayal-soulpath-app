"""
Logic Engine — Remedies Submodule
===================================
Culturally calibrated spiritual remedy engine.

Traditions covered:
    Vedic      — Jyotish: mantra, gemstone, fasting, dana, rudraksha
    Chinese    — Five-element, Ba Zi, I Ching, feng shui
    Islamic    — Quranic surah, du'a, sadaqah, fasting
    Christian  — Scripture, prayer, novena, contemplative practice
    African    — Ancestral, herbal, community, libation
    Western    — Crystal, affirmation, candle, journaling
    Buddhist   — Merit-making, mantra, offering, compassion practice
    Syncretic  — Santería, Candomblé, Curanderismo

Entry point: remedy_engine.build_all_solutions()
"""

from .remedy_engine import build_domain_solution, build_all_solutions

__all__ = [
    "build_domain_solution",
    "build_all_solutions",
]