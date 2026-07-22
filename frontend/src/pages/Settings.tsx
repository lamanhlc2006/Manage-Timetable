import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Tabs, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, KeyOutlined } from '@ant-design/icons';
import { updateProfile, changePassword } from '../services/userService';

const { Title, Paragraph } = Typography;

export const Settings: React.FC = () => {
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        profileForm.setFieldsValue({
          username: user.username,
          email: user.email,
        });
      } catch (err) {
        console.error('Error parsing user details:', err);
      }
    }
  }, [profileForm]);

  const handleUpdateProfile = async (values: any) => {
    setProfileLoading(true);
    try {
      await updateProfile({
        username: values.username,
        email: values.email,
      });
      message.success('Cập nhật hồ sơ thành công!');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Đã xảy ra lỗi khi cập nhật hồ sơ.';
      message.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Đổi mật khẩu thành công!');
      passwordForm.resetFields();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Đã xảy ra lỗi khi đổi mật khẩu.';
      message.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabsItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          Hồ sơ cá nhân
        </span>
      ),
      children: (
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
          size="large"
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="username"
            label="Tên tài khoản (Username)"
            rules={[
              { required: true, message: 'Vui lòng điền tên tài khoản!' },
              { min: 3, message: 'Tên tài khoản phải có ít nhất 3 ký tự!' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Tên tài khoản" style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            name="email"
            label="Địa chỉ Email"
            rules={[
              { required: true, message: 'Vui lòng điền địa chỉ email!' },
              { type: 'email', message: 'Địa chỉ email không hợp lệ!' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Email" style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={profileLoading}
              icon={<SaveOutlined />}
              style={{ borderRadius: '6px' }}
            >
              Lưu thay đổi
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <LockOutlined />
          Bảo mật
        </span>
      ),
      children: (
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          size="large"
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng điền mật khẩu hiện tại!' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Mật khẩu hiện tại" style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng điền mật khẩu mới!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
            ]}
          >
            <Input.Password prefix={<KeyOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Mật khẩu mới" style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            name="confirmNewPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<KeyOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Xác nhận mật khẩu mới" style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={passwordLoading}
              icon={<SaveOutlined />}
              style={{ borderRadius: '6px' }}
            >
              Cập nhật mật khẩu
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '12px 0' }}>
      <div style={{ marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0 }}>
          Cài Đặt Tài Khoản
        </Title>
        <Paragraph type="secondary">
          Quản lý thông tin cá nhân và cài đặt bảo mật tài khoản của bạn.
        </Paragraph>
      </div>

      <Card
        bordered={false}
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        <Tabs defaultActiveKey="profile" items={tabsItems} />
      </Card>
    </div>
  );
};
