import React from 'react';
import { useTranslation } from '../lib/hooks/useTranslation';
import type { Language } from '../lib/stores/i18n';

const LANGUAGES: Record<Language, string> = {
  en: 'English',
  es: 'Español'
};

export function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="relative inline-block text-left">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        aria-label={t('select_language')}
      >
        {Object.entries(LANGUAGES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}