import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from '../components/Modal';
import {
  Calendar,
  Plus,
  Video,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarClock,
  Building,
  User,
  AlertCircle,
  Loader2,
  Filter,
  Trash2,
  MessageSquare,
  UserCheck,
  Play,
  Sparkles,
} from 'lucide-react';
import InterviewConsole from '../components/InterviewConsole';

// Returns datetime-local min string = now (prevents past date selection)
const getNowLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const Interviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  // Schedule Modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    candidateId: '',
    jobId: '',
    date: '',
    mode: 'video',
    interviewerName: '',
  });
  const [scheduleError, setScheduleError] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Reschedule Modal
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Notes Modal (works on any interview regardless of status)
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesInterview, setNotesInterview] = useState(null);
  const [notesInput, setNotesInput] = useState('');
  const [submittingNotes, setSubmittingNotes] = useState(false);

  // Complete Modal (mark as done + capture feedback at the same time)
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [completeInterview, setCompleteInterview] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [submittingComplete, setSubmittingComplete] = useState(false);
  const [polishingInModal, setPolishingInModal] = useState(false);

  // Live Interview Console
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [consoleInterview, setConsoleInterview] = useState(null);

  const [actionSuccess, setActionSuccess] = useState('');

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (modeFilter) params.append('mode', modeFilter);
      params.append('limit', 100);
      const res = await api.get(`/interviews?${params.toString()}`);
      setInterviews(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidatesAndJobs = async () => {
    try {
      const [candRes, jobRes] = await Promise.all([
        api.get('/candidates?limit=100'),
        api.get('/jobs?limit=100'),
      ]);
      setCandidates(candRes.data.data || []);
      setJobs(jobRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch candidates/jobs for modal:', err);
    }
  };

  useEffect(() => { fetchInterviews(); }, [statusFilter, modeFilter]);
  useEffect(() => { fetchCandidatesAndJobs(); }, []);

  // ── Schedule ──────────────────────────────────────────────
  const handleOpenSchedule = () => {
    setScheduleData({
      candidateId: candidates[0]?.id || '',
      jobId: jobs.find((j) => j.status === 'OPEN')?.id || jobs[0]?.id || '',
      date: '',
      mode: 'video',
      interviewerName: '',
    });
    setScheduleError('');
    setIsScheduleOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setScheduleError('');
    setSubmittingSchedule(true);
    try {
      const isoDate = new Date(scheduleData.date).toISOString();
      await api.post('/interviews', { ...scheduleData, date: isoDate });
      setIsScheduleOpen(false);
      showSuccess('Interview scheduled! Kanban stage auto-updated to INTERVIEW.');
      fetchInterviews();
    } catch (err) {
      setScheduleError(err.message || 'Failed to schedule interview.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // ── Reschedule ────────────────────────────────────────────
  const handleOpenReschedule = (interview) => {
    setSelectedInterview(interview);
    setNewDate('');
    setRescheduleError('');
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setRescheduleError('');
    setSubmittingReschedule(true);
    try {
      const isoDate = new Date(newDate).toISOString();
      await api.put(`/interviews/${selectedInterview.id}/reschedule`, { date: isoDate });
      setIsRescheduleOpen(false);
      showSuccess('Interview rescheduled successfully!');
      fetchInterviews();
    } catch (err) {
      setRescheduleError(err.message || 'Failed to reschedule interview.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  // ── Cancel ────────────────────────────────────────────────
  const handleCancel = async (interviewId) => {
    if (!window.confirm('Cancel this interview?')) return;
    try {
      await api.put(`/interviews/${interviewId}/status`, { status: 'cancelled' });
      showSuccess('Interview cancelled.');
      fetchInterviews();
    } catch (err) {
      alert(err.message || 'Failed to cancel interview.');
    }
  };

  // ── Live Interview Console ──────────────────────────────
  const handleOpenConsole = (interview) => {
    setConsoleInterview(interview);
    setIsConsoleOpen(true);
  };

  // ── Complete with feedback ────────────────────────────────
  const handleOpenComplete = (interview) => {
    setCompleteInterview(interview);
    setCompletionNotes(interview.notes || '');
    setIsCompleteOpen(true);
  };

  const handlePolishInModal = async () => {
    if (!completionNotes.trim()) {
      alert('Please enter some rough notes first to polish.');
      return;
    }
    setPolishingInModal(true);
    try {
      const res = await api.post('/ai/polish-notes', {
        notes: completionNotes,
        candidateId: completeInterview?.candidateId,
        jobId: completeInterview?.jobId,
      });
      const sc = res.data.data;
      const formatted = `### 📋 Scorecard (${sc.recommendation})
**Ratings:** Tech ${sc.ratings?.technicalProficiency}/5 · Comm ${sc.ratings?.communication}/5 · Problem Solving ${sc.ratings?.problemSolving}/5

**Executive Summary:**
${sc.executiveSummary}

**Key Strengths:**
${sc.strengths?.map((s) => `• ${s}`).join('\n')}

**Areas of Improvement:**
${sc.areasForImprovement?.map((a) => `• ${a}`).join('\n')}

**Rationale:**
${sc.rationale}

---
#### Raw Notes:
${completionNotes}`;
      setCompletionNotes(formatted);
    } catch (err) {
      alert(err.message || 'AI Polish failed. Check API configuration.');
    } finally {
      setPolishingInModal(false);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setSubmittingComplete(true);
    try {
      await api.put(`/interviews/${completeInterview.id}/status`, {
        status: 'completed',
        notes: completionNotes,
      });
      setIsCompleteOpen(false);
      showSuccess('Interview marked as completed with feedback saved!');
      fetchInterviews();
    } catch (err) {
      alert(err.message || 'Failed to complete interview.');
    } finally {
      setSubmittingComplete(false);
    }
  };

  // ── Notes (any status) ────────────────────────────────────
  const handleOpenNotes = (interview) => {
    setNotesInterview(interview);
    setNotesInput(interview.notes || '');
    setIsNotesOpen(true);
  };

  const handleSaveNotes = async () => {
    setSubmittingNotes(true);
    try {
      await api.put(`/interviews/${notesInterview.id}/notes`, { notes: notesInput });
      setIsNotesOpen(false);
      showSuccess('Notes saved successfully!');
      fetchInterviews();
    } catch (err) {
      alert(err.message || 'Failed to save notes.');
    } finally {
      setSubmittingNotes(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (interview) => {
    if (!window.confirm(`Delete interview for ${interview.candidate?.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/interviews/${interview.id}`);
      showSuccess('Interview deleted.');
      fetchInterviews();
    } catch (err) {
      alert(err.message || 'Failed to delete interview.');
    }
  };

  // ── Badge helpers ─────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" /> Planned
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="h-3.5 w-3.5" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getModeBadge = (mode) =>
    mode === 'video' ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <Video className="h-3.5 w-3.5" /> Video Call
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <MapPin className="h-3.5 w-3.5" /> In-Person
      </span>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-brand-600" />
            Interview Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Schedule, track, and record feedback for all candidate interviews.
          </p>
        </div>
        <button
          onClick={handleOpenSchedule}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition shadow-brand-500/20"
        >
          <Plus className="h-4 w-4" /> Schedule Interview
        </button>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-slate-400" /> Filters:
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Modes</option>
          <option value="video">Video Call</option>
          <option value="in-person">In-Person</option>
        </select>
        {(statusFilter || modeFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setModeFilter(''); }}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">No interviews found</h3>
          <p className="mt-1 text-sm text-slate-500">Schedule the first interview for a candidate.</p>
          <button
            onClick={handleOpenSchedule}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition"
          >
            <Plus className="h-4 w-4" /> Schedule First Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {interviews.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Status + Mode badges */}
                <div className="flex items-center justify-between">
                  {getStatusBadge(item.status)}
                  {getModeBadge(item.mode)}
                </div>

                {/* Candidate */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{item.candidate?.name || 'Candidate'}</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-6">{item.candidate?.email}</p>
                </div>

                {/* Job */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                    <Building className="h-4 w-4 text-brand-500" />
                    <span>{item.job?.title || 'Job Opening'}</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-6">{item.job?.department} • {item.job?.status}</p>
                </div>

                {/* Interviewer */}
                {item.interviewerName && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                    <span>Interviewer: <span className="font-semibold">{item.interviewerName}</span></span>
                  </div>
                )}

                {/* Date */}
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center gap-3 text-xs text-slate-700">
                  <CalendarClock className="h-5 w-5 text-brand-600 shrink-0" />
                  <div>
                    <span className="block font-semibold">
                      {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-slate-500">
                      {new Date(item.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Notes preview */}
                {item.notes && (
                  <p className="text-[11px] text-slate-600 bg-amber-50 border border-amber-100 rounded-lg p-2 italic line-clamp-2">
                    📝 {item.notes}
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {item.status === 'planned' ? (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => handleOpenConsole(item)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition flex items-center gap-1"
                        title="Open live interview console with AI questions and scratchpad"
                      >
                        <Play className="h-3 w-3 fill-current" /> Start
                      </button>
                      <button
                        onClick={() => handleOpenComplete(item)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        title="Mark as Completed + add feedback"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleOpenReschedule(item)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-1"
                      >
                        <CalendarClock className="h-3 w-3" /> Reschedule
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {item.status === 'completed' ? '✅ Completed' : '🚫 Cancelled'}
                  </span>
                )}

                {/* Always-visible: Notes + Delete */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => handleOpenNotes(item)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 transition"
                    title="Add / edit notes"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-300 transition"
                    title="Delete this interview"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Schedule Modal ── */}
      <Modal isOpen={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} title="Schedule New Interview">
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          {scheduleError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> <span>{scheduleError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Candidate *</label>
            <select
              value={scheduleData.candidateId}
              onChange={(e) => setScheduleData({ ...scheduleData, candidateId: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Job Offer *</label>
            <select
              value={scheduleData.jobId}
              onChange={(e) => setScheduleData({ ...scheduleData, jobId: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">-- Choose Job Opening --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title} [{j.department}] - {j.status}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">Business rule: cannot schedule on CLOSED jobs.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Interviewer Name (optional)</label>
            <input
              type="text"
              value={scheduleData.interviewerName}
              onChange={(e) => setScheduleData({ ...scheduleData, interviewerName: e.target.value })}
              placeholder="e.g. Sarah — Engineering Lead"
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Mode *</label>
              <select
                value={scheduleData.mode}
                onChange={(e) => setScheduleData({ ...scheduleData, mode: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="video">Video Call</option>
                <option value="in-person">In-Person</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time (Future only) *</label>
              <input
                type="datetime-local"
                value={scheduleData.date}
                min={getNowLocal()}
                onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsScheduleOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button type="submit" disabled={submittingSchedule}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition disabled:opacity-50">
              {submittingSchedule && <Loader2 className="h-4 w-4 animate-spin" />} Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Reschedule Modal ── */}
      <Modal isOpen={isRescheduleOpen} onClose={() => setIsRescheduleOpen(false)} title="Reschedule Interview">
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          {rescheduleError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> <span>{rescheduleError}</span>
            </div>
          )}
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
            <p><strong>Candidate:</strong> {selectedInterview?.candidate?.name}</p>
            <p><strong>Job:</strong> {selectedInterview?.job?.title}</p>
            <p><strong>Current Date:</strong> {selectedInterview?.date && new Date(selectedInterview.date).toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Date & Time (Future only) *</label>
            <input
              type="datetime-local"
              value={newDate}
              min={getNowLocal()}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsRescheduleOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button type="submit" disabled={submittingReschedule}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition disabled:opacity-50">
              {submittingReschedule && <Loader2 className="h-4 w-4 animate-spin" />} Save New Date
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Complete + Feedback Modal ── */}
      <Modal isOpen={isCompleteOpen} onClose={() => setIsCompleteOpen(false)} title="Mark Interview as Completed">
        <form onSubmit={handleCompleteSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
            <p><strong>Candidate:</strong> {completeInterview?.candidate?.name}</p>
            <p><strong>Job:</strong> {completeInterview?.job?.title}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Post-Interview Feedback / Notes</label>
              <button
                type="button"
                onClick={handlePolishInModal}
                disabled={polishingInModal || !completionNotes.trim()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 disabled:opacity-40 transition"
                title="Transform rough notes into standard scorecard"
              >
                {polishingInModal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                <span>Polish with AI</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Enter rough shorthand notes or click 'Polish with AI' to generate a standardized debrief..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono focus:border-brand-500 focus:outline-none leading-relaxed"
            />
          </div>
          <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsCompleteOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button type="submit" disabled={submittingComplete}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50">
              {submittingComplete && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" /> Mark as Completed
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Notes Modal (any status) ── */}
      <Modal isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} title="Interview Notes">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Notes for <span className="font-bold text-slate-800">{notesInterview?.candidate?.name}</span>
            {' '}→ <span className="font-semibold">{notesInterview?.job?.title}</span>
            {' '}<span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              notesInterview?.status === 'planned' ? 'bg-amber-50 text-amber-700' :
              notesInterview?.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
              'bg-slate-100 text-slate-600'
            }`}>{notesInterview?.status}</span>
          </p>
          <textarea
            rows={5}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Add interview notes, feedback, or follow-up actions..."
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none leading-relaxed"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsNotesOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              Close
            </button>
            <button onClick={handleSaveNotes} disabled={submittingNotes}
              className="px-5 py-2 rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-500 transition disabled:opacity-50">
              {submittingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Live Interview Console (Option 1) ── */}
      <InterviewConsole
        isOpen={isConsoleOpen}
        interview={consoleInterview}
        onClose={() => {
          setIsConsoleOpen(false);
          setConsoleInterview(null);
        }}
        onInterviewCompleted={() => {
          showSuccess('Interview completed! Official AI scorecard recorded in feedback.');
          fetchInterviews();
        }}
      />
    </div>
  );
};

export default Interviews;
