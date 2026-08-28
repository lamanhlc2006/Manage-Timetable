import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, notification as antdNotification, Button } from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  PlusCircleOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { PomodoroModal } from './PomodoroModal';
import { UpcomingEventsModal } from './UpcomingEventsModal';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { requestNotificationPermission, subscribeUserToWebPush, unsubscribeUserFromWebPush } from '../utils/pwaHelper';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useTheme } from '../context/ThemeContext';
import { playChimeSound } from '../utils/soundHelper';
import api from '../services/api';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  NotificationItem,
} from '../services/notificationService';
import { getUpcomingSchedules, ScheduleEvent } from '../services/scheduleService';
import { subscribeToScheduleEvents } from '../services/socketService';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Content } = Layout;

export const CommonLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pomodoroOpen, setPomodoroOpen] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isScrolled, setIsScrolled] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [isUpcomingModalVisible, setIsUpcomingModalVisible] = useState<boolean>(false);

  // ============ Side Effects ============
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 1024) setCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const lang = i18n.language || 'vi';
    dayjs.locale(lang === 'en' ? 'en' : 'vi');
  }, [i18n.language]);

  // ============ User Data ============
  const userString = localStorage.getItem('user');
  const user = useMemo(() => {
    if (!userString) return null;
    try {
      return JSON.parse(userString);
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
      localStorage.removeItem('user');
      return null;
    }
  }, [userString]);

  const userId = user?._id || user?.id;

  // ============ Notifications ============
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingNotifs(true);
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Error fetching notifications:', err);
      }
    } finally {
      setLoadingNotifs(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, userId]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToScheduleEvents({
      onNotificationNew: (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);

        // Show toast + play sound for reminder notifications
        if (newNotif.type === 'reminder') {
          playChimeSound('reminder');
          const notifKey = `reminder_${newNotif._id || Date.now()}`;
          antdNotification.info({
            key: notifKey,
            message: newNotif.title || t('nav.reminder', '⏰ Nhắc nhở'),
            description: (
              <div>
                <div style={{ marginBottom: '8px' }}>{newNotif.message}</div>
                <Button
                  type="primary"
                  size="small"
                  icon={<BellOutlined />}
                  onClick={() => {
                    antdNotification.destroy(notifKey);
                    if (location.pathname !== '/dashboard') {
                      navigate('/dashboard');
                    }
                  }}
                >
                  {t('nav.viewDetails', 'Xem chi tiết')}
                </Button>
              </div>
            ),
            icon: <BellOutlined style={{ color: '#faad14' }} />,
            placement: 'topRight',
            duration: 10,
          });
        }
      },
    });
    return () => { unsubscribe(); };
  }, [userId, t, navigate, location.pathname]);

  // Upcoming events check
  useEffect(() => {
    if (!userId) return;
    const checkUpcoming = async () => {
      try {
        const upcoming = await getUpcomingSchedules();
        if (upcoming && upcoming.length > 0) {
          setUpcomingEvents(upcoming);
          setIsUpcomingModalVisible(true);
        }
      } catch (err) {
        console.error('Error fetching upcoming events summary:', err);
      }
    };
    checkUpcoming();
  }, [userId]);

  // ============ Handlers ============
  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: now })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleDeleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) await handleMarkRead(item._id);
    const scheduleId = typeof item.relatedSchedule === 'object' ? item.relatedSchedule?._id : item.relatedSchedule;
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard', { state: { scheduleId } });
    }
  };

  const handleTogglePushNotifications = async () => {
    if (pushPermission === 'granted') {
      await unsubscribeUserFromWebPush();
      setPushPermission('default');
    } else {
      const success = await subscribeUserToWebPush();
      if (success) {
        setPushPermission('granted');
      } else {
        const permission = await requestNotificationPermission();
        setPushPermission(permission);
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (localStorage.getItem('offlineMode') !== 'true') {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.error('Logout error', err);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('offlineMode');
    navigate('/login');
  };

  // ============ Navigation ============
  const getActiveKey = () => {
    if (location.pathname === '/dashboard') return ['dashboard'];
    if (location.pathname === '/analytics') return ['analytics'];
    if (location.pathname === '/settings') return ['settings'];
    if (location.pathname === '/create-schedule') return ['create-schedule'];
    if (location.pathname === '/users') return ['users'];
    return [];
  };

  const menuItems = useMemo(() => {
    const items = [
      { key: 'dashboard', icon: <CalendarOutlined />, label: t('nav.timetable'), onClick: () => navigate('/dashboard') },
      { key: 'analytics', icon: <BarChartOutlined />, label: t('nav.analytics'), onClick: () => navigate('/analytics') },
      { key: 'settings', icon: <SettingOutlined />, label: t('nav.settings'), onClick: () => navigate('/settings') },
      { key: 'groups', icon: <TeamOutlined />, label: t('nav.groups', 'Nhóm'), onClick: () => navigate('/groups') },
    ];
    if (user && user.role === 'admin') {
      items.push(
        { key: 'create-schedule', icon: <PlusCircleOutlined />, label: t('nav.createSchedule'), onClick: () => navigate('/create-schedule') },
        { key: 'users', icon: <UserOutlined />, label: t('nav.userManagement'), onClick: () => navigate('/users') }
      );
    }
    return items;
  }, [user, navigate, t]);

  // ============ Render ============
  return (
    <Layout style={{ minHeight: '100vh', background: theme === 'dark' ? '#141414' : '#f4f6fc' }}>
      <style>{`
        .ant-layout-sider-children {
          display: flex !important; flex-direction: column !important;
          height: calc(100vh - 64px) !important; overflow-y: auto !important; overflow-x: hidden !important;
        }
        .ant-layout-sider-children::-webkit-scrollbar { width: 4px; }
        .ant-layout-sider-children::-webkit-scrollbar-track { background: transparent; }
        .ant-layout-sider-children::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#424242' : '#d9d9d9'}; border-radius: 4px; }
        @media (max-width: 767px) {
          .ant-layout-sider, .ant-layout-sider-children {
            display: none !important; width: 0 !important; min-width: 0 !important;
            max-width: 0 !important; flex: 0 0 0 !important;
          }
        }
      `}</style>

      <AppHeader
        theme={theme} toggleTheme={toggleTheme}
        isMobile={isMobile} isScrolled={isScrolled} isOnline={isOnline} user={user}
        notifications={notifications} loadingNotifs={loadingNotifs}
        onLoadNotifications={loadNotifications}
        onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead}
        onDeleteNotif={handleDeleteNotif} onNotificationClick={handleNotificationClick}
        pushPermission={pushPermission} onTogglePush={handleTogglePushNotifications}
        onPomodoroOpen={() => setPomodoroOpen(true)} onLogout={handleLogout}
        onNavigateHome={() => navigate('/dashboard')}
      />

      {!isMobile && (
        <AppSidebar
          collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}
          menuItems={menuItems} activeKeys={getActiveKey()} theme={theme}
        />
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 200),
          paddingTop: '64px', minHeight: '100vh',
          transition: 'margin-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)', overflowX: 'hidden',
        }}
      >
        <Content
          style={{
            margin: isMobile ? '12px 8px' : '24px',
            padding: isMobile ? '12px' : '24px',
            marginBottom: isMobile ? '76px' : '24px',
            background: theme === 'dark' ? '#1f1f1f' : '#fff',
            borderRadius: '12px',
            boxShadow: theme === 'dark' ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.05)',
            border: theme === 'dark' ? '1px solid #303030' : 'none',
            minHeight: 280, overflowY: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {isMobile && <MobileBottomNav isAdmin={user?.role === 'admin'} theme={theme} />}

      <PomodoroModal open={pomodoroOpen} onClose={() => setPomodoroOpen(false)} />

      <UpcomingEventsModal
        visible={isUpcomingModalVisible} events={upcomingEvents}
        onClose={() => setIsUpcomingModalVisible(false)}
        onSelectEvent={(evt) => {
          if (location.pathname !== '/dashboard') {
            navigate('/dashboard', { state: { scheduleId: evt._id } });
          }
        }}
      />
    </Layout>
  );
};
