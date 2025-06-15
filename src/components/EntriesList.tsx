import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useEntries } from '../hooks';
import { EntryCard } from './EntryCard';
import { useInView } from '../hooks/useInView';
import { Entry } from '../types';
import { p2pClient } from '../utils/api';
import { useQueryClient } from '@tanstack/react-query';

export const EntriesList = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView();
  const queryClient = useQueryClient();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useEntries();

  // P2P реал-тайм обновления
  useEffect(() => {
    console.log('🔗 Подписываемся на P2P события');

    const handleNewEntry = (entry: Entry) => {
      console.log('📝 Новый пост из P2P:', entry.title);
      
      // Добавляем новый пост в начало списка
      queryClient.setQueryData(['entries'], (oldData: any) => {
        if (!oldData) return { pages: [[entry]], pageParams: [0] };
        
        const newPages = [...oldData.pages];
        newPages[0] = [entry, ...newPages[0]];
        
        return {
          ...oldData,
          pages: newPages
        };
      });
    };

    const handleSyncComplete = (count: number) => {
      console.log(`🔄 Синхронизация завершена: ${count} постов`);
      // Полное обновление данных после синхронизации
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    };

    const handleEntryUpdate = (data: any) => {
      if (data.type === 'like_toggle') {
        console.log('❤️ Обновление лайка из P2P:', data.entryId);
        
        // Обновляем конкретный пост
        queryClient.setQueryData(['entries'], (oldData: any) => {
          if (!oldData) return oldData;
          
          const newPages = oldData.pages.map((page: Entry[]) =>
            page.map((entry: Entry) => {
              if (entry.id === data.entryId) {
                const isLiked = entry.liked_by.includes(data.userId);
                return {
                  ...entry,
                  liked_by: isLiked 
                    ? entry.liked_by.filter(id => id !== data.userId)
                    : [...entry.liked_by, data.userId]
                };
              }
              return entry;
            })
          );
          
          return { ...oldData, pages: newPages };
        });
      }
    };

    // Подписываемся на события
    p2pClient.on('new_entry', handleNewEntry);
    p2pClient.on('sync_complete', handleSyncComplete);
    p2pClient.on('entry_update', handleEntryUpdate);

    // Cleanup при размонтировании
    return () => {
      console.log('🔗 Отписываемся от P2P событий');
      p2pClient.off('new_entry', handleNewEntry);
      p2pClient.off('sync_complete', handleSyncComplete);
      p2pClient.off('entry_update', handleEntryUpdate);
    };
  }, [queryClient]);

  // Бесконечная прокрутка
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      console.log('📄 Загружаем следующую страницу');
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-secondary">Загрузка из P2P...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">❌</div>
        <p className="text-secondary text-sm">Ошибка загрузки данных</p>
        <button 
          onClick={() => {
            console.log('🔄 Повторная синхронизация');
            p2pClient.requestSync();
            queryClient.invalidateQueries({ queryKey: ['entries'] });
          }}
          className="mt-2 px-4 py-2 bg-primary text-white text-sm rounded-lg"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const entries = data?.pages.flatMap((page: Entry[]) => page) || [];

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">📭</div>
        <p className="text-secondary mb-4">{t('empty')}</p>
        <button 
          onClick={() => {
            console.log('🔄 Запрос синхронизации');
            p2pClient.requestSync();
          }}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg"
        >
          🔄 Синхронизация
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Статистика P2P */}
      <div className="text-center text-xs text-secondary mb-4">
        📊 {entries.length} постов • 
        {p2pClient.connected ? ' 🟢 Онлайн' : ' 🔴 Офлайн'}
        {p2pClient.queueSize > 0 && ` • 📤 ${p2pClient.queueSize}`}
      </div>

      {/* Список постов */}
      {entries.map((entry: Entry, index: number) => (
        <EntryCard key={`${entry.id}-${index}`} entry={entry} />
      ))}

      {/* Индикатор загрузки */}
      <div ref={ref} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-secondary">Загрузка...</span>
          </div>
        )}
        {!hasNextPage && entries.length > 0 && (
          <p className="text-xs text-secondary">Все посты загружены</p>
        )}
      </div>
    </div>
  );
};