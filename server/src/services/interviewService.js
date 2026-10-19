const prisma = require('../utils/prisma');
const InterviewError = require('../errors/InterviewError');
const { INTERVIEW_MODES, INTERVIEW_STATUSES } = require('../constants/interviewConstants');

/**
 * Schedule a new interview linking a candidate and a job offer
 *
 * @param {Object} params - Scheduling parameters
 * @param {string} params.candidateId - UUID of candidate
 * @param {string} params.jobId - UUID of job offer
 * @param {string|Date} params.date - Scheduled ISO date-time string or Date
 * @param {string} params.mode - Interview mode ('in-person' | 'video')
 * @returns {Promise<Object>} Created interview record
 */
const scheduleInterview = async ({ candidateId, jobId, date, mode }) => {
  // Validate mode
  const validModes = Object.values(INTERVIEW_MODES);
  if (!validModes.includes(mode)) {
    throw new InterviewError(
      `Mode must be either '${INTERVIEW_MODES.IN_PERSON}' or '${INTERVIEW_MODES.VIDEO}'.`,
      'INVALID_INTERVIEW_MODE',
      400
    );
  }

  // Validate date format and ensure it is not in the past
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

  // Verify candidate exists
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) {
    throw new InterviewError(
      `Candidate with ID '${candidateId}' does not exist.`,
      'CANDIDATE_NOT_FOUND',
      404
    );
  }

  // Verify job offer exists
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });
  if (!job) {
    throw new InterviewError(
      `Job offer with ID '${jobId}' does not exist.`,
      'JOB_NOT_FOUND',
      404
    );
  }

  // An interview cannot be scheduled on a closed job offer
  if (job.status === 'CLOSED') {
    throw new InterviewError(
      'Cannot schedule an interview on a closed job offer.',
      'JOB_CLOSED',
      400
    );
  }

  // Two planned interviews cannot exist for the same candidate on the same job offer
  const existingPlanned = await prisma.interview.findFirst({
    where: {
      candidateId,
      jobId,
      status: INTERVIEW_STATUSES.PLANNED,
    },
  });

  if (existingPlanned) {
    throw new InterviewError(
      'A planned interview already exists for this candidate on this job offer.',
      'INTERVIEW_DUPLICATE_PLANNED',
      409
    );
  }

  return await prisma.interview.create({
    data: {
      candidateId,
      jobId,
      date: parsedDate,
      mode,
      status: INTERVIEW_STATUSES.PLANNED,
    },
    include: {
      candidate: {
        select: { id: true, name: true, email: true },
      },
      job: {
        select: { id: true, title: true, department: true, status: true },
      },
    },
  });
};

/**
 * Reschedule an existing planned interview to a new date
 *
 * @param {string} id - Interview UUID
 * @param {string|Date} newDate - New scheduled ISO date-time string or Date
 * @returns {Promise<Object>} Updated interview record
 */
const rescheduleInterview = async (id, newDate) => {
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { job: true },
  });

  if (!interview) {
    throw new InterviewError(
      `Interview with ID '${id}' was not found.`,
      'INTERVIEW_NOT_FOUND',
      404
    );
  }

  // Only planned interviews can be rescheduled
  if (interview.status !== INTERVIEW_STATUSES.PLANNED) {
    throw new InterviewError(
      `Cannot reschedule interview with status '${interview.status}'. Only planned interviews can be rescheduled.`,
      'INTERVIEW_NOT_PLANNED',
      400
    );
  }

  // Validate new date
  const parsedDate = new Date(newDate);
  if (isNaN(parsedDate.getTime())) {
    throw new InterviewError(
      'Invalid date format. Expected a valid ISO date-time string.',
      'INVALID_INTERVIEW_DATE',
      400
    );
  }

  if (parsedDate.getTime() < Date.now()) {
    throw new InterviewError(
      'An interview cannot be rescheduled to a date in the past.',
      'INTERVIEW_PAST_DATE',
      400
    );
  }

  // Check if associated job offer is closed
  if (interview.job.status === 'CLOSED') {
    throw new InterviewError(
      'Cannot reschedule an interview on a closed job offer.',
      'JOB_CLOSED',
      400
    );
  }

  return await prisma.interview.update({
    where: { id },
    data: {
      date: parsedDate,
    },
    include: {
      candidate: {
        select: { id: true, name: true, email: true },
      },
      job: {
        select: { id: true, title: true, department: true, status: true },
      },
    },
  });
};

