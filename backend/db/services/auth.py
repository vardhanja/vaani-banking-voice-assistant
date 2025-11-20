"""Authentication service bridging repositories and security helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from secrets import token_urlsafe
from typing import Optional
import hashlib
import logging

from sqlalchemy.orm import Session

from ..models import Session as SessionModel
from ..utils.enums import (
    AuthenticationLevel,
    DeviceTrustLevel,
    SessionStatus,
    TransactionChannel,
)
from ..engine import session_scope
from ..repositories.auth import get_session_by_token, get_user_by_customer_number
from ..repositories import (
    create_device_binding,
    get_device_binding_for_device,
    list_device_bindings,
    mark_device_binding_trust,
)
from ..utils.security import verify_password
from .voice_verification import VoiceVerificationService

logger = logging.getLogger(__name__)


@dataclass
class AuthResult:
    success: bool
    reason: Optional[str] = None
    user_profile: Optional[dict] = None
    access_token: Optional[str] = None
    expires_in: Optional[int] = None
    detail: Optional[dict] = None
    user_id: Optional[str] = None  # User UUID for AI backend


@dataclass
class AuthenticatedSession:
    user_id: str
    customer_number: str
    session_id: str
    access_token: str
    expires_at: datetime
    binding_id: Optional[str] = None


ACCESS_TOKEN_TTL_SECONDS = 60 * 30  # 30 minutes
SESSION_INACTIVITY_TIMEOUT = timedelta(minutes=5)  # RBI-recommended inactivity threshold
VOICE_VERIFICATION_VALIDITY = timedelta(days=7)
VOICE_ENROLLMENT_PHRASE = "Sun Bank mera saathi, har kadam surakshit banking ka vaada"


class SessionValidationError(Exception):
    """Represents an invalid or expired session state."""

    def __init__(self, *, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class AuthService:
    """Provides user authentication and profile retrieval."""

    def __init__(self, session_factory, voice_verifier: VoiceVerificationService):
        self._session_factory = session_factory
        self._voice_verifier = voice_verifier

    def authenticate(
        self,
        *,
        customer_number: str,
        password: str,
        device_identifier: Optional[str] = None,
        fingerprint_hash: Optional[str] = None,
        platform: Optional[str] = None,
        device_label: Optional[str] = None,
        voice_sample: Optional[bytes] = None,
        registration_method: Optional[str] = None,
        login_mode: str = "password",
        validate_only: bool = False,
    ) -> AuthResult:
        with session_scope(self._session_factory) as session:
            user = get_user_by_customer_number(session, customer_number)
            if user is None:
                return AuthResult(success=False, reason="invalid_credentials")

            # Define user_id_value early to avoid UnboundLocalError
            user_id_value = user.id
            customer_number_value = user.customer_number

            if login_mode != "voice":
                if not verify_password(password, user.password_hash):
                    return AuthResult(success=False, reason="invalid_credentials")
                device_identifier = None
                fingerprint_hash = None
                voice_sample = None
                # Revoke all existing voice-secured bindings on password login
                # Password login means user is not using voice authentication,
                # so any previous voice-secured sessions should be invalidated
                if not validate_only:
                    all_bindings = list(list_device_bindings(session, user_id=user_id_value, include_revoked=True))
                    for binding in all_bindings:
                        # Revoke bindings that have voice signatures (voice-secured sessions)
                        if binding.voice_signature_vector is not None and binding.trust_level != DeviceTrustLevel.REVOKED:
                            mark_device_binding_trust(
                                session, binding=binding, trust_level=DeviceTrustLevel.REVOKED
                            )
                            # Clear voice signature when revoking - user must re-enroll voice
                            binding.voice_signature_hash = None
                            binding.voice_signature_vector = None
            else:
                if voice_sample is None:
                    return AuthResult(
                        success=False,
                        reason="voice_sample_invalid",
                        detail={
                            "message": "Voice sample required for voice login.",
                            "voicePhrase": VOICE_ENROLLMENT_PHRASE,
                        },
                    )
                # Allow empty password in voice-first mode.
                if password and not verify_password(password, user.password_hash):
                    return AuthResult(success=False, reason="invalid_credentials")
                if device_identifier is None:
                    device_identifier = f"default-voice-{user.id}"
                if fingerprint_hash is None:
                    fingerprint_hash = device_identifier
                if platform is None:
                    platform = "web"
                if device_label is None:
                    device_label = "Primary voice device"

            tz = ZoneInfo("Asia/Kolkata")
            now = datetime.now(tz)
            detail: dict = {"loginMode": login_mode}
            binding_id: Optional[str] = None

            voice_embedding = None
            voice_vector_bytes: Optional[bytes] = None
            voice_hash: Optional[str] = None
            if voice_sample:
                logger.info(
                    f"[Voice Verification] Computing voice embedding: user_id={user_id_value}, "
                    f"voice_sample_size={len(voice_sample)} bytes"
                )
                voice_embedding = self._voice_verifier.compute_embedding(voice_sample)
                if voice_embedding is not None:
                    voice_vector_bytes = self._voice_verifier.serialize_embedding(voice_embedding)
                    voice_hash = hashlib.sha256(voice_sample).hexdigest()
                    logger.info(
                        f"[Voice Verification] Voice embedding computed successfully: "
                        f"user_id={user_id_value}, embedding_shape={voice_embedding.shape}, "
                        f"voice_hash={voice_hash[:16]}..."
                    )
                else:
                    logger.warning(
                        f"[Voice Verification] Failed to compute voice embedding: "
                        f"user_id={user_id_value}, voice_sample_size={len(voice_sample)} bytes"
                    )

            bindings = list_device_bindings(session, user_id=user_id_value)
            binding = None

            if device_identifier:
                binding = get_device_binding_for_device(
                    session, user_id=user_id_value, device_identifier=device_identifier
                )
                if binding:
                    binding_id = str(binding.id)
                    detail.setdefault("deviceBindingId", binding_id)
                    detail.setdefault("voicePhrase", VOICE_ENROLLMENT_PHRASE)
                    detail.setdefault("firstVoiceEnrollment", False)
                    if binding.last_verified_at is not None and binding.last_verified_at.tzinfo is None:
                        binding.last_verified_at = binding.last_verified_at.replace(tzinfo=tz)
                    if binding.revoked_at is not None and binding.revoked_at.tzinfo is None:
                        binding.revoked_at = binding.revoked_at.replace(tzinfo=tz)
                    # Handle revoked bindings - allow re-binding if voice sample is provided
                    if binding.trust_level == DeviceTrustLevel.REVOKED:
                        # If voice sample is provided and valid, allow re-binding
                        if voice_embedding is not None and voice_vector_bytes is not None and voice_hash is not None:
                            # User is attempting to re-bind with new voice
                            # This is allowed - we'll update the binding below
                            pass
                        else:
                            # No valid voice sample - require re-binding through device binding endpoint
                            return AuthResult(
                                success=False,
                                reason="device_verification_required",
                                detail={
                                    "bindingId": binding_id,
                                    "trustLevel": binding.trust_level.value,
                                    "message": "Device binding has been revoked. Please re-register your voice.",
                                    "rebindRequired": True,
                                },
                            )
                    elif binding.trust_level == DeviceTrustLevel.SUSPENDED:
                        return AuthResult(
                            success=False,
                            reason="device_verification_required",
                            detail={
                                "bindingId": binding_id,
                                "trustLevel": binding.trust_level.value,
                            },
                        )

                    if not validate_only:
                        if fingerprint_hash:
                            binding.fingerprint_hash = fingerprint_hash
                        if platform:
                            binding.platform = platform
                        if device_label:
                            binding.device_label = device_label

                    if voice_embedding is None or voice_vector_bytes is None or voice_hash is None:
                        return AuthResult(
                            success=False,
                            reason="voice_sample_invalid",
                            detail={
                                "bindingId": binding_id,
                                "message": "Voice sample was too short or unclear. Please record again.",
                                "voicePhrase": VOICE_ENROLLMENT_PHRASE,
                                "rebindSuggested": True,
                            },
                        )

                    stored_vector = None
                    is_first_time_enrollment = False
                    # Check if binding has a valid voice signature vector
                    if binding.voice_signature_vector and len(binding.voice_signature_vector) > 0:
                        try:
                            stored_vector = self._voice_verifier.deserialize_embedding(
                                binding.voice_signature_vector
                            )
                            # Verify the deserialized vector is valid (has expected dimensions)
                            # Resemblyzer embeddings are typically 256-dimensional
                            if stored_vector is not None:
                                if len(stored_vector) == 0:
                                    logger.warning(
                                        f"[Voice Verification] Stored voice signature is empty, "
                                        f"treating as first-time enrollment for user_id={user_id_value}"
                                    )
                                    stored_vector = None
                                    is_first_time_enrollment = True
                                elif len(stored_vector) < 100:  # Sanity check - embeddings should be ~256 dims
                                    logger.warning(
                                        f"[Voice Verification] Stored voice signature has invalid dimensions "
                                        f"({len(stored_vector)}), treating as first-time enrollment for user_id={user_id_value}"
                                    )
                                    stored_vector = None
                                    is_first_time_enrollment = True
                        except Exception as e:
                            logger.warning(
                                f"[Voice Verification] Failed to deserialize stored voice signature: {e}, "
                                f"treating as first-time enrollment for user_id={user_id_value}"
                            )
                            stored_vector = None
                            is_first_time_enrollment = True
                    else:
                        is_first_time_enrollment = True

                    if stored_vector is not None:
                        # Existing voice signature found - perform verification
                        logger.info(
                            f"[Voice Verification] Starting voice VERIFICATION (comparing against stored signature) "
                            f"for user_id={user_id_value}, customer_number={customer_number_value}, "
                            f"binding_id={binding_id}, device_identifier={device_identifier}"
                        )
                        try:
                            from .ai_voice_verification import AIVoiceVerificationService
                            ai_verifier = AIVoiceVerificationService(self._voice_verifier)
                            
                            # Prepare user context for AI analysis
                            user_context = {
                                "user_id": str(user_id_value),
                                "customer_number": customer_number_value,
                                "device_identifier": device_identifier,
                                "device_trust_level": binding.trust_level.value,
                                "is_new_device": False,
                                "binding_id": binding_id,
                            }
                            
                            # Use AI-enhanced verification
                            matches, score = ai_verifier.matches(
                                stored_vector,
                                voice_embedding,
                                use_ai=True,
                                user_context=user_context,
                            )
                            logger.info(
                                f"[Voice Verification] AI verification completed: matches={matches}, "
                                f"score={score:.4f}, user_id={user_id_value}"
                            )
                        except (ImportError, Exception) as e:
                            # Fallback to basic verification if AI service unavailable
                            logger.warning(
                                f"[Voice Verification] AI verification unavailable, using basic verification: {e}"
                            )
                            matches, score = self._voice_verifier.matches(stored_vector, voice_embedding)
                            logger.info(
                                f"[Voice Verification] Basic verification completed: matches={matches}, "
                                f"score={score:.4f}, user_id={user_id_value}"
                            )
                        
                        score_value = float(score)
                        detail["similarityScore"] = round(score_value, 4)
                        if not matches:
                            logger.warning(
                                f"[Voice Verification] Voice mismatch: score={score_value:.4f}, "
                                f"user_id={user_id_value}, binding_id={binding_id}"
                            )
                            return AuthResult(
                                success=False,
                                reason="voice_mismatch",
                                detail={
                                    "bindingId": binding_id,
                                    "message": "Voice sample did not match stored signature.",
                                    "voicePhrase": VOICE_ENROLLMENT_PHRASE,
                                    "similarityScore": round(score_value, 4),
                                    "rebindSuggested": True,
                                },
                            )
                        else:
                            logger.info(
                                f"[Voice Verification] Voice verification successful: score={score_value:.4f}, "
                                f"user_id={user_id_value}, binding_id={binding_id}"
                            )
                    else:
                        # First-time enrollment - no stored voice signature to compare against
                        logger.info(
                            f"[Voice Verification] First-time voice ENROLLMENT (no stored signature to compare) "
                            f"for user_id={user_id_value}, customer_number={customer_number_value}, "
                            f"binding_id={binding_id}, device_identifier={device_identifier}"
                        )
                        detail["enrolled"] = True

                    if not validate_only:
                        # Revoke all other bindings for this user to ensure only one active binding exists
                        # This maintains the rule: one login = one session = one trusted device
                        all_bindings = list(list_device_bindings(session, user_id=user_id_value, include_revoked=True))
                        for other_binding in all_bindings:
                            if other_binding.id != binding.id and other_binding.trust_level != DeviceTrustLevel.REVOKED:
                                mark_device_binding_trust(
                                    session, binding=other_binding, trust_level=DeviceTrustLevel.REVOKED
                                )
                                # Clear voice signature when revoking - user must re-enroll voice
                                other_binding.voice_signature_hash = None
                                other_binding.voice_signature_vector = None
                        
                        # Update voice signature (important for re-binding after revocation)
                        binding.voice_signature_hash = voice_hash
                        binding.voice_signature_vector = voice_vector_bytes
                        binding.last_verified_at = now
                        detail.pop("voiceEnrollmentRequired", None)
                        detail.pop("voiceReverificationRequired", None)
                        detail.pop("voicePhrase", None)
                        # Clear revoked status if binding was previously revoked (re-binding)
                        if binding.revoked_at is not None:
                            binding.revoked_at = None
                            detail["rebound"] = True
                        # Ensure trust level is TRUSTED (important for re-binding)
                        if binding.trust_level != DeviceTrustLevel.TRUSTED:
                            mark_device_binding_trust(
                                session, binding=binding, trust_level=DeviceTrustLevel.TRUSTED
                            )
                else:
                    if voice_embedding is None or voice_vector_bytes is None or voice_hash is None:
                        return AuthResult(
                            success=False,
                            reason="voice_sample_invalid",
                            detail={
                                "message": "Voice sample was too short or unclear. Please record again.",
                                "voicePhrase": VOICE_ENROLLMENT_PHRASE,
                            },
                        )

                    if validate_only:
                        detail.update({
                            "loginMode": login_mode,
                            "firstVoiceEnrollment": True,
                            "deviceBindingPreview": True,
                            "voicePhrase": VOICE_ENROLLMENT_PHRASE,
                        })
                    else:
                        # Revoke all other bindings for this user to ensure only one active binding exists
                        # This maintains the rule: one login = one session = one trusted device
                        all_bindings = list(list_device_bindings(session, user_id=user_id_value, include_revoked=True))
                        for other_binding in all_bindings:
                            if other_binding.trust_level != DeviceTrustLevel.REVOKED:
                                mark_device_binding_trust(
                                    session, binding=other_binding, trust_level=DeviceTrustLevel.REVOKED
                                )
                        
                        new_binding = create_device_binding(
                            session,
                            user_id=user_id_value,
                            device_identifier=device_identifier,
                            fingerprint_hash=fingerprint_hash or device_identifier,
                            registration_method=registration_method or "otp+voice",
                            platform=platform,
                            device_label=device_label,
                            voice_signature_hash=voice_hash,
                            voice_signature_vector=voice_vector_bytes,
                        )
                        session.flush()
                        session.refresh(new_binding)
                        binding = new_binding
                        binding.last_verified_at = now
                        session.flush()
                        binding_id = str(binding.id)
                        detail.update({
                            "deviceBindingId": binding_id,
                            "enrolled": True,
                            "loginMode": login_mode,
                            "firstVoiceEnrollment": True,
                        })
            else:
                # device_identifier is None - this should not happen for voice mode due to defaults,
                # but handle it gracefully
                if login_mode == "voice":
                    if bindings:
                        return AuthResult(
                            success=False,
                            reason="device_verification_required",
                            detail={
                                "message": "Trusted device required for this account.",
                                "expectedBindings": len(bindings),
                            },
                        )
                    # For first-time voice login without device_identifier, set defaults
                    if device_identifier is None:
                        device_identifier = f"default-voice-{user_id_value}"
                    if fingerprint_hash is None:
                        fingerprint_hash = device_identifier
                    if platform is None:
                        platform = "web"
                    if device_label is None:
                        device_label = "Primary voice device"
                    
                    detail["deviceBindingRequired"] = True
                    detail["voicePhrase"] = VOICE_ENROLLMENT_PHRASE
                    if voice_embedding is None or voice_vector_bytes is None or voice_hash is None:
                        detail["voicePhrase"] = VOICE_ENROLLMENT_PHRASE
                        return AuthResult(
                            success=False,
                            reason="voice_sample_invalid",
                            detail={
                                **detail,
                                "message": "Voice sample was too short or unclear. Please record again.",
                            },
                        )
                    
                    # If not validate_only, create binding even when device_identifier was originally None
                    if not validate_only:
                        # Revoke all other bindings for this user to ensure only one active binding exists
                        # This maintains the rule: one login = one session = one trusted device
                        all_bindings = list(list_device_bindings(session, user_id=user_id_value, include_revoked=True))
                        for other_binding in all_bindings:
                            if other_binding.trust_level != DeviceTrustLevel.REVOKED:
                                mark_device_binding_trust(
                                    session, binding=other_binding, trust_level=DeviceTrustLevel.REVOKED
                                )
                        
                        new_binding = create_device_binding(
                            session,
                            user_id=user_id_value,
                            device_identifier=device_identifier,
                            fingerprint_hash=fingerprint_hash or device_identifier,
                            registration_method=registration_method or "otp+voice",
                            platform=platform,
                            device_label=device_label,
                            voice_signature_hash=voice_hash,
                            voice_signature_vector=voice_vector_bytes,
                        )
                        session.flush()
                        session.refresh(new_binding)
                        binding = new_binding
                        binding.last_verified_at = now
                        session.flush()
                        binding_id = str(binding.id)
                        detail.update({
                            "deviceBindingId": binding_id,
                            "enrolled": True,
                            "loginMode": login_mode,
                            "firstVoiceEnrollment": True,
                        })
                        detail.pop("deviceBindingRequired", None)

            if validate_only:
                return AuthResult(
                    success=True,
                    reason="validated",
                    detail=detail or None,
                    user_id=str(user_id_value),  # Include user ID for AI backend
                )

            token = token_urlsafe(32)
            expires_at = now + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS)

            session_record = SessionModel(
                user_id=user_id_value,
                external_id=token,
                access_token=token,
                channel=TransactionChannel.VOICE if login_mode == "voice" else TransactionChannel.SYSTEM,
                status=SessionStatus.ACTIVE,
                auth_level=AuthenticationLevel.FULL,
                device_fingerprint=device_identifier or fingerprint_hash,
                mfa_method="voice+otp" if login_mode == "voice" else "password+otp",
                started_at=now,
                last_activity_at=now,
                last_intent="login",
                token_expires_at=expires_at,
            )
            session.add(session_record)
            user.last_login_at = now
            session.flush()
            session.refresh(user)

            primary_branch = user.primary_branch
            accounts = [
                {
                    "accountNumber": account.account_number,
                    "type": account.account_type.value.replace("_", " ").title(),
                    "balance": f"{account.currency_code} {float(account.available_balance):,.2f}",
                    "currency": account.currency_code,
                }
                for account in user.accounts
            ]

            upcoming_reminder = None
            if user.reminders:
                reminder_obj = min(user.reminders, key=lambda r: r.remind_at)
                upcoming_reminder = {
                    "label": reminder_obj.message,
                    "date": reminder_obj.remind_at,
                }

            profile = {
                "id": str(user.id),  # Add UUID for AI backend
                "customerId": customer_number_value,
                "fullName": f"{user.first_name} {user.last_name}",
                "segment": user.risk_segment.title(),
                "branch": {
                    "name": primary_branch.name if primary_branch else "Sun National Bank",
                    "city": primary_branch.city if primary_branch else "Bharat",
                },
                "accountSummary": accounts,
                "preferredLanguage": user.preferred_language,
                "lastLogin": (
                    user.last_login_at.isoformat() if user.last_login_at else None
                ),
                "nextReminder": upcoming_reminder,
            }

            if binding_id:
                detail.setdefault("deviceBindingId", binding_id)
            if voice_sample:
                detail.setdefault("voiceLogin", True)

            return AuthResult(
                success=True,
                user_profile=profile,
                access_token=token,
                expires_in=ACCESS_TOKEN_TTL_SECONDS,
                detail=detail or None,
            )


    def validate_token(self, *, token: str) -> AuthenticatedSession:
        error: SessionValidationError | None = None
        result: AuthenticatedSession | None = None

        with session_scope(self._session_factory) as session:
            session_record = get_session_by_token(session, token)
            tz = ZoneInfo("Asia/Kolkata")
            now = datetime.now(tz)

            if session_record is None:
                error = SessionValidationError(
                    code="session_invalid",
                    message="Invalid or expired access token.",
                )
            elif session_record.status != SessionStatus.ACTIVE:
                error = SessionValidationError(
                    code="session_inactive",
                    message="Session is no longer active. Please sign in again.",
                )
            elif session_record.token_expires_at is None:
                error = SessionValidationError(
                    code="session_invalid",
                    message="Session metadata is incomplete. Please sign in again.",
                )
            else:
                expires_at = session_record.token_expires_at
                if expires_at is not None and expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=tz)

                if expires_at is not None and expires_at < now:
                    session_record.status = SessionStatus.EXPIRED
                    session_record.ended_at = now
                    session.flush()
                    error = SessionValidationError(
                        code="session_expired",
                        message="Your session has expired. Please sign in again.",
                    )
                else:
                    last_activity = session_record.last_activity_at or session_record.started_at
                    if last_activity is not None:
                        if last_activity.tzinfo is None:
                            last_activity = last_activity.replace(tzinfo=tz)
                        if (now - last_activity) > SESSION_INACTIVITY_TIMEOUT:
                            session_record.status = SessionStatus.EXPIRED
                            session_record.ended_at = now
                            session.flush()
                            error = SessionValidationError(
                                code="session_timeout",
                                message="Your session ended due to inactivity. Please sign in again.",
                            )
                    if error is None:
                        session_record.last_activity_at = now
                        session.flush()
                        user = session_record.user
                        result = AuthenticatedSession(
                            user_id=str(user.id),
                            customer_number=user.customer_number,
                            session_id=str(session_record.id),
                            access_token=session_record.access_token,
                            expires_at=expires_at,
                        )

        if error is not None:
            raise error
        if result is None:
            raise SessionValidationError(
                code="session_invalid",
                message="Invalid or expired access token.",
            )
        return result


__all__ = ["AuthService", "AuthResult", "AuthenticatedSession", "ACCESS_TOKEN_TTL_SECONDS"]


