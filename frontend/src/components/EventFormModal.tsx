import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Space, Badge, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ScheduleEvent } from '../services/scheduleService';

const { Option } = Select;

const colorOptions = [
  { label: 'Blue (Mặc định)', value: '#1890ff' },
  { label: 'Green (Học tập)', value: '#52c41a' },
  { label: 'Orange (Họp hành)', value: '#fa8c16' },
  { label: 'Red (Quan trọng)', value: '#f5222d' },
  { label: 'Purple (Cá nhân)', value: '#722ed1' },
  { label: 'Cyan (Dự án)', value: '#13c2c2' },
];

interface EventFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  event: ScheduleEvent | null;
  categoriesList: { _id?: string; name: string; color: string; icon?: string }[];
  onClose: () => void;
  onSubmit: (values: any, mode: 'create' | 'edit') => Promise<void>;
  recurrenceEditMode?: 'all' | 'current' | 'future';
  instanceDate?: string;
  onManageCategories?: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  visible,
  mode,
  event,
  categoriesList,
  onClose,
  onSubmit,
  recurrenceEditMode = 'all',
  instanceDate: _instanceDate,
  onManageCategories,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && event) {
        form.setFieldsValue({
          title: event.title,
          description: event.description || '',
          color: event.color,
          range: [dayjs(event.startTime), dayjs(event.endTime)],
          category: event.category || 'Học tập',
          tags: event.tags || [],
          priority: event.priority || 'medium',
          recurrenceType: event.recurrence?.type || 'none',
          recurrenceInterval: event.recurrence?.interval || 1,
          recurrenceDaysOfWeek: event.recurrence?.daysOfWeek || [],
          recurrenceEndDate: event.recurrence?.endDate ? dayjs(event.recurrence.endDate) : null,
          reminderMinutes: event.reminderMinutes !== undefined ? event.reminderMinutes : null,
        });
      } else {
        form.resetFields();
        if (event) {
          form.setFieldsValue({
            title: event.title || '',
            description: event.description || '',
            color: event.color || '#1890ff',
            range: [
              event.startTime ? dayjs(event.startTime) : dayjs().hour(9).minute(0).second(0),
              event.endTime ? dayjs(event.endTime) : dayjs().hour(10).minute(0).second(0),
            ],
            category: event.category || categoriesList[0]?.name || 'Học tập',
            tags: event.tags || [],
            priority: event.priority || 'medium',
            recurrenceType: event.recurrence?.type || 'none',
            recurrenceInterval: event.recurrence?.interval || 1,
            recurrenceDaysOfWeek: event.recurrence?.daysOfWeek || [],
            recurrenceEndDate: event.recurrence?.endDate ? dayjs(event.recurrence.endDate) : null,
            reminderMinutes: event.reminderMinutes !== undefined ? event.reminderMinutes : 15,
          });
        } else {
          form.setFieldsValue({
            title: '',
            description: '',
            color: '#1890ff',
            range: [dayjs().hour(9).minute(0).second(0), dayjs().hour(10).minute(0).second(0)],
            category: categoriesList[0]?.name || 'Học tập',
            tags: [],
            priority: 'medium',
            recurrenceType: 'none',
            recurrenceInterval: 1,
            recurrenceDaysOfWeek: [],
            recurrenceEndDate: null,
            reminderMinutes: 15,
          });
        }
      }
    }
  }, [visible, mode, event, form, categoriesList]);

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startDayjs, endDayjs] = values.range;

      if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
        message.error(t('calendar.startTimeBeforeEndTime'));
        return;
      }

      const recurrenceType = values.recurrenceType;
      const recurrence =
        recurrenceType && recurrenceType !== 'none'
          ? {
              type: recurrenceType,
              interval: values.recurrenceInterval || 1,
              daysOfWeek: (recurrenceType === 'weekly' || recurrenceType === 'custom') ? values.recurrenceDaysOfWeek : undefined,
              endDate: values.recurrenceEndDate ? values.recurrenceEndDate.toISOString() : undefined,
            }
          : undefined;

      const inputData = {
        title: values.title.trim(),
        description: values.description ? values.description.trim() : '',
        startTime: startDayjs.toISOString(),
        endTime: endDayjs.toISOString(),
        color: values.color,
        category: values.category,
        tags: values.tags,
        priority: values.priority,
        recurrence,
        reminderMinutes: values.reminderMinutes !== undefined ? values.reminderMinutes : null,
      };

      const executeSave = async (forceOption = false) => {
        const payload: any = {
          ...inputData,
          force: forceOption,
        };
        
        if (mode === 'edit' && event) {
          payload.recurrenceEditMode = recurrenceEditMode;
          payload.instanceDate = (recurrenceEditMode === 'current' || recurrenceEditMode === 'future') ? event.startTime : undefined;
        }

        await onSubmit(payload, mode);
        message.success(
          mode === 'create'
            ? forceOption ? t('calendar.createSuccessForce') : t('calendar.createSuccess')
            : forceOption ? t('calendar.updateSuccessForce') : t('calendar.updateSuccess')
        );
        onClose();
      };

      try {
        await executeSave(false);
      } catch (err: any) {
        if (err.response && err.response.status === 409 && err.response.data && err.response.data.conflicts) {
          Modal.confirm({
            title: t('calendar.conflictWarningTitle'),
            content: (
              <div>
                <p>{t('calendar.conflictWarningSub')}</p>
                <ul style={{ paddingLeft: '16px', listStyleType: 'disc', maxHeight: '180px', overflowY: 'auto' }}>
                  {err.response.data.conflicts.map((conflict: any) => (
                    <li key={conflict._id} style={{ marginBottom: '8px' }}>
                      <strong style={{ color: conflict.color }}>{conflict.title}</strong>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {dayjs(conflict.startTime).format('HH:mm DD/MM/YYYY')} - {dayjs(conflict.endTime).format('HH:mm DD/MM/YYYY')}
                      </div>
                    </li>
                  ))}
                </ul>
                <p style={{ marginTop: '12px', fontWeight: 500, color: '#ff4d4f' }}>
                  {t('calendar.conflictWarningConfirm')}
                </p>
              </div>
            ),
            okText: t('calendar.forceSave'),
            okType: 'danger',
            cancelText: t('common.cancel'),
            onOk: async () => {
              await executeSave(true);
            },
          });
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      if (err.errorFields) return;
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Đã xảy ra lỗi, vui lòng thử lại.');
      }
    }
  };

  return (
    <Modal
      title={
        mode === 'create'
          ? t('calendar.createEventTitle')
          : t('calendar.editEventTitle')
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={560}
    >
      <Form form={form} preserve={false} layout="vertical" onFinish={handleFormSubmit}>
        <Form.Item
          name="title"
          label={t('calendar.eventTitle')}
          rules={[{ required: true, message: t('calendar.titleRequired') }]}
        >
          <Input placeholder={t('calendar.eventTitlePlaceholder')} />
        </Form.Item>

        <Form.Item name="description" label={t('calendar.notes')}>
          <Input.TextArea rows={3} placeholder={t('calendar.notesPlaceholder')} />
        </Form.Item>

        <Form.Item
          name="category"
          label={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span>{t('calendar.category')}</span>
              {onManageCategories && (
                <Button
                  type="link"
                  size="small"
                  onClick={onManageCategories}
                  style={{ padding: 0 }}
                >
                  {t('calendar.manageCategoriesBtn')}
                </Button>
              )}
            </div>
          }
          rules={[{ required: true, message: t('calendar.categoryRequired') }]}
        >
          <Select placeholder={t('calendar.selectCategoryPlaceholder')}>
            {categoriesList.map((cat) => (
              <Option key={cat._id || cat.name} value={cat.name}>
                <Space>
                  <span>{cat.icon || '📌'}</span>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: cat.color,
                      display: 'inline-block',
                    }}
                  />
                  {cat.name}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="tags" label={t('calendar.tags')}>
          <Select
            mode="tags"
            placeholder={t('calendar.tagsPlaceholder')}
            style={{ width: '100%' }}
            tokenSeparators={[',', ' ']}
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label={t('calendar.priority')}
          rules={[{ required: true, message: t('calendar.priorityRequired') }]}
        >
          <Select placeholder={t('calendar.selectPriorityPlaceholder')}>
            <Option value="low">
              <Badge status="default" text={t('calendar.priorityLow')} />
            </Option>
            <Option value="medium">
              <Badge status="warning" text={t('calendar.priorityMedium')} />
            </Option>
            <Option value="high">
              <Badge status="error" text={t('calendar.priorityHigh')} />
            </Option>
          </Select>
        </Form.Item>

        <Form.Item name="reminderMinutes" label={t('calendar.reminderLabel', 'Nhắc nhở trước')}>
          <Select placeholder={t('calendar.selectReminderPlaceholder', 'Chọn thời gian nhắc nhở')}>
            <Option value={null}>{t('calendar.reminderNone', 'Không nhắc nhở')}</Option>
            <Option value={5}>{t('calendar.reminder5mOption', '5 phút trước')}</Option>
            <Option value={15}>{t('calendar.reminder15mOption', '15 phút trước')}</Option>
            <Option value={30}>{t('calendar.reminder30mOption', '30 phút trước')}</Option>
            <Option value={60}>{t('calendar.reminder1hOption', '1 giờ trước')}</Option>
            <Option value={1440}>{t('calendar.reminder1dOption', '1 ngày trước')}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="range"
          label={t('calendar.timeRangeLabel')}
          rules={[{ required: true, message: t('calendar.timeRequired') }]}
        >
          <DatePicker.RangePicker
            showTime={{ format: 'HH:mm' }}
            format="HH:mm YYYY-MM-DD"
            style={{ width: '100%' }}
            placeholder={[t('calendar.start'), t('calendar.end')]}
          />
        </Form.Item>

        <Form.Item name="color" label={t('calendar.colorLabel')}>
          <Select placeholder={t('calendar.selectColorPlaceholder')}>
            {colorOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                <Space>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: opt.value,
                      display: 'inline-block',
                    }}
                  />
                  {opt.label}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="recurrenceType" label={t('calendar.recurrenceTypeLabel')} initialValue="none">
          <Select>
            <Option value="none">{t('calendar.recurrenceNone')}</Option>
            <Option value="daily">{t('calendar.recurrenceDaily')}</Option>
            <Option value="weekly">{t('calendar.recurrenceWeekly')}</Option>
            <Option value="monthly">{t('calendar.recurrenceMonthly')}</Option>
            <Option value="custom">{t('calendar.recurrenceCustom')}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.recurrenceType !== currentValues.recurrenceType}
        >
          {({ getFieldValue }) => {
            const type = getFieldValue('recurrenceType');
            if (type && type !== 'none') {
              return (
                <Space
                  direction="vertical"
                  style={{
                    width: '100%',
                    background: '#fafafa',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <Form.Item name="recurrenceInterval" label={t('calendar.recurrenceIntervalLabel')} initialValue={1} style={{ marginBottom: '12px' }}>
                    <Select>
                      <Option value={1}>{t('calendar.repeatEvery', { count: 1 })}</Option>
                      <Option value={2}>{t('calendar.repeatEvery', { count: 2 })}</Option>
                      <Option value={3}>{t('calendar.repeatEvery', { count: 3 })}</Option>
                      <Option value={4}>{t('calendar.repeatEvery', { count: 4 })}</Option>
                    </Select>
                  </Form.Item>

                  {(type === 'weekly' || type === 'custom') && (
                    <Form.Item name="recurrenceDaysOfWeek" label={t('calendar.recurrenceDaysOfWeekLabel')} style={{ marginBottom: '12px' }}>
                      <Select mode="multiple" placeholder={t('calendar.selectDaysPlaceholder')} style={{ width: '100%' }}>
                        <Option value={1}>{t('calendar.dayMon')}</Option>
                        <Option value={2}>{t('calendar.dayTue')}</Option>
                        <Option value={3}>{t('calendar.dayWed')}</Option>
                        <Option value={4}>{t('calendar.dayThu')}</Option>
                        <Option value={5}>{t('calendar.dayFri')}</Option>
                        <Option value={6}>{t('calendar.daySat')}</Option>
                        <Option value={0}>{t('calendar.daySun')}</Option>
                      </Select>
                    </Form.Item>
                  )}

                  <Form.Item name="recurrenceEndDate" label={t('calendar.recurrenceEndDateLabel')} style={{ marginBottom: 0 }}>
                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} placeholder={t('calendar.forever')} />
                  </Form.Item>
                </Space>
              );
            }
            return null;
          }}
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit">
              {mode === 'create' ? t('calendar.createNew') : t('calendar.saveChanges')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
