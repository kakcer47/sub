import { useState } from 'react'
import { useStore } from '../store'
import { FilterButton } from './FilterButton'
import { MenuDropdown } from './MenuDropdown'
import { SearchBar } from './SearchBar'

export const Header = () => {
  const { isSearchOpen, setSearchOpen } = useStore()
  const [isMenuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-transparent backdrop-blur-[2px] border-b border-gray-200 sticky top-0 z-40 overflow-visible">
      <div className="flex items-center justify-between px-4 py-3 overflow-visible">
        {/* Left filters */}
        <div className="flex items-center space-x-0 overflow-visible">
          <FilterButton type="city" />
          <FilterButton type="type" />
          <FilterButton type="date" />
          <FilterButton type="gender" />
        </div>

        {/* Right controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSearchOpen(!isSearchOpen)}
            className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            onClick={() => setMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors relative"
          >
            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {isMenuOpen && <MenuDropdown onClose={() => setMenuOpen(false)} />}
          </button>
        </div>
      </div>

      <SearchBar />
    </header>
  )
}