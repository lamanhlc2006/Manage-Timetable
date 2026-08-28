import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, InputNumber, Switch, Table, Space, message, Typography, Popconfirm, Tooltip } from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  DeleteOutlined,
  LockOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { createShareLink, getMyShareLinks, deleteShareLink, ShareLinkItem } from '../services/shareService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);

interface ShareCalendarModalProps {
  open: boolean;
  onClose: () => void;
}

const ShareCalendarModal: React.FC<ShareCalendarModalProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [label, setLabel] = useState('');
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await getMyShareLinks();
      setLinks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadLinks();
  }, [open]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createShareLink({
        label: label || undefined,
        expiresIn: expiresIn || undefined,
        password: usePassword && password ? password : undefined,
      });
      message.success(t('share.created', 'Đã tạo link chia sẻ!'));
      setLabel('');
      setExpiresIn(null);
      setUsePassword(false);
      setPassword('');
      loadLinks();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteShareLink(id);
      message.success(t('share.deleted', 'Đã xoá link'));
      setLinks((prev) => prev.filter((l) => l._id !== id));
    } catch (err: any) {
      message.error(err.response?.data?.message || t('common.error'));
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    message.success(t('share.copied', 'Đã sao chép link!'));
  };

  const columns = [
    {
      title: t('share.label', 'Tên'),
      dataIndex: 'label',
      key: 'label',
      render: (v: string) => v || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: t('share.expires', 'Hết hạn'),
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (v: string) =>
        v ? (
          <Tooltip title={dayjs(v).format('DD/MM/YYYY HH:mm')}>
            <ClockCircleOutlined /> {dayjs(v).locale('vi').fromNow()}
          </Tooltip>
        ) : (
          <Typography.Text type="secondary">Không giới hạn</Typography.Text>
        ),
    },
    {
      title: <EyeOutlined />,
      dataIndex: 'accessCount',
      key: 'accessCount',
      width: 60,
      render: (v: number) => v || 0,
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      render: (_: any, record: ShareLinkItem) => (
        <Space size="small">
          <Tooltip title="Copy link">
            <Button size="small" icon={<CopyOutlined />} onClick={() => copyLink(record.token)} />
          </Tooltip>
          <Popconfirm title={t('share.deleteConfirm', 'Xoá link này?')} onConfirm={() => handleDelete(record._id)} okText={t('common.delete', 'Xoá')} cancelText={t('common.cancel', 'Huỷ')}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={<><ShareAltOutlined /> {t('share.title', 'Chia sẻ lịch')}</>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {/* Create form */}
      <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
          <LinkOutlined /> {t('share.createNew', 'Tạo link mới')}
        </Typography.Text>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input
            placeholder={t('share.labelPlaceholder', 'Tên link (tuỳ chọn)')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ borderRadius: 6 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined />
            <Typography.Text style={{ fontSize: 13 }}>{t('share.expiresInLabel', 'Hết hạn sau (giờ)')}</Typography.Text>
            <InputNumber
              min={1}
              max={8760}
              value={expiresIn}
              onChange={(v) => setExpiresIn(v)}
              placeholder="∞"
              style={{ width: 100, borderRadius: 6 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockOutlined />
            <Typography.Text style={{ fontSize: 13 }}>{t('share.usePassword', 'Bảo vệ bằng mật khẩu')}</Typography.Text>
            <Switch size="small" checked={usePassword} onChange={setUsePassword} />
          </div>

          {usePassword && (
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('share.passwordPlaceholder', 'Nhập mật khẩu')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ borderRadius: 6 }}
            />
          )}

          <Button
            type="primary"
            icon={<ShareAltOutlined />}
            loading={creating}
            onClick={handleCreate}
            style={{ alignSelf: 'flex-start', borderRadius: 6 }}
          >
            {t('share.createButton', 'Tạo link chia sẻ')}
          </Button>
        </div>
      </div>

      {/* Existing links */}
      <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
        {t('share.myLinks', 'Link đã tạo')} ({links.length})
      </Typography.Text>

      <Table
        dataSource={links}
        columns={columns}
        rowKey="_id"
        size="small"
        loading={loading}
        pagination={false}
        locale={{ emptyText: t('share.noLinks', 'Chưa có link chia sẻ nào') }}
      />
    </Modal>
  );
};

export default ShareCalendarModal;
