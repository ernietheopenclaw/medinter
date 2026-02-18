"""MedInter — Real-time medical translation server."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import HOST, MOCK_MODE, PORT, SUPPORTED_LANGUAGES
from backend.services.asr import RivaASR
from backend.services.medical_ner import validate_and_normalize
from backend.services.session_manager import SessionManager, TranslationExchange
from backend.services.translator import NIMTranslator
from backend.services.tts import RivaTTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
session_manager = SessionManager()
translator = NIMTranslator()
asr_service: RivaASR | None = None
tts_service: RivaTTS | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global asr_service, tts_service
    logger.info(f"Starting MedInter server (mock_mode={MOCK_MODE})")
    asr_service = RivaASR()
    tts_service = RivaTTS()
    yield
    await translator.close()
    logger.info("MedInter server stopped")


app = FastAPI(
    title="MedInter",
    description="Real-time medical translation powered by NVIDIA DGX Spark GB10",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for local network
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── REST Endpoints ────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    """System health check."""
    gpu_info = {"available": False, "usage_percent": 0, "memory_used_gb": 0, "memory_total_gb": 0}
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(", ")
            gpu_info = {
                "available": True,
                "usage_percent": int(parts[0]),
                "memory_used_gb": round(int(parts[1]) / 1024, 1),
                "memory_total_gb": round(int(parts[2]) / 1024, 1),
            }
    except Exception:
        pass

    return {
        "status": "healthy",
        "mock_mode": MOCK_MODE,
        "services": {
            "riva_asr": asr_service.is_available if asr_service else False,
            "riva_tts": tts_service.is_available if tts_service else False,
            "nim_llm": not MOCK_MODE,
        },
        "gpu": gpu_info,
        "active_sessions": len(session_manager.get_active_sessions()),
        "daily_sessions": session_manager.daily_session_count,
    }


@app.get("/api/languages")
async def languages():
    """List supported languages."""
    return {
        "languages": [
            {"code": code, **info} for code, info in SUPPORTED_LANGUAGES.items()
        ]
    }


class StartSessionRequest(BaseModel):
    source_lang: str = "es-US"
    target_lang: str = "en-US"
    mode: str = "conversation"


@app.post("/api/session/start")
async def start_session(req: StartSessionRequest):
    session = session_manager.create_session(req.source_lang, req.target_lang, req.mode)
    return {
        "session_id": session.session_id,
        "source_lang": session.source_lang,
        "target_lang": session.target_lang,
        "mode": session.mode,
    }


class EndSessionRequest(BaseModel):
    session_id: str


@app.post("/api/session/end")
async def end_session(req: EndSessionRequest):
    summary = session_manager.end_session(req.session_id)
    if not summary:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    return summary


@app.get("/api/session/{session_id}/summary")
async def get_summary(session_id: str):
    summary = session_manager.get_summary(session_id)
    if not summary:
        return JSONResponse(status_code=404, content={"error": "Session not found or still active"})
    return summary


@app.get("/api/sessions/active")
async def active_sessions():
    return {"sessions": session_manager.get_active_sessions()}


# ── WebSocket Endpoint ────────────────────────────────────────────────────────


@app.websocket("/ws/translate")
async def websocket_translate(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")

    session_id: str | None = None
    source_lang = "es-US"
    target_lang = "en-US"

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "config":
                source_lang = msg.get("source_lang", source_lang)
                target_lang = msg.get("target_lang", target_lang)
                session_id = msg.get("session_id", session_id)
                await websocket.send_json({"type": "config_ack", "source_lang": source_lang, "target_lang": target_lang})

            elif msg_type == "audio_chunk":
                session_id = msg.get("session_id", session_id)
                source_lang = msg.get("source_lang", source_lang)
                target_lang = msg.get("target_lang", target_lang)
                audio_b64 = msg.get("audio", "")

                # Step 1: ASR
                asr_result = await asr_service.recognize_audio_bytes(audio_b64)

                if asr_result["text"]:
                    # Send partial transcript
                    await websocket.send_json({
                        "type": "partial_transcript",
                        "text": asr_result["text"],
                        "is_final": asr_result["is_final"],
                    })

                    if asr_result["is_final"]:
                        # Step 2: Translate + NER
                        result = await translator.translate(
                            asr_result["text"], source_lang, target_lang
                        )

                        # Step 3: TTS
                        audio_out = await tts_service.synthesize(
                            result["translation"], target_lang
                        )

                        # Normalize medical terms
                        terms = validate_and_normalize(result.get("medical_terms", []))

                        # Store exchange
                        if session_id:
                            session = session_manager.get_session(session_id)
                            if session:
                                exchange = TranslationExchange(
                                    speaker=session.current_speaker,
                                    original=asr_result["text"],
                                    translation=result["translation"],
                                    medical_terms=terms,
                                    flags=result.get("flags", []),
                                    urgency=result.get("urgency", "medium"),
                                )
                                session_manager.add_exchange(session_id, exchange)

                        await websocket.send_json({
                            "type": "translation_result",
                            "original": asr_result["text"],
                            "translation": result["translation"],
                            "medical_terms": [dict(t) for t in terms],
                            "flags": result.get("flags", []),
                            "urgency": result.get("urgency", "medium"),
                            "audio": audio_out,
                        })
                else:
                    # No speech detected, send empty partial
                    await websocket.send_json({
                        "type": "partial_transcript",
                        "text": "",
                        "is_final": False,
                    })

            elif msg_type == "text_input":
                # Direct text input (no ASR needed)
                text = msg.get("text", "")
                session_id = msg.get("session_id", session_id)
                source_lang = msg.get("source_lang", source_lang)
                target_lang = msg.get("target_lang", target_lang)

                if text:
                    result = await translator.translate(text, source_lang, target_lang)
                    audio_out = await tts_service.synthesize(result["translation"], target_lang)
                    terms = validate_and_normalize(result.get("medical_terms", []))

                    if session_id:
                        session = session_manager.get_session(session_id)
                        if session:
                            exchange = TranslationExchange(
                                speaker=session.current_speaker,
                                original=text,
                                translation=result["translation"],
                                medical_terms=terms,
                                flags=result.get("flags", []),
                                urgency=result.get("urgency", "medium"),
                            )
                            session_manager.add_exchange(session_id, exchange)

                    await websocket.send_json({
                        "type": "translation_result",
                        "original": text,
                        "translation": result["translation"],
                        "medical_terms": [dict(t) for t in terms],
                        "flags": result.get("flags", []),
                        "urgency": result.get("urgency", "medium"),
                        "audio": audio_out,
                    })

            elif msg_type == "switch_speaker":
                if session_id:
                    new_speaker = session_manager.switch_speaker(session_id)
                    await websocket.send_json({
                        "type": "speaker_switched",
                        "current_speaker": new_speaker,
                    })

            elif msg_type == "end_session":
                if session_id:
                    summary = session_manager.end_session(session_id)
                    await websocket.send_json({
                        "type": "session_ended",
                        "summary": summary,
                    })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass


# ── Static Files (Frontend) ──────────────────────────────────────────────────

frontend_path = Path(__file__).parent.parent / "frontend" / "out"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
    logger.info(f"Serving frontend from {frontend_path}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
