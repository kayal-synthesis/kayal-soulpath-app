from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel

# Synastry ("Union Blueprint") request/response models now live inline in
# routers/synastry.py — this file no longer defines them. See models/reading.py
# for the real result shape (ReadingResult.compatibility_percentages / .union_remedies).

# ---------- Sessions ----------

SessionType = Literal["initial", "followup", "premium", "executive", "synastry", "emergency"]
SessionStatus = Literal["scheduled", "in_progress", "completed", "cancelled", "no_show"]


class SessionActionItem(BaseModel):
    title: str
    description: str = ""
    assigned_to: Literal["consultant", "client"]
    deadline: Optional[str] = None
    completed: bool = False


class Session(BaseModel):
    id: str
    client_id: str
    consultant_id: str
    session_type: SessionType
    session_date: datetime
    duration: int
    status: SessionStatus
    notes: str = ""
    insights: list[str] = []
    action_items: list[SessionActionItem] = []
    recording_url: Optional[str] = None
    transcription: Optional[str] = None
    invoice_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class SessionFormData(BaseModel):
    client_id: str
    session_type: SessionType
    session_date: datetime
    duration: int
    notes: Optional[str] = None


class SessionUpdate(BaseModel):
    status: Optional[SessionStatus] = None
    notes: Optional[str] = None
    action_items: Optional[list[SessionActionItem]] = None


# ---------- Billing ----------

InvoiceStatus = Literal["draft", "pending", "paid", "overdue", "cancelled"]


class Invoice(BaseModel):
    id: str
    client_id: str
    session_id: Optional[str] = None
    invoice_number: str
    amount: float
    description: str
    tax_rate: float = 0
    tax_amount: float = 0
    total_amount: float
    currency: str = "usd"
    status: InvoiceStatus
    due_date: datetime
    paid_at: Optional[datetime] = None
    stripe_payment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class InvoiceCreate(BaseModel):
    client_id: str
    amount: float
    description: str
    due_date: datetime


# ---------- Notifications ----------

class Notification(BaseModel):
    id: str
    recipient_id: str
    type: str
    title: str
    message: str
    link_url: Optional[str] = None
    read: bool = False
    created_at: datetime
