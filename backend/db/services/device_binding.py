"""Device binding domain service."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

from ..engine import session_scope
from ..repositories import (
    create_device_binding,
    get_device_binding_by_id,
    get_device_binding_for_device,
    list_device_bindings,
    mark_device_binding_trust,
)
from ..utils.enums import DeviceTrustLevel

IST = ZoneInfo("Asia/Kolkata")


def _serialize_binding(binding) -> dict:
    return {
        "id": str(binding.id),
        "deviceIdentifier": binding.device_identifier,
        "registrationMethod": binding.registration_method,
        "platform": binding.platform,
        "deviceLabel": binding.device_label,
        "trustLevel": binding.trust_level.value,
        "voiceSignaturePresent": bool(
            binding.voice_signature_vector or binding.voice_signature_hash
        ),
        "lastVerifiedAt": binding.last_verified_at.isoformat() if binding.last_verified_at else None,
        "revokedAt": binding.revoked_at.isoformat() if binding.revoked_at else None,
        "createdAt": binding.created_at.isoformat() if binding.created_at else None,
        "updatedAt": binding.updated_at.isoformat() if binding.updated_at else None,
    }


class DeviceBindingService:
    """Encapsulates CRUD operations for trusted device bindings."""

    def __init__(self, session_factory):
        self._session_factory = session_factory

    def list_bindings(self, *, user_id) -> list[dict]:
        with session_scope(self._session_factory) as session:
            bindings = list_device_bindings(session, user_id=user_id)
            return [_serialize_binding(binding) for binding in bindings]

    def register_or_refresh_binding(
        self,
        *,
        user_id,
        device_identifier: str,
        fingerprint_hash: str,
        registration_method: str,
        platform: Optional[str] = None,
        device_label: Optional[str] = None,
        voice_signature_hash: Optional[str] = None,
        voice_signature_vector: Optional[bytes] = None,
    ) -> dict:
        with session_scope(self._session_factory) as session:
            existing = get_device_binding_for_device(
                session, user_id=user_id, device_identifier=device_identifier
            )
            if existing:
                existing.fingerprint_hash = fingerprint_hash
                existing.registration_method = registration_method
                existing.platform = platform
                existing.device_label = device_label
                if voice_signature_hash:
                    existing.voice_signature_hash = voice_signature_hash
                if voice_signature_vector:
                    existing.voice_signature_vector = voice_signature_vector
                existing.last_verified_at = datetime.now(IST)
                existing.revoked_at = None
                mark_device_binding_trust(
                    session, binding=existing, trust_level=DeviceTrustLevel.TRUSTED
                )
                binding = existing
            else:
                binding = create_device_binding(
                    session,
                    user_id=user_id,
                    device_identifier=device_identifier,
                    fingerprint_hash=fingerprint_hash,
                    registration_method=registration_method,
                    platform=platform,
                    device_label=device_label,
                    trust_level=DeviceTrustLevel.TRUSTED,
                    voice_signature_hash=voice_signature_hash,
                    voice_signature_vector=voice_signature_vector,
                )
            session.flush()
            session.refresh(binding)
            return _serialize_binding(binding)

    def revoke_binding(self, *, binding_id) -> Optional[dict]:
        with session_scope(self._session_factory) as session:
            binding = get_device_binding_by_id(session, binding_id)
            if binding is None:
                return None
            mark_device_binding_trust(
                session, binding=binding, trust_level=DeviceTrustLevel.REVOKED
            )
            session.flush()
            session.refresh(binding)
            return _serialize_binding(binding)

    def touch_binding(self, *, binding_id) -> Optional[dict]:
        """Refresh last_verified_at timestamp after successful voice validation."""
        with session_scope(self._session_factory) as session:
            binding = get_device_binding_by_id(session, binding_id)
            if binding is None:
                return None
            binding.last_verified_at = datetime.now(IST)
            session.flush()
            session.refresh(binding)
            return _serialize_binding(binding)


__all__ = ["DeviceBindingService"]

