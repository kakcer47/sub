#!/bin/bash

echo "🚀 Настройка P2P Telegram Mini App"
echo "=================================="

# Проверяем системные требования
echo "🔍 Проверка системных требований..."

# Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js 18+"
    exit 1
fi

# Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust не найден. Установка Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    source ~/.cargo/env
fi

# wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "📦 Установка wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

echo "✅ Системные требования выполнены"

# Установка зависимостей Node.js
echo "📦 Установка Node.js зависимостей..."
npm install

# Создание структуры папок
echo "📁 Создание структуры папок..."
mkdir -p src/lib/wasm-engine
mkdir -p wasm/pkg
mkdir -p server/src

# Сборка WASM модуля
echo "🦀 Сборка WASM модуля..."
cd wasm
chmod +x build.sh
./build.sh
cd ..

# Сборка сервера
echo "🔧 Сборка P2P сервера..."
cd server
cargo build --release
cd ..

# Очистка старых файлов
echo "🧹 Очистка..."
rm -f src/lib/supabase.ts 2>/dev/null || true

# Создание .env файла (если не существует)
if [ ! -f .env ]; then
    echo "⚙️ Создание .env файла..."
    cat > .env << EOF
# P2P Configuration
VITE_P2P_SERVER_URL=ws://localhost:8080/ws
VITE_APP_NAME=P2P Telegram App
VITE_DEBUG=true
EOF
    echo "✅ Создан .env файл"
fi

# Обновление package.json скриптов
echo "📝 Обновление скриптов..."

echo "🎉 Установка завершена!"
echo ""
echo "🚀 Для запуска:"
echo "  npm run dev:full    # Полный стек (сервер + клиент)"
echo "  npm run server      # Только P2P сервер"
echo "  npm run dev         # Только клиент"
echo ""
echo "📊 Статистика сервера: http://localhost:8080/stats"
echo "🏥 Проверка здоровья: http://localhost:8080/health"
echo ""
echo "🔥 P2P система готова к работе!"