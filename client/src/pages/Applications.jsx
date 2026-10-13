import React from 'react';
import { GitPullRequest } from 'lucide-react';

const Applications = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Applications Pipeline</h1>
          <p className="text-sm text-slate-500">Recruitment stages: New, Screening, Interview, Offer, Rejected</p>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <GitPullRequest className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-base font-semibold text-slate-800">Kanban Pipeline Initialized</h3>
        <p className="mt-1 text-sm text-slate-500">Interactive 5-column stage progression ready for Phase 4 deployment.</p>
      </div>
    </div>
  );
};

export default Applications;
