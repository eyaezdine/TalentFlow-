const prisma = require('../utils/prisma');

/**
 * Get all applications with search, filter, and pagination
 * GET /api/applications
 */
const getApplications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { status, jobId, candidateId } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    if (candidateId) {
      where.candidateId = candidateId;
    }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              experienceYears: true,
              skills: true,
              educationLevel: true,
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              location: true,
              status: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      data: applications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single application by ID
 * GET /api/applications/:id
 */
const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        job: true,
      },
    });

    if (!application) {
      return res.status(404).json({
        code: 'APPLICATION_NOT_FOUND',
        message: `Application with ID '${id}' was not found.`,
      });
    }

    res.status(200).json({ data: application });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new application (Link candidate <-> job)
 * POST /api/applications
 */
const createApplication = async (req, res, next) => {
  try {
    const { candidateId, jobId, status, notes } = req.body;

    // Verify candidate exists
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      return res.status(404).json({
        code: 'CANDIDATE_NOT_FOUND',
        message: `Candidate with ID '${candidateId}' does not exist.`,
      });
    }

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({
        code: 'JOB_NOT_FOUND',
        message: `Job offer with ID '${jobId}' does not exist.`,
      });
    }

    // Check if candidate already applied for this job
    const existingApplication = await prisma.application.findUnique({
      where: {
        candidateId_jobId: {
          candidateId,
          jobId,
        },
      },
    });

    if (existingApplication) {
      return res.status(409).json({
        code: 'APPLICATION_ALREADY_EXISTS',
        message: 'This candidate has already applied for this job offer.',
      });
    }

    const application = await prisma.application.create({
      data: {
        candidateId,
        jobId,
        status: status || 'NEW',
        notes: notes || null,
      },
      include: {
        candidate: {
          select: { id: true, name: true, email: true },
        },
        job: {
          select: { id: true, title: true, department: true },
        },
      },
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update application pipeline status or notes
 * PUT /api/applications/:id
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        code: 'APPLICATION_NOT_FOUND',
        message: `Application with ID '${id}' was not found.`,
      });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        candidate: {
          select: { id: true, name: true, email: true },
        },
        job: {
          select: { id: true, title: true, department: true },
        },
      },
    });

    res.status(200).json({
      message: 'Application updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an application
 * DELETE /api/applications/:id
 */
const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        code: 'APPLICATION_NOT_FOUND',
        message: `Application with ID '${id}' was not found.`,
      });
    }

    await prisma.application.delete({ where: { id } });

    res.status(200).json({
      message: 'Application deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recruitment dashboard aggregated counters and metrics
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [totalJobs, openJobs, totalCandidates, totalApplications, statusCounts, recentApplications] =
      await Promise.all([
        prisma.job.count(),
        prisma.job.count({ where: { status: 'OPEN' } }),
        prisma.candidate.count(),
        prisma.application.count(),
        prisma.application.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        prisma.application.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            job: { select: { id: true, title: true } },
          },
        }),
      ]);

    // Format pipeline status breakdown mapping all 5 required statuses
    const pipelineBreakdown = {
      NEW: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
    };

    statusCounts.forEach((item) => {
      pipelineBreakdown[item.status] = item._count.status;
    });

    res.status(200).json({
      data: {
        counters: {
          totalJobs,
          openJobs,
          totalCandidates,
          totalApplications,
        },
        pipelineBreakdown,
        recentApplications,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  getDashboardStats,
};
