import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Tag, Popconfirm } from 'antd';
import {
  CalendarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  ScheduleOutlined,
  PlusCircleOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

export const CommonLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('offlineMode');
    navigate('/login');
  };

  const getActiveKey = () => {
    if (location.pathname === '/dashboard') return ['dashboard'];
    if (location.pathname === '/create-schedule') return ['create-schedule'];
    return [];
  };

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
          {user && user.role === 'admin' && (
            <Menu.Item
              key="create-schedule"
              icon={<PlusCircleOutlined />}
              onClick={() => navigate('/create-schedule')}
            >
              Tạo lịch trình
            </Menu.Item>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
