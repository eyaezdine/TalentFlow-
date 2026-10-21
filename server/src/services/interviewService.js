const prisma = require('../utils/prisma');
const InterviewError = require('../errors/InterviewError');
const { INTERVIEW_MODES, INTERVIEW_STATUSES } = require('../constants/interviewConstants');

/**
 * Schedule a new interview linking a candidate and a job offer.
 * Also automatically moves the linked Application to INTERVIEW stage if it exists.
 */
const scheduleInterview = async ({ candidateId, jobId, date, mode, interviewerName }) => {
  const validModes = Object.values(INTERVIEW_MODES);
  if (!validModes.includes(mode)) {
    throw new InterviewError(
      `Mode must be either '${INTERVIEW_MODES.IN_PERSON}' or '${INTERVIEW_MODES.VIDEO}'.`,
      'INVALID_INTERVIEW_MODE',
      400
    );
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new InterviewError(
      'Invalid date format. Expected a valid ISO date-time string.',
      'INVALID_INTERVIEW_DATE',
      400
    );
  }

  if (parsedDate.getTime() < Date.now()) {
    throw new InterviewError(
      'An interview cannot be scheduled in the past.',
      'INTERVIEW_PAST_DATE',
      400
    );
  }

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new InterviewError(
      `Candidate with ID '${candidateId}' does not exist.`,
      'CANDIDATE_NOT_FOUND',
      404
    );
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new InterviewError(
      `Job offer with ID '${jobId}' does not exist.`,
      'JOB_NOT_FOUND',
      404
    );
  }

  if (job.status === 'CLOSED') {
    throw new InterviewError(
      'Cannot schedule an interview on a closed job offer.',
      'JOB_CLOSED',
      400
    );
  }

  // Duplicate check: one planned interview per candidate+job
  const existingPlanned = await prisma.interview.findFirst({
    where: { candidateId, jobId, status: INTERVIEW_STATUSES.PLANNED },
  });

  if (existingPlanned) {
    throw new InterviewError(
      'A planned interview already exists for this candidate on this job offer.',
      'INTERVIEW_DUPLICATE_PLANNED',
      409
    );
  }

  const interview = await prisma.interview.create({
    data: {
      candidateId,
      jobId,
      date: parsedDate,
      mode,
      status: INTERVIEW_STATUSES.PLANNED,
      interviewerName: interviewerName || null,
    },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, title: true, department: true, status: true } },
    },
  });

  // Auto-sync: move the linked Application to INTERVIEW stage if it is in NEW or SCREENING
  try {
    const linkedApp = await prisma.application.findUnique({
      where: { candidateId_jobId: { candidateId, jobId } },
    });
    if (linkedApp && ['NEW', 'SCREENING'].includes(linkedApp.status)) {
      await prisma.application.update({
        where: { candidateId_jobId: { candidateId, jobId } },
        data: { status: 'INTERVIEW' },
      });
    }
  } catch (_) {
    // Non-fatal: application link may not exist yet
  }

  return interview;
};

/**
 * Reschedule an existing planned interview to a new date
 */
const rescheduleInterview = async (id, newDate) => {
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { job: true },
  });

  if (!interview) {
    throw new InterviewError(`Interview with ID '${id}' was not found.`, 'INTERVIEW_NOT_FOUND', 404);
  }

  if (interview.status !== INTERVIEW_STATUSES.PLANNED) {
    throw new InterviewError(
      `Cannot reschedule interview with status '${interview.status}'. Only planned interviews can be rescheduled.`,
      'INTERVIEW_NOT_PLANNED',
      400
    );
  }

  const parsedDate = new Date(newDate);
  if (isNaN(parsedDate.getTime())) {
    throw new InterviewError('Invalid date format.', 'INVALID_INTERVIEW_DATE', 400);
  }

  if (parsedDate.getTime() < Date.now()) {
    throw new InterviewError(
      'An interview cannot be rescheduled to a date in the past.',
      'INTERVIEW_PAST_DATE',
      400
    );
  }

  if (interview.job.status === 'CLOSED') {
    throw new InterviewError('Cannot reschedule an interview on a closed job offer.', 'JOB_CLOSED', 400);
  }

  return await prisma.interview.update({
    where: { id },
    data: { date: parsedDate },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, title: true, department: true, status: true } },
    },
  });
};

