import uuid
import enum

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class PaymentType(str, enum.Enum):
    one_time = "one_time"
    subscription = "subscription"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    canceled = "canceled"
    past_due = "past_due"
    expired = "expired"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id"), nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True, index=True)
    stripe_subscription_id = Column(String, nullable=True, index=True)
    amount = Column(Numeric(10, 4), nullable=False)
    platform_fee = Column(Numeric(10, 4), nullable=False)
    developer_payout = Column(Numeric(10, 4), nullable=False)
    currency = Column(String, nullable=False, default="usd")
    status = Column(
        SAEnum(TransactionStatus), nullable=False, default=TransactionStatus.pending
    )
    payment_type = Column(
        SAEnum(PaymentType), nullable=False, default=PaymentType.one_time
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
    agent = relationship("Agent", back_populates="transactions")
    execution = relationship("Execution", back_populates="transaction")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False)
    stripe_subscription_id = Column(String, nullable=False, unique=True, index=True)
    stripe_customer_id = Column(String, nullable=False)
    status = Column(
        SAEnum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.active
    )
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="subscriptions")
    agent = relationship("Agent", back_populates="subscriptions")
