import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { LanguageModal } from './LanguageModal'
import { Language } from '../types'

interface MenuDropdownProps {
  onClose: () => void
}

export const MenuDropdown = ({ onClose }: MenuDropdownProps) => {
  const { t, i18n } = useTranslation()
  const { resetFilters, setLanguage } = useStore()
  const [showLanguageModal, setShowLanguageModal] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.menu-dropdown')) {
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose])

  const handleResetFilters = () => {
    resetFilters()
    onClose()
  }

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
    setShowLanguageModal(false)
    onClose()
  }

  return (
    <>
      <div className="menu-dropdown absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-48 z-50">
        <button
          onClick={handleResetFilters}
          className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100"
        >
          {t('resetFilters')}
        </button>
        
        <button
          onClick={() => setShowLanguageModal(true)}
          className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100"
        >
          {t('changeLanguage')}
        </button>
      </div>

      <LanguageModal
        isOpen={showLanguageModal}
        onSelect={handleLanguageSelect}
        canClose={true}
      />
    </>
  )
}