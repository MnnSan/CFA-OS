import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CurriculumTree } from '../applications/cfa/curriculum/components/CurriculumTree';
import { ReadingWorkspace } from '../applications/cfa/curriculum/components/ReadingWorkspace';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  Edit2,
  BookOpen,
  Award,
  Clock,
  Activity,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const Curriculum: React.FC = () => {
  const {
    subjects,
    chapters,
    readings,
    losList,
    notes,
    formulas,
    plannerProgress,
    curriculumService,
    curriculumTreeService,
    workspaceState,
    updateWorkspaceState,
    getReadingProgress,
    activeTemplate
  } = useApp();

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('cfa_curriculum_sidebar_width');
    return saved ? Math.max(240, Math.min(480, Number(saved))) : 320;
  });

  // Track expanded chapters in Subject Workspace
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  
  // Chapter context menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<{ type: string; id: string; name: string } | null>(null);

  // Sync sidebarWidth changes to localStorage
  useEffect(() => {
    localStorage.setItem('cfa_curriculum_sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);

  // Sidebar drag handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(480, startWidth + (moveEvent.clientX - startX)));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Resolve active context
  const activeSubjectId = workspaceState.selectedSubjectId || (subjects.length > 0 ? subjects[0].id : null);
  const activeSubject = subjects.find(s => s.id === activeSubjectId);
  const activeChapters = useMemo(() => {
    if (!activeSubjectId) return [];
    return chapters.filter(c => c.subjectId === activeSubjectId);
  }, [chapters, activeSubjectId]);

  // CRUD actions for Chapters in Subject workspace
  const handleRenameChapter = (id: string, name: string) => {
    curriculumService.updateChapter(id, { name });
    setEditingNode(null);
  };

  const handleDuplicateChapter = (id: string) => {
    curriculumTreeService.duplicateNode('chapter', id);
  };

  const handleDeleteChapter = (id: string) => {
    if (confirm('Delete this chapter and all of its readings?')) {
      curriculumService.deleteChapter(id);
    }
  };

  const handleAddReading = (chapterId: string) => {
    if (!activeSubjectId) return;
    const id = curriculumService.addReading(chapterId, 'New Reading', 'Reading description');
    updateWorkspaceState({ selectedSubjectId: activeSubjectId, selectedReadingId: id, mode: 'reading', activeTab: 'los' });
  };

  const handleMoveChapter = (id: string, direction: 'up' | 'down', index: number) => {
    if (!activeSubjectId) return;
    const targetIdx = direction === 'up' ? Math.max(0, index - 1) : index + 1;
    curriculumTreeService.moveNode('chapter', id, activeSubjectId, targetIdx);
  };

  // Compute Subject-Level Analytics
  const subjectAnalytics = useMemo(() => {
    if (!activeSubject) return null;
    const subReadings = readings.filter(r => r.subjectId === activeSubject.id);
    const subLOS = losList.filter(l => subReadings.some(r => r.id === l.readingId));
    const completedLOS = subLOS.filter(l => l.status === 'Completed').length;
    const totalLOS = subLOS.length;
    const progressPct = totalLOS > 0 ? Math.round((completedLOS / totalLOS) * 100) : 0;

    const subProgressEntries = plannerProgress.filter(p => subReadings.some(r => r.id === p.readingId));
    const loggedVideo = subProgressEntries.reduce((sum, p) => sum + p.loggedVideoMinutes, 0);
    const targetVideo = subReadings.reduce((sum, r) => sum + (r.targets?.videoDurationMinutes || 0), 0);
    const completedEOCQ = subProgressEntries.reduce((sum, p) => sum + p.completedEOCQ, 0);
    const targetEOCQ = subReadings.reduce((sum, r) => sum + (r.targets?.eocqCount || 0), 0);

    const avgConfidence = subLOS.length > 0
      ? (subLOS.reduce((sum, l) => sum + (l.confidence || 0), 0) / subLOS.length).toFixed(1)
      : '0.0';

    const readingsCompleted = subReadings.filter(r => {
      const rLOS = losList.filter(l => l.readingId === r.id);
      return rLOS.length > 0 && rLOS.every(l => l.status === 'Completed');
    }).length;

    return {
      progressPct,
      completedLOS,
      totalLOS,
      loggedVideo,
      targetVideo,
      completedEOCQ,
      targetEOCQ,
      avgConfidence,
      readingsCount: subReadings.length,
      readingsCompleted
    };
  }, [activeSubject, readings, losList, plannerProgress]);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] text-slate-100 bg-[#07080a] rounded-xl border border-slate-900 overflow-hidden shadow-2xl animate-fade-in relative select-none">
      {/* Resizable Sidebar navigator */}
      <div style={{ width: `${sidebarWidth}px` }} className="h-full shrink-0 min-w-[240px] max-w-[480px]">
        <CurriculumTree />
      </div>

      {/* Resize divider handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 bg-[#15171e] hover:bg-blue-600 active:bg-blue-500 cursor-col-resize shrink-0 h-full transition-colors duration-150 relative z-20"
      />

      {/* Right panel Curriculum Workspace */}
      <div className="flex-1 h-full min-w-0 bg-[#0d0e12]">
        {workspaceState.mode === 'reading' && workspaceState.selectedReadingId && readings.find(r => r.id === workspaceState.selectedReadingId) ? (
          /* STATE 2: READING WORKSPACE */
          <ErrorBoundary>
            <ReadingWorkspace readingId={workspaceState.selectedReadingId} />
          </ErrorBoundary>
        ) : workspaceState.mode === 'reading' && workspaceState.selectedReadingId ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-base font-semibold">Reading not found in current data.</p>
          </div>
        ) : activeSubject ? (
          /* STATE 1: SUBJECT WORKSPACE */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Subject Header */}
            <div className="px-5 py-4 border-b border-slate-900 flex justify-between items-start shrink-0 bg-[#0c0d12]/60">
              <div>
                <div className="inline-block bg-[#16171d] border border-[#232732] px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">
                  TOPIC AREA: {activeSubject.code}
                </div>
                <h2 className="text-lg font-bold text-slate-200 mt-2">{activeSubject.name}</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">
                  {activeSubject.description}
                </p>
              </div>
            </div>

            {/* Split Workspace View: Readings (left) + Subject Analytics Box (right) */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* Readings list grouped by Chapters */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
                {activeChapters.length === 0 ? (
                  <div className="text-center py-20 text-slate-650 flex flex-col items-center gap-2">
                    <p className="text-base font-semibold">No chapters defined. Click the sidebar context menu to add chapters.</p>
                  </div>
                ) : (
                  activeChapters.map((chapter, chapIdx) => {
                    const isExpanded = expandedChapters[chapter.id] !== false; // expanded by default
                    const chapterReadings = readings.filter(r => r.chapterId === chapter.id);

                    return (
                      <div key={chapter.id} className="space-y-4">
                        {/* Chapter Header */}
                        <div className="group flex items-center justify-between border-b border-slate-900 pb-2 select-none">
                          <div
                            onClick={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !isExpanded }))}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          >
                            <span className="text-slate-500 shrink-0">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </span>
                            {editingNode?.id === chapter.id ? (
                              <input
                                type="text"
                                value={editingNode.name}
                                onChange={e => setEditingNode({ ...editingNode, name: e.target.value })}
                                onBlur={() => handleRenameChapter(chapter.id, editingNode.name)}
                                onKeyDown={e => e.key === 'Enter' && handleRenameChapter(chapter.id, editingNode.name)}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                                className="bg-slate-950 border border-blue-500 rounded px-2 py-0.5 text-sm text-slate-100"
                              />
                            ) : (
                              <h3 className="text-xs font-bold text-slate-500 font-mono tracking-wider uppercase truncate">
                                {chapter.name}
                              </h3>
                            )}
                          </div>

                          {/* Chapter Actions (Notion style) */}
                          <div className="relative shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === chapter.id ? null : chapter.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 rounded text-slate-500"
                            >
                              <MoreHorizontal size={14} />
                            </button>

                            {menuOpenId === chapter.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-[#12141a] border border-[#232732] rounded-md shadow-xl z-50 p-1">
                                <button
                                  onClick={() => handleAddReading(chapter.id)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Add Reading
                                </button>
                                <button
                                  onClick={() => setEditingNode({ type: 'chapter', id: chapter.id, name: chapter.name })}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Rename
                                </button>
                                <button
                                  onClick={() => handleDuplicateChapter(chapter.id)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Duplicate
                                </button>
                                <button
                                  onClick={() => handleMoveChapter(chapter.id, 'up', chapIdx)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Move Up
                                </button>
                                <button
                                  onClick={() => handleMoveChapter(chapter.id, 'down', chapIdx)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-800 rounded text-slate-300 font-semibold"
                                >
                                  Move Down
                                </button>
                                <button
                                  onClick={() => handleDeleteChapter(chapter.id)}
                                  className="w-full text-left px-2.5 py-1 text-xs hover:bg-red-900/40 rounded text-red-450 font-semibold"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Readings List inside Chapter */}
                        {isExpanded && (
                          <div className="space-y-3">
                            {chapterReadings.length === 0 ? (
                              <p className="text-xs text-slate-605 py-2">No readings added to this chapter yet.</p>
                            ) : (
                              chapterReadings.map(reading => {
                                const readingLOS = losList.filter(l => l && l.readingId === reading.id);
                                const noteCount = notes.filter(n => n && (n.linkedReadingId === reading.id || readingLOS.some(l => l && l.id === n.linkedLOSId))).length;
                                const formulaCount = formulas.filter(f => f && f.linkedLOSId && readingLOS.some(l => l && l.id === f.linkedLOSId)).length;
                                
                                const progressVal = getReadingProgress(reading.id);
                                const avgConfidence = readingLOS.length > 0
                                  ? Math.round((readingLOS.reduce((acc, l) => acc + (l.confidence || 0), 0) / readingLOS.length) * 10) / 10
                                  : 0;

                                return (
                                  <div
                                    key={reading.id}
                                    onClick={() => updateWorkspaceState({ selectedSubjectId: activeSubjectId, selectedReadingId: reading.id, mode: 'reading', activeTab: 'los' })}
                                    className="bg-[#101116] border border-[#1e2026] hover:border-slate-700/80 hover:bg-[#15171e]/70 rounded-lg p-3.5 flex items-center justify-between cursor-pointer transition-all select-none"
                                  >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                      <span className="text-xs font-bold px-2 py-1 bg-slate-955 border border-slate-900 text-slate-400 rounded-md font-mono">
                                        R{reading.readingNumber || reading.number}
                                      </span>
                                      <div className="truncate">
                                        <h4 className="text-sm font-semibold text-slate-200 truncate">
                                          {reading.name || reading.title}
                                        </h4>
                                        
                                        {/* Denser badges row */}
                                        <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-500 font-semibold select-none">
                                          <span>{readingLOS.length} LOS</span>
                                          <span>•</span>
                                          <span>{noteCount} {noteCount === 1 ? 'Note' : 'Notes'}</span>
                                          <span>•</span>
                                          <span>{formulaCount} Formulas</span>
                                          {progressVal > 0 && (
                                            <>
                                              <span>•</span>
                                              <span className="text-emerald-400">Practice {progressVal}%</span>
                                            </>
                                          )}
                                          {readingLOS.length > 0 && (
                                            <>
                                              <span>•</span>
                                              <span className="text-amber-400">Confidence {avgConfidence}/5</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <ChevronRight size={16} className="text-slate-500 shrink-0 ml-4" />
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Subject Analytics Sidebar Box */}
              {subjectAnalytics && (
                <div className="w-80 border-l border-slate-900 bg-[#0c0d12]/40 p-5 space-y-6 overflow-y-auto shrink-0 select-none">
                  <div>
                    <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">
                      Subject Progress
                    </h3>
                    <div className="flex items-end gap-2 mt-2">
                      <span className="text-2xl font-black text-slate-200">{subjectAnalytics.progressPct}%</span>
                      <span className="text-xs text-slate-500 font-bold mb-1.5">overall</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-3">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${subjectAnalytics.progressPct}%` }} />
                    </div>
                  </div>

                  <div className="border-t border-slate-900 pt-5 space-y-4">
                    <h4 className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                      Curriculum Stats
                    </h4>
                    
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-450">Readings Completed</span>
                      <span className="text-slate-200">{subjectAnalytics.readingsCompleted} / {subjectAnalytics.readingsCount}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-450">LOS Completed</span>
                      <span className="text-slate-200">{subjectAnalytics.completedLOS} / {subjectAnalytics.totalLOS}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-450">Average Confidence</span>
                      <span className="text-amber-400 font-bold">{subjectAnalytics.avgConfidence} / 5.0</span>
                    </div>
                  </div>

                  {activeTemplate && activeSubject && (() => {
                    const block = activeTemplate.blocks.find(b => b.subjectId === activeSubject.id);
                    return block ? (
                      <div className="border-t border-slate-900 pt-5 space-y-3">
                        <h4 className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                          Scheduled Dates
                        </h4>
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-450">Start</span>
                          <span className="text-slate-200 font-mono text-xs">{block.startDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-450">End</span>
                          <span className="text-slate-200 font-mono text-xs">{block.endDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-450">Template</span>
                          <span className="text-slate-200 font-mono text-xs">{activeTemplate.name}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="border-t border-slate-900 pt-5 space-y-4">
                    <h4 className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                      Mark Meldrum Target Stats
                    </h4>

                    {/* Subject Video progression */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-450">Video Duration</span>
                        <span className="text-slate-200">
                          {Math.round(subjectAnalytics.loggedVideo)} / {subjectAnalytics.targetVideo} mins
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${subjectAnalytics.targetVideo > 0 ? Math.min(100, (subjectAnalytics.loggedVideo / subjectAnalytics.targetVideo) * 100) : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Subject EOCQ progression */}
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-455">EOCQ Questions</span>
                        <span className="text-slate-200">
                          {subjectAnalytics.completedEOCQ} / {subjectAnalytics.targetEOCQ} Qs
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all"
                          style={{ width: `${subjectAnalytics.targetEOCQ > 0 ? Math.min(100, (subjectAnalytics.completedEOCQ / subjectAnalytics.targetEOCQ) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Force Re-Sync */}
                  {subjectAnalytics && (
                    <div className="border-t border-slate-900 pt-5 space-y-4">
                      <h4 className="text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                        Data Management
                      </h4>
                      <button
                        onClick={() => {
                          if (window.confirm('Force re-sync official syllabus data? This will reset all subjects, chapters, readings, and LOS items to the default 2027 curriculum. Your study progress will be preserved separately.')) {
                            curriculumService.resetCurriculum();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-amber-300 transition-colors"
                      >
                        <RefreshCw size={14} />
                        Force Re-Sync Official Syllabus Data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-600 flex flex-col items-center gap-2 h-full justify-center">
            <p className="text-base font-semibold">No subjects found. Please add a subject from the tree menu.</p>
          </div>
        )}
      </div>
    </div>
  );
};
