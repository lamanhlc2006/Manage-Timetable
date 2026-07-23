import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Input,
  Button,
  Tag,
  Badge,
  Popconfirm,
  message,
  Space,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  UnlockOutlined,
  LockOutlined,
  UserSwitchOutlined,
  UserOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  fetchUsers,
  updateUserRole,
  toggleUserStatus,
  resetPassword,
  UserDetail,
} from '../services/userService';
import { useTranslation } from 'react-i18next';

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Retrieve current logged-in user to disable self-modifications
  const currentUserString = localStorage.getItem('user');
  let currentUserId = '';
  if (currentUserString) {
    try {
      const parsed = JSON.parse(currentUserString);
      currentUserId = parsed._id || '';
    } catch (e) {
      console.error(e);
    }
  }

  // Debounce the search input keyword changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1); // Reset to page 1 on search
    }, 500);
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Fetch users list from backend or local storage
  const loadUsersList = async () => {
    try {
      setLoading(true);
      const data = await fetchUsers({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersList();
  }, [page, debouncedSearch]);

  // Handle changing user role (Admin <=> User)
  const handleChangeRole = async (record: UserDetail) => {
    const newRole = record.role === 'admin' ? 'user' : 'admin';
    try {
      setLoading(true);
      const updatedUser = await updateUserRole(record._id, newRole);
      message.success(`Đã cập nhật quyền của ${updatedUser.username} thành ${updatedUser.role.toUpperCase()}!`);
      // Update local state
      setUsers((prev) => prev.map((u) => (u._id === record._id ? updatedUser : u)));
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || 'Lỗi phân quyền người dùng.');
    } finally {
      setLoading(false);
    }
  };

  // Handle locking/unlocking user status
  const handleToggleStatus = async (record: UserDetail) => {
    const newStatus = !record.isActive;
    try {
      setLoading(true);
      const updatedUser = await toggleUserStatus(record._id, newStatus);
      if (updatedUser.isActive) {
        message.success(`Mở khóa tài khoản ${updatedUser.username} thành công!`);
      } else {
        message.warning(`Đã khóa tài khoản ${updatedUser.username}!`);
      }
      // Update local state
      setUsers((prev) => prev.map((u) => (u._id === record._id ? updatedUser : u)));
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || 'Lỗi cập nhật trạng thái người dùng.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resetting user password
  const handleResetPassword = async (record: UserDetail) => {
    try {
      setLoading(true);
      const res = await resetPassword(record._id);
      message.success(res.message || `Đã reset mật khẩu của ${record.username} thành mặc định "user123"!`);
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || 'Lỗi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // Ant Design Table Columns configuration
  const columns = [
    {
      title: t('userMgmt.columnUsername'),
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: UserDetail) => (
        <Space>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: record.role === 'admin' ? '#fff1f0' : '#f0f5ff',
              color: record.role === 'admin' ? '#ff4d4f' : '#1890ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            {text.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record._id === currentUserId && (
            <Tag color="cyan" style={{ marginLeft: 4 }}>You</Tag>
          )}
        </Space>
      ),
    },
    {
      title: t('userMgmt.columnEmail'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('userMgmt.columnRole'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'} style={{ textTransform: 'uppercase', fontWeight: 600 }}>
          {role}
        </Tag>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'error'}
          text={
            <span style={{ fontWeight: 500, color: isActive ? '#52c41a' : '#f5222d' }}>
              {isActive ? 'Active' : 'Locked'}
            </span>
          }
        />
      ),
    },
    {
      title: t('userMgmt.columnEvents'),
      dataIndex: 'scheduleCount',
      key: 'scheduleCount',
      align: 'center' as const,
      render: (count?: number) => (
        <Tag color={count && count > 0 ? 'green' : 'default'} style={{ borderRadius: '4px', fontWeight: 600 }}>
          {count || 0}
        </Tag>
      ),
    },
    {
      title: t('userMgmt.columnLastLogin'),
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date?: string) => (date ? dayjs(date).format('HH:mm DD/MM/YYYY') : <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>-</span>),
    },
    {
      title: t('userMgmt.columnCreatedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('HH:mm DD/MM/YYYY'),
    },
    {
      title: t('userMgmt.columnAction'),
      key: 'actions',
      render: (_: any, record: UserDetail) => {
        const isSelf = record._id === currentUserId;
        return (
          <Space size="middle">
            <Popconfirm
              title={`Bạn có chắc muốn ${record.role === 'admin' ? 'hạ quyền' : 'cấp quyền Admin'} cho người dùng này?`}
              onConfirm={() => handleChangeRole(record)}
              disabled={isSelf}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Tooltip title={isSelf ? 'Không thể tự thay đổi vai trò của bản thân' : ''}>
                <Button
                  size="small"
                  type="text"
                  icon={<UserSwitchOutlined />}
                  style={{
                    color: isSelf ? '#bfbfbf' : '#1890ff',
                    fontWeight: 500,
                  }}
                  disabled={isSelf}
                >
                  {record.role === 'admin' ? 'Hạ quyền User' : 'Cấp quyền Admin'}
                </Button>
              </Tooltip>
            </Popconfirm>

            <Popconfirm
              title={`Bạn có chắc chắn muốn ${record.isActive ? 'Khóa' : 'Mở khóa'} tài khoản này không?`}
              onConfirm={() => handleToggleStatus(record)}
              disabled={isSelf}
              okText="Đồng ý"
              cancelText="Hủy"
              okButtonProps={{ danger: record.isActive }}
            >
              <Tooltip title={isSelf ? 'Không thể tự khóa tài khoản của bản thân' : ''}>
                <Button
                  size="small"
                  danger={record.isActive}
                  type="text"
                  icon={record.isActive ? <LockOutlined /> : <UnlockOutlined />}
                  style={{
                    color: isSelf ? '#bfbfbf' : record.isActive ? '#f5222d' : '#52c41a',
                    fontWeight: 500,
                  }}
                  disabled={isSelf}
                >
                  {record.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
                </Button>
              </Tooltip>
            </Popconfirm>

            <Popconfirm
              title={`Bạn có chắc muốn đặt lại mật khẩu cho ${record.username} thành mặc định ("user123")?`}
              onConfirm={() => handleResetPassword(record)}
              disabled={isSelf}
              okText="Đồng ý"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title={isSelf ? 'Không thể tự reset mật khẩu của bản thân' : ''}>
                <Button
                  size="small"
                  type="text"
                  icon={<KeyOutlined />}
                  style={{
                    color: isSelf ? '#bfbfbf' : '#faad14',
                    fontWeight: 500,
                  }}
                  disabled={isSelf}
                >
                  Reset mật khẩu
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserOutlined style={{ color: '#1890ff' }} />
          Quản lý tài khoản người dùng
        </h2>
        <p style={{ margin: 0, color: '#8c8c8c' }}>
          Xem danh sách tài khoản, thay đổi quyền quản trị và thực hiện khóa/mở khóa tài khoản thành viên.
        </p>
      </div>

      <Card
        variant="borderless"
        style={{
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="Tìm kiếm theo tên người dùng hoặc email..."
            value={search}
            onChange={handleSearchChange}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ maxWidth: '360px', borderRadius: '6px' }}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p) => setPage(p),
            showTotal: (totalCount) => `Tổng cộng ${totalCount} người dùng`,
          }}
        />
      </Card>
    </div>
  );
};

export default UserManagement;
