// Конфигурация для разных окружений

function getWebSocketURL(): string {
  // Если есть переменная окружения - используем её
  if (import.meta.env.VITE_P2P_SERVER_URL) {
    return import.meta.env.VITE_P2P_SERVER_URL
  }
  
  // Для разработки - localhost
  if (import.meta.env.DEV) {
    return 'ws://localhost:8080/ws'
  }
  
  // Для production на Render.com
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.hostname}/ws`
}

export const config = {
  // P2P сервер URL (автоматически определяется)
  p2pServerUrl: getWebSocketURL(),
  
  // Окружение
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // Настройки приложения
  appName: import.meta.env.VITE_APP_NAME || 'P2P Telegram App',
  debug: import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV,
  
  // Лимиты для безопасности
  maxMessageSize: 64 * 1024, // 64KB
  maxReconnectAttempts: 5,
  reconnectDelay: 5000, // 5 секунд
}

// Логируем конфигурацию для отладки
if (config.debug) {
  console.log('🔧 App config:', {
    p2pServerUrl: config.p2pServerUrl,
    environment: config.isDevelopment ? 'development' : 'production',
    debug: config.debug
  })
}