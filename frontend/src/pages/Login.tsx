import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Radio, Tabs, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ScheduleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { TabPane } = Tabs;

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const onFinishLogin = async (values: any) => {
    setLoading(true);
    try {
      // POST to backend login route via relative path (proxied)
      const response = await axios.post('/api/auth/login', {
        email: values.email,
        password: values.password,
      });

      localStorage.setItem('user', JSON.stringify(response.data));
      message.success(`Chào mừng ${response.data.username} trở lại!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values: any) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/register', {
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role,
      });

      localStorage.setItem('user', JSON.stringify(response.data));
      message.success(`Đăng ký tài khoản ${response.data.username} thành công!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}
        bodyStyle={{ padding: '32px 24px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              backgroundColor: '#f0f5ff',
              borderRadius: '12px',
              marginBottom: '12px',
              color: '#1890ff',
            }}
          >
            <ScheduleOutlined style={{ fontSize: '32px' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111' }}>
            Hệ Thống Lịch Trình
          </h2>
          <p style={{ color: '#8c8c8c', margin: 0 }}>Quản lý thời gian biểu dễ dàng và trực quan</p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          centered
          style={{ marginBottom: '16px' }}
        >
          <TabPane tab="Đăng Nhập" key="login">
            <Form name="login_form" layout="vertical" onFinish={onFinishLogin} size="large">
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email!' },
                  { type: 'email', message: 'Email không đúng định dạng!' },
                ]}
              >
                <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="email@example.com" />
              </Form.Item>

              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: '24px' }}>
                <Button type="primary" htmlType="submit" block loading={loading} style={{ borderRadius: '6px' }}>
                  Đăng Nhập
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="Đăng Ký" key="register">
            <Form name="register_form" layout="vertical" onFinish={onFinishRegister} size="large">
              <Form.Item
                name="username"
                label="Tên tài khoản"
                rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản!' }]}
              >
                <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Tên hiển thị" />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Vui lòng nhập Email!' },
                  { type: 'email', message: 'Email không đúng định dạng!' },
                ]}
              >
                <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="email@example.com" />
              </Form.Item>

              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu!' },
                  { min: 6, message: 'Mật khẩu phải chứa ít nhất 6 ký tự!' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Mật khẩu"
                />
              </Form.Item>

              <Form.Item
                name="role"
                label="Vai trò"
                initialValue="user"
                rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
              >
                <Radio.Group style={{ width: '100%', textAlign: 'center' }}>
                  <Radio.Button value="user" style={{ width: '50%', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>
                    Người dùng (Xem lịch)
                  </Radio.Button>
                  <Radio.Button value="admin" style={{ width: '50%', borderTopRightRadius: '6px', borderBottomRightRadius: '6px' }}>
                    Quản trị viên (Tạo lịch)
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item style={{ marginTop: '24px' }}>
                <Button type="primary" htmlType="submit" block loading={loading} style={{ borderRadius: '6px' }}>
                  Đăng Ký
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};
