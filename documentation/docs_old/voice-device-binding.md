# Voice + Device Binding Feature

## Background
- **Round 1 concept** highlighted a voice-first, zero-trust experience with passive voice biometrics, device binding, and RBI-compliant MFA.
- **Round 2 expectations** extend the hackathon prototype with stronger authentication, real-time observability, and inclusive UX for rural/low-literacy customers.

This document captures scope, compliance notes, and implementation checkpoints for the voice + device binding capability.

## Objectives
1. Bind trusted customer devices (browser/app instances) to reduce fraud risk.
2. Capture consented voice biometrics for low-friction authentication.
3. Enforce RBI/IDRBT guidance on risk-based MFA, inactivity timeout, and revocation.
4. Preserve accessibility for conversational users (Hindi/English code-switching).

## Compliance & Trust Guardrails
- **MFA Regulation (RBI circulars)**: device binding is an additional factor; voice biometrics acts as possession + inherence factor.
- **Data Minimisation (DPDP Act)**: never store raw audio; persist only salted hashes/templates and metadata.
- **Audit & Observability**: log enrollment, verification, revocation events with IST timestamps and customer consent flags.
- **Retention**: purge stale bindings and voice templates per retention policies (suggest 18 months); require periodic re-validation.
- **Fixed passphrase**: use the Hinglish line “Sun Bank mera saathi, har kadam surakshit banking ka vaada” as the standard utterance for enrolment/reverification to maximise phoneme coverage.
- **Secure transport & minimisation**: audio travels over TLS, is immediately converted into a 256-d float32 embedding (Resemblyzer ECAPA-TDNN) and discarded; only the embedding + SHA-256 audit hash are stored.
- **Similarity thresholding**: every login captures a fresh sample; cosine similarity with the stored embedding must exceed the configurable RBI-aligned threshold (default 0.78) or the binding is suspended and OTP fallback is triggered.

## Functional Scope
| Area | Key Responsibilities |
| --- | --- |
| Device Binding | Register device fingerprint, verify via OTP/voice, revoke, list trusted devices. |
| Voice Verification | Capture/verify voice samples (initially mocked pipeline), track last verified timestamp. |
| Authentication Flow | At login, ensure device bound **and** voice verified (fallback to OTP when risk high). |
| Session Management | Terminate sessions after inactivity (≤5 min) and when binding/voice requirements unmet. |
| Frontend UX | Guided enrollment wizard, alerts on missing binding, allow device removal, support low literacy copy. |

## Non-Functional Requirements
- **Security**: hash device identifiers, rotate salts; TLS-only transport.
- **Scalability**: design for future PostgreSQL migration (SQLAlchemy models, migrations).
- **Resilience**: feature flag for gradual rollout; graceful fallback if voice service unavailable.
- **Accessibility**: instructions in simple language; provide audio prompts later.

## API Additions (Draft)
- `POST /api/v1/auth/device-bindings/initiate` → start enrollment (returns OTP transaction id, voice instructions).
- `POST /api/v1/auth/device-bindings/confirm` → submit OTP + voice hash to finalize.
- `GET /api/v1/auth/device-bindings` → list trusted devices.
- `DELETE /api/v1/auth/device-bindings/{binding_id}` → revoke binding.

## Prototype Implementation (Current Sprint)
- **Model**: `resemblyzer` VoiceEncoder (ECAPA-TDNN) running on CPU-only FastAPI worker; cosine similarity stored alongside IST timestamp and audit hash.
- **Frontend**: React pages (`Login.jsx`, `DeviceBinding.jsx`) capture WebAudio, convert to 16‑bit PCM WAV in-browser, and upload via multipart form.
- **Backend flow**: `/auth/login` accepts form-data + `UploadFile`, computes embedding, compares with `device_bindings.voice_signature_vector`, and logs similarity score + outcome.
- **Data store**: device binding table extended with `voice_signature_vector` (binary) plus the legacy hash for audit traceability; raw audio never persists.
- **Edge handling**: mismatched scores suspend the binding (`DeviceTrustLevel.SUSPENDED`) and return `voice_mismatch`; missing audio returns `voice_verification_required` with the RBI passphrase prompt.

## Production Roadmap
- **Model Hardening**: train/enrol SpeechBrain ECAPA or PyAnnote model fine-tuned on Hinglish corpus; add anti-spoof module (CQCC/LCNN) and liveness checks (energy, zero-crossing, challenge-response).
- **Inference Architecture**: move embeddings to dedicated microservice (GPU-ready, autoscaled) with gRPC interface, feature store for enrolment drift, and circuit-breaker to OTP fallback on outage.
- **Security Enhancements**: encrypt embeddings-at-rest with HSM-managed keys, rotate templates every 18 months, add tamper-evident audit logs (Kafka → Elasticsearch) and consent receipts.
- **Compliance Artefacts**: capture FAR/FRR benchmarks, maintain model validation + drift reports, embed DPDP breach response playbook, and expose regulator dashboards (similarity distributions, spoof attempts).

## Frontend Tasks
1. Guided enrolment & login experiences (complete) with clear error messaging and CTA to manage devices.
2. Upcoming: voice-capture quality bar (waveform preview, noise hints) and support for assisted channels (CSC kiosk).

## Outstanding Questions
- Final integration with ASR/voice verification service (currently stubbed).
- OTP delivery mechanism (SMS vs. missed call) for low-connectivity regions.
- Multilingual prompts; currently English-only placeholder.

## Next Steps
1. Finalize data model & migrations.
2. Implement API services + repositories.
3. Build UI flows and error-handling.
4. Define monitoring dashboards & manual test cases (`docs/testing/voice-device-binding.md`).

