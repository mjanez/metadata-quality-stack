import React from 'react';
import { useStore } from '@nanostores/react';
import { validationState, PROFILES } from '../lib/stores/validation';
import { t } from '../lib/stores/i18n';

export function ProfileSelector() {
  const $validationState = useStore(validationState);

  const handleProfileChange = (profile: string) => {
    validationState.set({
      ...$validationState,
      profile: profile as keyof typeof PROFILES
    });
  };

  return (
    <div className="profile-selector">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('select_profile')}
      </label>
      <select
        value={$validationState.profile}
        onChange={(e) => handleProfileChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-md px-3 py-2 w-full"
      >
        {Object.entries(PROFILES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}