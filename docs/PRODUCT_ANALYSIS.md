# 📋 Phân Tích Hiện Trạng Sản Phẩm — Manage Timetable

> **Vai trò**: Senior Product Manager & System Architect  
> **Ngày cập nhật**: 24/07/2026  
> **Dự án**: Manage Timetable — Hệ thống Quản lý Thời khóa biểu / Lịch trình Thông minh  
> **Trạng thái tổng thể**: Phase 1 (100%), Phase 2 (100%), Phase 3 (~40%)

---

## Mục lục

1. [Kiến Trúc Công Nghệ](#1-kiến-trúc-công-nghệ)
2. [Bảng Tổng Hợp Hiện Trạng Tính Năng](#2-bảng-tổng-hợp-hiện-trạng-tính-năng)
3. [Chi Tiết Tiến Độ Các Phase](#3-chi-tiết-tiến-độ-các-phase)
4. [Tính Năng Cốt Lõi (Must-Have / MVP) — Phase 1](#4-tính-năng-cốt-lõi-must-have--mvp--phase-1)
5. [Tính Năng Nâng Cao (Should-Have) — Phase 2](#5-tính-năng-nâng-cao-should-have--phase-2)
6. [Tính Năng Mở Rộng (Nice-to-Have) — Phase 3 (đã hoàn thành)](#6-tính-năng-mở-rộng-nice-to-have--phase-3-đã-hoàn-thành)
7. [Thiết Kế UX/UI & Trải Nghiệm Người Dùng](#7-thiết-kế-uxui--trải-nghiệm-người-dùng)
8. [Kiến Trúc Bảo Mật](#8-kiến-trúc-bảo-mật)
9. [Cấu Trúc Dữ Liệu Chi Tiết (Data Models)](#9-cấu-trúc-dữ-liệu-chi-tiết-data-models)
10. [Thách Thức Kỹ Thuật & Giải Pháp Đã Áp Dụng](#10-thách-thức-kỹ-thuật--giải-pháp-đã-áp-dụng)

---

## 1. Kiến Trúc Công Nghệ

| Thành phần | Công nghệ / Thư viện | Chi tiết triển khai |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript + Vite | SPA với `react-router-dom v6`, Ant Design v5 (`5.29.3`) |
| **Calendar Engine** | FullCalendar v6 (`@fullcalendar/react`) | 4 views: Month (`dayGridMonth`), Week (`timeGridWeek`), Day (`timeGridDay`), List/Agenda (`listWeek`) với drag-and-drop & resize |
| **Backend Framework** | Express.js + TypeScript + Node.js | RESTful APIs, modular routing, async controller wrappers |
| **Database & ODM** | MongoDB + Mongoose ODM | Compound indexing (`createdBy`, `startTime`, `endTime`), populate schema relations |
| **Authentication & Security** | JWT + Cookie Parser + bcryptjs | `httpOnly` secure cookies, role-based authorization (`admin` / `user`), `express-rate-limit`, `zod` schema validation |
| **State & Context** | React Context + Custom Hooks | `ThemeContext` (Dark/Light mode), `i18next` (Việt / Anh), local state management |
| **Focus & Productivity** | Custom Pomodoro Engine | Countdown timer, customizable work/break intervals, sound alerts, analytics integration |
| **Export & Reporting** | `ical-generator` + `jsPDF` + `@ant-design/charts` | Export `.ics` iCalendar, xuất PDF, trực quan hóa biểu đồ Analytics |

---

## 2. Bảng Tổng Hợp Hiện Trạng Tính Năng

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
| **Kéo thả sự kiện (Drag & Drop)** | 🟢 **100%** | Drag sang ngày/giờ khác + Resize thời lượng, optimistic UI + rollback on conflict |
| **Dark Mode / Light Mode** | 🟢 **100%** | ThemeContext + Ant Design v5 `darkAlgorithm` + FullCalendar CSS override + localStorage persist |
| **Trang Cài đặt (Settings)** | 🟢 **100%** | Profile update + Password change (2 tabs: Hồ sơ + Bảo mật) |

---

## 3. Chi Tiết Tiến Độ Các Phase

```
[Phase 1: MVP Enhancement] ───────────────────────────────► 100% Hoàn thành
[Phase 2: Should-Have Features] ──────────────────────────► 100% Hoàn thành
[Phase 3: Nice-to-Have & Innovation] ─────────────────────► ~40% Hoàn thành
```

### Bảng theo dõi tiến độ các bước triển khai (Steps 1 – 11)

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

## 4. Tính Năng Cốt Lõi (Must-Have / MVP) — Phase 1

### 4.1 Đa chế độ xem Lịch (Multi-View Calendar)

Đã tích hợp **FullCalendar** (`@fullcalendar/react` v6) thay thế Ant Design Calendar, hỗ trợ đầy đủ 4 chế độ xem với drag-and-drop, current time indicator, và custom styling.

| Chế độ | Plugin FullCalendar | Mô tả |
|---|---|---|
| 📅 **Xem theo tháng** | `dayGridMonth` | Tổng quan toàn bộ sự kiện trong tháng |
| 📆 **Xem theo tuần** | `timeGridWeek` | 7 cột (Thứ 2 → Chủ nhật), mỗi cột chia theo giờ (time slots) |
| 📄 **Xem theo ngày** | `timeGridDay` | Chi tiết timeline từng giờ trong ngày, highlight giờ hiện tại (`nowIndicator`) |
| 📋 **Xem danh sách** | `listWeek` | Bảng danh sách sự kiện sắp xếp theo thời gian dạng Agenda |

### 4.2 Phát hiện xung đột Lịch (Conflict Detection Engine)

**Luồng xử lý đã triển khai:**

```
Người dùng tạo/sửa sự kiện
  → Backend kiểm tra overlap với TẤT CẢ sự kiện cùng user         ✅
  → Nếu trùng: Trả về HTTP 409 + danh sách sự kiện bị conflict    ✅
  → Frontend hiển thị warning modal với danh sách conflicts         ✅
  → Cho phép user:
      - Xác nhận tạo (force-create) nếu chấp nhận trùng            ✅
      - Điều chỉnh thời gian                                       ✅
      - Hủy bỏ                                                     ✅
  → Drag & Drop: Tự động rollback (revert) khi phát hiện conflict  ✅
```

**Xử lý theo layer:**

| Layer | Xử lý |
|---|---|
| **Backend** | Query MongoDB: `startTime < newEnd AND endTime > newStart` → trả về danh sách conflict |
| **Frontend** | Warning modal với danh sách sự kiện bị trùng, cho phép force-create hoặc hủy |

### 4.3 Tìm kiếm & Lọc sự kiện (Search & Filter)

| Bộ lọc | Kiểu UI | Mô tả |
|---|---|---|
| 🔍 Tìm theo tên sự kiện | Text input (debounced 500ms) | Tìm kiếm real-time khi gõ (keyword trên `title` + `description`) |
| 📅 Lọc theo khoảng thời gian | Tự động theo view range | FullCalendar `datesSet` tự động gửi date range khi chuyển view |
| 🎨 Lọc theo danh mục | Multi-select dropdown | Chọn nhiều danh mục cùng lúc (Học tập, Công việc, Cá nhân, Khác) |
| 📌 Lọc theo mức ưu tiên | Multi-select dropdown | Low / Medium / High |

### 4.4 Hệ thống Thông báo (In-app Notifications)

| Chức năng | Mô tả |
|---|---|
| **Polling tự động** | Gọi API mỗi 30 giây kiểm tra thông báo mới |
| **Bell icon + Badge count** | Header hiển thị chuông với số lượng thông báo chưa đọc |
| **Popover danh sách** | Click chuông → hiển thị danh sách thông báo |
| **CRUD Notification** | Mark read, mark all read, delete notification |
| **Auto-create** | Tự động tạo notification khi admin CRUD schedule |

### 4.5 Quản lý Người dùng & Phân quyền Admin

| Chức năng | Mô tả |
|---|---|
| Danh sách users | Bảng (Ant Design Table) với search, sort, pagination |
| Phân quyền | Nâng/hạ role: admin ↔ user (có self-protection) |
| Khoá/mở tài khoản | Disable login mà không xóa dữ liệu (trường `isActive`) |
| Reset mật khẩu | Admin reset password về mặc định cho user |
| Thống kê user | Số sự kiện đã tạo, lần đăng nhập gần nhất |
| Lọc theo người tạo | Dropdown filter "Người tạo" trên Calendar (Admin only) |

---

## 5. Tính Năng Nâng Cao (Should-Have) — Phase 2

### 5.1 Lịch lặp lại nâng cao (Recurring Events)

Đã triển khai hệ thống Recurring Events với **Hybrid Approach** (template + materialized exceptions).

| Loại lặp | Ví dụ thực tế |
|---|---|
| **Hàng ngày** | Standup meeting 9:00 mỗi ngày |
| **Hàng tuần** | Lớp học Toán mỗi thứ 3, thứ 5 |
| **Hàng tháng** | Họp review cuối tháng |
| **Tùy chỉnh** | Mỗi 2 tuần vào thứ 4, hoặc ngày 1 & 15 hàng tháng |

**Lựa chọn khi chỉnh sửa sự kiện lặp:**

- ✅ "Chỉ sự kiện này" → Tạo exception cho instance cụ thể
- ✅ "Sự kiện này và các sự kiện tiếp theo" → Split chuỗi lặp thành 2 template
- ✅ "Tất cả sự kiện trong chuỗi" → Sửa template gốc

**Data model:**

```typescript
recurrence: {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom',
  interval: number,        // Lặp mỗi N đơn vị (ví dụ: mỗi 2 tuần → interval = 2)
  daysOfWeek: number[],    // [1, 3, 5] = Thứ 2, Thứ 4, Thứ 6
  endDate?: Date,          // Ngày kết thúc chuỗi lặp (null = vô hạn)
  exceptions: Date[],      // Ngày bỏ qua (nghỉ lễ, vắng mặt)
}
```

### 5.2 Kéo thả sự kiện (Drag & Drop)

| Thao tác | Hành vi | Chi tiết |
|---|---|---|
| **Drag sự kiện sang ngày/giờ khác** | Update `startTime` / `endTime` tự động | Giữ nguyên duration, optimistic UI + rollback on error |
| **Resize sự kiện** | Kéo cạnh trên/dưới để thay đổi thời lượng | Update `endTime` theo hướng kéo. PATCH API + conflict detection |

- ✅ Tích hợp sẵn trong **FullCalendar** (`@fullcalendar/interaction` plugin) — `eventDrop` + `eventResize`
- ✅ Hiển thị ghost element khi đang drag (FullCalendar built-in `selectMirror`)
- ✅ Snap-to-grid theo khung giờ (FullCalendar time slots)
- ✅ Rollback vị trí cũ khi phát hiện conflict (HTTP 409 → `revert()`)

### 5.3 Quản lý Danh mục & Phân loại sự kiện (Categories)

| Tính năng | Mô tả |
|---|---|
| **CRUD danh mục** | Modal/Drawer tạo, sửa, xóa danh mục |
| **Chọn icon + màu** | Color picker + Emoji icon cho mỗi danh mục |
| **Bảo vệ danh mục hệ thống** | `isSystem = true` — không cho xóa |
| **Tích hợp vào filter** | Danh mục tự tạo hiển thị trong filter panel trên Calendar |
| **Phân tích theo category** | Analytics Pie chart hiển thị % thời gian mỗi danh mục |

### 5.4 Phím tắt bàn phím & Quick Add (Keyboard Shortcuts)

| Phím | Hành động |
|---|---|
| `N` | Tạo sự kiện mới (Quick Add Modal) |
| `T` | Nhảy về hôm nay |
| `D` | Chuyển sang xem ngày |
| `W` | Chuyển sang xem tuần |
| `M` | Chuyển sang xem tháng |
| `/` | Focus vào ô tìm kiếm |
| `Esc` | Đóng modal/popup hiện tại |
| `?` (`Shift + /`) | Mở Modal hướng dẫn phím tắt (Cheat Sheet) |

- ✅ Quick Add Modal: Popup nhẹ chỉ có Title + Start/End → Enter tạo nhanh
- ✅ Phím tắt không kích hoạt khi đang focus vào input/textarea
- ✅ Sử dụng `react-hotkeys-hook`

### 5.5 Xuất dữ liệu (Export)

| Định dạng | Hướng | Thư viện |
|---|---|---|
| **.ics (iCalendar)** | → Export | `ical-generator` — Backend API + Frontend trigger |
| **PDF** | → Export | `jspdf` — Client-side rendering |

### 5.6 Dashboard Thống kê (Analytics)

| Metric | Visualization | Mô tả |
|---|---|---|
| Số giờ đã lên lịch / tuần | Column chart | Phân bổ giờ theo thứ trong tuần |
| Phân bổ thời gian theo danh mục | Pie chart | % thời gian cho Học tập, Công việc... |
| KPI Cards | Statistic cards | Tổng giờ, tổng sự kiện, danh mục lớn nhất, TB/ngày |
| Time filter | Radio buttons | Lọc 7 ngày / 30 ngày / tất cả |

- ✅ Thư viện: `@ant-design/charts` (Column + Pie)

---

## 6. Tính Năng Mở Rộng (Nice-to-Have) — Phase 3 (đã hoàn thành)

### 6.1 Dark Mode / Light Mode & Theming

- ✅ Toggle với smooth transition, respect system preference
- ✅ `ThemeContext` + Ant Design v5 `darkAlgorithm` / `defaultAlgorithm`
- ✅ FullCalendar CSS override cho dark mode
- ✅ Lưu preference vào localStorage

### 6.2 Trang Cài đặt (Settings Page)

- ✅ 2 tabs: **Hồ sơ** (Profile update) + **Bảo mật** (Password change)

### 6.3 Pomodoro Focus Timer

- ✅ Timer component tích hợp vào sự kiện đang diễn ra
- ✅ Cấu hình: Focus 25/30/45/60 phút, Break 5/10/15 phút
- ✅ Long break mỗi 4 sessions
- ✅ Âm thanh thông báo khi hoàn thành session
- ✅ Thống kê focus time vào trang Analytics
- ✅ Animation celebration khi hoàn thành

### 6.4 Đa ngôn ngữ (i18n)

- ✅ Tích hợp `react-i18next` cho frontend
- ✅ Toggle Tiếng Việt / English trên Settings hoặc Header
- ✅ Dịch toàn bộ UI strings, menu labels, error messages, validation texts
- ✅ Lưu language preference vào localStorage

### 6.5 PWA & Offline (80% hoàn thành)

- ✅ Web App Manifest (icons, theme color, display: standalone)
- ✅ Service Worker caching static assets
- ✅ Offline fallback page
- ⚠️ Web Push API chưa hoàn tất (xem [NEXT_DEVELOPMENT_PLAN.md](./NEXT_DEVELOPMENT_PLAN.md))
- ⚠️ Background Sync chưa triển khai

### 6.6 Responsive Mobile & Micro-animations

- ✅ **Responsive breakpoints**:
  - `< 768px`: Auto-collapse sidebar, bottom tab bar
  - `768-1024px`: Sidebar ẩn mặc định, hamburger menu
  - `≥ 1024px`: Sidebar + Calendar 2-column layout
- ✅ **Skeleton loading** thay Spin/Spinner khi load calendar data
- ✅ **Empty state**: Illustration + CTA "Tạo sự kiện đầu tiên" khi lịch trống
- ✅ **Hover effects**: Scale 1.02 + box-shadow khi hover event
- ✅ **Toast Undo**: Sau drag/drop hiển thị toast "Đã di chuyển. Hoàn tác?" (5s countdown)
- ✅ **Badge count trên filter icon** khi có filter đang active

### 6.7 Security Hardening (đã hoàn thành)

- ✅ JWT chuyển sang `httpOnly` cookie (chống XSS)
- ✅ `express-rate-limit`: auth routes (10 req/phút), schedule routes (100 req/phút)
- ✅ `zod` schema validation cho schedule CRUD
- ✅ Middleware `isAdmin` xác thực role admin từ JWT token ở backend
- ✅ CORS whitelist (chỉ cho phép localhost origin cụ thể)

---

## 7. Thiết Kế UX/UI & Trải Nghiệm Người Dùng

### 7.1 Bố cục tổng thể (Layout)

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

### 7.2 Nguyên tắc thiết kế chính

| Nguyên tắc | Áp dụng cụ thể |
|---|---|
| **⚡ Speed-first** | Mọi thao tác CRUD ≤ 300ms perceived latency. Dùng optimistic updates |
| **🎯 Progressive disclosure** | Click sự kiện → popup summary → click "Chi tiết" → full page |
| **📱 Mobile-first responsive** | Calendar view hoạt động tốt trên 375px trở lên |
| **🧠 Consistency** | Sử dụng design tokens (colors, spacing, typography) nhất quán |

### 7.3 Mobile-First Responsive Breakpoints

| Breakpoint | Layout | Thay đổi chính |
|---|---|---|
| **≥ 1440px** (Desktop lớn) | Sidebar + Calendar + Detail panel | 3-column layout |
| **1024-1439px** (Desktop) | Sidebar + Calendar | 2-column, detail panel = modal |
| **768-1023px** (Tablet) | Sidebar collapsible + Calendar full-width | Sidebar ẩn mặc định, hamburger menu |
| **< 768px** (Mobile) | Bottom navigation + Calendar | Sidebar → bottom tab bar, chỉ day/agenda view |

### 7.4 Micro-interactions & Animations

| Tương tác | Hiệu ứng |
|---|---|
| Hover lên sự kiện | Scale 1.02 + box-shadow tăng nhẹ + tooltip preview |
| Drag sự kiện | Opacity 0.7 + ghost element + snap-to-grid |
| Xóa sự kiện | Slide-out animation (200ms) |
| Loading states | Skeleton loading thay vì spinner |
| Empty state | Illustration + CTA "Tạo sự kiện đầu tiên" |

---

## 8. Kiến Trúc Bảo Mật

### 8.1 Trạng thái hiện tại

| Rủi ro | Mức độ | Giải pháp đã áp dụng |
|---|---|---|
| JWT trong localStorage → XSS | 🟢 Đã sửa | Chuyển JWT sang `httpOnly` cookie (secure, sameSite: strict) |
| Không có rate limiting | 🟢 Đã sửa | `express-rate-limit`: auth 10/phút, schedule 100/phút |
| Không validate input | 🟢 Đã sửa | `zod` schema validation cho schedule CRUD |
| Admin role check chỉ ở frontend | 🟢 Đã sửa | Middleware `isAdmin` xác thực từ JWT ở backend |
| Không có CORS config | 🟢 Đã sửa | Domain whitelist CORS |

**Ví dụ Auth flow đã triển khai:**

```typescript
// Backend: Set httpOnly cookie
res.cookie('accessToken', token, {
  httpOnly: true,    // Không accessible từ JavaScript → chống XSS
  secure: true,      // Chỉ gửi qua HTTPS
  sameSite: 'strict', // Chống CSRF
  maxAge: 15 * 60 * 1000, // 15 phút
});

// Frontend: Axios tự động gửi cookie
axios.defaults.withCredentials = true;
```

> ⚠️ Còn tồn tại một số lỗ hổng bảo mật chưa khắc phục — xem chi tiết tại [NEXT_DEVELOPMENT_PLAN.md](./NEXT_DEVELOPMENT_PLAN.md).

---

## 9. Cấu Trúc Dữ Liệu Chi Tiết (Data Models)

### 9.1 Schedule Model (`Schedule.ts`)

```typescript
interface ISchedule {
  _id: ObjectId;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color?: string;
  category: ObjectId;          // Ref to Category
  priority: 'low' | 'medium' | 'high';
  createdBy: ObjectId;         // Ref to User
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek?: number[];
    endDate?: Date;
    exceptions: Date[];
  };
  parentEvent?: ObjectId;      // Ref to parent Schedule template if exception
  createdAt: Date;
  updatedAt: Date;
}
```

### 9.2 Category Model (`Category.ts`)

```typescript
interface ICategory {
  _id: ObjectId;
  name: string;               // "Học tập", "Công việc", "Cá nhân"
  color: string;              // Hex color
  icon: string;               // Emoji hoặc icon name
  createdBy: ObjectId;        // User tạo (hoặc system default)
  isSystem: boolean;          // true = category mặc định không xóa được
  createdAt: Date;
  updatedAt: Date;
}
```

### 9.3 Notification Model (`Notification.ts`)

```typescript
interface INotification {
  _id: ObjectId;
  recipient: ObjectId;        // User nhận
  type: 'reminder' | 'update' | 'invite' | 'system';
  title: string;
  message: string;
  relatedSchedule?: ObjectId; // Sự kiện liên quan
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}
```

### 9.4 FocusSession Model (`FocusSession.ts`)

```typescript
interface IFocusSession {
  _id: ObjectId;
  user: ObjectId;             // Ref to User
  schedule?: ObjectId;        // Ref to Schedule (optional)
  durationMinutes: number;
  completedAt: Date;
  notes?: string;
}
```

### 9.5 Group Model (đề xuất — chưa triển khai)

```typescript
interface IGroup {
  _id: ObjectId;
  name: string;
  description: string;
  avatar?: string;
  owner: ObjectId;
  members: {
    user: ObjectId;
    role: 'viewer' | 'editor' | 'admin';
    joinedAt: Date;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 10. Thách Thức Kỹ Thuật & Giải Pháp Đã Áp Dụng

### 10.1 Xử lý múi giờ (Timezone Handling)

| Nguyên tắc | Chi tiết |
|---|---|
| **Backend → luôn lưu UTC** | MongoDB lưu `Date` dạng UTC ISO-8601 |
| **Frontend → convert local** | `dayjs` + plugin `utc` + `timezone` chỉ convert khi hiển thị |

```typescript
// Frontend: Convert sang local time CHỈ khi hiển thị
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

const localDisplay = dayjs.utc(schedule.startTime)
  .tz('Asia/Ho_Chi_Minh')
  .format('HH:mm DD/MM/YYYY');
```

### 10.2 Thuật toán phát hiện xung đột (Conflict Detection Algorithm)

```typescript
// MongoDB query: Tìm tất cả sự kiện overlap với [newStart, newEnd)
const conflicts = await Schedule.find({
  _id: { $ne: currentEventId },  // Loại trừ chính sự kiện đang edit
  createdBy: userId,              // Chỉ check conflict cùng user
  startTime: { $lt: newEndTime },  // Bắt đầu trước khi sự kiện mới kết thúc
  endTime: { $gt: newStartTime },  // Kết thúc sau khi sự kiện mới bắt đầu
});
```

### 10.3 Xử lý sự kiện lặp lại (Hybrid Approach)

```
1. Lưu RecurrenceRule template (1 document)
2. Khi query: expand template thành virtual instances cho date range cần hiển thị
3. Khi user sửa 1 instance: Tạo "exception" document riêng
4. Khi user sửa "tất cả": Update template
5. Khi user sửa "sự kiện này và sau đó": Split thành 2 templates
```

### 10.4 MongoDB Index Strategy

```typescript
// Index cho query phổ biến nhất
ScheduleSchema.index({ createdBy: 1, startTime: 1, endTime: 1 });

// Index cho conflict detection
ScheduleSchema.index({ startTime: 1, endTime: 1 });

// Index cho search
ScheduleSchema.index({ title: 'text', description: 'text' });
```

### 10.5 Ma trận Impact vs. Effort (cập nhật 24/07/2026)

```
              Low Effort ←───────────────────→ High Effort
          ┌─────────────────────┬────────────────────────┐
High      │ ✅ Conflict Detect. │ ✅ Recurring Events    │
Impact    │ ✅ Search & Filter  │ ✅ Multi-view Calendar │
          │ ✅ Categories UI    │ ✅ Pomodoro Timer      │
          ├─────────────────────┼────────────────────────┤
Low       │ ✅ Dark Mode        │ 💡 3rd-party Sync      │
Impact    │ ✅ Export PDF/ICS   │ 💡 PWA Complete        │
          │ ✅ Keyboard Shortc. │ 🚀 AI Assistant        │
          └─────────────────────┴────────────────────────┘

Legend: ✅ Đã xong | 🚀 Kế hoạch | 💡 Tương lai
```

---

> 📌 **Document này là living document** — sẽ được cập nhật khi dự án tiến triển.  
> 📎 Xem kế hoạch phát triển tiếp theo, lỗi tồn đọng và nâng cấp chưa thực hiện tại [NEXT_DEVELOPMENT_PLAN.md](./NEXT_DEVELOPMENT_PLAN.md).
