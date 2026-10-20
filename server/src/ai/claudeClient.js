const Anthropic = require('@anthropic-ai/sdk');
const { ZodError } = require('zod');

const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
const TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS) || 60000;

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
 * Dynamic fallback generator for development/demo when no real Anthropic key is active.
 * Extracts the candidate's actual qualifications from promptText to produce unique,
 * personalized assessments tailored to the specific candidate and job.
 */
const generateSimulatedResponse = (feature, promptText = '') => {
  // Extract candidate skills from prompt
  const skillsMatch = promptText.match(/Technical Skills:\s*([^\n\r]+)/i);
  const rawSkills = skillsMatch ? skillsMatch[1] : '';
  const skills = rawSkills
    ? rawSkills.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Software Engineering', 'System Architecture', 'Agile'];

  // Extract years of experience
  const expMatch = promptText.match(/Years of Professional Experience:\s*(\d+)/i);
  const expYears = expMatch ? parseInt(expMatch[1], 10) : 3;

  // Extract education level
  const eduMatch = promptText.match(/Education Level:\s*([^\n\r]+)/i);
  const education = eduMatch ? eduMatch[1].trim() : "Bachelor's Degree";

  // Extract job info if matching or questions
  const jobTitleMatch = promptText.match(/(?:Target Job Title|Job Title):\s*([^\n\r]+)/i);
  const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : 'Software Engineer';

  const jobSkillsMatch = promptText.match(/Required Skills:\s*([^\n\r]+)/i);
  const rawJobSkills = jobSkillsMatch ? jobSkillsMatch[1] : '';
  const jobSkills = rawJobSkills
    ? rawJobSkills.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const topSkills = skills.slice(0, 4);
  const primarySkill = topSkills[0] || 'Modern Engineering';
  const secondarySkill = topSkills[1] || 'System Architecture';


  if (feature === 'candidate_job_matching') {
    // Calculate realistic dynamic score based on skill overlap
    const candidateSkillsLower = skills.map((s) => s.toLowerCase());
    const matchedSkills = jobSkills.filter((js) =>
      candidateSkillsLower.some((cs) => cs.includes(js.toLowerCase()) || js.toLowerCase().includes(cs))
    );
    const missingSkills = jobSkills.filter(
      (js) => !candidateSkillsLower.some((cs) => cs.includes(js.toLowerCase()) || js.toLowerCase().includes(cs))
    );

    const baseScore = jobSkills.length > 0
      ? Math.min(95, Math.max(55, Math.round((matchedSkills.length / jobSkills.length) * 100)))
      : Math.min(92, 70 + expYears * 3);

    const strengths = matchedSkills.length > 0
      ? [
          `Strong demonstrable background in ${matchedSkills.slice(0, 3).join(', ')} directly addressing role requirements.`,
          `${expYears} years of verified industry experience backed by a ${education}.`,
        ]
      : [
          `Solid foundation in ${primarySkill} and related web application patterns.`,
          `${expYears} years of hands-on experience and good problem-solving foundation.`,
        ];

    const gaps = missingSkills.length > 0
      ? [
          `Less declared production exposure to ${missingSkills.slice(0, 2).join(', ')}, which should be probed in technical rounds.`,
        ]
      : [
          `No critical skill gaps identified against declared prerequisites for ${jobTitle}.`,
        ];

    const recommendation = baseScore >= 75
      ? `Strong fit for ${jobTitle} with ${baseScore}% requirement coverage. Recommended to schedule immediate technical interview.`
      : `Moderate fit for ${jobTitle} (${baseScore}%). Recommended for exploratory technical screen focusing on skill gap areas.`;

    return {
      score: baseScore,
      strengths,
      gaps,
      recommendation,
    };
  }

  if (feature === 'interview_questions') {
    return {
      questions: [
        {
          question: `How have you leveraged ${primarySkill} in your past projects to architect resilient, scalable systems?`,
          category: 'Technical Architecture',
          rationale: `Directly assesses deep hands-on expertise in the candidate's primary domain of ${primarySkill}.`,
        },
        {
          question: `Can you walk us through a challenging debugging incident involving ${secondarySkill} or distributed data stores?`,
          category: 'Problem Solving',
          rationale: `Evaluates systematic troubleshooting methodology and technical composure under pressure.`,
        },
        {
          question: `What approach do you take when integrating new tools or requirements into a production ${jobTitle} workflow?`,
          category: 'Adaptability & Growth',
          rationale: `Probes speed of learning and engineering agility for requirements beyond core competencies.`,
        },
        {
          question: `How do you ensure data integrity, schema validation, and secure authentication across client-server boundaries?`,
          category: 'System Design & Security',
          rationale: `Tests security awareness, API contract discipline, and foundational system design standards.`,
        },
        {
          question: `Describe a scenario where you collaborated with cross-functional stakeholders to deliver an ambitious engineering milestone.`,
          category: 'Behavioral & Leadership',
          rationale: `Validates communication efficacy, teamwork ethic, and alignment with modern agile practices.`,
        },
      ],
    };
  }

  throw new Error(`Unknown feature for simulation: ${feature}`);
};

