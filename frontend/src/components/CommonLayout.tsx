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
} from '@ant-design/icons';
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
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
            Thông báo
          </Text>
          {unreadNotifications.length > 0 && (
            <Tag color="red">{unreadNotifications.length} chưa đọc</Tag>
          )}
        </div>
        {unreadNotifications.length > 0 && (
          <Button
            type="link"
            size="small"
            onClick={handleMarkAllRead}
            style={{ padding: 0, fontSize: '12px' }}
          >
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {loadingNotifs && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin size="small" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="Không có thông báo nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                  <Tooltip title="Đánh dấu đã đọc" key="read">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                      onClick={(e) => handleMarkRead(item._id, e)}
                    />
                  </Tooltip>
                ) : null,
                <Tooltip title="Xóa thông báo" key="delete">
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
                      {dayjs(item.createdAt).locale('vi').fromNow()}
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
                          ✓ Đã đọc
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

  const menuItems = useMemo(() => {
    const items = [
      {
        key: 'dashboard',
        icon: <CalendarOutlined />,
        label: 'Thời gian biểu',
        onClick: () => navigate('/dashboard'),
      },
      {
        key: 'analytics',
        icon: <BarChartOutlined />,
        label: 'Thống kê báo cáo',
        onClick: () => navigate('/analytics'),
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Cài đặt',
        onClick: () => navigate('/settings'),
      },
    ];

    if (user && user.role === 'admin') {
      items.push(
        {
          key: 'create-schedule',
          icon: <PlusCircleOutlined />,
          label: 'Tạo lịch trình',
          onClick: () => navigate('/create-schedule'),
        },
        {
          key: 'users',
          icon: <UserOutlined />,
          label: 'Quản lý người dùng',
          onClick: () => navigate('/users'),
        }
      );
    }

    return items;
  }, [user, navigate]);

  return (
    <Layout style={{ minHeight: '100vh', background: theme === 'dark' ? '#141414' : '#f4f6fc' }}>
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
      <Layout>
        <Header
          style={{
            background: theme === 'dark' ? '#1f1f1f' : '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: theme === 'dark' ? 'none' : '0 1px 4px rgba(0,21,41,.08)',
            borderBottom: theme === 'dark' ? '1px solid #303030' : 'none',
            zIndex: 9,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64, color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : undefined }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Theme Toggle Button */}
            <Tooltip title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
              <span style={{ fontWeight: 500, color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : '#333' }}>
                {user ? user.username : 'Guest'}
              </span>
              {user && (
                <Tag color={user.role === 'admin' ? 'red' : 'blue'} style={{ textTransform: 'uppercase' }}>
                  {user.role}
                </Tag>
              )}
            </div>

            <Popconfirm
              title="Bạn có chắc chắn muốn đăng xuất không?"
              onConfirm={handleLogout}
              okText="Đăng xuất"
              cancelText="Hủy"
              placement="bottomRight"
            >
              <Button
                type="primary"
                danger
                ghost
                icon={<LogoutOutlined />}
                style={{ borderRadius: '6px' }}
              >
                Đăng xuất
              </Button>
            </Popconfirm>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
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
    </Layout>
  );
};
