const { ZodError } = require('zod');

/**
 * Middleware factory to validate request parts using a Zod schema
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 * @param {'body' | 'query' | 'params'} target - Request property to validate (default: 'body')
 */
const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed; // assign sanitized/transformed value
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          errors: formattedErrors,
        });
      }
      next(error);
    }
  };
};

module.exports = validate;
