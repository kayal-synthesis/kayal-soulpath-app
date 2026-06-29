"""
PDF Formatter — KAYAL Synthesis Platform
==========================================
Generates professional, branded PDF reports from completed readings.

Uses reportlab (pip install reportlab) — mature, production-quality,
pure Python, no external dependencies.

Design principles:
  - Dark, elegant — consistent with KAYAL visual identity
  - White background for print compatibility (dark accent elements)
  - Gold accent colour: #D4AF37
  - Primary colour: #1e1e3a (deep navy)
  - Structured sections with clear hierarchy
  - Page numbers and KAYAL branding footer

v3.0.0 — Narrative arc integration:
    - generate_pdf() and generate_union_pdf(): two new optional parameters:
        opening_paragraph: str — document-level significance statement
                                 from NarrationResult.opening_paragraph (v3.0.0)
        closing_paragraph: str — document-level impact landing
                                 from NarrationResult.closing_paragraph (v3.0.0)
    - _generate_with_reportlab(): if opening_paragraph provided, it replaces
      the generic boilerplate intro text on the cover page with a styled
      significance block (navy left border, light background) — the "abstract"
      of the reading. If closing_paragraph provided, it replaces the generic
      disclaimer text with the personalised impact landing from the narrator.
    - _generate_union_reportlab(): same treatment for both parameters.
    - Both fall back gracefully to existing hardcoded text when not provided,
      so backward compatibility with any caller not yet passing these fields
      is fully preserved.

v2.0.0 additions:
    - generate_pdf() extended with 4 new optional parameters:
        tool_type, partner_name, compatibility_percentages, section_texts
    - generate_union_pdf(): dedicated Union Blueprint ($397) PDF entry point
    - _build_compat_overview(): visual compatibility % dashboard page
        Renders before sections for Union Blueprint; shows all domain % as bars
        Color-coded: gold 75%+, medium 50–74%, muted <50%
    - _pct_bar_table(): reportlab Table rendering visual % progress bars
    - _pct_colour(): returns appropriate colour for a % score
    - _union_section_style(): per-section styling:
        sensitive (death_order, infidelity_profile) → lighter bg, italic heading
        pct sections → heading appends "[X]%" in gold
        standard → existing domain_heading style
    - _UNION_SECTION_NAMES: display names for all 16 Union Blueprint sections
    - _PCT_SECTIONS: set of section IDs that display % in their heading
    - _SENSITIVE_SECTIONS: set requiring gentler visual treatment

Output: bytes (PDF binary) suitable for StreamingResponse

Author: KAYAL Engineering
Version: 3.0.0
"""

from __future__ import annotations

import io
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# KAYAL Brand Colours (RGB 0-1 scale for reportlab)
# ─────────────────────────────────────────────

_NAVY    = (0.118, 0.118, 0.227)   # #1e1e3a
_GOLD    = (0.831, 0.686, 0.216)   # #D4AF37
_WHITE   = (1.0,   1.0,   1.0)
_LIGHT   = (0.97,  0.97,  0.98)    # Off-white background sections
_LIGHT_B = (0.94,  0.95,  0.97)    # Slightly darker for sensitive sections
_MEDIUM  = (0.4,   0.4,   0.45)    # Subheading grey
_BODY    = (0.15,  0.15,  0.20)    # Body text
_MUTED   = (0.60,  0.60,  0.65)    # Muted text for low % scores
_BAR_BG  = (0.88,  0.88,  0.92)    # Progress bar background

# Page margins
MARGIN_LEFT   = 60
MARGIN_RIGHT  = 60
MARGIN_TOP    = 60
MARGIN_BOTTOM = 80

# Font sizes
SIZE_TITLE   = 28
SIZE_HEADING = 16
SIZE_SUB     = 13
SIZE_BODY    = 11
SIZE_SMALL   = 9
SIZE_FOOTER  = 8
SIZE_PCT     = 22    # Large % display in overview


# ─────────────────────────────────────────────
# Section metadata
# ─────────────────────────────────────────────

# Display names for Individual Blueprint domains (v1.0.0)
_DOMAIN_NAMES: Dict[str, str] = {
    "love":              "Love & Relationships",
    "career":            "Career & Vocation",
    "wealth":            "Wealth & Abundance",
    "health":            "Health & Vitality",
    "spiritual":         "Spiritual Path",
    "character":         "Character & Soul",
    "timing":            "Timing & Cycles",
    "finance":           "Financial Life",
    "spirit_world":      "Spirit World & Ancestors",
    "identity":          "Identity & Purpose",
    "legacy":            "Legacy & Mission",
}

