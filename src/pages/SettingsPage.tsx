import React, { useState, useEffect } from 'react';
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
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  Trash2,
  HelpCircle,
  Check
} from 'lucide-react';
import { AIProviderRegistry } from '../services/AIProvider';
import { aiJobQueue } from '../services/AiJobQueueService';
import { DeveloperDiagnosticsPanel } from '../components/DeveloperDiagnosticsPanel';

export const SettingsPage: React.FC = () => {
  const { user, settings, updateSettings, updateProfile, subjects, readings, losList, generateCoachPlan, eventBus } = useApp();
  const { theme, setTheme } = useTheme();
  
  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);

  // Settings State
  const [examDate, setExamDate] = useState(settings.examDate);
  const [startDate, setStartDate] = useState(settings.targetStartDate);
  const [dailyHours, setDailyHours] = useState(settings.targetDailyHours);
  const [sessionLen, setSessionLen] = useState(settings.preferredSessionLength);
  const [reviewBuffer, setReviewBuffer] = useState(settings.reviewBuffer || 60);
  const [emailNotif, setEmailNotif] = useState(settings.notificationPreferences.email);
  const [pushNotif, setPushNotif] = useState(settings.notificationPreferences.push);
  const [streakNotif, setStreakNotif] = useState(settings.notificationPreferences.streakReminders);
  
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);

  // AI Configuration State
  const [aiProvider, setAiProvider] = useState(settings.aiProvider || 'google-gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [claudeApiKey, setClaudeApiKey] = useState(settings.claudeApiKey || '');
  const [ollamaEndpoint, setOllamaEndpoint] = useState(settings.ollamaEndpoint || 'http://localhost:11434');
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'SUCCESS' | 'ERROR' | null>(null);
  const [connectionTestError, setConnectionTestError] = useState<string | null>(null);

  // Interceptor Modal State
  const [showMutationModal, setShowMutationModal] = useState(false);
  const [mutationData, setMutationData] = useState<{
    affectedLosCount: number;
    affectedReadingsCount: number;
    affectedSubjectsCount: number;
    oldFinishDate: string;
    newFinishDate: string;
    oldCushion: number;
    newCushion: number;
  } | null>(null);

  // Telemetry Local State
  const [telemetry, setTelemetry] = useState(aiJobQueue.getTelemetry());

  useEffect(() => {
    // Keep local telemetry synced
    const interval = setInterval(() => {
      setTelemetry(aiJobQueue.getTelemetry());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Notification permission state
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission | 'unavailable'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotifPermission(Notification.permission);
    } else {
      setBrowserNotifPermission('unavailable');
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setBrowserNotifPermission(result);
  };
  
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(profileName, profileEmail);
    setShowProfileSuccess(true);
    setTimeout(() => setShowProfileSuccess(false), 3000);
  };

  const handleSaveSettingsAttempt = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if parameters mutated
    const isMutated =
      startDate !== settings.targetStartDate ||
      examDate !== settings.examDate ||
      Number(dailyHours) !== settings.targetDailyHours ||
      Number(reviewBuffer) !== settings.reviewBuffer;

    if (isMutated) {
      const affectedSubjectsCount = subjects.length;
      const affectedReadingsCount = readings.length;
      const affectedLosCount = losList.filter(l => l.status !== 'Completed').length;

      const calculateFinish = (exam: string, buffer: number) => {
        try {
          const ex = new Date(exam);
          const fin = new Date(ex.getTime() - buffer * 24 * 60 * 60 * 1000);
          return fin.toISOString().split('T')[0];
        } catch {
          return 'N/A';
        }
      };

      setMutationData({
        affectedLosCount,
        affectedReadingsCount,
        affectedSubjectsCount,
        oldFinishDate: calculateFinish(settings.examDate, settings.reviewBuffer || 60),
        newFinishDate: calculateFinish(examDate, Number(reviewBuffer)),
        oldCushion: settings.reviewBuffer || 60,
        newCushion: Number(reviewBuffer)
      });
      setShowMutationModal(true);
    } else {
      executeSaveSettings();
    }
  };

  const executeSaveSettings = () => {
    updateSettings({
      examDate,
      targetStartDate: startDate,
      targetDailyHours: Number(dailyHours),
      preferredSessionLength: Number(sessionLen),
      reviewBuffer: Number(reviewBuffer),
      notificationPreferences: {
        email: emailNotif,
        push: pushNotif,
        streakReminders: streakNotif
      }
    });

    eventBus.publish({
      type: 'PlannerChanged',
      timestamp: new Date().toISOString(),
      source: 'SettingsPage',
      entityId: 'settings',
      payload: { examDate, targetStartDate: startDate, targetDailyHours: Number(dailyHours) }
    });

    setShowSettingsSuccess(true);
    setTimeout(() => setShowSettingsSuccess(false), 3000);
  };

  const handleConfirmMutation = () => {
    executeSaveSettings();
    generateCoachPlan();
    setShowMutationModal(false);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setConnectionTestError(null);

    const providerId = aiProvider;
    const key = providerId === 'google-gemini' ? geminiApiKey : providerId === 'anthropic-claude' ? claudeApiKey : '';
    
    try {
      const provider = AIProviderRegistry.getProvider(providerId);
      const isValid = await provider.validateKey(key, ollamaEndpoint);
      if (isValid) {
        setConnectionTestResult('SUCCESS');
        updateSettings({
          aiProvider,
          geminiApiKey,
          claudeApiKey,
          ollamaEndpoint,
          aiAvailability: 'CONNECTED'
        });
      } else {
        setConnectionTestResult('ERROR');
        setConnectionTestError('Handshake validation rejected. Check key details or network connection.');
        updateSettings({ aiAvailability: 'INVALID_KEY' });
      }
    } catch (e: any) {
      setConnectionTestResult('ERROR');
      setConnectionTestError(e.message || 'Connection failed.');
      updateSettings({ aiAvailability: 'NETWORK_ERROR' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleResetTelemetry = () => {
    aiJobQueue.clearTelemetry();
    setTelemetry(aiJobQueue.getTelemetry());
  };

  return (
    <div className="space-y-6 animate-fade-in">

      
      {/* 1. Profile Info settings */}
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-[#1e2026] dark:bg-[#101116]">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-[#1e2026]">
          <User className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-[#F8FAFC]">
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
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Registered Email</label>
              <input
                type="email"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
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
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-[#1e2026] dark:bg-[#101116]">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-[#1e2026]">
          {theme === 'light' ? (
            <Sun className="h-4.5 w-4.5 text-amber-500" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-400" />
          )}
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-[#F8FAFC]">
            Theme & Visual Appearance
          </h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-between p-3 rounded border text-left transition-all ${
              theme === 'light'
                ? 'border-slate-900 bg-slate-50/50 dark:border-[#F8FAFC]'
                : 'border-slate-200 hover:border-slate-350 bg-transparent'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sun className="h-4 w-4 text-amber-500" />
              <div>
                <span className="block text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">Light Slate Theme</span>
                <span className="text-[10px] text-slate-400">High contrast bright workspace</span>
              </div>
            </div>
            {theme === 'light' && <CheckCircle2 className="h-4 w-4 text-slate-900 dark:text-[#F8FAFC]" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-between p-3 rounded border text-left transition-all ${
              theme === 'dark'
                ? 'border-slate-900 bg-neutral-800/40 dark:border-[#F8FAFC]'
                : 'border-slate-200 hover:border-slate-350 bg-transparent'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Moon className="h-4 w-4 text-indigo-400" />
              <div>
                <span className="block text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">Deep Space Dark</span>
                <span className="text-[10px] text-slate-400">Restful low-light environment</span>
              </div>
            </div>
            {theme === 'dark' && <CheckCircle2 className="h-4 w-4 text-slate-900 dark:text-[#F8FAFC]" />}
          </button>
        </div>
      </div>

      {/* 2. Study Target Planning Settings */}
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-[#1e2026] dark:bg-[#101116]">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-[#1e2026]">
          <Clock className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-[#F8FAFC]">
            Study Schedule & Target Planners
          </h2>
        </div>

        <form onSubmit={handleSaveSettingsAttempt} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-5">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Target Start Date</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Target Exam Date</label>
              <input
                type="date"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Review Buffer (Days)</label>
              <input
                type="number"
                required
                min="0"
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={reviewBuffer}
                onChange={(e) => setReviewBuffer(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Target Daily Hours</label>
              <input
                type="number"
                step="0.5"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Session Length (Min)</label>
              <input
                type="number"
                required
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={sessionLen}
                onChange={(e) => setSessionLen(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
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
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-[#1e2026] dark:bg-[#101116]">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-[#1e2026]">
          <Bell className="h-4.5 w-4.5 text-slate-400" />
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-[#F8FAFC]">
            Push & Communication Preferences
          </h2>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* Weekly Performance Audits */}
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">Weekly Performance Audits</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider ${
                  emailNotif
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${emailNotif ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {emailNotif ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-[10px] text-slate-450 leading-normal">Get weekly emails analyzing syllabus coverage progress, confidence shifts, and practice mock scores.</p>
            </div>
          </label>

          {/* In-Browser Study Prompts */}
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
              checked={pushNotif}
              onChange={(e) => {
                setPushNotif(e.target.checked);
                updateSettings({ notificationPreferences: { ...settings.notificationPreferences, push: e.target.checked } });
                if (e.target.checked) requestBrowserPermission();
              }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">In-Browser Study Prompts</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider ${
                  pushNotif && browserNotifPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${pushNotif && browserNotifPermission === 'granted' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {pushNotif && browserNotifPermission === 'granted' ? 'Active' : pushNotif && browserNotifPermission === 'denied' ? 'Blocked' : pushNotif && browserNotifPermission === 'default' ? 'Needs Permission' : 'Inactive'}
                </span>
              </div>
              <p className="text-[10px] text-slate-450 leading-normal">Prompt when daily study session durations fall behind strategic schedule targets.</p>
              {pushNotif && browserNotifPermission !== 'granted' && browserNotifPermission !== 'unavailable' && (
                <button
                  onClick={requestBrowserPermission}
                  className="mt-1 text-[10px] font-mono font-bold text-amber-500 hover:text-amber-400 underline"
                >
                  {browserNotifPermission === 'denied' ? 'Browser notifications blocked — update in browser settings' : 'Click to enable browser notifications'}
                </button>
              )}
              {browserNotifPermission === 'unavailable' && (
                <p className="mt-1 text-[10px] text-slate-400 font-mono">Browser notifications not supported in this environment.</p>
              )}
            </div>
          </label>

          {/* Streak Recovery Notices */}
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
              checked={streakNotif}
              onChange={(e) => {
                setStreakNotif(e.target.checked);
                updateSettings({ notificationPreferences: { ...settings.notificationPreferences, streakReminders: e.target.checked } });
                if (e.target.checked) requestBrowserPermission();
              }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">Streak Recovery Notices</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider ${
                  streakNotif && browserNotifPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${streakNotif && browserNotifPermission === 'granted' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  {streakNotif && browserNotifPermission === 'granted' ? 'Active' : streakNotif && browserNotifPermission === 'denied' ? 'Blocked' : streakNotif && browserNotifPermission === 'default' ? 'Needs Permission' : 'Inactive'}
                </span>
              </div>
              <p className="text-[10px] text-slate-450 leading-normal">Reminders at 20:00 local time if no syllabus logs have been updated, to protect daily streaks.</p>
            </div>
          </label>
        </div>
      </div>

      {/* 4. Active AI Copilot Configurations & Key Validation */}
      <div className="rounded border border-slate-200 bg-white p-5 dark:border-[#1e2026] dark:bg-[#101116] space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-[#1e2026]">
          <Sparkles className="h-4.5 w-4.5 text-amber-500" />
          <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-[#F8FAFC]">
            AI Assistant Configurations (Sprint M6 Engine)
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase">AI Provider</label>
            <select
              className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as any)}
            >
              <option value="google-gemini">Google Gemini (Cloud)</option>
              <option value="anthropic-claude">Anthropic Claude (Cloud)</option>
              <option value="local-ollama">Local Ollama (Offline Local)</option>
            </select>
          </div>

          {aiProvider === 'google-gemini' && (
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Gemini API Key</label>
              <input
                type="password"
                placeholder="AI Studio API Key"
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
            </div>
          )}

          {aiProvider === 'anthropic-claude' && (
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Claude API Key</label>
              <input
                type="password"
                placeholder="sk-ant-..."
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
              />
            </div>
          )}

          {aiProvider === 'local-ollama' && (
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Ollama Endpoint</label>
              <input
                type="text"
                className="mt-1 w-full rounded border border-slate-200 p-2 text-xs bg-transparent text-slate-850 dark:border-[#1e2026] dark:text-[#F8FAFC]"
                value={ollamaEndpoint}
                onChange={(e) => setOllamaEndpoint(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 dark:bg-white dark:text-[#07080a] dark:hover:bg-slate-200"
          >
            {isTestingConnection ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Validate API Handshake
          </button>
          
          {connectionTestResult === 'SUCCESS' && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>CONNECTED successfully! API handshake OK.</span>
            </span>
          )}

          {connectionTestResult === 'ERROR' && (
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono flex items-center space-x-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>🔴 Handshake / Connection Error: {connectionTestError}</span>
            </span>
          )}
        </div>

        {/* Local Telemetry Tracker */}
        <div className="mt-4 p-4 rounded bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-[#1e2026] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wide">
              Token Footprint & Telemetry Accounting
            </span>
            <button
              onClick={handleResetTelemetry}
              className="text-[9px] text-rose-500 hover:text-rose-450 font-mono flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Clear Telemetry
            </button>
          </div>
          <div className="grid gap-4 grid-cols-3 text-xs font-mono">
            <div>
              <span className="block text-[9px] text-slate-400 uppercase">Input Token Pool</span>
              <span className="text-slate-700 dark:text-slate-350 font-bold">{(telemetry?.inputTokens || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 uppercase">Output Token Pool</span>
              <span className="text-slate-700 dark:text-slate-350 font-bold">{(telemetry?.outputTokens || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-400 uppercase">Calculated Cost ($)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">${(telemetry?.costUSD || 0).toFixed(5)}</span>
            </div>
          </div>
        </div>

        {/* Sprint M7.1 — AI Execution Diagnostics */}
        <DeveloperDiagnosticsPanel />
      </div>

      {/* CALCULATED PARAMETER MUTATION INTERCEPTOR MODAL */}
      {showMutationModal && mutationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-[#07080a] p-6 text-slate-200 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-400">
                ⚠️ SCHEDULE PARAMETERS DETECTED MUTATION
              </h3>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs leading-relaxed text-slate-400">
                You are modifying the study timeline parameters. This requires recalculating and rebuilding the complete syllabus study blocks:
              </p>

              <div className="p-3 bg-[#101116] border border-slate-850 rounded text-xs space-y-2">
                <span className="block text-[9px] font-mono uppercase text-slate-500 tracking-wider">Impact Metrics Analysis</span>
                <ul className="space-y-1 text-slate-300 font-mono text-[11px]">
                  <li>• <strong className="text-amber-400">{mutationData.affectedLosCount}</strong> Uncompleted LOS Target Rows</li>
                  <li>• <strong className="text-amber-400">{mutationData.affectedReadingsCount}</strong> Reading Chapters Included</li>
                  <li>• <strong className="text-amber-400">{mutationData.affectedSubjectsCount}</strong> Core Course Subjects</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#101116] border border-slate-850 p-3 rounded">
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase">Estimated Syllabus Finish</span>
                  <span className="block text-slate-300 mt-1">
                    {mutationData.oldFinishDate} ──► <strong className="text-amber-400">{mutationData.newFinishDate}</strong>
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase">Sandbox Review Cushion</span>
                  <span className="block text-slate-300 mt-1">
                    {mutationData.oldCushion}d ──► <strong className="text-amber-400">{mutationData.newCushion}d</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowMutationModal(false)}
                className="px-3.5 py-2 rounded text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                ❌ Discard Changes
              </button>
              <button
                type="button"
                onClick={handleConfirmMutation}
                className="px-4 py-2 rounded text-xs font-semibold bg-amber-500 text-[#07080a] hover:bg-amber-400 transition-colors flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Recalculate & Rebuild Coach Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
