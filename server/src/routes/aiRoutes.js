const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All AI endpoints require authenticated recruiter or admin
router.use(authenticateToken);


const multer = require('multer');

// Configure multer to store uploaded PDF in memory (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Feature: Extract and Parse CV PDF with AI
router.post('/parse-cv', upload.single('cv'), aiController.parseCvPdf);

// Feature 2: Candidate <-> Job matching score & analysis
router.post('/match', aiController.matchCandidateToJob);

// Feature 3: 5 Tailored interview questions
router.post('/questions', aiController.generateInterviewQuestions);

module.exports = router;
