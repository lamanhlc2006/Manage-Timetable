# 📋 Phân Tích Sản Phẩm & Kế Hoạch Phát Triển Toàn Diện — Manage Timetable

> **Vai trò**: Senior Product Manager, System Architect & Senior QA Lead  
> **Ngày cập nhật**: 24/07/2026  
> **Dự án**: Manage Timetable — Hệ thống Quản lý Thời khóa biểu / Lịch trình Thông minh  
> **Trạng thái tổng thể**: Đã hoàn thành Phase 1 (100%), Phase 2 (100%), Phase 3 (~40%)

---

## Mục lục

1. [Đánh Giá Hiện Trạng & Kiến Trúc Dự Án](#1-đánh-giá-hiện-trạng--kiến-trúc-dự-án)
2. [Chi Tiết Tiến Độ Các Phase](#2-chi-tiết-tiến-độ-các-phase)
3. [Tính Năng Cốt Lõi (Must-Have / MVP) — Phase 1](#3-tính-năng-cốt-lõi-must-have--mvp--phase-1)
4. [Tính Năng Nâng Cao (Should-Have) — Phase 2](#4-tính-năng-nâng-cao-should-have--phase-2)
5. [Tính Năng Độc Đáo & Mở Rộng (Nice-to-Have) — Phase 3](#5-tính-năng-độc-đáo--mở-rộng-nice-to-have--phase-3)
6. [Thiết Kế UX/UI & Trải Nghiệm Người Dùng](#6-thiết-kế-uxui--trải-nghiệm-người-dùng)
7. [Thách Thức Kỹ Thuật & Giải Pháp Kiến Trúc](#7-thách-thức-kỹ-thuật--giải-pháp-kiến-trúc)
8. [Cấu Trúc Dữ Liệu Chi Tiết (Data Models)](#8-cấu-trúc-dữ-liệu-chi-tiết-data-models)
9. [Backlog & Định Hướng Tương Lai](#9-backlog--định-hướng-tương-lai)

---

## 1. Đánh Giá Hiện Trạng & Kiến Trúc Dự Án

### 1.1 Kiến trúc công nghệ hiện tại

| Thành phần | Công nghệ / Thư viện | Chi tiết triển khai |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript + Vite | SPA với `react-router-dom v6`, Ant Design v5 (`5.29.3`) |
| **Calendar Engine** | FullCalendar v6 (`@fullcalendar/react`) | Full support 4 views: Month (`dayGridMonth`), Week (`timeGridWeek`), Day (`timeGridDay`), List/Agenda (`listWeek`) với drag-and-drop & resize |
| **Backend Framework** | Express.js + TypeScript + Node.js | RESTful APIs architecture, modular routing, async controller wrappers |
| **Database & ODM** | MongoDB + Mongoose ODM | Indexing chiến lược (`createdBy`, `startTime`, `endTime`), populate schema relations |
| **Authentication & Security** | JWT + Cookie Parser + bcryptjs | Custom `httpOnly` secure cookies (`accessToken`), role-based authorization (`admin` vs `user`), `express-rate-limit`, `zod` schema validation |
| **State & Context** | React Context + Custom Hooks | `ThemeContext` (Dark/Light mode), `i18next` (Việt / Anh), local state management |
| **Focus & Productivity** | Custom Pomodoro Engine | Countdown timer, customizable work/break intervals, sound alerts, analytics integration |
| **Export & Reporting** | `ical-generator` + `jsPDF` + `@ant-design/charts` | Export calendar sang file `.ics` chuẩn iCalendar, xuất báo cáo PDF, trực quan hóa biểu đồ Analytics |

### 1.2 Bảng tổng hợp hiện trạng tính năng

| Nhóm tính năng | Trạng thái | Mô tả / Chi tiết |
|---|---|---|
| **Xác thực & Phân quyền** | 🟢 **100%** | Đăng ký, đăng nhập, httpOnly cookie JWT, phân quyền Admin/User, bảo vệ route |
| **Đa chế độ xem Lịch** | 🟢 **100%** | FullCalendar 4 chế độ view (Tháng / Tuần / Ngày / Agenda), current time indicator |
| **Xung đột Lịch (Conflict Detection)** | 🟢 **100%** | Query overlap backend, cảnh báo UI modal, force-create option, auto-rollback khi drag |
| **Lịch lặp lại (Recurring Events)** | 🟢 **100%** | Daily, Weekly, Monthly, Custom intervals, chỉnh sửa "Chỉ sự kiện này" / "Tất cả" / "Sự kiện này và sau đó" |
| **Tìm kiếm & Bộ lọc** | 🟢 **100%** | Debounced search keyword, filter theo Category, Priority, Date range |
| **Quản lý Danh mục (Categories)** | 🟢 **100%** | CRUD Category UI Modal, chọn icon emoji + color picker, bảo vệ danh mục hệ thống |
| **Phím tắt & Quick Add** | 🟢 **100%** | Shortcuts `N` (Quick Add), `T` (Hôm nay), `D/W/M` (Chuyển view), `/` (Search), `Esc`, cheat sheet `?` |
| **Pomodoro Focus Timer** | 🟢 **100%** | Timer modal gắn với sự kiện, sound effect, thống kê focus session |
| **Đa ngôn ngữ (i18n)** | 🟢 **100%** | Switch Tiếng Việt / Tiếng Anh toàn hệ thống, lưu preference vào localStorage |
| **Admin Management** | 🟢 **100%** | Bảng user, phân quyền role, khóa tài khoản, reset mật khẩu mặc định, thống kê số sự kiện |
| **Thông báo (Notifications)** | 🟢 **90%** | In-app notification polling 30s, bell icon badge count, auto-notification khi Admin CRUD |
| **Báo cáo & Export** | 🟢 **90%** | Export `.ics` iCalendar, Export PDF danh sách lịch, Analytics dashboard (Column & Pie chart) |
| **PWA & Offline** | 🟢 **80%** | Web App Manifest, Service Worker caching, offline fallback |

---

## 2. Chi Tiết Tiến Độ Các Phase

```
[Phase 1: MVP Enhancement] ───────────────────────────────► 100% Hoàn thành
[Phase 2: Should-Have Features] ──────────────────────────► 100% Hoàn thành
[Phase 3: Nice-to-Have & Innovation] ─────────────────────► ~40% Hoàn thành
```

### Bảng theo dõi tiến độ các bước triển khai (Steps 1 - 11)

| Bước | Tên hạng mục | Impact | Effort | Tiến độ | Ghi chú |
|---|---|---|---|---|---|
| **Step 1** | Nâng cấp Ant Design v5 & Dayjs | Cao | Thấp | 🟢 100% | Thay thế moment.js, tối ưu bundle size |
| **Step 2** | Tích hợp FullCalendar v6 (Multi-view) | Rất cao | Trung bình | 🟢 100% | 4 chế độ view, drag & drop, resize |
| **Step 3** | Conflict Detection Engine | Rất cao | Trung bình | 🟢 100% | Backend check overlap + Frontend modal warning & rollback |
| **Step 4** | Category Management UI | Cao | Trung bình | 🟢 100% | Modal CRUD category, color picker, emoji icon |
| **Step 5** | Keyboard Shortcuts & Quick Add | Cao | Thấp | 🟢 100% | Phím tắt toàn cục, modal tạo nhanh |
| **Step 6** | Nâng cao Admin Panel | Trung bình | Thấp | 🟢 100% | Reset password user, thống kê sự kiện, lọc người tạo |
| **Step 7** | Responsive Mobile & Micro-animations | Cao | Trung bình | 🟢 100% | Auto-collapse sidebar, skeleton loading, undo toast |
| **Step 8** | Recurring Events — "Sự kiện này & về sau" | Trung bình | Trung bình | 🟢 100% | Split chuỗi lặp thành 2 templates |
| **Step 9** | PWA & Offline Support | Cao | Cao | 🟢 80% | Service Worker, Manifest, Offline caching |
| **Step 10** | Pomodoro Focus Timer | Trung bình | Trung bình | 🟢 100% | Timer modal, celebration animation, focus analytics |
| **Step 11** | Đa ngôn ngữ (i18n VI / EN) | Trung bình | Trung bình | 🟢 100% | `react-i18next` integration |

---

## 3. Tính Năng Cốt Lõi (Must-Have / MVP) — Phase 1

### 3.1 Đa chế độ xem Lịch (Multi-View Calendar)
- **Chế độ xem Tháng (`dayGridMonth`)**: Hiển thị tổng quan các sự kiện trong tháng với badge màu theo danh mục.
- **Chế độ xem Tuần (`timeGridWeek`)**: Chia 7 cột từ Thứ 2 đến Chủ Nhật, hiển thị timeline từng khung giờ.
- **Chế độ xem Ngày (`timeGridDay`)**: Xem chi tiết từng giờ trong ngày, hỗ trợ `nowIndicator` kẻ đường đỏ thời gian thực.
- **Chế độ xem Danh sách (`listWeek`)**: Hiển thị danh sách sự kiện gom nhóm theo ngày dạng Agenda.

### 3.2 Phát hiện xung đột Lịch (Conflict Detection Engine)
- **Backend Query**: Sử dụng phép toán đoạn trùng nhau trong MongoDB:
  `startTime < newEndTime AND endTime > newStartTime`
- **Xử lý UI**: Trả về mã HTTP `409 Conflict` kèm danh sách sự kiện bị trùng. Frontend bật warning modal cho phép user lực chọn **Hủy / Chỉnh sửa thời gian / Bỏ qua & Vẫn tạo (Force create)**.
- **Drag & Drop Rollback**: Khi kéo thả sự kiện bị trùng, hệ thống tự động `revert()` về vị trí ban đầu.

### 3.3 Quản lý Người dùng & Phân quyền Admin
- Phân quyền theo vai trò (`role: 'admin' | 'user'`).
- Trang Admin Panel hỗ trợ: Tìm kiếm user, phân trang, khóa/mở khóa tài khoản (`isActive`), reset password về mặc định, hiển thị tổng số sự kiện user đã tạo.

---

## 4. Tính Năng Nâng Cao (Should-Have) — Phase 2

### 4.1 Lịch lặp lại nâng cao (Recurring Events)
- Hỗ trợ các chu kỳ: **Hàng ngày (Daily), Hàng tuần (Weekly), Hàng tháng (Monthly), Tùy chỉnh (Custom Interval)**.
- Cho phép 3 chế độ chỉnh sửa / xóa:
  1. *Chỉ sự kiện này*: Thêm ngày vào danh sách `exceptions` của template.
  2. *Sự kiện này và các sự kiện về sau*: Cắt template cũ tại ngày sửa và sinh ra 1 template lặp mới từ ngày đó trở đi.
  3. *Tất cả các sự kiện trong chuỗi*: Cập nhật trực tiếp Recurrence Template gốc.

### 4.2 Quản lý Danh mục & Phân loại sự kiện (Categories)
- CRUD danh mục với Tên, Màu sắc (Hex Color), Icon Emoji.
- Bảo vệ các danh mục mặc định của hệ thống (`isSystem: true`).
- Tích hợp bộ lọc đa danh mục trực tiếp trên thanh công cụ Calendar.

### 4.3 Phím tắt bàn phím & Quick Add (Keyboard Shortcuts)
- `N`: Bật popup Quick Add (chỉ cần nhập Tiêu đề + Thời gian).
- `T`: Chuyển lịch về Ngày hôm nay.
- `D` / `W` / `M`: Chuyển nhanh chế độ xem Ngày / Tuần / Tháng.
- `/`: Focus ngay vào ô Tìm kiếm sự kiện.
- `?` (`Shift + /`): Mở Modal hướng dẫn phím tắt (Cheat Sheet).

### 4.4 Pomodoro Focus Timer
- Gắn Pomodoro Timer trực tiếp vào sự kiện đang diễn ra.
- Tùy chỉnh khoảng thời gian Focus (25m, 30m, 45m...) và Break (5m, 10m...).
- Âm thanh thông báo khi hoàn thành session và tự động lưu kết quả vào FocusSession Collection để thống kê.

---

## 5. Tính Năng Độc Đáo & Mở Rộng (Nice-to-Have) — Phase 3

### 5.1 Analytics & Insight Dashboard
- Trực quan hóa dữ liệu bằng `@ant-design/charts`:
  - **Column Chart**: Phân bổ số giờ bận rộn theo từng ngày trong tuần.
  - **Pie Chart**: Tỷ lệ phần trăm thời gian dành cho từng Danh mục (Học tập, Công việc, Cá nhân...).
  - **KPI Cards**: Tổng số sự kiện, tổng giờ học/làm việc, số session Pomodoro đã hoàn thành.

### 5.2 Đa ngôn ngữ (i18n) & Dark Mode Theming
- Hỗ trợ chuyển đổi liền mạch giữa **Tiếng Việt 🇻🇳** và **Tiếng Anh 🇬🇧**.
- Chế độ **Dark Mode / Light Mode** tự động đồng bộ Ant Design `darkAlgorithm` và CSS Variables cho FullCalendar.

---

## 6. Thiết Kế UX/UI & Trải Nghiệm Người Dùng

```
        ┌────────────────────────────────────────────────────────┐
        │  Header: Logo | View Switcher | Search | Lang | User   │
        ├───────────────┬────────────────────────────────────────┤
        │               │  Toolbar: < Today > | Date Range Title │
        │  Sidebar:     ├────────────────────────────────────────┤
        │  - Navigation │                                        │
        │  - Filter Cat │        FullCalendar Main View          │
        │  - Quick Add  │        (Month / Week / Day / List)     │
        │  - Mini Cal   │                                        │
        │               │                                        │
        └───────────────┴────────────────────────────────────────┘
```

1. **Mobile-First Responsive Breakdown**:
   - `< 768px`: Tự động thu gọn Sidebar thành Drawer / Bottom Tab Bar, ưu tiên hiển thị Day View & Agenda View.
   - `≥ 1024px`: Hiển thị bố cục 2 cột tiêu chuẩn (Sidebar + Main Calendar Grid).
2. **Micro-interactions**:
   - Dynamic hover cardpreview sự kiện.
   - Skeleton Loading State khi fetch dữ liệu từ API.
   - Toast "Đã di chuyển. Hoàn tác (Undo)?" sau khi kéo thả sự kiện.

---

## 7. Thách Thức Kỹ Thuật & Giải Pháp Kiến Trúc

### 7.1 Xử lý Múi Giờ (Timezone Handling Strategy)
- **Quy tắc bất biến**: Backend và MongoDB **LUÔN LUÔN** lưu trữ thời gian dưới dạng **UTC ISO-8601 String** (`2026-07-24T08:00:00.000Z`).
- **Client Rendering**: Frontend dùng `dayjs` tích hợp plugin `utc` và `timezone` để convert về múi giờ địa phương của User khi hiển thị.

### 7.2 Thuật toán Expand Sự Kiện Lặp (On-the-fly Recurrence Expansion)
- Không lưu hàng trăm instance vào DB gây phình dữ liệu (Expand All Strategy).
- Sử dụng **Hybrid Strategy**: Lưu Recurrence Rule Template gốc + mảng `exceptions`. Khi client query trong khoảng `[startRange, endRange]`, Backend tự động tính toán các thời điểm xuất hiện virtual instances và loại bỏ các ngày nằm trong `exceptions`.

### 7.3 Bảo mật & Quản lý Phiên (Security & Auth Flow)
- **Token Storage**: Access Token được lưu trong `httpOnly` cookie để ngăn chặn hoàn toàn nguy cơ lấy cắp token qua XSS.
- **Input Sanitization & Validation**: Sử dụng `zod` schema ở middleware backend để validate toàn bộ body request trước khi xử lý controller.

---

## 8. Cấu Trúc Dữ Liệu Chi Tiết (Data Models)

### 8.1 Schedule Model (`Schedule.ts`)

```typescript
interface ISchedule {
  _id: ObjectId;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  category: ObjectId; // Ref to Category
  priority: 'low' | 'medium' | 'high';
  createdBy: ObjectId; // Ref to User
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    endDate?: Date;
    exceptions: Date[];
  };
  parentEvent?: ObjectId; // Ref to parent Schedule template if exception
  createdAt: Date;
  updatedAt: Date;
}
```

### 8.2 Category Model (`Category.ts`)

```typescript
interface ICategory {
  _id: ObjectId;
  name: string;
  color: string;
  icon: string; // Emoji or icon code string
  createdBy: ObjectId; // Ref to User
  isSystem: boolean; // System default category (non-deletable)
  createdAt: Date;
  updatedAt: Date;
}
```

### 8.3 FocusSession Model (`FocusSession.ts`)

```typescript
interface IFocusSession {
  _id: ObjectId;
  user: ObjectId; // Ref to User
  schedule?: ObjectId; // Ref to Schedule (optional)
  durationMinutes: number;
  completedAt: Date;
  notes?: string;
}
```

---

## 9. Backlog & Định Hướng Tương Lai

| Tính năng | Phân loại | Mô tả |
|---|---|---|
| **AI Schedule Assistant** | Phase 3 (Nice-to-Have) | Tích hợp Gemini API hỗ trợ tạo lịch bằng câu lệnh tự nhiên (NLP) & gợi ý xếp lịch tự động |
| **Third-Party Calendar Sync** | Phase 3 (Nice-to-Have) | Đồng bộ 2 chiều với Google Calendar API, Zoom meeting link auto-generation |
| **Chia Sẻ & Cộng Tác Group** | Phase 3 (Nice-to-Have) | Tạo nhóm làm việc, phân quyền Viewer/Editor trên từng lịch chung |
| **Refresh Token Rotation** | Security Hardening | Triển khai cơ chế Refresh Token Rotation đảm bảo phiên làm việc dài hạn an toàn |
| **E2E Automation Testing** | DevOps / Testing | Viết bộ kịch bản E2E Test tự động với Playwright / Cypress |

---

> 📌 *Tài liệu này gộp và thay thế 2 tài liệu cũ `PRODUCT_ANALYSIS.md` và `NEXT_DEVELOPMENT_PLAN.md`.*
