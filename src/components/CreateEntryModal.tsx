import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store'
import { useCreateEntry } from '../hooks'
import { CreateEntryData } from '../utils/api'

interface CreateEntryModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FilterDropdownProps {
  type: 'city' | 'type' | 'date' | 'gender'
  onClose: () => void
  selectedValue: any
  onValueChange: (value: any) => void
}

const FilterDropdown = ({ type, onClose, selectedValue, onValueChange }: FilterDropdownProps) => {
  const { t } = useTranslation()
  const { filtersData } = useStore()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose])

  const renderContent = () => {
    switch (type) {
      case 'city': {
        const data = filtersData.cities
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
                onClick={() => { onValueChange(item.id); onClose() }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${selectedValue === item.id ? 'bg-gray-100' : ''}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )
      }
      case 'type': {
        const data = filtersData.types
        const filtered = data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
        const toggle = (id: string) => {
          if (id === 'all') {
            onValueChange([]); onClose(); return
          }
          const has = selectedValue.includes(id)
          const newArr = has ? selectedValue.filter((t: string) => t !== id) : selectedValue.length < 3 ? [...selectedValue, id] : selectedValue
          onValueChange(newArr)
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
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${selectedValue.includes(item.id) ? 'bg-gray-100' : ''}`}
              >{item.name}</button>
            ))}
          </div>
        )
      }
      case 'gender': {
        const data = filtersData.genders
        return (
          <div className="space-y-1">
            {data.map(item => (
              <button
                key={item.id}
                onClick={() => { onValueChange(item.id); onClose() }}
                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${selectedValue === item.id ? 'bg-gray-100' : ''}`}
              >{item.name}</button>
            ))}
          </div>
        )
      }
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
              <button onClick={() => { onValueChange(dateFrom || dateTo ? (dateFrom || dateTo) : ''); onClose() }} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium">{t('apply')}</button>
              <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }} className="p-2 text-gray-500 hover:text-gray-700 rounded" title="Reset">
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div
        ref={dropdownRef}
        className="bg-white border rounded-lg shadow-lg p-3 w-60 mx-4"
      >
        {renderContent()}
      </div>
    </div>,
    document.body
  )
}

export const CreateEntryModal = ({ isOpen, onClose }: CreateEntryModalProps) => {
  const { t } = useTranslation()
  const { user } = useStore()
  const createEntryMutation = useCreateEntry()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedGender, setSelectedGender] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const titleLimit = 62
  const descriptionLimit = 450

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setSelectedCity('all')
      setSelectedTypes([])
      setSelectedGender('all')
      setSelectedDate('')
      setActiveDropdown(null)
    }
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !user?.id) {
      return
    }

    const entryData: CreateEntryData = {
      title: title.trim(),
      description: description.trim(),
      city: selectedCity === 'all' ? null : selectedCity,
      type: selectedTypes.length === 0 ? [] : selectedTypes,
      gender: selectedGender === 'all' ? null : selectedGender,
      date: selectedDate || null,
      creator_id: user.id
    }

    try {
      await createEntryMutation.mutateAsync(entryData)
      onClose()
    } catch (error) {
      console.error('Ошибка создания записи:', error)
    }
  }

  const canSubmit = title.trim().length > 0 &&
                    description.trim().length > 0 &&
                    user?.id &&
                    createEntryMutation.status !== 'pending'

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
        <div 
          className="bg-white rounded-2xl w-full max-w-none mx-4 max-h-[85vh] overflow-y-auto lg:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
            <div className="flex items-center space-x-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0) || '?'}
                  </span>
                </div>
              )}
              {user && (
                <div>
                  <p className="font-medium text-primary text-sm">{user.name}</p>
                  <p className="text-xs text-secondary">@{user.username}</p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                canSubmit
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {createEntryMutation.status === 'pending' ? 'Отправка...' : 'Отправить'}
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Фильтры в одну линию */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'city' ? null : 'city')}
                className="flex items-center space-x-1 px-3 py-2 bg-background hover:bg-gray-200 rounded-lg text-sm font-medium text-primary transition-colors whitespace-nowrap"
              >
                <span>{t('city')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                onClick={() => setActiveDropdown(activeDropdown === 'type' ? null : 'type')}
                className="flex items-center space-x-1 px-3 py-2 bg-background hover:bg-gray-200 rounded-lg text-sm font-medium text-primary transition-colors whitespace-nowrap"
              >
                <span>{t('type')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                onClick={() => setActiveDropdown(activeDropdown === 'gender' ? null : 'gender')}
                className="flex items-center space-x-1 px-3 py-2 bg-background hover:bg-gray-200 rounded-lg text-sm font-medium text-primary transition-colors whitespace-nowrap"
              >
                <span>{t('gender')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
                className="flex items-center space-x-1 px-3 py-2 bg-background hover:bg-gray-200 rounded-lg text-sm font-medium text-primary transition-colors whitespace-nowrap"
              >
                <span>{t('date')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Заголовок */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Заголовок
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    if (e.target.value.length <= titleLimit) {
                      setTitle(e.target.value)
                    }
                  }}
                  placeholder="Введите заголовок..."
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-secondary">
                  {title.length}/{titleLimit}
                </span>
              </div>
            </div>

            {/* Описание */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Описание
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= descriptionLimit) {
                      setDescription(e.target.value)
                    }
                  }}
                  placeholder="Введите описание..."
                  rows={4}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <span className="absolute right-3 bottom-3 text-xs text-secondary">
                  {description.length}/{descriptionLimit}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown модали */}
      {activeDropdown === 'city' && (
        <FilterDropdown
          type="city"
          selectedValue={selectedCity}
          onValueChange={setSelectedCity}
          onClose={() => setActiveDropdown(null)}
        />
      )}
      {activeDropdown === 'type' && (
        <FilterDropdown
          type="type"
          selectedValue={selectedTypes}
          onValueChange={setSelectedTypes}
          onClose={() => setActiveDropdown(null)}
        />
      )}
      {activeDropdown === 'gender' && (
        <FilterDropdown
          type="gender"
          selectedValue={selectedGender}
          onValueChange={setSelectedGender}
          onClose={() => setActiveDropdown(null)}
        />
      )}
      {activeDropdown === 'date' && (
        <FilterDropdown
          type="date"
          selectedValue={selectedDate}
          onValueChange={setSelectedDate}
          onClose={() => setActiveDropdown(null)}
        />
      )}
    </>
  )
}