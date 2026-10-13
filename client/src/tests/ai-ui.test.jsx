import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AiSummaryModal from '../components/AiSummaryModal';
import AiMatchModal from '../components/AiMatchModal';
import AiQuestionsModal from '../components/AiQuestionsModal';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('TalentFlow AI UI Modals (Phase 5 - Rules R1, R2, R3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCandidate = {
    id: 'cand-1',
    name: 'Sarah Connor',
    email: 'sarah.connor@cyberdyne.io',
    phone: '+1-555-0199',
    experienceYears: 6,
    skills: 'React, Node.js, TypeScript, PostgreSQL',
  };

  const mockJob = {
    id: 'job-1',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    requiredSkills: 'React, Node.js, SQL',
  };

  describe('AiSummaryModal Component (Feature 1)', () => {
    it('displays loading state and then renders summary and audit drawer', async () => {
      api.post.mockResolvedValueOnce({
        data: {
          feature: 'candidate_summary',
          data: {
            summary:
              'Candidate is an experienced full stack engineer with deep expertise in modern React and Node.js ecosystems. Demonstrates substantial experience architecting scalable backend APIs and responsive user interfaces. Highly proficient in collaborative agile environments.',
            keywords: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
          },
          anonymizationAudit: {
            pseudonym: 'Candidate A',
            removedEmail: 'sarah.connor@cyberdyne.io',
            removedPhone: '+1-555-0199',
            removedName: 'Sarah Connor',
          },
          anonymizedDataSent: {
            identifier: 'Candidate A',
            skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
            experienceYears: 6,
            educationLevel: "Bachelor's Degree",
          },
        },
      });

      render(
        <AiSummaryModal
          isOpen={true}
          onClose={() => {}}
          candidate={mockCandidate}
        />
      );

      // Verify header and R1 badge
      expect(screen.getByText(/AI Candidate Executive Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/Rule R1 PII Anonymization Applied/i)).toBeInTheDocument();

      // Wait for resolved data
      await waitFor(() => {
        expect(screen.getByText(/3-Sentence Professional Assessment/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/deep expertise in modern React and Node.js/i)).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();

      // Inspect Rule R1 drawer
      const inspectAuditBtn = screen.getByText(/Inspect Rule R1 Anonymization Audit/i);
      fireEvent.click(inspectAuditBtn);
      expect(screen.getByText(/Audit Log Token: Candidate A/i)).toBeInTheDocument();
      expect(screen.getByText(/Zero PII Transmitted/i)).toBeInTheDocument();
    });
  });

  describe('AiMatchModal Component (Feature 2)', () => {
    it('renders match score, recommendation, and strengths', async () => {
      api.post.mockResolvedValueOnce({
        data: {
          feature: 'candidate_job_matching',
          data: {
            score: 92,
            strengths: ['Strong full stack alignment', 'Proficient in TypeScript'],
            gaps: ['Limited cloud deployment mentions'],
            recommendation: 'Highly recommended for an initial technical screen.',
          },
          anonymizationAudit: { pseudonym: 'Candidate B' },
          anonymizedDataSent: { identifier: 'Candidate B' },
        },
      });

      render(
        <AiMatchModal
          isOpen={true}
          onClose={() => {}}
          candidate={mockCandidate}
          job={mockJob}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('92')).toBeInTheDocument();
      });

      expect(screen.getByText(/High Fit/i)).toBeInTheDocument();
      expect(screen.getByText(/Highly recommended for an initial technical screen/i)).toBeInTheDocument();
      expect(screen.getByText(/Strong full stack alignment/i)).toBeInTheDocument();
    });
  });

  describe('AiQuestionsModal Component (Feature 3)', () => {
    it('renders 5 tailored questions and category pills', async () => {
      api.post.mockResolvedValueOnce({
        data: {
          feature: 'interview_questions',
          data: {
            questions: [
              {
                question: 'How do you design scalable RESTful APIs with Node.js and Express?',
                category: 'Technical Architecture',
                rationale: 'Assesses backend engineering depth and standard practices.',
              },
              {
                question: 'Explain your approach to state management in large-scale React applications.',
                category: 'Front-End Architecture',
                rationale: 'Evaluates proficiency in modular client-side state handling.',
              },
              {
                question: 'Describe a time you resolved a challenging production incident.',
                category: 'Behavioral & Troubleshooting',
                rationale: 'Tests crisis management and systematic debugging skills.',
              },
              {
                question: 'How do you maintain zero-downtime database migrations with Prisma?',
                category: 'Database & DevOps',
                rationale: 'Validates production reliability skills.',
              },
              {
                question: 'How do you conduct code reviews and mentor junior teammates?',
                category: 'Team Collaboration',
                rationale: 'Evaluates engineering culture and mentorship.',
              },
            ],
          },
          anonymizationAudit: { pseudonym: 'Candidate C' },
          anonymizedDataSent: { identifier: 'Candidate C' },
        },
      });

      render(
        <AiQuestionsModal
          isOpen={true}
          onClose={() => {}}
          applicationId="app-1"
          candidate={mockCandidate}
          job={mockJob}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/5 Questions Ready/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/How do you design scalable RESTful APIs/i)).toBeInTheDocument();
      expect(screen.getByText('Technical Architecture')).toBeInTheDocument();
    });
  });
});
