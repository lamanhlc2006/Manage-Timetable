import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // Add/remove class name on body tag for global CSS selectors
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.style.backgroundColor = '#141414';
      document.body.style.color = 'rgba(255, 255, 255, 0.85)';
    } else {
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundColor = '#f0f2f5';
      document.body.style.color = 'rgba(0, 0, 0, 0.85)';
    }

    // Inject styles for FullCalendar if not already present
    let styleTag = document.getElementById('fullcalendar-dark-styles');
    if (theme === 'dark') {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'fullcalendar-dark-styles';
        styleTag.innerHTML = `
          body.dark-mode .fc {
            --fc-border-color: #303030;
            --fc-daygrid-event-dot-color: #177ddc;
            --fc-page-bg-color: #141414;
            --fc-neutral-bg-color: #1f1f1f;
            --fc-list-event-hover-bg-color: #262626;
            color: rgba(255, 255, 255, 0.85);
          }
          body.dark-mode .fc-theme-standard td,
          body.dark-mode .fc-theme-standard th,
          body.dark-mode .fc-theme-standard .fc-scrollgrid {
            border-color: #303030 !important;
          }
          body.dark-mode .fc .fc-col-header-cell-cushion,
          body.dark-mode .fc .fc-daygrid-day-number,
          body.dark-mode .fc .fc-list-day-text,
          body.dark-mode .fc .fc-list-day-side-text {
            color: rgba(255, 255, 255, 0.85) !important;
          }
          body.dark-mode .fc .fc-day-today {
            background-color: rgba(23, 125, 220, 0.15) !important;
          }
          body.dark-mode .fc .fc-list-event:hover td {
            background-color: #262626 !important;
          }
          body.dark-mode .fc .fc-list-empty {
            background-color: #141414 !important;
            color: rgba(255, 255, 255, 0.45);
          }
          body.dark-mode .fc-list-day {
            background-color: #1f1f1f !important;
          }
          body.dark-mode .fc-list-day td {
            background-color: #1f1f1f !important;
          }
          body.dark-mode .fc .fc-timegrid-slot-label-cushion {
            color: rgba(255, 255, 255, 0.85) !important;
          }
          body.dark-mode .fc .fc-list-table {
            border-color: #303030 !important;
          }
          body.dark-mode .fc .fc-list-event td {
            border-color: #303030 !important;
          }
        `;
        document.head.appendChild(styleTag);
      }
    } else {
      if (styleTag) {
        styleTag.remove();
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
