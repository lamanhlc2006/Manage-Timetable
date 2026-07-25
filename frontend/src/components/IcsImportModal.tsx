import React, { useState } from 'react';
import { Modal, Upload, Table, Button, message, Space, Typography, Tag, Alert } from 'antd';
import { InboxOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import ICAL from 'ical.js';
import dayjs from 'dayjs';
import { importIcsSchedules } from '../services/scheduleService';

const { Dragger } = Upload;
const { Text } = Typography;

interface ParsedIcsEvent {
  key: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  category?: string;
  priority: string;
  color: string;
}

interface IcsImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IcsImportModal: React.FC<IcsImportModalProps> = ({ visible, onClose, onSuccess }) => {
  const [parsedEvents, setParsedEvents] = useState<ParsedIcsEvent[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const parseIcsText = (text: string): ParsedIcsEvent[] => {
    const events: ParsedIcsEvent[] = [];

    try {
      // 1. Primary parser: ical.js
      const jcalData = ICAL.parse(text);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      vevents.forEach((v, index) => {
        const event = new ICAL.Event(v);
        const start = event.startDate ? event.startDate.toJSDate() : new Date();
        const end = event.endDate ? event.endDate.toJSDate() : new Date(start.getTime() + 60 * 60 * 1000);

        events.push({
          key: `ics-${index}-${Date.now()}`,
          title: event.summary || 'Sự kiện nhập',
          description: event.description || '',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          category: event.location || 'Nhập từ .ics',
          priority: 'medium',
          color: '#1890ff',
        });
      });
    } catch (err) {
      console.warn('ICAL.parse fallback to regex line-parser:', err);
      // 2. Defensive Fallback Regex Parser for raw VEVENT blocks
      const veventBlocks = text.split(/BEGIN:VEVENT/i).slice(1);

      veventBlocks.forEach((block, index) => {
        const summaryMatch = block.match(/SUMMARY:(.*)/i);
        const descMatch = block.match(/DESCRIPTION:(.*)/i);
        const dtstartMatch = block.match(/DTSTART[:;](.*)/i);
        const dtendMatch = block.match(/DTEND[:;](.*)/i);

        const parseIcsDate = (dateStr?: string) => {
          if (!dateStr) return new Date();
          const clean = dateStr.trim().replace(/^.*:/, '');
          const y = clean.substring(0, 4);
          const m = clean.substring(4, 6);
          const d = clean.substring(6, 8);
          const hh = clean.substring(9, 11) || '00';
          const mm = clean.substring(11, 13) || '00';
          const ss = clean.substring(13, 15) || '00';
          return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
        };

        const start = dtstartMatch ? parseIcsDate(dtstartMatch[1]) : new Date();
        const end = dtendMatch ? parseIcsDate(dtendMatch[1]) : new Date(start.getTime() + 60 * 60 * 1000);

        events.push({
          key: `regex-${index}-${Date.now()}`,
          title: summaryMatch ? summaryMatch[1].trim() : 'Sự kiện nhập',
          description: descMatch ? descMatch[1].trim() : '',
          startTime: isNaN(start.getTime()) ? new Date().toISOString() : start.toISOString(),
          endTime: isNaN(end.getTime()) ? new Date(Date.now() + 3600000).toISOString() : end.toISOString(),
          category: 'Nhập từ .ics',
          priority: 'medium',
          color: '#1890ff',
        });
      });
    }

    return events;
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        message.error('File rỗng hoặc không đọc được nội dung.');
        return;
      }

      const events = parseIcsText(content);
      if (events.length === 0) {
        message.warning('Không tìm thấy sự kiện nào trong file .ics.');
        return;
      }

      setParsedEvents(events);
      setSelectedRowKeys(events.map((ev) => ev.key));
      message.success(`Đã trích xuất ${events.length} sự kiện từ file ${file.name}`);
    };

    reader.onerror = () => {
      message.error('Lỗi khi đọc file .ics');
    };

    reader.readAsText(file);
    return false; // Prevent auto upload action
  };

  const handleImportSubmit = async () => {
    const selectedEvents = parsedEvents.filter((item) => selectedRowKeys.includes(item.key));
    if (selectedEvents.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 sự kiện để nhập.');
      return;
    }

    setLoading(true);
    try {
      const payload = selectedEvents.map((item) => ({
        title: item.title,
        description: item.description,
        startTime: item.startTime,
        endTime: item.endTime,
        category: item.category,
        priority: item.priority,
        color: item.color,
      }));

      const res = await importIcsSchedules(payload);
      message.success(res.message || `Đã nhập thành công ${selectedEvents.length} sự kiện!`);
      setParsedEvents([]);
      setSelectedRowKeys([]);
      setFileName('');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi lưu dữ liệu nhập từ .ics');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tiêu đề sự kiện',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (val: string) => dayjs(val).format('HH:mm DD/MM/YYYY'),
    },
    {
      title: 'Thời gian kết thúc',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (val: string) => dayjs(val).format('HH:mm DD/MM/YYYY'),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag color="blue">{cat || 'N/A'}</Tag>,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <span>Nhập dữ liệu lịch trình từ file iCalendar (.ics)</span>
        </Space>
      }
      open={visible}
      onCancel={() => {
        setParsedEvents([]);
        setSelectedRowKeys([]);
        setFileName('');
        onClose();
      }}
      width={750}
      footer={
        parsedEvents.length > 0 ? [
          <Button key="cancel" onClick={onClose}>
            Hủy
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={loading}
            onClick={handleImportSubmit}
          >
            Nhập {selectedRowKeys.length} sự kiện đã chọn
          </Button>,
        ] : null
      }
    >
      {parsedEvents.length === 0 ? (
        <Dragger
          name="file"
          multiple={false}
          accept=".ics,.ical"
          beforeUpload={handleFileUpload}
          showUploadList={false}
          style={{ padding: '24px 0', margin: '12px 0' }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#1890ff', fontSize: '48px' }} />
          </p>
          <p className="ant-upload-text">Nhấp hoặc kéo thả file .ics vào khu vực này để nhập</p>
          <p className="ant-upload-hint">
            Hỗ trợ định dạng chuẩn iCalendar (.ics) xuất từ Google Calendar, Outlook, Apple Calendar...
          </p>
        </Dragger>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            message={`Đã đọc thành công file: ${fileName}`}
            description={`Tìm thấy ${parsedEvents.length} sự kiện. Bạn có thể chọn lọc các sự kiện cần nhập vào hệ thống dưới đây.`}
            type="info"
            showIcon
          />

          <Table
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys,
              onChange: (newKeys) => setSelectedRowKeys(newKeys),
            }}
            columns={columns}
            dataSource={parsedEvents}
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </Space>
      )}
    </Modal>
  );
};
