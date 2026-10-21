const interviewService = require('../services/interviewService');

/** POST /api/interviews — Schedule a new interview */
const scheduleInterview = async (req, res, next) => {
  try {
    const interview = await interviewService.scheduleInterview(req.body);
    res.status(201).json({ message: 'Interview scheduled successfully', data: interview });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/interviews/:id/reschedule — Move to a new date */
const rescheduleInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.body;
    const updated = await interviewService.rescheduleInterview(id, date);
    res.status(200).json({ message: 'Interview rescheduled successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/interviews/:id/status — Mark as completed or cancelled (with optional notes) */
const updateInterviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updated = await interviewService.updateInterviewStatus(id, status, notes);
    res.status(200).json({ message: `Interview marked as ${status} successfully`, data: updated });
  } catch (error) {
    next(error);
  }
};

/** PUT /api/interviews/:id/notes — Add/edit notes on any interview */
const updateInterviewNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const updated = await interviewService.updateInterviewNotes(id, notes);
    res.status(200).json({ message: 'Interview notes updated', data: updated });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/interviews/:id — Remove an interview record */
const deleteInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await interviewService.deleteInterview(id);
    res.status(200).json({ message: 'Interview deleted successfully', ...result });
  } catch (error) {
    next(error);
  }
};

/** GET /api/interviews — List all with filters */
const getInterviews = async (req, res, next) => {
  try {
    const result = await interviewService.getInterviews(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/** GET /api/interviews/:id — Single interview */
const getInterviewById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interview = await interviewService.getInterviewById(id);
    res.status(200).json({ data: interview });
  } catch (error) {
    next(error);
  }
};

/** GET /api/interviews/candidate/:candidateId */
const getInterviewsByCandidate = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const interviews = await interviewService.getInterviewsByCandidate(candidateId);
    res.status(200).json({ data: interviews });
  } catch (error) {
    next(error);
  }
};

/** GET /api/interviews/job/:jobId */
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
  updateInterviewNotes,
  deleteInterview,
  getInterviews,
  getInterviewById,
  getInterviewsByCandidate,
  getInterviewsByJob,
};
