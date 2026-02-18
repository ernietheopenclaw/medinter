"""MedInter Configuration."""

import os


# NVIDIA Riva endpoints
RIVA_ASR_ENDPOINT = os.getenv("RIVA_ASR_ENDPOINT", "localhost:50051")
RIVA_TTS_ENDPOINT = os.getenv("RIVA_TTS_ENDPOINT", "localhost:50051")

# NVIDIA NIM endpoint (OpenAI-compatible)
NIM_ENDPOINT = os.getenv("NIM_ENDPOINT", "http://localhost:8000")
NIM_MODEL = os.getenv("NIM_MODEL", "meta/llama-4-maverick-17b-128e-instruct")

# Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "3000"))

# Demo/mock mode — set to "true" to run without Riva/NIM
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() in ("true", "1", "yes")

# Supported languages: code → (display name, flag, Riva code, TTS voice)
SUPPORTED_LANGUAGES = {
    "en-US": {"name": "English", "flag": "🇺🇸", "riva_asr": "en-US", "riva_tts": "en-US"},
    "es-US": {"name": "Spanish", "flag": "🇪🇸", "riva_asr": "es-US", "riva_tts": "es-US"},
    "zh-CN": {"name": "Mandarin Chinese", "flag": "🇨🇳", "riva_asr": "zh-CN", "riva_tts": "zh-CN"},
    "ar-AR": {"name": "Arabic", "flag": "🇸🇦", "riva_asr": "ar-AR", "riva_tts": "ar-AR"},
    "fr-FR": {"name": "French", "flag": "🇫🇷", "riva_asr": "fr-FR", "riva_tts": "fr-FR"},
    "de-DE": {"name": "German", "flag": "🇩🇪", "riva_asr": "de-DE", "riva_tts": "de-DE"},
    "hi-IN": {"name": "Hindi", "flag": "🇮🇳", "riva_asr": "hi-IN", "riva_tts": "hi-IN"},
    "ko-KR": {"name": "Korean", "flag": "🇰🇷", "riva_asr": "ko-KR", "riva_tts": "ko-KR"},
    "ja-JP": {"name": "Japanese", "flag": "🇯🇵", "riva_asr": "ja-JP", "riva_tts": "ja-JP"},
    "pt-BR": {"name": "Portuguese", "flag": "🇧🇷", "riva_asr": "pt-BR", "riva_tts": "pt-BR"},
    "ru-RU": {"name": "Russian", "flag": "🇷🇺", "riva_asr": "ru-RU", "riva_tts": "ru-RU"},
    "it-IT": {"name": "Italian", "flag": "🇮🇹", "riva_asr": "it-IT", "riva_tts": "it-IT"},
    "vi-VN": {"name": "Vietnamese", "flag": "🇻🇳", "riva_asr": "vi-VN", "riva_tts": "vi-VN"},
}
