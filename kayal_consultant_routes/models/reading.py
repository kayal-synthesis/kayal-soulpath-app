"""
NOT used by readings.py or synastry.py anymore — kept only as a reference for the real
result shape, since it's useful documentation on its own.

readings.py and synastry.py now define their request/response models inline (they're
small enough not to need a separate file) and query the real `jobs` table directly via
psycopg2, not through Pydantic models matching a `reading_jobs` row shape — that table
turned out not to be part of the live pipeline. See synthesis_bridge.py and the README
for the full explanation.
"""

from typing import Optional
from pydantic import BaseModel


class ReadingResult(BaseModel):
    """The real shape written to jobs.result by process_reading_job() / process_consultant_reading_job()."""
    reading: str
    domain_sections: dict[str, str]
    life_path: Optional[int] = None
    personal_year: Optional[int] = None
    sun_sign: Optional[str] = None
    generated_at: str
    pipeline: Optional[str] = None
    # Union Blueprint only (process_consultant_union_job).
    compatibility_percentages: Optional[dict[str, float]] = None
    union_remedies: Optional[list[str]] = None
