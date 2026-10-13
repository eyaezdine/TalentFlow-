const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  createApplicationSchema,
  updateApplicationStatusSchema,
} = require('../validators/applicationValidator');

// All Application routes require authentication
router.use(authenticateToken);

// Pipeline & CRUD routes
router.get('/', applicationController.getApplications);
router.get('/:id', applicationController.getApplicationById);
router.post('/', validate(createApplicationSchema), applicationController.createApplication);
router.put(
  '/:id/status',
  validate(updateApplicationStatusSchema),
  applicationController.updateApplicationStatus
);
router.delete('/:id', requireRole('ADMIN'), applicationController.deleteApplication);

module.exports = router;
