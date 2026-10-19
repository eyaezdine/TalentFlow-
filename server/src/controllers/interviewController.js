const interviewService = require('../services/interviewService');

/**
 * Schedule a new interview
 * POST /api/interviews
 */
const scheduleInterview = async (req, res, next) => {
  try {
    const interview = await interviewService.scheduleInterview(req.body);
    res.status(201).json({
      message: 'Interview scheduled successfully',
      data: interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reschedule an existing interview to a new date
 * PUT /api/interviews/:id/reschedule
 */
const rescheduleInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    const updated = await interviewService.rescheduleInterview(id, date);
    res.status(200).json({
      message: 'Interview rescheduled successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update interview status (complete or cancel)
 * PUT /api/interviews/:id/status
 */
const updateInterviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await interviewService.updateInterviewStatus(id, status);
    res.status(200).json({
      message: `Interview marked as ${status} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all interviews with pagination and filtering
 * GET /api/interviews
 */
const getInterviews = async (req, res, next) => {
  try {
    const result = await interviewService.getInterviews(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get interview by ID
 * GET /api/interviews/:id
 */
const getInterviewById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interview = await interviewService.getInterviewById(id);
    res.status(200).json({ data: interview });
  } catch (error) {
    next(error);
  }
};

/**
 * List all interviews of a candidate
 * GET /api/interviews/candidate/:candidateId
 */
const getInterviewsByCandidate = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const interviews = await interviewService.getInterviewsByCandidate(candidateId);
    res.status(200).json({ data: interviews });
  } catch (error) {
    next(error);
  }
};

/**
 * List all interviews of a job offer
 * GET /api/interviews/job/:jobId
 */
const getInterviewsByJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const interviews = await interviewService.getInterviewsByJob(jobId);
    res.status(200).json({ data: interviews });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scheduleInterview,
  rescheduleInterview,
  updateInterviewStatus,
  getInterviews,
  getInterviewById,
  getInterviewsByCandidate,
  getInterviewsByJob,
};
