import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Briefcase, Users, GitPullRequest, Award, ArrowUpRight, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const counters = stats?.counters || {
    totalJobs: 0,
    openJobs: 0,
    totalCandidates: 0,
    totalApplications: 0,
  };

  const statCards = [
    {
      label: 'Total Job Openings',
      value: counters.totalJobs,
      sublabel: `${counters.openJobs} currently open`,
      icon: Briefcase,
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Candidate Database',
      value: counters.totalCandidates,
      sublabel: 'Profiles in system',
      icon: Users,
      color: 'from-brand-600 to-purple-600',
      bgColor: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'Active Applications',
      value: counters.totalApplications,
      sublabel: 'Across all pipelines',
      icon: GitPullRequest,
      color: 'from-emerald-600 to-teal-600',
      bgColor: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'AI-Screened Offers',
      value: stats?.pipelineBreakdown?.OFFER || 0,
      sublabel: 'Final offer stage',
      icon: Award,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 p-8 text-white shadow-xl shadow-brand-950/10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-4 text-brand-200 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-brand-300" />
            TalentFlow Intelligence Hub
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Manage your recruitment campaigns, monitor application pipelines, and run privacy-preserving AI screenings powered by Claude.
          </p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.label}
                </span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bgColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold tracking-tight text-slate-900">
                  {loading ? '...' : card.value}
                </span>
                <p className="mt-1 text-xs text-slate-500">{card.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
