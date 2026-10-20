const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
// Google Generative Language model used when GEMINI_MODEL is not provided.
// `gemini-2.5-flash` answers HTTP 404 ("no longer available to new users") with a
// recently created API key, so the default points to Google's rolling flash alias,
// which was verified to answer a valid JSON payload with the project key.
const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
// Explicit opt-in key value that enables the offline (schema-validated) demo mode.
const MOCK_API_KEY = 'mock-key-development';
const TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS) || 60000;

/**
 * Google Gemini model actually used for the live API: GEMINI_MODEL wins, with
 * `gemini-2.5-flash` as the default. Resolved on every call so a .env change is
 * honoured after a restart, without touching the code.
 */
const resolveGeminiModel = () => process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

// Provider priority: live Gemini > live Anthropic > offline demo (mock sentinel) > disabled.
const isMockKey = (value) => String(value ?? '').trim() === MOCK_API_KEY;

const isLiveKey = (value) => {
  const key = String(value ?? '').trim();
  return key.length > 0 && !key.includes('your_') && !isMockKey(key);
};

/**
 * Resolves the effective AI mode from the environment. Evaluated on every call so a
 * .env edit is honoured right after a server restart, without any code change.
 * @returns {'gemini'|'anthropic'|'mock'|'disabled'}
 */
const getAiMode = () => {
  if (isLiveKey(process.env.GEMINI_API_KEY)) return 'gemini';
  if (isLiveKey(process.env.ANTHROPIC_API_KEY)) return 'anthropic';
  if (isMockKey(process.env.GEMINI_API_KEY) || isMockKey(process.env.ANTHROPIC_API_KEY)) return 'mock';
  return 'disabled';
};

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
 * Extracts the answer text from a Gemini `generateContent` payload.
 * Thinking parts (gemini 2.5+) are ignored and every answer part is concatenated.
 */
const extractGeminiText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part) => part && part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
};

/** Strips the API key from any message before it is logged or returned to the caller. */
const redactSecret = (message, secret) => {
  const text = String(message ?? '');
  if (!secret) return text;
  return text.split(secret).join('***');
};

/**
 * Explicit, actionable error raised when Gemini answers without usable content
 * (safety block, empty candidates, truncated answer). Never replaced by demo data.
 */
const buildGeminiEmptyResponseError = (data) => {
  const blockReason = data?.promptFeedback?.blockReason;
  const finishReason = data?.candidates?.[0]?.finishReason;
  const detail = blockReason
    ? `blocked the prompt (reason: ${blockReason})`
    : finishReason
      ? `returned no text content (finishReason: ${finishReason})`
      : 'returned an empty response';

  const error = new Error(
    `Gemini API ${detail}. No structured job offer could be generated for this prompt; please rephrase it and try again.`
  );
  error.code = 'AI_INVALID_OUTPUT';
  error.statusCode = 502;
  return error;
};

/**
 * Technology keywords used by the offline job offer generator to derive a
 * believable, prompt-driven structured offer when no live provider is configured.
 */
const JOB_OFFER_SKILL_DICTIONARY = [
  'Spring Boot', 'Spring MVC', 'Spring', 'Java', 'JavaScript', 'TypeScript', 'Node.js', 'Express',
  'NestJS', 'React', 'Angular', 'Vue.js', 'Next.js', 'Redux', 'Tailwind CSS', 'HTML', 'CSS',
  'Python', 'Django', 'Flask', 'FastAPI', 'PHP', 'Laravel', 'Symfony', 'C#', '.NET', 'Go',
  'Kotlin', 'Swift', 'Rust', 'API REST', 'REST', 'GraphQL', 'SOAP', 'Microservices',
  'MySQL', 'PostgreSQL', 'MongoDB', 'SQL Server', 'Oracle', 'SQL', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins', 'Git', 'Terraform', 'Linux',
  'Hibernate', 'JPA', 'Kafka', 'RabbitMQ', 'JUnit', 'Jest', 'Cypress', 'Selenium', 'Prisma',
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extracts the technologies actually mentioned in a free-text prompt, keeping the
 * order of appearance and ignoring overlaps (e.g. 'Spring Boot' wins over 'Spring').
 */
const extractSkillsFromPrompt = (text) => {
  const matches = [];

  JOB_OFFER_SKILL_DICTIONARY.forEach((skill) => {
    const regex = new RegExp(
      `(?<![A-Za-z0-9+#.])${escapeRegExp(skill)}(?![A-Za-z0-9+#])`,
      'gi'
    );
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({ skill, index: match.index, length: match[0].length });
    }
  });

  matches.sort((a, b) => a.index - b.index || b.length - a.length);

  const skills = [];
  const seen = new Set();
  let lastEnd = -1;

  matches.forEach((match) => {
    if (match.index < lastEnd) return; // overlapped by a longer keyword
    if (seen.has(match.skill.toLowerCase())) return;
    seen.add(match.skill.toLowerCase());
    skills.push(match.skill);
    lastEnd = match.index + match.length;
  });

  return skills;
};

