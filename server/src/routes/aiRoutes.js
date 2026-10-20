const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All AI endpoints require authenticated recruiter or admin
router.use(authenticateToken);


// Feature 2: Candidate <-> Job matching score & analysis
router.post('/match', aiController.matchCandidateToJob);

// Feature 3: 5 Tailored interview questions
router.post('/questions', aiController.generateInterviewQuestions);

module.exports = router;
