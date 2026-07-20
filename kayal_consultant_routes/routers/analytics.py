from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from ..deps import CurrentUser, get_current_user, get_supabase

router = APIRouter(tags=["analytics"])


@router.get("/analytics/dashboard")
def dashboard_metrics(user: CurrentUser = Depends(get_current_user)):
    """Shape expected by app/(dashboard)/page.tsx via useDashboardMetrics()."""
    sb = get_supabase()
    month_start = datetime.now(timezone.utc).replace(day=1).isoformat()
    now = datetime.now(timezone.utc).isoformat()

    active_clients = (
        sb.table("clients")
        .select("id", count="exact")
        .eq("consultant_id", user.id)
        .eq("status", "active")
        .execute()
        .count
    )
    upcoming_sessions = (
        sb.table("consultant_sessions")
        .select("id", count="exact")
        .eq("consultant_id", user.id)
        .gte("session_date", now)
        .execute()
        .count
    )
    readings_this_month = (
        sb.table("readings")
        .select("id", count="exact")
        .gte("completed_at", month_start)
        .execute()
        .count
    )
    invoices_this_month = (
        sb.table("invoices")
        .select("total_amount")
        .eq("status", "paid")
        .gte("paid_at", month_start)
        .execute()
        .data
    )
    revenue_this_month = sum(i["total_amount"] for i in invoices_this_month)

    return {
        "active_clients": active_clients,
        "upcoming_sessions": upcoming_sessions,
        "readings_this_month": readings_this_month,
        "revenue_this_month": revenue_this_month,
        "revenue_trend": _revenue_trend(sb),
        "client_growth": _client_growth(sb, user.id),
    }


@router.get("/analytics/revenue")
def revenue_analytics(user: CurrentUser = Depends(get_current_user)):
    """Shape expected by app/(dashboard)/reports/page.tsx via api.getRevenueAnalytics()."""
    sb = get_supabase()
    trend = _revenue_trend(sb)
    return {"trend": trend, "total": sum(month["revenue"] for month in trend)}


@router.get("/analytics/clients")
def client_analytics(user: CurrentUser = Depends(get_current_user)):
    """Shape expected by app/(dashboard)/reports/page.tsx via api.getClientAnalytics()."""
    sb = get_supabase()
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    all_clients = sb.table("clients").select("status, created_at").eq("consultant_id", user.id).execute().data
    new_clients = sum(1 for c in all_clients if c["created_at"] >= thirty_days_ago)
    active_clients = sum(1 for c in all_clients if c["status"] == "active")
    churned_clients = sum(1 for c in all_clients if c["status"] == "archived")
    retention_rate = round(100 * active_clients / len(all_clients), 1) if all_clients else 0

    return {
        "new_clients": new_clients,
        "active_clients": active_clients,
        "churned_clients": churned_clients,
        "retention_rate": retention_rate,
    }


def _revenue_trend(sb, months: int = 6) -> list[dict]:
    """
    Last N months of paid invoice revenue, oldest first.
    TODO: replace with a real aggregation query (ideally a Postgres view/RPC — grouping by month
    in Python after fetching every invoice row won't scale). This just returns correct month labels
    with zeroed values so the frontend chart renders without erroring.
    """
    now = datetime.now(timezone.utc).replace(day=1)
    labels = []
    for i in range(months - 1, -1, -1):
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1
        labels.append(datetime(year, month, 1).strftime("%b"))
    return [{"month": label, "revenue": 0} for label in labels]


def _client_growth(sb, consultant_id: str, months: int = 6) -> list[dict]:
    """Same approach and same TODO as _revenue_trend above, for new-client counts instead of revenue."""
    now = datetime.now(timezone.utc).replace(day=1)
    labels = []
    for i in range(months - 1, -1, -1):
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1
        labels.append(datetime(year, month, 1).strftime("%b"))
    return [{"month": label, "clients": 0} for label in labels]
