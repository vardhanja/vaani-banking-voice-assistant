"""REST API route definitions for Sun National Bank."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

import hashlib

from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile, Form

from ..db.services.auth import AuthService
from ..db.services.banking import BankingService
from ..db.services.device_binding import DeviceBindingService
from ..db.services.voice_verification import VoiceVerificationService
from ..db.utils.enums import ReminderStatus, ReminderType, TransactionChannel
from .dependencies import (
    AuthServiceDep,
    BankingServiceDep,
    DeviceBindingServiceDep,
    VoiceVerificationServiceDep,
)
from .schemas import (
    AccountBalanceData,
    AccountBalanceResponse,
    AccountItem,
    AccountListResponse,
    ErrorDetail,
    ErrorResponse,
    LoginData,
    LoginResponse,
    DeviceBindingListResponse,
    DeviceBindingResponse,
    DeviceBindingResource,
    ReminderCreateRequest,
    ReminderListResponse,
    ReminderResource,
    ReminderResponse,
    ReminderStatusUpdateRequest,
    ResponseMeta,
    TransactionHistoryResponse,
    TransferReceipt,
    TransferRequest,
    TransferResponse,
    UserProfile,
)
from .security import CurrentSessionDep, RequestContext, RequestContextDep

router = APIRouter(prefix="/api/v1", tags=["Sun National Bank"])


def build_meta(ctx: RequestContext) -> ResponseMeta:
    return ResponseMeta(
        requestId=ctx.request_id,
        timestamp=ctx.timestamp,
        locale=ctx.locale,
        channel=ctx.channel,
        customerIp=ctx.customer_ip,
        deviceId=ctx.device_id,
    )


def raise_http_error(
    ctx: RequestContext,
    message: str,
    *,
    code: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    info: Optional[dict] = None,
) -> None:
    meta = build_meta(ctx)
    detail = ErrorDetail(code=code, message=message, info=info)
    payload = ErrorResponse(meta=meta, error=detail).model_dump(mode="json")
    raise HTTPException(
        status_code=status_code,
        detail=payload,
    )


def serialize_reminder(reminder) -> ReminderResource:
    if isinstance(reminder, ReminderResource):
        return reminder
    if isinstance(reminder, dict):
        return ReminderResource(**reminder)
    return ReminderResource(
        id=str(reminder.id),
        reminderType=reminder.reminder_type.value,
        status=reminder.status.value,
        message=reminder.message,
        remindAt=reminder.remind_at,
        channel=reminder.channel,
        accountId=str(reminder.account_id) if reminder.account_id else None,
        recurrenceRule=reminder.recurrence_rule,
    )


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Authenticate user credentials",
    tags=["Authentication"],
)
async def login_v1(
    userId: str = Form(...),
    password: str = Form(...),
    deviceIdentifier: Optional[str] = Form(None),
    deviceFingerprint: Optional[str] = Form(None),
    deviceLabel: Optional[str] = Form(None),
    platform: Optional[str] = Form(None),
    registrationMethod: Optional[str] = Form("otp+voice"),
    voiceSample: UploadFile | None = File(None),
    voiceBypass: bool = Form(False),
    ctx: RequestContext = RequestContextDep,
    auth_service: AuthService = AuthServiceDep,
):
    voice_bytes = await voiceSample.read() if voiceSample else None
    result = auth_service.authenticate(
        customer_number=userId,
        password=password,
        device_identifier=deviceIdentifier,
        fingerprint_hash=deviceFingerprint,
        platform=platform,
        device_label=deviceLabel,
        voice_sample=voice_bytes,
        registration_method=registrationMethod or "otp+voice",
        voice_bypass=voiceBypass,
    )

    if not result.success or result.user_profile is None or result.access_token is None:
        reason = result.reason or "invalid_credentials"
        message_map = {
            "invalid_credentials": "Invalid user ID or password.",
            "device_binding_required": "Device binding required before continuing.",
            "device_verification_required": "Verify this device to continue.",
            "voice_verification_required": "Please complete voice verification to continue.",
            "voice_enrollment_required": "Please enroll your voice signature to continue.",
            "voice_mismatch": "Voice sample did not match our records.",
            "voice_sample_invalid": "Voice sample was too short or unclear. Please record again.",
        }
        message = message_map.get(reason, "Authentication failed.")
        raise_http_error(
            ctx,
            message=message,
            code=reason,
            status_code=status.HTTP_401_UNAUTHORIZED,
            info=result.detail,
        )

    profile = UserProfile(**result.user_profile)
    meta = build_meta(ctx)
    data = LoginData(
        accessToken=result.access_token,
        expiresIn=result.expires_in or 0,
        profile=profile,
        detail=result.detail,
    )
    return LoginResponse(meta=meta, data=data)


@router.get(
    "/auth/device-bindings",
    response_model=DeviceBindingListResponse,
    summary="List trusted devices for the authenticated user",
    tags=["Authentication"],
)
def list_device_bindings_v1(
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    device_binding_service: DeviceBindingService = DeviceBindingServiceDep,
):
    bindings = device_binding_service.list_bindings(user_id=session.user_id)
    meta = build_meta(ctx)
    resources = [DeviceBindingResource(**binding) for binding in bindings]
    return DeviceBindingListResponse(meta=meta, data=resources)


@router.post(
    "/auth/device-bindings",
    response_model=DeviceBindingResponse,
    summary="Register or refresh a trusted device binding",
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"],
)
async def create_device_binding_v1(
    deviceIdentifier: str = Form(...),
    fingerprintHash: str = Form(...),
    registrationMethod: Optional[str] = Form("otp+voice"),
    platform: Optional[str] = Form(None),
    deviceLabel: Optional[str] = Form(None),
    voiceSample: UploadFile | None = File(None),
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    device_binding_service: DeviceBindingService = DeviceBindingServiceDep,
    voice_verifier: VoiceVerificationService = VoiceVerificationServiceDep,
):
    voice_bytes = await voiceSample.read() if voiceSample else None
    if voice_bytes is None:
        raise_http_error(
            ctx,
            message="Voice sample required to register this device.",
            code="voice_sample_missing",
        )
    voice_hash = hashlib.sha256(voice_bytes).hexdigest() if voice_bytes else None
    voice_vector = None
    if voice_bytes:
        embedding = voice_verifier.compute_embedding(voice_bytes)
        if embedding is None:
            raise_http_error(
                ctx,
                message="Voice sample too short or unclear. Please record again.",
                code="voice_sample_invalid",
            )
        voice_vector = voice_verifier.serialize_embedding(embedding)
    binding = device_binding_service.register_or_refresh_binding(
        user_id=session.user_id,
        device_identifier=deviceIdentifier,
        fingerprint_hash=fingerprintHash,
        platform=platform,
        device_label=deviceLabel,
        registration_method=registrationMethod or "otp+voice",
        voice_signature_hash=voice_hash,
        voice_signature_vector=voice_vector,
    )
    meta = build_meta(ctx)
    resource = DeviceBindingResource(**binding)
    return DeviceBindingResponse(meta=meta, data=resource)


@router.delete(
    "/auth/device-bindings/{binding_id}",
    response_model=DeviceBindingResponse,
    summary="Revoke a trusted device binding",
    tags=["Authentication"],
)
def revoke_device_binding_v1(
    binding_id: str,
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    device_binding_service: DeviceBindingService = DeviceBindingServiceDep,
):
    binding = device_binding_service.revoke_binding(binding_id=binding_id)
    if binding is None:
        raise_http_error(
            ctx,
            message="Device binding not found.",
            code="device_binding_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    meta = build_meta(ctx)
    resource = DeviceBindingResource(**binding)
    return DeviceBindingResponse(meta=meta, data=resource)


@router.get(
    "/accounts",
    response_model=AccountListResponse,
    tags=["Accounts"],
    summary="List customer accounts",
)
def list_accounts(
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    banking_service: BankingService = BankingServiceDep,
):
    accounts = banking_service.list_accounts(user_id=session.user_id)
    meta = build_meta(ctx)
    items = [AccountItem(**account) for account in accounts]
    return AccountListResponse(meta=meta, data=items)


@router.get(
    "/accounts/{account_id}/balance",
    response_model=AccountBalanceResponse,
    tags=["Accounts"],
    summary="Retrieve account balance",
)
def get_account_balance(
    account_id: str,
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    banking_service: BankingService = BankingServiceDep,
):
    account = banking_service.get_account_for_user(
        user_id=session.user_id, account_id=account_id
    )
    if account is None:
        raise_http_error(
            ctx,
            message="Account not found.",
            code="account_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    balance = AccountBalanceData(
        accountNumber=account["accountNumber"],
        currency=account["currency"],
        ledgerBalance=account["balance"],
        availableBalance=account["availableBalance"],
        status=account["status"],
    )
    meta = build_meta(ctx)
    return AccountBalanceResponse(meta=meta, data=balance)


@router.get(
    "/accounts/{account_id}/transactions",
    response_model=TransactionHistoryResponse,
    tags=["Transactions"],
    summary="Retrieve transaction history",
)
def list_transactions(
    account_id: str,
    from_date: Optional[datetime] = Query(
        default=None, alias="from", description="ISO8601 start timestamp."
    ),
    to_date: Optional[datetime] = Query(
        default=None, alias="to", description="ISO8601 end timestamp."
    ),
    limit: int = Query(default=50, ge=1, le=500),
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    banking_service: BankingService = BankingServiceDep,
):
    try:
        transactions = banking_service.fetch_transaction_history(
            user_id=session.user_id,
            account_id=account_id,
            start_date=from_date,
            end_date=to_date,
            limit=limit,
        )
    except ValueError as exc:
        if str(exc) == "account_not_found":
            raise_http_error(
                ctx,
                message="Account not found.",
                code="account_not_found",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        raise

    meta = build_meta(ctx)
    return TransactionHistoryResponse(meta=meta, data=transactions)


@router.post(
    "/transfers/internal",
    response_model=TransferResponse,
    tags=["Payments"],
    summary="Initiate an internal transfer",
    status_code=status.HTTP_201_CREATED,
)
def create_internal_transfer(
    payload: TransferRequest,
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    banking_service: BankingService = BankingServiceDep,
):
    source_account = banking_service.get_account_for_user(
        user_id=session.user_id, account_id=payload.sourceAccountId
    )
    if source_account is None:
        raise_http_error(
            ctx,
            message="Source account not found.",
            code="account_not_found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    try:
        destination_account_number = payload.destinationAccountNumber.strip()
        if not destination_account_number:
            raise_http_error(
                ctx,
                message="Provide a valid destination account number.",
                code="invalid_destination_account",
            )
        if destination_account_number == source_account["accountNumber"]:
            raise_http_error(
                ctx,
                message="Destination account must be different from the source account.",
                code="invalid_destination_account",
            )

        result = banking_service.transfer_between_accounts(
            source_account_number=source_account["accountNumber"],
            destination_account_number=destination_account_number,
            amount=Decimal(payload.amount),
            currency_code=payload.currency,
            description=payload.remarks,
            channel=TransactionChannel.VOICE,
            session_id=session.session_id,
            reference_id=payload.referenceId,
        )
    except ValueError as exc:
        message = str(exc)
        error_code = "transfer_failed"
        status_code_value = status.HTTP_400_BAD_REQUEST
        if "Insufficient funds" in message:
            error_code = "insufficient_funds"
            message = "Insufficient funds in source account."
        raise_http_error(
            ctx,
            message=message,
            code=error_code,
            status_code=status_code_value,
        )

    receipt = TransferReceipt(
        debitTransactionId=result["debit"]["id"],
        creditTransactionId=result["credit"]["id"],
        amount=result["debit"]["amount"],
        currency=result["debit"]["currency"],
        description=result["debit"]["description"],
    )
    meta = build_meta(ctx)
    return TransferResponse(meta=meta, data=receipt)


@router.get(
    "/reminders",
    response_model=ReminderListResponse,
    tags=["Reminders"],
    summary="List reminders configured for customer",
)
def list_reminders(
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    banking_service: BankingService = BankingServiceDep,
):
    reminders = banking_service.list_reminders(user_id=session.user_id)
    resources = [ReminderResource(**reminder) for reminder in reminders]
    meta = build_meta(ctx)
    return ReminderListResponse(meta=meta, data=resources)


@router.post(
    "/reminders",
    response_model=ReminderResponse,
    tags=["Reminders"],
    summary="Create a reminder",
    status_code=status.HTTP_201_CREATED,
)
def create_reminder(
    payload: ReminderCreateRequest,
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    banking_service: BankingService = BankingServiceDep,
):
    try:
        reminder = banking_service.schedule_reminder(
            user_id=session.user_id,
            remind_at=payload.remindAt,
            message=payload.message,
            reminder_type=ReminderType(payload.reminderType),
            account_id=payload.accountId,
            channel=payload.channel or "voice",
            recurrence_rule=payload.recurrenceRule,
        )
    except ValueError as exc:
        code = "account_not_found" if str(exc) == "account_not_found" else "invalid_data"
        status_code = status.HTTP_404_NOT_FOUND if code == "account_not_found" else status.HTTP_400_BAD_REQUEST
        raise_http_error(
            ctx,
            message=str(exc),
            code=code,
            status_code=status_code,
        )

    resource = serialize_reminder(reminder)
    meta = build_meta(ctx)
    return ReminderResponse(meta=meta, data=resource)


@router.patch(
    "/reminders/{reminder_id}",
    response_model=ReminderResponse,
    tags=["Reminders"],
    summary="Update reminder status",
)
def update_reminder(
    reminder_id: str,
    payload: ReminderStatusUpdateRequest,
    ctx: RequestContext = RequestContextDep,
    session=CurrentSessionDep,
    banking_service: BankingService = BankingServiceDep,
):
    try:
        reminder = banking_service.update_reminder_status(
            user_id=session.user_id,
            reminder_id=reminder_id,
            status=ReminderStatus(payload.status),
        )
    except ValueError as exc:
        raise_http_error(
            ctx,
            message="Reminder not found.",
            code=str(exc),
            status_code=status.HTTP_404_NOT_FOUND,
        )

    resource = serialize_reminder(reminder)
    meta = build_meta(ctx)
    return ReminderResponse(meta=meta, data=resource)


__all__ = ["router"]
