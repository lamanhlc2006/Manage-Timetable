import React, { useEffect, useState, useCallback } from 'react';
import { Card, message, Select, Space, Typography, Badge } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import {
  createSchedule,
  updateSchedule,
  patchScheduleTime,
  deleteSchedule,
  searchSchedules,
  ScheduleEvent,
  CreateScheduleInput,
} from '../services/scheduleService';
import { subscribeToScheduleEvents } from '../services/socketService';
import { getMyGroups, getGroupSchedules, GroupItem } from '../services/groupService';
import { ScheduleCalendar } from '../components/ScheduleCalendar';
import { useTranslation } from 'react-i18next';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filters, setFilters] = useState<{
    keyword?: string;
    categories?: string[];
    priority?: string[];
    startTime?: string;
    endTime?: string;
    creator?: string;
  }>({});

  // Group calendar state
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('personal');
  const [viewMode, setViewMode] = useState<'personal' | 'group'>('personal');

  // Retrieve user and check role on mount
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        setIsAdmin(user.role === 'admin');
      } catch (err) {
        console.error('Error parsing user role', err);
      }
    }
    // Load groups
    getMyGroups().then(setGroups).catch(console.error);
  }, []);

  // Fetch schedules whenever filters change (personal mode)
  useEffect(() => {
    if (viewMode !== 'personal') return;
    const getSchedulesList = async () => {
      try {
        setLoading(true);
        const data = await searchSchedules(filters);
        setSchedules(data);
      } catch (err: any) {
        console.error(err);
        message.error('Không thể tải danh sách thời gian biểu.');
      } finally {
        setLoading(false);
      }
    };
    getSchedulesList();
  }, [filters, viewMode]);

  // Fetch group schedules
  useEffect(() => {
    if (viewMode !== 'group' || activeGroupId === 'personal') return;
    const fetchGroupSchedules = async () => {
      try {
        setLoading(true);
        const data = await getGroupSchedules(activeGroupId);
        setSchedules(data);
      } catch (err: any) {
        console.error(err);
        message.error('Không thể tải lịch nhóm.');
      } finally {
        setLoading(false);
      }
    };
    fetchGroupSchedules();
  }, [activeGroupId, viewMode]);

  // Subscribe to Socket.IO real-time schedule events
  useEffect(() => {
    const unsubscribe = subscribeToScheduleEvents({
      onCreated: async () => {
        if (viewMode === 'personal') {
          const data = await searchSchedules(filters);
          setSchedules(data);
        }
      },
      onUpdated: async () => {
        if (viewMode === 'personal') {
          const data = await searchSchedules(filters);
          setSchedules(data);
        }
      },
      onDeleted: async () => {
        if (viewMode === 'personal') {
          const data = await searchSchedules(filters);
          setSchedules(data);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [filters, viewMode]);

  const handleCreate = async (inputData: CreateScheduleInput & { force?: boolean }) => {
    try {
      await createSchedule(inputData);
      const data = await searchSchedules(filters);
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      throw err; // Propagate error to calendar modal to show user error notifications
    }
  };

  const handleUpdate = async (id: string, inputData: Partial<CreateScheduleInput> & { force?: boolean; recurrenceEditMode?: 'all' | 'current' | 'future'; instanceDate?: string }) => {
    try {
      await updateSchedule(id, inputData);
      const data = await searchSchedules(filters);
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleDelete = async (id: string, deleteMode?: 'all' | 'current' | 'future') => {
    try {
      await deleteSchedule(id, deleteMode);
      const data = await searchSchedules(filters);
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handlePatchTime = async (id: string, startTime: string, endTime: string, recurrenceEditMode?: 'all' | 'current' | 'future') => {
    try {
      await patchScheduleTime(id, { startTime, endTime, recurrenceEditMode });
      const data = await searchSchedules(filters);
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newFilters)) {
        return prev;
      }
      return newFilters;
    });
  }, []);

  const handleGroupChange = (value: string) => {
    if (value === 'personal') {
      setActiveGroupId('personal');
      setViewMode('personal');
    } else {
      setActiveGroupId(value);
      setViewMode('group');
    }
  };

  const isGroupViewer = viewMode === 'group' && (() => {
    const group = groups.find((g) => g._id === activeGroupId);
    if (!group) return true;
    const ownerId = typeof group.owner === 'string' ? group.owner : group.owner._id;
    const currentUserId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}')._id; } catch { return ''; } })();
    if (ownerId === currentUserId) return false; // owner = editor
    const member = group.members?.find((m) => {
      const uid = typeof m.user === 'string' ? m.user : m.user._id;
      return uid === currentUserId;
    });
    return member?.role === 'viewer';
  })();

  return (
    <div>
      <Card variant="borderless" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {/* Group Selector */}
        {groups.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Space size={8} align="center">
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {t('group.viewCalendar', 'Xem lịch')}:
              </Typography.Text>
              <Select
                value={activeGroupId}
                onChange={handleGroupChange}
                style={{ minWidth: 200, borderRadius: 6 }}
                size="small"
              >
                <Select.Option value="personal">
                  <Space><UserOutlined /> {t('group.personalCalendar', 'Lịch cá nhân')}</Space>
                </Select.Option>
                {groups.map((g) => (
                  <Select.Option key={g._id} value={g._id}>
                    <Space><Badge color={g.color} /><TeamOutlined /> {g.name}</Space>
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </div>
        )}

        <ScheduleCalendar
          schedules={schedules}
          loading={loading}
          isAdmin={isAdmin}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onPatchTime={handlePatchTime}
          onFilterChange={handleFilterChange}
          readOnly={isGroupViewer || false}
        />
      </Card>
    </div>
  );
};
export default Dashboard;
