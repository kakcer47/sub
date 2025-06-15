// IndexedDB адаптер для P2P хранения

export interface StoredEntry {
  id: number
  data: Uint8Array // Сжатые данные
  timestamp: number
  synced: boolean
}

export interface StoredUser {
  telegram_id: number
  name: string
  username: string
  avatar?: string
  last_seen: number
}

class IndexedDBAdapter {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'P2P_TELEGRAM_APP'
  private readonly DB_VERSION = 1

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => {
        console.error('❌ IndexedDB failed to open')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB connected')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Хранилище постов
        if (!db.objectStoreNames.contains('entries')) {
          const entriesStore = db.createObjectStore('entries', { keyPath: 'id' })
          entriesStore.createIndex('timestamp', 'timestamp', { unique: false })
          entriesStore.createIndex('synced', 'synced', { unique: false })
        }

        // Хранилище пользователей
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'telegram_id' })
          usersStore.createIndex('last_seen', 'last_seen', { unique: false })
        }

        // Хранилище настроек
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'user_id' })
        }

        // Кэш строк (для WASM string pool)
        if (!db.objectStoreNames.contains('string_pool')) {
          db.createObjectStore('string_pool', { keyPath: 'hash' })
        }

        console.log('📦 IndexedDB schema created')
      }
    })
  }

  // Сохранение поста
  async saveEntry(entry: StoredEntry): Promise<void> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite')
      const store = transaction.objectStore('entries')
      const request = store.put(entry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Получение всех постов
  async getAllEntries(): Promise<StoredEntry[]> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readonly')
      const store = transaction.objectStore('entries')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // Получение несинхронизированных постов
  async getUnsyncedEntries(): Promise<StoredEntry[]> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readonly')
      const store = transaction.objectStore('entries')
      const index = store.index('synced')
      const request = index.getAll(false)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // Отметка поста как синхронизированного
  async markSynced(entryId: number): Promise<void> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite')
      const store = transaction.objectStore('entries')
      const getRequest = store.get(entryId)

      getRequest.onsuccess = () => {
        const entry = getRequest.result
        if (entry) {
          entry.synced = true
          const putRequest = store.put(entry)
          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          reject(new Error('Entry not found'))
        }
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  // Сохранение пользователя
  async saveUser(user: StoredUser): Promise<void> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite')
      const store = transaction.objectStore('users')
      const request = store.put(user)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Получение пользователя
  async getUser(telegramId: number): Promise<StoredUser | null> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly')
      const store = transaction.objectStore('users')
      const request = store.get(telegramId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // Сохранение строки в пул
  async saveString(hash: number, value: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['string_pool'], 'readwrite')
      const store = transaction.objectStore('string_pool')
      const request = store.put({ hash, value })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Получение строки из пула
  async getString(hash: number): Promise<string | null> {
    if (!this.db) throw new Error('DB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['string_pool'], 'readonly')
      const store = transaction.objectStore('string_pool')
      const request = store.get(hash)

      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Очистка старых данных
  async cleanup(olderThanDays: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite')
      const store = transaction.objectStore('entries')
      const index = store.index('timestamp')
      const range = IDBKeyRange.upperBound(cutoffTime)
      const request = index.openCursor(range)

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          console.log(`🧹 Cleaned up old entries older than ${olderThanDays} days`)
          resolve()
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  // Получение статистики
  async getStats(): Promise<{ entries: number; users: number; size: number }> {
    if (!this.db) throw new Error('DB not initialized')

    const [entries, users] = await Promise.all([
      this.getAllEntries(),
      new Promise<StoredUser[]>((resolve, reject) => {
        const transaction = this.db!.transaction(['users'], 'readonly')
        const store = transaction.objectStore('users')
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    ])

    // Приблизительный размер в байтах
    const size = entries.reduce((acc, entry) => acc + entry.data.length, 0)

    return {
      entries: entries.length,
      users: users.length,
      size
    }
  }
}

// Singleton instance
export const indexedDB = new IndexedDBAdapter()

// Инициализация при загрузке модуля
indexedDB.init().catch(console.error)