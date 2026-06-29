"""
Astrology Engine — KAYAL Synthesis Platform
=============================================
Planetary position and chart calculation using Swiss Ephemeris (pyswisseph).

v2.0.0 additions:
    - _PLANET_DOMAIN_MAP expanded: sexuality, children_forecast, death_transition, legacy
    - _HOUSE_DOMAIN_MAP expanded: 5→children_forecast, 7→sexuality, 8→death_transition
    - _calculate_arabic_parts()        — Part of Fortune, Marriage, Children, Spirit
    - _calculate_progressions()        — secondary progressions (day-for-a-year)
    - _detect_stelliums()              — 3+ planets in same sign/house
    - _synastry_aspects()              — cross-chart aspects between two natal charts
    - _marriage_longevity_indicators() — 7th house overlays, Venus-Mars, Moon-Saturn
    - _children_astro_indicators()     — 5th house overlays, Moon-Jupiter, fertility
    - compute_synastry()               — full synastry → synastry_signals + indicators
    - compute_composite_chart()        — midpoint composite → composite_signals
    - compute_astrology() updated: timing_dict now includes arabic_parts,
      progressions, and stelliums keys
    - All v1.1.0 code preserved intact

Author: KAYAL Engineering
Version: 2.0.0
"""

from __future__ import annotations

import logging
import math
import os
from datetime import date, datetime, timezone
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    import swisseph as swe
    try:
        from synthesis.config import EPHE_PATH
    except ImportError:
        EPHE_PATH = os.environ.get("KAYAL_EPHE_PATH",
            r"C:\Users\user\Desktop\KAYAL SYNTHESIS ENGINE\data\ephemeris\ephe")
    swe.set_ephe_path(EPHE_PATH)
    SWE_AVAILABLE = True
    logger.info(f"Swiss Ephemeris initialised. Ephemeris path: {EPHE_PATH}")
except ImportError:
    SWE_AVAILABLE = False
    EPHE_PATH = ""
    logger.warning("pyswisseph not installed. Running in approximation mode.")

_PLANETS = {"Sun":0,"Moon":1,"Mercury":2,"Venus":3,"Mars":4,"Jupiter":5,
            "Saturn":6,"Uranus":7,"Neptune":8,"Pluto":9,"Rahu":11}

_SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
          "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]

_VEDIC_SIGNS = ["Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya",
                "Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena"]

_NAKSHATRAS = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha",
    "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
]

_HOUSE_PLACIDUS = b"P"
_HOUSE_WHOLE    = b"W"
_LAHIRI_AYANAMSA = 1

# v1.1.0 domain map — v2.0.0 expanded with new domains
_PLANET_DOMAIN_MAP: Dict[str, List[str]] = {
    "Sun":     ["career","character","health","identity"],
    "Moon":    ["love","health","character","children_forecast"],
    "Mercury": ["career","finance","character"],
    "Venus":   ["love","finance","wealth","sexuality"],
    "Mars":    ["career","health","character","sexuality"],
    "Jupiter": ["wealth","spiritual","career","children_forecast"],
    "Saturn":  ["career","timing","character","death_transition"],
    "Uranus":  ["career","spiritual","character"],
    "Neptune": ["spiritual","love","character"],
    "Pluto":   ["spiritual","character","career","death_transition"],
    "Rahu":    ["career","spiritual","character","children_forecast"],
}

# v1.1.0 house domain map — v2.0.0 expanded
_HOUSE_DOMAIN_MAP: Dict[int, str] = {
    1:"character",2:"finance",3:"career",4:"character",
    5:"children_forecast",   # v2.0.0: was "love"
    6:"health",
    7:"sexuality",           # v2.0.0: was "love"
    8:"death_transition",    # v2.0.0: was "wealth"
    9:"spiritual",10:"career",11:"career",12:"spiritual",
}

# Secondary house domain — used for 5th (love+children) and 7th (love+sexuality)
_HOUSE_SECONDARY_DOMAIN: Dict[int, str] = {5:"love", 7:"love", 8:"wealth"}

_SIGN_ELEMENT: Dict[str,str] = {
    "Aries":"fire","Leo":"fire","Sagittarius":"fire",
    "Taurus":"earth","Virgo":"earth","Capricorn":"earth",
    "Gemini":"air","Libra":"air","Aquarius":"air",
    "Cancer":"water","Scorpio":"water","Pisces":"water",
}

_SIGN_CHINESE_ELEMENT: Dict[str,str] = {
    "Aries":"fire","Leo":"fire","Sagittarius":"fire",
    "Taurus":"earth","Virgo":"earth","Capricorn":"earth",
    "Gemini":"metal","Libra":"metal","Aquarius":"metal",
    "Cancer":"water","Scorpio":"water","Pisces":"water",
}

_DIGNIFIED_SIGNS: Dict[str,List[str]] = {
    "Sun":["Leo","Aries"],"Moon":["Cancer","Taurus"],
    "Mercury":["Gemini","Virgo"],"Venus":["Taurus","Libra","Pisces"],
    "Mars":["Aries","Capricorn","Scorpio"],"Jupiter":["Sagittarius","Pisces","Cancer"],
    "Saturn":["Capricorn","Aquarius","Libra"],
}

_DEBILITATED_SIGNS: Dict[str,List[str]] = {
    "Sun":["Libra","Aquarius"],"Moon":["Scorpio","Capricorn"],
    "Mercury":["Pisces","Sagittarius"],"Venus":["Virgo","Aries"],
    "Mars":["Cancer","Taurus"],"Jupiter":["Capricorn","Gemini"],
    "Saturn":["Aries","Cancer"],
}

_ASPECT_TYPES: Dict[int,Tuple[str,str,int]] = {
    0:("conjunction","strong_positive",8), 60:("sextile","positive",6),
    90:("square","challenging",8), 120:("trine","strongly_positive",8),
    150:("quincunx","neutral",4), 180:("opposition","challenging",8),
}


def _julian_day(year,month,day,hour=12.0,utc_offset=0.0):
    ut=hour-utc_offset; xd=0
    if ut<0: ut+=24; xd=-1
    elif ut>=24: ut-=24; xd=1
    if SWE_AVAILABLE:
        return swe.julday(year,month,day+xd,ut)
    a=(14-month)//12; y=year+4800-a; m=month+12*a-3
    return day+xd+(153*m+2)//5+365*y+y//4-y//100+y//400-32045+ut/24.0


def _degree_to_sign(degree):
    degree=degree%360; si=int(degree/30); d=degree-si*30
    return _SIGNS[si],round(d,4),si


def _degree_to_vedic_sign(degree,ayanamsa):
    sid=(degree-ayanamsa)%360; si=int(sid/30); d=sid-si*30
    return _VEDIC_SIGNS[si],round(d,4),si


