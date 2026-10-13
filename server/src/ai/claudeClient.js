const Anthropic = require('@anthropic-ai/sdk');
const { ZodError } = require('zod');

const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
const TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS) || 15000;

/**
 * Extracts and cleans JSON string from LLM completion text
 */
const cleanJsonString = (raw) => {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Strip markdown codeblocks ```json ... ``` if model accidentally wrapped it
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
};

/**
 * Deterministic fallback generator for development/demo when no real Anthropic key is active
 */
const generateSimulatedResponse = (feature, promptText) => {
  if (feature === 'candidate_summary') {
    return {
      summary:
        'Demonstrates a solid technical foundation with proven experience delivering full-stack web architectures. Exhibits proficiency across core frameworks, database management, and asynchronous system workflows. Well-positioned to deliver immediate impact within high-growth engineering teams.',
      keywords: ['Full-Stack Engineering', 'System Architecture', 'Database Optimization', 'Modern Web Frameworks', 'Agile Collaboration'],
    };
  }

  if (feature === 'candidate_job_matching') {
    return {
      score: 88,
      strengths: [
        'Direct alignment between declared skills and job requirements',
        'Demonstrated competence in modern web frameworks and backend REST APIs',
        'Relevant educational background and engineering fundamentals',
      ],
      gaps: [
        'Cloud deployment pipeline and containerization experience should be verified during interview',
      ],
      recommendation:
        'Strong candidate matching the job profile. Recommended to proceed to technical interview stage.',
    };
  }

  if (feature === 'interview_questions') {
    return {
      questions: [
        {
          question:
            'How have you architected and scaled RESTful APIs to handle high concurrent throughput and data persistence?',
          category: 'Technical Stack',
          rationale: 'Evaluates backend engineering depth aligned with job specifications.',
        },
        {
          question:
            'Can you describe a complex production bug you diagnosed and resolved under tight deadlines?',
          category: 'Problem Solving',
          rationale: 'Assesses debugging methodology and technical resilience.',
        },
        {
          question:
            'What strategies do you employ when learning and integrating an unfamiliar library or infrastructure tool?',
          category: 'Competency Gap Probe',
          rationale: 'Probes candidate adaptability for skills not explicitly highlighted in their CV.',
        },
        {
          question:
            'How would you design a database schema for an entity relationship requiring strict data integrity and cascading updates?',
          category: 'System Design',
          rationale: 'Tests relational modeling and architectural design capabilities.',
        },
        {
          question:
            'Describe a situation where you had a technical disagreement with a peer or team lead. How did you arrive at consensus?',
          category: 'Behavioral & Leadership',
          rationale: 'Evaluates communication, engineering culture fit, and collaborative problem-solving.',
        },
      ],
    };
  }

  throw new Error(`Unknown feature for simulation: ${feature}`);
};

/**
 * Execute Claude completion with AbortController 15s timeout and Rule R2 1-time retry
 *
 * @param {object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {import('zod').ZodSchema} params.outputSchema
 * @param {string} params.featureName
 * @param {number} [params.temperature=0.2]
 * @returns {Promise<any>} Validated JSON response object
 */
const executeClaudeCompletion = async ({
  systemPrompt,
  userPrompt,
  outputSchema,
  featureName,
  temperature = 0.2,
}) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Rule R3: Detect missing API key
  const isKeyMissing = !apiKey || apiKey === 'your_anthropic_api_key_here';
  const isMockKey = apiKey === 'mock-key-development';

  if (isKeyMissing) {
    const error = new Error('Anthropic API key is not configured. Please configure ANTHROPIC_API_KEY in server/.env.');
    error.code = 'AI_CONFIG_ERROR';
    error.statusCode = 503;
    throw error;
  }

  // If running in development with mock key, return validated simulated response
  if (isMockKey) {
    console.log(`[AI DEV SIMULATION] Generating deterministic schema-validated response for ${featureName}`);
    const simulated = generateSimulatedResponse(featureName, userPrompt);
    return outputSchema.parse(simulated);
  }

  const client = new Anthropic({ apiKey });
  const modelName = process.env.AI_MODEL || DEFAULT_MODEL;

  // Function to call Claude with 15s AbortController timeout (Rule R3)
  const callWithTimeout = async (userContent) => {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, TIMEOUT_MS);

    try {
      const response = await client.messages.create(
        {
          model: modelName,
          max_tokens: 1000,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutHandle);
      return response;
    } catch (err) {
      clearTimeout(timeoutHandle);

      if (err.name === 'AbortError' || controller.signal.aborted) {
        const timeoutError = new Error(`AI request timed out after ${TIMEOUT_MS / 1000} seconds.`);
        timeoutError.code = 'AI_TIMEOUT';
        timeoutError.statusCode = 504;
        throw timeoutError;
      }

      if (err.status === 429) {
        const rateLimitError = new Error('Anthropic API rate limit or quota exceeded. Please try again shortly.');
        rateLimitError.code = 'AI_QUOTA_EXCEEDED';
        rateLimitError.statusCode = 429;
        throw rateLimitError;
      }

      if (err.status === 401) {
        const authError = new Error('Invalid Anthropic API key provided in server configuration.');
        authError.code = 'AI_CONFIG_ERROR';
        authError.statusCode = 502;
        throw authError;
      }

      const networkError = new Error(err.message || 'Anthropic API communication failure.');
      networkError.code = 'AI_NETWORK_ERROR';
      networkError.statusCode = 502;
      throw networkError;
    }
  };

  // Attempt 1: Call Claude API
  let rawText = '';
  try {
    const completion = await callWithTimeout(userPrompt);
    rawText = completion.content[0]?.text || '';
  } catch (err) {
    throw err;
  }

  // Rule R2: Parse and validate with Zod; Retry ONCE on invalid JSON
  try {
    const cleaned = cleanJsonString(rawText);
    const parsed = JSON.parse(cleaned);
    const validated = outputSchema.parse(parsed);
    return validated;
  } catch (initialError) {
    console.warn(`[RULE R2 RETRY] Attempt 1 produced invalid JSON output. Retrying once... Error: ${initialError.message}`);

    // Retry once with corrective prompt (Rule R2)
    const correctivePrompt = `${userPrompt}\n\nIMPORTANT: Your previous output failed JSON validation: ${initialError.message}. You must reply STRICTLY with raw JSON complying with the requested schema.`;

    try {
      const retryCompletion = await callWithTimeout(correctivePrompt);
      const retryRawText = retryCompletion.content[0]?.text || '';
      const retryCleaned = cleanJsonString(retryRawText);
      const retryParsed = JSON.parse(retryCleaned);
      const retryValidated = outputSchema.parse(retryParsed);
      return retryValidated;
    } catch (retryError) {
      const finalError = new Error(
        `AI returned malformed or non-compliant output after retry: ${retryError.message}`
      );
      finalError.code = 'AI_INVALID_OUTPUT';
      finalError.statusCode = 502;
      throw finalError;
    }
  }
};

module.exports = {
  executeClaudeCompletion,
  cleanJsonString,
  generateSimulatedResponse,
};
