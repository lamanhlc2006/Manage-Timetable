import { expandRecurringEvents } from '../src/config/recurrenceHelper';

describe('recurrenceHelper - expandRecurringEvents', () => {
  const rangeStart = new Date('2026-07-01T00:00:00.000Z');
  const rangeEnd = new Date('2026-07-31T23:59:59.999Z');

  it('should pass non-recurring events through if they overlap the query window', () => {
    const singleEvent: any = {
      _id: 'event1',
      title: 'Single Meeting',
      startTime: '2026-07-15T10:00:00.000Z',
      endTime: '2026-07-15T11:00:00.000Z',
      recurrence: { type: 'none' },
    };

    const expanded = expandRecurringEvents([singleEvent], rangeStart, rangeEnd);
    expect(expanded).toHaveLength(1);
    expect(expanded[0]._id).toBe('event1');
  });

  it('should expand daily recurring events into multiple virtual instances within range', () => {
    const dailyEvent: any = {
      _id: 'daily1',
      title: 'Daily Standup',
      startTime: '2026-07-01T09:00:00.000Z',
      endTime: '2026-07-01T09:30:00.000Z',
      recurrence: {
        type: 'daily',
        interval: 1,
      },
    };

    const expanded = expandRecurringEvents([dailyEvent], rangeStart, rangeEnd);
    // 31 days in July
    expect(expanded.length).toBe(31);
    expect(expanded[0].isVirtual).toBe(true);
    expect(expanded[0].parentEvent).toBe('daily1');
  });

  it('should skip exception dates for recurring events', () => {
    const dailyWithException: any = {
      _id: 'daily2',
      title: 'Daily Workout',
      startTime: '2026-07-01T07:00:00.000Z',
      endTime: '2026-07-01T08:00:00.000Z',
      recurrence: {
        type: 'daily',
        interval: 1,
        exceptions: ['2026-07-04T07:00:00.000Z'],
      },
    };

    const expanded = expandRecurringEvents([dailyWithException], rangeStart, rangeEnd);
    expect(expanded.length).toBe(30); // 31 days - 1 exception
    const hasJuly4th = expanded.some((evt) => evt.startTime.includes('2026-07-04'));
    expect(hasJuly4th).toBe(false);
  });

  it('should fast-forward and expand recurring events starting far in the past correctly', () => {
    const oldDailyEvent: any = {
      _id: 'oldDaily1',
      title: 'Legacy Daily Sync',
      startTime: '2020-01-01T09:00:00.000Z',
      endTime: '2020-01-01T09:30:00.000Z',
      recurrence: {
        type: 'daily',
        interval: 1,
      },
    };

    const expanded = expandRecurringEvents([oldDailyEvent], rangeStart, rangeEnd);
    expect(expanded.length).toBe(31);
    expect(expanded[0].startTime).toContain('2026-07-01');
  });
});
