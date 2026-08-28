import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Space, Badge, InputNumber, Tag, message, Radio, Alert, Switch } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ScheduleEvent } from '../services/scheduleService';
import { DEFAULT_CATEGORY } from '../constants';

const { Option } = Select;

const colorOptions = [
  { label: 'Xanh dương (Mặc định)', value: '#1890ff' },
  { label: 'Xanh đậm', value: '#1d39c4' },
  { label: 'Xanh lá', value: '#52c41a' },
  { label: 'Xanh lá nhạt', value: '#a0d911' },
  { label: 'Cyan', value: '#13c2c2' },
  { label: 'Cam', value: '#fa8c16' },
  { label: 'Vàng', value: '#fadb14' },
  { label: 'Đỏ', value: '#f5222d' },
  { label: 'Đỏ đậm', value: '#cf1322' },
  { label: 'Hồng', value: '#eb2f96' },
  { label: 'Hồng nhạt', value: '#ff85c0' },
  { label: 'Tím', value: '#722ed1' },
  { label: 'Tím nhạt', value: '#b37feb' },
  { label: 'Nâu', value: '#8B4513' },
  { label: 'Xám', value: '#8c8c8c' },
  { label: 'Đen', value: '#262626' },
];

interface EventFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  event: ScheduleEvent | null;
  categoriesList: { _id?: string; name: string; color: string; icon?: string }[];
  tagsList?: { _id: string; name: string; color: string }[];
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
  tagsList = [],
  onClose,
  onSubmit,
  recurrenceEditMode: _recurrenceEditMode = 'all',
  instanceDate: _instanceDate,
  onManageCategories,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [isCustomReminder, setIsCustomReminder] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'count' | 'endDate'>('never');

  // Tag sanitization: strip special chars, auto-prefix '#'
  const sanitizeTag = (tag: string): string | null => {
    // Remove special characters, keep letters (including Vietnamese), digits, underscore, hyphen
    let cleaned = tag.replace(/[.,\/?<>!@$%^&*()=+\[\]{}|\\;:'"~`]/g, '').trim();
    if (!cleaned) return null;
    // Auto-prefix '#' if not already present
    if (!cleaned.startsWith('#')) {
      cleaned = '#' + cleaned;
    }
    return cleaned;
  };

  const PRESET_REMINDERS = [
    { value: null, label: t('calendar.reminderNone', 'Không nhắc nhở') },
    { value: 5, label: t('calendar.reminder5mOption', '5 phút trước') },
    { value: 15, label: t('calendar.reminder15mOption', '15 phút trước') },
    { value: 30, label: t('calendar.reminder30mOption', '30 phút trước') },
    { value: 60, label: t('calendar.reminder1hOption', '1 giờ trước') },
    { value: 1440, label: t('calendar.reminder1dOption', '1 ngày trước') },
    { value: -1, label: t('calendar.reminderCustom', 'Tuỳ chỉnh...') },
  ];

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && event) {
        // Detect recurrence end type from existing event
        let endType: 'never' | 'count' | 'endDate' = 'never';
        if (event.recurrence?.count) {
          endType = 'count';
        } else if (event.recurrence?.endDate) {
          endType = 'endDate';
        }
        setRecurrenceEndType(endType);

        form.setFieldsValue({
          title: event.title,
          description: event.description || '',
          color: event.color,
          range: [dayjs(event.startTime), dayjs(event.endTime)],
          category: event.category || DEFAULT_CATEGORY,
          tags: event.tags || [],
          priority: event.priority || 'medium',
          recurrenceType: event.recurrence?.type || 'none',
          recurrenceInterval: event.recurrence?.interval || 1,
          recurrenceDaysOfWeek: event.recurrence?.daysOfWeek || [],
          recurrenceEndDate: event.recurrence?.endDate ? dayjs(event.recurrence.endDate) : null,
          recurrenceCount: event.recurrence?.count || 10,
          recurrenceEndType: endType,
          isAllDay: event.isAllDay || false,
          reminderMinutes: event.reminderMinutes !== undefined ? event.reminderMinutes : null,
        });
        // Detect custom reminder
        const presetValues = [null, 5, 15, 30, 60, 1440];
        const rm = event.reminderMinutes;
        if (rm !== undefined && rm !== null && !presetValues.includes(rm)) {
          setIsCustomReminder(true);
          setCustomMinutes(rm);
          form.setFieldValue('reminderMinutes', -1);
        } else {
          setIsCustomReminder(false);
        }
      } else {
        form.resetFields();
        setIsCustomReminder(false);
        setRecurrenceEndType('never');
        if (event) {
          form.setFieldsValue({
            title: event.title || '',
            description: event.description || '',
            color: event.color || '#1890ff',
            range: [
              event.startTime ? dayjs(event.startTime) : dayjs().hour(9).minute(0).second(0),
              event.endTime ? dayjs(event.endTime) : dayjs().hour(10).minute(0).second(0),
            ],
            category: event.category || categoriesList[0]?.name || DEFAULT_CATEGORY,
            tags: event.tags || [],
            priority: event.priority || 'medium',
            recurrenceType: event.recurrence?.type || 'none',
            recurrenceInterval: event.recurrence?.interval || 1,
            recurrenceDaysOfWeek: event.recurrence?.daysOfWeek || [],
            recurrenceEndDate: event.recurrence?.endDate ? dayjs(event.recurrence.endDate) : null,
            recurrenceCount: 10,
            recurrenceEndType: 'never',
            isAllDay: false,
            reminderMinutes: event.reminderMinutes !== undefined ? event.reminderMinutes : 15,
          });
        } else {
          form.setFieldsValue({
            title: '',
            description: '',
            color: '#1890ff',
            range: [dayjs().hour(9).minute(0).second(0), dayjs().hour(10).minute(0).second(0)],
            category: categoriesList[0]?.name || DEFAULT_CATEGORY,
            tags: [],
            priority: 'medium',
            recurrenceType: 'none',
            recurrenceInterval: 1,
            recurrenceDaysOfWeek: [],
            recurrenceEndDate: null,
            recurrenceCount: 10,
            recurrenceEndType: 'never',
            isAllDay: false,
            reminderMinutes: 15,
          });
        }
      }
    }
  }, [visible, mode, event, form, categoriesList]);

  // Conflict detection state
  const [conflictInfo, setConflictInfo] = useState<{
    conflicts: Array<{ _id: string; title: string; startTime: string; endTime: string }>;
    suggestedSlot: { suggestedStart: string; suggestedEnd: string } | null;
  } | null>(null);

  // Clear conflict info when modal closes or opens
  useEffect(() => {
    if (visible) {
      setConflictInfo(null);
    }
  }, [visible]);

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startDayjs, endDayjs] = values.range;

      if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
        message.error(t('calendar.startTimeBeforeEndTime'));
        return;
      }

      // Sanitize tags: strip special chars, auto-prefix '#', remove empty/dupes
      if (values.tags && values.tags.length > 0) {
        const sanitized = values.tags
          .map((tag: string) => sanitizeTag(tag))
          .filter((tag: string | null): tag is string => tag !== null);
        values.tags = [...new Set(sanitized)]; // deduplicate
      }

      // Resolve custom reminder: -1 sentinel → actual minutes
      if (values.reminderMinutes === -1 && isCustomReminder) {
        values.reminderMinutes = customMinutes;
      }

      // Clear conflict info on new submit attempt
      setConflictInfo(null);

      // Pass processed form values to parent handler
      await onSubmit(values, mode);
    } catch (err: any) {
      if (err.errorFields) return; // form validation error, antd handles display
      console.error(err);

      // Handle 409 Conflict — show conflict details and suggested slot
      if (err.response?.status === 409 && err.response?.data?.conflicts) {
        setConflictInfo({
          conflicts: err.response.data.conflicts,
          suggestedSlot: err.response.data.suggestedSlot || null,
        });
        return;
      }

      if (err.response?.data?.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Đã xảy ra lỗi, vui lòng thử lại.');
      }
    }
  };

  const handleApplySuggestedSlot = () => {
    if (conflictInfo?.suggestedSlot) {
      form.setFieldsValue({
        range: [
          dayjs(conflictInfo.suggestedSlot.suggestedStart),
          dayjs(conflictInfo.suggestedSlot.suggestedEnd),
        ],
      });
      setConflictInfo(null);
      message.success(t('calendar.suggestedSlotApplied', 'Đã áp dụng khung giờ gợi ý'));
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
        {(() => {
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            if (u.bufferMinutes && u.bufferMinutes > 0) {
              return (
                <div style={{ marginBottom: 12 }}>
                  <Tag color="orange" style={{ borderRadius: '4px' }}>
                    ⏱ {t('calendar.bufferApplied', 'Buffer {{minutes}} phút được áp dụng', { minutes: u.bufferMinutes })}
                  </Tag>
                </div>
              );
            }
          } catch { /* ignore */ }
          return null;
        })()}
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
            onChange={(values: string[]) => {
              const sanitized = values
                .map((v) => sanitizeTag(v))
                .filter((v): v is string => v !== null);
              const unique = [...new Set(sanitized)];
              if (sanitized.length < values.length) {
                message.warning(t('calendar.tagInvalidChars', 'Thẻ không được chứa ký tự đặc biệt'));
              }
              form.setFieldValue('tags', unique);
            }}
            tagRender={(props) => {
              const { label, closable, onClose } = props;
              return (
                <Tag
                  color="blue"
                  closable={closable}
                  onClose={onClose}
                  style={{ marginRight: 3 }}
                >
                  {label}
                </Tag>
              );
            }}
          >
            {tagsList.map((tag) => (
              <Option key={tag._id} value={tag.name.startsWith('#') ? tag.name : `#${tag.name}`}>
                {tag.name.startsWith('#') ? tag.name : `#${tag.name}`}
              </Option>
            ))}
          </Select>
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
          <Select
            placeholder={t('calendar.selectReminderPlaceholder', 'Chọn thời gian nhắc nhở')}
            onChange={(value) => {
              if (value === -1) {
                setIsCustomReminder(true);
              } else {
                setIsCustomReminder(false);
              }
            }}
          >
            {PRESET_REMINDERS.map((opt) => (
              <Option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {isCustomReminder && (
          <Form.Item label={t('calendar.reminderCustomInput', 'Nhắc trước (phút)')}>
            <InputNumber
              min={1}
              max={1440}
              value={customMinutes}
              onChange={(v) => setCustomMinutes(v || 10)}
              addonAfter={t('calendar.reminderMinutesUnit', 'phút')}
              style={{ width: '100%' }}
              placeholder="1 - 1440"
            />
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              {t('calendar.reminderCustomHint', 'Tối đa 1440 phút (= 1 ngày)')}
            </div>
          </Form.Item>
        )}

        <Form.Item name="isAllDay" label={t('calendar.allDayLabel', 'Cả ngày')} valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.isAllDay !== currentValues.isAllDay}
        >
          {({ getFieldValue }) => {
            const allDay = getFieldValue('isAllDay');
            return (
              <Form.Item
                name="range"
                label={allDay ? t('calendar.dateRangeLabel', 'Khoảng ngày') : t('calendar.timeRangeLabel')}
                rules={[{ required: true, message: t('calendar.timeRequired') }]}
              >
                {allDay ? (
                  <DatePicker.RangePicker
                    format="YYYY-MM-DD"
                    style={{ width: '100%' }}
                    placeholder={[t('calendar.startDate', 'Ngày bắt đầu'), t('calendar.endDate', 'Ngày kết thúc')]}
                  />
                ) : (
                  <DatePicker.RangePicker
                    showTime={{ format: 'HH:mm' }}
                    format="HH:mm YYYY-MM-DD"
                    style={{ width: '100%' }}
                    placeholder={[t('calendar.start'), t('calendar.end')]}
                  />
                )}
              </Form.Item>
            );
          }}
        </Form.Item>

        <Form.Item name="color" label={t('calendar.colorLabel')}>
          <Select placeholder={t('calendar.selectColorPlaceholder')}>
            {colorOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                <Space>
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      backgroundColor: opt.value,
                      display: 'inline-block',
                      border: '1px solid rgba(0,0,0,0.1)',
                      verticalAlign: 'middle',
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
              const unitKey =
                type === 'daily' ? 'calendar.repeatUnitDay'
                : type === 'weekly' ? 'calendar.repeatUnitWeek'
                : type === 'monthly' ? 'calendar.repeatUnitMonth'
                : 'calendar.repeatUnitInterval';

              return (
                <Space
                  direction="vertical"
                  style={{
                    width: 'calc(100% - 30px)',
                    background: '#fafafa',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid #f0f0f0',
                  }}
                >
                  <Form.Item name="recurrenceInterval" label={t('calendar.recurrenceIntervalLabel')} initialValue={1} style={{ marginBottom: '12px' }}>
                    <Select>
                      <Option value={1}>{t(unitKey, { count: 1 })}</Option>
                      <Option value={2}>{t(unitKey, { count: 2 })}</Option>
                      <Option value={3}>{t(unitKey, { count: 3 })}</Option>
                      <Option value={4}>{t(unitKey, { count: 4 })}</Option>
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

                  <Form.Item name="recurrenceEndType" label={t('calendar.recurrenceEndCondition', 'Điều kiện kết thúc')} style={{ marginBottom: '12px' }}>
                    <Radio.Group
                      onChange={(e) => setRecurrenceEndType(e.target.value)}
                      value={recurrenceEndType}
                    >
                      <Space direction="vertical">
                        <Radio value="never">{t('calendar.recurrenceEndNever', 'Lặp mãi mãi')}</Radio>
                        <Radio value="count">
                          <Space>
                            {t('calendar.recurrenceEndAfter', 'Sau')}
                            {recurrenceEndType === 'count' && (
                              <Form.Item name="recurrenceCount" noStyle initialValue={10}>
                                <InputNumber min={1} max={999} style={{ width: 80 }} />
                              </Form.Item>
                            )}
                            {t('calendar.recurrenceEndTimes', 'lần')}
                          </Space>
                        </Radio>
                        <Radio value="endDate">
                          <Space>
                            {t('calendar.recurrenceEndUntil', 'Đến ngày')}
                            {recurrenceEndType === 'endDate' && (
                              <Form.Item name="recurrenceEndDate" noStyle>
                                <DatePicker format="YYYY-MM-DD" placeholder={t('calendar.selectDate', 'Chọn ngày')} />
                              </Form.Item>
                            )}
                          </Space>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                </Space>
              );
            }
            return null;
          }}
        </Form.Item>

        {/* Conflict Warning */}
        {conflictInfo && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={t('calendar.conflictDetected', '⚠️ Phát hiện trùng lịch!')}
            description={
              <div>
                <div style={{ marginBottom: 8 }}>
                  {conflictInfo.conflicts.slice(0, 3).map((c) => (
                    <div key={c._id} style={{ fontSize: 13 }}>
                      • <strong>{c.title}</strong>{' '}
                      ({dayjs(c.startTime).format('HH:mm')} – {dayjs(c.endTime).format('HH:mm DD/MM')})
                    </div>
                  ))}
                  {conflictInfo.conflicts.length > 3 && (
                    <div style={{ fontSize: 13, color: '#999' }}>
                      ...{t('calendar.andMore', 'và {{count}} sự kiện khác', { count: conflictInfo.conflicts.length - 3 })}
                    </div>
                  )}
                </div>
                {conflictInfo.suggestedSlot && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleApplySuggestedSlot}
                    style={{ marginTop: 4 }}
                  >
                    📅 {t('calendar.moveToSuggested', 'Dời sang')}{' '}
                    {dayjs(conflictInfo.suggestedSlot.suggestedStart).format('HH:mm')} –{' '}
                    {dayjs(conflictInfo.suggestedSlot.suggestedEnd).format('HH:mm DD/MM')}
                  </Button>
                )}
              </div>
            }
          />
        )}

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
