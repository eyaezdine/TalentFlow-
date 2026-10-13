const { z } = require('zod');

const createApplicationSchema = z.object({
  candidateId: z
    .string({ required_error: 'candidateId is required' })
    .uuid('Invalid candidate ID format'),
  jobId: z
    .string({ required_error: 'jobId is required' })
    .uuid('Invalid job ID format'),
  status: z
    .enum(['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED'], {
      errorMap: () => ({
        message: 'Status must be NEW, SCREENING, INTERVIEW, OFFER, or REJECTED',
      }),
    })
    .optional()
    .default('NEW'),
  notes: z.string().trim().optional().nullable(),
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED'], {
    errorMap: () => ({
      message: 'Status must be NEW, SCREENING, INTERVIEW, OFFER, or REJECTED',
    }),
  }),
  notes: z.string().trim().optional().nullable(),
});

module.exports = {
  createApplicationSchema,
  updateApplicationStatusSchema,
};
