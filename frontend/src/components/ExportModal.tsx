import React, { useState } from 'react';
import { Modal, Radio, DatePicker, Button, Space, Typography, Form, message } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined, CalendarOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { ScheduleEvent } from '../services/scheduleService';
import {
  downloadExcelReport,
  downloadCsvReport,
  downloadIcsFile,
  downloadPdfReport,
} from '../services/exportService';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  schedules: ScheduleEvent[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ visible, onClose, schedules }) => {
  const [format, setFormat] = useState<'excel' | 'csv' | 'ics' | 'pdf'>('excel');
  const [rangeType, setRangeType] = useState<'all' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  const handleExport = async () => {
    let filteredSchedules = [...schedules];
    const now = dayjs();

    if (rangeType === 'this_week') {
      const startOfWeek = now.startOf('week');
      const endOfWeek = now.endOf('week');
      filteredSchedules = filteredSchedules.filter((s) => {
        const start = dayjs(s.startTime);
        return start.isAfter(startOfWeek) && start.isBefore(endOfWeek);
      });
    } else if (rangeType === 'this_month') {
      const startOfMonth = now.startOf('month');
      const endOfMonth = now.endOf('month');
      filteredSchedules = filteredSchedules.filter((s) => {
        const start = dayjs(s.startTime);
        return start.isAfter(startOfMonth) && start.isBefore(endOfMonth);
      });
    } else if (rangeType === 'custom' && customRange) {
      const [startRange, endRange] = customRange;
      filteredSchedules = filteredSchedules.filter((s) => {
        const start = dayjs(s.startTime);
        return start.isAfter(startRange.startOf('day')) && start.isBefore(endRange.endOf('day'));
      });
    }

    if (filteredSchedules.length === 0 && format !== 'ics') {
      message.warning('Không có sự kiện nào trong khoảng thời gian đã chọn để xuất file.');
      return;
    }

    const timestamp = dayjs().format('YYYYMMDD-HHmm');

    try {
      if (format === 'excel') {
        downloadExcelReport(filteredSchedules, `timetable-export-${timestamp}.xlsx`);
        message.success(`Đã xuất thành công file Excel (${filteredSchedules.length} sự kiện)`);
      } else if (format === 'csv') {
        downloadCsvReport(filteredSchedules, `timetable-export-${timestamp}.csv`);
        message.success(`Đã xuất thành công file CSV (${filteredSchedules.length} sự kiện)`);
      } else if (format === 'ics') {
        await downloadIcsFile();
        message.success('Đã xuất thành công file iCalendar (.ics)');
      } else if (format === 'pdf') {
        await downloadPdfReport(filteredSchedules, 'BÁO CÁO LỊCH TRÌNH CÁ NHÂN');
        message.success(`Đã xuất thành công báo cáo PDF (${filteredSchedules.length} sự kiện)`);
      }

      onClose();
    } catch (err: any) {
      message.error('Lỗi khi xuất dữ liệu: ' + err.message);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <DownloadOutlined style={{ color: '#1890ff' }} />
          <span>Xuất dữ liệu Lịch trình (Export)</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          Tải file về máy
        </Button>,
      ]}
    >
      <Form layout="vertical" style={{ marginTop: '12px' }}>
        <Form.Item label={<Text strong>Định dạng xuất file</Text>}>
          <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)} buttonStyle="solid">
            <Radio.Button value="excel">
              <Space>
                <FileExcelOutlined style={{ color: '#52c41a' }} />
                <span>Excel (.xlsx)</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="csv">
              <Space>
                <FileTextOutlined style={{ color: '#fa8c16' }} />
                <span>CSV (.csv)</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="ics">
              <Space>
                <CalendarOutlined style={{ color: '#1890ff' }} />
                <span>iCalendar (.ics)</span>
              </Space>
            </Radio.Button>
            <Radio.Button value="pdf">
              <Space>
                <FilePdfOutlined style={{ color: '#ff4d4f' }} />
                <span>PDF (.pdf)</span>
              </Space>
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label={<Text strong>Khoảng thời gian xuất</Text>}>
          <Radio.Group value={rangeType} onChange={(e) => setRangeType(e.target.value)}>
            <Space direction="vertical">
              <Radio value="this_month">Tháng này ({dayjs().format('MM/YYYY')})</Radio>
              <Radio value="this_week">Tuần này</Radio>
              <Radio value="all">Tất cả sự kiện ({schedules.length} sự kiện)</Radio>
              <Radio value="custom">Tùy chọn khoảng ngày</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {rangeType === 'custom' && (
          <Form.Item label={<Text type="secondary">Chọn khoảng ngày từ - đến</Text>}>
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              onChange={(dates) => setCustomRange(dates as [Dayjs, Dayjs])}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
