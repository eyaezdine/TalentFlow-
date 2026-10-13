import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import AiMatchModal from '../components/AiMatchModal';
import AiQuestionsModal from '../components/AiQuestionsModal';
import {
  GitPullRequest,
  Plus,
  Filter,
  User,
  Briefcase,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

const PIPELINE_COLUMNS = [
  { id: 'NEW', label: 'New', color: 'border-blue-500', badge: 'bg-blue-50 text-blue-700' },
  { id: 'SCREENING', label: 'Screening', color: 'border-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
  { id: 'INTERVIEW', label: 'Interview', color: 'border-purple-500', badge: 'bg-purple-50 text-purple-700' },
  { id: 'OFFER', label: 'Offer', color: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  { id: 'REJECTED', label: 'Rejected', color: 'border-slate-400', badge: 'bg-slate-100 text-slate-600' },
];

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJobFilter, setSelectedJobFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedAppForNotes, setSelectedAppForNotes] = useState(null);
  const [notesInput, setNotesInput] = useState('');

  // AI Modal states
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [selectedAiCandidate, setSelectedAiCandidate] = useState(null);
  const [selectedAiJob, setSelectedAiJob] = useState(null);
  const [selectedAiAppId, setSelectedAiAppId] = useState(null);

  const [createForm, setCreateForm] = useState({
    candidateId: '',
    jobId: '',
    status: 'NEW',
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', 100);
      if (selectedJobFilter) params.append('jobId', selectedJobFilter);

      const [appsRes, jobsRes, candidatesRes] = await Promise.all([
        api.get(`/applications?${params.toString()}`),
        api.get('/jobs?limit=50'),
        api.get('/candidates?limit=50'),
      ]);

      setApplications(appsRes.data.data);
      setJobs(jobsRes.data.data);
      setCandidates(candidatesRes.data.data);
    } catch (err) {
      console.error('Failed to load application pipeline data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedJobFilter]);

  const handleOpenCreateModal = () => {
    setCreateForm({
      candidateId: candidates[0]?.id || '',
      jobId: jobs[0]?.id || '',
      status: 'NEW',
      notes: '',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!createForm.candidateId || !createForm.jobId) {
      setFormError('Please select both a candidate and a job opening.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/applications', createForm);
      setSuccessMessage('Application linked successfully!');
      setIsCreateModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setFormError(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransitionStatus = async (appId, newStatus) => {
    try {
      await api.put(`/applications/${appId}/status`, { status: newStatus });
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      );
    } catch (err) {
      alert(err.message || 'Failed to update application status.');
    }
  };

  const handleOpenNotesModal = (app) => {
    setSelectedAppForNotes(app);
    setNotesInput(app.notes || '');
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedAppForNotes) return;
    try {
      setSubmitting(true);
      await api.put(`/applications/${selectedAppForNotes.id}/status`, {
        notes: notesInput,
      });
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selectedAppForNotes.id ? { ...app, notes: notesInput } : app
        )
      );
      setIsNotesModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to update notes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Recruitment Kanban Pipeline
          </h1>
          <p className="text-sm text-slate-500">
            Track candidates across stages from initial review to final offer
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-500/25 hover:bg-brand-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Link Application</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filter by Job Opening:</span>
          <select
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 px-3 text-xs font-medium text-slate-700 outline-none focus:border-brand-500 focus:bg-white"
          >
            <option value="">All Job Openings ({jobs.length})</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.department})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500 hidden sm:block">
          Total Candidates in Pipeline: <span className="text-brand-600">{applications.length}</span>
        </div>
      </div>

      {/* Kanban Board (5 Columns) */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {PIPELINE_COLUMNS.map((column) => {
            const columnApps = applications.filter((app) => app.status === column.id);

            return (
              <div
                key={column.id}
                className={`flex flex-col rounded-2xl border-t-4 border-slate-200 bg-slate-100/70 p-3 min-h-[500px] ${column.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {column.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${column.badge}`}>
                      {columnApps.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnApps.length === 0 ? (
                    <div className="flex items-center justify-center h-28 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                      Empty stage
                    </div>
                  ) : (
                    columnApps.map((app) => (
                      <div
                        key={app.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:shadow transition space-y-2.5"
                      >
                        {/* Candidate & Job info */}
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              {app.candidate?.name}
                            </h4>
                            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded shrink-0">
                              {app.candidate?.experienceYears}y
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                            {app.job?.title}
                          </p>
                        </div>

                        {/* Candidate Skills preview */}
                        {app.candidate?.skills && (
                          <div className="flex flex-wrap gap-1">
                            {app.candidate.skills.split(',').slice(0, 2).map((s, i) => (
                              <span
                                key={i}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 truncate max-w-[100px]"
                              >
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Notes preview */}
                        {app.notes && (
                          <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 italic line-clamp-2">
                            "{app.notes}"
                          </p>
                        )}

                        {/* Stage Transition & AI Controls */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedAiCandidate(app.candidate);
                                setSelectedAiJob(app.job);
                                setIsMatchModalOpen(true);
                              }}
                              className="p-1 rounded-md border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 transition"
                              title="Run AI Candidate-Job Match"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAiAppId(app.id);
                                setSelectedAiCandidate(app.candidate);
                                setSelectedAiJob(app.job);
                                setIsQuestionsModalOpen(true);
                              }}
                              className="p-1 rounded-md border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                              title="Generate 5 Tailored Interview Questions"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenNotesModal(app)}
                              className="p-1 rounded-md border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
                              title="Edit application notes"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <select
                            value={app.status}
                            onChange={(e) => handleTransitionStatus(app.id, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 outline-none focus:border-brand-500"
                          >
                            <option value="NEW">New</option>
                            <option value="SCREENING">Screening</option>
                            <option value="INTERVIEW">Interview</option>
                            <option value="OFFER">Offer</option>
                            <option value="REJECTED">Reject</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link Application Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Submit Candidate Application"
      >
        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateApplication} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Select Candidate *
            </label>
            <select
              required
              value={createForm.candidateId}
              onChange={(e) => setCreateForm({ ...createForm, candidateId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email} - {c.experienceYears}y exp)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Select Target Job Opening *
            </label>
            <select
              required
              value={createForm.jobId}
              onChange={(e) => setCreateForm({ ...createForm, jobId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Job Opening --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.department} - {j.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Initial Pipeline Stage
            </label>
            <select
              value={createForm.status}
              onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
            >
              <option value="NEW">NEW</option>
              <option value="SCREENING">SCREENING</option>
              <option value="INTERVIEW">INTERVIEW</option>
              <option value="OFFER">OFFER</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Recruiter Notes (optional)
            </label>
            <textarea
              rows={3}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="Candidate referred by engineering lead, strong in React..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/25 hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Link Application</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Recruiter Notes Modal */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title="Application Notes & Comments"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Internal recruiter notes for applicant{' '}
            <span className="font-bold text-slate-800">
              {selectedAppForNotes?.candidate?.name}
            </span>
          </p>

          <textarea
            rows={4}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Add internal feedback, interview times, or screening takeaways..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none focus:border-brand-500 leading-relaxed"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNotesModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition"
            >
              {submitting ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* AI Candidate-Job Match Modal (Feature 2) */}
      <AiMatchModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        candidate={selectedAiCandidate}
        job={selectedAiJob}
      />

      {/* AI Interview Questions Modal (Feature 3) */}
      <AiQuestionsModal
        isOpen={isQuestionsModalOpen}
        onClose={() => setIsQuestionsModalOpen(false)}
        applicationId={selectedAiAppId}
        candidate={selectedAiCandidate}
        job={selectedAiJob}
      />
    </div>
  );
};

export default Applications;
