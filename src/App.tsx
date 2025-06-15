import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useStore } from './store';
import { initTelegram, getTelegramUser } from './lib/telegram';
import { createUser, initP2P, p2pClient } from './utils/api';
import { Header } from './components/Header';
import { SortBar } from './components/SortBar';
import { EntriesList } from './components/EntriesList';
import { LanguageModal } from './components/LanguageModal';
import { FloatingCreateButton } from './components/FloatingCreateButton';
import { Language } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { i18n } = useTranslation();
  const { setUser, setLanguage, setFiltersData } = useStore();
  const [showLanguageModal, setShowLanguageModal] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [p2pStatus, setP2pStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const language = ['ru', 'en'].includes(i18n.language) ? i18n.language : 'ru'
        const [citiesModule, typesModule, gendersModule] = await Promise.all([
          import(`./data/cities-${language}.ts`),
          import(`./data/types-${language}.ts`),
          import(`./data/genders-${language}.ts`),
        ]);
        setFiltersData({
          cities: citiesModule.cities || [],
          types: typesModule.types || [],
          genders: gendersModule.genders || [],
        });
      } catch (error) {
        console.error('Ошибка загрузки данных фильтров:', error);
        setFiltersData({
          cities: [],
          types: [],
          genders: [],
        });
      }
    };
    loadFiltersData();
  }, [i18n.language, setFiltersData]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔧 Инициализация приложения...');
        
        // 1. Инициализируем Telegram
        initTelegram();
        const telegramUser = getTelegramUser();
        console.log('👤 Telegram User:', telegramUser);

        // 2. Создаем/получаем пользователя
        if (telegramUser) {
          console.log('📡 Создание пользователя...');
          const user = await createUser(telegramUser);
          console.log('✅ Пользователь создан/найден:', user);
          setUser(user);
        } else {
          console.log('❌ Telegram пользователь не найден - гостевой режим');
        }

        // 3. Инициализируем P2P систему
        console.log('🚀 Инициализация P2P...');
        await initP2P();
        setP2pStatus('connected');
        console.log('✅ P2P система готова');

        // 4. Подписываемся на P2P события
        p2pClient.on('new_entry', (entry) => {
          console.log('📝 Получен новый пост из P2P:', entry.title);
          // Обновляем React Query кэш
          queryClient.invalidateQueries({ queryKey: ['entries'] });
        });

        p2pClient.on('sync_complete', (count) => {
          console.log(`🔄 Синхронизация завершена: ${count} постов`);
          queryClient.invalidateQueries({ queryKey: ['entries'] });
        });

        setIsInitialized(true);
        console.log('🎉 Приложение полностью инициализировано');

      } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        setP2pStatus('error');
        setIsInitialized(true); // Показываем UI даже при ошибке
      }
    };

    initializeApp();

    // Cleanup при размонтировании
    return () => {
      p2pClient.disconnect();
    };
  }, [setUser, queryClient]);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    setShowLanguageModal(false);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background bg-dot-grid bg-12px flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-slow w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-primary font-medium">Инициализация P2P...</p>
          <p className="text-sm text-secondary mt-2">
            {p2pStatus === 'connecting' && '🔌 Подключение к серверу...'}
            {p2pStatus === 'connected' && '✅ Система готова'}
            {p2pStatus === 'error' && '❌ Ошибка подключения'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-dot-grid bg-12px">
      <div className="max-w-md mx-auto min-h-screen lg:max-w-none lg:w-1/3 lg:mx-auto lg:border-x lg:border-gray-200">
        <div className="relative bg-transparent">
          {/* P2P статус индикатор */}
          <div className="fixed top-2 right-2 z-50">
            <div className={`w-3 h-3 rounded-full ${
              p2pStatus === 'connected' ? 'bg-green-500' : 
              p2pStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            }`} title={`P2P: ${p2pStatus}`} />
          </div>

          <Header />
          <SortBar />
          <div className="px-4 py-4 pb-24">
            <EntriesList />
          </div>
        </div>

        <FloatingCreateButton />

        <LanguageModal
          isOpen={showLanguageModal}
          onSelect={handleLanguageSelect}
          canClose={false}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}