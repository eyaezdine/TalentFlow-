const { z } = require('zod');

const createJobSchema = z.object({
  title: z
    .string({ required_error: 'Job title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(150, 'Title cannot exceed 150 characters'),
  department: z
    .string()
    .trim()
    .min(2, 'Department must be at least 2 characters long')
    .default('Engineering'),
  location: z
    .string()
    .trim()
    .min(2, 'Location must be at least 2 characters long')
    .default('Remote'),
  description: z
    .string({ required_error: 'Job description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters long'),
  requiredSkills: z
    .string({ required_error: 'Required skills are required' })
    .trim()
    .min(2, 'Please specify required skills'),
  status: z
    .enum(['DRAFT', 'OPEN', 'CLOSED'], {
      errorMap: () => ({ message: 'Status must be DRAFT, OPEN, or CLOSED' }),
    })
    .optional()
    .default('OPEN'),
});

const updateJobSchema = createJobSchema.partial();

module.exports = {
  createJobSchema,
  updateJobSchema,
};
