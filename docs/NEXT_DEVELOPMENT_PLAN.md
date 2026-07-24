# 📅 Kế Hoạch Phát Triển Tiếp Theo — Manage Timetable

> **Vai trò**: Senior QA Lead & System Architect  
> **Ngày cập nhật**: 24/07/2026  
> **Tham chiếu**: [PRODUCT_ANALYSIS.md](./PRODUCT_ANALYSIS.md)  
> **Trạng thái**: Phase 3 (~40% hoàn thành) — Còn lại: Hotfix bảo mật + Nâng cấp tính năng

---

## Mục lục

1. [Tổng Quan](#1-tổng-quan)
2. [Báo Cáo Rà Soát Lỗi & Lỗ Hổng Tồn Đọng](#2-báo-cáo-rà-soát-lỗi--lỗ-hổng-tồn-đọng)
3. [Kế Hoạch Khắc Phục Chi Tiết (Action Plan)](#3-kế-hoạch-khắc-phục-chi-tiết-action-plan)
4. [Lộ Trình Nâng Cấp & Tính Năng Chưa Thực Hiện](#4-lộ-trình-nâng-cấp--tính-năng-chưa-thực-hiện)
5. [Backlog & Định Hướng Tương Lai](#5-backlog--định-hướng-tương-lai)
6. [Ma Trận Ưu Tiên Tổng Hợp](#6-ma-trận-ưu-tiên-tổng-hợp)

---

## 1. Tổng Quan

### Tiến độ hiện tại

| Phase | Tiến độ | Ghi chú |
|---|---|---|
| Phase 1 — MVP Enhancement | 🟢 **100%** | Hoàn thành toàn bộ |
| Phase 2 — Should-Have | 🟢 **100%** | Hoàn thành toàn bộ |
| Phase 3 — Nice-to-Have | 🟡 **~40%** | Dark Mode ✅, Settings ✅, Pomodoro ✅, i18n ✅, PWA 80% |

### Phân loại mức độ rủi ro (Risk Classification)

| Mức độ | Số lượng | Mô tả rủi ro |
|---|---|---|
| 🔴 **Cao (Critical / Security)** | 3 | IDOR, ReDoS / Regex Injection, Unhandled CastError (500) |
| 🟡 **Trung bình (Logic / UX)** | 3 | Conflict lịch lặp, phân vùng dữ liệu `createdBy`, chuỗi hardcoded vỡ i18n |
| 🟢 **Thấp (Tech Debt / Feature)** | 3 | Thiếu Test tự động, Web Push chưa xong, thiếu Refresh Token |

---

## 2. Báo Cáo Rà Soát Lỗi & Lỗ Hổng Tồn Đọng

### 🟢 LỖ HỔNG 01: Phân quyền xem & chỉnh sửa/xóa chưa triệt để (IDOR — Broken Object Level Authorization) — ✅ Đã khắc phục

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`updateSchedule`, `deleteSchedule`)
- **Mô tả**: Controller trước đó chỉ `Schedule.findById(targetId)` mà **không kiểm tra** người dùng hiện tại (`req.user._id`) có phải là chủ sở hữu (`createdBy`) hoặc Admin hay không.
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. Đã bổ sung kiểm tra phân quyền `isOwner || isAdminUser` trong cả `updateSchedule` và `deleteSchedule`. Nếu người dùng không phải chủ sở hữu sự kiện và không phải Admin, hệ thống sẽ từ chối thao tác với HTTP 403.

---

### 🟢 LỖ HỔNG 02: Regex Injection & ReDoS trong ô tìm kiếm (Search Vulnerability) — ✅ Đã khắc phục

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`searchSchedules`) & `userController.ts` (`getUsers`)
- **Mô tả**: Keyword tìm kiếm trước đó được truyền trực tiếp vào `$regex` MongoDB mà không escape ký tự đặc biệt (`(`, `[`, `*`, `+`, `?`, `\`).
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. Đã tạo helper `escapeRegex` tại `backend/src/utils/stringUtils.ts` và bọc toàn bộ từ khóa tìm kiếm trước khi đưa vào query `$regex` trong cả `searchSchedules` và `getUsers`.

---

### 🟢 LỖ HỔNG 03: Sập hệ thống 500 do Unhandled Mongoose CastError — ✅ Đã khắc phục

- **Vị trí**: Tất cả Controllers (`scheduleController`, `userController`, `categoryController`, `notificationController`, `focusSessionController`, `authController`)
- **Mô tả**: Truyền ID không đúng 24 ký tự hex (ví dụ: `GET /api/schedules/invalid-id-123`) → Mongoose ném `CastError: Cast to ObjectId failed`.
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. 
  - Tạo utility `isValidObjectId` và `handleControllerError` tại `backend/src/utils/errorHandler.ts` để bắt và trả về HTTP `400 Bad Request` đối với `CastError`.
  - Tạo Middleware bắt lỗi toàn cục `globalErrorHandler` tại `backend/src/middlewares/errorHandler.ts` và đăng ký trong `index.ts`.
  - Bổ sung kiểm tra định dạng `isValidObjectId` trước khi query và bọc toàn bộ controller catch blocks.

---

### 🟢 LỖ HỔNG 04: Conflict Detection bỏ qua sự kiện lặp (Recurring Virtual Instances) — ✅ Đã khắc phục

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`createSchedule`, `updateSchedule`) & `backend/src/config/recurrenceHelper.ts`
- **Mô tả**: Query conflict chỉ tìm các record tĩnh trong DB. Nếu user có sự kiện lặp hàng ngày từ 9:00-10:00, khi tạo sự kiện mới 9:30 ngày hôm sau, Backend **không phát hiện trùng** vì virtual instance chưa có document riêng trong DB.
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. 
  - Tạo helper `checkScheduleConflicts` tại [`recurrenceHelper.ts`](file:///e:/Hoctap/manage-timetable/backend/src/config/recurrenceHelper.ts) cho phép mở rộng (expand) tất cả sự kiện tĩnh lẫn sự kiện lặp (virtual instances) trong khoảng thời gian kiểm tra.
  - Cập nhật hàm `createSchedule` và `updateSchedule` trong `scheduleController.ts` sử dụng `checkScheduleConflicts` để phát hiện trùng lịch chính xác cho cả sự kiện đơn lẻ và chuỗi sự kiện lặp lại.

---

### 🟢 LỖ HỔNG 05: Phân vùng dữ liệu cá nhân trong `getSchedules` (Privacy & Scope Issue) — ✅ Đã khắc phục

- **Vị trí**: `backend/src/controllers/scheduleController.ts` (`getSchedules`, `searchSchedules`)
- **Mô tả**: Hàm `getSchedules` trước đó lấy toàn bộ sự kiện trong DB mà không phân quyền scope `createdBy: req.user._id` đối với người dùng thông thường.
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. 
  - Bổ sung logic phân vùng dữ liệu cá nhân (User Scope Isolation) trong cả `getSchedules` và `searchSchedules`.
  - Người dùng thông thường (`user`) bắt buộc chỉ truy vấn dữ liệu thuộc về chính họ (`createdBy: req.user._id`), ngăn chặn việc xem trái phép lịch của người dùng khác dù truyền param `creator`.
  - Quản trị viên (`admin`) được giữ quyền truy cập linh hoạt: xem toàn bộ hoặc lọc theo `creator` cụ thể.

---

### 🟢 LỖ HỔNG 06: Chuỗi văn bản Hardcoded gây vỡ trải nghiệm i18n — ✅ Đã khắc phục

- **Vị trí**: `ScheduleCalendar.tsx`, `PomodoroModal.tsx`, `CommonLayout.tsx`, `vi.json`, `en.json`
- **Mô tả**: Một số Modal, `message.error`, tooltip trước đó viết cứng bằng tiếng Việt thay vì gọi `t('key')` từ `react-i18next`.
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. 
  - Bổ sung đầy đủ các translation keys còn thiếu vào cả 2 file từ điển [`vi.json`](file:///e:/Hoctap/manage-timetable/frontend/src/i18n/locales/vi.json) và [`en.json`](file:///e:/Hoctap/manage-timetable/frontend/src/i18n/locales/en.json).
  - Thay thế toàn bộ chuỗi văn bản hardcoded trong [`ScheduleCalendar.tsx`](file:///e:/Hoctap/manage-timetable/frontend/src/components/ScheduleCalendar.tsx), [`PomodoroModal.tsx`](file:///e:/Hoctap/manage-timetable/frontend/src/components/PomodoroModal.tsx) và [`CommonLayout.tsx`](file:///e:/Hoctap/manage-timetable/frontend/src/components/CommonLayout.tsx) bằng hàm `t(...)` của `react-i18next`.
  - Đảm bảo khi người dùng chuyển đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh, 100% giao diện, thông báo lỗi, thông báo đẩy, tooltip và modal đều thay đổi đồng bộ.

---

### 🟢 LỖ HỔNG 07: Thiếu bộ Test tự động (Testing Debt) — ✅ Đã khắc phục

- **Vị trí**: Toàn bộ dự án (`backend` & `frontend`)
- **Mô tả**: Chưa có bất kỳ framework testing nào (Jest, Supertest, Vitest, Playwright).
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. 
  - **Backend**: Đã cài đặt `jest`, `ts-jest`, `supertest` và cấu hình [`jest.config.js`](file:///e:/Hoctap/manage-timetable/backend/jest.config.js). Đã bổ sung các bộ test tự động trong `backend/tests/` kiểm thử `escapeRegex`, `isValidObjectId`, `handleControllerError`, `expandRecurringEvents`. Chạy `npm test` vượt qua 100% (10 tests passed).
  - **Frontend**: Đã cài đặt `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` và cấu hình [`vite.config.ts`](file:///e:/Hoctap/manage-timetable/frontend/vite.config.ts) + [`setupTests.ts`](file:///e:/Hoctap/manage-timetable/frontend/src/setupTests.ts). Đã tạo bộ test kiểm thử `LanguageSelector` và `pwaHelper`. Chạy `npm test` vượt qua 100% (2 test suites passed).

---

### 🟢 LỖ HỔNG 08: Web Push API & Background Notification chưa hoàn chỉnh — ✅ Đã khắc phục

- **Vị trí**: Backend, Service Worker (`sw.js`) & `pwaHelper.ts`
- **Mô tả**: Service Worker hiện tại chỉ cache static assets. Chưa triển khai VAPID Keys và endpoint Web Push (`pushManager.subscribe`) để gửi thông báo đẩy khi đóng trình duyệt.
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. 
  - **Backend**: Cài đặt thư viện `web-push`, tạo model Mongoose [`PushSubscription.ts`](file:///e:/Hoctap/manage-timetable/backend/src/models/PushSubscription.ts), cấu hình VAPID Keys tại [`webPushConfig.ts`](file:///e:/Hoctap/manage-timetable/backend/src/config/webPushConfig.ts) và phát triển các endpoints `/api/notifications/vapid-public-key`, `/api/notifications/subscribe`, `/api/notifications/unsubscribe`.
  - **Service Worker (`sw.js`)**: Bổ sung listener lắng nghe sự kiện `'push'` và `'notificationclick'` cho phép mở ứng dụng hoặc focus tab khi bấm vào thông báo.
  - **Frontend Client (`pwaHelper.ts`)**: Thêm helper `subscribeUserToWebPush()` và `unsubscribeUserFromWebPush()`, kết nối với nút bật/tắt Web Push Notification trên giao diện `CommonLayout.tsx`.

---

### 🟢 LỖ HỔNG 09: JWT thời hạn dài & Thiếu Refresh Token Rotation — ✅ Đã khắc phục

- **Vị trí**: `backend/src/controllers/authController.ts`, `backend/src/models/RefreshToken.ts`, `frontend/src/services/api.ts`
- **Mô tả**: Access Token trước đó có thời hạn quá dài (30 ngày) không có Refresh Token hoặc Token Revocation.
- **Trạng thái**: 🟢 **Đã khắc phục (24/07/2026)**. 
  - **Kiến trúc Token ngắn hạn**: Chuyển Access Token sang thời hạn ngắn `15 phút` (`15m`) và bổ sung Refresh Token thời hạn `7 ngày` (`7d`).
  - **Model RefreshToken trong MongoDB**: Tạo [`RefreshToken.ts`](file:///e:/Hoctap/manage-timetable/backend/src/models/RefreshToken.ts) để theo dõi danh sách token được cấp, trạng thái vô hiệu hóa (`isRevoked`), cờ thay thế (`replacedByToken`) và chỉ mục tự động dọn dẹp TTL (TTL index).
  - **Cơ chế Xoay vòng Token (Refresh Token Rotation) & Phát hiện Sử dụng lại (Reuse Detection)**: Phát triển endpoint `POST /api/auth/refresh`. Nếu phát hiện refresh token đã bị hủy (`isRevoked: true`) được gửi lên, hệ thống kích hoạt cơ chế an ninh Reuse Detection để hủy toàn bộ phiên làm việc (Revoke All Sessions) của người dùng đó ngay lập tức.
  - **Tự động gia hạn dưới Client**: Cấu hình Axios Interceptor trong [`api.ts`](file:///e:/Hoctap/manage-timetable/frontend/src/services/api.ts) để khi Access Token hết hạn (lỗi `401`), Client sẽ tự động gửi yêu cầu `POST /api/auth/refresh` ngầm để lấy cặp token mới và thực hiện lại request bị gián đoạn mà không làm ngắt quãng trải nghiệm người dùng.

---

## 3. Kế Hoạch Khắc Phục Chi Tiết (Action Plan)

### PHASE A: CẤP BÁCH — Hotfix Bảo Mật & Lỗi Sập Server (Sprint 1)

#### Task A1: Triển khai Authorization Check (Sửa Lỗi 01 — IDOR) — 🟢 **ĐÃ HOÀN THÀNH**

- **Giải pháp**: Trong `updateSchedule` và `deleteSchedule`, đã thêm kiểm tra quyền sở hữu hoặc quyền admin:
  ```typescript
  const createdById = (schedule.createdBy as any)._id
    ? (schedule.createdBy as any)._id.toString()
    : schedule.createdBy.toString();

  const isOwner = createdById === req.user._id.toString();
  const isAdminUser = req.user.role === 'admin';

  if (!isOwner && !isAdminUser) {
    res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa/xóa lịch trình này' });
    return;
  }
  ```

#### Task A2: Escape Regex & Chống ReDoS (Sửa Lỗi 02) — 🟢 **ĐÃ HOÀN THÀNH**

- **Giải pháp**: Đã tạo helper utility `escapeRegex(text: string)` tại `backend/src/utils/stringUtils.ts`:
  ```typescript
  export const escapeRegex = (text: string): string => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  };
  ```
  Bọc tất cả keyword tìm kiếm trong `escapeRegex(search)` trước khi truyền vào query `$regex` trong `scheduleController.ts` (`searchSchedules`) và `userController.ts` (`getUsers`).

#### Task A3: Global Error Handler cho Mongoose CastError (Sửa Lỗi 03)

- **Giải pháp**: Bổ sung middleware xử lý lỗi toàn cục (`errorHandler.ts`):
  ```typescript
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Mã định danh (ID) không hợp lệ.' });
  }
  ```

---

### PHASE B: LOGIC CỐT LÕI & UI/UX FLOW (Sprint 2)

#### Task B1: Nâng cấp Conflict Detection cho Lịch Lặp (Sửa Lỗi 04) — 🟢 **ĐÃ HOÀN THÀNH (24/07/2026)**

- **Giải pháp**: Khi kiểm tra xung đột:
  1. Lấy tất cả sự kiện tĩnh VÀ sự kiện lặp (`recurrence.type != 'none'`) trong khoảng thời gian `[start, end]`.
  2. Dùng `expandRecurringEvents` giải nén các virtual instances.
  3. Kiểm tra va chạm thời gian trên cả danh sách đã giải nén.
- **Trạng thái**: 🟢 **Đã hoàn thành (24/07/2026)**.
  - **Files chỉnh sửa**: [`recurrenceHelper.ts`](file:///e:/Hoctap/manage-timetable/backend/src/config/recurrenceHelper.ts), [`scheduleController.ts`](file:///e:/Hoctap/manage-timetable/backend/src/controllers/scheduleController.ts), [`recurrenceHelper.test.ts`](file:///e:/Hoctap/manage-timetable/backend/tests/recurrenceHelper.test.ts).

#### Task B2: Chuẩn hóa Phân Vùng Dữ Liệu (Sửa Lỗi 05) — 🟢 **ĐÃ HOÀN THÀNH (24/07/2026)**

- **Giải pháp**:
  - Trong `getSchedules`: Mặc định chỉ trả về lịch do `req.user._id` tạo HOẶC lịch `isPublic: true`.
  - Admin vẫn có thể xem toàn bộ khi bật filter "Người tạo".
- **Trạng thái**: 🟢 **Đã hoàn thành (24/07/2026)**.
  - **Files chỉnh sửa**: [`Schedule.ts`](file:///e:/Hoctap/manage-timetable/backend/src/models/Schedule.ts), [`index.ts`](file:///e:/Hoctap/manage-timetable/backend/src/types/index.ts), [`scheduleController.ts`](file:///e:/Hoctap/manage-timetable/backend/src/controllers/scheduleController.ts).

#### Task B3: Thêm lịch trình trực tiếp từ Dashboard (Quick Add Event) — 🟢 **ĐÃ HOÀN THÀNH (24/07/2026)**

- **Mục tiêu**: Bổ sung luồng Core UX Flow cho phép người dùng tạo nhanh sự kiện trực tiếp ngay trên giao diện Dashboard mà không cần chuyển màn hình.
- **Giải pháp**:
  - **Quick Add Button trên Header**: Thêm nút `+ Tạo sự kiện` (Quick Add) trên Header của Dashboard để kích hoạt Modal tạo lịch.
  - **Interactive Calendar Pre-fill**: Tích hợp sự kiện click/select trực tiếp vào ô ngày trên Calendar Widget của Dashboard để mở Modal tạo lịch và pre-fill (điền sẵn) ngày tương ứng.
  - **API & Conflict Integration**: Gọi API `createSchedule` kết hợp chặt chẽ với cơ chế kiểm tra trùng lịch (Conflict Detection) và tự động refetch dữ liệu ngay khi tạo thành công.
- **Trạng thái**: 🟢 **Đã hoàn thành (24/07/2026)**.
  - **Files chỉnh sửa**: [`ScheduleCalendar.tsx`](file:///e:/Hoctap/manage-timetable/frontend/src/components/ScheduleCalendar.tsx), [`Dashboard.tsx`](file:///e:/Hoctap/manage-timetable/frontend/src/pages/Dashboard.tsx).

---

### PHASE C: CHUẨN HÓA UI/UX & ĐA NGÔN NGỮ (Sprint 3)

#### Task C1: Quốc tế hóa toàn bộ chuỗi hardcoded (Sửa Lỗi 06)

- **Giải pháp**:
  1. Thêm các key vào `vi.json` và `en.json` (ví dụ: `conflictWarningTitle`, `startTimeBeforeEndTime`).
  2. Thay thế toàn bộ chuỗi cứng trong `ScheduleCalendar.tsx`, `PomodoroModal.tsx`, `CommonLayout.tsx` bằng `t(...)`.

---

### PHASE D: NỢ KỸ THUẬT & TÍNH NĂNG NÂNG CAO (Sprint 4)

#### Task D1: Thiết lập Automated Testing (Sửa Lỗi 07)

- **Giải pháp**:
  1. Cài `Jest` + `Supertest` cho Backend — API Integration Tests cho Auth & Schedule CRUD.
  2. Cài `@testing-library/react` + `Vitest` cho Frontend.

#### Task D2: Hoàn thiện Web Push API cho PWA (Sửa Lỗi 08)

- **Giải pháp**: Tích hợp `web-push` ở backend, tạo endpoint `/api/notifications/subscribe` lưu PushSubscription và kích hoạt Service Worker notification.

#### Task D3: Refresh Token Rotation & Short-Lived Access Tokens (Sửa Lỗi 09)

- **Giải pháp**:
  - Đổi Access Token thành 15 phút.
  - Thêm Refresh Token cookie (7-30 ngày) và endpoint `/api/auth/refresh`.

---

## 4. Lộ Trình Nâng Cấp & Tính Năng Chưa Thực Hiện

### 4.1 Tính năng Phase 3 chưa hoàn thành

#### 🔔 Hệ thống Nhắc nhở nâng cao (Reminder Notifications)

| Loại | Kênh | Mô tả | Trạng thái |
|---|---|---|---|
| **Nhắc nhở trước sự kiện** | In-app + Browser Push | Tùy chọn: 5p / 15p / 30p / 1h / 1 ngày trước khi bắt đầu | ❌ Chưa triển khai |
| **Thông báo sự kiện sắp tới** | In-app | Tóm tắt sự kiện trong 24h tới khi mở app | ❌ Chưa triển khai |
| **WebSocket real-time** | Socket.IO | Thay thế polling 30s bằng real-time updates | ❌ Chưa triển khai |

#### 📥 Import & Sync dữ liệu

| Định dạng | Hướng | Thư viện | Trạng thái |
|---|---|---|---|
| **.ics Import** | ← Import | `ical.js` | ❌ Chưa triển khai |
| **Excel/CSV Export** | → Export | `xlsx`, `papaparse` | ❌ Chưa triển khai |
| **Google Calendar** | ↔ Sync 2 chiều | Google APIs client | ❌ Chưa triển khai |

#### 📊 Analytics Dashboard nâng cao

| Metric | Visualization | Trạng thái |
|---|---|---|
| Tỷ lệ hoàn thành sự kiện | Progress bar | ❌ Chưa triển khai |
| Thời gian trống khả dụng | Heatmap (ngày × giờ) | ❌ Chưa triển khai |
| Trend sử dụng qua các tuần | Line chart | ❌ Chưa triển khai |
| Streaks | Calendar heatmap | ❌ Chưa triển khai |

#### 🎨 Cá nhân hóa (Personalization) chưa triển khai

| Tính năng | Mô tả | Trạng thái |
|---|---|---|
| Theme colors tùy chỉnh | Chọn accent color cho toàn bộ UI | ❌ Chưa triển khai |
| Custom wallpaper | Background calendar theo sở thích | ❌ Chưa triển khai |
| Compact / Comfortable mode | Density toggle cho người dùng nhiều sự kiện | ❌ Chưa triển khai |
| Font size adjustment | Accessibility: tăng/giảm cỡ chữ | ❌ Chưa triển khai |
| First day of week | Chọn Thứ 2 hoặc Chủ nhật là ngày đầu tuần | ❌ Chưa triển khai |

---

### 4.2 Tính năng Backlog — Chưa lên kế hoạch cụ thể

#### 🤖 AI Schedule Assistant (Trợ lý lịch trình AI)

| Tính năng | Mô tả | Ví dụ |
|---|---|---|
| **Chat với lịch** | Hỏi đáp bằng ngôn ngữ tự nhiên | "Tôi rảnh khi nào tuần này?" |
| **Tạo sự kiện bằng NLP** | Parse câu text thành sự kiện | "Thêm họp nhóm thứ 4 tuần sau lúc 3 giờ chiều" |
| **Gợi ý tối ưu** | Phân tích lịch trống và đề xuất | "Bạn có 2h trống chiều thứ 5, xếp 'Ôn thi' vào?" |
| **Tóm tắt ngày/tuần** | Tổng hợp lịch trình tự động | "Hôm nay 3 sự kiện, bận nhất 9-12h" |

**Triển khai**: Tích hợp Gemini API hoặc OpenAI API + Function calling.

#### 🎯 Gợi ý lịch trình thông minh (Smart Scheduling)

```
Input:  Danh sách N sự kiện cần xếp + ràng buộc (khung giờ, thời lượng, mức ưu tiên)
Output: Lịch trình tối ưu — không trùng, giảm thiểu khoảng trống, ưu tiên sự kiện quan trọng
```

| Thuật toán | Ứng dụng | Độ phức tạp |
|---|---|---|
| **Greedy Interval Scheduling** | Xếp lịch cơ bản, maximize số sự kiện không overlap | O(n log n) |
| **Constraint Satisfaction (CSP)** | Xếp lịch với ràng buộc phức tạp | NP-hard, cần heuristic |
| **Genetic Algorithm** | Tối ưu hóa toàn cục khi quy mô lớn | Tunable |

#### 👥 Chia sẻ & Cộng tác (Sharing & Collaboration)

| Cấp độ | Mô tả | Use case |
|---|---|---|
| **Public link** | Chia sẻ lịch qua URL (chỉ xem) | Chia sẻ lịch học cho phụ huynh |
| **Mời user cụ thể** | Gán sự kiện cho nhiều người | Mời team vào cuộc họp |
| **Nhóm/Lớp** | Admin nhóm quản lý lịch chung | Lịch lớp học, lịch phòng ban |
| **Quyền truy cập** | Viewer / Editor / Admin | Kiểm soát ai được sửa |

**Data model bổ sung cần thiết**:

```typescript
// Group Model
interface IGroup {
  name: string;
  description: string;
  owner: ObjectId;
  members: {
    user: ObjectId;
    role: 'viewer' | 'editor' | 'admin';
  }[];
  sharedCalendars: ObjectId[];
}

// Share Link Model
interface IShareLink {
  schedule: ObjectId;
  token: string;
  permissions: 'view' | 'edit';
  expiresAt?: Date;
  createdBy: ObjectId;
}
```

#### 🔗 Tích hợp bên thứ ba (Third-party Integrations)

| Dịch vụ | Loại tích hợp | Mô tả |
|---|---|---|
| **Google Calendar** | Sync 2 chiều | Import/export sự kiện, real-time sync |
| **Zoom / Google Meet** | Auto-generate link | Tự động tạo meeting link khi tạo sự kiện online |
| **Notion / Trello** | Link task → event | Kết nối task management với lịch |
| **Slack / Discord** | Bot notification | Gửi nhắc nhở sự kiện qua bot |
| **Webhook** | Custom integration | Tự kết nối với các dịch vụ khác qua webhook URL |

#### 🗺️ Heatmap "Busy Score"

| Loại Heatmap | Mô tả |
|---|---|
| **GitHub-style yearly heatmap** | Mức độ bận rộn theo ngày trong năm (xanh nhạt → đỏ đậm) |
| **Weekly heatmap** | Ma trận 7 ngày × 24 giờ, tô màu theo mật độ sự kiện |
| **"Optimal time" indicator** | Gợi ý khung giờ tốt nhất để xếp sự kiện mới dựa trên pattern |

#### 🌍 Hỗ trợ đa múi giờ (Multi-Timezone)

| Tính năng | Mô tả |
|---|---|
| Chọn timezone cho từng sự kiện | "Họp team US lúc 9:00 AM EST" → hiển thị "20:00 ICT" |
| World clock widget | Sidebar hiển thị giờ hiện tại ở nhiều timezone |
| Auto-detect timezone | Tự nhận diện từ trình duyệt, cho phép override |
| Timezone-aware recurring | Sự kiện lặp xử lý đúng khi qua DST boundary |

#### 🎮 Gamification

| Tính năng | Mô tả |
|---|---|
| **Streaks** | "Bạn đã hoàn thành lịch 7 ngày liên tiếp! 🔥" |
| **Badges/Achievements** | "Tuần sao vàng": Hoàn thành 100% sự kiện trong tuần |
| **XP & Levels** | Tích điểm khi hoàn thành sự kiện đúng giờ |
| **Leaderboard** | Bảng xếp hạng trong nhóm/lớp (optional, privacy-aware) |
| **Weekly challenges** | "Thử thách tuần này: Không hủy sự kiện nào!" |

#### 📱 PWA Hoàn thiện

| Tính năng | Mô tả | Công nghệ |
|---|---|---|
| **Push Notifications** | Nhắc sự kiện khi đóng trình duyệt | Web Push API + VAPID |
| **Background Sync** | Sự kiện tạo offline → tự sync khi có mạng | Background Sync API |
| **App Shortcuts** | Long-press icon → Quick actions | Manifest shortcuts |

#### 🧱 Nâng cấp UX chưa triển khai

| Tính năng | Mô tả |
|---|---|
| Drag từ sidebar | Tạo sự kiện mới bằng cách kéo template vào calendar |
| Undo support (Ctrl+Z) | Hoàn tác thao tác cuối cùng |
| Toggle hiển thị danh mục | Sidebar checkbox bật/tắt hiển thị từng category trên lịch |
| Lọc sự kiện theo người tạo (Admin) | Dropdown user list chỉ cho Admin |

#### 🔒 Security Hardening

| Tính năng | Mô tả |
|---|---|
| **Refresh Token Rotation** | Token renewal, revoke old tokens |
| **XSS Sanitization** | `dompurify` / `xss` cho user input |

#### 🧪 Testing

| Loại test | Công cụ | Phạm vi |
|---|---|---|
| **Unit tests** | Jest + React Testing Library | Business logic, utils, hooks |
| **Integration tests** | Supertest + MongoDB Memory Server | API endpoints, middleware |
| **E2E tests** | Playwright hoặc Cypress | User flows: login → tạo sự kiện → xem lịch |

---

## 5. Backlog & Định Hướng Tương Lai

| Tính năng | Phân loại | Mô tả |
|---|---|---|
| **AI Schedule Assistant** | Phase 3 (Nice-to-Have) | Chat NLP + Gemini API, gợi ý xếp lịch tự động |
| **Third-Party Calendar Sync** | Phase 3 (Nice-to-Have) | Google Calendar 2-way sync, Zoom meeting link |
| **Chia Sẻ & Cộng Tác Group** | Phase 3 (Nice-to-Have) | Tạo nhóm, phân quyền Viewer/Editor trên lịch chung |
| **Gamification** | Phase 3 (Nice-to-Have) | Streaks, Badges, XP, Leaderboard |
| **Heatmap Busy Score** | Phase 3 (Nice-to-Have) | GitHub-style heatmap, weekly matrix |
| **Multi-Timezone** | Phase 3 (Nice-to-Have) | Timezone per event, world clock widget |
| **Smart Scheduling** | Phase 3 (Nice-to-Have) | Greedy/CSP/Genetic algorithm gợi ý lịch tối ưu |
| **Drag from Sidebar** | Phase 2 | Predefined templates kéo vào lịch |
| **Refresh Token Rotation** | Security | Token renewal, revoke old tokens |
| **XSS Sanitization** | Security | `dompurify` / `xss` cho user input |
| **Automated Testing** | DevOps | Jest, Supertest, Playwright |
| **PWA Web Push** | Phase 3 | VAPID Keys, `pushManager.subscribe` |

---

## 6. Ma Trận Ưu Tiên Tổng Hợp

```
                       CẤP BÁCH (Urgent)                 BÌNH THƯỜNG (Normal)
             ┌──────────────────────────────────┬──────────────────────────────────┐
  ẢNH HƯỞNG  │ 🔴 Task B3: Quick Add Dashboard  │ 🟡 Task B1: Conflict Engine Rec  │
   LỚN       │ 🔴 Task A1: Fix IDOR Auth Check  │ 🟡 Task B2: User Data Scope      │
 (High Imp.) │ 🔴 Task A2: Fix Regex Injection  │ 🟢 Task D3: Refresh Token Rot.   │
             │ 🔴 Task A3: Handle CastError     │                                  │
             ├──────────────────────────────────┼──────────────────────────────────┤
  ẢNH HƯỞNG  │                                  │ 🟡 Task C1: Complete i18n Keys   │
  TRUNG BÌNH │                                  │ 🟢 Task D1: Setup Jest/Supertest │
 (Med. Imp.) │                                  │ 🟢 Task D2: PWA Web Push API     │
             └──────────────────────────────────┴──────────────────────────────────┘
```

### Thứ tự thực hiện khuyến nghị

1. **Ưu tiên 1 (Cấp bách & UX Cốt lõi)**: Bổ sung luồng "Tạo lịch trực tiếp từ Dashboard" (Task B3).
2. **Ưu tiên 2 (Hotfix Bảo mật & Sập Server)**: Hoàn tất các task bảo mật Phase A (A1: IDOR, A2: Regex Injection, A3: CastError).
3. **Ưu tiên 3 (Logic & Conflict Engine)**: Đảm bảo kiểm tra trùng lịch (B1), phân vùng dữ liệu cá nhân (B2) hoạt động đồng bộ với việc tạo lịch từ Dashboard.
4. **Ưu tiên 4 (Cơ sở hạ tầng & Nợ kỹ thuật)**: Tiếp tục thực hiện các Phase C, D (i18n, Testing, PWA Push Notification, Refresh Token Rotation).

### Nguyên tắc phát triển

- **User-centric & Core UX First**: Đảm bảo luồng trải nghiệm tạo lịch từ Dashboard mượt mà, tiện lợi nhất cho người dùng.
- **Security-first**: Ưu tiên xử lý triệt để các lỗ hổng bảo mật critical song song với luồng UX cốt lõi.
- **Iterate fast**: Ship sửa lỗi sớm → thu thập feedback → cải thiện.
- **Test-driven**: Viết test cho business logic và API contracts trước khi code feature.

---

> 📌 **Document này là living document** — sẽ được cập nhật khi dự án tiến triển.  
> 📎 Xem phân tích hiện trạng sản phẩm đầy đủ tại [PRODUCT_ANALYSIS.md](./PRODUCT_ANALYSIS.md).
