const prisma = require('../utils/prisma');

/**
 * Get all job offers with search, filter, and pagination
 * GET /api/jobs
 */
const getJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { search, status, department } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = { contains: department };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { requiredSkills: { contains: search } },
        { location: { contains: search } },
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { applications: true },
          },
        },
      }),
    ]);

    res.status(200).json({
      data: jobs,
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
 * Get a single job offer by ID
 * GET /api/jobs/:id
 */
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
            candidate: {
              select: {
                id: true,
                name: true,
                email: true,
                experienceYears: true,
                skills: true,
                educationLevel: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        code: 'JOB_NOT_FOUND',
        message: `Job offer with ID '${id}' was not found.`,
      });
    }

    res.status(200).json({ data: job });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new job offer
 * POST /api/jobs
 */
const createJob = async (req, res, next) => {
  try {
    const { title, department, location, description, requiredSkills, status } = req.body;

    const job = await prisma.job.create({
      data: {
        title,
        department: department || 'Engineering',
        location: location || 'Remote',
        description,
        requiredSkills,
        status: status || 'OPEN',
      },
    });

    res.status(201).json({
      message: 'Job offer created successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing job offer
 * PUT /api/jobs/:id
 */
const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      return res.status(404).json({
        code: 'JOB_NOT_FOUND',
        message: `Job offer with ID '${id}' was not found.`,
      });
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: req.body,
    });

    res.status(200).json({
      message: 'Job offer updated successfully',
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a job offer
 * DELETE /api/jobs/:id
 */
const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      return res.status(404).json({
        code: 'JOB_NOT_FOUND',
        message: `Job offer with ID '${id}' was not found.`,
      });
    }

    await prisma.job.delete({ where: { id } });

    res.status(200).json({
      message: 'Job offer deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
};
