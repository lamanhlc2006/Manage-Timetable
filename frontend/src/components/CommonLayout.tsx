import React, { useState, useEffect, useCallback } from 'react';
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
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  fetchNotifications,
  markNotificationAsRead,
  NotificationItem,
} from '../services/notificationService';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const CommonLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve user data from localStorage safely
  const userString = localStorage.getItem('user');
  let user: any = null;
  if (userString) {
    try {
      user = JSON.parse(userString);
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
      localStorage.removeItem('user'); // Clear corrupted user state
    }
  }

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingNotifs(true);
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    // Periodically poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
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
    <div style={{ width: 340, maxHeight: 400, overflowY: 'auto' }}>
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
        <Text strong style={{ fontSize: '15px' }}>
          Thông báo
        </Text>
        {unreadNotifications.length > 0 && (
          <Tag color="red">{unreadNotifications.length} chưa đọc</Tag>
        )}
      </div>

      {loadingNotifs && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin size="small" />
        </div>
      ) : unreadNotifications.length === 0 ? (
        <Empty description="Không có thông báo mới" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={unreadNotifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '10px 8px',
                borderRadius: '6px',
                marginBottom: '4px',
                background: '#e6f7ff',
                transition: 'background 0.3s',
              }}
              actions={[
                <Tooltip title="Đánh dấu đã đọc" key="read">
                  <Button
                    type="text"
                    size="small"
                    shape="circle"
                    icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                    onClick={(e) => handleMarkRead(item._id, e)}
                  />
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                avatar={getNotifIcon(item.type)}
                title={<Text strong style={{ fontSize: '13px' }}>{item.title}</Text>}
                description={
                  <div>
                    <div style={{ fontSize: '12px', color: '#555' }}>{item.message}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
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

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f6fc' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderBottom: '1px solid #f0f0f0',
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
          selectedKeys={getActiveKey()}
          style={{ borderRight: 0, marginTop: '16px' }}
        >
          <Menu.Item
            key="dashboard"
            icon={<CalendarOutlined />}
            onClick={() => navigate('/dashboard')}
          >
            Thời gian biểu
          </Menu.Item>
          <Menu.Item
            key="analytics"
            icon={<BarChartOutlined />}
            onClick={() => navigate('/analytics')}
          >
            Thống kê báo cáo
          </Menu.Item>
          {user && user.role === 'admin' && (
            <>
              <Menu.Item
                key="create-schedule"
                icon={<PlusCircleOutlined />}
                onClick={() => navigate('/create-schedule')}
              >
                Tạo lịch trình
              </Menu.Item>
              <Menu.Item
                key="users"
                icon={<UserOutlined />}
                onClick={() => navigate('/users')}
              >
                Quản lý người dùng
              </Menu.Item>
            </>
          )}
        </Menu>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            zIndex: 9,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
                  icon={<BellOutlined style={{ fontSize: '18px', color: '#555' }} />}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Badge>
            </Popover>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />
              <span style={{ fontWeight: 500, color: '#333' }}>
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
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
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
