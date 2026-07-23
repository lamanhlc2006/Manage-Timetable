# 🛠️ Báo Cáo Rà Soát Lỗi & Kế Hoạch Khắc Phục Dự Án — Manage Timetable

> **Người thực hiện**: Senior QA Lead & Principal System Architect  
> **Ngày rà soát**: 24/07/2026  
> **Phạm vi kiểm thử**: Toàn bộ codebase Backend (Express/Mongoose) & Frontend (React/Vite/Antd/FullCalendar)  
> **Trạng thái**: Đã xác định **9 vấn đề tồn đọng** (gồm 3 lỗi nghiêm trọng/bảo mật, 3 lỗi logic/UX, 3 kỹ thuật/mở rộng).

---

## 1. Tổng Quan Báo Cáo Rà Soát (QA Executive Summary)

Sau khi rà soát trực tiếp toàn bộ mã nguồn hệ thống `Manage Timetable`, hệ thống đã đạt độ hoàn thiện cao về giao diện và tính năng người dùng (Multi-view Calendar, Category CRUD, Pomodoro Timer, Keyboard Shortcuts, Admin Panel). 

Tuy nhiên, ở góc độ **Chuyên gia Kiểm thử (QA) & Kiến trúc sư Hệ thống**, vẫn còn tồn tại những **lỗ hổng bảo mật**, **lỗi logic xử lý dữ liệu** và **nợ kỹ thuật (Tech Debt)** cần khắc phục ngay để đảm bảo ứng dụng vận hành an toàn và ổn định trên môi trường Production.

### Bảng phân loại mức độ rủi ro (Risk Classification)

| Mức độ | Số lượng | Mô tả rủi ro |
|---|---|---|
| 🔴 **Cao (Critical / Security)** | 3 | Lỗ hổng phân quyền (IDOR), ReDoS / Regex Injection, Unhandled Mongoose CastError (500 Error) |
| 🟡 **Trung bình (Logic / UX)** | 3 | Xung đột lịch lặp chưa kiểm tra virtual instances, thiếu phân vùng dữ liệu cá nhân (`createdBy`), chuỗi hardcoded UI vỡ i18n |
| 🟢 **Thấp (Tech Debt / Feature)** | 3 | Thiếu bộ Test tự động (Jest/Supertest/Playwright), Web Push API chưa hoàn tất, thiếu Refresh Token Rotation |

---

## 2. Chi Tiết Các Lỗi & Lỗ Hổng Chưa Khắc Phục

---

### 🔴 LỖ HỔNG 01: Phân quyền xem & chỉnh sửa/xóa chưa triệt để (Broken Object Level Authorization — IDOR)

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`updateSchedule`, `deleteSchedule`)
- **Mô tả lỗi**:
  Trong hàm `updateSchedule` và `deleteSchedule`, controller chỉ thực hiện `Schedule.findById(targetId)` mà **không kiểm tra** người dùng hiện tại (`req.user._id`) có phải là chủ sở hữu sự kiện (`createdBy`) hoặc có phải là Admin hay không.
- **Tác động**:
  Một `User` thông thường nếu biết ID của sự kiện thuộc về người dùng khác (hoặc Admin) có thể gửi request `PUT /api/schedules/:id` hoặc `DELETE /api/schedules/:id` để thay đổi hoặc xóa sạch lịch trình của người khác.
- **Mã nguồn hiện tại**:
  ```typescript
  // scheduleController.ts (Line 156)
  const schedule = await Schedule.findById(targetId);
  if (!schedule) {
    res.status(404).json({ message: 'Schedule event not found' });
    return;
  }
  // ❌ KHÔNG CÓ BƯỚC CHECK: schedule.createdBy === req.user._id HOẶC req.user.role === 'admin'
  ```

---

