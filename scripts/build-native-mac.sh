#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_ROOT="${PROJECT_ROOT}/build/native"
APP_PATH="${PROJECT_ROOT}/release/native/园丁桌宠.app"
ZIP_PATH="${PROJECT_ROOT}/release/Gardener-Desktop-Pet-macOS.zip"
SDK_PATH="$(xcrun --show-sdk-path)"

mkdir -p "${BUILD_ROOT}/arm64" "${BUILD_ROOT}/x64" "$(dirname "${APP_PATH}")"

xcrun clang -O2 -fobjc-arc -target arm64-apple-macos13.0 -isysroot "${SDK_PATH}" \
  -framework AppKit -framework Foundation "${PROJECT_ROOT}/native/main.m" \
  -o "${BUILD_ROOT}/arm64/GardenerPet"
xcrun clang -O2 -fobjc-arc -target x86_64-apple-macos13.0 -isysroot "${SDK_PATH}" \
  -framework AppKit -framework Foundation "${PROJECT_ROOT}/native/main.m" \
  -o "${BUILD_ROOT}/x64/GardenerPet"

rm -rf "${APP_PATH}"
mkdir -p "${APP_PATH}/Contents/MacOS" "${APP_PATH}/Contents/Resources/assets"
lipo -create "${BUILD_ROOT}/arm64/GardenerPet" "${BUILD_ROOT}/x64/GardenerPet" \
  -output "${APP_PATH}/Contents/MacOS/GardenerPet"
cp "${PROJECT_ROOT}/native/Info.plist" "${APP_PATH}/Contents/Info.plist"
cp "${PROJECT_ROOT}"/assets/gardener-{idle,working,complete}.png "${APP_PATH}/Contents/Resources/assets/"
cp "${PROJECT_ROOT}/assets/icon.png" "${APP_PATH}/Contents/Resources/icon.png"

codesign --force --deep --sign - "${APP_PATH}"
rm -f "${ZIP_PATH}"
ditto -c -k --sequesterRsrc --keepParent "${APP_PATH}" "${ZIP_PATH}"

echo "${APP_PATH}"
echo "${ZIP_PATH}"
