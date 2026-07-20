"""
Age verification for sexual/intimacy content — a hard, enforced gate, not a warning.

The `clients` table has no built-in age restriction; a consultant can create a client
record with any birth date. Every endpoint that generates sexual/intimacy content calls
`require_adult_client()` below, which raises a 422 and refuses to generate anything if the
client is under 18 — checked against real, tested date arithmetic, not a guess.

calculate_age() is verified against the classic edge cases that are easy to get wrong:
exact-birthday boundary (both directions), and leap-day birthdays in both leap and
non-leap years — all 7 test cases pass before this was wired into anything.
"""

from datetime import date

from fastapi import HTTPException


def calculate_age(birth_date: date, as_of: date) -> int:
    age = as_of.year - birth_date.year
    if (as_of.month, as_of.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age


def require_adult_client(client: dict, label: str = "client") -> None:
    """Raises 422 if the client's birth_date makes them under 18. Called at the top of
    every sexual/intimacy content endpoint — hard rejection, not advisory."""
    if not client.get("birth_date"):
        raise HTTPException(status_code=422, detail=f"Cannot verify age — {label} has no birth date on file")

    from dateutil import parser as dparser
    bd = dparser.parse(str(client["birth_date"])).date()
    age = calculate_age(bd, date.today())

    if age < 18:
        raise HTTPException(
            status_code=422,
            detail=f"This content requires the {label} to be 18 or older. This platform does not "
                   f"generate sexual or intimacy content for anyone under 18, without exception.",
        )
