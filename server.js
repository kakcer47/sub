// 🌟 Personal Nostr Relay Server
// Simple, lightweight Nostr relay for your social network

const express = require('express');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// ========================= DATA STORAGE =========================

class SimpleStorage {
  constructor() {
    this.events = new Map(); // eventId -> event
    this.eventsByKind = new Map(); // kind -> Set(eventIds)
    this.eventsByAuthor = new Map(); // pubkey -> Set(eventIds)
    this.eventsByTag = new Map(); // tag -> Set(eventIds)

    // Load existing data
    this.loadData();

    // Auto-save every 30 seconds
    setInterval(() => this.saveData(), 30000);
  }

  saveData() {
    try {
      const data = {
        events: Array.from(this.events.entries()),
        eventsByKind: Array.from(this.eventsByKind.entries()).map(([k, v]) => [k, Array.from(v)]),
        eventsByAuthor: Array.from(this.eventsByAuthor.entries()).map(([k, v]) => [k, Array.from(v)]),
        eventsByTag: Array.from(this.eventsByTag.entries()).map(([k, v]) => [k, Array.from(v)])
      };

      fs.writeFileSync('nostr-data.json', JSON.stringify(data, null, 2));
      console.log('💾 Data saved to disk');
    } catch (error) {
      console.error('❌ Failed to save data:', error);
    }
  }

  loadData() {
    try {
      if (fs.existsSync('nostr-data.json')) {
        const data = JSON.parse(fs.readFileSync('nostr-data.json', 'utf8'));

        this.events = new Map(data.events || []);
        this.eventsByKind = new Map((data.eventsByKind || []).map(([k, v]) => [k, new Set(v)]));
        this.eventsByAuthor = new Map((data.eventsByAuthor || []).map(([k, v]) => [k, new Set(v)]));
        this.eventsByTag = new Map((data.eventsByTag || []).map(([k, v]) => [k, new Set(v)]));

        console.log(`📚 Loaded ${this.events.size} events from disk`);
      }
    } catch (error) {
      console.error('❌ Failed to load data:', error);
    }
  }

  addEvent(event) {
    // Store event
    this.events.set(event.id, event);

    // Index by kind
    if (!this.eventsByKind.has(event.kind)) {
      this.eventsByKind.set(event.kind, new Set());
    }
    this.eventsByKind.get(event.kind).add(event.id);

    // Index by author
    if (!this.eventsByAuthor.has(event.pubkey)) {
      this.eventsByAuthor.set(event.pubkey, new Set());
    }
    this.eventsByAuthor.get(event.pubkey).add(event.id);

    // Index by tags
    event.tags.forEach(tag => {
      const tagKey = `${tag[0]}:${tag[1] || ''}`;
      if (!this.eventsByTag.has(tagKey)) {
        this.eventsByTag.set(tagKey, new Set());
      }
      this.eventsByTag.get(tagKey).add(event.id);
    });

    console.log(`📨 Stored event ${event.id.slice(0, 8)}... (kind: ${event.kind})`);
  }

  deleteEvent(eventId) {
    const event = this.events.get(eventId);
    if (!event) return false;

    // Удаляем из основного хранилища
    this.events.delete(eventId);

    // Удаляем из индексов
    const kindSet = this.eventsByKind.get(event.kind);
    if (kindSet) kindSet.delete(eventId);

    const authorSet = this.eventsByAuthor.get(event.pubkey);
    if (authorSet) authorSet.delete(eventId);

    // Удаляем из тегов
    event.tags.forEach(tag => {
      const tagKey = `${tag[0]}:${tag[1] || ''}`;
      const tagSet = this.eventsByTag.get(tagKey);
      if (tagSet) tagSet.delete(eventId);
    });

    console.log(`🗑️ Deleted event ${eventId.slice(0, 8)}...`);
    return true;
  }

