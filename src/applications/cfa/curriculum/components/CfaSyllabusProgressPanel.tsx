import React, { useState, useMemo } from 'react';
import { Subject, Reading, LearningOutcomeStatement } from '../../../../types';

interface SyllabusProgressPanelProps {
  subjects: Subject[];
  readings: Reading[];
  losList: LearningOutcomeStatement[];
}

export const CfaSyllabusProgressPanel: React.FC<SyllabusProgressPanelProps> = ({
  subjects,
  readings,
  losList,
}) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const subjectBlocks = useMemo(() => {
    return subjects
      .filter(s => s.enabled !== false)
      .map(subject => {
        const subjectReadings = readings.filter(r => r.subjectId === subject.id);
        const readingLOS = losList.filter(l => subjectReadings.some(r => r.id === l.readingId));
        const completedLOS = readingLOS.filter(l => l.status === 'Completed').length;
        const totalLOS = readingLOS.length;
        return { subject, readings: subjectReadings, completedLOS, totalLOS };
      })
      .filter(b => b.readings.length > 0 || b.totalLOS > 0);
  }, [subjects, readings, losList]);

  const totalLOS = useMemo(() => subjectBlocks.reduce((s, b) => s + b.totalLOS, 0), [subjectBlocks]);
  const completedLOS = useMemo(() => subjectBlocks.reduce((s, b) => s + b.completedLOS, 0), [subjectBlocks]);
  const completionPct = totalLOS > 0 ? Math.round((completedLOS / totalLOS) * 100) : 0;

  return (
    <div className="bg-white dark:bg-[#101116] border border-slate-200 dark:border-[#1e2026] overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-[#1e2026] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-widest text-slate-500 dark:text-slate-400 font-bold uppercase">
            Syllabus Progress
          </span>
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
            {completionPct}%
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-200 font-mono">
            {completionPct}%
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            &bull; {completedLOS} of {totalLOS} LOS mastered
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-[#1e2026] rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
        {subjectBlocks.map(block => {
          const isExpanded = !!expandedSubjects[block.subject.id];
          const subPct = block.totalLOS > 0 ? Math.round((block.completedLOS / block.totalLOS) * 100) : 0;

          return (
            <div key={block.subject.id}>
              {/* Subject Header Row */}
              <button
                onClick={() => toggleSubject(block.subject.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/[0.15] dark:hover:bg-[#181a22]/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-slate-400 dark:text-slate-500 shrink-0">
                    {isExpanded ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-sans font-semibold text-slate-700 dark:text-slate-300 truncate block">
                      {block.subject.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {block.subject.code}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <div className="w-20 h-1.5 bg-slate-100 dark:bg-[#1e2026] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${subPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 tabular-nums w-12 text-right">
                    {block.completedLOS}/{block.totalLOS}
                  </span>
                </div>
              </button>

              {/* Expanded Readings List */}
              {isExpanded && (
                <div className="bg-slate-50/50 dark:bg-[#0a0b0e]/60">
                  {block.readings.map(reading => {
                    const readingLosItems = losList.filter(l => l.readingId === reading.id);
                    const readingCompleted = readingLosItems.filter(l => l.status === 'Completed').length;
                    const readingTotal = readingLosItems.length;
                    const rdPct = readingTotal > 0 ? Math.round((readingCompleted / readingTotal) * 100) : 0;

                    return (
                      <div
                        key={reading.id}
                        className="flex items-center justify-between px-4 py-2.5 pl-10 border-t border-slate-100/50 dark:border-slate-800/20 hover:bg-slate-50/[0.2] dark:hover:bg-[#181a22]/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded font-mono shrink-0">
                            R{reading.readingNumber || reading.number}
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">
                            {reading.name || reading.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 ml-2">
                          <div className="w-16 h-1 bg-slate-100 dark:bg-[#1e2026] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                rdPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${rdPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 tabular-nums w-14 text-right">
                            {readingCompleted}/{readingTotal} LOS
                          </span>
                          {readingTotal > 0 && readingCompleted === readingTotal && (
                            <span className="text-emerald-500 shrink-0">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {subjectBlocks.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No syllabus data loaded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
