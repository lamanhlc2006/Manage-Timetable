# 🔍 Phân Tích Lỗi & Vấn Đề Dự Án Manage-Timetable

> **Ngày phân tích**: 18/08/2026  
> **Phạm vi**: Toàn bộ 71 file source code (36 backend + 35 frontend), 4 file test  
> **Tổng số vấn đề**: 25  

---

## Mục lục

- [Nhóm 1: 🔴 Bảo Mật Nghiêm Trọng (8 vấn đề)](#nhóm-1--bảo-mật-nghiêm-trọng)
- [Nhóm 2: 🟠 Lỗi Logic (7 vấn đề)](#nhóm-2--lỗi-logic)
- [Nhóm 3: 🟡 Code Quality & Kiến Trúc (6 vấn đề)](#nhóm-3--code-quality--kiến-trúc)
- [Nhóm 4: 🟢 Cải Thiện Nhỏ (4 vấn đề)](#nhóm-4--cải-thiện-nhỏ)
- [Bảng tổng hợp](#bảng-tổng-hợp)

---

## Nhóm 1: 🔴 Bảo Mật Nghiêm Trọng

### ✅ #1 — File `.env` chứa secrets bị commit vào Git

- **File**: `backend/.env`
- **Mô tả**: File `.env` chứa JWT secret keys hardcoded đang nằm trong repo. Dù `.gitignore` liệt kê `.env`, file này đã tồn tại sẵn trong repo với nội dung:
  ```
  JWT_SECRET=my_super_secret_jwt_key_123456
  JWT_REFRESH_SECRET=my_super_secret_refresh_key_654321
  ```
- **Rủi ro**: Bất kỳ ai clone repo đều có thể giả mạo JWT tokens.
- **Đã sửa**:
  1. ✅ Xác nhận `.env` KHÔNG bị Git track (`.gitignore` đang hoạt động đúng)
  2. ✅ Tạo file `backend/.env.example` với placeholder values
  3. ⚠️ Rotate secrets: cần thực hiện thủ công khi deploy production
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #2 — JWT fallback secret hardcoded trong production code

- **File**: `backend/src/controllers/authController.ts` (dòng 8-9), `backend/src/middlewares/authMiddleware.ts` (dòng 29), `backend/src/config/socket.ts` (dòng 40)
- **Mô tả**: Nếu biến môi trường `JWT_SECRET` bị thiếu, hệ thống tự dùng `'fallback_secret'` — ai cũng đoán được.
- **Đã sửa**:
  1. ✅ `authController.ts` — `getJwtSecret()` và `getJwtRefreshSecret()` throw Error nếu thiếu env var
  2. ✅ `authMiddleware.ts` — Trả 500 nếu `JWT_SECRET` chưa set
  3. ✅ `socket.ts` — Reject socket connection nếu `JWT_SECRET` chưa set
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #3 — VAPID keys & Google OAuth credentials cũng có fallback hardcoded

- **File**: `backend/src/config/webPushConfig.ts`, `backend/src/services/googleCalendarService.ts`
- **Mô tả**: Tương tự #2, các service khác cũng dùng fallback secrets.
- **Đã sửa**:
  1. ✅ `webPushConfig.ts` — Nếu thiếu VAPID keys → warn & disable push (graceful degradation)
  2. ✅ `googleCalendarService.ts` — Throw error rõ ràng nếu thiếu Google OAuth credentials
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #4 — Access Token & Refresh Token lưu trong localStorage (XSS vector)

- **File**: `frontend/src/services/api.ts`, `backend/src/controllers/authController.ts`
- **Mô tả**: Response từ login/register trả cả `refreshToken` trong body JSON → XSS có thể đánh cắp.
- **Đã sửa**:
  1. ✅ Backend: Loại bỏ `refreshToken` khỏi response body của register, login, refresh (chỉ gửi qua httpOnly cookie)
  2. ✅ Frontend: Refresh flow dùng cookie (`withCredentials: true`) thay vì đọc `refreshToken` từ localStorage
  3. ℹ️ Giữ `token` (access token, 15 phút) trong response body cho Socket.IO client sử dụng
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #5 — Registration cho phép tự gán role `admin`

- **File**: `backend/src/controllers/authController.ts` (dòng 87)
- **Mô tả**: Code cũ: `role: role || 'user'` → Client gửi `{ role: 'admin' }` là tự nâng quyền.
- **Đã sửa**:
  1. ✅ Xóa `role` khỏi destructured `req.body`
  2. ✅ Hardcode `role: 'user'` khi `User.create()` — không bao giờ tin client
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #6 — Seed data chạy trên MỌI môi trường + hardcoded credentials

- **File**: `backend/src/config/seed.ts`, `backend/src/config/db.ts`, `backend/src/controllers/userController.ts`
- **Đã sửa**:
  1. ✅ `db.ts` — Seed chỉ chạy khi `NODE_ENV !== 'production'`
  2. ✅ `userController.ts` — Reset password dùng `crypto.randomBytes()` random thay vì `user123`
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #7 — Google OAuth tokens lưu plaintext trong MongoDB

- **File**: `backend/src/models/User.ts`, `backend/src/services/googleCalendarService.ts`
- **Đã sửa**:
  1. ✅ Tạo `utils/crypto.ts` — AES-256-GCM encrypt/decrypt utility
  2. ✅ `googleCalendarService.ts` — Encrypt tokens trước khi lưu, decrypt khi đọc
  3. ✅ Xử lý legacy plaintext gracefully (auto-detect encrypted vs plaintext)
  4. ✅ Thêm `TOKEN_ENCRYPTION_KEY` vào `.env.example`
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #8 — CORS wildcard `*` cho phép với credentials trong Socket.IO

- **File**: `backend/src/config/socket.ts`
- **Đã sửa**:
  1. ✅ Filter `'*'` khỏi `allowedOrigins` trước khi dùng — wildcard không tương thích `credentials: true`
  2. ✅ Kiểm tra `index.ts` CORS — không có wildcard (OK)
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

## Nhóm 2: 🟠 Lỗi Logic

### ✅ #9 — Inconsistent data fetch sau mutation (fetchSchedules vs searchSchedules)

- **File**: `frontend/src/pages/Dashboard.tsx`
- **Đã sửa**:
  1. ✅ Thay tất cả `fetchSchedules(filters)` → `searchSchedules(filters)` trong handleUpdate, handleDelete, handlePatchTime
  2. ✅ Xóa import `fetchSchedules` không còn sử dụng
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #10 — Schedule CRUD chỉ Admin mới dùng được (Route ↔ Controller mâu thuẫn)

- **File**: `backend/src/routes/scheduleRoutes.ts`
- **Đã sửa**:
  1. ✅ Bỏ `isAdmin` middleware khỏi POST/PUT/PATCH/DELETE routes
  2. ✅ Controller giữ logic `isOwner || isAdmin` — user quản lý event của mình, admin quản lý tất cả
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #11 — Offline sync tạo ID giả → lỗi khi đồng bộ online

- **File**: `frontend/src/services/offlineSync.ts`
- **Đã sửa**:
  1. ✅ Skip update/delete sync cho events có ID bắt đầu bằng `'offline-'` (chưa tồn tại trên server)
  2. ✅ Chỉ sync create actions cho offline events, update/delete chỉ cho events có MongoDB ID
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #12 — Trùng cookie name `token` & `accessToken`

- **File**: `backend/src/controllers/authController.ts`, `backend/src/middlewares/authMiddleware.ts`
- **Đã sửa**:
  1. ✅ Xóa cookie `token` trùng lặp — chỉ giữ `accessToken`
  2. ✅ Middleware chỉ đọc `req.cookies.accessToken` thay vì check cả 2
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #13 — Timezone mismatch trong Recurrence Engine (UTC vs Local)

- **File**: `backend/src/config/recurrenceHelper.ts`
- **Đã sửa**:
  1. ✅ Thay `.getDay()` → `.getUTCDay()` tại 3 vị trí (dayOfWeekVal, tempDayOfWeekVal, daysOfWeek check)
  2. ✅ Nhất quán UTC với exception dates (`.toISOString()`)
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #14 — Mongoose validator bypass khi dùng `findByIdAndUpdate`

- **File**: `backend/src/models/Schedule.ts`
- **Đã sửa**:
  1. ✅ Xóa field-level validator (dùng `this` — broken với findByIdAndUpdate)
  2. ✅ Thêm `pre('validate')` hook hoạt động đúng cả save() và update
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #15 — Cron job thiếu concurrency control → Duplicate notifications

- **File**: `backend/src/services/reminderCron.ts`
- **Đã sửa**:
  1. ✅ Thêm `isRunning` mutex lock ngăn chạy chồng
  2. ✅ `finally` block luôn reset lock kể cả khi error
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

## Nhóm 3: 🟡 Code Quality & Kiến Trúc

### ✅ #16 — God Component: ScheduleCalendar.tsx (~1,762 dòng)

- **File**: `frontend/src/components/ScheduleCalendar.tsx`
- **Đã sửa**: Tách 1762 dòng → 8 files (~520 dòng orchestrator + 7 sub-components):
  1. ✅ `CalendarFilterPopover.tsx` — Popover bộ lọc tìm kiếm
  2. ✅ `CategoryManagementModal.tsx` — CRUD quản lý danh mục
  3. ✅ `EventDetailModal.tsx` — Modal xem chi tiết sự kiện
  4. ✅ `EventFormModal.tsx` — Modal tạo/sửa sự kiện
  5. ✅ `QuickAddModal.tsx` — Modal tạo nhanh
  6. ✅ `RecurrenceChoiceModal.tsx` — Dialog chọn scope recurring
  7. ✅ `ShortcutsHelpModal.tsx` — Modal phím tắt
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #17 — God Component: CommonLayout.tsx (~902 dòng)

- **File**: `frontend/src/components/CommonLayout.tsx`
- **Đã sửa**: Tách 902 dòng → 5 files (~275 dòng orchestrator + 4 sub-components):
  1. ✅ `AppHeader.tsx` — Header bar (mobile/desktop) + user menu
  2. ✅ `AppSidebar.tsx` — Sidebar + collapse toggle + menu
  3. ✅ `MobileBottomNav.tsx` — Bottom tab bar cho mobile
  4. ✅ `NotificationPopover.tsx` — Popover thông báo + actions
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #18 — Import statements rải rác trong index.ts

- **File**: `backend/src/index.ts`
- **Đã sửa**: Gom toàn bộ imports (mongoose, http, globalErrorHandler, initSocket, reminderCron) lên đầu file.
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #19 — `@types/*` packages nằm sai chỗ trong dependencies

- **File**: `backend/package.json`, `frontend/package.json`
- **Đã sửa**: Di chuyển `@types/node-cron`, `@types/web-push`, `@types/papaparse` sang `devDependencies`.
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #20 — Duplicate interfaces & Error handler logic

- **File**: `backend/src/controllers/focusSessionController.ts`
- **Đã sửa**: Xóa duplicate `AuthRequest` interface, import từ `authMiddleware.ts`. Error handler files giữ nguyên (khác scope: global middleware vs controller-level utility).
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #21 — Google Sync blocking sequential operations

- **File**: `backend/src/services/googleCalendarService.ts`
- **Đã sửa**: Thay `for...of` sequential bằng `processBatch()` helper với `Promise.all()` batch size 5. Cả push và pull đều batched.
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

## Nhóm 4: 🟢 Cải Thiện Nhỏ

### ✅ #22 — `html2canvas` dependency không được sử dụng

- **File**: `frontend/package.json`
- **Đã sửa**: Xóa `html2canvas` khỏi dependencies.
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #23 — Notification API thiếu phân trang (Pagination)

- **File**: `backend/src/controllers/notificationController.ts`
- **Đã sửa**: Thêm `page` & `limit` query params (default page=1, limit=20, max=100). Response trả `{ data, pagination: { page, limit, total, totalPages } }`. Frontend `notificationService.ts` updated tương thích.
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #24 — Không có Integration/E2E tests cho API endpoints

- **File**: `backend/tests/integration.test.ts` (NEW), `backend/src/app.ts` (NEW)
- **Đã sửa**: Tách `createApp()` factory từ `index.ts` → `app.ts` cho testability. Viết 19 integration tests covering:
  - Auth flow: register, login, /me, auth rejection
  - Schedule CRUD: create, read, search, update, delete, invalid ID
  - Notification: pagination response, default params, auth rejection
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

### ✅ #25 — Duplicate `MONGO_URI` env variable

- **File**: `backend/.env`
- **Đã sửa**: Xóa `MONGODB_URI` duplicate, giữ `MONGO_URI` duy nhất.
- **Trạng thái**: `[x]` Đã sửa (18/08/2026)

---

## Bảng tổng hợp

| # | Vấn đề | Mức độ | Loại | Effort | Trạng thái |
|---|--------|--------|------|--------|------------|
| 1 | `.env` secrets trong Git | 🔴 Critical | Security | 15 phút | `[x]` |
| 2 | JWT fallback secret | 🔴 Critical | Security | 10 phút | `[x]` |
| 3 | VAPID/OAuth fallback secrets | 🔴 Critical | Security | 15 phút | `[x]` |
| 4 | Token lưu localStorage | 🔴 Critical | Security | 1-2 giờ | `[x]` |
| 5 | Register tự gán role admin | 🔴 Critical | Security | 5 phút | `[x]` |
| 6 | Seed credentials mọi env | 🔴 Critical | Security | 15 phút | `[x]` |
| 7 | Google tokens plaintext | 🔴 Critical | Security | 1-2 giờ | `[x]` |
| 8 | CORS wildcard + credentials | 🔴 Critical | Security | 5 phút | `[x]` |
| 9 | fetch vs search inconsistency | 🟠 High | Logic Bug | 15 phút | `[x]` |
| 10 | CRUD chỉ Admin (mâu thuẫn) | 🟠 High | Logic | 30 phút | `[x]` |
| 11 | Offline sync invalid IDs | 🟠 High | Logic Bug | 1 giờ | `[x]` |
| 12 | Duplicate cookie names | 🟠 High | Logic | 10 phút | `[x]` |
| 13 | Timezone mismatch UTC/Local | 🟠 High | Logic Bug | 30 phút | `[x]` |
| 14 | Mongoose validator bypass | 🟠 Medium | Logic | 15 phút | `[x]` |
| 15 | Cron duplicate notifications | 🟠 Medium | Logic | 10 phút | `[x]` |
| 16 | ScheduleCalendar 1762 dòng | 🟡 Medium | Architecture | 3-4 giờ | `[x]` |
| 17 | CommonLayout 902 dòng | 🟡 Medium | Architecture | 2-3 giờ | `[x]` |
| 18 | Import rải rác index.ts | 🟡 Low | Code Quality | 10 phút | `[x]` |
| 19 | @types in wrong deps | 🟡 Low | Code Quality | 10 phút | `[x]` |
| 20 | Duplicate interfaces/errors | 🟡 Low | Code Quality | 30 phút | `[x]` |
| 21 | Google Sync sequential | 🟡 Low | Performance | 30 phút | `[x]` |
| 22 | html2canvas unused | 🟢 Trivial | Cleanup | 2 phút | `[x]` |
| 23 | Notification pagination | 🟢 Low | Feature | 30 phút | `[x]` |
| 24 | Thiếu Integration tests | 🟢 Low | Testing | 3-4 giờ | `[x]` |
| 25 | Duplicate MONGO_URI | 🟢 Trivial | Cleanup | 2 phút | `[x]` |

---

> **Ghi chú**: Đánh dấu `[x]` khi đã sửa xong từng vấn đề. Ưu tiên sửa từ 🔴 → 🟠 → 🟡 → 🟢.