# Display names for Union Blueprint sections (v2.0.0)
_UNION_SECTION_NAMES: Dict[str, str] = {
    "union_overview":          "Union Overview",
    "person_a_character":      "Character — Person A",
    "person_b_character":      "Character — Person B",
    "marriage_longevity":      "Marriage Longevity",
    "intimacy_compatibility":  "Intimacy Compatibility",
    "children_potential":      "Children Potential",
    "career_synergy":          "Career Synergy",
    "wealth_compatibility":    "Wealth Compatibility",
    "health_cross_impact":     "Health Cross-Impact",
    "spiritual_compatibility": "Spiritual Compatibility",
    "death_order":             "Longevity & Transition",
    "infidelity_profile":      "Fidelity Structure",
    "dominance_dynamics":      "Relational Dynamics",
    "parental_patterns":       "Ancestral Inheritance",
    "union_legacy":            "Union Legacy",
    "union_remedies":          "Union Remedies",
}

# Sections that display a % score in their heading
_PCT_SECTIONS = {
    "union_overview", "marriage_longevity", "intimacy_compatibility",
    "children_potential", "career_synergy", "wealth_compatibility",
    "health_cross_impact", "spiritual_compatibility", "union_legacy",
}

# Sections requiring gentler visual treatment
_SENSITIVE_SECTIONS = {"death_order", "infidelity_profile"}

# Domain key to use for % lookup per section_id
_SECTION_DOMAIN_MAP: Dict[str, str] = {
    "union_overview":          "overall",
    "marriage_longevity":      "love",
    "intimacy_compatibility":  "sexuality",
    "children_potential":      "children_forecast",
    "career_synergy":          "career",
    "wealth_compatibility":    "wealth",
    "health_cross_impact":     "health",
    "spiritual_compatibility": "spiritual",
    "union_legacy":            "legacy",
}

# Ordered domain list for compatibility overview page
_COMPAT_OVERVIEW_DOMAINS = [
    ("overall",           "Overall Compatibility"),
    ("love",              "Love"),
    ("sexuality",         "Intimacy"),
    ("spiritual",         "Spiritual"),
    ("character",         "Character"),
    ("career",            "Career Synergy"),
    ("wealth",            "Wealth"),
    ("health",            "Health"),
    ("children_forecast", "Children Potential"),
    ("legacy",            "Legacy"),
]


# ─────────────────────────────────────────────
# Colour helper
# ─────────────────────────────────────────────

def _pct_colour(pct: float, as_rgb: bool = False):
    """Return appropriate colour for a % score (gold 75%+, medium 50-74%, muted <50%)."""
    if pct >= 75: return _GOLD   if as_rgb else "gold"
    if pct >= 50: return _MEDIUM if as_rgb else "medium"
    return _MUTED if as_rgb else "muted"


# ─────────────────────────────────────────────
# Main PDF generation functions
# ─────────────────────────────────────────────

async def generate_pdf(
    job_id:     str,
    tool_name:  str,
    reading:    str,
    sections:   Optional[Dict[str, str]] = None,
    life_path:  Optional[int]  = None,
    sun_sign:   Optional[str]  = None,
    generated:  Optional[str]  = None,
    user_name:  Optional[str]  = None,
    # v2.0.0 new parameters
    tool_type:              str             = "individual_blueprint",
    partner_name:           Optional[str]   = None,
    compatibility_percentages: Optional[Dict[str, float]] = None,
    section_texts:          Optional[Dict[str, str]]  = None,
    # v3.0.0 — narrative frame from NarrationResult
    opening_paragraph:      str             = "",
    closing_paragraph:      str             = "",
) -> bytes:
    """
    Generate a branded PDF from a completed reading.

    v3.0.0: opening_paragraph and closing_paragraph from NarrationResult
    (populated by llm_narrator._build_document_frame()) are now rendered
    in the PDF instead of the generic boilerplate text:
    - opening_paragraph → significance block on the cover (styled with navy
      left border and light background — the reading's "abstract")
    - closing_paragraph → personalised impact landing at the document close
      instead of the generic disclaimer text

    Both fall back to existing hardcoded text when empty strings are passed,
    preserving backward compatibility with all existing callers.

    Args:
        job_id:     Reading job ID (used in footer)
        tool_name:  Name of the KAYAL tool
        reading:    Full reading text (fallback if sections not provided)
        sections:   Dict of domain sections {domain: text} (Individual Blueprint)
        life_path:  User's Life Path number
        sun_sign:   User's Sun sign
        generated:  ISO timestamp when reading was generated
        user_name:  User's name (Person A)
        tool_type:  "individual_blueprint" or "union_blueprint"
        partner_name: Person B's name (Union Blueprint only)
        compatibility_percentages: Dict[domain→%] from synthesis (Union Blueprint)
        section_texts: Dict[section_id→text] from NarrationResult (Union Blueprint)
        opening_paragraph: Document significance statement (NarrationResult v3.0.0)
        closing_paragraph: Document impact landing (NarrationResult v3.0.0)

    Returns:
        PDF as bytes
    """
    try:
        if tool_type == "union_blueprint" and section_texts:
            return _generate_union_reportlab(
                job_id            = job_id,
                tool_name         = tool_name,
                name_a            = user_name or "Person A",
                name_b            = partner_name or "Person B",
                section_texts     = section_texts,
                compat_pcts       = compatibility_percentages or {},
                life_path         = life_path,
                sun_sign          = sun_sign,
                generated         = generated,
                opening_paragraph = opening_paragraph,
                closing_paragraph = closing_paragraph,
            )
        return _generate_with_reportlab(
            job_id            = job_id,
            tool_name         = tool_name,
            reading           = reading,
            sections          = sections or {},
            life_path         = life_path,
            sun_sign          = sun_sign,
            generated         = generated,
            user_name         = user_name,
            opening_paragraph = opening_paragraph,
            closing_paragraph = closing_paragraph,
        )
    except ImportError:
        logger.warning("reportlab not installed — generating plain text PDF fallback")
        return _generate_plain_text_fallback(tool_name, reading)
    except Exception as e:
        logger.error(f"PDF generation error: {e}", exc_info=True)
        return _generate_plain_text_fallback(tool_name, reading)


