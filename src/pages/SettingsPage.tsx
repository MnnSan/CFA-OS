/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, 
  Clock, 
  Bell, 
  Moon, 
  Sun, 
  Sparkles, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, settings, updateSettings, updateProfile } = useApp();
  const { theme, setTheme } = useTheme();
  
  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);

  // Settings State
  const [examDate, setExamDate] = useState(settings.examDate);
  const [dailyHours, setDailyHours] = useState(settings.targetDailyHours);
  const [sessionLen, setSessionLen] = useState(settings.preferredSessionLength);
  const [emailNotif, setEmailNotif] = useState(settings.notificationPreferences.email);
  const [pushNotif, setPushNotif] = useState(settings.notificationPreferences.push);
  const [streakNotif, setStreakNotif] = useState(settings.notificationPreferences.streakReminders);
  
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(profileName, profileEmail);
    setShowProfileSuccess(true);
    setTimeout(() => setShowProfileSuccess(false), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      examDate,
      targetDailyHours: Number(dailyHours),
      preferredSessionLength: Number(sessionLen),
      notificationPreferences: {
        email: emailNotif,
        push: pushNotif,
        streakReminders: streakNotif
      }
    });
    setShowSettingsSuccess(true);
    setTimeout(() => setShowSettingsSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      
      {/* 1. Profile Info settings */}
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-neutral-700/50 dark:bg-neutral-800/60">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-neutral-700/50">
          <User className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-neutral-200">
            Candidate Profile
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Full Name</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-neutral-700/50 dark:text-neutral-200"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Registered Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-neutral-700/50 dark:text-neutral-200"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              Update Profile Name
            </button>
            {showProfileSuccess && (
              <span className="text-[10px] text-green-600 font-mono flex items-center space-x-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Saved successfully to memory store</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Theme & Visual Appearance settings */}
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-neutral-700/50 dark:bg-neutral-800/60">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-neutral-700/50">
          {theme === 'light' ? (
            <Sun className="h-4.5 w-4.5 text-amber-500" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-400" />
          )}
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-neutral-200">
            Theme & Visual Appearance
          </h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-between p-3 rounded border text-left transition-all ${
              theme === 'light'
                ? 'border-slate-900 bg-slate-50/50 dark:border-neutral-100'
                : 'border-slate-200 hover:border-slate-350 bg-transparent'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sun className="h-4 w-4 text-amber-500" />
              <div>
                <span className="block text-xs font-semibold text-slate-800 dark:text-neutral-200">Light Slate Theme</span>
                <span className="text-[10px] text-slate-400">High contrast bright workspace</span>
              </div>
            </div>
            {theme === 'light' && <CheckCircle2 className="h-4 w-4 text-slate-900 dark:text-neutral-50" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-between p-3 rounded border text-left transition-all ${
              theme === 'dark'
                ? 'border-slate-900 bg-neutral-800/40 dark:border-neutral-100'
                : 'border-slate-200 hover:border-slate-350 bg-transparent'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Moon className="h-4 w-4 text-indigo-400" />
              <div>
                <span className="block text-xs font-semibold text-slate-800 dark:text-neutral-200">Deep Space Dark</span>
                <span className="text-[10px] text-slate-400">Restful low-light environment</span>
              </div>
            </div>
            {theme === 'dark' && <CheckCircle2 className="h-4 w-4 text-slate-900 dark:text-neutral-50" />}
          </button>
        </div>
      </div>

      {/* 2. Study Target Planning Settings */}
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-neutral-700/50 dark:bg-neutral-800/60">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-neutral-700/50">
          <Clock className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-neutral-200">
            Study Schedule & Target Planners
          </h2>
        </div>

        <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Target Exam Date</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-neutral-700/50 dark:text-neutral-200"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Target Daily Hours</label>
              <input
                type="number"
                step="0.5"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-neutral-700/50 dark:text-neutral-200"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Preferred Session Length (Min)</label>
              <input
                type="number"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-neutral-700/50 dark:text-neutral-200"
                value={sessionLen}
                onChange={(e) => setSessionLen(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
            >
              Save Planners
            </button>
            {showSettingsSuccess && (
              <span className="text-[10px] text-green-600 font-mono flex items-center space-x-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Planners synced with calendar countdowns</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 3. Notification Prefs */}
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-neutral-700/50 dark:bg-neutral-800/60">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-neutral-700/50">
          <Bell className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-neutral-200">
            Push & Communication Preferences
          </h2>
        </div>

        <div className="mt-4 space-y-3.5">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
              checked={emailNotif}
              onChange={(e) => {
                setEmailNotif(e.target.checked);
                updateSettings({ notificationPreferences: { ...settings.notificationPreferences, email: e.target.checked } });
              }}
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">Weekly Performance Audits</span>
              <p className="text-[10px] text-slate-450 leading-normal">Get weekly emails analyzing syllabus coverage progress, confidence shifts, and practice mock scores.</p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
              checked={pushNotif}
              onChange={(e) => {
                setPushNotif(e.target.checked);
                updateSettings({ notificationPreferences: { ...settings.notificationPreferences, push: e.target.checked } });
              }}
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">In-Browser Study Prompts</span>
              <p className="text-[10px] text-slate-450 leading-normal">Prompt when daily study session durations fall behind strategic schedule targets.</p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
              checked={streakNotif}
              onChange={(e) => {
                setStreakNotif(e.target.checked);
                updateSettings({ notificationPreferences: { ...settings.notificationPreferences, streakReminders: e.target.checked } });
              }}
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">Streak Recovery Notices</span>
              <p className="text-[10px] text-slate-450 leading-normal">Reminders at 20:00 local time if no syllabus logs have been updated, to protect daily streaks.</p>
            </div>
          </label>
        </div>
      </div>

      {/* 4. Future-Ready AI Copilot Configurations */}
      <div className="rounded border border-dashed border-slate-200 p-5 dark:border-neutral-700/50 dark:bg-neutral-950/20">
        <div className="flex items-center space-x-2 border-b border-dashed border-slate-200 pb-3 dark:border-neutral-700/50">
          <Sparkles className="h-4.5 w-4.5 text-slate-400 animate-pulse" />
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase font-mono">
            Future AI Assistant Setup (v2 Blueprint)
          </h2>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 opacity-50 select-none">
          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase">Gemini Model Choice</label>
            <select disabled className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 dark:bg-neutral-800">
              <option>models/gemini-3.5-flash (Fast, accurate summaries)</option>
              <option>models/gemini-3.1-pro-preview (Deep reasoning on portfolios)</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-mono text-slate-400 uppercase">AI Mentor Coaching Tone</label>
            <select disabled className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-slate-50 dark:bg-neutral-800">
              <option>Rigorous Academic (CFA Grader standards)</option>
              <option>Pragmatic Coach (Key topic focus)</option>
              <option>Socratic Guide (Self-reflection prompts)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-start space-x-2.5 text-[10px] text-slate-400 leading-relaxed">
          <Sparkles className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong>Version 2 Intelligence Architecture Note:</strong> In future updates, this interface will permit students to toggle on-demand Gemini summaries for any Learning Outcome Statement (LOS), receive deep diagnostic analyses on mock exam short-answers, and synthesize personalized study schedules based on performance weak spots.
          </p>
        </div>
      </div>

    </div>
  );
};
