import os
from datetime import datetime, timezone
import uuid

import stripe
from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, get_current_user, get_supabase
from ..models.misc import Invoice, InvoiceCreate

router = APIRouter(tags=["billing"])

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]


@router.get("/invoices", response_model=dict)
def list_invoices(user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    # Invoices are scoped through the client relationship, not a direct consultant_id column here —
    # adjust if your schema stores consultant_id directly on invoices.
    client_ids = [
        c["id"] for c in sb.table("clients").select("id").eq("consultant_id", user.id).execute().data
    ]
    if not client_ids:
        return {"data": []}
    result = sb.table("invoices").select("*").in_("client_id", client_ids).order("created_at", desc=True).execute()
    return {"data": result.data}


@router.post("/invoices", response_model=Invoice)
def create_invoice(payload: InvoiceCreate, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    _assert_owns_client(sb, payload.client_id, user.id)

    tax_rate = 0  # TODO: pull real tax rate from your settings if applicable
    tax_amount = round(payload.amount * tax_rate / 100, 2)

    row = {
        "id": str(uuid.uuid4()),
        "client_id": payload.client_id,
        "invoice_number": f"INV-{uuid.uuid4().hex[:8].upper()}",
        "amount": payload.amount,
        "description": payload.description,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total_amount": payload.amount + tax_amount,
        "currency": "usd",
        "status": "pending",
        "due_date": payload.due_date.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = sb.table("invoices").insert(row).execute()
    return result.data[0]


@router.get("/invoices/{invoice_id}", response_model=Invoice)
def get_invoice(invoice_id: str, user: CurrentUser = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("invoices").select("*").eq("id", invoice_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Invoice not found")
    _assert_owns_client(sb, result.data["client_id"], user.id)
    return result.data


@router.post("/invoices/{invoice_id}/pay")
def pay_invoice(invoice_id: str, user: CurrentUser = Depends(get_current_user)):
    invoice = get_invoice(invoice_id, user)
    sb = get_supabase()

    intent = stripe.PaymentIntent.create(
        amount=int(invoice["total_amount"] * 100),  # Stripe expects cents
        currency=invoice["currency"],
        metadata={"invoice_id": invoice_id},
    )

    sb.table("invoices").update({"stripe_payment_id": intent.id}).eq("id", invoice_id).execute()

    # Full payment confirmation should happen via a Stripe webhook (payment_intent.succeeded),
    # not here — this endpoint just creates the intent for the frontend to confirm with Stripe.js.
    return {"client_secret": intent.client_secret}


def _assert_owns_client(sb, client_id: str, consultant_id: str) -> None:
    result = (
        sb.table("clients")
        .select("id")
        .eq("id", client_id)
        .eq("consultant_id", consultant_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Client not found")
