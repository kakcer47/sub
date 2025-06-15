#!/bin/bash

echo "🦀 Building WASM module..."

# Проверяем есть ли wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack not found. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    source ~/.cargo/env
fi

# Создаем папку для вывода
mkdir -p ../src/lib/wasm-engine

# Собираем WASM модуль
echo "🔧 Building with wasm-pack..."
wasm-pack build --target web --out-dir ../src/lib/wasm-engine --no-typescript

# Проверяем что всё собралось
if [ -f "../src/lib/wasm-engine/wasm_engine.js" ]; then
    echo "✅ WASM module built successfully!"
    echo "📁 Files created in src/lib/wasm-engine/"
    ls -la ../src/lib/wasm-engine/
else
    echo "❌ WASM build failed!"
    echo "🔍 Checking for errors..."
    exit 1
fi

echo "🎉 WASM build complete!"