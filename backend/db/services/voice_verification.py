"""Voice verification utilities built around open-source speaker models."""

from __future__ import annotations

import io
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import numpy as np
import soundfile as sf
from resemblyzer import VoiceEncoder
from scipy.spatial.distance import cosine

DEFAULT_SAMPLE_RATE = 16000
MIN_DURATION_SECONDS = 1.2


def _normalize_audio(samples: np.ndarray) -> np.ndarray:
    """Ensure mono float32 audio for the encoder."""
    if samples.ndim > 1:
        samples = np.mean(samples, axis=1)
    if samples.dtype != np.float32:
        samples = samples.astype(np.float32)
    max_abs = np.max(np.abs(samples)) or 1.0
    if max_abs > 1.0:
        samples = samples / max_abs
    return samples


@lru_cache(maxsize=1)
def _load_encoder() -> VoiceEncoder:
    return VoiceEncoder()


@dataclass
class VoiceVerificationService:
    """Encapsulates speaker embedding and similarity scoring."""

    threshold: float = 0.75

    def compute_embedding(self, audio_bytes: bytes) -> Optional[np.ndarray]:
        """Compute a speaker embedding from raw audio bytes."""
        if not audio_bytes:
            return None
        with io.BytesIO(audio_bytes) as buffer:
            samples, sr = sf.read(buffer)
        samples = _normalize_audio(samples)
        if sr != DEFAULT_SAMPLE_RATE:
            # Lazy import to avoid mandatory dependency unless needed.
            import librosa

            samples = librosa.resample(samples, orig_sr=sr, target_sr=DEFAULT_SAMPLE_RATE)
            sr = DEFAULT_SAMPLE_RATE
        duration = len(samples) / float(sr)
        if duration < MIN_DURATION_SECONDS:
            # Pad with a small amount of reflected audio so the encoder has enough frames.
            pad_length = int((MIN_DURATION_SECONDS * sr) - len(samples))
            samples = np.pad(samples, (0, max(pad_length, 0)), mode="reflect")
        encoder = _load_encoder()
        try:
            embedding = encoder.embed_utterance(samples)
        except AssertionError:
            # Re-sample one more time via librosa at the expected rate; if it still fails, bail.
            import librosa

            samples = librosa.resample(samples, orig_sr=sr, target_sr=DEFAULT_SAMPLE_RATE)
            try:
                embedding = encoder.embed_utterance(samples)
            except AssertionError:
                return None
        return embedding.astype(np.float32)

    @staticmethod
    def serialize_embedding(embedding: np.ndarray) -> bytes:
        return embedding.astype(np.float32).tobytes()

    @staticmethod
    def deserialize_embedding(payload: bytes) -> np.ndarray:
        return np.frombuffer(payload, dtype=np.float32)

    def similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        if not len(a) or not len(b):
            return 0.0
        return 1 - cosine(a, b)

    def matches(self, stored: np.ndarray, candidate: np.ndarray) -> bool:
        score = self.similarity(stored, candidate)
        return score >= self.threshold, score


__all__ = ["VoiceVerificationService"]

