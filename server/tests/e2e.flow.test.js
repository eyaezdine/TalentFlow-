const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');

/**
 * ====================================================
 * Phase 6: End-to-End User Flow Integration Test
 * server/tests/e2e.flow.test.js
 *
 * Verifies the complete recruitment lifecycle:
 * 1. Authentication (Recruiter Register & Login)
 * 2. Job Requisition Creation
 * 3. Candidate Ingestion with PII in CV text
 * 4. Feature 1: AI Executive Summary & Anonymization Audit
 * 5. Application Pipeline Linking (Stage: NEW)
 * 6. Feature 2: AI Candidate-Job Fit Analysis
 * 7. Stage Advancement: NEW -> SCREENING -> INTERVIEW
 * 8. Feature 3: AI Interview Question Generation (5 questions)
 * 9. Stage Advancement: INTERVIEW -> OFFER
 * 10. Dashboard Analytics & Counter Aggregation
 * ====================================================
 */

describe('TalentFlow End-to-End Recruitment Lifecycle Flow (Phase 6 E2E)', () => {
  let authToken = '';
  let recruiterId = '';
  let jobId = '';
  let candidateId = '';
  let applicationId = '';

  beforeAll(async () => {
    // Clean potential leftover artifacts with test emails
    await prisma.application.deleteMany();
    await prisma.candidate.deleteMany({
      where: { email: { contains: 'e2e' } },
    });
    await prisma.job.deleteMany({
      where: { title: { contains: 'E2E' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e' } },
    });
  });

  afterAll(async () => {
    // Teardown test artifacts
    await prisma.application.deleteMany();
    await prisma.candidate.deleteMany({
      where: { email: { contains: 'e2e' } },
    });
    await prisma.job.deleteMany({
      where: { title: { contains: 'E2E' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e' } },
    });
    await prisma.$disconnect();
  });

  // Step 1: Recruiter Registration & Auth
  it('Step 1: registers recruiter and authenticates session', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'E2E Lead Recruiter',
        email: 'recruiter.e2e@talentflow.local',
        password: 'securePassword123!',
        role: 'RECRUITER',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();
    expect(registerRes.body.user.role).toBe('RECRUITER');
    authToken = registerRes.body.token;
    recruiterId = registerRes.body.user.id;

    // Verify authenticated user profile
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('recruiter.e2e@talentflow.local');
  });

  // Step 2: Post Job Opening
  it('Step 2: creates a new job requisition', async () => {
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'E2E Staff Cloud Systems Architect',
        department: 'Infrastructure',
        description: 'Design robust distributed cloud architectures and zero-trust Kubernetes topologies.',
        requiredSkills: 'Kubernetes, Go, Terraform, AWS, Docker',
        status: 'OPEN',
      });

    expect(jobRes.status).toBe(201);
    expect(jobRes.body.data.id).toBeDefined();
    expect(jobRes.body.data.title).toBe('E2E Staff Cloud Systems Architect');
    jobId = jobRes.body.data.id;
  });

  // Step 3: Candidate Ingestion with PII
  it('Step 3: ingests a candidate profile containing raw contact PII in CV text', async () => {
    const candidateRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Alexander Hamilton',
        email: 'alexander.hamilton.e2e@treasury.gov',
        phone: '+1-212-555-0189',
        experienceYears: 8,
        skills: 'Kubernetes, Go, Terraform, AWS, Python, CI/CD',
        educationLevel: "Master's Degree",
        cvText: `Alexander Hamilton
Address: 57 Wall Street, New York, NY 10005
Email: alexander.hamilton.e2e@treasury.gov | Phone: +1-212-555-0189
Summary: Seasoned cloud architect with 8 years of experience designing secure infrastructure platforms.
Extensive experience running Go microservices on multi-region Kubernetes clusters with Terraform automation.`,
      });

    expect(candidateRes.status).toBe(201);
    expect(candidateRes.body.data.id).toBeDefined();
    expect(candidateRes.body.data.name).toBe('Alexander Hamilton');
    candidateId = candidateRes.body.data.id;
  });

  // Step 4: AI Feature 1 - Executive Summary & Anonymization Audit
  it('Step 4: triggers AI executive summary with mandatory Rule R1 PII anonymization', async () => {
    const summaryRes = await request(app)
      .post('/api/ai/summary')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ candidateId });

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.feature).toBe('candidate_summary');

    // Rule R1 Anonymization verification
    const audit = summaryRes.body.anonymizationAudit;
    expect(audit).toBeDefined();
    expect(audit.pseudonym).toMatch(/Candidate [A-Z]/);
    expect(audit.removedFields).toContain('name');
    expect(audit.removedFields).toContain('email');
    expect(audit.removedFields).toContain('phone');

    // Transmitted payload contains zero PII
    const sentData = summaryRes.body.anonymizedDataSent;
    expect(sentData.identifier).toMatch(/Candidate [A-Z]/);
    expect(sentData.skills).toContain('Kubernetes');
    expect(sentData.experienceYears).toBe(8);

    // Rule R2 Zod validated completion
    const aiData = summaryRes.body.data;
    expect(typeof aiData.summary).toBe('string');
    expect(aiData.summary.length).toBeGreaterThan(30);
    expect(Array.isArray(aiData.keywords)).toBe(true);
    expect(aiData.keywords.length).toBeGreaterThanOrEqual(3);
  });

  // Step 5: Link Candidate to Job via Application Pipeline
  it('Step 5: links candidate to job in application pipeline (Stage: NEW)', async () => {
    const appRes = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        candidateId,
        jobId,
        status: 'NEW',
        notes: 'Initial inbound application via referral.',
      });

    expect(appRes.status).toBe(201);
    expect(appRes.body.data.id).toBeDefined();
    expect(appRes.body.data.status).toBe('NEW');
    applicationId = appRes.body.data.id;
  });

  // Step 6: AI Feature 2 - Fit Analysis
  it('Step 6: executes AI candidate-job matching analysis', async () => {
    const matchRes = await request(app)
      .post('/api/ai/match')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ candidateId, jobId });

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.feature).toBe('candidate_job_matching');

    const matchData = matchRes.body.data;
    expect(typeof matchData.score).toBe('number');
    expect(matchData.score).toBeGreaterThanOrEqual(0);
    expect(matchData.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(matchData.strengths)).toBe(true);
    expect(matchData.strengths.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(matchData.gaps)).toBe(true);
    expect(typeof matchData.recommendation).toBe('string');
  });

  // Step 7: Advance Pipeline: NEW -> SCREENING -> INTERVIEW
  it('Step 7: transitions application stage from NEW to INTERVIEW', async () => {
    // Advance to SCREENING
    const screenRes = await request(app)
      .put(`/api/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'SCREENING' });
    expect(screenRes.status).toBe(200);
    expect(screenRes.body.data.status).toBe('SCREENING');

    // Advance to INTERVIEW
    const interviewRes = await request(app)
      .put(`/api/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'INTERVIEW' });
    expect(interviewRes.status).toBe(200);
    expect(interviewRes.body.data.status).toBe('INTERVIEW');
  });

  // Step 8: AI Feature 3 - Tailored Interview Questions
  it('Step 8: generates 5 calibrated interview questions tailored to application', async () => {
    const questionsRes = await request(app)
      .post('/api/ai/questions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ applicationId });

    expect(questionsRes.status).toBe(200);
    expect(questionsRes.body.feature).toBe('interview_questions');

    const qData = questionsRes.body.data;
    expect(Array.isArray(qData.questions)).toBe(true);
    expect(qData.questions).toHaveLength(5);

    qData.questions.forEach((item) => {
      expect(typeof item.question).toBe('string');
      expect(item.question.length).toBeGreaterThan(10);
      expect(typeof item.category).toBe('string');
      expect(typeof item.rationale).toBe('string');
    });
  });

  // Step 9: Advance Pipeline: INTERVIEW -> OFFER
  it('Step 9: extends formal job offer (Stage: OFFER)', async () => {
    const offerRes = await request(app)
      .put(`/api/applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'OFFER' });

    expect(offerRes.status).toBe(200);
    expect(offerRes.body.data.status).toBe('OFFER');

    // Update notes
    const notesRes = await request(app)
      .put(`/api/applications/${applicationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ notes: 'Strong technical interview performance. Offer extended.' });

    expect(notesRes.status).toBe(200);
    expect(notesRes.body.data.notes).toContain('Offer extended');
  });

  // Step 10: Verify Aggregated Dashboard Analytics
  it('Step 10: verifies dashboard KPIs and breakdown accurately reflect completed pipeline flow', async () => {
    const dashRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(dashRes.status).toBe(200);
    const stats = dashRes.body.data;

    expect(stats.counters.totalJobs).toBeGreaterThanOrEqual(1);
    expect(stats.counters.totalCandidates).toBeGreaterThanOrEqual(1);
    expect(stats.counters.totalApplications).toBeGreaterThanOrEqual(1);

    // Breakdown includes the OFFER application
    expect(stats.pipelineBreakdown.OFFER).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(stats.recentApplications)).toBe(true);
  });
});
