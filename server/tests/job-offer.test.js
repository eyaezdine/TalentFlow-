const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const claudeClient = require('../src/ai/claudeClient');

// The AI provider is mocked on purpose: these tests validate the HTTP contract,
// the validation and the error mapping without consuming any real API credits.
jest.mock('../src/ai/claudeClient', () => ({
  executeClaudeCompletion: jest.fn(),
  cleanJsonString: (raw) => raw,
  generateSimulatedResponse: jest.fn(),
}));

const VALID_OFFER = {
  title: 'Ingénieur Backend Java / Spring Boot',
  description:
    "Développement et maintenance d'applications backend robustes, évolutives et maintenables pour nos clients.",
  responsibilities: [
    'Développer et maintenir des API REST',
    'Participer à la conception des services backend',
    'Assurer la qualité du code et les revues techniques',
  ],
  requiredSkills: ['Java', 'Spring Boot', 'API REST', 'MySQL'],
  preferredSkills: ['Docker'],
  experience: '2 ans',
  education: null,
  employmentType: 'Full-time',
  location: 'Remote',
  salary: null,
  profile: 'Profil technique autonome, rigoureux et à l’aise dans une équipe agile.',
  benefits: ['Mutuelle'],
};

describe('POST /api/ai/job-offer/generate (mocked AI provider)', () => {
  const credentials = {
    name: 'Job Offer Test Recruiter',
    email: 'recruiter.job-offer@talentflow.local',
    password: 'password123',
    role: 'RECRUITER',
  };
  let authToken = '';

  beforeAll(async () => {
    const registerRes = await request(app).post('/api/auth/register').send(credentials);
    authToken = registerRes.body.token;

    if (!authToken) {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: credentials.email, password: credentials.password });
      authToken = loginRes.body.token;
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: credentials.email } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    claudeClient.executeClaudeCompletion.mockReset();
  });

  it('returns the structured offer produced by the AI service and validates the schema', async () => {
    claudeClient.executeClaudeCompletion.mockResolvedValueOnce(VALID_OFFER);
    const jobsBefore = await prisma.job.count();

    const res = await request(app)
      .post('/api/ai/job-offer/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'Offre pour un ingénieur Spring Boot avec Java, API REST et MySQL' });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe(VALID_OFFER.title);
    expect(res.body.requiredSkills).toEqual(VALID_OFFER.requiredSkills);
    expect(res.body.responsibilities).toHaveLength(3);

    // The versioned prompt + validation schema must be forwarded to the AI service
    expect(claudeClient.executeClaudeCompletion).toHaveBeenCalledTimes(1);
    const callArgs = claudeClient.executeClaudeCompletion.mock.calls[0][0];
    expect(callArgs.featureName).toBe('job_offer_generation');
    expect(callArgs.outputSchema).toBeDefined();
    expect(callArgs.userPrompt).toContain('ingénieur Spring Boot');

    // Generation must never persist the offer
    expect(await prisma.job.count()).toBe(jobsBefore);
  });

  it('maps an AI provider network failure to a 502 error response', async () => {
    claudeClient.executeClaudeCompletion.mockRejectedValueOnce(
      Object.assign(new Error('Anthropic API communication failure.'), {
        code: 'AI_NETWORK_ERROR',
        statusCode: 502,
      })
    );

    const res = await request(app)
      .post('/api/ai/job-offer/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'Offre pour un ingénieur Spring Boot avec Java, API REST et MySQL' });

    expect(res.statusCode).toBe(502);
    expect(res.body.code).toBe('AI_NETWORK_ERROR');
    expect(res.body.message).toMatch(/communication failure/i);
  });

  it('maps an AI provider timeout to a 504 error response', async () => {
    claudeClient.executeClaudeCompletion.mockRejectedValueOnce(
      Object.assign(new Error('AI request timed out after 15 seconds.'), {
        code: 'AI_TIMEOUT',
        statusCode: 504,
      })
    );

    const res = await request(app)
      .post('/api/ai/job-offer/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'Offre pour un ingénieur Spring Boot avec Java, API REST et MySQL' });

    expect(res.statusCode).toBe(504);
    expect(res.body.code).toBe('AI_TIMEOUT');
  });

  it('maps a missing AI configuration to a 503 error response', async () => {
    claudeClient.executeClaudeCompletion.mockRejectedValueOnce(
      Object.assign(new Error('No AI API key is configured.'), {
        code: 'AI_CONFIG_ERROR',
        statusCode: 503,
      })
    );

    const res = await request(app)
      .post('/api/ai/job-offer/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: 'Offre pour un ingénieur Spring Boot avec Java, API REST et MySQL' });

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe('AI_CONFIG_ERROR');
  });

  it('never calls the AI provider when the prompt is invalid', async () => {
    const res = await request(app)
      .post('/api/ai/job-offer/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: '' });

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(claudeClient.executeClaudeCompletion).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated calls before reaching the controller', async () => {
    const res = await request(app)
      .post('/api/ai/job-offer/generate')
      .send({ prompt: 'Offre pour un ingénieur Spring Boot avec Java, API REST et MySQL' });

    expect(res.statusCode).toBe(401);
    expect(claudeClient.executeClaudeCompletion).not.toHaveBeenCalled();
  });
});
