import { useState } from 'react'
import { Entry } from '../types'
import { useStore } from '../store'
import { useLikeMutation } from '../hooks'
import { openTelegramProfile } from '../lib/telegram'
import { EntryMenu } from './EntryMenu'
import { LoginModal } from './LoginModal'

interface EntryCardProps {
  entry: Entry
}

export const EntryCard = ({ entry }: EntryCardProps) => {
  const { user, isAuthenticated } = useStore()
  const likeMutation = useLikeMutation()
  const [showMenu, setShowMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)


  const isLiked = user && entry.liked_by.includes(user.telegram_id)
  const likesCount = entry.liked_by.length

  const handleLike = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true)
      return
    }
    likeMutation.mutate(entry.id)
  }

  const handleUserClick = () => {
    if (entry.creator?.username) {
      openTelegramProfile(entry.creator.username)
    }
  }

  return (
    <>
      <div className="bg-transparent backdrop-blur-[2px] border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-primary mb-2">{entry.title}</h3>
        <p className="text-secondary text-sm mb-3">{entry.description}</p>

        <div className="w-full h-px bg-gray-200 mb-3" />

        <div className="flex items-center justify-between">
          {/* Автор */}
          {entry.creator && (
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={handleUserClick}
            >
              {entry.creator.avatar && (
                <img
                  src={entry.creator.avatar}
                  alt={entry.creator.name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm font-medium text-primary">
                {entry.creator.name}
              </span>
            </div>
          )}

          {/* Лайки и меню */}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                isLiked
                  ? 'text-red-500 bg-red-50/50'
                  : 'text-secondary hover:text-red-500 hover:bg-red-50/50'
              }`}
            >
              <svg className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm">{likesCount}</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100/50 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zM13 12a1 1 0 11-2 0 1 1 0 012 0zM20 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>

              {showMenu && (
                <EntryMenu
                  entry={entry}
                  onClose={() => setShowMenu(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}