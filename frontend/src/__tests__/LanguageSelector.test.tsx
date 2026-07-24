import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LanguageSelector } from '../components/LanguageSelector';

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    i18n: {
      language: 'vi',
      changeLanguage: vi.fn(),
    },
    t: (key: string) => key,
  }),
}));

describe('LanguageSelector Component', () => {
  it('renders LanguageSelector select element cleanly', () => {
    render(<LanguageSelector />);
    const selector = screen.getByRole('combobox');
    expect(selector).toBeInTheDocument();
  });
});
