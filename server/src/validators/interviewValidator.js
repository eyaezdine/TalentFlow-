const { z } = require('zod');
const { INTERVIEW_MODES, INTERVIEW_STATUSES } = require('../constants/interviewConstants');

const allowedModes = Object.values(INTERVIEW_MODES);

const scheduleInterviewSchema = z.object({
  candidateId: z
    .string({ required_error: 'candidateId is required' })
    .uuid('Invalid candidate ID format'),
  jobId: z
    .string({ required_error: 'jobId is required' })
    .uuid('Invalid job ID format'),
  date: z
    .string({ required_error: 'date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Expected a valid ISO date-time string.',
    }),
  mode: z
    .enum(allowedModes, {
      errorMap: () => ({
        message: `Mode must be either '${INTERVIEW_MODES.IN_PERSON}' or '${INTERVIEW_MODES.VIDEO}'`,
      }),
    }),
});

const rescheduleInterviewSchema = z.object({
  date: z
    .string({ required_error: 'date is required' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format. Expected a valid ISO date-time string.',
    }),
});

const updateInterviewStatusSchema = z.object({
  status: z
    .enum([INTERVIEW_STATUSES.COMPLETED, INTERVIEW_STATUSES.CANCELLED], {
      errorMap: () => ({
        message: `Status must be either '${INTERVIEW_STATUSES.COMPLETED}' or '${INTERVIEW_STATUSES.CANCELLED}'`,
      }),
    }),
});

module.exports = {
  scheduleInterviewSchema,
  rescheduleInterviewSchema,
  updateInterviewStatusSchema,
};
