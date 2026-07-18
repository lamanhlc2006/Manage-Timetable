import React, { useState, useRef, useEffect } from 'react';
import { Badge, Modal, Form, Input, DatePicker, Select, Button, message, Space, Card } from 'antd';
import dayjs from 'dayjs';
import { ScheduleEvent, CreateScheduleInput } from '../services/scheduleService';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  ClearOutlined,
} from '@ant-design/icons';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

const { Option } = Select;

const CATEGORY_OPTIONS = [
  { label: '📚 Học tập', value: 'Học tập' },
  { label: '💼 Công việc', value: 'Công việc' },
  { label: '👤 Cá nhân', value: 'Cá nhân' },
  { label: '🔍 Khác', value: 'Khác' },
];

interface ScheduleCalendarProps {
  schedules: ScheduleEvent[];
  isAdmin: boolean;
  onCreate: (data: CreateScheduleInput & { force?: boolean }) => Promise<void>;
  onUpdate: (id: string, data: Partial<CreateScheduleInput> & { force?: boolean; recurrenceEditMode?: 'all' | 'current'; instanceDate?: string }) => Promise<void>;
  onDelete: (id: string, deleteMode?: 'all' | 'current') => Promise<void>;
  onFilterChange: (filters: {
    keyword?: string;
    categories?: string[];
    priority?: string[];
    startTime?: string;
    endTime?: string;
  }) => void;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedules,
  isAdmin,
  onCreate,
  onUpdate,
  onDelete,
  onFilterChange,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [form] = Form.useForm();

  // Recurrence action dialog states
  const [isRecurrenceChoiceVisible, setIsRecurrenceChoiceVisible] = useState(false);
  const [recurrenceActionType, setRecurrenceActionType] = useState<'edit' | 'delete'>('edit');
  const [recurrenceEditMode, setRecurrenceEditMode] = useState<'all' | 'current'>('all');

