import { ISchedule } from '../types';
import { Schedule } from '../models/Schedule';

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

      // Fast-forward temp if templateStart is significantly before startLimit
      if (temp.getTime() < startLimit) {
        const weeksDiff = Math.floor((startLimit - temp.getTime()) / (interval * 7 * 24 * 3600 * 1000));
        if (weeksDiff > 1) {
          temp.setDate(temp.getDate() + (weeksDiff - 1) * 7 * interval);
        }
      }

      // Find the start of the week of the templateStart (shifting to Sunday)
      const startOfTemplateWeek = new Date(templateStart);
      startOfTemplateWeek.setHours(0, 0, 0, 0);
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

      // Fast-forward temp if templateStart is significantly before startLimit
      if (templateStart.getTime() < startLimit) {
        if (type === 'daily') {
          const daysDiff = Math.floor((startLimit - templateStart.getTime()) / (interval * 24 * 3600 * 1000));
          if (daysDiff > 1) {
            temp.setDate(temp.getDate() + (daysDiff - 1) * interval);
          }
        } else if (type === 'weekly') {
          const weeksDiff = Math.floor((startLimit - templateStart.getTime()) / (interval * 7 * 24 * 3600 * 1000));
          if (weeksDiff > 1) {
            temp.setDate(temp.getDate() + (weeksDiff - 1) * 7 * interval);
          }
        } else if (type === 'monthly') {
          const startLimitDate = new Date(startLimit);
          const monthsDiff = (startLimitDate.getFullYear() - templateStart.getFullYear()) * 12 + (startLimitDate.getMonth() - templateStart.getMonth());
          const jumpIntervals = Math.floor(monthsDiff / interval);
          if (jumpIntervals > 1) {
            temp.setMonth(temp.getMonth() + (jumpIntervals - 1) * interval);
          }
        }
      }

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

/**
 * Checks if a proposed schedule time slot or recurring series conflicts with any existing
 * schedule (including recurring virtual instances) for a specific user.
 */
export const checkScheduleConflicts = async (
  userId: string,
  start: Date,
  end: Date,
  excludeId?: string,
  proposedRecurrence?: any
): Promise<any[]> => {
  // Determine range window to fetch candidate schedules from database
  let windowEnd = end;
  if (proposedRecurrence && proposedRecurrence.type && proposedRecurrence.type !== 'none') {
    const recEnd = proposedRecurrence.endDate ? new Date(proposedRecurrence.endDate) : null;
    const maxWindowEnd = new Date(start.getTime() + 180 * 24 * 3600 * 1000); // Check up to 6 months
    windowEnd = recEnd && recEnd < maxWindowEnd ? recEnd : maxWindowEnd;
  }

  const query: any = {
    createdBy: userId,
    $or: [
      {
        'recurrence.type': { $exists: true, $ne: 'none' },
        startTime: { $lt: windowEnd },
        $or: [
          { 'recurrence.endDate': { $exists: false } },
          { 'recurrence.endDate': null },
          { 'recurrence.endDate': { $gte: start } },
        ],
      },
      {
        $or: [
          { 'recurrence.type': { $exists: false } },
          { 'recurrence.type': 'none' },
        ],
        startTime: { $lt: windowEnd },
        endTime: { $gt: start },
      },
    ],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
    query.parentEvent = { $ne: excludeId };
  }

  const candidateSchedules = await Schedule.find(query).populate('createdBy', 'username email role');
  const expandedExistingEvents = expandRecurringEvents(candidateSchedules as any, start, windowEnd);

  // If the proposed event itself is recurring, expand its proposed instances too
  let proposedInstances: any[] = [];
  if (proposedRecurrence && proposedRecurrence.type && proposedRecurrence.type !== 'none') {
    const fakeProposedSchedule = {
      _id: 'proposed_temp_id',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      recurrence: proposedRecurrence,
    };
    proposedInstances = expandRecurringEvents([fakeProposedSchedule as any], start, windowEnd);
  } else {
    proposedInstances = [
      {
        _id: 'proposed_temp_id',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    ];
  }

  // Cross-check proposed instances with existing expanded events
  const conflictingMap = new Map<string, any>();

  for (const pInst of proposedInstances) {
    const pStart = new Date(pInst.startTime).getTime();
    const pEnd = new Date(pInst.endTime).getTime();

    for (const exEvt of expandedExistingEvents) {
      const exStart = new Date(exEvt.startTime).getTime();
      const exEnd = new Date(exEvt.endTime).getTime();

      if (exStart < pEnd && exEnd > pStart) {
        // Exclude self if parent match
        const realId = exEvt.parentEvent ? exEvt.parentEvent.toString() : exEvt._id.toString();
        if (!excludeId || (realId !== excludeId && exEvt._id.toString() !== excludeId)) {
          conflictingMap.set(exEvt._id.toString(), exEvt);
        }
      }
    }
  }

  return Array.from(conflictingMap.values());
};
