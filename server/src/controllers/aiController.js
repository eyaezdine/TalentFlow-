const prisma = require('../utils/prisma');
const { anonymizeCandidate } = require('../ai/anonymize');
const { executeClaudeCompletion } = require('../ai/claudeClient');
const {
  candidateSummarySchema,
  jobMatchSchema,
  interviewQuestionsSchema,
  jobOfferGenerationSchema,
} = require('../ai/schemas');

const summaryPromptV1 = require('../ai/prompts/summaryPrompt.v1');
const matchingPromptV1 = require('../ai/prompts/matchingPrompt.v1');
const interviewPromptV1 = require('../ai/prompts/interviewPrompt.v1');
const jobOfferPromptV1 = require('../ai/prompts/jobOfferPrompt.v1');

/**
 * Feature 1: Generate Professional Candidate Summary
 * POST /api/ai/summary
 */
const generateCandidateSummary = async (req, res, next) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        code: 'BAD_REQUEST',
        message: 'candidateId is required',
      });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return res.status(404).json({
        code: 'CANDIDATE_NOT_FOUND',
        message: `Candidate with ID '${candidateId}' was not found.`,
      });
    }

    // Rule R1: Mandatory Anonymization Layer
    const { anonymized, auditLog } = anonymizeCandidate(candidate);

    // Rule R4: Versioned Prompt
    const userPrompt = summaryPromptV1.buildUserPrompt(anonymized);

    // Rules R2 & R3: Execute with 15s timeout, validation, and retry
    const result = await executeClaudeCompletion({
      systemPrompt: summaryPromptV1.systemPrompt,
      userPrompt,
      outputSchema: candidateSummarySchema,
      featureName: 'candidate_summary',
    });

    res.status(200).json({
      feature: 'candidate_summary',
      data: result,
      anonymizationAudit: auditLog,
      anonymizedDataSent: anonymized,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Feature 2: Candidate <-> Job Matching Analysis
 * POST /api/ai/match
 */
const matchCandidateToJob = async (req, res, next) => {
  try {
    const { candidateId, jobId } = req.body;

    if (!candidateId || !jobId) {
      return res.status(400).json({
        code: 'BAD_REQUEST',
        message: 'Both candidateId and jobId are required',
      });
    }

    const [candidate, job] = await Promise.all([
      prisma.candidate.findUnique({ where: { id: candidateId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);

    if (!candidate) {
      return res.status(404).json({
        code: 'CANDIDATE_NOT_FOUND',
        message: `Candidate with ID '${candidateId}' was not found.`,
      });
    }

    if (!job) {
      return res.status(404).json({
        code: 'JOB_NOT_FOUND',
        message: `Job offer with ID '${jobId}' was not found.`,
      });
    }

    // Rule R1: Mandatory Anonymization
    const { anonymized, auditLog } = anonymizeCandidate(candidate);

    // Rule R4: Versioned Prompt
    const userPrompt = matchingPromptV1.buildUserPrompt(anonymized, job);

    // Rules R2 & R3: Execute with validation and timeout
    const result = await executeClaudeCompletion({
      systemPrompt: matchingPromptV1.systemPrompt,
      userPrompt,
      outputSchema: jobMatchSchema,
      featureName: 'candidate_job_matching',
    });

    res.status(200).json({
      feature: 'candidate_job_matching',
      candidateName: candidate.name,
      jobTitle: job.title,
      data: result,
      anonymizationAudit: auditLog,
      anonymizedDataSent: anonymized,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Feature 3: Generate 5 Tailored Interview Questions
 * POST /api/ai/questions
 */
const generateInterviewQuestions = async (req, res, next) => {
  try {
    const { applicationId, candidateId, jobId } = req.body;

    let candidate, job, notes;

    if (applicationId) {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { candidate: true, job: true },
      });

      if (!app) {
        return res.status(404).json({
          code: 'APPLICATION_NOT_FOUND',
          message: `Application with ID '${applicationId}' was not found.`,
        });
      }

      candidate = app.candidate;
      job = app.job;
      notes = app.notes;
    } else if (candidateId && jobId) {
      [candidate, job] = await Promise.all([
        prisma.candidate.findUnique({ where: { id: candidateId } }),
        prisma.job.findUnique({ where: { id: jobId } }),
      ]);

      if (!candidate) return res.status(404).json({ code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found' });
      if (!job) return res.status(404).json({ code: 'JOB_NOT_FOUND', message: 'Job not found' });
    } else {
      return res.status(400).json({
        code: 'BAD_REQUEST',
        message: 'Must provide either applicationId or both candidateId and jobId',
      });
    }

    // Rule R1: Mandatory Anonymization
    const { anonymized, auditLog } = anonymizeCandidate(candidate);

    // Rule R4: Versioned Prompt
    const userPrompt = interviewPromptV1.buildUserPrompt(anonymized, job, notes);

    // Rules R2 & R3: Execute with validation and timeout
    const result = await executeClaudeCompletion({
      systemPrompt: interviewPromptV1.systemPrompt,
      userPrompt,
      outputSchema: interviewQuestionsSchema,
      featureName: 'interview_questions',
    });

    res.status(200).json({
      feature: 'interview_questions',
      candidateName: candidate.name,
      jobTitle: job.title,
      data: result,
      anonymizationAudit: auditLog,
      anonymizedDataSent: anonymized,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Feature 4: Generate Job Offer from Recruiter Prompt
 * POST /api/ai/job-offer/generate
 */
const generateJobOffer = async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({
        code: 'BAD_REQUEST',
        message: 'A prompt of at least 10 characters is required to generate a job offer.',
      });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({
        code: 'BAD_REQUEST',
        message: 'Prompt is too long. Please limit to 1000 characters.',
      });
    }

    // Rule R4: Versioned Prompt
    const userPrompt = jobOfferPromptV1.buildUserPrompt(prompt.trim());

    // Rules R2 & R3: Execute with validation and timeout
    const result = await executeClaudeCompletion({
      systemPrompt: jobOfferPromptV1.systemPrompt,
      userPrompt,
      outputSchema: jobOfferGenerationSchema,
      featureName: 'job_offer_generation',
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCandidateSummary,
  matchCandidateToJob,
  generateInterviewQuestions,
  generateJobOffer,
};
