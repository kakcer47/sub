const express = require('express');
const Gun = require('gun');
const cors = require('cors');
const http = require('http');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime(),
    gun: 'enabled'
  });
});

// Gun.js endpoint - ВАЖНО: должен быть ПЕРЕД app.use(Gun.serve)
app.get('/gun', (req, res) => {
  res.json({
    status: 'Gun.js relay ready',
    endpoint: '/gun',
    peers: 'active'
  });
});

// Gun.js middleware - ДОЛЖЕН быть после /gun route
app.use(Gun.serve);

// Создаем HTTP сервер для поддержки WebSocket
const server = http.createServer(app);

// Инициализируем Gun с правильными настройками для P2P
const gun = Gun({ 
  web: server,        // HTTP сервер для WebSocket
  localStorage: false, // Отключаем на сервере
  radisk: false,      // Отключаем на сервере
  
  // Настройки для P2P relay
  peers: [],          // Сервер не подключается к другим peers
  multicast: false,   // Отключаем multicast на сервере
  
  // Дополнительные настройки
  until: 250,         // Задержка записи для оптимизации
  wait: 99            // Время ожидания
});

// Подробное логирование для отладки
gun.on('hi', (peer) => {
  console.log('🤝 Peer connected:', peer.id || 'unknown');
  console.log('📊 Active connections:', Object.keys(gun.back('opt.peers') || {}).length);
});

gun.on('bye', (peer) => {
  console.log('👋 Peer disconnected:', peer.id || 'unknown');
});

// Логирование данных (для отладки)
gun.on('in', (msg) => {
  if (msg.put && Object.keys(msg.put).length > 0) {
    console.log('📥 Data received:', Object.keys(msg.put).length, 'items');
  }
});

gun.on('out', (msg) => {
  if (msg.put && Object.keys(msg.put).length > 0) {
    console.log('📤 Data sent:', Object.keys(msg.put).length, 'items');
  }
});

// Запуск сервера с поддержкой WebSocket
server.listen(port, () => {
  console.log(`🔫 Gun.js P2P Relay running on port ${port}`);
  console.log(`🌐 HTTP: http://localhost:${port}`);
  console.log(`🔌 WebSocket: ws://localhost:${port}/gun`);
  console.log(`❤️ Health check: http://localhost:${port}/health`);
  console.log(`🎯 Gun endpoint: http://localhost:${port}/gun`);
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Периодическая статистика
setInterval(() => {
  try {
    const peers = gun.back('opt.peers') || {};
    const peerCount = Object.keys(peers).length;
    console.log(`📊 Active peers: ${peerCount}`);
  } catch (e) {
    console.log('📊 Peer count check failed');
  }
}, 60000); // Каждую минуту
