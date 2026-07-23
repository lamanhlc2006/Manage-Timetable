import React, { useState, useEffect } from 'react';
import { Card, Form, Input, DatePicker, Select, Button, Space, message } from 'antd';
import { PlusCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { createSchedule, CreateScheduleInput } from '../services/scheduleService';

const { Option } = Select;
const { RangePicker } = DatePicker;

export const CreateSchedule: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Color options for calendar events
  const colorOptions = [
    { label: 'Blue (Mặc định)', value: '#1890ff' },
    { label: 'Green (Học tập)', value: '#52c41a' },
    { label: 'Orange (Họp hành)', value: '#fa8c16' },
    { label: 'Red (Quan trọng)', value: '#f5222d' },
    { label: 'Purple (Cá nhân)', value: '#722ed1' },
    { label: 'Cyan (Dự án)', value: '#13c2c2' },
  ];

  // Route Guard: Redirect non-admin users
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user.role !== 'admin') {
          message.warning('Bạn không có quyền truy cập trang này.');
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Error checking user role', err);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const onFinish = async (values: any) => {
    setLoading(true);
    const [startDayjs, endDayjs] = values.range;

    if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
      message.error('Thời gian bắt đầu phải trước thời gian kết thúc!');
      setLoading(false);
      return;
    }

    const inputData: CreateScheduleInput = {
      title: values.title,
      description: values.description,
      startTime: startDayjs.toISOString(),
      endTime: endDayjs.toISOString(),
      color: values.color,
    };

    try {
      await createSchedule(inputData);
      message.success('Tạo lịch trình mới thành công!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Đã xảy ra lỗi khi tạo lịch trình, vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '12px 0' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/dashboard')}
          style={{ borderRadius: '6px' }}
        />
        <h2 style={{ margin: 0, fontWeight: 600 }}>Tạo Lịch Trình Mới</h2>
      </div>

      <Card 
        variant="borderless" 
        style={{ 
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            color: '#1890ff',
            range: [dayjs().hour(9).minute(0).second(0), dayjs().hour(10).minute(0).second(0)],
          }}
          size="large"
        >
          <Form.Item
            name="title"
            label="Tiêu đề lịch trình"
            rules={[{ required: true, message: 'Vui lòng điền tiêu đề lịch trình!' }]}
          >
            <Input placeholder="Ví dụ: Lớp học ReactJS, Họp giao ban,..." style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item name="description" label="Ghi chú / Mô tả chi tiết">
            <Input.TextArea rows={4} placeholder="Nội dung chi tiết của lịch trình..." style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            name="range"
            label="Thời gian bắt đầu & kết thúc"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc!' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%', borderRadius: '6px' }}
              placeholder={['Bắt đầu', 'Kết thúc']}
            />
          </Form.Item>

          <Form.Item 
            name="color" 
            label="Màu sắc đại diện"
            rules={[{ required: true, message: 'Vui lòng chọn màu sắc!' }]}
          >
            <Select placeholder="Chọn màu sắc hiển thị trên lịch" style={{ borderRadius: '6px' }}>
              {colorOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  <Space>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: opt.value,
                        display: 'inline-block',
                        verticalAlign: 'middle',
                      }}
                    />
                    {opt.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '32px', textAlign: 'right' }}>
            <Space size="middle">
              <Button onClick={() => navigate('/dashboard')} style={{ borderRadius: '6px' }}>
                Hủy
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<PlusCircleOutlined />}
                style={{ borderRadius: '6px' }}
              >
                Tạo mới
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
