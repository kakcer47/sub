import { useState } from 'react'
import { useStore } from '../store'
import { CreateEntryModal } from './CreateEntryModal'
import { LoginModal } from './LoginModal'

export const FloatingCreateButton = () => {
  const { isAuthenticated, user } = useStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleCreateClick = () => {
    console.log('🎯 Клик на создание:', { isAuthenticated, user });
    
    if (!isAuthenticated) {
      console.log('❌ Пользователь не авторизован');
      setShowLoginModal(true)
      return
    }
    console.log('✅ Открытие модала создания');
    setShowCreateModal(true)
  }

  return (
    <>
      <button
        onClick={handleCreateClick}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 
                   bg-gray-800 hover:bg-gray-900 text-white 
                   px-8 py-3 rounded-full shadow-lg hover:shadow-xl
                   transition-all duration-300 ease-in-out
                   flex items-center space-x-2 font-medium
                   backdrop-blur-sm bg-opacity-90"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Создать {!isAuthenticated && '(🔒)'}</span>
      </button>

      <CreateEntryModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  )
}