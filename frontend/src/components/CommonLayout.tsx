import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Tag, Popconfirm, Badge, Popover, List, Typography, Empty, Spin, Tooltip } from 'antd';
import {
  CalendarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  ScheduleOutlined,
  PlusCircleOutlined,
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  DisconnectOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { PomodoroModal } from './PomodoroModal';
import { LanguageSelector } from './LanguageSelector';
import { requestNotificationPermission, subscribeUserToWebPush, unsubscribeUserFromWebPush } from '../utils/pwaHelper';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  NotificationItem,
} from '../services/notificationService';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

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

  // Responsive breakpoints handler (< 768px: Mobile bottom bar, 768-1024px: Auto-collapse sidebar)
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Retrieve user data from localStorage safely with useMemo
  const userString = localStorage.getItem('user');
  const user = useMemo(() => {
    if (!userString) return null;
    try {
      return JSON.parse(userString);
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
      localStorage.removeItem('user'); // Clear corrupted user state
      return null;
    }
  }, [userString]);

  const userId = user?._id || user?.id;

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
    // Periodically poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, userId]);

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
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: now }))
      );
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
    if (!item.isRead) {
      await handleMarkRead(item._id);
    }

    const scheduleId = typeof item.relatedSchedule === 'object'
      ? item.relatedSchedule?._id
      : item.relatedSchedule;

    if (location.pathname !== '/dashboard') {
      navigate('/dashboard', { state: { scheduleId } });
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);

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

  const getActiveKey = () => {
    if (location.pathname === '/dashboard') return ['dashboard'];
    if (location.pathname === '/analytics') return ['analytics'];
    if (location.pathname === '/settings') return ['settings'];
    if (location.pathname === '/create-schedule') return ['create-schedule'];
    if (location.pathname === '/users') return ['users'];
    return [];
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '18px' }} />;
      case 'reminder':
        return <ClockCircleOutlined style={{ color: '#faad14', fontSize: '18px' }} />;
      case 'update':
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '18px' }} />;
    }
  };

  const notifPopoverContent = (
    <div style={{ width: 360, maxHeight: 420, overflowY: 'auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '8px',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text strong style={{ fontSize: '15px' }}>
            {t('nav.notifications')}
          </Text>
          {unreadNotifications.length > 0 && (
            <Tag color="red">{unreadNotifications.length} {t('nav.unread')}</Tag>
          )}
        </div>
        {unreadNotifications.length > 0 && (
          <Button
            type="link"
            size="small"
            onClick={handleMarkAllRead}
            style={{ padding: 0, fontSize: '12px' }}
          >
            {t('nav.markAllRead')}
          </Button>
        )}
      </div>

      {loadingNotifs && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description={t('nav.noNotifications')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleNotificationClick(item)}
              style={{
                padding: '10px 8px',
                borderRadius: '6px',
                marginBottom: '6px',
                background: item.isRead ? '#ffffff' : '#e6f7ff',
                border: item.isRead ? '1px solid #f0f0f0' : '1px solid #bae7ff',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              actions={[
                !item.isRead ? (
                  <Tooltip title={t('nav.markAsRead')} key="read">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                      onClick={(e) => handleMarkRead(item._id, e)}
                    />
                  </Tooltip>
                ) : null,
                <Tooltip title={t('nav.deleteNotification')} key="delete">
                  <Button
                    type="text"
                    size="small"
                    shape="circle"
                    danger
                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                    onClick={(e) => handleDeleteNotif(item._id, e)}
                  />
                </Tooltip>,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={getNotifIcon(item.type)}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong={!item.isRead} style={{ fontSize: '13px', color: item.isRead ? '#555' : '#1890ff' }}>
                      {item.title}
                    </Text>
                    <span style={{ fontSize: '11px', color: '#8c8c8c', marginLeft: '8px' }}>
                      {dayjs(item.createdAt).locale(i18n.language || 'vi').fromNow()}
                    </span>
                  </div>
                }
                description={
                  <div>
                    <div style={{ fontSize: '12px', color: item.isRead ? '#666' : '#262626', marginTop: '2px' }}>
                      {item.message}
                    </div>
                    <div style={{ fontSize: '10px', color: '#bfbfbf', marginTop: '4px' }}>
                      {dayjs(item.createdAt).format('HH:mm - DD/MM/YYYY')}
                      {item.isRead && item.readAt && (
                        <span style={{ marginLeft: '8px', color: '#52c41a' }}>
                          ✓ {t('nav.read')}
                        </span>
                      )}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  const mobileUserPopoverContent = (
    <div style={{ width: 220, padding: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0', marginBottom: '10px' }}>
        <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} size="default" />
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Text strong style={{ fontSize: '14px' }} ellipsis>{user ? user.username : 'Guest'}</Text>
          {user && (
            <Tag color={user.role === 'admin' ? 'red' : 'blue'} style={{ textTransform: 'uppercase', margin: '2px 0 0 0', width: 'fit-content', fontSize: '10px' }}>
              {user.role}
            </Tag>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '12px', color: '#595959' }}>{t('nav.language') || 'Ngôn ngữ'}:</Text>
          <LanguageSelector size="small" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '12px', color: '#595959' }}>{t('nav.theme') || 'Giao diện'}:</Text>
          <Button
            type="text"
            size="small"
            onClick={toggleTheme}
            icon={theme === 'dark' ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined style={{ color: '#555' }} />}
            style={{ fontSize: '12px' }}
          >
            {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
          </Button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '12px', color: '#595959' }}>Web Push:</Text>
          <Button
            type="text"
            size="small"
            onClick={handleTogglePushNotifications}
            icon={<BellOutlined style={{ color: pushPermission === 'granted' ? '#52c41a' : '#555' }} />}
            style={{ fontSize: '12px' }}
          >
            {pushPermission === 'granted' ? 'Bật' : 'Tắt'}
          </Button>
        </div>

        <div style={{ paddingTop: '10px', borderTop: '1px solid #f0f0f0', marginTop: '2px' }}>
          <Popconfirm
            title={t('nav.logoutConfirm')}
            onConfirm={handleLogout}
            okText={t('nav.logout')}
            cancelText={t('common.cancel')}
            placement="bottomRight"
          >
            <Button type="primary" danger ghost icon={<LogoutOutlined />} block size="small" style={{ borderRadius: '6px' }}>
              {t('nav.logout')}
            </Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );

  const menuItems = useMemo(() => {
    const items = [
      {
        key: 'dashboard',
        icon: <CalendarOutlined />,
        label: t('nav.timetable'),
        onClick: () => navigate('/dashboard'),
      },
      {
        key: 'analytics',
        icon: <BarChartOutlined />,
        label: t('nav.analytics'),
        onClick: () => navigate('/analytics'),
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: t('nav.settings'),
        onClick: () => navigate('/settings'),
      },
    ];

    if (user && user.role === 'admin') {
      items.push(
        {
          key: 'create-schedule',
          icon: <PlusCircleOutlined />,
          label: t('nav.createSchedule'),
          onClick: () => navigate('/create-schedule'),
        },
        {
          key: 'users',
          icon: <UserOutlined />,
          label: t('nav.userManagement'),
          onClick: () => navigate('/users'),
        }
      );
    }

    return items;
  }, [user, navigate, t]);

  return (
    <Layout style={{ minHeight: '100vh', background: theme === 'dark' ? '#141414' : '#f4f6fc' }}>
      <style>{`
        @media (max-width: 767px) {
          .ant-layout-sider, .ant-layout-sider-children {
            display: none !important;
            width: 0 !important;
            min-width: 0 !important;
            max-width: 0 !important;
            flex: 0 0 0 !important;
          }
        }
      `}</style>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme={theme}
          style={{
            boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
            zIndex: 10,
            borderRight: theme === 'dark' ? '1px solid #303030' : 'none',
          }}
        >
          <div
            style={{
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderBottom: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0',
              fontWeight: 'bold',
              fontSize: collapsed ? '18px' : '16px',
              color: '#1890ff',
              transition: 'all 0.2s',
            }}
          >
            <ScheduleOutlined style={{ fontSize: '24px' }} />
            {!collapsed && <span>TIMETABLE</span>}
          </div>
          <Menu
            mode="inline"
            theme={theme}
            selectedKeys={getActiveKey()}
            items={menuItems}
            style={{ borderRight: 0, marginTop: '16px' }}
          />
        </Sider>
      )}
      <Layout style={{ overflowX: 'hidden' }}>
        <Header
          style={{
            background: theme === 'dark' ? '#1f1f1f' : '#fff',
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: theme === 'dark' ? 'none' : '0 1px 4px rgba(0,21,41,.08)',
            borderBottom: theme === 'dark' ? '1px solid #303030' : 'none',
            zIndex: 9,
            overflow: 'hidden',
          }}
        >
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '15px', color: '#1890ff' }}>
              <ScheduleOutlined style={{ fontSize: '20px' }} />
              <span>TIMETABLE</span>
            </div>
          ) : (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64, color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : undefined }}
            />
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '16px' }}>
            {/* Network Offline Status Tag */}
            {!isOnline && (
              <Tag color="warning" icon={<DisconnectOutlined />} style={{ margin: 0, padding: '0 6px', fontSize: '11px' }}>
                {isMobile ? 'Offline' : t('common.offline')}
              </Tag>
            )}

            {/* Mobile-optimized Header vs Desktop Header */}
            {isMobile ? (
              <>
                {/* Pomodoro Focus Timer Button */}
                <Tooltip title={t('nav.focusMode')}>
                  <Button
                    type="text"
                    shape="circle"
                    onClick={() => setPomodoroOpen(true)}
                    icon={<FireOutlined style={{ fontSize: '18px', color: '#ff4d4f' }} />}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}
                  />
                </Tooltip>

                {/* Notification Bell with Badge and Popover */}
                <Popover
                  content={notifPopoverContent}
                  trigger="click"
                  placement="bottomRight"
                  onOpenChange={(open) => {
                    if (open) loadNotifications();
                  }}
                >
                  <Badge count={unreadNotifications.length} overflowCount={99} size="small">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<BellOutlined style={{ fontSize: '18px', color: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : '#555' }} />}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}
                    />
                  </Badge>
                </Popover>

                {/* User Menu Popover */}
                <Popover content={mobileUserPopoverContent} trigger="click" placement="bottomRight">
                  <div style={{ cursor: 'pointer', padding: '2px' }}>
                    <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} size="small" />
                  </div>
                </Popover>
              </>
            ) : (
              <>
                {/* Web Push Notification Toggle Button */}
                <Tooltip title={pushPermission === 'granted' ? t('nav.webPushEnabled') : t('nav.enableWebPush')}>
                  <Button
                    type="text"
                    shape="circle"
                    onClick={handleTogglePushNotifications}
                    icon={<BellOutlined style={{ fontSize: '18px', color: pushPermission === 'granted' ? '#52c41a' : (theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : '#555') }} />}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Tooltip>

                {/* Language Selector */}
                <LanguageSelector size="small" />

                {/* Pomodoro Focus Timer Button */}
                <Tooltip title={t('nav.focusMode')}>
                  <Button
                    type="text"
                    shape="circle"
                    onClick={() => setPomodoroOpen(true)}
                    icon={<FireOutlined style={{ fontSize: '18px', color: '#ff4d4f' }} />}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Tooltip>

                {/* Theme Toggle Button */}
                <Tooltip title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
                  <Button
                    type="text"
                    shape="circle"
                    onClick={toggleTheme}
                    icon={theme === 'dark' ? <SunOutlined style={{ fontSize: '18px', color: '#faad14' }} /> : <MoonOutlined style={{ fontSize: '18px', color: '#555' }} />}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Tooltip>

                {/* Notification Bell with Badge and Popover */}
                <Popover
                  content={notifPopoverContent}
                  trigger="click"
                  placement="bottomRight"
                  onOpenChange={(open) => {
                    if (open) loadNotifications();
                  }}
                >
                  <Badge count={unreadNotifications.length} overflowCount={99} size="small">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<BellOutlined style={{ fontSize: '18px', color: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : '#555' }} />}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                  </Badge>
                </Popover>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} size="default" />
                  <span style={{ fontWeight: 500, color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#333' }}>
                    {user ? user.username : 'Guest'}
                  </span>
                  {user && (
                    <Tag color={user.role === 'admin' ? 'red' : 'blue'} style={{ textTransform: 'uppercase', margin: 0 }}>
                      {user.role}
                    </Tag>
                  )}
                </div>

                <Popconfirm
                  title={t('nav.logoutConfirm')}
                  onConfirm={handleLogout}
                  okText={t('nav.logout')}
                  cancelText={t('common.cancel')}
                  placement="bottomRight"
                >
                  <Button
                    type="primary"
                    danger
                    ghost
                    icon={<LogoutOutlined />}
                    size="middle"
                    style={{ borderRadius: '6px' }}
                  >
                    {t('nav.logout')}
                  </Button>
                </Popconfirm>
              </>
            )}
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? '12px 8px' : '24px',
            padding: isMobile ? '12px' : '24px',
            marginBottom: isMobile ? '76px' : '24px',
            background: theme === 'dark' ? '#1f1f1f' : '#fff',
            borderRadius: '12px',
            boxShadow: theme === 'dark' ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.05)',
            border: theme === 'dark' ? '1px solid #303030' : 'none',
            minHeight: 280,
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* Mobile Bottom Navigation Tab Bar */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '62px',
            background: theme === 'dark' ? '#1f1f1f' : '#ffffff',
            borderTop: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0',
            display: 'grid',
            gridTemplateColumns: user?.role === 'admin' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            alignItems: 'center',
            zIndex: 1000,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              cursor: 'pointer',
              color: location.pathname === '/dashboard' ? '#1890ff' : (theme === 'dark' ? '#a0a0a0' : '#8c8c8c'),
              borderTop: location.pathname === '/dashboard' ? '2px solid #1890ff' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <CalendarOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />
            <span style={{ fontSize: '11px', fontWeight: location.pathname === '/dashboard' ? 600 : 400 }}>{t('nav.timetable')}</span>
          </div>

          <div
            onClick={() => navigate('/analytics')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              cursor: 'pointer',
              color: location.pathname === '/analytics' ? '#1890ff' : (theme === 'dark' ? '#a0a0a0' : '#8c8c8c'),
              borderTop: location.pathname === '/analytics' ? '2px solid #1890ff' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <BarChartOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />
            <span style={{ fontSize: '11px', fontWeight: location.pathname === '/analytics' ? 600 : 400 }}>{t('nav.analytics')}</span>
          </div>

          {user && user.role === 'admin' && (
            <div
              onClick={() => navigate('/create-schedule')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                cursor: 'pointer',
                color: location.pathname === '/create-schedule' ? '#1890ff' : (theme === 'dark' ? '#a0a0a0' : '#8c8c8c'),
                borderTop: location.pathname === '/create-schedule' ? '2px solid #1890ff' : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              <PlusCircleOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />
              <span style={{ fontSize: '11px', fontWeight: location.pathname === '/create-schedule' ? 600 : 400 }}>{t('nav.createSchedule')}</span>
            </div>
          )}

          <div
            onClick={() => navigate('/settings')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              cursor: 'pointer',
              color: location.pathname === '/settings' ? '#1890ff' : (theme === 'dark' ? '#a0a0a0' : '#8c8c8c'),
              borderTop: location.pathname === '/settings' ? '2px solid #1890ff' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <SettingOutlined style={{ fontSize: '19px', marginBottom: '2px' }} />
            <span style={{ fontSize: '11px', fontWeight: location.pathname === '/settings' ? 600 : 400 }}>{t('nav.settings')}</span>
          </div>
        </div>
      )}

      {/* Pomodoro Focus Mode Modal */}
      <PomodoroModal
        open={pomodoroOpen}
        onClose={() => setPomodoroOpen(false)}
      />
    </Layout>
  );
};
