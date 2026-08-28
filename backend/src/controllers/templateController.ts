import { Response } from 'express';
import { Template } from '../models/Template';
import { Schedule } from '../models/Schedule';
import { AuthRequest } from '../middlewares/authMiddleware';
import { handleControllerError } from '../utils/errorHandler';

// GET /api/templates — List all templates (system + user's own)
export const getTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const templates = await Template.find({
      $or: [{ isSystem: true }, { createdBy: req.user._id }],
    }).sort({ isSystem: -1, name: 1 });
    res.json(templates);
  } catch (error: any) { handleControllerError(res, error, 'Get templates error'); }
};

// POST /api/templates — Create custom template
export const createTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const { name, description, icon, category, events } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Tên template không được để trống' }); return; }
    if (!events?.length) { res.status(400).json({ message: 'Template cần ít nhất 1 sự kiện' }); return; }
    const template = await Template.create({
      name: name.trim(),
      description: description?.trim(),
      icon: icon || '📋',
      category: category || 'general',
      events,
      isSystem: false,
      createdBy: req.user._id,
    });
    res.status(201).json(template);
  } catch (error: any) { handleControllerError(res, error, 'Create template error'); }
};

// DELETE /api/templates/:id — Delete custom template (not system)
export const deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const template = await Template.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
      isSystem: false,
    });
    if (!template) { res.status(404).json({ message: 'Template không tồn tại hoặc không có quyền xoá' }); return; }
    res.json({ message: 'Đã xoá template' });
  } catch (error: any) { handleControllerError(res, error, 'Delete template error'); }
};

// POST /api/templates/:id/apply — Apply template (batch create schedules)
export const applyTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const template = await Template.findById(req.params.id);
    if (!template) { res.status(404).json({ message: 'Template không tồn tại' }); return; }
    const { startDate } = req.body;
    if (!startDate) { res.status(400).json({ message: 'Vui lòng chọn ngày bắt đầu' }); return; }
    const base = new Date(startDate);
    base.setHours(0, 0, 0, 0);

    const schedules = template.events.map((ev) => {
      const start = new Date(base);
      start.setDate(start.getDate() + (ev.dayOffset || 0));
      start.setHours(ev.startHour, ev.startMinute, 0, 0);

      const end = new Date(base);
      end.setDate(end.getDate() + (ev.dayOffset || 0));
      end.setHours(ev.endHour, ev.endMinute, 0, 0);

      return {
        title: ev.title,
        description: ev.description || '',
        startTime: start,
        endTime: end,
        color: ev.color || '#1890ff',
        category: ev.category || template.category || 'Học tập',
        createdBy: req.user!._id,
        status: 'pending',
        priority: 'medium',
      };
    });

    const created = await Schedule.insertMany(schedules);
    res.status(201).json({ message: `Đã tạo ${created.length} sự kiện từ template`, count: created.length });
  } catch (error: any) { handleControllerError(res, error, 'Apply template error'); }
};
