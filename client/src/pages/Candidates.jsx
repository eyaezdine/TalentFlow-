import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import AiSummaryModal from '../components/AiSummaryModal';
import AiMatchModal from '../components/AiMatchModal';
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  FileText,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const Candidates = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [minExpFilter, setMinExpFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);

  // AI Modals state
  const [isAiSummaryModalOpen, setIsAiSummaryModalOpen] = useState(false);
  const [isAiMatchModalOpen, setIsAiMatchModalOpen] = useState(false);
  const [selectedAiCandidate, setSelectedAiCandidate] = useState(null);
  const [selectedAiMatchJob, setSelectedAiMatchJob] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    experienceYears: 0,
    skills: '',
    educationLevel: "Master's Degree",
    cvText: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 6);
      if (search) params.append('search', search);
      if (minExpFilter) params.append('minExperience', minExpFilter);

      const response = await api.get(`/candidates?${params.toString()}`);
      setCandidates(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [page, minExpFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates();
  };

  const handleOpenCreateModal = () => {
    setEditingCandidate(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      experienceYears: 0,
      skills: '',
      educationLevel: "Bachelor's Degree",
      cvText: '',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || '',
      experienceYears: candidate.experienceYears,
      skills: candidate.skills,
      educationLevel: candidate.educationLevel,
      cvText: candidate.cvText,
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = async (id) => {
    try {
      const response = await api.get(`/candidates/${id}`);
      setSelectedCandidate(response.data.data);
      setIsDetailModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to load candidate details.');
    }
  };

  const handleSubmitCandidate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name || !formData.email || !formData.skills || !formData.cvText) {
      setFormError('Name, email, skills, and CV text are mandatory fields.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCandidate) {
        await api.put(`/candidates/${editingCandidate.id}`, formData);
        setSuccessMessage('Candidate profile updated successfully!');
      } else {
        await api.post('/candidates', formData);
        setSuccessMessage('Candidate profile ingested successfully!');
      }

      setIsFormModalOpen(false);
      fetchCandidates();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setFormError(err.message || 'Failed to save candidate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCandidate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete candidate: "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/candidates/${id}`);
      setSuccessMessage('Candidate deleted successfully.');
      fetchCandidates();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to delete candidate.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Candidates</h1>
          <p className="text-sm text-slate-500">
            Ingest candidate resumes, inspect qualifications and trigger AI analysis
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-500/25 hover:bg-brand-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Ingest Candidate</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate name, email, skills or education..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <select
            value={minExpFilter}
            onChange={(e) => {
              setMinExpFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-medium text-slate-700 outline-none focus:border-brand-500 focus:bg-white"
          >
            <option value="">Any Experience</option>
            <option value="1">1+ Years Experience</option>
            <option value="3">3+ Years Experience</option>
            <option value="5">5+ Years Experience</option>
            <option value="8">8+ Years Experience</option>
          </select>
        </div>
      </div>

      {/* Candidates Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Candidates Found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {search || minExpFilter
              ? 'Try modifying your search query or experience filter.'
              : 'Add your first candidate CV to populate the talent pool.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-sm font-bold text-white shadow-sm">
                      {candidate.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {candidate.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-[150px]">{candidate.email}</span>
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200">
                    {candidate.experienceYears}y exp
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{candidate.educationLevel}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                </div>

                {/* Skill Chips */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {candidate.skills.split(',').slice(0, 4).map((skill, i) => (
                    <span
                      key={i}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                  {candidate.skills.split(',').length > 4 && (
                    <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                      +{candidate.skills.split(',').length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDetailModal(candidate.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Inspect</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAiCandidate(candidate);
                      setIsAiSummaryModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg border border-brand-200 transition"
                    title="Generate 3-Sentence AI Executive Summary"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                    <span>AI Summary</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(candidate)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
                    title="Edit Candidate"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => handleDeleteCandidate(candidate.id, candidate.name)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                      title="Delete Candidate"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      <Pagination pagination={pagination} onPageChange={(p) => setPage(p)} />

      {/* Candidate Profile Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Candidate Profile & Full CV"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedCandidate.name}</h2>
                <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {selectedCandidate.email}
                  </span>
                  {selectedCandidate.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {selectedCandidate.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                    {selectedCandidate.educationLevel}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-brand-200">
                  {selectedCandidate.experienceYears} Years Experience
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAiCandidate(selectedCandidate);
                    setIsAiSummaryModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:from-brand-700 hover:to-indigo-700 transition"
                  title="Generate 3-Sentence AI Executive Summary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Summary</span>
                </button>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Technical Skill Set
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedCandidate.skills.split(',').map((s, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-brand-50 text-brand-800 border border-brand-200 px-2.5 py-1 text-xs font-semibold"
                  >
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Raw CV Text View */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ingested CV Text
                </h4>
                <span className="text-[10px] text-slate-400">
                  Raw text stored for PII masking (R1)
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-mono text-slate-700 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                {selectedCandidate.cvText}
              </div>
            </div>

            {/* Application History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Application History ({selectedCandidate.applications?.length || 0})
              </h4>
              {(!selectedCandidate.applications || selectedCandidate.applications.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No job applications submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCandidate.applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{app.job?.title}</span>
                        <span className="text-slate-400 ml-2">({app.job?.department})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                          {app.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAiCandidate(selectedCandidate);
                            setSelectedAiMatchJob(app.job);
                            setIsAiMatchModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand-200 bg-brand-50 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 transition"
                          title="Evaluate Candidate against Job Offer"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>AI Match</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Candidate Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCandidate ? 'Edit Candidate Profile' : 'Ingest New Candidate Profile'}
      >
        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitCandidate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Candidate Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Sarah Connor"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="sarah.connor@example.com"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+216 98 000 111"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Years Experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.experienceYears}
                onChange={(e) =>
                  setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Education Level *
              </label>
              <input
                type="text"
                required
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                placeholder="e.g. Master's in CS"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Skills (comma-separated) *
            </label>
            <input
              type="text"
              required
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="JavaScript, React, Node.js, Express, SQLite, Git"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
              CV Text / Resume Summary *
            </label>
            <textarea
              required
              rows={5}
              value={formData.cvText}
              onChange={(e) => setFormData({ ...formData, cvText: e.target.value })}
              placeholder="Paste raw CV content or text summary. Contains contact details to be anonymized by AI module (R1)..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-brand-500 leading-relaxed font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
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
              <span>{editingCandidate ? 'Save Profile' : 'Ingest Candidate'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Candidate Summary Modal (Feature 1) */}
      <AiSummaryModal
        isOpen={isAiSummaryModalOpen}
        onClose={() => setIsAiSummaryModalOpen(false)}
        candidate={selectedAiCandidate}
      />

      {/* AI Candidate-Job Match Modal (Feature 2) */}
      <AiMatchModal
        isOpen={isAiMatchModalOpen}
        onClose={() => setIsAiMatchModalOpen(false)}
        candidate={selectedAiCandidate}
        job={selectedAiMatchJob}
      />
    </div>
  );
};

export default Candidates;
