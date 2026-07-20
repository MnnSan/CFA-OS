import React, { useEffect } from 'react';
import { Sparkles, X, Play } from 'lucide-react';

interface MissionBriefData {
  priorKnowledge: string[];
  difficulty: string;
  formulaLoad: string;
  mentalMode: string;
  estimatedFocus: string;
  coachingTip: string;
  expectedSuccess: string;
}

interface MissionBriefDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBeginStudy: () => void;
  mission: {
    subjectCode: string;
    readingNumber: number | string;
    readingTitle: string;
    losCode: string;
    statement: string;
    estimatedDurationHours: number;
    confidenceLevel?: number | string;
  };
  loading: boolean;
  failed: boolean;
  brief: MissionBriefData | null;
}

const MissionBriefDrawer: React.FC<MissionBriefDrawerProps> = ({
  isOpen,
  onClose,
  onBeginStudy,
  mission,
  loading,
  failed,
  brief,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const fallbackBrief: MissionBriefData = {
    priorKnowledge: [
      `Review prerequisite concepts for ${mission.subjectCode} before starting`,
    ],
    difficulty: 'Medium',
    formulaLoad: 'Moderate',
    mentalMode: 'Conceptual',
    estimatedFocus: `${mission.estimatedDurationHours}h`,
    coachingTip: 'Begin by recalling the core framework from the previous reading before diving into new material.',
    expectedSuccess: `When finished, you should be able to apply LOS ${mission.losCode} concepts accurately.`,
  };

  const displayBrief = brief ?? (failed ? fallbackBrief : null);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-screen w-[420px] max-w-[95vw] bg-[#0B0F19]/95 backdrop-blur-md border-l border-slate-800 shadow-2xl transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        style={{ visibility: isOpen ? 'visible' : 'hidden' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2026] shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-amber-400">
                Mission Brief
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 cursor-pointer p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-[11px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <span className="animate-spin text-amber-400 text-xl">✦</span>
                <span className="text-[10px] font-mono text-slate-500">Preparing briefing...</span>
              </div>
            ) : (
              <>
                {/* Section 1: Mission Header */}
                <div>
                  <h2 className="text-sm font-bold text-slate-200 leading-snug">
                    Reading {mission.readingNumber} &mdash; LOS {mission.losCode}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {mission.statement}
                  </p>
                  <span className="inline-block mt-1.5 text-[9px] font-mono font-bold text-amber-500/80 uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {mission.subjectCode}
                  </span>
                </div>

                {/* Section 2: Activate Prior Knowledge */}
                <div>
                  <h3 className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                    Activate Prior Knowledge
                  </h3>
                  <ul className="space-y-1">
                    {(displayBrief?.priorKnowledge ?? []).slice(0, 3).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Section 3: Study Profile Badges */}
                <div>
                  <h3 className="text-[9px] font-bold font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                    Study Profile
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Difficulty', value: displayBrief?.difficulty ?? mission.estimatedDurationHours > 2 ? 'High' : 'Medium' },
                      { label: 'Formula Load', value: displayBrief?.formulaLoad ?? 'Moderate' },
                      { label: 'Mental Mode', value: displayBrief?.mentalMode ?? 'Conceptual' },
                      { label: 'Est. Focus', value: displayBrief?.estimatedFocus ?? `${mission.estimatedDurationHours}h` },
                    ].map(badge => (
                      <div
                        key={badge.label}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1e2026] bg-[#101116] text-[10px]"
                      >
                        <span className="text-slate-500 uppercase tracking-wider text-[8px] font-mono font-bold">
                          {badge.label}
                        </span>
                        <span className="text-slate-200 font-semibold">{badge.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: One Coaching Tip */}
                {displayBrief?.coachingTip && (
                  <div className="p-3 rounded border border-amber-500/15 bg-amber-500/5">
                    <h3 className="text-[9px] font-bold font-mono uppercase tracking-wider text-amber-400/80 mb-1">
                      One Coaching Tip
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {displayBrief.coachingTip}
                    </p>
                  </div>
                )}

                {/* Section 5: Expected Success */}
                {displayBrief?.expectedSuccess && (
                  <div className="p-3 rounded border border-emerald-500/15 bg-emerald-500/5 border-l-2 border-l-emerald-500">
                    <h3 className="text-[9px] font-bold font-mono uppercase tracking-wider text-emerald-400/80 mb-1">
                      Expected Success
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      {displayBrief.expectedSuccess}
                    </p>
                  </div>
                )}

                {/* Section 6: Primary Action */}
                <div className="pt-2">
                  <button
                    onClick={onBeginStudy}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer font-sans transition-colors flex items-center justify-center gap-2"
                  >
                    <Play size={14} className="fill-current" />
                    <span>Begin Study Session</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MissionBriefDrawer;
