from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.billing import PaymentType, SubscriptionStatus, TransactionStatus


class CreatePaymentIntentRequest(BaseModel):
    agent_id: UUID


class CreatePaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: Decimal
    currency: str


class CreateSubscriptionRequest(BaseModel):
    agent_id: UUID


class CreateSubscriptionResponse(BaseModel):
    subscription_id: str
    client_secret: Optional[str] = None
    status: str


class TransactionRead(BaseModel):
    id: UUID
    user_id: UUID
    agent_id: UUID
    execution_id: Optional[UUID] = None
    stripe_payment_intent_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    amount: Decimal
    platform_fee: Decimal
    developer_payout: Decimal
    currency: str
    status: TransactionStatus
    payment_type: PaymentType
    created_at: datetime
    agent_name: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionList(BaseModel):
    items: List[TransactionRead]
    total: int
    page: int
    limit: int


class SubscriptionRead(BaseModel):
    id: UUID
    user_id: UUID
    agent_id: UUID
    stripe_subscription_id: str
    stripe_customer_id: str
    status: SubscriptionStatus
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    agent_name: Optional[str] = None

    class Config:
        from_attributes = True


class SubscriptionList(BaseModel):
    items: List[SubscriptionRead]
    total: int


class DeveloperEarnings(BaseModel):
    total_earned: Decimal
    this_month: Decimal
    pending_payout: Decimal
    by_agent: List[dict]


class CancelSubscriptionResponse(BaseModel):
    message: str
    subscription_id: str
    status: str
