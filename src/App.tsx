/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Curriculum } from './pages/Curriculum';
import { Resources } from './pages/Resources';
import { CalendarPage } from './pages/CalendarPage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DeveloperTools } from './pages/DeveloperTools';
import { Planner } from './pages/Planner';
import { GettingStarted } from './pages/GettingStarted';

function AppContent() {
  const { 
    user, 
    activeTab, 
    authLoading,
    activeSession,
    isSessionPaused,
    pauseReason,
    resumeStudySession,
    finishStudySession,
    cancelStudySession
  } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#07080a]">
        <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-900 font-mono text-xs font-bold text-white animate-pulse dark:bg-white dark:text-[#07080a]">
          III
        </div>
        <p className="mt-4 text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">
          Loading Security Node...
        </p>
      </div>
    );
  }

  // If the candidate is not authenticated, display the login layout.
  if (!user) {
    return <Login />;
  }

  // Render current active tab module.
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'curriculum':
        return <Curriculum />;
      case 'resources':
        return <Resources />;
      case 'calendar':
        return <CalendarPage />;
      case 'notes':
        return <NotesPage />;
      case 'settings':
        return <SettingsPage />;
      case 'planner':
        return <Planner />;
      case 'help':
        return <GettingStarted />;
      case 'developer':
        return (import.meta as any).env.DEV ? <DeveloperTools /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  const showResumeModal = activeSession && isSessionPaused && pauseReason && ['window_blur', 'tab_hidden', 'sleep_detected'].includes(pauseReason);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* Collapsible, persistent left navigation sidebar */}
      <Sidebar />

      {/* Main viewport area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        
        {/* Dynamic header containing breadcrumbs, search triggers, notification triggers */}
        <Header />

        {/* Scrollable content pane */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 outline-hidden">
          <div className="w-full">
            <ErrorBoundary>
              {renderActivePage()}
            </ErrorBoundary>
          </div>
        </main>

      </div>

      {showResumeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-5 transform animate-scale-up font-sans">
            <div className="flex items-center space-x-3 text-amber-500">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">Study Session Paused</h3>
                <p className="text-[9px] font-mono text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-0.5">Auto-Pause Protection</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              <p>
                Your active study session was automatically paused to prevent inflating your study hours.
              </p>
              <div className="p-2.5 bg-slate-50 dark:bg-[#07080a]/50 border border-slate-100 dark:border-slate-800/60 rounded-lg flex items-center justify-between font-mono text-[9px]">
                <span className="text-slate-450">PAUSE REASON:</span>
                <span className="font-bold text-slate-800 dark:text-slate-350 uppercase">
                  {pauseReason === 'window_blur' && 'Window Lost Focus'}
                  {pauseReason === 'tab_hidden' && 'Tab Suspended'}
                  {pauseReason === 'sleep_detected' && 'Laptop Sleep Detected'}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={resumeStudySession}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Resume Studying
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => finishStudySession(8, 4)}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center"
                >
                  Finish & Save
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to discard this study session?")) {
                      cancelStudySession();
                    }
                  }}
                  className="flex-1 py-2 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import { LearningResourceRepositoryProvider } from './context/LearningResourceRepositoryContext';

export default function App() {
  return (
    <LearningResourceRepositoryProvider>
      <AppProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AppProvider>
    </LearningResourceRepositoryProvider>
  );
}
