const prisma = require('../utils/prisma');

/**
 * Get all candidates with search, filter, and pagination
 * GET /api/candidates
 */
const getCandidates = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { search, minExperience, educationLevel } = req.query;

    const where = {};

    if (minExperience !== undefined && minExperience !== '') {
      where.experienceYears = { gte: parseInt(minExperience) || 0 };
    }

    if (educationLevel) {
      where.educationLevel = { contains: educationLevel };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { skills: { contains: search } },
        { educationLevel: { contains: search } },
      ];
    }

    const [total, candidates] = await Promise.all([
      prisma.candidate.count({ where }),
      prisma.candidate.findMany({
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
      data: candidates,
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
 * Get a single candidate by ID with applications
 * GET /api/candidates/:id
 */
const getCandidateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        applications: {
          include: {
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
        },
      },
    });

    if (!candidate) {
      return res.status(404).json({
        code: 'CANDIDATE_NOT_FOUND',
        message: `Candidate with ID '${id}' was not found.`,
      });
    }

    res.status(200).json({ data: candidate });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new candidate profile
 * POST /api/candidates
 */
const createCandidate = async (req, res, next) => {
  try {
    const { name, email, phone, experienceYears, skills, educationLevel, cvText } = req.body;

    // Check for existing candidate with same email
    const existing = await prisma.candidate.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'A candidate with this email address already exists.',
      });
    }

    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone,
        experienceYears: experienceYears || 0,
        skills,
        educationLevel,
        cvText,
      },
    });

    res.status(201).json({
      message: 'Candidate profile created successfully',
      data: candidate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update candidate profile
 * PUT /api/candidates/:id
 */
const updateCandidate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const existingCandidate = await prisma.candidate.findUnique({ where: { id } });
    if (!existingCandidate) {
      return res.status(404).json({
        code: 'CANDIDATE_NOT_FOUND',
        message: `Candidate with ID '${id}' was not found.`,
      });
    }

    // Check if new email conflicts with another candidate
    if (email && email !== existingCandidate.email) {
      const emailTaken = await prisma.candidate.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Another candidate already uses this email address.',
        });
      }
    }

    const updatedCandidate = await prisma.candidate.update({
      where: { id },
      data: req.body,
    });

    res.status(200).json({
      message: 'Candidate profile updated successfully',
      data: updatedCandidate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete candidate profile
 * DELETE /api/candidates/:id
 */
const deleteCandidate = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingCandidate = await prisma.candidate.findUnique({ where: { id } });
    if (!existingCandidate) {
      return res.status(404).json({
        code: 'CANDIDATE_NOT_FOUND',
        message: `Candidate with ID '${id}' was not found.`,
      });
    }

    await prisma.candidate.delete({ where: { id } });

    res.status(200).json({
      message: 'Candidate profile deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  deleteCandidate,
};
