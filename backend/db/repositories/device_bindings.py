"""Repository utilities for device bindings."""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import DeviceBinding
from ..utils.enums import DeviceTrustLevel

IST = ZoneInfo("Asia/Kolkata")


def create_device_binding(
    session: Session,
    *,
    user_id,
    device_identifier: str,
    fingerprint_hash: str,
    registration_method: str,
    platform: str | None = None,
    device_label: str | None = None,
    trust_level: DeviceTrustLevel = DeviceTrustLevel.TRUSTED,
    voice_signature_hash: str | None = None,
    voice_signature_vector: bytes | None = None,
) -> DeviceBinding:
    binding = DeviceBinding(
        user_id=user_id,
        device_identifier=device_identifier,
        fingerprint_hash=fingerprint_hash,
        registration_method=registration_method,
        platform=platform,
        device_label=device_label,
        trust_level=trust_level,
        voice_signature_hash=voice_signature_hash,
        voice_signature_vector=voice_signature_vector,
    )
    session.add(binding)
    return binding


def list_device_bindings(session: Session, *, user_id) -> Iterable[DeviceBinding]:
    stmt = (
        select(DeviceBinding)
        .where(DeviceBinding.user_id == user_id)
        .order_by(DeviceBinding.created_at.desc())
    )
    return session.scalars(stmt).all()


def get_device_binding_by_id(session: Session, binding_id) -> Optional[DeviceBinding]:
    return session.get(DeviceBinding, binding_id)


def get_device_binding_for_device(
    session: Session, *, user_id, device_identifier: str
) -> Optional[DeviceBinding]:
    stmt = select(DeviceBinding).where(
        DeviceBinding.user_id == user_id,
        DeviceBinding.device_identifier == device_identifier,
    )
    return session.scalars(stmt).first()


def mark_device_binding_trust(
    session: Session, *, binding: DeviceBinding, trust_level: DeviceTrustLevel
) -> DeviceBinding:
    binding.trust_level = trust_level
    if trust_level == DeviceTrustLevel.REVOKED:
        binding.revoked_at = datetime.now(IST)
    return binding


__all__ = [
    "create_device_binding",
    "list_device_bindings",
    "get_device_binding_by_id",
    "get_device_binding_for_device",
    "mark_device_binding_trust",
]

