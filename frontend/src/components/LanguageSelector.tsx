import React from 'react';
import { Select, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

interface LanguageSelectorProps {
  type?: 'select' | 'segmented';
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  type = 'select',
  size = 'middle',
  style,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  const handleChange = (val: string) => {
    changeLanguage(val as 'vi' | 'en');
  };

  if (type === 'segmented') {
    return (
      <Segmented
        size={size}
        value={currentLang.startsWith('en') ? 'en' : 'vi'}
        onChange={(val) => handleChange(val as string)}
        options={[
          { label: '🇻🇳 VN', value: 'vi' },
          { label: '🇬🇧 EN', value: 'en' },
        ]}
        style={style}
      />
    );
  }

  return (
    <Select
      size={size}
      value={currentLang.startsWith('en') ? 'en' : 'vi'}
      onChange={handleChange}
      style={{ width: 110, ...style }}
      options={[
        { value: 'vi', label: '🇻🇳 VN' },
        { value: 'en', label: '🇬🇧 EN' },
      ]}
    />
  );
};
