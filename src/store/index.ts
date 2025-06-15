import { create } from 'zustand'
import { User, Filters, SortType, Language, DataItem } from '../types'

interface FiltersData {
  cities: DataItem[]
  types: DataItem[]
  genders: DataItem[]
}

interface AppState {
  user: User | null
  isAuthenticated: boolean
  language: Language
  filters: Filters
  sortType: SortType
  isSearchOpen: boolean
  filtersData: FiltersData
  setUser: (user: User | null) => void
  setAuthenticated: (auth: boolean) => void
  setLanguage: (lang: Language) => void
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void
  setSortType: (sort: SortType) => void
  setSearchOpen: (open: boolean) => void
  setFiltersData: (data: Partial<FiltersData>) => void
}

const initialFilters: Filters = {
  city: 'all',
  type: [],
  gender: 'all',
  search: ''
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  language: 'ru',
  filters: initialFilters,
  sortType: 'new',
  isSearchOpen: false,
  filtersData: {
    cities: [],
    types: [],
    genders: []
  },
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLanguage: (language) => set({ language }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    })),
  resetFilters: () => set({ filters: initialFilters }),
  setSortType: (sortType) => set({ sortType }),
  setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
  setFiltersData: (data) =>
    set((state) => ({
      filtersData: { ...state.filtersData, ...data }
    }))
}))
