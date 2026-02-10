#!/bin/bash

# Neuro-LENS Backend Startup Script

set -e

echo "🧬 Neuro-LENS Backend Startup"
echo "=============================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "   Copying from .env.example..."
    cp .env.example .env
    echo "   ⚠️  Please edit .env with your Google OAuth credentials"
    echo ""
    read -p "Press Enter to continue (or Ctrl+C to exit and configure .env)"
fi

# Create cache directories
echo "📁 Creating cache directories..."
mkdir -p cache/gwas cache/vcf

# Run the server
echo ""
echo "🚀 Starting FastAPI server..."
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
