"""NVIDIA Riva TTS (Text-to-Speech) integration."""

from __future__ import annotations

import base64
import io
import logging
import struct
import wave

from backend.config import MOCK_MODE, RIVA_TTS_ENDPOINT

logger = logging.getLogger(__name__)

try:
    import riva.client

    RIVA_AVAILABLE = True
except ImportError:
    RIVA_AVAILABLE = False
    logger.warning("nvidia-riva-client not installed — TTS will use mock mode")


def _generate_silence_wav(duration_ms: int = 500, sample_rate: int = 22050) -> bytes:
    """Generate a silent WAV file for mock mode."""
    num_samples = int(sample_rate * duration_ms / 1000)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * num_samples)
    return buf.getvalue()


class RivaTTS:
    """Text-to-speech via NVIDIA Riva."""

    def __init__(self, language_code: str = "en-US"):
        self.language_code = language_code
        self._auth = None
        self._service = None

        if RIVA_AVAILABLE and not MOCK_MODE:
            try:
                self._auth = riva.client.Auth(
                    uri=RIVA_TTS_ENDPOINT, use_ssl=False
                )
                self._service = riva.client.SpeechSynthesisService(self._auth)
                logger.info(f"Riva TTS connected at {RIVA_TTS_ENDPOINT}")
            except Exception as e:
                logger.error(f"Failed to connect to Riva TTS: {e}")
                self._service = None

    @property
    def is_available(self) -> bool:
        return self._service is not None

    async def synthesize(
        self, text: str, language_code: str | None = None, sample_rate: int = 22050
    ) -> str:
        """Synthesize speech from text.

        Returns base64-encoded WAV audio.
        """
        lang = language_code or self.language_code

        if not self.is_available or MOCK_MODE:
            wav_bytes = _generate_silence_wav(duration_ms=1000, sample_rate=sample_rate)
            return base64.b64encode(wav_bytes).decode("utf-8")

        try:
            resp = self._service.synthesize(
                text,
                voice_name=None,  # Use default voice for language
                language_code=lang,
                encoding=riva.client.AudioEncoding.LINEAR_PCM,
                sample_rate_hz=sample_rate,
            )
            # Wrap raw PCM in WAV
            buf = io.BytesIO()
            with wave.open(buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                wf.writeframes(resp.audio)
            return base64.b64encode(buf.getvalue()).decode("utf-8")

        except Exception as e:
            logger.error(f"Riva TTS error: {e}")
            wav_bytes = _generate_silence_wav()
            return base64.b64encode(wav_bytes).decode("utf-8")
