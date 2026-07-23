import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Button,
  Select,
  Typography,
  Space,
  Progress,
  Tag,
  Card,
  Input,
  Switch,
  Tooltip,
  Result,
  Divider,
  message,
} from 'antd';
import {
  PlayCircleFilled,
  PauseCircleFilled,
  RedoOutlined,
  StepForwardOutlined,
  FireOutlined,
  CoffeeOutlined,
  SmileOutlined,
  SoundOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { logFocusSession } from '../services/focusService';
import { playChimeSound } from '../utils/soundHelper';
import { triggerConfetti } from '../utils/confetti';
import { fetchSchedules, ScheduleEvent } from '../services/scheduleService';

const { Text } = Typography;

export interface PomodoroModalProps {
  open: boolean;
  onClose: () => void;
  initialEvent?: {
    id?: string;
    title: string;
    category?: string;
  };
  onSessionComplete?: () => void;
}

export const PomodoroModal: React.FC<PomodoroModalProps> = ({
  open,
  onClose,
  initialEvent,
  onSessionComplete,
}) => {
  const { t } = useTranslation();
  // Config state (in minutes)
  const [focusDuration, setFocusDuration] = useState<number>(25);
  const [shortBreakDuration] = useState<number>(5);
  const [longBreakDuration] = useState<number>(15);

  // Mode state
  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [sessionCount, setSessionCount] = useState<number>(0); // completed focus sessions in current cycle (0..4)

  // Timer state (in seconds)
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Link event state
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(initialEvent?.id);
  const [customTitle, setCustomTitle] = useState<string>(initialEvent?.title || 'Tập trung học / làm việc');
  const [category, setCategory] = useState<string>(initialEvent?.category || 'Học tập');

  // Audio & Notification toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notifyEnabled, setNotifyEnabled] = useState<boolean>(true);

  // Schedules for dropdown selector
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [completedMinutes, setCompletedMinutes] = useState<number>(25);

  const timerRef = useRef<any>(null);

  // Load upcoming/today schedules for linking
  useEffect(() => {
    if (open) {
      fetchSchedules()
        .then((data) => setSchedules(data))
        .catch((err) => console.error('Failed to load schedules for Pomodoro:', err));
    }
  }, [open]);

  // Handle pre-filled initial event prop change
  useEffect(() => {
    if (initialEvent) {
      setSelectedEventId(initialEvent.id);
      setCustomTitle(initialEvent.title);
      if (initialEvent.category) setCategory(initialEvent.category);
    }
  }, [initialEvent]);

  // Current total mode duration in seconds
  const currentTotalSeconds =
    mode === 'focus'
      ? focusDuration * 60
      : mode === 'shortBreak'
      ? shortBreakDuration * 60
      : longBreakDuration * 60;

  // Update timer whenever duration config or mode changes (if timer is stopped)
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(currentTotalSeconds);
    }
  }, [mode, focusDuration, shortBreakDuration, longBreakDuration]);

  // Handle timer tick interval
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, focusDuration, shortBreakDuration, longBreakDuration, customTitle, category, selectedEventId, soundEnabled, notifyEnabled]);

  // Timer complete logic
  const handleTimerComplete = async () => {
    setIsRunning(false);

    if (mode === 'focus') {
      const minutesDone = focusDuration;
      setCompletedMinutes(minutesDone);
      const newCount = sessionCount + 1;
      setSessionCount(newCount);

      // Play Sound
      if (soundEnabled) {
        playChimeSound('focusComplete');
      }

      // Trigger Confetti
      triggerConfetti(3500);

      // Browser Push Notification
      if (notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 Hoàn thành phiên Focus!', {
          body: `Tuyệt vời! Bạn đã hoàn thành ${minutesDone} phút tập trung cho "${customTitle}".`,
          icon: '/favicon.ico',
        });
      }

      // Log session to backend DB
      try {
        await logFocusSession({
          scheduleId: selectedEventId,
          title: customTitle,
          category,
          durationMinutes: minutesDone,
          sessionType: 'focus',
        });
        message.success('Đã lưu dữ liệu tập trung vào thống kê!');
        if (onSessionComplete) onSessionComplete();
      } catch (err) {
        console.error('Failed to log focus session:', err);
      }

      setShowCelebration(true);

      // Transition to break
      if (newCount % 4 === 0) {
        setMode('longBreak');
      } else {
        setMode('shortBreak');
      }
    } else {
      // Break complete
      if (soundEnabled) {
        playChimeSound('breakComplete');
      }

      if (notifyEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('☕ Hết giờ nghỉ!', {
          body: 'Thời gian nghỉ đã kết thúc. Sẵn sàng cho phiên tập trung tiếp theo nào!',
          icon: '/favicon.ico',
        });
      }

      message.info('Đã hết giờ nghỉ! Hãy chuẩn bị cho phiên tập trung tiếp theo.');
      setMode('focus');
    }
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(currentTotalSeconds);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      setMode('shortBreak');
    } else {
      setMode('focus');
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const percent = Math.round(((currentTotalSeconds - timeLeft) / currentTotalSeconds) * 100);

  const handleSelectSchedule = (val: string) => {
    setSelectedEventId(val);
    const found = schedules.find((s) => s._id === val);
    if (found) {
      setCustomTitle(found.title);
      if (found.category) setCategory(found.category);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      destroyOnHidden
      style={{ borderRadius: '16px', overflow: 'hidden' }}
    >
      {showCelebration ? (
        <div style={{ textAlign: 'center', padding: '20px 10px' }}>
          <Result
            status="success"
            title={t('pomodoro.celebrationTitle')}
            subTitle={t('pomodoro.celebrationSub', { minutes: completedMinutes, title: customTitle })}
            extra={[
              <Button
                type="primary"
                key="break"
                size="large"
                icon={<CoffeeOutlined />}
                onClick={() => setShowCelebration(false)}
                style={{ borderRadius: '8px', background: '#52c41a', borderColor: '#52c41a' }}
              >
                {t('pomodoro.startBreak', { minutes: mode === 'longBreak' ? longBreakDuration : shortBreakDuration })}
              </Button>,
              <Button
                key="continue"
                size="large"
                onClick={() => {
                  setMode('focus');
                  setShowCelebration(false);
                }}
                style={{ borderRadius: '8px' }}
              >
                {t('pomodoro.continueFocus')}
              </Button>,
            ]}
          />
        </div>
      ) : (
        <div style={{ padding: '8px 4px' }}>
          {/* Header Mode Badges */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <Space size="middle">
              <Button
                type={mode === 'focus' ? 'primary' : 'default'}
                danger={mode === 'focus'}
                shape="round"
                icon={<FireOutlined />}
                onClick={() => {
                  setIsRunning(false);
                  setMode('focus');
                }}
              >
                {t('pomodoro.focus')} ({focusDuration}m)
              </Button>
              <Button
                type={mode === 'shortBreak' ? 'primary' : 'default'}
                shape="round"
                icon={<CoffeeOutlined />}
                style={mode === 'shortBreak' ? { background: '#52c41a', borderColor: '#52c41a' } : {}}
                onClick={() => {
                  setIsRunning(false);
                  setMode('shortBreak');
                }}
              >
                {t('pomodoro.shortBreak')} ({shortBreakDuration}m)
              </Button>
              <Button
                type={mode === 'longBreak' ? 'primary' : 'default'}
                shape="round"
                icon={<SmileOutlined />}
                style={mode === 'longBreak' ? { background: '#722ed1', borderColor: '#722ed1' } : {}}
                onClick={() => {
                  setIsRunning(false);
                  setMode('longBreak');
                }}
              >
                {t('pomodoro.longBreak')} ({longBreakDuration}m)
              </Button>
            </Space>
          </div>

          {/* Linked Event / Title Selector */}
          <Card
            size="small"
            style={{
              marginBottom: '20px',
              borderRadius: '12px',
              background: mode === 'focus' ? '#fff2e8' : '#f6ffed',
              borderColor: mode === 'focus' ? '#ffbb96' : '#b7eb8f',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  {t('pomodoro.linkEvent')}
                </Text>
                <Tag color={mode === 'focus' ? 'orange' : 'green'}>{category}</Tag>
              </div>

              <Select
                placeholder={t('pomodoro.linkEventPlaceholder')}
                allowClear
                value={selectedEventId}
                onChange={handleSelectSchedule}
                style={{ width: '100%' }}
                options={schedules.map((s) => ({
                  value: s._id,
                  label: `${s.title} (${s.category || t('common.all')})`,
                }))}
              />

              <Input
                placeholder={t('pomodoro.customTitlePlaceholder')}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                variant="filled"
              />
            </div>
          </Card>

          {/* Countdown Dial Display */}
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <Progress
              type="circle"
              percent={percent}
              format={() => (
                <div>
                  <div
                    style={{
                      fontSize: '46px',
                      fontWeight: 'bold',
                      fontFamily: 'monospace',
                      color: mode === 'focus' ? '#ff4d4f' : '#52c41a',
                    }}
                  >
                    {formatTime(timeLeft)}
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    {mode === 'focus'
                      ? t('pomodoro.focusing')
                      : mode === 'shortBreak'
                      ? t('pomodoro.restingShort')
                      : t('pomodoro.restingLong')}
                  </Text>
                </div>
              )}
              width={220}
              strokeWidth={8}
              strokeColor={mode === 'focus' ? '#ff4d4f' : '#52c41a'}
            />
          </div>

          {/* Controls: Play/Pause, Reset, Skip */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Space size="large">
              <Tooltip title={t('pomodoro.resetTooltip')}>
                <Button
                  shape="circle"
                  size="large"
                  icon={<RedoOutlined />}
                  onClick={handleReset}
                />
              </Tooltip>

              <Button
                type="primary"
                shape="circle"
                danger={mode === 'focus'}
                style={{
                  width: '64px',
                  height: '64px',
                  fontSize: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  background: mode !== 'focus' ? '#52c41a' : undefined,
                  borderColor: mode !== 'focus' ? '#52c41a' : undefined,
                }}
                icon={
                  isRunning ? (
                    <PauseCircleFilled style={{ fontSize: '32px' }} />
                  ) : (
                    <PlayCircleFilled style={{ fontSize: '32px' }} />
                  )
                }
                onClick={handleStartPause}
              />

              <Tooltip title={t('pomodoro.skipTooltip')}>
                <Button
                  shape="circle"
                  size="large"
                  icon={<StepForwardOutlined />}
                  onClick={handleSkip}
                />
              </Tooltip>
            </Space>
          </div>

          {/* Session Progress Indicator (4 per cycle) */}
          <div
            style={{
              textAlign: 'center',
              padding: '10px',
              background: '#fafafa',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>
              {t('pomodoro.cycle')} ({sessionCount % 4}/4 sessions):
            </Text>
            <Space size="small">
              {[1, 2, 3, 4].map((i) => {
                const completedInCycle = sessionCount % 4;
                const isDone = i <= completedInCycle;
                return (
                  <Tag
                    key={i}
                    color={isDone ? 'red' : 'default'}
                    style={{
                      borderRadius: '12px',
                      padding: '2px 10px',
                      fontWeight: isDone ? 'bold' : 'normal',
                    }}
                  >
                    {isDone ? <CheckCircleFilled style={{ marginRight: 4 }} /> : null} {t('pomodoro.session')} {i}
                  </Tag>
                );
              })}
            </Space>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Settings & Toggles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size="small">
              <Tooltip title={t('pomodoro.soundToggle')}>
                <Space size={4}>
                  <SoundOutlined style={{ color: soundEnabled ? '#1890ff' : '#ccc' }} />
                  <Switch
                    size="small"
                    checked={soundEnabled}
                    onChange={(checked) => setSoundEnabled(checked)}
                  />
                </Space>
              </Tooltip>

              <Tooltip title={t('pomodoro.webPushToggle')}>
                <Space size={4} style={{ marginLeft: '12px' }}>
                  <BellOutlined style={{ color: notifyEnabled ? '#1890ff' : '#ccc' }} />
                  <Switch
                    size="small"
                    checked={notifyEnabled}
                    onChange={(checked) => setNotifyEnabled(checked)}
                  />
                </Space>
              </Tooltip>
            </Space>

            {/* Quick Duration Preset Selector */}
            <Select
              size="small"
              value={focusDuration}
              onChange={(val) => {
                setFocusDuration(val);
                if (!isRunning && mode === 'focus') {
                  setTimeLeft(val * 60);
                }
              }}
              style={{ width: 110 }}
              options={[
                { value: 25, label: '25m Focus' },
                { value: 30, label: '30m Focus' },
                { value: 45, label: '45m Focus' },
                { value: 60, label: '60m Focus' },
              ]}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};