async def generate_union_pdf(
    job_id:      str,
    name_a:      str,
    name_b:      str,
    section_texts: Dict[str, str],
    compat_pcts:   Dict[str, float],
    life_path_a: Optional[int] = None,
    sun_sign_a:  Optional[str] = None,
    generated:   Optional[str] = None,
    # v3.0.0 — narrative frame from NarrationResult
    opening_paragraph: str = "",
    closing_paragraph: str = "",
) -> bytes:
    """
    Dedicated Union Blueprint ($397) PDF generator.

    v3.0.0: opening_paragraph and closing_paragraph from NarrationResult
    now rendered in the PDF, replacing the generic boilerplate text.

    Args:
        job_id:       Reading job ID
        name_a:       Person A first name
        name_b:       Person B first name
        section_texts:Dict[section_id → narrated text] from NarrationResult
        compat_pcts:  Dict[domain → float %] from compatibility_percentages
        life_path_a:  Person A's Life Path (optional header info)
        sun_sign_a:   Person A's Sun sign (optional)
        generated:    ISO timestamp
        opening_paragraph: Document significance statement (NarrationResult v3.0.0)
        closing_paragraph: Document impact landing (NarrationResult v3.0.0)

    Returns:
        PDF as bytes
    """
    tool_name = f"The {name_a} & {name_b} Union Blueprint"
    try:
        return _generate_union_reportlab(
            job_id            = job_id,
            tool_name         = tool_name,
            name_a            = name_a,
            name_b            = name_b,
            section_texts     = section_texts,
            compat_pcts       = compat_pcts,
            life_path         = life_path_a,
            sun_sign          = sun_sign_a,
            generated         = generated,
            opening_paragraph = opening_paragraph,
            closing_paragraph = closing_paragraph,
        )
    except ImportError:
        logger.warning("reportlab not installed — generating plain text PDF fallback")
        full_text = "\n\n".join(
            f"### {_UNION_SECTION_NAMES.get(sid, sid.title())}\n{text}"
            for sid, text in section_texts.items() if text
        )
        return _generate_plain_text_fallback(tool_name, full_text)
    except Exception as e:
        logger.error(f"Union PDF generation error: {e}", exc_info=True)
        full_text = "\n\n".join(v for v in section_texts.values() if v)
        return _generate_plain_text_fallback(tool_name, full_text)


# ─────────────────────────────────────────────
# v2.0.0 — Compatibility overview builder
# ─────────────────────────────────────────────

