const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Dashboard metrics requires authentication
router.use(authenticateToken);

router.get('/stats', applicationController.getDashboardStats);

module.exports = router;