/**
 * Execute LLM completion with AbortController 15s timeout and Rule R2 1-time retry
 * Supports Google Gemini (via free API key) and Anthropic Claude
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
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  // 1. If running automated CI/Jest tests without FORCE_LIVE_AI, keep tests deterministic and instantaneous
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_LIVE_AI) {
    const simulated = generateSimulatedResponse(featureName, userPrompt);
    return outputSchema.parse(simulated);
  }

  // 2. Check if Google Gemini live API is configured
  const useGemini = Boolean(
    geminiApiKey &&
    geminiApiKey !== 'mock-key-development' &&
    !geminiApiKey.includes('your_')
  );

  if (useGemini) {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    console.log(`[AI LIVE CALL] Sending live request to Google Gemini (${geminiModel}) for ${featureName}`);

    const callGeminiWithTimeout = async (userContent) => {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => {
        controller.abort();
      }, TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userContent }],
              },
            ],
            generationConfig: {
              temperature,
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = errBody.error?.message || response.statusText;

          if (response.status === 429) {
            const rateError = new Error('Gemini API rate limit exceeded. Please try again shortly.');
            rateError.code = 'AI_QUOTA_EXCEEDED';
            rateError.statusCode = 429;
            throw rateError;
          }

          const apiError = new Error(`Gemini API error (${response.status}): ${errMsg}`);
          apiError.code = 'AI_NETWORK_ERROR';
          apiError.statusCode = 502;
          throw apiError;
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (err) {
        clearTimeout(timeoutHandle);

        if (err.name === 'AbortError' || controller.signal?.aborted) {
          const timeoutError = new Error(`AI request timed out after ${TIMEOUT_MS / 1000} seconds.`);
          timeoutError.code = 'AI_TIMEOUT';
          timeoutError.statusCode = 504;
          throw timeoutError;
        }

        throw err;
      }
    };

    // Attempt 1: Call Gemini API
    let rawText = await callGeminiWithTimeout(userPrompt);

    // Rule R2: Parse and validate with Zod; Retry ONCE on invalid JSON
    try {
      const cleaned = cleanJsonString(rawText);
      const parsed = JSON.parse(cleaned);
      const validated = outputSchema.parse(parsed);
      return validated;
    } catch (initialError) {
      console.warn(`[RULE R2 RETRY] Attempt 1 produced invalid JSON output. Retrying once... Error: ${initialError.message}`);

      const correctivePrompt = `${userPrompt}\n\nIMPORTANT: Your previous output failed schema validation: ${initialError.message}. You must reply STRICTLY with raw JSON complying with the requested schema.`;

      try {
        const retryRawText = await callGeminiWithTimeout(correctivePrompt);
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
  }

  // 2. Fallback to Anthropic Claude or Dev Simulation
  const apiKey = anthropicApiKey;
  const isKeyMissing = !apiKey || apiKey === 'your_anthropic_api_key_here';
  const isMockKey = apiKey === 'mock-key-development';

  if (isKeyMissing) {
    const error = new Error('No AI API key is configured. Please configure GEMINI_API_KEY or ANTHROPIC_API_KEY in server/.env.');
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

