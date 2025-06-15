import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

interface FilterDropdownProps {
  type: 'city' | 'type' | 'date' | 'gender'
  onClose: () => void
  buttonRef?: React.RefObject<HTMLButtonElement | null>
}

export const FilterDropdown = ({ type, onClose, buttonRef }: FilterDropdownProps) => {
  const { t } = useTranslation()
  const { filters, setFilters, filtersData } = useStore()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<any[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    switch (type) {
      case 'city':
        setData(filtersData.cities)
        break
      case 'type':
        setData(filtersData.types)
        break
      case 'gender':
        setData(filtersData.genders)
        break
      case 'date':
      default:
        setData([])
    }
    setSearch('')
  }, [type, filtersData])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!buttonRef?.current || !buttonRef.current.contains(target))
      ) {
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose, buttonRef])

  const [position, setPosition] = useState({ top: 0, left: 0 })
  useLayoutEffect(() => {
    if (!dropdownRef.current || !buttonRef?.current) return

    const updatePosition = () => {
      const dropdown = dropdownRef.current
      const button = buttonRef.current
      if (!dropdown || !button) return

      const dropdownWidth = dropdown.offsetWidth || 240 // fallback
      const buttonRect = button.getBoundingClientRect()
    
      const centerLeft = (window.innerWidth - dropdownWidth) / 2
      const left = Math.max(1, Math.min(centerLeft, window.innerWidth - dropdownWidth - 1))

      setPosition({
        top: buttonRect.bottom + window.scrollY + 2,
        left,
      })
    }

    setTimeout(updatePosition, 0)
  
    const handleResize = updatePosition
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [buttonRef, type])

  const renderContent = () => {
    switch (type) {
      case 'city': {
        const filtered = data.filter(item =>
          item.name.toLowerCase().includes(search.toLowerCase())
        )
        return (
          <div className="space-y-1">
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
              />
            </div>
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => { setFilters({ city: item.id }); onClose() }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${filters.city === item.id ? 'bg-gray-100' : ''}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )
      }
      case 'type': {
        const filtered = data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
        const toggle = (id: string) => {
          if (id === 'all') {
            setFilters({ type: [] }); onClose(); return
          }
          const has = filters.type.includes(id)
          const newArr = has ? filters.type.filter(t => t !== id) : filters.type.length < 3 ? [...filters.type, id] : filters.type
          setFilters({ type: newArr })
          if (newArr.length === 3) onClose()
        }
        return (
          <div className="space-y-1">
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:outline-none" />
            </div>
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${filters.type.includes(item.id) ? 'bg-gray-100' : ''}`}
              >{item.name}</button>
            ))}
          </div>
        )
      }
      case 'gender':
        return (
          <div className="space-y-1">
            {data.map(item => (
              <button
                key={item.id}
                onClick={() => { setFilters({ gender: item.id }); onClose() }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${filters.gender === item.id ? 'bg-gray-100' : ''}`}
              >{item.name}</button>
            ))}
          </div>
        )
      case 'date':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('from')}</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('to')}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setFilters({ dateFrom, dateTo }); onClose() }} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium">{t('apply')}</button>
              <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }} className="p-2 text-gray-500 hover:text-gray-700 rounded" title={t('reset')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 14 14" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z" />
                </svg>
              </button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return createPortal(
    <div
      ref={dropdownRef}
      className="filter-dropdown fixed bg-white border rounded-lg shadow-lg p-3 w-60 z-[100]"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {renderContent()}
    </div>,
    document.body
  )
}
