import React, { useState, useEffect } from 'react';
import {
  Modal, Card, Row, Col, Button, DatePicker, message, Space, Typography,
  Tag, Empty, Popconfirm, Tooltip, Spin, Badge, List,
} from 'antd';
import {
  AppstoreOutlined, CalendarOutlined, DeleteOutlined,
  PlayCircleOutlined, ClockCircleOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getTemplates, applyTemplate, deleteTemplate, TemplateItem, TemplateEvent } from '../services/templateService';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

const formatTime = (h: number, m: number) =>
  `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

const TemplateModal: React.FC<TemplateModalProps> = ({ open, onClose, onApplied }) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs().startOf('isoWeek'));
  const [applying, setApplying] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
      setSelectedTemplate(null);
    }
  }, [open]);

  const handleApply = async () => {
    if (!selectedTemplate || !startDate) {
      message.warning(t('template.selectDate', 'Vui lòng chọn ngày bắt đầu'));
      return;
    }
    setApplying(true);
    try {
      const result = await applyTemplate(selectedTemplate._id, startDate.toISOString());
      message.success(result.message || `Đã tạo ${result.count} sự kiện`);
      onApplied?.();
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTemplate(id);
      message.success(t('template.deleted', 'Đã xoá template'));
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      if (selectedTemplate?._id === id) setSelectedTemplate(null);
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    }
  };

  // Preview: group events by dayOffset
  const renderPreview = (tmpl: TemplateItem) => {
    const dayLabels: Record<number, string> = {
      0: 'Ngày 1 (T2)', 1: 'Ngày 2 (T3)', 2: 'Ngày 3 (T4)',
      3: 'Ngày 4 (T5)', 4: 'Ngày 5 (T6)', 5: 'Ngày 6 (T7)', 6: 'Ngày 7 (CN)',
    };
    const grouped: Record<number, TemplateEvent[]> = {};
    tmpl.events.forEach((ev) => {
      if (!grouped[ev.dayOffset]) grouped[ev.dayOffset] = [];
      grouped[ev.dayOffset].push(ev);
    });

    return (
      <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
        {Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, events]) => (
            <div key={day} style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 12, color: '#8c8c8c' }}>
                {dayLabels[Number(day)] || `Ngày ${Number(day) + 1}`}
              </Text>
              <List
                size="small"
                dataSource={events.sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute))}
                renderItem={(ev) => (
                  <List.Item style={{ padding: '4px 0', border: 'none' }}>
                    <Space size={6}>
                      <Badge color={ev.color || '#1890ff'} />
                      <Text style={{ fontSize: 12 }}>
                        {formatTime(ev.startHour, ev.startMinute)}–{formatTime(ev.endHour, ev.endMinute)}
                      </Text>
                      <Text style={{ fontSize: 12 }} strong>{ev.title}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          ))}
      </div>
    );
  };

  return (
    <Modal
      title={<><AppstoreOutlined /> {t('template.title', 'Mẫu lịch trình')}</>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : templates.length === 0 ? (
        <Empty description={t('template.empty', 'Chưa có mẫu nào')} />
      ) : (
        <>
          {/* Template Grid */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            {templates.map((tmpl) => (
              <Col xs={24} sm={12} key={tmpl._id}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => setSelectedTemplate(tmpl)}
                  style={{
                    borderRadius: 10,
                    border: selectedTemplate?._id === tmpl._id ? '2px solid #1890ff' : '1px solid #f0f0f0',
                    background: selectedTemplate?._id === tmpl._id ? '#e6f7ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{tmpl.icon}</div>
                      <Text strong>{tmpl.name}</Text>
                      {tmpl.isSystem && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>Hệ thống</Tag>}
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{tmpl.description}</Text>
                      </div>
                      <Space size={4} style={{ marginTop: 6 }}>
                        <Tag icon={<CalendarOutlined />} style={{ fontSize: 11 }}>
                          {tmpl.events.length} sự kiện
                        </Tag>
                        <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 11 }}>
                          {Math.max(...tmpl.events.map((e) => e.dayOffset)) + 1} ngày
                        </Tag>
                      </Space>
                    </div>
                    {!tmpl.isSystem && (
                      <Popconfirm
                        title={t('template.deleteConfirm', 'Xoá mẫu này?')}
                        onConfirm={(e) => handleDelete(tmpl._id, e as any)}
                        onCancel={(e) => e?.stopPropagation()}
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Preview + Apply */}
          {selectedTemplate && (
            <Card
              size="small"
              style={{ borderRadius: 10, background: '#fafafa' }}
              title={
                <Space>
                  <EyeOutlined />
                  <Text strong>{selectedTemplate.icon} {selectedTemplate.name}</Text>
                  <Text type="secondary">— Xem trước</Text>
                </Space>
              }
            >
              {renderPreview(selectedTemplate)}

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 13 }}>
                  <CalendarOutlined /> {t('template.startDate', 'Ngày bắt đầu')}:
                </Text>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  format="DD/MM/YYYY"
                  style={{ borderRadius: 6 }}
                />
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={applying}
                  onClick={handleApply}
                  style={{ borderRadius: 6 }}
                >
                  {t('template.apply', 'Áp dụng mẫu')}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </Modal>
  );
};

export default TemplateModal;
