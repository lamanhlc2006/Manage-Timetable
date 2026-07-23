import { ISchedule } from '../types';

/**
 * Expands recurring schedules into virtual occurrences (instances) within a given date range.
 * Non-recurring schedules are kept as-is if they overlap the query range.
 * Recurring instances are skipped if their start date split (YYYY-MM-DD) matches any exception date.
 */
export const expandRecurringEvents = (
  schedules: ISchedule[],
  rangeStart: Date,
  rangeEnd: Date
): any[] => {
  const result: any[] = [];
  const startLimit = new Date(rangeStart).getTime();
  const endLimit = new Date(rangeEnd).getTime();

  for (const event of schedules) {
    const eventObj = event.toObject ? event.toObject() : event;

    // 1. Non-recurring schedule: keep if overlapping
    if (!eventObj.recurrence || eventObj.recurrence.type === 'none') {
      const eventStart = new Date(eventObj.startTime).getTime();
      const eventEnd = new Date(eventObj.endTime).getTime();
      if (eventStart < endLimit && eventEnd > startLimit) {
        result.push(eventObj);
      }
      continue;
    }

    // 2. Recurring template
    const recurrence = eventObj.recurrence;
    const interval = recurrence.interval || 1;
    const type = recurrence.type;
    const daysOfWeek = recurrence.daysOfWeek || []; // [0-6] 0=Sunday, 1=Monday...
    const endDate = recurrence.endDate ? new Date(recurrence.endDate) : null;

    // Parse exceptions to YYYY-MM-DD format for fast lookup
    const exceptionsSet = new Set<string>();
    if (recurrence.exceptions && Array.isArray(recurrence.exceptions)) {
      recurrence.exceptions.forEach((exc: any) => {
        const d = new Date(exc);
        if (!isNaN(d.getTime())) {
          exceptionsSet.add(d.toISOString().split('T')[0]);
        }
      });
    }

    const templateStart = new Date(eventObj.startTime);
    const templateEnd = new Date(eventObj.endTime);
    const duration = templateEnd.getTime() - templateStart.getTime();
    const recurrenceEndLimit = endDate ? Math.min(endDate.getTime(), endLimit) : endLimit;

    let limit = 0;
    const maxIterations = 2000;

    const getNextOccurrence = (date: Date) => {
      const next = new Date(date);
      if (type === 'daily') {
        next.setDate(next.getDate() + interval);
      } else if (type === 'weekly') {
        next.setDate(next.getDate() + 7 * interval);
      } else if (type === 'monthly') {
        next.setMonth(next.getMonth() + interval);
      } else {
        next.setDate(next.getDate() + 1);
      }
      return next;
    };

    if ((type === 'weekly' || type === 'custom') && daysOfWeek.length > 0) {
      // For weekly with specific days, we loop day-by-day to find matching days
      const temp = new Date(templateStart);
      temp.setHours(0, 0, 0, 0);

      // Find the start of the week of the templateStart (shifting to Sunday)
      const startOfTemplateWeek = new Date(temp);
      const dayOfWeekVal = startOfTemplateWeek.getDay();
      startOfTemplateWeek.setDate(startOfTemplateWeek.getDate() - dayOfWeekVal);

      while (temp.getTime() <= recurrenceEndLimit && limit < maxIterations) {
        limit++;

        // Calculate start of the current week (Sunday)
        const tempWeek = new Date(temp);
        const tempDayOfWeekVal = tempWeek.getDay();
        tempWeek.setDate(tempWeek.getDate() - tempDayOfWeekVal);

        const diffMs = tempWeek.getTime() - startOfTemplateWeek.getTime();
        const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

        // Only allow days that are in the matching week interval and matching day of week
        if (diffWeeks % interval === 0 && daysOfWeek.includes(temp.getDay())) {
          const currentStart = new Date(temp);
          currentStart.setHours(
            templateStart.getHours(),
            templateStart.getMinutes(),
            templateStart.getSeconds(),
            templateStart.getMilliseconds()
          );
          const currentEnd = new Date(currentStart.getTime() + duration);

          const dateStr = currentStart.toISOString().split('T')[0];
          if (!exceptionsSet.has(dateStr)) {
            if (currentStart.getTime() < endLimit && currentEnd.getTime() > startLimit) {
              const instanceId = `${eventObj._id}_${currentStart.getTime()}`;
              result.push({
                ...eventObj,
                _id: instanceId,
                startTime: currentStart.toISOString(),
                endTime: currentEnd.toISOString(),
                isVirtual: true,
                parentEvent: eventObj._id,
              });
            }
          }
        }
        temp.setDate(temp.getDate() + 1);
      }
    } else {
      // Daily, Monthly, or Weekly without daysOfWeek
      let temp = new Date(templateStart);
      while (temp.getTime() <= recurrenceEndLimit && limit < maxIterations) {
        limit++;

        const currentStart = new Date(temp);
        const currentEnd = new Date(currentStart.getTime() + duration);

        const dateStr = currentStart.toISOString().split('T')[0];
        if (!exceptionsSet.has(dateStr)) {
          if (currentStart.getTime() < endLimit && currentEnd.getTime() > startLimit) {
            const instanceId = `${eventObj._id}_${currentStart.getTime()}`;
            result.push({
              ...eventObj,
              _id: instanceId,
              startTime: currentStart.toISOString(),
              endTime: currentEnd.toISOString(),
              isVirtual: true,
              parentEvent: eventObj._id,
            });
          }
        }
        temp = getNextOccurrence(temp);
      }
    }
  }

  return result;
};
