import { useTranslation } from 'react-i18next'
import { Language } from '../types'

interface LanguageModalProps {
  isOpen: boolean
  onSelect: (lang: Language) => void
  canClose?: boolean
}

export const LanguageModal = ({ isOpen, onSelect, canClose = false }: LanguageModalProps) => {
  const { t } = useTranslation()
  
  if (!isOpen) return null

  const handleSelect = (lang: Language) => {
    onSelect(lang)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (canClose && e.target === e.currentTarget) {
      // If canClose is true, allow closing by clicking backdrop
      // Could call an onClose callback here if provided
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-modal flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 mx-4 w-full max-w-sm">
        <h2 className="text-lg font-medium text-primary mb-4 text-center">
          {t('selectLanguage')}
        </h2>
        <div className="space-y-3">
          <button
            onClick={() => handleSelect('ru')}
            className="w-full p-3 bg-background hover:bg-gray-200 rounded-lg text-primary font-medium transition-colors"
          >
            Русский
          </button>
          <button
            onClick={() => handleSelect('en')}
            className="w-full p-3 bg-background hover:bg-gray-200 rounded-lg text-primary font-medium transition-colors"
          >
            English
          </button>
        </div>
        
        {canClose && (
          <button
            onClick={() => onSelect('ru')} // fallback to current or default
            className="w-full mt-3 p-2 text-sm text-secondary hover:text-primary transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}