import { useStore } from '@nanostores/react';
import { useState } from 'react';
import { validationState, FORMAT_MIME_TYPES } from '../lib/stores/validation';
import { useTranslation } from '../lib/hooks/useTranslation';
import { ProfileSelector } from './ProfileSelector';

interface ValidationInput {
  content?: string;
  url?: string;
  format: keyof typeof FORMAT_MIME_TYPES;
}

export function ValidationForm() {
  const $validationState = useStore(validationState);
  const { t } = useTranslation();
  const [input, setInput] = useState<ValidationInput>({
    format: 'Turtle (TTL)'
  });

  const handleInputChange = (value: string) => {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      setInput(prev => ({ ...prev, url: value, content: undefined }));
    } else {
      setInput(prev => ({ ...prev, content: value, url: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validationState.set({
      ...$validationState,
      isValidating: true,
      error: undefined,
      inputContent: input.content,
      inputUrl: input.url,
      inputFormat: FORMAT_MIME_TYPES[input.format]
    });

    // Validation logic will be implemented later
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('input_format')}
        </label>
        <select
          value={input.format}
          onChange={(e) => setInput(prev => ({ ...prev, format: e.target.value as keyof typeof FORMAT_MIME_TYPES }))}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          {Object.keys(FORMAT_MIME_TYPES).map((format) => (
            <option key={format} value={format}>
              {format}
            </option>
          ))}
        </select>
      </div>

      <ProfileSelector />

      <div>
        <label className="block text-sm font-medium text-gray-700">
          {t('input_data')}
        </label>
        <div className="mt-1">
          <textarea
            rows={10}
            value={input.content || input.url || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={t('enter_rdf_or_url')}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {t('input_help_text')}
        </p>
      </div>

      <div>
        <button
          type="submit"
          disabled={$validationState.isValidating || (!input.content && !input.url)}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {$validationState.isValidating ? t('validating') : t('validate')}
        </button>
      </div>

      {$validationState.error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {t('validation_error')}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{$validationState.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}