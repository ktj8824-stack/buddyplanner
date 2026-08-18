#!/bin/sh
set -e

echo "=== Xcode Cloud: ci_post_clone.sh ==="
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

# Homebrew 경로 설정
export HOMEBREW_NO_INSTALL_CLEANUP=1
eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)"

# Node.js 설치
echo "Installing Node.js..."
brew install node || echo "Node.js already installed"

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# 프로젝트 루트로 이동
cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Current directory: $(pwd)"
echo "Contents:"
ls -la

# NPM 의존성 설치
echo "Installing NPM dependencies..."
npm install --legacy-peer-deps

# Capacitor iOS 동기화 (www 폴더를 iOS 프로젝트에 복사)
echo "Syncing Capacitor iOS..."
npx cap copy ios

echo "=== ci_post_clone.sh completed successfully ==="
