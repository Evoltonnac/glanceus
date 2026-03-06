#!/bin/bash
# 打包脚本：先用 PyInstaller 打包 Python 后端，再构建 Tauri 应用
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TAURI_BINARIES_DIR="$PROJECT_ROOT/ui-react/src-tauri/binaries"

echo "=== Glancier 打包脚本 ==="

# 检测当前平台的 Tauri target triple
ARCH=$(uname -m)
OS=$(uname -s)

case "$OS" in
    Darwin)
        case "$ARCH" in
            arm64) TARGET_TRIPLE="aarch64-apple-darwin" ;;
            x86_64) TARGET_TRIPLE="x86_64-apple-darwin" ;;
        esac
        ;;
    Linux)
        case "$ARCH" in
            x86_64) TARGET_TRIPLE="x86_64-unknown-linux-gnu" ;;
            aarch64) TARGET_TRIPLE="aarch64-unknown-linux-gnu" ;;
        esac
        ;;
esac

echo "📦 平台: $TARGET_TRIPLE"

# Step 1: PyInstaller 打包 Python 后端
echo ""
echo "=== Step 1: 打包 Python 后端 ==="
cd "$PROJECT_ROOT"

pyinstaller \
    --onefile \
    --name "glancier-server" \
    --add-data "config:config" \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.loops.auto \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import uvicorn.lifespan.on \
    main.py

echo "✅ Python 后端打包完成"

# Step 2: 复制到 Tauri binaries 目录（带 target triple 后缀）
echo ""
echo "=== Step 2: 复制到 Tauri binaries ==="
mkdir -p "$TAURI_BINARIES_DIR"

SIDECAR_NAME="glancier-server-$TARGET_TRIPLE"
cp "$PROJECT_ROOT/dist/glancier-server" "$TAURI_BINARIES_DIR/$SIDECAR_NAME"
chmod +x "$TAURI_BINARIES_DIR/$SIDECAR_NAME"

echo "✅ 已复制: binaries/$SIDECAR_NAME"

# Step 3: 构建 Tauri 应用
echo ""
echo "=== Step 3: 构建 Tauri 应用 ==="
cd "$PROJECT_ROOT/ui-react"

source "$HOME/.cargo/env" 2>/dev/null || true

# 临时修改 tauri.conf.json,添加 externalBin
TAURI_CONF="$PROJECT_ROOT/ui-react/src-tauri/tauri.conf.json"
cp "$TAURI_CONF" "$TAURI_CONF.backup"

# 使用 jq 添加 externalBin 配置
if command -v jq &> /dev/null; then
    jq '.bundle.externalBin = ["binaries/glancier-server"]' "$TAURI_CONF.backup" > "$TAURI_CONF"
else
    # 如果没有 jq,使用 sed (不太优雅但能工作)
    sed -i.tmp 's/"icon":/&\n        "externalBin": ["binaries\/glancier-server"],/' "$TAURI_CONF"
    rm -f "$TAURI_CONF.tmp"
fi

# 执行构建
npx @tauri-apps/cli@latest build

# 恢复原配置
mv "$TAURI_CONF.backup" "$TAURI_CONF"

echo ""
echo "=== ✅ 打包完成！==="
echo "产物位于: ui-react/src-tauri/target/release/bundle/"
