#!/bin/bash
# Desktop Build Instructions for Bright Audio Warehouse

# This script builds a desktop application that can be:
# 1. Downloaded from bright-audio.com/download
# 2. Installed on Windows, macOS, or Linux
# 3. Run offline with local SQLite database
# 4. Synced back to Supabase when online

set -e

echo "🔨 Building Bright Audio Desktop Application..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Step 2: Build Next.js application
echo "🏗️  Building Next.js production bundle..."
npm run build

# Step 3: Copy database schema
echo "📋 Copying database schema..."
npm run copy:sql

# Step 4: Compile Electron TypeScript
echo "⚙️  Compiling Electron main process..."
npm run electron:compile

# Step 5: Build installers for all platforms or specified platform
PLATFORM=${1:-all}

case $PLATFORM in
  windows|win32)
    echo "🪟 Building Windows installer (.exe)..."
    npm run electron:build -- --win
    echo "✅ Windows installer created in dist/Bright-Audio-Warehouse-Setup-*.exe"
    ;;
  mac|darwin)
    echo "🍎 Building macOS installer (.dmg)..."
    npm run electron:build -- --mac
    echo "✅ macOS installer created in dist/Bright-Audio-Warehouse-*.dmg"
    ;;
  linux)
    echo "🐧 Building Linux AppImage..."
    npm run electron:build -- --linux
    echo "✅ Linux AppImage created in dist/Bright-Audio-Warehouse-*.AppImage"
    ;;
  all)
    echo "🌍 Building for all platforms..."
    npm run electron:build
    echo "✅ Installers created in dist/ for all platforms"
    ;;
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Usage: ./build-desktop.sh [windows|mac|linux|all]"
    exit 1
    ;;
esac

echo ""
echo "📦 Build complete!"
echo ""
echo "Artifacts:"
ls -lh dist/Bright-Audio-Warehouse* 2>/dev/null || echo "Check dist/ folder"

echo ""
echo "🚀 Next steps:"
echo "1. Test installer on fresh system (virtual machine recommended)"
echo "2. Sign binaries with certificate (Windows/macOS)"
echo "3. Upload to https://bright-audio.com/releases/"
echo "4. Create GitHub release with changelog"
echo "5. Deploy new version to production"

