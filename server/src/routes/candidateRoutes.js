const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createCandidateSchema, updateCandidateSchema } = require('../validators/candidateValidator');

// All Candidate routes require authentication
router.use(authenticateToken);

// CRUD routes
router.get('/', candidateController.getCandidates);
router.get('/:id', candidateController.getCandidateById);
router.post('/', validate(createCandidateSchema), candidateController.createCandidate);
router.put('/:id', validate(updateCandidateSchema), candidateController.updateCandidate);
router.delete('/:id', requireRole('ADMIN'), candidateController.deleteCandidate);

module.exports = router;
