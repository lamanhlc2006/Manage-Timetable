import { Response } from 'express';
import { Tag } from '../models/Tag';
import { AuthRequest } from '../middlewares/authMiddleware';
import { handleControllerError, isValidObjectId } from '../utils/errorHandler';

/**
 * @desc    Get all tags for the current user
 * @route   GET /api/tags
 * @access  Private
 */
export const getTags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const tags = await Tag.find({ createdBy: req.user._id }).sort({ name: 1 });
    res.json(tags);
  } catch (error: any) {
    handleControllerError(res, error, 'Get tags error');
  }
};

/**
 * @desc    Create a new tag
 * @route   POST /api/tags
 * @access  Private
 */
export const createTag = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, color } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Tên thẻ tag không được để trống' });
      return;
    }

    // Check for duplicate name for this user
    const existing = await Tag.findOne({ createdBy: req.user._id, name: name.trim() });
    if (existing) {
      res.status(409).json({ message: 'Thẻ tag với tên này đã tồn tại' });
      return;
    }

    const tag = await Tag.create({
      name: name.trim(),
      color: color || '#1890ff',
      createdBy: req.user._id,
    });

    res.status(201).json(tag);
  } catch (error: any) {
    handleControllerError(res, error, 'Create tag error');
  }
};

/**
 * @desc    Update a tag
 * @route   PUT /api/tags/:id
 * @access  Private
 */
export const updateTag = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, color } = req.body;

  try {
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Định dạng ID thẻ tag không hợp lệ' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      res.status(404).json({ message: 'Không tìm thấy thẻ tag' });
      return;
    }

    // Only creator can update their own tags
    if (tag.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Không có quyền chỉnh sửa thẻ tag này' });
      return;
    }

    if (name !== undefined) tag.name = name.trim();
    if (color !== undefined) tag.color = color;

    await tag.save();
    res.json(tag);
  } catch (error: any) {
    handleControllerError(res, error, 'Update tag error');
  }
};

/**
 * @desc    Delete a tag
 * @route   DELETE /api/tags/:id
 * @access  Private
 */
export const deleteTag = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Định dạng ID thẻ tag không hợp lệ' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      res.status(404).json({ message: 'Không tìm thấy thẻ tag' });
      return;
    }

    if (tag.createdBy.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Không có quyền xóa thẻ tag này' });
      return;
    }

    await Tag.findByIdAndDelete(id);
    res.json({ message: 'Đã xóa thẻ tag thành công', id });
  } catch (error: any) {
    handleControllerError(res, error, 'Delete tag error');
  }
};
