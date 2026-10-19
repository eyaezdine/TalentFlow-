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
} from 'lucide-react';

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
  });
  const [scheduleError, setScheduleError] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Reschedule Modal
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Action status message
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (modeFilter) params.append('mode', modeFilter);

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

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter, modeFilter]);

  useEffect(() => {
    fetchCandidatesAndJobs();
  }, []);

  const handleOpenSchedule = () => {
    setScheduleData({
      candidateId: candidates[0]?.id || '',
      jobId: jobs.find((j) => j.status === 'OPEN')?.id || jobs[0]?.id || '',
      date: '',
      mode: 'video',
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
      await api.post('/interviews', {
        ...scheduleData,
        date: isoDate,
      });

      setIsScheduleOpen(false);
      setActionSuccess('Interview scheduled successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
      fetchInterviews();
    } catch (err) {
      setScheduleError(err.message || 'Failed to schedule interview.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

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
      await api.put(`/interviews/${selectedInterview.id}/reschedule`, {
        date: isoDate,
      });

      setIsRescheduleOpen(false);
      setActionSuccess('Interview rescheduled successfully!');
      setTimeout(() => setActionSuccess(''), 4000);
      fetchInterviews();
    } catch (err) {
      setRescheduleError(err.message || 'Failed to reschedule interview.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleUpdateStatus = async (interviewId, newStatus) => {
    try {
      await api.put(`/interviews/${interviewId}/status`, { status: newStatus });
      setActionSuccess(`Interview marked as ${newStatus}!`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchInterviews();
    } catch (err) {
      alert(err.message || `Failed to update status to ${newStatus}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'planned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" />
            Planned
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="h-3.5 w-3.5" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getModeBadge = (mode) => {
    if (mode === 'video') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Video className="h-3.5 w-3.5" />
          Video Call
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <MapPin className="h-3.5 w-3.5" />
        In-Person
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-brand-600" />
            Interview Management ("Entretiens")
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Schedule, reschedule, and track interviews between candidates and open job offers.
          </p>
        </div>
        <button
          onClick={handleOpenSchedule}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition shadow-brand-500/20"
        >
          <Plus className="h-4 w-4" />
          Schedule Interview
        </button>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-slate-400" />
          Filters:
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Modes</option>
          <option value="video">Video Call</option>
          <option value="in-person">In-Person</option>
        </select>

        {(statusFilter || modeFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setModeFilter('');
            }}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Interviews Grid / List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">No interviews found</h3>
          <p className="mt-1 text-sm text-slate-500">
            Get started by scheduling an interview for a candidate and job offer.
          </p>
          <button
            onClick={handleOpenSchedule}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition"
          >
            <Plus className="h-4 w-4" />
            Schedule First Interview
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {interviews.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Badges Header */}
                <div className="flex items-center justify-between">
                  {getStatusBadge(item.status)}
                  {getModeBadge(item.mode)}
                </div>

                {/* Candidate Info */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{item.candidate?.name || 'Candidate'}</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-6">{item.candidate?.email}</p>
                </div>

                {/* Job Info */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
                    <Building className="h-4 w-4 text-brand-500" />
                    <span>{item.job?.title || 'Job Opening'}</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-6">
                    {item.job?.department} &bull; Status: {item.job?.status}
                  </p>
                </div>

                {/* Date & Time */}
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center gap-3 text-xs text-slate-700">
                  <CalendarClock className="h-5 w-5 text-brand-600 shrink-0" />
                  <div>
                    <span className="block font-semibold">
                      {new Date(item.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-slate-500">
                      {new Date(item.date).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                {item.status === 'planned' ? (
                  <>
                    <button
                      onClick={() => handleOpenReschedule(item)}
                      className="text-xs font-semibold text-slate-700 hover:text-brand-600 transition flex items-center gap-1"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      Reschedule
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'completed')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        title="Mark as Completed"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'cancelled')}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700 transition"
                        title="Cancel Interview"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    Interview is {item.status} (no further actions)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule New Interview"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          {scheduleError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{scheduleError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Candidate *
            </label>
            <select
              value={scheduleData.candidateId}
              onChange={(e) => setScheduleData({ ...scheduleData, candidateId: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">-- Choose Candidate --</option>
              {candidates.map((cand) => (
                <option key={cand.id} value={cand.id}>
                  {cand.name} ({cand.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Job Offer *
            </label>
            <select
              value={scheduleData.jobId}
              onChange={(e) => setScheduleData({ ...scheduleData, jobId: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">-- Choose Job Opening --</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} [{job.department}] - Status: {job.status}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Note: Business rule prohibits scheduling on CLOSED job offers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Interview Mode *
              </label>
              <select
                value={scheduleData.mode}
                onChange={(e) => setScheduleData({ ...scheduleData, mode: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="video">Video Call</option>
                <option value="in-person">In-Person</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date & Time (Future only) *
              </label>
              <input
                type="datetime-local"
                value={scheduleData.date}
                onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingSchedule}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition disabled:opacity-50"
            >
              {submittingSchedule && <Loader2 className="h-4 w-4 animate-spin" />}
              Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title="Reschedule Interview"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          {rescheduleError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{rescheduleError}</span>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
            <p>
              <strong>Candidate:</strong> {selectedInterview?.candidate?.name}
            </p>
            <p>
              <strong>Job Offer:</strong> {selectedInterview?.job?.title}
            </p>
            <p>
              <strong>Current Date:</strong>{' '}
              {selectedInterview?.date && new Date(selectedInterview.date).toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Date & Time (Future date only) *
            </label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRescheduleOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReschedule}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition disabled:opacity-50"
            >
              {submittingReschedule && <Loader2 className="h-4 w-4 animate-spin" />}
              Save New Date
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Interviews;
