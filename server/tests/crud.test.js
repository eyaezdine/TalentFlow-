const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

describe('TalentFlow CRUD API & Pipeline (Phase 2)', () => {
  let adminToken = '';
  let recruiterToken = '';
  let createdJobId = '';
  let createdCandidateId = '';
  let createdApplicationId = '';

  beforeAll(async () => {
    // Create Admin user for tests
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin Eya',
        email: 'admin.crud@talentflow.local',
        password: 'password123',
        role: 'ADMIN',
      });
    adminToken = adminRes.body.token;

    // Create Recruiter user for tests
    const recruiterRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Recruiter User',
        email: 'recruiter.crud@talentflow.local',
        password: 'password123',
        role: 'RECRUITER',
      });
    recruiterToken = recruiterRes.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.application.deleteMany();
    await prisma.candidate.deleteMany({
      where: { email: { contains: '@talentflow.local' } },
    });
    await prisma.job.deleteMany({
      where: { title: { contains: 'Test' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '@talentflow.local' } },
    });
    await prisma.$disconnect();
  });

  // ----------------------------------------------------
  // 1. JOBS CRUD TESTS
  // ----------------------------------------------------
  describe('Jobs API (/api/jobs)', () => {
    it('should create a new job offer', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Senior Test Full-Stack Engineer',
          department: 'Engineering',
          location: 'Remote',
          description: 'Leading web application engineering with React and Node.js.',
          requiredSkills: 'React, Node.js, Express, TypeScript, SQL',
          status: 'OPEN',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('Senior Test Full-Stack Engineer');
      createdJobId = res.body.data.id;
    });

    it('should list jobs with pagination and metadata', async () => {
      const res = await request(app)
        .get('/api/jobs?page=1&limit=5')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter jobs by keyword search', async () => {
      const res = await request(app)
        .get('/api/jobs?search=Full-Stack')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title).toContain('Full-Stack');
    });

    it('should retrieve a single job offer by ID', async () => {
      const res = await request(app)
        .get(`/api/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdJobId);
    });

    it('should update an existing job offer', async () => {
      const res = await request(app)
        .put(`/api/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          location: 'Hybrid - Tunis',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.location).toBe('Hybrid - Tunis');
    });
  });

  // ----------------------------------------------------
  // 2. CANDIDATES CRUD TESTS
  // ----------------------------------------------------
  describe('Candidates API (/api/candidates)', () => {
    it('should create a candidate profile', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          name: 'Sarah Connor',
          email: 'sarah.test@talentflow.local',
          phone: '+216 98 000 111',
          experienceYears: 5,
          skills: 'JavaScript, React, Node.js, SQLite, CSS',
          educationLevel: "Master's Degree in Computer Science",
          cvText: 'Experienced software engineer with 5 years building scalable web applications.',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('Sarah Connor');
      createdCandidateId = res.body.data.id;
    });

    it('should reject candidate creation if email is duplicate', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          name: 'Sarah Connor Duplicate',
          email: 'sarah.test@talentflow.local',
          experienceYears: 3,
          skills: 'React',
          educationLevel: "Bachelor's",
          cvText: 'Another CV text with sufficient length for validation testing.',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should list candidates with pagination and search', async () => {
      const res = await request(app)
        .get('/api/candidates?search=Sarah')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].email).toBe('sarah.test@talentflow.local');
    });

    it('should retrieve a single candidate by ID', async () => {
      const res = await request(app)
        .get(`/api/candidates/${createdCandidateId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(createdCandidateId);
    });
  });

  // ----------------------------------------------------
  // 3. APPLICATIONS PIPELINE TESTS
  // ----------------------------------------------------
  describe('Applications Pipeline API (/api/applications)', () => {
    it('should submit an application linking candidate and job offer', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: createdCandidateId,
          jobId: createdJobId,
          status: 'NEW',
          notes: 'Promising candidate CV received.',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.status).toBe('NEW');
      createdApplicationId = res.body.data.id;
    });

    it('should reject duplicate application for the same job and candidate', async () => {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: createdCandidateId,
          jobId: createdJobId,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('APPLICATION_ALREADY_EXISTS');
    });

    it('should transition application status along the recruitment pipeline', async () => {
      const res = await request(app)
        .put(`/api/applications/${createdApplicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          status: 'INTERVIEW',
          notes: 'Screening passed. Scheduled technical interview.',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('INTERVIEW');
      expect(res.body.data.notes).toContain('Scheduled technical interview');
    });

    it('should list applications filtered by status', async () => {
      const res = await request(app)
        .get('/api/applications?status=INTERVIEW')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].status).toBe('INTERVIEW');
    });
  });

  // ----------------------------------------------------
  // 4. DASHBOARD ANALYTICS TESTS
  // ----------------------------------------------------
  describe('Dashboard Analytics API (/api/dashboard)', () => {
    it('should return aggregated recruitment metrics and pipeline breakdown', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('counters');
      expect(res.body.data.counters.totalJobs).toBeGreaterThanOrEqual(1);
      expect(res.body.data.counters.totalCandidates).toBeGreaterThanOrEqual(1);
      expect(res.body.data.counters.totalApplications).toBeGreaterThanOrEqual(1);
      expect(res.body.data).toHaveProperty('pipelineBreakdown');
      expect(res.body.data.pipelineBreakdown.INTERVIEW).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------------------
  // 5. RBAC PERMISSIONS ON DELETE
  // ----------------------------------------------------
  describe('RBAC Authorization Guards', () => {
    it('should forbid RECRUITER from deleting a job offer (Admin only)', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should allow ADMIN to delete a job offer', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(createdJobId);
    });
  });
});
