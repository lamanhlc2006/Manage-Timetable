import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Badge, Modal, Form, Input, DatePicker, Select, Button, message, notification, Space, Card, Tag, Tooltip, List, ColorPicker, Popconfirm, Skeleton, Empty } from 'antd';
import dayjs from 'dayjs';
import { useHotkeys } from 'react-hotkeys-hook';
import { ScheduleEvent, CreateScheduleInput, patchScheduleTime } from '../services/scheduleService';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  CategoryItem,
} from '../services/categoryService';
import { fetchUsers } from '../services/userService';
import { downloadIcsFile, downloadPdfReport } from '../services/exportService';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ClearOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FilterOutlined,
} from '@ant-design/icons';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

const { Option } = Select;

interface ScheduleCalendarProps {
  schedules: ScheduleEvent[];
  loading?: boolean;
  isAdmin: boolean;
  onCreate: (data: CreateScheduleInput & { force?: boolean }) => Promise<void>;
  onUpdate: (id: string, data: Partial<CreateScheduleInput> & { force?: boolean; recurrenceEditMode?: 'all' | 'current'; instanceDate?: string }) => Promise<void>;
  onDelete: (id: string, deleteMode?: 'all' | 'current') => Promise<void>;
  onPatchTime?: (id: string, startTime: string, endTime: string, recurrenceEditMode?: 'all' | 'current') => Promise<void>;
  onFilterChange: (filters: {
    keyword?: string;
    categories?: string[];
    priority?: string[];
    startTime?: string;
    endTime?: string;
    creator?: string;
  }) => void;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedules,
  loading = false,
  isAdmin,
  onCreate,
  onUpdate,
  onDelete,
  onPatchTime,
  onFilterChange,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [form] = Form.useForm();
  const calendarRef = useRef<FullCalendar>(null);

  const [isQuickAddModalVisible, setIsQuickAddModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [quickAddForm] = Form.useForm();
  const searchInputRef = useRef<any>(null);

  // Dynamic Categories state
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#1890ff');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // User list state for admin filter
  const [usersList, setUsersList] = useState<{ _id: string; username: string }[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isAdmin) {
      const loadUsers = async () => {
        try {
          const response = await fetchUsers({ page: 1, limit: 100 });
          setUsersList(response.users);
        } catch (err) {
          console.error('Error fetching users for filter:', err);
        }
      };
      loadUsers();
    }
  }, [isAdmin]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategoriesList(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateCategorySubmit = async () => {
    if (!newCatName.trim()) {
      message.error('Vui lòng nhập tên danh mục!');
      return;
    }
    try {
      if (editingCatId) {
        await updateCategory(editingCatId, {
          name: newCatName.trim(),
          color: newCatColor,
          icon: newCatIcon,
        });
        message.success('Cập nhật danh mục thành công!');
        setEditingCatId(null);
      } else {
        await createCategory({
          name: newCatName.trim(),
          color: newCatColor,
          icon: newCatIcon,
        });
        message.success('Tạo danh mục mới thành công!');
      }
      setNewCatName('');
      setNewCatColor('#1890ff');
      setNewCatIcon('📌');
      loadCategories();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi thao tác danh mục');
    }
  };

  const handleEditCategoryInitiate = (cat: CategoryItem) => {
    setEditingCatId(cat._id);
    setNewCatName(cat.name);
    setNewCatColor(cat.color);
    setNewCatIcon(cat.icon || '📌');
  };

  const handleCancelEditCategory = () => {
    setEditingCatId(null);
    setNewCatName('');
    setNewCatColor('#1890ff');
    setNewCatIcon('📌');
  };

  const handleDeleteCategorySubmit = async (id: string) => {
    try {
      await deleteCategory(id);
      message.success('Đã xóa danh mục!');
      if (editingCatId === id) {
        handleCancelEditCategory();
      }
      loadCategories();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Không thể xóa danh mục');
    }
  };

  const handleOpenQuickAddModal = () => {
    if (!isAdmin) return;
    setIsQuickAddModalVisible(true);
    const start = dayjs().add(1, 'hour').minute(0).second(0);
    const end = start.clone().add(1, 'hour');
    quickAddForm.setFieldsValue({
      title: '',
      range: [start, end],
    });
  };

  const handleQuickAddSubmit = async () => {
    try {
      const values = await quickAddForm.validateFields();
      const [startDayjs, endDayjs] = values.range;

      if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
        message.error('Thời gian bắt đầu phải trước thời gian kết thúc!');
        return;
      }

      const inputData: CreateScheduleInput & { force?: boolean } = {
        title: values.title.trim(),
        description: '',
        startTime: startDayjs.toISOString(),
        endTime: endDayjs.toISOString(),
        color: '#1890ff',
        category: categoriesList[0]?.name || 'Học tập',
        tags: [],
        priority: 'medium',
      };

      const executeSave = async (forceOption = false) => {
        await onCreate({ ...inputData, force: forceOption });
        message.success(forceOption ? 'Tạo nhanh lịch trình thành công (Bỏ qua trùng lặp)!' : 'Tạo nhanh lịch trình thành công!');
        setIsQuickAddModalVisible(false);
        quickAddForm.resetFields();
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
      if (err.errorFields) return;
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Đã xảy ra lỗi, vui lòng thử lại.');
      }
    }
  };

