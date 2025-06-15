import { Entry, User, UserPreferences, Filters, SortType, TelegramUser } from '../types'
import { indexedDB } from './indexeddb'
import { p2pClient } from './p2p-client'

// Загружаем WASM модуль
let wasmEngine: any = null

async function initWasm() {
  if (wasmEngine) return wasmEngine

  try {
    console.log('🦀 Loading WASM module...')
    
    // Динамический импорт WASM модуля
    const wasmModule = await import('./wasm-engine/wasm_engine.js')
    await wasmModule.default() // Инициализация WASM
    
    const { WasmEngine } = wasmModule
    wasmEngine = new WasmEngine()
    
    console.log('✅ WASM Engine loaded successfully')
    return wasmEngine
    
  } catch (error) {
    console.error('❌ Failed to load WASM:', error)
    console.warn('📋 Using fallback memory storage instead of WASM')
    
    // Fallback на память если WASM не загружается
    return createFallbackEngine()
  }
}

export interface CreateEntryData {
  title: string
  description: string
  city?: string | null
  type: string[]
  gender?: string | null
  date?: string | null
  creator_id: number
}

// Fallback движок для случаев когда WASM не работает
function createFallbackEngine() {
  console.warn('⚠️ Using fallback engine - data will not be compressed')
  
  // Простое хранилище в памяти
  const memoryStorage: any[] = []
  
  return {
    create_post: (data: any) => {
      const post = {
        ...JSON.parse(data),
        id: Date.now()
      }
      memoryStorage.push(post)
      return JSON.stringify(post)
    },
    
    get_posts: () => {
      return JSON.stringify(memoryStorage)
    },
    
    toggle_like: (postId: number, userId: number) => {
      const post = memoryStorage.find(p => p.id === postId)
      if (post) {
        post.liked_by = post.liked_by || []
        const index = post.liked_by.indexOf(userId)
        if (index > -1) {
          post.liked_by.splice(index, 1)
        } else {
          post.liked_by.push(userId)
        }
      }
      return JSON.stringify({})
    },
    
    get_stats: () => {
      return JSON.stringify({
        posts_count: memoryStorage.length,
        memory_usage: memoryStorage.length * 1000 // примерно
      })
    }
  }
}

// Временное хранилище пользователей (замена БД)
const userCache = new Map<number, User>()

export const createUser = async (telegramUser: TelegramUser): Promise<User> => {
  const user: User = {
    id: telegramUser.id,
    telegram_id: telegramUser.id,
    name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
    username: telegramUser.username || 'Anonymous',
    avatar: telegramUser.photo_url,
    created_at: new Date().toISOString()
  }

  // Сохраняем в кэш и IndexedDB
  userCache.set(user.telegram_id, user)
  
  try {
    await indexedDB.saveUser({
      telegram_id: user.telegram_id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      last_seen: Date.now()
    })
  } catch (error) {
    console.error('❌ Failed to save user to IndexedDB:', error)
  }

  console.log('✅ User created/cached:', user.name)
  return user
}

export const getEntries = async (
  filters: Filters,
  sortType: SortType,
  page: number = 0,
  userId?: number
): Promise<Entry[]> => {
  try {
    // Инициализируем WASM если нужно
    const engine = await initWasm()
    
    // Получаем посты из WASM
    const result = engine.get_posts()
    let entries: Entry[] = JSON.parse(result)

    console.log(`📄 Got ${entries.length} entries from WASM`)

    // Применяем фильтры
    entries = applyFilters(entries, filters)

    // Применяем сортировку
    entries = applySorting(entries, sortType, userId)

    // Пагинация
    const limit = 25
    const offset = page * limit
    const paginatedEntries = entries.slice(offset, offset + limit)

    console.log(`📄 Returning ${paginatedEntries.length} entries (page ${page})`)
    return paginatedEntries

  } catch (error) {
    console.error('❌ Failed to get entries:', error)
    return []
  }
}

