import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Tabs, message, Typography, Table, Space, Tag, Popconfirm, Modal, ColorPicker, Tooltip, Radio } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SaveOutlined,
  KeyOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { updateProfile, changePassword } from '../services/userService';
import { fetchCategories, createCategory, updateCategory, deleteCategory, CategoryItem } from '../services/categoryService';
import { LanguageSelector } from '../components/LanguageSelector';
import { useTheme } from '../context/ThemeContext';

const { Title, Paragraph, Text } = Typography;

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // Category state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catFormLoading, setCatFormLoading] = useState(false);
  const [catForm] = Form.useForm();

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

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleUpdateProfile = async (values: any) => {
    setProfileLoading(true);
    try {
      await updateProfile({
        username: values.username,
        email: values.email,
      });
      message.success(t('common.success'));
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || t('common.error');
      message.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error(t('auth.confirmPassword') + ' mismatch');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success(t('common.success'));
      passwordForm.resetFields();
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || t('common.error');
      message.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOpenCreateCat = () => {
    setEditingCat(null);
    catForm.resetFields();
    catForm.setFieldsValue({
      color: '#1890ff',
      icon: '📌',
    });
    setIsCatModalVisible(true);
  };

  const handleOpenEditCat = (record: CategoryItem) => {
    setEditingCat(record);
    catForm.setFieldsValue({
      name: record.name,
      color: record.color,
      icon: record.icon || '📌',
    });
    setIsCatModalVisible(true);
  };

  const handleDeleteCat = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success(t('common.success'));
      loadCategories();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || t('common.error'));
    }
  };

  const handleSaveCat = async (values: any) => {
    setCatFormLoading(true);
    try {
      const hexColor = typeof values.color === 'string' ? values.color : values.color.toHexString();
      const payload = {
        name: values.name.trim(),
        color: hexColor,
        icon: values.icon,
      };

      if (editingCat) {
        await updateCategory(editingCat._id, payload);
        message.success(t('common.success'));
      } else {
        await createCategory(payload);
        message.success(t('common.success'));
      }
      setIsCatModalVisible(false);
      loadCategories();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || t('common.error'));
    } finally {
      setCatFormLoading(false);
    }
  };

  const presetEmojis = ['📚', '💼', '👤', '🏃', '🎮', '🚀', '💡', '🔔', '🛒', '🍕', '✈️', '💵', '📌', '🎉', '❤️'];

  const categoryColumns = [
    {
      title: t('settings.icon'),
      dataIndex: 'icon',
      key: 'icon',
      width: 90,
      align: 'center' as const,
      render: (icon: string) => <span style={{ fontSize: '20px' }}>{icon || '📌'}</span>,
    },
    {
      title: t('settings.categoryName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CategoryItem) => (
        <Space>
          <span style={{ fontWeight: 600 }}>{name}</span>
          {record.isSystem && <Tag color="default" style={{ borderRadius: '4px' }}>{t('settings.systemCategory')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('settings.color'),
      dataIndex: 'color',
      key: 'color',
      width: 130,
      render: (color: string) => (
        <Space>
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: color,
              display: 'inline-block',
              boxShadow: '0 0 4px rgba(0,0,0,0.15)',
            }}
          />
          <code style={{ fontSize: '12px' }}>{color.toUpperCase()}</code>
        </Space>
      ),
    },
    {
      title: t('common.actions'),
      key: 'action',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: CategoryItem) => {
        if (record.isSystem) {
          return (
            <Tooltip title={t('settings.systemCategory')}>
              <Tag color="warning" bordered={false} style={{ margin: 0 }}>Cố định</Tag>
            </Tooltip>
          );
        }
        return (
          <Space size="middle">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleOpenEditCat(record)}
              style={{ padding: 0 }}
            />
            <Popconfirm
              title={t('common.delete') + '?'}
              onConfirm={() => handleDeleteCat(record._id)}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{ padding: 0 }}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const tabsItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          {t('settings.profileInfo')}
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
            label={t('auth.username')}
            rules={[
              { required: true, message: t('auth.usernameRequired') },
              { min: 3, message: 'Tên tài khoản phải có ít nhất 3 ký tự!' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder={t('auth.username')} style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('auth.email')}
            rules={[
              { required: true, message: t('auth.emailRequired') },
              { type: 'email', message: t('auth.emailRequired') },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder={t('auth.email')} style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={profileLoading}
              icon={<SaveOutlined />}
              style={{ borderRadius: '6px' }}
            >
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'appearance',
      label: (
        <span>
          <GlobalOutlined />
          {t('settings.appearance')}
        </span>
      ),
      children: (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '15px' }}>
              {t('settings.language')}:
            </Text>
            <LanguageSelector type="segmented" size="large" />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: '15px' }}>
              {t('settings.themeMode')}:
            </Text>
            <Radio.Group
              value={theme}
              onChange={toggleTheme}
              buttonStyle="solid"
              size="large"
            >
              <Radio.Button value="light">
                <SunOutlined style={{ marginRight: 6, color: '#faad14' }} />
                {t('settings.light')}
              </Radio.Button>
              <Radio.Button value="dark">
                <MoonOutlined style={{ marginRight: 6 }} />
                {t('settings.dark')}
              </Radio.Button>
            </Radio.Group>
          </div>
        </div>
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
            name="confirmPassword"
            label={t('auth.confirmPassword')}
            rules={[{ required: true, message: 'Vui lòng xác nhận mật khẩu!' }]}
          >
            <Input.Password prefix={<KeyOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder={t('auth.confirmPassword')} style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={passwordLoading}
              icon={<SaveOutlined />}
              style={{ borderRadius: '6px' }}
            >
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'categories',
      label: (
        <span>
          <FolderOpenOutlined />
          {t('settings.categoryManagement')}
        </span>
      ),
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>{t('settings.categoryManagement')}</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateCat}
              style={{ borderRadius: '6px' }}
            >
              {t('settings.addCategory')}
            </Button>
          </div>
          <Table
            columns={categoryColumns}
            dataSource={categories}
            rowKey="_id"
            loading={categoriesLoading}
            pagination={false}
            size="middle"
            bordered
            style={{ borderRadius: '8px', overflow: 'hidden' }}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 0' }}>
      <div style={{ marginBottom: '20px' }}>
        <Title level={3} style={{ margin: 0 }}>
          {t('settings.title')}
        </Title>
        <Paragraph type="secondary">
          {t('settings.subtitle')}
        </Paragraph>
      </div>

      <Card
        variant="borderless"
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        <Tabs defaultActiveKey="profile" items={tabsItems} />
      </Card>

      {/* Category Edit/Create Modal */}
      <Modal
        title={editingCat ? t('common.edit') : t('settings.addCategory')}
        open={isCatModalVisible}
        onCancel={() => setIsCatModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={400}
      >
        <Form
          form={catForm}
          layout="vertical"
          onFinish={handleSaveCat}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="name"
            label={t('settings.categoryName')}
            rules={[{ required: true, message: 'Vui lòng nhập tên danh mục!' }]}
          >
            <Input placeholder="Ví dụ: Học tập, Cá nhân..." />
          </Form.Item>

          <Form.Item name="icon" label={t('settings.icon')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Input
                placeholder="Nhập emoji..."
                value={catForm.getFieldValue('icon')}
                onChange={(e) => catForm.setFieldsValue({ icon: e.target.value })}
                style={{ width: '120px' }}
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {presetEmojis.map((emoji) => (
                  <Button
                    key={emoji}
                    size="small"
                    type="text"
                    onClick={() => catForm.setFieldsValue({ icon: emoji })}
                    style={{ fontSize: '16px', padding: '2px 6px' }}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          </Form.Item>

          <Form.Item
            name="color"
            label={t('settings.color')}
            rules={[{ required: true, message: 'Vui lòng chọn màu sắc!' }]}
          >
            <ColorPicker showText />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setIsCatModalVisible(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={catFormLoading}>
                {t('common.save')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
