import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Spin, Radio, Typography, Empty, Progress, Divider } from 'antd';
import { Column, Pie } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  RiseOutlined,
  FireOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchSchedules, ScheduleEvent } from '../services/scheduleService';
import { fetchFocusStats, FocusStats } from '../services/focusService';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [focusStats, setFocusStats] = useState<FocusStats | null>(null);
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

      const [schedulesData, focusData] = await Promise.all([
        fetchSchedules({ startTime, endTime }),
        fetchFocusStats({ startTime, endTime }),
      ]);

      setSchedules(schedulesData);
      setFocusStats(focusData);
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

  // Focus Category Pie Chart Config
  const focusPieConfig = {
    appendPadding: 10,
    data: focusStats?.categoryBreakdown || [],
    angleField: 'minutes',
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
            {t('analytics.title')}
          </Title>
          <Text type="secondary">{t('analytics.subtitle')}</Text>
        </div>

        <Radio.Group
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="7days">{t('analytics.7days')}</Radio.Button>
          <Radio.Button value="30days">{t('analytics.30days')}</Radio.Button>
          <Radio.Button value="all">{t('analytics.all')}</Radio.Button>
        </Radio.Group>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Spin size="large" tip={t('common.loading')}>
            <div style={{ minHeight: 120 }} />
          </Spin>
        </div>
      ) : (
        <>
          {/* Schedule Summary KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#e6f7ff', borderRadius: '10px' }}>
                <Statistic
                  title={t('analytics.totalScheduleHours')}
                  value={stats.totalHours}
                  suffix="h"
                  prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#f6ffed', borderRadius: '10px' }}>
                <Statistic
                  title={t('analytics.totalEvents')}
                  value={stats.totalCount}
                  prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#fff7e6', borderRadius: '10px' }}>
                <Statistic
                  title={t('analytics.topCategory')}
                  value={stats.topCategory}
                  prefix={<AppstoreOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16', fontWeight: 'bold', fontSize: '20px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#f9f0ff', borderRadius: '10px' }}>
                <Statistic
                  title={t('analytics.dailyAverage')}
                  value={Number((stats.totalHours / (timeFilter === '7days' ? 7 : 30)).toFixed(1))}
                  suffix="h/d"
                  prefix={<RiseOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Schedule Charts Row */}
          <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
            <Col xs={24} lg={12}>
              <Card
                title={t('analytics.weeklyDistribution')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {stats.totalCount === 0 ? (
                  <Empty description={t('analytics.noData')} />
                ) : (
                  <div style={{ height: 300 }}>
                    <Column {...(columnConfig as any)} />
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={t('analytics.categoryDistribution')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {stats.totalCount === 0 ? (
                  <Empty description={t('analytics.noData')} />
                ) : (
                  <div style={{ height: 300 }}>
                    <Pie {...(pieConfig as any)} />
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* Pomodoro Focus Analytics Section */}
          <Divider orientation="left" style={{ margin: '24px 0 16px 0' }}>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4d4f' }}>
              <FireOutlined /> {t('analytics.pomodoroTitle')}
            </Title>
          </Divider>

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={8}>
              <Card variant="borderless" style={{ background: '#fff2e8', borderRadius: '10px', border: '1px solid #ffbb96' }}>
                <Statistic
                  title={t('analytics.totalFocusTime')}
                  value={focusStats?.totalFocusHours || 0}
                  suffix="h"
                  prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
                  valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card variant="borderless" style={{ background: '#f6ffed', borderRadius: '10px', border: '1px solid #b7eb8f' }}>
                <Statistic
                  title={t('analytics.completedSessions')}
                  value={focusStats?.totalSessions || 0}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card variant="borderless" style={{ background: '#fff7e6', borderRadius: '10px', border: '1px solid #ffd591' }}>
                <Statistic
                  title={t('analytics.avgSessionLength')}
                  value={
                    focusStats && focusStats.totalSessions > 0
                      ? Math.round(focusStats.totalFocusMinutes / focusStats.totalSessions)
                      : 0
                  }
                  suffix="m"
                  prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={t('analytics.focusCategoryDistribution')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {!focusStats || focusStats.categoryBreakdown.length === 0 ? (
                  <Empty description={t('analytics.noFocusData')} />
                ) : (
                  <div style={{ height: 280 }}>
                    <Pie {...(focusPieConfig as any)} />
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={t('analytics.focusDetailTable')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {!focusStats || focusStats.categoryBreakdown.length === 0 ? (
                  <Empty description={t('analytics.noFocusData')} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                    {focusStats.categoryBreakdown.map((item) => {
                      const totalMin = focusStats.totalFocusMinutes || 1;
                      const pct = Math.round((item.minutes / totalMin) * 100);
                      return (
                        <div key={item.category}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <Text strong>{item.category}</Text>
                            <Text type="secondary">
                              {item.minutes}m ({item.hours}h)
                            </Text>
                          </div>
                          <Progress percent={pct} strokeColor="#ff4d4f" status="active" />
                        </div>
                      );
                    })}
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