def _degree_to_nakshatra(sidereal_moon_lon):
    lon=sidereal_moon_lon%360; ns=360.0/27; ps=ns/4
    ni=int(lon/ns); din=lon-ni*ns; pada=int(din/ps)+1
    return _NAKSHATRAS[min(ni,26)],min(ni,26),pada


def _calculate_positions(jd,use_sidereal=False):
    if not SWE_AVAILABLE:
        return _approximate_positions(jd)
    if use_sidereal: swe.set_sid_mode(_LAHIRI_AYANAMSA,0,0)
    ayanamsa=swe.get_ayanamsa(jd) if use_sidereal else 0.0
    positions={}
    for pn,pi in _PLANETS.items():
        try:
            flags=swe.FLG_SWIEPH|(swe.FLG_SIDEREAL if use_sidereal else 0)
            result,_=swe.calc_ut(jd,pi,flags); lon=result[0]; spd=result[3]
            if use_sidereal: sign,deg,si=_degree_to_vedic_sign(lon+ayanamsa,ayanamsa)
            else: sign,deg,si=_degree_to_sign(lon)
            positions[pn]={"longitude":lon,"sign":sign,"degree":deg,"sign_idx":si,"retrograde":spd<0,"speed":round(spd,6)}
        except Exception as e: logger.warning(f"Planet failed {pn}: {e}")
    return positions


def _approximate_positions(jd):
    T=(jd-2451545.0)/36525.0
    L0=(280.46646+36000.76983*T)%360; M=math.radians((357.52911+35999.05029*T)%360)
    C=(1.914602-0.004817*T)*math.sin(M)+0.019993*math.sin(2*M)
    sl=(L0+C)%360; ml=(218.316+13.176396*(jd-2451545.0))%360
    pos={}
    for p,l in [("Sun",sl),("Moon",ml)]:
        sign,deg,si=_degree_to_sign(l)
        pos[p]={"longitude":l,"sign":sign,"degree":deg,"sign_idx":si,"retrograde":False,"speed":0.0}
    return pos


def _calculate_houses(jd,latitude,longitude,house_sys=_HOUSE_PLACIDUS,use_sidereal=False):
    if not SWE_AVAILABLE: return {"Ascendant":0.0,"Midheaven":90.0}
    try:
        if use_sidereal: swe.set_sid_mode(_LAHIRI_AYANAMSA,0,0)
        cusps,angles=swe.houses(jd,latitude,longitude,house_sys)
        h={str(i+1):cusps[i] for i in range(12)}
        h["Ascendant"]=angles[0]; h["Midheaven"]=angles[1]
        return h
    except Exception as e:
        logger.warning(f"House calc failed: {e}"); return {"Ascendant":0.0,"Midheaven":90.0}


def _detect_aspects(positions):
    aspects=[]; pnames=list(positions.keys())
    for i,p1 in enumerate(pnames):
        for p2 in pnames[i+1:]:
            d=abs(positions[p1]["longitude"]-positions[p2]["longitude"])%360
            if d>180: d=360-d
            for angle,(an,tone,orb) in _ASPECT_TYPES.items():
                if abs(d-angle)<=orb:
                    aspects.append({"planet1":p1,"planet2":p2,"aspect":an,"tone":tone,"orb":round(abs(d-angle),2),"angle":angle})
                    break
    aspects.sort(key=lambda a:a["orb"]); return aspects


def _lon_in_house(pl,hs,he):
    pl%=360; hs%=360; he%=360
    return (hs<=pl<he) if hs<=he else (pl>=hs or pl<he)


def _find_planet_house(planet_lon,houses):
    if not houses: return None
    for n in range(1,13):
        hs=houses.get(str(n),0.0); he=houses.get(str((n%12)+1),hs+30.0)
        if _lon_in_house(planet_lon,hs,he): return n
    return None


def _determine_tone_and_strength(planet,sign,retrograde):
    if sign in _DIGNIFIED_SIGNS.get(planet,[]): return "strongly_positive",0.92
    elif sign in _DEBILITATED_SIGNS.get(planet,[]): return "challenging",0.85
    elif retrograde: return "neutral",0.78
    return "positive",0.82


def _planet_to_signals(planet,sign,house,retrograde,aspects,system):
    signals=[]; domains=_PLANET_DOMAIN_MAP.get(planet,["character"])
    ce=_SIGN_CHINESE_ELEMENT.get(sign,"earth"); tone,strength=_determine_tone_and_strength(planet,sign,retrograde)
    for domain in domains:
        reading=_planet_domain_reading(planet,sign,domain,retrograde,house)
        signals.append({"feature":f"{planet.lower()}_in_{sign.lower()}","domain":domain,"tone":tone,"strength":strength,"reading":reading,
            "keywords":_planet_keywords(planet,sign),"astro_affinity":[planet,sign],"numerology_link":_planet_numerology(planet),
            "chinese_element":ce,"temporal_phase":"timeless","retrograde":retrograde,"house":house,"system":system})
    return signals