  // Keyboard Shortcuts (N: Quick Add, T: Today, D: Day, W: Week, M: Month, /: Focus Search, Esc: Close, ?: Help)
  useHotkeys('n', (e) => {
    e.preventDefault();
    if (isAdmin && !isModalVisible && !isQuickAddModalVisible && !isCategoryModalVisible && !isHelpModalVisible) {
      handleOpenQuickAddModal();
    }
  }, { enableOnFormTags: false });

  useHotkeys('t', () => {
    calendarRef.current?.getApi().today();
  }, { enableOnFormTags: false });

  useHotkeys('d', () => {
    calendarRef.current?.getApi().changeView('timeGridDay');
  }, { enableOnFormTags: false });

  useHotkeys('w', () => {
    calendarRef.current?.getApi().changeView('timeGridWeek');
  }, { enableOnFormTags: false });

  useHotkeys('m', () => {
    calendarRef.current?.getApi().changeView('dayGridMonth');
  }, { enableOnFormTags: false });

  useHotkeys('/', (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  }, { enableOnFormTags: false });

  useHotkeys('escape', () => {
    setIsModalVisible(false);
    setIsQuickAddModalVisible(false);
    setIsCategoryModalVisible(false);
    setIsHelpModalVisible(false);
  }, { enableOnFormTags: true });

  useHotkeys('shift+?, ?', (e) => {
    e.preventDefault();
    setIsHelpModalVisible(true);
  }, { enableOnFormTags: false });

  // Export Handlers
  const handleExportIcs = async () => {
    try {
      message.loading({ content: 'Đang khởi tạo file .ics...', key: 'export_ics' });
      await downloadIcsFile();
      message.success({ content: 'Đã xuất file .ics thành công!', key: 'export_ics' });
    } catch (err) {
      console.error(err);
      message.error({ content: 'Không thể xuất file .ics.', key: 'export_ics' });
    }
  };

