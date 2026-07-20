import { z } from 'zod';

const isValidDate = (val: string | Date | undefined | null) => {
  if (val === undefined || val === null) return true;
  return !isNaN(new Date(val).getTime());
};

const recurrenceSchema = z.object({
  type: z.enum(['none', 'daily', 'weekly', 'monthly', 'custom']).optional(),
  interval: z.number().min(1).optional(),
  daysOfWeek: z.array(z.number()).optional(),
  endDate: z.union([z.string(), z.date()]).nullable().optional().refine(isValidDate, {
    message: 'Ngày kết thúc lặp không hợp lệ',
  }),
  exceptions: z.array(z.union([z.string(), z.date()])).optional(),
});

export const createScheduleSchema = z
  .object({
    title: z.string({ message: 'Tiêu đề là bắt buộc' }).trim().min(1, 'Tiêu đề không được để trống'),
    description: z.string().optional(),
    startTime: z
      .union([z.string(), z.date()], { message: 'Thời gian bắt đầu là bắt buộc' })
      .refine(isValidDate, { message: 'Thời gian bắt đầu không hợp lệ' }),
    endTime: z
      .union([z.string(), z.date()], { message: 'Thời gian kết thúc là bắt buộc' })
      .refine(isValidDate, { message: 'Thời gian kết thúc không hợp lệ' }),
    color: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    recurrence: recurrenceSchema.optional(),
    force: z.boolean().optional(),
    forceCreate: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return start < end;
    },
    {
      message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
      path: ['endTime'],
    }
  );

export const updateScheduleSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề không được để trống').optional(),
    description: z.string().optional(),
    startTime: z
      .union([z.string(), z.date()])
      .optional()
      .refine(isValidDate, { message: 'Thời gian bắt đầu không hợp lệ' }),
    endTime: z
      .union([z.string(), z.date()])
      .optional()
      .refine(isValidDate, { message: 'Thời gian kết thúc không hợp lệ' }),
    color: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    recurrence: recurrenceSchema.optional(),
    recurrenceEditMode: z.enum(['all', 'current', 'future']).optional(),
    force: z.boolean().optional(),
    forceCreate: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        return start < end;
      }
      return true;
    },
    {
      message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
      path: ['endTime'],
    }
  );
