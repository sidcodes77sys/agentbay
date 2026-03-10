"""Billing router — Stripe integration for per-use and subscription payments."""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.agent import Agent, PricingType
from app.models.billing import (
    PaymentType,
    Subscription,
    SubscriptionStatus,
    Transaction,
    TransactionStatus,
)
from app.models.execution import Execution
from app.models.user import User
from app.schemas.billing import (
    CancelSubscriptionResponse,
    CreatePaymentIntentRequest,
    CreatePaymentIntentResponse,
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
    DeveloperEarnings,
    SubscriptionList,
    SubscriptionRead,
    TransactionList,
    TransactionRead,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Configure Stripe with the secret key (may be empty in test environments)
stripe.api_key = settings.stripe_secret_key


def _get_or_create_stripe_customer(user: User, db: Session) -> str:
    """Return existing Stripe customer ID or create a new one."""
    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer = stripe.Customer.create(
        email=user.email,
        name=user.display_name or user.username,
        metadata={"user_id": str(user.id)},
    )
    user.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def _compute_fees(amount: Decimal) -> tuple[Decimal, Decimal]:
    """Return (platform_fee, developer_payout) for a given amount."""
    fee_percent = Decimal(str(settings.platform_fee_percent)) / Decimal("100")
    platform_fee = (amount * fee_percent).quantize(Decimal("0.0001"))
    developer_payout = (amount - platform_fee).quantize(Decimal("0.0001"))
    return platform_fee, developer_payout


# ---------------------------------------------------------------------------
# POST /api/billing/create-payment-intent
# ---------------------------------------------------------------------------


@router.post(
    "/create-payment-intent",
    response_model=CreatePaymentIntentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_intent(
    body: CreatePaymentIntentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe PaymentIntent for a per-use agent execution."""
    agent: Optional[Agent] = (
        db.query(Agent)
        .filter(Agent.id == body.agent_id, Agent.is_published == True)  # noqa: E712
        .first()
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent.pricing_type != PricingType.per_use:
        raise HTTPException(
            status_code=400,
            detail="Agent is not a per-use priced agent",
        )

    price = agent.price_per_use
    if not price or price <= 0:
        raise HTTPException(status_code=400, detail="Agent has no valid price")

    amount_decimal = Decimal(str(price))
    # Stripe amounts are in cents (smallest currency unit)
    amount_cents = int((amount_decimal * 100).to_integral_value())

    platform_fee, developer_payout = _compute_fees(amount_decimal)

    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured on this server",
        )

    customer_id = _get_or_create_stripe_customer(current_user, db)

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        customer=customer_id,
        metadata={
            "agent_id": str(agent.id),
            "user_id": str(current_user.id),
        },
        automatic_payment_methods={"enabled": True},
    )

    # Persist a pending transaction
    transaction = Transaction(
        user_id=current_user.id,
        agent_id=agent.id,
        stripe_payment_intent_id=intent.id,
        amount=amount_decimal,
        platform_fee=platform_fee,
        developer_payout=developer_payout,
        currency="usd",
        status=TransactionStatus.pending,
        payment_type=PaymentType.one_time,
    )
    db.add(transaction)
    db.commit()

    return CreatePaymentIntentResponse(
        client_secret=intent.client_secret,
        payment_intent_id=intent.id,
        amount=amount_decimal,
        currency="usd",
    )


# ---------------------------------------------------------------------------
# POST /api/billing/create-subscription
# ---------------------------------------------------------------------------


@router.post(
    "/create-subscription",
    response_model=CreateSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subscription(
    body: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Subscription for a subscription-based agent."""
    agent: Optional[Agent] = (
        db.query(Agent)
        .filter(Agent.id == body.agent_id, Agent.is_published == True)  # noqa: E712
        .first()
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent.pricing_type != PricingType.subscription:
        raise HTTPException(
            status_code=400,
            detail="Agent is not a subscription-priced agent",
        )

    price = agent.monthly_price
    if not price or price <= 0:
        raise HTTPException(status_code=400, detail="Agent has no valid monthly price")

    # Check if user already has an active subscription
    existing = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.agent_id == agent.id,
            Subscription.status == SubscriptionStatus.active,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Active subscription already exists",
        )

    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Stripe is not configured on this server",
        )

    customer_id = _get_or_create_stripe_customer(current_user, db)

    # Create an ad-hoc price for the agent
    amount_cents = int((Decimal(str(price)) * 100).to_integral_value())
    stripe_price = stripe.Price.create(
        unit_amount=amount_cents,
        currency="usd",
        recurring={"interval": "month"},
        product_data={"name": agent.name},
    )

    sub = stripe.Subscription.create(
        customer=customer_id,
        items=[{"price": stripe_price.id}],
        payment_behavior="default_incomplete",
        expand=["latest_invoice.payment_intent"],
        metadata={
            "agent_id": str(agent.id),
            "user_id": str(current_user.id),
        },
    )

    client_secret = None
    if (
        sub.latest_invoice
        and sub.latest_invoice.payment_intent
    ):
        client_secret = sub.latest_invoice.payment_intent.client_secret

    # Persist subscription record
    subscription = Subscription(
        user_id=current_user.id,
        agent_id=agent.id,
        stripe_subscription_id=sub.id,
        stripe_customer_id=customer_id,
        status=SubscriptionStatus.active,
        current_period_start=datetime.fromtimestamp(
            sub.current_period_start, tz=timezone.utc
        ),
        current_period_end=datetime.fromtimestamp(
            sub.current_period_end, tz=timezone.utc
        ),
    )
    db.add(subscription)
    db.commit()

    return CreateSubscriptionResponse(
        subscription_id=sub.id,
        client_secret=client_secret,
        status=sub.status,
    )


# ---------------------------------------------------------------------------
# POST /api/billing/cancel-subscription/{subscription_id}
# ---------------------------------------------------------------------------


@router.post(
    "/cancel-subscription/{subscription_id}",
    response_model=CancelSubscriptionResponse,
)
def cancel_subscription(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a subscription owned by the current user."""
    sub: Optional[Subscription] = (
        db.query(Subscription)
        .filter(
            Subscription.id == subscription_id,
            Subscription.user_id == current_user.id,
        )
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.status == SubscriptionStatus.canceled:
        raise HTTPException(status_code=400, detail="Subscription already canceled")

    if settings.stripe_secret_key:
        try:
            stripe.Subscription.cancel(sub.stripe_subscription_id)
        except stripe.error.StripeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    sub.status = SubscriptionStatus.canceled
    db.commit()

    return CancelSubscriptionResponse(
        message="Subscription canceled successfully",
        subscription_id=str(sub.id),
        status=sub.status.value,
    )


# ---------------------------------------------------------------------------
# GET /api/billing/transactions
# ---------------------------------------------------------------------------


@router.get("/transactions", response_model=TransactionList)
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    page: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's transaction history (paginated)."""
    if page is not None:
        skip = (page - 1) * limit

    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    total = query.count()
    items = (
        query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
    )
    effective_page = page if page is not None else (skip // limit + 1)

    return TransactionList(
        items=[_enrich_transaction(t) for t in items],
        total=total,
        page=effective_page,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# GET /api/billing/subscriptions
# ---------------------------------------------------------------------------


@router.get("/subscriptions", response_model=SubscriptionList)
def list_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's active subscriptions."""
    items = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == current_user.id,
            Subscription.status == SubscriptionStatus.active,
        )
        .order_by(Subscription.created_at.desc())
        .all()
    )
    return SubscriptionList(
        items=[_enrich_subscription(s) for s in items],
        total=len(items),
    )


# ---------------------------------------------------------------------------
# GET /api/billing/developer/earnings
# ---------------------------------------------------------------------------


@router.get("/developer/earnings", response_model=DeveloperEarnings)
def developer_earnings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get developer earnings summary for the current user."""
    # Agents authored by this developer
    agent_ids = [
        a.id for a in db.query(Agent.id).filter(Agent.author_id == current_user.id).all()
    ]

    completed_txns = (
        db.query(Transaction)
        .filter(
            Transaction.agent_id.in_(agent_ids),
            Transaction.status == TransactionStatus.completed,
        )
        .all()
    )

    total_earned = sum(Decimal(str(t.developer_payout)) for t in completed_txns)

    # This month
    now = datetime.now(tz=timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month = sum(
        Decimal(str(t.developer_payout))
        for t in completed_txns
        if t.created_at and t.created_at >= month_start
    )

    # Pending
    pending_txns = (
        db.query(Transaction)
        .filter(
            Transaction.agent_id.in_(agent_ids),
            Transaction.status == TransactionStatus.pending,
        )
        .all()
    )
    pending_payout = sum(Decimal(str(t.developer_payout)) for t in pending_txns)

    # By agent
    by_agent: dict = {}
    for t in completed_txns:
        key = str(t.agent_id)
        if key not in by_agent:
            by_agent[key] = {
                "agent_id": key,
                "agent_name": t.agent.name if t.agent else key,
                "total": Decimal("0"),
            }
        by_agent[key]["total"] += Decimal(str(t.developer_payout))

    return DeveloperEarnings(
        total_earned=total_earned,
        this_month=this_month,
        pending_payout=pending_payout,
        by_agent=[
            {
                "agent_id": v["agent_id"],
                "agent_name": v["agent_name"],
                "total": float(v["total"]),
            }
            for v in by_agent.values()
        ],
    )


# ---------------------------------------------------------------------------
# GET /api/billing/developer/transactions
# ---------------------------------------------------------------------------


@router.get("/developer/transactions", response_model=TransactionList)
def developer_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    page: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get transactions for the developer's agents."""
    if page is not None:
        skip = (page - 1) * limit

    agent_ids = [
        a.id for a in db.query(Agent.id).filter(Agent.author_id == current_user.id).all()
    ]

    query = db.query(Transaction).filter(Transaction.agent_id.in_(agent_ids))
    total = query.count()
    items = (
        query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
    )
    effective_page = page if page is not None else (skip // limit + 1)

    return TransactionList(
        items=[_enrich_transaction(t) for t in items],
        total=total,
        page=effective_page,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# POST /api/billing/webhooks/stripe
# ---------------------------------------------------------------------------


@router.post("/webhooks/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    """Handle Stripe webhook events."""
    payload = await request.body()

    if settings.stripe_webhook_secret:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.stripe_webhook_secret
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        # Allow unsigned events in development/test
        import json

        try:
            event = stripe.Event.construct_from(
                json.loads(payload), stripe.api_key
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook payload")

    event_type = event["type"]

    if event_type == "payment_intent.succeeded":
        _handle_payment_intent_succeeded(event["data"]["object"], db)
    elif event_type == "payment_intent.payment_failed":
        _handle_payment_intent_failed(event["data"]["object"], db)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(event["data"]["object"], db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(event["data"]["object"], db)
    else:
        logger.debug("Unhandled Stripe event: %s", event_type)

    return {"received": True}


# ---------------------------------------------------------------------------
# Webhook helpers
# ---------------------------------------------------------------------------


def _handle_payment_intent_succeeded(pi: dict, db: Session) -> None:
    txn: Optional[Transaction] = (
        db.query(Transaction)
        .filter(Transaction.stripe_payment_intent_id == pi["id"])
        .first()
    )
    if txn:
        txn.status = TransactionStatus.completed
        db.commit()


def _handle_payment_intent_failed(pi: dict, db: Session) -> None:
    txn: Optional[Transaction] = (
        db.query(Transaction)
        .filter(Transaction.stripe_payment_intent_id == pi["id"])
        .first()
    )
    if txn:
        txn.status = TransactionStatus.failed
        db.commit()


def _handle_subscription_updated(sub_obj: dict, db: Session) -> None:
    sub: Optional[Subscription] = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == sub_obj["id"])
        .first()
    )
    if sub:
        status_map = {
            "active": SubscriptionStatus.active,
            "canceled": SubscriptionStatus.canceled,
            "past_due": SubscriptionStatus.past_due,
            "unpaid": SubscriptionStatus.past_due,
        }
        new_status = status_map.get(sub_obj["status"], SubscriptionStatus.active)
        sub.status = new_status
        if sub_obj.get("current_period_start"):
            sub.current_period_start = datetime.fromtimestamp(
                sub_obj["current_period_start"], tz=timezone.utc
            )
        if sub_obj.get("current_period_end"):
            sub.current_period_end = datetime.fromtimestamp(
                sub_obj["current_period_end"], tz=timezone.utc
            )
        db.commit()


def _handle_subscription_deleted(sub_obj: dict, db: Session) -> None:
    sub: Optional[Subscription] = (
        db.query(Subscription)
        .filter(Subscription.stripe_subscription_id == sub_obj["id"])
        .first()
    )
    if sub:
        sub.status = SubscriptionStatus.canceled
        db.commit()


# ---------------------------------------------------------------------------
# Enrichment helpers
# ---------------------------------------------------------------------------


def _enrich_transaction(t: Transaction) -> dict:
    return {
        "id": t.id,
        "user_id": t.user_id,
        "agent_id": t.agent_id,
        "execution_id": t.execution_id,
        "stripe_payment_intent_id": t.stripe_payment_intent_id,
        "stripe_subscription_id": t.stripe_subscription_id,
        "amount": t.amount,
        "platform_fee": t.platform_fee,
        "developer_payout": t.developer_payout,
        "currency": t.currency,
        "status": t.status,
        "payment_type": t.payment_type,
        "created_at": t.created_at,
        "agent_name": t.agent.name if t.agent else None,
    }


def _enrich_subscription(s: Subscription) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "agent_id": s.agent_id,
        "stripe_subscription_id": s.stripe_subscription_id,
        "stripe_customer_id": s.stripe_customer_id,
        "status": s.status,
        "current_period_start": s.current_period_start,
        "current_period_end": s.current_period_end,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
        "agent_name": s.agent.name if s.agent else None,
    }
