const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

/**
 * ====================================================
 * Phase 6: Edge Cases, Security & Fault Tolerance Tests
 * server/tests/edge-cases.test.js
 * ====================================================
 */

describe('TalentFlow Security & Edge Cases Suite (Phase 6 QA)', () => {
  let adminToken = '';
  let recruiterToken = '';
  let testJobId = '';
  let testCandidateId = '';

  beforeAll(async () => {
    // Register Admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'QA Admin',
        email: 'qa.admin@talentflow.local',
        password: 'password123',
        role: 'ADMIN',
      });
    adminToken = adminRes.body.token;

    // Register Recruiter
    const recruiterRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'QA Recruiter',
        email: 'qa.recruiter@talentflow.local',
        password: 'password123',
        role: 'RECRUITER',
      });
    recruiterToken = recruiterRes.body.token;

    // Seed test job and candidate
    const job = await prisma.job.create({
      data: {
        title: 'QA Edge Case Engineer',
        department: 'QA',
        description: 'Testing edge cases and resilience.',
        requiredSkills: 'Jest, Supertest, Vitest',
      },
    });
    testJobId = job.id;

    const cand = await prisma.candidate.create({
      data: {
        name: 'Jane Doe QA',
        email: 'jane.qa@talentflow.local',
        phone: '+1-555-9988',
        experienceYears: 4,
        skills: 'Jest, Automation',
        educationLevel: "Bachelor's Degree",
        cvText: 'Jane Doe QA CV text content',
      },
    });
    testCandidateId = cand.id;
  });

  afterAll(async () => {
    await prisma.application.deleteMany();
    await prisma.candidate.deleteMany({
      where: { email: { contains: 'qa' } },
    });
    await prisma.job.deleteMany({
      where: { title: { contains: 'QA' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'qa' } },
    });
    await prisma.$disconnect();
  });

  describe('Authentication & Authorization RBAC Edge Cases', () => {
    it('rejects access to protected routes when authorization header is missing (401)', async () => {
      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects access when token is corrupted or malformed (401)', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', 'Bearer invalid.token.payload');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('rejects recruiter from deleting job opening with 403 Forbidden (Admin only)', async () => {
      const res = await request(app)
        .delete(`/api/jobs/${testJobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('rejects recruiter from deleting candidate with 403 Forbidden (Admin only)', async () => {
      const res = await request(app)
        .delete(`/api/candidates/${testCandidateId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('Input Validation & 400 Bad Request Edge Cases', () => {
    it('rejects candidate registration with negative experience years', async () => {
      const res = await request(app)
        .post('/api/candidates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Exp',
          email: 'invalid.exp@talentflow.local',
          experienceYears: -5,
          skills: 'Testing',
          educationLevel: "Bachelor's Degree",
          cvText: 'CV text with negative experience',
        });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects job creation with title shorter than 3 characters', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'QA',
          department: 'QA',
          description: 'Valid long description for testing title validator',
          requiredSkills: 'Testing',
        });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate application linking the same candidate and job', async () => {
      // First application link succeeds
      const firstRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          status: 'NEW',
        });
      expect(firstRes.status).toBe(201);

      // Second application link for same pair should return 409 Conflict
      const dupRes = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          status: 'NEW',
        });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.code).toBe('APPLICATION_ALREADY_EXISTS');
    });
  });

  describe('Not Found 404 Handlers', () => {
    it('returns 404 when querying non-existent job ID', async () => {
      const res = await request(app)
        .get('/api/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('JOB_NOT_FOUND');
    });



    it('returns 404 when accessing an unmapped route', async () => {
      const res = await request(app)
        .get('/api/non-existent-endpoint')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});
