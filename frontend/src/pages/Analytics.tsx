import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Spin, Radio, Typography, Empty } from 'antd';
import { Column, Pie } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchSchedules, ScheduleEvent } from '../services/scheduleService';

const { Title, Text } = Typography;

export const Analytics: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'all'>('30days');

  const loadData = async () => {
    try {
      setLoading(true);
      let startTime: string | undefined;
      let endTime: string | undefined;

      if (timeFilter === '7days') {
        startTime = dayjs().subtract(7, 'day').startOf('day').toISOString();
        endTime = dayjs().endOf('day').toISOString();
      } else if (timeFilter === '30days') {
        startTime = dayjs().subtract(30, 'day').startOf('day').toISOString();
        endTime = dayjs().endOf('day').toISOString();
      }

      const data = await fetchSchedules({ startTime, endTime });
      setSchedules(data);
    } catch (err) {
      console.error('Error fetching analytics schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter]);

  // Aggregate statistics
  const stats = useMemo(() => {
    let totalHours = 0;
    const categoryMap: { [cat: string]: number } = {};
    const dayOfWeekMap: { [day: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };

    schedules.forEach((sch) => {
      const start = new Date(sch.startTime);
      const end = new Date(sch.endTime);
      const durationHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 3600));

      totalHours += durationHours;

      const cat = sch.category || 'Khác';
      categoryMap[cat] = (categoryMap[cat] || 0) + durationHours;

      const dayIndex = start.getDay();
      dayOfWeekMap[dayIndex] = (dayOfWeekMap[dayIndex] || 0) + durationHours;
    });

    const dayLabels: { [key: number]: string } = {
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
      0: 'Chủ Nhật',
    };

    const weeklyColumnData = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
      day: dayLabels[d],
      hours: Number((dayOfWeekMap[d] || 0).toFixed(1)),
    }));

    const categoryPieData = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      hours: Number((categoryMap[cat] || 0).toFixed(1)),
    }));

    // Find top category
    let topCat = 'Chưa có';
    let maxCatHours = 0;
    Object.entries(categoryMap).forEach(([cat, hrs]) => {
      if (hrs > maxCatHours) {
        maxCatHours = hrs;
        topCat = cat;
      }
    });

    return {
      totalHours: Number(totalHours.toFixed(1)),
      totalCount: schedules.length,
      topCategory: topCat,
      weeklyColumnData,
      categoryPieData,
    };
  }, [schedules]);

  // Column Chart Configuration
  const columnConfig = {
    data: stats.weeklyColumnData,
    xField: 'day',
    yField: 'hours',
    label: {
      position: 'top',
      style: {
        fill: '#1890ff',
        opacity: 0.8,
      },
    },
    color: '#1890ff',
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
  };

  // Pie Chart Configuration
  const pieConfig = {
    appendPadding: 10,
    data: stats.categoryPieData,
    angleField: 'hours',
    colorField: 'category',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}',
    },
    interactions: [{ type: 'element-active' }],
  };

  return (
    <div style={{ padding: '4px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Phân Tích & Thống Kê Thời Gian
          </Title>
          <Text type="secondary">Visualizing schedule distribution and time allocation</Text>
        </div>

        <Radio.Group
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="7days">7 Ngày Qua</Radio.Button>
          <Radio.Button value="30days">30 Ngày Qua</Radio.Button>
          <Radio.Button value="all">Tất Cả</Radio.Button>
        </Radio.Group>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spin size="large" tip="Đang tải dữ liệu phân tích...">
            <div style={{ minHeight: 120 }} />
          </Spin>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#e6f7ff', borderRadius: '10px' }}>
                <Statistic
                  title="Tổng số giờ"
                  value={stats.totalHours}
                  suffix="giờ"
                  prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#f6ffed', borderRadius: '10px' }}>
                <Statistic
                  title="Tổng sự kiện"
                  value={stats.totalCount}
                  suffix="mục"
                  prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#fff7e6', borderRadius: '10px' }}>
                <Statistic
                  title="Danh mục lớn nhất"
                  value={stats.topCategory}
                  prefix={<AppstoreOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16', fontWeight: 'bold', fontSize: '20px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#f9f0ff', borderRadius: '10px' }}>
                <Statistic
                  title="Trung bình/ngày"
                  value={Number((stats.totalHours / (timeFilter === '7days' ? 7 : 30)).toFixed(1))}
                  suffix="h/ngày"
                  prefix={<RiseOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title="Số Giờ Học & Làm Theo Tuần (Theo Thứ)"
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {stats.totalCount === 0 ? (
                  <Empty description="Không có dữ liệu trong khoảng thời gian này" />
                ) : (
                  <div style={{ height: 320 }}>
                    <Column {...(columnConfig as any)} />
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title="Tỷ Lệ Thời Gian Phân Bổ Theo Danh Mục"
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {stats.totalCount === 0 ? (
                  <Empty description="Không có dữ liệu trong khoảng thời gian này" />
                ) : (
                  <div style={{ height: 320 }}>
                    <Pie {...(pieConfig as any)} />
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};
