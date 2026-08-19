import React from 'react';
import { Modal, Radio, Space, Button } from 'antd';
import { useTranslation } from 'react-i18next';

export interface RecurrenceChoiceModalProps {
  visible: boolean;
  actionType: 'edit' | 'delete';
  editMode: 'all' | 'current' | 'future';
  onModeChange: (mode: 'all' | 'current' | 'future') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RecurrenceChoiceModal: React.FC<RecurrenceChoiceModalProps> = ({
  visible,
  actionType: _actionType,
  editMode,
  onModeChange,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('calendar.recurrenceActionTitle')}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <p style={{ marginBottom: '20px' }}>
        {t('calendar.recurrenceActionSub')}
      </p>
      
      {/* 
        The original code used 3 separate Buttons, but the prompt requested Radio.Group.
        Implementing it here based on the requested props.
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Radio.Group 
          value={editMode} 
          onChange={(e) => onModeChange(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value="current">{t('calendar.recurrenceActionCurrent')}</Radio>
            <Radio value="future">{t('calendar.recurrenceActionFuture')}</Radio>
            <Radio value="all">{t('calendar.recurrenceActionAll')}</Radio>
          </Space>
        </Radio.Group>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" onClick={onConfirm}>
            {t('common.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
