#!/bin/bash
set -euo pipefail

REPO="iisland2008/identity-v-gardener-desktop-pet"
APP_NAME="园丁桌宠.app"

case "$(uname -m)" in
  arm64) RELEASE_ARCH="arm64" ;;
  x86_64) RELEASE_ARCH="x64" ;;
  *)
    echo "暂不支持当前 Mac 架构：$(uname -m)" >&2
    exit 1
    ;;
esac

DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/Gardener-Desktop-Pet-${RELEASE_ARCH}.zip"
INSTALL_ROOT="${GARDENER_INSTALL_ROOT:-${HOME}/Applications}"
INSTALL_PATH="${INSTALL_ROOT}/${APP_NAME}"
TEMP_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "${TEMP_ROOT}"
}
trap cleanup EXIT

echo "正在下载园丁桌宠……"
curl -fL --progress-bar "${DOWNLOAD_URL}" -o "${TEMP_ROOT}/gardener.zip"
ditto -x -k "${TEMP_ROOT}/gardener.zip" "${TEMP_ROOT}/unpacked"

SOURCE_APP="$(find "${TEMP_ROOT}/unpacked" -maxdepth 1 -name '*.app' -print -quit)"
if [[ -z "${SOURCE_APP}" ]]; then
  echo "下载包中没有找到应用程序。" >&2
  exit 1
fi

mkdir -p "${INSTALL_ROOT}"
ditto "${SOURCE_APP}" "${INSTALL_PATH}"
xattr -dr com.apple.quarantine "${INSTALL_PATH}" 2>/dev/null || true

echo "已安装到：${INSTALL_PATH}"
if [[ "${GARDENER_SKIP_OPEN:-0}" != "1" ]]; then
  open "${INSTALL_PATH}"
  echo "园丁桌宠已启动。"
fi
