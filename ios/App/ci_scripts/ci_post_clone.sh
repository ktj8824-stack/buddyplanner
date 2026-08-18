#!/bin/sh
set -e

echo "=== Xcode Cloud: ci_post_clone.sh ==="

# Node.js 설치
echo "Installing Node.js..."
brew install node@20
brew link node@20 --force

# 프로젝트 루트로 이동
cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# NPM 의존성 설치
echo "Installing NPM dependencies..."
npm install --legacy-peer-deps

# Capacitor iOS 동기화
echo "Syncing Capacitor iOS..."
npx cap sync ios

echo "=== ci_post_clone.sh completed ==="
