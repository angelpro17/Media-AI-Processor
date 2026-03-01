#!/usr/bin/env bash
# Run the FastAPI backend using the conda deeplearning environment
set -e
cd "$(dirname "$0")"
echo "Starting AudioClean Pro API on http://0.0.0.0:8000"
conda run -n deeplearning uvicorn main:app --host 0.0.0.0 --port 8000 --reload