def _planet_domain_reading(planet,sign,domain,retrograde,house):
    retro=" in retrograde — energy directed inward" if retrograde else ""
    hs=f" in the {house}th house" if house else ""
    T={
        ("Sun","career"):f"Sun in {sign}{hs} — identity and purpose aligned with {sign} energy. Career thrives through authentic self-expression{retro}.",
        ("Sun","character"):f"Sun in {sign} — the core self expresses through {sign} qualities{retro}.",
        ("Sun","health"):f"Sun in {sign} — vitality and life force shaped by {sign} energy{retro}.",
        ("Sun","identity"):f"Sun in {sign} — solar identity and self-concept shaped by {sign}{retro}.",
        ("Moon","love"):f"Moon in {sign}{hs} — emotional nature and relational needs shaped by {sign}{retro}.",
        ("Moon","health"):f"Moon in {sign} — emotional rhythms and hormonal patterns follow {sign} cycles{retro}.",
        ("Moon","character"):f"Moon in {sign} — the emotional self, instincts, and inner world through {sign}{retro}.",
        ("Moon","children_forecast"):f"Moon in {sign} — emotional attunement to children and parenting style shaped by {sign}{retro}.",
        ("Mercury","career"):f"Mercury in {sign}{hs} — communication and professional presentation shaped by {sign}{retro}.",
        ("Mercury","finance"):f"Mercury in {sign} — financial reasoning and negotiation aligned with {sign}{retro}.",
        ("Mercury","character"):f"Mercury in {sign} — thought patterns and mental agility coloured by {sign}{retro}.",
        ("Venus","love"):f"Venus in {sign}{hs} — love expressed and received through {sign} energy{retro}.",
        ("Venus","finance"):f"Venus in {sign} — financial values and aesthetic sense aligned with {sign}{retro}.",
        ("Venus","wealth"):f"Venus in {sign} — capacity to attract resources flows through {sign}{retro}.",
        ("Venus","sexuality"):f"Venus in {sign} — sensual and sexual expression, desire nature, and intimacy style shaped by {sign}{retro}.",
        ("Mars","career"):f"Mars in {sign}{hs} — drive, initiative, and ambition expressed through {sign}{retro}.",
        ("Mars","health"):f"Mars in {sign} — physical energy and stamina follow {sign} patterns{retro}.",
        ("Mars","character"):f"Mars in {sign} — assertiveness and action style shaped by {sign}{retro}.",
        ("Mars","sexuality"):f"Mars in {sign} — sexual desire, pursuit style, and physical passion expressed through {sign}{retro}.",
        ("Jupiter","wealth"):f"Jupiter in {sign}{hs} — abundance and financial expansion flow through {sign}{retro}.",
        ("Jupiter","spiritual"):f"Jupiter in {sign} — spiritual wisdom and higher learning coloured by {sign}{retro}.",
        ("Jupiter","career"):f"Jupiter in {sign} — growth opportunities arrive through {sign} channels{retro}.",
        ("Jupiter","children_forecast"):f"Jupiter in {sign} — children's timing, nature, and blessings indicated by {sign} themes{retro}.",
        ("Saturn","career"):f"Saturn in {sign}{hs} — career mastery built through {sign}-style patience{retro}.",
        ("Saturn","timing"):f"Saturn in {sign} — karma and life lessons delivered through {sign} themes{retro}.",
        ("Saturn","character"):f"Saturn in {sign} — discipline, responsibility, and maturation shaped by {sign}{retro}.",
        ("Saturn","death_transition"):f"Saturn in {sign} — lessons around endings, legacy, and life completion themes in {sign}{retro}.",
        ("Uranus","career"):f"Uranus in {sign} — sudden career changes and innovation in {sign} style{retro}.",
        ("Uranus","spiritual"):f"Uranus in {sign} — spiritual awakening through sudden insights{retro}.",
        ("Neptune","spiritual"):f"Neptune in {sign}{hs} — spiritual receptivity and mystical tendencies coloured by {sign}{retro}.",
        ("Neptune","love"):f"Neptune in {sign} — romantic idealism and soul-level connection shaped by {sign}{retro}.",
        ("Pluto","spiritual"):f"Pluto in {sign} — deep transformation and soul evolution through {sign}{retro}.",
        ("Pluto","career"):f"Pluto in {sign} — generational power structures shaping the career landscape{retro}.",
        ("Pluto","death_transition"):f"Pluto in {sign} — generational relationship with death, transformation, and rebirth themes{retro}.",
        ("Rahu","career"):f"Rahu in {sign}{hs} — soul's north node: career dharma points toward {sign} mastery{retro}.",
        ("Rahu","spiritual"):f"Rahu in {sign} — karmic hunger expressed through {sign} experiences{retro}.",
        ("Rahu","children_forecast"):f"Rahu in {sign} — karmic patterns around children and progeny expressed through {sign}{retro}.",
    }
    return T.get((planet,domain),f"{planet} in {sign}{hs} — influences {domain} domain through {sign} energy{retro}.")


def _planet_keywords(planet,sign):
    pk={"Sun":["identity","vitality","authority","purpose","ego"],"Moon":["emotion","intuition","nurturing","cycles","memory"],
        "Mercury":["communication","analysis","adaptability","intellect"],"Venus":["love","beauty","harmony","values","attraction"],
        "Mars":["drive","courage","initiative","energy","conflict"],"Jupiter":["expansion","abundance","wisdom","opportunity","faith"],
        "Saturn":["discipline","mastery","karma","structure","time"],"Uranus":["innovation","freedom","awakening","rebellion"],
        "Neptune":["spirituality","intuition","dissolution","compassion"],"Pluto":["transformation","power","depth","regeneration"],
        "Rahu":["ambition","innovation","obsession","dharma"]}
    sk={"Aries":"initiative","Taurus":"persistence","Gemini":"versatility","Cancer":"nurturing","Leo":"creativity",
        "Virgo":"precision","Libra":"balance","Scorpio":"intensity","Sagittarius":"exploration","Capricorn":"ambition",
        "Aquarius":"innovation","Pisces":"compassion"}
    return pk.get(planet,["planetary_energy"])+[sk.get(sign,sign.lower())]


def _planet_numerology(planet):
    m={"Sun":[1,19],"Moon":[2,11],"Mercury":[5],"Venus":[6],"Mars":[9,1],"Jupiter":[3],
       "Saturn":[8,4],"Uranus":[4,11],"Neptune":[11,7],"Pluto":[9,22],"Rahu":[4,8]}
    return m.get(planet,[])


def _sign_to_domain_signal(sign,house,system="western"):
    domain=_HOUSE_DOMAIN_MAP.get(house,"character")
    return {"feature":f"house_{house}_{sign.lower()}","domain":domain,"tone":"positive","strength":0.80,
        "reading":f"{sign} on the {house}th house cusp — {sign} energy shapes how {domain} manifests.",
        "keywords":[sign.lower(),"house_influence",f"house_{house}"],"astro_affinity":[sign],"numerology_link":[house],
        "chinese_element":_SIGN_CHINESE_ELEMENT.get(sign,"earth"),"temporal_phase":"timeless","retrograde":False,"house":house,"system":system}


def _aspect_to_signal(aspect):
    p1=aspect["planet1"]; p2=aspect["planet2"]; asp=aspect["aspect"]; tone=aspect["tone"]
    d1=_PLANET_DOMAIN_MAP.get(p1,["character"]); d2=_PLANET_DOMAIN_MAP.get(p2,["character"])
    shared=[d for d in d1 if d in d2]; domain=shared[0] if shared else d1[0]
    quality="Harmonious flow" if "positive" in tone else "Creative tension"
    return {"feature":f"{p1.lower()}_{asp}_{p2.lower()}","domain":domain,"tone":tone,"strength":0.75,
        "reading":f"{p1} {asp} {p2} — {quality} between {p1.lower()} and {p2.lower()} energies in the {domain} domain.",
        "keywords":[p1.lower(),p2.lower(),asp],"astro_affinity":[p1,p2],"numerology_link":[],
        "chinese_element":None,"temporal_phase":"timeless","retrograde":False,"house":None,"system":"both"}


