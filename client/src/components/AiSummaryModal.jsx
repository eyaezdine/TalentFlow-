import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Modal from './Modal';
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Tag,
  Eye,
  CheckCircle,
} from 'lucide-react';

const AiSummaryModal = ({ isOpen, onClose, candidate }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [audit, setAudit] = useState(null);
  const [anonymizedSent, setAnonymizedSent] = useState(null);
  const [error, setError] = useState(null);
  const [showAnonymizationAudit, setShowAnonymizationAudit] = useState(false);

  const fetchSummary = async () => {
    if (!candidate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/ai/summary', {
        candidateId: candidate.id,
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
    if (isOpen && candidate) {
      setData(null);
      setError(null);
      setShowAnonymizationAudit(false);
      fetchSummary();
    }
  }, [isOpen, candidate]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Candidate Executive Summary"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Candidate header info */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Candidate</span>
            <h3 className="text-base font-bold text-slate-900">{candidate?.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
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
              Generating Executive Summary...
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Anonymizing candidate PII and querying Claude AI with versioned prompt templates.
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
                ? 'AI Request Timed Out (Rule R3)'
                : error.code === 'AI_QUOTA_EXCEEDED'
                ? 'AI Rate Limit or Quota Reached (Rule R3)'
                : 'AI Service Notice'}
            </h4>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error.message}</p>
            <button
              onClick={fetchSummary}
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
            {/* 3-Sentence Professional Summary */}
            <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50/50 p-6 border border-brand-100">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-brand-800">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <span>3-Sentence Professional Assessment</span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {data.summary}
              </p>
            </div>

            {/* Keywords */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>Identified Core Competencies & Keywords</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-white border border-slate-200 shadow-sm px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {kw}
                  </span>
                ))}
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
                    <span>Audit Log Token: {audit.pseudonym}</span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Zero PII Transmitted
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-700 mb-1">Scrubbed Identifiers:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        <li>Removed Candidate Name: <span className="line-through text-rose-600">{candidate.name}</span></li>
                        <li>Removed Email: <span className="line-through text-rose-600">{candidate.email}</span></li>
                        <li>Removed Phone: <span className="line-through text-rose-600">{candidate.phone || 'N/A'}</span></li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold text-slate-700 mb-1">Payload Sent to Claude LLM:</p>
                      <pre className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-800 overflow-x-auto">
                        {JSON.stringify(
                          {
                            identifier: anonymizedSent.identifier,
                            experienceYears: anonymizedSent.experienceYears,
                            educationLevel: anonymizedSent.educationLevel,
                            skills: anonymizedSent.skills,
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

export default AiSummaryModal;
