import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Button, Table, Space, Tag, Modal, Form, Input, ColorPicker,
  Select, message, Popconfirm, Empty, Tooltip, Badge,
} from 'antd';
import {
  TeamOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  UserAddOutlined, CrownOutlined, EyeOutlined, FormOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {
  getMyGroups, createGroup, updateGroup, deleteGroup,
  addGroupMember, changeGroupMemberRole, removeGroupMember,
  GroupItem, GroupMember,
} from '../services/groupService';

const { Title, Text } = Typography;

export const GroupManagement: React.FC = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [form] = Form.useForm();
  const [formLoading, setFormLoading] = useState(false);

  // Member management
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(null);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('viewer');
  const [addingMember, setAddingMember] = useState(false);

  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}')._id; } catch { return ''; }
  })();

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyGroups();
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleCreateOrUpdate = async (values: any) => {
    setFormLoading(true);
    try {
      const color = typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#1890ff';
      if (editingGroup) {
        await updateGroup(editingGroup._id, { ...values, color });
        message.success(t('group.updated', 'Đã cập nhật nhóm'));
      } else {
        await createGroup({ ...values, color });
        message.success(t('group.created', 'Đã tạo nhóm'));
      }
      setModalOpen(false);
      setEditingGroup(null);
      form.resetFields();
      loadGroups();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGroup(id);
      message.success(t('group.deleted', 'Đã xoá nhóm'));
      loadGroups();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !newMemberUsername.trim()) return;
    setAddingMember(true);
    try {
      const updated = await addGroupMember(selectedGroup._id, newMemberUsername.trim(), newMemberRole);
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      setNewMemberUsername('');
      message.success(t('group.memberAdded', 'Đã thêm thành viên'));
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    } finally {
      setAddingMember(false);
    }
  };

  const handleChangeRole = async (groupId: string, userId: string, role: string) => {
    try {
      const updated = await changeGroupMemberRole(groupId, userId, role);
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      message.success(t('group.roleChanged', 'Đã đổi quyền'));
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      const updated = await removeGroupMember(groupId, userId);
      setSelectedGroup(updated);
      setGroups((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      message.success(t('group.memberRemoved', 'Đã xoá thành viên'));
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    }
  };

  const isOwner = (group: GroupItem) => {
    const ownerId = typeof group.owner === 'string' ? group.owner : group.owner._id;
    return ownerId === currentUserId;
  };

  const columns = [
    {
      title: t('group.name', 'Tên nhóm'),
      key: 'name',
      render: (_: any, g: GroupItem) => (
        <Space>
          <Badge color={g.color} />
          <Text strong>{g.name}</Text>
          {isOwner(g) && <Tag icon={<CrownOutlined />} color="gold" style={{ fontSize: 11 }}>Owner</Tag>}
        </Space>
      ),
    },
    {
      title: t('group.members', 'Thành viên'),
      key: 'members',
      render: (_: any, g: GroupItem) => (
        <Space>
          <TeamOutlined />
          <Text>{(g.members?.length || 0) + 1}</Text>
        </Space>
      ),
    },
    {
      title: t('group.description', 'Mô tả'),
      dataIndex: 'description',
      key: 'description',
      render: (v: string) => v || <Text type="secondary">—</Text>,
      responsive: ['md'] as any,
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_: any, g: GroupItem) => (
        <Space size="small">
          <Tooltip title={t('group.manageMembers', 'Quản lý thành viên')}>
            <Button size="small" icon={<TeamOutlined />} onClick={() => { setSelectedGroup(g); setMemberModalOpen(true); }} />
          </Tooltip>
          {isOwner(g) && (
            <>
              <Tooltip title={t('common.edit', 'Sửa')}>
                <Button size="small" icon={<EditOutlined />} onClick={() => {
                  setEditingGroup(g);
                  form.setFieldsValue({ name: g.name, description: g.description, color: g.color });
                  setModalOpen(true);
                }} />
              </Tooltip>
              <Popconfirm title={t('group.deleteConfirm', 'Xoá nhóm này?')} onConfirm={() => handleDelete(g._id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const memberColumns = [
    {
      title: t('group.username', 'Tên người dùng'),
      key: 'username',
      render: (_: any, m: GroupMember) => {
        const u = typeof m.user === 'string' ? { username: m.user, email: '' } : m.user;
        return <Text>{u.username}</Text>;
      },
    },
    {
      title: t('group.role', 'Quyền'),
      key: 'role',
      render: (_: any, m: GroupMember) => {
        const userId = typeof m.user === 'string' ? m.user : m.user._id;
        const canEdit = selectedGroup && isOwner(selectedGroup);
        if (canEdit) {
          return (
            <Select
              size="small"
              value={m.role}
              style={{ width: 100 }}
              onChange={(role) => handleChangeRole(selectedGroup!._id, userId, role)}
              options={[
                { value: 'viewer', label: <><EyeOutlined /> Viewer</> },
                { value: 'editor', label: <><FormOutlined /> Editor</> },
              ]}
            />
          );
        }
        return <Tag color={m.role === 'editor' ? 'blue' : 'default'}>{m.role === 'editor' ? 'Editor' : 'Viewer'}</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, m: GroupMember) => {
        const userId = typeof m.user === 'string' ? m.user : m.user._id;
        const canRemove = selectedGroup && (isOwner(selectedGroup) || userId === currentUserId);
        return canRemove ? (
          <Popconfirm title={t('group.removeMemberConfirm', 'Xoá thành viên?')} onConfirm={() => handleRemoveMember(selectedGroup!._id, userId)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ) : null;
      },
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <TeamOutlined /> {t('group.title', 'Nhóm cộng tác')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 6 }} onClick={() => {
          setEditingGroup(null);
          form.resetFields();
          setModalOpen(true);
        }}>
          {t('group.create', 'Tạo nhóm')}
        </Button>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Table
          dataSource={groups}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: <Empty description={t('group.empty', 'Chưa có nhóm nào')} /> }}
        />
      </Card>

      {/* Create / Edit Group Modal */}
      <Modal
        title={editingGroup ? t('group.edit', 'Sửa nhóm') : t('group.create', 'Tạo nhóm')}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingGroup(null); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item name="name" label={t('group.name', 'Tên nhóm')} rules={[{ required: true, message: t('group.nameRequired', 'Vui lòng nhập tên nhóm') }]}>
            <Input placeholder={t('group.namePlaceholder', 'VD: Nhóm học tập')} />
          </Form.Item>
          <Form.Item name="description" label={t('group.description', 'Mô tả')}>
            <Input.TextArea rows={2} placeholder={t('group.descPlaceholder', 'Mô tả ngắn về nhóm (tuỳ chọn)')} />
          </Form.Item>
          <Form.Item name="color" label={t('settings.color', 'Màu')}>
            <ColorPicker showText />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setModalOpen(false); setEditingGroup(null); }}>{t('common.cancel', 'Huỷ')}</Button>
              <Button type="primary" htmlType="submit" loading={formLoading}>{t('common.save', 'Lưu')}</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Member Management Modal */}
      <Modal
        title={<><TeamOutlined /> {selectedGroup?.name} — {t('group.members', 'Thành viên')}</>}
        open={memberModalOpen}
        onCancel={() => { setMemberModalOpen(false); setSelectedGroup(null); }}
        footer={null}
        width={520}
      >
        {selectedGroup && (
          <>
            {/* Owner */}
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fffbe6', borderRadius: 8 }}>
              <CrownOutlined style={{ color: '#faad14', marginRight: 8 }} />
              <Text strong>{typeof selectedGroup.owner === 'string' ? selectedGroup.owner : selectedGroup.owner.username}</Text>
              <Tag color="gold" style={{ marginLeft: 8 }}>Owner</Tag>
            </div>

            {/* Members table */}
            <Table
              dataSource={selectedGroup.members}
              columns={memberColumns}
              rowKey={(m) => typeof m.user === 'string' ? m.user : m.user._id}
              size="small"
              pagination={false}
              locale={{ emptyText: t('group.noMembers', 'Chưa có thành viên') }}
            />

            {/* Add member form (owner only) */}
            {isOwner(selectedGroup) && (
              <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  <UserAddOutlined /> {t('group.addMember', 'Thêm thành viên')}
                </Text>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder={t('group.usernamePlaceholder', 'Nhập username')}
                    value={newMemberUsername}
                    onChange={(e) => setNewMemberUsername(e.target.value)}
                    onPressEnter={handleAddMember}
                    style={{ flex: 1 }}
                  />
                  <Select value={newMemberRole} onChange={setNewMemberRole} style={{ width: 110 }}
                    options={[
                      { value: 'viewer', label: 'Viewer' },
                      { value: 'editor', label: 'Editor' },
                    ]}
                  />
                  <Button type="primary" icon={<UserAddOutlined />} loading={addingMember} onClick={handleAddMember}>
                    {t('group.add', 'Thêm')}
                  </Button>
                </Space.Compact>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default GroupManagement;
