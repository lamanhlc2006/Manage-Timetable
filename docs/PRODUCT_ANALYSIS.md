# 📋 Phân Tích Sản Phẩm & Đề Xuất Tính Năng — Manage Timetable

> **Vai trò**: Senior Product Manager & System Architect  
> **Ngày phân tích**: 17/07/2026  
> **Dự án**: Manage Timetable — Hệ thống Quản lý Thời khóa biểu / Lịch trình

---

## Mục lục

1. [Đánh Giá Hiện Trạng Dự Án](#1-đánh-giá-hiện-trạng-dự-án)
2. [Tính Năng Cốt Lõi — Must-Have (MVP)](#2-tính-năng-cốt-lõi--must-have-mvp)
3. [Tính Năng Nâng Cao — Should-Have](#3-tính-năng-nâng-cao--should-have)
4. [Tính Năng Độc Đáo / Khác Biệt — Nice-to-Have](#4-tính-năng-độc-đáo--khác-biệt--nice-to-have)
5. [Gợi Ý UX/UI](#5-gợi-ý-uxui)
6. [Thách Thức Kỹ Thuật](#6-thách-thức-kỹ-thuật)
7. [Cấu Trúc Dữ Liệu Mở Rộng](#7-cấu-trúc-dữ-liệu-mở-rộng-đề-xuất)
8. [Roadmap Triển Khai](#8-roadmap-triển-khai-đề-xuất)
9. [Tóm Tắt & Khuyến Nghị](#9-tóm-tắt--khuyến-nghị)

---

## 1. Đánh Giá Hiện Trạng Dự Án

### 1.1 Kiến trúc hiện tại

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite + Ant Design v5 | SPA với `react-router-dom v6`, FullCalendar v6 |
| **Backend** | Express + TypeScript + Mongoose (MongoDB) | REST API, JWT (httpOnly cookie), Zod validation |
| **Auth** | bcryptjs + jsonwebtoken + cookie-parser | Role-based: `admin` / `user`, httpOnly cookie |
| **State Mgmt** | Local `useState` + `localStorage` + React Context | ThemeContext cho Dark Mode |
| **Security** | express-rate-limit + Zod + CORS whitelist | Rate limiting + input validation |

### 1.2 Những gì đã có

| Tính năng | Trạng thái |
|---|---|
| Đăng ký / Đăng nhập (Login / Register) | ✅ Hoạt động |
| Phân quyền Admin / User | ✅ Cơ bản |
| Xem lịch dạng tháng (Month Calendar) | ✅ Ant Design Calendar |
| CRUD sự kiện (Tạo / Sửa / Xóa) | ✅ REST API đầy đủ |
| Gán màu sắc cho sự kiện (6 preset colors) | ✅ Hoạt động |
| Chế độ Offline (localStorage fallback) | ✅ Cơ bản |
| Layout với Sidebar & Header | ✅ Ant Design Layout |
| Protected Routes (redirect khi chưa login) | ✅ Hoạt động |

### 1.3 Những điểm cần cải thiện

| Mức độ | Vấn đề | Chi tiết |
|---|---|---|
| 🟢 Đã hoàn thành | Auth token chỉ lưu `localStorage` | Đã chuyển đổi hoàn toàn sang cơ chế **httpOnly cookie** bảo mật cao |
| 🟢 Đã hoàn thành | Chỉ có chế độ xem tháng | Đã tích hợp **FullCalendar** (`@fullcalendar/react` v6) với 4 chế độ xem: Tháng / Tuần / Ngày / Danh sách |
| 🟢 Đã hoàn thành | Không phát hiện trùng lịch | Đã triển khai **Conflict Detection** đầy đủ: Backend query overlap + Frontend warning modal + Force-create + Rollback khi drag |
| 🟢 Đã hoàn thành | Dùng `moment.js` | Đã nâng cấp thành công lên **Ant Design v5** và chuyển đổi hoàn toàn sang **dayjs** |
| 🟢 Đã hoàn thành | Không có search/filter | Đã triển khai **Search & Filter**: tìm kiếm debounced theo keyword, lọc theo danh mục + độ ưu tiên, tự động lọc theo date range |
| 🟢 Đã hoàn thành | Chưa có trang quản lý người dùng | Đã triển khai **Admin Panel** đầy đủ: danh sách user (search + pagination), phân quyền admin ↔ user, khóa/mở tài khoản |

---

## 2. Tính Năng Cốt Lõi — Must-Have (MVP)

> Những tính năng **bắt buộc phải có** để hệ thống hoạt động mượt mà và giải quyết được bài toán cơ bản của người dùng.

### 2.1 Đa chế độ xem lịch (Multi-View Calendar) — 🟢 Đã hoàn thành

~~Ant Design Calendar hiện tại chỉ hỗ trợ xem tháng. Đây là hạn chế lớn nhất của dự án.~~ Đã tích hợp **FullCalendar** (`@fullcalendar/react` v6) thay thế Ant Design Calendar, hỗ trợ đầy đủ 4 chế độ xem với drag-and-drop, current time indicator, và custom styling.

| Chế độ | Mô tả | Trạng thái |
|---|---|---|
| 📅 **Xem theo tháng** | Tổng quan toàn bộ sự kiện trong tháng — FullCalendar `dayGridMonth` | ✅ Đã hoàn thành |
| 📆 **Xem theo tuần** | Hiển thị 7 cột (Thứ 2 → Chủ nhật), mỗi cột chia theo giờ (time slots). Sự kiện hiển thị dạng block — FullCalendar `timeGridWeek` | ✅ Đã hoàn thành |
| 📄 **Xem theo ngày** | Chi tiết timeline từng giờ trong ngày, highlight giờ hiện tại — FullCalendar `timeGridDay` + `nowIndicator` | ✅ Đã hoàn thành |
| 📋 **Xem dạng danh sách (Agenda)** | Bảng danh sách sự kiện sắp xếp theo thời gian — FullCalendar `listWeek` | ✅ Đã hoàn thành |

#### Thư viện đã chọn:

- ✅ **FullCalendar** (`@fullcalendar/react` v6): Đã tích hợp với plugins `daygrid`, `timegrid`, `interaction`, `list`.
- ~~`react-big-calendar`~~: Không sử dụng.
- ~~Custom build~~: Không sử dụng.

---

### 2.2 Phát hiện xung đột lịch (Conflict Detection) — 🟢 Đã hoàn thành

Khi người dùng tạo hoặc chỉnh sửa sự kiện, hệ thống ~~phải~~ **đã** tự động kiểm tra xung đột thời gian với tất cả sự kiện hiện có và cảnh báo.

**Luồng xử lý:** ✅ Đã triển khai đầy đủ

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

**Xử lý theo layer:** ✅ Đã triển khai

| Layer | Xử lý | Trạng thái |
|---|---|---|
| **Backend** | Query MongoDB: `startTime < newEnd AND endTime > newStart` → trả về danh sách conflict | ✅ Hoàn thành |
| **Frontend** | Hiển thị warning modal với danh sách sự kiện bị trùng, cho phép force-create hoặc hủy | ✅ Hoàn thành |

---

### 2.3 Lịch lặp lại (Recurring Events) — 🟢 Đã hoàn thành

~~Cho phép người dùng tạo sự kiện tự động lặp lại theo chu kỳ.~~ Đã triển khai hệ thống Recurring Events với Hybrid Approach (template + materialized exceptions).

| Loại lặp | Ví dụ thực tế | Trạng thái |
|---|---|---|
| **Hàng ngày** | Standup meeting 9:00 mỗi ngày | ✅ Hoàn thành |
| **Hàng tuần** | Lớp học Toán mỗi thứ 3, thứ 5 | ✅ Hoàn thành |
| **Hàng tháng** | Họp review cuối tháng | ✅ Hoàn thành |
| **Tùy chỉnh** | Mỗi 2 tuần vào thứ 4, hoặc ngày 1 & 15 hàng tháng | ⚠️ Schema hỗ trợ, UI chưa expose |

**Data model mở rộng:** ✅ Đã triển khai trong `Schedule.ts`

```typescript
recurrence: {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom',  // ✅
  interval: number,        // Lặp mỗi N đơn vị (ví dụ: mỗi 2 tuần → interval = 2)  ✅
  daysOfWeek: number[],    // [1, 3, 5] = Thứ 2, Thứ 4, Thứ 6  ✅
  endDate?: Date,          // Ngày kết thúc chuỗi lặp (null = vô hạn)  ✅
  exceptions: Date[],      // Ngày bỏ qua (nghỉ lễ, vắng mặt)  ✅
}
```

**Lựa chọn khi chỉnh sửa sự kiện lặp:** (2/3 đã triển khai)

- ✅ "Chỉ sự kiện này" → Tạo exception cho instance cụ thể
- ❌ "Sự kiện này và các sự kiện tiếp theo" → Split chuỗi lặp thành 2 template *(chưa triển khai)*
- ✅ "Tất cả sự kiện trong chuỗi" → Sửa template gốc

---

### 2.4 Tìm kiếm & Lọc sự kiện — 🟢 Đã hoàn thành

| Bộ lọc | Kiểu UI | Mô tả | Trạng thái |
|---|---|---|---|
| 🔍 Tìm theo tên sự kiện | Text input (debounced 500ms) | Tìm kiếm real-time khi gõ (keyword trên `title` + `description`) | ✅ Hoàn thành |
| 📅 Lọc theo khoảng thời gian | Tự động theo view range | FullCalendar `datesSet` tự động gửi date range khi chuyển view | ✅ Hoàn thành |
| 🎨 Lọc theo danh mục | Multi-select dropdown | Chọn nhiều danh mục cùng lúc (Học tập, Công việc, Cá nhân, Khác) | ✅ Hoàn thành |
| 👤 Lọc theo người tạo (Admin) | Dropdown user list | Chỉ hiển thị cho role Admin | ❌ Chưa triển khai |
| 📌 Lọc theo mức ưu tiên | Multi-select dropdown | Low / Medium / High | ✅ Hoàn thành |

**Hiển thị kết quả:**

- ✅ Sự kiện khớp hiển thị trực tiếp trên Calendar view (API trả về kết quả lọc)
- ✅ Hiển thị danh sách kết quả trong Agenda/List view
- ❌ Badge count trên filter icon khi có filter đang active *(chưa triển khai)*

---

### 2.5 Hệ thống thông báo cơ bản (Notifications) — 🟢 Phần lớn đã hoàn thành

| Loại | Kênh | Mô tả | Trạng thái |
|---|---|---|---|
| **Nhắc nhở trước sự kiện** | In-app notification + Browser Push Notification | Tùy chọn: 5p / 15p / 30p / 1h / 1 ngày trước khi bắt đầu | ❌ Chưa triển khai |
| **Thông báo khi bị chỉnh sửa** | In-app (bell icon trên header) | Admin sửa/xóa lịch → Tất cả user liên quan nhận thông báo | ✅ Đã hoàn thành |
| **Thông báo sự kiện sắp tới** | In-app | Tóm tắt sự kiện trong 24h tới khi mở app | ❌ Chưa triển khai |

**Triển khai kỹ thuật:**

- ✅ **In-app**: Polling mỗi 30s, bell icon với badge count, popover danh sách thông báo
- ✅ **CRUD Notification**: Mark read, mark all read, delete notification
- ✅ **Auto-create**: Tự động tạo notification khi admin CRUD schedule
- ❌ **Browser Push**: Service Worker + Web Push API *(chưa triển khai)*
- ❌ **WebSocket**: Real-time via Socket.IO *(chưa triển khai, đang dùng polling)*

---

### 2.6 Quản lý Người dùng (Admin Panel) — 🟢 Đã hoàn thành

| Chức năng | Mô tả | Trạng thái |
|---|---|---|
| Danh sách users | Bảng (Ant Design Table) với search, sort, pagination | ✅ Hoàn thành |
| Phân quyền | Nâng/hạ role: admin ↔ user (có self-protection) | ✅ Hoàn thành |
| Khoá/mở tài khoản | Disable login mà không xóa dữ liệu (trường `isActive` trong User model) | ✅ Hoàn thành |
| Reset mật khẩu | Admin reset password cho user, user nhận email thông báo | ❌ Chưa triển khai |
| Thống kê user | Số sự kiện đã tạo, lần đăng nhập gần nhất | ❌ Chưa triển khai |

---

## 3. Tính Năng Nâng Cao — Should-Have

> Những tính năng giúp **tăng trải nghiệm người dùng**, tự động hóa và thông minh hóa hệ thống.

### 3.1 Gợi ý lịch trình thông minh (Smart Scheduling)

Cho phép hệ thống tự động đề xuất khung thời gian tối ưu khi người dùng cần xếp sự kiện mới.

```
Input:  Danh sách N sự kiện cần xếp + ràng buộc (khung giờ, thời lượng, mức ưu tiên)
Output: Lịch trình tối ưu — không trùng, giảm thiểu khoảng trống, ưu tiên sự kiện quan trọng
```

**Các thuật toán có thể áp dụng:**

| Thuật toán | Ứng dụng | Độ phức tạp |
|---|---|---|
| **Greedy Interval Scheduling** | Xếp lịch cơ bản, maximize số sự kiện không overlap | O(n log n) |
| **Constraint Satisfaction (CSP)** | Xếp lịch với ràng buộc phức tạp (phòng, giáo viên, thời gian) | NP-hard, cần heuristic |
| **Genetic Algorithm** | Tối ưu hóa toàn cục khi quy mô lớn (100+ sự kiện, nhiều ràng buộc) | Tunable |

**Ví dụ use case:**

> *"Tôi cần xếp 5 môn học vào tuần này, mỗi môn 2 tiếng, không học trước 8h sáng và sau 5h chiều."*
> → Hệ thống gợi ý 3 phương án lịch tối ưu cho user lựa chọn.

---

### 3.2 Kéo thả sự kiện (Drag & Drop) — 🟢 Đã hoàn thành

| Thao tác | Hành vi | Chi tiết | Trạng thái |
|---|---|---|---|
| **Drag sự kiện sang ngày/giờ khác** | Update `startTime` / `endTime` tự động | Giữ nguyên duration, chỉ thay đổi vị trí. Optimistic UI + rollback on error | ✅ Hoàn thành |
| **Resize sự kiện** | Kéo cạnh trên/dưới để thay đổi thời lượng | Update `endTime` theo hướng kéo. PATCH API + conflict detection | ✅ Hoàn thành |
| **Drag từ sidebar** | Tạo sự kiện mới bằng cách kéo template vào calendar | Predefined templates: "Họp 1h", "Lớp học 2h" | ❌ Chưa triển khai |

**Thư viện đã sử dụng:**

- ~~`@dnd-kit/core`~~: Không sử dụng
- ✅ Tích hợp sẵn trong **FullCalendar** (`@fullcalendar/interaction` plugin) — `eventDrop` + `eventResize`
- ~~`react-beautiful-dnd`~~: Không sử dụng

**UX đã triển khai:**

- ✅ Hiển thị ghost element khi đang drag (FullCalendar built-in `selectMirror`)
- ✅ Snap-to-grid theo khung giờ (FullCalendar time slots)
- ❌ Undo support sau khi drop (toast "Đã di chuyển. Hoàn tác?") *(chưa triển khai)*
- ✅ Rollback vị trí cũ khi phát hiện conflict (HTTP 409 → `revert()`)

---

### 3.3 Hệ thống Danh mục & Nhãn (Categories & Tags) — ⚠️ Backend hoàn thành, Frontend UI chưa đủ

```
Schedule Model mở rộng:
  category: ObjectId → ref: 'Category'  // Học tập, Công việc, Cá nhân, Sức khỏe...
  tags: string[]                          // ['quan-trọng', 'deadline', 'nhóm-A']
  priority: 'low' | 'medium' | 'high' | 'urgent'
```

| Tính năng | Mô tả | Trạng thái |
|---|---|---|
| **Toggle hiển thị** | Bật/tắt hiển thị từng danh mục trên lịch (sidebar checkbox) | ❌ Chưa triển khai |
| **Bộ lọc nâng cao** | Kết hợp category + tags + priority + date range | ✅ Đã có (category + priority filter) |
| **Gán icon/emoji** | 📚 Học tập, 💼 Công việc, 🏃 Sức khỏe, 🎮 Giải trí | ✅ Backend hỗ trợ icon field |
| **Tự tạo danh mục** | User tự thêm category mới với tên + màu + icon | ⚠️ Backend API đã có, Frontend UI chưa có |
| **Phân tích theo category** | Thống kê thời gian phân bổ: bao nhiêu % cho Học tập, Công việc... | ✅ Analytics Pie chart |

---

### 3.4 Chia sẻ & Cộng tác (Sharing & Collaboration)

| Cấp độ | Mô tả | Use case |
|---|---|---|
| **Public link** | Chia sẻ lịch qua URL (chỉ xem, không cần đăng nhập) | Chia sẻ lịch học cho phụ huynh |
| **Mời user cụ thể** | Gán sự kiện cho nhiều người, mỗi người nhận thông báo | Mời team vào cuộc họp |
| **Nhóm/Lớp** | Tạo group, admin nhóm quản lý lịch chung | Lịch lớp học, lịch phòng ban |
| **Quyền truy cập** | Viewer / Editor / Admin trên từng lịch hoặc nhóm | Kiểm soát ai được sửa |

**Data model bổ sung:**

```typescript
// Group Model
interface IGroup {
  name: string;
  description: string;
  owner: ObjectId;          // User tạo nhóm
  members: {
    user: ObjectId;
    role: 'viewer' | 'editor' | 'admin';
  }[];
  sharedCalendars: ObjectId[];  // Các lịch được share cho nhóm
}

// Share Link Model
interface IShareLink {
  schedule: ObjectId;       // hoặc group
  token: string;            // Unique URL token
  permissions: 'view' | 'edit';
  expiresAt?: Date;
  createdBy: ObjectId;
}
```

---

### 3.5 Xuất / Nhập dữ liệu (Export / Import) — ⚠️ Một phần đã hoàn thành

| Định dạng | Hướng | Mô tả | Thư viện | Trạng thái |
|---|---|---|---|---|
| **.ics (iCalendar)** | → Export | Chuẩn quốc tế, tương thích Google Calendar, Apple Calendar, Outlook | `ical-generator` | ✅ Đã hoàn thành (Backend API + Frontend) |
| **PDF** | → Export | In lịch tuần/tháng, danh sách sự kiện dạng báo cáo | `jspdf` | ✅ Đã hoàn thành (client-side) |
| **.ics Import** | ← Import | Nhập lịch từ file .ics | `ical.js` | ❌ Chưa triển khai |
| **Excel/CSV** | → Export | Danh sách sự kiện dạng bảng, phù hợp xử lý dữ liệu | `xlsx`, `papaparse` | ❌ Chưa triển khai |
| **Google Calendar** | ↔ Sync | Đồng bộ 2 chiều qua Google Calendar API | Google APIs client | ❌ Chưa triển khai |

---

### 3.6 Dashboard Thống kê (Analytics) — 🟢 Cơ bản đã hoàn thành

Cung cấp insight cho người dùng về cách họ sử dụng thời gian.

| Metric | Visualization | Mô tả | Trạng thái |
|---|---|---|---|
| Số giờ đã lên lịch / tuần | Bar chart (Column) | Phân bổ giờ theo thứ trong tuần | ✅ Đã hoàn thành |
| Phân bổ thời gian theo danh mục | Pie chart | % thời gian cho Học tập, Công việc... | ✅ Đã hoàn thành |
| KPI Cards | Statistic cards | Tổng giờ, tổng sự kiện, danh mục lớn nhất, TB/ngày | ✅ Đã hoàn thành |
| Time filter | Radio buttons | Lọc 7 ngày / 30 ngày / tất cả | ✅ Đã hoàn thành |
| Tỷ lệ hoàn thành sự kiện | Progress bar | Bao nhiêu sự kiện được đánh dấu "completed" | ❌ Chưa triển khai |
| Thời gian trống khả dụng | Heatmap | Ma trận ngày × giờ, tô màu theo mật độ | ❌ Chưa triển khai |
| Trend sử dụng qua các tuần | Line chart | Xu hướng bận rộn tăng/giảm | ❌ Chưa triển khai |
| Streaks | Calendar heatmap | "Bạn đã hoàn thành lịch 7 ngày liên tiếp!" | ❌ Chưa triển khai |

**Thư viện chart đã sử dụng:**

- ✅ `@ant-design/charts` — Tương thích hoàn hảo với Ant Design (đang dùng `Column` + `Pie`)
- `recharts` — Nhẹ, declarative, React-native
- `chart.js` + `react-chartjs-2` — Phổ biến, nhiều loại chart

---

## 4. Tính Năng Độc Đáo / Khác Biệt — Nice-to-Have

> Những tính năng **sáng tạo**, là "điểm cộng" giúp dự án nổi bật hơn so với các ứng dụng lịch thông thường hiện nay.

### 4.1 🤖 AI Schedule Assistant (Trợ lý lịch trình AI)

| Tính năng | Mô tả | Ví dụ |
|---|---|---|
| **Chat với lịch** | Hỏi đáp bằng ngôn ngữ tự nhiên về lịch trình | "Tôi rảnh khi nào tuần này?" |
| **Tạo sự kiện bằng NLP** | Tự động parse câu text thành sự kiện | "Thêm họp nhóm thứ 4 tuần sau lúc 3 giờ chiều" |
| **Gợi ý tối ưu** | Phân tích lịch trống và đề xuất | "Bạn có 2h trống chiều thứ 5, xếp 'Ôn thi' vào?" |
| **Tóm tắt ngày/tuần** | Tổng hợp lịch trình tự động | "Hôm nay 3 sự kiện, bận nhất 9-12h, rảnh sau 16h" |
| **Phân tích thói quen** | Nhận diện pattern sử dụng thời gian | "Bạn thường họp nhiều nhất vào thứ 3" |

**Triển khai:**

- Tích hợp **Gemini API** hoặc **OpenAI API**
- Prompt engineering: Truyền context lịch tuần hiện tại vào system prompt
- Function calling: AI gọi API backend để tạo/sửa/xóa sự kiện
- Rate limiting: Giới hạn số request AI mỗi user/ngày

---

### 4.2 🎯 Chế độ Focus / Pomodoro tích hợp

Kết hợp quản lý lịch với phương pháp tập trung Pomodoro.

```
Khi bắt đầu một sự kiện (ví dụ: "Ôn thi Toán"):
  → Hiển thị timer Pomodoro (25 phút làm / 5 phút nghỉ)
  → Tùy chọn: chặn thông báo không liên quan trong thời gian focus
  → Đo thời gian tập trung thực tế vs. thời gian kế hoạch
  → Ghi nhận kết quả vào thống kê cá nhân
  → Hoàn thành → Animation celebration + cập nhật streak
```

**Tuỳ chỉnh:**

- Focus duration: 25/30/45/60 phút
- Break duration: 5/10/15 phút
- Long break: mỗi 4 sessions → 15-30 phút nghỉ dài
- Auto-start next session: bật/tắt

---

### 4.3 🗺️ Heatmap "Busy Score"

Trực quan hóa mức độ bận rộn của người dùng.

| Loại Heatmap | Mô tả |
|---|---|
| **GitHub-style yearly heatmap** | Hiển thị mức độ bận rộn theo ngày trong năm (xanh nhạt → đỏ đậm) |
| **Weekly heatmap** | Ma trận 7 ngày × 24 giờ, tô màu theo mật độ sự kiện |
| **Social comparison** | So sánh mức độ bận rộn của mình vs. trung bình nhóm/lớp (anonymous) |
| **"Optimal time" indicator** | Gợi ý khung giờ tốt nhất để xếp sự kiện mới dựa trên pattern |

---

### 4.4 🌍 Hỗ trợ đa múi giờ (Multi-Timezone)

| Tính năng | Mô tả |
|---|---|
| Chọn timezone cho từng sự kiện | "Họp team US lúc 9:00 AM EST" → hiển thị "20:00 ICT" cho user ở VN |
| World clock widget | Sidebar hiển thị giờ hiện tại ở nhiều timezone (cấu hình được) |
| Auto-detect timezone | Tự nhận diện timezone từ trình duyệt, cho phép user override |
| Timezone-aware recurring events | Sự kiện lặp lại xử lý đúng khi qua DST boundary |

---

### 4.5 📱 Progressive Web App (PWA)

Biến web app thành trải nghiệm gần giống native app.

| Tính năng | Mô tả | Công nghệ |
|---|---|---|
| **Cài đặt trên Home Screen** | Giống native app, không cần app store | Web App Manifest |
| **Offline-first** | Cache dữ liệu, hoạt động không cần mạng | Service Worker + Workbox |
| **Push Notifications** | Nhắc nhở sự kiện kể cả khi đóng trình duyệt | Web Push API |
| **Background Sync** | Sự kiện tạo offline → tự động sync khi có mạng | Background Sync API |
| **App Shortcuts** | Long-press icon → Quick actions (Tạo sự kiện, Xem hôm nay) | Manifest shortcuts |

---

### 4.6 🎨 Chủ đề & Cá nhân hóa (Theming & Personalization) — ⚠️ Một phần đã hoàn thành

| Tính năng | Mô tả | Trạng thái |
|---|---|---|
| **Dark mode / Light mode** | Toggle với smooth transition, respect system preference | ✅ Đã hoàn thành (ThemeContext + Ant Design v5 algorithm + FullCalendar override + localStorage persist) |
| **Trang Cài đặt (Settings)** | Profile update + Password change | ✅ Đã hoàn thành (2 tabs: Hồ sơ + Bảo mật) |
| **Theme colors tùy chỉnh** | Chọn accent color cho toàn bộ UI (primary, secondary) | ❌ Chưa triển khai |
| **Custom wallpaper** | Background calendar theo sở thích (upload ảnh hoặc chọn preset) | ❌ Chưa triển khai |
| **Compact / Comfortable mode** | Density toggle cho người dùng có nhiều sự kiện | ❌ Chưa triển khai |
| **Font size adjustment** | Accessibility: cho phép tăng/giảm cỡ chữ | ❌ Chưa triển khai |
| **First day of week** | Chọn Thứ 2 hoặc Chủ nhật là ngày đầu tuần | ❌ Chưa triển khai |
| **Ngôn ngữ** | i18n: Tiếng Việt, English (mở rộng thêm) | ❌ Chưa triển khai |

---

### 4.7 🔗 Tích hợp bên thứ ba (Third-party Integrations)

| Dịch vụ | Loại tích hợp | Mô tả |
|---|---|---|
| **Google Calendar** | Sync 2 chiều | Import/export sự kiện, real-time sync |
| **Zoom / Google Meet** | Auto-generate link | Tự động tạo meeting link khi tạo sự kiện online |
| **Notion / Trello** | Link task → event | Kết nối task/project management với lịch |
| **Slack / Discord** | Bot notification | Gửi nhắc nhở sự kiện qua bot cho team |
| **Webhook** | Custom integration | Cho phép user tự kết nối với các dịch vụ khác qua webhook URL |

---

### 4.8 🎮 Gamification

| Tính năng | Mô tả |
|---|---|
| **Streaks** | "Bạn đã hoàn thành lịch 7 ngày liên tiếp! 🔥" |
| **Badges/Achievements** | "Tuần sao vàng": Hoàn thành 100% sự kiện trong tuần |
| **XP & Levels** | Tích điểm khi hoàn thành sự kiện đúng giờ, lên level |
| **Leaderboard** | Bảng xếp hạng trong nhóm/lớp (optional, privacy-aware) |
| **Weekly challenges** | "Thử thách tuần này: Không hủy sự kiện nào!" |

---

## 5. Gợi Ý UX/UI

### 5.1 Nguyên tắc thiết kế chính

| Nguyên tắc | Áp dụng cụ thể |
|---|---|
| **⚡ Speed-first** | Mọi thao tác CRUD ≤ 300ms perceived latency. Dùng optimistic updates (cập nhật UI trước, gửi API sau) |
| **🎯 Progressive disclosure** | Hiển thị thông tin tối thiểu → Expand khi cần: click sự kiện → popup summary → click "Chi tiết" → full page |
| **📱 Mobile-first responsive** | Calendar view phải hoạt động tốt trên màn hình nhỏ nhất 375px. Sử dụng breakpoints: 375 / 768 / 1024 / 1440px |
| **♿ Accessibility (a11y)** | WCAG 2.1 AA: full keyboard navigation, screen reader support, color contrast ratio ≥ 4.5:1, focus indicators |
| **🧠 Consistency** | Sử dụng design tokens (colors, spacing, typography) nhất quán toàn ứng dụng |

---

### 5.2 Tạo sự kiện nhanh (Quick Add) — UX Pattern quan trọng nhất

Giảm friction tối đa khi tạo sự kiện mới:

**Cách 1 — Inline Quick Add:**

```
Click vào ô trống trên calendar:
  → Inline input xuất hiện NGAY tại vị trí click
  → Gõ tiêu đề + Enter → Sự kiện được tạo với duration mặc định (1h)
  → Click "Chi tiết" (hoặc Ctrl+Enter) → Mở form đầy đủ để chỉnh sửa
```

**Cách 2 — Keyboard Shortcut:**

```
Nhấn "N" ở bất kỳ đâu → Quick add modal xuất hiện
  → Focus ngay vào ô tiêu đề
  → Tab để chuyển qua các field
  → Enter để tạo
```

**Keyboard shortcuts toàn cục:**

| Phím | Hành động |
|---|---|
| `N` | Tạo sự kiện mới (Quick add) |
| `T` | Nhảy về hôm nay |
| `D` | Chuyển sang xem ngày |
| `W` | Chuyển sang xem tuần |
| `M` | Chuyển sang xem tháng |
| `←` / `→` | Lùi / tiến khoảng thời gian (ngày/tuần/tháng tùy view) |
| `/` | Focus vào ô tìm kiếm |
| `Esc` | Đóng modal/popup hiện tại |
| `Ctrl+Z` | Undo thao tác cuối |

---

### 5.3 Hướng dẫn layout cho từng chế độ xem

**Xem tháng:**

- Grid 7 cột × 5-6 hàng
- Mỗi ô hiển thị tối đa 3 sự kiện dạng pill nhỏ (color bar + title)
- Nếu có > 3 sự kiện → hiển thị "+N more" → click để expand
- Ngày hôm nay: highlight background + border accent color

**Xem tuần:**

- 7 cột time-grid, header hiển thị ngày + thứ
- Trục dọc: timeline 00:00 → 23:59, chia theo khung 30 phút hoặc 1 giờ
- Sự kiện: dạng block chiếm đúng khoảng thời gian, chiều rộng tỷ lệ với thời lượng
- Sự kiện chồng chéo: hiển thị side-by-side (chia đôi/ba cột)
- Đường kẻ đỏ ngang: current time indicator, di chuyển real-time

**Xem ngày:**

- 1 cột time-grid chi tiết, toàn bộ chiều rộng
- Scrollable từ 00:00 → 23:59
- Auto-scroll đến giờ hiện tại khi mở
- Hiển thị chi tiết hơn: title + description + attendees + location

**Xem agenda (danh sách):**

- Danh sách vertical, group theo ngày
- Mỗi item: `●[color] | Title | 09:00-10:00 | [tags] | [priority badge]`
- Sticky date headers khi scroll
- Infinite scroll hoặc pagination

---

### 5.4 Micro-interactions & Animations

Những animation nhỏ tạo cảm giác ứng dụng "sống" và chuyên nghiệp.

| Tương tác | Hiệu ứng |
|---|---|
| Hover lên sự kiện | Scale 1.02 + box-shadow tăng nhẹ + tooltip preview (title + time) |
| Drag sự kiện | Opacity 0.7 + ghost element theo chuột + snap-to-grid visual guides |
| Xóa sự kiện | Slide-out animation (200ms) + "Undo" toast notification (5 giây countdown) |
| Chuyển view (tháng ↔ tuần ↔ ngày) | Smooth crossfade / slide transition (300ms ease-in-out) |
| Tạo sự kiện thành công | Subtle confetti micro-burst hoặc checkmark animation |
| Thời gian thực | Đường kẻ đỏ (current time indicator) di chuyển real-time trên day/week view |
| Loading states | Skeleton loading thay vì spinner (perceived performance tốt hơn) |
| Empty state | Illustration + CTA "Tạo sự kiện đầu tiên" khi lịch trống |

---

### 5.5 Responsive Design Breakpoints

| Breakpoint | Layout | Thay đổi chính |
|---|---|---|
| **≥ 1440px** (Desktop lớn) | Sidebar + Calendar + Detail panel | 3-column layout |
| **1024-1439px** (Desktop) | Sidebar + Calendar | 2-column, detail panel = modal |
| **768-1023px** (Tablet) | Sidebar collapsible + Calendar full-width | Sidebar ẩn mặc định, hamburger menu |
| **< 768px** (Mobile) | Bottom navigation + Calendar | Sidebar → bottom tab bar, chỉ day/agenda view |

---

### 5.6 ~~Đề xuất nâng cấp~~ Ant Design — 🟢 Đã hoàn thành

> **Đã nâng cấp thành công** từ Ant Design v4 lên **Ant Design v5** (`^5.29.3`):
>
> - ✅ Tích hợp `dayjs` thay `moment.js` → giảm ~60% bundle size
> - ✅ CSS-in-JS (cssinjs) cho theming linh hoạt hơn (Dark mode đã triển khai)
> - ✅ Component API mới, performance tốt hơn
> - ✅ Design tokens system → consistent theming (đang dùng `darkAlgorithm` / `defaultAlgorithm`)
> - ✅ Active maintenance & security updates

---

## 6. Thách Thức Kỹ Thuật

### 6.1 Xử lý múi giờ (Timezone Handling)

| Vấn đề | Giải pháp |
|---|---|
| User ở VN tạo sự kiện, user ở US xem | Lưu **UTC** ở backend, convert theo timezone client ở frontend |
| Daylight Saving Time (DST) | Sử dụng `Intl.DateTimeFormat` + IANA timezone database |
| Sự kiện lặp qua DST boundary | Lưu "local time" cho recurrence rule, resolve ra UTC tại thời điểm render |
| Database query theo timezone | Query bằng UTC range, convert kết quả ở application layer |

**Code pattern:**

```typescript
// Backend: LUÔN lưu UTC trong MongoDB
const utcStart = new Date(req.body.startTime); // Client gửi ISO string (đã có timezone info)

// Frontend: Convert sang local time CHỈ khi hiển thị
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

// Hiển thị
const localDisplay = dayjs.utc(schedule.startTime)
  .tz('Asia/Ho_Chi_Minh')
  .format('HH:mm DD/MM/YYYY');

// Tạo sự kiện mới
const utcTime = dayjs.tz('2026-07-20 09:00', 'Asia/Ho_Chi_Minh')
  .utc()
  .toISOString();
```

---

### 6.2 Thuật toán phát hiện xung đột lịch (Conflict Detection Algorithm)

**MongoDB query:**

```typescript
// Tìm tất cả sự kiện overlap với khoảng thời gian [newStart, newEnd)
const conflicts = await Schedule.find({
  _id: { $ne: currentEventId },  // Loại trừ chính sự kiện đang edit
  createdBy: userId,              // Chỉ check conflict cùng user
  startTime: { $lt: newEndTime },  // Bắt đầu trước khi sự kiện mới kết thúc
  endTime: { $gt: newStartTime },  // Kết thúc sau khi sự kiện mới bắt đầu
});
```

**Edge cases cần xử lý:**

```
Case 1: Adjacent events (KHÔNG trùng)
  A: [09:00 - 10:00]  B: [10:00 - 11:00]
  → startA < endB ✓ nhưng endA = startB → cần dùng $gt (strict), KHÔNG dùng $gte

Case 2: Nested events (TRÙNG)
  A: [09:00 - 11:00]  B: [10:00 - 10:30]
  → B nằm hoàn toàn trong A → conflict

Case 3: Partial overlap (TRÙNG)
  A: [09:00 - 10:30]  B: [10:00 - 11:00]
  → Overlap 30 phút → conflict

Case 4: Recurring events
  → Phải "expand" recurrence thành instances trước khi check
  → Performance: chỉ expand trong khoảng thời gian ±1 tháng

Case 5: Multi-timezone
  → Convert tất cả về UTC trước khi compare
```

---

### 6.3 Xử lý sự kiện lặp lại (Recurring Events Strategy)

| Approach | Cách hoạt động | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **Expand tất cả instances** | Khi tạo recurring → insert N records vào DB | Query đơn giản, không cần logic expand | DB phình to nhanh, sửa template phải update hàng trăm records |
| **Template only** | Lưu chỉ 1 rule template, expand on-the-fly khi query | DB rất gọn, sửa template chỉ cần update 1 record | Query phức tạp, cần logic expand tại API layer, performance concern |
| **Hybrid** ✅ Recommended | Template + materialized exceptions | Cân bằng tốt giữa performance và flexibility | Phức tạp hơn 2 approach trên |

**Chi tiết Hybrid Approach:**

```
1. Lưu RecurrenceRule template (1 document)
2. Khi query: expand template thành virtual instances cho date range cần hiển thị
3. Cache kết quả expand (Redis hoặc in-memory, TTL = 1h)
4. Khi user sửa 1 instance cụ thể:
   → Tạo "exception" document riêng (isException = true, parentEvent = templateId)
   → Thêm ngày đó vào exceptions[] của template
5. Khi user sửa "tất cả": Update template, invalidate cache
6. Khi user sửa "sự kiện này và sau đó":
   → Set endDate cho template gốc = ngày trước ngày sửa
   → Tạo template mới từ ngày sửa trở đi
```

---

### 6.4 Performance với lượng dữ liệu lớn

| Vấn đề | Giải pháp | Chi tiết |
|---|---|---|
| Load 1000+ sự kiện | **Virtualized rendering** | Chỉ render sự kiện trong viewport hiện tại. Lib: `react-virtualized`, `react-window` |
| Query sự kiện theo range | **Compound index** | MongoDB: `{ createdBy: 1, startTime: 1, endTime: 1 }` |
| API response lớn | **Pagination + lazy loading** | Load sự kiện theo tháng, prefetch tháng trước/sau |
| Real-time updates | **WebSocket** | Socket.IO cho live sync: khi user A tạo sự kiện → user B thấy ngay |
| Offline/online sync | **Conflict resolution** | Last-Write-Wins (đơn giản) hoặc Operational Transform (phức tạp, chính xác hơn) |
| Bundle size | **Code splitting** | Lazy load routes và heavy components (Chart, Calendar view) |

**MongoDB Index Strategy:**

```typescript
// Index cho query phổ biến nhất: lấy sự kiện theo user + khoảng thời gian
ScheduleSchema.index({ createdBy: 1, startTime: 1, endTime: 1 });

// Index cho conflict detection
ScheduleSchema.index({ startTime: 1, endTime: 1 });

// Index cho search
ScheduleSchema.index({ title: 'text', description: 'text' });
```

---

### 6.5 Bảo mật (Security)

| Rủi ro hiện tại | Mức độ | Giải pháp đề xuất |
|---|---|---|
| JWT trong localStorage → XSS attack | 🟢 Đã hoàn thành | Đã chuyển JWT sang lưu trữ trong **httpOnly cookie** (secure, sameSite: strict, maxAge: 15p) |
| Không có refresh token | 🔴 High | Implement **refresh token rotation**: mỗi lần refresh → phát token mới, thu hồi token cũ |
| Không có rate limiting | 🟢 Đã hoàn thành | Đã thêm `express-rate-limit`: auth routes (10 requests/phút), schedule routes (100 requests/phút) |
| Không validate input | 🟢 Đã hoàn thành | Đã thêm `zod` schema validation cho schedule CRUD (create + update) qua `validateMiddleware` |
| Admin role check chỉ ở frontend | 🟢 Đã hoàn thành | Đã thêm và áp dụng middleware `isAdmin` xác thực role admin từ JWT token ở backend |
| Không có CORS config cụ thể | 🟢 Đã hoàn thành | Đã giới hạn CORS bằng domain whitelist (chỉ cho phép localhost origin cụ thể) |
| Không sanitize output | 🔵 Low | Chống XSS: sanitize user input trước khi lưu DB (`dompurify`, `xss`) |

**Ví dụ cải thiện auth flow:**

```typescript
// Thay vì lưu JWT vào localStorage:
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

---

### 6.6 Testing Strategy

| Loại test | Công cụ | Phạm vi |
|---|---|---|
| **Unit tests** | Jest + React Testing Library | Business logic, utils, hooks |
| **Integration tests** | Supertest + MongoDB Memory Server | API endpoints, middleware |
| **E2E tests** | Cypress hoặc Playwright | User flows: login → tạo sự kiện → xem lịch |
| **Visual regression** | Chromatic hoặc Percy | Đảm bảo UI không bị break khi refactor |

---

## 7. Cấu Trúc Dữ Liệu Mở Rộng Đề Xuất

### 7.1 Schedule Model (mở rộng)

```typescript
interface IScheduleExpanded {
  // === Existing fields (giữ nguyên) ===
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  color: string;
  createdBy: ObjectId;        // ref: 'User'

  // === New MVP fields ===
  location?: string;          // Địa điểm / phòng học / link online
  category: ObjectId;         // ref: 'Category'
  tags: string[];             // Nhãn tự do: ['quan-trọng', 'deadline']
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

  // === Recurrence ===
  recurrence: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek: number[];
    endDate?: Date;
    exceptions: Date[];
  } | null;
  parentEvent?: ObjectId;     // ref tới template gốc nếu là exception
  isException: boolean;       // true nếu là instance bị sửa riêng

  // === Collaboration ===
  participants: ObjectId[];   // Users được assign vào sự kiện
  visibility: 'private' | 'group' | 'public';
  groupId?: ObjectId;         // ref: 'Group'

  // === Reminders ===
  reminders: {
    type: 'notification' | 'email';
    minutesBefore: number;    // 5, 15, 30, 60, 1440 (1 ngày)
  }[];

  // === Metadata ===
  attachments: {
    filename: string;
    url: string;
    size: number;
  }[];
  meetingLink?: string;       // Zoom/Meet URL
  notes?: string;             // Ghi chú riêng (khác description)

  // === Auto-generated ===
  createdAt: Date;
  updatedAt: Date;
}
```

### 7.2 Category Model (mới)

```typescript
interface ICategory {
  name: string;               // "Học tập", "Công việc", "Cá nhân"
  color: string;              // Hex color
  icon: string;               // Emoji hoặc icon name
  createdBy: ObjectId;        // User tạo (hoặc system default)
  isDefault: boolean;         // true = category mặc định không xóa được
  order: number;              // Thứ tự hiển thị
}
```

### 7.3 Notification Model (mới)

```typescript
interface INotification {
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

### 7.4 Group Model (mới)

```typescript
interface IGroup {
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

## 8. Roadmap Triển Khai Đề Xuất

> 📎 Xem kế hoạch phát triển tiếp theo chi tiết tại [NEXT_DEVELOPMENT_PLAN.md](./NEXT_DEVELOPMENT_PLAN.md)

### Phase 1 — MVP Enhancement (4-5 tuần) — 🟢 100% hoàn thành

| Tuần | Task | Kết quả | Trạng thái |
|---|---|---|---|
| Tuần 1 | Nâng cấp Ant Design v4 → v5, chuyển `moment.js` → `dayjs` | Foundation sạch, bundle nhỏ hơn | ✅ Hoàn thành |
| Tuần 2-3 | Multi-view Calendar (Tuần + Ngày) | 4 chế độ xem hoạt động đầy đủ (Tháng/Tuần/Ngày/Danh sách) | ✅ Hoàn thành |
| Tuần 3 | Conflict Detection (Backend + Frontend) | Tự động phát hiện và cảnh báo trùng lịch + force-create | ✅ Hoàn thành |
| Tuần 4 | Search & Filter sự kiện | Tìm kiếm nhanh, lọc theo keyword + danh mục + độ ưu tiên | ✅ Hoàn thành |
| Tuần 4-5 | Admin User Management | Trang quản lý user cho admin (list + role + lock) | ✅ Hoàn thành |
| Tuần 5 | Notification System (In-app) | Bell icon + badge count + popover + auto-create khi CRUD schedule | ✅ Hoàn thành |

**Kết quả Phase 1**: **Hoàn thành 100%** — Hệ thống lịch hoàn chỉnh, đa dạng view, phát hiện trùng, quản lý user, thông báo in-app.

---

### Phase 2 — Should-Have (6-8 tuần) — 🟡 ~80% hoàn thành

| Tuần | Task | Kết quả | Trạng thái |
|---|---|---|---|
| Tuần 6-7 | Recurring Events | Sự kiện lặp lại: daily/weekly/monthly, exception system, expand on-the-fly | ✅ Hoàn thành |
| Tuần 7-8 | Drag & Drop | Kéo thả + resize sự kiện trên calendar, optimistic UI + rollback | ✅ Hoàn thành |
| Tuần 9 | Categories & Tags | Category Model riêng + CRUD API đầy đủ (Backend). Frontend filter đã có, UI quản lý category chưa có | ⚠️ Backend ✅, Frontend UI ❌ |
| Tuần 9-10 | Notification System | In-app: bell icon, polling 30s, mark read/all, delete, auto-create | ✅ Hoàn thành |
| Tuần 11 | Export ICS / PDF | Backend export .ics (`ical-generator`) + Frontend export PDF (`jsPDF`) | ✅ Hoàn thành |
| Tuần 11-13 | Analytics Dashboard | KPI cards + Column chart (theo thứ) + Pie chart (theo danh mục) + time filter | ✅ Hoàn thành |

**Kết quả Phase 2**: **Đã hoàn thành ~80%** — Recurring Events, Drag & Drop, Notification, Export, Analytics đều đã xong. Còn thiếu: Category UI quản lý trực tiếp, một số UX nhỏ.

---

### Phase 3 — Nice-to-Have (6-8 tuần) — 🟡 ~15% hoàn thành

| Tuần | Task | Kết quả | Trạng thái |
|---|---|---|---|
| Tuần 14-16 | AI Schedule Assistant | Chat tạo sự kiện, gợi ý thông minh | ❌ Chưa bắt đầu |
| Tuần 17-18 | PWA + Offline Sync | Cài đặt như native app, offline support | ❌ Chưa bắt đầu |
| Tuần 19 | Dark Mode + Theming | Chủ đề tùy chỉnh (Dark/Light toggle, FullCalendar override) | ✅ Hoàn thành |
| Tuần 19 | Settings Page | Trang cài đặt: cập nhật hồ sơ + đổi mật khẩu | ✅ Hoàn thành |
| Tuần 19 | Security Hardening | Rate limiting (`express-rate-limit`) + Input validation (`zod`) | ✅ Hoàn thành |
| Tuần 20-22 | Third-party Integrations | Google Calendar sync, Zoom link | ❌ Chưa bắt đầu |

**Kết quả Phase 3**: **Đã hoàn thành ~15%** — Dark Mode, Settings, Security đã xong. Còn lại: AI Assistant, PWA, Third-party integrations.

---

## 9. Tóm Tắt & Khuyến Nghị

### ~~Ưu tiên hành động ngay~~ Đã hoàn thành ✅

1. ~~**Nâng cấp foundation**: Ant Design v4 → v5, `moment.js` → `dayjs`, cải thiện auth security (httpOnly cookies)~~ ✅ Đã hoàn thành
2. ~~**Multi-view Calendar**: Tích hợp week/day view — đây là tính năng tạo ra giá trị lớn nhất~~ ✅ Đã hoàn thành (FullCalendar v6, 4 views)
3. ~~**Conflict Detection**: Phát hiện trùng lịch tại backend — cần thiết cho mọi ứng dụng lịch~~ ✅ Đã hoàn thành (Backend + Frontend + Drag rollback)

### ~~Ưu tiên hành động tiếp theo~~ Đã hoàn thành ✅

1. ~~**Notification System**: Hệ thống thông báo in-app~~ ✅ Đã hoàn thành (bell icon, polling, mark read, auto-create)
2. ~~**Rate Limiting + Input Validation**: Bảo mật cơ bản~~ ✅ Đã hoàn thành (`express-rate-limit` + `zod`)
3. ~~**Tags + Category CRUD**: Nâng cấp hệ thống phân loại sự kiện~~ ⚠️ Backend API ✅, Frontend UI chưa hoàn thiện

### Ưu tiên hành động tiếp theo (mới)

> 📎 Xem chi tiết tại [NEXT_DEVELOPMENT_PLAN.md](./NEXT_DEVELOPMENT_PLAN.md)

1. **Category Management UI**: Frontend quản lý danh mục (Backend API đã sẵn sàng)
2. **Keyboard Shortcuts + Quick Add**: Phím tắt toàn cục (`react-hotkeys-hook` đã cài)
3. **Admin Panel nâng cao**: Reset password, thống kê user, filter theo người tạo
4. **Responsive Mobile + Micro-animations**: Mobile-first, skeleton loading, undo toast

### Ma trận Impact vs. Effort (cập nhật 22/07/2026)

```
              Low Effort ←───────────────────→ High Effort
          ┌─────────────────────┬────────────────────────┐
High      │ ✅ Conflict Detect. │ ✅ Recurring Events    │
Impact    │ ✅ Search & Filter  │ ✅ Multi-view Calendar │
          │ ⚠️ Categories UI   │ 🚀 AI Assistant        │
          ├─────────────────────┼────────────────────────┤
Low       │ ✅ Dark Mode        │ 💡 3rd-party Sync      │
Impact    │ ✅ Export PDF/ICS   │ 💡 PWA + Offline       │
          │ 🔜 Keyboard Shortc.│ 💡 Pomodoro Timer      │
          └─────────────────────┴────────────────────────┘

Legend: ✅ Đã xong | ⚠️ Một phần | 🔜 Sắp làm | 🚀 Kế hoạch | 💡 Tương lai
```

### Nguyên tắc phát triển

- **Iterate fast**: Ship MVP sớm → thu thập feedback → cải thiện
- **Test-driven**: Viết test cho business logic trước khi code feature
- **User-centric**: Mọi quyết định kỹ thuật phải phục vụ trải nghiệm người dùng
- **Security-first**: Không bỏ qua bảo mật dù là side project

---

> 📌 **Document này là living document** — sẽ được cập nhật khi dự án tiến triển và có thêm feedback từ người dùng.
