import { indexedDB } from './indexeddb'
import { config } from './config'

export interface P2PMessage {
  type: 'sync_request' | 'sync_response' | 'new_entry' | 'ping' | 'pong'
  data?: any
  timestamp: number
  sender_id?: number
}

class P2PClient {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private isConnected = false
  private messageQueue: P2PMessage[] = []
  private listeners: Map<string, ((data: any) => void)[]> = new Map()
  private reconnectAttempts = 0

  constructor() {
    console.log('🔌 P2P Client initialized')
    console.log('📡 Will connect to:', config.p2pServerUrl)
  }

  // Подключение к серверу
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to P2P server: ${config.p2pServerUrl}`)
        this.ws = new WebSocket(config.p2pServerUrl)

        this.ws.onopen = () => {
          console.log('✅ P2P connected successfully!')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.startPing()
          this.flushMessageQueue()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onclose = () => {
          console.log('❌ P2P disconnected')
          this.isConnected = false
          this.stopPing()
          this.scheduleReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('❌ P2P connection error:', error)
          console.error('🔍 Check if server is running at:', config.p2pServerUrl)
          reject(error)
        }

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error)
        reject(error)
      }
    })
  }

  // Отправка сообщения
  send(message: P2PMessage): void {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error('❌ Failed to send message:', error)
        this.messageQueue.push(message)
      }
    } else {
      // Добавляем в очередь если не подключены
      this.messageQueue.push(message)
      console.log(`📤 Queued message (queue size: ${this.messageQueue.length})`)
    }
  }

  // Отправка нового поста в сеть
  broadcastNewEntry(entryData: any): void {
    const message: P2PMessage = {
      type: 'new_entry',
      data: entryData,
      timestamp: Date.now(),
      sender_id: entryData.creator_id
    }
    this.send(message)
    console.log('📡 Broadcasting new entry:', entryData.title)
  }

  // Запрос синхронизации
  requestSync(): void {
    const message: P2PMessage = {
      type: 'sync_request',
      timestamp: Date.now()
    }
    this.send(message)
    console.log('🔄 Requesting sync')
  }

  // Ответ на запрос синхронизации
  async respondToSyncRequest(): Promise<void> {
    try {
      const unsyncedEntries = await indexedDB.getUnsyncedEntries()
      
      if (unsyncedEntries.length > 0) {
        const message: P2PMessage = {
          type: 'sync_response',
          data: unsyncedEntries,
          timestamp: Date.now()
        }
        this.send(message)
        console.log(`📤 Sent ${unsyncedEntries.length} unsynced entries`)
      }
    } catch (error) {
      console.error('❌ Failed to respond to sync:', error)
    }
  }

  // Обработка входящих сообщений
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message: P2PMessage = JSON.parse(event.data)
      
      console.log(`📨 Received ${message.type} message`)

      switch (message.type) {
        case 'sync_request':
          await this.respondToSyncRequest()
          break

        case 'sync_response':
          await this.handleSyncResponse(message.data)
          break

        case 'new_entry':
          await this.handleNewEntry(message.data)
          break

        case 'ping':
          this.send({ type: 'pong', timestamp: Date.now() })
          break

        case 'pong':
          // Пинг получен
          break

        default:
          console.warn('❓ Unknown message type:', message.type)
      }

      // Уведомляем слушателей
      this.emit(message.type, message.data)

    } catch (error) {
      console.error('❌ Failed to handle message:', error)
    }
  }

  // Обработка ответа синхронизации
  private async handleSyncResponse(entries: any[]): Promise<void> {
    try {
      console.log(`📥 Received ${entries.length} entries from sync`)
      
      for (const entry of entries) {
        await indexedDB.saveEntry(entry)
      }

      this.emit('sync_complete', entries.length)
    } catch (error) {
      console.error('❌ Failed to handle sync response:', error)
    }
  }

  // Обработка нового поста
  private async handleNewEntry(entryData: any): Promise<void> {
    try {
      console.log('📝 New entry received:', entryData.title)
      
      // Сохраняем в IndexedDB
      const storedEntry = {
        id: entryData.id,
        data: new Uint8Array(JSON.stringify(entryData).split('').map(c => c.charCodeAt(0))),
        timestamp: Date.now(),
        synced: true
      }
      
      await indexedDB.saveEntry(storedEntry)
      
      this.emit('new_entry', entryData)
    } catch (error) {
      console.error('❌ Failed to handle new entry:', error)
    }
  }

  // Очистка очереди сообщений
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
    console.log('📤 Message queue flushed')
  }

  // Автоматический пинг
  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', timestamp: Date.now() })
      }
    }, 30000) // Каждые 30 секунд
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  // Автоматическое переподключение
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(async () => {
      console.log('🔄 Attempting to reconnect...')
      try {
        await this.connect()
        this.reconnectTimer = null
      } catch (error) {
        console.error('❌ Reconnect failed:', error)
        this.scheduleReconnect() // Повторяем попытку
      }
    }, 5000) // Через 5 секунд
  }

  // Подписка на события
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  // Отписка от событий
  off(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // Генерация события
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('❌ Listener error:', error)
        }
      })
    }
  }

  // Отключение
  disconnect(): void {
    this.isConnected = false
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    this.stopPing()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    console.log('🔌 P2P client disconnected')
  }

  // Статус подключения
  get connected(): boolean {
    return this.isConnected
  }

  // Размер очереди
  get queueSize(): number {
    return this.messageQueue.length
  }
}

// Экспорт singleton
export const p2pClient = new P2PClient()