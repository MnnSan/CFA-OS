/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LearningOutcomeStatement, Subject, Reading } from '../types';
import { FormulaCard } from '../components/FormulaCard';
import { 
  CheckCircle2, 
  Circle, 
  Star, 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  ExternalLink, 
  FileText, 
  Plus, 
  Clock,
  Compass,
  Award
} from 'lucide-react';

export const Curriculum: React.FC = () => {
  const {
    subjects,
    readings,
    losList,
    updateLOS,
    toggleLOSBookmark,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedReadingId,
    setSelectedReadingId,
    notes,
    addNote,
    setActiveTab,
    selectedLOSId,
    selectLOS,
    curriculumEngine,
    formulas,
    updateFormula
  } = useApp();

  // Expanded readings state
  const [expandedReadings, setExpandedReadings] = useState<Record<string, boolean>>({
    'ab102030-4050-4060-8070-90a0b0c0d012': true // expand Fixed Income reading by default
  });

  const toggleReadingExpand = (rdId: string) => {
    setExpandedReadings(prev => ({
      ...prev,
      [rdId]: !prev[rdId]
    }));
  };

  const getSubjectStats = (subId: string) => {
    return curriculumEngine.getSubjectCompletion(subId);
  };

  const activeSubject = subjects.find(s => s.id === (selectedSubjectId || '7c9a4e05-c49b-4bc9-93e1-32a21008064d'));
  const activeReadings = readings.filter(r => r.subjectId === activeSubject?.id);

  const handleCreateNoteForLOS = (los: LearningOutcomeStatement) => {
    const parentRd = readings.find(r => r.id === los.readingId);
    const noteId = addNote({
      title: `Summary of LOS ${los.code}`,
      content: `# Study Summary: LOS ${los.code}\n\nReference: **${parentRd?.title}**\n\n## Official LOS Objective\n*${los.statement}*\n\n## Core Concepts\n*Add your structured summary here...*\n\n## Formulas & Models\n*List relevant formulas here...*`,
      linkedSubjectId: activeSubject?.id,
      linkedReadingId: los.readingId,
      linkedLOSId: los.id
    });
    setActiveTab('notes');
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 animate-fade-in">
      
      {/* Left Sidebar Pane: Subjects list */}
      <div className="space-y-3 md:col-span-1">
        <div className="rounded border border-slate-200 bg-white p-4 dark:border-neutral-700/50 dark:bg-neutral-800/60">
          <div className="border-b border-slate-100 pb-2 dark:border-neutral-700/50">
            <h2 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-mono dark:text-neutral-200">
              CFA Level III Curriculum
            </h2>
          </div>
          
          <div className="mt-3 space-y-1">
            {subjects.map((sub) => {
              const stats = getSubjectStats(sub.id);
              const isSelected = activeSubject?.id === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubjectId(sub.id);
                    setSelectedReadingId(null);
                  }}
                  className={`flex w-full flex-col text-left rounded p-2.5 transition-all duration-150 ${
                    isSelected 
                      ? 'bg-slate-100 text-slate-900 dark:bg-neutral-800 dark:text-neutral-50' 
                      : 'text-slate-600 hover:bg-slate-50 dark:text-neutral-400 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[10px] font-bold tracking-wider uppercase opacity-80">
                      {sub.code}
                    </span>
                    <span className="text-[10px] font-mono font-semibold">
                      {stats.pct}%
                    </span>
                  </div>
                  <span className="text-xs font-semibold mt-1 truncate w-full">
                    {sub.name}
                  </span>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                    <div 
                      className={`h-full transition-all duration-300 ${isSelected ? 'bg-slate-900 dark:bg-neutral-100' : 'bg-slate-900 dark:bg-white'}`}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Content Pane: Readings & Learning Outcome Statements */}
      <div className="md:col-span-2 space-y-4">
        {activeSubject && (
          <div className="rounded border border-slate-200 bg-white p-5 dark:border-neutral-700/50 dark:bg-neutral-800/60">
            
            {/* Subject Info Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-neutral-700/50">
              <div className="space-y-1">
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
                  Topic Area: {activeSubject.code}
                </span>
                <h1 className="text-base font-semibold text-slate-900 dark:text-neutral-50 font-sans">
                  {activeSubject.name}
                </h1>
                <p className="text-xs text-slate-400 dark:text-neutral-500 leading-relaxed max-w-xl">
                  {activeSubject.description}
                </p>
              </div>
              <div className="rounded-full bg-slate-50 p-2 text-slate-400 dark:bg-neutral-850 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>

            {/* Readings list */}
            <div className="mt-5 space-y-6">
              {activeReadings.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  No readings mapped for this topic in the database yet.
                </p>
              ) : (
                activeReadings.map((rd) => {
                  const enrichedRd = curriculumEngine.enrichReading(rd);
                  const isExpanded = !!expandedReadings[rd.id];
                  return (
                    <div key={rd.id} className="border border-slate-150 rounded overflow-hidden dark:border-neutral-700/50">
                      
                      {/* Reading expander row */}
                      <div 
                        onClick={() => toggleReadingExpand(rd.id)}
                        className="flex items-center justify-between bg-slate-50/50 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors duration-150 dark:bg-neutral-800/60/40 dark:hover:bg-neutral-800/30"
                      >
                        <div className="flex items-center space-x-3 pr-2 min-w-0">
                          <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                              Reading {rd.number}: {rd.title}
                            </h3>
                            <p className="text-[10px] text-neutral-450 dark:text-neutral-500 truncate mt-0.5">
                              {rd.description}
                            </p>
                            {/* Dynamic Metadata badges */}
                            <div className="flex flex-wrap gap-1.5 mt-1.5 font-mono text-[9px] text-slate-400 dark:text-neutral-500 items-center">
                              {enrichedRd.totalHoursInvested > 0 && (
                                <span className="bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded font-bold text-slate-700 dark:text-neutral-300">
                                  {enrichedRd.totalHoursInvested}h Studied
                                </span>
                              )}
                              {enrichedRd.formulaCount > 0 && (
                                <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded font-semibold border border-amber-100/50 dark:border-amber-900/30">
                                  {enrichedRd.formulaCount} Formula{enrichedRd.formulaCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {enrichedRd.notesCount > 0 && (
                                <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.2 rounded font-semibold border border-blue-100/50 dark:border-blue-900/30">
                                  {enrichedRd.notesCount} Note{enrichedRd.notesCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {enrichedRd.resourceCount > 0 && (
                                <span className="bg-slate-50 dark:bg-neutral-800/40 text-slate-600 dark:text-neutral-400 px-1.5 py-0.2 rounded font-semibold border border-slate-100 dark:border-neutral-850">
                                  {enrichedRd.resourceCount} Resource{enrichedRd.resourceCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {enrichedRd.progress > 0 && enrichedRd.progress < 100 && (
                                <span className="text-[9px] font-bold text-amber-600 font-sans">
                                  {enrichedRd.progress}% Complete
                                </span>
                              )}
                              {enrichedRd.progress === 100 && (
                                <span className="text-[9px] font-bold text-emerald-600 font-sans">
                                  Complete
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-[10px] font-mono font-medium text-neutral-400">
                            {enrichedRd.losCount} LOS
                          </span>
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : <ChevronRight className="h-4 w-4 text-neutral-400" />}
                        </div>
                      </div>

                      {/* Expandable LOS sub-table */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 dark:divide-neutral-800 bg-white dark:bg-neutral-800/60">
                          {/* Embedded Formulas Section (Sprint 6) */}
                          {formulas.filter(f => f.linkedReadingId === rd.id).length > 0 && (
                            <div className="p-4 bg-slate-50/[0.15] dark:bg-neutral-950/5 border-b border-slate-100 dark:border-neutral-850">
                              <div className="flex items-center space-x-2 mb-3">
                                <Award className="h-4 w-4 text-amber-500 shrink-0" />
                                <h4 className="text-[10px] font-mono font-bold tracking-wide uppercase text-slate-800 dark:text-neutral-200">
                                  Formula Intelligence & Active Recall ({formulas.filter(f => f.linkedReadingId === rd.id).length})
                                </h4>
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {formulas.filter(f => f.linkedReadingId === rd.id).map(form => (
                                  <FormulaCard key={form.id} formula={form} onUpdate={updateFormula} />
                                ))}
                              </div>
                            </div>
                          )}
                          {curriculumEngine.getLOSForReading(rd.id).length === 0 ? (
                            <p className="text-center text-[11px] text-slate-400 py-4">
                              No learning outcomes entered for this reading.
                            </p>
                          ) : (
                            curriculumEngine.getLOSForReading(rd.id).map((los) => {
                              // Find if there is a note linked to this LOS
                              const linkedNote = notes.find(n => n.linkedLOSId === los.id);
                              return (
                                <div 
                                  key={los.id} 
                                  onClick={() => selectLOS(los.id)}
                                  className={`p-4 flex flex-col md:flex-row md:items-start md:justify-between space-y-3 md:space-y-0 md:space-x-4 hover:bg-slate-50/30 transition-all duration-150 cursor-pointer border-l-2 ${
                                    selectedLOSId === los.id 
                                      ? 'bg-slate-50 border-slate-900 dark:bg-neutral-800/40 dark:border-neutral-100' 
                                      : 'border-transparent'
                                  }`}
                                >
                                  
                                  {/* Left side: status + code + statement */}
                                  <div className="flex items-start space-x-3 flex-1">
                                    <button
                                      onClick={() => {
                                        const nextStatus = 
                                          los.status === 'Not Started' ? 'In Progress' :
                                          los.status === 'In Progress' ? 'Completed' : 'Not Started';
                                        updateLOS(los.id, { status: nextStatus });
                                      }}
                                      className="mt-0.5 text-slate-400 hover:text-slate-900 dark:hover:text-neutral-100 shrink-0"
                                      title={`Toggle Status (Current: ${los.status})`}
                                    >
                                      {los.status === 'Completed' ? (
                                        <CheckCircle2 className="h-4.5 w-4.5 text-slate-900 dark:text-neutral-100" />
                                      ) : (
                                        <Circle className="h-4.5 w-4.5" />
                                      )}
                                    </button>
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-sm dark:text-neutral-50 dark:bg-neutral-800">
                                          LOS {los.code}
                                        </span>
                                        {los.difficulty && (
                                          <span className={`text-[9px] font-medium font-mono uppercase px-1 rounded-sm ${
                                            los.difficulty === 'Easy' ? 'text-green-600 bg-green-50 dark:bg-green-950/20' :
                                            los.difficulty === 'Medium' ? 'text-slate-600 bg-slate-50 dark:bg-neutral-800' :
                                            'text-red-600 bg-red-50 dark:bg-red-950/20'
                                          }`}>
                                            {los.difficulty}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed dark:text-neutral-300">
                                        {los.statement}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right side: quick selectors (confidence, bookmarks, notes link) */}
                                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 pl-7 md:pl-0 md:flex-col md:items-end">
                                    
                                    {/* Action row (favorite + note linkage) */}
                                    <div className="flex items-center space-x-2">
                                      {linkedNote ? (
                                        <button
                                          onClick={() => setActiveTab('notes')}
                                          className="inline-flex items-center space-x-1 rounded bg-slate-50 px-2 py-0.5 text-[9px] font-medium text-slate-600 hover:bg-slate-100 dark:bg-neutral-800 dark:text-neutral-300 transition-colors"
                                          title="View associated markdown study note"
                                        >
                                          <FileText className="h-3 w-3" />
                                          <span>Open Note</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleCreateNoteForLOS(los)}
                                          className="inline-flex items-center space-x-1 rounded border border-dashed border-slate-200 bg-white px-2 py-0.5 text-[9px] font-medium text-slate-400 hover:bg-slate-50 dark:border-neutral-700/50 dark:hover:bg-neutral-800 transition-colors"
                                          title="Create associated markdown note"
                                        >
                                          <Plus className="h-3 w-3" />
                                          <span>Add Note</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => toggleLOSBookmark(los.id)}
                                        className={`rounded-sm p-1 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors ${
                                          los.bookmarked ? 'text-slate-900 dark:text-neutral-100' : 'text-slate-350'
                                        }`}
                                      >
                                        <Star className="h-3.5 w-3.5 fill-current" />
                                      </button>
                                    </div>

                                    {/* Confidence Selector (1-5) */}
                                    <div className="flex items-center space-x-1">
                                      <span className="text-[9px] text-slate-400 font-mono">Confidence:</span>
                                      <div className="flex items-center space-x-0.5">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                          <button
                                            key={val}
                                            onClick={() => updateLOS(los.id, { confidence: val as LearningOutcomeStatement['confidence'] })}
                                            className={`h-3.5 w-3.5 text-[9px] font-mono font-semibold rounded flex items-center justify-center transition-colors duration-100 ${
                                              los.confidence === val
                                                ? 'bg-slate-900 text-white dark:bg-white dark:text-neutral-950 font-bold'
                                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700'
                                            }`}
                                            title={`Rate confidence level: ${val}/5`}
                                          >
                                            {val}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Practice Score */}
                                    {los.questionsAttempted !== undefined && (
                                      <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-mono">
                                        <Award className="h-3 w-3" />
                                        <span>Practice: {los.questionsCorrect}/{los.questionsAttempted} ({Math.round((los.questionsCorrect! / los.questionsAttempted!) * 100)}%)</span>
                                      </div>
                                    )}

                                  </div>

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

          </div>
        )}
      </div>

    </div>
  );
};
