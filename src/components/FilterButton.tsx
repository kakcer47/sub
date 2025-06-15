import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FilterDropdown } from './FilterDropdown'

interface FilterButtonProps {
  type: 'city' | 'type' | 'date' | 'gender';
}

export const FilterButton = ({ type }: FilterButtonProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => {
          console.log(`FilterButton ${type} clicked, isOpen: ${!isOpen}`)
          setIsOpen(!isOpen)
        }}
        className={`filter-button-${type} flex items-center space-x-1 px-3 py-2 bg-background hover:bg-gray-200 rounded-lg text-sm font-medium text-primary transition-colors`}
      >
        <span>{t(type)}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <FilterDropdown 
          type={type} 
          onClose={() => {
            console.log(`Closing FilterDropdown for ${type}`)
            setIsOpen(false)
          }}
          buttonRef={buttonRef}
        />
      )}
    </div>
  )
}