import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Badge, Modal, Form, Input, DatePicker, Select, Button, message, notification, Space, Tag, Tooltip, List, ColorPicker, Popconfirm, Spin, Popover } from 'antd';
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
  DownloadOutlined,
  FilePdfOutlined,
  FilterOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { PomodoroModal } from './PomodoroModal';
import { useTranslation } from 'react-i18next';

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
  onUpdate: (id: string, data: Partial<CreateScheduleInput> & { force?: boolean; recurrenceEditMode?: 'all' | 'current' | 'future'; instanceDate?: string }) => Promise<void>;
  onDelete: (id: string, deleteMode?: 'all' | 'current' | 'future') => Promise<void>;
  onPatchTime?: (id: string, startTime: string, endTime: string, recurrenceEditMode?: 'all' | 'current' | 'future') => Promise<void>;
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
  const { t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [pomodoroInitialEvent, setPomodoroInitialEvent] = useState<{ id?: string; title: string; category?: string } | undefined>(undefined);
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
      message.error(t('calendar.categoryNameRequired'));
      return;
    }
    try {
      if (editingCatId) {
        await updateCategory(editingCatId, {
          name: newCatName.trim(),
          color: newCatColor,
          icon: newCatIcon,
        });
        message.success(t('calendar.updateCategorySuccess'));
        setEditingCatId(null);
      } else {
        await createCategory({
          name: newCatName.trim(),
          color: newCatColor,
          icon: newCatIcon,
        });
        message.success(t('calendar.createCategorySuccess'));
      }
      setNewCatName('');
      setNewCatColor('#1890ff');
      setNewCatIcon('📌');
      loadCategories();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('calendar.categoryActionError'));
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
      message.success(t('calendar.deleteCategorySuccess'));
      if (editingCatId === id) {
        handleCancelEditCategory();
      }
      loadCategories();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('calendar.deleteCategoryError'));
    }
  };

  const handleOpenQuickAddModal = () => {
    setIsQuickAddModalVisible(true);
    const start = dayjs().add(1, 'hour').minute(0).second(0);
    const end = start.clone().add(1, 'hour');
    setTimeout(() => {
      quickAddForm.setFieldsValue({
        title: '',
        range: [start, end],
      });
    }, 0);
  };

  const handleQuickAddSubmit = async () => {
    try {
      const values = await quickAddForm.validateFields();
      const [startDayjs, endDayjs] = values.range;

      if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
        message.error(t('calendar.startTimeBeforeEndTime'));
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
        message.success(forceOption ? t('calendar.quickAddSuccessForce') : t('calendar.quickAddSuccess'));
        setIsQuickAddModalVisible(false);
      };

      try {
        await executeSave(false);
      } catch (err: any) {
        if (err.response && err.response.status === 409 && err.response.data && err.response.data.conflicts) {
          // Display conflict confirmation modal
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

  // Keyboard Shortcuts (N: Quick Add, T: Today, D: Day, W: Week, M: Month, /: Focus Search, Esc: Close, ?: Help)
  useHotkeys('n', (e) => {
    e.preventDefault();
    if (!isModalVisible && !isQuickAddModalVisible && !isCategoryModalVisible && !isHelpModalVisible) {
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
  const [recurrenceEditMode, setRecurrenceEditMode] = useState<'all' | 'current' | 'future'>('all');

  // Switch modal to Edit mode
  const handleSwitchToEdit = (mode: 'all' | 'current' | 'future') => {
    if (!selectedEvent) return;
    setModalMode('edit');
    setRecurrenceEditMode(mode);

    setTimeout(() => {
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
    }, 0);
  };

  // Handle Form Submit (Create or Update)
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

      const inputData: CreateScheduleInput & {
        recurrence?: any;
        recurrenceEditMode?: 'all' | 'current' | 'future';
        instanceDate?: string;
      } = {
        title: values.title.trim(),
        description: values.description ? values.description.trim() : '',
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
          message.success(forceOption ? t('calendar.createSuccessForce') : t('calendar.createSuccess'));
        } else if (modalMode === 'edit' && selectedEvent) {
          const payload = {
            ...inputData,
            force: forceOption,
            recurrenceEditMode,
            instanceDate: (recurrenceEditMode === 'current' || recurrenceEditMode === 'future') ? selectedEvent.startTime : undefined,
          };
          await onUpdate(selectedEvent._id, payload);
          message.success(forceOption ? t('calendar.updateSuccessForce') : t('calendar.updateSuccess'));
        }
        setIsModalVisible(false);
      };

      try {
        await executeSave(false);
      } catch (err: any) {
        if (err.response && err.response.status === 409 && err.response.data && err.response.data.conflicts) {
          // Display conflict confirmation modal
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

  const handleRecurrenceChoiceAction = async (mode: 'all' | 'current' | 'future') => {
    setIsRecurrenceChoiceVisible(false);
    if (recurrenceActionType === 'edit') {
      handleSwitchToEdit(mode);
    } else {
      await handleDeleteAction(mode);
    }
  };

  // Handle Event Delete Action
  const handleDeleteAction = async (mode: 'all' | 'current' | 'future') => {
    if (!selectedEvent) return;
    try {
      await onDelete(selectedEvent._id, mode);
      message.success(
        mode === 'current'
          ? t('calendar.deleteSuccessCurrent')
          : mode === 'future'
          ? t('calendar.deleteSuccessFuture')
          : t('calendar.deleteSuccessAll')
      );
      setIsModalVisible(false);
    } catch (err) {
      message.error(t('calendar.deleteError'));
    }
  };

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
    setModalMode('create');
    setSelectedEvent(null);
    setIsModalVisible(true);

    const initialStart = date ? date.clone().hour(9).minute(0).second(0) : dayjs().hour(9).minute(0).second(0);
    const initialEnd = date ? date.clone().hour(10).minute(0).second(0) : dayjs().hour(10).minute(0).second(0);

    setTimeout(() => {
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
    }, 0);
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

    let start = dayjs(selectInfo.start);
    let end = dayjs(selectInfo.end);

    if (selectInfo.allDay) {
      start = start.hour(9).minute(0).second(0);
      end = start.clone().hour(10).minute(0).second(0);
    }

    setModalMode('create');
    setSelectedEvent(null);
    setIsModalVisible(true);

    setTimeout(() => {
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
    }, 0);

    selectInfo.view.calendar.unselect();
  };

  // Handle view change or date navigate -> Reload schedules for active date range
  const handleDatesSet = (dateInfo: any) => {
    const startIso = dateInfo.start.toISOString();
    const endIso = dateInfo.end.toISOString();

    if (!currentRange || currentRange.start !== startIso || currentRange.end !== endIso) {
      const range = { start: startIso, end: endIso };
      setCurrentRange(range);
      setTimeout(() => {
        triggerFilterChange(keyword, categories, priority, range);
      }, 0);
    }
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

  const filterPopoverContent = (
    <div style={{ width: 280, padding: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>
          <FilterOutlined style={{ color: '#1890ff' }} />
          <span>{t('calendar.filterTitle')}</span>
        </div>
        {activeFilterCount > 0 && (
          <Button
            type="link"
            danger
            size="small"
            onClick={handleClearFilters}
            style={{ padding: 0, fontSize: '12px' }}
          >
            {t('calendar.clearFilters')}
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.keyword')}</div>
          <Input
            ref={searchInputRef}
            placeholder={t('calendar.keywordPlaceholder')}
            value={keyword}
            onChange={handleKeywordChange}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            allowClear
            size="small"
            style={{ borderRadius: '6px' }}
          />
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.category')}</div>
          <Select
            mode="multiple"
            placeholder={t('calendar.category')}
            value={categories}
            onChange={handleCategoriesChange}
            style={{ width: '100%' }}
            size="small"
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
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.priority')}</div>
          <Select
            mode="multiple"
            placeholder={t('calendar.priority')}
            value={priority}
            onChange={handlePriorityChange}
            style={{ width: '100%' }}
            size="small"
            maxTagCount="responsive"
            allowClear
          >
            <Option value="low">{t('calendar.priorityLow')}</Option>
            <Option value="medium">{t('calendar.priorityMedium')}</Option>
            <Option value="high">{t('calendar.priorityHigh')}</Option>
          </Select>
        </div>

        {isAdmin && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#595959', marginBottom: '4px' }}>{t('calendar.creator')}</div>
            <Select
              placeholder={t('calendar.creator')}
              value={selectedCreator}
              onChange={handleCreatorChange}
              style={{ width: '100%' }}
              size="small"
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
      </div>
    </div>
  );

  return (
    <div>
      <style>{customStyles}</style>

      {/* Single-Row Consolidated Toolbar */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: '20px', lineHeight: 1.2 }}>{t('calendar.title')}</h2>
          </div>

          {/* Compact Filter Popover Button */}
          <Popover content={filterPopoverContent} trigger="click" placement="bottomLeft">
            <Badge count={activeFilterCount} overflowCount={99} size="small">
              <Button
                icon={<FilterOutlined style={{ color: activeFilterCount > 0 ? '#1890ff' : undefined }} />}
                style={{ borderRadius: '6px', fontWeight: 500 }}
              >
                {t('calendar.filterTitle')}
              </Button>
            </Badge>
          </Popover>

          {/* Quick Shortcuts Trigger Tag */}
          <Tooltip title="Nhấn ? để mở danh sách phím tắt">
            <Tag
              color="blue"
              style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: '6px', margin: 0, fontSize: '12px' }}
              onClick={() => setIsHelpModalVisible(true)}
            >
              <kbd>?</kbd> Phím tắt
            </Tag>
          </Tooltip>
        </div>

        <Space wrap size="small">
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportIcs}
            style={{ borderRadius: '6px' }}
          >
            {t('calendar.exportIcs')}
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={handleExportPdf}
            style={{ borderRadius: '6px' }}
          >
            {t('calendar.exportPdf')}
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsCategoryModalVisible(true)} style={{ borderRadius: '6px' }}>
              {t('calendar.manageCategories')}
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenCreateModal()}
            style={{ borderRadius: '6px' }}
          >
            {t('calendar.createEvent')}
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={handleOpenQuickAddModal}
            style={{ borderRadius: '6px' }}
          >
            Quick Add
          </Button>
        </Space>
      </div>

      {/* FullCalendar Component Container with Stabilized Height */}
      <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0', position: 'relative', minHeight: '650px' }}>
        <Spin spinning={loading} tip={t('common.loading') || 'Đang tải...'}>
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
              today: t('calendar.today'),
              month: t('calendar.monthView'),
              week: t('calendar.weekView'),
              day: t('calendar.dayView'),
              list: t('common.all'),
            }}
            allDaySlot={false}
            firstDay={1}
            editable={true}
            eventStartEditable={true}
            eventDurationEditable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            nowIndicator={true}
            events={events}
            eventClick={handleEventClick}
            eventDrop={handleEventChange}
            eventResize={handleEventChange}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            height="auto"
          />
        </Spin>
      </div>

      {/* Recurrence Choice Confirmation Dialog */}
      <Modal
        title={t('calendar.recurrenceActionTitle')}
        open={isRecurrenceChoiceVisible}
        onCancel={() => setIsRecurrenceChoiceVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <p style={{ marginBottom: '20px' }}>
          {t('calendar.recurrenceActionSub')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button onClick={() => handleRecurrenceChoiceAction('current')}>
            {t('calendar.recurrenceActionCurrent')}
          </Button>
          <Button type="default" style={{ borderColor: '#1890ff', color: '#1890ff' }} onClick={() => handleRecurrenceChoiceAction('future')}>
            {t('calendar.recurrenceActionFuture')}
          </Button>
          <Button type="primary" onClick={() => handleRecurrenceChoiceAction('all')}>
            {t('calendar.recurrenceActionAll')}
          </Button>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        title={t('calendar.manageCategories')}
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
            ? t('calendar.eventDetails')
            : modalMode === 'create'
            ? t('calendar.createEventTitle')
            : t('calendar.editEventTitle')
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <Button
                type="default"
                danger
                icon={<FireOutlined />}
                onClick={() => {
                  setPomodoroInitialEvent({
                    id: selectedEvent._id,
                    title: selectedEvent.title,
                    category: selectedEvent.category,
                  });
                  setIsModalVisible(false);
                  setIsPomodoroOpen(true);
                }}
                style={{ borderRadius: '6px' }}
              >
                Tập trung (Pomodoro)
              </Button>

              {(() => {
                const currentUserId = (() => { try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u._id; } catch { return null; } })();
                const eventCreatorId = (selectedEvent?.createdBy as any)?._id || selectedEvent?.createdBy;
                const canModifyEvent = isAdmin || (currentUserId && eventCreatorId && currentUserId.toString() === eventCreatorId.toString());
                return canModifyEvent ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
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
                ) : null;
              })()}
            </div>
          </div>
        )}

        {(modalMode === 'create' || modalMode === 'edit') && (
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
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setIsCategoryModalVisible(true)}
                    style={{ padding: 0 }}
                  >
                    {t('calendar.manageCategoriesBtn')}
                  </Button>
                </div>
              }
              rules={[{ required: true, message: t('calendar.categoryRequired') }]}
            >
              <Select placeholder={t('calendar.selectCategoryPlaceholder')}>
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
                <Button onClick={() => setIsModalVisible(false)}>{t('common.cancel')}</Button>
                <Button type="primary" htmlType="submit">
                  {modalMode === 'create' ? t('calendar.createNew') : t('calendar.saveChanges')}
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
            <span>{t('calendar.quickAddTitle')}</span>
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
          preserve={false}
          layout="vertical"
          onFinish={handleQuickAddSubmit}
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
            name="range"
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
            {t('calendar.quickAddHelp', { category: categoriesList[0]?.name || 'Học tập', priority: t('calendar.priorityMedium') })}
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsQuickAddModalVisible(false)} style={{ borderRadius: '6px' }}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" style={{ borderRadius: '6px' }}>{t('calendar.createNew')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⌨️</span>
            <span>{t('calendar.shortcutsHelpTitle')}</span>
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
              <tr>
                <td style={{ padding: '12px 8px' }}>
                  <Tag color="warning"><kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>?</kbd> hoặc <kbd style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>Shift + /</kbd></Tag>
                </td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{t('calendar.shortcutOpenHelp')}</td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Button type="primary" onClick={() => setIsHelpModalVisible(false)} style={{ borderRadius: '6px' }}>{t('common.close')}</Button>
          </div>
        </div>
      </Modal>

      {/* Pomodoro Focus Timer Modal */}
      <PomodoroModal
        open={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
        initialEvent={pomodoroInitialEvent}
      />
    </div>
  );
};
