"""
Face Analysis Engine — KAYAL Synthesis Platform
================================================
Production-ready physiognomy feature extraction engine.

v3.0.0 additions:
    - ParentInheritanceMarker dataclass — forehead=father, chin=mother zone mapping
    - FaceHealthMarker dataclass — Mian Xiang zone-organ health indicators
    - FaceSpiritualMarker dataclass — spiritual gift indicators from geometry
    - FaceLongevityMarker dataclass — constitutional vitality indicators
    - FaceFeatures extended: parent_inheritance_markers, face_health_markers,
      face_spiritual_markers, face_longevity_markers
    - _extract_parent_inheritance() — parental zone analysis
    - _extract_face_health_markers() — health zone mapping
    - _extract_face_spiritual_markers() — spiritual gift indicators
    - _extract_face_longevity_markers() — longevity structural markers
    - FaceEngine.extract() updated to populate all 4 new fields
    - analyze_face() updated to include all 4 new fields in output
    - All v2.0.0 code preserved intact

Author: KAYAL Engineering
Version: 3.0.0
"""

from __future__ import annotations

import hashlib
import logging
import math
import time
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np

logger = logging.getLogger(__name__)


class LM:
    """Key MediaPipe FaceMesh landmark indices."""
    CHIN_TIP=152; JAW_LEFT=234; JAW_RIGHT=454
    JAW_LEFT_LOWER=172; JAW_RIGHT_LOWER=397
    GONION_LEFT=132; GONION_RIGHT=361
    FOREHEAD_TOP=10; FOREHEAD_LEFT=109; FOREHEAD_RIGHT=338
    LEFT_EYE_INNER=133; LEFT_EYE_OUTER=33; LEFT_EYE_TOP=159; LEFT_EYE_BOTTOM=145
    RIGHT_EYE_INNER=362; RIGHT_EYE_OUTER=263; RIGHT_EYE_TOP=386; RIGHT_EYE_BOTTOM=374
    LEFT_BROW_INNER=46; LEFT_BROW_OUTER=70; LEFT_BROW_PEAK=52
    RIGHT_BROW_INNER=276; RIGHT_BROW_OUTER=300; RIGHT_BROW_PEAK=282
    NOSE_TIP=4; NOSE_BASE_LEFT=64; NOSE_BASE_RIGHT=294
    NOSE_BRIDGE_TOP=6; NOSE_BRIDGE_MID=197; NOSE_LEFT_ALA=48; NOSE_RIGHT_ALA=278
    MOUTH_LEFT=61; MOUTH_RIGHT=291; UPPER_LIP_TOP=0; LOWER_LIP_BOTTOM=17
    UPPER_LIP_CENTER=13; LOWER_LIP_CENTER=14; PHILTRUM_TOP=164
    CHEEK_LEFT=116; CHEEK_RIGHT=345; MIDFACE_CENTER=168


class ImageQuality(str, Enum):
    GOOD="good"; ACCEPTABLE="acceptable"; POOR="poor"; UNUSABLE="unusable"

class Magnitude(str, Enum):
    HIGH="high"; MODERATE="moderate"; LOW="low"; UNCLEAR="unclear"

class FaceShape(str, Enum):
    OVAL="oval"; ROUND="round"; SQUARE="square"; HEART="heart"
    OBLONG="oblong"; DIAMOND="diamond"; TRIANGLE="triangle"; UNCLEAR="unclear"

class EyeShape(str, Enum):
    ALMOND="almond"; ROUND="round"; HOODED="hooded"; MONOLID="monolid"
    UPTURNED="upturned"; DOWNTURNED="downturned"; DEEP_SET="deep_set"; UNCLEAR="unclear"

class EyeSet(str, Enum):
    WIDE_SET="wide_set"; AVERAGE="average"; CLOSE_SET="close_set"

class NoseShape(str, Enum):
    STRAIGHT="straight"; AQUILINE="aquiline"; BUTTON="button"
    BROAD="broad"; NARROW="narrow"; UPTURNED="upturned"; UNCLEAR="unclear"

class LipShape(str, Enum):
    FULL="full"; THIN="thin"; WIDE="wide"; SMALL="small"
    CUPID_BOW="cupid_bow"; BALANCED="balanced"; UNCLEAR="unclear"

class BrowShape(str, Enum):
    ARCHED="arched"; STRAIGHT="straight"; ROUNDED="rounded"; ANGULAR="angular"; UNCLEAR="unclear"

class ChinShape(str, Enum):
    ROUNDED="rounded"; SQUARE="square"; POINTED="pointed"
    RECEDING="receding"; PROMINENT="prominent"; CLEFT="cleft"; UNCLEAR="unclear"

class JawlineType(str, Enum):
    STRONG="strong"; MODERATE="moderate"; SOFT="soft"; UNCLEAR="unclear"

class ForeheadHeight(str, Enum):
    HIGH="high"; AVERAGE="average"; LOW="low"

class ForeheadWidth(str, Enum):
    BROAD="broad"; AVERAGE="average"; NARROW="narrow"

class CheekbonePosition(str, Enum):
    HIGH="high"; MODERATE="moderate"; LOW="low"

class SkinTone(str, Enum):
    VERY_LIGHT="very_light"; LIGHT="light"; MEDIUM="medium"; DARK="dark"; VERY_DARK="very_dark"

class SkinTexture(str, Enum):
    SMOOTH="smooth"; MODERATE="moderate"; COARSE="coarse"

class EmotionLabel(str, Enum):
    JOY="joy"; SADNESS="sadness"; ANGER="anger"; SURPRISE="surprise"
    FEAR="fear"; DISGUST="disgust"; CONTEMPT="contempt"; NEUTRAL="neutral"


@dataclass
class FacialProportions:
    facial_index: float; upper_third_ratio: float; middle_third_ratio: float
    lower_third_ratio: float; eye_width_to_face: float; intercanthal_ratio: float
    nose_width_to_face: float; nose_height_to_face: float
    mouth_width_to_face: float; lip_height_ratio: float
    jaw_width_to_cheek: float; gonial_angle_deg: float
    chin_height_ratio: float; philtrum_ratio: float; brow_to_eye_ratio: float

@dataclass
class SymmetryFeature:
    overall: float; upper_third: float; middle_third: float; lower_third: float
    left_eye: float; right_eye: float; method: str

@dataclass
class EyeFeature:
    shape: EyeShape; width_ratio: float; height_ratio: float
    tilt_deg: float; set_position: EyeSet; lid_coverage: Magnitude

@dataclass
class NoseFeature:
    shape: NoseShape; width_ratio: float; height_ratio: float
    bridge_height: Magnitude; tip_projection: Magnitude; alar_flare: Magnitude

@dataclass
class LipFeature:
    shape: LipShape; width_ratio: float; upper_lip_ratio: float
    lower_lip_ratio: float; lip_fullness: Magnitude
    corner_direction: str; philtrum_depth: Magnitude

@dataclass
class BrowFeature:
    shape: BrowShape; arch_height: Magnitude; thickness: Magnitude
    brow_eye_gap: Magnitude; left_right_sym: float

@dataclass
class ForeheadFeature:
    height: ForeheadHeight; width: ForeheadWidth
    height_ratio: float; width_ratio: float; slope: str

@dataclass
class JawFeature:
    jawline_type: JawlineType; jaw_width_ratio: float
    gonial_angle: float; chin_shape: ChinShape; chin_projection: Magnitude

@dataclass
class CheekFeature:
    cheekbone_position: CheekbonePosition; cheekbone_width: Magnitude; fullness: Magnitude

@dataclass
class SkinFeature:
    tone: SkinTone; texture: SkinTexture; moisture: Magnitude
    uniformity: Magnitude; color_cast: str; radiance: Magnitude

@dataclass
class ExpressionFeature:
    smile_present: bool; smile_intensity: float
    brow_raise: float; brow_furrow: float
    lip_corner_direction: str; jaw_openness: float
    eye_openness_left: float; eye_openness_right: float
    dominant_signal: EmotionLabel

@dataclass
class AgingMarker:
    forehead_line_density: Magnitude; nasolabial_depth: Magnitude
    crow_feet_presence: Magnitude; lip_volume_indicator: Magnitude
    cheek_descent: Magnitude; skin_texture_age_proxy: Magnitude


# ===========================================================================
# v3.0.0 — NEW DATA CONTRACTS
# All v2.0.0 dataclasses above are preserved exactly.
# ===========================================================================

@dataclass
class ParentInheritanceMarker:
    """
    Identifies which parent's energy/patterns dominate in a specific facial zone.
    Traditional physiognomy: forehead = father's zone, chin/jaw = mother's zone,
    eyes = emotional inheritance, nose = ego/self patterns, cheeks = social/family.
    This engine reports zone geometry only — interpretation is the Logic Layer's role.
    """
    zone:            str       # "forehead", "chin_jaw", "eyes", "nose", "cheeks"
    parent:          str       # "father_dominant", "mother_dominant", "balanced", "unclear"
    dominance:       Magnitude # how strongly one parent's energy shows
    inherited_trait: str       # plain feature description that carries the inheritance
    zone_feature:    str       # specific geometric feature triggering this signal
    note:            str       # observation note for Logic Layer


@dataclass
class FaceHealthMarker:
    """
    Health vulnerability indicator derived from facial zone features.
    Traditional Chinese face reading (Mian Xiang) and Vedic physiognomy both
    map facial zones to specific organ systems.
    This engine reports observations only — diagnosis is NOT its role.
    """
    marker_type:  str       # "forehead_lines", "nasolabial_depth", "jaw_tension", etc.
    facial_zone:  str       # anatomical zone on the face
    system:       str       # body system: "nervous", "digestive", "cardiovascular", etc.
    severity:     Magnitude # LOW / MODERATE / HIGH
    note:         str       # plain observation description


