import React from 'react';
import { Modal, List, Badge, Tag, Button, Typography, Space, Empty } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, BellOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ScheduleEvent } from '../services/scheduleService';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface UpcomingEventsModalProps {
  visible: boolean;
  events: ScheduleEvent[];
  onClose: () => void;
  onSelectEvent?: (event: ScheduleEvent) => void;
}

export const UpcomingEventsModal: React.FC<UpcomingEventsModalProps> = ({
  visible,
  events,
  onClose,
  onSelectEvent,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose} icon={<CheckCircleOutlined />}>
          {t('upcomingModal.understandBtn', 'Đã hiểu')}
        </Button>,
      ]}
      title={
        <Space size={8}>
          <BellOutlined style={{ color: '#fa8c16', fontSize: '20px' }} />
          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {t('upcomingModal.title', 'Sự kiện sắp diễn ra trong 24h tới')}
          </span>
        </Space>
      }
      width={560}
      centered
      destroyOnHidden
    >
      <div style={{ marginTop: '12px' }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
          {t(
            'upcomingModal.subtitle',
            'Dưới đây là các lịch trình của bạn dự kiến sẽ diễn ra trong vòng 24 giờ tiếp theo:'
          )}
        </Text>

        {events.length === 0 ? (
          <Empty
            description={t('upcomingModal.empty', 'Không có sự kiện nào trong 24 giờ tới')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={events}
            renderItem={(item) => {
              const start = dayjs(item.startTime);
              const end = dayjs(item.endTime);
              const isHigh = item.priority === 'high';
              const isMedium = item.priority === 'medium';

              return (
                <List.Item
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    backgroundColor: item.color ? `${item.color}10` : '#fafafa',
                    borderLeft: `4px solid ${item.color || '#1890ff'}`,
                    cursor: onSelectEvent ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => {
                    if (onSelectEvent) {
                      onSelectEvent(item);
                      onClose();
                    }
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: item.color || '#1890ff',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                        }}
                      >
                        <CalendarOutlined />
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong style={{ fontSize: '15px' }}>
                          {item.title}
                        </Text>
                        {item.category && <Tag color="blue">{item.category}</Tag>}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2} style={{ marginTop: '4px', width: '100%' }}>
                        <Space style={{ color: '#595959', fontSize: '13px' }}>
                          <ClockCircleOutlined />
                          <span>
                            {start.format('HH:mm DD/MM')} - {end.format('HH:mm')} ({start.fromNow()})
                          </span>
                        </Space>
                        {item.description && (
                          <Text type="secondary" ellipsis style={{ fontSize: '12px', maxWidth: '380px' }}>
                            {item.description}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                  <div>
                    {isHigh ? (
                      <Badge status="error" text={t('calendar.priorityHigh', 'Cao')} />
                    ) : isMedium ? (
                      <Badge status="warning" text={t('calendar.priorityMedium', 'Trung bình')} />
                    ) : (
                      <Badge status="default" text={t('calendar.priorityLow', 'Thấp')} />
                    )}
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>
    </Modal>
  );
};