### 🔴 LỖ HỔNG 02: Lỗi Regex Injection & ReDoS trong ô tìm kiếm (Search Vulnerability)

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`searchSchedules`) & `userController.ts` (`getUsers`)
- **Mô tả lỗi**:
  Khi người dùng nhập từ khóa tìm kiếm (`keyword` hoặc `search`), backend truyền trực tiếp chuỗi này vào `$regex` của MongoDB mà không qua hàm escape các ký tự đặc biệt như `(`, `[`, `*`, `+`, `?`, `\`.
- **Tác động**:
  - Nếu user gõ `(` hoặc `[` vào ô search, MongoDB ném ra lỗi cú pháp Regex làm sập request với mã **HTTP 500 Internal Server Error**.
  - Kẻ tấn công có thể truyền các chuỗi ReDoS (Regular Expression Denial of Service) như `(a+)+$` làm treo CPU của MongoDB Server.
- **Mã nguồn hiện tại**:
  ```typescript
  // scheduleController.ts (Line 438)
  query.$or = [
    { title: { $regex: keyword as string, $options: 'i' } },
    { description: { $regex: keyword as string, $options: 'i' } },
  ]; // ❌ Chưa escape Regex special characters
  ```

---

### 🔴 LỖ HỔNG 03: Sập hệ thống 500 do Unhandled Mongoose CastError

- **Vị trí**: Tất cả Controllers (`scheduleController`, `userController`, `categoryController`)
- **Mô tả lỗi**:
  Khi truyền ID không đúng định dạng 24 ký tự hex của MongoDB (ví dụ: `GET /api/schedules/invalid-id-123`), Mongoose ném ra ngoại lệ `CastError: Cast to ObjectId failed`.
- **Tác động**:
  Controller bắt lỗi này ở khối `catch (error)` chung và trả về `500 Server Error` kèm stack trace thay vì trả về `400 Bad Request` hoặc `404 Not Found`.

---

### 🟡 LỖ HỔNG 04: Thuật toán Conflict Detection bỏ qua sự kiện lặp (Recurring Virtual Instances)

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`createSchedule`, `updateSchedule`)
- **Mô tả lỗi**:
  Khi tạo hoặc sửa sự kiện, hàm phát hiện trùng lịch query MongoDB:
  ```typescript
  const overlapping = await Schedule.find({
    createdBy: req.user._id,
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  ```
  Query này chỉ tìm các record tĩnh trong Database. Nếu người dùng có một **sự kiện lặp hàng ngày (Daily Event)** từ 9:00 - 10:00 AM, khi tạo sự kiện mới vào 9:30 AM ngày hôm sau, Backend **không phát hiện trùng** vì instance 9:30 AM ngày hôm sau là virtual instance được sinh ra khi render, chưa có document riêng trong DB.
- **Tác động**: Cảnh báo trùng lịch bị lọt lưới với toàn bộ các sự kiện lặp lại.

---

### 🟡 LỖ HỔNG 05: Phân vùng dữ liệu cá nhân trong `getSchedules` (Privacy & Scope Issue)

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`getSchedules`)
- **Mô tả lỗi**:
  Hàm `getSchedules` lấy toàn bộ sự kiện trong DB (`Schedule.find(dateQuery)`) mà không filter theo `createdBy: req.user._id` (trừ khi truyền param `creator`).
- **Tác động**:
  Nếu mục tiêu ứng dụng là Lịch cá nhân (Personal Timetable), mọi user đều thấy toàn bộ lịch của user khác. Nếu muốn hỗ trợ cả lịch cá nhân lẫn lịch chung, cần bổ sung cờ phân biệt `isPublic` / `visibility`.

---

### 🟡 LỖ HỔNG 06: Chuỗi văn bản Hardcoded trên Frontend gây vỡ trải nghiệm i18n

- **Vị trí**: `ScheduleCalendar.tsx`, `PomodoroModal.tsx`, `CommonLayout.tsx`
- **Mô tả lỗi**:
  Một số đoạn hội thoại Modal, thông báo lỗi (`message.error`), gợi ý phím tắt và tooltip vẫn viết cứng bằng tiếng Việt (ví dụ: *"Cảnh báo trùng lịch trình!"*, *"Thời gian bắt đầu phải trước thời gian kết thúc!"*) thay vì gọi qua `t('key')` của `react-i18next`.
- **Tác động**: Khi người dùng chuyển sang ngôn ngữ **Tiếng Anh (English)**, các thông báo này vẫn hiển thị Tiếng Việt.

---

### 🟢 LỖ HỔNG 07: Thiếu bộ Test tự động (Testing Debt)

- **Vị trí**: Toàn bộ dự án (`backend` & `frontend`)
- **Mô tả lỗi**:
  Chưa có bất kỳ framework testing nào (Jest, Supertest, Vitest, Playwright).
- **Tác động**: Mọi lần refactor hoặc thêm tính năng mới đều phải test tay (manual test), dễ gây ra regression bugs.

---

### 🟢 LỖ HỔNG 08: Web Push API & Background Notification chưa hoàn chỉnh (Phase 3)

- **Vị trí**: Backend & Service Worker
- **Mô tả lỗi**:
  Service Worker hiện tại chỉ cache static assets. Chưa triển khai VAPID Keys và endpoint Web Push (`pushManager.subscribe`) để gửi thông báo đẩy đến thiết bị khi đóng trình duyệt.

---

### 🟢 LỖ HỔNG 09: Thời gian sống JWT dài & Thiếu Refresh Token Rotation

- **Vị trí**: `backend/src/controllers/authController.ts`
- **Mô tả lỗi**:
  Access Token được phát hành với thời hạn cố định 30 ngày trong `httpOnly` cookie mà không có cơ chế `Refresh Token` hoặc `Token Revocation`.
- **Tác động**: Nếu tài khoản bị lộ cookie, không thể vô hiệu hóa phiên làm việc từ xa ngoại trừ việc đổi password.

---

## 3. Kế Hoạch Khắc Phục Chi Tiết (Action Plan)

---

### PHASE A: CẤP BÁCH — Hotfix Bảo Mật & Lỗi Sập Server (Ưu tiên hàng đầu — Sprint 1)

#### Task A1: Triển khai Middleware / Authorization Check (Sửa Lỗi 01)
- **Giải pháp**: Trong `updateSchedule` và `deleteSchedule`, thêm điều kiện kiểm tra quyền:
  ```typescript
  const isOwner = schedule.createdBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    res.status(403).json({ message: 'Bạn không có quyền thay đổi/xóa lịch trình này' });
    return;
  }
  ```

#### Task A2: Escape Regex & Chống ReDoS (Sửa Lỗi 02)
- **Giải pháp**: Tạo helper utility `escapeRegex(str: string)`:
  ```typescript
  export const escapeRegex = (text: string): string => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  };
  ```
  Bọc tất cả tham số tìm kiếm từ user trong `escapeRegex(search)` trước khi truyền vào `$regex`.

#### Task A3: Xử lý tập trung Mongoose CastError & Global Error Handler (Sửa Lỗi 03)
- **Giải pháp**: Bổ sung middleware xử lý lỗi toàn cục trong Express (`errorHandler.ts`):
  ```typescript
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Mã định danh (ID) không hợp lệ.' });
  }
  ```

---

### PHASE B: NÂNG CẤP LOGIC CỐT LÕI — Engine & Data Scope (Sprint 2)

#### Task B1: Nâng cấp Backend Conflict Detection Engine cho Lịch Lặp (Sửa Lỗi 04)
- **Giải pháp**: Khi kiểm tra xung đột trong `createSchedule` / `updateSchedule`:
  1. Lấy tất cả sự kiện tĩnh VÀ sự kiện lặp (`recurrence.type != 'none'`) của user trong khoảng thời gian `[start, end]`.
  2. Dùng `expandRecurringEvents` để giải nén các virtual instances trong khung giờ đó.
  3. Kiểm tra va chạm thời gian trên cả danh sách đã giải nén.

#### Task B2: Chuẩn hóa Phân Vùng Dữ Liệu Lịch Trình (Sửa Lỗi 05)
- **Giải pháp**: 
  - Trong `getSchedules`: Mặc định chỉ trả về lịch trình do chính `req.user._id` tạo ra HOẶC lịch trình được đánh dấu `isPublic: true` / được Admin tạo cho toàn hệ thống.
  - Cho phép Admin xem toàn bộ lịch trình khi bật filter "Người tạo".

---

### PHASE C: CHUẨN HÓA UI/UX & ĐA NGÔN NGỮ (Sprint 3)

#### Task C1: Quốc tế hóa (i18n) toàn bộ chuỗi hardcoded (Sửa Lỗi 06)
- **Giải pháp**:
  1. Thêm các key tương ứng vào `frontend/src/i18n/locales/vi.json` và `en.json` (ví dụ: `conflictWarningTitle`, `conflictWarningDesc`, `startTimeBeforeEndTime`).
  2. Thay thế toàn bộ chuỗi chữ cứng trong `ScheduleCalendar.tsx` và `PomodoroModal.tsx` bằng `t(...)`.

---

### PHASE D: NỢ KỸ THUẬT & TÍNH NĂNG NÂNG CAO (Sprint 4)

#### Task D1: Thiết lập Hệ thống Automated Testing (Sửa Lỗi 07)
- **Giải pháp**:
  1. Cài đặt `Jest` + `Supertest` cho Backend. Viết API Integration Tests cho Auth & Schedule CRUD.
  2. Cài đặt `@testing-library/react` + `Vitest` cho Frontend.

#### Task D2: Hoàn thiện Web Push API cho PWA (Sửa Lỗi 08)
- **Giải pháp**: Tích hợp thư viện `web-push` ở backend, tạo endpoint `/api/notifications/subscribe` lưu PushSubscription và kích hoạt Service Worker notification.

#### Task D3: Triển khai Refresh Token Rotation & Short-Lived Access Tokens (Sửa Lỗi 09)
- **Giải pháp**: 
  - Đổi Access Token thành thời hạn ngắn (15 phút).
  - Thêm Refresh Token cookie (7-30 ngày) và endpoint `/api/auth/refresh` để cấp mới token tự động.

---

## 4. Ma Trận Ưu Tiên Triển Khai (Priority Matrix)

```
                       CẤP BÁCH (Urgent)                 BÌNH THƯỜNG (Normal)
             ┌──────────────────────────────────┬──────────────────────────────────┐
  ẢNH HƯỞNG  │ 🔴 Task A1: Fix IDOR Auth Check  │ 🟡 Task B1: Conflict Engine Rec  │
   LỚN       │ 🔴 Task A2: Fix Regex Injection  │ 🟡 Task B2: User Data Scope      │
 (High Imp.) │ 🔴 Task A3: Handle CastError     │ 🟢 Task D3: Refresh Token Rot.   │
             ├──────────────────────────────────┼──────────────────────────────────┤
  ẢNH HƯỞNG  │                                  │ 🟡 Task C1: Complete i18n Keys   │
  TRUNG BÌNH │                                  │ 🟢 Task D1: Setup Jest/Supertest │
 (Med. Imp.) │                                  │ 🟢 Task D2: PWA Web Push API     │
             └──────────────────────────────────┴──────────────────────────────────┘
```

---

> 📌 **Kết luận**:
> Báo cáo này đã chỉ rõ 9 điểm yếu/lỗi tồn đọng trong mã nguồn và đưa ra lộ trình khắc phục từng bước cụ thể. Việc ưu tiên thực hiện **Phase A (Task A1, A2, A3)** ngay lập tức sẽ giúp bảo vệ hệ thống khỏi các lỗ hổng bảo mật nghiêm trọng và sự cố sập server.
