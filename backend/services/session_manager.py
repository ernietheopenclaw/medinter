"""Session lifecycle management. No persistent storage — all in-memory."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

from backend.services.medical_ner import MedicalEntity, build_clinical_summary


@dataclass
class TranslationExchange:
    """A single translation exchange within a session."""
    speaker: str  # "patient" or "provider"
    original: str
    translation: str
    medical_terms: list[MedicalEntity]
    flags: list[str]
    urgency: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class Session:
    """An active translation session."""
    session_id: str
    source_lang: str
    target_lang: str
    mode: str  # "conversation", "one-way", "dictation"
    start_time: float = field(default_factory=time.time)
    exchanges: list[TranslationExchange] = field(default_factory=list)
    current_speaker: str = "patient"
    active: bool = True

    @property
    def exchange_count(self) -> int:
        return len(self.exchanges)

    @property
    def duration_seconds(self) -> float:
        return time.time() - self.start_time

    @property
    def all_medical_terms(self) -> list[MedicalEntity]:
        terms = []
        for ex in self.exchanges:
            terms.extend(ex.medical_terms)
        return terms


class SessionManager:
    """Manages translation sessions. CRITICAL: No audio stored. No transcripts persisted."""

    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._daily_count: int = 0
        self._day_start: float = time.time()

    def create_session(
        self, source_lang: str, target_lang: str, mode: str = "conversation"
    ) -> Session:
        session_id = str(uuid.uuid4())[:8]
        session = Session(
            session_id=session_id,
            source_lang=source_lang,
            target_lang=target_lang,
            mode=mode,
        )
        self._sessions[session_id] = session
        self._daily_count += 1
        return session

    def get_session(self, session_id: str) -> Session | None:
        return self._sessions.get(session_id)

    def add_exchange(self, session_id: str, exchange: TranslationExchange) -> bool:
        session = self._sessions.get(session_id)
        if not session or not session.active:
            return False
        session.exchanges.append(exchange)
        return True

    def switch_speaker(self, session_id: str) -> str | None:
        session = self._sessions.get(session_id)
        if not session:
            return None
        session.current_speaker = (
            "provider" if session.current_speaker == "patient" else "patient"
        )
        return session.current_speaker

    def end_session(self, session_id: str) -> dict | None:
        """End session and generate summary. Purges exchange data after."""
        session = self._sessions.get(session_id)
        if not session:
            return None

        session.active = False
        all_terms = session.all_medical_terms
        clinical = build_clinical_summary(all_terms)

        summary = {
            "session_id": session.session_id,
            "duration_seconds": session.duration_seconds,
            "source_lang": session.source_lang,
            "target_lang": session.target_lang,
            "exchange_count": session.exchange_count,
            "medical_terms": [dict(t) for t in all_terms],
            "clinical_summary": clinical,
            "flags": [],
            "mode": session.mode,
        }

        # Collect all flags
        for ex in session.exchanges:
            summary["flags"].extend(ex.flags)

        # CRITICAL: Purge exchange data — no transcripts stored
        session.exchanges.clear()

        return summary

    def get_summary(self, session_id: str) -> dict | None:
        """Get summary for an ended session."""
        session = self._sessions.get(session_id)
        if not session:
            return None
        if session.active:
            return None
        # Session already ended, re-derive from what we have
        return {
            "session_id": session.session_id,
            "duration_seconds": session.duration_seconds,
            "source_lang": session.source_lang,
            "target_lang": session.target_lang,
            "exchange_count": session.exchange_count,
            "medical_terms": [],
            "clinical_summary": build_clinical_summary([]),
            "flags": [],
            "mode": session.mode,
            "note": "Detailed data was purged for privacy after initial summary generation.",
        }

    def get_active_sessions(self) -> list[dict]:
        return [
            {
                "session_id": s.session_id,
                "source_lang": s.source_lang,
                "target_lang": s.target_lang,
                "exchange_count": s.exchange_count,
                "duration_seconds": s.duration_seconds,
                "current_speaker": s.current_speaker,
                "mode": s.mode,
            }
            for s in self._sessions.values()
            if s.active
        ]

    @property
    def daily_session_count(self) -> int:
        # Reset daily count if day changed
        import datetime
        now = time.time()
        if now - self._day_start > 86400:
            self._daily_count = 0
            self._day_start = now
        return self._daily_count

    def cleanup_old_sessions(self, max_age_seconds: int = 3600):
        """Remove ended sessions older than max_age."""
        now = time.time()
        to_remove = [
            sid
            for sid, s in self._sessions.items()
            if not s.active and (now - s.start_time) > max_age_seconds
        ]
        for sid in to_remove:
            del self._sessions[sid]
