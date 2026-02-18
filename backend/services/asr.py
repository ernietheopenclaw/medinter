"""NVIDIA Riva ASR (Automatic Speech Recognition) integration."""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import AsyncGenerator

import grpc

from backend.config import MOCK_MODE, RIVA_ASR_ENDPOINT

logger = logging.getLogger(__name__)

# Riva proto imports — available when nvidia-riva-client is installed
try:
    import riva.client
    import riva.client.audio_io

    RIVA_AVAILABLE = True
except ImportError:
    RIVA_AVAILABLE = False
    logger.warning("nvidia-riva-client not installed — ASR will use mock mode")


class RivaASR:
    """Streaming ASR via NVIDIA Riva."""

    def __init__(self, language_code: str = "en-US"):
        self.language_code = language_code
        self._auth = None
        self._service = None

        if RIVA_AVAILABLE and not MOCK_MODE:
            try:
                self._auth = riva.client.Auth(
                    uri=RIVA_ASR_ENDPOINT, use_ssl=False
                )
                self._service = riva.client.ASRService(self._auth)
                logger.info(f"Riva ASR connected at {RIVA_ASR_ENDPOINT}")
            except Exception as e:
                logger.error(f"Failed to connect to Riva ASR: {e}")
                self._service = None

    @property
    def is_available(self) -> bool:
        return self._service is not None

    async def streaming_recognize(
        self, audio_chunks: AsyncGenerator[bytes, None], sample_rate: int = 16000
    ) -> AsyncGenerator[dict, None]:
        """Stream audio chunks and yield transcript results.

        Yields dicts with keys: text, is_final, confidence, words
        """
        if not self.is_available or MOCK_MODE:
            async for chunk in audio_chunks:
                # Mock: yield fake partial then final
                yield {
                    "text": "",
                    "is_final": False,
                    "confidence": 0.0,
                    "words": [],
                }
            return

        # Build Riva streaming config
        config = riva.client.StreamingRecognitionConfig(
            config=riva.client.RecognitionConfig(
                encoding=riva.client.AudioEncoding.LINEAR_PCM,
                sample_rate_hertz=sample_rate,
                language_code=self.language_code,
                max_alternatives=1,
                enable_automatic_punctuation=True,
                enable_word_time_offsets=True,
            ),
            interim_results=True,
        )

        # Collect audio into a synchronous generator for Riva
        audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()

        async def _feed():
            async for chunk in audio_chunks:
                await audio_queue.put(chunk)
            await audio_queue.put(None)

        def _sync_gen():
            loop = asyncio.get_event_loop()
            while True:
                chunk = asyncio.run_coroutine_threadsafe(
                    audio_queue.get(), loop
                ).result()
                if chunk is None:
                    break
                yield chunk

        feed_task = asyncio.create_task(_feed())

        try:
            responses = self._service.streaming_response_generator(
                audio_chunks=_sync_gen(), streaming_config=config
            )
            for response in responses:
                for result in response.results:
                    words = []
                    if result.alternatives:
                        alt = result.alternatives[0]
                        for w in getattr(alt, "words", []):
                            words.append(
                                {
                                    "word": w.word,
                                    "start_time": w.start_time,
                                    "end_time": w.end_time,
                                }
                            )
                        yield {
                            "text": alt.transcript,
                            "is_final": result.is_final,
                            "confidence": alt.confidence,
                            "words": words,
                        }
        except Exception as e:
            logger.error(f"Riva ASR streaming error: {e}")
        finally:
            feed_task.cancel()

    async def recognize_audio_bytes(
        self, audio_b64: str, sample_rate: int = 16000
    ) -> dict:
        """Recognize a single audio chunk (base64 encoded).

        Returns dict with text, is_final, confidence.
        """
        audio_bytes = base64.b64decode(audio_b64)

        if not self.is_available or MOCK_MODE:
            return {"text": "", "is_final": False, "confidence": 0.0, "words": []}

        try:
            config = riva.client.RecognitionConfig(
                encoding=riva.client.AudioEncoding.LINEAR_PCM,
                sample_rate_hertz=sample_rate,
                language_code=self.language_code,
                max_alternatives=1,
                enable_automatic_punctuation=True,
            )
            response = self._service.offline_recognize(audio_bytes, config)
            if response.results:
                alt = response.results[0].alternatives[0]
                return {
                    "text": alt.transcript,
                    "is_final": True,
                    "confidence": alt.confidence,
                    "words": [],
                }
        except Exception as e:
            logger.error(f"Riva ASR recognition error: {e}")

        return {"text": "", "is_final": False, "confidence": 0.0, "words": []}
