"""Trusted device binding model."""

from __future__ import annotations

import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    LargeBinary,
    String,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from ..base import Base
from ..utils.enums import DeviceTrustLevel
from ..utils.types import GUID


def _now_ist() -> datetime:
    return datetime.now(ZoneInfo("Asia/Kolkata"))


class DeviceBinding(Base):
    """Represents a device that has been bound to a retail user."""

    __tablename__ = "device_bindings"
    __table_args__ = (
        UniqueConstraint("user_id", "device_identifier", name="uq_device_binding_user_device"),
        Index("ix_device_bindings_user_trust", "user_id", "trust_level"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_identifier = Column(String(128), nullable=False)
    fingerprint_hash = Column(String(256), nullable=False)
    voice_signature_hash = Column(String(256), nullable=True)
    voice_signature_vector = Column(LargeBinary, nullable=True)
    registration_method = Column(String(40), nullable=False, default="otp+voice")
    platform = Column(String(40), nullable=True)
    device_label = Column(String(120), nullable=True)
    trust_level = Column(
        Enum(DeviceTrustLevel, name="device_trust_level", native_enum=False),
        nullable=False,
        default=DeviceTrustLevel.TRUSTED,
    )
    last_verified_at = Column(DateTime(timezone=True), nullable=False, default=_now_ist)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="device_bindings")


__all__ = ["DeviceBinding"]