  const handleExportPdf = () => {
    try {
      if (schedules.length === 0) {
        message.warning('Không có lịch trình nào để xuất PDF!');
        return;
      }
      downloadPdfReport(schedules, 'BAO CAO THOI KHOA BIEU & LICH TRINH');
      message.success('Đã tạo báo cáo PDF thành công!');
    } catch (err) {
      console.error(err);
      message.error('Không thể tạo báo cáo PDF.');
    }
  };

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
    range: typeof currentRange,
    newCreator?: string
  ) => {
    onFilterChange({
      keyword: newKeyword || undefined,
      categories: newCats.length > 0 ? newCats : undefined,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
      startTime: range?.start || undefined,
      endTime: range?.end || undefined,
      creator: newCreator !== undefined ? (newCreator || undefined) : selectedCreator,
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

  const handleCreatorChange = (value: string | undefined) => {
    setSelectedCreator(value);
    triggerFilterChange(keyword, categories, priority, currentRange, value);
  };

  const handleClearFilters = () => {
    setKeyword('');
    setCategories([]);
    setPriority([]);
    setSelectedCreator(undefined);
    triggerFilterChange('', [], [], currentRange, '');
  };

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
      tags: schedule.tags || [],
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
      category: categoriesList[0]?.name || 'Học tập',
      tags: [],
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
      tags: selectedEvent.tags || [],
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
        tags: values.tags,
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
      tags: extended.tags || [],
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
      category: categoriesList[0]?.name || 'Học tập',
      tags: [],
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

  // Handle drag & drop and resize events on FullCalendar
  const handleEventChange = async (changeInfo: any) => {
    if (!isAdmin) {
      changeInfo.revert();
      return;
    }

    const { event, revert, oldEvent } = changeInfo;
    const eventId = event.id;
    const startIso = event.start ? event.start.toISOString() : event.startStr;
    let endIso = event.end ? event.end.toISOString() : event.endStr;

    if (!endIso && event.start) {
      endIso = dayjs(event.start).add(1, 'hour').toISOString();
    }

    const prevStartIso = oldEvent?.start ? oldEvent.start.toISOString() : oldEvent?.startStr;
    const prevEndIso = oldEvent?.end ? oldEvent.end.toISOString() : oldEvent?.endStr;

    const isVirtualInstance = eventId.includes('_');
    const editMode = isVirtualInstance ? 'current' : undefined;

    try {
      if (onPatchTime) {
        await onPatchTime(eventId, startIso, endIso, editMode);
      } else {
        await patchScheduleTime(eventId, {
          startTime: startIso,
          endTime: endIso,
          recurrenceEditMode: editMode,
        });
      }

      const notifKey = `undo_drag_${eventId}_${Date.now()}`;
      notification.info({
        key: notifKey,
        message: 'Đã di chuyển lịch trình',
        description: 'Thời gian sự kiện đã được cập nhật thành công.',
        duration: 5,
        btn: (
          <Button
            type="primary"
            size="small"
            onClick={async () => {
              notification.destroy(notifKey);
              if (prevStartIso && prevEndIso) {
                try {
                  if (onPatchTime) {
                    await onPatchTime(eventId, prevStartIso, prevEndIso, editMode);
                  } else {
                    await patchScheduleTime(eventId, {
                      startTime: prevStartIso,
                      endTime: prevEndIso,
                      recurrenceEditMode: editMode,
                    });
                  }
                  message.success('Đã hoàn tác di chuyển lịch trình!');
                } catch (undoErr) {
                  revert();
                  message.error('Không thể hoàn tác.');
                }
              } else {
                revert();
              }
            }}
          >
            Hoàn tác
          </Button>
        ),
      });
    } catch (err: any) {
      revert(); // Rollback FullCalendar event position immediately on error
      if (err.response && err.response.status === 409) {
        message.error('Phát hiện trùng lịch trình! Sự kiện đã được khôi phục về vị trí cũ.');
      } else if (err.response && err.response.data && err.response.data.message) {
        message.error(`Không thể cập nhật: ${err.response.data.message}`);
      } else {
        message.error('Lỗi cập nhật thời gian sự kiện. Đã khôi phục vị trí cũ.');
      }
    }
  };

  // Premium design styling for FullCalendar overrides
  const customStyles = `
    .fc {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 13.5px !important;
    }
    .fc .fc-toolbar {
      margin-bottom: 20px !important;
    }
    .fc .fc-toolbar-title {
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: #1f2937 !important;
    }
    .fc .fc-button-primary {
      background-color: #ffffff !important;
      border: 1px solid #d9d9d9 !important;
      color: #595959 !important;
      font-weight: 500 !important;
      border-radius: 6px !important;
      padding: 6px 14px !important;
      box-shadow: 0 2px 0 rgba(0, 0, 0, 0.02) !important;
      transition: all 0.2s ease !important;
    }
    .fc .fc-button-primary:hover {
      background-color: #f5f5f5 !important;
      color: #1890ff !important;
      border-color: #40a9ff !important;
    }
    .fc .fc-button-primary:not(:disabled).fc-button-active,
    .fc .fc-button-primary:not(:disabled):active {
      background-color: #e6f7ff !important;
      color: #1890ff !important;
      border-color: #1890ff !important;
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
      color: #434343 !important;
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
      border-radius: 4px !important;
      padding: 2px 6px !important;
      margin: 1px 2px !important;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }
    .fc-event:hover {
      transform: scale(1.02) !important;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18) !important;
      z-index: 5 !important;
      cursor: pointer !important;
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

  const activeFilterCount =
    (keyword.trim() ? 1 : 0) +
    (categories.length > 0 ? 1 : 0) +
    (priority.length > 0 ? 1 : 0) +
    (selectedCreator ? 1 : 0);

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
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportIcs}
            style={{ borderRadius: '6px' }}
          >
            Xuất file .ics
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={handleExportPdf}
            style={{ borderRadius: '6px' }}
          >
            Xuất PDF
          </Button>
          {isAdmin && (
            <>
              <Button onClick={() => setIsCategoryModalVisible(true)} style={{ borderRadius: '6px' }}>
                Quản lý danh mục
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenCreateModal()}
                style={{ borderRadius: '6px' }}
              >
                Tạo sự kiện
              </Button>
            </>
          )}
        </Space>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <FilterOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#595959' }}>Bộ lọc tìm kiếm</span>
          {activeFilterCount > 0 && (
            <Badge count={activeFilterCount} overflowCount={99} style={{ backgroundColor: '#1890ff' }} />
          )}
        </div>
        <Space wrap size="middle" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '6px' }}>Từ khóa:</div>
            <Input
              ref={searchInputRef}
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
              {categoriesList.map((cat) => (
                <Option key={cat._id} value={cat.name}>
                  {cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
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

          {isAdmin && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '6px' }}>Người tạo:</div>
              <Select
                placeholder="Chọn người tạo"
                value={selectedCreator}
                onChange={handleCreatorChange}
                style={{ width: '180px' }}
                allowClear
              >
                {usersList.map((user) => (
                  <Option key={user._id} value={user._id}>
                    {user.username}
                  </Option>
                ))}
              </Select>
            </div>
          )}

          <div style={{ display: 'flex', alignSelf: 'flex-end', height: '32px', marginBottom: '2px' }}>
            <Button
              type="text"
              danger
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
              disabled={!keyword && categories.length === 0 && priority.length === 0 && !selectedCreator}
              style={{ borderRadius: '6px', fontWeight: 500 }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </Space>
      </Card>

      {/* Keyboard Shortcuts Hint Bar */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>Phím tắt:</span>
        {isAdmin && (
          <Tooltip title="Nhấn N để mở tạo lịch nhanh">
            <Tag color="blue" style={{ cursor: 'pointer' }} onClick={handleOpenQuickAddModal}>
              <kbd>N</kbd> Tạo nhanh
            </Tag>
          </Tooltip>
        )}
        <Tooltip title="Nhấn T để về ngày hôm nay">
          <Tag color="default" style={{ cursor: 'pointer' }} onClick={() => calendarRef.current?.getApi().today()}>
            <kbd>T</kbd> Hôm nay
          </Tag>
        </Tooltip>
        <Tooltip title="Nhấn D để chuyển sang xem theo Ngày">
          <Tag color="default" style={{ cursor: 'pointer' }} onClick={() => calendarRef.current?.getApi().changeView('timeGridDay')}>
            <kbd>D</kbd> Ngày
          </Tag>
        </Tooltip>
        <Tooltip title="Nhấn W để chuyển sang xem theo Tuần">
          <Tag color="default" style={{ cursor: 'pointer' }} onClick={() => calendarRef.current?.getApi().changeView('timeGridWeek')}>
            <kbd>W</kbd> Tuần
          </Tag>
        </Tooltip>
        <Tooltip title="Nhấn M để chuyển sang xem theo Tháng">
          <Tag color="default" style={{ cursor: 'pointer' }} onClick={() => calendarRef.current?.getApi().changeView('dayGridMonth')}>
            <kbd>M</kbd> Tháng
          </Tag>
        </Tooltip>
        <Tooltip title="Nhấn / để focus tìm kiếm">
          <Tag color="default" style={{ cursor: 'pointer' }} onClick={() => searchInputRef.current?.focus()}>
            <kbd>/</kbd> Tìm kiếm
          </Tag>
        </Tooltip>
        <Tooltip title="Nhấn ? để hiển thị danh sách phím tắt">
          <Tag color="warning" style={{ cursor: 'pointer' }} onClick={() => setIsHelpModalVisible(true)}>
            <kbd>?</kbd> Trợ giúp
          </Tag>
        </Tooltip>
      </div>

      {/* FullCalendar Component */}
      <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </div>
        ) : (
          <>
            {schedules.length === 0 && (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: '#fafafa', borderRadius: '8px', marginBottom: '16px' }}>
                <Empty
                  description="Chưa có sự kiện nào trong lịch trình"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  {isAdmin && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleOpenCreateModal()}
                      style={{ marginTop: '8px', borderRadius: '6px' }}
                    >
                      Tạo sự kiện đầu tiên
                    </Button>
                  )}
                </Empty>
              </div>
            )}
            <FullCalendar
              ref={calendarRef}
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
          editable={isAdmin}
          eventStartEditable={isAdmin}
          eventDurationEditable={isAdmin}
          selectable={isAdmin}
          selectMirror={true}
          dayMaxEvents={true}
          nowIndicator={true}
          events={events}
          eventClick={handleEventClick}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          select={handleDateSelect}
          datesSet={handleDatesSet}
          height="auto"
        />
          </>
        )}
      </div>

      {/* Recurrence Choice Confirmation Dialog */}
      <Modal
        title="Tác vụ lịch trình lặp lại"
        open={isRecurrenceChoiceVisible}
        onCancel={() => setIsRecurrenceChoiceVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <p style={{ marginBottom: '20px' }}>
          Bạn muốn thực hiện tác vụ này cho sự kiện hiện tại hay tất cả sự kiện trong chuỗi lặp?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button onClick={() => handleRecurrenceChoiceAction('current')}>
            Chỉ sự kiện này
          </Button>
          <Button type="primary" onClick={() => handleRecurrenceChoiceAction('all')}>
            Tất cả sự kiện lặp
          </Button>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        title="Quản lý Danh mục (Categories)"
        open={isCategoryModalVisible}
        onCancel={() => {
          setIsCategoryModalVisible(false);
          handleCancelEditCategory();
        }}
        footer={null}
        destroyOnHidden
      >
        <div style={{ marginBottom: '20px', padding: '12px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#595959' }}>
            {editingCatId ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}
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
            <Button type="primary" onClick={handleCreateCategorySubmit}>
              {editingCatId ? 'Lưu' : 'Thêm'}
            </Button>
            {editingCatId && (
              <Button onClick={handleCancelEditCategory}>
                Hủy
              </Button>
            )}
          </Space>
        </div>

        <List
          size="small"
          bordered
          dataSource={categoriesList}
          renderItem={(cat) => (
            <List.Item
              actions={
                !cat.isSystem
                  ? [
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleEditCategoryInitiate(cat)}
                        style={{ padding: 0 }}
                      >
                        Sửa
                      </Button>,
                      <Popconfirm
                        title="Xóa danh mục này?"
                        description="Các sự kiện dùng danh mục này sẽ giữ nguyên."
                        onConfirm={() => handleDeleteCategorySubmit(cat._id)}
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

      {/* Event View/Create/Edit Modal */}
      <Modal
        title={
          modalMode === 'view'
            ? 'Chi tiết lịch trình'
            : modalMode === 'create'
            ? 'Tạo lịch trình mới'
            : 'Chỉnh sửa lịch trình'
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={560}
      >
        {modalMode === 'view' && selectedEvent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: selectedEvent.color,
                  display: 'inline-block',
                }}
              />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{selectedEvent.title}</h3>
            </div>

            <table style={{ width: '100%', marginBottom: '24px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '120px', padding: '8px 0', color: '#8c8c8c' }}>Thời gian:</td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>
                    {dayjs(selectedEvent.startTime).format('HH:mm DD/MM/YYYY')} -{' '}
                    {dayjs(selectedEvent.endTime).format('HH:mm DD/MM/YYYY')}
                  </td>
                </tr>
                {selectedEvent.description && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Ghi chú:</td>
                    <td style={{ padding: '8px 0' }}>{selectedEvent.description}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Danh mục:</td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>
                    {selectedEvent.category || 'Học tập'}
                  </td>
                </tr>
                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#8c8c8c' }}>Thẻ (Tags):</td>
                    <td style={{ padding: '8px 0' }}>
                      {selectedEvent.tags.map((t) => (
                        <Tag key={t} color="blue" style={{ borderRadius: '4px' }}>
                          {t.startsWith('#') ? t : `#${t}`}
                        </Tag>
                      ))}
                    </td>
                  </tr>
                )}
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
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span>Danh mục</span>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setIsCategoryModalVisible(true)}
                    style={{ padding: 0 }}
                  >
                    + Quản lý danh mục
                  </Button>
                </div>
              }
              rules={[{ required: true, message: 'Vui lòng chọn danh mục!' }]}
            >
              <Select placeholder="Chọn danh mục sự kiện">
                {categoriesList.map((cat) => (
                  <Option key={cat._id} value={cat.name}>
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

            <Form.Item name="tags" label="Thẻ đánh dấu (Tags)">
              <Select
                mode="tags"
                placeholder="Nhập thẻ đánh dấu và bấm Enter (ví dụ: #deadline, #exam)..."
                style={{ width: '100%' }}
                tokenSeparators={[',', ' ']}
              />
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
              label="Khung thời gian (Bắt đầu - Kết thúc)"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian!' }]}
            >
              <DatePicker.RangePicker
                showTime={{ format: 'HH:mm' }}
                format="HH:mm YYYY-MM-DD"
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

      {/* Quick Add Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚡</span>
            <span>Tạo nhanh lịch trình</span>
          </div>
        }
        open={isQuickAddModalVisible}
        onCancel={() => setIsQuickAddModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={420}
      >
        <Form
          form={quickAddForm}
          layout="vertical"
          onFinish={handleQuickAddSubmit}
          size="large"
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề sự kiện"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề sự kiện!' }]}
          >
            <Input placeholder="Ví dụ: Học React, Tập thể dục..." autoFocus style={{ borderRadius: '6px' }} />
          </Form.Item>

          <Form.Item
            name="range"
            label="Thời gian (Bắt đầu - Kết thúc)"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian!' }]}
          >
            <DatePicker.RangePicker
              showTime={{ format: 'HH:mm' }}
              format="HH:mm YYYY-MM-DD"
              style={{ width: '100%', borderRadius: '6px' }}
              placeholder={['Bắt đầu', 'Kết thúc']}
            />
          </Form.Item>

          <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '20px', background: '#fafafa', padding: '8px 12px', borderRadius: '6px' }}>
            💡 Mặc định sự kiện tạo nhanh sẽ có danh mục là <strong>{categoriesList[0]?.name || 'Học tập'}</strong>, mức ưu tiên là <strong>Trung bình</strong>. Nhấn <strong>Enter</strong> trong ô tiêu đề để lưu nhanh.
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsQuickAddModalVisible(false)} style={{ borderRadius: '6px' }}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ borderRadius: '6px' }}>Tạo mới</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⌨️</span>
            <span>Phím tắt hệ thống</span>
          </div>
        }
        open={isHelpModalVisible}
        onCancel={() => setIsHelpModalVisible(false)}
        footer={null}
        destroyOnHidden
        width={460}
      >
        <div style={{ marginTop: '16px' }}>
          <p style={{ color: '#8c8c8c', marginBottom: '20px' }}>
            Sử dụng phím tắt để thao tác và chuyển đổi các chế độ xem nhanh chóng. Các phím tắt sẽ tự động vô hiệu hóa khi bạn đang nhập liệu.
          </p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {isAdmin && (
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <Tag color="blue"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>N</kbd></Tag>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 500 }}>Tạo nhanh sự kiện mới (Quick Add)</td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px', width: '80px' }}>
                  <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>T</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>Nhảy về ngày hôm nay</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>D</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>Chuyển sang xem Ngày (Day View)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>W</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>Chuyển sang xem Tuần (Week View)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>M</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>Chuyển sang xem Tháng (Month View)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>/</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>Đưa con trỏ vào ô tìm kiếm từ khóa</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="default"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Esc</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>Đóng modal / popup đang hiển thị</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="warning"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>?</kbd> hoặc <kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Shift + /</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>Mở bảng phím tắt này</td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Button type="primary" onClick={() => setIsHelpModalVisible(false)} style={{ borderRadius: '6px' }}>Đóng</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
