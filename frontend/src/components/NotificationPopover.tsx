import React from 'react';
import { Button, Badge, Popover, List, Typography, Empty, Spin, Tooltip, Tag } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { NotificationItem } from '../services/notificationService';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface NotificationPopoverProps {
  notifications: NotificationItem[];
  loading: boolean;
  onMarkRead: (id: string, e?: React.MouseEvent) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onNotificationClick: (item: NotificationItem) => void;
  onOpen: () => void;
  theme: 'light' | 'dark';
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  notifications,
  loading,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onNotificationClick,
  onOpen,
  theme,
}) => {
  const { t, i18n } = useTranslation();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

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

  const content = (
    <div style={{ width: 360, maxHeight: 420, overflowY: 'auto' }}>
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingBottom: '8px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text strong style={{ fontSize: '15px' }}>{t('nav.notifications')}</Text>
          {unreadCount > 0 && <Tag color="red">{unreadCount} {t('nav.unread')}</Tag>}
        </div>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={onMarkAllRead} style={{ padding: 0, fontSize: '12px' }}>
            {t('nav.markAllRead')}
          </Button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px' }}><Spin size="small" /></div>
      ) : notifications.length === 0 ? (
        <Empty description={t('nav.noNotifications')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              onClick={() => onNotificationClick(item)}
              style={{
                padding: '10px 8px', borderRadius: '6px', marginBottom: '6px',
                background: item.isRead ? '#ffffff' : '#e6f7ff',
                border: item.isRead ? '1px solid #f0f0f0' : '1px solid #bae7ff',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              actions={[
                !item.isRead ? (
                  <Tooltip title={t('nav.markAsRead')} key="read">
                    <Button type="text" size="small" shape="circle"
                      icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                      onClick={(e) => onMarkRead(item._id, e)}
                    />
                  </Tooltip>
                ) : null,
                <Tooltip title={t('nav.deleteNotification')} key="delete">
                  <Button type="text" size="small" shape="circle" danger
                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                    onClick={(e) => onDelete(item._id, e)}
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
                        <span style={{ marginLeft: '8px', color: '#52c41a' }}>✓ {t('nav.read')}</span>
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

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      onOpenChange={(open) => { if (open) onOpen(); }}
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button
          type="text" shape="circle"
          icon={<BellOutlined style={{ fontSize: '18px', color: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : '#555' }} />}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}
        />
      </Badge>
    </Popover>
  );
};
