import { useTranslation } from 'react-i18next'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-modal flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium text-primary mb-4 text-center">
          {t('login')}
        </h2>
        <div className="space-y-3">
          <button className="w-full p-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors">
            {t('telegram')}
          </button>
          <button className="w-full p-3 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors">
            {t('google')}
          </button>
          <button className="w-full p-3 bg-gray-800 hover:bg-gray-900 rounded-lg text-white font-medium transition-colors">
            {t('apple')}
          </button>
        </div>
      </div>
    </div>
  )
}