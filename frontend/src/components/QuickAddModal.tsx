import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Space, Button } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

export interface QuickAddModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: { title: string; rangeTime: [dayjs.Dayjs, dayjs.Dayjs] }) => void;
  loading?: boolean;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      const start = dayjs().add(1, 'hour').minute(0).second(0);
      const end = start.clone().add(1, 'hour');
      form.setFieldsValue({
        title: '',
        rangeTime: [start, end],
      });
    } else {
      form.resetFields();
    }
  }, [visible, form]);

  const handleFinish = (values: any) => {
    onSubmit({
      title: values.title,
      rangeTime: values.rangeTime,
    });
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚡</span>
          <span>{t('calendar.quickAddTitle')}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={420}
    >
      <Form
        form={form}
        preserve={false}
        layout="vertical"
        onFinish={handleFinish}
        size="large"
        style={{ marginTop: '16px' }}
      >
        <Form.Item
          name="title"
          label={t('calendar.eventTitle')}
          rules={[{ required: true, message: t('calendar.titleRequired') }]}
        >
          <Input placeholder={t('calendar.quickAddInputPlaceholder')} autoFocus style={{ borderRadius: '6px' }} />
        </Form.Item>

        <Form.Item
          name="rangeTime"
          label={t('calendar.timeRangeLabel')}
          rules={[{ required: true, message: t('calendar.timeRequired') }]}
        >
          <DatePicker.RangePicker
            showTime={{ format: 'HH:mm' }}
            format="HH:mm YYYY-MM-DD"
            style={{ width: '100%', borderRadius: '6px' }}
            placeholder={[t('calendar.start'), t('calendar.end')]}
          />
        </Form.Item>

        <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '20px', background: '#fafafa', padding: '8px 12px', borderRadius: '6px' }}>
          {t('calendar.quickAddHelp', { category: 'Học tập', priority: t('calendar.priorityMedium') })}
        </div>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel} style={{ borderRadius: '6px' }}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={loading} style={{ borderRadius: '6px' }}>{t('calendar.createNew')}</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
