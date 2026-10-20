const { executeClaudeCompletion, extractGeminiText, getAiMode } = require('../src/ai/claudeClient');
const { jobOfferGenerationSchema } = require('../src/ai/schemas');
const jobOfferPromptV1 = require('../src/ai/prompts/jobOfferPrompt.v1');

// The real claudeClient is exercised here (no jest.mock) so the Google Gemini live
// branch is actually executed: URL, request payload, response extraction, retry and
// error mapping. global.fetch is always mocked, so no real API key is ever used and
// no credit is consumed.

const GEMINI_SECRET = 'gemini-live-secret-key-for-tests';

const ORIGINAL_ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

const setEnv = (name, value) => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

const RECRUITER_PROMPT =
  "Je cherche un ingénieur Spring Boot avec 2 ans d'expérience, maîtrisant Java, les API REST et MySQL.";

const LIVE_OFFER = {
  title: 'Live Gemini Offer',
  description:
    "Offre produite par le fournisseur Gemini simulé pour ce test uniquement : aucune requête réelle n'est envoyée à Google.",
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
  profile: "Profil technique autonome et rigoureux, à l'aise dans une équipe agile.",
  benefits: [],
};

const runCompletion = () =>
  executeClaudeCompletion({
    systemPrompt: jobOfferPromptV1.systemPrompt,
    userPrompt: jobOfferPromptV1.buildUserPrompt(RECRUITER_PROMPT),
    outputSchema: jobOfferGenerationSchema,
    featureName: 'job_offer_generation',
  });

const okResponse = (payload) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => payload,
});

const errorResponse = (status, errorMessage) => ({
  ok: false,
  status,
  statusText: 'Error',
  json: async () => ({ error: { message: errorMessage } }),
});

// Gemini `generateContent` payload shape for a successful answer
const geminiPayload = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

