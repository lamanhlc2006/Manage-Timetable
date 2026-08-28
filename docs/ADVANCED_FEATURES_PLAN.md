# 🗺️ Kế Hoạch Phát Triển Tính Năng Nâng Cao

> **Ngày tạo**: 27/08/2026 | **Cập nhật lần cuối**: 27/08/2026  
> **Nguyên tắc**: Làm từng Phase, mỗi Phase deploy độc lập. Không ôm đồm.

---

## 📊 Hiện Trạng Tổng Quan

Baseline đã hoàn thành: Auth (JWT Rotation), CRUD Schedule, Multi-View Calendar (Month/Week/Day/List),
Drag & Drop / Resize, Recurring Events, Conflict Detection, Categories & Tags, Keyboard Shortcuts,
Notifications (Web Push + Socket.IO + Cron), Import/Export (.ics/PDF/Excel/CSV), Google Calendar 2-Way Sync,
Dark Mode, Pomodoro, i18n (VI/EN), PWA Offline, Admin Panel, Automated Tests.

**Tổng effort ước tính: ~131h — chia 5 phases, làm dần.**

---

## PHASE 1 — Logic & Lịch Trình Nâng Cao (~24h)

### 1.1 Recurring Events — Thêm điều kiện "sau N lần" (~4h) ✅ 27/08/2026
- [x] **BE** — Thêm `count?: number` vào `IRecurrence` (types/index.ts)
- [x] **BE** — Thêm `count` vào Mongoose recurrence sub-schema (models/Schedule.ts)
- [x] **BE** — Cập nhật `expandRecurringEvents`: dừng khi `occurrenceCount >= count` (config/recurrenceHelper.ts)
- [x] **BE** — Thêm `count` vào Zod validation (validations/scheduleValidation.ts)
- [x] **FE** — Thêm Radio: "Sau N lần" / "Đến ngày" / "Không kết thúc" + InputNumber (EventFormModal.tsx)
- [x] **FE** — Cập nhật interface `RecurrenceSettings` (scheduleService.ts)
- [x] **TEST** — Thêm test case cho `count` trong recurrenceHelper.test.ts

### 1.2 Conflict UX — Cảnh báo trực quan + Gợi ý slot trống (~8h) ✅ 27/08/2026
- [x] **BE** — Tạo hàm `suggestNextAvailableSlot(userId, duration, preferredStart)` (recurrenceHelper.ts)
- [x] **BE** — Response 409 kèm `conflictingEvents[]` + `suggestedSlot` (scheduleController.ts)
- [x] **FE** — Hiển thị Alert đỏ + danh sách events conflict khi nhận 409 (EventFormModal.tsx)
- [x] **FE** — Nút "Dời sang khung giờ gợi ý" → auto-fill form (EventFormModal.tsx)
- [x] **FE** — Render border đỏ cho overlapping events trên calendar (ScheduleCalendar.tsx)

### 1.3 Multi-day & All-day Events (~6h) ✅ 27/08/2026
- [x] **BE** — Thêm `isAllDay?: boolean` vào `ISchedule` + Mongoose schema
- [x] **BE** — Cập nhật `pre('validate')`: bỏ qua check `start < end` nếu `isAllDay`
- [x] **BE** — Chuẩn hóa thời gian khi `isAllDay=true` (00:00 → 23:59)
- [x] **FE** — Switch "Cả ngày" trong EventFormModal → ẩn time picker khi bật
- [x] **FE** — Map `isAllDay → allDay: true` cho FullCalendar, style banner dải ngang

### 1.4 Buffer Time — Khoảng nghỉ tự động (~6h) ✅ 27/08/2026
- [x] **BE** — Thêm `bufferMinutes` vào User model (default 0, max 60)
- [x] **BE** — Cập nhật `checkScheduleConflicts`: mở rộng range kiểm tra ± bufferMinutes
- [x] **BE** — API `PATCH /api/auth/profile` mở rộng để cập nhật bufferMinutes
- [x] **FE** — Settings: Slider "Thời gian nghỉ giữa sự kiện: X phút" (0/5/10/15/30/60)
- [x] **FE** — EventFormModal: hiển thị tag "⏱ Buffer X phút được áp dụng"

---

## PHASE 2 — UX/UI Nâng Cao (~27h)

### 2.1 Timeline / Gantt View (~16h) ✅ 27/08/2026 (Option B: Custom)
> Đã chọn **Option B** — Custom HTML/CSS Timeline component
- [x] Chọn approach (A/B/C) → **B: Custom component**
- [x] **FE** — Tạo component `TimelineView.tsx` (trục X = thời gian, Y = events grouped by category, bar ngang)
- [x] **FE** — Hỗ trợ zoom (Giờ ↔ Ngày ↔ Tuần), click → detail, DatePicker chọn ngày
- [x] **FE** — Thêm nút "Timeline" vào toolbar ScheduleCalendar (toggle giữa Calendar ↔ Timeline)

### 2.2 Bộ lọc nâng cao (~4h) ✅ 27/08/2026
- [x] **BE** — `searchSchedules`: thêm filter params `status`, `tags[]`
- [x] **FE** — CalendarFilterPopover: thêm Select lọc trạng thái (Pending/Completed/Cancelled)
- [x] **FE** — CalendarFilterPopover: thêm Select lọc theo Tags (multi-select, hiển thị màu)
- [x] **FE** — Toggle "Ẩn events đã hoàn thành"

### 2.3 Tag Filter Bar trên Calendar (~4h) ✅ 27/08/2026
- [x] **FE** — Tạo `TagFilterBar.tsx`: thanh ngang chip tags có màu, click toggle on/off
- [x] **FE** — Tích hợp vào ScheduleCalendar toolbar

