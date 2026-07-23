import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Tabs, message, Typography, Table, Space, Tag, Popconfirm, Modal, ColorPicker, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined, KeyOutlined, FolderOpenOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { updateProfile, changePassword } from '../services/userService';
import { fetchCategories, createCategory, updateCategory, deleteCategory, CategoryItem } from '../services/categoryService';

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

  // Category CRUD states
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [catFormLoading, setCatFormLoading] = useState(false);
  const [categoryForm] = Form.useForm();

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const list = await fetchCategories();
      setCategories(list);
    } catch (err: any) {
      console.error('Error loading categories:', err);
      message.error('Không thể tải danh sách danh mục.');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDeleteCat = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success('Xóa danh mục thành công!');
      loadCategories();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể xóa danh mục.');
    }
  };

  const handleOpenCreateCat = () => {
    setEditingCat(null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({
      name: '',
      icon: '📌',
      color: '#1890ff',
    });
    setIsCatModalVisible(true);
  };

  const handleOpenEditCat = (cat: CategoryItem) => {
    setEditingCat(cat);
    categoryForm.setFieldsValue({
      name: cat.name,
      icon: cat.icon || '📌',
      color: cat.color,
    });
    setIsCatModalVisible(true);
  };

  const handleCategoryFormSubmit = async (values: any) => {
    setCatFormLoading(true);
    try {
      const color = typeof values.color === 'string' ? values.color : (values.color?.toHexString ? values.color.toHexString() : '#1890ff');
      const payload = {
        name: values.name.trim(),
        icon: values.icon.trim(),
        color,
      };

      if (editingCat) {
        await updateCategory(editingCat._id, payload);
        message.success('Cập nhật danh mục thành công!');
      } else {
        await createCategory(payload);
        message.success('Tạo danh mục mới thành công!');
      }
      setIsCatModalVisible(false);
      loadCategories();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || 'Đã xảy ra lỗi khi lưu danh mục.');
    } finally {
      setCatFormLoading(false);
    }
  };

  const presetEmojis = ['📚', '💼', '👤', '🏃', '🎮', '🚀', '💡', '🔔', '🛒', '🍕', '✈️', '💵', '📌', '🎉', '❤️'];

  const categoryColumns = [
    {
      title: 'Biểu tượng',
      dataIndex: 'icon',
      key: 'icon',
      width: 90,
      align: 'center' as const,
      render: (icon: string) => <span style={{ fontSize: '20px' }}>{icon || '📌'}</span>,
    },
    {
      title: 'Tên danh mục',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CategoryItem) => (
        <Space>
          <span style={{ fontWeight: 600 }}>{name}</span>
          {record.isSystem && <Tag color="default" style={{ borderRadius: '4px' }}>Hệ thống</Tag>}
        </Space>
      ),
    },
    {
      title: 'Màu hiển thị',
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
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: CategoryItem) => {
        if (record.isSystem) {
          return (
            <Tooltip title="Danh mục hệ thống không được sửa/xóa">
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
              title="Xóa danh mục này?"
              description="Các sự kiện đang dùng danh mục này sẽ giữ nguyên tên danh mục."
              onConfirm={() => handleDeleteCat(record._id)}
              okText="Xóa"
              cancelText="Hủy"
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
    {
      key: 'categories',
      label: (
        <span>
          <FolderOpenOutlined />
          Quản lý danh mục
        </span>
      ),
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Danh sách danh mục</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateCat}
              style={{ borderRadius: '6px' }}
            >
              Thêm danh mục
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
        title={editingCat ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        open={isCatModalVisible}
        onCancel={() => setIsCatModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={400}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategoryFormSubmit}
          size="large"
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[
              { required: true, message: 'Vui lòng nhập tên danh mục!' },
              { max: 20, message: 'Tên danh mục tối đa 20 ký tự!' }
            ]}
          >
            <Input placeholder="Giải trí, Sức khỏe, ..." style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            name="icon"
            label="Emoji / Biểu tượng"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập biểu tượng!' }]}
          >
            <Input placeholder="Chọn bên dưới hoặc dán emoji..." style={{ borderRadius: '6px', fontSize: '18px' }} />
          </Form.Item>

          <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {presetEmojis.map((emoji) => (
              <span
                key={emoji}
                style={{
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px 8px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  background: '#fafafa',
                  transition: 'all 0.2s',
                }}
                onClick={() => categoryForm.setFieldsValue({ icon: emoji })}
                className="preset-emoji-btn"
              >
                {emoji}
              </span>
            ))}
          </div>

          <Form.Item
            name="color"
            label="Màu hiển thị"
            rules={[{ required: true, message: 'Vui lòng chọn màu sắc!' }]}
          >
            <ColorPicker showText />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setIsCatModalVisible(false)} style={{ borderRadius: '6px' }}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={catFormLoading}
                icon={<SaveOutlined />}
                style={{ borderRadius: '6px' }}
              >
                Lưu lại
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
