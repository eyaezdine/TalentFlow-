const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All AI endpoints require authenticated recruiter or admin
router.use(authenticateToken);

// Feature 1: Candidate 3-sentence summary & keywords
router.post('/summary', aiController.generateCandidateSummary);

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

// Feature 4: In-interview rapid notes polish & scorecard synthesis
router.post('/polish-notes', aiController.polishInterviewNotes);

// Feature 5: AI Job Offer Generation
router.post('/job-offer/generate', aiController.generateJobOffer);

module.exports = router;
