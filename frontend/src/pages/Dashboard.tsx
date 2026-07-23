import React, { useEffect, useState } from 'react';
import { Card, message } from 'antd';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  patchScheduleTime,
  deleteSchedule,
  searchSchedules,
  ScheduleEvent,
  CreateScheduleInput,
} from '../services/scheduleService';
import { ScheduleCalendar } from '../components/ScheduleCalendar';

export const Dashboard: React.FC = () => {
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
  }, []);

  // Fetch schedules whenever filters change
  useEffect(() => {
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
  }, [filters]);

  const handleCreate = async (inputData: CreateScheduleInput & { force?: boolean }) => {
    try {
      const newEvent = await createSchedule(inputData);
      setSchedules((prev) => [...prev, newEvent]);
    } catch (err: any) {
      console.error(err);
      throw err; // Propagate error to calendar modal to show user error notifications
    }
  };

  const handleUpdate = async (id: string, inputData: Partial<CreateScheduleInput> & { force?: boolean; recurrenceEditMode?: 'all' | 'current' | 'future'; instanceDate?: string }) => {
    try {
      await updateSchedule(id, inputData);
      const data = await fetchSchedules(filters);
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleDelete = async (id: string, deleteMode?: 'all' | 'current' | 'future') => {
    try {
      await deleteSchedule(id, deleteMode);
      const data = await fetchSchedules(filters);
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handlePatchTime = async (id: string, startTime: string, endTime: string, recurrenceEditMode?: 'all' | 'current' | 'future') => {
    try {
      await patchScheduleTime(id, { startTime, endTime, recurrenceEditMode });
      const data = await fetchSchedules(filters);
      setSchedules(data);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  return (
    <div>
      <Card variant="borderless" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <ScheduleCalendar
          schedules={schedules}
          loading={loading}
          isAdmin={isAdmin}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onPatchTime={handlePatchTime}
          onFilterChange={setFilters}
        />
      </Card>
    </div>
  );
};
export default Dashboard;