def _calculate_transits(natal_positions,current_jd):
    current=_calculate_positions(current_jd); transits=[]
    for tp in ["Saturn","Jupiter","Uranus","Neptune","Pluto"]:
        if tp not in current: continue
        tl=current[tp]["longitude"]; ts=current[tp]["sign"]
        for np_name in ["Sun","Moon","Venus","Mars","Mercury","Ascendant"]:
            if np_name not in natal_positions: continue
            nl=natal_positions[np_name]["longitude"]
            d=abs(tl-nl)%360
            if d>180: d=360-d
            if d<=8: transits.append((d,f"{tp} conjunct natal {np_name} in {ts} — significant {tp.lower()} influence on {np_name.lower()} matters"))
            elif 82<=d<=98: transits.append((abs(d-90),f"{tp} square natal {np_name} — tension between {tp.lower()} and {np_name.lower()} themes"))
            elif 112<=d<=128: transits.append((abs(d-120),f"{tp} trine natal {np_name} — harmonious {tp.lower()} support into {np_name.lower()} area"))
            elif 172<=d<=188: transits.append((abs(d-180),f"{tp} opposing natal {np_name} — polarity between {tp.lower()} demands and {np_name.lower()} needs"))
    transits.sort(key=lambda x:x[0]); return [desc for _,desc in transits[:5]]


def _saturn_return_phase(natal_saturn_lon,current_saturn_lon,age):
    d=abs(natal_saturn_lon-current_saturn_lon)%360
    if d>180: d=360-d
    if d<=12:
        if 25<=age<=32: return ("First Saturn Return (ages 27–30) — the great restructuring of early adult life. "
            "Career, relationships, identity, and foundational beliefs are all under Saturn's review.")
        elif 55<=age<=62: return ("Second Saturn Return (ages 57–60) — the harvest and legacy phase. "
            "Saturn asks: what have you built, and does it reflect who you truly are?")
    return None


def _jupiter_return_phase(natal_jupiter_lon,current_jupiter_lon,age):
    d=abs(natal_jupiter_lon-current_jupiter_lon)%360
    if d>180: d=360-d
    if d<=8:
        cycle=age//12
        return (f"Jupiter Return (approximately age {cycle*12}) — a 12-year cycle of expansion completing and restarting. "
                f"New philosophical directions and fortunate openings are available.")
    return None


def _vedic_dasha_approximate(nakshatra_idx,birth_moon_deg,current_year,birth_year):
    dasha=[("Ketu",7),("Venus",20),("Sun",6),("Moon",10),("Mars",7),
           ("Rahu",18),("Jupiter",16),("Saturn",19),("Mercury",17)]
    sli=nakshatra_idx%9; age=(current_year-birth_year)%120; cum=0
    for i in range(9):
        idx=(sli+i)%9; planet,years=dasha[idx]; cum+=years
        if age<cum:
            yid=age-(cum-years); yr=years-yid
            return {"current_dasha":planet,"years_remaining":round(yr,1),
                    "dasha_description":f"Currently in {planet} Mahadasha — approximately {round(yr,0):.0f} years remaining. {planet} themes dominate this life period."}
    return {"current_dasha":"Unknown","years_remaining":0,"dasha_description":""}


def _find_atmakaraka(positions,ayanamsa):
    mx=-1.0; ak="Sun"
    for p,pos in positions.items():
        if p=="Rahu": continue
        deg=((pos["longitude"]-ayanamsa)%360)%30
        if deg>mx: mx=deg; ak=p
    return ak


# ===========================================================================
# v2.0.0 — NEW FUNCTIONS
# ===========================================================================

def _calculate_arabic_parts(
    positions: Dict, houses: Dict, asc_lon: float, system: str = "western"
) -> Dict[str, Dict]:
    """
    Calculate the four primary Arabic Parts (Lots).

    Part of Fortune:  ASC + Moon - Sun (day chart) / ASC + Sun - Moon (night chart)
    Part of Marriage: ASC + DSC - Venus  (= ASC + (ASC+180) - Venus)
    Part of Children: ASC + Jupiter - Saturn (traditional Bonatti formula)
    Part of Spirit:   ASC + Sun - Moon (day) — complement of Fortune

    Returns dict keyed by part name with longitude, sign, house, reading.
    """
    parts: Dict[str, Dict] = {}

    sun_lon  = positions.get("Sun",  {}).get("longitude", 0.0)
    moon_lon = positions.get("Moon", {}).get("longitude", 0.0)
    jup_lon  = positions.get("Jupiter", {}).get("longitude", 0.0)
    sat_lon  = positions.get("Saturn", {}).get("longitude", 0.0)

    # Determine day/night chart: Sun above or below horizon (ASC)
    # Day chart: Sun lon is within 180° of ASC on the upper side
    sun_above = ((sun_lon - asc_lon) % 360) < 180
    is_day    = sun_above

    # Part of Fortune
    if is_day:
        fortune_lon = (asc_lon + moon_lon - sun_lon) % 360
    else:
        fortune_lon = (asc_lon + sun_lon - moon_lon) % 360
    fortune_sign, fortune_deg, _ = _degree_to_sign(fortune_lon)
    fortune_house = _find_planet_house(fortune_lon, houses)
    parts["Part of Fortune"] = {
        "longitude": fortune_lon, "sign": fortune_sign, "degree": fortune_deg,
        "house": fortune_house,
        "domain": "wealth",
        "reading": (f"Part of Fortune in {fortune_sign}"
                    + (f" ({_HOUSE_DOMAIN_MAP.get(fortune_house,'wealth')} house)" if fortune_house else "")
                    + " — the point of greatest material and life-force abundance. "
                    "Fortune flows most naturally through the themes of this sign and house."),
    }

    # Part of Spirit (complement)
    if is_day:
        spirit_lon = (asc_lon + sun_lon - moon_lon) % 360
    else:
        spirit_lon = (asc_lon + moon_lon - sun_lon) % 360
    spirit_sign, spirit_deg, _ = _degree_to_sign(spirit_lon)
    spirit_house = _find_planet_house(spirit_lon, houses)
    parts["Part of Spirit"] = {
        "longitude": spirit_lon, "sign": spirit_sign, "degree": spirit_deg,
        "house": spirit_house,
        "domain": "spiritual",
        "reading": (f"Part of Spirit in {spirit_sign}"
                    + (f" ({_HOUSE_DOMAIN_MAP.get(spirit_house,'spiritual')} house)" if spirit_house else "")
                    + " — the soul's spiritual centre of gravity. "
                    "Highest spiritual fulfilment is found through this sign's themes."),
    }

    # Part of Marriage
    dsc_lon     = (asc_lon + 180) % 360
    venus_lon   = positions.get("Venus", {}).get("longitude", asc_lon)
    marriage_lon = (asc_lon + dsc_lon - venus_lon) % 360
    marriage_sign, marriage_deg, _ = _degree_to_sign(marriage_lon)
    marriage_house = _find_planet_house(marriage_lon, houses)
    parts["Part of Marriage"] = {
        "longitude": marriage_lon, "sign": marriage_sign, "degree": marriage_deg,
        "house": marriage_house,
        "domain": "love",
        "reading": (f"Part of Marriage in {marriage_sign}"
                    + (f" ({_HOUSE_DOMAIN_MAP.get(marriage_house,'love')} house)" if marriage_house else "")
                    + " — the sign and house most naturally associated with this person's significant unions. "
                    "The partner's energy archetype is indicated here."),
    }

    # Part of Children
    children_lon = (asc_lon + jup_lon - sat_lon) % 360
    children_sign, children_deg, _ = _degree_to_sign(children_lon)
    children_house = _find_planet_house(children_lon, houses)
    parts["Part of Children"] = {
        "longitude": children_lon, "sign": children_sign, "degree": children_deg,
        "house": children_house,
        "domain": "children_forecast",
        "reading": (f"Part of Children in {children_sign}"
                    + (f" ({_HOUSE_DOMAIN_MAP.get(children_house,'children_forecast')} house)" if children_house else "")
                    + " — the natural sign and house for this person's progeny and parenting patterns. "
                    "Children's nature and timing are indicated here."),
    }

    return parts


