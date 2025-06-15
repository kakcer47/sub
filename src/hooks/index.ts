import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEntries, toggleLike, getUserPreferences, updateUserPreferences, createEntry, CreateEntryData, p2pClient } from '../utils/api'
import { useStore } from '../store'
import { Entry, UserPreferences } from '../types'

// Бесконечный список записей через P2P
export const useEntries = () => {
  const { filters, sortType, user } = useStore()
  
  return useInfiniteQuery({
    queryKey: ['entries', filters, sortType, user?.id],
    queryFn: ({ pageParam = 0 }: { pageParam: number }) => {
      console.log(`📄 Fetching entries page ${pageParam}`)
      return getEntries(filters, sortType, pageParam, user?.id)
    },
    getNextPageParam: (lastPage: Entry[], allPages: Entry[][]) => {
      // Если получили полную страницу (25 записей), есть следующая
      const hasMore = lastPage.length === 25
      const nextPage = hasMore ? allPages.length : undefined
      
      console.log(`📄 Next page: ${nextPage}, last page size: ${lastPage.length}`)
      return nextPage
    },
    initialPageParam: 0,
    enabled: true,
    staleTime: 1000 * 30, // 30 секунд (меньше чем раньше, т.к. P2P быстрее)
    refetchOnWindowFocus: true, // Обновляем при фокусе (для P2P синхронизации)
  })
}

// Мутация лайка через P2P
export const useLikeMutation = () => {
  const queryClient = useQueryClient()
  const { user } = useStore()
  
  return useMutation({
    mutationFn: (entryId: number) => {
      if (!user?.telegram_id) {
        throw new Error('User not authenticated')
      }
      console.log(`❤️ Toggling like for entry ${entryId}`)
      return toggleLike(entryId, user.telegram_id)
    },
    onMutate: async (entryId: number) => {
      // Оптимистичное обновление
      await queryClient.cancelQueries({ queryKey: ['entries'] })
      
      const previousEntries = queryClient.getQueryData(['entries'])
      
      // Обновляем UI мгновенно
      queryClient.setQueryData(['entries'], (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: Entry[]) =>
          page.map((entry: Entry) => {
            if (entry.id === entryId && user?.telegram_id) {
              const isLiked = entry.liked_by.includes(user.telegram_id)
              return {
                ...entry,
                liked_by: isLiked 
                  ? entry.liked_by.filter(id => id !== user.telegram_id)
                  : [...entry.liked_by, user.telegram_id]
              }
            }
            return entry
          })
        )
        
        return { ...old, pages: newPages }
      })
      
      return { previousEntries }
    },
    onError: (err, entryId, context) => {
      console.error('❌ Like mutation failed:', err)
      // Откатываем изменения при ошибке
      if (context?.previousEntries) {
        queryClient.setQueryData(['entries'], context.previousEntries)
      }
    },
    onSuccess: () => {
      console.log('✅ Like updated successfully')
      // P2P автоматически синхронизирует изменения
    }
  })
}

// Предпочтения пользователя (временная заглушка)
export const useUserPreferences = () => {
  const { user } = useStore()
  
  return useQuery<UserPreferences | null>({
    queryKey: ['preferences', user?.id],
    queryFn: () => {
      if (!user?.id) return null
      console.log(`📋 Fetching preferences for user ${user.id}`)
      return getUserPreferences(user.id)
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // 10 минут
  })
}

// Обновление предпочтений
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient()
  const { user } = useStore()
  
  return useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      console.log(`💾 Updating preferences for user ${user.id}:`, preferences)
      return updateUserPreferences(user.id, preferences)
    },
    onSuccess: () => {
      console.log('✅ Preferences updated')
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
      queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
    onError: (error) => {
      console.error('❌ Failed to update preferences:', error)
    }
  })
}

// Создание новой записи через P2P
export const useCreateEntry = () => {
  const queryClient = useQueryClient()
  const { user } = useStore()
  
  return useMutation<Entry, Error, CreateEntryData>({
    mutationFn: async (entryData: CreateEntryData) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      
      console.log(`📝 Creating entry: "${entryData.title}"`)
      
      // Создаем запись через P2P API
      const entry = await createEntry({
        ...entryData,
        creator_id: user.id
      })
      
      console.log(`✅ Entry created with ID: ${entry.id}`)
      return entry
    },
    onMutate: async (entryData: CreateEntryData) => {
      // Отменяем исходящие запросы
      await queryClient.cancelQueries({ queryKey: ['entries'] })
      
      // Создаем оптимистичную запись
      const optimisticEntry: Entry = {
        id: Date.now(), // Временный ID
        title: entryData.title,
        description: entryData.description,
        city: entryData.city,
        type: entryData.type,
        gender: entryData.gender,
        date: entryData.date,
        creator_id: user?.id || 0,
        liked_by: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: user || undefined
      }
      
      // Добавляем в начало списка
      queryClient.setQueryData(['entries'], (old: any) => {
        if (!old) return { pages: [[optimisticEntry]], pageParams: [0] }
        
        const newPages = [...old.pages]
        newPages[0] = [optimisticEntry, ...newPages[0]]
        
        return { ...old, pages: newPages }
      })
      
      return { optimisticEntry }
    },
    onSuccess: (newEntry) => {
      console.log(`🎉 Entry "${newEntry.title}" created successfully`)
      
      // Обновляем кэш с реальными данными
      queryClient.setQueryData(['entries'], (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: Entry[], pageIndex: number) => {
          if (pageIndex === 0) {
            // Заменяем оптимистичную запись на реальную
            return page.map(entry => 
              entry.id === newEntry.id ? newEntry : entry
            )
          }
          return page
        })
        
        return { ...old, pages: newPages }
      })
      
      // P2P автоматически разошлет запись другим клиентам
      console.log('📡 Entry broadcasted via P2P')
    },
    onError: (error, entryData, context) => {
      console.error('❌ Failed to create entry:', error)
      
      // Удаляем оптимистичную запись при ошибке
      if (context?.optimisticEntry) {
        queryClient.setQueryData(['entries'], (old: any) => {
          if (!old) return old
          
          const newPages = old.pages.map((page: Entry[]) =>
            page.filter(entry => entry.id !== context.optimisticEntry.id)
          )
          
          return { ...old, pages: newPages }
        })
      }
    }
  })
}

// P2P статистика
export const useP2PStats = () => {
  return useQuery({
    queryKey: ['p2p-stats'],
    queryFn: async () => {
      const { getP2PStats } = await import('../utils/api')
      return getP2PStats()
    },
    refetchInterval: 10000, // Обновляем каждые 10 секунд
    staleTime: 5000,
  })
}

// P2P статус подключения
export const useP2PStatus = () => {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: ['p2p-status'],
    queryFn: () => ({
      connected: p2pClient.connected,
      queueSize: p2pClient.queueSize,
      timestamp: Date.now()
    }),
    refetchInterval: 2000, // Проверяем каждые 2 секунды
    staleTime: 1000,
    onSuccess: (data) => {
      // Автоматически переподключаемся если отключились
      if (!data.connected) {
        console.log('🔄 P2P disconnected, attempting to reconnect...')
        p2pClient.connect().catch(console.error)
      }
    }
  })
}