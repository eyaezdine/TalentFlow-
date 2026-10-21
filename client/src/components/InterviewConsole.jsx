import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Video,
  MapPin,
  Clock,
  User,
  Briefcase,
  ThumbsUp,
  Award,
  Star,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
} from 'lucide-react';

const SAMPLE_NOTES = `• Arrived punctually, enthusiastic about the role.
• Explained React component lifecycle and custom hooks cleanly.
• Live coding: structured code well, but hesitated on async error handling in Promise.all.
• System design: proposed caching with Redis, understood vertical vs horizontal scaling trade-offs.
• Culture: asked great questions about code review standards and sprint velocity.
• Communication: very articulate and receptive to hints.`;

export default function InterviewConsole({ interview, isOpen, onClose, onInterviewCompleted }) {
  if (!isOpen || !interview) return null;

  // ── Session Timer ──────────────────────────────────────────
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Live Scratchpad Notes ──────────────────────────────────
  const [notes, setNotes] = useState(interview.notes || '');
  const textareaRef = useRef(null);

  const insertTag = (tagPrefix) => {
    const timeStr = `[${formatTimer(seconds)}] `;
    const textToInsert = `\n${timeStr}${tagPrefix}: `;
    setNotes((prev) => (prev ? prev + textToInsert : `${timeStr}${tagPrefix}: `));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleInsertSample = () => {
    setNotes(SAMPLE_NOTES);
  };

  // ── AI Interview Questions Guide (Feature 3) ───────────────
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const handleFetchQuestions = async () => {
    setLoadingQuestions(true);
    setQuestionsError('');
    try {
      const res = await api.post('/ai/questions', {
        candidateId: interview.candidateId,
        jobId: interview.jobId,
      });
      setQuestions(res.data.data?.questions || []);
    } catch (err) {
      setQuestionsError(err.message || 'Failed to generate tailored questions.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const insertQuestionToNotes = (qText) => {
    const textToInsert = `\n• Q: "${qText}"\n  Answer: `;
    setNotes((prev) => (prev ? prev + textToInsert : textToInsert.trim()));
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 50);
  };

  // ── AI Notes Polish (Feature 4) ───────────────────────────
  const [scorecard, setScorecard] = useState(null);
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState('');

  const handlePolishNotes = async () => {
    if (!notes || notes.trim().length === 0) {
      setPolishError('Please type some notes or insert sample notes first.');
      return;
    }
    setPolishError('');
    setPolishing(true);
    try {
      const durationMin = Math.max(1, Math.round(seconds / 60));
      const res = await api.post('/ai/polish-notes', {
        notes,
        candidateId: interview.candidateId,
        jobId: interview.jobId,
        durationMinutes: durationMin,
      });
      setScorecard(res.data.data);
    } catch (err) {
      setPolishError(err.message || 'AI Polish failed. Please try again.');
    } finally {
      setPolishing(false);
    }
  };

  // ── Saving & Completion ───────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await api.put(`/interviews/${interview.id}/notes`, { notes });
      setSaveSuccess('Draft saved successfully!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      alert(err.message || 'Failed to save draft notes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteInterview = async () => {
    setSaving(true);
    try {
      // Build final feedback text combining polished scorecard or raw notes
      let finalFeedback = notes;
      if (scorecard) {
        finalFeedback = `### 📋 Official Interview Scorecard (AI Synthesized)
**Recommendation:** ${scorecard.recommendation} | **Duration:** ${formatTimer(seconds)}
**Ratings:** Technical ${scorecard.ratings?.technicalProficiency}/5 · Communication ${scorecard.ratings?.communication}/5 · Problem Solving ${scorecard.ratings?.problemSolving}/5

**Executive Summary:**
${scorecard.executiveSummary}

**Key Strengths:**
${scorecard.strengths?.map((s) => `• ${s}`).join('\n')}

**Areas of Improvement:**
${scorecard.areasForImprovement?.map((a) => `• ${a}`).join('\n')}

**Rationale:**
${scorecard.rationale}

---
#### Raw In-Interview Notes
${notes}`;
      }

      await api.put(`/interviews/${interview.id}/status`, {
        status: 'completed',
        notes: finalFeedback,
      });

      if (onInterviewCompleted) {
        onInterviewCompleted(interview.id, finalFeedback);
      }
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to complete interview.');
    } finally {
      setSaving(false);
    }
  };

  const getRecommendationBadge = (rec) => {
    switch (rec) {
      case 'STRONG_HIRE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
          icon: <Award className="h-4 w-4 text-emerald-600" />,
          label: 'Strong Hire',
        };
      case 'HIRE':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-300',
          icon: <ThumbsUp className="h-4 w-4 text-blue-600" />,
          label: 'Hire',
        };
      case 'CONSIDER':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-300',
          icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
          label: 'Consider / Follow-up',
        };
      case 'REJECT':
      default:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-300',
          icon: <XCircle className="h-4 w-4 text-rose-600" />,
          label: 'Do Not Hire',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-full max-h-[96vh] w-full max-w-7xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* ── Top Bar ── */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 sm:px-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-bold text-white shadow-md">
              {interview.candidate?.name?.charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  {interview.candidate?.name || 'Candidate'}
                </h2>
                <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-[11px] font-semibold text-brand-300 border border-brand-400/40">
                  {interview.mode?.toUpperCase() || 'VIDEO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{interview.job?.title || 'Target Job'}</span>
                <span>•</span>
                <span>Interviewer: {interview.interviewerName || 'Assigned Lead'}</span>
              </p>
            </div>
          </div>

          {/* Session Timer & Meeting Action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/90 border border-slate-700 px-3 py-1.5 shadow-inner">
              <span className={`inline-block h-2 w-2 rounded-full ${timerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-mono text-sm font-bold tracking-wider text-white">
                {formatTimer(seconds)}
              </span>
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="p-1 text-slate-400 hover:text-white transition"
                title={timerRunning ? 'Pause timer' : 'Resume timer'}
              >
                {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
              </button>
              <button
                onClick={() => setSeconds(0)}
                className="p-1 text-slate-400 hover:text-white transition"
                title="Reset timer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {interview.mode === 'video' && (
              <a
                href="https://meet.google.com/new"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-semibold shadow transition"
              >
                <Video className="h-3.5 w-3.5" />
                <span>Join Video Call</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Main Dual-Pane Workspace ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* ── LEFT PANEL: Candidate Profile & AI Questions Guide (5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50/70 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Candidate Quick Overview */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-brand-600" /> Candidate Dossier
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Email</span>
                  <span className="font-semibold text-slate-800 truncate block">{interview.candidate?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Experience</span>
                  <span className="font-semibold text-slate-800">{interview.candidate?.experienceYears || '3'} years</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">Declared Skills</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(interview.candidate?.skills || 'React, Node.js, JavaScript, SQL')
                      .split(',')
                      .map((s, idx) => (
                        <span key={idx} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {s.trim()}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Job Prerequisites */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-brand-600" /> Target Role Criteria
              </h3>
              <div className="text-xs space-y-1.5">
                <p className="font-bold text-slate-900">{interview.job?.title} ({interview.job?.department})</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  <span className="font-semibold text-slate-700">Required: </span>
                  {interview.job?.requiredSkills || 'Standard engineering competencies'}
                </p>
              </div>
            </div>

            {/* AI Tailored Interview Guide */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">AI Question Guide</h3>
                </div>
                {questions.length === 0 && (
                  <button
                    onClick={handleFetchQuestions}
                    disabled={loadingQuestions}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {loadingQuestions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    <span>Load 5 AI Questions</span>
                  </button>
                )}
              </div>

              {questionsError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{questionsError}</span>
                </div>
              )}

              {questions.length === 0 && !loadingQuestions && (
                <div className="text-center py-6 text-indigo-400 text-xs">
                  <Sparkles className="h-8 w-8 mx-auto text-indigo-300 mb-2 opacity-60" />
                  <p className="font-medium text-slate-600">Tailored Interview Questions</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Click &quot;Load 5 AI Questions&quot; to inspect questions targeting this candidate&apos;s CV gaps.
                  </p>
                </div>
              )}

              {loadingQuestions && (
                <div className="flex flex-col items-center justify-center py-8 text-indigo-600">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-xs font-medium">Generating tailored questions with AI...</span>
                </div>
              )}

              {questions.length > 0 && (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm hover:border-indigo-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                          {q.category}
                        </span>
                        <button
                          onClick={() => insertQuestionToNotes(q.question)}
                          className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-0.5 shrink-0"
                          title="Insert this question into notes"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      </div>
                      <p className="font-semibold text-slate-800 mt-1.5 text-xs">{q.question}</p>
                      
                      <button
                        onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                        className="mt-1.5 text-[11px] text-slate-400 hover:text-indigo-600 flex items-center gap-1 font-medium"
                      >
                        {expandedQuestion === idx ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span>{expandedQuestion === idx ? 'Hide Rationale' : 'View Rationale'}</span>
                      </button>

                      {expandedQuestion === idx && (
                        <p className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                          💡 <span className="font-medium text-slate-700">Rationale: </span>{q.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Live Scratchpad & AI Polish (7 cols) ── */}
          <div className="lg:col-span-7 flex flex-col bg-white overflow-y-auto p-4 sm:p-5">
            
            {/* Action Bar Above Notes */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-brand-600" /> In-Interview Live Scratchpad
                </h3>
                <p className="text-[11px] text-slate-400">Type fast shorthand bullet notes during the call.</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleInsertSample}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                  title="Insert realistic demo notes"
                >
                  Insert Sample Notes
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Save Draft
                </button>
              </div>
            </div>

            {/* Quick Shorthand Tag Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Tag:</span>
              <button
                type="button"
                onClick={() => insertTag('Strength')}
                className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
              >
                + Strength
              </button>
              <button
                type="button"
                onClick={() => insertTag('Concern')}
                className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
              >
                - Concern
              </button>
              <button
                type="button"
                onClick={() => insertTag('Culture Fit')}
                className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
              >
                ★ Culture
              </button>
              <button
                type="button"
                onClick={() => insertTag('Follow-up')}
                className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
              >
                ? Follow-up
              </button>
            </div>

            {/* Textarea */}
            <div className="relative flex-1 min-h-[180px] mb-3">
              <textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type rapid observations, shorthand reactions, questions asked, answers given..."
                className="w-full h-full min-h-[180px] rounded-xl border border-slate-300 p-3.5 text-xs font-mono text-slate-800 leading-relaxed focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-none bg-slate-50/40"
              />
            </div>

            {/* AI Polish Trigger Button */}
            <div className="mb-4">
              <button
                onClick={handlePolishNotes}
                disabled={polishing || !notes.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-brand-500 transition disabled:opacity-50"
              >
                {polishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI Synthesizing Structured Debrief & Scorecard...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>✨ Polish Notes & Generate AI Scorecard</span>
                  </>
                )}
              </button>
            </div>

            {polishError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{polishError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* ── Polished Scorecard Card (Rendered if available) ── */}
            {scorecard && (
              <div className="rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50/50 to-white p-4 shadow-sm space-y-3 mb-4 animate-fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-900">AI Standardized Scorecard</span>
                  </div>
                  {(() => {
                    const badge = getRecommendationBadge(scorecard.recommendation);
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Ratings */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white p-2 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Technical</span>
                    <span className="text-sm font-bold text-slate-800">
                      {scorecard.ratings?.technicalProficiency || 3} / 5
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Communication</span>
                    <span className="text-sm font-bold text-slate-800">
                      {scorecard.ratings?.communication || 3} / 5
                    </span>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase">Problem Solving</span>
                    <span className="text-sm font-bold text-slate-800">
                      {scorecard.ratings?.problemSolving || 3} / 5
                    </span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">Executive Summary</span>
                  <p className="text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100">
                    {scorecard.executiveSummary}
                  </p>
                </div>

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-2.5">
                    <span className="font-bold text-emerald-800 block mb-1">Key Strengths</span>
                    <ul className="space-y-1 text-emerald-900 text-[11px]">
                      {scorecard.strengths?.map((s, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-2.5">
                    <span className="font-bold text-amber-800 block mb-1">Areas for Improvement</span>
                    <ul className="space-y-1 text-amber-900 text-[11px]">
                      {scorecard.areasForImprovement?.map((a, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Rationale */}
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700">Rationale: </span>
                  {scorecard.rationale}
                </div>
              </div>
            )}

            {/* ── Footer Actions ── */}
            <div className="mt-auto pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                Session duration: <strong className="text-slate-700">{formatTimer(seconds)}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Exit Console
                </button>
                <button
                  type="button"
                  onClick={handleCompleteInterview}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>{scorecard ? 'Save Scorecard & Complete Interview' : 'Complete Interview with Raw Notes'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
