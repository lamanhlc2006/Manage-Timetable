import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Spin, Radio, Typography, Empty, Progress, Divider, Tooltip } from 'antd';
import { Column, Pie, Line } from '@ant-design/charts';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  RiseOutlined,
  FireOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  HeatMapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { fetchSchedules, ScheduleEvent } from '../services/scheduleService';
import { fetchFocusStats, FocusStats } from '../services/focusService';
import { fetchAdvancedAnalytics, AdvancedAnalytics } from '../services/analyticsService';
import { useTranslation } from 'react-i18next';

dayjs.extend(isoWeek);

const { Title, Text } = Typography;

export const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [focusStats, setFocusStats] = useState<FocusStats | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | 'all'>('30days');

  const loadData = async () => {
    try {
      setLoading(true);
      let startTime: string | undefined;
      let endTime: string | undefined;
      let weeks = 8;

      if (timeFilter === '7days') {
        startTime = dayjs().subtract(7, 'day').startOf('day').toISOString();
        endTime = dayjs().endOf('day').toISOString();
        weeks = 4;
      } else if (timeFilter === '30days') {
        startTime = dayjs().subtract(30, 'day').startOf('day').toISOString();
        endTime = dayjs().endOf('day').toISOString();
        weeks = 8;
      } else {
        weeks = 12;
      }

      const [schedulesData, focusData, advanced] = await Promise.all([
        fetchSchedules({ startTime, endTime }),
        fetchFocusStats({ startTime, endTime }),
        fetchAdvancedAnalytics(weeks),
      ]);

      setSchedules(schedulesData);
      setFocusStats(focusData);
      setAdvancedData(advanced);
    } catch (err) {
      console.error('Error fetching analytics schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter]);

  const stats = useMemo(() => {
    let totalHours = 0;
    let completedHours = 0;
    let completedCount = 0;
    const dayOfWeekMap: { [day: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    const completedDayOfWeekMap: { [day: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 0: 0 };
    const categoryMap: { [cat: string]: number } = {};

    schedules.forEach((sch) => {
      const start = new Date(sch.startTime);
      const end = new Date(sch.endTime);
      const durationHours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 3600));

      totalHours += durationHours;

      const cat = sch.category || 'Khác';
      categoryMap[cat] = (categoryMap[cat] || 0) + durationHours;

      const dayIndex = start.getDay();
      dayOfWeekMap[dayIndex] = (dayOfWeekMap[dayIndex] || 0) + durationHours;

      if (sch.status === 'completed') {
        completedHours += durationHours;
        completedCount++;
        completedDayOfWeekMap[dayIndex] = (completedDayOfWeekMap[dayIndex] || 0) + durationHours;
      }
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

    const completedWeeklyColumnData = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
      day: dayLabels[d],
      hours: Number((completedDayOfWeekMap[d] || 0).toFixed(1)),
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

    const completionRate = schedules.length > 0
      ? Number(((completedCount / schedules.length) * 100).toFixed(1))
      : 0;

    return {
      totalHours: Number(totalHours.toFixed(1)),
      totalCount: schedules.length,
      topCategory: topCat,
      weeklyColumnData,
      completedWeeklyColumnData,
      completedCount,
      completedHours: Number(completedHours.toFixed(1)),
      completionRate,
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

  // Completed Hours Column Chart Configuration
  const completedColumnConfig = {
    data: stats.completedWeeklyColumnData,
    xField: 'day',
    yField: 'hours',
    label: {
      position: 'top',
      style: {
        fill: '#52c41a',
        opacity: 0.8,
      },
    },
    color: '#52c41a',
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
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
                  title={t('analytics.completedEvents')}
                  value={stats.completedCount}
                  suffix={`/ ${stats.totalCount}`}
                  prefix={<CheckCircleOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card variant="borderless" style={{ background: '#f9f0ff', borderRadius: '10px' }}>
                <Statistic
                  title={t('analytics.completionRate')}
                  value={stats.completionRate}
                  suffix="%"
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
                title={t('analytics.completedHoursWeekly')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {stats.completedCount === 0 ? (
                  <Empty description={t('analytics.noData')} />
                ) : (
                  <div style={{ height: 300 }}>
                    <Column {...(completedColumnConfig as any)} />
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {/* === Advanced Analytics Section === */}
          <Divider orientation="left" style={{ margin: '24px 0 16px 0' }}>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#13c2c2' }}>
              <HeatMapOutlined /> {t('analytics.advancedTitle', 'Phân tích nâng cao')}
            </Title>
          </Divider>

          {/* Stacked Bar: Category Distribution by Week + KPI Completion Circle */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} lg={16}>
              <Card
                title={t('analytics.categoryByWeek', 'Phân bổ giờ theo danh mục (tuần)')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {!advancedData || advancedData.categoryDistribution.length === 0 ? (
                  <Empty description={t('analytics.noData')} />
                ) : (
                  <div style={{ height: 320 }}>
                    <Column
                      {...({
                        data: advancedData.categoryDistribution.map((d) => ({
                          week: `W${d._id.week}`,
                          category: d._id.category,
                          hours: Number(d.hours.toFixed(1)),
                        })),
                        isStack: true,
                        xField: 'week',
                        yField: 'hours',
                        seriesField: 'category',
                        label: { position: 'middle', style: { fill: '#fff', fontSize: 10 } },
                        columnStyle: { radius: [4, 4, 0, 0] },
                        tooltip: { formatter: (datum: any) => ({ name: datum.category, value: `${datum.hours}h` }) },
                      } as any)}
                    />
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={t('analytics.completionKPI', 'Tỷ lệ hoàn thành')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 20 }}>
                  <Progress
                    type="dashboard"
                    percent={stats.completionRate}
                    size={160}
                    strokeColor={{
                      '0%': '#ff4d4f',
                      '50%': '#faad14',
                      '100%': '#52c41a',
                    }}
                    format={(pct) => (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 'bold' }}>{pct}%</div>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {stats.completedCount}/{stats.totalCount}
                        </div>
                      </div>
                    )}
                  />
                  <Text type="secondary" style={{ textAlign: 'center', fontSize: 13 }}>
                    {t('analytics.completionKPIDesc', 'Sự kiện hoàn thành / Tổng số sự kiện')}
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Line Chart: Weekly Hours Trend + Heatmap */}
          <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
            <Col xs={24} lg={12}>
              <Card
                title={t('analytics.weeklyTrend', 'Xu hướng giờ làm việc')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {!advancedData || advancedData.completionTrend.length === 0 ? (
                  <Empty description={t('analytics.noData')} />
                ) : (
                  <div style={{ height: 300 }}>
                    <Line
                      {...({
                        data: advancedData.completionTrend.map((d) => ({
                          week: `W${d.week || d._id.week}`,
                          hours: d.totalHours,
                        })),
                        xField: 'week',
                        yField: 'hours',
                        smooth: true,
                        point: { size: 4, shape: 'circle' },
                        color: '#1890ff',
                        area: { style: { fill: 'l(270) 0:#ffffff 1:#1890ff33' } },
                        yAxis: { title: { text: 'Giờ' } },
                        tooltip: { formatter: (datum: any) => ({ name: 'Giờ', value: `${datum.hours}h` }) },
                      } as any)}
                    />
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={t('analytics.busyHeatmap', 'Biểu đồ nhiệt hoạt động (Thứ × Giờ)')}
                variant="borderless"
                style={{ borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                {!advancedData || advancedData.heatmapData.length === 0 ? (
                  <Empty description={t('analytics.noData')} />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    {(() => {
                      const dayLabelsMap: Record<number, string> = {
                        1: 'CN', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7',
                      };
                      const grid: Record<string, number> = {};
                      let maxCount = 1;
                      advancedData.heatmapData.forEach((d) => {
                        const key = `${d._id.dayOfWeek}-${d._id.hour}`;
                        grid[key] = d.count;
                        if (d.count > maxCount) maxCount = d.count;
                      });
                      const hours = Array.from({ length: 24 }, (_, i) => i);
                      const days = [2, 3, 4, 5, 6, 7, 1]; // Mon→Sun
                      return (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                          <thead>
                            <tr>
                              <th style={{ width: 30, padding: 2 }} />
                              {hours.map((h) => (
                                <th key={h} style={{ padding: '2px 1px', textAlign: 'center', color: '#8c8c8c', fontWeight: 400 }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {days.map((d) => (
                              <tr key={d}>
                                <td style={{ padding: '2px 4px', fontWeight: 500, color: '#595959' }}>
                                  {dayLabelsMap[d]}
                                </td>
                                {hours.map((h) => {
                                  const count = grid[`${d}-${h}`] || 0;
                                  const intensity = count / maxCount;
                                  const bg = count === 0
                                    ? '#f5f5f5'
                                    : `rgba(24, 144, 255, ${0.15 + intensity * 0.85})`;
                                  return (
                                    <td key={h} style={{ padding: 1 }}>
                                      <Tooltip title={`${dayLabelsMap[d]} ${h}:00 — ${count} sự kiện`}>
                                        <div
                                          style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            minWidth: 14,
                                            minHeight: 14,
                                            borderRadius: 3,
                                            background: bg,
                                            cursor: 'pointer',
                                          }}
                                        />
                                      </Tooltip>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
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
