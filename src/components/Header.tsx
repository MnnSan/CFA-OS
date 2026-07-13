/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Bell, Moon, Sun, User, ChevronRight, CheckCircle2 } from 'lucide-react';
import { SearchOverlay } from './SearchOverlay';
import { rateLimitTracker } from '../services/RateLimitTracker';
import { syncService, SyncStatus } from '../services/sync/SyncService';

export const Header: React.FC = () => {
  const { 
    activeTab, 
    selectedSubjectId, 
    selectedReadingId, 
    subjects, 
    readings, 
    settings, 
    updateSettings, 
    user,
    setActiveTab
  } = useApp();

  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [rateLimitSecs, setRateLimitSecs] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    const unsub = syncService.subscribe(() => {
      setSyncStatus(syncService.getStatus());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const updateRateLimit = () => {
      const state = rateLimitTracker.getState();
      setRateLimitSecs(state.retrySeconds);
      setIsRateLimited(state.isRateLimited);
    };
    updateRateLimit();
    return rateLimitTracker.subscribe(updateRateLimit);
  }, []);

  // Mock Notifications
  const notifications = [
    { id: 'n1', title: 'Daily Goal Achieved', body: 'You have hit your 3.5 hour target for today! Streak is now 14 days.', time: '10m ago', read: false },
    { id: 'n2', title: 'New Mock Exam Released', body: 'Structured Answer (Morning Session) Mock III-A is now available in the resource library.', time: '2h ago', read: false },
    { id: 'n3', title: 'Revision Reminder', body: 'Spaced repetition schedule suggests reviewing Fixed Income: Yield Curve Strategies today.', time: '1d ago', read: true }
  ];

  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'CFA Operating OS', tab: 'dashboard' }];

    if (activeTab === 'dashboard') {
      crumbs.push({ label: 'Dashboard', tab: 'dashboard' });
    } else if (activeTab === 'curriculum') {
      crumbs.push({ label: 'Curriculum database', tab: 'curriculum' });
      if (selectedSubjectId) {
        const sub = subjects.find(s => s.id === selectedSubjectId);
        if (sub) {
          crumbs.push({ label: sub.code, tab: 'curriculum' });
        }
      }
      if (selectedReadingId) {
        const rd = readings.find(r => r.id === selectedReadingId);
        if (rd) {
          crumbs.push({ label: `Reading ${rd.number}`, tab: 'curriculum' });
        }
      }
    } else if (activeTab === 'resources') {
      crumbs.push({ label: 'Resource Library', tab: 'resources' });
    } else if (activeTab === 'calendar') {
      crumbs.push({ label: 'Study Calendar', tab: 'calendar' });
    } else if (activeTab === 'notes') {
      crumbs.push({ label: 'Study Notes', tab: 'notes' });
    } else if (activeTab === 'settings') {
      crumbs.push({ label: 'System Configurations', tab: 'settings' });
    }

    return crumbs;
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 text-slate-900 transition-colors duration-200 dark:border-slate-800/60 dark:bg-[#07080a] dark:text-[#F8FAFC]">
        
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 overflow-hidden text-xs">
          {getBreadcrumbs().map((crumb, idx) => (
            <React.Fragment key={`${crumb.label}-${idx}`}>
              {idx > 0 && <span className="text-slate-350 dark:text-slate-700 mx-1">/</span>}
              <button
                onClick={() => setActiveTab(crumb.tab)}
className={`text-xs tracking-tight transition-colors duration-150 shrink-0 font-medium ${
                   idx === getBreadcrumbs().length - 1
                     ? 'text-slate-950 font-semibold dark:text-[#F8FAFC]'
                     : 'text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-6">
          
          {/* Multi-Device Synchronization Indicator */}
          {syncStatus.authStatus === 'authenticated' && (
            <div className="flex items-center space-x-1.5 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full px-2.5 py-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                syncStatus.syncStatus === 'syncing' ? 'bg-amber-400 animate-ping' :
                syncStatus.syncStatus === 'offline' ? 'bg-rose-400' :
                'bg-emerald-400'
              }`} />
              <span className="text-slate-500 dark:text-slate-400 font-mono tracking-tight text-[9px]">
                {syncStatus.syncStatus === 'syncing' ? (
                  `Syncing... (${syncStatus.pendingWrites} pending)`
                ) : syncStatus.syncStatus === 'offline' ? (
                  "Sync Offline"
                ) : (
                  `Synced ${syncStatus.lastSync === 'Never' ? '' : `${Math.max(0, Math.round((Date.now() - new Date(syncStatus.lastSync).getTime()) / 1000))}s ago`} ✔ Cloud`
                )}
              </span>
            </div>
          )}

          {/* AI Status Badge */}
          {(() => {
            const provider = settings.aiProvider || 'google-gemini';
            const baseAvailability = settings.aiAvailability || 'OFFLINE';
            // Override badge state when rate-limit tracker is active
            const availability = isRateLimited ? 'RATE_LIMITED' : baseAvailability;
            
            const providerNameMap: Record<string, string> = {
              'google-gemini': 'Gemini 3.5 Flash',
              'anthropic-claude': 'Claude 3.5 Sonnet',
              'local-ollama': 'Ollama Llama3'
            };
            const currentProviderName = providerNameMap[provider] || provider;

            const badgeStyles: Record<string, { bg: string; dot: string; label: string; text: string }> = {
              CONNECTED: { 
                bg: 'bg-emerald-100/10 dark:bg-emerald-950/20 border-emerald-500/20', 
                dot: 'bg-emerald-500 animate-pulse', 
                label: `Connected • ${currentProviderName}`,
                text: 'text-emerald-600 dark:text-emerald-400' 
              },
              OFFLINE: { 
                bg: 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800', 
                dot: 'bg-slate-400 dark:bg-slate-600', 
                label: 'Offline • Running Locally',
                text: 'text-slate-400 dark:text-slate-500' 
              },
              RATE_LIMITED: { 
                bg: 'bg-amber-100/10 dark:bg-amber-950/20 border-amber-500/20', 
                dot: 'bg-amber-500 animate-pulse', 
                label: isRateLimited ? `⚠️ Rate Limited • Retrying in ${rateLimitSecs}s` : 'Rate Limited',
                text: 'text-amber-600 dark:text-amber-400' 
              },
              INVALID_KEY: { 
                bg: 'bg-rose-100/10 dark:bg-rose-950/20 border-rose-500/20', 
                dot: 'bg-rose-500', 
                label: 'Invalid Key',
                text: 'text-rose-600 dark:text-rose-400' 
              },
              QUOTA_EXCEEDED: { 
                bg: 'bg-rose-100/10 dark:bg-rose-950/20 border-rose-500/20', 
                dot: 'bg-rose-500', 
                label: 'Quota Exceeded',
                text: 'text-rose-600 dark:text-rose-400' 
              },
              NETWORK_ERROR: { 
                bg: 'bg-rose-100/10 dark:bg-rose-950/20 border-rose-500/20', 
                dot: 'bg-rose-500', 
                label: 'Network Error',
                text: 'text-rose-600 dark:text-rose-400' 
              },
              PROVIDER_ERROR: { 
                bg: 'bg-rose-100/10 dark:bg-rose-950/20 border-rose-500/20', 
                dot: 'bg-rose-500', 
                label: 'Provider Error',
                text: 'text-rose-600 dark:text-rose-400' 
              }
            };

            const config = badgeStyles[availability] || badgeStyles.OFFLINE;

            return (
              <div 
                className={`flex items-center space-x-1.5 rounded px-2.5 py-1 text-[10px] font-mono border ${config.bg} ${config.text}`}
                title={`AI Status: ${config.label}`}
              >
                <span>🤖 AI:</span>
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                <span className="font-semibold">{config.label}</span>
              </div>
            );
          })()}

          {/* Quick Search Action */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center space-x-2 rounded bg-slate-100 px-3 py-1.5 text-left text-[11px] text-slate-400 hover:bg-slate-200/60 outline-hidden w-64 transition-colors duration-150 dark:bg-[#101116] dark:text-slate-400 dark:hover:bg-[#1e2026]"
            title="Search (Cmd + K)"
          >
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search curriculum, resources, notes...</span>
            <kbd className="hidden rounded bg-slate-200 px-1 font-mono text-[9px] text-slate-500 sm:inline dark:bg-[#1e2026] dark:text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded p-1 text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-slate-300"
            title={`Switch to ${settings.theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {settings.theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-slate-350" />}
          </button>

          {/* Notification Hub */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded p-1 text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-slate-300"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-200 border-2 border-white dark:border-[#07080a]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 z-40 w-80 rounded border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800/60 dark:bg-[#07080a]">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800/60">
                  <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">System Notifications</span>
                  <span className="text-[10px] text-slate-400">Streak: {user?.streakDays || 14}d</span>
                </div>
                <div className="max-h-64 overflow-y-auto mt-1 space-y-1">
                  {notifications.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-2.5 rounded hover:bg-slate-50 transition-colors duration-150 dark:hover:bg-[#101116]/60 ${
                        !item.read ? 'bg-slate-50/50 dark:bg-[#101116]/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]">{item.title}</span>
                        <span className="text-[9px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal dark:text-slate-400">{item.body}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-slate-100 pt-2 text-center dark:border-slate-800/60">
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="w-full text-[10px] text-slate-400 hover:text-slate-600 py-1"
                  >
                    Close Notification Panel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Context Trigger */}
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center space-x-2 rounded hover:text-slate-900 dark:hover:text-white"
            title="Account Settings"
          >
            <div className="h-7 w-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-600 dark:bg-[#101116] dark:text-slate-300">
              {user ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'C'}
            </div>
          </button>

        </div>
      </header>

      {/* Cmd + K Search Trigger Hotkey listener */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
