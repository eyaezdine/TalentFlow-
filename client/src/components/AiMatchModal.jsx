import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from './Modal';
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Award,
  Eye,
} from 'lucide-react';

const AiMatchModal = ({ isOpen, onClose, candidate, job }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState(null);
  const [anonymizedSent, setAnonymizedSent] = useState(null);
  const [error, setError] = useState(null);
  const [showAnonymizationAudit, setShowAnonymizationAudit] = useState(false);

  const fetchMatch = async () => {
    if (!candidate?.id || !job?.id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/ai/match', {
        candidateId: candidate.id,
        jobId: job.id,
      });
      setData(response.data.data);
      setAudit(response.data.anonymizationAudit);
      setAnonymizedSent(response.data.anonymizedDataSent);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && candidate?.id && job?.id) {
      setData(null);
      setError(null);
      setShowAnonymizationAudit(false);
      fetchMatch();
    }
  }, [isOpen, candidate?.id, job?.id]);

  if (!isOpen) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 border-emerald-500 bg-emerald-50';
    if (score >= 60) return 'text-amber-600 border-amber-500 bg-amber-50';
    return 'text-rose-600 border-rose-500 bg-rose-50';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-800';
    if (score >= 60) return 'bg-amber-100 text-amber-800';
    return 'bg-rose-100 text-rose-800';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Candidate-Job Matching Analysis"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Match Header info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Candidate:</span>
              <span className="text-sm font-bold text-slate-900">{candidate?.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold uppercase text-slate-400">Target Role:</span>
              <span className="text-sm font-bold text-brand-700">{job?.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Rule R1 PII Anonymization Applied</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <Sparkles className="h-4 w-4 text-brand-400 absolute top-0 right-0 animate-pulse" />
            </div>
            <h4 className="mt-4 text-sm font-bold text-slate-800">
              Evaluating Candidate Fit...
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Anonymizing candidate data, cross-referencing skills against job requirements, and prompting Claude AI.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-rose-900">
              {error.code === 'AI_TIMEOUT'
                ? 'AI Matching Request Timed Out (Rule R3)'
                : error.code === 'AI_QUOTA_EXCEEDED'
                ? 'AI Rate Limit or Quota Reached (Rule R3)'
                : 'AI Analysis Notice'}
            </h4>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error.message}</p>
            <button
              onClick={fetchMatch}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Analysis</span>
            </button>
          </div>
        )}

        {/* Success / Result State */}
        {data && !loading && (
          <div className="space-y-6">
            {/* Score & Recommendation Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50/40 p-5 border border-slate-200 flex flex-col md:flex-row items-center gap-6">
              {/* Score Circular Metric */}
              <div
                className={`flex flex-col items-center justify-center h-28 w-28 rounded-2xl border-2 ${getScoreColor(
                  data.score
                )} p-3 shrink-0 shadow-sm`}
              >
                <span className="text-3xl font-black">{data.score}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  Match Score
                </span>
                <span
                  className={`mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${getScoreBadge(
                    data.score
                  )}`}
                >
                  {data.score >= 80 ? 'High Fit' : data.score >= 60 ? 'Moderate' : 'Low Fit'}
                </span>
              </div>

              {/* Recommendation Statement */}
              <div className="space-y-2 flex-1 text-center md:text-left">
                <div className="flex items-center gap-1.5 justify-center md:justify-start text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Award className="h-4 w-4 text-brand-600" />
                  <span>Strategic Hiring Recommendation</span>
                </div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">
                  {data.recommendation}
                </p>
              </div>
            </div>

            {/* Strengths & Gaps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>Key Strengths ({data.strengths.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {data.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Skill Gaps & Risks ({data.gaps.length})</span>
                </div>
                {data.gaps.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No significant skill gaps identified.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {data.gaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Rule R1 Anonymization Audit Drawer */}
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAnonymizationAudit(!showAnonymizationAudit)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 transition"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>
                  {showAnonymizationAudit
                    ? 'Hide Privacy & Anonymization Audit'
                    : 'Inspect Rule R1 Anonymization Audit (Side-by-Side)'}
                </span>
              </button>

              {showAnonymizationAudit && audit && anonymizedSent && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">
                    <span>Audit Pseudonym: {audit.pseudonym}</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Zero PII Transmitted
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-700 mb-1">Scrubbed Identifiers:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        <li>Masked Candidate Name: <span className="line-through text-rose-600">{candidate.name}</span></li>
                        <li>Masked Email: <span className="line-through text-rose-600">{candidate.email}</span></li>
                        <li>Masked Phone: <span className="line-through text-rose-600">{candidate.phone || 'N/A'}</span></li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold text-slate-700 mb-1">Payload Sent to Claude LLM:</p>
                      <pre className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-800 overflow-x-auto">
                        {JSON.stringify(
                          {
                            candidate: {
                              identifier: anonymizedSent.identifier,
                              skills: anonymizedSent.skills,
                              experienceYears: anonymizedSent.experienceYears,
                            },
                            targetJob: {
                              title: job.title,
                              requiredSkills: job.requiredSkills,
                            },
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AiMatchModal;