def _pct_bar_table(pct: float, label: str, doc_width: float, colours) -> Any:
    """
    Build a single-row reportlab Table rendering a % progress bar.

    Layout: [domain label] [=====░░░░░░░░░░░] [74%]
    Gold fill for the filled portion, light grey background for remainder.
    """
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import Paragraph
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

    gold   = colours["gold"]
    light  = colours["light"]
    bar_bg = colours["bar_bg"]
    navy   = colours["navy"]
    body   = colours["body"]
    muted  = colours["muted"]
    medium = colours["medium"]
    white  = colours["white"]

    fill_pct   = min(100, max(0, pct)) / 100.0
    empty_pct  = 1.0 - fill_pct
    bar_width  = doc_width * 0.55   # 55% of page width for bar
    fill_w     = bar_width * fill_pct
    empty_w    = bar_width * empty_pct
    label_w    = doc_width * 0.25
    score_w    = doc_width * 0.18

    pct_col = gold if pct >= 75 else medium if pct >= 50 else muted
    pct_str = f"{round(pct):.0f}%"

    style_lbl = ParagraphStyle("BLbl", fontName="Helvetica", fontSize=10,
                                textColor=body, alignment=TA_LEFT)
    style_pct = ParagraphStyle("BPct", fontName="Helvetica-Bold", fontSize=11,
                                textColor=pct_col, alignment=TA_RIGHT)

    # The bar is rendered as nested table columns: [filled | empty]
    bar_inner = Table(
        [["", ""]],
        colWidths=[fill_w, empty_w] if fill_w > 0 and empty_w > 0
                  else ([fill_w, 0.1] if fill_w > 0 else [0.1, empty_w]),
        rowHeights=[10],
    )
    bar_inner.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (0, 0), gold if fill_w > 0 else bar_bg),
        ("BACKGROUND",   (1, 0), (1, 0), bar_bg),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
        ("ROUNDEDCORNERS", (0,0), (-1,-1), 2),
    ]))

    row = Table(
        [[Paragraph(label, style_lbl), bar_inner, Paragraph(pct_str, style_pct)]],
        colWidths=[label_w, bar_width, score_w],
        rowHeights=[22],
    )
    row.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    return row


def _build_compat_overview(
    compat_pcts: Dict[str, float],
    name_a:      str,
    name_b:      str,
    doc_width:   float,
    colours:     Dict,
    story:       List,
    styles:      Dict,
) -> None:
    """
    Insert the compatibility % overview page into the story.

    Renders:
    - Section heading: "Compatibility Overview"
    - Overall % score displayed large (gold text)
    - Bar chart rows for each domain in _COMPAT_OVERVIEW_DOMAINS
    - Closing note about % interpretation
    """
    from reportlab.platypus import Paragraph, Spacer, HRFlowable, KeepTogether

    gold   = colours["gold"]
    navy   = colours["navy"]
    light  = colours["light"]
    medium = colours["medium"]

    style_ov_head  = styles["section_heading"]
    style_body     = styles["body"]
    style_meta     = styles["meta"]

    # Section heading
    story.append(Paragraph("Compatibility Overview", style_ov_head))
    story.append(HRFlowable(
        width=doc_width, thickness=0.5, color=gold, spaceAfter=16
    ))

    # Names subtitle
    story.append(Paragraph(
        f"{name_a} & {name_b}", styles["subtitle"]
    ))
    story.append(Spacer(1, 8))

    # Overall % — large display
    overall_pct = compat_pcts.get("overall", 50.0)
    overall_col = gold if overall_pct >= 75 else medium
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    style_big_pct = ParagraphStyle(
        "BigPct", fontName="Helvetica-Bold", fontSize=SIZE_PCT,
        textColor=overall_col, alignment=TA_CENTER, spaceAfter=4,
    )
    style_big_label = ParagraphStyle(
        "BigLabel", fontName="Helvetica", fontSize=SIZE_SUB,
        textColor=medium, alignment=TA_CENTER, spaceAfter=16,
    )
    story.append(Paragraph(f"{round(overall_pct):.0f}%", style_big_pct))
    story.append(Paragraph("Overall Compatibility", style_big_label))
    story.append(Spacer(1, 12))

    # Domain bars
    for domain_key, display_name in _COMPAT_OVERVIEW_DOMAINS:
        if domain_key == "overall":
            continue
        pct = compat_pcts.get(domain_key, 0.0)
        bar = _pct_bar_table(pct, display_name, doc_width, colours)
        story.append(bar)
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "Scores reflect structural compatibility from multi-system astrological and numerological "
        "cross-chart analysis. 75%+ = structurally strong · 50–74% = good foundation with growth edges · "
        "below 50% = significant growth work required. These are structural tendencies, not fixed verdicts.",
        style_meta,
    ))
    story.append(HRFlowable(
        width=doc_width, thickness=0.5, color=gold, spaceBefore=16, spaceAfter=20,
    ))


# ─────────────────────────────────────────────
# v2.0.0 — Union Blueprint reportlab renderer
# ─────────────────────────────────────────────

