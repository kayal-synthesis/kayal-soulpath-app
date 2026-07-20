"""
LLM Narrator — KAYAL Synthesis Platform
=========================================
Converts LLMPayload or PromptPackage into the final user-facing reading
using the DeepSeek-V4 API.

Model routing by tier:
    Tier 4 (Full)          → deepseek-v4
    Tier 3 (Face + Palm)   → deepseek-v4
    Tier 2 (Face or Palm)  → deepseek-v4
    Tier 1 (Core only)     → deepseek-v4
    Premium deep reading   → deepseek-v4
    Union Blueprint        → deepseek-v4

v3.0.0 — Narrative arc enforcement (publishing principles applied):
    - NarrationResult: opening_paragraph and closing_paragraph fields added
      so pdf_formatter and chat.py can access the document frame separately
    - _NARRATIVE_ORDER: section ordering map — sections narrated in story-momentum
      sequence (context-setters first, bridge/impact last)
    - _check_opening_sentence(): post-process validator — if a section opens with
      weak framing (name + number, generic statement), retries once with a stronger
      instruction. This is the "desk rejection" check: the opening sentence is the
      abstract. It either creates urgency or loses the reader.
    - _build_document_frame(): generates document-level opening and closing paragraphs
      as separate LLM calls that reference the assembled sections
    - _assemble_full_text(): Individual Blueprint now opens with the document frame,
      flows through sections in narrative order, and closes with the closing paragraph
    - _system_prompt() (legacy): narrative arc directive added — Problem→Gap→Solution→
      Impact mandate now applies to the legacy narrate() path as well

v3.1.0: Switched from Claude (Sonnet/Haiku/Opus) to DeepSeek-V4
v3.1.1: Added em-dash (—) removal to _strip_methodology_labels() and _clean_output_text()

Author: KAYAL Engineering
Version: 3.1.1
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, Iterator, List, Optional, Tuple

logger = logging.getLogger(__name__)

# v2.0.0 — Import PromptPackage types (graceful fallback if not yet deployed)
try:
    from .prompt_builder import SectionPrompt, PromptPackage
    _PROMPT_BUILDER_AVAILABLE = True
except ImportError:
    SectionPrompt = None   # type: ignore
    PromptPackage = None   # type: ignore
    _PROMPT_BUILDER_AVAILABLE = False


# ---------------------------------------------------------------------------
# Model constants (v3.1.0 — switched to DeepSeek)
# ---------------------------------------------------------------------------

_MODEL_DEEPSEEK = "deepseek-v4"
_DEEPSEEK_ENDPOINT = "https://api.deepseek.com/v1/chat/completions"

# Legacy model constants preserved for backward compatibility
MODEL_SONNET  = _MODEL_DEEPSEEK
MODEL_HAIKU   = _MODEL_DEEPSEEK
MODEL_OPUS    = _MODEL_DEEPSEEK

_TIER_MODELS = {
    "tier_4_full":        _MODEL_DEEPSEEK,
    "tier_3b_face_palm":  _MODEL_DEEPSEEK,
    "tier_3_palm":        _MODEL_DEEPSEEK,
    "tier_2_face":        _MODEL_DEEPSEEK,
    "tier_2b_palm_only":  _MODEL_DEEPSEEK,
    "tier_1_core":        _MODEL_DEEPSEEK,
}


# ---------------------------------------------------------------------------
# Output models (v2.0.0 — extended with 4 new fields)
# ---------------------------------------------------------------------------

@dataclass
class NarrationResult:
    """Final narration output from the LLM narrator."""
    session_id:      str
    model_used:      str
    tier:            str
    full_text:       str
    domain_sections: Dict[str, str]   # domain → narrated text (legacy path)
    word_count:      int
    tokens_used:     int
    processing_ms:   int
    fallback_used:   bool
    error:           Optional[str]
    # v2.0.0 new fields
    tool_type:       str              = "individual_blueprint"
    section_texts:   Dict[str, str]   = field(default_factory=dict)
    compatibility_percentages: Optional[Dict[str, float]] = None
    pct_validated:   bool             = True
    # v3.0.0 new fields — document frame, accessible separately by pdf_formatter and chat.py
    opening_paragraph:  str           = ""   # Document-level significance statement
    closing_paragraph:  str           = ""   # Document-level send-off / impact landing


# ---------------------------------------------------------------------------
# Prompt builders (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _system_prompt(cultural_context: str, narration_tone: str) -> str:
    return f"""You are the narrator of a personalised life reading for KAYAL, a sophisticated synthesis platform.

Your role is to transform structured insight data into flowing, meaningful, deeply personalised prose.

VOICE AND TONE:
{narration_tone}

CULTURAL CONTEXT:
{cultural_context}

NARRATIVE ARC — every section and the reading as a whole must follow this structure:
1. SIGNIFICANCE  — Open by establishing why this dimension of life matters and what most people
                   get wrong or never understand about it. The first two sentences decide whether
                   the reader continues. A weak opening (name + number, generic statement) is a
                   desk rejection. A strong opening creates immediate relevance.
2. GAP           — Name what has been missing from this person's self-understanding in this domain.
                   Specific to their signals — not generic ("most people don't know themselves").
3. REVELATION    — Deliver what this synthesis specifically shows. Concrete. Personal.
                   Specific to this person's life — not the system or number that produced it.
4. IMPACT        — Land the real-world consequence. What changes because of this insight?
                   End every section here — never with a summary or restatement.

RULES — follow these precisely:
1. Write in second person ("you", "your") — direct, warm, personal
2. Never mention system names or numbers in the output.
   Do not say "astrology says", "the palm shows", "numerology indicates",
   "Life Path 5", "Personal Year 7", "Sun in Scorpio", "your Pinnacle",
   "your Destiny number", "your chart", "your Ascendant", "Saturn return".
   Instead say what it means: "the pattern that runs through your life is...",
   "the current chapter is asking for...", "the direction you are moving toward is...".
   The visitor must feel seen — not taught. The reading is revelation, not a report.
3. Never use esoteric vocabulary: no sephiroth, no chakra names in Sanskrit, no Kabbalistic terms,
   no Ba Zi terminology — translate everything into plain insight language
4. The temporal arc (past/present/future) should flow naturally in each domain — not labelled as
   "PAST:", "PRESENT:", "FUTURE:" but woven as a continuous narrative
