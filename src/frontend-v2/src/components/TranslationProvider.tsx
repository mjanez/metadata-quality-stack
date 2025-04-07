import { useEffect, useState } from 'react';
import { loadTranslations } from '../lib/utils/loadTranslations';
import { currentLang, type Language } from '../lib/stores/i18n';

interface TranslationProviderProps {
  children: React.ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeTranslations = async () => {
      try {
        // Load saved language preference or detect from browser
        const savedLang = localStorage.getItem('preferred-language') as Language;
        const browserLang = navigator.language.split('-')[0] as Language;
        const initialLang = savedLang || (browserLang === 'es' ? 'es' : 'en');
        
        currentLang.set(initialLang);
        await loadTranslations();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load translations'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeTranslations();
  }, []);

  if (isLoading) {
    return <div>Loading translations...</div>;
  }

  if (error) {
    return <div>Error loading translations: {error.message}</div>;
  }

  return <>{children}</>;
}