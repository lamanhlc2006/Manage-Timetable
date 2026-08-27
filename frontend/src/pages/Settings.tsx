import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Tabs, message, Typography, Table, Space, Tag, Popconfirm, Modal, ColorPicker, Tooltip, Radio, Slider } from 'antd';
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
  SyncOutlined,
  CloudSyncOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  TagsOutlined,
  ClockCircleOutlined,
  BellOutlined,
  MailOutlined,
  LinkOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { updateProfile, changePassword, generateFeedToken, revokeFeedToken } from '../services/userService';
import { fetchCategories, createCategory, updateCategory, deleteCategory, CategoryItem } from '../services/categoryService';
import { fetchTags, createTagApi, updateTag, deleteTag, TagItem } from '../services/tagService';
import {
  getGoogleAuthUrl,
  getGoogleSyncStatus,
  toggleGoogleSync,
  disconnectGoogle,
  syncGoogleNow,
  GoogleSyncStatus,
} from '../services/googleSyncService';
import { LanguageSelector } from '../components/LanguageSelector';
import { useTheme } from '../context/ThemeContext';

const { Title, Paragraph, Text } = Typography;

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [profileLoading, setProfileLoading] = useState(false);
  const [emailNotifEnabled, setEmailNotifEnabled] = useState(false);
  const [notifEmail, setNotifEmail] = useState('');
  const [notifSaving, setNotifSaving] = useState(false);
  const [calendarFeedToken, setCalendarFeedToken] = useState<string>('');
  const [feedLoading, setFeedLoading] = useState(false);
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

  // Tag state
  const [tags, setTags] = useState<TagItem[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagFormLoading, setTagFormLoading] = useState(false);
  const [tagForm] = Form.useForm();

  // Google Calendar Sync state
  const [googleStatus, setGoogleStatus] = useState<GoogleSyncStatus>({
    connected: false,
    syncEnabled: false,
    lastSyncAt: null,
  });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  const loadGoogleStatus = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const status = await getGoogleSyncStatus();
      setGoogleStatus(status);
    } catch (err) {
      console.error('Error loading Google sync status:', err);
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoogleStatus();

    // Check query params for Google Sync OAuth callback result
    const urlParams = new URLSearchParams(window.location.search);
    const syncResult = urlParams.get('google_sync');
    if (syncResult === 'success') {
      message.success('Đã kết nối và đồng bộ thành công với Google Calendar!');
      window.history.replaceState({}, document.title, window.location.pathname);
      loadGoogleStatus();
    } else if (syncResult === 'error') {
      message.error('Lỗi khi kết nối với Google Calendar.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadGoogleStatus]);

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể tạo liên kết OAuth Google');
      setGoogleLoading(false);
    }
  };

  const handleToggleGoogleSync = async (checked: boolean) => {
    try {
      const res = await toggleGoogleSync(checked);
      message.success(res.message);
      setGoogleStatus((prev) => ({ ...prev, syncEnabled: res.syncEnabled }));
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái đồng bộ');
    }
  };

  const handleDisconnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const res = await disconnectGoogle();
      message.success(res.message);
      setGoogleStatus({ connected: false, syncEnabled: false, lastSyncAt: null });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi ngắt kết nối');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSyncGoogleNow = async () => {
    setSyncingNow(true);
    try {
      const res = await syncGoogleNow();
      message.success(res.message || 'Đồng bộ Google Calendar thành công!');
      loadGoogleStatus();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi đồng bộ Google Calendar');
    } finally {
      setSyncingNow(false);
    }
  };

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        profileForm.setFieldsValue({
          username: user.username,
          email: user.email,
          bufferMinutes: user.bufferMinutes || 0,
        });
        setEmailNotifEnabled(user.emailNotifications || false);
        setNotifEmail(user.notificationEmail || user.email || '');
        setCalendarFeedToken(user.calendarFeedToken || '');
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

  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const data = await fetchTags();
      setTags(data);
    } catch (err) {
      console.error('Error loading tags:', err);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleOpenCreateTag = () => {
    setEditingTag(null);
    setIsTagModalVisible(true);
    setTimeout(() => {
      tagForm.resetFields();
      tagForm.setFieldsValue({
        color: '#1890ff',
      });
    }, 0);
  };

  const handleOpenEditTag = (record: TagItem) => {
    setEditingTag(record);
    setIsTagModalVisible(true);
    setTimeout(() => {
      tagForm.setFieldsValue({
        name: record.name,
        color: record.color,
      });
    }, 0);
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await deleteTag(id);
      message.success(t('settings.deleteTagSuccess'));
      loadTags();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || t('common.error'));
    }
  };

  const handleSaveTag = async (values: any) => {
    setTagFormLoading(true);
    try {
      const hexColor = typeof values.color === 'string' ? values.color : values.color.toHexString();
      const payload = {
        name: values.name.trim(),
        color: hexColor,
      };

      if (editingTag) {
        await updateTag(editingTag._id, payload);
        message.success(t('settings.updateTagSuccess'));
      } else {
        await createTagApi(payload);
        message.success(t('settings.createTagSuccess'));
      }
      setIsTagModalVisible(false);
      loadTags();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || t('common.error'));
    } finally {
      setTagFormLoading(false);
    }
  };

  const handleUpdateProfile = async (values: any) => {
    setProfileLoading(true);
    try {
      const result = await updateProfile({
        username: values.username,
        email: values.email,
        bufferMinutes: values.bufferMinutes,
      });
      // Update localStorage with new bufferMinutes
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        user.bufferMinutes = result.bufferMinutes ?? values.bufferMinutes ?? 0;
        user.username = result.username ?? values.username;
        user.email = result.email ?? values.email;
        localStorage.setItem('user', JSON.stringify(user));
      }
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
    setIsCatModalVisible(true);
    setTimeout(() => {
      catForm.resetFields();
      catForm.setFieldsValue({
        color: '#1890ff',
        icon: '📌',
      });
    }, 0);
  };

  const handleOpenEditCat = (record: CategoryItem) => {
    setEditingCat(record);
    setIsCatModalVisible(true);
    setTimeout(() => {
      catForm.setFieldsValue({
        name: record.name,
        color: record.color,
        icon: record.icon || '📌',
      });
    }, 0);
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

  const tagColumns = [
    {
      title: t('settings.tagName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TagItem) => (
        <Space>
          <Tag
            color={record.color}
            style={{ borderRadius: '12px', fontSize: '13px', padding: '2px 10px' }}
          >
            {name}
          </Tag>
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
      render: (_: any, record: TagItem) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#1890ff' }} />}
            onClick={() => handleOpenEditTag(record)}
            style={{ padding: 0 }}
          />
          <Popconfirm
            title={t('common.delete') + '?'}
            onConfirm={() => handleDeleteTag(record._id)}
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
      ),
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

          <Form.Item
            name="bufferMinutes"
            label={
              <Space>
                <ClockCircleOutlined />
                {t('settings.bufferTimeLabel', 'Thời gian nghỉ giữa các sự kiện')}
              </Space>
            }
            tooltip={t('settings.bufferTimeTooltip', 'Khoảng cách tối thiểu (phút) giữa 2 sự kiện liên tiếp. Nếu > 0, hệ thống sẽ cảnh báo khi tạo sự kiện quá sát nhau.')}
          >
            <Slider
              min={0}
              max={60}
              step={5}
              marks={{
                0: '0',
                5: '5',
                10: '10',
                15: '15',
                30: '30',
                60: '60',
              }}
              tooltip={{ formatter: (val) => `${val} ${t('settings.minutes', 'phút')}` }}
            />
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
    {
      key: 'tags',
      label: (
        <span>
          <TagsOutlined />
          {t('settings.tagManagement')}
        </span>
      ),
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>{t('settings.tagManagement')}</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateTag}
              style={{ borderRadius: '6px' }}
            >
              {t('settings.addTag')}
            </Button>
          </div>
          <Table
            columns={tagColumns}
            dataSource={tags}
            rowKey="_id"
            loading={tagsLoading}
            pagination={false}
            size="middle"
            bordered
            style={{ borderRadius: '8px', overflow: 'hidden' }}
          />
        </div>
      ),
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          {t('settings.notificationsTab', 'Thông báo')}
        </span>
      ),
      children: (
        <div style={{ maxWidth: 520 }}>
          <Typography.Title level={5} style={{ marginBottom: '16px' }}>
            <MailOutlined /> {t('settings.emailNotifTitle', 'Thông báo qua Email')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
            {t('settings.emailNotifDesc', 'Nhận email nhắc nhở trước khi sự kiện diễn ra. Yêu cầu server cấu hình SMTP.')}
          </Typography.Paragraph>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{t('settings.enableEmailNotif', 'Bật thông báo email')}</span>
              <Switch checked={emailNotifEnabled} onChange={setEmailNotifEnabled} />
            </div>

            {emailNotifEnabled && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#595959', marginBottom: 4 }}>
                  {t('settings.notifEmailLabel', 'Email nhận thông báo')}
                </div>
                <Input
                  prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder={t('settings.notifEmailPlaceholder', 'Để trống sẽ dùng email tài khoản')}
                  value={notifEmail}
                  onChange={(e) => setNotifEmail(e.target.value)}
                  style={{ borderRadius: 6 }}
                />
                <Typography.Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  {t('settings.notifEmailHint', 'Để trống sẽ gửi đến email đăng ký tài khoản của bạn.')}
                </Typography.Text>
              </div>
            )}

            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={notifSaving}
              style={{ borderRadius: 6, alignSelf: 'flex-start' }}
              onClick={async () => {
                setNotifSaving(true);
                try {
                  const userString = localStorage.getItem('user');
                  const user = userString ? JSON.parse(userString) : {};
                  const result = await updateProfile({
                    username: user.username,
                    email: user.email,
                    emailNotifications: emailNotifEnabled,
                    notificationEmail: notifEmail,
                  });
                  // Update localStorage
                  user.emailNotifications = emailNotifEnabled;
                  user.notificationEmail = notifEmail;
                  if (result.bufferMinutes !== undefined) user.bufferMinutes = result.bufferMinutes;
                  localStorage.setItem('user', JSON.stringify(user));
                  message.success(t('common.success'));
                } catch (err: any) {
                  const msg = err.response?.data?.message || t('common.error');
                  message.error(msg);
                } finally {
                  setNotifSaving(false);
                }
              }}
            >
              {t('common.save')}
            </Button>
          </div>

          {/* Webcal Feed Section */}
          <div style={{ marginTop: 32, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
            <Typography.Title level={5} style={{ marginBottom: '8px' }}>
              <LinkOutlined /> {t('settings.calendarFeedTitle', 'Đăng ký lịch (webcal)')}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
              {t('settings.calendarFeedDesc', 'Tạo link để đăng ký lịch trình vào Google Calendar, Apple Calendar hoặc Outlook. Lịch sẽ tự động cập nhật.')}
            </Typography.Paragraph>

            {calendarFeedToken ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input.Group compact>
                  <Input
                    readOnly
                    value={`${window.location.origin}/api/schedules/feed/${calendarFeedToken}`}
                    style={{ width: 'calc(100% - 80px)', borderRadius: '6px 0 0 6px', fontFamily: 'monospace', fontSize: 12 }}
                  />
                  <Button
                    icon={<CopyOutlined />}
                    style={{ borderRadius: '0 6px 6px 0' }}
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/schedules/feed/${calendarFeedToken}`);
                      message.success(t('settings.feedCopied', 'Đã sao chép link!'));
                    }}
                  >
                    Copy
                  </Button>
                </Input.Group>
                <Typography.Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 0 }}>
                  {'💡 '}<strong>{t('settings.feedHowTo', 'Cách dùng')}:</strong><br />
                  {'• Google Calendar: Settings → Add calendar → From URL → paste link'}<br />
                  {'• Apple Calendar: File → New Calendar Subscription → paste link'}<br />
                  {'• Outlook: Add calendar → Subscribe from web → paste link'}
                </Typography.Paragraph>
                <Button danger size="small" loading={feedLoading} style={{ alignSelf: 'flex-start', borderRadius: 6 }} onClick={async () => {
                  setFeedLoading(true);
                  try {
                    await revokeFeedToken();
                    setCalendarFeedToken('');
                    const u = localStorage.getItem('user');
                    if (u) { const p = JSON.parse(u); delete p.calendarFeedToken; localStorage.setItem('user', JSON.stringify(p)); }
                    message.success(t('settings.feedRevoked', 'Đã thu hồi link'));
                  } catch (err: any) { message.error(err.response?.data?.message || t('common.error')); }
                  finally { setFeedLoading(false); }
                }}>
                  {t('settings.revokeFeed', 'Thu hồi link')}
                </Button>
              </div>
            ) : (
              <Button type="primary" icon={<LinkOutlined />} loading={feedLoading} style={{ borderRadius: 6 }} onClick={async () => {
                setFeedLoading(true);
                try {
                  const result = await generateFeedToken();
                  setCalendarFeedToken(result.calendarFeedToken);
                  const u = localStorage.getItem('user');
                  if (u) { const p = JSON.parse(u); p.calendarFeedToken = result.calendarFeedToken; localStorage.setItem('user', JSON.stringify(p)); }
                  message.success(t('settings.feedGenerated', 'Đã tạo link đăng ký lịch!'));
                } catch (err: any) { message.error(err.response?.data?.message || t('common.error')); }
                finally { setFeedLoading(false); }
              }}>
                {t('settings.generateFeed', 'Tạo link đăng ký lịch')}
              </Button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'google_sync',
      label: (
        <span>
          <CloudSyncOutlined />
          Google Calendar
        </span>
      ),
      children: (
        <div style={{ marginTop: '16px' }}>
          <Card
            type="inner"
            title={
              <Space>
                <CloudSyncOutlined style={{ color: '#4285F4' }} />
                <span>Đồng bộ 2 chiều với Google Calendar</span>
              </Space>
            }
            style={{ borderRadius: '8px' }}
          >
            {googleStatus.connected ? (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '18px' }} />
                    <Text strong style={{ color: '#52c41a' }}>Đã kết nối tài khoản Google Calendar</Text>
                  </Space>
                  <Tag color="success">HOẠT ĐỘNG</Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '12px 16px', borderRadius: '6px' }}>
                  <div>
                    <Text strong style={{ display: 'block' }}>Tự động đồng bộ 2 chiều</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Tự động đẩy sự kiện mới lên Google và kéo sự kiện mới nhất về ứng dụng
                    </Text>
                  </div>
                  <Switch
                    checked={googleStatus.syncEnabled}
                    onChange={handleToggleGoogleSync}
                  />
                </div>

                {googleStatus.lastSyncAt && (
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                    Lần đồng bộ gần nhất: {new Date(googleStatus.lastSyncAt).toLocaleString('vi-VN')}
                  </Text>
                )}

                <Space style={{ marginTop: '8px' }}>
                  <Button
                    type="primary"
                    icon={<SyncOutlined spin={syncingNow} />}
                    loading={syncingNow}
                    onClick={handleSyncGoogleNow}
                  >
                    Đồng bộ ngay
                  </Button>
                  <Popconfirm
                    title="Ngắt kết nối với Google Calendar?"
                    description="Sau khi ngắt kết nối, các sự kiện mới sẽ không còn được tự động đồng bộ."
                    onConfirm={handleDisconnectGoogle}
                    okText="Ngắt kết nối"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<DisconnectOutlined />}>
                      Ngắt kết nối
                    </Button>
                  </Popconfirm>
                </Space>
              </Space>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Kết nối ứng dụng với tài khoản Google Calendar để tự động đồng bộ các lịch trình học tập, công việc 2 chiều trên cả máy tính và điện thoại.
                </Paragraph>
                <Button
                  type="primary"
                  icon={<CloudSyncOutlined />}
                  loading={googleLoading}
                  onClick={handleConnectGoogle}
                  style={{ background: '#4285F4', borderColor: '#4285F4', borderRadius: '6px' }}
                  size="large"
                >
                  Kết nối với Google Calendar
                </Button>
              </Space>
            )}
          </Card>
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

      {/* Tag Edit/Create Modal */}
      <Modal
        title={editingTag ? t('common.edit') : t('settings.addTag')}
        open={isTagModalVisible}
        onCancel={() => setIsTagModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={400}
      >
        <Form
          form={tagForm}
          layout="vertical"
          onFinish={handleSaveTag}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="name"
            label={t('settings.tagName')}
            rules={[{ required: true, message: t('settings.tagNameRequired') }]}
          >
            <Input placeholder={t('settings.tagNamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="color"
            label={t('settings.color')}
            rules={[{ required: true, message: t('settings.tagColorRequired') }]}
          >
            <ColorPicker showText />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setIsTagModalVisible(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={tagFormLoading}>
                {t('common.save')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};
