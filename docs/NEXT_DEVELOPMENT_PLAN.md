# 📅 Kế Hoạch Phát Triển Tiếp Theo — Manage Timetable

> **Ngày cập nhật**: 22/07/2026  
> **Tham chiếu**: [PRODUCT_ANALYSIS.md](./PRODUCT_ANALYSIS.md)  
> **Trạng thái**: Đang thực hiện

---

## Tổng quan tiến độ

| Phase | Tiến độ | Ghi chú |
|---|---|---|
| Phase 1 — MVP Enhancement | 🟢 **100%** | Hoàn thành toàn bộ (bao gồm Notification System) |
| Phase 2 — Should-Have | 🟡 **~95%** | Hoàn thành Category UI ✅, Còn thiếu: một số UX nhỏ |
| Phase 3 — Nice-to-Have | 🟡 **~15%** | Dark Mode ✅, Settings ✅. Còn lại chưa bắt đầu |

---

## Các bước triển khai tiếp theo

> Sắp xếp theo thứ tự ưu tiên **Impact × Effort** (làm trước các mục High Impact + Low Effort).

---

### BƯỚC 4: Hoàn thiện UI Quản lý Danh mục (Category Management UI)

**Effort**: 🟡 Trung bình | **Impact**: Cao  
**Lý do ưu tiên**: Backend API đã sẵn sàng (CRUD đầy đủ), chỉ cần xây dựng giao diện quản lý.

**Nội dung:**
- [x] Tạo Modal/Drawer CRUD danh mục trực tiếp trên trang Settings hoặc Dashboard sidebar
- [x] Danh sách danh mục hiện có: hiển thị icon + tên + màu + nút sửa/xóa
- [x] Form tạo danh mục mới: nhập tên, chọn màu (color picker), chọn emoji icon
- [x] Bảo vệ danh mục `isSystem = true` — không cho xóa
- [x] Tích hợp danh mục tự tạo vào filter panel trên ScheduleCalendar

**Files liên quan:**
- Backend: `categoryController.ts`, `categoryRoutes.ts`, `Category.ts` (đã có đầy đủ)
- Frontend: `categoryService.ts` (đã có), cần tạo UI component mới

---

### BƯỚC 5: Keyboard Shortcuts & Quick Add

**Effort**: 🟢 Thấp | **Impact**: Cao  
**Lý do ưu tiên**: `react-hotkeys-hook` đã được cài đặt, UX chuyên nghiệp ngay lập tức.

**Nội dung:**
- [ ] Đăng ký phím tắt toàn cục vào `ScheduleCalendar.tsx` hoặc `CommonLayout.tsx`:
  - `N` → Mở Quick Add Modal (tạo sự kiện nhanh)
  - `T` → Nhảy về hôm nay
  - `D` / `W` / `M` → Chuyển sang xem Ngày / Tuần / Tháng
  - `/` → Focus vào ô tìm kiếm
  - `Esc` → Đóng modal/popup đang mở
- [ ] Quick Add Modal: Popup nhẹ chỉ có Title + Start/End → Enter tạo nhanh
- [ ] Hiển thị shortcut cheat sheet khi nhấn `?` hoặc `Shift+/`
- [ ] Đảm bảo phím tắt không kích hoạt khi đang focus vào input/textarea

---

### BƯỚC 6: Nâng cao Admin Panel

**Effort**: 🟢 Thấp | **Impact**: Trung bình

**Nội dung:**
- [ ] **Admin reset mật khẩu**: Nút "Reset mật khẩu" trên bảng UserManagement → đặt password mặc định + tạo notification cho user
- [ ] **Thống kê user**: Hiển thị thêm cột "Số sự kiện" và "Đăng nhập gần nhất" trong bảng quản lý user
- [ ] **Lọc sự kiện theo người tạo (Admin)**: Dropdown filter "Người tạo" trên ScheduleCalendar, chỉ hiển thị cho role Admin

---

### BƯỚC 7: Responsive Mobile & Micro-animations

**Effort**: 🟡 Trung bình | **Impact**: Cao

**Nội dung:**
- [ ] **Responsive breakpoints**:
  - `< 768px`: Auto-collapse sidebar, bottom tab bar thay thế sidebar menu
  - `768-1024px`: Sidebar ẩn mặc định, hamburger menu
  - `≥ 1024px`: Sidebar + Calendar 2-column layout (hiện tại)