/**
 * Update interview status (complete or cancel).
 * Accepts optional notes written at the time of closing.
 */
const updateInterviewStatus = async (id, newStatus, notes) => {
  const validTransitions = [INTERVIEW_STATUSES.COMPLETED, INTERVIEW_STATUSES.CANCELLED];
  if (!validTransitions.includes(newStatus)) {
    throw new InterviewError(
      `Status must be either '${INTERVIEW_STATUSES.COMPLETED}' or '${INTERVIEW_STATUSES.CANCELLED}'.`,
      'INVALID_INTERVIEW_STATUS',
      400
    );
  }

  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) {
    throw new InterviewError(`Interview with ID '${id}' was not found.`, 'INTERVIEW_NOT_FOUND', 404);
  }

  if (interview.status !== INTERVIEW_STATUSES.PLANNED) {
    throw new InterviewError(
      `Cannot update status for interview that is already '${interview.status}'.`,
      'INTERVIEW_ALREADY_CLOSED',
      400
    );
  }

  return await prisma.interview.update({
    where: { id },
    data: {
      status: newStatus,
      ...(notes !== undefined && { notes }),
    },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, title: true, department: true, status: true } },
    },
  });
};

/**
 * Update notes on any interview (planned, completed, or cancelled)
 */
const updateInterviewNotes = async (id, notes) => {
  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) {
    throw new InterviewError(`Interview with ID '${id}' was not found.`, 'INTERVIEW_NOT_FOUND', 404);
  }

  return await prisma.interview.update({
    where: { id },
    data: { notes },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, title: true, department: true, status: true } },
    },
  });
};

/**
 * Delete an interview record permanently
 */
const deleteInterview = async (id) => {
  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview) {
    throw new InterviewError(`Interview with ID '${id}' was not found.`, 'INTERVIEW_NOT_FOUND', 404);
  }

  await prisma.interview.delete({ where: { id } });
  return { id, deleted: true };
};

/**
 * List all interviews associated with a specific candidate
 */
const getInterviewsByCandidate = async (candidateId) => {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) {
    throw new InterviewError(`Candidate with ID '${candidateId}' was not found.`, 'CANDIDATE_NOT_FOUND', 404);
  }

  return await prisma.interview.findMany({
    where: { candidateId },
    orderBy: { date: 'asc' },
    include: { job: { select: { id: true, title: true, department: true, status: true } } },
  });
};

/**
 * List all interviews associated with a specific job offer
 */
const getInterviewsByJob = async (jobId) => {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new InterviewError(`Job offer with ID '${jobId}' was not found.`, 'JOB_NOT_FOUND', 404);
  }

  return await prisma.interview.findMany({
    where: { jobId },
    orderBy: { date: 'asc' },
    include: { candidate: { select: { id: true, name: true, email: true } } },
  });
};

/**
 * Get a single interview by ID
 */
const getInterviewById = async (id) => {
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: { select: { id: true, name: true, email: true } },
      job: { select: { id: true, title: true, department: true, status: true } },
    },
  });

  if (!interview) {
    throw new InterviewError(`Interview with ID '${id}' was not found.`, 'INTERVIEW_NOT_FOUND', 404);
  }

  return interview;
};

/**
 * Get all interviews with optional filters and pagination
 */
const getInterviews = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status) where.status = query.status;
  if (query.mode) where.mode = query.mode;
  if (query.candidateId) where.candidateId = query.candidateId;
  if (query.jobId) where.jobId = query.jobId;

  const [total, interviews] = await Promise.all([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'asc' },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        job: { select: { id: true, title: true, department: true, status: true } },
      },
    }),
  ]);

  return {
    data: interviews,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
  };
};

module.exports = {
  scheduleInterview,
  rescheduleInterview,
  updateInterviewStatus,
  updateInterviewNotes,
  deleteInterview,
  getInterviewsByCandidate,
  getInterviewsByJob,
  getInterviewById,
  getInterviews,
};
