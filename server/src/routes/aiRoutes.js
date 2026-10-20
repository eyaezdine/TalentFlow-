const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All AI endpoints require authenticated recruiter or admin
router.use(authenticateToken);

// Feature 1: Candidate 3-sentence summary & keywords
router.post('/summary', aiController.generateCandidateSummary);

// Feature 2: Candidate <-> Job matching score & analysis
router.post('/match', aiController.matchCandidateToJob);

// Feature 3: 5 Tailored interview questions
router.post('/questions', aiController.generateInterviewQuestions);

// Feature 4: AI Job Offer Generation
router.post('/job-offer/generate', aiController.generateJobOffer);

module.exports = router;
