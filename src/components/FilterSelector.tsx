import { useTranslation } from 'react-i18next'
import { useStore } from '../store'

interface FilterSelectorProps {
  selectedCity: string
  selectedTypes: string[]
  selectedGender: string
  selectedDate: string
  onCityChange: (city: string) => void
  onTypesChange: (types: string[]) => void
  onGenderChange: (gender: string) => void
  onDateChange: (date: string) => void
}

export const FilterSelector = ({
  selectedCity,
  selectedTypes,
  selectedGender,
  selectedDate,
  onCityChange,
  onTypesChange,
  onGenderChange,
  onDateChange
}: FilterSelectorProps) => {
  const { t } = useTranslation()
  const { filtersData } = useStore()

  const cities = filtersData.cities
  const types = filtersData.types
  const genders = filtersData.genders

  const handleTypeToggle = (typeId: string) => {
    if (typeId === 'all') {
      onTypesChange([])
      return
    }
    
    const newTypes = selectedTypes.includes(typeId)
      ? selectedTypes.filter(t => t !== typeId)
      : [...selectedTypes, typeId]
    
    onTypesChange(newTypes)
  }

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-primary">{t('filters')}</h3>
      
      {/* Город */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-2">{t('city')}</label>
        <select
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {cities.map(city => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </div>

      {/* Типы */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-2">{t('type')}</label>
        <div className="flex flex-wrap gap-2">
          {types.filter(item => item.id !== 'all').map(item => (
            <button
              key={item.id}
              onClick={() => handleTypeToggle(item.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                selectedTypes.includes(item.id)
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Пол */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-2">{t('gender')}</label>
        <div className="flex gap-2">
          {genders.map(gender => (
            <button
              key={gender.id}
              onClick={() => onGenderChange(gender.id)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                selectedGender === gender.id
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {gender.name}
            </button>
          ))}
        </div>
      </div>

      {/* Дата */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-2">{t('date')}</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}