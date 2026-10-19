import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  GitPullRequest,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';

const navItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Job Offers',
    path: '/jobs',
    icon: Briefcase,
    badge: null,
  },
  {
    name: 'Candidates',
    path: '/candidates',
    icon: Users,
    badge: null,
  },
  {
    name: 'Applications Pipeline',
    path: '/applications',
    icon: GitPullRequest,
    badge: 'Kanban',
  },
  {
    name: 'Interviews',
    path: '/interviews',
    icon: Calendar,
    badge: 'New',
  },
];

const Sidebar = () => {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-md shadow-brand-500/20 text-white">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Talent<span className="text-brand-600">Flow</span>
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Recruitment AI
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Recruitment
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 transition-colors ${
                        isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* AI Capabilities Footnote */}
      <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-indigo-50 to-brand-50 border border-brand-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-800">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span>Claude AI Enabled</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
          PII anonymization (R1) & strict Zod validation (R2) enforced on all models.
        </p>
      </div>

      <div className="border-t border-slate-100 p-4 text-center text-xs text-slate-400">
        TalentFlow v1.0.0
      </div>
    </aside>
  );
};

export default Sidebar;