export const createEntry = async (entryData: CreateEntryData): Promise<Entry> => {
  try {
    const engine = await initWasm()

    // Создаем полный объект поста
    const fullEntry: Entry = {
      id: Date.now(), // Временный ID
      title: entryData.title,
      description: entryData.description,
      city: entryData.city,
      type: entryData.type,
      gender: entryData.gender,
      date: entryData.date,
      creator_id: entryData.creator_id,
      liked_by: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      creator: userCache.get(entryData.creator_id)
    }

    // Создаем пост через WASM
    const result = engine.create_post(fullEntry)
    const createdEntry: Entry = JSON.parse(result)

    console.log('✅ Entry created:', createdEntry.title)

    // Отправляем в P2P сеть
    p2pClient.broadcastNewEntry(createdEntry)

    // Сохраняем в IndexedDB как несинхронизированный
    await indexedDB.saveEntry({
      id: createdEntry.id,
      data: new TextEncoder().encode(JSON.stringify(createdEntry)),
      timestamp: Date.now(),
      synced: false
    })

    return createdEntry

  } catch (error) {
    console.error('❌ Failed to create entry:', error)
    throw error
  }
}

export const toggleLike = async (entryId: number, userId: number): Promise<void> => {
  try {
    const engine = await initWasm()
    
    // Toggle like через WASM
    const result = engine.toggle_like(entryId, userId)
    console.log('❤️ Like toggled:', entryId)

    // Отправляем обновление в P2P сеть
    p2pClient.send({
      type: 'new_entry', // Временно используем new_entry для обновлений
      data: { type: 'like_toggle', entryId, userId },
      timestamp: Date.now(),
      sender_id: userId
    })

  } catch (error) {
    console.error('❌ Failed to toggle like:', error)
    throw error
  }
}

// Применение фильтров
function applyFilters(entries: Entry[], filters: Filters): Entry[] {
  return entries.filter(entry => {
    // Фильтр по городу
    if (filters.city && filters.city !== 'all') {
      if (entry.city !== filters.city) return false
    }

    // Фильтр по типам
    if (filters.type.length > 0 && !filters.type.includes('all')) {
      if (!entry.type.some(t => filters.type.includes(t))) return false
    }

    // Фильтр по полу
    if (filters.gender && filters.gender !== 'all') {
      if (entry.gender !== filters.gender) return false
    }

    // Поиск по тексту
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!entry.title.toLowerCase().includes(searchLower) && 
          !entry.description.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Фильтр по дате
    if (filters.dateFrom && entry.date && entry.date < filters.dateFrom) return false
    if (filters.dateTo && entry.date && entry.date > filters.dateTo) return false

    return true
  })
}

// Применение сортировки
function applySorting(entries: Entry[], sortType: SortType, userId?: number): Entry[] {
  const sorted = [...entries]

  switch (sortType) {
    case 'new':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    case 'old':
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    
    case 'rating':
      return sorted.sort((a, b) => b.liked_by.length - a.liked_by.length)
    
    case 'my':
      return userId ? sorted.filter(entry => entry.creator_id === userId) : sorted
    
    case 'favorites':
      // TODO: Реализовать через preferences
      return sorted
    
    case 'hidden':
      // TODO: Реализовать через preferences
      return sorted
    
    default:
      return sorted
  }
}

// Заглушки для preferences (временно)
export const getUserPreferences = async (userId: number): Promise<UserPreferences | null> => {
  console.log('📋 Getting preferences for user:', userId)
  
  // Заглушка
  return {
    id: 1,
    user_id: userId,
    favorites: [],
    hidden_entries: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export const updateUserPreferences = async (
  userId: number,
  preferences: Partial<UserPreferences>
): Promise<void> => {
  console.log('💾 Updating preferences for user:', userId, preferences)
  // TODO: Реализовать через IndexedDB
}