def _calculate_progressions(
    birth_jd: float, age_years: int,
    latitude: float, longitude: float, utc_offset: float,
) -> Dict[str, Dict]:
    """
    Calculate secondary progressions (day-for-a-year).
    Each day after birth = one year of life.

    Returns dict of progressed planet positions for the current age.
    """
    if not SWE_AVAILABLE:
        return {"note": "Progressions require pyswisseph. Install with: pip install pyswisseph"}

    # Day-for-a-year: add age_years days to birth Julian Day
    progressed_jd = birth_jd + float(age_years)

    # Calculate progressed positions (tropical)
    progressed_positions = _calculate_positions(progressed_jd, use_sidereal=False)

    # Calculate progressed houses
    progressed_houses = _calculate_houses(
        progressed_jd, latitude, longitude, _HOUSE_PLACIDUS, use_sidereal=False
    )

    progressions: Dict[str, Dict] = {}
    for planet_name in ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant"]:
        if planet_name == "Ascendant":
            lon = progressed_houses.get("Ascendant", 0.0)
        elif planet_name in progressed_positions:
            lon = progressed_positions[planet_name]["longitude"]
        else:
            continue
        sign, deg, _ = _degree_to_sign(lon)
        house = _find_planet_house(lon, progressed_houses) if planet_name != "Ascendant" else 1
        progressions[planet_name] = {
            "longitude": lon,
            "sign": sign,
            "degree": round(deg, 3),
            "house": house,
            "reading": (f"Progressed {planet_name} in {sign}{f' (house {house})' if house else ''} — "
                        f"this decade's dominant {planet_name.lower()} theme is shaped by {sign} energy."),
        }

    return progressions


def _detect_stelliums(positions: Dict, houses: Dict) -> List[Dict]:
    """
    Detect stelliums: 3 or more planets in the same sign or house.
    Returns list of stellium descriptions for the Logic Layer.
    """
    stelliums: List[Dict] = []

    # By sign
    sign_groups: Dict[str, List[str]] = {}
    for planet, pos in positions.items():
        s = pos.get("sign", "")
        if s: sign_groups.setdefault(s, []).append(planet)

    for sign, planets in sign_groups.items():
        if len(planets) >= 3:
            domains = list(set(d for p in planets for d in _PLANET_DOMAIN_MAP.get(p, [])))
            stelliums.append({
                "type": "sign",
                "sign_or_house": sign,
                "planets": planets,
                "domains": domains[:3],
                "reading": (f"Stellium in {sign}: {', '.join(planets)} — "
                            f"an intense concentration of energy in {sign}. "
                            f"This sign's themes dominate the natal chart and "
                            f"shape {'and '.join(domains[:3])} domains profoundly."),
            })

    # By house
    house_groups: Dict[int, List[str]] = {}
    for planet, pos in positions.items():
        h = _find_planet_house(pos.get("longitude", 0.0), houses)
        if h: house_groups.setdefault(h, []).append(planet)

    for house_num, planets in house_groups.items():
        if len(planets) >= 3:
            primary_domain = _HOUSE_DOMAIN_MAP.get(house_num, "character")
            stelliums.append({
                "type": "house",
                "sign_or_house": house_num,
                "planets": planets,
                "domains": [primary_domain],
                "reading": (f"Stellium in the {house_num}th house: {', '.join(planets)} — "
                            f"intense concentration of planetary energy in the {primary_domain} domain. "
                            f"This area of life carries exceptional weight and importance."),
            })

    return stelliums


def _synastry_aspects(
    positions_a: Dict, positions_b: Dict
) -> List[Dict]:
    """
    Detect aspects between Person A's planets and Person B's planets.
    Returns cross-chart aspect list sorted by orb tightness.
    """
    aspects: List[Dict] = []
    key_planets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Ascendant"]

    for pa in key_planets:
        if pa not in positions_a: continue
        lon_a = positions_a[pa]["longitude"]
        sign_a = positions_a[pa].get("sign", "")

        for pb in key_planets:
            if pb not in positions_b: continue
            lon_b = positions_b[pb]["longitude"]

            d = abs(lon_a - lon_b) % 360
            if d > 180: d = 360 - d

            for angle, (asp_name, tone, orb) in _ASPECT_TYPES.items():
                if abs(d - angle) <= orb:
                    # Determine which domains this synastry aspect touches
                    da = _PLANET_DOMAIN_MAP.get(pa, ["character"])
                    db = _PLANET_DOMAIN_MAP.get(pb, ["character"])
                    shared = [x for x in da if x in db]
                    domain = shared[0] if shared else da[0]

                    quality = "harmonious" if "positive" in tone else "challenging"
                    aspects.append({
                        "planet_a": pa, "planet_b": pb,
                        "aspect": asp_name, "tone": tone,
                        "orb": round(abs(d - angle), 2),
                        "domain": domain,
                        "reading": (
                            f"Person A's {pa} {asp_name} Person B's {pb} — "
                            f"{quality} cross-chart connection in the {domain} domain. "
                            f"Person A's {pa.lower()} in {sign_a} interacts with Person B's {pb.lower()} energy."
                        ),
                    })
                    break

    aspects.sort(key=lambda x: x["orb"])
    return aspects


