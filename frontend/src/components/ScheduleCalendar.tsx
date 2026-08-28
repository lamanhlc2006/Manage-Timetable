import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Form, Button, message, notification, Space, Tag, Tooltip, Spin } from 'antd';
import dayjs from 'dayjs';
import { useHotkeys } from 'react-hotkeys-hook';
import { ScheduleEvent, CreateScheduleInput, patchScheduleTime } from '../services/scheduleService';
import {
  fetchCategories,
  CategoryItem,
} from '../services/categoryService';
import { fetchTags, TagItem } from '../services/tagService';
import { fetchUsers } from '../services/userService';
import { DEFAULT_CATEGORY } from '../constants';
import {
  PlusOutlined,
  DownloadOutlined,
  BarChartOutlined,
  ShareAltOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { PomodoroModal } from './PomodoroModal';
import { TimelineView } from './TimelineView';
import { TagFilterBar } from './TagFilterBar';
import { IcsImportModal } from './IcsImportModal';
const ShareCalendarModal = React.lazy(() => import('./ShareCalendarModal'));
const TemplateModal = React.lazy(() => import('./TemplateModal'));
import { ExportModal } from './ExportModal';
import { useTranslation } from 'react-i18next';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

// Extracted sub-components
import { CalendarFilterPopover } from './CalendarFilterPopover';
import { CategoryManagementModal } from './CategoryManagementModal';
import { EventDetailModal } from './EventDetailModal';
import { EventFormModal } from './EventFormModal';
import { QuickAddModal } from './QuickAddModal';
import { RecurrenceChoiceModal } from './RecurrenceChoiceModal';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';

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
    status?: string[];
    tags?: string[];
    startTime?: string;
    endTime?: string;
    creator?: string;
  }) => void;
  readOnly?: boolean;
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
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const calendarRef = useRef<FullCalendar>(null);
  const searchInputRef = useRef<any>(null);
  const [form] = Form.useForm();

  // Modal visibility states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [pomodoroInitialEvent, setPomodoroInitialEvent] = useState<{ id?: string; title: string; category?: string } | undefined>(undefined);
  const [isQuickAddModalVisible, setIsQuickAddModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);

  // Recurrence action dialog states
  const [isRecurrenceChoiceVisible, setIsRecurrenceChoiceVisible] = useState(false);
  const [recurrenceActionType, setRecurrenceActionType] = useState<'edit' | 'delete'>('edit');
  const [recurrenceEditMode, setRecurrenceEditMode] = useState<'all' | 'current' | 'future'>('all');

  // Data states
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [tagsList, setTagsList] = useState<TagItem[]>([]);
  const [usersList, setUsersList] = useState<{ _id: string; username: string }[]>([]);
  const [currentRange, setCurrentRange] = useState<{ start: string; end: string } | null>(null);

  // Load users for admin filter
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

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchCategories();
      setCategoriesList(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load tags
  const loadTags = useCallback(async () => {
    try {
      const tagsData = await fetchTags();
      setTagsList(tagsData);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // ============ Keyboard Shortcuts ============
  useHotkeys('n', (e) => {
    e.preventDefault();
    if (!isModalVisible && !isQuickAddModalVisible && !isCategoryModalVisible && !isHelpModalVisible) {
      handleOpenQuickAddModal();
    }
  }, { enableOnFormTags: false });

  useHotkeys('t', () => { calendarRef.current?.getApi().today(); }, { enableOnFormTags: false });
  useHotkeys('d', () => { calendarRef.current?.getApi().changeView('timeGridDay'); }, { enableOnFormTags: false });
  useHotkeys('w', () => { calendarRef.current?.getApi().changeView('timeGridWeek'); }, { enableOnFormTags: false });
  useHotkeys('m', () => { calendarRef.current?.getApi().changeView('dayGridMonth'); }, { enableOnFormTags: false });

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

  // --- New shortcuts (Task 2.4) ---
  useHotkeys('e', (e) => {
    e.preventDefault();
    if (selectedEvent && isModalVisible && modalMode === 'view') {
      handleEditInitiate();
    }
  }, { enableOnFormTags: false });

  useHotkeys('delete, backspace', (e) => {
    e.preventDefault();
    if (selectedEvent && isModalVisible && modalMode === 'view') {
      handleDeleteInitiate();
    }
  }, { enableOnFormTags: false });

  useHotkeys('enter', (e) => {
    // Only trigger when no modal is open (to avoid interfering with form submit)
    if (!isModalVisible && !isQuickAddModalVisible && selectedEvent) {
      e.preventDefault();
      setModalMode('view');
      setIsModalVisible(true);
    }
  }, { enableOnFormTags: false });

  useHotkeys('left', (e) => {
    if (!isModalVisible && !isQuickAddModalVisible) {
      e.preventDefault();
      calendarRef.current?.getApi().prev();
    }
  }, { enableOnFormTags: false });

  useHotkeys('right', (e) => {
    if (!isModalVisible && !isQuickAddModalVisible) {
      e.preventDefault();
      calendarRef.current?.getApi().next();
    }
  }, { enableOnFormTags: false });

  useHotkeys('ctrl+f, meta+f', (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  }, { enableOnFormTags: true });

  useHotkeys('l', () => {
    if (!isModalVisible && !isQuickAddModalVisible) {
      calendarRef.current?.getApi().changeView('listWeek');
    }
  }, { enableOnFormTags: false });

  // ============ Map Schedules to FullCalendar Events ============
  // Detect overlapping events for visual conflict highlighting
  const conflictIds = new Set<string>();
  for (let i = 0; i < schedules.length; i++) {
    const a = schedules[i];
    const aStart = new Date(a.startTime).getTime();
    const aEnd = new Date(a.endTime).getTime();
    for (let j = i + 1; j < schedules.length; j++) {
      const b = schedules[j];
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      if (aStart < bEnd && aEnd > bStart) {
        conflictIds.add(a._id);
        conflictIds.add(b._id);
      }
    }
  }

  const events = schedules.map((schedule) => ({
    id: schedule._id,
    title: schedule.status === 'completed' ? `✅ ${schedule.title}` : schedule.title,
    start: schedule.startTime,
    end: schedule.endTime,
    backgroundColor: schedule.isException ? `${schedule.color}44` : `${schedule.color}22`,
    borderColor: conflictIds.has(schedule._id) ? '#f5222d' : schedule.color,
    textColor: '#262626',
    classNames: conflictIds.has(schedule._id) ? ['fc-event-conflict'] : [],
    allDay: schedule.isAllDay || false,
    extendedProps: {
      description: schedule.description,
      category: schedule.category,
      tags: schedule.tags || [],
      priority: schedule.priority,
      status: schedule.status,
      createdBy: schedule.createdBy,
      color: schedule.color,
      recurrence: schedule.recurrence,
      isException: schedule.isException,
      parentEvent: schedule.parentEvent,
      reminderMinutes: schedule.reminderMinutes,
      hasConflict: conflictIds.has(schedule._id),
    },
  }));

  // ============ Event Handlers ============
  const handleOpenQuickAddModal = () => {
    setIsQuickAddModalVisible(true);
  };

  const handleQuickAddSubmit = async (values: { title: string; rangeTime: [dayjs.Dayjs, dayjs.Dayjs] }) => {
    const [start, end] = values.rangeTime;
    const inputData: CreateScheduleInput & { force?: boolean } = {
      title: values.title.trim(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      color: '#1890ff',
      category: categoriesList[0]?.name || DEFAULT_CATEGORY,
      tags: [],
      priority: 'medium',
    };

    const executeSave = async (force = false) => {
      await onCreate({ ...inputData, force });
      message.success(force ? t('calendar.createSuccessForce') : t('calendar.createSuccess'));
      setIsQuickAddModalVisible(false);
    };

    try {
      await executeSave(false);
    } catch (err: any) {
      if (err.response?.status === 409 && err.response.data?.conflicts) {
        Modal.warning({
          title: t('calendar.conflictWarningTitle'),
          content: (
            <div>
              <p>{t('calendar.conflictBlockedMsg', 'Không thể tạo sự kiện vì bị trùng lịch với:')}</p>
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
              <p style={{ marginTop: '12px', color: '#666' }}>
                {t('calendar.conflictBlockedHint', 'Vui lòng chọn khung giờ khác để tránh trùng lịch.')}
              </p>
            </div>
          ),
          okText: t('common.understood', 'Đã hiểu'),
        });
      } else {
        message.error(err.response?.data?.message || 'Đã xảy ra lỗi.');
      }
    }
  };

  const handleOpenViewModal = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setModalMode('view');
    setIsModalVisible(true);
  };

  const handleOpenCreateModal = (date?: dayjs.Dayjs) => {
    setModalMode('create');
    setSelectedEvent(null);
    setIsModalVisible(true);

    const initialStart = date ? date.clone().hour(9).minute(0).second(0) : dayjs().hour(9).minute(0).second(0);
    const initialEnd = date ? date.clone().hour(10).minute(0).second(0) : dayjs().hour(10).minute(0).second(0);

    setTimeout(() => {
      form.setFieldsValue({
        title: '', description: '', color: '#1890ff',
        range: [initialStart, initialEnd],
        category: categoriesList[0]?.name || DEFAULT_CATEGORY,
        tags: [], priority: 'medium',
        recurrenceType: 'none', recurrenceInterval: 1,
        recurrenceDaysOfWeek: [], recurrenceEndDate: null,
        reminderMinutes: 15,
      });
    }, 0);
  };

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
        category: selectedEvent.category || DEFAULT_CATEGORY,
        tags: selectedEvent.tags || [],
        priority: selectedEvent.priority || 'medium',
        recurrenceType: selectedEvent.recurrence?.type || 'none',
        recurrenceInterval: selectedEvent.recurrence?.interval || 1,
        recurrenceDaysOfWeek: selectedEvent.recurrence?.daysOfWeek || [],
        recurrenceEndDate: selectedEvent.recurrence?.endDate ? dayjs(selectedEvent.recurrence.endDate) : null,
        reminderMinutes: selectedEvent.reminderMinutes !== undefined ? selectedEvent.reminderMinutes : null,
      });
    }, 0);
  };

  // Form submit for Create/Edit
  const handleFormSubmit = async (values: any, mode: 'create' | 'edit') => {
    const [startDayjs, endDayjs] = values.range;
    if (startDayjs.isAfter(endDayjs) || startDayjs.isSame(endDayjs)) {
      message.error(t('calendar.startTimeBeforeEndTime'));
      return;
    }

    const recurrenceType = values.recurrenceType;
    const recurrenceEndType = values.recurrenceEndType || 'never';
    const recurrence =
      recurrenceType && recurrenceType !== 'none'
        ? {
            type: recurrenceType,
            interval: values.recurrenceInterval || 1,
            daysOfWeek: (recurrenceType === 'weekly' || recurrenceType === 'custom') ? values.recurrenceDaysOfWeek : undefined,
            endDate: recurrenceEndType === 'endDate' && values.recurrenceEndDate ? values.recurrenceEndDate.toISOString() : undefined,
            count: recurrenceEndType === 'count' && values.recurrenceCount ? values.recurrenceCount : undefined,
          }
        : undefined;

    const inputData: CreateScheduleInput & { recurrence?: any; recurrenceEditMode?: string; instanceDate?: string } = {
      title: values.title.trim(),
      description: values.description ? values.description.trim() : '',
      startTime: startDayjs.toISOString(),
      endTime: endDayjs.toISOString(),
      color: values.color,
      category: values.category,
      tags: values.tags,
      priority: values.priority,
      recurrence,
      isAllDay: values.isAllDay || false,
      reminderMinutes: values.reminderMinutes !== undefined ? values.reminderMinutes : null,
    };

    const executeSave = async (force = false) => {
      if (mode === 'create') {
        await onCreate({ ...inputData, force });
        message.success(force ? t('calendar.createSuccessForce') : t('calendar.createSuccess'));
      } else if (selectedEvent) {
        const payload = {
          ...inputData, force,
          recurrenceEditMode,
          instanceDate: (recurrenceEditMode === 'current' || recurrenceEditMode === 'future') ? selectedEvent.startTime : undefined,
        };
        await onUpdate(selectedEvent._id, payload);
        message.success(force ? t('calendar.updateSuccessForce') : t('calendar.updateSuccess'));
      }
      setIsModalVisible(false);
    };

    try {
      await executeSave(false);
    } catch (err: any) {
      if (err.response?.status === 409 && err.response.data?.conflicts) {
        Modal.warning({
          title: t('calendar.conflictWarningTitle'),
          content: (
            <div>
              <p>{t('calendar.conflictBlockedMsg', 'Không thể lưu sự kiện vì bị trùng lịch với:')}</p>
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
              <p style={{ marginTop: '12px', color: '#666' }}>
                {t('calendar.conflictBlockedHint', 'Vui lòng chọn khung giờ khác để tránh trùng lịch.')}
              </p>
            </div>
          ),
          okText: t('common.understood', 'Đã hiểu'),
        });
      } else {
        throw err;
      }
    }
  };

  // Recurrence action handlers
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

  const handleToggleStatus = async (eventId: string, newStatus: 'pending' | 'completed') => {
    try {
      const isVirtual = eventId.includes('_');
      const event = selectedEvent;
      const isRecurring = event?.recurrence && event.recurrence.type !== 'none';

      if (isVirtual || isRecurring) {
        // Recurring event: only update the current instance, not all
        await onUpdate(eventId, {
          status: newStatus,
          recurrenceEditMode: 'current',
          instanceDate: event?.startTime,
          force: true,
        } as any);
      } else {
        // Non-recurring event: update directly
        await onUpdate(eventId, { status: newStatus, force: true } as any);
      }

      message.success(
        newStatus === 'completed' ? t('calendar.statusCompleted') : t('calendar.statusPending')
      );
      setIsModalVisible(false);
    } catch (err) {
      console.error('Toggle status error:', err);
      message.error(t('common.error'));
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

  const handleDeleteAction = async (mode: 'all' | 'current' | 'future') => {
    if (!selectedEvent) return;
    try {
      await onDelete(selectedEvent._id, mode);
      message.success(
        mode === 'current' ? t('calendar.deleteSuccessCurrent')
          : mode === 'future' ? t('calendar.deleteSuccessFuture')
          : t('calendar.deleteSuccessAll')
      );
      setIsModalVisible(false);
    } catch (err) {
      message.error(t('calendar.deleteError'));
    }
  };

  // ============ FullCalendar Event Handlers ============
  const handleEventClick = (clickInfo: any) => {
    const extended = clickInfo.event.extendedProps;
    const rawTitle = clickInfo.event.title;
    const schedule: ScheduleEvent = {
      _id: clickInfo.event.id,
      title: rawTitle.startsWith('✅ ') ? rawTitle.slice(2).trim() : rawTitle,
      startTime: clickInfo.event.startStr,
      endTime: clickInfo.event.endStr,
      color: extended.color,
      description: extended.description,
      category: extended.category,
      tags: extended.tags || [],
      priority: extended.priority,
      status: extended.status,
      createdBy: extended.createdBy,
      recurrence: extended.recurrence,
      isException: extended.isException,
      parentEvent: extended.parentEvent,
      reminderMinutes: extended.reminderMinutes,
      createdAt: '', updatedAt: '',
    };
    handleOpenViewModal(schedule);
  };

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
        title: '', description: '', color: '#1890ff',
        range: [start, end],
        category: categoriesList[0]?.name || DEFAULT_CATEGORY,
        tags: [], priority: 'medium',
        recurrenceType: 'none', recurrenceInterval: 1,
        recurrenceDaysOfWeek: [], recurrenceEndDate: null,
        reminderMinutes: 15,
      });
    }, 0);
    selectInfo.view.calendar.unselect();
  };

  const handleDatesSet = (dateInfo: any) => {
    const startIso = dateInfo.start.toISOString();
    const endIso = dateInfo.end.toISOString();
    if (!currentRange || currentRange.start !== startIso || currentRange.end !== endIso) {
      const range = { start: startIso, end: endIso };
      setCurrentRange(range);
      setTimeout(() => {
        onFilterChange({ startTime: range.start, endTime: range.end });
      }, 0);
    }
  };

  const handleEventChange = async (changeInfo: any) => {
    if (!isAdmin) { changeInfo.revert(); return; }
    const { event, revert, oldEvent } = changeInfo;
    const eventId = event.id;
    const startIso = event.start ? event.start.toISOString() : event.startStr;
    let endIso = event.end ? event.end.toISOString() : event.endStr;
    if (!endIso && event.start) { endIso = dayjs(event.start).add(1, 'hour').toISOString(); }
    const prevStartIso = oldEvent?.start ? oldEvent.start.toISOString() : oldEvent?.startStr;
    const prevEndIso = oldEvent?.end ? oldEvent.end.toISOString() : oldEvent?.endStr;
    const isVirtualInstance = eventId.includes('_');
    const editMode = isVirtualInstance ? 'current' : undefined;

    try {
      if (onPatchTime) {
        await onPatchTime(eventId, startIso, endIso, editMode);
      } else {
        await patchScheduleTime(eventId, { startTime: startIso, endTime: endIso, recurrenceEditMode: editMode });
      }
      const notifKey = `undo_drag_${eventId}_${Date.now()}`;
      notification.info({
        key: notifKey,
        message: 'Đã di chuyển lịch trình',
        description: 'Thời gian sự kiện đã được cập nhật thành công.',
        duration: 5,
        btn: (
          <Button type="primary" size="small" onClick={async () => {
            notification.destroy(notifKey);
            if (prevStartIso && prevEndIso) {
              try {
                if (onPatchTime) { await onPatchTime(eventId, prevStartIso, prevEndIso, editMode); }
                else { await patchScheduleTime(eventId, { startTime: prevStartIso, endTime: prevEndIso, recurrenceEditMode: editMode }); }
                message.success('Đã hoàn tác di chuyển lịch trình!');
              } catch { revert(); message.error('Không thể hoàn tác.'); }
            } else { revert(); }
          }}>Hoàn tác</Button>
        ),
      });
    } catch (err: any) {
      revert();
      if (err.response?.status === 409) { message.error('Phát hiện trùng lịch trình! Sự kiện đã được khôi phục về vị trí cũ.'); }
      else if (err.response?.data?.message) { message.error(`Không thể cập nhật: ${err.response.data.message}`); }
      else { message.error('Lỗi cập nhật thời gian sự kiện. Đã khôi phục vị trí cũ.'); }
    }
  };

  // ============ Custom CSS ============
  const customStyles = `
    .fc { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; font-size: 13.5px !important; }
    .fc .fc-toolbar { margin-bottom: 20px !important; }
    .fc .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 700 !important; color: #1f2937 !important; }
    .fc .fc-button-primary { background-color: #ffffff !important; border: 1px solid #d9d9d9 !important; color: #1f2937 !important; font-weight: 500 !important; border-radius: 6px !important; transition: all 0.2s !important; }
    .fc .fc-button-primary:hover { border-color: #1890ff !important; color: #1890ff !important; }
    .fc .fc-button-primary.fc-button-active, .fc .fc-button-primary:active { background-color: #1890ff !important; border-color: #1890ff !important; color: white !important; }
    .fc .fc-daygrid-day:hover { background: #fafafa !important; }
    .fc .fc-event { border-radius: 4px !important; border-left-width: 3px !important; padding: 2px 4px !important; cursor: pointer !important; transition: transform 0.1s ease, box-shadow 0.1s ease !important; }
    .fc .fc-event:hover { transform: scale(1.02); box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important; }
    .fc .fc-now-indicator { border: none !important; background: linear-gradient(90deg, #ff4d4f 0%, transparent 100%) !important; height: 2px !important; }
    .fc .fc-list-event:hover td { background-color: #e6f7ff !important; }
    .fc .fc-day-today { background-color: #e6f7ff22 !important; }
  `;

  // Tag filter bar handlers
  const handleToggleTagFilter = useCallback((tagName: string) => {
    setActiveTagFilters((prev) => {
      const next = prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName];
      onFilterChange({
        tags: next.length > 0 ? next : undefined,
        startTime: currentRange?.start || undefined,
        endTime: currentRange?.end || undefined,
      });
      return next;
    });
  }, [onFilterChange, currentRange]);

  const handleClearTagFilters = useCallback(() => {
    setActiveTagFilters([]);
    onFilterChange({
      tags: undefined,
      startTime: currentRange?.start || undefined,
      endTime: currentRange?.end || undefined,
    });
  }, [onFilterChange, currentRange]);

  // ============ Render ============
  return (
    <div>
      <style>{customStyles}</style>

      {/* Consolidated Toolbar */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: '20px', lineHeight: 1.2 }}>{t('calendar.title')}</h2>

          <CalendarFilterPopover
            isAdmin={isAdmin}
            categoriesList={categoriesList}
            tagsList={tagsList}
            usersList={usersList}
            onFilterChange={onFilterChange}
            currentRange={currentRange}
            searchInputRef={searchInputRef}
          />

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
          <Button icon={<DownloadOutlined />} onClick={() => setIsImportModalVisible(true)} style={{ borderRadius: '6px' }}>
            Import .ics
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => setIsExportModalVisible(true)} style={{ borderRadius: '6px' }}>
            Xuất dữ liệu
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsCategoryModalVisible(true)} style={{ borderRadius: '6px' }}>
              {t('calendar.manageCategories')}
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreateModal()} style={{ borderRadius: '6px' }}>
            {t('calendar.createEvent')}
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleOpenQuickAddModal} style={{ borderRadius: '6px' }}>
            Quick Add
          </Button>
          <Button
            icon={<BarChartOutlined />}
            type={showTimeline ? 'primary' : 'default'}
            onClick={() => setShowTimeline(!showTimeline)}
            style={{ borderRadius: '6px' }}
          >
            Timeline
          </Button>
          <Button
            icon={<ShareAltOutlined />}
            onClick={() => setShowShareModal(true)}
            style={{ borderRadius: '6px' }}
          >
            {t('share.shareButton', 'Chia sẻ')}
          </Button>
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => setShowTemplateModal(true)}
            style={{ borderRadius: '6px' }}
          >
            {t('template.button', 'Templates')}
          </Button>
        </Space>
      </div>

      {/* Tag Filter Bar */}
      <TagFilterBar
        tagsList={tagsList}
        activeTags={activeTagFilters}
        onToggleTag={handleToggleTagFilter}
        onClearAll={handleClearTagFilters}
      />

      {/* Calendar / Timeline */}
      {showTimeline ? (
        <TimelineView
          schedules={schedules}
          onEventClick={(evt) => {
            setSelectedEvent(evt);
            setIsDetailModalVisible(true);
          }}
        />
      ) : (
      <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0', position: 'relative', minHeight: '650px' }}>
        <Spin spinning={loading} tip={t('common.loading') || 'Đang tải...'}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
            buttonText={{ today: t('calendar.today'), month: t('calendar.monthView'), week: t('calendar.weekView'), day: t('calendar.dayView'), list: t('common.all') }}
            allDaySlot={true}
            allDayText="Cả ngày"
            firstDay={1}
            editable={!readOnly}
            eventStartEditable={!readOnly}
            eventDurationEditable={!readOnly}
            selectable={!readOnly}
            selectMirror={!readOnly}
            dayMaxEvents={3}
            nowIndicator={true}
            events={events}
            eventClick={handleEventClick}
            eventDrop={handleEventChange}
            eventResize={handleEventChange}
            select={handleDateSelect}
            datesSet={handleDatesSet}
            eventDidMount={(info) => {
              if (info.event.extendedProps?.hasConflict) {
                info.el.style.borderStyle = 'dashed';
                info.el.style.borderWidth = '2px';
                info.el.style.borderColor = '#f5222d';
                info.el.style.boxShadow = '0 0 4px rgba(245, 34, 45, 0.3)';
              }
            }}
            height="auto"
          />
        </Spin>
      </div>
      )}

      {/* Sub-component Modals */}
      <RecurrenceChoiceModal
        visible={isRecurrenceChoiceVisible}
        actionType={recurrenceActionType}
        editMode={recurrenceEditMode}
        onModeChange={setRecurrenceEditMode}
        onConfirm={() => handleRecurrenceChoiceAction(recurrenceEditMode)}
        onCancel={() => setIsRecurrenceChoiceVisible(false)}
      />

      <CategoryManagementModal
        visible={isCategoryModalVisible}
        onClose={() => setIsCategoryModalVisible(false)}
        categories={categoriesList}
        onCategoryChange={loadCategories}
      />

      {modalMode === 'view' ? (
        <EventDetailModal
          visible={isModalVisible && modalMode === 'view'}
          event={selectedEvent}
          onClose={() => setIsModalVisible(false)}
          onEdit={handleEditInitiate}
          onDelete={handleDeleteInitiate}
          onToggleStatus={handleToggleStatus}
          onStartPomodoro={(ev) => {
            setPomodoroInitialEvent(ev);
            setIsPomodoroOpen(true);
          }}
          categoriesList={categoriesList}
          isAdmin={isAdmin}
        />
      ) : (
        <EventFormModal
          visible={isModalVisible && (modalMode === 'create' || modalMode === 'edit')}
          mode={modalMode as 'create' | 'edit'}
          event={selectedEvent}
          categoriesList={categoriesList}
          tagsList={tagsList}
          onClose={() => setIsModalVisible(false)}
          onSubmit={handleFormSubmit}
          recurrenceEditMode={recurrenceEditMode}
          instanceDate={selectedEvent?.startTime}
        />
      )}

      <QuickAddModal
        visible={isQuickAddModalVisible}
        onCancel={() => setIsQuickAddModalVisible(false)}
        onSubmit={handleQuickAddSubmit}
      />

      <ShortcutsHelpModal
        visible={isHelpModalVisible}
        onClose={() => setIsHelpModalVisible(false)}
      />

      <PomodoroModal
        open={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
        initialEvent={pomodoroInitialEvent}
      />

      <IcsImportModal
        visible={isImportModalVisible}
        onClose={() => setIsImportModalVisible(false)}
        onSuccess={() => onFilterChange({ startTime: currentRange?.start, endTime: currentRange?.end })}
      />

      <ExportModal
        visible={isExportModalVisible}
        onClose={() => setIsExportModalVisible(false)}
        schedules={schedules}
      />

      <React.Suspense fallback={null}>
        <ShareCalendarModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <TemplateModal
          open={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          onApplied={() => onFilterChange({ startTime: currentRange?.start, endTime: currentRange?.end })}
        />
      </React.Suspense>
    </div>
  );
};
export default ScheduleCalendar;
