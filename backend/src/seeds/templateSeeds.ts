import { Template } from '../models/Template';

export const seedTemplates = async (): Promise<void> => {
  const existing = await Template.countDocuments({ isSystem: true });
  if (existing > 0) return; // Already seeded

  const presets = [
    {
      name: 'Lịch Sinh Viên',
      description: 'Lịch học điển hình 1 tuần của sinh viên: 5 buổi sáng + 3 buổi chiều + tự học tối',
      icon: '📚',
      category: 'Học tập',
      isSystem: true,
      events: [
        { title: 'Toán Cao Cấp', dayOffset: 0, startHour: 7, startMinute: 0, endHour: 9, endMinute: 30, color: '#1890ff', category: 'Học tập' },
        { title: 'Vật Lý', dayOffset: 0, startHour: 9, startMinute: 45, endHour: 11, endMinute: 30, color: '#52c41a', category: 'Học tập' },
        { title: 'Lập Trình Cơ Bản', dayOffset: 1, startHour: 7, startMinute: 0, endHour: 9, endMinute: 30, color: '#722ed1', category: 'Học tập' },
        { title: 'Tiếng Anh', dayOffset: 1, startHour: 13, startMinute: 0, endHour: 15, endMinute: 0, color: '#fa8c16', category: 'Học tập' },
        { title: 'Cấu Trúc Dữ Liệu', dayOffset: 2, startHour: 7, startMinute: 0, endHour: 9, endMinute: 30, color: '#13c2c2', category: 'Học tập' },
        { title: 'Thực Hành Lập Trình', dayOffset: 2, startHour: 13, startMinute: 0, endHour: 16, endMinute: 0, color: '#eb2f96', category: 'Học tập' },
        { title: 'Toán Rời Rạc', dayOffset: 3, startHour: 7, startMinute: 0, endHour: 9, endMinute: 30, color: '#1890ff', category: 'Học tập' },
        { title: 'Giáo Dục Thể Chất', dayOffset: 3, startHour: 13, startMinute: 0, endHour: 15, endMinute: 0, color: '#52c41a', category: 'Sức khỏe' },
        { title: 'Mạng Máy Tính', dayOffset: 4, startHour: 7, startMinute: 0, endHour: 9, endMinute: 30, color: '#fa541c', category: 'Học tập' },
        { title: 'Tự Học', dayOffset: 0, startHour: 19, startMinute: 0, endHour: 21, endMinute: 0, color: '#faad14', category: 'Học tập' },
        { title: 'Tự Học', dayOffset: 2, startHour: 19, startMinute: 0, endHour: 21, endMinute: 0, color: '#faad14', category: 'Học tập' },
      ],
    },
    {
      name: 'Làm Việc Theo Ca',
      description: 'Lịch làm việc văn phòng 5 ngày: 8h-17h với nghỉ trưa',
      icon: '🏢',
      category: 'Công việc',
      isSystem: true,
      events: [
        { title: 'Làm việc buổi sáng', dayOffset: 0, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Nghỉ trưa', dayOffset: 0, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, color: '#52c41a', category: 'Nghỉ ngơi' },
        { title: 'Làm việc buổi chiều', dayOffset: 0, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Làm việc buổi sáng', dayOffset: 1, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Nghỉ trưa', dayOffset: 1, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, color: '#52c41a', category: 'Nghỉ ngơi' },
        { title: 'Làm việc buổi chiều', dayOffset: 1, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Làm việc buổi sáng', dayOffset: 2, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Nghỉ trưa', dayOffset: 2, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, color: '#52c41a', category: 'Nghỉ ngơi' },
        { title: 'Làm việc buổi chiều', dayOffset: 2, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Làm việc buổi sáng', dayOffset: 3, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Nghỉ trưa', dayOffset: 3, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, color: '#52c41a', category: 'Nghỉ ngơi' },
        { title: 'Làm việc buổi chiều', dayOffset: 3, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Làm việc buổi sáng', dayOffset: 4, startHour: 8, startMinute: 0, endHour: 12, endMinute: 0, color: '#1890ff', category: 'Công việc' },
        { title: 'Nghỉ trưa', dayOffset: 4, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, color: '#52c41a', category: 'Nghỉ ngơi' },
        { title: 'Làm việc buổi chiều', dayOffset: 4, startHour: 13, startMinute: 0, endHour: 17, endMinute: 0, color: '#1890ff', category: 'Công việc' },
      ],
    },
    {
      name: 'Time Blocking',
      description: 'Phương pháp Time Blocking: chia ngày thành các block tập trung 90 phút',
      icon: '⏱',
      category: 'Năng suất',
      isSystem: true,
      events: [
        { title: 'Deep Work Block 1', dayOffset: 0, startHour: 6, startMinute: 0, endHour: 7, endMinute: 30, color: '#722ed1', category: 'Tập trung' },
        { title: 'Nghỉ + Vận động', dayOffset: 0, startHour: 7, startMinute: 30, endHour: 8, endMinute: 0, color: '#52c41a', category: 'Sức khỏe' },
        { title: 'Deep Work Block 2', dayOffset: 0, startHour: 8, startMinute: 0, endHour: 9, endMinute: 30, color: '#722ed1', category: 'Tập trung' },
        { title: 'Email & Admin', dayOffset: 0, startHour: 9, startMinute: 30, endHour: 10, endMinute: 0, color: '#faad14', category: 'Công việc' },
        { title: 'Deep Work Block 3', dayOffset: 0, startHour: 10, startMinute: 0, endHour: 11, endMinute: 30, color: '#722ed1', category: 'Tập trung' },
        { title: 'Nghỉ trưa + Đọc sách', dayOffset: 0, startHour: 11, startMinute: 30, endHour: 13, endMinute: 0, color: '#52c41a', category: 'Nghỉ ngơi' },
        { title: 'Creative Block', dayOffset: 0, startHour: 13, startMinute: 0, endHour: 14, endMinute: 30, color: '#eb2f96', category: 'Sáng tạo' },
        { title: 'Meeting / Collab', dayOffset: 0, startHour: 14, startMinute: 30, endHour: 16, endMinute: 0, color: '#13c2c2', category: 'Họp' },
        { title: 'Review & Plan', dayOffset: 0, startHour: 16, startMinute: 0, endHour: 17, endMinute: 0, color: '#fa8c16', category: 'Lập kế hoạch' },
      ],
    },
  ];

  await Template.insertMany(presets);
  console.log('✅ Seeded 3 system templates');
};
