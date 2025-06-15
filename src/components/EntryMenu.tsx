import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Entry } from '../types'
import { useStore } from '../store'
import { useUpdatePreferences, useUserPreferences } from '../hooks'

interface EntryMenuProps {
  entry: Entry
  onClose: () => void
}

export const EntryMenu = ({ entry, onClose }: EntryMenuProps) => {
  const { t } = useTranslation()
  const { user } = useStore()
  const { data: preferences } = useUserPreferences()
  const updatePreferences = useUpdatePreferences()

  const isOwner = user && entry.creator_id === user.id
  const isFavorite = preferences?.favorites?.includes(entry.id)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.entry-menu')) {
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose])

  const handleFavorite = () => {
    if (!user || !preferences) return
    
    const newFavorites = isFavorite
      ? preferences.favorites.filter(id => id !== entry.id)
      : [...preferences.favorites, entry.id]
    
    updatePreferences.mutate({ favorites: newFavorites })
    onClose()
  }

  const handleHide = () => {
    if (!user || !preferences) return
    
    const newHidden = [...preferences.hidden_entries, entry.id]
    updatePreferences.mutate({ hidden_entries: newHidden })
    onClose()
  }

  return (
    <div className="entry-menu absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-40 z-50">
      {isOwner ? (
        <>
          <button className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100">
            {t('edit')}
          </button>
          <button className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 text-red-600">
            {t('delete')}
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleHide}
            className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100"
          >
            {t('hide')}
          </button>
          <button
            onClick={handleFavorite}
            className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100"
          >
            {isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
          </button>
        </>
      )}
    </div>
  )
}