  queryEvents(filter) {
    let results = new Set();
    let isFirstFilter = true;

    // Filter by kinds
    if (filter.kinds) {
      const kindResults = new Set();
      filter.kinds.forEach(kind => {
        const events = this.eventsByKind.get(kind) || new Set();
        events.forEach(id => kindResults.add(id));
      });

      if (isFirstFilter) {
        results = kindResults;
        isFirstFilter = false;
      } else {
        results = new Set([...results].filter(id => kindResults.has(id)));
      }
    }

    // Filter by authors
    if (filter.authors) {
      const authorResults = new Set();
      filter.authors.forEach(pubkey => {
        const events = this.eventsByAuthor.get(pubkey) || new Set();
        events.forEach(id => authorResults.add(id));
      });

      if (isFirstFilter) {
        results = authorResults;
        isFirstFilter = false;
      } else {
        results = new Set([...results].filter(id => authorResults.has(id)));
      }
    }

    // Filter by tags
    Object.keys(filter).forEach(key => {
      if (key.startsWith('#')) {
        const tagName = key.slice(1);
        const tagValues = filter[key];
        const tagResults = new Set();

        tagValues.forEach(value => {
          const tagKey = `${tagName}:${value}`;
          const events = this.eventsByTag.get(tagKey) || new Set();
          events.forEach(id => tagResults.add(id));
        });

        if (isFirstFilter) {
          results = tagResults;
          isFirstFilter = false;
        } else {
          results = new Set([...results].filter(id => tagResults.has(id)));
        }
      }
    });

    // If no specific filters, get all events
    if (isFirstFilter) {
      results = new Set(this.events.keys());
    }

    // Convert to events and apply additional filters
    let events = Array.from(results)
      .map(id => this.events.get(id))
      .filter(event => event);

    // Filter by time
    if (filter.since) {
      events = events.filter(event => event.created_at >= filter.since);
    }
    if (filter.until) {
      events = events.filter(event => event.created_at <= filter.until);
    }

    // Sort by created_at (newest first)
    events.sort((a, b) => b.created_at - a.created_at);

    // Apply limit
    if (filter.limit) {
      events = events.slice(0, filter.limit);
    }

    return events;
  }
}

const storage = new SimpleStorage();

// ========================= NOSTR PROTOCOL HANDLERS =========================

function verifyEvent(event) {
  // Basic event structure validation
  if (!event.id || !event.pubkey || !event.created_at || !event.kind || !event.sig) {
    return false;
  }

  // Verify event ID matches content hash
  const eventData = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags || [],
    event.content || ''
  ]);

  const hash = crypto.createHash('sha256').update(eventData).digest('hex');
  return hash === event.id;
}

function handleMessage(ws, message) {
  try {
    const data = JSON.parse(message);
    const [type, ...args] = data;

    switch (type) {
      case 'EVENT':
        handleEvent(ws, args[0]);
        break;

      case 'REQ':
        handleRequest(ws, args[0], ...args.slice(1));
        break;

      case 'CLOSE':
        handleClose(ws, args[0]);
        break;

      default:
        console.log('Unknown message type:', type);
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    ws.send(JSON.stringify(['NOTICE', 'Error parsing message']));
  }
}

function handleEvent(ws, event) {
  // Verify event
  if (!verifyEvent(event)) {
    ws.send(JSON.stringify(['OK', event.id, false, 'invalid event']));
    return;
  }

  // ✅ ДОБАВЬ ЭТУ ПРОВЕРКУ:
  if (event.kind === 5) {
    // Обработка delete event
    const deletedIds = event.tags
      .filter(tag => tag[0] === 'e')
      .map(tag => tag[1]);

    deletedIds.forEach(postId => {
      if (storage.deleteEvent(postId)) {
        console.log(`🗑️ Processed delete for: ${postId.slice(0, 8)}...`);
      }
    });

    // Сохраняем delete event
    storage.addEvent(event);
    ws.send(JSON.stringify(['OK', event.id, true, 'delete processed']));

    // ✅ ДОБАВЬ ЭТО - broadcast delete event:
    wss.clients.forEach(client => {
      if (client.readyState === client.OPEN && client.subscriptions) {
        client.subscriptions.forEach((filters, subId) => {
          filters.forEach(filter => {
            if (matchesFilter(event, filter)) {
              client.send(JSON.stringify(['EVENT', subId, event]));
            }
          });
        });
      }
    });

    return;
  }

  // Check if event already exists
  if (storage.events.has(event.id)) {
    ws.send(JSON.stringify(['OK', event.id, true, 'duplicate event']));
    return;
  }

  // Store regular event
  storage.addEvent(event);

  // Send OK response
  ws.send(JSON.stringify(['OK', event.id, true, '']));

  // Broadcast to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN && client.subscriptions) {
      client.subscriptions.forEach((filters, subId) => {
        filters.forEach(filter => {
          if (matchesFilter(event, filter)) {
            client.send(JSON.stringify(['EVENT', subId, event]));
          }
        });
      });
    }
  });

  console.log(`✅ Accepted event ${event.id.slice(0, 8)}... from ${event.pubkey.slice(0, 8)}...`);
}

