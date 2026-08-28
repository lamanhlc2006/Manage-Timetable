import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Result, Input, Button, Typography, Tag, ConfigProvider, theme as antTheme } from 'antd';
import { LockOutlined, CalendarOutlined, EyeOutlined } from '@ant-design/icons';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { getSharedCalendar, SharedEvent } from '../services/shareService';

const { Title, Text, Paragraph } = Typography;

const SharedCalendarView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [label, setLabel] = useState('');

  const fetchShared = async (pwd?: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setPasswordError('');
    try {
      const data = await getSharedCalendar(token, pwd);
      setEvents(data.events);
      setLabel(data.label || '');
      setNeedsPassword(false);
    } catch (err: any) {
      const res = err.response;
      if (res?.status === 401 && res?.data?.requiresPassword) {
        setNeedsPassword(true);
        if (pwd) setPasswordError(res.data.message || 'Mật khẩu không đúng');
      } else if (res?.status === 410) {
        setError('Link chia sẻ đã hết hạn');
      } else if (res?.status === 404) {
        setError('Link chia sẻ không tồn tại');
      } else {
        setError('Không thể tải lịch chia sẻ');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShared();
  }, [token]);

  const calendarEvents = useMemo(() =>
    events.map((e) => ({
      id: e._id,
      title: e.title,
      start: e.startTime,
      end: e.endTime,
      backgroundColor: e.color || '#1890ff',
      borderColor: e.color || '#1890ff',
      allDay: e.isAllDay || false,
      extendedProps: {
        description: e.description,
        category: e.category,
        tags: e.tags,
        priority: e.priority,
        status: e.status,
      },
    })),
    [events]
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <Spin size="large" tip="Đang tải lịch..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <Result
          status="warning"
          title={error}
          subTitle="Vui lòng kiểm tra lại link hoặc liên hệ người chia sẻ."
        />
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={4} style={{ marginBottom: 8 }}>Lịch được bảo vệ bằng mật khẩu</Title>
          <Paragraph type="secondary">Nhập mật khẩu để xem lịch chia sẻ này.</Paragraph>
          {passwordError && <Text type="danger" style={{ display: 'block', marginBottom: 8 }}>{passwordError}</Text>}
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={() => fetchShared(password)}
            style={{ marginBottom: 16, borderRadius: 6 }}
            size="large"
          />
          <Button
            type="primary"
            size="large"
            block
            style={{ borderRadius: 6 }}
            onClick={() => fetchShared(password)}
          >
            Xem lịch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: antTheme.defaultAlgorithm }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <CalendarOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {label || 'Lịch chia sẻ'}
            </Title>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Tag icon={<EyeOutlined />} color="blue">Chỉ xem</Tag>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {events.length} sự kiện
              </Text>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,listWeek',
            }}
            locale="vi"
            events={calendarEvents}
            height="auto"
            editable={false}
            selectable={false}
            allDaySlot={true}
            allDayText="Cả ngày"
            eventClick={(info) => {
              const props = info.event.extendedProps;
              // Simple alert-style detail view
              const details = [
                `📌 ${info.event.title}`,
                props.description ? `📝 ${props.description}` : '',
                props.category ? `📁 Danh mục: ${props.category}` : '',
                props.tags?.length ? `🏷️ Tags: ${props.tags.join(', ')}` : '',
                `⏰ ${new Date(info.event.startStr).toLocaleString('vi-VN')} — ${new Date(info.event.endStr).toLocaleString('vi-VN')}`,
              ].filter(Boolean).join('\n');
              alert(details);
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 16, color: '#8c8c8c', fontSize: 12 }}>
          Powered by Manage Timetable
        </div>
      </div>
    </ConfigProvider>
  );
};

export default SharedCalendarView;
