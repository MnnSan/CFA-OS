import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  HelpCircle, 
  Search, 
  Compass, 
  BookOpen, 
  Award, 
  Activity, 
  Keyboard, 
  ArrowRight, 
  CheckCircle, 
  Brain, 
  Timer, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const GettingStarted: React.FC = () => {
  const { setActiveTab, subjects, addEvent, dailyMission } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'welcome' | 'tour' | 'workflow' | 'ai' | 'shortcuts' | 'faq' | 'wizard'>('welcome');
  const [searchQuery, setSearchQuery] = useState('');
  const [tourStep, setTourStep] = useState(1);
  const [faqExpanded, setFaqExpanded] = useState<Record<string, boolean>>({});
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    return localStorage.getItem('cfa_onboarding_completed') === 'true';
  });

  // Wizard state
  const [wizardSubject, setWizardSubject] = useState('');
  const [wizardReading, setWizardReading] = useState('');
  const [wizardHours, setWizardHours] = useState(2);
  const [wizardConfidence, setWizardConfidence] = useState(3);
  const [wizardCreated, setWizardCreated] = useState(false);

  const completeOnboarding = () => {
    localStorage.setItem('cfa_onboarding_completed', 'true');
    setOnboardingCompleted(true);
    
    // Log as activity
    if (addEvent) {
      addEvent({
        id: `onb-${Date.now()}`,
        type: 'OnboardingCompleted',
        timestamp: new Date().toISOString(),
        title: 'CFA OS Onboarding Complete',
        description: 'User successfully completed the interactive operating system tour and guide.'
      } as any);
    }
  };

  const handleCreateWizardMission = () => {
    if (!wizardSubject || !wizardReading) return;
    
    // Save a custom daily study mission directly to localStorage
    const mockMission = {
      readingId: wizardReading,
      readingNumber: 4,
      readingTitle: 'Asset Allocation Principles',
      subjectCode: wizardSubject,
      losCode: '4a',
      statement: 'Formulate asset allocation strategies based on client constraints.',
      reason: 'Calculations are heavily represented in Schweser practice questions.',
      estimatedDurationHours: wizardHours,
      confidenceLevel: wizardConfidence,
      isRecoveryMission: false
    };

    localStorage.setItem('cfa_daily_study_mission', JSON.stringify(mockMission));
    setWizardCreated(true);
  };

  const faqData = [
    {
      q: "What is the core philosophy of the CFA OS?",
      a: "The CFA Operating System treats examination prep like an engineering pipeline. Instead of unguided reading, the OS orchestrates dynamic daily study missions derived directly from Schweser lectures and curriculum metrics, using AI strictly for advice and explanation."
    },
    {
      q: "How does the Mission Control execution state work?",
      a: "Mission Control schedules five target stages: Learn (Lecture), Understand (Curriculum), Internalize (Formulas), Consolidate (AI Guide), and Validate (Q-Bank Drills). Completion states are dynamically checked against study data or manually marked off."
    },
    {
      q: "Can I edit and duplicate Schwab schweser resources?",
      a: "Yes, in the Reading Workspace (Curriculum -> Resources sub-tab), you can launch, resume, edit duration/metadata, duplicate, delete, and link resources to any reading, LOS code, or formula sheet."
    },
    {
      q: "Is there spacing reflection after each module?",
      a: "Every daily mission concludes with a Reflection phase. The system collects qualitative focus indicators and self-ratings to dynamically recalibrate cognitive load metrics for upcoming study blocks."
    }
  ];

  const filteredFaqs = faqData.filter(
    faq => faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
           faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Visual Onboarding Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white border border-slate-800 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-3">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider">
              System Manual & Guidance Node
            </span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight font-sans">
              Getting Started with CFA OS
            </h1>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed">
              Welcome to the premium cognitive cockpit for CFA Level III preparation. Learn the workflows, keyboard shortcuts, and AI interaction rules to accelerate your path to charterholder status.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded-xl">
            {onboardingCompleted ? (
              <div className="text-center space-y-2">
                <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
                <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest block">
                  CFA OS Certified User
                </span>
                <span className="text-[9px] text-slate-400 font-mono">ONBOARDING RECORDED</span>
              </div>
            ) : (
              <button
                onClick={completeOnboarding}
                className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded uppercase tracking-wider transition cursor-pointer"
              >
                Complete Onboarding
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-[#1e2026] text-xs font-semibold overflow-x-auto whitespace-nowrap scrollbar-thin">
        {[
          { id: 'welcome', label: '1. Welcome & Philosophy', icon: Compass },
          { id: 'tour', label: '2. Interactive Walkthrough', icon: BookOpen },
          { id: 'workflow', label: '3. Study Workflows', icon: Activity },
          { id: 'ai', label: '4. AI Advisory Rules', icon: Sparkles },
          { id: 'shortcuts', label: '5. Productivity Shortcuts', icon: Keyboard },
          { id: 'faq', label: '6. Support Accordions', icon: HelpCircle },
          { id: 'wizard', label: '7. First Mission Wizard', icon: Brain },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/[0.02]'
                  : 'border-transparent text-slate-450 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] rounded-xl p-6 shadow-sm min-h-[400px]">
        
        {/* Welcome Panel */}
        {activeSubTab === 'welcome' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold font-sans">The Cognitive Operating System Architecture</h2>
            <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed font-sans">
              Unlike traditional checklists or study calendars, the **CFA Level III OS** functions as an executive cognitive workspace. It maps the official curriculum into modular units, links Schweeser lectures directly, computes cognitive load algorithms, and coordinates AI feedback.
            </p>
            <div className="grid md:grid-cols-3 gap-6 pt-4">
              <div className="p-4 bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-[#1e2026] rounded-xl space-y-2">
                <Brain className="h-6 w-6 text-indigo-500" />
                <h3 className="text-sm font-bold">1. Curriculum as Truth</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Everything connects back to the syllabus database. No mock schedules, no orphans, and no disconnected lists.
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-[#1e2026] rounded-xl space-y-2">
                <Timer className="h-6 w-6 text-indigo-500" />
                <h3 className="text-sm font-bold">2. Strict Active Recall</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  Move concepts from encoding (lectures) to consolidation (formulas, summaries) and retrieval (Q-Bank) systematically.
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-[#1e2026] rounded-xl space-y-2">
                <Sparkles className="h-6 w-6 text-indigo-500" />
                <h3 className="text-sm font-bold">3. Advisory AI Agent</h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  AI generates insights, digests templates, and explains formula steps. AI never updates records; you maintain full control.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Walkthrough Panel */}
        {activeSubTab === 'tour' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e2026] pb-3">
              <h2 className="text-lg font-bold font-sans">Animated Interface Tour</h2>
              <span className="text-[10px] font-mono text-slate-500">Step {tourStep} of 5</span>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Animated Walkthrough Visual */}
              <div className="relative h-64 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                
                {tourStep === 1 && (
                  <div className="text-center space-y-3 animate-pulse">
                    <div className="mx-auto h-16 w-48 border border-indigo-500/30 bg-indigo-500/10 rounded flex items-center justify-center font-mono text-xs text-indigo-400">
                      MISSION CONTROL CARD
                    </div>
                    <div className="text-[10px] font-mono text-slate-450">Active Target: Reading 4 • LOS 4a</div>
                    <div className="h-2 w-32 bg-slate-700 rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-emerald-500 w-1/3" />
                    </div>
                  </div>
                )}
                {tourStep === 2 && (
                  <div className="text-center space-y-3">
                    <div className="mx-auto h-24 w-60 border border-emerald-500/30 bg-emerald-500/10 rounded p-3 flex flex-col justify-between font-mono text-[10px] text-emerald-400">
                      <span>✓ Phase 1: Schweser Lecture</span>
                      <span>✓ Phase 2: Curriculum Reading</span>
                      <span className="animate-pulse">▶ Phase 3: Formula Review</span>
                    </div>
                  </div>
                )}
                {tourStep === 3 && (
                  <div className="text-center space-y-3">
                    <div className="mx-auto h-20 w-52 border border-amber-500/30 bg-amber-500/10 rounded flex items-center justify-center font-mono text-xs text-amber-400 relative">
                      <div className="absolute -top-2 -right-2 h-4 w-4 bg-amber-500 rounded-full animate-ping" />
                      COACHING INSIGHT
                    </div>
                    <p className="text-[9px] text-slate-450 font-mono">Prompt-Aware Cache Invalidation Active</p>
                  </div>
                )}
                {tourStep === 4 && (
                  <div className="text-center space-y-3">
                    <div className="mx-auto h-24 w-52 border border-blue-500/30 bg-blue-500/10 rounded p-2.5 flex flex-col justify-between text-left font-mono text-[10px] text-blue-400">
                      <div className="font-bold">Coming Up Next:</div>
                      <div>Q-Bank Drills</div>
                      <div className="text-[8px] text-slate-500">Transitioning load: Medium ➔ High</div>
                    </div>
                  </div>
                )}
                {tourStep === 5 && (
                  <div className="text-center space-y-3">
                    <div className="mx-auto h-16 w-16 bg-indigo-500/15 border border-indigo-500 rounded-full flex items-center justify-center text-2xl animate-spin">
                      ⚙
                    </div>
                    <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">WORKSPACE READY</div>
                  </div>
                )}
              </div>

              {/* Step Card details */}
              <div className="space-y-4">
                {tourStep === 1 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold">1. Dashboard & Mission Control</h3>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Your home cockpit. The Dashboard integrates cognitive runway statistics, weak topic lists, formula rating charts, and the **Mission Control Card** which drives your study targets.
                    </p>
                  </div>
                )}
                {tourStep === 2 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold">2. Study Phases & Execution</h3>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Every study stack decomposes into deterministic pedagogical phases: Watch Lecture, Deep Reading, Formula Practice, AI Notes, and Question Drills. Track metrics and complete steps systematically.
                    </p>
                  </div>
                )}
                {tourStep === 3 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold">3. Coach Insight Advisory</h3>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Generate targeted, context-aware advice for any study phase. The advisor analyzes current topic confidence and formula loads, securely caching recommendations relative to curriculum versioning.
                    </p>
                  </div>
                )}
                {tourStep === 4 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold">4. Next Phase Preview</h3>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Psychologically prepare for upcoming workload shifts. The Coming Up preview showcases estimated runtimes, required Bloom taxonomy categories, and cognitive load transition vectors.
                    </p>
                  </div>
                )}
                {tourStep === 5 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold">5. Reading Workspace Resources</h3>
                    <p className="text-xs text-slate-450 leading-relaxed">
                      Manage mapped learning assets. Launch, resume, duplicate, or edit Schweser videos, NotebookLM commentary feeds, and CFAI PDFs instantly. Updates propagate to all operating modules.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    disabled={tourStep === 1}
                    onClick={() => setTourStep(p => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 border border-slate-200 dark:border-[#1e2026] text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      if (tourStep === 5) {
                        setTourStep(1);
                      } else {
                        setTourStep(p => p + 1);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{tourStep === 5 ? 'Restart Tour' : 'Next Step'}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Workflow Panel */}
        {activeSubTab === 'workflow' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold font-sans">Recommended Daily Study Workflow</h2>
            <div className="relative pl-6 border-l-2 border-slate-200 dark:border-[#1e2026] space-y-6">
              {[
                { time: 'Morning • Open Dashboard', desc: 'Verify the Executive Coach panel for daily priorities and alerts. Open the AI-powered Pre-Study Brief to review key concepts.' },
                { time: 'Active Phase • Watch Lecture', desc: 'Launch Schwab Schweser videos directly from Mission Control. Log minutes spent.' },
                { time: 'Textbook Phase • Deep Reading', desc: 'Reconcile equations and reading text. Link relevant notes and check off completed LOS criteria.' },
                { time: 'Consolidation • Rehearse Formulas', desc: 'Memorize quantitative equations in the Formula Library, rating recall values.' },
                { time: 'Retrieval • Solve Questions', desc: 'Drill item sets in the Practice Q-Bank to benchmark active conceptual recall.' },
                { time: 'Dusk • Study Reflection & Logs', desc: 'Complete the learning log and submit focus ratings. Review updated analytical runway grids.' }
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-9 top-0.5 h-5 w-5 bg-indigo-500 rounded-full border-4 border-white dark:border-[#101116] flex items-center justify-center font-mono text-[9px] text-white">
                    {idx + 1}
                  </div>
                  <h4 className="text-xs font-bold font-mono text-indigo-500 uppercase tracking-wide">{step.time}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Advisory Panel */}
        {activeSubTab === 'ai' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold font-sans">AI Advisory Capabilities & Rules</h2>
            <div className="p-4 bg-blue-500/[0.02] border border-blue-500/10 border-l-4 border-l-blue-500 rounded-lg text-xs leading-relaxed text-slate-400">
              <strong>Architecture Constraint:</strong> AI operates strictly as an advisory stream. It generates context, provides mathematical explanations, and formats briefs. AI never mutates study records, completions, or database properties. You are the sole controller.
            </div>

            <div className="space-y-4">
              {[
                { title: 'Executive Coach Recommendations', prompt: 'Analyze candidate study statistics across CFA subject areas. Pinpoint weak subjects with high formula densities, and formulate a focus path for today.', when: 'Start of study session to guide reading focus.' },
                { title: 'Formula Walkthrough Coaching', prompt: 'Perform a detailed pedagogical explanation of LaTeX mathematical derivations for the following equations.', when: 'During formula reviews to solidify algebraic understanding.' },
                { title: 'Pre-Study Briefings', prompt: 'Generate an executive prior-knowledge checklist, Bloom complexity metrics, and common examiner traps for this reading.', when: 'Before opening the reading text to prepare working memory.' }
              ].map((aiItem, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-[#1e2026] rounded-lg space-y-2">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={11} className="text-amber-500" />
                    {aiItem.title}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">WHEN TO USE</span>
                      <p className="text-slate-400 mt-0.5">{aiItem.when}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">SAMPLE PROMPT STRUCTURE</span>
                      <code className="text-[9px] bg-slate-900 text-amber-500/90 font-mono p-1 mt-0.5 block border border-slate-800 rounded truncate">
                        {aiItem.prompt}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shortcuts Panel */}
        {activeSubTab === 'shortcuts' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold font-sans">Productivity Keyboard Shortcuts</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">NAVIGATION CONTROLS</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 dark:border-[#1e2026] pb-1.5">
                    <span className="font-mono text-slate-400">Navigate to Dashboard</span>
                    <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-indigo-400 font-mono rounded">Alt + D</kbd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-[#1e2026] pb-1.5">
                    <span className="font-mono text-slate-400">Navigate to Curriculum</span>
                    <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-indigo-400 font-mono rounded">Alt + C</kbd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-[#1e2026] pb-1.5">
                    <span className="font-mono text-slate-400">Open Resource Library</span>
                    <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-indigo-400 font-mono rounded">Alt + R</kbd>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">WORKSPACE CONTROLS</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 dark:border-[#1e2026] pb-1.5">
                    <span className="font-mono text-slate-400">Toggle Study Timer</span>
                    <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-indigo-400 font-mono rounded">Spacebar</kbd>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-[#1e2026] pb-1.5">
                    <span className="font-mono text-slate-400">Open/Close Mission Brief</span>
                    <kbd className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-indigo-400 font-mono rounded">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Panel */}
        {activeSubTab === 'faq' && (
          <div className="space-y-6">
            <div className="relative">
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-sans"
                placeholder="Search FAQ help topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            </div>

            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-[#1e2026] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFaqExpanded({ ...faqExpanded, [idx]: !faqExpanded[idx] })}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-[#0b0c10] text-left text-xs font-bold font-sans cursor-pointer hover:bg-slate-100 dark:hover:bg-[#101116]"
                  >
                    <span>{faq.q}</span>
                    {faqExpanded[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {faqExpanded[idx] && (
                    <div className="p-4 border-t border-slate-200 dark:border-[#1e2026] text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
              {filteredFaqs.length === 0 && (
                <p className="text-xs text-slate-500 font-mono italic text-center py-4">No matching FAQ topics found.</p>
              )}
            </div>
          </div>
        )}

        {/* First Mission Wizard */}
        {activeSubTab === 'wizard' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold font-sans">First Mission Wizard</h2>
            
            {wizardCreated ? (
              <div className="text-center p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3">
                <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-200">Daily Study Mission Configured!</h3>
                <p className="text-xs text-slate-450 leading-relaxed max-w-sm mx-auto">
                  Your custom study mission has been securely saved to the Curriculum Database. Return to the Dashboard to review and initiate the phases!
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-mono font-bold px-4 py-2 uppercase tracking-wide cursor-pointer"
                >
                  GO TO DASHBOARD
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Target Subject Area</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    value={wizardSubject}
                    onChange={e => setWizardSubject(e.target.value)}
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Reading Assignment</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    value={wizardReading}
                    onChange={e => setWizardReading(e.target.value)}
                  >
                    <option value="">Select Reading Chapter...</option>
                    <option value="read-aa-principles">Reading 4: Asset Allocation Principles</option>
                    <option value="read-aa-cme">Reading 5: Capital Market Expectations</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Target Daily Hours ({wizardHours} hours)</label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    className="w-full accent-indigo-500 bg-slate-950 rounded cursor-pointer"
                    value={wizardHours}
                    onChange={e => setWizardHours(parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Prior Confidence Rating ({wizardConfidence}/5)</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    className="w-full accent-indigo-500 bg-slate-950 rounded cursor-pointer"
                    value={wizardConfidence}
                    onChange={e => setWizardConfidence(parseInt(e.target.value))}
                  />
                </div>

                <button
                  type="button"
                  disabled={!wizardSubject || !wizardReading}
                  onClick={handleCreateWizardMission}
                  className="w-full mt-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-mono font-bold py-2.5 uppercase tracking-widest transition cursor-pointer"
                >
                  Configure Daily Mission
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default GettingStarted;