@dataclass
class FaceSpiritualMarker:
    """
    Spiritual sensitivity and gift indicator from facial geometry.
    Deep-set eyes, high forehead, third-eye prominence, wide eye spacing, etc.
    These are structural observations — the Logic Layer maps them to spiritual profile.
    """
    marker_type:    str       # "deep_set_eyes", "high_forehead", "third_eye_zone", etc.
    presence:       Magnitude # how clearly the marker appears (LOW/MODERATE/HIGH)
    gift_indicated: str       # "psychic_depth", "spiritual_intelligence", etc.
    note:           str       # observation note


@dataclass
class FaceLongevityMarker:
    """
    Constitutional vitality and longevity indicator from facial structure.
    Strong jaw, high cheekbones, balanced symmetry, skin vitality.
    """
    marker_type: str       # "strong_jaw", "high_cheekbones", "balanced_symmetry", etc.
    indicator:   str       # "positive", "neutral", "caution"
    system:      str       # constitutional system: "structural", "vitality", "nervous"
    strength:    Magnitude
    note:        str


# ===========================================================================
# v3.0.0 — NEW EXTRACTION FUNCTIONS
# All v2.0.0 extractor functions above are preserved exactly.
# ===========================================================================


@dataclass
class FaceFeatures:
    """Complete facial feature payload for the Logic Layer. v3.0.0: 4 new fields added."""
    image_hash:     str
    image_quality:  ImageQuality
    confidence:     float
    processing_ms:  int
    landmark_count: int
    error:          Optional[str]            = None
    face_shape:     Optional[FaceShape]         = None
    proportions:    Optional[FacialProportions] = None
    symmetry:       Optional[SymmetryFeature]   = None
    left_eye:       Optional[EyeFeature]        = None
    right_eye:      Optional[EyeFeature]        = None
    nose:           Optional[NoseFeature]       = None
    lips:           Optional[LipFeature]        = None
    brows:          Optional[BrowFeature]       = None
    forehead:       Optional[ForeheadFeature]   = None
    jaw:            Optional[JawFeature]        = None
    cheeks:         Optional[CheekFeature]      = None
    skin:           Optional[SkinFeature]       = None
    expression:     Optional[ExpressionFeature] = None
    aging_markers:  Optional[AgingMarker]       = None
    raw_ratios:     Dict[str, float]            = field(default_factory=dict)
    # ── v3.0.0 new fields ────────────────────────────────────────────────
    parent_inheritance_markers: List[ParentInheritanceMarker] = field(default_factory=list)
    face_health_markers:        List[FaceHealthMarker]        = field(default_factory=list)
    face_spiritual_markers:     List[FaceSpiritualMarker]     = field(default_factory=list)
    face_longevity_markers:     List[FaceLongevityMarker]     = field(default_factory=list)

    def to_dict(self) -> Dict:
        return asdict(self)


def _image_hash(b): return hashlib.sha256(b).hexdigest()[:16]
def _lm_px(lm,h,w): return lm.x*w, lm.y*h
def _lm_z(lm): return lm.z
def _dist2d(p1,p2): return math.sqrt((p1[0]-p2[0])**2+(p1[1]-p2[1])**2)
def _midpoint(p1,p2): return ((p1[0]+p2[0])/2,(p1[1]+p2[1])/2)
def _angle_deg(p1,vertex,p2):
    v1=(p1[0]-vertex[0],p1[1]-vertex[1]); v2=(p2[0]-vertex[0],p2[1]-vertex[1])
    dot=v1[0]*v2[0]+v1[1]*v2[1]; mag=math.sqrt(v1[0]**2+v1[1]**2)*math.sqrt(v2[0]**2+v2[1]**2)
    return math.degrees(math.acos(max(-1.0,min(1.0,dot/mag)))) if mag else 0.0
def _tilt_deg(p_inner,p_outer):
    dx=p_outer[0]-p_inner[0]; dy=p_inner[1]-p_outer[1]
    return math.degrees(math.atan2(dy,dx)) if dx else 0.0
def _assess_quality(gray):
    lv=cv2.Laplacian(gray,cv2.CV_64F).var(); mb=float(np.mean(gray)); c=float(np.std(gray))
    ok=sum([lv>60, 45<mb<220, c>22])
    if ok==3: return ImageQuality.GOOD,1.00
    elif ok==2: return ImageQuality.ACCEPTABLE,0.80
    elif ok==1: return ImageQuality.POOR,0.55
    else: return ImageQuality.UNUSABLE,0.20


def _extract_proportions(lms,h,w):
    def px(i): return _lm_px(lms[i],h,w)
    fh_top=px(LM.FOREHEAD_TOP); chin=px(LM.CHIN_TIP)
    jl=px(LM.JAW_LEFT); jr=px(LM.JAW_RIGHT)
    fh=max(1.0,abs(chin[1]-fh_top[1])); fw=max(1.0,abs(jl[0]-jr[0]))
    fi=round(fw/fh,4)
    nt=px(LM.NOSE_TIP); bli=px(LM.LEFT_BROW_INNER); bri=px(LM.RIGHT_BROW_INNER)
    bly=(bli[1]+bri[1])/2; nby=(px(LM.NOSE_BASE_LEFT)[1]+px(LM.NOSE_BASE_RIGHT)[1])/2
    ut=max(0.0,bly-fh_top[1])/fh; mt=max(0.0,nby-bly)/fh; lt=max(0.0,chin[1]-nby)/fh
    lei=px(LM.LEFT_EYE_INNER); leo=px(LM.LEFT_EYE_OUTER)
    rei=px(LM.RIGHT_EYE_INNER); reo=px(LM.RIGHT_EYE_OUTER)
    lew=_dist2d(lei,leo); rew=_dist2d(rei,reo); aew=(lew+rew)/2
    ic=_dist2d(lei,rei); nla=px(LM.NOSE_LEFT_ALA); nra=px(LM.NOSE_RIGHT_ALA)
    nw=_dist2d(nla,nra); nb=px(LM.NOSE_BRIDGE_TOP); nh=_dist2d(nb,nt)
    ml=px(LM.MOUTH_LEFT); mr2=px(LM.MOUTH_RIGHT)
    ult=px(LM.UPPER_LIP_TOP); llb=px(LM.LOWER_LIP_BOTTOM)
    mw=_dist2d(ml,mr2); lh=_dist2d(ult,llb)
    gl=px(LM.GONION_LEFT); gr=px(LM.GONION_RIGHT); gaw=_dist2d(gl,gr)
    cl=px(LM.CHEEK_LEFT); cr2=px(LM.CHEEK_RIGHT); cw=_dist2d(cl,cr2)
    j2c=gaw/max(1.0,cw); ga=_angle_deg(gl,chin,gr)
    lly=llb[1]; ch2=max(0.0,chin[1]-lly); lth=max(1.0,lt*fh); chr2=ch2/lth
    pt=px(LM.PHILTRUM_TOP); ulty=ult[1]; pl=max(0.0,ulty-pt[1]); pr=pl/max(1.0,lth)
    let=px(LM.LEFT_EYE_TOP); lbk=px(LM.LEFT_BROW_PEAK)
    bg=abs(let[1]-lbk[1]); leb=px(LM.LEFT_EYE_BOTTOM); eh=_dist2d(let,leb)
    return FacialProportions(
        facial_index=fi, upper_third_ratio=round(ut,4), middle_third_ratio=round(mt,4),
        lower_third_ratio=round(lt,4), eye_width_to_face=round(aew/fw,4),
        intercanthal_ratio=round(ic/fw,4), nose_width_to_face=round(nw/fw,4),
        nose_height_to_face=round(nh/fh,4), mouth_width_to_face=round(mw/fw,4),
        lip_height_ratio=round(lh/max(1.0,mw),4), jaw_width_to_cheek=round(j2c,4),
        gonial_angle_deg=round(ga,2), chin_height_ratio=round(chr2,4),
        philtrum_ratio=round(pr,4), brow_to_eye_ratio=round(bg/max(1.0,eh),4))


def _classify_face_shape(props):
    fi=props.facial_index; ut=props.upper_third_ratio; lt=props.lower_third_ratio; j2c=props.jaw_width_to_cheek
    if fi<0.72: return FaceShape.OBLONG
    if fi>0.85 and j2c>0.88: return FaceShape.SQUARE
    if fi>0.82 and j2c<0.80 and abs(ut-lt)<0.05: return FaceShape.ROUND
    if ut>0.36 and j2c<0.78 and lt>0.34: return FaceShape.HEART
    if ut<0.30 and j2c<0.80 and props.middle_third_ratio>0.36: return FaceShape.DIAMOND
    if ut<0.30 and j2c>0.90: return FaceShape.TRIANGLE
    return FaceShape.OVAL


