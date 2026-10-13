import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusChart from '../components/StatusChart';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';

describe('TalentFlow Front-End CRUD UI Components (Phase 4)', () => {
  describe('StatusChart Component', () => {
    it('renders all pipeline stages with counts properly', () => {
      const sampleBreakdown = {
        NEW: 5,
        SCREENING: 3,
        INTERVIEW: 2,
        OFFER: 1,
        REJECTED: 4,
      };

      render(<StatusChart breakdown={sampleBreakdown} />);

      expect(screen.getByText(/Application Pipeline Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/15 Total Submissions/i)).toBeInTheDocument();
      expect(screen.getByText(/New Applications/i)).toBeInTheDocument();
      expect(screen.getByText(/AI & Initial Screening/i)).toBeInTheDocument();
      expect(screen.getByText(/Technical Interview/i)).toBeInTheDocument();
      expect(screen.getByText(/Job Offer Extended/i)).toBeInTheDocument();
      expect(screen.getByText(/Archived \/ Rejected/i)).toBeInTheDocument();
    });
  });

  describe('Pagination Component', () => {
    it('renders page info and fires page change callback', () => {
      const handlePageChange = vi.fn();
      const pagination = {
        page: 2,
        totalPages: 5,
        total: 45,
        limit: 10,
      };

      render(<Pagination pagination={pagination} onPageChange={handlePageChange} />);

      expect(screen.getByText(/Showing/i)).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();

      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);
      expect(handlePageChange).toHaveBeenCalledWith(3);
    });

    it('returns null if totalPages <= 1', () => {
      const { container } = render(
        <Pagination pagination={{ page: 1, totalPages: 1, total: 3, limit: 10 }} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Modal Component', () => {
    it('renders when isOpen is true and calls onClose when clicking close', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Dialog">
          <div>Modal Body Content</div>
        </Modal>
      );

      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal Body Content')).toBeInTheDocument();

      const closeBtn = screen.getByRole('button');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });

    it('does not render when isOpen is false', () => {
      const { container } = render(
        <Modal isOpen={false} onClose={() => {}} title="Test Dialog">
          <div>Modal Body Content</div>
        </Modal>
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
