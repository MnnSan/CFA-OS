/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  Library, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut,
  User,
  Clock,
  Terminal,
  BarChart3,
  HelpCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    user,
    logout,
    settings
  } = useApp();

  const [isHovered, setIsHovered] = React.useState(false);
  const isExpanded = isHovered;

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', label: 'MM Study Planner', icon: BarChart3 },
    { id: 'curriculum', label: 'Curriculum database', icon: BookOpen },
    { id: 'resources', label: 'Resource Library', icon: Library },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'notes', label: 'Study Notes', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Getting Started', icon: HelpCircle },
  ];

  if ((import.meta as any).env.DEV) {
    navigationItems.push({ id: 'developer', label: 'Developer Tools', icon: Terminal });
  }

  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = () => {
    const examDateStr = settings?.examDate || '2026-08-25';
    const exam = new Date(examDateStr + 'T00:00:00');
    const diff = exam.getTime() - now.getTime();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  };

  const cd = getCountdown();

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col border-r border-slate-200 bg-white text-[#111827] dark:border-slate-800/60 dark:bg-[#07080a] transition-all duration-200 ease-out ${
        isExpanded ? 'w-60' : 'w-16'
      }`}
    >
      {/* Brand / Logo Header */}
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-200 dark:border-slate-800/60">
        <img 
          src={settings?.theme === 'dark' ? '/logo-white.svg' : '/logo-black.svg'} 
          alt="CFA L3 OS Logo" 
          className="h-6 w-6 shrink-0 select-none"
        />
        {isExpanded && (
          <span className="ml-2 text-sm font-semibold tracking-tight text-[#111827] dark:text-[#F8FAFC] whitespace-nowrap">
            CFA OS / L3
          </span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-3 overflow-hidden">
        {isExpanded && (
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 px-3">Platform</div>
        )}
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center space-x-3 rounded-md px-3 py-2 text-xs font-medium transition-all duration-150 ${
                isActive 
                  ? 'bg-slate-100 text-slate-900 dark:bg-[#101116] dark:text-[#F8FAFC]' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/60 dark:text-slate-400 dark:hover:bg-[#101116]/50 dark:hover:text-[#F8FAFC]'
              } ${!isExpanded && 'justify-center'}`}
              title={!isExpanded ? item.label : undefined}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-inherit' : 'text-slate-400'}`} />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Quick Stats Block — Dynamic Exam Countdown Card */}
      {isExpanded && user && (
        <div className="mx-3 mb-2 rounded border border-slate-200 bg-white p-3.5 dark:border-[#1e2026] dark:bg-[#07080a]/80 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Exam Countdown
            </span>
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center font-mono">
            <div className="bg-slate-50 dark:bg-[#101116] p-1 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] block">{cd.days}</span>
              <span className="text-[8px] text-slate-400 uppercase block">Days</span>
            </div>
            <div className="bg-slate-50 dark:bg-[#101116] p-1 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] block">{String(cd.hours).padStart(2, '0')}</span>
              <span className="text-[8px] text-slate-400 uppercase block">Hrs</span>
            </div>
            <div className="bg-slate-50 dark:bg-[#101116] p-1 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] block">{String(cd.minutes).padStart(2, '0')}</span>
              <span className="text-[8px] text-slate-400 uppercase block">Min</span>
            </div>
            <div className="bg-slate-50 dark:bg-[#101116] p-1 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-amber-500 dark:text-amber-400 block">{String(cd.seconds).padStart(2, '0')}</span>
              <span className="text-[8px] text-slate-400 uppercase block">Sec</span>
            </div>
          </div>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#101116]">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(10, (300 - cd.days) / 3))}%` }}
            />
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800/60">
        {!isExpanded ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center dark:bg-[#101116] text-slate-600 dark:text-slate-300">
              <User className="h-4 w-4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center dark:bg-[#101116] text-slate-600 dark:text-slate-300 text-xs font-semibold">
                {user ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate dark:text-[#F8FAFC]">
                  {user ? user.name : 'A. Candidate'}
                </span>
                <span className="text-[10px] text-slate-400 truncate leading-none mt-0.5">
                  Institutional Tier
                </span>
              </div>
            </div>
            {user && (
              <button 
                onClick={logout}
                className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-slate-900 uppercase tracking-wider font-bold transition-colors mt-1"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout Session</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
