const prisma = require('../utils/prisma');
const { anonymizeCandidate } = require('../ai/anonymize');
const { executeClaudeCompletion } = require('../ai/claudeClient');
const {
  candidateSummarySchema,
  jobMatchSchema,
  interviewQuestionsSchema,
  cvParsingSchema,
  interviewPolishSchema,
} = require('../ai/schemas');

const summaryPromptV1 = require('../ai/prompts/summaryPrompt.v1');
const matchingPromptV1 = require('../ai/prompts/matchingPrompt.v1');
const interviewPromptV1 = require('../ai/prompts/interviewPrompt.v1');
const cvParsingPromptV1 = require('../ai/prompts/cvParsingPrompt.v1');
const interviewPolishPromptV1 = require('../ai/prompts/interviewPolishPrompt.v1');

// Helper to extract text from PDF buffer supporting multiple pdf-parse versions
const extractTextFromPdfBuffer = async (buffer) => {
  const pdfParsePkg = require('pdf-parse');
  if (typeof pdfParsePkg === 'function') {
    const data = await pdfParsePkg(buffer);
    return (data.text || '').trim();
  }
  if (pdfParsePkg && pdfParsePkg.PDFParse) {
    const parser = new pdfParsePkg.PDFParse({ data: buffer });
    const res = await parser.getText();
    if (typeof parser.destroy === 'function') {
      try { await parser.destroy(); } catch (e) {}
    }
    return (typeof res === 'string' ? res : res?.text || '').trim();
  }
  throw new Error('Unsupported pdf-parse package interface');
};

/**
 * Feature: Extract & Parse Candidate Profile from PDF CV
 * POST /api/ai/parse-cv
 */
const parseCvPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'NO_FILE_UPLOADED',
        message: 'A valid PDF file is required.',
      });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        code: 'INVALID_FILE_TYPE',
        message: 'Only PDF documents (.pdf) are supported.',
      });
    }

    // 1. Extract raw text from PDF buffer in memory
    let rawPdfText = '';
    try {
      rawPdfText = await extractTextFromPdfBuffer(req.file.buffer);
    } catch (parseError) {
      return res.status(422).json({
        code: 'PDF_PARSE_ERROR',
        message: 'Failed to extract text from the provided PDF file. The file may be corrupt or encrypted.',
      });
    }

    if (!rawPdfText || rawPdfText.length < 10) {
      return res.status(422).json({
        code: 'EMPTY_PDF_CONTENT',
        message: 'The uploaded PDF does not contain extractable text (it might be a scanned image or empty).',
      });
    }

    // 2. Build versioned prompt (Rule R4)
    const userPrompt = cvParsingPromptV1.buildUserPrompt(rawPdfText);

    // 3. Execute LLM completion with schema validation (Rule R2 & R3)
    const parsedData = await executeClaudeCompletion({
      systemPrompt: cvParsingPromptV1.systemPrompt,
      userPrompt,
      outputSchema: cvParsingSchema,
      featureName: 'cv_parsing',
    });

    res.status(200).json({
      feature: 'cv_parsing',
      fileName: req.file.originalname,
      data: {
        ...parsedData,
        cvText: rawPdfText,
      },
    });
  } catch (error) {
    next(error);
  }
};


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
 * Feature: Polish In-Interview Shorthand Notes into Standard Scorecard
 * POST /api/ai/polish-notes
 */
const polishInterviewNotes = async (req, res, next) => {
  try {
    const { notes, candidateId, jobId, applicationId, durationMinutes, candidateName, jobTitle } = req.body;

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Raw interview notes are required.',
      });
    }

    let candName = candidateName || '';
    let jTitle = jobTitle || '';
    let jDept = '';
    let reqSkills = '';

    if (candidateId) {
      const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
      if (candidate) candName = candidate.name;
    }

    if (jobId) {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (job) {
        jTitle = job.title;
        jDept = job.department;
        reqSkills = job.requiredSkills;
      }
    }

    if (applicationId && (!candName || !jTitle)) {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { candidate: true, job: true },
      });
      if (app) {
        if (app.candidate) candName = app.candidate.name;
        if (app.job) {
          jTitle = app.job.title;
          jDept = app.job.department;
          reqSkills = app.job.requiredSkills;
        }
      }
    }

    const userPrompt = interviewPolishPromptV1.buildUserPrompt({
      candidateName: candName,
      jobTitle: jTitle,
      jobDepartment: jDept,
      requiredSkills: reqSkills,
      rawNotes: notes,
      durationMinutes: durationMinutes || null,
    });

    const result = await executeClaudeCompletion({
      systemPrompt: interviewPolishPromptV1.systemPrompt,
      userPrompt,
      outputSchema: interviewPolishSchema,
      featureName: 'interview_polish',
    });

    res.status(200).json({
      feature: 'interview_polish',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCandidateSummary,
  matchCandidateToJob,
  generateInterviewQuestions,
  parseCvPdf,
  polishInterviewNotes,
};
