const { z } = require('zod');

/**
 * ====================================================
 * Rule R2: Zod Validation Schemas for AI Outputs
 * server/src/ai/schemas.js
 *
 * Every LLM completion MUST conform strictly to these schemas
 * before being sent to the client.
 * ====================================================
 */



// Feature 2: Candidate <-> Job Matching Output Schema
const jobMatchSchema = z.object({
  score: z
    .number({ required_error: 'Score is required' })
    .int('Score must be an integer')
    .min(0, 'Score cannot be below 0')
    .max(100, 'Score cannot exceed 100'),
  strengths: z
    .array(z.string().trim().min(3))
    .min(1, 'At least one candidate strength must be identified'),
  gaps: z
    .array(z.string().trim().min(3)),
  recommendation: z
    .string({ required_error: 'Hiring recommendation is required' })
    .min(15, 'Recommendation must be at least 15 characters long'),
});

// Feature 3: Interview Questions Output Schema (Exactly 5 tailored questions)
const interviewQuestionItemSchema = z.object({
  question: z.string().trim().min(10, 'Question must be at least 10 characters long'),
  category: z.string().trim().min(2, 'Category is required (e.g., Technical, Behavioral, System Design)'),
  rationale: z.string().trim().min(10, 'Rationale must be at least 10 characters long'),
});

const interviewQuestionsSchema = z.object({
  questions: z
    .array(interviewQuestionItemSchema)
    .min(5, 'Exactly 5 questions are required')
    .max(5, 'Exactly 5 questions are required'),
});

module.exports = {
  jobMatchSchema,
  interviewQuestionsSchema,
};
