const { z } = require('zod');

const createCandidateSchema = z.object({
  name: z
    .string({ required_error: 'Candidate name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Candidate email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  phone: z
    .string()
    .trim()
    .max(25, 'Phone number cannot exceed 25 characters')
    .optional()
    .nullable(),
  experienceYears: z
    .coerce
    .number({ invalid_type_error: 'Years of experience must be a number' })
    .int('Years of experience must be an integer')
    .min(0, 'Years of experience cannot be negative')
    .max(50, 'Years of experience cannot exceed 50')
    .default(0),
  skills: z
    .string({ required_error: 'Skills are required' })
    .trim()
    .min(2, 'Please specify candidate skills'),
  educationLevel: z
    .string({ required_error: 'Education level is required' })
    .trim()
    .min(2, 'Education level must be at least 2 characters long'),
  cvText: z
    .string({ required_error: 'CV text is required' })
    .trim()
    .min(20, 'CV text must be at least 20 characters long'),
});

const updateCandidateSchema = createCandidateSchema.partial();

module.exports = {
  createCandidateSchema,
  updateCandidateSchema,
};