/**
 * Builds a structured, schema-compliant job offer derived from the recruiter prompt.
 * Used by the offline/demo mode so the generated offer actually reflects the request.
 */
const buildSimulatedJobOffer = (promptText) => {
  const prompt = (promptText || '').trim();
  const detectedSkills = extractSkillsFromPrompt(prompt);

  const experienceMatch = prompt.match(/(\d+)\s*\+?\s*(?:ans?|years?|yrs?)/i);
  const isFrenchDuration = Boolean(experienceMatch && /an/i.test(experienceMatch[0]));
  const experience = experienceMatch
    ? `${experienceMatch[1]} ${isFrenchDuration ? 'ans' : 'years'}`
    : null;

  const seniority = /\bsenior\b|\bexpert\b|confirm[ée]/i.test(prompt)
    ? 'Senior'
    : /\bjunior\b|d[ée]butant/i.test(prompt)
      ? 'Junior'
      : '';

  const roleLabel = /full[-\s]?stack/i.test(prompt)
    ? 'Full Stack Engineer'
    : /front[-\s]?end|react|angular|vue/i.test(prompt)
      ? 'Frontend Engineer'
      : /back[-\s]?end|spring|java|\bnode|php|python|microservices|\bapi\b/i.test(prompt)
        ? 'Backend Engineer'
        : 'Software Engineer';

  const baseTitle = [seniority, roleLabel].filter(Boolean).join(' ');
  const title = detectedSkills.length
    ? `${baseTitle} (${detectedSkills.slice(0, 3).join(' / ')})`
    : baseTitle;

  const requiredSkills = [...detectedSkills];
  ['Problem Solving', 'Teamwork', 'Communication'].forEach((fallback) => {
    if (requiredSkills.length < 3 && !requiredSkills.includes(fallback)) {
      requiredSkills.push(fallback);
    }
  });

  const preferredSkills = ['Git', 'Unit Testing', 'CI/CD'].filter(
    (skill) => !requiredSkills.some((required) => required.toLowerCase() === skill.toLowerCase())
  );

  const educationMatch = prompt.match(
    /(master'?s?( degree)?|licen[cs]e|bachelor'?s?( degree)?|engineering degree|phd|doctorate)/i
  );

  const employmentType = /stage|internship/i.test(prompt)
    ? 'Internship'
    : /cdd|contract|freelance/i.test(prompt)
      ? 'Contract'
      : /\bcdi\b|full[-\s]?time|temps plein/i.test(prompt)
        ? 'Full-time'
        : null;

  const location = /remote|t[ée]l[ée]travail/i.test(prompt)
    ? 'Remote'
    : /hybride|hybrid/i.test(prompt)
      ? 'Hybrid'
      : /sur site|on[-\s]?site/i.test(prompt)
        ? 'On-site'
        : null;

  const skillPhrase = detectedSkills.length ? detectedSkills.join(', ') : 'modern web technologies';

  return {
    title,
    description: `We are looking for a ${baseTitle} to design, develop and maintain high-quality software solutions. The role requires hands-on experience with ${requiredSkills.join(', ')} and the ability to collaborate with product, design and engineering teams to deliver reliable features in an agile environment.`,
    responsibilities: [
      'Design, develop and maintain scalable software components',
      'Write clean, tested and maintainable code following best practices',
      'Collaborate with product managers, designers and other engineers',
      'Participate in code reviews, testing and continuous improvement',
    ],
    requiredSkills,
    preferredSkills,
    experience,
    education: educationMatch ? educationMatch[0] : null,
    employmentType,
    location,
    salary: null,
    profile: `A motivated professional with solid hands-on experience in ${skillPhrase}, comfortable working autonomously inside an agile team and eager to contribute to the technical objectives of the company.`,
    benefits: [],
  };
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

  if (feature === 'candidate_summary') {
    const s1 = expYears > 5
      ? `Senior engineering profile offering ${expYears} years of progressive experience with strong specialization in ${primarySkill} and ${secondarySkill}.`
      : `Promising software engineer with ${expYears} years of practical experience focusing primarily on ${primarySkill} and ${secondarySkill}.`;
    const s2 = `Demonstrates consistent delivery across modern web systems, database design, and collaborative development environments.`;
    const s3 = `Holds a ${education} and exhibits the technical aptitude to make an immediate impact on core engineering objectives.`;

    const keywords = Array.from(new Set([...topSkills, primarySkill, secondarySkill, 'System Design', 'Agile Delivery'])).slice(0, 6);

    return {
      summary: `${s1} ${s2} ${s3}`,
      keywords,
    };
  }

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

  if (feature === 'job_offer_generation') {
    // Recover the recruiter's raw description from the versioned prompt template
    const recruiterPromptMatch = promptText.match(/Recruiter Prompt:\s*"([\s\S]*)"\s*\n\n/);
    return buildSimulatedJobOffer(recruiterPromptMatch ? recruiterPromptMatch[1] : promptText);
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

  // 2. Resolve the effective provider mode from the environment (single source of truth)
  const aiMode = getAiMode();

  // 2a. Offline demo mode: explicit opt-in sentinel key, no network call, deterministic output
  if (aiMode === 'mock') {
    console.log(
      `[AI DEMO MODE] No live provider configured ("${MOCK_API_KEY}" detected): returning a deterministic, schema-validated ${featureName} response derived from the user prompt.`
    );
    return outputSchema.parse(generateSimulatedResponse(featureName, userPrompt));
  }

  // 3. Google Gemini live API (highest priority live provider)
  if (aiMode === 'gemini') {
    const geminiModel = resolveGeminiModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    console.log(`[AI LIVE CALL] Sending live request to Google Gemini (${geminiModel}) for ${featureName}`);

    // Returns { data, text }: the raw payload is kept to report safety blocks precisely.
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
          const errMsg = redactSecret(errBody.error?.message || response.statusText, geminiApiKey);

          if (response.status === 429) {
            const rateError = new Error('Gemini API rate limit exceeded. Please try again shortly.');
            rateError.code = 'AI_QUOTA_EXCEEDED';
            rateError.statusCode = 429;
            throw rateError;
          }

          // 400/401/403/404 mean the request itself was rejected: wrong or revoked key,
          // model not available for this key, API not enabled. Reported as a
          // configuration error so the problem is actionable.
          if ([400, 401, 403, 404].includes(response.status)) {
            const configError = new Error(
              `Gemini API rejected the request (${response.status}): ${errMsg}. Check GEMINI_API_KEY and GEMINI_MODEL in server/.env.`
            );
            configError.code = 'AI_CONFIG_ERROR';
            configError.statusCode = 503;
            throw configError;
          }

          const apiError = new Error(`Gemini API error (${response.status}): ${errMsg}`);
          apiError.code = 'AI_NETWORK_ERROR';
          apiError.statusCode = 502;
          throw apiError;
        }

        const data = await response.json();
        return { data, text: extractGeminiText(data) };
      } catch (err) {
        clearTimeout(timeoutHandle);

        if (err.name === 'AbortError' || controller.signal?.aborted) {
          const timeoutError = new Error(`AI request timed out after ${TIMEOUT_MS / 1000} seconds.`);
          timeoutError.code = 'AI_TIMEOUT';
          timeoutError.statusCode = 504;
          throw timeoutError;
        }

        // Errors already normalized above keep their explicit code/status.
        if (err.code) throw err;

        // Raw transport failure (DNS, TLS, offline...): explicit message, key redacted.
        const networkError = new Error(
          `Gemini API unreachable: ${redactSecret(err.message || 'network failure', geminiApiKey)}`
        );
        networkError.code = 'AI_NETWORK_ERROR';
        networkError.statusCode = 502;
        throw networkError;
      }
    };

    // Attempt 1: Call Gemini API
    const firstAttempt = await callGeminiWithTimeout(userPrompt);

    // A blocked/empty live answer is an explicit failure: never fall back to demo data.
    if (!firstAttempt.text) {
      throw buildGeminiEmptyResponseError(firstAttempt.data);
    }

    let rawText = firstAttempt.text;

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
        const retryAttempt = await callGeminiWithTimeout(correctivePrompt);
        if (!retryAttempt.text) {
          throw buildGeminiEmptyResponseError(retryAttempt.data);
        }

        const retryCleaned = cleanJsonString(retryAttempt.text);
        const retryParsed = JSON.parse(retryCleaned);
        const retryValidated = outputSchema.parse(retryParsed);
        return retryValidated;
      } catch (retryError) {
        // Provider-level failures (config, quota, timeout, empty answer) are already
        // explicit and must be surfaced as-is instead of being reshaped.
        if (retryError.code) throw retryError;

        const finalError = new Error(
          `AI returned malformed or non-compliant output after retry: ${retryError.message}`
        );
        finalError.code = 'AI_INVALID_OUTPUT';
        finalError.statusCode = 502;
        throw finalError;
      }
    }
  }

  // 4. Fallback to Anthropic Claude live API
  if (aiMode !== 'anthropic') {
    const error = new Error(
      'No AI API key is configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in server/.env (use the value "mock-key-development" for the offline demo mode).'
    );
    error.code = 'AI_CONFIG_ERROR';
    error.statusCode = 503;
    throw error;
  }

  const apiKey = anthropicApiKey;
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
  extractGeminiText,
  generateSimulatedResponse,
  getAiMode,
};

