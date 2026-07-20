"""
Fixed Stars (#14), full Asteroid catalog (#15), Dwarf Planets (#16), Eros & Psyche (#35).

All four are code-complete and ready to work — what's actually blocking them is data, not
missing implementation. Confirmed directly against your real seas_18.se1 earlier this
session: it covers Chiron/Ceres/Pallas/Juno/Vesta (the "big five," already live in
_calculate_asteroids() in synthesis_bridge.py) but NOT dwarf planets (Eris needs
s136199s.se1, confirmed via a real swisseph error naming that exact file) or Eros/Psyche
(need se00433s.se1 / se00016s.se1 respectively, also confirmed via real errors). Fixed
stars need a completely different kind of file — a star catalog, typically sefstars.txt,
not orbital-element files at all.

Every body below is attempted independently and fails silently (not a crash) if its file
isn't present — matching the exact defensive pattern _calculate_asteroids() already uses.
Right now, with only seas_18.se1 confirmed present, everything in this file will return
empty. Add the files named above (or run check_fixed_stars_and_dwarf_planets.py, delivered
earlier, to confirm exactly what you have) and this starts producing real data with zero
further code changes needed.
"""

import logging
from typing import Dict

logger = logging.getLogger(__name__)

_EXPANDED_ASTEROID_IDS = {
    "Eros": 433, "Psyche": 16, "Sappho": 80, "Amor": 1221,
    "Pandora": 55, "Lilith_asteroid": 1181, "Toro": 1685, "Icarus": 1566,
}

_DWARF_PLANET_IDS = {
    "Eris": 136199, "Haumea": 136108, "Makemake": 136472, "Sedna": 90377,
}

# A reasonable, well-documented set of astrologically significant fixed stars — not the
# "100+" a truly exhaustive catalog would have, but the ones most commonly referenced.
_FIXED_STARS = [
    "Regulus", "Spica", "Algol", "Aldebaran", "Antares", "Sirius", "Fomalhaut",
    "Vega", "Betelgeuse", "Rigel", "Altair", "Deneb", "Pollux", "Castor",
    "Arcturus", "Capella", "Achernar", "Canopus", "Alphecca", "Zosma",
]


def _calculate_extended_asteroids(day: int, month: int, year: int, hour: float, utc_offset: float) -> Dict:
    import swisseph as swe
    from synthesis.astrology_engine import _julian_day, _degree_to_sign

    try:
        jd = _julian_day(year, month, day, hour, utc_offset)
    except Exception as e:
        logger.warning(f"Extended asteroid calculation failed at Julian Day step: {e}")
        return {}

    results = {}
    for name, num in _EXPANDED_ASTEROID_IDS.items():
        try:
            result, flags = swe.calc_ut(jd, swe.AST_OFFSET + num)
            sign, deg, _ = _degree_to_sign(result[0])
            results[name] = {"sign": sign, "degree": round(deg, 2), "retrograde": result[3] < 0}
        except Exception as e:
            logger.info(f"{name} (asteroid #{num}) not available: {e}")
    return results


def _calculate_dwarf_planets(day: int, month: int, year: int, hour: float, utc_offset: float) -> Dict:
    import swisseph as swe
    from synthesis.astrology_engine import _julian_day, _degree_to_sign

    try:
        jd = _julian_day(year, month, day, hour, utc_offset)
    except Exception as e:
        logger.warning(f"Dwarf planet calculation failed at Julian Day step: {e}")
        return {}

    results = {}
    for name, num in _DWARF_PLANET_IDS.items():
        try:
            result, flags = swe.calc_ut(jd, swe.AST_OFFSET + num)
            sign, deg, _ = _degree_to_sign(result[0])
            results[name] = {"sign": sign, "degree": round(deg, 2), "retrograde": result[3] < 0}
        except Exception as e:
            logger.info(f"{name} (asteroid #{num}) not available: {e}")
    return results


def _calculate_fixed_stars(day: int, month: int, year: int, hour: float, utc_offset: float) -> Dict:
    import swisseph as swe
    from synthesis.astrology_engine import _julian_day, _degree_to_sign

    try:
        jd = _julian_day(year, month, day, hour, utc_offset)
    except Exception as e:
        logger.warning(f"Fixed star calculation failed at Julian Day step: {e}")
        return {}

    results = {}
    for star_name in _FIXED_STARS:
        try:
            result, returned_name, flags = swe.fixstar2_ut(star_name, jd)
            sign, deg, _ = _degree_to_sign(result[0])
            results[star_name] = {"sign": sign, "degree": round(deg, 2)}
        except Exception as e:
            logger.info(f"{star_name} not available: {e}")
    return results
