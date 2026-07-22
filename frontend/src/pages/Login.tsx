import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Radio, Tabs, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ScheduleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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

  const handleQuickLogin = async (role: 'admin' | 'user') => {
    setLoading(true);
    const email = role === 'admin' ? 'admin@example.com' : 'user@example.com';
    const password = role === 'admin' ? 'admin123' : 'user123';
    const username = role === 'admin' ? 'Demo Admin' : 'Demo User';

    try {
      // 1. Try to login via Backend API
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('offlineMode', 'false');
      message.success(`Đăng nhập thành công với tài khoản ảo ${response.data.username}!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.warn('Backend login failed, switching to Offline Demo Mode:', error);
      
      // 2. Offline Fallback: If backend is offline or db connection failed, bypass
      const mockUserData = {
        _id: role === 'admin' ? 'mock-admin-id-123' : 'mock-user-id-456',
        username,
        email,
        role,
        token: `mock-jwt-token-for-${role}`,
      };
      
      localStorage.setItem('user', JSON.stringify(mockUserData));
      localStorage.setItem('offlineMode', 'true');
      
      message.info(`Đã chuyển sang Chế độ Demo Ngoại tuyến (${role === 'admin' ? 'Quản trị' : 'Người xem'})!`);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const onFinishLogin = async (values: any) => {
    setLoading(true);
    try {
      // POST to backend login route via relative path (proxied)
      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      });

      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('offlineMode', 'false');
      message.success(`Chào mừng ${response.data.username} trở lại!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      let msg = 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin.';
      if (error.response?.data?.message) {
        msg = error.response.data.message;
      } else if (!error.response) {
        msg = 'Không thể kết nối đến máy chủ backend (Port 5000). Vui lòng kiểm tra dịch vụ backend.';
      }
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onFinishRegister = async (values: any) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.role,
      });

      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('offlineMode', 'false');
      message.success(`Đăng ký tài khoản ${response.data.username} thành công!`);
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      let msg = 'Đăng ký thất bại, vui lòng thử lại.';
      if (error.response?.data?.message) {
        msg = error.response.data.message;
      } else if (!error.response) {
        msg = 'Không thể kết nối đến máy chủ backend (Port 5000). Vui lòng kiểm tra dịch vụ backend.';
      }
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

        <Divider style={{ margin: '16px 0', borderColor: '#f0f0f0' }}>
          <span style={{ color: '#8c8c8c', fontSize: '13px', fontWeight: 'normal' }}>
            Hoặc Trải nghiệm nhanh (Demo)
          </span>
        </Divider>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Button
            onClick={() => handleQuickLogin('admin')}
            style={{
              flex: 1,
              borderRadius: '6px',
              borderColor: '#ffccc7',
              color: '#ff4d4f',
              backgroundColor: '#fff1f0',
              fontWeight: 500,
              height: '40px'
            }}
          >
            Quyền Admin (Tạo/Sửa)
          </Button>
          <Button
            onClick={() => handleQuickLogin('user')}
            style={{
              flex: 1,
              borderRadius: '6px',
              borderColor: '#adc6ff',
              color: '#2f54eb',
              backgroundColor: '#f0f5ff',
              fontWeight: 500,
              height: '40px'
            }}
          >
            Quyền User (Xem)
          </Button>
        </div>
      </Card>
    </div>
  );
};
