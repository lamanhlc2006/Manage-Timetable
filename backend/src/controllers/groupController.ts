import { Response } from 'express';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { Schedule } from '../models/Schedule';
import { AuthRequest } from '../middlewares/authMiddleware';
import { handleControllerError, isValidObjectId } from '../utils/errorHandler';

// POST /api/groups — Create group
export const createGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const { name, description, color } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Tên nhóm không được để trống' }); return; }
    const group = await Group.create({
      name: name.trim(),
      description: description?.trim(),
      color: color || '#1890ff',
      owner: req.user._id,
      members: [],
    });
    res.status(201).json(group);
  } catch (error: any) { handleControllerError(res, error, 'Create group error'); }
};

// GET /api/groups — List my groups (owned + member of)
export const getMyGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const groups = await Group.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    })
      .populate('owner', 'username email')
      .populate('members.user', 'username email')
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (error: any) { handleControllerError(res, error, 'Get groups error'); }
};

// PUT /api/groups/:id — Update group (owner only)
export const updateGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) { res.status(404).json({ message: 'Nhóm không tồn tại hoặc bạn không có quyền' }); return; }
    const { name, description, color } = req.body;
    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description?.trim();
    if (color) group.color = color;
    await group.save();
    res.json(group);
  } catch (error: any) { handleControllerError(res, error, 'Update group error'); }
};

// DELETE /api/groups/:id — Delete group (owner only, also unlinks schedules)
export const deleteGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const group = await Group.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!group) { res.status(404).json({ message: 'Nhóm không tồn tại hoặc bạn không có quyền' }); return; }
    // Unlink schedules from this group
    await Schedule.updateMany({ group: group._id }, { $unset: { group: 1 } });
    res.json({ message: 'Đã xoá nhóm' });
  } catch (error: any) { handleControllerError(res, error, 'Delete group error'); }
};

// POST /api/groups/:id/members — Add member (owner only)
export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) { res.status(404).json({ message: 'Nhóm không tồn tại hoặc bạn không có quyền' }); return; }
    const { username, role } = req.body;
    if (!username) { res.status(400).json({ message: 'Vui lòng nhập username' }); return; }
    const targetUser = await User.findOne({ username: username.trim() }).select('_id username email');
    if (!targetUser) { res.status(404).json({ message: 'Không tìm thấy người dùng' }); return; }
    if (targetUser._id.toString() === req.user._id.toString()) { res.status(400).json({ message: 'Không thể thêm chính mình' }); return; }
    const exists = group.members.find((m: any) => m.user.toString() === targetUser._id.toString());
    if (exists) { res.status(400).json({ message: 'Người dùng đã là thành viên' }); return; }
    group.members.push({ user: targetUser._id as any, role: role || 'viewer', joinedAt: new Date() });
    await group.save();
    const populated = await Group.findById(group._id).populate('owner', 'username email').populate('members.user', 'username email');
    res.json(populated);
  } catch (error: any) { handleControllerError(res, error, 'Add member error'); }
};

// PATCH /api/groups/:id/members/:userId — Change member role (owner only)
export const changeMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) { res.status(404).json({ message: 'Nhóm không tồn tại hoặc bạn không có quyền' }); return; }
    const member = group.members.find((m: any) => m.user.toString() === req.params.userId);
    if (!member) { res.status(404).json({ message: 'Thành viên không tồn tại' }); return; }
    const { role } = req.body;
    if (!['viewer', 'editor'].includes(role)) { res.status(400).json({ message: 'Role phải là viewer hoặc editor' }); return; }
    member.role = role;
    await group.save();
    const populated = await Group.findById(group._id).populate('owner', 'username email').populate('members.user', 'username email');
    res.json(populated);
  } catch (error: any) { handleControllerError(res, error, 'Change role error'); }
};

// DELETE /api/groups/:id/members/:userId — Remove member (owner only) or leave group (self)
export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const group = await Group.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Nhóm không tồn tại' }); return; }
    const isOwner = group.owner.toString() === req.user._id.toString();
    const isSelf = req.params.userId === req.user._id.toString();
    if (!isOwner && !isSelf) { res.status(403).json({ message: 'Bạn không có quyền' }); return; }
    group.members = group.members.filter((m: any) => m.user.toString() !== req.params.userId) as any;
    await group.save();
    const populated = await Group.findById(group._id).populate('owner', 'username email').populate('members.user', 'username email');
    res.json(populated);
  } catch (error: any) { handleControllerError(res, error, 'Remove member error'); }
};

// GET /api/groups/:id/schedules — Get schedules for a group
export const getGroupSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
    const group = await Group.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Nhóm không tồn tại' }); return; }
    const isOwner = group.owner.toString() === req.user._id.toString();
    const isMember = group.members.some((m: any) => m.user.toString() === req.user!._id.toString());
    if (!isOwner && !isMember) { res.status(403).json({ message: 'Bạn không phải thành viên nhóm này' }); return; }
    const schedules = await Schedule.find({ group: group._id }).populate('createdBy', 'username email');
    res.json(schedules);
  } catch (error: any) { handleControllerError(res, error, 'Get group schedules error'); }
};
