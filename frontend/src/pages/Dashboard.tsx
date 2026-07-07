import React, { useEffect, useState } from 'react';
import { Spin, Card, message } from 'antd';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  ScheduleEvent,
  CreateScheduleInput,
} from '../services/scheduleService';
import { ScheduleCalendar } from '../components/ScheduleCalendar';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

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

    const getSchedulesList = async () => {
      try {
        const data = await fetchSchedules();
        setSchedules(data);
      } catch (err: any) {
        console.error(err);
        message.error('Không thể tải danh sách thời gian biểu.');
      } finally {
        setLoading(false);
      }
    };

    getSchedulesList();
  }, []);

  const handleCreate = async (inputData: CreateScheduleInput) => {
    try {
      const newEvent = await createSchedule(inputData);
      setSchedules((prev) => [...prev, newEvent]);
    } catch (err: any) {
      console.error(err);
      throw err; // Propagate error to calendar modal to show user error notifications
    }
  };

  const handleUpdate = async (id: string, inputData: Partial<CreateScheduleInput>) => {
    try {
      const updatedEvent = await updateSchedule(id, inputData);
      setSchedules((prev) =>
        prev.map((item) => (item._id === id ? updatedEvent : item))
      );
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((item) => item._id !== id));
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  return (
    <div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Spin size="large" tip="Đang tải dữ liệu lịch trình..." />
        </div>
      ) : (
        <Card bordered={false} style={{ borderRadius: '12px' }}>
          <ScheduleCalendar
            schedules={schedules}
            isAdmin={isAdmin}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </Card>
      )}
    </div>
  );
};
export default Dashboard;