def _measure_symmetry(lms,gray,h,w):
    def px(i): return _lm_px(lms[i],h,w)
    cx=(px(LM.JAW_LEFT)[0]+px(LM.JAW_RIGHT)[0])/2
    def lsym(li,ri):
        lp=px(li); rp=px(ri)
        ld=abs(lp[0]-cx); rd=abs(rp[0]-cx)
        return 1.0-abs(ld-rd)/(ld+rd) if ld+rd else 1.0
    us=(lsym(LM.LEFT_BROW_INNER,LM.RIGHT_BROW_INNER)+lsym(LM.LEFT_BROW_OUTER,LM.RIGHT_BROW_OUTER)+lsym(LM.FOREHEAD_LEFT,LM.FOREHEAD_RIGHT))/3
    ms=(lsym(LM.LEFT_EYE_INNER,LM.RIGHT_EYE_INNER)+lsym(LM.LEFT_EYE_OUTER,LM.RIGHT_EYE_OUTER)+lsym(LM.NOSE_LEFT_ALA,LM.NOSE_RIGHT_ALA)+lsym(LM.CHEEK_LEFT,LM.CHEEK_RIGHT))/4
    ls=(lsym(LM.MOUTH_LEFT,LM.MOUTH_RIGHT)+lsym(LM.GONION_LEFT,LM.GONION_RIGHT)+lsym(LM.JAW_LEFT_LOWER,LM.JAW_RIGHT_LOWER))/3
    lew=_dist2d(px(LM.LEFT_EYE_INNER),px(LM.LEFT_EYE_OUTER)); rew=_dist2d(px(LM.RIGHT_EYE_INNER),px(LM.RIGHT_EYE_OUTER))
    leh=_dist2d(px(LM.LEFT_EYE_TOP),px(LM.LEFT_EYE_BOTTOM)); reh=_dist2d(px(LM.RIGHT_EYE_TOP),px(LM.RIGHT_EYE_BOTTOM))
    les=1.0-abs(leh-reh)/max(1.0,leh+reh); res=1.0-abs(lew-rew)/max(1.0,lew+rew)
    jlx=int(px(LM.JAW_LEFT)[0]); jrx=int(px(LM.JAW_RIGHT)[0])
    fy=int(px(LM.FOREHEAD_TOP)[1]); cy=int(px(LM.CHIN_TIP)[1]); cxi=int(cx)
    ls2=gray[fy:cy, max(0,cxi-(cxi-jlx)):cxi]; rs2=gray[fy:cy, cxi:min(w,cxi+(jrx-cxi))]
    psym=0.75
    if ls2.size>0 and rs2.size>0:
        mw=min(ls2.shape[1],rs2.shape[1])
        if mw>0:
            a=ls2[:,:mw]; b=np.fliplr(rs2[:,:mw])
            mse=float(np.mean((a.astype(float)-b.astype(float))**2))
            psym=max(0.0,1.0-mse/5000.0)
    ov=(us+ms+ls)/3*0.6+psym*0.4
    return SymmetryFeature(overall=round(min(1.0,max(0.0,ov)),4),upper_third=round(min(1.0,max(0.0,us)),4),
        middle_third=round(min(1.0,max(0.0,ms)),4),lower_third=round(min(1.0,max(0.0,ls)),4),
        left_eye=round(min(1.0,max(0.0,les)),4),right_eye=round(min(1.0,max(0.0,res)),4),method="landmark+pixel")


def _extract_eye(lms,h,w,ii,oi,ti,bi,fw,icr):
    def px(i): return _lm_px(lms[i],h,w)
    inn=px(ii); out=px(oi); top=px(ti); bot=px(bi)
    ew=_dist2d(inn,out); eh=_dist2d(top,bot); wr=ew/max(1.0,fw); hr=eh/max(1.0,ew)
    tilt=_tilt_deg(inn,out)
    if hr>0.38: sh=EyeShape.ROUND
    elif tilt>5: sh=EyeShape.UPTURNED
    elif tilt<-5: sh=EyeShape.DOWNTURNED
    elif hr<0.20: sh=EyeShape.HOODED
    else: sh=EyeShape.ALMOND
    es=EyeSet.WIDE_SET if icr>0.22 else EyeSet.CLOSE_SET if icr<0.17 else EyeSet.AVERAGE
    cy=(top[1]+bot[1])/2; lg=abs(top[1]-cy)/max(1.0,eh)
    lc=Magnitude.HIGH if lg<0.35 else Magnitude.MODERATE if lg<0.45 else Magnitude.LOW
    return EyeFeature(shape=sh,width_ratio=round(wr,4),height_ratio=round(hr,4),tilt_deg=round(tilt,2),set_position=es,lid_coverage=lc)


def _extract_nose(lms,h,w,fw,fh):
    def px(i): return _lm_px(lms[i],h,w)
    al=px(LM.NOSE_LEFT_ALA); ar=px(LM.NOSE_RIGHT_ALA); nt=px(LM.NOSE_TIP)
    bt=px(LM.NOSE_BRIDGE_TOP); bm=px(LM.NOSE_BRIDGE_MID)
    nw=_dist2d(al,ar); nh=_dist2d(bt,nt); wr=nw/max(1.0,fw); hr=nh/max(1.0,fh)
    btz=_lm_z(lms[LM.NOSE_BRIDGE_TOP]); tz=_lm_z(lms[LM.NOSE_TIP]); zd=tz-btz
    bh=Magnitude.HIGH if btz<-0.05 else Magnitude.LOW if btz>0.01 else Magnitude.MODERATE
    tp=Magnitude.HIGH if zd<-0.08 else Magnitude.LOW if zd>-0.02 else Magnitude.MODERATE
    af=Magnitude.HIGH if wr>0.32 else Magnitude.LOW if wr<0.22 else Magnitude.MODERATE
    if wr<0.22: sh=NoseShape.NARROW
    elif wr>0.32: sh=NoseShape.BROAD
    elif zd<-0.10: sh=NoseShape.AQUILINE
    elif nt[1]<bm[1]: sh=NoseShape.UPTURNED
    else: sh=NoseShape.STRAIGHT
    return NoseFeature(shape=sh,width_ratio=round(wr,4),height_ratio=round(hr,4),bridge_height=bh,tip_projection=tp,alar_flare=af)


def _extract_lips(lms,h,w,fw,lth):
    def px(i): return _lm_px(lms[i],h,w)
    ml=px(LM.MOUTH_LEFT); mr=px(LM.MOUTH_RIGHT)
    ut=px(LM.UPPER_LIP_TOP); lb=px(LM.LOWER_LIP_BOTTOM)
    uc=px(LM.UPPER_LIP_CENTER); lc=px(LM.LOWER_LIP_CENTER); pt=px(LM.PHILTRUM_TOP)
    mw=_dist2d(ml,mr); tl=_dist2d(ut,lb); ul=_dist2d(ut,uc); ll=_dist2d(lc,lb)
    wr=mw/max(1.0,fw); ulr=ul/max(1.0,tl); llr=ll/max(1.0,tl)
    lf=Magnitude.HIGH if tl/max(1.0,mw)>0.32 else Magnitude.LOW if tl/max(1.0,mw)<0.20 else Magnitude.MODERATE
    ct=_tilt_deg(ml,mr); cd="upturned" if ct>3 else "downturned" if ct<-3 else "neutral"
    pl=abs(ut[1]-pt[1]); pd=Magnitude.HIGH if pl/max(1.0,lth)>0.30 else Magnitude.LOW if pl/max(1.0,lth)<0.15 else Magnitude.MODERATE
    if wr>0.42: sh=LipShape.WIDE
    elif wr<0.30: sh=LipShape.SMALL
    elif lf==Magnitude.HIGH and ulr>0.52: sh=LipShape.CUPID_BOW
    elif lf==Magnitude.HIGH: sh=LipShape.FULL
    elif lf==Magnitude.LOW: sh=LipShape.THIN
    else: sh=LipShape.BALANCED
    return LipFeature(shape=sh,width_ratio=round(wr,4),upper_lip_ratio=round(ulr,4),lower_lip_ratio=round(llr,4),lip_fullness=lf,corner_direction=cd,philtrum_depth=pd)


def _extract_brows(lms,h,w):
    def px(i): return _lm_px(lms[i],h,w)
    li=px(LM.LEFT_BROW_INNER); lo=px(LM.LEFT_BROW_OUTER); lp=px(LM.LEFT_BROW_PEAK)
    ri=px(LM.RIGHT_BROW_INNER); ro=px(LM.RIGHT_BROW_OUTER); rp=px(LM.RIGHT_BROW_PEAK)
    let2=px(LM.LEFT_EYE_TOP); ret2=px(LM.RIGHT_EYE_TOP)
    lbl=_dist2d(li,lo); rbl=_dist2d(ri,ro)
    def ah(inner,outer,peak,blen):
        if blen==0: return 0.0
        dx=outer[0]-inner[0]; dy=outer[1]-inner[1]
        num=abs(dy*peak[0]-dx*peak[1]+outer[0]*inner[1]-outer[1]*inner[0])
        den=math.sqrt(dx**2+dy**2)
        return num/max(1.0,den*blen)
    la=ah(li,lo,lp,lbl); ra=ah(ri,ro,rp,rbl); aa=(la+ra)/2
    am=Magnitude.HIGH if aa>0.18 else Magnitude.LOW if aa<0.08 else Magnitude.MODERATE
    lg=abs(let2[1]-lp[1]); rg=abs(ret2[1]-rp[1])
    agr=((lg+rg)/2)/max(1.0,_dist2d(li,ri))
    gm=Magnitude.HIGH if agr>0.25 else Magnitude.LOW if agr<0.12 else Magnitude.MODERATE
    ls=abs(li[1]-lo[1])/max(1.0,lbl); rs2=abs(ri[1]-ro[1])/max(1.0,rbl)
    sym=1.0-abs(ls-rs2)/max(0.001,ls+rs2)
    tk=Magnitude.HIGH if aa<0.10 and gm==Magnitude.LOW else Magnitude.LOW if aa>0.20 else Magnitude.MODERATE
    if am==Magnitude.HIGH: sh=BrowShape.ARCHED
    elif am==Magnitude.LOW: sh=BrowShape.STRAIGHT
    else:
        pp=_dist2d(li,lp)/max(1.0,lbl)
        sh=BrowShape.ANGULAR if pp>0.65 else BrowShape.ROUNDED
    return BrowFeature(shape=sh,arch_height=am,thickness=tk,brow_eye_gap=gm,left_right_sym=round(min(1.0,max(0.0,sym)),4))


def _extract_forehead(lms,h,w,fh,fw,utr):
    def px(i): return _lm_px(lms[i],h,w)
    fl=px(LM.FOREHEAD_LEFT); fr=px(LM.FOREHEAD_RIGHT); fhw=_dist2d(fl,fr)
    hr=utr; wr=fhw/max(1.0,fw)
    ht=ForeheadHeight.HIGH if hr>0.36 else ForeheadHeight.LOW if hr<0.28 else ForeheadHeight.AVERAGE
    wt=ForeheadWidth.BROAD if wr>0.90 else ForeheadWidth.NARROW if wr<0.75 else ForeheadWidth.AVERAGE
    tz=_lm_z(lms[LM.FOREHEAD_TOP]); bz=(_lm_z(lms[LM.LEFT_BROW_INNER])+_lm_z(lms[LM.RIGHT_BROW_INNER]))/2
    zd=tz-bz; sl="receding" if zd>0.02 else "protruding" if zd<-0.02 else "vertical"
    return ForeheadFeature(height=ht,width=wt,height_ratio=round(hr,4),width_ratio=round(wr,4),slope=sl)


