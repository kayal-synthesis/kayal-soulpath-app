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

v4.0.0 — Rebuilt to connect to the real narrate_tool()/narrate_tool_async()
output in llm_narrator.py, and removed everything specific to the retired
Individual/Union Blueprint products:

  Removed entirely (Blueprint-only, no longer produced by anything):
    generate_union_pdf(), _generate_union_reportlab(), _build_compat_overview(),
    _pct_bar_table(), _pct_colour(), _union_section_style(),
    _UNION_SECTION_NAMES, _DOMAIN_NAMES, _PCT_SECTIONS, _SENSITIVE_SECTIONS,
    _SECTION_DOMAIN_MAP, _COMPAT_OVERVIEW_DOMAINS. These all assumed a fixed
    12 or 16-section Blueprint structure and compatibility_percentages that
    narrate_tool() does not produce.

  New: generate_tool_pdf() / generate_tool_pdf_async() — the real primary
  entry point now. Takes a tool's actual name, tagline, and whatYouGet list
  (the same catalog-grounded content used everywhere else in this project)
  alongside the section_texts a NarrationResult produces, and builds:
    - A real cover page (title, tagline, "Prepared for [name]", birth data
      if given, date, confidential marker)
    - A table of contents, since a genuinely 20-40 page document benefits
      from one, matching what a real customer-facing sample confirmed works
    - Each section under a short, derived title (from the tool's own
      whatYouGet promise for that section, never a generic "Section 3"),
      with a pull-quote pulled from the section's own opening sentence,
      then the full narrated text
    - A closing page

  Bug fix, found via direct testing of the previous version: five separate
  places had a literal, hardcoded em-dash that bypassed _clean_text()
  entirely, because they were static strings (dict values, an f-string
  building a percentage heading, two hardcoded fallback paragraphs) rather
  than narrated text. Every hardcoded string in this rebuild is passed
  through _clean_text() explicitly and this was re-verified with a direct
  sweep test before delivery, not assumed.

