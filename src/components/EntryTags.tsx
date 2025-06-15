import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Entry } from '../types'

interface EntryTagsProps {
  entry: Entry
}

export const EntryTags = ({ entry }: EntryTagsProps) => {
  const { i18n } = useTranslation()
  const [cities, setCities] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [genders, setGenders] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [citiesModule, typesModule, gendersModule] = await Promise.all([
          import(`../data/cities-${i18n.language}.ts`),
          import(`../data/types-${i18n.language}.ts`),
          import(`../data/genders-${i18n.language}.ts`)
        ])
        setCities(citiesModule.cities || [])
        setTypes(typesModule.types || [])
        setGenders(gendersModule.genders || [])
      } catch (error) {
        console.error('Ошибка загрузки данных фильтров:', error)
      }
    }
    loadData()
  }, [i18n.language])

  const getCityName = (cityId: string) => {
    const city = cities.find(c => c.id === cityId)
    return city ? city.name : cityId
  }

  const getTypeName = (typeId: string) => {
    const type = types.find(t => t.id === typeId)
    return type ? type.name : typeId
  }

  const getGenderName = (gender: string) => {
    const genderItem = genders.find(g => g.id === gender)
    return genderItem ? genderItem.name : gender
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
    } catch {
      return dateStr
    }
  }

  const tags = []

  // Город
  if (entry.city && entry.city !== 'all') {
    tags.push({
      id: `city-${entry.city}`,
      text: getCityName(entry.city),
      type: 'city'
    })
  }

  // Типы/категории
  if (entry.type && entry.type.length > 0) {
    entry.type.forEach(typeId => {
      if (typeId !== 'all') {
        tags.push({
          id: `type-${typeId}`,
          text: getTypeName(typeId),
          type: 'type'
        })
      }
    })
  }

  // Пол
  if (entry.gender && entry.gender !== 'all') {
    const genderName = getGenderName(entry.gender)
    if (genderName) {
      tags.push({
        id: `gender-${entry.gender}`,
        text: genderName,
        type: 'gender'
      })
    }
  }

  // Дата
  if (entry.date) {
    tags.push({
      id: `date-${entry.date}`,
      text: formatDate(entry.date),
      type: 'date'
    })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {tags.map(tag => (
        <span
          key={tag.id}
          className={`px-2 py-1 text-xs rounded-full ${
            tag.type === 'city' ? 'bg-blue-100 text-blue-700' :
            tag.type === 'type' ? 'bg-green-100 text-green-700' :
            tag.type === 'gender' ? 'bg-purple-100 text-purple-700' :
            tag.type === 'date' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          }`}
        >
          {tag.text}
        </span>
      ))}
    </div>
  )
}