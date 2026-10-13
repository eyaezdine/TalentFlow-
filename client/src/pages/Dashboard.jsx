import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import StatusChart from '../components/StatusChart';
import {
  Briefcase,
  Users,
  GitPullRequest,
  Award,
  ArrowRight,
  PlusCircle,
  Sparkles,
  Calendar,
  Clock,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
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
      sublabel: `${counters.openJobs} active campaigns`,
      icon: Briefcase,
      bgColor: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Candidate Database',
      value: counters.totalCandidates,
      sublabel: 'Profiles in repository',
      icon: Users,
      bgColor: 'bg-brand-50 text-brand-700',
    },
    {
      label: 'Active Applications',
      value: counters.totalApplications,
      sublabel: 'Under review across stages',
      icon: GitPullRequest,
      bgColor: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Offer Stage',
      value: stats?.pipelineBreakdown?.OFFER || 0,
      sublabel: 'Final candidate offers',
      icon: Award,
      bgColor: 'bg-emerald-50 text-emerald-700',
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      NEW: 'bg-blue-50 text-blue-700 border-blue-200',
      SCREENING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      INTERVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
      OFFER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return styles[status] || styles.NEW;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 p-8 text-white shadow-xl shadow-brand-950/10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-4 text-brand-200 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-brand-300" />
            Recruitment Intelligence Dashboard
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Monitor recruitment pipeline throughput, candidate submissions, and trigger privacy-preserving Claude AI assessments.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/30 hover:bg-brand-500 transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Job Opening</span>
            </Link>
            <Link
              to="/applications"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 backdrop-blur-md transition border border-white/10"
            >
              <span>View Kanban Pipeline</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Counters Grid */}
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

      {/* Main Grid: Status Chart + Recent Applications */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Chart Column */}
        <div className="lg:col-span-2">
          <StatusChart breakdown={stats?.pipelineBreakdown || {}} />
        </div>

        {/* Recent Applications Sidebar List */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Applications</h2>
              <p className="text-xs text-slate-500">Latest candidate submissions</p>
            </div>
            <Link to="/applications" className="text-xs font-semibold text-brand-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="mt-4 flex-1 space-y-3.5">
            {(!stats?.recentApplications || stats.recentApplications.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
                <Clock className="h-8 w-8 mb-2 text-slate-300" />
                <span>No recent submissions registered.</span>
              </div>
            ) : (
              stats.recentApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="truncate pr-3">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {app.candidate?.name || 'Applicant'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {app.job?.title || 'Job Opening'}
                    </p>
                  </div>
                  <span
                    className={`inline-block shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                      app.status
                    )}`}
                  >
                    {app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
