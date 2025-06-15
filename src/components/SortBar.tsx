import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { SortType } from '../types'

export const SortBar = () => {
  const { t } = useTranslation()
  const { sortType, setSortType } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const sortBarRef = useRef<HTMLDivElement>(null)

  const sortOptions: { id: SortType; label: string }[] = [
    { id: 'new', label: t('new') },
    { id: 'old', label: t('old') },
    { id: 'rating', label: t('rating') },
    { id: 'my', label: t('myEntries') },
    { id: 'favorites', label: t('favorites') },
    { id: 'hidden', label: t('hidden') },
  ]

  // Закрытие выпадающего списка при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortBarRef.current && !sortBarRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <>
      <div
        ref={sortBarRef}
        className="relative px-4 py-4 bg-transparent backdrop-blur-[2px] z-30 sticky top-0"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute top-1/2 right-4 transform -translate-y-1/2"
        >
          <svg
            fill="#000000"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M16.29,14.29,12,18.59l-4.29-4.3a1,1,0,0,0-1.42,1.42l5,5a1,1,0,0,0,1.42,0l5-5a1,1,0,0,0-1.42-1.42ZM7.71,9.71,12,5.41l4.29,4.3a1,1,0,0,0,1.42,0,1,1,0,0,0,0-1.42l-5-5a1,1,0,0,0-1.42,0l-5,5A1,1,0,0,0,7.71,9.71Z"/>
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-4 mt-1 bg-white border rounded-lg shadow-lg p-2 w-40 z-[40]">
            {sortOptions.map((option) => (
              <div key={option.id}>
                <button
                  onClick={() => {
                    setSortType(option.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100/50 ${
                    sortType === option.id ? 'bg-gray-100/50' : ''
                  }`}
                >
                  {option.label}
                </button>
                {option.id === 'rating' && (
                  <div className="w-full h-px bg-gray-200 my-1" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}