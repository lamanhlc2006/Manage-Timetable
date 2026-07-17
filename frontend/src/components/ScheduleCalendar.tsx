import React, { useState, useRef } from 'react';
import { Calendar, Badge, Modal, Form, Input, DatePicker, Select, Button, message, Space } from 'antd';
import dayjs from 'dayjs';
import { ScheduleEvent, CreateScheduleInput } from '../services/scheduleService';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface ScheduleCalendarProps {
  schedules: ScheduleEvent[];
  isAdmin: boolean;
  onCreate: (data: CreateScheduleInput) => Promise<void>;
  onUpdate: (id: string, data: Partial<CreateScheduleInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedules,
  isAdmin,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const isEventClickRef = useRef(false);
  const [form] = Form.useForm();

  // List of soft colors for styling events
  const colorOptions = [
    { label: 'Blue (Mặc định)', value: '#1890ff' },
    { label: 'Green (Học tập)', value: '#52c41a' },
    { label: 'Orange (Họp hành)', value: '#fa8c16' },
    { label: 'Red (Quan trọng)', value: '#f5222d' },
    { label: 'Purple (Cá nhân)', value: '#722ed1' },
    { label: 'Cyan (Dự án)', value: '#13c2c2' },
  ];

  // Helper to render events on each cell of the Calendar
  const getListData = (value: dayjs.Dayjs) => {
    return schedules.filter((schedule) => {
      const scheduleDay = dayjs(schedule.startTime);
      return value.isSame(scheduleDay, 'day');
    });
  };

  const dateCellRender = (value: dayjs.Dayjs) => {
    const listData = getListData(value);
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item) => (
          <li key={item._id} style={{ marginBottom: '2px' }}>
            <div
              onClick={(e) => {
                e.stopPropagation(); // Avoid triggering date select
                isEventClickRef.current = true;
                handleOpenViewModal(item);
                setTimeout(() => {
                  isEventClickRef.current = false;
                }, 100);
              }}
              style={{
                background: `${item.color}22`, // transparent hex color
                borderLeft: `3px solid ${item.color}`,
                padding: '2px 4px',
                borderRadius: '2px',
                fontSize: '11px',
                color: '#333',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'all 0.3s',
              }}
              className="calendar-event-item"
              title={item.title}
            >
              <Badge color={item.color} text={item.title} />
            </div>
          </li>
        ))}
      </ul>
    );
  };

  // Open modal in View mode
  const handleOpenViewModal = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setModalMode('view');
    setIsModalVisible(true);
  };

  // Open modal in Create mode
  const handleOpenCreateModal = (date?: dayjs.Dayjs) => {
    if (!isAdmin) return;
    setModalMode('create');
    setSelectedEvent(null);
    setIsModalVisible(true);

    const initialStart = date ? date.clone().hour(9).minute(0).second(0) : dayjs().hour(9).minute(0).second(0);
    const initialEnd = date ? date.clone().hour(10).minute(0).second(0) : dayjs().hour(10).minute(0).second(0);

    form.setFieldsValue({
      title: '',
      description: '',
      color: '#1890ff',
      range: [initialStart, initialEnd],
    });
  };

  // Triggered when clicking a calendar date cell
  const handleSelectDate = (value: dayjs.Dayjs) => {
    // If the click originated from an event item, ignore it
    if (isEventClickRef.current) {
      return;
    }
    // If Admin, trigger new event creation on that date
    if (isAdmin) {
      handleOpenCreateModal(value);
    }
  };

  // Switch modal to Edit mode
  const handleSwitchToEdit = () => {
    if (!selectedEvent) return;
    setModalMode('edit');
    form.setFieldsValue({
      title: selectedEvent.title,
      description: selectedEvent.description || '',
      color: selectedEvent.color,
      range: [dayjs(selectedEvent.startTime), dayjs(selectedEvent.endTime)],
    });
  };

  // Handle Form Submit (Create or Update)
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startDayjs, endDayjs] = values.range;

      if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
        message.error('Thời gian bắt đầu phải trước thời gian kết thúc!');
        return;
      }

      const inputData: CreateScheduleInput = {
        title: values.title,
        description: values.description,
        startTime: startDayjs.toISOString(),
        endTime: endDayjs.toISOString(),
        color: values.color,
      };

      if (modalMode === 'create') {
        await onCreate(inputData);
        message.success('Tạo lịch trình thành công!');
      } else if (modalMode === 'edit' && selectedEvent) {
        await onUpdate(selectedEvent._id, inputData);
        message.success('Cập nhật lịch trình thành công!');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Đã xảy ra lỗi, vui lòng thử lại.');
      }
    }
  };

  // Handle Event Delete
  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await onDelete(selectedEvent._id);
      message.success('Xóa lịch trình thành công!');
      setIsModalVisible(false);
    } catch (err) {
      message.error('Không thể xóa lịch trình này.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 600 }}>Thời khóa biểu / Lịch trình</h2>
          <p style={{ margin: 0, color: '#8c8c8c' }}>
            {isAdmin ? 'Click chuột vào một ô lịch hoặc bấm nút "Tạo sự kiện" để sắp xếp thời gian biểu.' : 'Xem danh sách lịch trình công khai.'}
          </p>
        </div>
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenCreateModal()}
            style={{ borderRadius: '6px' }}
          >
            Tạo sự kiện
          </Button>
        )}
      </div>

      <Calendar dateCellRender={dateCellRender} onSelect={handleSelectDate} />

      {/* Detail, Edit and Creation Modal */}
      <Modal
        title={
          modalMode === 'view' ? (
            <span>
              <InfoCircleOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              Chi tiết lịch trình
            </span>
          ) : modalMode === 'create' ? (
            'Tạo sự kiện mới'
          ) : (
            'Chỉnh sửa lịch trình'
          )
        }
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        {modalMode === 'view' && selectedEvent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: selectedEvent.color,
                  display: 'inline-block',
                }}
              />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{selectedEvent.title}</h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c', width: '120px' }}>Thời gian:</td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>
                    {dayjs(selectedEvent.startTime).format('HH:mm DD/MM/YYYY')} -{' '}
                    {dayjs(selectedEvent.endTime).format('HH:mm DD/MM/YYYY')}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Mô tả:</td>
                  <td style={{ padding: '8px 0', whiteSpace: 'pre-wrap' }}>
                    {selectedEvent.description || <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>Không có mô tả</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Người tạo:</td>
                  <td style={{ padding: '8px 0' }}>
                    {selectedEvent.createdBy?.username} ({selectedEvent.createdBy?.email})
                  </td>
                </tr>
              </tbody>
            </table>

            {isAdmin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                  style={{ borderRadius: '6px' }}
                >
                  Xóa
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleSwitchToEdit}
                  style={{ borderRadius: '6px' }}
                >
                  Chỉnh sửa
                </Button>
              </div>
            )}
          </div>
        )}

        {(modalMode === 'create' || modalMode === 'edit') && (
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item
              name="title"
              label="Tiêu đề sự kiện"
              rules={[{ required: true, message: 'Vui lòng điền tiêu đề lịch trình!' }]}
            >
              <Input placeholder="Ví dụ: Lớp học ReactJS, Họp giao ban,..." />
            </Form.Item>

            <Form.Item name="description" label="Ghi chú / Mô tả">
              <Input.TextArea rows={3} placeholder="Nội dung chi tiết của lịch trình..." />
            </Form.Item>

            <Form.Item
              name="range"
              label="Thời gian bắt đầu & kết thúc"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc!' }]}
            >
              <RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                placeholder={['Bắt đầu', 'Kết thúc']}
              />
            </Form.Item>

            <Form.Item name="color" label="Màu sắc đại diện">
              <Select placeholder="Chọn màu sắc hiển thị trên lịch">
                {colorOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    <Space>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: opt.value,
                          display: 'inline-block',
                        }}
                      />
                      {opt.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit">
                  {modalMode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};