def _marriage_longevity_indicators(
    positions_a: Dict, positions_b: Dict,
    houses_a: Dict, houses_b: Dict,
) -> List[Dict]:
    """
    Evaluate specific marriage longevity indicators from synastry.
    Returns list of indicators with tone and reading.
    """
    indicators: List[Dict] = []

    # 7th house overlays — where does A's Sun/Venus/Moon fall in B's chart?
    for planet in ["Sun", "Moon", "Venus"]:
        if planet in positions_a:
            lon_a = positions_a[planet]["longitude"]
            sign_a = positions_a[planet].get("sign", "")
            house_in_b = _find_planet_house(lon_a, houses_b)
            if house_in_b in (7, 8, 5):
                indicators.append({
                    "type": "house_overlay",
                    "domain": "love",
                    "tone": "strongly_positive" if house_in_b == 7 else "positive",
                    "reading": (f"Person A's {planet} in {sign_a} falls in Person B's "
                                f"{house_in_b}th house — activating B's "
                                f"{'partnership' if house_in_b==7 else 'creativity/children' if house_in_b==5 else 'shared resources'} zone."),
                })

    # Venus-Mars cross aspects — attraction and desire
    for va, mb in [("Venus","Mars"),("Mars","Venus")]:
        if va in positions_a and mb in positions_b:
            lon_v = positions_a[va]["longitude"]
            lon_m = positions_b[mb]["longitude"]
            d = abs(lon_v - lon_m) % 360
            if d > 180: d = 360 - d
            if d <= 8:
                indicators.append({
                    "type": "venus_mars_conjunction",
                    "domain": "sexuality",
                    "tone": "strongly_positive",
                    "reading": (f"Person A's {va} conjunct Person B's {mb} (orb {round(d,1)}°) — "
                                "the most powerful romantic and physical attraction indicator in synastry. "
                                "Magnetic, intense mutual desire."),
                })
            elif 82 <= d <= 98:
                indicators.append({
                    "type": "venus_mars_square",
                    "domain": "sexuality",
                    "tone": "challenging",
                    "reading": (f"Person A's {va} square Person B's {mb} — "
                                "dynamic attraction combined with friction. "
                                "Strong desire but requires conscious channelling to avoid conflict."),
                })
            elif 112 <= d <= 128:
                indicators.append({
                    "type": "venus_mars_trine",
                    "domain": "love",
                    "tone": "positive",
                    "reading": (f"Person A's {va} trine Person B's {mb} — "
                                "harmonious romantic attraction flowing naturally. "
                                "Physical and aesthetic compatibility is strong."),
                })

    # Moon-Saturn aspects — commitment and longevity
    if "Moon" in positions_a and "Saturn" in positions_b:
        lon_m = positions_a["Moon"]["longitude"]
        lon_s = positions_b["Saturn"]["longitude"]
        d = abs(lon_m - lon_s) % 360
        if d > 180: d = 360 - d
        if d <= 8:
            indicators.append({
                "type": "moon_saturn_conjunction",
                "domain": "love",
                "tone": "positive",
                "reading": ("Person A's Moon conjunct Person B's Saturn — "
                            "the classic marriage longevity indicator. "
                            "B's Saturn stabilises A's emotions. "
                            "This aspect is associated with long-term, serious commitment."),
            })

    # Sun-Moon cross aspects — polarity and wholeness
    for sa, mb2 in [("Sun","Moon"),("Moon","Sun")]:
        if sa in positions_a and mb2 in positions_b:
            lon1 = positions_a[sa]["longitude"]
            lon2 = positions_b[mb2]["longitude"]
            d = abs(lon1 - lon2) % 360
            if d > 180: d = 360 - d
            if 172 <= d <= 188:
                indicators.append({
                    "type": "sun_moon_opposition",
                    "domain": "love",
                    "tone": "strongly_positive",
                    "reading": (f"Person A's {sa} opposite Person B's {mb2} (orb {round(abs(d-180),1)}°) — "
                                "the Sun-Moon opposition is the traditional marker of a complementary pair. "
                                "One person's light complements the other's feeling nature."),
                })

    return indicators


def _children_astro_indicators(
    positions_a: Dict, positions_b: Dict,
    houses_a: Dict, houses_b: Dict,
) -> List[Dict]:
    """
    Evaluate children timing and fertility indicators from synastry.
    Returns list of indicators with tone, domain, and reading.
    """
    indicators: List[Dict] = []

    # 5th house overlays
    for planet in ["Sun", "Moon", "Jupiter", "Venus"]:
        for person_label, positions, houses_other in [
            ("A", positions_a, houses_b),
            ("B", positions_b, houses_a),
        ]:
            if planet not in positions: continue
            lon_p = positions[planet]["longitude"]
            house_in_other = _find_planet_house(lon_p, houses_other)
            if house_in_other == 5:
                indicators.append({
                    "type": "fifth_house_overlay",
                    "domain": "children_forecast",
                    "tone": "positive",
                    "reading": (f"Person {person_label}'s {planet} falls in the other partner's 5th house — "
                                "strong activation of the children and creativity house in synastry. "
                                "Favourable for children and creative co-creation."),
                })

    # Moon-Jupiter cross aspects — fertility and children blessing
    for ml, jl in [("Moon","Jupiter"),("Jupiter","Moon")]:
        a_p = positions_a.get(ml or "Moon", {}); b_p = positions_b.get(jl or "Jupiter", {})
        if "longitude" in a_p and "longitude" in b_p:
            d = abs(a_p["longitude"] - b_p["longitude"]) % 360
            if d > 180: d = 360 - d
            if d <= 8 or (112 <= d <= 128):
                asp = "conjunct" if d <= 8 else "trine"
                indicators.append({
                    "type": f"moon_jupiter_{asp}",
                    "domain": "children_forecast",
                    "tone": "strongly_positive",
                    "reading": (f"Person A's {ml} {asp} Person B's {jl} — "
                                "one of the most favourable children and fertility indicators in synastry. "
                                "Jupiter blesses the Moon's maternal instinct. Children are karmatically indicated."),
                })

    # Jupiter in 5th of partner
    for person_label, positions, houses_other in [
        ("A", positions_a, houses_b), ("B", positions_b, houses_a)
    ]:
        if "Jupiter" in positions:
            lon_j = positions["Jupiter"]["longitude"]
            sign_j = positions["Jupiter"].get("sign", "")
            if _find_planet_house(lon_j, houses_other) == 5:
                indicators.append({
                    "type": "jupiter_in_5th_overlay",
                    "domain": "children_forecast",
                    "tone": "strongly_positive",
                    "reading": (f"Person {person_label}'s Jupiter in {sign_j} falls in the other partner's 5th house — "
                                "the blessing planet in the children house of synastry. "
                                "Strong traditional indicator for children and family."),
                })

    return indicators