- [ ] **Skeleton loading**: Thay Spin/Spinner bằng skeleton khi load calendar data
- [ ] **Empty state**: Illustration + CTA "Tạo sự kiện đầu tiên" khi lịch trống
- [ ] **Hover effects**: Scale 1.02 + box-shadow khi hover event trên calendar
- [ ] **Toast Undo**: Sau drag/drop hiển thị toast "Đã di chuyển. Hoàn tác?" (5s countdown)
- [ ] **Badge count trên filter icon** khi có filter đang active

---

### BƯỚC 8: Recurring Events — "Sự kiện này và sau đó"

**Effort**: 🟡 Trung bình | **Impact**: Trung bình

**Nội dung:**
- [ ] Triển khai option thứ 3 khi edit recurring event: **"Sự kiện này và các sự kiện sau đó"**
- [ ] Backend: Set `endDate` cho template gốc = ngày trước ngày sửa → Tạo template mới từ ngày sửa trở đi
- [ ] Frontend: Thêm radio option "Sự kiện này và các sự kiện sau đó" vào modal edit recurring
- [ ] Expose UI cho recurrence type `custom` (hiện schema hỗ trợ nhưng UI chưa có)

---

### BƯỚC 9: PWA + Offline-first (Phase 3)

**Effort**: 🔴 Cao | **Impact**: Cao

**Nội dung:**
- [ ] Tạo Service Worker với Workbox cho caching strategies
- [ ] Web App Manifest (icons, theme color, display: standalone)
- [ ] Push Notification qua Web Push API — nhắc sự kiện kể cả khi đóng trình duyệt
- [ ] Background Sync: sự kiện tạo offline → tự đồng bộ khi có mạng
- [ ] App Shortcuts: Long-press icon → Quick actions

---

### BƯỚC 10: Pomodoro Focus Timer (Phase 3)

**Effort**: 🟡 Trung bình | **Impact**: Trung bình

**Nội dung:**
- [ ] Timer component tích hợp vào sự kiện đang diễn ra
- [ ] Cấu hình: Focus 25/30/45/60 phút, Break 5/10/15 phút
- [ ] Long break mỗi 4 sessions
- [ ] Thống kê focus time vào trang Analytics
- [ ] Animation celebration khi hoàn thành

---

### BƯỚC 11: Đa ngôn ngữ i18n (Phase 3)

**Effort**: 🟡 Trung bình | **Impact**: Trung bình

**Nội dung:**
- [ ] Tích hợp `react-i18next` cho frontend
- [ ] Toggle Tiếng Việt / English trên Settings hoặc Header
- [ ] Dịch toàn bộ UI strings, menu labels, error messages, validation texts
- [ ] Lưu language preference vào localStorage

---

## Tính năng tương lai (Backlog — chưa lên kế hoạch cụ thể)

| Tính năng | Phân loại | Ghi chú |
|---|---|---|
| AI Schedule Assistant (Gemini/OpenAI) | Phase 3 | Chat NLP, gợi ý lịch, function calling |
| Chia sẻ & Cộng tác (Groups, Public link) | Phase 3 | Group model, share link, multi-permission |
| Third-party Integrations (Google Calendar, Zoom) | Phase 3 | Sync 2 chiều, auto meeting link |
| Gamification (Streaks, Badges, XP) | Phase 3 | Achievement system, leaderboard |
| Heatmap "Busy Score" | Phase 3 | GitHub-style heatmap, weekly matrix |
| Đa múi giờ (Multi-Timezone) | Phase 3 | Timezone per event, world clock widget |
| Drag from Sidebar (template → calendar) | Phase 2 | Predefined templates kéo vào lịch |
| Refresh Token Rotation | Security | Token renewal, revoke old tokens |
| XSS Sanitization | Security | `dompurify` / `xss` cho user input |
| Testing (Unit + Integration + E2E) | DevOps | Jest, Supertest, Playwright |

---

> 📌 **Document này là living document** — sẽ được cập nhật khi dự án tiến triển.  
> Xem phân tích sản phẩm đầy đủ tại [PRODUCT_ANALYSIS.md](./PRODUCT_ANALYSIS.md).
