import React, { useMemo, useState } from 'react';
import { Segmented, Typography, Tooltip, Empty, DatePicker } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ScheduleEvent } from '../services/scheduleService';

const { Text } = Typography;

type ZoomLevel = 'hour' | 'day' | 'week';

interface TimelineViewProps {
  schedules: ScheduleEvent[];
  onEventClick?: (event: ScheduleEvent) => void;
}

// Columns config per zoom level
const ZOOM_CONFIG: Record<ZoomLevel, { columns: number; labelFn: (i: number, base: Dayjs) => string; unitMs: number; format: string }> = {
  hour: {
    columns: 24,
    labelFn: (i) => `${String(i).padStart(2, '0')}:00`,
    unitMs: 3600 * 1000,
    format: 'DD/MM/YYYY',
  },
  day: {
    columns: 7,
    labelFn: (i, base) => base.add(i, 'day').format('dd DD/MM'),
    unitMs: 24 * 3600 * 1000,
    format: '[Tuần] WW, YYYY',
  },
  week: {
    columns: 4,
    labelFn: (i, base) => `${base.add(i, 'week').format('DD/MM')}`,
    unitMs: 7 * 24 * 3600 * 1000,
    format: 'MM/YYYY',
  },
};

const COLORS_FALLBACK = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];

export const TimelineView: React.FC<TimelineViewProps> = ({ schedules, onEventClick }) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState<ZoomLevel>('hour');
  const [baseDate, setBaseDate] = useState<Dayjs>(dayjs().startOf('day'));

  const config = ZOOM_CONFIG[zoom];

  // Compute window start/end
  const windowStart = useMemo(() => {
    if (zoom === 'hour') return baseDate.startOf('day');
    if (zoom === 'day') return baseDate.startOf('week');
    return baseDate.startOf('month');
  }, [zoom, baseDate]);

  const windowEnd = useMemo(() => {
    return dayjs(windowStart.valueOf() + config.columns * config.unitMs);
  }, [windowStart, config]);

  // Filter events that overlap this window
  const filtered = useMemo(() => {
    const ws = windowStart.valueOf();
    const we = windowEnd.valueOf();
    return schedules.filter((s) => {
      const es = dayjs(s.startTime).valueOf();
      const ee = dayjs(s.endTime).valueOf();
      return es < we && ee > ws;
    });
  }, [schedules, windowStart, windowEnd]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const evt of filtered) {
      const cat = evt.category || t('calendar.defaultCategory', 'Khác');
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(evt);
    }
    return map;
  }, [filtered, t]);

  const categories = Array.from(grouped.keys());
  const totalWidth = config.columns * 120; // each column is 120px

  const getBarStyle = (evt: ScheduleEvent, catIndex: number) => {
    const ws = windowStart.valueOf();
    const we = windowEnd.valueOf();
    const es = Math.max(dayjs(evt.startTime).valueOf(), ws);
    const ee = Math.min(dayjs(evt.endTime).valueOf(), we);
    const left = ((es - ws) / (we - ws)) * totalWidth;
    const width = Math.max(((ee - es) / (we - ws)) * totalWidth, 4);
    const color = evt.color || COLORS_FALLBACK[catIndex % COLORS_FALLBACK.length];

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      width: `${width}px`,
      height: '28px',
      top: '4px',
      backgroundColor: color,
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '6px',
      paddingRight: '6px',
      overflow: 'hidden',
      whiteSpace: 'nowrap' as const,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      transition: 'opacity 0.2s',
    };
  };

  const handleDateChange = (date: Dayjs | null) => {
    if (date) setBaseDate(date);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong style={{ fontSize: 16 }}>📊 {t('calendar.timelineView', 'Timeline')}</Text>
          <DatePicker
            value={baseDate}
            onChange={handleDateChange}
            allowClear={false}
            size="small"
            style={{ width: 140 }}
          />
        </div>
        <Segmented
          size="small"
          options={[
            { label: <><ZoomInOutlined /> {t('calendar.zoomHour', 'Giờ')}</>, value: 'hour' },
            { label: t('calendar.zoomDay', 'Ngày'), value: 'day' },
            { label: <><ZoomOutOutlined /> {t('calendar.zoomWeek', 'Tuần')}</>, value: 'week' },
          ]}
          value={zoom}
          onChange={(val) => setZoom(val as ZoomLevel)}
        />
      </div>

      {categories.length === 0 ? (
        <Empty description={t('calendar.noEvents', 'Không có sự kiện')} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Time axis header */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', marginBottom: 0, minWidth: `${totalWidth + 140}px` }}>
            <div style={{ width: '140px', flexShrink: 0, padding: '6px 8px', fontWeight: 600, fontSize: 12, color: '#8c8c8c' }}>
              {t('calendar.categoryLabel', 'Danh mục')}
            </div>
            {Array.from({ length: config.columns }, (_, i) => (
              <div
                key={i}
                style={{
                  width: '120px',
                  flexShrink: 0,
                  textAlign: 'center',
                  padding: '6px 0',
                  fontSize: 11,
                  color: '#595959',
                  borderLeft: '1px solid #f0f0f0',
                  fontWeight: 500,
                }}
              >
                {config.labelFn(i, windowStart)}
              </div>
            ))}
          </div>

          {/* Rows per category */}
          {categories.map((cat, catIdx) => {
            const events = grouped.get(cat)!;
            // Stack overlapping events into lanes
            const lanes: ScheduleEvent[][] = [];
            const sortedEvents = [...events].sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
            for (const evt of sortedEvents) {
              let placed = false;
              for (const lane of lanes) {
                const lastInLane = lane[lane.length - 1];
                if (dayjs(evt.startTime).valueOf() >= dayjs(lastInLane.endTime).valueOf()) {
                  lane.push(evt);
                  placed = true;
                  break;
                }
              }
              if (!placed) lanes.push([evt]);
            }

            return (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  borderBottom: '1px solid #f5f5f5',
                  minWidth: `${totalWidth + 140}px`,
                  background: catIdx % 2 === 0 ? '#fafafa' : '#fff',
                }}
              >
                {/* Category label */}
                <div
                  style={{
                    width: '140px',
                    flexShrink: 0,
                    padding: '8px',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'flex-start',
                    borderRight: '1px solid #f0f0f0',
                  }}
                >
                  <Text ellipsis style={{ maxWidth: '124px' }}>{cat}</Text>
                </div>

                {/* Event bars area */}
                <div
                  style={{
                    width: `${totalWidth}px`,
                    position: 'relative',
                    minHeight: `${Math.max(lanes.length * 36 + 8, 40)}px`,
                  }}
                >
                  {/* Grid lines */}
                  {Array.from({ length: config.columns }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: `${i * 120}px`,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: '#f0f0f0',
                      }}
                    />
                  ))}

                  {/* Events */}
                  {lanes.map((lane, laneIdx) =>
                    lane.map((evt) => (
                      <Tooltip
                        key={evt._id}
                        title={
                          <div>
                            <div style={{ fontWeight: 600 }}>{evt.title}</div>
                            <div style={{ fontSize: 11 }}>
                              {dayjs(evt.startTime).format('HH:mm')} – {dayjs(evt.endTime).format('HH:mm DD/MM')}
                            </div>
                          </div>
                        }
                      >
                        <div
                          style={{
                            ...getBarStyle(evt, catIdx),
                            top: `${laneIdx * 36 + 4}px`,
                          }}
                          onClick={() => onEventClick?.(evt)}
                        >
                          <span style={{ fontSize: 11, color: '#fff', fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                            {evt.title}
                          </span>
                        </div>
                      </Tooltip>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