def _extract_jaw(lms,h,w,fw,props):
    def px(i): return _lm_px(lms[i],h,w)
    gl=px(LM.GONION_LEFT); gr=px(LM.GONION_RIGHT); chin=px(LM.CHIN_TIP)
    jw=_dist2d(gl,gr); jr=jw/max(1.0,fw); ga=props.gonial_angle_deg
    jt=JawlineType.STRONG if ga<115 else JawlineType.SOFT if ga>135 else JawlineType.MODERATE
    ch=props.chin_height_ratio; j2c=props.jaw_width_to_cheek
    if ch<0.25 and j2c>0.88: cs=ChinShape.SQUARE
    elif ch>0.45: cs=ChinShape.POINTED
    elif ch<0.20: cs=ChinShape.RECEDING
    else: cs=ChinShape.ROUNDED
    cz=_lm_z(lms[LM.CHIN_TIP])
    cp=Magnitude.HIGH if cz<-0.06 else Magnitude.LOW if cz>0.01 else Magnitude.MODERATE
    return JawFeature(jawline_type=jt,jaw_width_ratio=round(jr,4),gonial_angle=round(ga,2),chin_shape=cs,chin_projection=cp)


def _extract_cheeks(lms,h,w,fh,fw,jaw_ratio):
    def px(i): return _lm_px(lms[i],h,w)
    cl=px(LM.CHEEK_LEFT); cr=px(LM.CHEEK_RIGHT); fht=px(LM.FOREHEAD_TOP)
    cw=_dist2d(cl,cr); cr2=cw/max(1.0,fw)
    cyl=cl[1]; fty=fht[1]; cry=(cyl-fty)/max(1.0,fh)
    pos=CheekbonePosition.HIGH if cry<0.42 else CheekbonePosition.LOW if cry>0.55 else CheekbonePosition.MODERATE
    wm=Magnitude.HIGH if cr2>jaw_ratio+0.08 else Magnitude.LOW if cr2<jaw_ratio+0.02 else Magnitude.MODERATE
    chz=(_lm_z(lms[LM.CHEEK_LEFT])+_lm_z(lms[LM.CHEEK_RIGHT]))/2
    fl=Magnitude.HIGH if chz<-0.04 else Magnitude.LOW if chz>0.02 else Magnitude.MODERATE
    return CheekFeature(cheekbone_position=pos,cheekbone_width=wm,fullness=fl)


