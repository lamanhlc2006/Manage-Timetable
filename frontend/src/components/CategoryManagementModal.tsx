import React, { useState } from 'react';
import { Modal, Input, Space, Button, List, Tag, Popconfirm, ColorPicker, message } from 'antd';
import {
  CategoryItem,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';
import { useTranslation } from 'react-i18next';

interface CategoryManagementModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onCategoryChange: () => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  visible,
  onClose,
  categories,
  onCategoryChange,
}) => {
  const { t } = useTranslation();
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#1890ff');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const handleCancelEdit = () => {
    setEditingCatId(null);
    setNewCatName('');
    setNewCatColor('#1890ff');
    setNewCatIcon('📌');
  };

  const handleEditInitiate = (cat: CategoryItem) => {
    setEditingCatId(cat._id);
    setNewCatName(cat.name);
    setNewCatColor(cat.color);
    setNewCatIcon(cat.icon || '📌');
  };

  const handleSubmit = async () => {
    if (!newCatName.trim()) {
      message.warning('Vui lòng nhập tên danh mục');
      return;
    }
    try {
      if (editingCatId) {
        await updateCategory(editingCatId, { name: newCatName.trim(), color: newCatColor, icon: newCatIcon });
        message.success(t('settings.categoryUpdated') || 'Đã cập nhật danh mục');
      } else {
        await createCategory({ name: newCatName.trim(), color: newCatColor, icon: newCatIcon });
        message.success(t('settings.categoryCreated') || 'Đã thêm danh mục mới');
      }
      handleCancelEdit();
      onCategoryChange();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi lưu danh mục');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success(t('settings.categoryDeleted') || 'Đã xóa danh mục');
      onCategoryChange();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi xóa danh mục');
    }
  };

  return (
    <Modal
      title={t('calendar.manageCategories')}
      open={visible}
      onCancel={() => {
        onClose();
        handleCancelEdit();
      }}
      footer={null}
      destroyOnHidden
    >
      <div style={{ marginBottom: '20px', padding: '12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#595959' }}>
          {editingCatId ? t('settings.editCategory') || 'Chỉnh sửa danh mục' : t('settings.addCategory')}
        </div>
        <Space wrap size="small">
          <Input
            placeholder="Icon (VD: 🚀, 📚)"
            value={newCatIcon}
            onChange={(e) => setNewCatIcon(e.target.value)}
            style={{ width: '70px', textAlign: 'center' }}
          />
          <Input
            placeholder="Tên danh mục..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ width: '150px' }}
          />
          <ColorPicker
            value={newCatColor}
            onChange={(color) => setNewCatColor(color.toHexString())}
          />
          <Button type="primary" onClick={handleSubmit}>
            {editingCatId ? 'Lưu' : 'Thêm'}
          </Button>
          {editingCatId && (
            <Button onClick={handleCancelEdit}>
              Hủy
            </Button>
          )}
        </Space>
      </div>

      <List
        size="small"
        bordered
        dataSource={categories}
        renderItem={(cat) => (
          <List.Item
            actions={
              !cat.isSystem
                ? [
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleEditInitiate(cat)}
                      style={{ padding: 0 }}
                    >
                      Sửa
                    </Button>,
                    <Popconfirm
                      title="Xóa danh mục này?"
                      description="Các sự kiện dùng danh mục này sẽ giữ nguyên."
                      onConfirm={() => handleDelete(cat._id)}
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="link"
                        danger
                        size="small"
                        style={{ padding: 0 }}
                      >
                        Xóa
                      </Button>
                    </Popconfirm>,
                  ]
                : [<Tag color="default">Hệ thống</Tag>]
            }
          >
            <Space>
              <span style={{ fontSize: '18px' }}>{cat.icon || '📌'}</span>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: cat.color,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: cat.isSystem ? 500 : 'normal' }}>{cat.name}</span>
            </Space>
          </List.Item>
        )}
      />
    </Modal>
  );
};
