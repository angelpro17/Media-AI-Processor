#!/usr/bin/env bash
# Run the FastAPI backend using the local venv environment
set -e
cd "$(dirname "$0")"
echo "Starting AudioClean Pro API on http://0.0.0.0:8000"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