def compute_synastry(
    # Person A birth data
    day_a: int, month_a: int, year_a: int,
    hour_a: float, lat_a: float, lon_a: float, utc_a: float,
    # Person B birth data
    day_b: int, month_b: int, year_b: int,
    hour_b: float, lat_b: float, lon_b: float, utc_b: float,
    system: str = "western",
    current_year: int = 2026,
) -> Dict:
    """
    Compute a full synastry analysis between two natal charts.

    Returns:
        {
            "cross_aspects":             List[Dict],
            "marriage_indicators":       List[Dict],
            "children_indicators":       List[Dict],
            "composite_summary":         Dict,    (midpoint Sun, Moon, Venus, Mars)
            "synastry_signals":          List[Dict],  (for collector.py)
            "dominant_synastry_tone":    str,
            "compatibility_overview":    str,
        }
    """
    use_sidereal = (system == "vedic")
    house_sys    = _HOUSE_WHOLE if use_sidereal else _HOUSE_PLACIDUS

    jd_a = _julian_day(year_a, month_a, day_a, hour_a, utc_a)
    jd_b = _julian_day(year_b, month_b, day_b, hour_b, utc_b)

    pos_a = _calculate_positions(jd_a, use_sidereal)
    pos_b = _calculate_positions(jd_b, use_sidereal)
    houses_a = _calculate_houses(jd_a, lat_a, lon_a, house_sys, use_sidereal)
    houses_b = _calculate_houses(jd_b, lat_b, lon_b, house_sys, use_sidereal)

    cross_aspects = _synastry_aspects(pos_a, pos_b)
    marriage_indicators = _marriage_longevity_indicators(pos_a, pos_b, houses_a, houses_b)
    children_indicators = _children_astro_indicators(pos_a, pos_b, houses_a, houses_b)

    # Build synastry signals for collector.py
    synastry_signals: List[Dict] = []
    for aspect in cross_aspects[:12]:
        synastry_signals.append({
            "feature": f"synastry_{aspect['planet_a'].lower()}_{aspect['aspect']}_{aspect['planet_b'].lower()}",
            "domain": aspect["domain"],
            "tone": aspect["tone"],
            "strength": max(0.65, 0.90 - aspect["orb"] * 0.03),
            "reading": aspect["reading"],
            "keywords": [aspect["planet_a"].lower(), aspect["planet_b"].lower(), aspect["aspect"]],
            "astro_affinity": [aspect["planet_a"], aspect["planet_b"]],
            "numerology_link": [],
            "chinese_element": None,
            "temporal_phase": "timeless",
            "retrograde": False,
            "house": None,
            "system": system,
        })

    for ind in marriage_indicators + children_indicators:
        synastry_signals.append({
            "feature": f"synastry_{ind['type']}",
            "domain": ind["domain"],
            "tone": ind["tone"],
            "strength": 0.85,
            "reading": ind["reading"],
            "keywords": [ind["type"], ind["domain"]],
            "astro_affinity": [],
            "numerology_link": [],
            "chinese_element": None,
            "temporal_phase": "timeless",
            "retrograde": False,
            "house": None,
            "system": system,
        })

    # Dominant tone
    pos_count = sum(1 for a in cross_aspects if "positive" in a["tone"])
    neg_count = sum(1 for a in cross_aspects if "challenging" in a["tone"])
    if pos_count >= neg_count * 2:
        dominant_tone = "strongly_positive"
        compat = "The synastry between these two charts shows predominantly harmonious cross-aspects. Natural flow and mutual support are the dominant energetic pattern."
    elif pos_count > neg_count:
        dominant_tone = "positive"
        compat = "The synastry shows more harmonious than challenging aspects. Compatibility is present with some growth edges."
    elif neg_count > pos_count:
        dominant_tone = "challenging"
        compat = "The synastry shows more challenging than harmonious aspects. Significant growth work is required for harmony, but the intensity can drive deep mutual development."
    else:
        dominant_tone = "neutral"
        compat = "The synastry shows balanced harmonious and challenging aspects. This is an equal-parts attraction and growth relationship."

    # Composite midpoint summary (Sun, Moon, Venus, Mars)
    composite_summary = {}
    for planet in ["Sun", "Moon", "Venus", "Mars"]:
        if planet in pos_a and planet in pos_b:
            lon_a_p = pos_a[planet]["longitude"]
            lon_b_p = pos_b[planet]["longitude"]
            mid = (lon_a_p + lon_b_p) / 2
            if abs(lon_a_p - lon_b_p) > 180:
                mid = (mid + 180) % 360
            sign, deg, _ = _degree_to_sign(mid)
            composite_summary[planet] = {"longitude": mid, "sign": sign, "degree": round(deg, 2),
                "reading": f"Composite {planet} in {sign} — the relationship's combined {planet.lower()} energy expresses through {sign}."}

    logger.info("compute_synastry completed",
                extra={"cross_aspects":len(cross_aspects),"marriage_indicators":len(marriage_indicators),
                       "children_indicators":len(children_indicators),"dominant_tone":dominant_tone})

    return {
        "cross_aspects": cross_aspects,
        "marriage_indicators": marriage_indicators,
        "children_indicators": children_indicators,
        "composite_summary": composite_summary,
        "synastry_signals": synastry_signals,
        "dominant_synastry_tone": dominant_tone,
        "compatibility_overview": compat,
    }


def compute_composite_chart(
    positions_a: Dict, positions_b: Dict,
    houses_a: Dict, houses_b: Dict,
    system: str = "western",
) -> Dict:
    """
    Compute the midpoint composite chart from two natal position sets.

    Returns:
        {
            "composite_positions": Dict,   — midpoint of each planet
            "composite_signals":   List[Dict],  — domain signals for collector
            "composite_asc":       Dict,         — midpoint Ascendant
        }
    """
    composite_positions: Dict[str, Dict] = {}
    composite_signals: List[Dict] = []

    for planet in ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"]:
        if planet not in positions_a or planet not in positions_b: continue
        lon_a = positions_a[planet]["longitude"]
        lon_b = positions_b[planet]["longitude"]
        mid = (lon_a + lon_b) / 2
        if abs(lon_a - lon_b) > 180: mid = (mid + 180) % 360
        sign, deg, _ = _degree_to_sign(mid)
        composite_positions[planet] = {"longitude": mid, "sign": sign, "degree": round(deg, 2)}

        # Generate composite signal
        ce = _SIGN_CHINESE_ELEMENT.get(sign, "earth")
        tone, strength = _determine_tone_and_strength(planet, sign, False)
        for domain in _PLANET_DOMAIN_MAP.get(planet, ["character"]):
            composite_signals.append({
                "feature": f"composite_{planet.lower()}_in_{sign.lower()}",
                "domain": domain, "tone": tone, "strength": strength * 0.90,
                "reading": (f"Composite {planet} in {sign} — the relationship entity's combined {planet.lower()} "
                            f"expresses through {sign} energy in the {domain} domain."),
                "keywords": [planet.lower(), sign.lower(), "composite", domain],
                "astro_affinity": [planet, sign],
                "numerology_link": _planet_numerology(planet),
                "chinese_element": ce, "temporal_phase": "timeless",
                "retrograde": False, "house": None, "system": system,
            })

    # Composite Ascendant
    asc_a = houses_a.get("Ascendant", 0.0)
    asc_b = houses_b.get("Ascendant", 0.0)
    mid_asc = (asc_a + asc_b) / 2
    if abs(asc_a - asc_b) > 180: mid_asc = (mid_asc + 180) % 360
    asc_sign, asc_deg, _ = _degree_to_sign(mid_asc)
    composite_asc = {"longitude": mid_asc, "sign": asc_sign, "degree": round(asc_deg, 2),
        "reading": f"Composite Ascendant in {asc_sign} — the relationship's outer face and first impression expresses through {asc_sign} energy."}

    return {
        "composite_positions": composite_positions,
        "composite_signals": composite_signals,
        "composite_asc": composite_asc,
    }


