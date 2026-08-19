import React from 'react';
import { Layout, Button, Avatar, Tag, Popconfirm, Popover, Tooltip, Typography } from 'antd';
import {
  LogoutOutlined,
  UserOutlined,
  ScheduleOutlined,
  BellOutlined,
  DisconnectOutlined,
  FireOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { NotificationPopover } from './NotificationPopover';
import { NotificationItem } from '../services/notificationService';

const { Header } = Layout;
const { Text } = Typography;

interface AppHeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isMobile: boolean;
  isScrolled: boolean;
  isOnline: boolean;
  user: any;
  // Notification props
  notifications: NotificationItem[];
  loadingNotifs: boolean;
  onLoadNotifications: () => void;
  onMarkRead: (id: string, e?: React.MouseEvent) => void;
  onMarkAllRead: () => void;
  onDeleteNotif: (id: string, e: React.MouseEvent) => void;
  onNotificationClick: (item: NotificationItem) => void;
  // Push notification props
  pushPermission: NotificationPermission;
  onTogglePush: () => void;
  // Action props
  onPomodoroOpen: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  toggleTheme,
  isMobile,
  isScrolled,
  isOnline,
  user,
  notifications,
  loadingNotifs,
  onLoadNotifications,
  onMarkRead,
  onMarkAllRead,
  onDeleteNotif,
  onNotificationClick,
  pushPermission,
  onTogglePush,
  onPomodoroOpen,
  onLogout,
  onNavigateHome,
}) => {
  const { t } = useTranslation();

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
          <Button type="text" size="small" onClick={toggleTheme}
            icon={theme === 'dark' ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined style={{ color: '#555' }} />}
            style={{ fontSize: '12px' }}
          >
            {theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
          </Button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: '12px', color: '#595959' }}>Web Push:</Text>
          <Button type="text" size="small" onClick={onTogglePush}
            icon={<BellOutlined style={{ color: pushPermission === 'granted' ? '#52c41a' : '#555' }} />}
            style={{ fontSize: '12px' }}
          >
            {pushPermission === 'granted' ? t('nav.webPushOn') : t('nav.webPushOff')}
          </Button>
        </div>

        <div style={{ paddingTop: '10px', borderTop: '1px solid #f0f0f0', marginTop: '2px' }}>
          <Popconfirm title={t('nav.logoutConfirm')} onConfirm={onLogout} okText={t('nav.logout')} cancelText={t('common.cancel')} placement="bottomRight">
            <Button type="primary" danger ghost icon={<LogoutOutlined />} block size="small" style={{ borderRadius: '6px' }}>
              {t('nav.logout')}
            </Button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );

  return (
    <Header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, width: '100%', height: '64px', zIndex: 1000,
        background: theme === 'dark' ? 'rgba(31, 31, 31, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        padding: isMobile ? '0 12px' : '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.08)' : (theme === 'dark' ? 'none' : '0 1px 4px rgba(0,21,41,.05)'),
        borderBottom: theme === 'dark' ? '1px solid #303030' : '1px solid #f0f0f0',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '18px', color: '#1890ff', cursor: 'pointer' }} onClick={onNavigateHome}>
        <ScheduleOutlined style={{ fontSize: '24px' }} />
        <span>TIMETABLE</span>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '16px' }}>
        {!isOnline && (
          <Tag color="warning" icon={<DisconnectOutlined />} style={{ margin: 0, padding: '0 6px', fontSize: '11px' }}>
            {isMobile ? 'Offline' : t('common.offline')}
          </Tag>
        )}

        {isMobile ? (
          <>
            <Tooltip title={t('nav.focusMode')}>
              <Button type="text" shape="circle" onClick={onPomodoroOpen}
                icon={<FireOutlined style={{ fontSize: '18px', color: '#ff4d4f' }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}
              />
            </Tooltip>

            <NotificationPopover
              notifications={notifications} loading={loadingNotifs}
              onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead}
              onDelete={onDeleteNotif} onNotificationClick={onNotificationClick}
              onOpen={onLoadNotifications} theme={theme}
            />

            <Popover content={mobileUserPopoverContent} trigger="click" placement="bottomRight">
              <div style={{ cursor: 'pointer', padding: '2px' }}>
                <Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} size="small" />
              </div>
            </Popover>
          </>
        ) : (
          <>
            <Tooltip title={pushPermission === 'granted' ? t('nav.webPushEnabled') : t('nav.enableWebPush')}>
              <Button type="text" shape="circle" onClick={onTogglePush}
                icon={<BellOutlined style={{ fontSize: '18px', color: pushPermission === 'granted' ? '#52c41a' : (theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : '#555') }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Tooltip>

            <LanguageSelector size="small" />

            <Tooltip title={t('nav.focusMode')}>
              <Button type="text" shape="circle" onClick={onPomodoroOpen}
                icon={<FireOutlined style={{ fontSize: '18px', color: '#ff4d4f' }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Tooltip>

            <Tooltip title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
              <Button type="text" shape="circle" onClick={toggleTheme}
                icon={theme === 'dark' ? <SunOutlined style={{ fontSize: '18px', color: '#faad14' }} /> : <MoonOutlined style={{ fontSize: '18px', color: '#555' }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Tooltip>

            <NotificationPopover
              notifications={notifications} loading={loadingNotifs}
              onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead}
              onDelete={onDeleteNotif} onNotificationClick={onNotificationClick}
              onOpen={onLoadNotifications} theme={theme}
            />

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

            <Popconfirm title={t('nav.logoutConfirm')} onConfirm={onLogout} okText={t('nav.logout')} cancelText={t('common.cancel')} placement="bottomRight">
              <Button type="primary" danger ghost icon={<LogoutOutlined />} size="middle" style={{ borderRadius: '6px' }}>
                {t('nav.logout')}
              </Button>
            </Popconfirm>
          </>
        )}
      </div>
    </Header>
  );
};
