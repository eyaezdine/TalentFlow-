/**
 * Dedicated business exception for interview-related domain errors
 */
class InterviewError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {string} [code='INTERVIEW_ERROR'] - Machine-readable error code
   * @param {number} [statusCode=400] - Associated HTTP status code
   */
  constructor(message, code = 'INTERVIEW_ERROR', statusCode = 400) {
    super(message);
    this.name = 'InterviewError';
    this.code = code;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InterviewError);
    }
  }
}

module.exports = InterviewError;
