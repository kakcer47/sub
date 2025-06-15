// P2P API - замена Supabase
// Теперь все данные обрабатываются через WASM + IndexedDB + WebSocket

export {
  createUser,
  getEntries,
  createEntry,
  toggleLike,
  getUserPreferences,
  updateUserPreferences,
  type CreateEntryData
} from '../lib/wasm-api'

// P2P специфичные функции
export { p2pClient } from '../lib/p2p-client'
export { indexedDB } from '../lib/indexeddb'

// Инициализация P2P системы
export const initP2P = async (): Promise<void> => {
  console.log('🚀 Initializing P2P system...')
  
  try {
    // Инициализируем IndexedDB
    await indexedDB.init()
    console.log('✅ IndexedDB ready')

    // Подключаемся к P2P серверу
    await p2pClient.connect()
    console.log('✅ P2P connected')

    // Запрашиваем синхронизацию
    p2pClient.requestSync()
    console.log('✅ Sync requested')

    console.log('🎉 P2P system initialized successfully!')

  } catch (error) {
    console.error('❌ Failed to initialize P2P system:', error)
    throw error
  }
}

// Статистика P2P системы
export const getP2PStats = async () => {
  try {
    const stats = await indexedDB.getStats()
    
    return {
      ...stats,
      connected: p2pClient.connected,
      queueSize: p2pClient.queueSize,
      sizeFormatted: formatBytes(stats.size)
    }
  } catch (error) {
    console.error('❌ Failed to get P2P stats:', error)
    return null
  }
}

// Форматирование размера файла
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}