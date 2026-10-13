const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createJobSchema, updateJobSchema } = require('../validators/jobValidator');

// All Job routes require authentication
router.use(authenticateToken);

// CRUD routes
router.get('/', jobController.getJobs);
router.get('/:id', jobController.getJobById);
router.post('/', validate(createJobSchema), jobController.createJob);
router.put('/:id', validate(updateJobSchema), jobController.updateJob);
router.delete('/:id', requireRole('ADMIN'), jobController.deleteJob);

module.exports = router;
