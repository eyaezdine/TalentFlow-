const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const { candidateSummarySchema, jobMatchSchema, interviewQuestionsSchema } = require('../src/ai/schemas');

describe('TalentFlow AI Module Integration Tests (Phase 5 - Rules R1, R2, R3, R4)', () => {
  let authToken = '';
  let testCandidateId = '';
  let testJobId = '';
  let testApplicationId = '';

  beforeAll(async () => {
    // 1. Authenticate user
    const authRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'AI Test Recruiter',
        email: 'recruiter.ai@talentflow.local',
        password: 'password123',
        role: 'RECRUITER',
      });
    authToken = authRes.body.token;

    // 2. Create test job
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Full-Stack Software Engineer',
        department: 'Engineering',
        location: 'Remote',
        description: 'Building modern web applications using React, Node.js, Express, and SQLite.',
        requiredSkills: 'React, Node.js, Express, SQLite, Git, Tailwind CSS',
        status: 'OPEN',
      });
    testJobId = jobRes.body.data.id;

    // 3. Create test candidate with explicit PII for anonymization test
    const candRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Thomas Anderson',
        email: 'neo.anderson@matrix.com',
        phone: '+216 20 999 888',
        experienceYears: 4,
        skills: 'React, Node.js, Express, JavaScript, SQL',
        educationLevel: "Bachelor's Degree in Software Engineering",
        cvText: `Thomas Anderson
Email: neo.anderson@matrix.com | Phone: +216 20 999 888
Address: 101 Matrix Street, Tunis

Professional Summary:
Thomas Anderson is a software engineer with 4 years hands-on experience developing web applications.
Specialized in building full-stack applications with React frontend and Express/Node.js backend.
Strong understanding of database management and REST architecture.`,
      });
    testCandidateId = candRes.body.data.id;

    // 4. Create application linking candidate & job
    const appRes = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        candidateId: testCandidateId,
        jobId: testJobId,
        status: 'SCREENING',
        notes: 'Promising candidate with solid full-stack skills.',
      });
    testApplicationId = appRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.application.deleteMany();
    await prisma.candidate.deleteMany({
      where: { email: { contains: 'matrix.com' } },
    });
    await prisma.job.deleteMany({
      where: { title: { contains: 'Full-Stack Software Engineer' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '@talentflow.local' } },
    });
    await prisma.$disconnect();
  });

  // ----------------------------------------------------
  // FEATURE 1: CANDIDATE SUMMARY
  // ----------------------------------------------------
  describe('POST /api/ai/summary', () => {
    it('should generate a validated 3-sentence summary with keywords and audit trail', async () => {
      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ candidateId: testCandidateId });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('anonymizationAudit');
      expect(res.body).toHaveProperty('anonymizedDataSent');

      // Rule R1 Anonymization check
      expect(res.body.anonymizedDataSent).not.toHaveProperty('name');
      expect(res.body.anonymizedDataSent).not.toHaveProperty('email');
      expect(res.body.anonymizedDataSent.anonymizedCvText).not.toContain('Thomas Anderson');
      expect(res.body.anonymizedDataSent.anonymizedCvText).not.toContain('neo.anderson@matrix.com');

      // Rule R2 Zod Validation schema check
      const validation = candidateSummarySchema.safeParse(res.body.data);
      expect(validation.success).toBe(true);
      expect(res.body.data.keywords.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 404 when candidateId does not exist', async () => {
      const res = await request(app)
        .post('/api/ai/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ candidateId: 'non-existent-uuid' });

      expect(res.statusCode).toBe(404);
      expect(res.body.code).toBe('CANDIDATE_NOT_FOUND');
    });
  });

  // ----------------------------------------------------
  // FEATURE 2: CANDIDATE <-> JOB MATCHING
  // ----------------------------------------------------
  describe('POST /api/ai/match', () => {
    it('should calculate matching score, strengths, gaps, and recommendation', async () => {
      const res = await request(app)
        .post('/api/ai/match')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.candidateName).toBe('Thomas Anderson');
      expect(res.body.jobTitle).toBe('Full-Stack Software Engineer');

      // Rule R2 Zod schema verification
      const validation = jobMatchSchema.safeParse(res.body.data);
      expect(validation.success).toBe(true);
      expect(res.body.data.score).toBeGreaterThanOrEqual(0);
      expect(res.body.data.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(res.body.data.strengths)).toBe(true);
      expect(Array.isArray(res.body.data.gaps)).toBe(true);
    });
  });

  // ----------------------------------------------------
  // FEATURE 3: 5 TAILORED INTERVIEW QUESTIONS
  // ----------------------------------------------------
  describe('POST /api/ai/questions', () => {
    it('should generate exactly 5 tailored interview questions with categories and rationales', async () => {
      const res = await request(app)
        .post('/api/ai/questions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId: testApplicationId });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.questions).toHaveLength(5);

      // Rule R2 Zod Schema verification
      const validation = interviewQuestionsSchema.safeParse(res.body.data);
      expect(validation.success).toBe(true);

      res.body.data.questions.forEach((q) => {
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('category');
        expect(q).toHaveProperty('rationale');
      });
    });
  });
});
