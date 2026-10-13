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
  HelpCircle,
  Copy,
  Check,
  Eye,
  BookOpen,
} from 'lucide-react';

const AiQuestionsModal = ({ isOpen, onClose, applicationId, candidate, job }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState(null);
  const [anonymizedSent, setAnonymizedSent] = useState(null);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showAnonymizationAudit, setShowAnonymizationAudit] = useState(false);

  const fetchQuestions = async () => {
    if (!applicationId && (!candidate?.id || !job?.id)) return;
    setLoading(true);
    setError(null);
    try {
      const payload = applicationId
        ? { applicationId }
        : { candidateId: candidate.id, jobId: job.id };

      const response = await api.post('/ai/questions', payload);
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
    if (isOpen && (applicationId || (candidate?.id && job?.id))) {
      setData(null);
      setError(null);
      setCopiedIndex(null);
      setShowAnonymizationAudit(false);
      fetchQuestions();
    }
  }, [isOpen, applicationId, candidate?.id, job?.id]);

  if (!isOpen) return null;

  const handleCopyQuestion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCategoryColor = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('tech') || cat.includes('system') || cat.includes('code')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (cat.includes('behavior') || cat.includes('culture') || cat.includes('lead')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (cat.includes('scenario') || cat.includes('problem')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tailored Interview Questions (AI Feature 3)"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Header info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Candidate:</span>
              <span className="text-sm font-bold text-slate-900">
                {candidate?.name || 'Assigned Candidate'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold uppercase text-slate-400">Role:</span>
              <span className="text-sm font-bold text-brand-700">
                {job?.title || 'Target Job Position'}
              </span>
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
              Generating Tailored Interview Questions...
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Analyzing candidate skills against role requirements to formulate 5 calibrated questions with evaluation rubrics.
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
                ? 'AI Generation Timed Out (Rule R3)'
                : error.code === 'AI_QUOTA_EXCEEDED'
                ? 'AI Rate Limit or Quota Reached (Rule R3)'
                : 'AI Generation Notice'}
            </h4>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error.message}</p>
            <button
              onClick={fetchQuestions}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Generation</span>
            </button>
          </div>
        )}

        {/* Success / Result State */}
        {data && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                5 Formulated Interview Questions (Validated by Zod Schema)
              </p>
              <span className="text-xs font-semibold text-brand-600">
                {data.questions.length} Questions Ready
              </span>
            </div>

            <div className="space-y-3">
              {data.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white shrink-0">
                        {idx + 1}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(
                          q.category
                        )}`}
                      >
                        {q.category}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyQuestion(q.question, idx)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-brand-600 transition"
                      title="Copy Question"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    {q.question}
                  </p>

                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                      <BookOpen className="h-3 w-3 text-slate-400" />
                      <span>Interviewer Rationale & Evaluation Criteria:</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-slate-600">
                      {q.rationale}
                    </p>
                  </div>
                </div>
              ))}
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
                      Candidate Privacy Preserved
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-700 mb-1">Scrubbed Identifiers:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        <li>Masked Candidate Name: <span className="line-through text-rose-600">{candidate?.name || 'Anonymized'}</span></li>
                        <li>Masked Email: <span className="line-through text-rose-600">{candidate?.email || 'Anonymized'}</span></li>
                        <li>Masked Phone: <span className="line-through text-rose-600">{candidate?.phone || 'N/A'}</span></li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold text-slate-700 mb-1">Payload Sent to Claude LLM:</p>
                      <pre className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-800 overflow-x-auto">
                        {JSON.stringify(
                          {
                            identifier: anonymizedSent.identifier,
                            skills: anonymizedSent.skills,
                            experienceYears: anonymizedSent.experienceYears,
                            jobTitle: job?.title,
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

export default AiQuestionsModal;