### 2.4 Phím tắt bổ sung (~3h) ✅ 27/08/2026
- [x] **FE** — `E` edit, `Delete` xóa, `Enter` detail, `←/→` prev/next, `Ctrl+F` search, `L` list view
- [x] **FE** — Cập nhật ShortcutsHelpModal

---

## PHASE 3 — Thông Báo & Tích Hợp (~16h)

### 3.1 In-app Toast Banner (~2h) ✅ (đã có sẵn)
- [x] **FE** — Lắng nghe socket `notification:new` type `reminder` → hiển thị Ant Design notification toast *(CommonLayout.tsx dòng 128–167)*
- [x] **FE** — Nút "Xem chi tiết" → navigate tới event, auto-dismiss 10s + chime sound

### 3.2 Email Notification (~8h) ✅ 27/08/2026
> Sử dụng **nodemailer + generic SMTP** (cấu hình qua env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
- [x] **BE** — Cài `nodemailer`, tạo emailService.ts (template HTML, hàm sendReminderEmail)
- [x] **BE** — Thêm `emailNotifications`, `notificationEmail` vào User model
- [x] **BE** — reminderCron: sau Web Push → check `emailNotifications` → gửi email
- [x] **FE** — Settings tab "Thông báo": Switch email + input email address

### 3.3 webcal:// Dynamic Feed URL (~6h) ✅ 27/08/2026
- [x] **BE** — Thêm `calendarFeedToken` (UUID unique) vào User model
- [x] **BE** — `GET /api/schedules/feed/:token` (public, no auth) → trả text/calendar
- [x] **BE** — `POST /api/auth/generate-feed-token` + `DELETE /api/auth/revoke-feed-token`
- [x] **FE** — Settings: nút "Tạo link đăng ký lịch" → hiển thị webcal:// URL + Copy + Hướng dẫn

---

## PHASE 4 — Cộng Tác & Chia Sẻ (~36h)

### 4.1 Share Link View-only (~12h) ✅ 28/08/2026
- [x] **BE** — Model ShareLink (token, permission, expiresAt, password?)
- [x] **BE** — API: `POST /share/create`, `GET /share/:token`, `DELETE /share/:id`, `GET /share/my-links/list`
- [x] **FE** — Trang SharedCalendarView.tsx (public, FullCalendar read-only, password prompt)
- [x] **FE** — Route `/shared/:token`, nút "Chia sẻ lịch" + ShareCalendarModal tạo/quản lý link

### 4.2 Group Collaboration (~24h) ✅ 28/08/2026
> ✅ **Quyết định**: Phân quyền viewer/editor, owner = admin tự động
- [x] **BE** — Model Group (name, owner, members[{user, role}])
- [x] **BE** — API: CRUD Group, invite by username, change role, remove member, get group schedules
- [x] **BE** — Schedule: thêm `group?` ref + index, query logic cho group members
- [x] **FE** — Trang GroupManagement.tsx (CRUD nhóm + quản lý thành viên)
- [x] **FE** — Calendar: dropdown chọn "Lịch cá nhân" / "Lịch nhóm X" + readOnly cho viewer

---

## PHASE 5 — Thống Kê & Templates (~28h)

### 5.1 Time Analytics Nâng Cao (~16h) ✅ 28/08/2026
- [x] **BE** — API analytics: time-distribution, completion-rate, weekly-trend, heatmap (MongoDB aggregation)
- [x] **FE** — Stacked Bar: phân bổ giờ theo Category trong tuần/tháng
- [x] **FE** — KPI Card: tỷ lệ hoàn thành đúng hạn (Progress circle dashboard)
- [x] **FE** — Line Chart: trend giờ làm việc 4-12 tuần
- [x] **FE** — Heatmap: busy theo thứ × giờ (7×24 grid, tooltip, màu gradient)

### 5.2 Timetable Templates (~12h) ✅ 28/08/2026
- [x] **BE** — Model Template (name, category, events[], isSystem) + TemplateEvent sub-schema
- [x] **BE** — API: GET templates, POST create, DELETE /:id, POST /:id/apply (batch create schedules)
- [x] **BE** — Seed 3 preset: 📚 Lịch Sinh Viên, 🏢 Làm Việc Theo Ca, ⏱ Time Blocking
- [x] **FE** — TemplateModal.tsx: grid cards, preview timeline, DatePicker chọn ngày bắt đầu
- [x] **FE** — Nút "📋 Templates" trên calendar toolbar

---

## 🐛 Lỗi Phát Hiện Thêm (Fix Khi Rảnh)

- [x] `notificationService.ts` (FE): `fetchNotifications()` thiếu params phân trang → ✅ Đã có `page/limit` params (28/08/2026)
- [x] `Schedule.category` default `'Học tập'` hardcoded → ✅ Tạo `DEFAULT_CATEGORY` constant, dùng ở 8 files FE + 1 file BE (28/08/2026)
- [x] `CreateSchedule.tsx` trùng chức năng với `EventFormModal` → ✅ Thêm deprecation banner, redirect tới Dashboard (28/08/2026)
- [x] Frontend test coverage thấp (2 suites) → ✅ Tăng lên 7 suites, 22 tests (constants, notificationService, templateService, groupService, analyticsService) (28/08/2026)

---

## 📝 Ghi Chú Làm Việc

> Khi bắt đầu 1 task, đổi `[ ]` → `[/]`. Hoàn thành thì đổi `[/]` → `[x]`.
> Mỗi Phase xong thì ghi ngày hoàn thành bên cạnh tiêu đề Phase.
