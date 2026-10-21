const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const {
  candidateSummarySchema,
  jobMatchSchema,
  interviewQuestionsSchema,
  cvParsingSchema,
  interviewPolishSchema,
  jobOfferGenerationSchema,
} = require('../src/ai/schemas');

jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      text: 'Sarah Connor\nEmail: sarah.connor@cyberdyne.io\nPhone: +1-555-0199\nTechnical Skills: React, Node.js, PostgreSQL\nYears of Professional Experience: 6\nEducation Level: Master\'s Degree\nSenior software engineer with 6 years experience in web application architecture.',
    })
  );
});

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

  // ----------------------------------------------------
  // FEATURE: CV PDF EXTRACTION & AI PARSING
  // ----------------------------------------------------
  describe('POST /api/ai/parse-cv', () => {
    it('should return 400 when no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/ai/parse-cv')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('NO_FILE_UPLOADED');
    });

    it('should return 400 when uploaded file is not a PDF', async () => {
      const res = await request(app)
        .post('/api/ai/parse-cv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('cv', Buffer.from('plain text resume'), {
          filename: 'cv.txt',
          contentType: 'text/plain',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('INVALID_FILE_TYPE');
    });

    it('should extract and parse structured candidate profile from valid PDF', async () => {
      const samplePdf = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 120 >>\nstream\nBT /F1 12 Tf 100 700 Td (Sarah Connor - Software Engineer with 6 years experience in React, Node.js, PostgreSQL. Contact: sarah@example.com) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n380\n%%EOF'
      );

      const res = await request(app)
        .post('/api/ai/parse-cv')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('cv', samplePdf, {
          filename: 'sarah_connor_cv.pdf',
          contentType: 'application/pdf',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.feature).toBe('cv_parsing');
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('experienceYears');
      expect(res.body.data).toHaveProperty('skills');
      expect(res.body.data).toHaveProperty('cvText');

      // Rule R2 Zod Validation schema check
      const validation = cvParsingSchema.safeParse(res.body.data);
      expect(validation.success).toBe(true);
    });
  });

  describe('Feature 4: Live Interview Notes Polishing (/api/ai/polish-notes)', () => {
    it('should reject requests with missing or empty notes', async () => {
      const res = await request(app)
        .post('/api/ai/polish-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ candidateId: testCandidateId, jobId: testJobId, notes: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should transform raw shorthand notes into a standardized hiring scorecard', async () => {
      const rawNotes = `
        - Arrived on time, very articulate
        - Strong on React hooks and event loops
        - Struggled with DB indexing questions, took 5 mins to explain B-Tree
        - Positive cultural fit, great curiosity about deployment pipelines
      `;

      const res = await request(app)
        .post('/api/ai/polish-notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          notes: rawNotes,
          durationMinutes: 45,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.feature).toBe('interview_polish');
      expect(res.body.data).toHaveProperty('executiveSummary');
      expect(res.body.data).toHaveProperty('strengths');
      expect(res.body.data).toHaveProperty('areasForImprovement');
      expect(res.body.data).toHaveProperty('ratings');
      expect(res.body.data).toHaveProperty('recommendation');

      // Rule R2 Zod Validation check
      const validation = interviewPolishSchema.safeParse(res.body.data);
      expect(validation.success).toBe(true);
    });
  });

  // ----------------------------------------------------
  // FEATURE 5: JOB OFFER GENERATION
  // ----------------------------------------------------
  describe('POST /api/ai/job-offer/generate', () => {
    it('should generate a structured job offer from a recruiter prompt', async () => {
      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'I am looking for a Spring Boot engineer with 2 years of experience, mastering Java, REST APIs and MySQL.',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('description');
      expect(res.body).toHaveProperty('responsibilities');
      expect(res.body).toHaveProperty('requiredSkills');

      // Rule R2 Zod Schema verification
      const validation = jobOfferGenerationSchema.safeParse(res.body);
      expect(validation.success).toBe(true);
      expect(res.body.requiredSkills.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 400 when prompt is too short', async () => {
      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prompt: 'Too short' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('should return 400 when prompt is missing', async () => {
      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('should return 400 when prompt is an empty/blank string', async () => {
      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prompt: '    ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('should return 400 when prompt exceeds 1000 characters', async () => {
      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prompt: 'a'.repeat(1001) });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('should require an authenticated recruiter (existing auth middleware)', async () => {
      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .send({ prompt: 'Backend engineer with Java, Spring Boot and MySQL experience' });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should build the offer from the recruiter prompt instead of hardcoded content', async () => {
      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt:
            "Offre d'emploi pour un ingénieur Spring Boot avec 2 ans d'expérience, maîtrisant Java, les API REST et MySQL.",
        });

      expect(res.statusCode).toBe(200);

      const generatedSkills = res.body.requiredSkills.join(', ').toLowerCase();
      expect(generatedSkills).toContain('java');
      expect(generatedSkills).toContain('spring boot');
      expect(generatedSkills).toContain('mysql');
      expect(res.body.experience).toMatch(/2\s*(ans|years)/i);
      expect(res.body.title).toMatch(/java|spring boot/i);

      const validation = jobOfferGenerationSchema.safeParse(res.body);
      expect(validation.success).toBe(true);
    });

    it('should NOT persist the generated offer in the database', async () => {
      const jobsBefore = await prisma.job.count();

      const res = await request(app)
        .post('/api/ai/job-offer/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ prompt: 'Backend engineer with Java, Spring Boot and MySQL experience' });

      expect(res.statusCode).toBe(200);

      const jobsAfter = await prisma.job.count();
      expect(jobsAfter).toBe(jobsBefore);
    });
  });
});
