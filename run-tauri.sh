#!/bin/bash
# RAG App — https://github.com/ramoncalvo
# Launch Tauri app with conda env

conda activate desktop-rag 2>/dev/null || source activate desktop-rag 2>/dev/null

export CONDA_PREFIX="${CONDA_PREFIX:-/Users/rcalvo/miniconda3/envs/desktop-rag}"

cd "$(dirname "$0")"
./src-tauri/target/release/rag-app
