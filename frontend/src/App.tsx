import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateSchedule } from './pages/CreateSchedule';
import { UserManagement } from './pages/UserManagement';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { CommonLayout } from './components/CommonLayout';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Route wrapper to guard pages requiring authentication
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const user = localStorage.getItem('user');
  if (!user) {
    // Redirect to login if user isn't authenticated
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

  return (
    <ConfigProvider
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
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
