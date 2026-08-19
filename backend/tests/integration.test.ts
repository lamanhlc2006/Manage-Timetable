import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { RefreshToken } from '../src/models/RefreshToken';
import { Schedule } from '../src/models/Schedule';
import { Notification } from '../src/models/Notification';

// Use a test-specific database
const TEST_DB_URI = process.env.MONGO_URI
  ? process.env.MONGO_URI.replace(/\/[^/]+$/, '/manage-timetable-test')
  : 'mongodb://127.0.0.1:27017/manage-timetable-test';

const app = createApp();

// Shared state across tests
let accessTokenCookie: string;
let userId: string;
let scheduleId: string;

beforeAll(async () => {
  await mongoose.connect(TEST_DB_URI);
  // Clean test collections
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await Schedule.deleteMany({});
  await Notification.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await Schedule.deleteMany({});
  await Notification.deleteMany({});
  await mongoose.connection.close();
});

// Helper to extract a named cookie value from Set-Cookie header
const extractCookie = (res: request.Response, name: string): string | undefined => {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return undefined;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  const match = arr.find((c: string) => c.startsWith(`${name}=`));
  if (!match) return undefined;
  return match.split(';')[0]; // e.g. "accessToken=eyJ..."
};

// ============================================================
// AUTH FLOW INTEGRATION TESTS
// ============================================================
describe('Auth API - /api/auth', () => {
  const testUser = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'Test@12345',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      // API returns flat: { _id, username, email, role, token }
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('username', testUser.username);
      expect(res.body).toHaveProperty('email', testUser.email);
      expect(res.body.role).toBe('user');
      // Should NOT expose password
      expect(res.body).not.toHaveProperty('password');
      // Cookies should be set
      const cookie = extractCookie(res, 'accessToken');
      expect(cookie).toBeDefined();

      userId = res.body._id;
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'missing@fields.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      // Clear tokens to avoid E11000 duplicate key when JWT iat matches register's token
      await RefreshToken.deleteMany({});

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      // API returns flat: { _id, username, email, role, token }
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('email', testUser.email);

      // Store cookie for subsequent authenticated requests
      const cookie = extractCookie(res, 'accessToken');
      expect(cookie).toBeDefined();
      accessTokenCookie = cookie!;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPass123' });

      expect(res.status).toBe(401);
    });

    it('should reject login for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noone@test.com', password: 'whatever' });

      // Controller returns 401 for both wrong email and wrong password
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [accessTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', testUser.email);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});

// ============================================================
// SCHEDULE CRUD INTEGRATION TESTS
// ============================================================
describe('Schedule API - /api/schedules', () => {
  const newSchedule = {
    title: 'Integration Test Event',
    description: 'Created during testing',
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString(),
    color: '#1890ff',
    priority: 'medium',
  };

  describe('POST /api/schedules', () => {
    it('should create a new schedule', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .set('Cookie', [accessTokenCookie])
        .send(newSchedule);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('title', newSchedule.title);
      expect(res.body).toHaveProperty('_id');
      scheduleId = res.body._id;
    });

    it('should reject creation without auth', async () => {
      const res = await request(app)
        .post('/api/schedules')
        .send(newSchedule);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/schedules', () => {
    it('should return list of schedules', async () => {
      const res = await request(app)
        .get('/api/schedules')
        .set('Cookie', [accessTokenCookie]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/schedules/search', () => {
    it('should search schedules by keyword', async () => {
      const res = await request(app)
        .get('/api/schedules/search')
        .query({ keyword: 'Integration' })
        .set('Cookie', [accessTokenCookie]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /api/schedules/:id', () => {
    it('should update an existing schedule', async () => {
      const res = await request(app)
        .put(`/api/schedules/${scheduleId}`)
        .set('Cookie', [accessTokenCookie])
        .send({ title: 'Updated Title', startTime: newSchedule.startTime, endTime: newSchedule.endTime });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Updated Title');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const res = await request(app)
        .put('/api/schedules/invalid-id')
        .set('Cookie', [accessTokenCookie])
        .send({ title: 'Test', startTime: newSchedule.startTime, endTime: newSchedule.endTime });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/schedules/:id', () => {
    it('should delete an existing schedule', async () => {
      const res = await request(app)
        .delete(`/api/schedules/${scheduleId}`)
        .set('Cookie', [accessTokenCookie]);

      expect(res.status).toBe(200);
    });

    it('should return 404 for already-deleted schedule', async () => {
      const res = await request(app)
        .delete(`/api/schedules/${scheduleId}`)
        .set('Cookie', [accessTokenCookie]);

      expect(res.status).toBe(404);
    });
  });
});

// ============================================================
// NOTIFICATION PAGINATION TEST
// ============================================================
describe('Notification API - /api/notifications', () => {
  describe('GET /api/notifications', () => {
    it('should return paginated response with metadata', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .query({ page: 1, limit: 5 })
        .set('Cookie', [accessTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 5);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should default to page=1 limit=20 when not specified', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Cookie', [accessTokenCookie]);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });
});
