import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  GitPullRequest,
  Calendar,
  Sparkles,
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
      <div className="flex items-center justify-center border-b border-slate-100 py-4 px-4 bg-white">
        <img
          src="/logo.png"
          alt="TalentFlow Logo"
          className="h-24 w-auto max-w-full object-contain drop-shadow-sm"
        />
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
                `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 transition-colors ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
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



      <div className="border-t border-slate-100 p-4 text-center text-xs text-slate-400">
        TalentFlow v1.0.0
      </div>
    </aside>
  );
};

export default Sidebar;
