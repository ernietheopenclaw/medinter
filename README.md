# 🏥 MedInter

**Every second matters. Every word matters. No internet required.**

Real-time AI medical translation running entirely on a local NVIDIA DGX Spark GB10. Phone connects via Bluetooth, WiFi, or USB — zero cloud, zero internet, zero data leaving the device.

---

## The Problem

Language barriers in emergency medicine cost lives.

- **25% of US residents** speak a language other than English at home
- **67.8 million people** in the US have limited English proficiency
- Professional interpreters aren't available at **2 AM in an ambulance**
- Phone interpreter services require **internet** — unavailable in rural areas, disaster zones, or underground
- Miscommunication of symptoms leads to **misdiagnosis, delayed treatment, and patient harm**
- Current solutions send **patient audio to the cloud** — a HIPAA compliance nightmare

## The Solution

MedInter is a real-time medical interpreter that runs **entirely on a local NVIDIA DGX Spark GB10**. A phone connects to the GB10 via Bluetooth PAN, WiFi hotspot, or USB-C tethering — no internet required. The patient speaks in their language, and the EMT/doctor hears the translation in theirs, with automatic medical term extraction.

**No cloud. No internet. No data leaves the device. Ever.**

## Why Local Matters

| Concern | Cloud Translation | MedInter |
|---------|-------------------|--------------|
| Audio of patient symptoms | Sent to third-party servers | Never leaves the GB10 |
| Voice biometric data | Stored in cloud logs | Never recorded |
| HIPAA compliance | Requires BAA with cloud provider | No third-party processors |
| Internet required | Yes | No |
| Patient consent for cloud | Impractical mid-emergency | Not needed |
| Works in ambulance | Maybe | Always |
| Works in disaster zone | No | Yes |
| Works underground | No | Yes |

Audio of patients describing symptoms is **Protected Health Information (PHI)** under HIPAA. Voice is a **biometric identifier**. MedInter ensures neither ever leaves the device.

## How It Works

```
┌──────────────────────────────────────────────────────┐
│                    NVIDIA DGX Spark GB10              │
│                                                       │
│  ┌─────────┐   ┌──────────────┐   ┌─────────┐       │
│  │ Riva ASR │──▶│  NIM LLM     │──▶│ Riva TTS│       │
│  │ (Speech  │   │  (Translate + │   │ (Text to│       │
│  │  to Text)│   │   Medical NER)│   │  Speech)│       │
│  └────▲─────┘   └──────────────┘   └────┬────┘       │
│       │                                  │            │
│  ┌────┴──────────────────────────────────▼────┐      │
│  │         FastAPI Server (:3000)              │      │
│  │         + Static Frontend (PWA)             │      │
│  └────────────────▲───────────────────────────┘      │
│                   │                                   │
└───────────────────┼───────────────────────────────────┘
                    │ Bluetooth PAN / WiFi / USB-C
               ┌────┴────┐
               │  Phone   │
               │ (Chrome) │
               └──────────┘
```

1. **Connect** — Phone connects to GB10 via Bluetooth PAN, WiFi hotspot, or USB-C
2. **Open** — Phone opens `http://<gb10-ip>:3000` in Chrome (PWA installable)
3. **Speak** — Patient speaks in their language
4. **Transcribe** — NVIDIA Riva ASR converts speech to text
5. **Translate** — NIM LLM translates with medical accuracy, extracts entities
6. **Speak** — Riva TTS speaks the translation aloud
7. **Extract** — Medical terms (symptoms, meds, allergies, vitals) displayed as badges

## NVIDIA Software Stack

MedInter leverages the full NVIDIA AI software stack available on the DGX Spark GB10:

| Component | Purpose |
|-----------|---------|
| **NVIDIA NIM** | Optimized LLM inference (Llama 4 Maverick) for translation + medical NER |
| **NVIDIA Riva ASR** | Real-time automatic speech recognition in 13+ languages |
| **NVIDIA Riva TTS** | Neural text-to-speech in multiple languages |
| **TensorRT-LLM** | Optimized LLM inference engine (powers NIM) |
| **TensorRT** | Deep learning inference optimizer |
| **NVIDIA NeMo** | Framework for ASR/TTS model customization |
| **TAO Toolkit** | Transfer learning for domain adaptation |
| **NVIDIA Triton** | Inference serving (used by Riva) |
| **CUDA 12.x** | GPU compute platform |
| **cuDNN** | Deep neural network library |
| **NVIDIA Container Toolkit** | GPU-accelerated Docker containers |
| **ConnectX** | High-speed networking (future multi-GB10 support) |

## GB10 Memory Budget

The DGX Spark GB10 has **128 GB unified memory** shared between CPU and GPU.

| Component | Memory (GB) | Notes |
|-----------|-------------|-------|
| Riva ASR models | ~4 | Multilingual speech recognition |
| Riva TTS models | ~2 | Neural voice synthesis |
| NIM LLM (Llama 4 Maverick) | ~38 | 4-bit quantized, TensorRT-LLM |
| MedInter app | <1 | FastAPI + frontend |
| OS + system | ~4 | DGX OS overhead |
| **Total Used** | **~48** | |
| **Available** | **~80** | For additional models, sessions |

## Supported Languages

