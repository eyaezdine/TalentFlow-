const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const { INTERVIEW_MODES, INTERVIEW_STATUSES } = require('../src/constants/interviewConstants');
const InterviewError = require('../src/errors/InterviewError');
const interviewService = require('../src/services/interviewService');

describe('TalentFlow Interview Management Module ("Entretiens")', () => {
  let recruiterToken = '';
  let testJobId = '';
  let closedJobId = '';
  let testCandidateId = '';
  let secondCandidateId = '';

  beforeAll(async () => {
    // 1. Authenticate recruiter user
    const recruiterRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Interview Recruiter',
        email: 'recruiter.interview@talentflow.local',
        password: 'password123',
        role: 'RECRUITER',
      });
    recruiterToken = recruiterRes.body.token;

    // 2. Create open test job
    const job = await prisma.job.create({
      data: {
        title: 'Software Engineer - Test Interview',
        department: 'Engineering',
        location: 'Remote',
        description: 'Test job for interview scheduling',
        requiredSkills: 'JavaScript, Node.js',
        status: 'OPEN',
      },
    });
    testJobId = job.id;

    // 3. Create closed test job
    const closedJob = await prisma.job.create({
      data: {
        title: 'Archived Tech Lead - Test Interview',
        department: 'Engineering',
        location: 'On-site',
        description: 'Closed job for testing scheduling constraints',
        requiredSkills: 'Java, Architecture',
        status: 'CLOSED',
      },
    });
    closedJobId = closedJob.id;

    // 4. Create primary test candidate
    const candidate = await prisma.candidate.create({
      data: {
        name: 'Alexandre Dumas',
        email: 'alexandre.interview@talentflow.local',
        phone: '+33 6 12 34 56 78',
        experienceYears: 4,
        skills: 'JavaScript, Express, SQL',
        educationLevel: "Master's Degree",
        cvText: 'Experienced developer candidate CV text',
      },
    });
    testCandidateId = candidate.id;

    // 5. Create second test candidate
    const secondCandidate = await prisma.candidate.create({
      data: {
        name: 'Marie Curie',
        email: 'marie.interview@talentflow.local',
        phone: '+33 6 98 76 54 32',
        experienceYears: 6,
        skills: 'React, Node.js',
        educationLevel: 'PhD',
        cvText: 'Researcher and software engineer CV text',
      },
    });
    secondCandidateId = secondCandidate.id;
  });

  afterAll(async () => {
    await prisma.interview.deleteMany();
    await prisma.application.deleteMany();
    await prisma.candidate.deleteMany({
      where: { email: { contains: 'interview@talentflow.local' } },
    });
    await prisma.job.deleteMany({
      where: { title: { contains: 'Test Interview' } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'interview@talentflow.local' } },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // RULE 1 & 2: Mode validation ('in-person' | 'video') & Initial status ('planned')
  // =========================================================================
  describe('Rule 1 & 2: Interview Scheduling, Mode, and Initial Status', () => {
    it('successfully schedules an in-person interview with initial status "planned"', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString(); // 2 days in future
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          date: futureDate,
          mode: INTERVIEW_MODES.IN_PERSON,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.mode).toBe(INTERVIEW_MODES.IN_PERSON);
      expect(res.body.data.status).toBe(INTERVIEW_STATUSES.PLANNED);
      expect(res.body.data.candidateId).toBe(testCandidateId);
      expect(res.body.data.jobId).toBe(testJobId);
    });

    it('successfully schedules a video interview for a different candidate', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: secondCandidateId,
          jobId: testJobId,
          date: futureDate,
          mode: INTERVIEW_MODES.VIDEO,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.mode).toBe(INTERVIEW_MODES.VIDEO);
      expect(res.body.data.status).toBe(INTERVIEW_STATUSES.PLANNED);
    });

    it('rejects scheduling an interview with an invalid mode (not in-person or video)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 4).toISOString();
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: secondCandidateId,
          jobId: testJobId,
          date: futureDate,
          mode: 'phone_call', // Invalid mode
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // RULE 3: Past Date constraint
  // =========================================================================
  describe('Rule 3: Past Date Prohibition', () => {
    it('rejects scheduling an interview with a past date (400)', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day in the past
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: secondCandidateId,
          jobId: testJobId,
          date: pastDate,
          mode: INTERVIEW_MODES.VIDEO,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INTERVIEW_PAST_DATE');
    });
  });

  // =========================================================================
  // RULE 4: No two planned interviews for same candidate on same job
  // =========================================================================
  describe('Rule 4: Uniqueness of Planned Interview per Candidate & Job', () => {
    it('rejects creating a second planned interview for the same candidate and job (409 Conflict)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          date: futureDate,
          mode: INTERVIEW_MODES.VIDEO,
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INTERVIEW_DUPLICATE_PLANNED');
    });
  });

  // =========================================================================
  // RULE 5: Closed job offer constraint
  // =========================================================================
  describe('Rule 5: Closed Job Offer Scheduling Prohibition', () => {
    it('rejects scheduling an interview on a closed job offer (400)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: secondCandidateId,
          jobId: closedJobId,
          date: futureDate,
          mode: INTERVIEW_MODES.VIDEO,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('JOB_CLOSED');
    });
  });

  // =========================================================================
  // RULE 6: Candidate and Job Offer existence
  // =========================================================================
  describe('Rule 6: Candidate and Job Offer Existence Verification', () => {
    it('rejects scheduling when candidate does not exist (404)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: '00000000-0000-0000-0000-000000000000',
          jobId: testJobId,
          date: futureDate,
          mode: INTERVIEW_MODES.VIDEO,
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('CANDIDATE_NOT_FOUND');
    });

    it('rejects scheduling when job offer does not exist (404)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: '00000000-0000-0000-0000-000000000000',
          date: futureDate,
          mode: INTERVIEW_MODES.VIDEO,
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('JOB_NOT_FOUND');
    });
  });

  // =========================================================================
  // RULE 7: Status transition - Only planned interview can be completed or cancelled
  // =========================================================================
  describe('Rule 7: State Transitions (Completed & Cancelled)', () => {
    let interviewToCompleteId = '';
    let interviewToCancelId = '';

    beforeAll(async () => {
      const interview1 = await prisma.interview.findFirst({
        where: { candidateId: testCandidateId, jobId: testJobId },
      });
      interviewToCompleteId = interview1.id;

      const interview2 = await prisma.interview.findFirst({
        where: { candidateId: secondCandidateId, jobId: testJobId },
      });
      interviewToCancelId = interview2.id;
    });

    it('successfully completes a planned interview', async () => {
      const res = await request(app)
        .put(`/api/interviews/${interviewToCompleteId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: INTERVIEW_STATUSES.COMPLETED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(INTERVIEW_STATUSES.COMPLETED);
    });

    it('rejects completing an already completed interview (400)', async () => {
      const res = await request(app)
        .put(`/api/interviews/${interviewToCompleteId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: INTERVIEW_STATUSES.COMPLETED });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INTERVIEW_ALREADY_CLOSED');
    });

    it('rejects cancelling an already completed interview (400)', async () => {
      const res = await request(app)
        .put(`/api/interviews/${interviewToCompleteId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: INTERVIEW_STATUSES.CANCELLED });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INTERVIEW_ALREADY_CLOSED');
    });

    it('successfully cancels a planned interview', async () => {
      const res = await request(app)
        .put(`/api/interviews/${interviewToCancelId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: INTERVIEW_STATUSES.CANCELLED });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(INTERVIEW_STATUSES.CANCELLED);
    });

    it('rejects completing an already cancelled interview (400)', async () => {
      const res = await request(app)
        .put(`/api/interviews/${interviewToCancelId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: INTERVIEW_STATUSES.COMPLETED });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INTERVIEW_ALREADY_CLOSED');
    });

    it('allows scheduling a new planned interview once previous is completed', async () => {
      // TestCandidate's previous interview is now COMPLETED, so a new PLANNED interview can be created
      const futureDate = new Date(Date.now() + 86400000 * 6).toISOString();
      const res = await request(app)
        .post('/api/interviews')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: testCandidateId,
          jobId: testJobId,
          date: futureDate,
          mode: INTERVIEW_MODES.VIDEO,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(INTERVIEW_STATUSES.PLANNED);
    });
  });

  // =========================================================================
  // RULE 8: Listing interviews of a candidate and of a job offer
  // =========================================================================
  describe('Rule 8: Query & Listing Operations', () => {
    it('lists all interviews of a given candidate', async () => {
      const res = await request(app)
        .get(`/api/interviews/candidate/${testCandidateId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      res.body.data.forEach((interview) => {
        expect(interview.candidateId).toBe(testCandidateId);
      });
    });

    it('returns 404 when querying interviews for non-existent candidate', async () => {
      const res = await request(app)
        .get('/api/interviews/candidate/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('CANDIDATE_NOT_FOUND');
    });

    it('lists all interviews of a given job offer', async () => {
      const res = await request(app)
        .get(`/api/interviews/job/${testJobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      res.body.data.forEach((interview) => {
        expect(interview.jobId).toBe(testJobId);
      });
    });

    it('returns 404 when querying interviews for non-existent job offer', async () => {
      const res = await request(app)
        .get('/api/interviews/job/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('JOB_NOT_FOUND');
    });

    it('lists interviews via general endpoint with pagination', async () => {
      const res = await request(app)
        .get('/api/interviews?page=1&limit=5')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
    });
  });

  // =========================================================================
  // RULE 9: Rescheduling a planned interview
  // =========================================================================
  describe('Rule 9: Rescheduling Operations and Constraints', () => {
    let plannedInterviewId = '';

    beforeAll(async () => {
      const active = await prisma.interview.findFirst({
        where: {
          candidateId: testCandidateId,
          jobId: testJobId,
          status: INTERVIEW_STATUSES.PLANNED,
        },
      });
      plannedInterviewId = active.id;
    });

    it('successfully reschedules a planned interview to a new future date', async () => {
      const newFutureDate = new Date(Date.now() + 86400000 * 10).toISOString();
      const res = await request(app)
        .put(`/api/interviews/${plannedInterviewId}/reschedule`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ date: newFutureDate });

      expect(res.status).toBe(200);
      expect(new Date(res.body.data.date).toISOString()).toBe(newFutureDate);
      expect(res.body.data.status).toBe(INTERVIEW_STATUSES.PLANNED);
    });

    it('rejects rescheduling to a past date (400)', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const res = await request(app)
        .put(`/api/interviews/${plannedInterviewId}/reschedule`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ date: pastDate });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INTERVIEW_PAST_DATE');
    });

    it('rejects rescheduling if interview is already completed or cancelled (400)', async () => {
      // Find cancelled interview
      const cancelledInterview = await prisma.interview.findFirst({
        where: { status: INTERVIEW_STATUSES.CANCELLED },
      });

      const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();
      const res = await request(app)
        .put(`/api/interviews/${cancelledInterview.id}/reschedule`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ date: futureDate });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INTERVIEW_NOT_PLANNED');
    });

    it('rejects rescheduling a non-existent interview (404)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();
      const res = await request(app)
        .put('/api/interviews/00000000-0000-0000-0000-000000000000/reschedule')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ date: futureDate });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('INTERVIEW_NOT_FOUND');
    });
  });

  // =========================================================================
  // Business Exception & Direct Service Unit Tests
  // =========================================================================
  describe('InterviewError and Service Unit Invariants', () => {
    it('InterviewError sets proper name, code, and statusCode properties', () => {
      const err = new InterviewError('Test error message', 'CUSTOM_CODE', 422);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('InterviewError');
      expect(err.code).toBe('CUSTOM_CODE');
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe('Test error message');
    });

    it('direct service call rejects past date with InterviewError', async () => {
      await expect(
        interviewService.scheduleInterview({
          candidateId: testCandidateId,
          jobId: testJobId,
          date: new Date(Date.now() - 50000),
          mode: INTERVIEW_MODES.IN_PERSON,
        })
      ).rejects.toThrow(InterviewError);
    });
  });
});
