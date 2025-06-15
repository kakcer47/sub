import { TelegramUser } from '../types'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: TelegramUser
        }
        ready(): void
        expand(): void
        close(): void
        openTelegramLink(url: string): void
      }
    }
  }
}

export const telegram = window.Telegram?.WebApp

export const getTelegramUser = (): TelegramUser | null => {
  try {
    console.log('🔍 Checking for Telegram Web App...')
    
    // Проверяем Telegram Web App
    const telegramUser = telegram?.initDataUnsafe?.user
    
    if (telegramUser) {
      console.log('✅ Telegram user found:', telegramUser.first_name)
      return telegramUser
    }
    
    // Fallback для разработки и тестирования
    if (import.meta.env.DEV) {
      console.warn('🧪 Using development Telegram user fallback')
      return {
        id: 12345,
        first_name: 'Dev',
        last_name: 'User',
        username: 'devuser'
      }
    }
    
    console.warn('❌ Telegram WebApp not found and not in dev mode')
    return null
    
  } catch (error) {
    console.error('❌ Error getting Telegram user:', error)
    
    // Fallback в случае ошибки
    if (import.meta.env.DEV) {
      console.warn('🆘 Using emergency fallback user')
      return {
        id: 99999,
        first_name: 'Emergency',
        last_name: 'User',
        username: 'emergency'
      }
    }
    
    return null
  }
}

export const openTelegramProfile = (username: string) => {
  try {
    if (telegram && telegram.openTelegramLink) {
      telegram.openTelegramLink(`https://t.me/${username}`)
    } else {
      // Fallback для обычных браузеров
      window.open(`https://t.me/${username}`, '_blank')
    }
  } catch (error) {
    console.error('Error opening Telegram profile:', error)
    // Дополнительный fallback
    window.open(`https://t.me/${username}`, '_blank')
  }
}

export const initTelegram = () => {
  try {
    console.log('🚀 Инициализация Telegram Web App...');
    if (telegram) {
      console.log('✅ Telegram Web App найден');
      telegram.ready()
      telegram.expand()
      console.log('✅ Telegram Web App инициализирован');
    } else {
      console.log('❌ Telegram Web App не найден');
    }
  } catch (error) {
    console.error('Error initializing Telegram WebApp:', error)
  }
}