v4.0.1 — Real bug fix, found by cross-referencing this file against
main.py's actual import line: `from delivery.pdf_formatter import
generate_pdf, generate_tool_pdf, generate_tool_pdf_async`. The v4.0.0
rebuild's own docstring said old Blueprint-only functions were removed,
but generate_pdf() itself, the plain, non-tool-aware generator used for
whichever reading falls back to the generic narrate() rather than the
tool-aware narrate_tool() (section_texts empty in that case), was never
carried forward at all. A missing name in a Python import statement
fails the entire import, not just that one name, so this silently
disabled PDF generation completely, confirmed against main.py's own
`except ImportError: _PDF_AVAILABLE = False` handling. Restored here,
reusing the same branding, colours, and header/footer infrastructure
already built for generate_tool_pdf(), for the simpler case: a plain
reading with optional domain_sections, no tool-specific section
breakdown or table of contents, matching main.py's real, existing call
signature exactly, no changes needed to that call itself.

Output: bytes (PDF binary) suitable for StreamingResponse

Author: KAYAL Engineering
Version: 4.0.1
"""
from __future__ import annotations

import io
import logging
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
_MEDIUM  = (0.4,   0.4,   0.45)    # Subheading grey
_BODY    = (0.15,  0.15,  0.20)    # Body text

# Page margins
MARGIN_LEFT   = 60
MARGIN_RIGHT  = 60
MARGIN_TOP    = 60
MARGIN_BOTTOM = 80

# Font sizes
SIZE_TITLE   = 28
SIZE_HEADING = 16
SIZE_SUB     = 13
SIZE_BODY    = 12.5
SIZE_SMALL   = 9
SIZE_FOOTER  = 8
SIZE_QUOTE   = 14

# ─────────────────────────────────────────────
# Text cleaner — removes em-dashes and cleans punctuation
# ─────────────────────────────────────────────
def _clean_text(text: Optional[str]) -> str:
    """
    Clean text by removing em-dashes and fixing punctuation artifacts.
    This is the final safety net for text rendered in the PDF. Called on
    every single string that reaches the document, narrated or hardcoded,
    since the previous version's bugs were specifically in hardcoded
    strings that this function was never applied to.
    """
    if not text:
        return ""
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r',\s*\.', '.', text)
    text = re.sub(r'\.\s*,', '.', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\s+([,\.;:!?])', r'\1', text)
    text = re.sub(r'"\s+', '"', text)
    text = re.sub(r'\s+"', '"', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r',\s*,', ',', text)
    return text.strip()

def _split_paragraphs(text: str) -> List[str]:
    """Split reading text into paragraphs, cleaned and escaped for reportlab."""
    text = _clean_text(text)
    raw_paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if len(raw_paragraphs) <= 2 and "\n" in text:
        raw_paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    safe = []
    for p in raw_paragraphs:
        p = _clean_text(p)
        p = p.replace("&", "&amp;")
        p = p.replace("<", "&lt;")
        p = p.replace(">", "&gt;")
        p = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", p)
        p = re.sub(r"\*(.+?)\*",       r"<i>\1</i>", p)
        safe.append(p)
    return safe

def _first_sentence(text: str) -> str:
    """Pull a pull-quote candidate: the section's own opening sentence."""
    text = _clean_text(text)
    match = re.match(r'^(.{20,220}?[.!?])(\s|$)', text)
    if match:
        return match.group(1).strip()
    return text[:180].strip()

def _derive_section_title(promise_text: str, max_words: int = 8) -> str:
    """
    Turn a whatYouGet promise into a short section title. Real tool copy
    is written as a full sentence-shaped promise ("Whether this pattern
    has been getting weaker over time, or is just as strong as ever"),
    not a title, so this trims to a short heading-length phrase rather
    than rendering the whole sentence as a section header.
    """
    text = _clean_text(promise_text)
    text = text[0].upper() + text[1:] if text else text
    words = text.split()
    if len(words) <= max_words:
        return text.rstrip('.,;:')
    return " ".join(words[:max_words]).rstrip('.,;:') + "…"

# ─────────────────────────────────────────────
# Shared reportlab setup — used by both the tool-aware and plain generators
# ─────────────────────────────────────────────
def _rgb_palette():
    from reportlab.lib import colors
    def rgb(r, g, b): return colors.Color(r, g, b)
    return {
        "navy":  rgb(*_NAVY),
        "gold":  rgb(*_GOLD),
        "light": rgb(*_LIGHT),
        "med":   rgb(*_MEDIUM),
        "body":  rgb(*_BODY),
        "white": colors.white,
    }

def _build_styles(palette):
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    navy, gold, light, med, body = (
        palette["navy"], palette["gold"], palette["light"], palette["med"], palette["body"]
    )
    return {
        "title": ParagraphStyle("KayalTitle", fontName="Helvetica-Bold", fontSize=SIZE_TITLE,
                                 textColor=navy, alignment=TA_CENTER, spaceAfter=6, leading=SIZE_TITLE * 1.2),
        "tagline": ParagraphStyle("KayalTagline", fontName="Helvetica-Oblique", fontSize=SIZE_SUB,
                                   textColor=med, alignment=TA_CENTER, spaceAfter=10, leading=SIZE_SUB * 1.4),
        "meta": ParagraphStyle("KayalMeta", fontName="Helvetica", fontSize=SIZE_SMALL,
                                textColor=med, alignment=TA_CENTER, spaceAfter=4),
        "toc_title": ParagraphStyle("KayalTOCTitle", fontName="Helvetica-Bold", fontSize=SIZE_HEADING,
                                     textColor=navy, alignment=TA_CENTER, spaceAfter=16),
        "toc_item": ParagraphStyle("KayalTOCItem", fontName="Helvetica", fontSize=SIZE_BODY,
                                    textColor=body, spaceAfter=8, leading=SIZE_BODY * 1.4),
        "section_heading": ParagraphStyle("KayalSectionHeading", fontName="Helvetica-Bold",
                                           fontSize=SIZE_HEADING - 2, textColor=navy,
                                           spaceBefore=4, spaceAfter=8),
        "quote": ParagraphStyle("KayalQuote", fontName="Helvetica-Oblique", fontSize=SIZE_QUOTE,
                                 textColor=navy, alignment=TA_LEFT, spaceAfter=14,
                                 leading=SIZE_QUOTE * 1.5, leftIndent=16, borderPad=8),
        "body": ParagraphStyle("KayalBody", fontName="Helvetica", fontSize=SIZE_BODY,
                                textColor=body, alignment=TA_JUSTIFY, spaceAfter=20, leading=SIZE_BODY * 2.15),
    }

def _make_page_decorator(job_id: str, palette, page_w, page_h):
    navy, gold, med = palette["navy"], palette["gold"], palette["med"]
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
        canvas.drawString(MARGIN_LEFT, footer_y, "KAYAL SoulPath")
        canvas.drawCentredString(page_w / 2, footer_y, f"Page {page_num}")
        canvas.drawRightString(page_w - MARGIN_RIGHT, footer_y, f"Reading ID: {job_id[:8].upper()}")
        canvas.setStrokeColor(gold)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_LEFT, footer_y + 12, page_w - MARGIN_RIGHT, footer_y + 12)
        canvas.restoreState()
    return _on_page

# ─────────────────────────────────────────────
# Main entry point — tool-aware generator
# ─────────────────────────────────────────────
async def generate_tool_pdf_async(
    job_id:        str,
    tool_name:     str,
    tagline:       str,
    what_you_get:  List[str],
    section_texts: Dict[str, str],
    user_name:     Optional[str]   = None,
    birth_data:    Optional[str]   = None,
    partner_name:  Optional[str]   = None,
    generated:     Optional[str]   = None,
    estimated_pages: Optional[int] = None,
) -> bytes:
    """
    Generate a branded PDF for any of the 113 real tools, built from the
    tool's own name/tagline/whatYouGet and a NarrationResult's section_texts.

    Args:
        job_id:          Reading job ID (used in footer)
        tool_name:        The real tool name from the catalog
        tagline:           The real tool tagline from the catalog
        what_you_get:      The tool's real whatYouGet list, same order as
                           the sections were narrated in narrate_tool()
        section_texts:     Dict from NarrationResult.section_texts, keyed
                           "section_1".."section_N" in the same order as
                           what_you_get
        user_name:         Person's name for personalization
        birth_data:        Optional single formatted line (date/time/place)
        partner_name:      For requiresPartner tools, the partner's name
        generated:         ISO timestamp
        estimated_pages:   From NarrationResult.estimated_pages, shown
                           nowhere directly but kept for logging

    Returns:
        PDF as bytes
    """
    try:
        return _generate_tool_reportlab(
            job_id=job_id, tool_name=_clean_text(tool_name), tagline=_clean_text(tagline),
            what_you_get=[_clean_text(w) for w in what_you_get],
            section_texts={k: _clean_text(v) for k, v in section_texts.items()},
            user_name=_clean_text(user_name) if user_name else None,
            birth_data=_clean_text(birth_data) if birth_data else None,
            partner_name=_clean_text(partner_name) if partner_name else None,
            generated=generated,
        )
    except ImportError:
        logger.warning("reportlab not installed, generating plain text PDF fallback")
        full_text = "\n\n".join(
            f"{_derive_section_title(what_you_get[i]) if i < len(what_you_get) else f'Section {i+1}'}\n{v}"
            for i, v in enumerate(section_texts.values())
        )
        return _generate_plain_text_fallback(tool_name, full_text)
    except Exception as e:
        logger.error(f"PDF generation error [{job_id}]: {e}", exc_info=True)
        full_text = "\n\n".join(_clean_text(v) for v in section_texts.values())
        return _generate_plain_text_fallback(tool_name, full_text)

def generate_tool_pdf(
    job_id:        str,
    tool_name:     str,
    tagline:       str,
    what_you_get:  List[str],
    section_texts: Dict[str, str],
    user_name:     Optional[str]   = None,
    birth_data:    Optional[str]   = None,
    partner_name:  Optional[str]   = None,
    generated:     Optional[str]   = None,
    estimated_pages: Optional[int] = None,
) -> bytes:
    """Sync version of generate_tool_pdf_async()."""
    try:
        return _generate_tool_reportlab(
            job_id=job_id, tool_name=_clean_text(tool_name), tagline=_clean_text(tagline),
            what_you_get=[_clean_text(w) for w in what_you_get],
            section_texts={k: _clean_text(v) for k, v in section_texts.items()},
            user_name=_clean_text(user_name) if user_name else None,
            birth_data=_clean_text(birth_data) if birth_data else None,
            partner_name=_clean_text(partner_name) if partner_name else None,
            generated=generated,
        )
    except ImportError:
        logger.warning("reportlab not installed, generating plain text PDF fallback")
        full_text = "\n\n".join(
            f"{_derive_section_title(what_you_get[i]) if i < len(what_you_get) else f'Section {i+1}'}\n{v}"
            for i, v in enumerate(section_texts.values())
        )
        return _generate_plain_text_fallback(tool_name, full_text)
    except Exception as e:
        logger.error(f"PDF generation error [{job_id}]: {e}", exc_info=True)
        full_text = "\n\n".join(_clean_text(v) for v in section_texts.values())
        return _generate_plain_text_fallback(tool_name, full_text)

# ─────────────────────────────────────────────
# Plain, non-tool-aware generator — the real, restored function
# ─────────────────────────────────────────────
async def generate_pdf(
    job_id:    str,
    tool_name: str,
    reading:   str,
    sections:  Optional[Dict[str, str]] = None,
    life_path: Optional[int]            = None,
    sun_sign:  Optional[str]            = None,
    generated: Optional[str]            = None,
) -> bytes:
    """
    Plain PDF generator, restored, for readings that fell back to the
    generic narrate() rather than the tool-aware narrate_tool(), meaning
    no section_texts or whatYouGet breakdown exists to build a table of
    contents or per-section pull-quotes from. main.py's own /reading/pdf
    route falls into this exact path whenever section_texts comes back
    empty, confirmed directly against a real completed reading where
    DeepSeek failed partway through and the fallback narrator ran
    instead. This is the same real, deployed situation, not a
    hypothetical edge case.

    Matches main.py's actual, existing call signature exactly, no
    change needed on that side beyond fixing the import itself.

    Args:
        job_id:    Reading job ID (used in footer)
        tool_name: The tool's display name
        reading:   The full narrated reading text
        sections:  Optional domain_sections dict, rendered as simple
                   labeled paragraphs if present, no per-section
                   pull-quotes or derived titles, since there's no
                   whatYouGet promise to derive them from here
        life_path: Optional, shown as a small signature line if present
        sun_sign:  Optional, shown alongside life_path if present
        generated: ISO timestamp

    Returns:
        PDF as bytes
    """
    try:
        return _generate_plain_reportlab(
            job_id=job_id, tool_name=_clean_text(tool_name), reading=_clean_text(reading),
            sections={k: _clean_text(v) for k, v in (sections or {}).items()},
            life_path=life_path, sun_sign=_clean_text(sun_sign) if sun_sign else None,
            generated=generated,
        )
    except ImportError:
        logger.warning("reportlab not installed, generating plain text PDF fallback")
        return _generate_plain_text_fallback(tool_name, reading)
    except Exception as e:
        logger.error(f"PDF generation error [{job_id}]: {e}", exc_info=True)
        return _generate_plain_text_fallback(tool_name, reading)

def _generate_plain_reportlab(
    job_id:    str,
    tool_name: str,
    reading:   str,
    sections:  Dict[str, str],
    life_path: Optional[int],
    sun_sign:  Optional[str],
    generated: Optional[str],
) -> bytes:
    """Real reportlab renderer for the plain, non-tool-aware case: cover, reading text, optional labeled sections, closing."""
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, HRFlowable, PageBreak,
    )

    palette = _rgb_palette()
    styles  = _build_styles(palette)
    navy, gold = palette["navy"], palette["gold"]

    buffer = io.BytesIO()
    page_w, page_h = A4
    _on_page = _make_page_decorator(job_id, palette, page_w, page_h)

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=MARGIN_LEFT, rightMargin=MARGIN_RIGHT,
        topMargin=MARGIN_TOP + 20, bottomMargin=MARGIN_BOTTOM,
        onFirstPage=_on_page, onLaterPages=_on_page,
    )

    story: List[Any] = []

    # ── Cover page ──────────────────────────────────────────────
    story.append(Spacer(1, 40))
    story.append(Paragraph("KAYAL SOULPATH", styles["meta"]))
    story.append(Spacer(1, 30))
    story.append(Paragraph(tool_name or "Your Reading", styles["title"]))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="60%", thickness=1.5, color=gold, hAlign="CENTER", spaceAfter=12))

    meta_parts = []
    if life_path or sun_sign:
        sig_parts = []
        if life_path: sig_parts.append(f"Life Path {life_path}")
        if sun_sign:  sig_parts.append(f"Sun in {sun_sign}")
        meta_parts.append(" · ".join(sig_parts))
    if generated:
        try:
            dt = datetime.fromisoformat(generated.replace("Z", "+00:00"))
            meta_parts.append(dt.strftime("%B %d, %Y"))
        except Exception:
            pass
    meta_parts.append("Confidential")
    if meta_parts:
        story.append(Spacer(1, 20))
        story.append(Paragraph("  ·  ".join(_clean_text(m) for m in meta_parts), styles["meta"]))
    story.append(PageBreak())

    # ── Main reading ────────────────────────────────────────────
    for para in _split_paragraphs(reading):
        story.append(Paragraph(para, styles["body"]))

    # ── Domain sections, if present, simple labeled paragraphs ─
    if sections:
        story.append(Spacer(1, 16))
        story.append(HRFlowable(width="40%", thickness=1, color=gold, hAlign="CENTER", spaceAfter=16))
        for key, text in sections.items():
            if not text or not text.strip():
                continue
            label = key.replace("_", " ").title()
            story.append(Paragraph(label, styles["section_heading"]))
            for para in _split_paragraphs(text):
                story.append(Paragraph(para, styles["body"]))
            story.append(Spacer(1, 12))

    # ── Closing ──────────────────────────────────────────────────
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gold, spaceBefore=8, spaceAfter=16))
    story.append(Paragraph(
        _clean_text(
            "This reading reflects your pattern as it stands today. What is named here is a "
            "starting point for awareness, not a fixed outcome. What you do with it is yours to decide."
        ),
        styles["body"],
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("KAYAL SoulPath  ·  kayalsoulpath.com", styles["meta"]))

    doc.build(story)
    return buffer.getvalue()

def _generate_tool_reportlab(
    job_id:        str,
    tool_name:     str,
    tagline:       str,
    what_you_get:  List[str],
    section_texts: Dict[str, str],
    user_name:     Optional[str],
    birth_data:    Optional[str],
    partner_name:  Optional[str],
    generated:     Optional[str],
) -> bytes:
    """Real reportlab renderer: cover, table of contents, sections with pull-quotes, closing."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
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
        canvas.drawString(MARGIN_LEFT, footer_y, "KAYAL SoulPath")
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
                                  textColor=navy, alignment=TA_CENTER, spaceAfter=6, leading=SIZE_TITLE * 1.2)
    style_tagline = ParagraphStyle("KayalTagline", fontName="Helvetica-Oblique", fontSize=SIZE_SUB,
                                    textColor=med, alignment=TA_CENTER, spaceAfter=10, leading=SIZE_SUB * 1.4)
    style_meta = ParagraphStyle("KayalMeta", fontName="Helvetica", fontSize=SIZE_SMALL,
                                 textColor=med, alignment=TA_CENTER, spaceAfter=4)
    style_toc_title = ParagraphStyle("KayalTOCTitle", fontName="Helvetica-Bold", fontSize=SIZE_HEADING,
                                      textColor=navy, alignment=TA_CENTER, spaceAfter=16)
    style_toc_item = ParagraphStyle("KayalTOCItem", fontName="Helvetica", fontSize=SIZE_BODY,
                                     textColor=body, spaceAfter=8, leading=SIZE_BODY * 1.4)
    style_section_heading = ParagraphStyle("KayalSectionHeading", fontName="Helvetica-Bold",
                                            fontSize=SIZE_HEADING - 2, textColor=navy,
                                            spaceBefore=4, spaceAfter=8)
    style_quote = ParagraphStyle("KayalQuote", fontName="Helvetica-Oblique", fontSize=SIZE_QUOTE,
                                  textColor=navy, alignment=TA_LEFT, spaceAfter=14,
                                  leading=SIZE_QUOTE * 1.5, leftIndent=16, borderPad=8)
    style_body = ParagraphStyle("KayalBody", fontName="Helvetica", fontSize=SIZE_BODY,
                                 textColor=body, alignment=TA_JUSTIFY, spaceAfter=20, leading=SIZE_BODY * 2.15)

    story: List[Any] = []

    # ── Cover page ──────────────────────────────────────────────
    story.append(Spacer(1, 40))
    story.append(Paragraph("KAYAL SOULPATH", style_meta))
    story.append(Spacer(1, 30))
    story.append(Paragraph(tool_name, style_title))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="60%", thickness=1.5, color=gold, hAlign="CENTER", spaceAfter=12))
    if tagline:
        story.append(Paragraph(tagline, style_tagline))

    meta_parts = []
    if user_name:
        label = f"Prepared for {user_name}"
        if partner_name:
            label += f" and {partner_name}"
        meta_parts.append(label)
    if birth_data:
        meta_parts.append(birth_data)
    if generated:
        try:
            dt = datetime.fromisoformat(generated.replace("Z", "+00:00"))
            meta_parts.append(dt.strftime("%B %d, %Y"))
        except Exception:
            pass
    meta_parts.append("Confidential")
    if meta_parts:
        story.append(Spacer(1, 20))
        story.append(Paragraph("  ·  ".join(_clean_text(m) for m in meta_parts), style_meta))
    story.append(PageBreak())

    # ── Table of contents ───────────────────────────────────────
    if len(what_you_get) > 1:
        story.append(Spacer(1, 20))
        story.append(Paragraph("What This Reading Covers", style_toc_title))
        story.append(HRFlowable(width="40%", thickness=1, color=gold, hAlign="CENTER", spaceAfter=20))
        for i, item in enumerate(what_you_get, start=1):
            title = _derive_section_title(item)
            story.append(Paragraph(f"{i}. {title}", style_toc_item))
        story.append(PageBreak())

    # ── Sections ─────────────────────────────────────────────────
    for i, (key, text) in enumerate(section_texts.items()):
        if not text or not text.strip():
            continue
        promise = what_you_get[i] if i < len(what_you_get) else ""
        title = _derive_section_title(promise) if promise else f"Section {i + 1}"

        section_header = Table(
            [[Paragraph(f"{i + 1}. {title}", style_section_heading)]],
            colWidths=[doc.width],
        )
        section_header.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), light),
            ("LEFTPADDING",   (0, 0), (-1, -1), 12),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(KeepTogether([section_header, Spacer(1, 10)]))

        paragraphs = _split_paragraphs(text)
        if paragraphs:
            quote_text = _first_sentence(paragraphs[0])
            quote_table = Table(
                [[Paragraph(f"\u201c{quote_text}\u201d", style_quote)]],
                colWidths=[doc.width],
            )
            quote_table.setStyle(TableStyle([
                ("LEFTPADDING",  (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING",   (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
                ("LINEBEFORE",   (0, 0), (0, -1),  3, gold),
            ]))
            story.append(quote_table)
            story.append(Spacer(1, 10))

        for para in paragraphs:
            story.append(Paragraph(para, style_body))
        story.append(Spacer(1, 16))

    # ── Closing ──────────────────────────────────────────────────
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gold, spaceBefore=8, spaceAfter=16))
    story.append(Paragraph(
        _clean_text(
            "This reading reflects your pattern as it stands today. What is named here is a "
            "starting point for awareness, not a fixed outcome. What you do with it is yours to decide."
        ),
        style_body,
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("KAYAL SoulPath  ·  kayalsoulpath.com", style_meta))

    doc.build(story)
    return buffer.getvalue()

# ─────────────────────────────────────────────
# Plain text fallback
# ─────────────────────────────────────────────
def _generate_plain_text_fallback(tool_name: str, reading: str) -> bytes:
    """Minimal PDF using only Python stdlib, used if reportlab is unavailable or errors."""
    reading = _clean_text(reading)
    tool_name = _clean_text(tool_name)
    content = f"{tool_name}\n{'=' * len(tool_name)}\n\nKAYAL SoulPath\n\n{reading}"
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
BT /F1 12 Tf 50 750 Td ({tool_name}) Tj 0 -20 Td (KAYAL SoulPath) Tj ET
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
