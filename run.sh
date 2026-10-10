#!/usr/bin/env bash
# ==============================================================================
# Scriptify Startup Script for Linux
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo " Starting Scriptify (AI-Powered Document Generator)"
echo "=================================================="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 could not be found. Please install Python 3.10+."
    exit 1
fi

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "[WARNING] 'ollama' CLI is not found on your PATH."
    echo "Please install Ollama from https://ollama.ai and start the service."
else
    echo "[OK] Ollama CLI detected."
fi

# Set up or activate venv if needed
if [ ! -d ".venv" ]; then
    echo "[INFO] Creating Python virtual environment in .venv..."
    python3 -m venv .venv
    echo "[INFO] Installing dependencies from requirements.txt..."
    .venv/bin/pip install -r requirements.txt
else
    # Ensure dependencies are present
    .venv/bin/pip install -r requirements.txt --quiet
fi

# Build frontend if dist is missing
if [ ! -d "Frontend/dist" ]; then
    echo "[INFO] Frontend build not found. Building frontend..."
    if command -v npm &> /dev/null; then
        (cd Frontend && npm install && npm run build)
    else
        echo "[WARNING] npm not found; skipping frontend build."
    fi
fi

echo "=================================================="
echo " Starting Scriptify server at http://127.0.0.1:8000"
echo " Press Ctrl+C to stop the server."
echo "=================================================="

exec .venv/bin/python backend/server.py

