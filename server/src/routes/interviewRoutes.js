const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const { authenticateToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  scheduleInterviewSchema,
  rescheduleInterviewSchema,
  updateInterviewStatusSchema,
} = require('../validators/interviewValidator');

// All interview routes require authentication
router.use(authenticateToken);

// Query and schedule interviews
router.get('/', interviewController.getInterviews);
router.post('/', validate(scheduleInterviewSchema), interviewController.scheduleInterview);

// Candidate and Job specific interview lists
router.get('/candidate/:candidateId', interviewController.getInterviewsByCandidate);
router.get('/job/:jobId', interviewController.getInterviewsByJob);

// Single interview management
router.get('/:id', interviewController.getInterviewById);
router.put(
  '/:id/reschedule',
  validate(rescheduleInterviewSchema),
  interviewController.rescheduleInterview
);
router.put(
  '/:id/status',
  validate(updateInterviewStatusSchema),
  interviewController.updateInterviewStatus
);

module.exports = router;
