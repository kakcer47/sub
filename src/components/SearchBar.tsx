import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

export const SearchBar = () => {
  const { t } = useTranslation()
  const { isSearchOpen, setSearchOpen, filters, setFilters } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSearchOpen])

  const handleSearchChange = (value: string) => {
    setFilters({ search: value })
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!isSearchOpen) return null

  return (
    <div 
      className="absolute top-0 left-0 right-0 bg-transparent backdrop-blur-[2px] border-b border-gray-200 px-4 py-4 pb-[17px] z-50"
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder={t('search')}
        value={filters.search}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full px-4 py-3 border rounded-lg text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
        onBlur={() => {
          if (!filters.search) {
            setSearchOpen(false)
          }
        }}
      />
    </div>
  )
}