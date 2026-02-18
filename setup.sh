#!/bin/bash
# MedInterpret — One-command setup for NVIDIA DGX Spark GB10
set -euo pipefail

echo "╔═══════════════════════════════════════╗"
echo "║     MedInterpret — GB10 Setup         ║"
echo "║  Real-time Medical Translation        ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Install Docker first."; exit 1; }
command -v nvidia-smi >/dev/null 2>&1 || { echo "❌ NVIDIA drivers not found."; exit 1; }

echo "✅ Docker found"
echo "✅ NVIDIA GPU detected:"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
echo ""

# Login to NGC (if needed)
if ! docker pull --dry-run nvcr.io/nvidia/riva/riva-speech:2.17.0 2>/dev/null; then
    echo "📦 Logging into NVIDIA NGC..."
    echo "  Get your API key from: https://ngc.nvidia.com/setup/api-key"
    docker login nvcr.io
fi

# Build frontend
echo ""
echo "🔨 Building frontend..."
cd frontend
if command -v npm >/dev/null 2>&1; then
    npm install
    npm run build
else
    echo "⚠️  npm not found — skipping frontend build"
    echo "   Install Node.js or build frontend separately"
    mkdir -p out
fi
cd ..

# Start services
echo ""
echo "🚀 Starting MedInterpret stack..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
echo "   This may take several minutes on first run (model downloads)."

# Wait for health
for i in {1..60}; do
    if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
        echo ""
        echo "✅ MedInterpret is running!"
        echo ""
        echo "╔═══════════════════════════════════════════════════╗"
        echo "║  Open on your phone:                             ║"
        echo "║                                                   ║"
        echo "║  📱 http://$(hostname -I | awk '{print $1}'):3000            ║"
        echo "║                                                   ║"
        echo "║  Dashboard: http://$(hostname -I | awk '{print $1}'):3000/dashboard  ║"
        echo "╚═══════════════════════════════════════════════════╝"
        echo ""
        echo "Connect your phone via:"
        echo "  • Bluetooth PAN (see docs/bluetooth-setup.md)"
        echo "  • WiFi Hotspot (see docs/wifi-hotspot-setup.md)"
        echo "  • USB-C tethering"
        exit 0
    fi
    printf "."
    sleep 5
done

echo ""
echo "⚠️  Services still starting. Check: docker compose logs -f"