  // Filter Bar state
  const [keyword, setKeyword] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [currentRange, setCurrentRange] = useState<{ start: string; end: string } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to trigger API reloading by calling onFilterChange with updated filters
  const triggerFilterChange = (
    newKeyword: string,
    newCats: string[],
    newPriorities: string[],
    range: typeof currentRange
  ) => {
    onFilterChange({
      keyword: newKeyword || undefined,
      categories: newCats.length > 0 ? newCats : undefined,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
      startTime: range?.start || undefined,
      endTime: range?.end || undefined,
    });
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerFilterChange(value, categories, priority, currentRange);
    }, 500);
  };

  const handleCategoriesChange = (value: string[]) => {
    setCategories(value);
    triggerFilterChange(keyword, value, priority, currentRange);
  };

  const handlePriorityChange = (value: string[]) => {
    setPriority(value);
    triggerFilterChange(keyword, categories, value, currentRange);
  };

  const handleClearFilters = () => {
    setKeyword('');
    setCategories([]);
    setPriority([]);
    triggerFilterChange('', [], [], currentRange);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // List of soft colors for styling events
  const colorOptions = [
    { label: 'Blue (Mặc định)', value: '#1890ff' },
    { label: 'Green (Học tập)', value: '#52c41a' },
    { label: 'Orange (Họp hành)', value: '#fa8c16' },
    { label: 'Red (Quan trọng)', value: '#f5222d' },
    { label: 'Purple (Cá nhân)', value: '#722ed1' },
    { label: 'Cyan (Dự án)', value: '#13c2c2' },
  ];

  // Map schedules to FullCalendar events schema
  const events = schedules.map((schedule) => ({
    id: schedule._id,
    title: schedule.title,
    start: schedule.startTime,
    end: schedule.endTime,
    backgroundColor: schedule.isException ? `${schedule.color}44` : `${schedule.color}22`,
    borderColor: schedule.color,
    textColor: '#262626',
    extendedProps: {
      description: schedule.description,
      category: schedule.category,
      priority: schedule.priority,
      createdBy: schedule.createdBy,
      color: schedule.color,
      recurrence: schedule.recurrence,
      isException: schedule.isException,
      parentEvent: schedule.parentEvent,
    },
  }));

  // Open modal in View mode
  const handleOpenViewModal = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setModalMode('view');
    setIsModalVisible(true);
  };

  // Open modal in Create mode
  const handleOpenCreateModal = (date?: dayjs.Dayjs) => {
    if (!isAdmin) return;
    setModalMode('create');
    setSelectedEvent(null);
    setIsModalVisible(true);

    const initialStart = date ? date.clone().hour(9).minute(0).second(0) : dayjs().hour(9).minute(0).second(0);
    const initialEnd = date ? date.clone().hour(10).minute(0).second(0) : dayjs().hour(10).minute(0).second(0);

    form.setFieldsValue({
      title: '',
      description: '',
      color: '#1890ff',
      range: [initialStart, initialEnd],
      category: 'Học tập',
      priority: 'medium',
      recurrenceType: 'none',
      recurrenceInterval: 1,
      recurrenceDaysOfWeek: [],
      recurrenceEndDate: null,
    });
  };

  // Switch modal to Edit mode
  const handleSwitchToEdit = (mode: 'all' | 'current') => {
    if (!selectedEvent) return;
    setModalMode('edit');
    setRecurrenceEditMode(mode);

    form.setFieldsValue({
      title: selectedEvent.title,
      description: selectedEvent.description || '',
      color: selectedEvent.color,
      range: [dayjs(selectedEvent.startTime), dayjs(selectedEvent.endTime)],
      category: selectedEvent.category || 'Học tập',
      priority: selectedEvent.priority || 'medium',
      recurrenceType: selectedEvent.recurrence?.type || 'none',
      recurrenceInterval: selectedEvent.recurrence?.interval || 1,
      recurrenceDaysOfWeek: selectedEvent.recurrence?.daysOfWeek || [],
      recurrenceEndDate: selectedEvent.recurrence?.endDate ? dayjs(selectedEvent.recurrence.endDate) : null,
    });
  };

  // Handle Form Submit (Create or Update)
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startDayjs, endDayjs] = values.range;

      if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
        message.error('Thời gian bắt đầu phải trước thời gian kết thúc!');
        return;
      }

      const recurrenceType = values.recurrenceType;
      const recurrence =
        recurrenceType && recurrenceType !== 'none'
          ? {
              type: recurrenceType,
              interval: values.recurrenceInterval || 1,
              daysOfWeek: recurrenceType === 'weekly' ? values.recurrenceDaysOfWeek : undefined,
              endDate: values.recurrenceEndDate ? values.recurrenceEndDate.toISOString() : undefined,
            }
          : undefined;

      const inputData: CreateScheduleInput & {
        recurrence?: any;
        recurrenceEditMode?: 'all' | 'current';
        instanceDate?: string;
      } = {
        title: values.title,
        description: values.description,
        startTime: startDayjs.toISOString(),
        endTime: endDayjs.toISOString(),
        color: values.color,
        category: values.category,
        priority: values.priority,
        recurrence,
      };

      const executeSave = async (forceOption = false) => {
        if (modalMode === 'create') {
          await onCreate({ ...inputData, force: forceOption });
          message.success(forceOption ? 'Tạo lịch trình thành công (Bỏ qua trùng lặp)!' : 'Tạo lịch trình thành công!');
        } else if (modalMode === 'edit' && selectedEvent) {
          const payload = {
            ...inputData,
            force: forceOption,
            recurrenceEditMode,
            instanceDate: recurrenceEditMode === 'current' ? selectedEvent.startTime : undefined,
          };
          await onUpdate(selectedEvent._id, payload);
          message.success(forceOption ? 'Cập nhật lịch trình thành công (Bỏ qua trùng lặp)!' : 'Cập nhật lịch trình thành công!');
        }
        setIsModalVisible(false);
        form.resetFields();
      };

      try {
        await executeSave(false);
      } catch (err: any) {
        if (err.response && err.response.status === 409 && err.response.data && err.response.data.conflicts) {
          // Display conflict confirmation modal
          Modal.confirm({
            title: 'Cảnh báo trùng lịch trình!',
            content: (
              <div>
                <p>Phát hiện các lịch trình sau bị chồng lấp thời gian:</p>
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
                  Bạn có chắc chắn muốn xếp chồng và tiếp tục lưu không?
                </p>
              </div>
            ),
            okText: 'Vẫn lưu (Force)',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
              await executeSave(true);
            },
          });
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      if (err.errorFields) {
        return;
      }
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Đã xảy ra lỗi, vui lòng thử lại.');
      }
    }
  };

  // Initiate edit flow
  const handleEditInitiate = () => {
    if (!selectedEvent) return;
    const isVirtual = selectedEvent._id.includes('_');
    const isRecurring = selectedEvent.recurrence && selectedEvent.recurrence.type !== 'none';
    
    if (isVirtual || isRecurring) {
      setRecurrenceActionType('edit');
      setIsRecurrenceChoiceVisible(true);
    } else {
      handleSwitchToEdit('all');
    }
  };

  // Initiate delete flow
  const handleDeleteInitiate = () => {
    if (!selectedEvent) return;
    const isVirtual = selectedEvent._id.includes('_');
    const isRecurring = selectedEvent.recurrence && selectedEvent.recurrence.type !== 'none';

    if (isVirtual || isRecurring) {
      setRecurrenceActionType('delete');
      setIsRecurrenceChoiceVisible(true);
    } else {
      handleDeleteAction('all');
    }
  };

  const handleRecurrenceChoiceAction = async (mode: 'all' | 'current') => {
    setIsRecurrenceChoiceVisible(false);
    if (recurrenceActionType === 'edit') {
      handleSwitchToEdit(mode);
    } else {
      await handleDeleteAction(mode);
    }
  };

  // Handle Event Delete Action
  const handleDeleteAction = async (mode: 'all' | 'current') => {
    if (!selectedEvent) return;
    try {
      await onDelete(selectedEvent._id, mode);
      message.success(mode === 'current' ? 'Đã xóa sự kiện hiện tại!' : 'Đã xóa chuỗi sự kiện lặp!');
      setIsModalVisible(false);
    } catch (err) {
      message.error('Không thể thực hiện tác vụ xóa.');
    }
  };

  // Handle event click on FullCalendar
  const handleEventClick = (clickInfo: any) => {
    const eventId = clickInfo.event.id;
    // Map virtual properties inside fullcalendar event
    const extended = clickInfo.event.extendedProps;
    
    const schedule: ScheduleEvent = {
      _id: eventId,
      title: clickInfo.event.title,
      startTime: clickInfo.event.startStr,
      endTime: clickInfo.event.endStr,
      color: extended.color,
      description: extended.description,
      category: extended.category,
      priority: extended.priority,
      createdBy: extended.createdBy,
      recurrence: extended.recurrence,
      isException: extended.isException,
      parentEvent: extended.parentEvent,
      createdAt: '',
      updatedAt: '',
    };
    
    handleOpenViewModal(schedule);
  };

  // Handle slot/date selection on FullCalendar
  const handleDateSelect = (selectInfo: any) => {
    if (!isAdmin) return;

    let start = dayjs(selectInfo.start);
    let end = dayjs(selectInfo.end);

    if (selectInfo.allDay) {
      start = start.hour(9).minute(0).second(0);
      end = start.clone().hour(10).minute(0).second(0);
    }

    setModalMode('create');
    setSelectedEvent(null);
    setIsModalVisible(true);

    form.setFieldsValue({
      title: '',
      description: '',
      color: '#1890ff',
      range: [start, end],
      category: 'Học tập',
      priority: 'medium',
      recurrenceType: 'none',
      recurrenceInterval: 1,
      recurrenceDaysOfWeek: [],
      recurrenceEndDate: null,
    });

    selectInfo.view.calendar.unselect();
  };

  // Handle view change or date navigate -> Reload schedules for active date range
  const handleDatesSet = (dateInfo: any) => {
    const startIso = dateInfo.start.toISOString();
    const endIso = dateInfo.end.toISOString();
    const range = { start: startIso, end: endIso };
    setCurrentRange(range);
    triggerFilterChange(keyword, categories, priority, range);
  };

  // Premium design styling for FullCalendar overrides
  const customStyles = `
    .fc {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 13.5px !important;
    }
    .fc .fc-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 24px !important;
    }
    .fc .fc-toolbar-title {
      font-size: 1.35rem !important;
      font-weight: 600 !important;
      color: #1f1f1f !important;
    }
    .fc .fc-button-primary {
      background-color: #ffffff !important;
      border: 1px solid #d9d9d9 !important;
      color: #595959 !important;
      font-weight: 500 !important;
      border-radius: 6px !important;
      text-transform: capitalize !important;
      box-shadow: 0 2px 0 rgba(0, 0, 0, 0.015) !important;
      transition: all 0.2s ease !important;
      padding: 6px 14px !important;
    }
    .fc .fc-button-primary:hover {
      color: #1890ff !important;
      border-color: #1890ff !important;
      background-color: #ffffff !important;
    }
    .fc .fc-button-primary:disabled {
      color: #bfbfbf !important;
      border-color: #d9d9d9 !important;
      background-color: #f5f5f5 !important;
      cursor: not-allowed !important;
    }
    .fc .fc-button-active, .fc .fc-button-primary:active {
      color: #1890ff !important;
      border-color: #1890ff !important;
      background-color: #e6f7ff !important;
      font-weight: 600 !important;
    }
    .fc .fc-button-primary:focus {
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
    }
    .fc-theme-standard .fc-scrollgrid {
      border: 1px solid #f0f0f0 !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02) !important;
    }
    .fc .fc-col-header-cell {
      background-color: #fafafa !important;
      padding: 10px 0 !important;
      font-weight: 600 !important;
      color: #262626 !important;
      border-bottom: 1px solid #f0f0f0 !important;
    }
    .fc .fc-daygrid-day-number {
      font-weight: 500 !important;
      color: #595959 !important;
      padding: 8px 10px !important;
    }
    .fc .fc-daygrid-day.fc-day-today {
      background-color: #f0f5ff !important;
    }
    .fc-day-today .fc-daygrid-day-number {
      color: #1890ff !important;
      font-weight: 700 !important;
    }
    .fc-event {
      border-left: 3px solid var(--fc-event-border-color) !important;
      border-top: none !important;
      border-bottom: none !important;
      border-right: none !important;
      border-radius: 3px !important;
      padding: 2px 6px !important;
      margin: 1px 2px !important;
    }
    .fc-h-event .fc-event-main {
      color: #333333 !important;
      font-weight: 500 !important;
    }
    .fc-v-event .fc-event-main {
      color: #333333 !important;
      font-weight: 500 !important;
    }
    .fc .fc-timegrid-now-indicator-line {
      border-color: #ff4d4f !important;
      border-width: 2px !important;
    }
    .fc .fc-timegrid-now-indicator-arrow {
      border-color: #ff4d4f !important;
      border-width: 5px !important;
      margin-top: -4px !important;
    }
    .fc-list-day-cushion {
      background-color: #fafafa !important;
      padding: 10px 16px !important;
      font-weight: 600 !important;
    }
    .fc-list-event {
      cursor: pointer !important;
    }
    .fc-list-event:hover td {
      background-color: #f5f5f5 !important;
    }
    .fc-list-event-title {
      font-weight: 500 !important;
    }
    .fc-list-event-dot {
      border-width: 4px !important;
    }
  `;

  return (
    <div>
      <style>{customStyles}</style>

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 600 }}>Thời khóa biểu / Lịch trình</h2>
          <p style={{ margin: 0, color: '#8c8c8c' }}>
            {isAdmin ? 'Kéo chọn các khung giờ hoặc click nút "Tạo sự kiện" để sắp xếp thời gian biểu.' : 'Xem danh sách lịch trình công khai.'}
          </p>
        </div>
        {isAdmin && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenCreateModal()}
            style={{ borderRadius: '6px' }}
          >
            Tạo sự kiện
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card
        styles={{ body: { padding: 16 } }}
        style={{
          marginBottom: '20px',
          borderRadius: '10px',
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        <Space wrap size="middle" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '6px' }}>Từ khóa:</div>
            <Input
              placeholder="Tìm tiêu đề, mô tả..."
              value={keyword}
              onChange={handleKeywordChange}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ width: '220px', borderRadius: '6px' }}
              allowClear
            />
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '6px' }}>Danh mục:</div>
            <Select
              mode="multiple"
              placeholder="Chọn danh mục"
              value={categories}
              onChange={handleCategoriesChange}
              style={{ width: '220px' }}
              maxTagCount="responsive"
              allowClear
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '6px' }}>Độ ưu tiên:</div>
            <Select
              mode="multiple"
              placeholder="Chọn độ ưu tiên"
              value={priority}
              onChange={handlePriorityChange}
              style={{ width: '180px' }}
              maxTagCount="responsive"
              allowClear
            >
              <Option value="low">Thấp</Option>
              <Option value="medium">Trung bình</Option>
              <Option value="high">Cao</Option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignSelf: 'flex-end', height: '32px', marginBottom: '2px' }}>
            <Button
              type="text"
              danger
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              disabled={!keyword && categories.length === 0 && priority.length === 0}
              style={{ borderRadius: '6px', fontWeight: 500 }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </Space>
      </Card>

      {/* FullCalendar Component */}
      <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{
            today: 'Hôm nay',
            month: 'Tháng',
            week: 'Tuần',
            day: 'Ngày',
            list: 'Danh sách',
          }}
          allDaySlot={false} // clean week/day schedules without all-day rows
          firstDay={1} // Start week on Monday
          editable={false}
          selectable={isAdmin}
          selectMirror={true}
          dayMaxEvents={true}
          nowIndicator={true}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
          datesSet={handleDatesSet}
          height="auto"
        />
      </div>

      {/* Recurrence Selection Choice Modal */}
      <Modal
        title="Tùy chọn Chuỗi Lặp lại"
        visible={isRecurrenceChoiceVisible}
        onCancel={() => setIsRecurrenceChoiceVisible(false)}
        footer={null}
        width={400}
        destroyOnClose
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <p style={{ marginBottom: '24px', fontSize: '14px', color: '#595959' }}>
            {recurrenceActionType === 'edit'
              ? 'Bạn muốn chỉnh sửa chỉ riêng sự kiện này hay áp dụng cho toàn bộ chuỗi sự kiện lặp lại?'
              : 'Bạn muốn xóa chỉ riêng sự kiện này hay loại bỏ toàn bộ chuỗi sự kiện lặp lại?'}
          </p>
          <Space size="middle">
            <Button
              type="primary"
              danger={recurrenceActionType === 'delete'}
              onClick={() => handleRecurrenceChoiceAction('current')}
              style={{ borderRadius: '6px' }}
            >
              Chỉ sự kiện này
            </Button>
            <Button
              type="default"
              onClick={() => handleRecurrenceChoiceAction('all')}
              style={{ borderRadius: '6px' }}
            >
              Toàn bộ chuỗi lặp
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Detail, Edit and Creation Modal */}
      <Modal
        title={
          modalMode === 'view' ? (
            <span>
              <InfoCircleOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              Chi tiết lịch trình
            </span>
          ) : modalMode === 'create' ? (
            'Tạo sự kiện mới'
          ) : (
            'Chỉnh sửa lịch trình'
          )
        }
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        width={520}
      >
        {modalMode === 'view' && selectedEvent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: selectedEvent.color,
                  display: 'inline-block',
                }}
              />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{selectedEvent.title}</h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c', width: '120px' }}>Thời gian:</td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>
                    {dayjs(selectedEvent.startTime).format('HH:mm DD/MM/YYYY')} -{' '}
                    {dayjs(selectedEvent.endTime).format('HH:mm DD/MM/YYYY')}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Mô tả:</td>
                  <td style={{ padding: '8px 0', whiteSpace: 'pre-wrap' }}>
                    {selectedEvent.description || <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>Không có mô tả</span>}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Danh mục:</td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>
                    {selectedEvent.category || 'Học tập'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Độ ưu tiên:</td>
                  <td style={{ padding: '8px 0' }}>
                    {selectedEvent.priority === 'high' ? (
                      <Badge status="error" text="Cao" />
                    ) : selectedEvent.priority === 'low' ? (
                      <Badge status="default" text="Thấp" />
                    ) : (
                      <Badge status="warning" text="Trung bình" />
                    )}
                  </td>
                </tr>
                {selectedEvent.recurrence && selectedEvent.recurrence.type !== 'none' && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Chu kỳ lặp:</td>
                    <td style={{ padding: '8px 0', fontWeight: 500, color: '#1890ff' }}>
                      {selectedEvent.recurrence.type === 'daily' && `Lặp mỗi ${selectedEvent.recurrence.interval} ngày`}
                      {selectedEvent.recurrence.type === 'weekly' && `Lặp mỗi ${selectedEvent.recurrence.interval} tuần`}
                      {selectedEvent.recurrence.type === 'monthly' && `Lặp mỗi ${selectedEvent.recurrence.interval} tháng`}
                      {selectedEvent.recurrence.endDate && ` (đến ngày ${dayjs(selectedEvent.recurrence.endDate).format('DD/MM/YYYY')})`}
                    </td>
                  </tr>
                )}
                {selectedEvent.isException && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Loại sự kiện:</td>
                    <td style={{ padding: '8px 0', fontWeight: 500, color: '#fa8c16' }}>
                      Ngoại lệ riêng lẻ
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Người tạo:</td>
                  <td style={{ padding: '8px 0' }}>
                    {selectedEvent.createdBy?.username} ({selectedEvent.createdBy?.email})
                  </td>
                </tr>
              </tbody>
            </table>

            {isAdmin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteInitiate}
                  style={{ borderRadius: '6px' }}
                >
                  Xóa
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEditInitiate}
                  style={{ borderRadius: '6px' }}
                >
                  Chỉnh sửa
                </Button>
              </div>
            )}
          </div>
        )}

        {(modalMode === 'create' || modalMode === 'edit') && (
          <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
            <Form.Item
              name="title"
              label="Tiêu đề sự kiện"
              rules={[{ required: true, message: 'Vui lòng điền tiêu đề lịch trình!' }]}
            >
              <Input placeholder="Ví dụ: Lớp học ReactJS, Họp giao ban,..." />
            </Form.Item>

            <Form.Item name="description" label="Ghi chú / Mô tả">
              <Input.TextArea rows={3} placeholder="Nội dung chi tiết của lịch trình..." />
            </Form.Item>

            <Form.Item
              name="category"
              label="Danh mục"
              rules={[{ required: true, message: 'Vui lòng chọn danh mục!' }]}
            >
              <Select placeholder="Chọn danh mục sự kiện">
                {CATEGORY_OPTIONS.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="priority"
              label="Độ ưu tiên"
              rules={[{ required: true, message: 'Vui lòng chọn độ ưu tiên!' }]}
            >
              <Select placeholder="Chọn độ ưu tiên">
                <Option value="low">
                  <Badge status="default" text="Thấp" />
                </Option>
                <Option value="medium">
                  <Badge status="warning" text="Trung bình" />
                </Option>
                <Option value="high">
                  <Badge status="error" text="Cao" />
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="range"
              label="Thời gian bắt đầu & kết thúc"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc!' }]}
            >
              <DatePicker.RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                placeholder={['Bắt đầu', 'Kết thúc']}
              />
            </Form.Item>

            <Form.Item name="color" label="Màu sắc đại diện">
              <Select placeholder="Chọn màu sắc hiển thị trên lịch">
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

            <Form.Item name="recurrenceType" label="Lặp lại" initialValue="none">
              <Select>
                <Option value="none">Không lặp lại</Option>
                <Option value="daily">Hàng ngày</Option>
                <Option value="weekly">Hàng tuần</Option>
                <Option value="monthly">Hàng tháng</Option>
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
                      <Form.Item name="recurrenceInterval" label="Chu kỳ lặp" initialValue={1} style={{ marginBottom: '12px' }}>
                        <Select>
                          <Option value={1}>Mỗi lần lặp (1)</Option>
                          <Option value={2}>Mỗi 2 lần lặp (2)</Option>
                          <Option value={3}>Mỗi 3 lần lặp (3)</Option>
                          <Option value={4}>Mỗi 4 lần lặp (4)</Option>
                        </Select>
                      </Form.Item>

                      {type === 'weekly' && (
                        <Form.Item name="recurrenceDaysOfWeek" label="Lặp vào các ngày" style={{ marginBottom: '12px' }}>
                          <Select mode="multiple" placeholder="Chọn các ngày trong tuần" style={{ width: '100%' }}>
                            <Option value={1}>Thứ 2</Option>
                            <Option value={2}>Thứ 3</Option>
                            <Option value={3}>Thứ 4</Option>
                            <Option value={4}>Thứ 5</Option>
                            <Option value={5}>Thứ 6</Option>
                            <Option value={6}>Thứ 7</Option>
                            <Option value={0}>Chủ Nhật</Option>
                          </Select>
                        </Form.Item>
                      )}

                      <Form.Item name="recurrenceEndDate" label="Ngày kết thúc lặp" style={{ marginBottom: 0 }}>
                        <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} placeholder="Lặp vô tận" />
                      </Form.Item>
                    </Space>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalVisible(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit">
                  {modalMode === 'create' ? 'Tạo mới' : 'Lưu thay đổi'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};
