const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const { executeClaudeCompletion, getAiMode } = require('../src/ai/claudeClient');
const { jobOfferGenerationSchema } = require('../src/ai/schemas');
const jobOfferPromptV1 = require('../src/ai/prompts/jobOfferPrompt.v1');

// The real claudeClient is used here (no jest.mock): these tests validate the
// provider-selection logic itself, with network access forbidden.

const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY;
const ORIGINAL_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const setEnv = (name, value) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

const RECRUITER_PROMPT =
  "Offre d'emploi pour un ingénieur Spring Boot avec 2 ans d'expérience, maîtrisant Java, les API REST et MySQL.";

const LIVE_OFFER = {
  title: 'Live Gemini Offer',
  description: 'Offer returned by the mocked live Gemini provider for this test only, not a real API call.',
  responsibilities: [
    'Développer et maintenir des API REST',
    'Participer à la conception des services backend',
    'Assurer la qualité du code et les revues techniques',
  ],
  requiredSkills: ['Java', 'Spring Boot', 'API REST', 'MySQL'],
  preferredSkills: [],
  experience: '2 ans',
  education: null,
  employmentType: 'Full-time',
  location: 'Remote',
  salary: null,
  profile: 'Profil technique autonome, rigoureux et à l’aise dans une équipe agile.',
  benefits: [],
};

const runJobOfferCompletion = () =>
  executeClaudeCompletion({
    systemPrompt: jobOfferPromptV1.systemPrompt,
    userPrompt: jobOfferPromptV1.buildUserPrompt(RECRUITER_PROMPT),
    outputSchema: jobOfferGenerationSchema,
    featureName: 'job_offer_generation',
  });

describe('Offline demo mode ("mock-key-development")', () => {
  const credentials = {
    name: 'Demo Mode Recruiter',
    email: 'demo.mode@talentflow.local',
    password: 'password123',
    role: 'RECRUITER',
  };

  let fetchSpy;
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
    // Jest sets NODE_ENV=test, which normally short-circuits to the simulator.
    // FORCE_LIVE_AI makes the provider-selection logic run exactly as in development.
    process.env.FORCE_LIVE_AI = 'true';

    // Any attempt to reach an external provider fails loudly.
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => {
      throw new Error('Network access is forbidden in offline demo mode');
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.FORCE_LIVE_AI;
    setEnv('GEMINI_API_KEY', ORIGINAL_GEMINI_KEY);
    setEnv('ANTHROPIC_API_KEY', ORIGINAL_ANTHROPIC_KEY);
  });

  it('serves a schema-valid offer through the API without any real key and without network', async () => {
    setEnv('GEMINI_API_KEY', undefined);
    setEnv('ANTHROPIC_API_KEY', 'mock-key-development');

    expect(getAiMode()).toBe('mock');
    const jobsBefore = await prisma.job.count();

    const res = await request(app)
      .post('/api/ai/job-offer/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ prompt: RECRUITER_PROMPT });

    expect(res.statusCode).toBe(200);
    expect(jobOfferGenerationSchema.safeParse(res.body).success).toBe(true);

    const { title, requiredSkills, experience } = res.body;
    expect(title).toMatch(/spring boot|java/i);
    const skills = requiredSkills.join(', ').toLowerCase();
    expect(skills).toContain('java');
    expect(skills).toContain('spring boot');
    expect(skills).toContain('mysql');
    expect(experience).toMatch(/2\s*(ans|years)/i);
    expect(requiredSkills.length).toBeGreaterThanOrEqual(3);

    // No external provider call and no automatic persistence
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await prisma.job.count()).toBe(jobsBefore);
  });

  it('also honours GEMINI_API_KEY=mock-key-development', async () => {
    setEnv('GEMINI_API_KEY', 'mock-key-development');
    setEnv('ANTHROPIC_API_KEY', undefined);

    expect(getAiMode()).toBe('mock');

    const offer = await runJobOfferCompletion();
    expect(offer.title).toMatch(/spring boot|java/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is deterministic: the same prompt always yields the same payload', async () => {
    setEnv('GEMINI_API_KEY', undefined);
    setEnv('ANTHROPIC_API_KEY', 'mock-key-development');

    const first = await runJobOfferCompletion();
    const second = await runJobOfferCompletion();

    expect(second).toEqual(first);
  });

  it('gives priority to a live Gemini key over the mock sentinel', async () => {
    setEnv('GEMINI_API_KEY', 'gemini-test-key-not-a-real-secret');
    setEnv('ANTHROPIC_API_KEY', 'mock-key-development');

    expect(getAiMode()).toBe('gemini');

    fetchSpy.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(LIVE_OFFER) }] } }] }),
    }));

    const offer = await runJobOfferCompletion();

    expect(offer.title).toBe(LIVE_OFFER.title);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String(fetchSpy.mock.calls[0][0])).toContain('generativelanguage.googleapis.com');
  });

  it('gives priority to a live Anthropic key over the mock sentinel', () => {
    setEnv('GEMINI_API_KEY', undefined);
    setEnv('ANTHROPIC_API_KEY', 'sk-ant-live-test-key');

    expect(getAiMode()).toBe('anthropic');
  });

  it('stays disabled when only placeholder keys are configured', async () => {
    setEnv('GEMINI_API_KEY', 'your_gemini_api_key_here');
    setEnv('ANTHROPIC_API_KEY', 'your_anthropic_api_key_here');

    expect(getAiMode()).toBe('disabled');

    await expect(runJobOfferCompletion()).rejects.toMatchObject({
      code: 'AI_CONFIG_ERROR',
      statusCode: 503,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