| Language | Code | ASR | TTS |
|----------|------|-----|-----|
| 🇺🇸 English | en-US | ✅ | ✅ |
| 🇪🇸 Spanish | es-US | ✅ | ✅ |
| 🇨🇳 Mandarin Chinese | zh-CN | ✅ | ✅ |
| 🇸🇦 Arabic | ar-AR | ✅ | ✅ |
| 🇫🇷 French | fr-FR | ✅ | ✅ |
| 🇩🇪 German | de-DE | ✅ | ✅ |
| 🇮🇳 Hindi | hi-IN | ✅ | ✅ |
| 🇰🇷 Korean | ko-KR | ✅ | ✅ |
| 🇯🇵 Japanese | ja-JP | ✅ | ✅ |
| 🇧🇷 Portuguese | pt-BR | ✅ | ✅ |
| 🇷🇺 Russian | ru-RU | ✅ | ✅ |
| 🇮🇹 Italian | it-IT | ✅ | ✅ |
| 🇻🇳 Vietnamese | vi-VN | ✅ | ✅ |

## Setup Instructions

### Prerequisites

- NVIDIA DGX Spark GB10 with DGX OS
- Docker and NVIDIA Container Toolkit (pre-installed on DGX OS)
- NVIDIA NGC API key ([Get one here](https://ngc.nvidia.com/setup/api-key))

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ernietheopenclaw/medinter.git
cd medinter

# Run setup (pulls containers, builds frontend, starts everything)
chmod +x setup.sh
./setup.sh
```

### Manual Setup

#### 1. Pull NIM Container

```bash
docker login nvcr.io
# Username: $oauthtoken
# Password: <your NGC API key>

docker pull nvcr.io/nvidia/nim/meta-llama-4-maverick-17b-128e-instruct:latest
```

#### 2. Pull Riva Containers

```bash
docker pull nvcr.io/nvidia/riva/riva-speech:2.17.0
```

#### 3. Build & Start MedInter

```bash
# Build frontend
cd frontend && npm install && npm run build && cd ..

# Start all services
docker compose up -d
```

#### 4. Connect Your Phone

Choose one method:

- **Bluetooth PAN** — See [docs/bluetooth-setup.md](docs/bluetooth-setup.md)
- **WiFi Hotspot** — See [docs/wifi-hotspot-setup.md](docs/wifi-hotspot-setup.md)
- **USB-C** — Just plug in and enable USB tethering

#### 5. Open the App

Navigate to `http://<gb10-ip>:3000` on your phone's browser. Add to Home Screen for the full PWA experience.

### Demo Mode (No GPU Required)

To test the UI without Riva/NIM:

```bash
MOCK_MODE=true python -m uvicorn backend.main:app --host 0.0.0.0 --port 3000
```

## Screenshots

> *Screenshots coming soon — showing the landing page, active translation session with medical term extraction, and session summary.*

## Demo Script (5 Minutes)

### Minute 1: The Hardware
- Show the DGX Spark GB10 — compact, powerful, self-contained
- `docker compose ps` — all three services running
- `nvidia-smi` — GPU utilization, ~48GB memory used

### Minute 2: Zero Internet
- Phone connects to GB10 via Bluetooth PAN
- Show phone has NO internet (airplane mode + Bluetooth)
- Open `http://192.168.44.1:3000` — MedInter loads
- 🟢 Connected indicator

### Minute 3: Live Translation
- Select: Patient = 🇨🇳 Mandarin, Provider = 🇺🇸 English
- Patient speaks: "我胸口很痛，从昨天晚上开始的"
- Real-time transcription appears
- Translation: "My chest has been hurting badly since last night"
- Audio plays translation aloud

### Minute 4: Medical Intelligence
- Show extracted medical terms:
  - 🔴 Symptom: Chest pain
  - ⚪ Onset: Last night
- Urgency badge: HIGH
- Switch speaker — provider responds in English
- Patient hears Mandarin translation

### Minute 5: Summary & Privacy
- End session → Summary page
- Structured clinical data: chief complaint, symptoms, onset
- "Export for EMR" → copies structured text
- **Privacy notice**: "No audio was stored. No data left this device."
- Show dashboard: session count, GPU usage, all services green

## Project Structure

```
medinter/
├── backend/
│   ├── main.py                  # FastAPI server + WebSocket
│   ├── config.py                # Configuration
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Container build
│   └── services/
│       ├── asr.py               # NVIDIA Riva ASR integration
│       ├── translator.py        # NIM LLM translation + medical NER
│       ├── tts.py               # NVIDIA Riva TTS integration
│       ├── medical_ner.py       # Medical entity extraction
│       └── session_manager.py   # Session lifecycle (no persistent storage)
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   ├── lib/                     # WebSocket, audio, utilities
│   └── public/                  # PWA manifest, icons
├── docs/
│   ├── bluetooth-setup.md       # Bluetooth PAN guide
│   └── wifi-hotspot-setup.md    # WiFi hotspot guide
├── docker-compose.yml           # Full stack deployment
├── setup.sh                     # One-command setup
├── README.md
└── LICENSE (MIT)
```

## License

MIT License — See [LICENSE](LICENSE)

---

**Built for the NVIDIA DGX Spark GB10**

*MedInter is a prototype/demonstration application. It is not FDA-approved or certified for clinical use. Always use professional medical interpreters for critical clinical decisions.*
