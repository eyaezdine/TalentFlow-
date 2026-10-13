const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('TalentFlow Auth API & Error Handling (Phase 1)', () => {
  const testUser = {
    name: 'Eya Ezdine',
    email: 'eya.test@talentflow.local',
    password: 'password123',
    role: 'ADMIN',
  };

  beforeAll(async () => {
    // Clean up test user if exists
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  afterAll(async () => {
    // Clean up created test user and disconnect Prisma
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
    await prisma.$disconnect();
  });

  describe('GET /api/health', () => {
    it('should return 200 and server health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('TalentFlow API');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.role).toBe(testUser.role);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject registration if email is already taken', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration with invalid email or short password (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'A',
          email: 'invalid-email',
          password: '123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in successfully with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should return 401 when password is incorrect', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 when user does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@talentflow.local',
          password: 'password123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    let token = '';

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });
      token = loginRes.body.token;
    });

    it('should return authenticated user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.user.role).toBe(testUser.role);
    });

    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Error Handling Middleware', () => {
    it('should return 404 for undefined routes', async () => {
      const res = await request(app).get('/api/undefined-endpoint');
      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