def _extract_skin(img,gray,fb):
    x,y,fw,fh=fb; x=max(0,x); y=max(0,y); x2=min(img.shape[1],x+fw); y2=min(img.shape[0],y+fh)
    fg=gray[y:y2,x:x2]; fc=img[y:y2,x:x2]
    if fg.size==0:
        return SkinFeature(tone=SkinTone.MEDIUM,texture=SkinTexture.MODERATE,moisture=Magnitude.MODERATE,uniformity=Magnitude.MODERATE,color_cast="neutral",radiance=Magnitude.MODERATE)
    iy1=int(fh*0.15); iy2=int(fh*0.85); ix1=int(fw*0.20); ix2=int(fw*0.80)
    rg=fg[iy1:iy2,ix1:ix2]; rc=fc[iy1:iy2,ix1:ix2]
    if rg.size==0: rg=fg; rc=fc
    br=float(np.mean(rg))
    tn=SkinTone.VERY_LIGHT if br>200 else SkinTone.LIGHT if br>160 else SkinTone.MEDIUM if br>110 else SkinTone.DARK if br>65 else SkinTone.VERY_DARK
    cl=cv2.createCLAHE(clipLimit=2.0,tileGridSize=(8,8)); eq=cl.apply(rg); ts=float(np.std(eq))
    tx=SkinTexture.SMOOTH if ts<18 else SkinTexture.COARSE if ts>38 else SkinTexture.MODERATE
    btr=float(np.sum(rg>230))/max(1,rg.size)
    mo=Magnitude.HIGH if btr>0.025 else Magnitude.LOW if btr<0.003 else Magnitude.MODERATE
    pm=[]; ph=max(1,rg.shape[0]//4); pw=max(1,rg.shape[1]//4)
    for r in range(4):
        for c in range(4):
            p=rg[r*ph:(r+1)*ph,c*pw:(c+1)*pw]
            if p.size>0: pm.append(float(np.mean(p)))
    us=float(np.std(pm)) if pm else 30.0
    un=Magnitude.HIGH if us<12 else Magnitude.LOW if us>28 else Magnitude.MODERATE
    mb=float(np.mean(rc[:,:,0])); mg=float(np.mean(rc[:,:,1])); mr=float(np.mean(rc[:,:,2]))
    if mr>mg+12 and mr>mb+12: cc="warm"
    elif mg>mr+8 and mg>mb+8: cc="yellow"
    elif mb>mr+12 and mb>mg+8: cc="cool"
    elif br<80: cc="pale"
    else: cc="neutral"
    lm=float(np.mean(np.abs(cv2.Laplacian(rg,cv2.CV_64F))))
    ra=Magnitude.HIGH if btr>0.015 and lm<12 else Magnitude.LOW if btr<0.005 or lm>22 else Magnitude.MODERATE
    return SkinFeature(tone=tn,texture=tx,moisture=mo,uniformity=un,color_cast=cc,radiance=ra)


def _measure_expression(lms,h,w):
    def px(i): return _lm_px(lms[i],h,w)
    ml=px(LM.MOUTH_LEFT); mr=px(LM.MOUTH_RIGHT)
    fh2=abs(px(LM.CHIN_TIP)[1]-px(LM.FOREHEAD_TOP)[1]); mw=_dist2d(ml,mr)
    sr=mw/max(1.0,fh2); sp=sr>0.28; si=min(1.0,max(0.0,(sr-0.22)/0.18))
    let=px(LM.LEFT_EYE_TOP); lbk=px(LM.LEFT_BROW_PEAK)
    ret=px(LM.RIGHT_EYE_TOP); rbk=px(LM.RIGHT_BROW_PEAK)
    leh=_dist2d(px(LM.LEFT_EYE_TOP),px(LM.LEFT_EYE_BOTTOM))
    reh=_dist2d(px(LM.RIGHT_EYE_TOP),px(LM.RIGHT_EYE_BOTTOM))
    lg=abs(let[1]-lbk[1]); rg=abs(ret[1]-rbk[1])
    br=min(1.0,max(0.0,((lg/max(1.0,leh)+rg/max(1.0,reh))/2-0.8)/1.2))
    ig=_dist2d(px(LM.LEFT_BROW_INNER),px(LM.RIGHT_BROW_INNER))
    eg=_dist2d(px(LM.LEFT_EYE_INNER),px(LM.RIGHT_EYE_INNER))
    bf=min(1.0,max(0.0,1.0-ig/max(1.0,eg)))
    ct2=_tilt_deg(ml,mr); cd="upturned" if ct2>3 else "downturned" if ct2<-3 else "neutral"
    uc=px(LM.UPPER_LIP_CENTER); lc=px(LM.LOWER_LIP_CENTER)
    lpg=_dist2d(uc,lc); jo=min(1.0,max(0.0,lpg/max(1.0,mw)))
    lo=min(1.0,max(0.0,leh/max(1.0,_dist2d(px(LM.LEFT_EYE_INNER),px(LM.LEFT_EYE_OUTER)))))
    ro=min(1.0,max(0.0,reh/max(1.0,_dist2d(px(LM.RIGHT_EYE_INNER),px(LM.RIGHT_EYE_OUTER)))))
    if sp and si>0.5: dom=EmotionLabel.JOY
    elif cd=="downturned" and br<0.2: dom=EmotionLabel.SADNESS
    elif bf>0.6 and cd=="downturned": dom=EmotionLabel.ANGER
    elif br>0.6 and jo>0.4: dom=EmotionLabel.SURPRISE
    elif bf>0.5 and si<0.1: dom=EmotionLabel.DISGUST
    elif br>0.5 and lo>0.6: dom=EmotionLabel.FEAR
    else: dom=EmotionLabel.NEUTRAL
    return ExpressionFeature(smile_present=sp,smile_intensity=round(si,3),brow_raise=round(br,3),brow_furrow=round(bf,3),lip_corner_direction=cd,jaw_openness=round(jo,3),eye_openness_left=round(lo,3),eye_openness_right=round(ro,3),dominant_signal=dom)


def _extract_aging_markers(gray,fb,lms,h,w):
    def px(i): return _lm_px(lms[i],h,w)
    x,y,fw,fh=fb; x=max(0,x); y=max(0,y)
    fg=gray[y:min(gray.shape[0],y+fh),x:min(gray.shape[1],x+fw)]
    if fg.size==0:
        return AgingMarker(forehead_line_density=Magnitude.UNCLEAR,nasolabial_depth=Magnitude.UNCLEAR,crow_feet_presence=Magnitude.UNCLEAR,lip_volume_indicator=Magnitude.MODERATE,cheek_descent=Magnitude.UNCLEAR,skin_texture_age_proxy=Magnitude.UNCLEAR)
    fhl,fwl=fg.shape[:2]
    fr=fg[:max(1,fhl//3),:]
    cl=cv2.createCLAHE(clipLimit=2.0,tileGridSize=(4,4)); feq=cl.apply(fr)
    sh=cv2.Sobel(feq,cv2.CV_64F,0,1,ksize=3)
    hed=float(np.sum(np.abs(sh)>30))/max(1,fr.size)
    fl=Magnitude.HIGH if hed>0.06 else Magnitude.LOW if hed<0.02 else Magnitude.MODERATE
    nby2=int(px(LM.NOSE_BASE_LEFT)[1])-y; my2=int(px(LM.MOUTH_LEFT)[1])-y
    ny1=max(0,nby2); ny2=min(fhl,my2); nx1=max(0,fwl//5); nx2=min(fwl,fwl*4//5)
    nr=fg[ny1:ny2,nx1:nx2]; ns=float(np.std(nr)) if nr.size>0 else 20.0
    nl=Magnitude.HIGH if ns>35 else Magnitude.LOW if ns<18 else Magnitude.MODERATE
    loy2=int(px(LM.LEFT_EYE_OUTER)[1])-y; lox=int(px(LM.LEFT_EYE_OUTER)[0])-x
    cy1=max(0,loy2-int(fhl*0.04)); cy2=min(fhl,loy2+int(fhl*0.04))
    cx1=max(0,lox-int(fwl*0.12)); cr2=fg[cy1:cy2,cx1:max(cx1+1,lox)]
    cs=float(np.std(cr2)) if cr2.size>0 else 15.0
    cf=Magnitude.HIGH if cs>28 else Magnitude.LOW if cs<14 else Magnitude.MODERATE
    mypx=int(px(LM.UPPER_LIP_TOP)[1])-y; lr2=fg[max(0,mypx-5):min(fhl,mypx+int(fhl*0.08)),:]
    ls2=float(np.std(lr2)) if lr2.size>0 else 20.0
    lv=Magnitude.HIGH if ls2<18 else Magnitude.LOW if ls2>32 else Magnitude.MODERATE
    cy_rel=(int(px(LM.CHEEK_LEFT)[1])-y)/max(1,fhl)
    cd=Magnitude.HIGH if cy_rel>0.60 else Magnitude.LOW if cy_rel<0.45 else Magnitude.MODERATE
    fs=float(np.std(fg))
    tp=Magnitude.HIGH if fs>42 else Magnitude.LOW if fs<22 else Magnitude.MODERATE
    return AgingMarker(forehead_line_density=fl,nasolabial_depth=nl,crow_feet_presence=cf,lip_volume_indicator=lv,cheek_descent=cd,skin_texture_age_proxy=tp)


def _face_box_from_landmarks(lms,h,w):
    xs=[int(l.x*w) for l in lms]; ys=[int(l.y*h) for l in lms]
    return max(0,min(xs)-10),max(0,min(ys)-10),min(w,max(xs)+10)-max(0,min(xs)-10),min(h,max(ys)+10)-max(0,min(ys)-10)


def _build_raw_ratios(props,sym):
    return {"facial_index":props.facial_index,"upper_third":props.upper_third_ratio,"middle_third":props.middle_third_ratio,"lower_third":props.lower_third_ratio,"eye_width_to_face":props.eye_width_to_face,"intercanthal_ratio":props.intercanthal_ratio,"nose_width_to_face":props.nose_width_to_face,"mouth_width_to_face":props.mouth_width_to_face,"jaw_to_cheek":props.jaw_width_to_cheek,"gonial_angle":props.gonial_angle_deg,"chin_height_ratio":props.chin_height_ratio,"philtrum_ratio":props.philtrum_ratio,"brow_eye_ratio":props.brow_to_eye_ratio,"symmetry_overall":sym.overall,"symmetry_upper":sym.upper_third,"symmetry_middle":sym.middle_third,"symmetry_lower":sym.lower_third}

def _extract_parent_inheritance(
    props:    FacialProportions,
    forehead: Optional[ForeheadFeature],
    jaw:      Optional[JawFeature],
    cheeks:   Optional[CheekFeature],
    brows:    Optional[BrowFeature],
    skin:     Optional[SkinFeature],
) -> List[ParentInheritanceMarker]:
    """
    Map facial zones to parental inheritance patterns.
    Traditional physiognomy:
    - Forehead (upper third) = father's zone — intellect, career patterns, authority
    - Chin / jaw (lower zone) = mother's zone — resilience, emotional foundation, nurturing
    - Eyes = emotional inheritance — which parent's emotional style dominates
    - Nose = ego/identity zone — personal power patterns
    - Cheeks = social/family zone — communal and family inheritance
    """
    markers: List[ParentInheritanceMarker] = []

    # ── FOREHEAD ZONE (Father's territory) ─────────────────────────────────
    if forehead:
        if forehead.height == ForeheadHeight.HIGH:
            markers.append(ParentInheritanceMarker(
                zone="forehead", parent="father_dominant", dominance=Magnitude.HIGH,
                inherited_trait="High forehead — expansive intellectual capacity inherited from the paternal line. Father likely had strong intellectual or authority presence.",
                zone_feature=f"forehead_height={forehead.height.value}",
                note="High forehead in physiognomy indicates strong paternal intellectual inheritance.",
            ))
        elif forehead.height == ForeheadHeight.LOW:
            markers.append(ParentInheritanceMarker(
                zone="forehead", parent="father_dominant", dominance=Magnitude.LOW,
                inherited_trait="Lower forehead — paternal intellectual inheritance is present but expressed through practical action rather than abstract thought.",
                zone_feature=f"forehead_height={forehead.height.value}",
                note="Lower forehead indicates practical intelligence from paternal line.",
            ))
        else:
            markers.append(ParentInheritanceMarker(
                zone="forehead", parent="balanced", dominance=Magnitude.MODERATE,
                inherited_trait="Balanced forehead — both paternal and maternal intellectual influences are present in roughly equal measure.",
                zone_feature=f"forehead_height={forehead.height.value}",
                note="Average forehead — balanced parental intellectual inheritance.",
            ))

        if forehead.slope == "receding":
            markers.append(ParentInheritanceMarker(
                zone="forehead", parent="father_dominant", dominance=Magnitude.MODERATE,
                inherited_trait="Receding forehead slope — paternal line carries patterns of action over deliberation; a tendency to move quickly.",
                zone_feature="forehead_slope=receding",
                note="Receding slope traditionally indicates paternal pattern of impulsive decisiveness.",
            ))
        elif forehead.slope == "protruding":
            markers.append(ParentInheritanceMarker(
                zone="forehead", parent="father_dominant", dominance=Magnitude.MODERATE,
                inherited_trait="Protruding forehead — deep analytical inheritance from the paternal line. The tendency to deliberate before acting.",
                zone_feature="forehead_slope=protruding",
                note="Protruding slope indicates paternal pattern of careful deliberation.",
            ))

    # ── CHIN / JAW ZONE (Mother's territory) ───────────────────────────────
    if jaw:
        if jaw.jawline_type == JawlineType.STRONG:
            markers.append(ParentInheritanceMarker(
                zone="chin_jaw", parent="mother_dominant", dominance=Magnitude.HIGH,
                inherited_trait="Strong jawline — resilience, determination, and protective instincts inherited from the maternal line. Mother likely had a strong, enduring presence.",
                zone_feature=f"jawline={jaw.jawline_type.value}",
                note="Strong jaw in physiognomy indicates powerful maternal resilience inheritance.",
            ))
        elif jaw.jawline_type == JawlineType.SOFT:
            markers.append(ParentInheritanceMarker(
                zone="chin_jaw", parent="mother_dominant", dominance=Magnitude.MODERATE,
                inherited_trait="Soft jawline — maternal inheritance of sensitivity, receptivity, and emotional openness rather than physical endurance.",
                zone_feature=f"jawline={jaw.jawline_type.value}",
                note="Soft jaw indicates maternal inheritance of emotional sensitivity.",
            ))
        else:
            markers.append(ParentInheritanceMarker(
                zone="chin_jaw", parent="balanced", dominance=Magnitude.MODERATE,
                inherited_trait="Moderate jaw — balanced maternal inheritance of resilience and sensitivity.",
                zone_feature=f"jawline={jaw.jawline_type.value}",
                note="Moderate jawline indicates balanced maternal inheritance.",
            ))

        if jaw.chin_shape == ChinShape.POINTED:
            markers.append(ParentInheritanceMarker(
                zone="chin_jaw", parent="mother_dominant", dominance=Magnitude.MODERATE,
                inherited_trait="Pointed chin — maternal inheritance of intuitive, discerning nature and selectivity in relationships.",
                zone_feature="chin_shape=pointed",
                note="Pointed chin indicates maternal pattern of selective discernment.",
            ))
        elif jaw.chin_shape == ChinShape.SQUARE:
            markers.append(ParentInheritanceMarker(
                zone="chin_jaw", parent="mother_dominant", dominance=Magnitude.HIGH,
                inherited_trait="Square chin — maternal inheritance of stubborn endurance, practical strength, and grounded stability.",
                zone_feature="chin_shape=square",
                note="Square chin indicates strong maternal pattern of enduring stability.",
            ))
        elif jaw.chin_shape == ChinShape.RECEDING:
            markers.append(ParentInheritanceMarker(
                zone="chin_jaw", parent="mother_dominant", dominance=Magnitude.LOW,
                inherited_trait="Receding chin — maternal line carries patterns of yielding and accommodation; boundaries may need conscious cultivation.",
                zone_feature="chin_shape=receding",
                note="Receding chin indicates maternal pattern of accommodation.",
            ))

    # ── CHEEK ZONE (Family/social inheritance) ─────────────────────────────
    if cheeks:
        if cheeks.cheekbone_position == CheekbonePosition.HIGH:
            markers.append(ParentInheritanceMarker(
                zone="cheeks", parent="balanced", dominance=Magnitude.HIGH,
                inherited_trait="High cheekbones — social authority, resilience, and noble bearing inherited from the ancestral line. Both parents likely carried status and presence.",
                zone_feature="cheekbone_position=high",
                note="High cheekbones traditionally indicate strong ancestral social standing inheritance.",
            ))
        elif cheeks.cheekbone_position == CheekbonePosition.LOW:
            markers.append(ParentInheritanceMarker(
                zone="cheeks", parent="balanced", dominance=Magnitude.LOW,
                inherited_trait="Low cheekbones — familial inheritance tends toward quiet service and support rather than social authority or public standing.",
                zone_feature="cheekbone_position=low",
                note="Lower cheekbones indicate inheritance of service-oriented family patterns.",
            ))

    # ── BROW ZONE (Paternal intellectual style modifier) ───────────────────
    if brows:
        if brows.shape == BrowShape.ARCHED:
            markers.append(ParentInheritanceMarker(
                zone="forehead", parent="father_dominant", dominance=Magnitude.MODERATE,
                inherited_trait="Arched brows — paternal inheritance of intuitive discernment and high standards. The father figure set an elevated bar.",
                zone_feature="brow_shape=arched",
                note="Arched brows indicate paternal inheritance of high intellectual/aesthetic standards.",
            ))
        elif brows.shape == BrowShape.STRAIGHT:
            markers.append(ParentInheritanceMarker(
                zone="forehead", parent="father_dominant", dominance=Magnitude.MODERATE,
                inherited_trait="Straight brows — paternal inheritance of direct, logical, and consistent approach. The father figure modelled steady, unflinching effort.",
                zone_feature="brow_shape=straight",
                note="Straight brows indicate paternal inheritance of direct, logical approach.",
            ))

    return markers


def _extract_face_health_markers(
    aging:      Optional[AgingMarker],
    skin:       Optional[SkinFeature],
    jaw:        Optional[JawFeature],
    props:      Optional[FacialProportions],
    expression: Optional[ExpressionFeature],
) -> List[FaceHealthMarker]:
    """
    Extract health vulnerability markers from facial zone analysis.
    Based on Traditional Chinese Medicine face reading (Mian Xiang) and
    Vedic physiognomy zone-organ correspondence systems.
    This engine observes only — it does not diagnose.
    """
    markers: List[FaceHealthMarker] = []

    if aging:
        # Forehead zone — nervous system / stress
        if aging.forehead_line_density == Magnitude.HIGH:
            markers.append(FaceHealthMarker(
                marker_type="forehead_lines_high", facial_zone="forehead",
                system="nervous_system",
                severity=Magnitude.MODERATE,
                note="High forehead line density — traditionally associated with chronic mental stress and nervous system load. In Mian Xiang: forehead = heart/mind zone.",
            ))
        elif aging.forehead_line_density == Magnitude.MODERATE:
            markers.append(FaceHealthMarker(
                marker_type="forehead_lines_moderate", facial_zone="forehead",
                system="nervous_system",
                severity=Magnitude.LOW,
                note="Moderate forehead line density — some accumulated mental stress. General nervous system care is beneficial.",
            ))

        # Nasolabial zone — digestive / liver
        if aging.nasolabial_depth == Magnitude.HIGH:
            markers.append(FaceHealthMarker(
                marker_type="nasolabial_depth_high", facial_zone="nasolabial_fold",
                system="digestive_liver",
                severity=Magnitude.MODERATE,
                note="Deep nasolabial folds — in Mian Xiang, this zone corresponds to digestive and liver health. High depth indicates this system warrants attention.",
            ))

        # Crow's feet — kidney / adrenal
        if aging.crow_feet_presence == Magnitude.HIGH:
            markers.append(FaceHealthMarker(
                marker_type="crow_feet_high", facial_zone="lateral_eye",
                system="kidney_adrenal",
                severity=Magnitude.LOW,
                note="Prominent crow's feet — traditionally associated with kidney energy and adrenal health in Mian Xiang. Also indicates accumulated life experience.",
            ))

        # Lip volume — vitality / constitution
        if aging.lip_volume_indicator == Magnitude.LOW:
            markers.append(FaceHealthMarker(
                marker_type="lip_volume_low", facial_zone="lips",
                system="overall_vitality",
                severity=Magnitude.MODERATE,
                note="Low lip volume indicator — in Mian Xiang, the mouth/lip zone corresponds to digestive and overall constitutional vitality. Reduced volume suggests depleted life force.",
            ))

        # Cheek descent — spleen / digestion
        if aging.cheek_descent == Magnitude.HIGH:
            markers.append(FaceHealthMarker(
                marker_type="cheek_descent_high", facial_zone="cheeks",
                system="spleen_digestion",
                severity=Magnitude.LOW,
                note="High cheek descent — traditionally associated with spleen Qi deficiency in Chinese medicine. Lifestyle and digestive support recommended.",
            ))

    # Skin zone markers
    if skin:
        if skin.color_cast == "yellow":
            markers.append(FaceHealthMarker(
                marker_type="skin_yellow_cast", facial_zone="overall_face",
                system="liver_biliary",
                severity=Magnitude.MODERATE,
                note="Yellow skin cast — in Mian Xiang and traditional medicine, yellow tone corresponds to liver and biliary system. Worth investigating as a health signal.",
            ))
        elif skin.color_cast == "pale":
            markers.append(FaceHealthMarker(
                marker_type="skin_pale_cast", facial_zone="overall_face",
                system="circulatory_blood",
                severity=Magnitude.MODERATE,
                note="Pale skin cast — traditionally associated with blood deficiency, poor circulation, or lung Qi weakness.",
            ))
        elif skin.color_cast == "cool":
            markers.append(FaceHealthMarker(
                marker_type="skin_cool_cast", facial_zone="overall_face",
                system="circulatory",
                severity=Magnitude.LOW,
                note="Cool blue-tinted skin cast — may indicate reduced peripheral circulation.",
            ))

        if skin.radiance == Magnitude.LOW:
            markers.append(FaceHealthMarker(
                marker_type="low_skin_radiance", facial_zone="overall_face",
                system="overall_vitality",
                severity=Magnitude.LOW,
                note="Low skin radiance — reduced luminosity traditionally indicates depleted Jing (essence) or life force. Rest and nourishment are recommended.",
            ))

    # Jaw tension — cardiovascular / stress
    if jaw and jaw.jawline_type == JawlineType.STRONG and props:
        # Strong jaw + tight gonial angle = jaw tension indicator
        if props.gonial_angle_deg < 110:
            markers.append(FaceHealthMarker(
                marker_type="jaw_angle_tension", facial_zone="jaw",
                system="cardiovascular_stress",
                severity=Magnitude.MODERATE,
                note="Very tight gonial angle — indicates structural jaw tension which correlates with chronic stress response and cardiovascular load.",
            ))

    # Expression-based chronic markers
    if expression:
        if expression.brow_furrow > 0.65:
            markers.append(FaceHealthMarker(
                marker_type="chronic_brow_furrow", facial_zone="brow_third_eye",
                system="nervous_stress",
                severity=Magnitude.MODERATE,
                note="High brow furrow — habitual brow compression indicates chronic concentration or worry pattern. Third-eye zone congestion in Mian Xiang.",
            ))
        if expression.eye_openness_left > 0.0 and expression.eye_openness_right > 0.0:
            eye_asymmetry = abs(expression.eye_openness_left - expression.eye_openness_right)
            if eye_asymmetry > 0.25:
                markers.append(FaceHealthMarker(
                    marker_type="eye_asymmetry_high", facial_zone="eyes",
                    system="neurological",
                    severity=Magnitude.LOW,
                    note=f"Notable eye openness asymmetry ({round(eye_asymmetry, 2)}) — may warrant neurological awareness. In Mian Xiang, eye balance corresponds to liver health.",
                ))

    return markers


def _extract_face_spiritual_markers(
    left_eye:  Optional[EyeFeature],
    right_eye: Optional[EyeFeature],
    forehead:  Optional[ForeheadFeature],
    brows:     Optional[BrowFeature],
    props:     Optional[FacialProportions],
) -> List[FaceSpiritualMarker]:
    """
    Extract spiritual sensitivity and gift indicators from facial geometry.
    Sources: traditional physiognomy, Chinese face reading, Vedic facial analysis.
    """
    markers: List[FaceSpiritualMarker] = []

    # Deep-set eyes — spiritual depth, introspection, inner life richness
    if left_eye and right_eye:
        avg_lid = (left_eye.lid_coverage.value if left_eye.lid_coverage else "moderate",
                   right_eye.lid_coverage.value if right_eye.lid_coverage else "moderate")
        if left_eye.lid_coverage == Magnitude.HIGH and right_eye.lid_coverage == Magnitude.HIGH:
            markers.append(FaceSpiritualMarker(
                marker_type="deep_set_eyes",
                presence=Magnitude.HIGH,
                gift_indicated="psychic_depth",
                note="Both eyes deep-set with high lid coverage — traditional indicator of profound inner life, psychic depth, and capacity for spiritual vision beyond the surface world.",
            ))
        elif left_eye.lid_coverage == Magnitude.HIGH or right_eye.lid_coverage == Magnitude.HIGH:
            markers.append(FaceSpiritualMarker(
                marker_type="deep_set_eyes",
                presence=Magnitude.MODERATE,
                gift_indicated="introspective_depth",
                note="Moderate deep-set eye indicator — suggests significant inner life and tendency toward introspection and spiritual inquiry.",
            ))

        # Wide-set eyes — expanded awareness, psychic receptivity
        if left_eye.set_position == EyeSet.WIDE_SET:
            markers.append(FaceSpiritualMarker(
                marker_type="wide_set_eyes",
                presence=Magnitude.HIGH,
                gift_indicated="psychic_receptivity",
                note="Wide-set eyes — in Vedic physiognomy, wide eye spacing indicates expanded awareness, psychic receptivity, and the ability to perceive beyond conventional boundaries.",
            ))

        # Upturned eyes — spiritual optimism and elevated perception
        if left_eye.shape == EyeShape.UPTURNED and right_eye.shape == EyeShape.UPTURNED:
            markers.append(FaceSpiritualMarker(
                marker_type="upturned_eyes",
                presence=Magnitude.MODERATE,
                gift_indicated="elevated_perception",
                note="Upturned eyes — traditionally indicates a naturally elevated perspective, optimistic spiritual orientation, and capacity to see the higher purpose in events.",
            ))

    # High forehead — spiritual intelligence, higher mind access
    if forehead:
        if forehead.height == ForeheadHeight.HIGH:
            markers.append(FaceSpiritualMarker(
                marker_type="high_forehead",
                presence=Magnitude.HIGH,
                gift_indicated="spiritual_intelligence",
                note="High forehead — universally in traditional physiognomy, a high forehead indicates access to the higher mind. Philosophical thinking, spiritual intelligence, and capacity for elevated understanding are natural.",
            ))
        if forehead.width == ForeheadWidth.BROAD:
            markers.append(FaceSpiritualMarker(
                marker_type="broad_forehead",
                presence=Magnitude.MODERATE,
                gift_indicated="inclusive_wisdom",
                note="Broad forehead — indicates wide-ranging intellectual and spiritual scope. The mind encompasses many dimensions rather than narrow specialisation.",
            ))

    # Third-eye zone — intercanthal and glabella (between brows)
    if props:
        # Narrow brow-eye gap = concentrated third-eye focus
        if props.brow_to_eye_ratio < 0.60:
            markers.append(FaceSpiritualMarker(
                marker_type="third_eye_concentration",
                presence=Magnitude.MODERATE,
                gift_indicated="focused_concentration",
                note="Low brow-to-eye ratio — indicates concentrated Ajna (third eye) energy. The capacity for sustained, penetrating spiritual focus is pronounced.",
            ))

        # Wide intercanthal ratio = psychic openness
        if props.intercanthal_ratio > 0.22:
            markers.append(FaceSpiritualMarker(
                marker_type="wide_inner_eye_space",
                presence=Magnitude.MODERATE,
                gift_indicated="psychic_openness",
                note="Wide inner eye spacing — in Vedic physiognomy, large intercanthal distance indicates natural openness to non-physical perception and intuitive knowing.",
            ))

        # High upper third (forehead dominant) = spiritual orientation
        if props.upper_third_ratio > 0.38:
            markers.append(FaceSpiritualMarker(
                marker_type="forehead_dominant_thirds",
                presence=Magnitude.HIGH,
                gift_indicated="spiritual_orientation",
                note="Forehead-dominant facial thirds — a face where the upper third predominates indicates a consciousness naturally oriented toward the higher dimensions of experience.",
            ))

    # Arched brows — elevated spiritual standards and discernment
    if brows:
        if brows.shape == BrowShape.ARCHED and brows.arch_height == Magnitude.HIGH:
            markers.append(FaceSpiritualMarker(
                marker_type="high_arched_brows",
                presence=Magnitude.MODERATE,
                gift_indicated="spiritual_discernment",
                note="High arched brows — indicates elevated aesthetic and spiritual standards. The person naturally discerns between the sacred and profane.",
            ))

    return markers


def _extract_face_longevity_markers(
    jaw:      Optional[JawFeature],
    cheeks:   Optional[CheekFeature],
    symmetry: Optional[SymmetryFeature],
    skin:     Optional[SkinFeature],
    props:    Optional[FacialProportions],
    aging:    Optional[AgingMarker],
) -> List[FaceLongevityMarker]:
    """
    Extract constitutional vitality and longevity indicators from facial structure.
    Based on traditional physiognomy longevity markers from Chinese, Vedic,
    and Western facial analysis traditions.
    """
    markers: List[FaceLongevityMarker] = []

    # ── Structural longevity markers ────────────────────────────────────────

    # Strong jaw = constitutional resilience
    if jaw:
        if jaw.jawline_type == JawlineType.STRONG:
            markers.append(FaceLongevityMarker(
                marker_type="strong_jaw",
                indicator="positive",
                system="structural_constitution",
                strength=Magnitude.HIGH,
                note="Strong jawline — traditionally one of the most reliable constitutional longevity indicators. Strong jaw = strong Qi (life energy) in Chinese tradition. Resilience and endurance are structurally encoded.",
            ))
        elif jaw.jawline_type == JawlineType.SOFT:
            markers.append(FaceLongevityMarker(
                marker_type="soft_jaw",
                indicator="caution",
                system="structural_constitution",
                strength=Magnitude.LOW,
                note="Soft jawline — traditional longevity indicators suggest that jaw softness corresponds to less structural constitution. Does not shorten life — requires more conscious lifestyle support.",
            ))
        else:
            markers.append(FaceLongevityMarker(
                marker_type="moderate_jaw",
                indicator="neutral",
                system="structural_constitution",
                strength=Magnitude.MODERATE,
                note="Moderate jawline — average constitutional resilience. Lifestyle choices are the primary determinant of longevity.",
            ))

        # Chin projection = life force direction
        if jaw.chin_projection == Magnitude.HIGH:
            markers.append(FaceLongevityMarker(
                marker_type="prominent_chin",
                indicator="positive",
                system="vitality",
                strength=Magnitude.MODERATE,
                note="Prominent chin — in Chinese face reading, a projecting chin indicates strong life force in the final life chapter (old age). A positive late-life vitality indicator.",
            ))

    # High cheekbones = resilience and endurance
    if cheeks:
        if cheeks.cheekbone_position == CheekbonePosition.HIGH and cheeks.cheekbone_width == Magnitude.HIGH:
            markers.append(FaceLongevityMarker(
                marker_type="high_prominent_cheekbones",
                indicator="positive",
                system="resilience",
                strength=Magnitude.HIGH,
                note="High and prominent cheekbones — universally across traditional physiognomy traditions, high cheekbones indicate exceptional resilience, the ability to endure adversity, and constitutional vitality.",
            ))
        elif cheeks.cheekbone_position == CheekbonePosition.HIGH:
            markers.append(FaceLongevityMarker(
                marker_type="high_cheekbones",
                indicator="positive",
                system="resilience",
                strength=Magnitude.MODERATE,
                note="High cheekbones — indicates above-average constitutional resilience and social-adaptive capacity.",
            ))
        elif cheeks.fullness == Magnitude.HIGH:
            markers.append(FaceLongevityMarker(
                marker_type="full_cheeks",
                indicator="positive",
                system="vitality",
                strength=Magnitude.MODERATE,
                note="Full cheeks — in Mian Xiang, full cheeks indicate abundant Qi storage in the middle life period (35–50). Good constitutional reserves.",
            ))

    # Symmetry = genetic health
    if symmetry:
        if symmetry.overall >= 0.85:
            markers.append(FaceLongevityMarker(
                marker_type="high_facial_symmetry",
                indicator="positive",
                system="genetic_health",
                strength=Magnitude.HIGH,
                note=f"High bilateral symmetry ({round(symmetry.overall*100)}%) — facial symmetry is a well-documented biomarker of genetic health, developmental stability, and constitutional vitality. Strong longevity indicator.",
            ))
        elif symmetry.overall >= 0.70:
            markers.append(FaceLongevityMarker(
                marker_type="moderate_facial_symmetry",
                indicator="neutral",
                system="genetic_health",
                strength=Magnitude.MODERATE,
                note=f"Moderate bilateral symmetry ({round(symmetry.overall*100)}%) — within healthy range. Genetic constitution is adequate.",
            ))
        elif symmetry.overall < 0.60:
            markers.append(FaceLongevityMarker(
                marker_type="asymmetric_face",
                indicator="caution",
                system="genetic_health",
                strength=Magnitude.LOW,
                note=f"Notable facial asymmetry ({round(symmetry.overall*100)}%) — in traditional physiognomy, significant asymmetry suggests the need for lifestyle balance to support constitutional health.",
            ))

    # Balanced facial thirds = overall harmony
    if props:
        thirds_range = abs(props.upper_third_ratio - props.middle_third_ratio)
        thirds_range2 = abs(props.middle_third_ratio - props.lower_third_ratio)
        max_thirds_diff = max(thirds_range, thirds_range2)
        if max_thirds_diff < 0.05:
            markers.append(FaceLongevityMarker(
                marker_type="balanced_facial_thirds",
                indicator="positive",
                system="constitutional_harmony",
                strength=Magnitude.HIGH,
                note="Highly balanced facial thirds — classical physiognomy's most reliable harmony marker. Balanced thirds indicate the three life forces (heaven, human, earth in Chinese tradition) are in equilibrium.",
            ))
        elif max_thirds_diff > 0.12:
            markers.append(FaceLongevityMarker(
                marker_type="imbalanced_facial_thirds",
                indicator="caution",
                system="constitutional_harmony",
                strength=Magnitude.LOW,
                note="Unbalanced facial thirds — one life zone dominates. The over-developed zone benefits from conscious balancing.",
            ))

    # Skin vitality = current life force
    if skin:
        if skin.radiance == Magnitude.HIGH and skin.moisture == Magnitude.HIGH:
            markers.append(FaceLongevityMarker(
                marker_type="high_skin_vitality",
                indicator="positive",
                system="current_vitality",
                strength=Magnitude.HIGH,
                note="High skin radiance and moisture — in Mian Xiang, glowing, moist skin indicates abundant Jing (essence) and strong current life force. A highly positive vitality indicator.",
            ))
        elif skin.radiance == Magnitude.LOW and skin.moisture == Magnitude.LOW:
            markers.append(FaceLongevityMarker(
                marker_type="low_skin_vitality",
                indicator="caution",
                system="current_vitality",
                strength=Magnitude.LOW,
                note="Low skin radiance and moisture — indicates depleted Jing (essence). Rest, nourishment, and restorative practices are recommended to rebuild life force.",
            ))

    # Aging marker severity = current biological age signal
    if aging:
        aging_count = sum([
            1 for a in [aging.forehead_line_density, aging.nasolabial_depth,
                        aging.crow_feet_presence, aging.skin_texture_age_proxy]
            if a == Magnitude.HIGH
        ])
        if aging_count == 0:
            markers.append(FaceLongevityMarker(
                marker_type="low_aging_marker_burden",
                indicator="positive",
                system="biological_vitality",
                strength=Magnitude.HIGH,
                note="Minimal aging markers — current biological vitality is strong relative to chronological age. The face is ageing well.",
            ))
        elif aging_count >= 3:
            markers.append(FaceLongevityMarker(
                marker_type="high_aging_marker_burden",
                indicator="caution",
                system="biological_vitality",
                strength=Magnitude.LOW,
                note="Multiple aging markers present — biological age may exceed chronological age. Conscious lifestyle investment in longevity practices is recommended.",
            ))

    return markers



class FaceEngine:
    """Stateless, thread-safe facial feature extraction engine. v3.0.0: 4 new extractions."""
    _MP_MESH_CONFIG = dict(static_image_mode=True,max_num_faces=1,refine_landmarks=True,
                           min_detection_confidence=0.55,min_tracking_confidence=0.55)

    def extract(self, image_bytes: bytes) -> FaceFeatures:
        t0=time.monotonic(); img_hash=_image_hash(image_bytes)
        nparr=np.frombuffer(image_bytes,np.uint8); img=cv2.imdecode(nparr,cv2.IMREAD_COLOR)
        if img is None:
            return FaceFeatures(image_hash=img_hash,image_quality=ImageQuality.UNUSABLE,confidence=0.0,processing_ms=0,landmark_count=0,error="Image decode failed. Ensure JPEG/PNG/WebP format.")
        h,w=img.shape[:2]; gray=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY); rgb=cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
        quality,qm=_assess_quality(gray)
        if quality==ImageQuality.UNUSABLE:
            return FaceFeatures(image_hash=img_hash,image_quality=quality,confidence=0.0,processing_ms=int((time.monotonic()-t0)*1000),landmark_count=0,error="Image quality insufficient. Retake in good lighting with face clearly visible.")
        with mp.solutions.face_mesh.FaceMesh(**self._MP_MESH_CONFIG) as mesh:
            result=mesh.process(rgb)
        if not result.multi_face_landmarks:
            return FaceFeatures(image_hash=img_hash,image_quality=quality,confidence=0.0,processing_ms=int((time.monotonic()-t0)*1000),landmark_count=0,error="No face detected. Ensure face is clearly visible, front-facing, and well-lit.")
        lms=result.multi_face_landmarks[0].landmark; lmc=len(lms)
        conf=round(min(1.0,(lmc/478)*qm),3)
        fb=_face_box_from_landmarks(lms,h,w)
        props=_extract_proportions(lms,h,w)
        fw=max(1.0,float(abs(lms[LM.JAW_LEFT].x*w-lms[LM.JAW_RIGHT].x*w)))
        fh=max(1.0,float(abs(lms[LM.CHIN_TIP].y*h-lms[LM.FOREHEAD_TOP].y*h)))
        face_shape=_classify_face_shape(props)
        symmetry=_measure_symmetry(lms,gray,h,w)
        left_eye=_extract_eye(lms,h,w,LM.LEFT_EYE_INNER,LM.LEFT_EYE_OUTER,LM.LEFT_EYE_TOP,LM.LEFT_EYE_BOTTOM,fw,props.intercanthal_ratio)
        right_eye=_extract_eye(lms,h,w,LM.RIGHT_EYE_INNER,LM.RIGHT_EYE_OUTER,LM.RIGHT_EYE_TOP,LM.RIGHT_EYE_BOTTOM,fw,props.intercanthal_ratio)
        nose=_extract_nose(lms,h,w,fw,fh)
        lth=props.lower_third_ratio*fh
        lips=_extract_lips(lms,h,w,fw,lth)
        brows=_extract_brows(lms,h,w)
        forehead=_extract_forehead(lms,h,w,fh,fw,props.upper_third_ratio)
        jaw=_extract_jaw(lms,h,w,fw,props)
        cheeks=_extract_cheeks(lms,h,w,fh,fw,jaw.jaw_width_ratio)
        skin=_extract_skin(img,gray,fb)
        expression=_measure_expression(lms,h,w)
        aging=_extract_aging_markers(gray,fb,lms,h,w)
        raw_ratios=_build_raw_ratios(props,symmetry)
        # ── v3.0.0 new extractions ────────────────────────────────────────
        parent_inheritance  = _extract_parent_inheritance(props,forehead,jaw,cheeks,brows,skin)
        face_health_mkrs    = _extract_face_health_markers(aging,skin,jaw,props,expression)
        face_spirit_mkrs    = _extract_face_spiritual_markers(left_eye,right_eye,forehead,brows,props)
        face_longevity_mkrs = _extract_face_longevity_markers(jaw,cheeks,symmetry,skin,props,aging)
        ms=int((time.monotonic()-t0)*1000)
        logger.info("FaceEngine.extract completed",extra={"image_hash":img_hash,"quality":quality.value,"confidence":conf,"landmark_count":lmc,"face_shape":face_shape.value,"symmetry":symmetry.overall,"expression":expression.dominant_signal.value,"processing_ms":ms,"v3_extractions":4})
        return FaceFeatures(
            image_hash=img_hash,image_quality=quality,confidence=conf,processing_ms=ms,landmark_count=lmc,
            face_shape=face_shape,proportions=props,symmetry=symmetry,
            left_eye=left_eye,right_eye=right_eye,nose=nose,lips=lips,brows=brows,
            forehead=forehead,jaw=jaw,cheeks=cheeks,skin=skin,expression=expression,
            aging_markers=aging,raw_ratios=raw_ratios,
            # v3.0.0 new fields
            parent_inheritance_markers=parent_inheritance,
            face_health_markers=face_health_mkrs,
            face_spiritual_markers=face_spirit_mkrs,
            face_longevity_markers=face_longevity_mkrs,
        )


def extract_face_features(image_bytes: bytes) -> FaceFeatures:
    return FaceEngine().extract(image_bytes)


def analyze_face(image_bytes: bytes) -> Dict:
    """Legacy wrapper — v3.0.0: 4 new fields added to output dict."""
    engine=FaceEngine(); features=engine.extract(image_bytes)
    if features.error:
        return {"error":features.error,"face_detected":False}
    sm={"oval":"oval","round":"round","square":"square","heart":"heart","oblong":"oblong","diamond":"diamond","triangle":"triangular"}
    fs=sm.get(features.face_shape.value if features.face_shape else "oval","oval")
    am={"oval":"The Leader","round":"The Harmonizer","square":"The Builder","heart":"The Visionary","oblong":"The Thinker","diamond":"The Innovator","triangular":"The Achiever"}
    arch=am.get(fs,"The Leader")
    tm={"oval":["balanced","adaptable","strategic"],"round":["approachable","empathetic","communicative"],"square":["practical","reliable","grounded"],"heart":["creative","intuitive","passionate"],"oblong":["analytical","focused","methodical"],"diamond":["unique","independent","visionary"],"triangular":["ambitious","driven","determined"]}
    traits=tm.get(fs,["balanced","adaptable","strategic"])
    sym=int(features.symmetry.overall*100) if features.symmetry else 75
    esm={EyeShape.ALMOND:"almond",EyeShape.ROUND:"round",EyeShape.HOODED:"hooded",EyeShape.MONOLID:"monolid",EyeShape.UPTURNED:"upturned",EyeShape.DOWNTURNED:"downturned",EyeShape.DEEP_SET:"deep_set"}
    et=esm.get(features.left_eye.shape,"almond") if features.left_eye else "almond"
    nsm={NoseShape.STRAIGHT:"straight",NoseShape.AQUILINE:"aquiline",NoseShape.BUTTON:"button",NoseShape.BROAD:"broad",NoseShape.NARROW:"sharp",NoseShape.UPTURNED:"upturned"}
    nt=nsm.get(features.nose.shape,"straight") if features.nose else "straight"
    lfm={Magnitude.HIGH:"full_lips",Magnitude.MODERATE:"moderate",Magnitude.LOW:"thin_lips"}
    lt=lfm.get(features.lips.lip_fullness,"full_lips") if features.lips else "full_lips"
    cm={ChinShape.ROUNDED:"rounded",ChinShape.SQUARE:"square",ChinShape.POINTED:"pointed",ChinShape.RECEDING:"receding",ChinShape.PROMINENT:"prominent",ChinShape.CLEFT:"cleft"}
    ct=cm.get(features.jaw.chin_shape,"rounded") if features.jaw else "rounded"
    chm={CheekbonePosition.HIGH:"high",CheekbonePosition.MODERATE:"moderate",CheekbonePosition.LOW:"low"}
    cht=chm.get(features.cheeks.cheekbone_position,"moderate") if features.cheeks else "moderate"
    em={"oval":"air","round":"water","square":"earth","heart":"fire","oblong":"air","diamond":"fire","triangular":"fire"}
    el=em.get(fs,"air")
    jt=features.jaw.jawline_type in [JawlineType.STRONG] if features.jaw else False
    fl=0
    if features.aging_markers and features.aging_markers.forehead_line_density==Magnitude.HIGH: fl=2
    elif features.aging_markers and features.aging_markers.forehead_line_density==Magnitude.MODERATE: fl=1
    bt=features.expression.brow_furrow>0.6 if features.expression else False
    result={
        "face_detected":True,"face_count":1,"face_position":None,
        "face_shape":fs,"face_archetype":arch,"face_traits":traits,
        "symmetry_score":sym,"brightness":int(features.skin.radiance.value if features.skin else 128),"contrast":50,
        "confidence":int(features.confidence*100),
        "forehead_lines":fl,"brow_tension":bt,"jaw_tension":jt,
        "nasolabial_folds":features.aging_markers.nasolabial_depth==Magnitude.HIGH if features.aging_markers else False,
        "eyes":et,"nose":nt,"mouth":lt,"chin":ct,"cheekbones":cht,"element":el,
        # v3.0.0 new fields
        "parent_inheritance_markers":[{"zone":m.zone,"parent":m.parent,"note":m.note} for m in (features.parent_inheritance_markers or [])],
        "face_health_markers":[{"type":m.marker_type,"system":m.system,"severity":m.severity.value,"note":m.note} for m in (features.face_health_markers or [])],
        "face_spiritual_markers":[{"type":m.marker_type,"gift":m.gift_indicated,"presence":m.presence.value,"note":m.note} for m in (features.face_spiritual_markers or [])],
        "face_longevity_markers":[{"type":m.marker_type,"indicator":m.indicator,"strength":m.strength.value,"note":m.note} for m in (features.face_longevity_markers or [])],
    }
    return result


def generate_face_report(analysis: Dict) -> Dict[str, List[str]]:
    return {"face_analysis":[f"Face shape: {analysis.get('face_shape','unknown')}",f"Archetype: {analysis.get('face_archetype','unknown')}",f"Symmetry: {analysis.get('symmetry_score',0)}%",f"Confidence: {analysis.get('confidence',0)}%"]}