def _generate_union_reportlab(
    job_id:       str,
    tool_name:    str,
    name_a:       str,
    name_b:       str,
    section_texts:Dict[str, str],
    compat_pcts:  Dict[str, float],
    life_path:    Optional[int],
    sun_sign:     Optional[str],
    generated:    Optional[str],
    opening_paragraph: str = "",   # v3.0.0 — from NarrationResult
    closing_paragraph: str = "",   # v3.0.0 — from NarrationResult
) -> bytes:
    """Generate the Union Blueprint PDF with reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
        KeepTogether, PageBreak, Table, TableStyle,
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

    def rgb(r, g, b): return colors.Color(r, g, b)

    navy   = rgb(*_NAVY);   gold  = rgb(*_GOLD)
    light  = rgb(*_LIGHT);  light_b = rgb(*_LIGHT_B)
    med    = rgb(*_MEDIUM); body_c = rgb(*_BODY)
    muted  = rgb(*_MUTED);  bar_bg = rgb(*_BAR_BG)
    white  = colors.white

    colours = {
        "navy": navy, "gold": gold, "light": light, "light_b": light_b,
        "medium": med, "body": body_c, "muted": muted,
        "bar_bg": bar_bg, "white": white,
    }

    buffer   = io.BytesIO()
    page_w, page_h = A4

    def _on_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(navy)
        canvas.rect(0, page_h - 8, page_w, 8, fill=1, stroke=0)
        canvas.setFillColor(gold)
        canvas.rect(0, page_h - 10, page_w, 2, fill=1, stroke=0)
        canvas.setFillColor(med)
        canvas.setFont("Helvetica", SIZE_FOOTER)
        footer_y = 28
        canvas.drawString(MARGIN_LEFT, footer_y, "KAYAL Union Blueprint")
        canvas.drawCentredString(page_w / 2, footer_y, f"Page {doc.page}")
        canvas.drawRightString(page_w - MARGIN_RIGHT, footer_y, f"ID: {job_id[:8].upper()}")
        canvas.setStrokeColor(gold)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_LEFT, footer_y + 12, page_w - MARGIN_RIGHT, footer_y + 12)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=MARGIN_LEFT, rightMargin=MARGIN_RIGHT,
        topMargin=MARGIN_TOP + 20, bottomMargin=MARGIN_BOTTOM,
        onFirstPage=_on_page, onLaterPages=_on_page,
    )

    # ── Styles ──────────────────────────────
    def mk(name, **kw):
        return ParagraphStyle(name, **kw)

    style_title = mk("UTitle", fontName="Helvetica-Bold", fontSize=SIZE_TITLE,
                     textColor=navy, alignment=TA_CENTER, spaceAfter=6, leading=SIZE_TITLE*1.2)
    style_subtitle = mk("USub", fontName="Helvetica", fontSize=SIZE_SUB,
                        textColor=med, alignment=TA_CENTER, spaceAfter=4)
    style_section_heading = mk("USHead", fontName="Helvetica-Bold", fontSize=SIZE_HEADING,
                               textColor=navy, spaceBefore=18, spaceAfter=8, leading=SIZE_HEADING*1.3)
    style_sensitive_heading = mk("USensHead", fontName="Helvetica-Oblique", fontSize=SIZE_HEADING,
                                 textColor=med, spaceBefore=18, spaceAfter=8, leading=SIZE_HEADING*1.3)
    style_body = mk("UBody", fontName="Helvetica", fontSize=SIZE_BODY,
                    textColor=body_c, alignment=TA_JUSTIFY, spaceAfter=10, leading=SIZE_BODY*1.6)
    style_meta = mk("UMeta", fontName="Helvetica", fontSize=SIZE_SMALL,
                    textColor=med, alignment=TA_CENTER, spaceAfter=4)
    style_domain = mk("UDomain", fontName="Helvetica-Bold", fontSize=SIZE_HEADING-2,
                      textColor=navy, spaceBefore=24, spaceAfter=8, borderPad=8)

    styles = {
        "title": style_title, "subtitle": style_subtitle,
        "section_heading": style_section_heading,
        "sensitive_heading": style_sensitive_heading,
        "body": style_body, "meta": style_meta, "domain": style_domain,
    }

    story: List[Any] = []

    # ── Cover ──────────────────────────────
    story.append(Spacer(1, 20))
    story.append(Paragraph(tool_name, style_title))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="60%", thickness=1.5, color=gold, hAlign="CENTER", spaceAfter=12))

    # Overall % on cover if available
    overall_pct = compat_pcts.get("overall")
    if overall_pct is not None:
        pct_col = gold if overall_pct >= 75 else med
        style_cover_pct = mk("CoverPct", fontName="Helvetica-Bold", fontSize=SIZE_PCT,
                              textColor=pct_col, alignment=TA_CENTER, spaceAfter=2)
        style_cover_pct_lbl = mk("CoverPctLbl", fontName="Helvetica", fontSize=SIZE_SUB,
                                  textColor=med, alignment=TA_CENTER, spaceAfter=12)
        story.append(Paragraph(f"{round(overall_pct):.0f}%", style_cover_pct))
        story.append(Paragraph("Overall Compatibility", style_cover_pct_lbl))

    # Meta line
    meta_parts = []
    if name_a and name_b: meta_parts.append(f"{name_a} & {name_b}")
    if life_path:         meta_parts.append(f"Life Path {life_path}")
    if sun_sign:          meta_parts.append(f"Sun in {sun_sign}")
    if generated:
        try:
            dt = datetime.fromisoformat(generated.replace("Z", "+00:00"))
            meta_parts.append(dt.strftime("%B %d, %Y"))
        except Exception: pass
    if meta_parts:
        story.append(Paragraph("  ·  ".join(meta_parts), style_meta))
    story.append(Spacer(1, 20))

    # v3.0.0 — Opening: use narrator's significance statement if available
    if opening_paragraph and opening_paragraph.strip():
        style_opening = ParagraphStyle(
            "KayalUnionOpening",
            fontName    = "Helvetica",
            fontSize    = SIZE_BODY,
            textColor   = rgb(*_BODY),
            alignment   = TA_JUSTIFY,
            spaceAfter  = 10,
            leading     = SIZE_BODY * 1.6,
        )
        opening_table = Table(
            [[Paragraph(opening_paragraph.strip(), style_opening)]],
            colWidths=[doc.width],
        )
        opening_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), rgb(*_LIGHT)),
            ("LEFTPADDING",   (0, 0), (-1, -1), 14),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 14),
            ("TOPPADDING",    (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("LINEBEFORE",    (0, 0), (0, -1),  3, rgb(*_NAVY)),
        ]))
        story.append(opening_table)
    else:
        story.append(Paragraph(
            "This Union Blueprint was generated using the KAYAL synthesis engine — "
            "a cross-system analysis combining synastry astrology, numerology, palmistry, "
            "and physiognomy. All compatibility scores are structural indicators, "
            "not fixed verdicts.",
            styles["body"],
        ))
    story.append(HRFlowable(width="100%", thickness=0.5, color=rgb(*_GOLD), spaceAfter=20))

    # ── Compatibility Overview page ─────────
    if compat_pcts:
        _build_compat_overview(
            compat_pcts=compat_pcts, name_a=name_a, name_b=name_b,
            doc_width=doc.width, colours=colours, story=story, styles=styles,
        )

    # ── Section rendering ───────────────────
    # Define preferred section order
    section_order = [
        "person_a_character", "person_b_character",
        "union_overview",
        "marriage_longevity", "intimacy_compatibility", "children_potential",
        "career_synergy", "wealth_compatibility", "health_cross_impact",
        "spiritual_compatibility",
        "death_order", "infidelity_profile",
        "dominance_dynamics", "parental_patterns",
        "union_legacy", "union_remedies",
    ]

    # Add any sections present in section_texts but not in the predefined order
    for sid in section_texts:
        if sid not in section_order:
            section_order.append(sid)

    for sid in section_order:
        text = section_texts.get(sid, "").strip()
        if not text:
            continue

        # Get display name
        display_name = _UNION_SECTION_NAMES.get(sid, sid.replace("_", " ").title())

        # Determine % for heading (if pct section)
        pct_in_heading = ""
        if sid in _PCT_SECTIONS:
            domain_key = _SECTION_DOMAIN_MAP.get(sid, sid)
            pct_val = compat_pcts.get(domain_key)
            if pct_val is not None:
                pct_in_heading = f" — {round(pct_val):.0f}%"

        # Choose heading style
        if sid in _SENSITIVE_SECTIONS:
            heading_style = style_sensitive_heading
            bg_colour     = light_b
        else:
            heading_style = style_section_heading
            bg_colour     = light

        # Build section heading with % in gold if applicable
        if pct_in_heading:
            heading_html = (
                f"{display_name}<font color='#D4AF37'><b>{pct_in_heading}</b></font>"
            )
        else:
            heading_html = display_name

        # Render section header background box
        header_para = Paragraph(heading_html, heading_style)
        section_header = Table(
            [[header_para]],
            colWidths=[doc.width],
        )
        section_header.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), bg_colour),
            ("LEFTPADDING",  (0, 0), (-1, -1), 12),
            ("TOPPADDING",   (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))

        story.append(KeepTogether([section_header, Spacer(1, 8)]))

        # Render section body paragraphs
        for para in _split_paragraphs(text):
            story.append(Paragraph(para, style_body))

        story.append(Spacer(1, 12))

    # ── Closing ────────────────────────────
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=rgb(*_GOLD),
                             spaceBefore=8, spaceAfter=16))
    # v3.0.0 — Closing: use narrator's impact landing if available
    if closing_paragraph and closing_paragraph.strip():
        story.append(Paragraph(closing_paragraph.strip(), styles["body"]))
    else:
        story.append(Paragraph(
            "This Union Blueprint reflects the structural patterns between these two charts "
            "as they stand today. Compatibility scores are structural indicators, not fixed destinies. "
            "The consciousness and choices both partners bring to this union are far more "
            "powerful determinants of its quality than any structural reading.",
            styles["body"],
        ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "KAYAL Synthesis Platform  ·  kayal.app",
        styles["meta"],
    ))

    doc.build(story)
    return buffer.getvalue()


# ─────────────────────────────────────────────
# v1.0.0 — Individual Blueprint reportlab renderer (preserved intact)
# ─────────────────────────────────────────────

def _generate_with_reportlab(
    job_id:    str,
    tool_name: str,
    reading:   str,
    sections:  Dict[str, str],
    life_path: Optional[int],
    sun_sign:  Optional[str],
    generated: Optional[str],
    user_name: Optional[str],
    opening_paragraph: str = "",   # v3.0.0 — from NarrationResult
    closing_paragraph: str = "",   # v3.0.0 — from NarrationResult
) -> bytes:
    """Generate a full reportlab PDF for the Individual Blueprint."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
        KeepTogether, PageBreak, Table, TableStyle,
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

    def rgb(r, g, b): return colors.Color(r, g, b)

    navy  = rgb(*_NAVY);  gold  = rgb(*_GOLD)
    light = rgb(*_LIGHT); med   = rgb(*_MEDIUM)
    body  = rgb(*_BODY);  white = colors.white

    buffer = io.BytesIO()
    page_w, page_h = A4

    def _on_page(canvas, doc):
        canvas.saveState()
        page_num = doc.page
        canvas.setFillColor(navy)
        canvas.rect(0, page_h - 8, page_w, 8, fill=1, stroke=0)
        canvas.setFillColor(gold)
        canvas.rect(0, page_h - 10, page_w, 2, fill=1, stroke=0)
        canvas.setFillColor(med)
        canvas.setFont("Helvetica", SIZE_FOOTER)
        footer_y = 28
        canvas.drawString(MARGIN_LEFT, footer_y, "KAYAL Synthesis Platform")
        canvas.drawCentredString(page_w / 2, footer_y, f"Page {page_num}")
        canvas.drawRightString(page_w - MARGIN_RIGHT, footer_y, f"Reading ID: {job_id[:8].upper()}")
        canvas.setStrokeColor(gold)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_LEFT, footer_y + 12, page_w - MARGIN_RIGHT, footer_y + 12)
        canvas.restoreState()

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=MARGIN_LEFT, rightMargin=MARGIN_RIGHT,
        topMargin=MARGIN_TOP + 20, bottomMargin=MARGIN_BOTTOM,
        onFirstPage=_on_page, onLaterPages=_on_page,
    )

    style_title = ParagraphStyle("KayalTitle", fontName="Helvetica-Bold", fontSize=SIZE_TITLE,
                                  textColor=navy, alignment=TA_CENTER, spaceAfter=6, leading=SIZE_TITLE*1.2)
    style_subtitle = ParagraphStyle("KayalSubtitle", fontName="Helvetica", fontSize=SIZE_SUB,
                                     textColor=med, alignment=TA_CENTER, spaceAfter=4)
    style_heading = ParagraphStyle("KayalHeading", fontName="Helvetica-Bold", fontSize=SIZE_HEADING,
                                    textColor=navy, spaceBefore=18, spaceAfter=8, leading=SIZE_HEADING*1.3)
    style_body = ParagraphStyle("KayalBody", fontName="Helvetica", fontSize=SIZE_BODY,
                                 textColor=body, alignment=TA_JUSTIFY, spaceAfter=10, leading=SIZE_BODY*1.6)
    style_meta = ParagraphStyle("KayalMeta", fontName="Helvetica", fontSize=SIZE_SMALL,
                                 textColor=med, alignment=TA_CENTER, spaceAfter=4)
    style_domain_heading = ParagraphStyle("KayalDomainHeading", fontName="Helvetica-Bold",
                                           fontSize=SIZE_HEADING-2, textColor=navy,
                                           spaceBefore=24, spaceAfter=8, borderPad=8)

    story: List[Any] = []

    # Cover
    story.append(Spacer(1, 20))
    story.append(Paragraph(tool_name, style_title))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="60%", thickness=1.5, color=gold, hAlign="CENTER", spaceAfter=12))

    if life_path or sun_sign or user_name:
        meta_parts = []
        if user_name: meta_parts.append(f"Prepared for {user_name}")
        if life_path: meta_parts.append(f"Life Path {life_path}")
        if sun_sign:  meta_parts.append(f"Sun in {sun_sign}")
        if generated:
            try:
                dt = datetime.fromisoformat(generated.replace("Z", "+00:00"))
                meta_parts.append(dt.strftime("%B %d, %Y"))
            except Exception: pass
        story.append(Paragraph("  ·  ".join(meta_parts), style_meta))
        story.append(Spacer(1, 20))

    # v3.0.0 — Opening: use narrator's significance statement if available,
    # fall back to generic boilerplate for backward compatibility
    if opening_paragraph and opening_paragraph.strip():
        style_opening = ParagraphStyle(
            "KayalOpening",
            fontName    = "Helvetica",
            fontSize    = SIZE_BODY,
            textColor   = body,
            alignment   = TA_JUSTIFY,
            spaceAfter  = 10,
            leading     = SIZE_BODY * 1.6,
            leftIndent  = 12,
            borderPad   = 10,
        )
        opening_table = Table(
            [[Paragraph(opening_paragraph.strip(), style_opening)]],
            colWidths=[doc.width],
        )
        opening_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), light),
            ("LEFTPADDING",   (0, 0), (-1, -1), 14),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 14),
            ("TOPPADDING",    (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("LINEBEFORE",    (0, 0), (0, -1),  3, rgb(*_NAVY)),
        ]))
        story.append(opening_table)
        story.append(Spacer(1, 12))
    else:
        story.append(Paragraph(
            "This reading was generated using the KAYAL synthesis engine — "
            "a cross-system analysis combining astrology, numerology, physiognomy, "
            "and palmistry. Every insight is specific to your birth data and images.",
            style_body,
        ))
        story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gold, spaceAfter=20))

    # Main content
    if sections and len(sections) > 1:
        for domain, text in sections.items():
            if not text or not text.strip(): continue
            display_name = _DOMAIN_NAMES.get(domain, domain.replace("_", " ").title())
            section_header = Table(
                [[Paragraph(display_name, style_domain_heading)]],
                colWidths=[doc.width],
            )
            section_header.setStyle(TableStyle([
                ("BACKGROUND",   (0, 0), (-1, -1), light),
                ("LEFTPADDING",  (0, 0), (-1, -1), 12),
                ("TOPPADDING",   (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
            ]))
            story.append(KeepTogether([section_header, Spacer(1, 8)]))
            for para in _split_paragraphs(text):
                story.append(Paragraph(para, style_body))
            story.append(Spacer(1, 12))
    else:
        for para in _split_paragraphs(reading):
            if para.startswith("##"):
                story.append(Paragraph(para.lstrip("#").strip(), style_heading))
            else:
                story.append(Paragraph(para, style_body))

    # v3.0.0 — Closing: use narrator's impact landing if available,
    # fall back to generic disclaimer for backward compatibility
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gold, spaceBefore=8, spaceAfter=16))
    if closing_paragraph and closing_paragraph.strip():
        story.append(Paragraph(closing_paragraph.strip(), style_body))
    else:
        story.append(Paragraph(
            "This reading reflects your chart as it stands today. "
            "The patterns identified are starting points for awareness, not fixed destinies. "
            "Your choices, consciousness, and the work you do with this information "
            "determine where they lead.",
            style_body,
        ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("KAYAL Synthesis Platform  ·  kayal.app", style_meta))

    doc.build(story)
    return buffer.getvalue()


# ─────────────────────────────────────────────
# Text utilities (v1.0.0, preserved intact)
# ─────────────────────────────────────────────

def _split_paragraphs(text: str) -> List[str]:
    """
    Split reading text into paragraphs for rendering.
    Handles both double-newline and single-newline formatted text.
    Escapes reportlab special characters.
    """
    raw_paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(raw_paragraphs) <= 2 and "\n" in text:
        raw_paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    safe = []
    for p in raw_paragraphs:
        p = p.replace("&", "&amp;")
        p = p.replace("<", "&lt;")
        p = p.replace(">", "&gt;")
        p = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", p)
        p = re.sub(r"\*(.+?)\*",       r"<i>\1</i>", p)
        # Handle ### section headings from assembled Union Blueprint text
        if p.startswith("### "):
            p = f"<b>{p[4:]}</b>"
        safe.append(p)
    return safe


# ─────────────────────────────────────────────
# Plain text fallback (v1.0.0, preserved intact)
# ─────────────────────────────────────────────

def _generate_plain_text_fallback(tool_name: str, reading: str) -> bytes:
    """
    Minimal PDF using only Python stdlib.
    Creates a valid but unstyled PDF with the reading text.
    """
    content = f"{tool_name}\n{'=' * len(tool_name)}\n\nKAYAL Synthesis Platform\n\n{reading}"
    pdf_content = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length {len(content) + 100} >>
stream
BT /F1 12 Tf 50 750 Td ({tool_name}) Tj 0 -20 Td (KAYAL Synthesis Platform) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 1 0 R >>
startxref 0
%%EOF"""
    return pdf_content.encode("latin-1", errors="replace")
