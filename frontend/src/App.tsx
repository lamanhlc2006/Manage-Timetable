import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import vi_VN from 'antd/locale/vi_VN';
import en_US from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import './i18n';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateSchedule } from './pages/CreateSchedule';
import { UserManagement } from './pages/UserManagement';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { CommonLayout } from './components/CommonLayout';
const SharedCalendarView = React.lazy(() => import('./pages/SharedCalendarView'));
const GroupManagement = React.lazy(() => import('./pages/GroupManagement'));
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Route wrapper to guard pages requiring authentication
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => !!localStorage.getItem('user'));

  React.useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  if (!isAuthenticated || !localStorage.getItem('user')) {
    // Smoothly redirect to login if user isn't authenticated
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Route wrapper to guard pages requiring administrator rights
const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const userString = localStorage.getItem('user');
  if (!userString) {
    return <Navigate to="/login" replace />;
  }
  try {
    const user = JSON.parse(userString);
    if (user.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
  } catch (err) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  return (
    <ConfigProvider
      locale={currentLang.startsWith('en') ? en_US : vi_VN}
      theme={{
        algorithm: theme === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      }}
    >
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Public Shared Calendar Route */}
          <Route path="/shared/:token" element={
            <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Đang tải...</div>}>
              <SharedCalendarView />
            </React.Suspense>
          } />

          {/* Protected Dashboard Routes nested under CommonLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <CommonLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="create-schedule" element={<CreateSchedule />} />
            <Route path="groups" element={<React.Suspense fallback={<div>Đang tải...</div>}><GroupManagement /></React.Suspense>} />
            <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          </Route>

          {/* Fallback route - Redirect any unrecognized paths */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
