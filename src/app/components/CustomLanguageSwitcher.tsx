import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLang, useSetLang } from '../../_metronic/i18n/Metronici18n';
import i18n from '../../i18n';
import clsx from 'clsx';

const CustomLanguageSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const currentLang = useLang();
  const setLanguage = useSetLang();

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className='d-flex align-items-center bg-light rounded p-1'>
      <button
        type='button'
        onClick={() => handleLanguageChange('en')}
        className={clsx(
          'btn btn-sm px-4 py-2 fw-bold transition-all',
          currentLang === 'en' ? 'btn-primary shadow-sm' : 'btn-light btn-color-gray-600'
        )}
      >
        EN
      </button>
      <button
        type='button'
        onClick={() => handleLanguageChange('ja')}
        className={clsx(
          'btn btn-sm px-4 py-2 fw-bold transition-all',
          currentLang === 'ja' ? 'btn-primary shadow-sm' : 'btn-light btn-color-gray-600'
        )}
      >
        JA
      </button>
    </div>
  );
};

export { CustomLanguageSwitcher };
