"""
Standalone Palmistry reading — mirrors physiognomy.py exactly. Built on PalmEngine/
PalmReader, real and already-verified. When both palms are provided, uses
PalmEngine.extract_both() + palm_reader.py's read_both_palms() — a real, dedicated
dual-hand path that also produces a cross-hand comparison (which hand differs from the
other and how), not just two separate single-hand readings run side by side.

Stateless, same reasoning as physiognomy.py.
"""

from dataclasses import asdict

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..deps import CurrentUser, get_current_user, get_db_connection

router = APIRouter(tags=["palmistry"])


@router.post("/palmistry", response_model=dict)
async def generate_palmistry_reading(
    client_id: str = Form(...),
    left_palm_image: UploadFile | None = File(None),
    right_palm_image: UploadFile | None = File(None),
    dominant_hand: str | None = Form(None),
    user: CurrentUser = Depends(get_current_user),
):
    from synthesis.palm_engine import PalmEngine
    from synthesis.palm_reader import PalmReader, read_both_palms

    if not left_palm_image and not right_palm_image:
        raise HTTPException(status_code=422, detail="At least one palm photo is required")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM clients WHERE id = %s AND consultant_id = %s", (client_id, user.id))
        client = cur.fetchone()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
    finally:
        cur.close()
        conn.close()

    dominant_hand_norm = (dominant_hand or "right").strip().lower()
    other_hand = "left" if dominant_hand_norm == "right" else "right"

    left_bytes = await left_palm_image.read() if left_palm_image else None
    right_bytes = await right_palm_image.read() if right_palm_image else None

    pe = PalmEngine()

    try:
        if left_bytes and right_bytes:
            dom_bytes = right_bytes if dominant_hand_norm == "right" else left_bytes
            pas_bytes = left_bytes if dominant_hand_norm == "right" else right_bytes
            dual = pe.extract_both(
                dominant_bytes=dom_bytes, non_dominant_bytes=pas_bytes,
                dominant_label=dominant_hand_norm, non_dominant_label=other_hand,
            )
            if not dual.both_hands_valid:
                raise HTTPException(status_code=422, detail=f"Could not read one or both photos: {dual.partial_error}")

            dominant_reading, non_dominant_reading, cross_hand = read_both_palms(dual)
            result = {
                "mode": "dual",
                "dominant_hand": dominant_hand_norm,
                "dominant_reading": dominant_reading.to_dict(),
                "non_dominant_reading": non_dominant_reading.to_dict(),
                # CrossHandReading has no to_dict() of its own in palm_reader.py — confirmed
                # by grepping the file, only PalmReading defines one. asdict() is the
                # correct general-purpose way to serialize any dataclass, not a workaround.
                "cross_hand_reading": asdict(cross_hand),
            }
        else:
            single_bytes = right_bytes or left_bytes
            single_label = "right" if right_bytes else "left"
            features = pe.extract(single_bytes, hand_label=single_label)
            if features.error:
                raise HTTPException(status_code=422, detail=f"Could not read this photo: {features.error}")
            reading = PalmReader().read(features)
            result = {
                "mode": "single",
                "hand": single_label,
                "reading": reading.to_dict(),
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Palm analysis failed: {e}")

    return {"client_id": client_id, "client_name": client["name"], **result}