function handleRequest(ws, subscriptionId, ...filters) {
  console.log(`🔍 REQ ${subscriptionId} with ${filters.length} filters`);

  // Store subscription for this client
  if (!ws.subscriptions) {
    ws.subscriptions = new Map();
  }
  ws.subscriptions.set(subscriptionId, filters);

  // Query and send matching events
  const allEvents = new Set();

  filters.forEach(filter => {
    const events = storage.queryEvents(filter);
    events.forEach(event => allEvents.add(event));
  });

  // Send events
  Array.from(allEvents).forEach(event => {
    ws.send(JSON.stringify(['EVENT', subscriptionId, event]));
  });

  // Send EOSE (End of Stored Events)
  ws.send(JSON.stringify(['EOSE', subscriptionId]));

  console.log(`📤 Sent ${allEvents.size} events for subscription ${subscriptionId}`);
}

function handleClose(ws, subscriptionId) {
  if (ws.subscriptions) {
    ws.subscriptions.delete(subscriptionId);
  }
  console.log(`❌ Closed subscription ${subscriptionId}`);
}

function matchesFilter(event, filter) {
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false;

  // Проверка тегов
  for (const key in filter) {
    if (key.startsWith('#')) {
      const tagName = key.slice(1);
      const values = filter[key];
      const matches = event.tags.some(tag => tag[0] === tagName && values.includes(tag[1]));
      if (!matches) return false;
    }
  }

  if (filter.since && event.created_at < filter.since) return false;
  if (filter.until && event.created_at > filter.until) return false;

  return true;
}

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

// ========================= EXPRESS SETUP =========================

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    relay: 'nostr',
    events: storage.events.size,
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Relay info endpoint (NIP-11)
app.get('/', (req, res) => {
  if (req.headers.accept === 'application/nostr+json') {
    res.json({
      name: "Personal Nostr Relay",
      description: "Private relay for P2P social network",
      pubkey: "",
      contact: "",
      supported_nips: [1, 2, 9, 11, 12, 15, 16, 20, 22],
      software: "custom-relay",
      version: "1.0.0"
    });
  } else {
    res.send(`
      <html>
        <head><title>Personal Nostr Relay</title></head>
        <body>
          <h1>🌟 Personal Nostr Relay</h1>
          <p>Status: <strong>Online</strong></p>
          <p>Events stored: <strong>${storage.events.size}</strong></p>
          <p>WebSocket endpoint: <code>wss://${req.headers.host}</code></p>
          <p>Health check: <a href="/health">/health</a></p>
        </body>
      </html>
    `);
  }
});

// Start HTTP server
const server = app.listen(port, () => {
  console.log(`🌟 Personal Nostr Relay running on port ${port}`);
  console.log(`🌐 HTTP: http://localhost:${port}`);
  console.log(`🔌 WebSocket: ws://localhost:${port}`);
});

// ========================= WEBSOCKET SETUP =========================

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log(`🤝 New client connected from ${req.socket.remoteAddress}`);

  ws.subscriptions = new Map();

  ws.on('message', (data) => {
    handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    console.log('👋 Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify(['NOTICE', 'Connected to Personal Nostr Relay']));
});

// ========================= GRACEFUL SHUTDOWN =========================

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  storage.saveData();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  storage.saveData();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Auto-save on exit
process.on('exit', () => {
  storage.saveData();
});

console.log('🚀 Personal Nostr Relay initialized');
console.log('📝 Data will be saved to: nostr-data.json');
console.log('💾 Auto-save interval: 30 seconds');