/**
 * Update the status of an existing interview (complete or cancel)
 *
 * @param {string} id - Interview UUID
 * @param {string} newStatus - New status ('completed' | 'cancelled')
 * @returns {Promise<Object>} Updated interview record
 */
const updateInterviewStatus = async (id, newStatus) => {
  const validTransitions = [INTERVIEW_STATUSES.COMPLETED, INTERVIEW_STATUSES.CANCELLED];
  if (!validTransitions.includes(newStatus)) {
    throw new InterviewError(
      `Status must be either '${INTERVIEW_STATUSES.COMPLETED}' or '${INTERVIEW_STATUSES.CANCELLED}'.`,
      'INVALID_INTERVIEW_STATUS',
      400
    );
  }

  const interview = await prisma.interview.findUnique({
    where: { id },
  });

  if (!interview) {
    throw new InterviewError(
      `Interview with ID '${id}' was not found.`,
      'INTERVIEW_NOT_FOUND',
      404
    );
  }

  // Only a planned interview can be completed or cancelled
  if (interview.status !== INTERVIEW_STATUSES.PLANNED) {
    throw new InterviewError(
      `Cannot update status for interview that is already '${interview.status}'. Only planned interviews can be completed or cancelled.`,
      'INTERVIEW_ALREADY_CLOSED',
      400
    );
  }

  return await prisma.interview.update({
    where: { id },
    data: {
      status: newStatus,
    },
    include: {
      candidate: {
        select: { id: true, name: true, email: true },
      },
      job: {
        select: { id: true, title: true, department: true, status: true },
      },
    },
  });
};

/**
 * List all interviews associated with a specific candidate
 *
 * @param {string} candidateId - Candidate UUID
 * @returns {Promise<Array>} List of interview records
 */
const getInterviewsByCandidate = async (candidateId) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    throw new InterviewError(
      `Candidate with ID '${candidateId}' was not found.`,
      'CANDIDATE_NOT_FOUND',
      404
    );
  }

  return await prisma.interview.findMany({
    where: { candidateId },
    orderBy: { date: 'asc' },
    include: {
      job: {
        select: { id: true, title: true, department: true, status: true },
      },
    },
  });
};

/**
 * List all interviews associated with a specific job offer
 *
 * @param {string} jobId - Job offer UUID
 * @returns {Promise<Array>} List of interview records
 */
const getInterviewsByJob = async (jobId) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new InterviewError(
      `Job offer with ID '${jobId}' was not found.`,
      'JOB_NOT_FOUND',
      404
    );
  }

  return await prisma.interview.findMany({
    where: { jobId },
    orderBy: { date: 'asc' },
    include: {
      candidate: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};

/**
 * Get a single interview by ID
 *
 * @param {string} id - Interview UUID
 * @returns {Promise<Object>} Interview record
 */
const getInterviewById = async (id) => {
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      candidate: {
        select: { id: true, name: true, email: true },
      },
      job: {
        select: { id: true, title: true, department: true, status: true },
      },
    },
  });

  if (!interview) {
    throw new InterviewError(
      `Interview with ID '${id}' was not found.`,
      'INTERVIEW_NOT_FOUND',
      404
    );
  }

  return interview;
};

/**
 * Get all interviews with optional filters and pagination
 *
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Paginated interview records
 */
const getInterviews = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.mode) {
    where.mode = query.mode;
  }
  if (query.candidateId) {
    where.candidateId = query.candidateId;
  }
  if (query.jobId) {
    where.jobId = query.jobId;
  }

  const [total, interviews] = await Promise.all([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'asc' },
      include: {
        candidate: {
          select: { id: true, name: true, email: true },
        },
        job: {
          select: { id: true, title: true, department: true, status: true },
        },
      },
    }),
  ]);

  return {
    data: interviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

module.exports = {
  scheduleInterview,
  rescheduleInterview,
  updateInterviewStatus,
  getInterviewsByCandidate,
  getInterviewsByJob,
  getInterviewById,
  getInterviews,
};
