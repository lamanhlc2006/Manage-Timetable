import { Response } from 'express';
import { Category } from '../models/Category';
import { AuthRequest } from '../middlewares/authMiddleware';

const DEFAULT_CATEGORIES = [
  { name: 'Học tập', color: '#1890ff', icon: '📚', isSystem: true },
  { name: 'Công việc', color: '#52c41a', icon: '💼', isSystem: true },
  { name: 'Cá nhân', color: '#722ed1', icon: '👤', isSystem: true },
  { name: 'Khác', color: '#fa8c16', icon: '🔍', isSystem: true },
];

/**
 * @desc    Get categories for user (system + custom)
 * @route   GET /api/categories
 * @access  Private
 */
export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    let categories = await Category.find({
      $or: [{ isSystem: true }, { createdBy: req.user._id }],
    }).sort({ isSystem: -1, createdAt: 1 });

    // Seed defaults if no categories exist in database
    if (categories.length === 0) {
      categories = await Category.insertMany(DEFAULT_CATEGORIES);
    }

    res.json(categories);
  } catch (error: any) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Create custom category
 * @route   POST /api/categories
 * @access  Private
 */
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, color, icon } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ message: 'Tên danh mục không được để trống' });
      return;
    }

    const category = await Category.create({
      name: name.trim(),
      color: color || '#1890ff',
      icon: icon || '📌',
      createdBy: req.user._id,
      isSystem: false,
    });

    res.status(201).json(category);
  } catch (error: any) {
    console.error('Create category error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private
 */
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, color, icon } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json({ message: 'Không tìm thấy danh mục' });
      return;
    }

    // Only creator or admin can update non-system category
    if (!category.isSystem && category.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Không có quyền chỉnh sửa danh mục này' });
      return;
    }

    if (name !== undefined) category.name = name.trim();
    if (color !== undefined) category.color = color;
    if (icon !== undefined) category.icon = icon;

    await category.save();
    res.json(category);
  } catch (error: any) {
    console.error('Update category error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private
 */
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const category = await Category.findById(id);
    if (!category) {
      res.status(404).json({ message: 'Không tìm thấy danh mục' });
      return;
    }

    if (category.isSystem) {
      res.status(400).json({ message: 'Không thể xóa danh mục mặc định của hệ thống' });
      return;
    }

    if (category.createdBy?.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Không có quyền xóa danh mục này' });
      return;
    }

    await Category.findByIdAndDelete(id);
    res.json({ message: 'Đã xóa danh mục thành công', id });
  } catch (error: any) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
