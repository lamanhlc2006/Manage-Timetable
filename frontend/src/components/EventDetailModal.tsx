import React from 'react';
import { Modal, Badge, Button, Space, Tag, Popconfirm } from 'antd';
import { FireOutlined, DeleteOutlined, EditOutlined, BellOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ScheduleEvent } from '../services/scheduleService';

interface EventDetailModalProps {
  visible: boolean;
  event: ScheduleEvent | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStartPomodoro: (event: { id?: string; title: string; category?: string }) => void;
  categoriesList: { name: string; color: string; icon?: string }[];
  isAdmin?: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  visible,
  event,
  onClose,
  onEdit,
  onDelete,
  onStartPomodoro,
  categoriesList: _categoriesList,
  isAdmin,
}) => {
  const { t } = useTranslation();

  if (!event) return null;

  const currentUserId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u._id;
    } catch {
      return null;
    }
  })();
  const eventCreatorId = (event.createdBy as any)?._id || event.createdBy;
  const canModifyEvent = isAdmin || (currentUserId && eventCreatorId && currentUserId.toString() === eventCreatorId.toString());

  return (
    <Modal
      title={t('calendar.viewEventTitle', 'Chi tiết sự kiện')}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={560}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: event.color,
              display: 'inline-block',
            }}
          />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{event.title}</h3>
        </div>

        <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '120px', padding: '8px 0', color: '#8c8c8c' }}>Thời gian:</td>
              <td style={{ padding: '8px 0', fontWeight: 500 }}>
                {dayjs(event.startTime).format('HH:mm DD/MM/YYYY')} -{' '}
                {dayjs(event.endTime).format('HH:mm DD/MM/YYYY')}
              </td>
            </tr>
            {event.description && (
              <tr>
                <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Ghi chú:</td>
                <td style={{ padding: '8px 0' }}>{event.description}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Danh mục:</td>
              <td style={{ padding: '8px 0', fontWeight: 500 }}>
                {event.category || 'Học tập'}
              </td>
            </tr>
            {event.tags && event.tags.length > 0 && (
              <tr>
                <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Thẻ (Tags):</td>
                <td style={{ padding: '8px 0' }}>
                  {event.tags.map((tag) => (
                    <Tag key={tag} color="blue" style={{ borderRadius: '4px' }}>
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </Tag>
                  ))}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Độ ưu tiên:</td>
              <td style={{ padding: '8px 0' }}>
                {event.priority === 'high' ? (
                  <Badge status="error" text="Cao" />
                ) : event.priority === 'low' ? (
                  <Badge status="default" text="Thấp" />
                ) : (
                  <Badge status="warning" text="Trung bình" />
                )}
              </td>
            </tr>
            {event.recurrence && event.recurrence.type !== 'none' && (
              <tr>
                <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Chu kỳ lặp:</td>
                <td style={{ padding: '8px 0', fontWeight: 500, color: '#1890ff' }}>
                  {event.recurrence.type === 'daily' && `Lặp mỗi ${event.recurrence.interval} ngày`}
                  {event.recurrence.type === 'weekly' && `Lặp mỗi ${event.recurrence.interval} tuần`}
                  {event.recurrence.type === 'monthly' && `Lặp mỗi ${event.recurrence.interval} tháng`}
                  {event.recurrence.endDate && ` (đến ngày ${dayjs(event.recurrence.endDate).format('DD/MM/YYYY')})`}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '8px 0', color: '#8c8c8c' }}>{t('calendar.reminder', 'Nhắc nhở trước')}:</td>
              <td style={{ padding: '8px 0', fontWeight: 500, color: '#fa8c16' }}>
                {event.reminderMinutes ? (
                  <Space>
                    <BellOutlined style={{ color: '#fa8c16' }} />
                    <span>
                      {event.reminderMinutes === 5 && t('calendar.reminder5m', '5 phút')}
                      {event.reminderMinutes === 15 && t('calendar.reminder15m', '15 phút')}
                      {event.reminderMinutes === 30 && t('calendar.reminder30m', '30 phút')}
                      {event.reminderMinutes === 60 && t('calendar.reminder1h', '1 giờ')}
                      {event.reminderMinutes === 1440 && t('calendar.reminder1d', '1 ngày')}
                      {![5, 15, 30, 60, 1440].includes(event.reminderMinutes) && `${event.reminderMinutes} phút`}
                    </span>
                  </Space>
                ) : (
                  <span style={{ color: '#8c8c8c', fontWeight: 400 }}>{t('calendar.noReminder', 'Không nhắc nhở')}</span>
                )}
              </td>
            </tr>
            {event.isException && (
              <tr>
                <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Loại sự kiện:</td>
                <td style={{ padding: '8px 0', fontWeight: 500, color: '#fa8c16' }}>
                  Ngoại lệ riêng lẻ
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Người tạo:</td>
              <td style={{ padding: '8px 0' }}>
                {event.createdBy?.username} ({event.createdBy?.email})
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <Button
            type="default"
            danger
            icon={<FireOutlined />}
            onClick={() => {
              onStartPomodoro({
                id: event._id,
                title: event.title,
                category: event.category,
              });
            }}
            style={{ borderRadius: '6px' }}
          >
            Tập trung (Pomodoro)
          </Button>

          {canModifyEvent ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Popconfirm
                title={t('calendar.deleteConfirm', 'Bạn có chắc chắn muốn xóa?')}
                onConfirm={onDelete}
                okText={t('common.yes', 'Có')}
                cancelText={t('common.no', 'Không')}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  style={{ borderRadius: '6px' }}
                >
                  Xóa
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={onEdit}
                style={{ borderRadius: '6px' }}
              >
                Chỉnh sửa
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