def compute_astrology(
    day,month,year,hour,latitude,longitude,utc_offset,
    system="western",current_date=None,current_year=2026,
):
    """
    Compute a complete astrological chart and synthesise signals.
    v2.0.0: timing_dict now includes arabic_parts, progressions, and stelliums.
    """
    if current_date is None: current_date=date.today()
    use_sidereal=(system=="vedic"); house_sys=_HOUSE_WHOLE if use_sidereal else _HOUSE_PLACIDUS
    birth_jd=_julian_day(year,month,day,hour,utc_offset)
    current_jd=_julian_day(current_date.year,current_date.month,current_date.day,12.0,utc_offset)
    natal_positions=_calculate_positions(birth_jd,use_sidereal)
    houses=_calculate_houses(birth_jd,latitude,longitude,house_sys,use_sidereal)
    aspects=_detect_aspects(natal_positions)
    all_signals: List[Dict]=[]

    for pn,pd in natal_positions.items():
        sign=pd["sign"]; retro=pd["retrograde"]; plon=pd["longitude"]
        ph=_find_planet_house(plon,houses)
        all_signals.extend(_planet_to_signals(pn,sign,ph,retro,aspects,system))

    if "Ascendant" in houses:
        al=houses["Ascendant"]; as2,_,_=_degree_to_sign(al)
        acs=_sign_to_domain_signal(as2,1,system)
        if acs:
            acs["strength"]=0.88
            acs["reading"]=(f"Ascendant in {as2} — the outer self, physical appearance, and first impressions "
                            f"shaped by {as2} energy. The soul's chosen vehicle for this incarnation.")
            all_signals.append(acs)

    if "Midheaven" in houses and not use_sidereal:
        ml=houses["Midheaven"]; ms,_,_=_degree_to_sign(ml)
        all_signals.append({"feature":f"midheaven_{ms.lower()}","domain":"career","tone":"positive","strength":0.88,
            "reading":f"Midheaven in {ms} — public image, career calling, and life purpose through {ms} energy.",
            "keywords":["career","public_image","calling","legacy",ms.lower()],"astro_affinity":[ms,"Saturn"],
            "numerology_link":[8,4],"chinese_element":_SIGN_CHINESE_ELEMENT.get(ms,"earth"),
            "temporal_phase":"timeless","retrograde":False,"house":10,"system":system})

    for aspect in aspects[:8]: all_signals.append(_aspect_to_signal(aspect))

    transits=_calculate_transits(natal_positions,current_jd)
    age=current_year-year; sat_phase=None; jup_return=None; jup_sign="unknown"

    if SWE_AVAILABLE:
        cp=_calculate_positions(current_jd)
        if "Saturn" in natal_positions and "Saturn" in cp:
            sat_phase=_saturn_return_phase(natal_positions["Saturn"]["longitude"],cp["Saturn"]["longitude"],age)
        if "Jupiter" in natal_positions and "Jupiter" in cp:
            jup_return=_jupiter_return_phase(natal_positions["Jupiter"]["longitude"],cp["Jupiter"]["longitude"],age)
        jup_sign=cp.get("Jupiter",{}).get("sign","unknown")

    # ── v2.0.0: Arabic Parts, Progressions, Stelliums ─────────────────────
    asc_lon = houses.get("Ascendant", 0.0)
    arabic_parts = _calculate_arabic_parts(natal_positions, houses, asc_lon, system)
    progressions = _calculate_progressions(birth_jd, age, latitude, longitude, utc_offset)
    stelliums    = _detect_stelliums(natal_positions, houses)

    timing_dict: Dict = {
        "current_transits":     transits,
        "next_major_transit":   transits[0] if transits else "No major transits currently active",
        "saturn_return_phase":  sat_phase,
        "jupiter_return_phase": jup_return,
        "jupiter_phase":        f"Jupiter transiting {jup_sign}",
        "age":                  age,
        # v2.0.0 new keys
        "arabic_parts":         arabic_parts,
        "progressions":         progressions,
        "stelliums":            stelliums,
    }

    vedic_chart=None
    if use_sidereal and SWE_AVAILABLE:
        swe.set_sid_mode(_LAHIRI_AYANAMSA,0,0); ay=swe.get_ayanamsa(birth_jd)
        if "Moon" in natal_positions:
            mlt=natal_positions["Moon"]["longitude"]; mls=(mlt-ay)%360; msi=int(mls/30)
            nn,ni,pada=_degree_to_nakshatra(mls)
            lls=(houses.get("Ascendant",0.0)-ay)%360; li=int(lls/30)
            dasha=_vedic_dasha_approximate(ni,mls,current_year,year)
            vedic_chart={"moon_sign":_VEDIC_SIGNS[msi],"nakshatra":nn,"nakshatra_pada":pada,
                "nakshatra_idx":ni,"lagna":_VEDIC_SIGNS[li],"atmakaraka":_find_atmakaraka(natal_positions,ay),
                "ayanamsa":round(ay,4),"dasha":dasha}

    logger.info("AstrologyEngine.compute completed",
        extra={"system":system,"signals_count":len(all_signals),"transits_count":len(transits),
               "has_saturn_rtn":bool(sat_phase),"has_vedic_chart":bool(vedic_chart),
               "arabic_parts_count":len(arabic_parts),"stelliums_count":len(stelliums)})

    return {"system":system,"signals":all_signals}, timing_dict, vedic_chart


def compute_western(day,month,year,hour,latitude,longitude,utc_offset,current_year=2026):
    return compute_astrology(day,month,year,hour,latitude,longitude,utc_offset,
        system="western",current_year=current_year)


def compute_vedic(day,month,year,hour,latitude,longitude,utc_offset,current_year=2026):
    return compute_astrology(day,month,year,hour,latitude,longitude,utc_offset,
        system="vedic",current_year=current_year)


def compute_both(day,month,year,hour,latitude,longitude,utc_offset,current_year=2026):
    """
    Compute both Western and Vedic charts in a single call.
    Returns: (western_signals, vedic_signals, timing_dict, vedic_chart)
    """
    ws,td,_=compute_western(day,month,year,hour,latitude,longitude,utc_offset,current_year)
    vs,_,vc=compute_vedic(day,month,year,hour,latitude,longitude,utc_offset,current_year)
    return ws,vs,td,vc
