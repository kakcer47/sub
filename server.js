const express = require('express');
const Gun = require('gun');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Gun.js relay
app.use(Gun.serve);

const server = app.listen(port, () => {
  console.log(`🔫 Gun.js P2P Relay running on port ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/health`);
});

// Initialize Gun
const gun = Gun({ 
  web: server,
  localStorage: false,
  radisk: false
});

// Log connections
gun.on('hi', peer => {
  console.log('🤝 Peer connected:', peer.id);
});

gun.on('bye', peer => {
  console.log('👋 Peer disconnected:', peer.id);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
