import React from 'react';
import { Sparkles } from 'lucide-react';

const STATUS_CONFIG = {
  NEW: {
    label: 'New Applications',
    color: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  SCREENING: {
    label: 'AI & Initial Screening',
    color: 'bg-indigo-500',
    lightBg: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  INTERVIEW: {
    label: 'Technical Interview',
    color: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  OFFER: {
    label: 'Job Offer Extended',
    color: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  REJECTED: {
    label: 'Archived / Rejected',
    color: 'bg-slate-400',
    lightBg: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
  },
};

const StatusChart = ({ breakdown = {} }) => {
  const total = Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Application Pipeline Distribution</h2>
          <p className="text-xs text-slate-500">Live breakdown of applicants across recruitment stages</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-brand-200">
          <Sparkles className="h-3.5 w-3.5" />
          {total} Total Submissions
        </span>
      </div>

      {/* Stacked Progress Bar */}
      <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden mb-6 shadow-inner">
        {total === 0 ? (
          <div className="h-full w-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500">
            No applications registered
          </div>
        ) : (
          Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
            const count = breakdown[statusKey] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            if (percentage === 0) return null;

            return (
              <div
                key={statusKey}
                style={{ width: `${percentage}%` }}
                title={`${config.label}: ${count} (${percentage.toFixed(1)}%)`}
                className={`h-full ${config.color} transition-all duration-500 relative group`}
              />
            );
          })
        )}
      </div>

      {/* Grid of Status Bars & Metrics */}
      <div className="space-y-3.5">
        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
          const count = breakdown[statusKey] || 0;
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

          return (
            <div key={statusKey} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 w-48">
                <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
                <span className="font-medium text-slate-700">{config.label}</span>
              </div>

              {/* Individual Bar */}
              <div className="flex-1 mx-4 h-2 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                <div
                  style={{ width: `${percentage}%` }}
                  className={`h-full ${config.color} rounded-full transition-all duration-500`}
                />
              </div>

              <div className="flex items-center gap-2 min-w-[70px] justify-end">
                <span className="font-bold text-slate-900">{count}</span>
                <span className="text-[11px] text-slate-400">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatusChart;
