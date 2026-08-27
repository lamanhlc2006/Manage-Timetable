import React from 'react';
import { Modal, Tag, Button } from 'antd';
import { useTranslation } from 'react-i18next';

export interface ShortcutsHelpModalProps {
  visible: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  visible,
  onClose,
  isAdmin = false,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⌨️</span>
          <span>{t('calendar.shortcutsHelpTitle')}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={460}
    >
      <div style={{ marginTop: '16px' }}>
        <p style={{ color: '#8c8c8c', marginBottom: '20px' }}>
          {t('calendar.shortcutsDesc')}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {isAdmin && (
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="blue"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>N</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutQuickAdd')}</td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px', width: '80px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>T</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutToday')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>D</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutDayView')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>W</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutWeekView')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>M</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutMonthView')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>/</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutFocusSearch')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Esc</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutCloseModal')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="warning"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>?</kbd> hoặc <kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Shift + /</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutOpenHelp')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="green"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>E</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutEdit', 'Chỉnh sửa sự kiện (khi đang xem)')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="red"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Delete</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutDelete', 'Xóa sự kiện (khi đang xem)')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Enter</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutDetail', 'Xem chi tiết sự kiện')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>← →</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutPrevNext', 'Tuần/Tháng trước/sau')}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="cyan"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Ctrl+F</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutSearch', 'Tìm kiếm')}</td>
            </tr>
            <tr>
              <td style={{ padding: '12px 8px' }}>
                <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>L</kbd></Tag>
              </td>
              <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutListView', 'Chuyển sang xem danh sách')}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'right', marginTop: '24px' }}>
          <Button type="primary" onClick={onClose} style={{ borderRadius: '6px' }}>{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  );
};