5. Remedies should be presented as invitations, not prescriptions
6. Problems should be named clearly but framed as growth opportunities, not verdicts
7. Write with warmth and respect — you are speaking to a whole human being, not analysing a data set
8. Do not pad or repeat. Every sentence should add something new
9. Honour the word count target — not a strict limit but a guide for depth
10. Never use em-dashes (—) in your writing. Use commas (,) or periods (.) instead.

FORMAT:
- Start with a brief overall opening paragraph (2-3 sentences) that establishes significance
- Then a section for each domain provided
- Close with the timing and journey narrative
- End with the overall theme as a closing paragraph that lands — not summarises"""


def _domain_prompt_sonnet(domain_payloads, timing, journey, overall, name, word_target):
    domains_text = ""
    for dp in domain_payloads:
        domain_name = dp["domain"].replace("_", " ").title()
        domains_text += f"\n\n## {domain_name}\n"
        domains_text += f"Convergence: {dp['convergence_level']}\n"
        domains_text += f"Primary: {dp['primary_reading']}\n"
        if dp.get("supporting_points"):
            domains_text += f"Supporting: {' | '.join(dp['supporting_points'][:2])}\n"
        if dp.get("temporal"):
            t = dp["temporal"]
            domains_text += f"Past: {t['past']}\nPresent: {t['present']}\nFuture: {t['future']}\n"
        if dp.get("tension"):    domains_text += f"Tension: {dp['tension']}\n"
        if dp.get("resolution"): domains_text += f"Resolution: {dp['resolution']}\n"
        if dp.get("problem"):    domains_text += f"Challenge: {dp['problem']}\n"
        if dp.get("practical_solution"): domains_text += f"Practical path: {dp['practical_solution']}\n"
        if dp.get("remedy") and dp["remedy"].get("has_remedy"):
            r = dp["remedy"]
            domains_text += f"Spiritual practice: {r['title']} — {r['description'][:200]}\n"
            domains_text += f"How: {r['timing']} for {r['duration']}\n"
            if r.get("mantra_or_prayer"):
                domains_text += f"Practice: {r['mantra_or_prayer']}\n"
        if dp.get("timing"):      domains_text += f"Timing: {dp['timing']}\n"
        if dp.get("growth_edge"): domains_text += f"Growth edge: {dp['growth_edge']}\n"
        domains_text += f"Tone instruction: {dp['tone_instruction']}\n"

    return (
        f"Write a complete, flowing reading for {name} using the structured data below.\n\n"
        f"Target approximately {word_target} words total.\n"
        "Weave the temporal arc (past/present/future) naturally into each domain's narrative.\n"
        "Present spiritual practices as gentle invitations, not prescriptions.\n\n"
        f"STRUCTURED DATA:\n{domains_text}\n\n"
        f"TIMING CONTEXT:\n{timing}\n\n"
        f"JOURNEY NARRATIVE:\n{journey}\n\n"
        f"OVERALL THEME:\n{overall}\n\n"
        f"Write the complete reading now. Begin with {name}'s name."
    )


def _domain_prompt_haiku(domain, name):
    domain_name = domain["domain"].replace("_", " ").title()
    temporal_text = ""
    if domain.get("temporal"):
        t = domain["temporal"]
        temporal_text = f"\nPast pattern: {t['past']}\nPresent reality: {t['present']}\nFuture trajectory: {t['future']}"
    remedy_text = ""
    if domain.get("remedy") and domain["remedy"].get("has_remedy"):
        r = domain["remedy"]
        remedy_text = f"\nSpiritual practice: {r['title']}\nHow: {r['description'][:150]}\nTiming: {r['timing']}"
    problem_text = ""
    if domain.get("problem"):
        problem_text = f"\nChallenge identified: {domain['problem']}"
    if domain.get("practical_solution"):
        problem_text += f"\nPractical path: {domain['practical_solution'][:150]}"

    return (
        f"Write a warm, flowing paragraph about {name}'s {domain_name} life.\n\n"
        f"INSIGHT DATA:\nMain reading: {domain['primary_reading']}\n"
        f"{temporal_text}\n{problem_text}\n{remedy_text}\n"
        f"Growth edge: {domain.get('growth_edge', '')}\n"
        f"Tone: {domain['tone_instruction']}\n\n"
        "Write 120-180 words. Second person. No system names. Weave past/present/future naturally.\n"
        "If a spiritual practice is included, present it as a gentle invitation.\nBegin writing now:"
    )


# ---------------------------------------------------------------------------
# Output text cleaner — removes em-dashes and cleans punctuation
# ---------------------------------------------------------------------------

def _clean_output_text(text: str) -> str:
    """
    Clean output text by removing em-dashes and fixing punctuation artifacts.
    This is the final safety net before text is returned to the caller.
    """
    if not text:
        return text

    # ── Remove em-dashes and en-dashes ──────────────────────
    # Replace em-dash with comma + space
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")

    # ── Clean up punctuation artifacts ──────────────────────
    # Remove double commas
    text = re.sub(r',\s*,', ',', text)
    # Remove comma before period
    text = re.sub(r',\s*\.', '.', text)
    # Remove period before comma
    text = re.sub(r'\.\s*,', '.', text)
    # Remove comma at end of sentence
    text = re.sub(r',\s*\.', '.', text)
    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text)
    # Clean up spaces before punctuation
    text = re.sub(r'\s+([,\.;:!?])', r'\1', text)
    # Clean up spaces after opening quotes
    text = re.sub(r'"\s+', '"', text)
    # Clean up spaces before closing quotes
    text = re.sub(r'\s+"', '"', text)

    # ── Remove double spaces ────────────────────────────────
    text = re.sub(r'\s+', ' ', text)
    # Remove any remaining double commas
    text = re.sub(r',\s*,', ',', text)

    # ── Strip leading/trailing whitespace ────────────────────
    text = text.strip()

    return text


# ---------------------------------------------------------------------------
# DeepSeek API callers (v3.1.0 — replaced Anthropic)
# ---------------------------------------------------------------------------

def _call_deepseek(
    messages: List[Dict],
    system: str,
    max_tokens: int,
    temperature: float = 0.7,
) -> Dict:
    """Call DeepSeek-V4 synchronously."""
    try:
        import httpx
    except ImportError:
        raise ImportError("httpx required. Install with: pip install httpx")

    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY not set in environment")

    # DeepSeek uses OpenAI-compatible format — system prompt as first message
    openai_messages = [{"role": "system", "content": system}] + messages

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            _DEEPSEEK_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": _MODEL_DEEPSEEK,
                "messages": openai_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        )

        if response.status_code == 401:
            raise RuntimeError("DeepSeek API key invalid or missing. Check DEEPSEEK_API_KEY in .env")

        if not response.is_success:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text[:300])
            except Exception:
                err_msg = response.text[:300]
            raise RuntimeError(f"DeepSeek API {response.status_code}: {err_msg}")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("DeepSeek API returned no choices")

        content = choices[0].get("message", {}).get("content", "")

        # Convert to Anthropic-compatible format for downstream compatibility
        return {
            "content": [{"type": "text", "text": content}],
            "usage": {
                "input_tokens": data.get("usage", {}).get("prompt_tokens", 0),
                "output_tokens": data.get("usage", {}).get("completion_tokens", 0),
            },
            "model": _MODEL_DEEPSEEK,
        }


async def _call_deepseek_async(
    messages: List[Dict],
    system: str,
    max_tokens: int,
    temperature: float = 0.7,
    stream: bool = False,
) -> Dict:
    """Call DeepSeek-V4 asynchronously."""
    try:
        import httpx
    except ImportError:
        raise ImportError("httpx required. Install with: pip install httpx")

    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY not set in environment")

    openai_messages = [{"role": "system", "content": system}] + messages

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            _DEEPSEEK_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": _MODEL_DEEPSEEK,
                "messages": openai_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": stream,
            }
        )

        if not response.is_success:
            try:
                err_msg = response.json().get("error", {}).get("message", response.text[:300])
            except Exception:
                err_msg = response.text[:300]
            raise RuntimeError(f"DeepSeek API {response.status_code}: {err_msg}")

        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("DeepSeek API returned no choices")

        content = choices[0].get("message", {}).get("content", "")

        return {
            "content": [{"type": "text", "text": content}],
            "usage": {
                "input_tokens": data.get("usage", {}).get("prompt_tokens", 0),
                "output_tokens": data.get("usage", {}).get("completion_tokens", 0),
            },
            "model": _MODEL_DEEPSEEK,
        }


# Legacy function names — preserved for backward compatibility
async def _call_anthropic_async(messages, system, model, max_tokens, stream=False):
    """Legacy wrapper — now calls DeepSeek."""
    return await _call_deepseek_async(messages, system, max_tokens, stream=stream)


def _call_anthropic_sync(messages, system, model, max_tokens):
    """Legacy wrapper — now calls DeepSeek."""
    return _call_deepseek(messages, system, max_tokens)


def _extract_text(response: Dict) -> str:
    content = response.get("content", [])
    text = " ".join(block.get("text", "") for block in content if block.get("type") == "text").strip()
    # Clean em-dashes from extracted text immediately
    return _clean_output_text(text)


def _token_count(response: Dict) -> int:
    usage = response.get("usage", {})
    return usage.get("input_tokens", 0) + usage.get("output_tokens", 0)


def _word_to_tokens(word_count: int) -> int:
    return min(4096, int(word_count / 0.75) + 200)



# ---------------------------------------------------------------------------
# v2.0.0 — % compliance validation (preserved)
# ---------------------------------------------------------------------------

_PCT_PATTERN = re.compile('[0-9]{1,3}\\s*%|[0-9]{1,3}\\s+percent', re.IGNORECASE)

_BINARY_VERDICTS = [
    "is compatible", "are compatible", "not compatible", "incompatible",
    "is a good match", "are a good match", "is a bad match", "are a bad match",
    "will work", "won't work", "will last", "won't last",
    "are meant for each other", "are not meant",
    "children are indicated", "will not have children", "cannot have children",
]


def _validate_pct_output(text: str, pct_label: str) -> Tuple[bool, Optional[str]]:
    """Validate that a % section output contains a percentage figure."""
    has_pct = bool(_PCT_PATTERN.search(text))
    text_lower = text.lower()
    has_binary = any(v in text_lower for v in _BINARY_VERDICTS)
    if has_binary:
        logger.warning(
            "% section contains binary compatibility verdict",
            extra={"pct_label": pct_label, "text_snippet": text[:120]},
        )
    m = _PCT_PATTERN.search(text)
    found_pct = m.group(0) if m else None
    return has_pct and not has_binary, found_pct


def _inject_pct_if_missing(
    text:      str,
    pct_label: str,
    pct_value: float,
) -> Tuple[str, bool]:
    """If the text is missing the required % score, inject it as the first line."""
    was_injected = False
    text_lower = text.lower()
    for verdict in _BINARY_VERDICTS:
        if verdict in text_lower:
            logger.warning(f"Binary verdict detected in % section: {verdict!r}")

    if not _PCT_PATTERN.search(text):
        pct_line = f"{pct_label}: {round(pct_value):.0f}%"
        text = pct_line + "\n\n" + text
        was_injected = True
        logger.info(f"% score injected into section: {pct_line}")

    return text, was_injected


# ---------------------------------------------------------------------------
# v3.0.0 — Methodology label stripper (final safety net)
# ---------------------------------------------------------------------------

_METHODOLOGY_STRIP_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r'\bLife Path\s+\d+\b',          re.IGNORECASE), "your core pattern"),
    (re.compile(r'\bLife Path\s+number\s+\d+\b', re.IGNORECASE), "your core pattern"),
    (re.compile(r'\bPersonal Year\s+\d+\b',       re.IGNORECASE), "this current chapter"),
    (re.compile(r'\bPinnacle\s+\d+\b',            re.IGNORECASE), "this life chapter"),
    (re.compile(r'\bDestiny [Nn]umber\s+\d+\b',   re.IGNORECASE), "your life direction"),
    (re.compile(r'\bSoul Urge\s+\d+\b',           re.IGNORECASE), "your inner drive"),
    (re.compile(r'\bPersonality [Nn]umber\s+\d+\b', re.IGNORECASE), "how others experience you"),
    (re.compile(r'\bBirthday [Nn]umber\s+\d+\b',  re.IGNORECASE), "your natural gift"),
    (re.compile(r'\bMaster [Nn]umber\s+\d+\b',    re.IGNORECASE), "this heightened calling"),
    (re.compile(r'\b(Sun|Moon|Mars|Venus|Jupiter|Saturn|Mercury|Uranus|Neptune|Pluto)\s+in\s+[A-Z][a-z]+\b'), "this placement"),
    (re.compile(r'\b(your|the)\s+(Sun|Moon|Ascendant|Midheaven|North Node|South Node)\b', re.IGNORECASE), "this indicator"),
    (re.compile(r'\b(Saturn|Jupiter)\s+[Rr]eturn\b'), "this structural cycle"),
    (re.compile(r'\bVedic [Dd]asha\b'),            "the active cycle"),
    (re.compile(r'\b[A-Z][a-z]+ [Dd]asha\b'),     "the active cycle"),
    (re.compile(r'\b(Rahu|Ketu|Atmakaraka)\b',    re.IGNORECASE), "the soul indicator"),
    (re.compile(r'\b[Nn]umerology\s+(shows|reveals|indicates|suggests|points to)\b'), "the pattern reveals"),
    (re.compile(r'\b[Aa]strology\s+(shows|reveals|indicates|suggests|points to)\b'),  "the indicators reveal"),
    (re.compile(r'\b(your|the)\s+[Nn]umerology\b'), "the patterns"),
    (re.compile(r'\b(your|the)\s+[Cc]hart\b'),      "the synthesis"),
    (re.compile(r'\baccording to (numerology|astrology|the chart|the reading|palmistry)\b', re.IGNORECASE), "the synthesis shows"),
    (re.compile(r'\bnumerologically speaking\b',  re.IGNORECASE), "structurally"),
    (re.compile(r'\bastrologically speaking\b',   re.IGNORECASE), "structurally"),
]


def _strip_methodology_labels(text: str) -> str:
    """
    Final safety net — strip any system labels or numbers that survived the prompt constraints.
    Also removes em-dashes and cleans up punctuation.
    """
    if not text:
        return text

    # ── Remove em-dashes and en-dashes ──────────────────────
    # Replace em-dash with comma + space
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")

    # ── Clean up punctuation artifacts ──────────────────────
    # Remove double commas
    text = re.sub(r',\s*,', ',', text)
    # Remove comma before period
    text = re.sub(r',\s*\.', '.', text)
    # Remove period before comma
    text = re.sub(r'\.\s*,', '.', text)
    # Remove comma at end of sentence
    text = re.sub(r',\s*\.', '.', text)
    # Clean up extra spaces
    text = re.sub(r'\s+', ' ', text)
    # Clean up spaces before punctuation
    text = re.sub(r'\s+([,\.;:!?])', r'\1', text)
    # Clean up spaces after opening quotes
    text = re.sub(r'"\s+', '"', text)
    # Clean up spaces before closing quotes
    text = re.sub(r'\s+"', '"', text)

    # ── Strip methodology labels ─────────────────────────────
    for pattern, replacement in _METHODOLOGY_STRIP_PATTERNS:
        original = text
        text = pattern.sub(replacement, text)
        if text != original:
            logger.debug(
                "Methodology label stripped from output",
                extra={"pattern": str(pattern.pattern)[:60], "replacement": replacement},
            )

    # ── Final cleanup ────────────────────────────────────────
    # Remove any remaining double spaces
    text = re.sub(r'\s+', ' ', text)
    # Remove any remaining double commas
    text = re.sub(r',\s*,', ',', text)

    # ── Clean up any remaining em-dashes that might have been missed ──
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")

    return text.strip()


# ---------------------------------------------------------------------------
# v3.0.0 — Narrative order and opening sentence enforcement (preserved)
# ---------------------------------------------------------------------------

_NARRATIVE_ORDER: Dict[str, int] = {
    "character_overview":  1,
    "identity_purpose":    2,
    "spiritual_path":      3,
    "life_timing":         4,
    "career_vocation":     5,
    "financial_life":      6,
    "wealth_potential":    7,
    "love_relationships":  8,
    "health_constitution": 9,
    "spirit_world":       10,
    "legacy_mission":     11,
    "remedies_activation":12,
    "union_overview":         1,
    "person_a_character":     2,
    "person_b_character":     3,
    "spiritual_compatibility":4,
    "marriage_longevity":     5,
    "intimacy_compatibility": 6,
    "dominance_dynamics":     7,
    "children_potential":     8,
    "career_synergy":         9,
    "wealth_compatibility":  10,
    "health_cross_impact":   11,
    "parental_patterns":     12,
    "death_order":           13,
    "infidelity_profile":    14,
    "union_legacy":          15,
    "union_remedies":        16,
}

_WEAK_OPENING_PATTERNS = [
    r"^your life path \d",
    r"^[a-z]+'s life path",
    r"^as a life path",
    r"^in numerology",
    r"^your sun sign",
    r"^born under",
    r"^your chart",
    r"^the chart",
    r"^according to",
    r"^based on",
    r"^this section",
    r"^in this reading",
    r"^life path \d",
    r"^personal year \d",
    r"^your personal year",
    r"^your destiny number",
    r"^your soul urge",
    r"^your pinnacle",
    r"^your numerology",
    r"^numerology (shows|suggests|indicates|reveals|points)",
    r"^astrology (shows|suggests|indicates|reveals|points)",
    r"^the numerology",
    r"^the astrology",
    r"^the palm (shows|reveals|indicates)",
    r"^palm reading",
    r"^the face (shows|reveals|indicates)",
    r"^facial analysis",
    r"^with (your|a) (sun|moon|mars|venus|jupiter|saturn|mercury) in",
    r"^your (sun|moon|mars|venus|jupiter|saturn|mercury) (is|in|placement)",
    r"^[a-z]+ (is a|is an) \d",
    r"^the synthesis (shows|reveals|indicates)",
    r"^this reading (shows|reveals|tells|indicates)",
]
_WEAK_OPENING_RE = re.compile("|".join(_WEAK_OPENING_PATTERNS), re.IGNORECASE)


def _check_opening_sentence(text: str) -> bool:
    """Return True if the opening sentence is strong (significance-first)."""
    first_sentence = text.split(".")[0].strip()
    return not bool(_WEAK_OPENING_RE.match(first_sentence))


def _build_document_frame(
    person_name:   str,
    tool_type:     str,
    partner_name:  Optional[str],
    section_texts: Dict[str, str],
    model:         str,
    global_context:str,
) -> Tuple[str, str, int]:
    """Generate a document-level opening paragraph and closing paragraph."""
    tokens_total = 0
    section_summary = "; ".join(
        f"{k.replace('_', ' ')}" for k in list(section_texts.keys())[:8] if section_texts.get(k)
    )

    if tool_type == "union_blueprint" and partner_name:
        subjects = f"{person_name} and {partner_name}"
        reading_type = "Union Blueprint"
    else:
        subjects = person_name
        reading_type = "Individual Life Blueprint"

    opening_prompt = (
        f"Write a single opening paragraph (3–4 sentences) for {subjects}'s KAYAL {reading_type}.\n\n"
        f"This paragraph precedes all domain sections. Its purpose is SIGNIFICANCE:\n"
        f"Why does having a complete multi-system synthesis matter? "
        f"What does a person carry differently in their life when they have an accurate map?\n\n"
        f"The reading covers: {section_summary}.\n\n"
        f"Rules:\n"
        f"- Do NOT summarise what follows. Do NOT list the sections.\n"
        f"- Establish WHY this reading exists — the problem it solves.\n"
        f"- Address {person_name} directly. Warm, grounded, specific.\n"
        f"- The last sentence should create forward pull into the reading.\n"
        f"Never use em-dashes (—). Use commas (,) instead.\n"
        f"Write the opening paragraph now. Nothing else."
    )

    try:
        open_resp = _call_deepseek(
            messages=[{"role": "user", "content": opening_prompt}],
            system=global_context,
            max_tokens=200,
        )
        opening_paragraph = _extract_text(open_resp).strip()
        tokens_total += _token_count(open_resp)
    except Exception as e:
        logger.warning(f"Document opening paragraph failed: {e}")
        opening_paragraph = ""

    closing_prompt = (
        f"Write a single closing paragraph (3–4 sentences) for {subjects}'s KAYAL {reading_type}.\n\n"
        f"This paragraph follows all domain sections. Its purpose is IMPACT:\n"
        f"Not a summary. A send-off. The last thing {person_name} reads should land.\n\n"
        f"The reading covered: {section_summary}.\n\n"
        f"Rules:\n"
        f"- Do NOT summarise. Do NOT repeat insights already given.\n"
        f"- Address what {person_name} now carries that they didn't have before.\n"
        f"- The question the reading answers is: 'What do I do with this?'\n"
        f"- End with a single sentence that feels like a door opening, not a door closing.\n"
        f"Never use em-dashes (—). Use commas (,) instead.\n"
        f"Write the closing paragraph now. Nothing else."
    )

    try:
        close_resp = _call_deepseek(
            messages=[{"role": "user", "content": closing_prompt}],
            system=global_context,
            max_tokens=200,
        )
        closing_paragraph = _extract_text(close_resp).strip()
        tokens_total += _token_count(close_resp)
    except Exception as e:
        logger.warning(f"Document closing paragraph failed: {e}")
        closing_paragraph = ""

    return opening_paragraph, closing_paragraph, tokens_total


# ---------------------------------------------------------------------------
# v2.0.0 — Section-level LLM caller (enhanced in v3.0.0)
# ---------------------------------------------------------------------------

def _narrate_section(
    section:        "SectionPrompt",
    global_context: str,
    model:          str,
    compat_pcts:    Optional[Dict[str, float]] = None,
) -> Tuple[str, int, bool]:
    """Call DeepSeek for a single SectionPrompt."""
    full_system = global_context + "\n\n" + section.system_prompt
    messages    = [{"role": "user", "content": section.user_prompt}]

    response = _call_deepseek(
        messages=messages,
        system=full_system,
        max_tokens=section.max_tokens,
    )
    text   = _extract_text(response)
    tokens = _token_count(response)

    if not _check_opening_sentence(text):
        logger.info(
            "Weak opening sentence detected — retrying with framing instruction",
            extra={"section_id": section.section_id, "opening": text[:80]},
        )
        retry_user_prompt = (
            section.user_prompt
            + "\n\nCRITICAL: Your previous opening was too weak — it led with a system name, "
            "a number label, or a methodology reference before establishing why this dimension "
            "of life matters to this specific person. "
            "Rewrite. Open with the SIGNIFICANCE: the cost, the problem, or the question "
            "that makes this section urgent. The reader must feel 'this is about me' "
            "before they encounter any specific data. "
            "Do not begin with the person's name, any system label (Life Path, Personal Year, "
            "Sun sign, Pinnacle, Destiny number, Saturn return), any number, or any phrase "
            "that names the method rather than what it reveals. "
            "Open with the lived reality — the thing the person recognises before you explain "
            "anything about how you know it. "
            "Never use em-dashes (—). Use commas (,) instead."
        )
        try:
            retry_resp = _call_deepseek(
                messages=[{"role": "user", "content": retry_user_prompt}],
                system=full_system,
                max_tokens=section.max_tokens,
            )
            retry_text = _extract_text(retry_resp)
            tokens += _token_count(retry_resp)
            if retry_text and len(retry_text) > 50:
                text = retry_text
        except Exception as e:
            logger.warning(f"Opening sentence retry failed [{section.section_id}]: {e}")

    pct_injected = False
    if section.is_pct_section and section.pct_label:
        pct_value = 50.0
        if compat_pcts and section.domain in compat_pcts:
            pct_value = compat_pcts[section.domain]
        elif compat_pcts and "overall" in compat_pcts and section.section_id == "union_overview":
            pct_value = compat_pcts["overall"]
        is_valid, _ = _validate_pct_output(text, section.pct_label)
        if not is_valid:
            text, pct_injected = _inject_pct_if_missing(text, section.pct_label, pct_value)

    # Final safety net — strip methodology labels and clean em-dashes
    text = _strip_methodology_labels(text)

    return text, tokens, pct_injected


async def _narrate_section_async(
    section:        "SectionPrompt",
    global_context: str,
    model:          str,
    compat_pcts:    Optional[Dict[str, float]] = None,
) -> Tuple[str, int, bool]:
    """Async version of _narrate_section()."""
    full_system = global_context + "\n\n" + section.system_prompt
    messages = [{"role": "user", "content": section.user_prompt}]
    response = await _call_deepseek_async(
        messages=messages,
        system=full_system,
        max_tokens=section.max_tokens,
    )
    text   = _extract_text(response)
    tokens = _token_count(response)

    if not _check_opening_sentence(text):
        logger.info(
            "Weak opening sentence detected — retrying with framing instruction",
            extra={"section_id": section.section_id, "opening": text[:80]},
        )
        retry_user_prompt = (
            section.user_prompt
            + "\n\nCRITICAL: Your previous opening was too weak — it led with a system name, "
            "a number label, or a methodology reference before establishing why this dimension "
            "of life matters to this specific person. "
            "Rewrite. Open with the SIGNIFICANCE: the cost, the problem, or the question "
            "that makes this section urgent. The reader must feel 'this is about me' "
            "before they encounter any specific data. "
            "Do not begin with the person's name, any system label (Life Path, Personal Year, "
            "Sun sign, Pinnacle, Destiny number, Saturn return), any number, or any phrase "
            "that names the method rather than what it reveals. "
            "Open with the lived reality — the thing the person recognises before you explain "
            "anything about how you know it. "
            "Never use em-dashes (—). Use commas (,) instead."
        )
        try:
            retry_resp = await _call_deepseek_async(
                messages=[{"role": "user", "content": retry_user_prompt}],
                system=full_system,
                max_tokens=section.max_tokens,
            )
            retry_text = _extract_text(retry_resp)
            tokens += _token_count(retry_resp)
            if retry_text and len(retry_text) > 50:
                text = retry_text
        except Exception as e:
            logger.warning(f"Opening sentence retry failed [{section.section_id}]: {e}")

    pct_injected = False
    if section.is_pct_section and section.pct_label:
        pct_value = 50.0
        if compat_pcts and section.domain in compat_pcts:
            pct_value = compat_pcts[section.domain]
        elif compat_pcts and "overall" in compat_pcts and section.section_id == "union_overview":
            pct_value = compat_pcts["overall"]
        is_valid, _ = _validate_pct_output(text, section.pct_label)
        if not is_valid:
            text, pct_injected = _inject_pct_if_missing(text, section.pct_label, pct_value)

    # Final safety net — strip methodology labels and clean em-dashes
    text = _strip_methodology_labels(text)

    return text, tokens, pct_injected


def _assemble_full_text(
    sections:          List["SectionPrompt"],
    section_texts:     Dict[str, str],
    tool_type:         str,
    opening_paragraph: str = "",
    closing_paragraph: str = "",
) -> str:
    """Assemble all section texts into the final reading document."""
    ordered_sections = sorted(
        sections,
        key=lambda s: _NARRATIVE_ORDER.get(s.section_id, 50),
    )

    parts = []

    if opening_paragraph:
        parts.append(opening_paragraph)

    for section in ordered_sections:
        text = section_texts.get(section.section_id, "")
        if not text:
            continue
        if tool_type == "union_blueprint":
            parts.append(f"### {section.section_title}\n\n{text}")
        else:
            parts.append(text)

    if closing_paragraph:
        parts.append(closing_paragraph)

    return _clean_output_text("\n\n".join(parts))


# ---------------------------------------------------------------------------
# v2.0.0 — Primary new entry point: narrate_from_package()
# ---------------------------------------------------------------------------

def narrate_from_package(
    pkg:      "PromptPackage",
    use_opus: bool = False,
    fallback: bool = True,
) -> NarrationResult:
    """Narrate a complete Blueprint from a PromptPackage."""
    t0 = time.monotonic()

    model = _MODEL_DEEPSEEK  # Always use DeepSeek-V4

    compat_pcts    = pkg.compatibility_percentages
    global_context = pkg.system_context

    section_texts: Dict[str, str] = {}
    tokens_total:  int  = 0
    any_injected:  bool = False
    error:         Optional[str] = None
    fallback_used: bool = False

    sorted_sections = sorted(
        pkg.sections,
        key=lambda s: _NARRATIVE_ORDER.get(s.section_id, 50),
    )
    required_sections = [s for s in sorted_sections if s.required]
    optional_sections = [s for s in sorted_sections if not s.required]
    all_sections      = required_sections + optional_sections

    for section in all_sections:
        try:
            text, tokens, injected = _narrate_section(
                section, global_context, model, compat_pcts
            )
            section_texts[section.section_id] = text
            tokens_total += tokens
            if injected:
                any_injected = True

        except Exception as e:
            logger.error(f"Section narration failed [{section.section_id}]: {e}")
            if section.required and fallback:
                # Fallback to same model with retry
                fallback_used = True
                try:
                    text, tokens, injected = _narrate_section(
                        section, global_context, model, compat_pcts
                    )
                    section_texts[section.section_id] = text
                    tokens_total += tokens
                    if injected:
                        any_injected = True
                except Exception as e2:
                    section_texts[section.section_id] = (
                        f"[Section temporarily unavailable: {section.section_title}]"
                    )
                    error = str(e2)
            elif not section.required:
                section_texts[section.section_id] = ""
            else:
                section_texts[section.section_id] = (
                    f"[Section temporarily unavailable: {section.section_title}]"
                )
                error = str(e)

    opening_paragraph = ""
    closing_paragraph = ""
    try:
        opening_paragraph, closing_paragraph, frame_tokens = _build_document_frame(
            person_name    = pkg.person_name,
            tool_type      = pkg.tool_type,
            partner_name   = pkg.partner_name,
            section_texts  = section_texts,
            model          = model,
            global_context = global_context,
        )
        tokens_total += frame_tokens
    except Exception as e:
        logger.warning(f"Document frame generation failed: {e}")

    full_text  = _assemble_full_text(
        pkg.sections, section_texts, pkg.tool_type,
        opening_paragraph, closing_paragraph,
    )
    word_count    = len(full_text.split())
    pct_validated = not any_injected
    processing_ms = int((time.monotonic() - t0) * 1000)

    logger.info(
        "Narrator.narrate_from_package completed",
        extra={
            "session_id":        pkg.session_id,
            "tool_type":         pkg.tool_type,
            "model":             model,
            "sections_total":    len(all_sections),
            "sections_narrated": sum(1 for t in section_texts.values() if t and not t.startswith("[")),
            "pct_sections":      sum(1 for s in pkg.sections if s.is_pct_section),
            "pct_validated":     pct_validated,
            "any_injected":      any_injected,
            "has_frame":         bool(opening_paragraph),
            "words":             word_count,
            "tokens":            tokens_total,
            "fallback_used":     fallback_used,
            "ms":                processing_ms,
        },
    )

    return NarrationResult(
        session_id                = pkg.session_id,
        model_used                = model,
        tier                      = pkg.tier,
        full_text                 = full_text,
        domain_sections           = {k: v for k, v in section_texts.items()},
        word_count                = word_count,
        tokens_used               = tokens_total,
        processing_ms             = processing_ms,
        fallback_used             = fallback_used,
        error                     = error,
        tool_type                 = pkg.tool_type,
        section_texts             = section_texts,
        compatibility_percentages = compat_pcts,
        pct_validated             = pct_validated,
        opening_paragraph         = opening_paragraph,
        closing_paragraph         = closing_paragraph,
    )


async def narrate_from_package_async(
    pkg:      "PromptPackage",
    use_opus: bool = False,
    fallback: bool = True,
) -> NarrationResult:
    """Async version of narrate_from_package()."""
    import asyncio
    t0 = time.monotonic()

    model = _MODEL_DEEPSEEK  # Always use DeepSeek-V4

    compat_pcts = pkg.compatibility_percentages
    global_context = pkg.system_context

    section_texts: Dict[str, str] = {}
    tokens_total  = 0
    any_injected  = False
    error: Optional[str] = None

    required_sections = [s for s in pkg.sections if s.required]
    optional_sections = [s for s in pkg.sections if not s.required]

    for section in required_sections:
        try:
            text, tokens, injected = await _narrate_section_async(
                section, global_context, model, compat_pcts
            )
            section_texts[section.section_id] = text
            tokens_total += tokens
            if injected: any_injected = True
        except Exception as e:
            logger.error(f"Async section failed [{section.section_id}]: {e}")
            section_texts[section.section_id] = f"[Section unavailable: {section.section_title}]"
            error = str(e)

    async def _opt_section(section):
        try:
            return section.section_id, await _narrate_section_async(
                section, global_context, model, compat_pcts
            )
        except Exception as e:
            return section.section_id, ("", 0, False)

    if optional_sections:
        opt_results = await asyncio.gather(*[_opt_section(s) for s in optional_sections])
        for sid, (text, tokens, injected) in opt_results:
            section_texts[sid] = text
            tokens_total += tokens
            if injected: any_injected = True

    opening_paragraph = ""
    closing_paragraph = ""
    try:
        opening_paragraph, closing_paragraph, frame_tokens = _build_document_frame(
            person_name    = pkg.person_name,
            tool_type      = pkg.tool_type,
            partner_name   = pkg.partner_name,
            section_texts  = section_texts,
            model          = model,
            global_context = global_context,
        )
        tokens_total += frame_tokens
    except Exception as e:
        logger.warning(f"Document frame generation failed: {e}")

    full_text  = _assemble_full_text(
        pkg.sections, section_texts, pkg.tool_type,
        opening_paragraph, closing_paragraph,
    )
    word_count = len(full_text.split())
    pct_validated = not any_injected
    processing_ms = int((time.monotonic() - t0) * 1000)

    logger.info("Narrator.narrate_from_package_async completed", extra={
        "session_id": pkg.session_id, "tool_type": pkg.tool_type,
        "model": model, "words": word_count, "tokens": tokens_total,
        "pct_validated": pct_validated, "ms": processing_ms,
    })

    return NarrationResult(
        session_id=pkg.session_id, model_used=model, tier=pkg.tier,
        full_text=full_text, domain_sections=section_texts, word_count=word_count,
        tokens_used=tokens_total, processing_ms=processing_ms,
        fallback_used=False, error=error,
        tool_type=pkg.tool_type, section_texts=section_texts,
        compatibility_percentages=compat_pcts, pct_validated=pct_validated,
        opening_paragraph=opening_paragraph,
        closing_paragraph=closing_paragraph,
    )


# ---------------------------------------------------------------------------
# Legacy narrate() — v1.0.0, preserved for backward compatibility
# ---------------------------------------------------------------------------

def narrate(
    llm_payload:   Dict,
    use_opus:      bool = False,
    fallback:      bool = True,
) -> NarrationResult:
    """Legacy narrate() — now uses DeepSeek."""
    t0         = time.monotonic()
    session_id = llm_payload.get("session_id", "unknown")
    tier       = llm_payload.get("tier_description", "")
    tier_key   = _extract_tier_key(llm_payload)
    primary_model = _MODEL_DEEPSEEK

    name           = llm_payload.get("user_name", "you")
    cultural_ctx   = llm_payload.get("cultural_context", "")
    narration_tone = llm_payload.get("narration_tone", "warm and direct")
    word_target    = llm_payload.get("word_count_target", 2000)
    domains        = llm_payload.get("domains", [])
    timing_summary = llm_payload.get("timing_summary", "")
    journey        = llm_payload.get("journey_narrative", "")
    overall_theme  = llm_payload.get("overall_theme", "")

    system = _system_prompt(cultural_ctx, narration_tone)
    max_tokens = _word_to_tokens(word_target)

    karmic_preamble = ""
    if llm_payload.get("has_karmic_debts") and llm_payload.get("karmic_debt_summary"):
        karmic_preamble = f"\nKARMIC CONTEXT (weave this into spiritual/character sections naturally):\n{llm_payload['karmic_debt_summary']}\n"
    pinnacle_preamble = ""
    if llm_payload.get("pinnacle_summary"):
        pinnacle_preamble = f"\nLIFE CYCLE CONTEXT:\n{llm_payload['pinnacle_summary']}\n"

    fallback_used = False; full_text = ""; domain_sections: Dict[str, str] = {}
    tokens_used = 0; error = None

    try:
        user_prompt = (
            karmic_preamble + pinnacle_preamble +
            _domain_prompt_sonnet(domains, timing_summary, journey, overall_theme, name, word_target)
        )
        response = _call_deepseek(
            messages=[{"role": "user", "content": user_prompt}],
            system=system,
            max_tokens=max_tokens,
        )
        full_text = _extract_text(response)
        tokens_used = _token_count(response)
        domain_sections = _split_into_sections(full_text, domains)

    except Exception as e:
        error = str(e)
        logger.error(f"NarrationError primary model ({primary_model}): {e}")
        if fallback:
            fallback_used = True
            try:
                fp = _condensed_fallback_prompt(llm_payload)
                r = _call_deepseek(
                    messages=[{"role": "user", "content": fp}],
                    system=system,
                    max_tokens=1200,
                )
                full_text = _extract_text(r)
                tokens_used = _token_count(r)
                error = None
            except Exception as e2:
                error = f"Primary: {error} | Fallback: {str(e2)}"
                full_text = _emergency_fallback(llm_payload)

    word_count = len(full_text.split()); processing_ms = int((time.monotonic() - t0) * 1000)
    logger.info("Narrator.narrate completed", extra={
        "session_id": session_id, "model": primary_model, "tier": tier_key,
        "words": word_count, "tokens": tokens_used, "fallback": fallback_used, "ms": processing_ms,
    })
    return NarrationResult(
        session_id=session_id, model_used=primary_model,
        tier=tier_key, full_text=full_text, domain_sections=domain_sections,
        word_count=word_count, tokens_used=tokens_used, processing_ms=processing_ms,
        fallback_used=fallback_used, error=error, tool_type="individual_blueprint",
    )


async def narrate_async(
    llm_payload: Dict,
    use_opus:    bool = False,
    fallback:    bool = True,
) -> NarrationResult:
    """Async legacy narrate() — now uses DeepSeek."""
    t0            = time.monotonic()
    session_id    = llm_payload.get("session_id", "unknown")
    tier_key      = _extract_tier_key(llm_payload)
    primary_model = _MODEL_DEEPSEEK

    name           = llm_payload.get("user_name", "you")
    cultural_ctx   = llm_payload.get("cultural_context", "")
    narration_tone = llm_payload.get("narration_tone", "warm and direct")
    word_target    = llm_payload.get("word_count_target", 2000)
    domains        = llm_payload.get("domains", [])
    timing_summary = llm_payload.get("timing_summary", "")
    journey        = llm_payload.get("journey_narrative", "")
    overall_theme  = llm_payload.get("overall_theme", "")

    system    = _system_prompt(cultural_ctx, narration_tone)
    max_tokens = _word_to_tokens(word_target)
    karmic_preamble   = f"\nKARMIC CONTEXT:\n{llm_payload['karmic_debt_summary']}\n" if llm_payload.get("has_karmic_debts") else ""
    pinnacle_preamble = f"\nLIFE CYCLE:\n{llm_payload['pinnacle_summary']}\n"         if llm_payload.get("pinnacle_summary") else ""

    fallback_used = False; full_text = ""; domain_sections: Dict[str, str] = {}
    tokens_used = 0; error = None

    try:
        user_prompt = karmic_preamble + pinnacle_preamble + _domain_prompt_sonnet(domains, timing_summary, journey, overall_theme, name, word_target)
        response = await _call_deepseek_async(
            messages=[{"role": "user", "content": user_prompt}],
            system=system,
            max_tokens=max_tokens,
        )
        full_text = _extract_text(response)
        tokens_used = _token_count(response)
        domain_sections = _split_into_sections(full_text, domains)

    except Exception as e:
        error = str(e); logger.error(f"Async narration error ({primary_model}): {e}")
        if fallback:
            fallback_used = True
            try:
                r = await _call_deepseek_async(
                    messages=[{"role": "user", "content": _condensed_fallback_prompt(llm_payload)}],
                    system=system,
                    max_tokens=1200,
                )
                full_text = _extract_text(r)
                tokens_used = _token_count(r)
                error = None
            except Exception as e2:
                full_text = _emergency_fallback(llm_payload)
                error = f"Primary: {error} | Fallback: {str(e2)}"

    return NarrationResult(
        session_id=session_id, model_used=primary_model,
        tier=tier_key, full_text=full_text, domain_sections=domain_sections,
        word_count=len(full_text.split()), tokens_used=tokens_used,
        processing_ms=int((time.monotonic() - t0) * 1000), fallback_used=fallback_used, error=error,
        tool_type="individual_blueprint",
    )


# ---------------------------------------------------------------------------
# Utility helpers (v1.0.0, preserved intact)
# ---------------------------------------------------------------------------

def _extract_tier_key(payload: Dict) -> str:
    desc = payload.get("tier_description", "").lower()
    if "complete four" in desc or "tier_4" in desc or "four-system" in desc: return "tier_4_full"
    elif "face and palm" in desc or "tier_3b" in desc: return "tier_3b_face_palm"
    elif "both palms" in desc or "tier_3_palm" in desc: return "tier_3_palm"
    elif "core with face" in desc or "tier_2_face" in desc: return "tier_2_face"
    elif "core with palm" in desc or "tier_2b" in desc: return "tier_2b_palm_only"
    return "tier_1_core"


def _split_into_sections(full_text: str, domains: List[Dict]) -> Dict[str, str]:
    sections: Dict[str, str] = {}
    paragraphs = [p.strip() for p in full_text.split("\n\n") if p.strip()]
    for i, domain in enumerate(domains):
        sections[domain["domain"]] = paragraphs[i] if i < len(paragraphs) else ""
    return sections


def _condensed_fallback_prompt(payload: Dict) -> str:
    name    = payload.get("user_name", "you")
    domains = payload.get("domains", [])
    summaries = [f"{d['domain'].replace('_', ' ').title()}: {d['primary_reading'][:100]}" for d in domains[:5]]
    return (
        f"Write a warm, brief personal reading for {name} covering: " + " | ".join(summaries) +
        f"\nTiming: {payload.get('timing_summary', '')} \nOverall: {payload.get('overall_theme', '')} "
        "\n300-400 words. Second person. No system names. Warm and empowering. "
        "Never use em-dashes (—). Use commas (,) instead."
    )


def _emergency_fallback(payload: Dict) -> str:
    name  = payload.get("user_name", "you")
    theme = payload.get("overall_theme", "")
    return (
        f"Dear {name},\n\n{theme}\n\n"
        "Your complete reading has been prepared. "
        "Please try again in a moment to receive the full narration."
    )