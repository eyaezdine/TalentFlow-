/**
 * Interview Module Constants
 * Defines allowed interview modes and lifecycle statuses
 */

const INTERVIEW_MODES = Object.freeze({
  IN_PERSON: 'in-person',
  VIDEO: 'video',
});

const INTERVIEW_STATUSES = Object.freeze({
  PLANNED: 'planned',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

module.exports = {
  INTERVIEW_MODES,
  INTERVIEW_STATUSES,
};