describe('Google Gemini live provider', () => {
  let fetchSpy;

  beforeEach(() => {
    // Jest sets NODE_ENV=test, which normally short-circuits to the offline simulator.
    // FORCE_LIVE_AI runs the real provider-selection and Gemini code paths.
    process.env.FORCE_LIVE_AI = 'true';
    setEnv('GEMINI_API_KEY', GEMINI_SECRET);
    setEnv('ANTHROPIC_API_KEY', 'mock-key-development');
    setEnv('GEMINI_MODEL', undefined);

    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.FORCE_LIVE_AI;
    Object.entries(ORIGINAL_ENV).forEach(([name, value]) => setEnv(name, value));
  });

  it('calls the Gemini generateContent endpoint and returns the model answer (not demo data)', async () => {
    fetchSpy.mockResolvedValue(okResponse(geminiPayload(JSON.stringify(LIVE_OFFER))));

    const offer = await runCompletion();

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0];
    // Default model (gemini-2.5-flash answers 404 with a new key) and documented REST endpoint
    expect(String(url)).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_SECRET}`
    );
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.systemInstruction.parts[0].text).toBe(jobOfferPromptV1.systemPrompt);
    expect(body.contents[0].parts[0].text).toContain(RECRUITER_PROMPT);
    expect(body.generationConfig.responseMimeType).toBe('application/json');

    // The live answer is returned as-is, never the offline simulated offer
    expect(offer.title).toBe(LIVE_OFFER.title);
    expect(offer.requiredSkills).toEqual(LIVE_OFFER.requiredSkills);
    expect(jobOfferGenerationSchema.safeParse(offer).success).toBe(true);
  });

  it('uses the model from GEMINI_MODEL when it is set', async () => {
    setEnv('GEMINI_MODEL', 'gemini-2.5-pro');
    fetchSpy.mockResolvedValue(okResponse(geminiPayload(JSON.stringify(LIVE_OFFER))));

    await runCompletion();

    expect(String(fetchSpy.mock.calls[0][0])).toContain('/models/gemini-2.5-pro:generateContent?');
  });

  it('concatenates every answer part and ignores thinking parts', async () => {
    const json = JSON.stringify(LIVE_OFFER);
    const firstHalf = json.slice(0, 40);
    const secondHalf = json.slice(40);

    fetchSpy.mockResolvedValue(
      okResponse({
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: 'internal reasoning that must be ignored' },
                { text: firstHalf },
                { text: secondHalf },
              ],
            },
          },
        ],
      })
    );

    const offer = await runCompletion();

    expect(offer.title).toBe(LIVE_OFFER.title);
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ thought: true, text: 'x' }] } }] })).toBe('');
  });

  it('retries once on malformed JSON and then returns the validated offer', async () => {
    fetchSpy
      .mockResolvedValueOnce(okResponse(geminiPayload('not-json-at-all')))
      .mockResolvedValueOnce(okResponse(geminiPayload(JSON.stringify(LIVE_OFFER))));

    const offer = await runCompletion();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(offer.title).toBe(LIVE_OFFER.title);
  });

  it('never returns a demo answer when the Gemini API fails', async () => {
    fetchSpy.mockResolvedValue(errorResponse(500, 'Internal error encountered.'));

    await expect(runCompletion()).rejects.toMatchObject({
      code: 'AI_NETWORK_ERROR',
      statusCode: 502,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('reports an invalid or revoked key as an explicit configuration error', async () => {
    fetchSpy.mockResolvedValue(errorResponse(400, 'API key not valid. Please pass a valid API key.'));

    const error = await runCompletion().catch((err) => err);

    expect(error).toMatchObject({ code: 'AI_CONFIG_ERROR', statusCode: 503 });
    expect(error.message).toContain('API key not valid');
    expect(error.message).toContain('GEMINI_API_KEY');
  });

  it('reports a model that is not available for this key as a configuration error', async () => {
    // Real answer observed with gemini-2.5-flash and a recently created API key
    fetchSpy.mockResolvedValue(
      errorResponse(
        404,
        'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.'
      )
    );

    const error = await runCompletion().catch((err) => err);

    expect(error).toMatchObject({ code: 'AI_CONFIG_ERROR', statusCode: 503 });
    expect(error.message).toContain('no longer available');
    expect(error.message).toContain('GEMINI_MODEL');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('maps a Gemini quota overflow to a 429 application error', async () => {
    fetchSpy.mockResolvedValue(errorResponse(429, 'Quota exceeded for quota metric'));

    await expect(runCompletion()).rejects.toMatchObject({
      code: 'AI_QUOTA_EXCEEDED',
      statusCode: 429,
    });
  });

  it('reports a blocked or empty answer explicitly instead of falling back to demo data', async () => {
    fetchSpy.mockResolvedValue(
      okResponse({ promptFeedback: { blockReason: 'SAFETY' }, candidates: [] })
    );

    const error = await runCompletion().catch((err) => err);

    expect(error).toMatchObject({ code: 'AI_INVALID_OUTPUT', statusCode: 502 });
    expect(error.message).toContain('SAFETY');
    // The offline simulator would have produced this title: it must not appear anywhere
    expect(error.message).not.toContain('Backend Engineer');
  });

  it('never leaks the API key in the error returned to the caller', async () => {
    const leakedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_SECRET}`;
    fetchSpy.mockRejectedValue(new Error(`request to ${leakedUrl} failed, reason: getaddrinfo ENOTFOUND`));

    const error = await runCompletion().catch((err) => err);

    expect(error).toMatchObject({ code: 'AI_NETWORK_ERROR', statusCode: 502 });
    expect(error.message).not.toContain(GEMINI_SECRET);
    expect(error.message).toContain('***');
  });
});

describe('Provider selection with a real Gemini key configured', () => {
  afterEach(() => {
    Object.entries(ORIGINAL_ENV).forEach(([name, value]) => setEnv(name, value));
  });

  it('prefers a live Gemini key over a live Anthropic key', () => {
    setEnv('GEMINI_API_KEY', 'gemini-live-key');
    setEnv('ANTHROPIC_API_KEY', 'sk-ant-live-key');

    expect(getAiMode()).toBe('gemini');
  });

  it('ignores Gemini placeholders and falls back to the live Anthropic key', () => {
    setEnv('GEMINI_API_KEY', 'your_gemini_api_key_here');
    setEnv('ANTHROPIC_API_KEY', 'sk-ant-live-key');

    expect(getAiMode()).toBe('anthropic');
  });

  it('ignores Gemini placeholders and uses the offline demo mode when only the sentinel remains', () => {
    setEnv('GEMINI_API_KEY', 'your_gemini_api_key_here');
    setEnv('ANTHROPIC_API_KEY', 'mock-key-development');

    expect(getAiMode()).toBe('mock');
  });
});
